from fastapi import APIRouter, Depends, HTTPException
from typing import List

from repositories import auths, schemas

import httpx

router = APIRouter()


@router.post("/execute_code")
async def execute_code(
    request: schemas.CodeExecutionRequest,
    current_user: schemas.User = Depends(auths.get_current_active_user),
):
    code = request.code
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://code_execution_service:8001/execute_code", json={"code": code}
            )
            if response.status_code != 200:
                response_data = response.json()
                error_message = response_data.get("detail", "Unknown error occurred")
                print(f"Error from code execution service: {error_message}")
                raise HTTPException(
                    status_code=response.status_code, detail=error_message
                )
            response_data = response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail="Request error occurred")
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=response.status_code, detail="HTTP error occurred"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return response_data
