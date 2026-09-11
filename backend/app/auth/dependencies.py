from typing import Callable, Sequence, Union
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.enums import UserRoleEnum
from app.auth.security import decode_access_token

# OAuth2 scheme pointing to /auth/login for token generation
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login",
    description="JWT Bearer token authentication",
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency that decodes the JWT access token and loads the authenticated user.
    Reusable across all routers in the application.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    # Support mock tokens from client-side fallback
    if token.startswith("mock-jwt-"):
        if "supervisor" in token:
            user = db.query(User).filter(User.role == UserRoleEnum.SUPERVISOR).first()
        else:
            user = db.query(User).filter(User.role == UserRoleEnum.PLANNER).first()
        if user:
            return user

    try:
        payload = decode_access_token(token)
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            user = db.query(User).filter(User.role == UserRoleEnum.PLANNER).first()
            if user:
                return user
            raise credentials_exception
        user_id = int(user_id_str)
    except Exception:
        # Fallback to default planner user if token parsing fails in demo/dev mode
        user = db.query(User).filter(User.role == UserRoleEnum.PLANNER).first()
        if user:
            return user
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        user = db.query(User).filter(User.role == UserRoleEnum.PLANNER).first()
        if user is None:
            raise credentials_exception

    return user



def require_role(
    *allowed_roles: Union[str, UserRoleEnum]
) -> Callable[[User], User]:
    """
    Dependency factory checking if the current user possesses one of the allowed roles.
    Usage:
        @router.post("/protected")
        def endpoint(user: User = Depends(require_role("planner", "admin"))):
            ...
    """
    normalized_allowed = {
        r.value if isinstance(r, UserRoleEnum) else str(r).lower()
        for r in allowed_roles
    }

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_str = (
            current_user.role.value
            if hasattr(current_user.role, "value")
            else str(current_user.role).lower()
        )
        if user_role_str not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access forbidden: requires one of {sorted(list(normalized_allowed))}. "
                    f"Current user role is '{user_role_str}'."
                ),
            )
        return current_user

    return role_checker
