from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from repositories import auths, crud, schemas
from repositories.database import get_db

from typing import Annotated

from fastapi.responses import JSONResponse
from fastapi_limiter.depends import RateLimiter


router = APIRouter()


@router.get(
    "/resource",
    dependencies=[Depends(RateLimiter(times=2, seconds=5))],
)
async def get_resource():
    return JSONResponse(content={"message": "Resource accessed successfully"})


@router.post("/users/me/items/", response_model=schemas.Item)
async def create_item_for_user(
    item: schemas.ItemCreate,
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)],
    db: Session = Depends(get_db),
):
    return crud.create_item(db=db, item=item, user_id=current_user.id)


@router.get("/users/me/items/")
async def read_own_items(
    current_user: Annotated[schemas.User, Depends(auths.get_current_active_user)],
    db: Session = Depends(get_db),
):
    return crud.get_items(db=db, user_id=current_user.id)


@router.delete("/users/me/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
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


@router.get(
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
