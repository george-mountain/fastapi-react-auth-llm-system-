from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import tempfile
import os

app = FastAPI(title="Code Executor Service", version="0.1.0")


class CodeExecutionRequest(BaseModel):
    code: str


FORBIDDEN_KEYWORDS = [
    "open",
    "os.",
    "os.system",
    "os.remove",
    "os.rmdir",
    "os.mkdir",
    "os.makedirs",
    "os.rename",
    "os.replace",
    "os.unlink",
    "subprocess",
    "shutil",
    "eval",
    "exec",
    "compile",
    "input",
    "sys",
    "builtins",
    "globals",
    "locals",
]


def is_code_safe(code: str) -> (bool, str):
    for keyword in FORBIDDEN_KEYWORDS:
        if keyword in code:
            return False, f"Forbidden operation detected: {keyword}"
    return True, ""


@app.post("/execute_code")
async def execute_code(request: CodeExecutionRequest):
    code = request.code

    is_safe, message = is_code_safe(code)
    if not is_safe:
        raise HTTPException(status_code=400, detail=message)

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
