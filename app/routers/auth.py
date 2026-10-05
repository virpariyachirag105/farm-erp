from fastapi import APIRouter, Depends, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["Auth"])

user_service = UserService()


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    return user_service.login(db, login_data.email, login_data.password)


@router.post("/register", response_model=RegisterResponse)
def register(reg_data: RegisterRequest, db: Session = Depends(get_db)):
    return user_service.register(db, reg_data)


@router.post("/verify-email", response_model=MessageResponse)
def verify_email_post(req: VerifyEmailRequest, db: Session = Depends(get_db)):
    return user_service.verify_email(db, req.token)


@router.get("/verify-email", response_model=MessageResponse)
def verify_email_get(token: str = Query(..., description="Verification token"), db: Session = Depends(get_db)):
    return user_service.verify_email(db, token)


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(req: ResendVerificationRequest, db: Session = Depends(get_db)):
    return user_service.resend_verification_email(db, req.email)


@router.post("/token", response_model=TokenResponse)
def login_with_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    return user_service.login(db, form_data.username, form_data.password)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return user_service.forgot_password(db, req.email)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    return user_service.reset_password(db, req.token, req.new_password)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.change_password(db, current_user.id, req.current_password, req.new_password)


