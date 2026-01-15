from supabase_client import supabase
from api.info import get_character_logs
from utils.global_ import get_character_name_by_id
from npc.llm import make_plan, refine_plan_to_json, make_task


NPC_NUMBER_MAP = {
    "npc1": 3,
    "npc2": 4,
    "npc3": 5,
}


# ======================
# 初期プラン生成
# ======================
async def generate_initial_plan(npc_id: str):
    number = NPC_NUMBER_MAP.get(npc_id)

    if number is None:
        print(f"[{npc_id}] invalid npc id")
        return None

    res = (
        supabase
        .table("tasks")
        .select("*")
        .eq("number", number)
        .single()
        .execute()
    )

    if res.error:
        print(f"[{npc_id}] task fetch error:", res.error)
        return None

    task = res.data

    # 1回目: 箇条書きプラン
    raw_plan = await make_plan(npc_id, task["name"])
    print(npc_id, raw_plan)

    # 2回目: JSON変換
    json_plan = await refine_plan_to_json(raw_plan)
    print(npc_id, json_plan)

    return json_plan


# ======================
# 次プラン生成
# ======================
async def generate_next_plan(npc_id: str, logs: str):
    task = make_task(npc_id, logs)

    if not task:
        print(f"[{npc_id}] task generation failed")
        return None

    raw_plan = await make_plan(npc_id, task["name"])
    print(npc_id, raw_plan)

    json_plan = await refine_plan_to_json(raw_plan)
    print(npc_id, json_plan)

    return json_plan


# ======================
# ログ取得
# ======================
async def get_logs(npc_id: str) -> str:
    name = await get_character_name_by_id(npc_id)
    response = await get_character_logs(name)

    if not response or "data" not in response or not isinstance(response["data"], list):
        print("response.data is invalid:", response)
        return ""

    log_text = "\n".join(
        f"{i + 1}. [{entry['type']}] {entry['description']}"
        for i, entry in enumerate(response["data"])
    )

    return log_text
