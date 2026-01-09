import httpx
from fastapi import APIRouter, HTTPException
from config import settings

router = APIRouter(prefix="/api/mmo")

# 初期キャラクター設定（実験条件として固定）
INITIAL_NAMES = ["laplus", "rui", "koyori", "kuroe", "iroha"]
INITIAL_SKINS = ["men1", "women2", "women3", "men2", "women1"]

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
    url = f"{settings.artifacts_url}/my/logs/{character}"

    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + settings.artifacts_token,
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            # print("Artifact status:", response.status_code)
            # print("Artifact body:", response.text)
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.text
                )
            return response.json()

        except httpx.RequestError as e:
            print("[HTTPX ERROR]", e)
            raise HTTPException(status_code=500, detail="Artifact API connection failed")
