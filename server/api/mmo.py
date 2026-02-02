import httpx
from fastapi import APIRouter, HTTPException
from config import settings
from npc import state
from api.models import StartExperimentRequest
from supabase_client import get_supabase
from datetime import datetime, timezone
from services.util import (
    fetch_character_logs,
    fetch_characters_info,
    INITIAL_NAMES,
    INITIAL_SKINS
)

router = APIRouter(prefix="/api/mmo")

@router.options("/game_restart")
async def game_restart_options():
    return {}

@router.post("/game_restart")
async def game_restart():
    base_url = settings.artifacts_url

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.artifacts_token}",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        # --------------------------------
        # ① キャラクター一覧取得
        # --------------------------------
        try:
            res = await client.get(
                f"{base_url}/my/characters",
                headers=headers,
            )
            res.raise_for_status()
            characters = res.json()["data"]
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch characters: {e}",
            )

        names = [c["name"] for c in characters]

        # --------------------------------
        # ② キャラクター削除
        # --------------------------------
        for name in names:
            try:
                res = await client.post(
                    f"{base_url}/characters/delete",
                    headers=headers,
                    json={"name": name},
                )
                res.raise_for_status()
            except httpx.HTTPError as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to delete character '{name}': {e}",
                )

        # --------------------------------
        # ③ 初期キャラクター作成
        # --------------------------------
        created = []
        for name, skin in zip(INITIAL_NAMES, INITIAL_SKINS):
            try:
                res = await client.post(
                    f"{base_url}/characters/create",
                    headers=headers,
                    json={
                        "name": name,
                        "skin": skin,
                    },
                )
                res.raise_for_status()
                created.append(name)
            except httpx.HTTPError as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to create character '{name}': {e}",
                )

    return {
        "status": "ok",
        "deleted": names,
        "created": created,
    }

@router.post("/start")
async def start_experiment(req: StartExperimentRequest):
    try:
        supabase = get_supabase()
        state.current_task_name = req.task_name
        # 0:通常モード
        # 1:実験3モード
        state.current_game_mode = req.game_mode

        # timer を開始
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("timer").update({
            "is_running": True,
            "start_time": now,
        }).eq("id", 1).execute()

        return {
            "status": "ok",
            "task_name": req.task_name,
        }

    except Exception as e:
        print("[EX ERROR]", e)
        return {"status": "error"}

@router.get("/logs/{character}")
async def get_character_logs(character: str):
    try:
        return await fetch_character_logs(character)
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=e.response.text
        )

@router.get("/info/{character}")
async def get_character_info(character: str):
    try:
        characters = await fetch_characters_info()
        char = next(
            (c for c in characters if c.get("name") == character),
            None
        )
        if char is None:
            raise HTTPException(
                status_code=404,
                detail=f"Character '{character}' not found"
            )
        return char
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=e.response.text
        )
