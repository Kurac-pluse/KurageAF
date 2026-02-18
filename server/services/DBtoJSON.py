import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import json
import pandas as pd
from supabase_client import get_supabase
import re

# TARGET_TASK = "Appleを入手"
TARGET_TASK = "Copper Oreを入手"

# ============================
# ログパース
# ============================
def parse_multiline_log(raw_log: str):
    sessions = []
    lines = raw_log.split("\n")

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line.startswith("・"):
            line = line[1:]

        match = re.match(r"(\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) (.+)", line)
        if not match:
            continue

        date_part, time_part, text_part = match.groups()
        timestamp = f"2026/{date_part.replace('-', '/')} {time_part}"

        # action_type = 「が X した」の X
        action_match = re.search(r"が\s(.+?)\sした", text_part)
        action_type = action_match.group(1) if action_match else "unknown"

        # details = （）内の英文
        details_match = re.search(r"（(.+?)）", text_part)
        details = details_match.group(1) if details_match else ""

        sessions.append({
            "timestamp": timestamp,
            "action_type": action_type,
            "details": details
        })

    return sessions


# ============================
# 出力先
# ============================
# OUTPUT_FILES = {
    # "human_operation": "1_human.json",
    # "gpt-4o-mini": "1_gpt-4o-mini.json",
    # "gpt-3.5-turbo": "1_gpt-3.5-turbo.json",
# }
OUTPUT_FILES = {
    "human_operation": "2_human.json",
    "gpt-4o-mini": "2_gpt-4o-mini.json",
    "gpt-3.5-turbo": "2_gpt-3.5-turbo.json",
}

# ============================
# DB 取得
# ============================
supabase = get_supabase()
res = supabase.table("npc_action_logs") \
    .select("action_log, llm, task") \
    .eq("task", TARGET_TASK) \
    .range(0, 100000) \
    .execute()

df = pd.DataFrame(res.data)

if df.empty:
    exit()

df["llm"] = df["llm"].fillna("human_operation")

# ============================
# セッション構築
# ============================
grouped_sessions = {k: [] for k in OUTPUT_FILES.keys()}

for _, row in df.iterrows():
    llm_value = row["llm"]
    key = llm_value if llm_value in grouped_sessions else "other"

    sessions = parse_multiline_log(row["action_log"])
    if sessions:
        grouped_sessions[key].append(sessions)

# ============================
# JSON 保存（ログ形式維持）
# ============================
for llm_value, sessions in grouped_sessions.items():
    filename = OUTPUT_FILES[llm_value]

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(sessions, f, ensure_ascii=False, indent=2)

    print(f"✅ Export 完了: {filename} ({len(sessions)} sessions)")
