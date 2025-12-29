"""
JWT Authentication System for Telivus AI

Implements secure authentication with:
- User registration and login
- JWT token generation and validation  
- Password hashing with bcrypt
- Token refresh mechanism
- Role-based access control (RBAC)
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

# Configuration
SECRET_KEY = "your-secret-key-change-in-production"  # TODO: Move to environment
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token security
security = HTTPBearer()


# Models
class TokenData(BaseModel):
    """JWT token data payload"""
    user_id: str
    email: str
    role: str = "user"
    exp: datetime


class Token(BaseModel):
    """Token response model"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserCreate(BaseModel):
    """User registration model"""
    email: str
    password: str
    name: str


class UserLogin(BaseModel):
    """User login model"""
    email: str
    password: str


class User(BaseModel):
    """User model"""
    id: str
    email: str
    name: str
    role: str = "user"
    is_active: bool = True
    created_at: datetime


# Password utilities
def hash_password(password: str) -> str:
    """
    Hash password using bcrypt.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password against hash.
    
    Args:
        plain_password: Plain text password
        hashed_password: Bcrypt hash
        
    Returns:
        True if password matches
    """
    return pwd_context.verify(plain_password, hashed_password)


# JWT token utilities
def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT access token.
    
    Args:
        data: Token payload data
        expires_delta: Token expiration time
        
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(user_id: str) -> str:
    """
    Create JWT refresh token.
    
    Args:
        user_id: User identifier
        
    Returns:
        Encoded refresh token
    """
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "user_id": user_id,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    }
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> TokenData:
    """
    Decode and validate JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        TokenData object
        
    Raises:
        HTTPException: If token is invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        user_id: str = payload.get("user_id")
        email: str = payload.get("email")
        role: str = payload.get("role", "user")
        exp: datetime = datetime.fromtimestamp(payload.get("exp"))
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user_id",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        return TokenData(
            user_id=user_id,
            email=email,
            role=role,
            exp=exp
        )
    
    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )


# FastAPI dependencies
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenData:
    """
    Dependency to get current authenticated user.
    
    Usage:
        @app.get("/protected")
        async def protected_route(user: TokenData = Depends(get_current_user)):
            return {"user_id": user.user_id}
    
    Args:
        credentials: HTTP Bearer credentials
        
    Returns:
        TokenData for authenticated user
        
    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    return decode_token(token)


async def get_current_active_user(
    current_user: TokenData = Depends(get_current_user)
) -> TokenData:
    """
    Dependency to ensure user is active.
    
    Args:
        current_user: Current user from token
        
    Returns:
        TokenData if user is active
        
    Raises:
        HTTPException: If user is inactive
    """
    # TODO: Check if user is active in database
    # For now, assume all users are active
    return current_user


# Role-based access control
class RoleChecker:
    """
    Dependency class for role-based access control.
    
    Usage:
        @app.get("/admin", dependencies=[Depends(RoleChecker(["admin"]))])
        async def admin_only():
            return {"message": "Admin access"}
    """
    
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles
    
    async def __call__(
        self,
        user: TokenData = Depends(get_current_user)
    ) -> TokenData:
        """
        Check if user has required role.
        
        Args:
            user: Current authenticated user
            
        Returns:
            TokenData if authorized
            
        Raises:
            HTTPException: If user lacks required role
        """
        if user.role not in self.allowed_roles:
            logger.warning(
                f"User {user.user_id} with role {user.role} "
                f"attempted to access resource requiring {self.allowed_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {self.allowed_roles}"
            )
        return user


# Helper functions for user management
async def authenticate_user(email: str, password: str) -> Optional[User]:
    """
    Authenticate user by email and password.
    
    Args:
        email: User email
        password: Plain text password
        
    Returns:
        User object if authentication successful, None otherwise
    """
    # TODO: Implement actual database lookup
    # This is a placeholder
    logger.info(f"Authenticating user: {email}")
    
    # Mock user for development
    if email == "demo@telivus.ai" and password == "demo123":
        return User(
            id="demo_user_123",
            email=email,
            name="Demo User",
            role="user",
            is_active=True,
            created_at=datetime.utcnow()
        )
    
    return None


async def create_user(user_data: UserCreate) -> User:
    """
    Create new user account.
    
    Args:
        user_data: User registration data
        
    Returns:
        Created user object
        
    Raises:
        HTTPException: If email already exists
    """
    # TODO: Implement actual database storage
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create user (mock)
    user = User(
        id=f"user_{datetime.utcnow().timestamp()}",
        email=user_data.email,
        name=user_data.name,
        role="user",
        is_active=True,
        created_at=datetime.utcnow()
    )
    
    logger.info(f"Created new user: {user_data.email}")
    
    return user


async def login_user(credentials: UserLogin) -> Token:
    """
    Login user and return JWT tokens.
    
    Args:
        credentials: User login credentials
        
    Returns:
        Access and refresh tokens
        
    Raises:
        HTTPException: If authentication fails
    """
    user = await authenticate_user(credentials.email, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Create tokens
    access_token = create_access_token(
        data={
            "user_id": user.id,
            "email": user.email,
            "role": user.role
        }
    )
    
    refresh_token = create_refresh_token(user.id)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
