from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

app = FastAPI(title="DKIA - Daily Knowledge Ingestion Assistant")

# Mount static files
app.mount("/static", StaticFiles(directory="src/web/static"), name="static")

# Mount design system assets (logos, favicons, etc.)
app.mount("/design-system", StaticFiles(directory="design-system"), name="design-system")

# Templates
templates = Jinja2Templates(directory="src/web/templates")


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("navigator.html", {"request": request})


@app.get("/visualization", response_class=HTMLResponse)
async def read_visualization(request: Request):
    return templates.TemplateResponse("visualization.html", {"request": request})
