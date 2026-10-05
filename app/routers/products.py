from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.schemas.product import ProductRequest, ProductResponse
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])

product_service = ProductService()


@router.post("/", response_model=ProductResponse, dependencies=[Depends(require_permission("product.create"))])
def create_product(product: ProductRequest, db: Session = Depends(get_db)):
    return product_service.create_product(db, product)


@router.get("/", response_model=list[ProductResponse], dependencies=[Depends(require_permission("product.list"))])
def get_product_list(db: Session = Depends(get_db)):
    return product_service.get_product_list(db)


@router.get("/{product_id}", response_model=ProductResponse, dependencies=[Depends(require_permission("product.view"))])
def get_product_detail(product_id: int, db: Session = Depends(get_db)):
    return product_service.get_product_by_id(db, product_id)


@router.put("/{product_id}", response_model=ProductResponse, dependencies=[Depends(require_permission("product.update"))])
def update_product(product: ProductRequest, product_id: int, db: Session = Depends(get_db)):
    return product_service.update_product(db, product, product_id)


@router.delete("/{product_id}", response_model=ProductResponse, dependencies=[Depends(require_permission("product.delete"))])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    return product_service.delete_product(db, product_id)