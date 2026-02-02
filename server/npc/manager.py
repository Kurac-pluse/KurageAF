import asyncio
from npc import state
from datetime import datetime, timedelta, timezone
from supabase_client import supabase
from npc.state import is_running_event
from services.util import (
    get_char_name_by_id,
    save_logs_and_finish,
    EXPIRE_MINUTES,
    ID2_AUTO_OFF_MINUTES,
    NPC_IDS,
    CHAR_IDS
)
from npc.npc_plan import (
    generate_initial_plan,
    generate_next_plan,
    call_api_with_plan,
)

npc_tasks: dict[str, asyncio.Task] = {}

def timer_log(msg: str):
    now = datetime.now(timezone.utc).isoformat()
    print(f"[{now}] [TIMER] {msg}")

# -------------------------
# Generative Agents 本体
# -------------------------
async def npc_loop(char_id: str):
    print(f"[{char_id}] NPC LOOP START")

    try:
        name = await get_char_name_by_id(char_id)
        if not name:
            print(f"[{char_id}] ERROR: name is None -> stop npc_loop")
            return

        initial_plan = await generate_initial_plan(char_id, name)
        if not initial_plan:
            print(f"[{char_id}] nextPlan invalid → STOP")

        await call_api_with_plan(char_id, initial_plan, is_running_event, name)

        while is_running_event.is_set():
            next_plan = await generate_next_plan(char_id, name)
            if not next_plan:
                print(f"[{char_id}] nextPlan invalid → STOP")
                break

            await call_api_with_plan(char_id, next_plan, is_running_event, name)

            print(f"[{char_id}] ONE LOOP END")

    except asyncio.CancelledError:
        print(f"[{char_id}] CANCELLED")
    except Exception as e:
        print(f"[{char_id}] ERROR:", e)

    finally:
        print(f"[{char_id}] NPC LOOP END")


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
                timer_log("is_running = true → START NPCs")
                is_running_event.set()

                npc_ids = None
                # mode に応じて NPC数を決める
                if state.current_game_mode == "1":
                    npc_ids = CHAR_IDS
                else:
                    npc_ids = CHAR_IDS

                timer_log("game_mode forced to 0 → NPC_IDS")

                for npc_id in npc_ids:
                    if npc_id not in npc_tasks or npc_tasks[npc_id].done():
                        npc_tasks[npc_id] = asyncio.create_task(
                            npc_loop(npc_id)
                        )

            # true → false
            if not db_state and last_state is not False:
                timer_log("is_running = false → STOP NPCs")
                is_running_event.clear()

                for task in npc_tasks.values():
                    task.cancel()

            last_state = db_state

        except Exception as e:
            print(f"\033[31m[TIMER ERROR] {e}\033[0m")
        await asyncio.sleep(1)


# -----------------------------------
# Supabase監視（id:1とid:2のflag管理）
# -----------------------------------
async def watch_timer_expire():
    print("[startup] timer expire watcher starting...")

    finished_mode1 = False  # 二重実行防止

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
            start_time = data.get("start_time")
            is_running = data.get("is_running")

            if not is_running or not start_time:
                await asyncio.sleep(1)
                continue

            start_dt = datetime.fromisoformat(start_time)
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=timezone.utc)

            now = datetime.now(timezone.utc)

            # ==================================================
            # 8分経過
            # ==================================================
            if now >= start_dt + timedelta(minutes=EXPIRE_MINUTES):

                # -----------------------
                # mode = 1
                # -----------------------
                if state.current_game_mode == "1":
                    if not finished_mode1:
                        timer_log("mode=1 → id1 OFF, id2 OFF, save_logs_and_finish")

                        # id=1 OFF
                        await asyncio.to_thread(
                            lambda: supabase.table("timer")
                            .update({"is_running": False})
                            .eq("id", 1)
                            .execute()
                        )

                        # id=2 OFF
                        await asyncio.to_thread(
                            lambda: supabase.table("timer")
                            .update({"is_running": False})
                            .eq("id", 2)
                            .execute()
                        )

                        await save_logs_and_finish()
                        finished_mode1 = True

                    # 2回目以降は何もしない
                    await asyncio.sleep(2)
                    continue

                # -----------------------
                # mode = 0（旧挙動）
                # -----------------------
                timer_log("mode=0 → id1 OFF / id2 ON")

                await asyncio.to_thread(
                    lambda: supabase.table("timer")
                    .update({"is_running": False})
                    .eq("id", 1)
                    .execute()
                )

                res2 = await asyncio.to_thread(
                    lambda: supabase.table("timer")
                    .select("is_running")
                    .eq("id", 2)
                    .single()
                    .execute()
                )

                if not res2.data["is_running"]:
                    await asyncio.to_thread(
                        lambda: supabase.table("timer")
                        .update({
                            "is_running": True,
                            "start_time": now.isoformat()
                        })
                        .eq("id", 2)
                        .execute()
                    )

            await asyncio.sleep(1)

        except Exception as e:
            print(f"\033[31m[TIMER EXPIRE ERROR] {e}\033[0m")
            await asyncio.sleep(2)
