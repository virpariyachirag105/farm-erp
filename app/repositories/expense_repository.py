from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.schemas.expense import ExpenseRequest

class ExpenseRepository:

    def create(self, db: Session, expense: Expense):
        db.add(expense)
        db.commit()
        db.refresh(expense)
        return expense

    def get_expense_list(self, db: Session, season_id=None, farm_id=None, allowed_season_ids: list[int] | None = None, allowed_farm_ids: list[int] | None = None):
        query = db.query(Expense)

        if season_id:
            query = query.filter(Expense.season_id == season_id)
        if farm_id:
            query = query.filter(Expense.farm_id == farm_id)
        if allowed_season_ids is not None:
            query = query.filter(Expense.season_id.in_(allowed_season_ids))
        if allowed_farm_ids is not None:
            query = query.filter(Expense.farm_id.in_(allowed_farm_ids))

        return query.all()

    def get_expense_by_id(self, db: Session, expense_id: int):
        return db.query(Expense).filter(Expense.id == expense_id).first()

    def update(self, db: Session, expense_id_or_obj: int | Expense, expense_data: ExpenseRequest):
        existing_expense = expense_id_or_obj if isinstance(expense_id_or_obj, Expense) else self.get_expense_by_id(db, expense_id_or_obj)
        if existing_expense is None:
            return None

        existing_expense.season_id = expense_data.season_id
        existing_expense.farm_id = expense_data.farm_id
        existing_expense.expense_date = expense_data.expense_date
        existing_expense.expense_type = expense_data.expense_type
        existing_expense.description = expense_data.description
        existing_expense.amount = expense_data.amount
        existing_expense.paid_to = expense_data.paid_to
        existing_expense.payment_mode = expense_data.payment_mode
        existing_expense.remarks = expense_data.remarks
        existing_expense.created_by = expense_data.created_by

        db.commit()
        db.refresh(existing_expense)
        return existing_expense

    def delete(self, db: Session, expense_id_or_obj: int | Expense):
        existing_expense = expense_id_or_obj if isinstance(expense_id_or_obj, Expense) else self.get_expense_by_id(db, expense_id_or_obj)
        if existing_expense is None:
            return None

        db.delete(existing_expense)
        db.commit()
        return existing_expense

