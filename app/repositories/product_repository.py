from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product import ProductRequest

class ProductRepository:

    def create(self, db:Session, product:Product):
        db.add(product)
        db.commit()
        db.refresh(product)
        return product

    def get_by_name(self, db: Session, name: str, product_id: int = None):

        product_query = db.query(Product)
        if product_id is not None:
            product_query = product_query.filter(Product.id != product_id)
        
        product_query = product_query.filter(Product.name == name).first()
        return product_query

    def get_product_list(self, db: Session):
        return db.query(Product).all()

    def get_product_by_id(self, db: Session, product_id):
        return db.query(Product).filter(Product.id == product_id).first()

    def update(self, db: Session, product_id: int, product_data: ProductRequest):
        existing_product = ( db.query(Product).filter(Product.id == product_id).first())
        if existing_product is None:
            return None

        existing_product.name = product_data.name
        existing_product.description = product_data.description
        existing_product.is_active = product_data.is_active

        db.commit()
        db.refresh(existing_product)

        return existing_product

    def delete(self, db: Session, product_id: int):
        existing_product = ( db.query(Product).filter(Product.id == product_id).first())
        if existing_product is None:
            return None

        existing_product.is_active = False

        db.commit()
        db.refresh(existing_product)

        return existing_product