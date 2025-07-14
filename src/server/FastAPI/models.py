from pydantic import BaseModel
from typing import Optional

class QueryRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None
    phase: int
    turn: int
    sender: str
    receiver: str
