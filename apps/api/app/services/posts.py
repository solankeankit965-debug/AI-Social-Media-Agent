from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models import ApprovalEvent, SocialPost
from app.schemas import ApprovalRequest, PostCreate, RejectionRequest
from app.workflows.graph import social_content_graph


def get_post_or_404(db: Session, post_id: str) -> SocialPost:
    post = db.scalar(
        select(SocialPost)
        .where(SocialPost.id == post_id)
        .options(selectinload(SocialPost.approval_events))
    )
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


def create_post(db: Session, payload: PostCreate) -> SocialPost:
    result = social_content_graph.invoke(
        {
            **payload.model_dump(),
            "platforms": [str(platform) for platform in payload.platforms],
            "human_approved": False,
        }
    )
    post = SocialPost(
        topic=payload.topic,
        tone=payload.tone,
        goal=payload.goal,
        platforms=result["platforms"],
        plan=result.get("plan", {}),
        content=result.get("content", {}),
        review=result.get("review", {}),
        status=result["status"],
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return get_post_or_404(db, post.id)


def approve_post(db: Session, post_id: str, payload: ApprovalRequest) -> SocialPost:
    post = get_post_or_404(db, post_id)
    if post.status not in {"waiting_for_approval", "reviewed"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Post in status '{post.status}' cannot be approved",
        )

    result = social_content_graph.invoke(
        {
            "topic": post.topic,
            "platforms": post.platforms,
            "tone": post.tone,
            "goal": post.goal,
            "plan": post.plan,
            "content": post.content,
            "review": post.review,
            "human_approved": True,
            "scheduled_for": payload.scheduled_for,
        }
    )
    now = datetime.now(UTC)
    post.plan = result.get("plan", post.plan)
    post.content = result.get("content", post.content)
    post.review = result.get("review", post.review)
    post.status = result["status"]
    post.scheduled_for = result.get("scheduled_for")
    post.approved_by = payload.approved_by
    post.approved_at = now
    post.approval_events.append(ApprovalEvent(action="approved", actor=payload.approved_by))
    db.commit()
    return get_post_or_404(db, post.id)


def reject_post(db: Session, post_id: str, payload: RejectionRequest) -> SocialPost:
    post = get_post_or_404(db, post_id)
    if post.status not in {"waiting_for_approval", "reviewed"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Post in status '{post.status}' cannot be rejected",
        )
    result = social_content_graph.invoke(
        {
            "topic": post.topic,
            "platforms": post.platforms,
            "tone": post.tone,
            "goal": post.goal,
            "revision_feedback": payload.feedback,
            "human_approved": False,
        }
    )
    post.plan = result.get("plan", {})
    post.content = result.get("content", {})
    post.review = result.get("review", {})
    post.status = result["status"]
    post.approval_events.append(
        ApprovalEvent(
            action="rejected_and_revised",
            actor=payload.rejected_by,
            feedback=payload.feedback,
        )
    )
    db.commit()
    return get_post_or_404(db, post.id)
