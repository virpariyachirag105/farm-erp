from sqlalchemy.orm import Session

from app.models.permission import Permission


class PermissionRepository:

    def create(self, db: Session, permission: Permission) -> Permission:
        db.add(permission)
        db.commit()
        db.refresh(permission)
        return permission

    def get_all(self, db: Session) -> list[Permission]:
        return db.query(Permission).order_by(Permission.module, Permission.name).all()

    def get_by_id(self, db: Session, permission_id: int) -> Permission | None:
        return db.query(Permission).filter(Permission.id == permission_id).first()

    def get_by_name(self, db: Session, name: str) -> Permission | None:
        return db.query(Permission).filter(Permission.name == name).first()

    def get_by_ids(self, db: Session, permission_ids: list[int]) -> list[Permission]:
        if not permission_ids:
            return []
        return db.query(Permission).filter(Permission.id.in_(permission_ids)).all()

    def get_by_module(self, db: Session, module: str) -> list[Permission]:
        return db.query(Permission).filter(Permission.module == module).all()
