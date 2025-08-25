from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from llama_chain import qa_chain
from supabase_client import supabase
from models import QueryRequestConv, QueryRequestPlan, QueryRequestJSON, QueryRequestTask
import asyncio
from typing import Callable, Any

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def run_with_timeout(
    func: Callable[..., Any], 
    *args, 
    timeout: float = 30.0,
    **kwargs
) -> Any:
    # func を asyncio.to_thread で非同期化し、 timeout秒以内に終わらなければTimeoutErrorを発生
    return await asyncio.wait_for(
        asyncio.to_thread(func, *args, **kwargs),
        timeout=timeout
    )

@app.post("/api/conv")
async def call_llm_conv(request: QueryRequestConv):
    try:
        result = qa_chain.run(request.prompt)

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
        print("[Supabase Insert Response]", insert_response)
        print("[Supabase Insert Data]", insert_response.data)
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