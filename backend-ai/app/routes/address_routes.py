from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db
from app.schemas.address import AddressCreate
from app.services.address_service import AddressService

router = APIRouter(
    prefix="/addresses",
    tags=["Addresses"]
)

@router.post("")
async def create_address(
    payload: AddressCreate,
    db: asyncpg.Connection = Depends(get_db)
):

    user_id = 1

    return await AddressService.create_address(
        db,
        user_id,
        payload
    )

@router.get("")
async def get_addresses(
    db: asyncpg.Connection = Depends(get_db)
):

    user_id = 1

    return await AddressService.get_addresses(
        db,
        user_id
    )

@router.delete("/{address_id}")
async def delete_address(
    address_id: int,
    db: asyncpg.Connection = Depends(get_db)
):

    user_id = 1

    return await AddressService.delete_address(
        db,
        user_id,
        address_id
    )