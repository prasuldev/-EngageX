from fastapi import APIRouter, Depends
from app.database import get_db

router = APIRouter(tags=["categories"])

@router.get("/categories")
async def get_categories(db=Depends(get_db)):
    rows = await db.fetch("SELECT * FROM categories ORDER BY name")
    return [dict(r) for r in rows]