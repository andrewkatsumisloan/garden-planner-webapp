# auth.py

import os
from typing import Optional, Dict

import jwt
from jwt import PyJWKClient
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.models import User

import httpx
from contextlib import asynccontextmanager


#
# --- FastAPI with Async HTTP client for JWK fetching ---
#
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.httpx = httpx.AsyncClient(timeout=10.0)
    yield
    await app.state.httpx.aclose()


app = FastAPI(lifespan=lifespan)

security = HTTPBearer()
_jwks_client = PyJWKClient(f"{settings.CLERK_JWT_ISSUER}/.well-known/jwks.json")


def validate_jwt(token: str) -> Dict:
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token).key
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token key ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=settings.CLERK_JWT_ISSUER,
            audience=settings.CLERK_AUDIENCE,
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    x_clerk_user_email: Optional[str] = Header(None),
    x_clerk_user_name: Optional[str] = Header(None),
) -> User:
    token = credentials.credentials
    payload = validate_jwt(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter_by(clerk_user_id=user_id).first()
    if not user:
        # Use the headers provided by the frontend for user info
        email = x_clerk_user_email
        name = x_clerk_user_name

        # Validate that we have the required information
        if not email or not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to create user: Missing required user information. Please ensure the X-Clerk-User-Email and X-Clerk-User-Name headers are provided.",
            )

        user = User(clerk_user_id=user_id, email=email, name=name)
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created new user: {user.id}, {user.email}, {user.name}")

    return user


async def optional_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = validate_jwt(token)
        uid = payload.get("sub")
        return db.query(User).filter_by(clerk_user_id=uid).first()
    except HTTPException:
        return None
