import asyncio
from typing import Optional

# Pythonプロセス全体で共有されるフラグ
is_running_event = asyncio.Event()

def is_running() -> bool:
    return is_running_event.is_set()

# 追加：task_name / game_mode を保持
current_task_name: Optional[str] = None
current_game_mode: Optional[str] = None
