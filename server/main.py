from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.llm import router as llm_router
from api.mmo import router as mmo_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(llm_router)
app.include_router(mmo_router)
