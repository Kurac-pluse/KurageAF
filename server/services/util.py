import httpx
import asyncio
from config import settings
from datetime import datetime, timedelta
from typing import List, Dict, Any
from supabase_client import supabase

# LLM_MODEL = "gpt-3.5-turbo"
LLM_MODEL = "gpt-4o-mini"
EXPIRE_MINUTES = 8
ID2_AUTO_OFF_MINUTES = 25
NPC_IDS = ["npc1", "npc2", "npc3"]
CHAR_IDS = ["player1", "player2", "npc1", "npc2", "npc3"]
# 初期キャラクター設定（実験条件として固定）
INITIAL_NAMES = ["A-AAAA", "B-BBBB", "C-CCCC", "D-DDDD", "E-EEEE"]
INITIAL_SKINS = ["men1", "women2", "women3", "men2", "women1"]

# IDからキャラクター名に変換
async def get_char_name_by_id(npc_id: str) -> str | None:
    try:
        res = await asyncio.to_thread(
            lambda: (
                supabase
                .table("characters")
                .select("role")
                .eq("name", npc_id)
                .single()
                .execute()
            )
        )
        if not res.data:
            print(f"[get_char_name_by_id] no data for npc_id={npc_id}")
            return None

        return res.data["role"]

    except Exception as e:
        print("[get_char_name_by_id ERROR]", e)
        return None

# キャラクターのログを取得
async def fetch_character_logs(character: str) -> dict:
    url = f"{settings.artifacts_url}/my/logs/{character}"
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + settings.artifacts_token,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.json()

# logを整形
async def format_logs_simple(character: str) -> str:
    try:
        raw = await fetch_character_logs(character)
        logs = raw.get("data", [])

        if not logs:
            return "（行動ログはありません）"

        lines = []

        for l in logs:
            char = l.get("character", character)
            event_type = l.get("type", "event")
            desc = l.get("description", "")
            created = l.get("created_at")

            if created:
                dt = datetime.fromisoformat(created.replace("Z", ""))
                dt = dt - timedelta(hours=15)
                time_str = dt.strftime("%m-%d %H:%M:%S")
            else:
                time_str = "unknown time"

            line = f"・{time_str} {char} が {event_type} した（{desc}）"
            lines.append(line)

        return "\n".join(lines)

    except Exception as e:
        print(f"[format_logs_simple] error: {e}")
        return "（行動ログの取得に失敗しました）"

# 初期タスク取得
NPC_NUMBER_MAP = {
    "npc1": 3,
    "npc2": 4,
    "npc3": 5,
}
async def get_task_by_npc_id(npc_id: str) -> str | None:
    number = NPC_NUMBER_MAP.get(npc_id)
    if number is None:
        print(f"[{npc_id}] invalid npc id")
        return None

    try:
        res = (
            supabase
            .table("tasks")
            .select("*")
            .eq("number", number)
            .single()
            .execute()
        )
    except Exception as e:
        print(f"[{npc_id}] task fetch exception:", e)
        return None

    if not getattr(res, "data", None):
        print(f"[{npc_id}] task fetch error: no data")
        return None

    return res.data.get("name")

# /my/characters を取得
async def fetch_characters_info() -> List[Dict[str, Any]]:
    url = f"{settings.artifacts_url}/my/characters"
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + settings.artifacts_token,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        payload = response.json()
        return payload["data"]

# キャラのインベントリ取得
async def get_inventory(character: str) -> str:
    url = f"{settings.artifacts_url}/my/characters"

    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + settings.artifacts_token,
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers)
            data = res.json()

        char = next(
            (c for c in data["data"] if c["name"] == character),
            None
        )
        if not char:
            return "[]"

        # inventory を取得
        inventory = char.get("inventory", [])

        # code の quantity > 0 だけ抜き出す
        codes = [
            f'{i["code"]} x {i["quantity"]}'
            for i in inventory
            if i.get("quantity", 0) > 0
        ]

        # "[A, B, C]" 形式の str にする
        return "[" + ", ".join(codes) + "]"

    except Exception as e:
        print(f"[get_inventory] error: {e}")
        return "[]"

# キャラの level を取得
async def get_character_level(character: str) -> str:
    url = f"{settings.artifacts_url}/my/characters"
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + settings.artifacts_token,
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers)
            res.raise_for_status()
            data = res.json()

        char = next(
            (c for c in data["data"] if c["name"] == character),
            None
        )
        if not char:
            return "0"

        level = char.get("level", 0)
        return str(level)

    except Exception as e:
        print(f"[get_character_level] error: {e}")
        return "0"

async def save_logs_and_finish():
    print("[LOG] save logs start...")

    try:
        # 全キャラ取得
        characters = await fetch_characters_info()
        if not characters:
            print("[LOG] no characters found")
            return

        rows = []

        for c in characters:
            character_name = c.get("name")
            if not character_name:
                continue

            # ログを整形（str）
            log_str = await format_logs_simple(character_name)

            rows.append({
                "character_name": character_name,
                "action_log": log_str,
                "llm": LLM_MODEL,
                # created_at は default now()
            })

        if not rows:
            print("[LOG] nothing to insert")
            return

        # Supabase に一括 insert（スレッドに逃がす）
        await asyncio.to_thread(
            lambda: supabase
                .table("npc_action_logs")
                .insert(rows)
                .execute()
        )

        print(f"[LOG] saved {len(rows)} npc action logs")

    except Exception as e:
        print("[save_logs_and_finish ERROR]", e)

