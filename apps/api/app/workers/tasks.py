import asyncio
from datetime import UTC, datetime

from sqlalchemy import select

from app.db.models import SocialPost
from app.db.session import SessionLocal
from app.integrations.social import MockSocialAdapter
from app.workers.celery_app import celery_app


async def _publish(post: SocialPost) -> list[dict]:
    results: list[dict] = []
    for provider, text in post.content.items():
        adapter = MockSocialAdapter(provider)
        result = await adapter.publish_text(account_id="local-demo-account", text=text)
        results.append(
            {
                "provider": result.provider,
                "external_post_id": result.external_post_id,
                "url": result.url,
            }
        )
    return results


@celery_app.task(name="publish_post", bind=True, max_retries=3)
def publish_post(self, post_id: str) -> list[dict]:
    with SessionLocal() as db:
        post = db.scalar(select(SocialPost).where(SocialPost.id == post_id))
        if post is None:
            raise ValueError(f"Post {post_id} does not exist")
        if not post.approved_at or not post.approved_by:
            raise ValueError("Publishing blocked: human approval is missing")
        try:
            results = asyncio.run(_publish(post))
        except Exception as exc:  # noqa: BLE001 - provider failures must be retried by Celery
            post.status = "publish_failed"
            db.commit()
            raise self.retry(exc=exc, countdown=2**self.request.retries)
        post.status = "published"
        post.published_at = datetime.now(UTC)
        db.commit()
        return results
