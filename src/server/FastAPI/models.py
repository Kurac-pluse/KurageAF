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
    # prompt: str
    # npc_id: str
    x: str
    y: str
    task: str

class QueryRequestJSON(BaseModel):
    prompt: str

class QueryRequestTask(BaseModel):
    prompt: str