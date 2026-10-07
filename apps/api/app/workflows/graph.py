from langgraph.graph import END, START, StateGraph

from app.workflows.nodes import (
    generator_node,
    human_approval_node,
    planner_node,
    publisher_node,
    reviewer_node,
    scheduler_node,
)
from app.workflows.state import SocialContentState


def approval_route(state: SocialContentState) -> str:
    return "scheduler" if state.get("human_approved") else END


builder = StateGraph(SocialContentState)
builder.add_node("planner", planner_node)
builder.add_node("generator", generator_node)
builder.add_node("reviewer", reviewer_node)
builder.add_node("human_approval", human_approval_node)
builder.add_node("scheduler", scheduler_node)
builder.add_node("publisher", publisher_node)

builder.add_edge(START, "planner")
builder.add_edge("planner", "generator")
builder.add_edge("generator", "reviewer")
builder.add_edge("reviewer", "human_approval")
builder.add_conditional_edges("human_approval", approval_route, ["scheduler", END])
builder.add_edge("scheduler", "publisher")
builder.add_edge("publisher", END)

social_content_graph = builder.compile()
