import uuid

from app.integrations.social.base import PublishResult, SocialAdapter


class MockSocialAdapter(SocialAdapter):
    """Safe local adapter that never calls a real social network."""

    def __init__(self, provider: str) -> None:
        self.provider = provider

    async def publish_text(self, account_id: str, text: str) -> PublishResult:
        post_id = f"mock-{uuid.uuid4()}"
        return PublishResult(
            provider=self.provider,
            external_post_id=post_id,
            url=f"https://example.invalid/{self.provider}/{account_id}/{post_id}",
        )
