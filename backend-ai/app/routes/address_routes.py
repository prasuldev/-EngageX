from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from app.database import get_db
from app.schemas.address import AddressCreate
from app.services.address_service import AddressService
from app.auth.dependencies import get_current_customer

router = APIRouter(
    prefix="/addresses",
    tags=["Addresses"]
)

@router.post("")
async def create_address(
    payload: AddressCreate,
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    return await AddressService.create_address(db, current_user["id"], payload)


@router.get("")
async def get_addresses(
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    return await AddressService.get_addresses(db, current_user["id"])


@router.patch("/{address_id}")
async def update_address(
    address_id: int,
    payload: AddressCreate,
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    updated = await AddressService.update_address(db, current_user["id"], address_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Address not found")
    return updated


@router.patch("/{address_id}/default")
async def set_default_address(
    address_id: int,
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    updated = await AddressService.set_default_address(db, current_user["id"], address_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Address not found")
    return updated

@router.delete("/{address_id}")
async def delete_address(
    address_id: int,
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    result = await AddressService.delete_address(db, current_user["id"], address_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Address not found")
    if result.get("conflict"):
        raise HTTPException(status_code=409, detail=result["message"])
    return result