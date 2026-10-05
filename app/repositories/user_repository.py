from sqlalchemy.orm import Session, joinedload

from app.models.role import Role
from app.models.user import User
from app.schemas.user import UserRequest


class UserRepository:

    def create(self, db: Session, user: User):
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def get_by_email(self, db: Session, email: str, user_id: int = None):
        user_query = db.query(User).options(
            joinedload(User.role_rel).joinedload(Role.permissions)
        )
        if user_id is not None:
            user_query = user_query.filter(User.id != user_id)
        return user_query.filter(User.email == email).first()

    def get_user_list(self, db: Session):
        return db.query(User).options(
            joinedload(User.role_rel).joinedload(Role.permissions)
        ).all()

    def get_user_by_id(self, db: Session, user_id: int):
        return db.query(User).options(
            joinedload(User.role_rel).joinedload(Role.permissions)
        ).filter(User.id == user_id).first()

    def count_users(self, db: Session) -> int:
        return db.query(User).count()

    def update(self, db: Session, user_id: int, user_data: UserRequest, hashed_password: str | None = None):
        existing_user = self.get_user_by_id(db, user_id)
        if existing_user is None:
            return None

        existing_user.name = user_data.name
        existing_user.email = user_data.email
        existing_user.mobile = user_data.mobile
        if user_data.role is not None:
            existing_user.role = user_data.role if isinstance(user_data.role, str) else user_data.role.value
        if user_data.role_id is not None:
            existing_user.role_id = user_data.role_id
        existing_user.is_active = user_data.is_active
        if user_data.is_verified is not None:
            existing_user.is_verified = user_data.is_verified

        if hashed_password is not None:
            existing_user.password = hashed_password

        db.commit()
        db.refresh(existing_user)
        return existing_user

    def update_image(self, db: Session, user: User, image: str):
        user.image = image
        db.commit()
        db.refresh(user)
        return user

    def update_password(self, db: Session, user: User, hashed_password: str):
        user.password = hashed_password
        db.commit()
        db.refresh(user)
        return user

    def delete(self, db: Session, user_id: int):
        existing_user = self.get_user_by_id(db, user_id)
        if existing_user is None:
            return None

        db.delete(existing_user)
        db.commit()
        return existing_user
