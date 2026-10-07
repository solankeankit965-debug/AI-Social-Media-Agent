from datetime import datetime
from typing import NotRequired, TypedDict


class SocialContentState(TypedDict):
    topic: str
    platforms: list[str]
    tone: str
    goal: str
    human_approved: bool
    plan: NotRequired[dict]
    content: NotRequired[dict[str, str]]
    review: NotRequired[dict]
    revision_feedback: NotRequired[str]
    scheduled_for: NotRequired[datetime | None]
    status: NotRequired[str]
