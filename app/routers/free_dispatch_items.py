from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.schemas.free_dispatch_item import (
    FreeDispatchItemListResponse,
    FreeDispatchItemRequest,
    FreeDispatchItemResponse,
)
from app.services.free_dispatch_item_service import FreeDispatchItemService

router = APIRouter(prefix="/free_dispatch_items", tags=["FreeDispatchItems"])

free_dispatch_item_service = FreeDispatchItemService()


@router.post("/", response_model=FreeDispatchItemResponse, dependencies=[Depends(require_permission("free_dispatch_item.create"))])
def create_free_dispatch_item(free_dispatch_item: FreeDispatchItemRequest, db: Session = Depends(get_db)):
    return free_dispatch_item_service.create_free_dispatch_item(db, free_dispatch_item)


@router.get("/list/{dispatch_id}", response_model=list[FreeDispatchItemListResponse], dependencies=[Depends(require_permission("free_dispatch_item.list"))])
def get_free_dispatch_item_list(dispatch_id: int, db: Session = Depends(get_db)):
    return free_dispatch_item_service.get_free_dispatch_item_list(db, dispatch_id)


@router.get("/{free_dispatch_item_id}", response_model=FreeDispatchItemResponse, dependencies=[Depends(require_permission("free_dispatch_item.view"))])
def get_free_dispatch_item_detail(free_dispatch_item_id: int, db: Session = Depends(get_db)):
    return free_dispatch_item_service.get_free_dispatch_item_by_id(db, free_dispatch_item_id)


@router.put("/{free_dispatch_item_id}", response_model=FreeDispatchItemResponse, dependencies=[Depends(require_permission("free_dispatch_item.update"))])
def update_free_dispatch_item(free_dispatch_item: FreeDispatchItemRequest, free_dispatch_item_id: int, db: Session = Depends(get_db)):
    return free_dispatch_item_service.update_free_dispatch_item(db, free_dispatch_item, free_dispatch_item_id)


@router.delete("/{free_dispatch_item_id}", response_model=FreeDispatchItemResponse, dependencies=[Depends(require_permission("free_dispatch_item.delete"))])
def delete_free_dispatch_item(free_dispatch_item_id: int, db: Session = Depends(get_db)):
    return free_dispatch_item_service.delete_free_dispatch_item(db, free_dispatch_item_id)
