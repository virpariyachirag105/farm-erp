from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_current_user_optional
from app.core.rbac import require_permission
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import ChangePasswordRequest, MessageResponse, UserRequest, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])

user_service = UserService()


@router.post("/", response_model=UserResponse)
def create_user(
    user: UserRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    return user_service.create_user(db, user, current_user)


@router.get("/", response_model=list[UserResponse], dependencies=[Depends(require_permission("user.list"))])
def get_user_list(db: Session = Depends(get_db)):
    return user_service.get_user_list(db)


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.get_user_profile_response(db, current_user.id)


@router.post("/me/change-password")
def change_my_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.change_password(db, current_user.id, req.current_password, req.new_password)



@router.get("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_permission("user.view"))])
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db)
):
    return user_service.get_user_profile_response(db, user_id)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user: UserRequest,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.update_user(db, user, user_id, current_user)


@router.post("/{user_id}/image", response_model=UserResponse)
def upload_user_image(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.upload_user_image(db, user_id, file, current_user)


@router.delete("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_permission("user.delete"))])
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.delete_user(db, user_id, current_user)
