from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# import asyncio

from api.llm import router as llm_router
from api.mmo import router as mmo_router
# from npc.manager import watch_timer

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://elegant-kulfi-740e57.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(llm_router)
app.include_router(mmo_router)

# @app.on_event("startup")
# async def startup_event():
#     # FastAPI 起動時に NPC タイマー監視をバックグラウンドで開始
#     print("[startup] NPC timer watcher starting...")
#     asyncio.create_task(watch_timer())