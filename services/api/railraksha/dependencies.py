from collections.abc import AsyncIterator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from railraksha.auth import Principal
from railraksha.models import AuditEvent


async def database(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.sessions() as session:
        yield session


def audit(db: AsyncSession, request: Request, user: Principal, action: str) -> None:
    db.add(AuditEvent(actor=user.subject, action=action, request_id=request.state.request_id))
