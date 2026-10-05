from sqlalchemy.orm import Session, joinedload

from app.models.permission import Permission
from app.models.role import Role
from app.schemas.role import RoleRequest


class RoleRepository:

    def create(self, db: Session, role: Role, permissions: list[Permission] | None = None) -> Role:
        if permissions:
            role.permissions = permissions
        db.add(role)
        db.commit()
        db.refresh(role)
        return role

    def get_all(self, db: Session) -> list[Role]:
        return db.query(Role).options(joinedload(Role.permissions)).order_by(Role.id).all()

    def get_by_id(self, db: Session, role_id: int) -> Role | None:
        return db.query(Role).options(joinedload(Role.permissions)).filter(Role.id == role_id).first()

    def get_by_name(self, db: Session, name: str, exclude_id: int | None = None) -> Role | None:
        query = db.query(Role).filter(Role.name.ilike(name))
        if exclude_id is not None:
            query = query.filter(Role.id != exclude_id)
        return query.first()

    def update(
        self,
        db: Session,
        role: Role,
        role_data: RoleRequest,
        permissions: list[Permission] | None = None
    ) -> Role:
        role.name = role_data.name
        role.description = role_data.description
        role.is_active = role_data.is_active
        if permissions is not None:
            role.permissions = permissions

        db.commit()
        db.refresh(role)
        return role

    def assign_permissions(self, db: Session, role: Role, permissions: list[Permission]) -> Role:
        role.permissions = permissions
        db.commit()
        db.refresh(role)
        return role

    def delete(self, db: Session, role: Role) -> bool:
        db.delete(role)
        db.commit()
        return True
