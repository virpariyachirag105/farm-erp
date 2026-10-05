from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.schemas.dispatch_item import DispatchItemRequest, DispatchItemResponse
from app.services.dispatch_item_service import DispatchItemService

router = APIRouter(prefix="/dispatch_items", tags=["DispatchItems"])

dispatch_item_service = DispatchItemService()


@router.post("/", response_model=DispatchItemResponse, dependencies=[Depends(require_permission("dispatch_item.create"))])
def create_dispatch_item(dispatch_item: DispatchItemRequest, db: Session = Depends(get_db)):
    return dispatch_item_service.create_dispatch_item(db, dispatch_item)


@router.get("/", response_model=list[DispatchItemResponse], dependencies=[Depends(require_permission("dispatch_item.list"))])
def get_dispatch_item_list(db: Session = Depends(get_db)):
    return dispatch_item_service.get_dispatch_item_list(db)


@router.get("/{dispatch_item_id}", response_model=DispatchItemResponse, dependencies=[Depends(require_permission("dispatch_item.view"))])
def get_dispatch_item_detail(dispatch_item_id: int, db: Session = Depends(get_db)):
    return dispatch_item_service.get_dispatch_item_by_id(db, dispatch_item_id)


@router.put("/{dispatch_item_id}", response_model=DispatchItemResponse, dependencies=[Depends(require_permission("dispatch_item.update"))])
def update_dispatch_item(dispatch_item: DispatchItemRequest, dispatch_item_id: int, db: Session = Depends(get_db)):
    return dispatch_item_service.update_dispatch_item(db, dispatch_item, dispatch_item_id)


@router.delete("/{dispatch_item_id}", response_model=DispatchItemResponse, dependencies=[Depends(require_permission("dispatch_item.delete"))])
def delete_dispatch_item(dispatch_item_id: int, db: Session = Depends(get_db)):
    return dispatch_item_service.delete_dispatch_item(db, dispatch_item_id)
