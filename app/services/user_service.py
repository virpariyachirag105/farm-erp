import time
from collections import defaultdict
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.common.email_service import send_password_reset_email, send_verification_email
from app.common.enum import UserRole
from app.common.file_storage import delete_file_if_exists, save_user_image

from app.core.rbac import get_user_permissions, get_partner_scope, is_admin_user
from app.core.security import (
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    hash_password,
    verify_email_verification_token,
    verify_password,
    verify_password_reset_token,
)
from app.models.user import User
from app.models.season_partner import SeasonPartner
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import (
    ForgotPasswordResponse,
    MessageResponse,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UserRequest,
    UserResponse,
)




class UserService:

    def __init__(self):
        self.user_repository = UserRepository()
        self.role_repository = RoleRepository()
        self._resend_cooldowns: dict[str, list[float]] = {}

    def _check_resend_rate_limit(self, email: str):
        now = time.time()
        norm_email = email.strip().lower()
        timestamps = self._resend_cooldowns.get(norm_email, [])
        # Keep timestamps from the last 15 minutes (900 seconds)
        timestamps = [t for t in timestamps if now - t < 900]

        if timestamps and (now - timestamps[-1] < 60):
            wait_time = int(60 - (now - timestamps[-1]))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {wait_time} seconds before requesting another verification email."
            )

        if len(timestamps) >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many verification requests. Please try again in 15 minutes."
            )

        timestamps.append(now)
        self._resend_cooldowns[norm_email] = timestamps

    def _ensure_unique_email(self, db: Session, email: str, user_id: int | None = None):

        existing_user = self.user_repository.get_by_email(db, email, user_id)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User email already exists."
            )

    def _require_admin(self, current_user: User | None):
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required."
            )

    def _build_user_response(self, user: User, db: Session | None = None, user_season_partners: list = None) -> UserResponse:
        permissions = get_user_permissions(user)
        user_res = UserResponse.model_validate(user)
        user_res.permissions = permissions
        if user_season_partners is not None:
            sp_ids = [p.id for p in user_season_partners]
            s_ids = list(set(p.season_id for p in user_season_partners if p.season_id is not None))
            f_ids = list(set(p.farm_id for p in user_season_partners if p.farm_id is not None))
            user_res.partner_season_ids = s_ids
            user_res.partner_farm_ids = f_ids
            user_res.season_partner_ids = sp_ids
        elif db is not None:
            scope = get_partner_scope(db, user)
            user_res.partner_season_ids = scope.get("season_ids", [])
            user_res.partner_farm_ids = scope.get("farm_ids", [])
            user_res.season_partner_ids = scope.get("season_partner_ids", [])
        return user_res

    def create_user(self, db: Session, user_data: UserRequest, current_user: User | None = None) -> UserResponse:
        if not user_data.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is required."
            )

        is_first_user = self.user_repository.count_users(db) == 0
        role_id = user_data.role_id
        role_str = user_data.role if isinstance(user_data.role, str) else (user_data.role.value if user_data.role else None)

        if is_first_user:
            # First user is automatically assigned Admin role
            admin_role = self.role_repository.get_by_name(db, "Admin")
            if admin_role:
                role_id = admin_role.id
                role_str = admin_role.name
            else:
                role_str = UserRole.ADMIN.value
        else:
            self._require_admin(current_user)

            if role_id is not None:
                role_obj = self.role_repository.get_by_id(db, role_id)
                if not role_obj:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Role with ID {role_id} does not exist."
                    )
                role_str = role_obj.name
            elif role_str:
                role_obj = self.role_repository.get_by_name(db, role_str)
                if role_obj:
                    role_id = role_obj.id

        self._ensure_unique_email(db, user_data.email)

        is_verified = user_data.is_verified if user_data.is_verified is not None else (True if is_first_user else False)

        user = User(
            name=user_data.name,
            email=user_data.email,
            password=hash_password(user_data.password),
            mobile=user_data.mobile,
            role=role_str or UserRole.STAFF.value,
            role_id=role_id,
            is_active=user_data.is_active,
            is_verified=is_verified
        )

        created_user = self.user_repository.create(db, user)
        # Re-fetch with joined relations
        full_user = self.user_repository.get_user_by_id(db, created_user.id)
        return self._build_user_response(full_user, db)

    def get_user_list(self, db: Session) -> list[UserResponse]:
        users = self.user_repository.get_user_list(db)
        if not users:
            return []

        user_ids = [u.id for u in users]
        all_sp = db.query(SeasonPartner).filter(SeasonPartner.user_id.in_(user_ids)).all()
        sp_by_user = defaultdict(list)
        for sp in all_sp:
            sp_by_user[sp.user_id].append(sp)

        return [self._build_user_response(u, db=db, user_season_partners=sp_by_user.get(u.id, [])) for u in users]

    def get_user_by_id(self, db: Session, user_id: int) -> User:
        user = self.user_repository.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )
        return user

    def get_user_profile_response(self, db: Session, user_id: int) -> UserResponse:
        user = self.get_user_by_id(db, user_id)
        return self._build_user_response(user, db)

    def update_user(self, db: Session, user_data: UserRequest, user_id: int, current_user: User) -> UserResponse:
        user = self.user_repository.get_user_by_id(db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )

        is_admin = is_admin_user(current_user)

        if not is_admin and current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own profile."
            )


        if not is_admin:
            user_data.role = user.role
            user_data.role_id = user.role_id
            user_data.is_active = user.is_active
        else:
            if user_data.role_id is not None:
                role_obj = self.role_repository.get_by_id(db, user_data.role_id)
                if not role_obj:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Role with ID {user_data.role_id} does not exist."
                    )
                user_data.role = role_obj.name

        self._ensure_unique_email(db, user_data.email, user_id)

        hashed_password = None
        if user_data.password:
            hashed_password = hash_password(user_data.password)

        updated_user = self.user_repository.update(db, user_id, user_data, hashed_password)
        return self._build_user_response(updated_user, db)

    def delete_user(self, db: Session, user_id: int, current_user: User) -> UserResponse:
        self._require_admin(current_user)

        user = self.user_repository.get_user_by_id(db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )

        if user.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot delete your own account."
            )

        response_data = self._build_user_response(user, db)
        if user.image:
            delete_file_if_exists(user.image)

        self.user_repository.delete(db, user_id)
        return response_data

    def upload_user_image(self, db: Session, user_id: int, file: UploadFile, current_user: User) -> UserResponse:
        user = self.get_user_by_id(db, user_id)

        is_admin_str = current_user.role and current_user.role.upper() in ("ADMIN", "SUPERADMIN")
        is_admin_rel = current_user.role_rel and current_user.role_rel.name.upper() in ("ADMIN", "SUPERADMIN")
        is_admin = is_admin_str or is_admin_rel

        if not is_admin and current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own image."
            )

        image_path = save_user_image(file)
        delete_file_if_exists(user.image)
        updated_user = self.user_repository.update_image(db, user, image_path)
        return self._build_user_response(updated_user, db)

    def login(self, db: Session, email: str, password: str) -> TokenResponse:
        user = self.user_repository.get_by_email(db, email)

        if user is None or not verify_password(password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive."
            )

        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your email address has not been verified yet. Please check your inbox for the verification link or request a new one."
            )

        if not user.password.startswith("$2"):
            user = self.user_repository.update_password(db, user, hash_password(password))

        access_token = create_access_token({
            "sub": str(user.id),
            "email": user.email,
            "role": user.role_rel.name if user.role_rel else (user.role or "STAFF")
        })

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=self._build_user_response(user, db)
        )

    def register(self, db: Session, reg_data: RegisterRequest) -> RegisterResponse:
        self._ensure_unique_email(db, reg_data.email)

        is_first_user = self.user_repository.count_users(db) == 0
        role_id = None
        role_str = UserRole.STAFF.value

        if is_first_user:
            admin_role = self.role_repository.get_by_name(db, "Admin")
            if admin_role:
                role_id = admin_role.id
                role_str = admin_role.name
            else:
                role_str = UserRole.ADMIN.value
        else:
            staff_role = self.role_repository.get_by_name(db, "Staff")
            if staff_role:
                role_id = staff_role.id
                role_str = staff_role.name

        user = User(
            name=reg_data.name,
            email=reg_data.email,
            password=hash_password(reg_data.password),
            mobile=reg_data.mobile,
            role=role_str,
            role_id=role_id,
            is_active=True,
            is_verified=False
        )

        created_user = self.user_repository.create(db, user)

        # Dispatch verification email via Brevo SMTP
        verification_token = create_email_verification_token(created_user.email)
        send_verification_email(
            to_email=created_user.email,
            token=verification_token,
            user_name=created_user.name
        )

        # Initialize resend cooldown
        self._resend_cooldowns[created_user.email.strip().lower()] = [time.time()]

        return RegisterResponse(
            message="Registration successful! We have sent a verification link to your email. Please verify your email before signing in.",
            email=created_user.email,
            is_verified=False
        )


    def verify_email(self, db: Session, token: str) -> MessageResponse:
        email = verify_email_verification_token(token)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired email verification link."
            )

        user = self.user_repository.get_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found."
            )

        if user.is_verified:
            return MessageResponse(
                message="Your email is already verified! You can sign in to your account."
            )

        user.is_verified = True
        db.commit()
        db.refresh(user)

        return MessageResponse(
            message="Email verified successfully! You can now log in to your account."
        )

    def resend_verification_email(self, db: Session, email: str) -> MessageResponse:
        norm_email = email.strip().lower()
        self._check_resend_rate_limit(norm_email)

        user = self.user_repository.get_by_email(db, norm_email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email address."
            )

        if user.is_verified:
            return MessageResponse(
                message="Your account email is already verified. You can log in directly."
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is inactive. Please contact your system administrator."
            )

        token = create_email_verification_token(user.email)
        send_verification_email(
            to_email=user.email,
            token=token,
            user_name=user.name
        )

        return MessageResponse(
            message="A fresh verification link has been sent to your email address. Please check your inbox."
        )


    def forgot_password(self, db: Session, email: str) -> ForgotPasswordResponse:
        user = self.user_repository.get_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email address."
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is inactive. Please contact your system administrator."
            )

        token = create_password_reset_token(user.email)
        send_password_reset_email(to_email=user.email, reset_token=token, user_name=user.name)

        return ForgotPasswordResponse(
            message="A password reset link has been sent to your registered email address. Please check your inbox."
        )



    def reset_password(self, db: Session, token: str, new_password: str) -> MessageResponse:
        email = verify_password_reset_token(token)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset link/token."
            )

        user = self.user_repository.get_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found."
            )

        hashed_new_password = hash_password(new_password)
        self.user_repository.update_password(db, user, hashed_new_password)

        return MessageResponse(
            message="Password has been successfully reset. You may now log in with your new password."
        )

    def change_password(
        self,
        db: Session,
        user_id: int,
        current_password: str,
        new_password: str
    ) -> MessageResponse:
        user = self.user_repository.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )

        if not verify_password(current_password, user.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect."
            )

        if current_password == new_password or verify_password(new_password, user.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password cannot be the same as your current password."
            )

        hashed_new_password = hash_password(new_password)
        self.user_repository.update_password(db, user, hashed_new_password)

        return MessageResponse(
            message="Your password has been changed successfully."
        )

