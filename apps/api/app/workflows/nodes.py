from datetime import UTC, datetime, timedelta

from app.workflows.state import SocialContentState


def planner_node(state: SocialContentState) -> dict:
    """Turn the brief into a small, inspectable content plan."""
    if state.get("plan") and state.get("human_approved"):
        return {"status": "planned"}
    return {
        "plan": {
            "objective": state["goal"],
            "audience": "people interested in " + state["topic"].lower(),
            "angle": f"Explain why {state['topic']} matters and invite a clear next action.",
            "platforms": state["platforms"],
        },
        "status": "planned",
    }


def generator_node(state: SocialContentState) -> dict:
    """Generate local demo copy; swap this body for an LLM client in production."""
    if state.get("content") and state.get("human_approved"):
        return {"status": "generated"}
    feedback = state.get("revision_feedback")
    suffix = f"\n\nRevision note addressed: {feedback}" if feedback else ""
    content: dict[str, str] = {}
    for platform in state["platforms"]:
        if platform == "x":
            content[platform] = (
                f"{state['topic']}: built for {state['goal']}. "
                f"Discover what's next. #AI #SocialMedia"
            )[:280]
        elif platform == "instagram":
            content[platform] = (
                f"✨ {state['topic']}\n\nWe're making it easier to {state['goal']}. "
                "Tell us what you think in the comments.\n\n#AI #ContentCreation" + suffix
            )
        else:
            content[platform] = (
                f"{state['topic']}\n\nOur focus is simple: {state['goal']}. "
                "We are excited to share this update and hear how it could help your team. "
                "What would you like to see next?" + suffix
            )
    return {"content": content, "status": "generated"}


def reviewer_node(state: SocialContentState) -> dict:
    """Apply deterministic starter checks before showing content to a human."""
    if state.get("review") and state.get("human_approved"):
        return {"status": "reviewed"}
    content = state.get("content", {})
    issues: list[str] = []
    if not content:
        issues.append("No content was generated.")
    if any(len(text.strip()) < 20 for text in content.values()):
        issues.append("One or more platform drafts are too short.")
    if len(content.get("x", "")) > 280:
        issues.append("The X draft is over 280 characters.")
    return {
        "review": {
            "passed": not issues,
            "score": 100 if not issues else 60,
            "issues": issues,
            "checks": ["content-present", "minimum-length", "x-character-limit"],
        },
        "status": "reviewed",
    }


def human_approval_node(state: SocialContentState) -> dict:
    if state.get("human_approved"):
        return {"status": "approved"}
    return {"status": "waiting_for_approval"}


def scheduler_node(state: SocialContentState) -> dict:
    if not state.get("human_approved"):
        raise ValueError("A post cannot be scheduled without human approval.")
    scheduled_for = state.get("scheduled_for") or datetime.now(UTC) + timedelta(seconds=5)
    return {"scheduled_for": scheduled_for, "status": "scheduled"}


def publisher_node(state: SocialContentState) -> dict:
    if not state.get("human_approved"):
        raise ValueError("A post cannot be queued for publishing without human approval.")
    return {"status": "queued_for_publishing"}
