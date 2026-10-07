from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models import SocialPost
from app.db.session import get_db
from app.schemas import ApprovalRequest, PostCreate, PostRead, RejectionRequest
from app.services.posts import approve_post, create_post, get_post_or_404, reject_post
from app.workers.tasks import publish_post

router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]


@router.get("/posts", response_model=list[PostRead])
def list_posts(
    db: DbSession,
    post_status: Annotated[str | None, Query(alias="status")] = None,
) -> list[SocialPost]:
    query = (
        select(SocialPost)
        .options(selectinload(SocialPost.approval_events))
        .order_by(SocialPost.created_at.desc())
    )
    if post_status:
        query = query.where(SocialPost.status == post_status)
    return list(db.scalars(query).unique())


@router.post("/posts", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post_route(payload: PostCreate, db: DbSession) -> SocialPost:
    return create_post(db, payload)


@router.get("/posts/{post_id}", response_model=PostRead)
def get_post(post_id: str, db: DbSession) -> SocialPost:
    return get_post_or_404(db, post_id)


@router.post("/posts/{post_id}/approve", response_model=PostRead)
def approve_post_route(post_id: str, payload: ApprovalRequest, db: DbSession) -> SocialPost:
    post = approve_post(db, post_id, payload)
    publish_post.apply_async(args=[post.id], eta=post.scheduled_for)
    return post


@router.post("/posts/{post_id}/reject", response_model=PostRead)
def reject_post_route(post_id: str, payload: RejectionRequest, db: DbSession) -> SocialPost:
    return reject_post(db, post_id, payload)
