from sqlalchemy.orm import Session
from models import User, Item, Chat, Message
import schemas
import auths


def get_user(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auths.get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        disabled=user.disabled,
        is_admin=user.is_admin,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def create_item(db: Session, item: schemas.ItemCreate, user_id: int):
    db_item = Item(**item.dict(), owner_id=user_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def get_items(db: Session, user_id: int):
    return db.query(Item).filter(Item.owner_id == user_id).all()


def get_users(db: Session):
    return db.query(User).all()


def update_user(db: Session, user: User, user_update: schemas.UserUpdate):
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.phone_number is not None:
        user.phone_number = user_update.phone_number
    db.commit()
    db.refresh(user)
    return user


def get_item(db: Session, item_id: int, user_id: int):
    return db.query(Item).filter(Item.id == item_id, Item.owner_id == user_id).first()


def create_chat(db: Session, user_id: int):
    db_chat = Chat(user_id=user_id)
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return db_chat


def create_message(db: Session, chat_id: int, sender: str, content: str):
    db_message = Message(chat_id=chat_id, sender=sender, content=content)
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def get_chats(db: Session, user_id: int):
    return db.query(Chat).filter(Chat.user_id == user_id).all()


def get_chats_paginated(db: Session, user_id: int, page: int = 1, page_size: int = 5):
    offset = (page - 1) * page_size
    chats = (
        db.query(Chat)
        .filter(Chat.user_id == user_id)
        .order_by(Chat.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    total = db.query(Chat).filter(Chat.user_id == user_id).count()
    return chats, total


def get_chat_messages_paginated(
    db: Session, chat_id: int, page: int = 1, page_size: int = 5
):
    offset = (page - 1) * page_size
    messages = (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    total = db.query(Message).filter(Message.chat_id == chat_id).count()
    return messages, total
