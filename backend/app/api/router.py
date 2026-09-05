from fastapi import APIRouter

from app.api.routes import auth, customers, parking, parties, projects, transactions, unit_sales, units

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(units.router)
api_router.include_router(units.property_setup_router)
api_router.include_router(parking.router)
api_router.include_router(parties.router)
api_router.include_router(parties.project_parties_router)
api_router.include_router(customers.router)
api_router.include_router(transactions.router)
api_router.include_router(unit_sales.router)
