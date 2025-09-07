import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from llama_chain import run_conv_llm, run_plan_llm
from supabase_client import supabase
from models import QueryRequestConv, QueryRequestPlan, QueryRequestJSON, QueryRequestTask
import asyncio
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/conv")
async def call_llm_conv(request: QueryRequestConv):
    try:
        # LLM推論
        result = run_conv_llm(
            request.session_id, request.phase, request.log, request.prompt,
            request.sen_char_name, request.rec_char_name, request.task
        ).strip()

        m = re.search(r'.*?[。！？.]', result)

        if m:
            result = m.group(0)

        print(result)

        if not result:
            result = "（応答を生成できませんでした）"

        data = {
            "session_id": request.session_id,
            "phase": request.phase,
            "turn": request.turn,
            "sender": request.sender,
            "receiver": request.receiver,
            "content": result,
        }

        insert_response = supabase.table("messages").insert(data).execute()
        if not insert_response.data:
            return {
                "error": "Supabase Insert failed",
                "detail": "No data returned from Supabase."
            }

        return {"response": result}

    except Exception as e:
        print("[Exception]", e)
        return {"error": "Internal Server Error", "detail": str(e)}

@app.post("/api/plan")
async def call_llm_plan(request: QueryRequestPlan):
    try:
        result = run_plan_llm(request.x, request.y, request.task)
        print("plan: ", result)
        if not result:
            result = "（応答を生成できませんでした）"
        return {"response": result}
        
    except asyncio.TimeoutError:
        return {
            "status": "processing",
            "message": "処理に時間がかかっています。しばらく待ってから再度リクエストしてください。"
        }
    except Exception as e:
        print("[Exception]", e)
        return {"error": "Internal Server Error", "detail": str(e)}
    
@app.post("/api/makeJSON")
async def call_llm_JSON(request: QueryRequestJSON):
    try:
        result = await run_with_timeout(qa_chain.run, request.prompt, timeout=30.0)
        if not result:
            result = "（応答を生成できませんでした）"
        return {"response": result}

    except asyncio.TimeoutError:
        return {
            "status": "processing",
            "message": "処理に時間がかかっています。しばらく待ってから再度リクエストしてください。"
        }
    except Exception as e:
        print("[Exception]", e)
        return {"error": "Internal Server Error", "detail": str(e)}

@app.post("/api/task")
async def call_llm_task(request: QueryRequestTask):
    try:
        result = await run_with_timeout(qa_chain.run, request.prompt, timeout=30.0)
        if not result:
            result = "（応答を生成できませんでした）"
        return {"response": result}

    except asyncio.TimeoutError:
        return {
            "status": "processing",
            "message": "処理に時間がかかっています。しばらく待ってから再度リクエストしてください。"
        }
    except Exception as e:
        print("[Exception]", e)
        return {"error": "Internal Server Error", "detail": str(e)}