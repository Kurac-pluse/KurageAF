from dotenv import load_dotenv
import os
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase_client import supabase
from models import QueryRequestConv, QueryRequestPlan, QueryRequestJSON, QueryRequestTask
import openai

# OpenAIクライアント（最新SDK対応）
# client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
load_dotenv(".env.python")
api_key = os.getenv("OPENAI_API_KEY")
client = openai.AsyncClient(api_key=api_key)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- OpenAI呼び出し関数（非同期対応） ---
async def call_openai_chat(prompt: str, model="gpt-4o-mini", max_tokens=2000, temperature=0.7) -> str:
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
        return "（内部エラーが発生しました）"

# --- 会話履歴取得関数 ---
def get_conversation_context(session_id: str, phase: int) -> str:
    try:
        response = supabase.table("messages") \
            .select("sender, content") \
            .eq("session_id", session_id) \
            .eq("phase", phase) \
            .order("turn", desc=False) \
            .execute()
        logs = response.data or []
        return "\n".join(f"{m['sender']}: {m['content']}" for m in logs)
    except Exception as e:
        print("[Supabase Exception]", e)
        return ""

@app.post("/api/conv")
async def call_llm_conv(request: QueryRequestConv):
    try:
        base_dir = os.path.dirname(__file__)
        template_path = os.path.join(base_dir, "texts", "conv_template.txt")
        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()

        context = get_conversation_context(request.session_id, request.phase)

        prompt_filled = template.format(
            agent_name=request.sen_char_name,
            agent_name2=request.rec_char_name,
            personality="英語が喋れない純日本人",
            role="親友",
            conversation_context=context,
            knowledge="",
            query=request.prompt,
            task=request.task,
        )

        print("[DEBUG] prompt_filled:", prompt_filled)
        result = await call_openai_chat(prompt_filled)
        print("[DEBUG] GPT result:", result)

        # 文末で切る
        m = re.search(r'.*?[。！？.]', result)
        if m:
            result = m.group(0)

        if not result:
            result = "（応答を生成できませんでした）"

        # Supabaseに保存
        try:
            supabase.table("messages").insert({
                "session_id": request.session_id,
                "phase": request.phase,
                "turn": request.turn,
                "sender": request.sender,
                "receiver": request.receiver,
                "content": result,
            }).execute()
        except Exception as e:
            print("[Supabase Insert Exception]", e)

        return {"response": result}

    except Exception as e:
        print("[Exception]", e)
        return {"status":"error","message":"内部エラーが発生しました"}

@app.post("/api/plan")
async def call_llm_plan(request: QueryRequestPlan):
    try:
        base_dir = os.path.dirname(__file__)
        template_path = os.path.join(base_dir, "texts", "explain.txt")
        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()

        prompt_filled = template.format(
            x=request.x,
            y=request.y,
            task=request.task
        )

        print("[DEBUG] prompt_filled:", prompt_filled)
        result = await call_openai_chat(prompt_filled)
        print("[DEBUG] GPT result:", result)

        return {"response": result}

    except Exception as e:
        print("[Exception]", e)
        return {"status":"error","message":"内部エラーが発生しました"}

@app.post("/api/makeJSON")
async def call_llm_JSON(request: QueryRequestJSON):
    try:
        prompt_filled = f"出力は必ずJSON形式で返してください:\n{request.prompt}"
        print("[DEBUG] prompt_filled:", prompt_filled)
        result = await call_openai_chat(prompt_filled)
        print("[DEBUG] GPT result:", result)
        return {"response": result}

    except Exception as e:
        print("[Exception]", e)
        return {"response": "（内部エラーが発生しました）"}

@app.post("/api/task")
async def call_llm_task(request: QueryRequestTask):
    try:
        result = await call_openai_chat(request.prompt)

        m = re.search(r'.*?[。！？.]', result)
        if m:
            result = m.group(0)

        if not result:
            result = "（応答を生成できませんでした）"

        return {"response": result}

    except Exception as e:
        print("[Exception]", e)
        return {"response": '{"status":"error","message":"内部エラーが発生しました"}'}
