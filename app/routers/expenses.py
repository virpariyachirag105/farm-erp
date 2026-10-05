from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.rbac import require_permission
from app.db.session import get_db
from app.models.user import User
from app.schemas.expense import ExpenseRequest, ExpenseResponse
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/expenses", tags=["Expenses"])

expense_service = ExpenseService()


@router.post("/", response_model=ExpenseResponse, dependencies=[Depends(require_permission("expense.create"))])
def create_expense(expense: ExpenseRequest, db: Session = Depends(get_db)):
    return expense_service.create_expense(db, expense)


@router.get("/", response_model=list[ExpenseResponse])
def get_expense_list(
    season_id: int | None = None,
    farm_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("expense.list"))
):
    return expense_service.get_expense_list(db, season_id, farm_id, current_user=current_user)


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense_detail(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("expense.view"))
):
    return expense_service.get_expense_by_id(db, expense_id, current_user=current_user)


@router.put("/{expense_id}", response_model=ExpenseResponse, dependencies=[Depends(require_permission("expense.update"))])
def update_expense(expense: ExpenseRequest, expense_id: int, db: Session = Depends(get_db)):
    return expense_service.update_expense(db, expense, expense_id)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("expense.delete"))])
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense_service.delete_expense(db, expense_id)
