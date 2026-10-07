export const platforms = ["linkedin", "instagram", "x", "facebook"] as const;
export type Platform = (typeof platforms)[number];

export interface ApprovalEvent {
  action: string;
  actor: string;
  feedback: string | null;
  created_at: string;
}

export interface SocialPost {
  id: string;
  topic: string;
  tone: string;
  goal: string;
  platforms: Platform[];
  plan: Record<string, unknown>;
  content: Record<string, string>;
  review: { passed?: boolean; score?: number; issues?: string[] };
  status: string;
  scheduled_for: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  approval_events: ApprovalEvent[];
}

export interface CreatePostInput {
  topic: string;
  tone: string;
  goal: string;
  platforms: Platform[];
}

