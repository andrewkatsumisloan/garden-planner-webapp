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
) -> User:
    token = credentials.credentials
    payload = validate_jwt(token)

    print("JWT Payload:", payload)

    # Get user ID from the subject claim
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user exists in database
    user = db.query(User).filter_by(clerk_user_id=user_id).first()
    if not user:
        # We need to fetch user information from Clerk API
        import httpx
        import os

        # Get Clerk API key from environment
        clerk_api_key = os.getenv("CLERK_SECRET_KEY")
        if not clerk_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Clerk API key not configured",
            )

        # Fetch user data from Clerk API
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {clerk_api_key}"}
                response = await client.get(
                    f"https://api.clerk.dev/v1/users/{user_id}",
                    headers=headers,
                )

                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to get user data from Clerk: {response.text}",
                    )

                clerk_user_data = response.json()

                # Extract email and name from Clerk data
                email = None
                primary_email_obj = next(
                    (
                        e
                        for e in clerk_user_data.get("email_addresses", [])
                        if e.get("id")
                        == clerk_user_data.get("primary_email_address_id")
                    ),
                    None,
                )

                if primary_email_obj:
                    email = primary_email_obj.get("email_address")

                # Get name from Clerk data
                first_name = clerk_user_data.get("first_name")
                last_name = clerk_user_data.get("last_name")

                if first_name and last_name:
                    name = f"{first_name} {last_name}"
                elif first_name:
                    name = first_name
                elif last_name:
                    name = last_name
                else:
                    name = clerk_user_data.get("username")

                if not email or not name:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Unable to create user: Missing required user information from Clerk API.",
                    )

                # Create the user in our database
                user = User(clerk_user_id=user_id, email=email, name=name)
                db.add(user)
                db.commit()
                db.refresh(user)
                print(
                    f"Created new user from Clerk API: {user.id}, {user.email}, {user.name}"
                )

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching user data from Clerk: {str(e)}",
            )

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
