from pydantic import BaseModel
from typing import Optional

class QueryRequestConv(BaseModel):
    session_id: Optional[str] = None
    phase: int
    turn: int
    sender: str
    receiver: str

class StartExperimentRequest(BaseModel):
    task_name: str
    game_mode: str
