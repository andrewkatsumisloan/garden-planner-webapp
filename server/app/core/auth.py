# ===== File: server/app/core/auth.py =====
import os
from typing import Optional, Dict

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.models import User

import httpx

security = HTTPBearer()
# Initialize the JWKS client once. It will cache keys automatically.
_jwks_client = PyJWKClient(f"{settings.CLERK_JWT_ISSUER}/.well-known/jwks.json")


def validate_jwt(token: str) -> Dict:
    """
    Validates the JWT token from Clerk.
    """
    try:
        # Get the signing key from the JWKS endpoint
        signing_key = _jwks_client.get_signing_key_from_jwt(token).key
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token key: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Decode the token
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=settings.CLERK_JWT_ISSUER,
            # The audience claim can sometimes be the frontend URL.
            # We will not validate it strictly unless CLERK_AUDIENCE is set.
            # audience=settings.CLERK_AUDIENCE,
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
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency to get the current user.
    Validates JWT and creates a user in the DB if they don't exist (JIT provisioning).
    """
    token = credentials.credentials
    payload = validate_jwt(token)

    # Get user ID from the subject claim
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject (sub) claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user exists in our database
    user = db.query(User).filter_by(clerk_user_id=user_id).first()

    # If user does not exist, create them (Just-In-Time Provisioning)
    if not user:
        # Get Clerk API key from environment
        clerk_api_key = settings.CLERK_SECRET_KEY
        if not clerk_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Clerk secret key not configured on the server.",
            )

        # Fetch user data from Clerk API
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {clerk_api_key}"}
                response = await client.get(
                    f"https://api.clerk.dev/v1/users/{user_id}",
                    headers=headers,
                )
                response.raise_for_status()  # Raise an exception for bad status codes
                clerk_user_data = response.json()

            # Extract email and name from Clerk data
            primary_email_id = clerk_user_data.get("primary_email_address_id")
            email_obj = next(
                (
                    e
                    for e in clerk_user_data.get("email_addresses", [])
                    if e.get("id") == primary_email_id
                ),
                None,
            )
            email = email_obj.get("email_address") if email_obj else None

            first_name = clerk_user_data.get("first_name")
            last_name = clerk_user_data.get("last_name")
            name = f"{first_name} {last_name}".strip() or clerk_user_data.get(
                "username"
            )

            if not email or not name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing required user information (email, name) from Clerk.",
                )

            # Create the user in our database
            user = User(clerk_user_id=user_id, email=email, name=name)
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created new user from Clerk: ID={user.id}, Email={user.email}")

        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to get user data from Clerk: {e.response.text}",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching or creating user from Clerk: {str(e)}",
            )

    return user


async def optional_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Dependency to optionally get the current user.
    Returns None if no valid token is provided.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = validate_jwt(token)
        uid = payload.get("sub")
        if not uid:
            return None
        return db.query(User).filter_by(clerk_user_id=uid).first()
    except HTTPException:
        return None
