import asyncio
import time
from supabase_client import supabase
from api.llm import call_llm_plan, call_llm_json, call_llm_task
from api.mmo import fetch_character_logs
from npc.artifacts import (
    get_character_coordinate,
    get_inventory,
    get_character_cooldown
)
from npc.artifacts import (
    movement,
    gather,
    equip,
    unequip,
    fight,
    craft,
    heal,
)

NPC_NUMBER_MAP = {
    "npc1": 3,
    "npc2": 4,
    "npc3": 5,
}

# 初期タスク取得
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


# ======================
# 初期プラン生成
# ======================
async def generate_initial_plan(npc_id: str, name: str):
    task = await get_task_by_npc_id(npc_id)
    if not task:
        return None

    # 1回目: 箇条書きプラン
    x, y = await get_character_coordinate(name)
    raw_plan = await call_llm_plan(x, y, task)
    # print(f"[{npc_id}] raw_plan:\n{raw_plan}")

    # 2回目: JSON変換
    json_plan = await call_llm_json(raw_plan)
    # print(npc_id, json_plan)

    return json_plan


# ======================
# 次プラン生成
# ======================
async def generate_next_plan(npc_id: str, name: str):
    logs = await fetch_character_logs(name)
    entries = logs.get("data", [])
    log_text = "\n".join(
        f"{i + 1}. [{e.get('type')}] {e.get('description')}"
        for i, e in enumerate(entries)
    )
    inventory = await get_inventory(name)
    initial_task = await get_task_by_npc_id(npc_id)
    if not initial_task:
        return None

    task = await call_llm_task(log_text, inventory, initial_task)
    if not task:
        print(f"[{npc_id}] task generation failed")
        return None

    # 1回目: 箇条書きプラン
    x, y = await get_character_coordinate(name)
    raw_plan = await call_llm_plan(x, y, task)
    # print(f"[{npc_id}] raw_plan:\n{raw_plan}")

    # 2回目: JSON変換
    json_plan = await call_llm_json(raw_plan)
    # print(npc_id, json_plan)

    return json_plan


# ======================
# NPCのAPI指示
# ======================
async def call_api_with_plan(
    npc_id: str,
    plan: list[dict],
    is_running_event: asyncio.Event,
    name: str
) -> str:
    # 1:移動, 2:釣り, 3:伐採, 4:採掘, 5:採集, 6:装備解除, 7:装備,
    # 8:戦闘,9:武器作成, 10:料理作成, 11:回復

    # plan = {
    #     "type":0,
    #     "info":{ "Coordinates":[0,0], "item":"" },
    # }
    if not isinstance(plan, list):
        return f"[{npc_id}] plan が配列ではありません: {plan}"

    for action in plan:
        if not is_running_event.is_set():
            return f"[{npc_id}] is_running が False のため中断"

        type_ = action.get("type")
        info = action.get("info", {})
        coords = info.get("Coordinates", [0, 0])
        item = info.get("item", "")

        print(f"[{npc_id}] 実行中のアクション: type={type_}, info={info}")

        # -----------------------------
        # クールダウン待機
        # -----------------------------
        cooldown_end_time = await get_character_cooldown(name)

        now = time.time()
        wait_buffer = 0.7
        remaining_seconds = (cooldown_end_time - now) + wait_buffer

        if remaining_seconds > 0:
            print(f"[{npc_id}] クールダウン中: {remaining_seconds:.2f} 秒待機")

            while remaining_seconds > 0:
                if not is_running_event.is_set():
                    return f"[{npc_id}] クールダウン中に is_running False 検出、中断"

                sleep_time = min(1.0, remaining_seconds)
                await asyncio.sleep(sleep_time)
                remaining_seconds -= sleep_time

        # -----------------------------
        # アクション実行
        # -----------------------------
        try:
            if type_ == 1:
                await movement(name, coords[0], coords[1])
            elif type_ in [2, 3, 4, 5]:
                await gather(name)
            elif type_ == 6:
                await unequip(name)
            elif type_ == 7:
                await equip(name, item)
            elif type_ == 8:
                await fight(name)
            elif type_ in [9, 10]:
                await craft(name, item)
            elif type_ == 11:
                await heal(name)

        except Exception as e:
            print(f"\033[31m[{npc_id}] アクション実行中にエラー: {e}\033[0m")

    return f"[{npc_id}] plan 完了"