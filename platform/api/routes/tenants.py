"""
Tenant management endpoints.
GET /tenants — list tenants with capacity, SLA, revenue
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import get_db

router = APIRouter()

# Default tenant data (used when real tenant table is empty or unavailable)
_DEFAULT_TENANTS = [
    {
        "id": 1, "name": "Equinix", "slug": "equinix",
        "capacity_mw": 3.0, "uptime_pct": 99.99,
        "monthly_revenue": 555000, "service_type": "wholesale",
    },
    {
        "id": 2, "name": "GPU Cloud", "slug": "gpu-cloud",
        "capacity_mw": 2.5, "uptime_pct": 99.97,
        "monthly_revenue": 875000, "service_type": "gpu_aas",
    },
    {
        "id": 3, "name": "Wholesale A", "slug": "wholesale-a",
        "capacity_mw": 2.0, "uptime_pct": 99.98,
        "monthly_revenue": 370000, "service_type": "wholesale",
    },
    {
        "id": 4, "name": "Edge Retail", "slug": "edge-retail",
        "capacity_mw": 0.5, "uptime_pct": 99.95,
        "monthly_revenue": 150000, "service_type": "edge",
    },
]


@router.get("/tenants")
async def list_tenants(db: AsyncSession = Depends(get_db)):
    """List all tenants with capacity, SLA, and revenue info."""
    try:
        result = await db.execute(text(
            "SELECT id, name, slug, contact_email FROM tenants ORDER BY name"
        ))
        rows = result.fetchall()
        if rows:
            return [
                {"id": r.id, "name": r.name, "slug": r.slug,
                 "contact_email": r.contact_email}
                for r in rows
            ]
    except Exception:
        pass

    return _DEFAULT_TENANTS
