from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class PublishResult:
    provider: str
    external_post_id: str
    url: str | None = None


class SocialAdapter(ABC):
    """Stable boundary around LinkedIn, Meta, X, and future provider APIs."""

    provider: str

    @abstractmethod
    async def publish_text(self, account_id: str, text: str) -> PublishResult:
        raise NotImplementedError

    async def validate_credentials(self, account_id: str) -> bool:
        return True
