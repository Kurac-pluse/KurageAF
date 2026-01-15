import asyncio
from supabase_client import supabase
from npc.npc_plan import (
    generate_initial_plan,
    generate_next_plan,
    get_logs,
)
from npc.npc_act import call_api_with_plan

# ======================
# グローバル状態
# ======================
stop_event = asyncio.Event()
npc_tasks: dict[str, asyncio.Task] = {}

# ======================
# NPC ループ
# ======================
async def npc_loop(npc_id: str):
    print(f"[{npc_id}] loop start")
    try:
        plan = await generate_initial_plan(npc_id)

        while not stop_event.is_set():
            await call_api_with_plan(npc_id, plan, stop_event)

            if stop_event.is_set():
                break

            logs = await get_logs(npc_id)
            plan = await generate_next_plan(npc_id, logs)

            if not plan:
                break

    except asyncio.CancelledError:
        print(f"[{npc_id}] cancelled")
        raise
    finally:
        npc_tasks.pop(npc_id, None)
        print(f"[{npc_id}] loop end")

# ======================
# timer 監視
# ======================
async def watch_timer():
    while True:
        try:
            res = (
                supabase
                .table("timer")
                .select("is_running")
                .eq("id", 1)
                .single()
                .execute()
            )

            running = res.data["is_running"]

            # START
            if running and not npc_tasks:
                print("[NPC] START")
                stop_event.clear()

                for npc_id in ["npc1", "npc2", "npc3"]:
                    task = asyncio.create_task(npc_loop(npc_id))
                    npc_tasks[npc_id] = task

            # STOP
            if not running and npc_tasks:
                print("[NPC] STOP")
                stop_event.set()
                npc_tasks.clear()

        except Exception as e:
            print("[NPC MANAGER ERROR]", e)

        await asyncio.sleep(1)

