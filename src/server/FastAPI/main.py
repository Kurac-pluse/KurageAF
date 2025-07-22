from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from llama_chain import qa_chain
from supabase_client import supabase
from models import QueryRequestConv, QueryRequestPlan

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
        result = qa_chain.run(request.prompt)

        if not result:
            result = "（応答を生成できませんでした）"

        return {"response": result}

    except Exception as e:
        print("[Exception]", e)
        return {"error": "Internal Server Error", "detail": str(e)}