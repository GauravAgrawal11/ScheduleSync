from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.enums import UserRoleEnum


class UserBase(BaseModel):
    name: str = Field(..., description="Full name of the user", examples=["John Doe"])
    email: EmailStr = Field(..., description="Unique email address", examples=["john.doe@oilindia.in"])
    role: UserRoleEnum = Field(
        default=UserRoleEnum.SUPERVISOR,
        description="Role-based permission level (supervisor, planner, admin)",
        examples=["planner"],
    )
    discipline: Optional[str] = Field(
        default=None,
        description="Engineering discipline (e.g. Piping, Civil, Electrical)",
        examples=["Piping"],
    )


class UserRegister(UserBase):
    password: str = Field(
        ...,
        min_length=6,
        description="Plain text password (min 6 characters)",
        examples=["StrongP@ssw0rd!"],
    )


class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="Registered email", examples=["planner@oilindia.in"])
    password: str = Field(..., description="Password", examples=["StrongP@ssw0rd!"])


class UserResponse(UserBase):
    id: int = Field(..., description="Unique User ID", examples=[1])
    created_at: datetime = Field(..., description="Account creation timestamp")

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str = Field(..., description="JWT Bearer token")
    token_type: str = Field(default="bearer", description="Token type, always 'bearer'")
    user: Optional[UserResponse] = Field(default=None, description="Authenticated user info")


class TokenData(BaseModel):
    sub: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
