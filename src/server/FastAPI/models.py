from pydantic import BaseModel
from typing import Optional

class QueryRequestConv(BaseModel):
    prompt: str
    npc_id: Optional[str] = None
    session_id: Optional[str] = None
    phase: int
    turn: int
    sender: str
    receiver: str

class QueryRequestPlan(BaseModel):
    prompt: str
    npc_id: str

class QueryRequestTask(BaseModel):
    prompt: str
    npc_id: str