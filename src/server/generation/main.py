from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Optional
import requests
from dotenv import load_dotenv
import os
load_dotenv()

# LangChain コア・コミュニティパッケージ
from langchain_core.language_models.llms import LLM
from langchain_core.documents import Document

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

from langchain.chains import RetrievalQA

# FastAPIにCORS対応をさせる
from fastapi.middleware.cors import CORSMiddleware

# --------------------------------------------------------
# ① llama.cpp HTTPサーバー呼び出しラッパー
# --------------------------------------------------------
class LlamaCppHTTP(LLM):
    endpoint_url: str = Field()

    @property
    def _llm_type(self) -> str:
        return "llama-cpp-http"

    def _call(self, prompt: str, stop: Optional[list[str]] = None) -> str:
        payload = {
            "prompt": prompt,
            "max_tokens": 256,
            "temperature": 0.7,
            "top_p": 0.9,
        }
        resp = requests.post(self.endpoint_url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data.get("content", "")

# --------------------------------------------------------
# ② FastAPIサーバー
# --------------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------
# ③ llama.cpp HTTPエンドポイント（Cloudflare TunnelのURLに合わせる）
# --------------------------------------------------------
llm = LlamaCppHTTP(endpoint_url=os.environ["REACT_APP_LLAMA_URL"])

# --------------------------------------------------------
# ④ 外部テキストを読み込み
# --------------------------------------------------------
external_text = """
これは外部ドキュメントの例です。
FAQ、マニュアル、仕様書、会話履歴など、好きなテキストをここに入れられます。
長文でも大丈夫です。
この部分が「外部テキスト」として検索のコンテキストになります。
"""

# --------------------------------------------------------
# テキストをチャンク分割
# --------------------------------------------------------
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=300,
    chunk_overlap=20,
)

texts = text_splitter.split_text(external_text)
docs = [Document(page_content=chunk) for chunk in texts]

# --------------------------------------------------------
# HuggingFace埋め込みモデルを使う
# --------------------------------------------------------
embedding_model = HuggingFaceEmbeddings(model_name=os.environ["REACT_APP_EMBEDDING_MODEL"])

# --------------------------------------------------------
# ベクトルストア作成（FAISS）
# --------------------------------------------------------
vectorstore = FAISS.from_documents(docs, embedding_model)
retriever = vectorstore.as_retriever()

# --------------------------------------------------------
# ⑤ LangChain RetrievalQAチェーン
# --------------------------------------------------------
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=retriever,
)

# --------------------------------------------------------
# FastAPI POST エンドポイント
# --------------------------------------------------------
class QueryRequest(BaseModel):
    prompt: str

@app.post("/api/llm")
async def call_llm(request: QueryRequest):
    """
    フロントエンドから { "prompt": "質問内容" } を受け取り、
    外部テキストから検索して llama.cpp サーバーで推論し返す
    """
    result = qa_chain.run(request.prompt)
    return {"response": result}