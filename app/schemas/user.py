from pydantic import BaseModel, EmailStr, Field

from app.common.enum import UserRole
from app.schemas.role import RoleResponse


class UserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str | None = Field(default=None, min_length=6)
    mobile: str | None = None
    role: UserRole | str | None = None
    role_id: int | None = None
    is_active: bool = True
    is_verified: bool | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    mobile: str | None = None
    image: str | None = None
    role: str | None = None
    role_id: int | None = None
    role_rel: RoleResponse | None = None
    permissions: list[str] = Field(default_factory=list)
    partner_season_ids: list[int] = Field(default_factory=list)
    partner_farm_ids: list[int] = Field(default_factory=list)
    season_partner_ids: list[int] = Field(default_factory=list)
    is_active: bool
    is_verified: bool = False

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6)
    mobile: str | None = None


class RegisterResponse(BaseModel):
    message: str
    email: EmailStr
    is_verified: bool = False


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class MessageResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


