from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.rbac import get_partner_scope
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseRequest
from app.repositories.season_partner_repository import SeasonPartnerRepository
from app.repositories.expense_repository import ExpenseRepository
from app.repositories.season_repository import SeasonRepository
from app.repositories.farm_repository import FarmRepository

class ExpenseService:

    def __init__(self):
        self.season_partner_repository = SeasonPartnerRepository()
        self.expense_repository = ExpenseRepository()
        self.season_repository = SeasonRepository()
        self.farm_repository = FarmRepository()


    def _validate_foreign_keys(self, db: Session, season_id: int, farm_id: int | None):
        season = self.season_repository.get_season_by_id(db, season_id)
        if season is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Season not found."
            )

        if farm_id is not None:
            farm = self.farm_repository.get_farm_by_id(db, farm_id)
            if farm is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Farm not found."
                )

    def create_expense(self, db: Session, expense_data: ExpenseRequest):
        season_farm_ids = self.season_partner_repository.get_farms_by_season(db, expense_data.season_id)
        if expense_data.farm_id is not None:
            if expense_data.farm_id not in season_farm_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Farm is not associated with the selected season."
                )
        else:
            # If no farm_id, verify season exists
            if not self.season_repository.get_season_by_id(db, expense_data.season_id):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Season not found."
                )

        expense = Expense(
            season_id=expense_data.season_id,
            farm_id=expense_data.farm_id,
            expense_date=expense_data.expense_date,
            expense_type=expense_data.expense_type,
            description=expense_data.description,
            amount=expense_data.amount,
            paid_to=expense_data.paid_to,
            payment_mode=expense_data.payment_mode,
            remarks=expense_data.remarks,
            created_by=expense_data.created_by
        )

        return self.expense_repository.create(db, expense)

    def get_expense_list(self, db: Session, season_id: int | None = None, farm_id: int | None = None, current_user: User | None = None):
        allowed_season_ids = None
        allowed_farm_ids = None
        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                allowed_season_ids = scope["season_ids"]
                allowed_farm_ids = scope["farm_ids"]

        return self.expense_repository.get_expense_list(
            db, season_id=season_id, farm_id=farm_id,
            allowed_season_ids=allowed_season_ids, allowed_farm_ids=allowed_farm_ids
        )

    def get_expense_by_id(self, db: Session, expense_id: int, current_user: User | None = None):
        expense = self.expense_repository.get_expense_by_id(db, expense_id)

        if expense is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found."
            )

        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                if expense.season_id not in scope["season_ids"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to this expense."
                    )

        return expense

    def update_expense(self, db: Session, expense_data: ExpenseRequest, expense_id: int):
        expense = self.get_expense_by_id(db, expense_id)

        season_farm_ids = self.season_partner_repository.get_farms_by_season(db, expense_data.season_id)
        if expense_data.farm_id is not None:
            if expense_data.farm_id not in season_farm_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Farm is not associated with the selected season."
                )
        else:
            if not self.season_repository.get_season_by_id(db, expense_data.season_id):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Season not found."
                )

        return self.expense_repository.update(db, expense, expense_data)

    def delete_expense(self, db: Session, expense_id: int):
        expense = self.get_expense_by_id(db, expense_id)
        return self.expense_repository.delete(db, expense)

