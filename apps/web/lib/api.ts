import { CreatePostInput, SocialPost } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getPosts(): Promise<SocialPost[]> {
  return request<SocialPost[]>("/posts", { cache: "no-store" });
}

export function createPost(input: CreatePostInput): Promise<SocialPost> {
  return request<SocialPost>("/posts", { method: "POST", body: JSON.stringify(input) });
}

export function approvePost(id: string, approvedBy: string): Promise<SocialPost> {
  return request<SocialPost>(`/posts/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ approved_by: approvedBy }),
  });
}

export function rejectPost(
  id: string,
  rejectedBy: string,
  feedback: string,
): Promise<SocialPost> {
  return request<SocialPost>(`/posts/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ rejected_by: rejectedBy, feedback }),
  });
}

