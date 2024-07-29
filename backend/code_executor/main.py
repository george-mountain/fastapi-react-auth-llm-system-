from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import tempfile
import os
import re

app = FastAPI(title="Code Executor Service", version="0.1.0")


class CodeExecutionRequest(BaseModel):
    code: str


FORBIDDEN_KEYWORDS = [
    (r"\bopen\b", "open"),
    (r"\bos\.", "os"),
    (r"\bos\.system\b", "os.system"),
    (r"\bos\.remove\b", "os.remove"),
    (r"\bos\.rmdir\b", "os.rmdir"),
    (r"\bos\.mkdir\b", "os.mkdir"),
    (r"\bos\.makedirs\b", "os.makedirs"),
    (r"\bos\.rename\b", "os.rename"),
    (r"\bos\.replace\b", "os.replace"),
    (r"\bos\.unlink\b", "os.unlink"),
    (r"\bsubprocess\b", "subprocess"),
    (r"\bshutil\b", "shutil"),
    (r"\beval\b", "eval"),
    (r"\bexec\b", "exec"),
    (r"\bcompile\b", "compile"),
    (r"\binput\b", "input"),
    (r"\bsys\b", "sys"),
    (r"\bbuiltins\b", "builtins"),
    (r"\bglobals\b", "globals"),
    (r"\blocals\b", "locals"),
]


def is_code_safe(code: str) -> (bool, str):
    for pattern, keyword in FORBIDDEN_KEYWORDS:
        if re.search(pattern, code):
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
