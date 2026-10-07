"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { approvePost, createPost, getPosts, rejectPost } from "../lib/api";
import { canApprove, humanizeStatus } from "../lib/status";
import { Platform, platforms, SocialPost } from "../lib/types";

const initialPlatforms: Platform[] = ["linkedin", "instagram"];

export default function Dashboard() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [topic, setTopic] = useState("Launch our practical AI course");
  const [goal, setGoal] = useState("increase registrations");
  const [tone, setTone] = useState("professional");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(initialPlatforms);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      setPosts(await getPosts());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load posts");
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const waiting = useMemo(() => posts.filter((post) => canApprove(post.status)).length, [posts]);
  const published = useMemo(() => posts.filter((post) => post.status === "published").length, [posts]);

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedPlatforms.length) {
      setError("Choose at least one platform.");
      return;
    }
    setBusy(true);
    try {
      await createPost({ topic, goal, tone, platforms: selectedPlatforms });
      await loadPosts();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not generate the post");
    } finally {
      setBusy(false);
    }
  }

  async function approve(id: string) {
    setBusy(true);
    try {
      await approvePost(id, "Local dashboard user");
      await loadPosts();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not approve the post");
    } finally {
      setBusy(false);
    }
  }

  async function reject(id: string) {
    const feedback = window.prompt("What should the agent change?");
    if (!feedback) return;
    setBusy(true);
    try {
      await rejectPost(id, "Local dashboard user", feedback);
      await loadPosts();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not revise the post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandMark">O</span><span>Orbit</span></div>
        <nav aria-label="Main navigation">
          <a className="navItem active" href="#create"><span>✦</span> Create</a>
          <a className="navItem" href="#queue"><span>◫</span> Approval queue <b>{waiting}</b></a>
          <a className="navItem" href="#queue"><span>◷</span> Calendar</a>
          <a className="navItem" href="#queue"><span>✓</span> Published</a>
        </nav>
        <div className="sidebarFoot">
          <div className="avatar">LU</div>
          <div><strong>Local user</strong><small>Development workspace</small></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">CONTENT STUDIO</p><h1>Make something worth sharing.</h1></div>
          <div className="connection"><i /> Local agent online</div>
        </header>

        <section className="metrics" aria-label="Workspace summary">
          <article><span>Drafts</span><strong>{posts.length}</strong><small>All content</small></article>
          <article><span>Needs approval</span><strong>{waiting}</strong><small>Human review required</small></article>
          <article><span>Published</span><strong>{published}</strong><small>Sent by worker</small></article>
        </section>

        <section className="contentGrid">
          <form className="composer card" id="create" onSubmit={submit}>
            <div className="cardHeading"><div><span className="step">01</span><h2>Content brief</h2></div><p>Give your agent direction. It will plan, write, and check each draft.</p></div>
            <label>What are we talking about?<textarea value={topic} onChange={(event) => setTopic(event.target.value)} required minLength={3} /></label>
            <div className="twoCol">
              <label>Goal<input value={goal} onChange={(event) => setGoal(event.target.value)} required /></label>
              <label>Tone<select value={tone} onChange={(event) => setTone(event.target.value)}><option>professional</option><option>friendly</option><option>bold</option><option>educational</option></select></label>
            </div>
            <fieldset><legend>Publish for</legend><div className="platforms">{platforms.map((platform) => (
              <button className={selectedPlatforms.includes(platform) ? "platform selected" : "platform"} type="button" key={platform} onClick={() => togglePlatform(platform)} aria-pressed={selectedPlatforms.includes(platform)}>
                <span>{platform === "linkedin" ? "in" : platform === "instagram" ? "◎" : platform === "facebook" ? "f" : "𝕏"}</span>{platform}
              </button>
            ))}</div></fieldset>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary" type="submit" disabled={busy}>{busy ? "Working…" : "Generate drafts"}<span>→</span></button>
          </form>

          <section className="queue" id="queue">
            <div className="queueHeading"><div><span className="step">02</span><h2>Approval queue</h2></div><button type="button" onClick={() => void loadPosts()} aria-label="Refresh posts">↻</button></div>
            {posts.length === 0 ? (
              <div className="empty card"><span>✦</span><h3>Your ideas will land here</h3><p>Create a brief and the agent will prepare platform-ready drafts for your approval.</p></div>
            ) : posts.map((post) => (
              <article className="post card" key={post.id}>
                <div className="postTop"><span className={`status ${post.status}`}>{humanizeStatus(post.status)}</span><time>{new Date(post.created_at).toLocaleDateString()}</time></div>
                <h3>{post.topic}</h3>
                <div className="postMeta"><span>{post.tone}</span><span>{post.goal}</span><span>Review {post.review.score ?? "—"}/100</span></div>
                {Object.entries(post.content).map(([platform, text]) => (
                  <details key={platform} open={Object.keys(post.content)[0] === platform}>
                    <summary>{platform}</summary><p>{text}</p>
                  </details>
                ))}
                {canApprove(post.status) && <div className="actions"><button className="secondary" type="button" disabled={busy} onClick={() => void reject(post.id)}>Request changes</button><button className="approve" type="button" disabled={busy} onClick={() => void approve(post.id)}>Approve & schedule</button></div>}
              </article>
            ))}
          </section>
        </section>
      </section>
    </main>
  );
}

