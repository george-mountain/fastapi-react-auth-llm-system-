from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from jose import JWTError, jwt

from repositories import auths, crud, schemas, models
from repositories.database import get_db


from datetime import timedelta
from typing import Annotated, List

from fastapi.responses import JSONResponse
from fastapi_limiter.depends import RateLimiter


router = APIRouter()


@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    login_data: schemas.LoginData,
    db: Session = Depends(get_db),
):
    user, error_message = auths.authenticate_user(
        db, login_data.username, login_data.password
    )

    if error_message:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_message,
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auths.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auths.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    refresh_token_expires = timedelta(minutes=auths.REFRESH_TOKEN_EXPIRE_MINUTES)
    refresh_token = auths.create_refresh_token(
        data={"sub": user.username}, expires_delta=refresh_token_expires
    )
    return schemas.Token(
        access_token=access_token, refresh_token=refresh_token, token_type="bearer"
    )


@router.post("/refresh-token", response_model=schemas.Token)
async def refresh_access_token(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, auths.SECRET_KEY, algorithms=[auths.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=400, detail="Invalid token")
        user = crud.get_user(db, username=username)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        access_token_expires = timedelta(minutes=auths.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auths.create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        return schemas.Token(access_token=access_token, token_type="bearer")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid token")


@router.post("/users/", response_model=schemas.User)
async def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    db_user = crud.get_user(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    user = crud.create_user(db=db, user=user)

    # Generate activation token
    activation_token_expires = timedelta(minutes=60)  # Set the expiration time
    activation_token = auths.create_activation_token(
        data={"sub": user.username}, expires_delta=activation_token_expires
    )

    # Send activation email
    await auths.send_activation_email(user.email, activation_token)
    return user


@router.post("/users/activate/")
async def activate_user(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, auths.SECRET_KEY, algorithms=[auths.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token"
        )
    user = crud.get_user(db, username=username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    user.disabled = False
    db.commit()
    db.refresh(user)
    return {"message": "User activated successfully"}


@router.post("/users/reset-password/")
async def reset_password_request(
    data: schemas.PasswordResetRequest, db: Session = Depends(get_db)
):
    user = crud.get_user_by_email(db, email=data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Generate password reset token
    reset_token_expires = timedelta(minutes=30)  # Set the expiration time
    reset_token = auths.create_password_reset_token(
        data={"sub": user.username}, expires_delta=reset_token_expires
    )

    # Use the provided frontend URL
    frontend_url = data.frontend_url or "http://localhost:5173"
    await auths.send_password_reset_email(user.email, reset_token, frontend_url)
    return {"message": "Password reset email sent"}


@router.post("/users/reset-password/{token}")
async def reset_password(
    token: str, data: schemas.PasswordReset, db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, auths.SECRET_KEY, algorithms=[auths.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token"
        )
    user = crud.get_user(db, username=username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    hashed_password = auths.get_password_hash(data.new_password)
    user.hashed_password = hashed_password
    db.commit()
    db.refresh(user)
    return {"message": "Password reset successful"}


@router.get("/users/me/", response_model=schemas.User)
async def read_users_me(
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)]
):
    return current_user


@router.put("/users/me/", response_model=schemas.User)
async def update_user(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auths.get_current_user),
):
    user = crud.update_user(db=db, user=current_user, user_update=user_update)
    return user


@router.patch("/users/me/", response_model=schemas.User)
async def partial_update_user(
    user_patch: schemas.UserPatch,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auths.get_current_user),
):
    user_update_data = user_patch.dict(exclude_unset=True)
    if not user_update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")
    user = crud.update_user(db=db, user=current_user, user_update=user_update_data)
    return user


@router.get("/users/", response_model=List[schemas.User])
async def read_users(
    current_user: Annotated[schemas.User, Depends(auths.get_current_admin_user)],
    db: Session = Depends(get_db),
):
    return crud.get_users(db)
