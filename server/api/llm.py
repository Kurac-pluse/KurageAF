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

router = APIRouter(prefix="/api")
client = openai.AsyncClient(api_key=settings.openai_api_key)

# --- OpenAI呼び出し関数 ---
async def call_openai_chat(
    prompt: str,
    model="gpt-4o-mini",
    max_tokens=2000,
    temperature=0.7
) -> str:
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "あなたは日本語が得意なアシスタントです。"},
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
            personality="英語が喋れない純日本人",
            role="仲の良い後輩",
            conversation_context=context,
            knowledge="",
            query=request.prompt,
            task=request.task,
        )

        result = await call_openai_chat(prompt_filled)

        m = re.search(r".*?[。！？.]", result)
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

        result = await call_openai_chat(prompt_filled)
        return {"response": result}

    except Exception as e:
        print("[Exception]", e)
        return {"status": "error", "message": "内部エラーが発生しました3"}


@router.post("/makeJSON")
async def call_llm_json(request: QueryRequestJSON):
    try:
        prompt_filled = f"出力は必ずJSON形式で返してください:\n{request.prompt}"
        result = await call_openai_chat(prompt_filled)
        return {"response": result}
    except Exception as e:
        print("[Exception]", e)
        return {"response": "（内部エラーが発生しました4）"}


@router.post("/task")
async def call_llm_task(request: QueryRequestTask):
    try:
        result = await call_openai_chat(request.prompt)

        m = re.search(r".*?[。！？.]", result)
        if m:
            result = m.group(0)

        return {"response": result or "（応答を生成できませんでした）"}

    except Exception as e:
        print("[Exception]", e)
        return {"response": "（内部エラーが発生しました5）"}
