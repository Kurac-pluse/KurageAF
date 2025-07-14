import os
from dotenv import load_dotenv

from langchain_core.language_models.llms import LLM
from pydantic import Field
import requests
from typing import Optional

from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.chains import RetrievalQA

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
            "max_tokens": 256,
            "temperature": 0.7,
            "top_p": 0.9,
        }
        resp = requests.post(self.endpoint_url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data.get("content", "")

# llama.cpp サーバー
llm = LlamaCppHTTP(endpoint_url=os.environ["REACT_APP_LLAMA_URL"])

# 外部テキスト
external_text = """
これは外部ドキュメントの例です。
FAQ、マニュアル、仕様書、会話履歴など、好きなテキストをここに入れられます。
"""

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=300,
    chunk_overlap=20,
)
texts = text_splitter.split_text(external_text)
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
