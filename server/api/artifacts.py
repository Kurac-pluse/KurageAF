import httpx
import json
from config import settings

# -----------------------------------------------------
# inventoryをstrで返す関数
# -----------------------------------------------------
async def get_inventory(character: str) -> str:
    url = f"{settings.artifacts_url}/my/characters"

    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + settings.artifacts_token,
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers)
            data = json.loads(res.text)

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
