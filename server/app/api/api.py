from fastapi import APIRouter

from app.api.routes.user import router as user_router

api_router = APIRouter()

# Include all routes here
api_router.include_router(user_router, prefix="/users", tags=["users"])

# Add more routers as needed
