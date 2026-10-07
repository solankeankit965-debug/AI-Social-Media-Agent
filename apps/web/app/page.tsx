"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { approvePost, createPost, getPosts, rejectPost } from "../lib/api";
import { canApprove, humanizeStatus } from "../lib/status";
import { Platform, platforms, SocialPost } from "../lib/types";

const initialPlatforms: Platform[] = ["linkedin", "instagram"];
type View = "all" | "approval" | "scheduled" | "published";

const platformLabels: Record<Platform, string> = {
  linkedin: "in",
  instagram: "◎",
  x: "X",
  facebook: "f",
};

function Icon({ name }: { name: "spark" | "queue" | "calendar" | "sent" }) {
  const paths = {
    spark: <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />,
    queue: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
    sent: <><path d="m4 12 5 5L20 6" /><path d="M20 12a8 8 0 1 1-5-7.4" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24">{paths[name]}</svg>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function toLocalDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export default function Dashboard() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [topic, setTopic] = useState("Launch our practical AI course");
  const [goal, setGoal] = useState("increase registrations");
  const [tone, setTone] = useState("professional");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(initialPlatforms);
  const [view, setView] = useState<View>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");

  const loadPosts = useCallback(async () => {
    try {
      setPosts(await getPosts());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load posts");
    }
  }, []);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  const waiting = useMemo(() => posts.filter((post) => canApprove(post.status)).length, [posts]);
  const published = useMemo(() => posts.filter((post) => post.status === "published").length, [posts]);
  const scheduled = useMemo(() => posts.filter((post) => ["scheduled", "queued_for_publishing"].includes(post.status)).length, [posts]);
  const visiblePosts = useMemo(() => posts.filter((post) => {
    if (view === "approval") return canApprove(post.status);
    if (view === "scheduled") return ["scheduled", "queued_for_publishing"].includes(post.status);
    if (view === "published") return post.status === "published";
    return true;
  }), [posts, view]);

  function selectView(nextView: View) {
    setView(nextView);
    requestAnimationFrame(() => document.querySelector("#queue")?.scrollIntoView({ behavior: "smooth" }));
  }

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((current) => current.includes(platform)
      ? current.filter((item) => item !== platform)
      : [...current, platform]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedPlatforms.length) {
      setError("Choose at least one platform.");
      return;
    }
    setBusyId("create");
    setError(null);
    try {
      await createPost({ topic, goal, tone, platforms: selectedPlatforms });
      setView("approval");
      await loadPosts();
      requestAnimationFrame(() => document.querySelector("#queue")?.scrollIntoView({ behavior: "smooth" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not generate the post");
    } finally {
      setBusyId(null);
    }
  }

  function openScheduler(id: string) {
    setSchedulingId(id);
    setScheduleTime(toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
  }

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const scheduledFor = scheduleTime ? new Date(scheduleTime).toISOString() : undefined;
      await approvePost(id, "Local dashboard user", scheduledFor);
      setSchedulingId(null);
      await loadPosts();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not approve the post");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const feedback = window.prompt("What should the agent change?");
    if (!feedback) return;
    setBusyId(id);
    setError(null);
    try {
      await rejectPost(id, "Local dashboard user", feedback);
      await loadPosts();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not revise the post");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Aether home">
          <span className="brandMark"><i /></span>
          <span>AETHER<small>CONTENT INTELLIGENCE</small></span>
        </a>

        <nav aria-label="Main navigation">
          <a className="navItem active" href="#create"><Icon name="spark" /><span>Create</span></a>
          <button className={view === "approval" ? "navItem selected" : "navItem"} onClick={() => selectView("approval")}><Icon name="queue" /><span>Approval queue</span><b>{waiting}</b></button>
          <button className={view === "scheduled" ? "navItem selected" : "navItem"} onClick={() => selectView("scheduled")}><Icon name="calendar" /><span>Scheduled</span><b>{scheduled}</b></button>
          <button className={view === "published" ? "navItem selected" : "navItem"} onClick={() => selectView("published")}><Icon name="sent" /><span>Published</span></button>
        </nav>

        <div className="signalPanel">
          <div className="signalOrb"><span /><i /></div>
          <p>AGENT SIGNAL</p>
          <strong>Systems aligned</strong>
          <small>Planner, writer and reviewer are ready.</small>
        </div>

        <div className="sidebarFoot">
          <div className="avatar">LU</div>
          <div><strong>Local user</strong><small>Development workspace</small></div>
          <i className="online" />
        </div>
      </aside>

      <section className="workspace" id="top">
        <header className="topbar">
          <div>
            <p className="eyebrow"><span /> CONTENT STUDIO / 01</p>
            <h1>Turn a thought into<br /><em>something magnetic.</em></h1>
          </div>
          <div className="connection"><i /> AGENT ONLINE</div>
        </header>

        <section className="metrics" aria-label="Workspace summary">
          <article><span>ALL SIGNALS</span><strong>{String(posts.length).padStart(2, "0")}</strong><small>Total drafts created</small></article>
          <article><span>AWAITING YOU</span><strong>{String(waiting).padStart(2, "0")}</strong><small>Human review required</small></article>
          <article><span>LIVE IN THE WORLD</span><strong>{String(published).padStart(2, "0")}</strong><small>Successfully published</small></article>
          <div className="metricAura" aria-hidden="true"><i /><span /></div>
        </section>

        <section className="contentGrid">
          <form className="composer card" id="create" onSubmit={submit}>
            <div className="cardHeading">
              <div><span className="step">01</span><div><p>NEW TRANSMISSION</p><h2>Shape your brief</h2></div></div>
              <span className="decorativeCross">✦</span>
            </div>

            <label>THE CENTRAL IDEA<textarea value={topic} onChange={(event) => setTopic(event.target.value)} required minLength={3} placeholder="What should the world know?" /></label>
            <div className="twoCol">
              <label>THE OUTCOME<input value={goal} onChange={(event) => setGoal(event.target.value)} required placeholder="What should this achieve?" /></label>
              <label>VOICE<select value={tone} onChange={(event) => setTone(event.target.value)}><option>professional</option><option>friendly</option><option>bold</option><option>educational</option></select></label>
            </div>

            <fieldset>
              <legend>CHOOSE YOUR CHANNELS</legend>
              <div className="platforms">{platforms.map((platform) => (
                <button className={selectedPlatforms.includes(platform) ? "platform selected" : "platform"} type="button" key={platform} onClick={() => togglePlatform(platform)} aria-pressed={selectedPlatforms.includes(platform)}>
                  <span>{platformLabels[platform]}</span>{platform}
                </button>
              ))}</div>
            </fieldset>

            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary" type="submit" disabled={busyId === "create"}>
              <span>{busyId === "create" ? "Generating your signal…" : "Generate drafts"}</span><b>↗</b>
            </button>
            <p className="safetyNote"><span>◆</span> Human approval is always required before publishing.</p>
          </form>

          <section className="queue" id="queue">
            <div className="queueHeading">
              <div><span className="step">02</span><div><p>HUMAN IN THE LOOP</p><h2>{view === "all" ? "Recent transmissions" : view === "approval" ? "Awaiting your eye" : view === "scheduled" ? "Scheduled signals" : "Published signals"}</h2></div></div>
              <div className="queueTools">
                {view !== "all" && <button type="button" onClick={() => setView("all")}>View all</button>}
                <button className="refresh" type="button" onClick={() => void loadPosts()} aria-label="Refresh posts">↻</button>
              </div>
            </div>

            {visiblePosts.length === 0 ? (
              <div className="empty card">
                <div className="emptyVisual"><i /><span>✦</span></div>
                <p>THE SPACE BETWEEN IDEAS</p>
                <h3>{view === "all" ? "Your first signal starts here." : "Nothing is waiting here."}</h3>
                <span>Create a brief and your agent will plan, write, and check a set of platform-ready drafts.</span>
                <a href="#create">Begin a transmission ↗</a>
              </div>
            ) : visiblePosts.map((post, index) => (
              <article className="post card" key={post.id}>
                <div className="postTop">
                  <span className={`status ${post.status}`}><i /> {humanizeStatus(post.status)}</span>
                  <span className="postNumber">#{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3>{post.topic}</h3>
                <div className="postMeta"><span>{post.tone}</span><span>{post.goal}</span><span>Quality {post.review.score ?? "—"}/100</span><time>{formatDate(post.created_at)}</time></div>

                <div className="drafts">{Object.entries(post.content).map(([platform, text], contentIndex) => (
                  <details key={platform} open={contentIndex === 0}>
                    <summary><span className="platformGlyph">{platformLabels[platform as Platform]}</span><b>{platform}</b><small>{text.length} characters</small><i>⌄</i></summary>
                    <p>{text}</p>
                  </details>
                ))}</div>

                {canApprove(post.status) && schedulingId !== post.id && <div className="actions"><button className="secondary" type="button" disabled={busyId === post.id} onClick={() => void reject(post.id)}>Request changes</button><button className="approve" type="button" disabled={busyId === post.id} onClick={() => openScheduler(post.id)}>Approve & schedule <span>↗</span></button></div>}

                {schedulingId === post.id && <div className="scheduler">
                  <div><label htmlFor={`schedule-${post.id}`}>PUBLISH DATE & TIME</label><small>Pick when the worker should publish this post.</small></div>
                  <input id={`schedule-${post.id}`} type="datetime-local" value={scheduleTime} min={toLocalDateTimeInput(new Date())} onChange={(event) => setScheduleTime(event.target.value)} />
                  <div className="schedulerActions"><button type="button" onClick={() => setSchedulingId(null)}>Cancel</button><button type="button" disabled={busyId === post.id} onClick={() => void approve(post.id)}>{busyId === post.id ? "Scheduling…" : "Confirm schedule ↗"}</button></div>
                </div>}
              </article>
            ))}
          </section>
        </section>
      </section>
    </main>
  );
}
