import os
from dotenv import load_dotenv
from langchain_core.language_models.llms import LLM
from pydantic import Field
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
import requests, asyncio
from supabase_client import supabase
from typing import Optional, Callable, Any, List, Dict

load_dotenv()

# llama.cpp HTTP wrapper
class LlamaCppHTTP(LLM):
    endpoint_url: str = Field()

    @property
    def _llm_type(self) -> str:
        return "llama-cpp-http"

    def _call(self, prompt: str, stop: Optional[list[str]] = None) -> str:
        payload = {
            "prompt": prompt,
            "max_tokens": 128,
            "temperature": 0.7,
            "top_p": 0.9,
        }
        resp = requests.post(self.endpoint_url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data.get("content", "")

# llama.cpp サーバー
llm = LlamaCppHTTP(endpoint_url=os.environ["REACT_APP_LLAMA_URL"])

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

# プロンプトを作って推論
def run_conv_llm(session_id: str, phase: str, log: str, prompt: str, sen_char_name: str, rec_char_name: str, task: str) -> str:
    try:
        # 外部テキストからテンプレートの読み込み
        base_dir = os.path.dirname(__file__)
        external_file_path = os.path.join(base_dir, "texts", "conv_template.txt")
        with open(external_file_path, "r", encoding="utf-8") as f:
            template = f.read()

        # 会話ログ
        conversation_context = get_conversation_context(
            session_id, phase
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
        raw_text = log or ""
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
        user_query = prompt or ""
        query = f"query: {user_query}"

        relevant_docs = retriever.invoke(query)

        # 見つかったときだけ連結（順序保持）
        knowledge_text = "\n".join(d.page_content for d in relevant_docs) if relevant_docs else ""

        # テンプレートに履歴・知識・最新のユーザー発話を埋め込む
        prompt_filled = template.format(
            agent_name=sen_char_name,
            agent_name2=rec_char_name,
            personality="英語が喋れない純日本人",
            role="親友",
            conversation_context=conversation_context,
            knowledge=knowledge_text,
            query=prompt,
            task=task,
        )
        # print(prompt_filled)
        return llm.invoke(prompt_filled)

    except Exception as e:
        print("[Exception]", e)
        return {"error": "Internal Server Error", "detail": str(e)}

# 行動プランの作成
def run_plan_llm(x: str, y: str, task: str) -> str:
    # 外部テキストからテンプレートの読み込み
    base_dir = os.path.dirname(__file__)
    external_file_path = os.path.join(base_dir, "texts", "explain.txt")
    with open(external_file_path, "r", encoding="utf-8") as f:
        external_text = f.read()
    
    external_text_filled = external_text.format(
        x=x,
        y=y,
        task=task,
    )

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=300,
        chunk_overlap=20,
    )
    texts = text_splitter.split_text(external_text_filled)
    docs = [Document(page_content=chunk) for chunk in texts]

    # 埋め込みモデル
    embedding_model = HuggingFaceEmbeddings(
        model_name=os.environ["REACT_APP_EMBEDDING_MODEL"]
    )

    # FAISSベクトルストア
    vectorstore = FAISS.from_documents(docs, embedding_model)
    retriever = vectorstore.as_retriever()

    # RetrievalQAチェーン
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
    )
    return qa_chain.run("taskを達成するまでの道筋を出力してください")
