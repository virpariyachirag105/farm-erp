from typing import Callable
from fastapi import Depends, HTTPException, status

from app.core.deps import get_current_user
from app.models.user import User


def get_user_permissions(user: User) -> list[str]:
    """
    Extracts all active permission names for the given user.
    If the user has the Admin role, they have full permissions.
    """
    if not user or not user.is_active:
        return []

    permissions = set()

    # Check role relationship permissions
    if user.role_rel and user.role_rel.is_active:
        for perm in user.role_rel.permissions:
            permissions.add(perm.name)

    return sorted(list(permissions))


def has_permission(user: User, permission_name: str) -> bool:
    """
    Checks if a user has a specific permission or superadmin privileges.
    Admin (role_id=1) has full universal bypass.
    Owner (role_id=4) and others follow their assigned role permissions.
    """
    if not user or not user.is_active:
        return False

    # Check if user has Admin role (role_id == 1 or role name Admin/SuperAdmin)
    if user.role_id == 1:
        return True

    is_admin_role_string = user.role and user.role.upper() in ("ADMIN", "SUPERADMIN")
    is_admin_role_rel = user.role_rel and user.role_rel.name.upper() in ("ADMIN", "SUPERADMIN")

    if is_admin_role_string or is_admin_role_rel:
        return True

    # Check explicit permissions assigned to the role
    user_perms = get_user_permissions(user)
    if permission_name in user_perms or "*" in user_perms:
        return True

    # Check module wildcard (e.g. "dealer.*")
    module = permission_name.split(".")[0] if "." in permission_name else ""
    if module and f"{module}.*" in user_perms:
        return True

    return False


def is_admin_user(user: User | None) -> bool:
    """Universal permission bypass for Superadmin/Admin only."""
    if not user:
        return False
    if user.role_id == 1:
        return True
    is_admin_role_string = user.role and user.role.upper() in ("ADMIN", "SUPERADMIN")
    is_admin_role_rel = user.role_rel and user.role_rel.name.upper() in ("ADMIN", "SUPERADMIN")
    return bool(is_admin_role_string or is_admin_role_rel)


def is_unscoped_user(user: User | None) -> bool:
    """Admin (role_id=1) and Owner (role_id=4) can see all farms & all seasons."""
    if not user:
        return False
    if user.role_id in (1, 4):
        return True
    role_name = (user.role_rel.name if user.role_rel else (user.role or "")).upper()
    return role_name in ("ADMIN", "SUPERADMIN", "OWNER")


def is_partner_user(user: User | None) -> bool:
    if not user:
        return False
    is_partner_str = user.role and user.role.upper() == "PARTNER"
    is_partner_rel = user.role_rel and user.role_rel.name.upper() == "PARTNER"
    return bool(is_partner_str or is_partner_rel)


def get_partner_scope(db, user: User | None) -> dict:
    """
    Returns partner scope dict:
    {
        "is_partner": bool,
        "is_admin": bool,
        "season_partner_ids": list[int],
        "season_ids": list[int],
        "farm_ids": list[int]
    }
    """
    if not user:
        return {
            "is_partner": False,
            "is_admin": False,
            "season_partner_ids": [],
            "season_ids": [],
            "farm_ids": []
        }

    # Admin and Owner see all records without farm filtering
    if is_unscoped_user(user):
        return {
            "is_partner": False,
            "is_admin": True,
            "season_partner_ids": [],
            "season_ids": [],
            "farm_ids": []
        }

    from app.models.season_partner import SeasonPartner
    partnerships = db.query(SeasonPartner).filter(SeasonPartner.user_id == user.id).all()
    sp_ids = [p.id for p in partnerships]
    s_ids = list(set(p.season_id for p in partnerships if p.season_id is not None))
    f_ids = list(set(p.farm_id for p in partnerships if p.farm_id is not None))

    is_partner = is_partner_user(user)

    return {
        "is_partner": is_partner or len(sp_ids) > 0,
        "is_admin": False,
        "season_partner_ids": sp_ids,
        "season_ids": s_ids,
        "farm_ids": f_ids
    }


def require_permission(permission_name: str) -> Callable:
    """
    FastAPI dependency factory for RBAC.
    Usage:
        @router.post("/", dependencies=[Depends(require_permission("dealer.create"))])
        def create_dealer(...): ...
    """
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not has_permission(current_user, permission_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission_name}' required."
            )

        return current_user

    return permission_checker
