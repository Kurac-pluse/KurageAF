import asyncio
from datetime import datetime, timedelta, timezone
from supabase_client import supabase
from npc.state import is_running_event
from npc.npc_plan import (
    generate_initial_plan,
    generate_next_plan,
    call_api_with_plan,
)

NPC_IDS = ["npc1", "npc2", "npc3"]
npc_tasks: dict[str, asyncio.Task] = {}

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


# -------------------------
# Generative Agents 本体
# -------------------------
async def npc_loop(npc_id: str):
    print(f"[{npc_id}] NPC LOOP START")

    try:
        name = await get_char_name_by_id(npc_id)
        if not name:
            print(f"[{npc_id}] ERROR: name is None -> stop npc_loop")
            return

        initial_plan = await generate_initial_plan(npc_id, name)
        if not initial_plan:
            print(f"[{npc_id}] nextPlan invalid → STOP")

        await call_api_with_plan(npc_id, initial_plan, is_running_event, name)

        while is_running_event.is_set():
            next_plan = await generate_next_plan(npc_id, name)
            if not next_plan:
                print(f"[{npc_id}] nextPlan invalid → STOP")
                break

            await call_api_with_plan(npc_id, next_plan, is_running_event, name)

            print(f"[{npc_id}] ONE LOOP END")

    except asyncio.CancelledError:
        print(f"[{npc_id}] CANCELLED")
    except Exception as e:
        print(f"[{npc_id}] ERROR:", e)

    finally:
        print(f"[{npc_id}] NPC LOOP END")


# -------------------------------------------------------
# Supabase監視（id:1のis_runningとis_running_eventの同期）
# -------------------------------------------------------
async def watch_timer():
    last_state = None

    while True:
        try:
            # Supabase は同期I/Oなのでスレッドに逃がす
            res = await asyncio.to_thread(
                lambda: supabase
                    .table("timer")
                    .select("is_running")
                    .eq("id", 1)
                    .single()
                    .execute()
            )

            db_state = res.data["is_running"]

            # false → true
            if db_state and last_state is not True:
                print("[TIMER] is_running = true → START NPCs")
                is_running_event.set()

                for npc_id in NPC_IDS:
                    if npc_id not in npc_tasks or npc_tasks[npc_id].done():
                        npc_tasks[npc_id] = asyncio.create_task(
                            npc_loop(npc_id)
                        )

            # true → false
            if not db_state and last_state is not False:
                print("[TIMER] is_running = false → STOP NPCs")
                is_running_event.clear()

                for task in npc_tasks.values():
                    task.cancel()

            last_state = db_state

        except Exception as e:
            print("[TIMER ERROR]", e)

        await asyncio.sleep(1)


# -----------------------------------
# Supabase監視（id:1とid:2のflag管理）
# -----------------------------------
EXPIRE_MINUTES = 8
async def watch_timer_expire():
    print("[startup] timer expire watcher starting...")

    while True:
        try:
            res = await asyncio.to_thread(
                lambda: supabase
                    .table("timer")
                    .select("start_time, is_running")
                    .eq("id", 1)
                    .single()
                    .execute()
            )

            data = res.data
            start_time = data["start_time"]
            is_running = data["is_running"]

            # 実行中でなければ何もしない
            if not is_running or not start_time:
                await asyncio.sleep(1)
                continue

            start_dt = datetime.fromisoformat(start_time)
            now = datetime.now(timezone.utc)

            # 8分経過チェック
            if now >= start_dt + timedelta(minutes=EXPIRE_MINUTES):
                print("[TIMER] expired → switch id1 OFF / id2 ON")

                # id=1 を停止
                await asyncio.to_thread(
                    lambda: supabase.table("timer").update({
                        "is_running": False
                    }).eq("id", 1).execute()
                )

                # id=2 の現在状態を確認（多重起動防止）
                res2 = await asyncio.to_thread(
                    lambda: supabase
                        .table("timer")
                        .select("is_running")
                        .eq("id", 2)
                        .single()
                        .execute()
                )

                # すでに ON なら何もしない
                if res2.data["is_running"]:
                    await asyncio.sleep(1)
                    continue

                # id=2 を開始（★ start_time を「今」に更新）
                await asyncio.to_thread(
                    lambda: supabase.table("timer").update({
                        "is_running": True,
                        "start_time": now.isoformat()
                    }).eq("id", 2).execute()
                )

        except Exception as e:
            print("[TIMER EXPIRE ERROR]", e)

        await asyncio.sleep(1)