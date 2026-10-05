from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.product import Product
from app.schemas.product import ProductRequest
from app.repositories.product_repository import ProductRepository

class ProductService:

    def __init__(self):
        self.product_repository = ProductRepository()

    def create_product(self, db: Session, product_data: ProductRequest):

        existing_product = self.product_repository.get_by_name(
                db,
                product_data.name
            )

        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Product name already exists."
            )

        product = Product(
            name=product_data.name,
            description=product_data.description,
            is_active=product_data.is_active
        )

        return self.product_repository.create(db, product)


    def get_product_list(self, db: Session):

        return self.product_repository.get_product_list(db)

    def get_product_by_id(self, db: Session, product_id):

        product = self.product_repository.get_product_by_id(db, product_id)

        if not product:
            raise HTTPException(
                status_code = status.HTTP_404_NOT_FOUND,
                detail = "Product not found."
            )

        return product

    def update_product(self, db: Session, product_data: ProductRequest, product_id):

        product = self.product_repository.get_product_by_id(db, product_id)

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found."
            )

        existing_product = self.product_repository.get_by_name(
                db,
                product_data.name,
                product_id
            )

        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Product name already exists."
            )

        return self.product_repository.update(
                db,
                product_id,
                product_data
            )

    def delete_product(self, db: Session, product_id):

        product = self.product_repository.get_product_by_id(db, product_id)

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found."
            )

        return self.product_repository.delete(
                db,
                product_id
            )