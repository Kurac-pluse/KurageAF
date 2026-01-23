import httpx
import asyncio
from config import settings
from typing import List, Dict, Any
from datetime import datetime
from services.util import fetch_characters_info

# -----------------------------------------------------
# キャラの座標取得
# -----------------------------------------------------
async def get_character_coordinate(character: str) -> List[int]:
    characters = await fetch_characters_info()

    for c in characters:
        if c["name"] == character:
            return [c["x"], c["y"]]

    raise ValueError(f"Character not found: {character}")

# -----------------------------------------------------
# キャラのクールダウン取得
# -----------------------------------------------------
async def get_character_cooldown(character: str) -> int:
    characters = await fetch_characters_info()

    for c in characters:
        if c["name"] == character:
            raw = c.get("cooldown_expiration")
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return int(dt.timestamp())

    raise ValueError(f"Character not found: {character}")
    
# -----------------------------------------------------
# movement（移動）
# -----------------------------------------------------
async def movement(character: str, x: int, y: int) -> Dict[str, Any]:
    # 現在座標と移動先座標が同じならキャンセル
    current_x, current_y = await get_character_coordinate(character)
    if current_x == x and current_y == y:
        print(f"[{character}] 現在座標と同じなので移動キャンセル: [{x}, {y}]")
        return None

    url = f"{settings.artifacts_url}/my/{character}/action/move"
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + settings.artifacts_token,
        "Content-Type": "application/json",
    }

    json_payload = {
        "x": x,
        "y": y,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=headers,
            json=json_payload,
        )
        response.raise_for_status()
        payload = response.json()
        return payload["data"]

# -----------------------------------------------------
# gather（採取系）
# -----------------------------------------------------
async def gather(character: str) -> Dict[str, Any]:
    url = f"{settings.artifacts_url}/my/{character}/action/gathering"
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + settings.artifacts_token,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers)
        response.raise_for_status()
        payload = response.json()
        return payload["data"]

# -----------------------------------------------------
# equip（装備）
# -----------------------------------------------------
async def equip(character: str, item: str) -> Dict[str, Any]:
    url = f"{settings.artifacts_url}/my/{character}/action/equip"
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + settings.artifacts_token,
        "Content-Type": "application/json",
    }

    json_payload = {
        "code": item,
        "slot": "weapon",
        "quantity": 1,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=headers,
            json=json_payload,
        )
        response.raise_for_status()
        payload = response.json()
        return payload["data"]

# -----------------------------------------------------
# unequip（装備解除）
# -----------------------------------------------------
async def unequip(character: str) -> Dict[str, Any]:
    url = f"{settings.artifacts_url}/my/{character}/action/unequip"
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + settings.artifacts_token,
        "Content-Type": "application/json",
    }

    json_payload = {
        "slot": "weapon",
        "quantity": 1,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=headers,
            json=json_payload,
        )
        response.raise_for_status()
        payload = response.json()
        return payload["data"]

# -----------------------------------------------------
# fight（戦闘1回分）
# -----------------------------------------------------
async def fight(character: str) -> Dict[str, Any]:
    current_x, current_y = await get_character_coordinate(character)
    if not ((current_x == 0 and current_y == 1) or (current_x == 0 and current_y == 2)):
        print(f"[{character}] 現在地 [{current_x}, {current_y}] は戦闘可能マスではないためキャンセル")
        return None
    
    url = f"{settings.artifacts_url}/my/{character}/action/fight"
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + settings.artifacts_token,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers)

        if response.status_code == 498:
            print("The character cannot be found on your account.")
            return None
        elif response.status_code == 497:
            print("Your character's inventory is full.")
            return None
        elif response.status_code == 499:
            print("Your character is in cooldown.")
            return None
        elif response.status_code == 598:
            print("No monster on this map.")
            return None
        elif response.status_code != 200:
            print("An error occurred during the fight.")
            return None

        data = response.json()
        print(
            f"The fight ended successfully. You have {data['data']['fight']['result']}."
        )

        return data["data"]
    
# -----------------------------------------------------
# fight_loop（戦闘終了までループ）
# -----------------------------------------------------
async def fight_loop(character: str):
    while True:
        result = await fight(character)

        # キャンセル or エラー → ループ終了
        if result is None:
            return

        cooldown = result["cooldown"]["total_seconds"]
        await asyncio.sleep(cooldown)

# -----------------------------------------------------
# craft（作成）
# -----------------------------------------------------
async def craft(character: str, item: str) -> Dict[str, Any]:
    url = f"{settings.artifacts_url}/my/{character}/action/crafting"
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + settings.artifacts_token,
        "Content-Type": "application/json",
    }

    json_payload = {
        "code": item,
        "quantity": 1,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=headers,
            json=json_payload,
        )
        response.raise_for_status()
        payload = response.json()
        return payload["data"]

# -----------------------------------------------------
# heal（回復）
# -----------------------------------------------------
async def heal(character: str) -> Dict[str, Any]:
    url = f"{settings.artifacts_url}/my/{character}/action/rest"
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + settings.artifacts_token,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers)
        response.raise_for_status()
        payload = response.json()
        return payload["data"]