import json
import pandas as pd

# ==========================
# 設定
# ==========================
JSON_FILES = {
    "Target": "2_target.json",
    "Human": "2_human.json",
    "GPT-4o-mini": "2_gpt-4o-mini.json",
    "GPT-3.5-turbo": "2_gpt-3.5-turbo.json"
}

DEBUG_FILES = {
    "Target": "2_debug_sequences_Target.txt",
    "Human": "2_debug_sequences_Human.txt",
    "GPT-4o-mini": "2_debug_sequences_GPT-4o-mini.txt",
    "GPT-3.5-turbo": "2_debug_sequences_GPT-3.5-turbo.txt"
}

IDLE_THRESHOLD = 5  # 秒

# ==========================
# JSON側：アクション数 & 所要時間
# ==========================
def compute_json_session_stats(session):
    if not session:
        return None

    df = pd.DataFrame(session)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp")

    # IDLEを除いたアクション数（＝JSON行数）
    action_count = len(df)

    # 所要時間
    duration = (df["timestamp"].iloc[-1] - df["timestamp"].iloc[0]).total_seconds()

    return {
        "action_count": action_count,
        "duration": duration
    }

def load_json_stats(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        sessions = json.load(f)

    stats = []
    for s in sessions:
        result = compute_json_session_stats(s)
        if result:
            stats.append(result)

    return stats

# ==========================
# debug側：IDLE占有率
# ==========================
def parse_sessions_from_debug(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    sessions = []
    current = []

    for line in lines:
        line = line.strip()

        if line.startswith("--- Session"):
            if current:
                sessions.append(current)
                current = []
            continue

        if line:
            current.append(line)

    if current:
        sessions.append(current)

    return sessions

def compute_idle_ratio(tokens):
    if not tokens:
        return None

    total = len(tokens)
    idle_count = tokens.count("IDLE")
    idle_ratio = idle_count / total * 100

    return {
        "idle_ratio": idle_ratio,
        "idle_count": idle_count,
        "total_tokens": total
    }

def load_debug_stats(filepath):
    sessions = parse_sessions_from_debug(filepath)

    stats = []
    for tokens in sessions:
        result = compute_idle_ratio(tokens)
        if result:
            stats.append(result)

    return stats

# ==========================
# 統合処理
# ==========================
print("\n===== 統合 行動統計 =====\n")

for label in JSON_FILES.keys():
    json_stats = load_json_stats(JSON_FILES[label])
    debug_stats = load_debug_stats(DEBUG_FILES[label])

    if not json_stats or not debug_stats:
        print(f"{label}: データ不足")
        continue

    n = min(len(json_stats), len(debug_stats))

    df_json = pd.DataFrame(json_stats[:n])
    df_debug = pd.DataFrame(debug_stats[:n])

    avg_actions = df_json["action_count"].mean()
    avg_duration = df_json["duration"].mean()
    avg_idle_ratio = df_debug["idle_ratio"].mean()

    print(f"--- {label} ---")
    print(f"セッション数                 : {n}")
    print(f"IDLE除外 平均アクション数     : {avg_actions:.2f}")
    print(f"平均所要時間 (秒)            : {avg_duration:.2f}")
    print(f"平均 IDLE 占有率 (%)         : {avg_idle_ratio:.2f}")
    print()
