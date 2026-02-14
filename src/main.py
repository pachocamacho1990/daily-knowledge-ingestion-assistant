import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from src.config import settings
from src.database import init_db
from src.llm.client import ollama_client
from src.processing.pipeline import process_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()

    # Background processing queue
    queue = asyncio.Queue()
    app.state.processing_queue = queue
    worker_task = asyncio.create_task(process_worker(queue))

    yield

    # Shutdown
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="DKIA", version="0.1.0", lifespan=lifespan)

app.mount("/static", StaticFiles(directory="src/web/static"), name="static")


@app.get("/health")
async def health():
    ollama_ok = await ollama_client.health_check()
    return {
        "status": "ok",
        "database": settings.database_path,
        "ollama": "connected" if ollama_ok else "disconnected",
    }


# Import and include routes
from src.web.routes.library import router as library_router  # noqa: E402
from src.web.routes.navigator import router as navigator_router  # noqa: E402

app.include_router(navigator_router)
app.include_router(library_router)
