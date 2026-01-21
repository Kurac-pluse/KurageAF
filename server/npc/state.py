# npc/state.py
import asyncio

# Pythonプロセス全体で共有されるフラグ
is_running_event = asyncio.Event()

def is_running() -> bool:
    return is_running_event.is_set()
