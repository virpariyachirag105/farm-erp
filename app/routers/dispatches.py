from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.models.user import User
from app.schemas.dispatch import (
    DispatchCreateWithItems,
    DispatchListResponse,
    DispatchResponse,
    DispatchUpdateWithItems,
)
from app.services.dispatch_service import DispatchService

router = APIRouter(prefix="/dispatches", tags=["Dispatches"])

dispatch_service = DispatchService()


@router.get("/", response_model=list[DispatchListResponse])
def get_dispatch_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dispatch.list"))
):
    return dispatch_service.get_dispatch_list(db, current_user=current_user)


@router.get("/{dispatch_id}", response_model=DispatchResponse)
def get_dispatch_detail(
    dispatch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dispatch.view"))
):
    return dispatch_service.get_dispatch_by_id(db, dispatch_id, current_user=current_user)


@router.delete("/{dispatch_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("dispatch.delete"))])
def delete_dispatch(dispatch_id: int, db: Session = Depends(get_db)):
    dispatch_service.delete_dispatch(db, dispatch_id)


@router.post("/with-items", response_model=DispatchResponse, dependencies=[Depends(require_permission("dispatch.create"))])
def create_dispatch_with_items(dispatch_data: DispatchCreateWithItems, db: Session = Depends(get_db)):
    return dispatch_service.create_dispatch_with_items(db, dispatch_data)


@router.put("/{dispatch_id}", response_model=DispatchResponse, dependencies=[Depends(require_permission("dispatch.update"))])
def update_dispatch_with_items(dispatch: DispatchUpdateWithItems, dispatch_id: int, db: Session = Depends(get_db)):
    return dispatch_service.update_dispatch_with_items(db, dispatch, dispatch_id)