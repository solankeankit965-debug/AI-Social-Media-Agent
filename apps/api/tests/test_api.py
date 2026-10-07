def create_draft(client):
    response = client.post(
        "/api/v1/posts",
        json={
            "topic": "Launch our AI course",
            "platforms": ["linkedin", "instagram"],
            "tone": "professional",
            "goal": "increase registrations",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_create_and_list_draft(client):
    draft = create_draft(client)
    assert draft["status"] == "waiting_for_approval"
    assert draft["approved_by"] is None
    assert set(draft["content"]) == {"linkedin", "instagram"}

    response = client.get("/api/v1/posts")
    assert response.status_code == 200
    assert [post["id"] for post in response.json()] == [draft["id"]]


def test_approve_records_human_and_enqueues(client, monkeypatch):
    draft = create_draft(client)
    queued = []
    monkeypatch.setattr(
        "app.api.routes.publish_post.apply_async",
        lambda *args, **kwargs: queued.append((args, kwargs)),
    )

    response = client.post(
        f"/api/v1/posts/{draft['id']}/approve",
        json={"approved_by": "Test reviewer"},
    )

    assert response.status_code == 200
    approved = response.json()
    assert approved["status"] == "queued_for_publishing"
    assert approved["approved_by"] == "Test reviewer"
    assert approved["approved_at"] is not None
    assert approved["content"] == draft["content"]
    assert approved["approval_events"][0]["action"] == "approved"
    assert len(queued) == 1


def test_rejection_regenerates_and_records_feedback(client):
    draft = create_draft(client)
    response = client.post(
        f"/api/v1/posts/{draft['id']}/reject",
        json={"rejected_by": "Test reviewer", "feedback": "Add a clearer call to action"},
    )

    assert response.status_code == 200
    revised = response.json()
    assert revised["status"] == "waiting_for_approval"
    assert "Revision note addressed" in revised["content"]["linkedin"]
    assert revised["approval_events"][0]["feedback"] == "Add a clearer call to action"


def test_cannot_approve_twice(client, monkeypatch):
    draft = create_draft(client)
    monkeypatch.setattr("app.api.routes.publish_post.apply_async", lambda *args, **kwargs: None)
    path = f"/api/v1/posts/{draft['id']}/approve"
    assert client.post(path, json={"approved_by": "Reviewer"}).status_code == 200
    response = client.post(path, json={"approved_by": "Reviewer"})
    assert response.status_code == 409
