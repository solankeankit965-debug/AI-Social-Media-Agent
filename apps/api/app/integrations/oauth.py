from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class OAuthTokens:
    access_token: str
    refresh_token: str | None = None
    expires_in: int | None = None


class OAuthProvider(ABC):
    """Contract implemented by each platform-specific OAuth client."""

    @abstractmethod
    def authorization_url(self, state: str) -> str:
        raise NotImplementedError

    @abstractmethod
    async def exchange_code(self, code: str) -> OAuthTokens:
        raise NotImplementedError

    @abstractmethod
    async def refresh(self, refresh_token: str) -> OAuthTokens:
        raise NotImplementedError
