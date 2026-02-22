"""
Network connectivity endpoints.
GET /connectivity — carriers, latency, bandwidth summary
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/connectivity")
async def connectivity_summary():
    """Network connectivity summary — carriers, latency, bandwidth."""
    return {
        "total_capacity_gbps": 400,
        "used_capacity_gbps": 267,
        "latency_manhattan_ms": 1.2,
        "carrier_count": 3,
        "uptime_pct": 99.99,
        "cross_connects": 8,
        "carriers": [
            {"name": "Zayo", "capacity_gbps": 200, "status": "active"},
            {"name": "Crown Castle", "capacity_gbps": 100, "status": "active"},
            {"name": "Lightpath", "capacity_gbps": 100, "status": "active"},
        ],
        "cloud_latency": [
            {"provider": "AWS", "region": "us-east-1", "latency_ms": 2.1},
            {"provider": "Azure", "region": "eastus", "latency_ms": 2.4},
            {"provider": "GCP", "region": "us-east4", "latency_ms": 3.1},
        ],
        "tenant_bandwidth": [
            {"tenant": "Equinix", "allocated_gbps": 100, "used_gbps": 82},
            {"tenant": "GPU Cloud", "allocated_gbps": 150, "used_gbps": 128},
            {"tenant": "Wholesale A", "allocated_gbps": 100, "used_gbps": 45},
            {"tenant": "Edge Retail", "allocated_gbps": 50, "used_gbps": 12},
        ],
    }
