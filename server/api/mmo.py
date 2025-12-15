import httpx
from fastapi import APIRouter, HTTPException
from config import settings

router = APIRouter(prefix="/api/mmo")

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
