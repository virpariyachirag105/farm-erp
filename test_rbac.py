from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.core.security import hash_password, create_access_token
from app.db.seed_rbac import seed_rbac

client = TestClient(app)

def test_rbac():
    db: Session = SessionLocal()
    try:
        # Ensure RBAC is seeded
        seed_rbac(db)

        # 1. Test Unauthenticated access returns 401
        response = client.get("/dealers/")
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("[PASS] Unauthenticated request returns 401 Unauthorized")

        # 2. Test Invalid Token returns 401
        response = client.get("/dealers/", headers={"Authorization": "Bearer invalid_token_12345"})
        assert response.status_code == 401, f"Expected 401 for invalid token, got {response.status_code}"
        print("[PASS] Invalid token returns 401 Unauthorized")

        # 3. Create or find Admin User
        admin_role = db.query(Role).filter(Role.name.ilike("Admin")).first()
        assert admin_role is not None, "Admin role should exist"

        admin_user = db.query(User).filter(User.email == "test_admin@example.com").first()
        if not admin_user:
            admin_user = User(
                name="Test Admin",
                email="test_admin@example.com",
                password=hash_password("adminpass123"),
                role="Admin",
                role_id=admin_role.id,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        admin_token = create_access_token({"sub": str(admin_user.id), "email": admin_user.email, "role": "Admin"})
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 4. Test Admin has access to endpoints
        response = client.get("/dealers/", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200 for Admin on /dealers/, got {response.status_code}: {response.text}"
        print("[PASS] Admin user has full access to list dealers (200 OK)")

        response = client.get("/roles/", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200 for Admin on /roles/, got {response.status_code}: {response.text}"
        print("[PASS] Admin user has access to /roles/ (200 OK)")

        response = client.get("/permissions/", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200 for Admin on /permissions/, got {response.status_code}: {response.text}"
        print("[PASS] Admin user has access to /permissions/ (200 OK)")

        # 5. Create a Restricted Role with only "dealer.list" (no dealer.create, no role.create)
        dealer_list_perm = db.query(Permission).filter(Permission.name == "dealer.list").first()
        assert dealer_list_perm is not None, "dealer.list permission should exist"

        restricted_role = db.query(Role).filter(Role.name == "DealerViewer").first()
        if not restricted_role:
            restricted_role = Role(
                name="DealerViewer",
                description="Can only view dealer list",
                is_active=True,
                permissions=[dealer_list_perm]
            )
            db.add(restricted_role)
            db.commit()
            db.refresh(restricted_role)
        else:
            restricted_role.permissions = [dealer_list_perm]
            db.commit()
            db.refresh(restricted_role)

        # Create a Restricted User
        staff_user = db.query(User).filter(User.email == "test_staff_viewer@example.com").first()
        if not staff_user:
            staff_user = User(
                name="Test Staff Viewer",
                email="test_staff_viewer@example.com",
                password=hash_password("staffpass123"),
                role="Staff",
                role_id=restricted_role.id,
                is_active=True
            )
            db.add(staff_user)
            db.commit()
            db.refresh(staff_user)
        else:
            staff_user.role_id = restricted_role.id
            staff_user.role = "Staff"
            db.commit()

        staff_token = create_access_token({"sub": str(staff_user.id), "email": staff_user.email, "role": "Staff"})
        staff_headers = {"Authorization": f"Bearer {staff_token}"}

        # 6. Test Restricted user CAN list dealers
        response = client.get("/dealers/", headers=staff_headers)
        assert response.status_code == 200, f"Expected 200 for Staff on /dealers/, got {response.status_code}: {response.text}"
        print("[PASS] Restricted user with 'dealer.list' permission can list dealers (200 OK)")

        # 7. Test Restricted user CANNOT create dealer -> 403 Forbidden
        response = client.post(
            "/dealers/",
            json={"name": "Forbidden Dealer", "contact_person": "None", "commission_type": "PERCENTAGE", "commission_value": 5.0},
            headers=staff_headers
        )
        assert response.status_code == 403, f"Expected 403 for Staff on /dealers/ create, got {response.status_code}: {response.text}"
        assert "dealer.create" in response.json().get("detail", ""), "Error detail should mention required permission"
        print("[PASS] Restricted user without 'dealer.create' receives 403 Forbidden with permission details")

        # 8. Test Restricted user CANNOT access /roles/ -> 403 Forbidden
        response = client.get("/roles/", headers=staff_headers)
        assert response.status_code == 403, f"Expected 403 for Staff on /roles/, got {response.status_code}: {response.text}"
        print("[PASS] Restricted user without 'role.list' receives 403 Forbidden")

        # 9. Test Dynamic Permission Assignment: Grant "dealer.create" to restricted_role
        dealer_create_perm = db.query(Permission).filter(Permission.name == "dealer.create").first()
        assert dealer_create_perm is not None
        
        assign_response = client.put(
            f"/roles/{restricted_role.id}/permissions",
            json={"permission_ids": [p.id for p in restricted_role.permissions] + [dealer_create_perm.id]},
            headers=admin_headers
        )
        assert assign_response.status_code == 200, f"Expected 200 on assign_permissions, got {assign_response.status_code}"
        print("[PASS] Successfully assigned new permission 'dealer.create' to role via API")

        # 10. Test /users/me endpoint returns permissions list
        me_response = client.get("/users/me", headers=admin_headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert "permissions" in me_data
        print(f"[PASS] /users/me returns authenticated user details and active permissions count: {len(me_data['permissions'])}")

        print("\n========================================================")
        print("ALL RBAC TESTS PASSED SUCCESSFULLY!")
        print("========================================================")
    finally:
        db.close()

if __name__ == "__main__":
    test_rbac()
