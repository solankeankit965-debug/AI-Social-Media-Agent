from datetime import UTC, datetime

import pytest

from app.workflows.graph import social_content_graph
from app.workflows.nodes import publisher_node, scheduler_node


def test_graph_pauses_at_human_approval():
    result = social_content_graph.invoke(
        {
            "topic": "A new AI course",
            "platforms": ["linkedin", "x"],
            "tone": "professional",
            "goal": "increase registrations",
            "human_approved": False,
        }
    )

    assert result["status"] == "waiting_for_approval"
    assert result["review"]["passed"] is True
    assert set(result["content"]) == {"linkedin", "x"}


def test_approved_graph_reaches_publish_queue():
    now = datetime.now(UTC)
    result = social_content_graph.invoke(
        {
            "topic": "A new AI course",
            "platforms": ["linkedin"],
            "tone": "professional",
            "goal": "increase registrations",
            "human_approved": True,
            "scheduled_for": now,
        }
    )

    assert result["status"] == "queued_for_publishing"
    assert result["scheduled_for"] == now


@pytest.mark.parametrize("node", [scheduler_node, publisher_node])
def test_protected_nodes_reject_unapproved_content(node):
    with pytest.raises(ValueError, match="human approval"):
        node({"human_approved": False})
