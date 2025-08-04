from fastapi import APIRouter

from app.api.routes.user import router as user_router
from app.api.routes.garden import router as garden_router

api_router = APIRouter()

# Include all routes here
api_router.include_router(user_router, prefix="/users", tags=["users"])
api_router.include_router(garden_router, prefix="/garden", tags=["garden"])
