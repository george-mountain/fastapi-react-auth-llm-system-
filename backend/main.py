from datetime import timedelta
from typing import Annotated

import aioredis

from repositories.database import engine
from sqlalchemy.orm import Session
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

from fastapi.middleware.cors import CORSMiddleware
from repositories.utils import ChatModel
from contextlib import asynccontextmanager
from dotenv import load_dotenv, find_dotenv
import os

from routers import users, chats, code_editor, items
from repositories import models, schemas, auths, crud
from repositories.database import get_db


load_dotenv(find_dotenv())

import humanize
from datetime import timedelta

models.Base.metadata.create_all(bind=engine)

chat_model = None
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


app = FastAPI(lifespan=lifespan, title="Authify API", version="0.1.0")

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


@app.post("/api/v1/chat", dependencies=[Depends(RateLimiter(times=2, seconds=60))])
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


app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(items.router, prefix="/api/v1", tags=["items"])
app.include_router(chats.router, prefix="/api/v1", tags=["chat"])
app.include_router(code_editor.router, prefix="/api/v1", tags=["code"])
