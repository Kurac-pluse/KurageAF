import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from llama_chain import run_conv_llm
from supabase_client import supabase
from models import QueryRequestConv, QueryRequestPlan, QueryRequestJSON, QueryRequestTask
from typing import Callable, Any, List, Dict
import asyncio
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
import re

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

# 会話ログを整形する関数
def get_conversation_context(session_id: str, phase: int) -> str:
    """Supabaseから指定セッション＆フェーズの会話履歴を取得"""
    response = supabase.table("messages") \
        .select("sender, content") \
        .eq("session_id", session_id) \
        .eq("phase", phase) \
        .order("turn", desc=False) \
        .execute()

    logs: List[Dict] = response.data or []
    context = "\n".join(
        f"{m['sender']}: {m['content']}" for m in logs
    )
    # print("[Conversation Context]", context)
    return context

@app.post("/api/conv")
async def call_llm_conv(request: QueryRequestConv):
    try:
        # 外部テキストからテンプレートの読み込み
        base_dir = os.path.dirname(__file__)
        external_file_path = os.path.join(base_dir, "texts", "conv_template.txt")
        with open(external_file_path, "r", encoding="utf-8") as f:
            template = f.read()

        # 会話ログ
        conversation_context = get_conversation_context(
            request.session_id, request.phase
        )

        # 埋め込みモデル
        embedding_model = HuggingFaceEmbeddings(
            model_name=os.environ["REACT_APP_EMBEDDING_MODEL"]
        )

        # ログをチャンク分割（サイズは日本語で ~300–800字目安）
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800, chunk_overlap=120, separators=["\n\n", "\n", "。", "、", " "]
        )

        # 会話ログ（request.log）を丸ごと1ドキュメントに加工
        raw_text = request.log or ""
        splits = text_splitter.split_text(raw_text)
        docs = [Document(page_content=t, metadata={"source": "log", "idx": i}) for i, t in enumerate(splits)]

        # FAISSベクトルストア
        vectorstore = FAISS.from_documents(docs, embedding_model)

        # Retriever取得
        retriever = vectorstore.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={"score_threshold": 0.3, "k": 4}  # 閾値・上限件数は要件に合わせて調整
        )

        # モデル特性に合わせてクエリ整形
        user_query = request.prompt or ""
        query = f"query: {user_query}"

        relevant_docs = retriever.get_relevant_documents(query)

        # 見つかったときだけ連結（順序保持）
        knowledge_text = "\n".join(d.page_content for d in relevant_docs) if relevant_docs else ""

        # テンプレートに履歴・知識・最新のユーザー発話を埋め込む
        prompt_filled = template.format(
            agent_name=request.sen_char_name,
            agent_name2=request.rec_char_name,
            personality="英語が喋れない純日本人",
            role="親友",
            conversation_context=conversation_context,
            knowledge=knowledge_text,
            query=request.prompt,
            task=request.task,
        )
        # print(prompt_filled)

        # LLM推論
        result = run_conv_llm(prompt_filled).strip()
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