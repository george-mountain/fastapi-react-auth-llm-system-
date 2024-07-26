from datetime import timedelta
from typing import Annotated, List

import aioredis
import auths
import crud
import models
import schemas
from database import engine, get_db
from fastapi import Depends, FastAPI, HTTPException, Request, status, Query
from fastapi.responses import JSONResponse
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from utils import ChatModel
from contextlib import asynccontextmanager
from dotenv import load_dotenv, find_dotenv
import os

load_dotenv(find_dotenv())

import humanize
from datetime import timedelta

models.Base.metadata.create_all(bind=engine)

ai_models = {}

# Initialize Redis connection
redis_url = os.getenv("REDIS_URL")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global chat_model

    # Initialize ChatModel
    chat_model = ChatModel()
    ai_models["chat_model"] = chat_model

    # Initialize FastAPILimiter
    redis = aioredis.from_url(redis_url, encoding="utf8", decode_responses=True)
    await FastAPILimiter.init(redis)

    yield
    ai_models.clear()


app = FastAPI(lifespan=lifespan)

# CORS

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Custom handler for 429 errors
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request, exc):
    headers = {"Access-Control-Allow-Origin": "*"}
    if exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=headers,
        )
    elif exc.status_code == status.HTTP_401_UNAUTHORIZED:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=headers,
        )
    elif exc.status_code == status.HTTP_404_NOT_FOUND:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=headers,
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    redis = aioredis.from_url(redis_url, encoding="utf8", decode_responses=True)
    ip = request.client.host
    endpoint = request.url.path
    key = f"cooldown:{ip}:{endpoint}"

    # Check if cooldown key exists
    cooldown_expiry = await redis.ttl(key)

    def format_time(seconds):
        return humanize.precisedelta(timedelta(seconds=seconds), minimum_unit="seconds")

    if cooldown_expiry > 0:
        time_left = format_time(cooldown_expiry)
        print(f"Time left to reset rate limit: {time_left}")
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded. Try again later.",
                "time_left": time_left,
            },
            headers={"Access-Control-Allow-Origin": "*"},
        )

    # Process the request
    response = await call_next(request)

    if response.status_code == 429:
        # Set cooldown for 3 minutes
        await redis.set(key, 1, ex=3 * 60)
        cooldown_expiry = await redis.ttl(key)  # Get the new expiry time
        time_left = format_time(cooldown_expiry)
        print(f"Time left to reset rate limit: {time_left}")
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded. Try again later.",
                "time_left": time_left,
            },
            headers={"Access-Control-Allow-Origin": "*"},
        )

    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@app.post("/token", response_model=schemas.Token)
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


@app.post("/refresh-token", response_model=schemas.Token)
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


@app.post("/users/", response_model=schemas.User)
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


@app.post("/users/activate/")
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


@app.post("/users/reset-password/")
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


@app.post("/users/reset-password/{token}")
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


@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)]
):
    return current_user


@app.put("/users/me/", response_model=schemas.User)
async def update_user(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auths.get_current_user),
):
    user = crud.update_user(db=db, user=current_user, user_update=user_update)
    return user


@app.patch("/users/me/", response_model=schemas.User)
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


@app.get(
    "/resource",
    dependencies=[Depends(RateLimiter(times=2, seconds=5))],
)
async def get_resource():
    return JSONResponse(content={"message": "Resource accessed successfully"})


@app.post("/users/me/items/", response_model=schemas.Item)
async def create_item_for_user(
    item: schemas.ItemCreate,
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)],
    db: Session = Depends(get_db),
):
    return crud.create_item(db=db, item=item, user_id=current_user.id)


@app.get("/users/me/items/")
async def read_own_items(
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)],
    db: Session = Depends(get_db),
):
    return crud.get_items(db=db, user_id=current_user.id)


@app.delete("/users/me/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: int,
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)],
    db: Session = Depends(get_db),
):
    item = crud.get_item(db=db, item_id=item_id, user_id=current_user.id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()
    return JSONResponse(
        content={"message": "Item deleted successfully"},
        status_code=status.HTTP_204_NO_CONTENT,
    )


@app.get("/users/", response_model=List[schemas.User])
async def read_users(
    current_user: Annotated[schemas.User, Depends(auths.get_current_admin_user)],
    db: Session = Depends(get_db),
):
    return crud.get_users(db)


@app.post("/chat", dependencies=[Depends(RateLimiter(times=2, seconds=60))])
async def chat_endpoint(
    request: schemas.ChatRequest,
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)],
    db: Session = Depends(get_db),
):

    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    # Create a new chat session for the user
    chat = crud.create_chat(db, user_id=current_user.id)

    # Save user's message
    crud.create_message(db, chat_id=chat.id, sender="user", content=request.user_prompt)

    # Generate bot response
    response = chat_model.generate(
        user_prompt=request.user_prompt,
        system_prompt=chat_model.DEFAULT_SYSTEM_PROMPT,
        top_p=request.top_p,
        temperature=request.temperature,
        max_new_tokens=request.max_new_tokens,
    )

    # Save bot's response
    crud.create_message(db, chat_id=chat.id, sender="bot", content=response)

    return {"response": response}


@app.get("/chats", response_model=schemas.ChatList)
async def read_chats(
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)],
    user_id: int,
    page: int = Query(1, gt=0),
    page_size: int = Query(5, gt=0, le=50),
    db: Session = Depends(get_db),
):
    chats, total = crud.get_chats_paginated(db, user_id, page, page_size)
    return {"chats": chats, "total": total}


@app.get("/chats/{chat_id}/messages", response_model=schemas.MessageList)
async def read_chat_messages(
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)],
    chat_id: int,
    page: int = Query(1, gt=0),
    page_size: int = Query(5, gt=0, le=50),
    db: Session = Depends(get_db),
):
    messages, total = crud.get_chat_messages_paginated(db, chat_id, page, page_size)
    return {"messages": messages, "total": total}


@app.delete("/chats/{chat_id}", response_model=schemas.ChatBase)
async def delete_chat(chat_id: int, db: Session = Depends(get_db)):
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    db.delete(chat)
    db.commit()
    return chat


@app.post("/chats/archive_all", response_model=dict)
async def archive_all_chats(
    request: schemas.ArchiveRequest, db: Session = Depends(get_db)
):
    user_id = request.user_id
    chats = db.query(models.Chat).filter(models.Chat.user_id == user_id).all()
    for chat in chats:
        db.delete(chat)
    db.commit()
    return {"message": "All chats archived successfully"}


@app.get(
    "/users/me/items/protected",
    dependencies=[Depends(RateLimiter(times=15, seconds=600))],
)
async def read_protected_own_items(
    request: Request,
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)],
    db: Session = Depends(get_db),
):
    items = crud.get_items(db=db, user_id=current_user.id)
    return {"message": "You are within rate limit", "items": items}
