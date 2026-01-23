import httpx
from fastapi import APIRouter, HTTPException
from config import settings
from services.util import fetch_character_logs

router = APIRouter(prefix="/api/mmo")

# 初期キャラクター設定（実験条件として固定）
INITIAL_NAMES = ["laplus", "rui", "koyori", "kuroe", "iroha"]
# INITIAL_NAMES = ["A-AAAAA", "B-BBBBB", "C-CCCCC", "D-DDDDD", "E-EEEEE"]
INITIAL_SKINS = ["men1", "women2", "women3", "men2", "women1"]

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

@router.get("/logs/{character}")
async def get_character_logs(character: str):
    try:
        return await fetch_character_logs(character)
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=e.response.text
        )
