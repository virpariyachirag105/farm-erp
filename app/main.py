import time
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.concurrency import iterate_in_threadpool

from app.core.logging_config import setup_logging, logger

# Initialize logger
setup_logging()

from app.routers.auth import router as auth_router
from app.routers.users import router as user_router
from app.routers.farms import router as farm_router
from app.routers.dealers import router as dealer_router
from app.routers.seasons import router as season_router
from app.routers.season_partners import router as season_partner_router
from app.routers.products import router as product_router
from app.routers.dispatches import router as dispatch_router
from app.routers.dispatch_items import router as dispatch_item_router
from app.routers.free_dispatch_items import router as free_dispatch_item_router
from app.routers.dispatch_settlements import router as dispatch_settlement_router
from app.routers.dealer_payments import router as dealer_payment_router
from app.routers.expenses import router as expense_router
from app.routers.season_box_costs import router as season_box_cost_router
from app.routers.partner_settlements import router as partner_settlement_router
from app.routers.dealer_calculations import router as dealer_calculation_router
from app.routers.roles import router as role_router
from app.routers.permissions import router as permission_router
from app.models.user import User
from app.models.farm import Farm

app = FastAPI(title="Bhagvati Farm API")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Capture request body for POST/PUT/PATCH/DELETE
        req_body_str = ""
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            try:
                body_bytes = await request.body()
                if body_bytes:
                    req_body_str = body_bytes.decode("utf-8", errors="replace")
            except Exception as e:
                req_body_str = f"<Error reading body: {e}>"

        client_host = request.client.host if request.client else "unknown"
        logger.info(
            f"--> [REQ] {request.method} {request.url.path} "
            f"| Client: {client_host} "
            f"| Query: {dict(request.query_params)} "
            + (f"| Body: {req_body_str}" if req_body_str else "")
        )

        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000

            if response.status_code >= 400:
                response_body = [chunk async for chunk in response.body_iterator]
                response.body_iterator = iterate_in_threadpool(iter(response_body))
                res_body_str = b"".join(response_body).decode("utf-8", errors="replace")
                
                logger.warning(
                    f"<-- [RES ERROR {response.status_code}] {request.method} {request.url.path} "
                    f"| Time: {process_time:.2f}ms | Error Body: {res_body_str}"
                )
            else:
                logger.info(
                    f"<-- [RES {response.status_code}] {request.method} {request.url.path} "
                    f"| Time: {process_time:.2f}ms"
                )

            return response
        except Exception as exc:
            process_time = (time.time() - start_time) * 1000
            logger.exception(
                f"<-- [EXCEPTION] {request.method} {request.url.path} "
                f"| Time: {process_time:.2f}ms | Error: {exc}"
            )
            raise

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(
        f"[HTTPException {exc.status_code}] {request.method} {request.url.path} | Detail: {exc.detail}"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(
        f"[ValidationError 422] {request.method} {request.url.path} | Errors: {exc.errors()}"
    )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

# will NOT update the existing tables, only create new ones
# alembic will handle the database migrations
#Base.metadata.create_all(bind=engine)

uploads_dir = Path("uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
(uploads_dir / "users").mkdir(parents=True, exist_ok=True)
(uploads_dir / "settlements").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

@app.get("/")
def root():
    return {"message": "Welcome to Bhagavati Farm"}

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(farm_router)
app.include_router(dealer_router)
app.include_router(season_router)
app.include_router(season_partner_router)
app.include_router(product_router)
app.include_router(dispatch_router)
app.include_router(dispatch_item_router)
app.include_router(free_dispatch_item_router)
app.include_router(dispatch_settlement_router)
app.include_router(dealer_payment_router)
app.include_router(expense_router)
app.include_router(season_box_cost_router)
app.include_router(partner_settlement_router)
app.include_router(dealer_calculation_router)
app.include_router(role_router)
app.include_router(permission_router)
