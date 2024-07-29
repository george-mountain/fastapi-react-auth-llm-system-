from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from repositories import models, auths, crud, schemas
from repositories.database import get_db
from dotenv import load_dotenv, find_dotenv
from typing import Annotated, List

load_dotenv(find_dotenv())

router = APIRouter()


@router.get("/chats", response_model=schemas.ChatList)
async def read_chats(
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)],
    user_id: int,
    page: int = Query(1, gt=0),
    page_size: int = Query(5, gt=0, le=50),
    db: Session = Depends(get_db),
):
    chats, total = crud.get_chats_paginated(db, user_id, page, page_size)
    return {"chats": chats, "total": total}


@router.get("/chats/{chat_id}/messages", response_model=schemas.MessageList)
async def read_chat_messages(
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)],
    chat_id: int,
    page: int = Query(1, gt=0),
    page_size: int = Query(5, gt=0, le=50),
    db: Session = Depends(get_db),
):
    messages, total = crud.get_chat_messages_paginated(db, chat_id, page, page_size)
    return {"messages": messages, "total": total}


@router.delete("/chats/{chat_id}", response_model=schemas.ChatBase)
async def delete_chat(
    chat_id: int,
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)],
    db: Session = Depends(get_db),
):
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    db.delete(chat)
    db.commit()
    return chat


@router.post("/chats/archive_all", response_model=dict)
async def archive_all_chats(
    request: schemas.ArchiveRequest,
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)],
    db: Session = Depends(get_db),
):
    user_id = request.user_id
    chats = db.query(models.Chat).filter(models.Chat.user_id == user_id).all()
    for chat in chats:
        db.delete(chat)
    db.commit()
    return {"message": "All chats archived successfully"}
