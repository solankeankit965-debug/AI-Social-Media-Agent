from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Platform = Literal["linkedin", "instagram", "x", "facebook"]


class PostCreate(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    platforms: list[Platform] = Field(min_length=1)
    tone: str = Field(default="professional", max_length=100)
    goal: str = Field(default="engagement", max_length=500)

    @field_validator("platforms")
    @classmethod
    def unique_platforms(cls, value: list[Platform]) -> list[Platform]:
        return list(dict.fromkeys(value))


class ApprovalRequest(BaseModel):
    approved_by: str = Field(min_length=2, max_length=255)
    scheduled_for: datetime | None = None


class RejectionRequest(BaseModel):
    rejected_by: str = Field(min_length=2, max_length=255)
    feedback: str = Field(min_length=3, max_length=2000)


class ApprovalEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    action: str
    actor: str
    feedback: str | None
    created_at: datetime


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    topic: str
    tone: str
    goal: str
    platforms: list[str]
    plan: dict
    content: dict
    review: dict
    status: str
    scheduled_for: datetime | None
    approved_by: str | None
    approved_at: datetime | None
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    approval_events: list[ApprovalEventRead] = Field(default_factory=list)
