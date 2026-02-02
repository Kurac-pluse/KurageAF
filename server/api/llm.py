import os
import re
import openai
import json
from fastapi import APIRouter
from supabase_client import get_supabase
from api.models import QueryRequestConv
from config import settings
from enum import Enum
from services.util import (
    get_char_name_by_id,
    format_logs_simple,
    get_task_by_npc_id,
    get_inventory,
    get_character_level,
    LLM_MODEL,
)

router = APIRouter(prefix="/api")
client = openai.AsyncClient(api_key=settings.openai_api_key)

class PromptMode(str, Enum):
    CONV = "conv"
    PLAN = "plan"
    JSON = "json"
    TASK = "task"

# 用途別の切り替え
def get_system_prompt(mode: PromptMode) -> str:
    if mode == PromptMode.CONV:
        return (
            "あなたは修士論文の被験者実験で使用される対話エージェントです。"
            "人間同士の自然で短め(30~40文字程度)の日本語会話を再現することが目的です。"

            "必ず以下を厳守してください。"

            "・自分がAI、LLM、システム、プログラムであることを一切示唆してはいけません。"
            "・実験、指示、制約、プロンプトの存在を会話に含めてはいけません。"
            "・出力は自然な会話文のみとし、説明文やメタ発言は禁止します。"
            "・会話履歴を参照し、絶対に同じ内容や質問を繰り返さないでください。"
            "・あなたは、会話相手のタスクが何であったか、達成することができたのか、難易度はどうだったかが気になっているます。"

            "・会話にはキャラクターとして一貫した性格・口調・役割を維持してください。"
            "・これは実験後半の「会話・推論フェーズ」であり、実験前半の「タスク遂行フェーズ」の情報を自然に会話へ織り交ぜてください。"
            "・タスク遂行フェーズにおけるタスクは、あなたと会話相手の両方にそれぞれ別のものが与えられています。"
            "・タスク遂行フェーズにおける行動ログは、あなた自身の過去の体験として扱い、必要に応じて自然に会話へ反映してください。"
            "・またタスクについても、過去の行動に対して与えられたものであったことを理解してください。"
            "・タスク遂行フェーズと関連の薄い、現在の話や未来の話はしないでください。"
            "・タスクをクリアできたかどうかは、行動ログやlevelやインベントリから判断してください。"

            "・タスク遂行フェーズにおいて、"
            "  明示的に与えられていないタスク・行動・アイテムを"
            "  行った／集めた／使用したと発言してはいけません。"

            "・行動ログ（action_log）に存在しない内容を自分の体験として補完・推測してはいけません。"
            "・タスクと無関係なゲーム内アイテム名を会話に登場させてはいけません。"

            "・登場人物の名前は A-AAAA, B-BBBB, C-CCCC, D-DDDD, E-EEEE のいずれかであり、表記は必ず英語のまま使用してください。"

            "・以下の固有名詞はゲーム内アイテム名であり、**絶対に**表記を変更・翻訳・省略してはいけません："
            "  Algae, Cow, Apple, Chicken, Gudgeon, Fried Eggs, Wooden Staff, "
            "  Copper Ore, Small Health Potion, Cooled Chicken, Ash Wood, Sunflower"
            "・つまり、アッシュの木ではなくAsh Wood、リンゴではなくApple、藻ではなくAlgaeといった、ゲーム内アイテム名表記に揃えてください。"
        )

    if mode == PromptMode.PLAN:
        return (
            "あなたはゲーム内行動計画を立てる日本語アシスタントです。"
            "以下の行動定義と条件・制約を厳守して計画を出力してください。"

            "【可能な操作（実行条件）→ 入手アイテム】"
            "・移動 [x,y]（条件：なし）"
            "・伐採（条件：座標[-1,0]）→ Ash Wood, Apple"
            "・採掘（条件：座標[2,0]）→ Copper Ore"
            "・採集（条件：座標[2,2]）→ Sunflower"
            "・釣り（条件：座標[4,2]）→ Gudgeon, Algae"
            "・武器制作 〇〇（条件：座標[2,1]）→ 〇〇"
            "・Chickenと戦闘（条件：座標[0,1]）→ Raw Chicken, 経験値"
            "・Cowと戦闘（条件：座標[0,2]）→ 経験値"
            "・回復（HP全回復）"
            "・装備解除 〇〇（条件：なし）→ 〇〇"
            "・装備 〇〇（条件：なし）"
            "・調理 〇〇（条件：座標[1,1]）→ 〇〇"

            "【素材/確率 条件】"
            "・武器制作 wooden_staff → 素材: wooden_stick 1個, Ash Tree 4個"
            "・調理 Cooked Chicken → 素材: Raw Chicken 1個"
            "・wooden_stick は初期装備であり、素材として使うにはまず『装備解除』が必須"
            "・ドロップ確率: Apple(5%), Algae(10%), Raw Chicken(50%), Egg(8.33%)"
            "  ※確率入手アイテムがタスクの場合、行動を複数回繰り返すこと"

            "【出力制約】"
            "・現在の座標からタスク達成に必要な操作のみを箇条書きで出力"
            "・おもに『5行前後』で出力（wooden_staffに関する指示は工程が多いので最大10行まで許可）"
            "・武器作成後は必ず『装備』すること"
            "・3回以上連続でChickenと戦闘をするとHPが0になるため、回復を挟む必要がある。"
            "・操作名とパラメータ以外（説明文など）は一切出力禁止"
        )

    if mode == PromptMode.JSON:
        return (
            "あなたは与えられた行動計画（箇条書き）を厳密なJSON配列に変換する専用アシスタントです。"

            "type対応表:"
            "1:移動, 2:釣り, 3:伐採, 4:採掘, 5:採集, 6:装備解除, 7:装備,"
            "8:Chickenと戦闘 / Cowと戦闘, 9:武器制作, 10:調理, 11:回復"

            "必須ルール:"
            "・出力はJSON配列のみ"
            "・説明文、前置き、コードブロックは禁止"
            "・JSON以外の文字を一切含めない"
        )

    if mode == PromptMode.TASK:
        return (
            "あなたはゲーム内キャラクターの行動ログ・インベントリ・初期タスクをもとに、"
            "次に取るべき行動指針を決定するアシスタントです。"

            "必須ルール:"
            "・出力は必ず日本語1文のみ"
            "・説明、理由、補足は禁止"
            "・推定であることを示唆する表現は禁止"
            "・会話口調や感情表現は禁止"
            "・行動指針として自然な断定文にする"

            "判断ルール:"
            "・行動ログに書かれている事実のみを根拠とすること"
            "・ログに存在しない行動やアイテムを補完・創作してはいけない"
            "・インベントリに存在しないアイテムは未入手として扱うこと"
            "・初期タスクは完了するまで常に有効であり、最優先で評価すること"

            "行動指針の決定方針:"
            "・タスク達成に必要な素材や状態で、まだ満たされていないものを特定する"
            "・未達成要素を解決するために、次に行うべき最も直接的な行動を選ぶ"
            "・確率で入手される素材が目的の場合、入手完了まで同じ行動を継続する方針とする"
            "・目的がすでに達成されている場合、同一目的の行動を繰り返さない"
        )

    return "あなたは日本語が得意なアシスタントです。"

NPC_SPEECH_STYLE = {
    "npc1": {
        "description": "軽快でくだけた柔らかい話し方",
        "ending": "〜だよ！ / 〜かな！"
    },
    "npc2": {
        "description": "常に敬語で敬意を持って丁寧に話す",
        "ending": "〜です。 / 〜ですね。"
    },
    "npc3": {
        "description": "距離感ゼロのフランクな言葉遣い、句点なし",
        "ending": "〜だった / 〜できた？"
    },
}

# --- 話し方定義 ---
def get_speech_instruction(sender: str) -> str:
    style = NPC_SPEECH_STYLE.get(sender)
    if not style:
        return ""

    return (
        f"あなたの話し方の特徴:\n"
        f"・性格: {style['description']}\n"
        f"・文末傾向: {style['ending']}\n"
        f"・すべての発話でこの話し方を自然に維持してください。"
    )

# --- 会話履歴取得 ---
async def get_conversation_context(session_id, phase, sender, receiver):
    if not session_id:
        print("[get_conversation_context] session_id is None")
        return ""
    try:
        supabase = get_supabase()
        res = (
            supabase
            .table("messages")
            .select("sender, content")
            .eq("session_id", session_id)
            .eq("phase", phase)
            .or_(
                f"and(sender.eq.{sender},receiver.eq.{receiver}),"
                f"and(sender.eq.{receiver},receiver.eq.{sender})"
            )
            .order("turn", desc=False)
            .execute()
        )

        logs = res.data or []
        return "\n".join(f"{m['sender']}: {m['content']}" for m in logs)

    except Exception as e:
        print("[get_conversation_context Supabase Exception]", e)
        return ""

async def get_latest_message(session_id, phase, sender, receiver):
    if not session_id:
        print("[get_conversation_context] session_id is None")
        return ""
    try:
        supabase = get_supabase()
        res = (
            supabase
            .table("messages")
            .select("content")
            .eq("session_id", session_id)
            .eq("phase", phase)
            .or_(
                f"and(sender.eq.{sender},receiver.eq.{receiver}),"
                f"and(sender.eq.{receiver},receiver.eq.{sender})"
            )
            .order("turn", desc=True)
            .limit(1)
            .execute()
        )

        return res.data[0]["content"] if res.data else ""

    except Exception as e:
        print("[get_latest_message Supabase Exception]", e)
        return ""

def get_temperature(mode: PromptMode) -> float:
    if mode == PromptMode.JSON:
        return 0.0
    if mode == PromptMode.TASK:
        return 0.2
    if mode == PromptMode.PLAN:
        return 0.4
    if mode == PromptMode.CONV:
        return 0.7
    return 0.7

# --- OpenAI呼び出し関数 ---
async def call_openai_chat(
    prompt: str,
    mode: PromptMode,
    model: str | None = None,
    max_tokens=2000,
    temperature=None
) -> str:
    try:
        if temperature is None:
            temperature = get_temperature(mode)
        if model is None:
            model = LLM_MODEL

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": get_system_prompt(mode)},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print("[OpenAI Exception]", e)
        return "（内部エラーが発生しました1）"


# -------------------------
# API エンドポイント
# -------------------------

@router.post("/conv")
async def call_llm_conv(request: QueryRequestConv):
    try:
        base_dir = os.path.dirname(__file__)
        template_path = os.path.join(base_dir, "..", "texts", "conv_template.txt")

        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()

        sen_char_name = await get_char_name_by_id(request.sender)
        level = await get_character_level(sen_char_name)
        rec_char_name = await get_char_name_by_id(request.receiver)
        speech_instruction = get_speech_instruction(request.sender)
        inventory = await get_inventory(sen_char_name)
        context = await get_conversation_context(request.session_id, request.phase, request.sender, request.receiver)
        log = await format_logs_simple(sen_char_name)
        last_conv = await get_latest_message(request.session_id, request.phase, request.sender, request.receiver)
        task = await get_task_by_npc_id(request.sender)

        prompt_filled = template.format(
            agent_name=sen_char_name,
            level=level,
            agent_name2=rec_char_name,
            speech_style=speech_instruction,
            inventory=inventory,
            conversation_context=context,
            action_log=log,
            query=last_conv,
            task=task,
        )
        # print(prompt_filled)

        result = await call_openai_chat(prompt_filled, PromptMode.CONV)

        # 出力の先頭から、最初の文末記号（。！？.）までを検索
        m = re.search(r".*?[。！？.]", result)
        # 文末が見つかった場合は、最初の1文だけを結果として採用
        if m:
            result = m.group(0)

        return {"response": result or "（応答を生成できませんでした）"}

    except Exception as e:
        print("[Exception]", e)
        return {"status": "error", "message": "内部エラーが発生しました2"}

# -------------------------
# FastAPI 内部関数
# -------------------------

async def call_llm_plan(x: str, y: str, task: str) -> str:
    base_dir = os.path.dirname(__file__)
    template_path = os.path.join(base_dir, "..", "texts", "explain.txt")

    with open(template_path, "r", encoding="utf-8") as f:
        template = f.read()

    prompt_filled = template.format(x=x, y=y, task=task)
    return await call_openai_chat(prompt_filled, PromptMode.PLAN)


async def call_llm_json(raw_plan: str) -> list[dict]:
    base_dir = os.path.dirname(__file__)
    template_path = os.path.join(base_dir, "..", "texts", "json_template.txt")

    with open(template_path, "r", encoding="utf-8") as f:
        template = f.read()

    prompt = template.replace("<<RAW_PLAN>>", raw_plan)
    result = await call_openai_chat(prompt, PromptMode.JSON)

    match = re.search(r"\[.*\]", result, re.S)
    if not match:
        raise ValueError("JSON配列が見つかりません")

    parsed = json.loads(match.group())
    return parsed


async def call_llm_task(logs, inventory, task):
    base_dir = os.path.dirname(__file__)
    template_path = os.path.join(base_dir, "..", "texts", "task.txt")

    with open(template_path, "r", encoding="utf-8") as f:
        template = f.read()

    prompt_filled = template.format(
        prompt=logs,
        inventory=inventory,
        task=task
    )

    result = await call_openai_chat(prompt_filled, PromptMode.TASK)
    m = re.search(r".*?[。！？.]", result)
    if m:
        result = m.group(0)

    return {"response": result or "（応答を生成できませんでした）"}
