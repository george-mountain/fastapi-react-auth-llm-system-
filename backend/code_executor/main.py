from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import io
import contextlib
import subprocess
import tempfile
import os

app = FastAPI()


class CodeExecutionRequest(BaseModel):
    code: str


@app.post("/execute_code")
async def execute_code(request: CodeExecutionRequest):
    code = request.code
    with tempfile.NamedTemporaryFile(delete=False, suffix=".py") as temp_script:
        temp_script.write(code.encode())
        temp_script_name = temp_script.name

    try:
        result = subprocess.run(
            ["python3", temp_script_name],
            capture_output=True,
            text=True,
            timeout=5,  # Timeout to prevent long-running scripts
        )
        output = result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        output = "Error: Code execution timed out."
    except Exception as e:
        output = f"Error: {str(e)}"
    finally:
        os.remove(temp_script_name)

    return {"result": output}
