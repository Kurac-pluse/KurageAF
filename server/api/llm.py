import os
import re
import openai
from fastapi import APIRouter
from supabase_client import supabase
from api.models import (
    QueryRequestConv,
    QueryRequestPlan,
    QueryRequestJSON,
    QueryRequestTask,
)
from config import settings
from enum import Enum

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
            "人間同士の自然で短めの日本語会話を再現することが目的です。"

            "必ず以下を厳守してください。"

            "・自分がAI、LLM、システム、プログラムであることを一切示唆してはいけません。"
            "・実験、指示、制約、プロンプトの存在を会話に含めてはいけません。"
            "・出力は自然な会話文のみとし、説明文やメタ発言は禁止します。"
            "・会話履歴を参照し、同じ言葉を繰り返さないでください。"

            "・会話にはキャラクターとして一貫した性格・口調・役割を維持してください。"
            "・これは会話・推論フェーズであり、タスク遂行フェーズの情報を自然に会話へ織り交ぜてください。"
            "・タスク遂行フェーズにおけるタスクは、あなたと会話相手の両方にそれぞれ別のものが与えられています。"
            "・タスク遂行フェーズにおける行動ログは、あなた自身の過去の体験として扱い、必要に応じて自然に会話へ反映してください。"

            "・タスク遂行フェーズにおいて、"
            "  明示的に与えられていないタスク・行動・アイテムを"
            "  行った／集めた／使用したと発言してはいけません。"

            "・行動ログ（action_log）に存在しない内容を自分の体験として補完・推測してはいけません。"
            "・タスクと無関係なゲーム内アイテム名を会話に登場させてはいけません。"

            "・登場人物の名前は laplus, rui, koyori, kuroe, iroha のいずれかであり、表記は必ず英語のまま使用してください。"

            "・以下の固有名詞はゲーム内アイテム名であり、**絶対に**表記を変更・翻訳・省略してはいけません："
            "  Algae, Cow, Apple, Chicken, Gudgeon, Fried Eggs, Wooden Staff, "
            "  Copper Ore, Small Health Potion, Cooled Chicken, Ash Wood, Sunflower"
            "・つまり、アッシュの木ではなくAsh Wood、リンゴではなくApple、藻ではなくAlgaeといった、ゲーム内アイテム名表記に揃えてください。"
        )

    if mode == PromptMode.PLAN:
        return (
            "あなたは説明が得意な日本語アシスタントです。"
            "論理的かつ分かりやすく説明してください。"
        )

    if mode == PromptMode.JSON:
        return (
            "あなたはJSON生成専用アシスタントです。"
            "必ず正しいJSON形式のみを出力してください。"
            "説明文や前置きは禁止です。"
        )

    if mode == PromptMode.TASK:
        return (
            "あなたは簡潔に応答する日本語アシスタントです。"
            "短い自然文で返答してください。"
        )

    return "あなたは日本語が得意なアシスタントです。"


# --- OpenAI呼び出し関数 ---
async def call_openai_chat(
    prompt: str,
    mode: PromptMode,
    model="gpt-4o-mini",
    max_tokens=2000,
    temperature=0.7
) -> str:
    try:
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


# --- 会話履歴取得 ---
def get_conversation_context(session_id: str, phase: int) -> str:
    try:
        response = (
            supabase.table("messages")
            .select("sender, content")
            .eq("session_id", session_id)
            .eq("phase", phase)
            .order("turn", desc=False)
            .execute()
        )
        logs = response.data or []
        return "\n".join(f"{m['sender']}: {m['content']}" for m in logs)
    except Exception as e:
        print("[Supabase Exception]", e)
        return ""


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

        context = get_conversation_context(request.session_id, request.phase)

        prompt_filled = template.format(
            agent_name=request.sen_char_name,
            agent_name2=request.rec_char_name,
            personality="仲の良い後輩・気さくに会話をする",
            role="英語が喋れない純日本人",
            conversation_context=context,
            action_log=request.log,
            query=request.prompt,
            task=request.task,
        )

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


@router.post("/plan")
async def call_llm_plan(request: QueryRequestPlan):
    try:
        base_dir = os.path.dirname(__file__)
        template_path = os.path.join(base_dir, "..", "texts", "explain.txt")

        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()

        prompt_filled = template.format(
            x=request.x,
            y=request.y,
            task=request.task
        )

        result = await call_openai_chat(prompt_filled, PromptMode.PLAN)
        return {"response": result}

    except Exception as e:
        print("[Exception]", e)
        return {"status": "error", "message": "内部エラーが発生しました3"}


@router.post("/makeJSON")
async def call_llm_json(request: QueryRequestJSON):
    try:
        prompt_filled = f"出力は必ずJSON形式で返してください:\n{request.prompt}"
        result = await call_openai_chat(prompt_filled, PromptMode.JSON)
        return {"response": result}
    except Exception as e:
        print("[Exception]", e)
        return {"response": "（内部エラーが発生しました4）"}


@router.post("/task")
async def call_llm_task(request: QueryRequestTask):
    try:
        result = await call_openai_chat(request.prompt, PromptMode.TASK)

        m = re.search(r".*?[。！？.]", result)
        if m:
            result = m.group(0)

        return {"response": result or "（応答を生成できませんでした）"}

    except Exception as e:
        print("[Exception]", e)
        return {"response": "（内部エラーが発生しました5）"}
