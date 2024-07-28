from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class LoginData(BaseModel):
    username: str
    password: str


class ItemBase(BaseModel):
    title: str
    description: Optional[str] = None


class ItemCreate(ItemBase):
    pass


class Item(ItemBase):
    id: int
    owner_id: int

    class Config:
        orm_mode = True


class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None
    is_admin: Optional[bool] = None


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    items: List[Item] = []
    phone_number: Optional[str] = None

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: str
    frontend_url: str


class PasswordReset(BaseModel):
    new_password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None


class UserPatch(BaseModel):
    full_name: Optional[str] = Field(None, example="John Doe")
    phone_number: Optional[str] = Field(None, example="123-456-7890")


class ChatRequest(BaseModel):
    user_prompt: str
    top_p: Optional[float] = 0.9
    temperature: Optional[float] = 0.1
    max_new_tokens: Optional[int] = 512


class MessageBase(BaseModel):
    sender: str
    content: str
    created_at: datetime

    class Config:
        orm_mode = True


class ChatBase(BaseModel):
    id: int
    user_id: int
    created_at: datetime
    messages: List[MessageBase]

    class Config:
        orm_mode = True


class ChatList(BaseModel):
    chats: List[ChatBase]
    total: int


class MessageList(BaseModel):
    messages: List[MessageBase]
    total: int


class ArchiveRequest(BaseModel):
    user_id: int


class CodeExecutionRequest(BaseModel):
    code: str
