from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.permission import Permission
from app.models.role import Role
from app.models.user import User

ALL_PERMISSIONS = [
    # User module
    {"name": "user.create", "module": "user", "action": "create", "description": "Create new users"},
    {"name": "user.list", "module": "user", "action": "list", "description": "List all users"},
    {"name": "user.view", "module": "user", "action": "view", "description": "View user details"},
    {"name": "user.update", "module": "user", "action": "update", "description": "Update user profiles"},
    {"name": "user.delete", "module": "user", "action": "delete", "description": "Deactivate/delete users"},
    {"name": "user.upload_image", "module": "user", "action": "upload_image", "description": "Upload user profile images"},

    # Role module
    {"name": "role.create", "module": "role", "action": "create", "description": "Create new roles"},
    {"name": "role.list", "module": "role", "action": "list", "description": "List all roles"},
    {"name": "role.view", "module": "role", "action": "view", "description": "View role details"},
    {"name": "role.update", "module": "role", "action": "update", "description": "Update roles"},
    {"name": "role.delete", "module": "role", "action": "delete", "description": "Delete roles"},
    {"name": "role.assign_permissions", "module": "role", "action": "assign_permissions", "description": "Assign permissions to roles"},

    # Permission module
    {"name": "permission.list", "module": "permission", "action": "list", "description": "List all permissions"},
    {"name": "permission.view", "module": "permission", "action": "view", "description": "View permission details"},

    # Farm module
    {"name": "farm.create", "module": "farm", "action": "create", "description": "Create farms"},
    {"name": "farm.list", "module": "farm", "action": "list", "description": "List farms"},
    {"name": "farm.view", "module": "farm", "action": "view", "description": "View farm details"},
    {"name": "farm.update", "module": "farm", "action": "update", "description": "Update farms"},
    {"name": "farm.delete", "module": "farm", "action": "delete", "description": "Delete farms"},

    # Dealer module
    {"name": "dealer.create", "module": "dealer", "action": "create", "description": "Create dealers"},
    {"name": "dealer.list", "module": "dealer", "action": "list", "description": "List dealers"},
    {"name": "dealer.view", "module": "dealer", "action": "view", "description": "View dealer details"},
    {"name": "dealer.update", "module": "dealer", "action": "update", "description": "Update dealers"},
    {"name": "dealer.delete", "module": "dealer", "action": "delete", "description": "Delete dealers"},

    # Season module
    {"name": "season.create", "module": "season", "action": "create", "description": "Create seasons"},
    {"name": "season.list", "module": "season", "action": "list", "description": "List seasons"},
    {"name": "season.view", "module": "season", "action": "view", "description": "View season details"},
    {"name": "season.update", "module": "season", "action": "update", "description": "Update seasons"},
    {"name": "season.delete", "module": "season", "action": "delete", "description": "Delete seasons"},

    # Season Partner module
    {"name": "season_partner.create", "module": "season_partner", "action": "create", "description": "Create season partners"},
    {"name": "season_partner.list", "module": "season_partner", "action": "list", "description": "List season partners"},
    {"name": "season_partner.view", "module": "season_partner", "action": "view", "description": "View season partner details"},
    {"name": "season_partner.update", "module": "season_partner", "action": "update", "description": "Update season partners"},
    {"name": "season_partner.delete", "module": "season_partner", "action": "delete", "description": "Delete season partners"},

    # Product module
    {"name": "product.create", "module": "product", "action": "create", "description": "Create products"},
    {"name": "product.list", "module": "product", "action": "list", "description": "List products"},
    {"name": "product.view", "module": "product", "action": "view", "description": "View product details"},
    {"name": "product.update", "module": "product", "action": "update", "description": "Update products"},
    {"name": "product.delete", "module": "product", "action": "delete", "description": "Delete products"},

    # Dispatch module
    {"name": "dispatch.create", "module": "dispatch", "action": "create", "description": "Create dispatches"},
    {"name": "dispatch.list", "module": "dispatch", "action": "list", "description": "List dispatches"},
    {"name": "dispatch.view", "module": "dispatch", "action": "view", "description": "View dispatch details"},
    {"name": "dispatch.update", "module": "dispatch", "action": "update", "description": "Update dispatches"},
    {"name": "dispatch.delete", "module": "dispatch", "action": "delete", "description": "Delete dispatches"},

    # Dispatch Item module
    {"name": "dispatch_item.create", "module": "dispatch_item", "action": "create", "description": "Create dispatch items"},
    {"name": "dispatch_item.list", "module": "dispatch_item", "action": "list", "description": "List dispatch items"},
    {"name": "dispatch_item.view", "module": "dispatch_item", "action": "view", "description": "View dispatch item details"},
    {"name": "dispatch_item.update", "module": "dispatch_item", "action": "update", "description": "Update dispatch items"},
    {"name": "dispatch_item.delete", "module": "dispatch_item", "action": "delete", "description": "Delete dispatch items"},

    # Free Dispatch Item module
    {"name": "free_dispatch_item.create", "module": "free_dispatch_item", "action": "create", "description": "Create free dispatch items"},
    {"name": "free_dispatch_item.list", "module": "free_dispatch_item", "action": "list", "description": "List free dispatch items"},
    {"name": "free_dispatch_item.view", "module": "free_dispatch_item", "action": "view", "description": "View free dispatch item details"},
    {"name": "free_dispatch_item.update", "module": "free_dispatch_item", "action": "update", "description": "Update free dispatch items"},
    {"name": "free_dispatch_item.delete", "module": "free_dispatch_item", "action": "delete", "description": "Delete free dispatch items"},

    # Dispatch Settlement module
    {"name": "dispatch_settlement.create", "module": "dispatch_settlement", "action": "create", "description": "Create dispatch settlements"},
    {"name": "dispatch_settlement.list", "module": "dispatch_settlement", "action": "list", "description": "List dispatch settlements"},
    {"name": "dispatch_settlement.view", "module": "dispatch_settlement", "action": "view", "description": "View dispatch settlement details"},
    {"name": "dispatch_settlement.update", "module": "dispatch_settlement", "action": "update", "description": "Update dispatch settlements"},
    {"name": "dispatch_settlement.delete", "module": "dispatch_settlement", "action": "delete", "description": "Delete dispatch settlements"},

    # Dealer Payment module
    {"name": "dealer_payment.create", "module": "dealer_payment", "action": "create", "description": "Record dealer payments"},
    {"name": "dealer_payment.list", "module": "dealer_payment", "action": "list", "description": "List dealer payments"},
    {"name": "dealer_payment.view", "module": "dealer_payment", "action": "view", "description": "View dealer payment details"},
    {"name": "dealer_payment.update", "module": "dealer_payment", "action": "update", "description": "Update dealer payments"},
    {"name": "dealer_payment.delete", "module": "dealer_payment", "action": "delete", "description": "Delete dealer payments"},

    # Expense module
    {"name": "expense.create", "module": "expense", "action": "create", "description": "Record expenses"},
    {"name": "expense.list", "module": "expense", "action": "list", "description": "List expenses"},
    {"name": "expense.view", "module": "expense", "action": "view", "description": "View expense details"},
    {"name": "expense.update", "module": "expense", "action": "update", "description": "Update expenses"},
    {"name": "expense.delete", "module": "expense", "action": "delete", "description": "Delete expenses"},

    # Season Box Cost module
    {"name": "season_box_cost.create", "module": "season_box_cost", "action": "create", "description": "Create season box costs"},
    {"name": "season_box_cost.list", "module": "season_box_cost", "action": "list", "description": "List season box costs"},
    {"name": "season_box_cost.view", "module": "season_box_cost", "action": "view", "description": "View season box cost details"},
    {"name": "season_box_cost.update", "module": "season_box_cost", "action": "update", "description": "Update season box costs"},
    {"name": "season_box_cost.delete", "module": "season_box_cost", "action": "delete", "description": "Delete season box costs"},

    # Partner Settlement module
    {"name": "partner_settlement.create", "module": "partner_settlement", "action": "create", "description": "Create partner settlements"},
    {"name": "partner_settlement.list", "module": "partner_settlement", "action": "list", "description": "List partner settlements"},
    {"name": "partner_settlement.view", "module": "partner_settlement", "action": "view", "description": "View partner settlement details"},
    {"name": "partner_settlement.update", "module": "partner_settlement", "action": "update", "description": "Update partner settlements"},
    {"name": "partner_settlement.delete", "module": "partner_settlement", "action": "delete", "description": "Delete partner settlements"},
    {"name": "partner_settlement.upload_image", "module": "partner_settlement", "action": "upload_image", "description": "Upload partner settlement images"},

    # Dealer Calculation module
    {"name": "dealer_calculation.view", "module": "dealer_calculation", "action": "view", "description": "View dealer calculations and summaries"},
]


def seed_rbac(db: Session | None = None) -> None:
    owns_session = False
    if db is None:
        db = SessionLocal()
        owns_session = True

    try:
        # 1. Seed or update permissions
        permission_map = {}
        for p_data in ALL_PERMISSIONS:
            existing_perm = db.query(Permission).filter(Permission.name == p_data["name"]).first()
            if not existing_perm:
                existing_perm = Permission(
                    name=p_data["name"],
                    module=p_data["module"],
                    action=p_data["action"],
                    description=p_data["description"]
                )
                db.add(existing_perm)
                db.flush()
            else:
                existing_perm.description = p_data["description"]
                existing_perm.module = p_data["module"]
                existing_perm.action = p_data["action"]
            permission_map[p_data["name"]] = existing_perm

        db.commit()

        # Fetch all permissions from DB
        all_db_permissions = db.query(Permission).all()

        # 2. Seed Admin Role with full permissions
        admin_role = db.query(Role).filter(Role.name.ilike("Admin")).first()
        if not admin_role:
            admin_role = Role(
                name="Admin",
                description="Administrator with full access to all modules and permissions",
                is_active=True
            )
            db.add(admin_role)
            db.flush()

        # Admin gets all permissions
        admin_role.permissions = all_db_permissions
        db.commit()

        # 3. Seed Manager Role
        manager_role = db.query(Role).filter(Role.name.ilike("Manager")).first()
        if not manager_role:
            manager_role = Role(
                name="Manager",
                description="Manager with broad operational access",
                is_active=True
            )
            db.add(manager_role)
            db.flush()

        # Manager gets operational permissions (everything except user and role administration)
        manager_permissions = [
            p for p in all_db_permissions
            if p.module not in ("role", "permission") and p.name not in ("user.create", "user.delete")
        ]
        manager_role.permissions = manager_permissions
        db.commit()

        # 4. Seed Staff Role
        staff_role = db.query(Role).filter(Role.name.ilike("Staff")).first()
        if not staff_role:
            staff_role = Role(
                name="Staff",
                description="Staff member with basic view and dispatch management access",
                is_active=True
            )
            db.add(staff_role)
            db.flush()

        # Staff gets view/list permissions and basic operations
        staff_permissions = [
            p for p in all_db_permissions
            if p.action in ("list", "view") or p.module in ("dispatch", "dispatch_item", "free_dispatch_item")
        ]
        staff_role.permissions = staff_permissions
        db.commit()

        # 5. Seed Partner Role
        partner_role = db.query(Role).filter(Role.name.ilike("Partner")).first()
        if not partner_role:
            partner_role = Role(
                name="Partner",
                description="Season Partner with scoped view access to assigned seasons and farms",
                is_active=True
            )
            db.add(partner_role)
            db.flush()

        # Partner gets read-only view/list permissions
        partner_permissions = [
            p for p in all_db_permissions
            if p.action in ("list", "view") and p.module not in ("user", "role", "permission")
        ]
        partner_role.permissions = partner_permissions
        db.commit()

        # 6. Seed Owner Role
        owner_role = db.query(Role).filter(Role.name.ilike("Owner")).first()
        if not owner_role:
            owner_role = Role(
                name="Owner",
                description="Farm Owner with full view access to all farms, seasons, and operations",
                is_active=True
            )
            db.add(owner_role)
            db.flush()

        # Owner gets all view/list permissions + operational module access
        owner_permissions = [
            p for p in all_db_permissions
            if p.module not in ("role", "permission", "user") or p.action in ("list", "view")
        ]
        owner_role.permissions = owner_permissions
        db.commit()

        # 7. Link existing users without role_id to appropriate Role
        users = db.query(User).filter(User.role_id.is_(None)).all()
        for user in users:
            if user.role and user.role.upper() == "ADMIN":
                user.role_id = admin_role.id
            elif user.role and user.role.upper() == "MANAGER":
                user.role_id = manager_role.id
            elif user.role and user.role.upper() == "PARTNER":
                user.role_id = partner_role.id
            else:
                user.role_id = staff_role.id
        db.commit()

        print("RBAC seeded successfully: permissions, roles (Admin, Manager, Staff, Partner), and user associations updated.")

    except Exception as e:
        db.rollback()
        raise e
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    seed_rbac()
