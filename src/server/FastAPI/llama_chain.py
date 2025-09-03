import os
from dotenv import load_dotenv

from langchain_core.language_models.llms import LLM
from pydantic import Field
import requests
from typing import Optional

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

def run_conv_llm(prompt: str) -> str:
    return llm(prompt)
