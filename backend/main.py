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
from contextlib import asynccontextmanager
from dotenv import load_dotenv, find_dotenv
import os
from routers import users, chats, code_editor, items
from repositories import models, schemas, auths, crud
from repositories.database import get_db
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
from threading import Thread
import humanize
from datetime import timedelta
import asyncio

load_dotenv(find_dotenv())

models.Base.metadata.create_all(bind=engine)

model_checkpoint_path = "./meta-llama/Meta-Llama-3.1-8B-Instruct"


class ChatModel:
    def __init__(self, model_checkpoint: str):
        self.tokenizer = AutoTokenizer.from_pretrained(model_checkpoint)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_checkpoint, torch_dtype=torch.bfloat16, device_map="cuda"
        )

    def generate_text(
        self,
        prompt: str,
        system_prompt: str,
        user_id: int,
        db: Session = Depends(get_db),
    ):
        complete_prompt = f"{system_prompt} {prompt}"
        messages = [{"role": "user", "content": complete_prompt}]
        inputs = self.tokenizer.apply_chat_template(
            messages,
            return_dict=True,
            tokenize=True,
            add_generation_prompt=True,
            return_tensors="pt",
        ).to("cuda")
        streamer = TextIteratorStreamer(
            self.tokenizer, skip_prompt=True, skip_special_tokens=True, timeout=None
        )
        generation_kwargs = dict(
            inputs, streamer=streamer, max_new_tokens=128000, do_sample=True
        )
        thread = Thread(target=self.model.generate, kwargs=generation_kwargs)
        thread.start()
        complete_response = ""
        for new_text in streamer:
            complete_response += new_text
            yield new_text
        chat = crud.create_chat(db, user_id=user_id)
        crud.create_message(db, chat_id=chat.id, sender="user", content=prompt)
        crud.create_message(
            db, chat_id=chat.id, sender="bot", content=complete_response
        )


chat_model = None
ai_models = {}

redis_url = os.getenv("REDIS_URL")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global chat_model
    chat_model = ChatModel(model_checkpoint=model_checkpoint_path)
    ai_models["chat_model"] = chat_model
    redis = aioredis.from_url(redis_url, encoding="utf8", decode_responses=True)
    await FastAPILimiter.init(redis)
    yield
    ai_models.clear()


app = FastAPI(lifespan=lifespan, title="Authify API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    # Apply throttling based on 5 requests in 2 minutes
    throttle_key = f"throttle:{ip}:{endpoint}"
    requests_count = await redis.incr(throttle_key)
    if requests_count == 1:
        await redis.expire(throttle_key, 2 * 60)  # 2 minutes expiry

    if requests_count > 5:
        delay = (
            requests_count - 5
        ) * 2  # Delay 2 seconds per request exceeding 5 in 2 mins
        print(f"Throttling applied: Delaying request by {delay} seconds.")
        await asyncio.sleep(delay)

    response = await call_next(request)

    if response.status_code == 429:
        await redis.set(key, 1, ex=3 * 60)  # Apply 3 minutes cooldown
        cooldown_expiry = await redis.ttl(key)
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


@app.post(
    "/api/v1/generate/",
    dependencies=[Depends(RateLimiter(times=15, minutes=10))],
    tags=["chat"],
)
async def generate(
    request: Request,
    current_user: Annotated[schemas.User, Depends(auths.get_current_user)],
    db: Session = Depends(get_db),
):
    print(f"Current user: {current_user}")
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    data = await request.json()
    prompt = data["prompt"]
    system_prompt = data["system_prompt"]
    return StreamingResponse(
        chat_model.generate_text(prompt, system_prompt, current_user.id, db),
        media_type="text/plain",
    )


@app.get(
    "/api/v1/test_rate/",
    dependencies=[Depends(RateLimiter(times=15, minutes=10))],
    tags=["rate-limit"],
)
async def test_rate():
    return {"message": "Rate limit test successful."}


app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(items.router, prefix="/api/v1", tags=["items"])
app.include_router(chats.router, prefix="/api/v1", tags=["chat"])
app.include_router(code_editor.router, prefix="/api/v1", tags=["code"])
