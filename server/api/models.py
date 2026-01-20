from pydantic import BaseModel
from typing import Optional

class QueryRequestConv(BaseModel):
    prompt: str
    log: Optional[str] = None
    session_id: Optional[str] = None
    phase: int
    turn: int
    sender: str
    receiver: str
    sen_char_name: str
    rec_char_name: str
    task: str

class QueryRequestPlan(BaseModel):
    x: str
    y: str
    task: str

class QueryRequestJSON(BaseModel):
    raw_plan: str

class QueryRequestTask(BaseModel):
    prompt: str
    name: str
    task: str