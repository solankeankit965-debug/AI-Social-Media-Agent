export function humanizeStatus(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function canApprove(status: string): boolean {
  return status === "waiting_for_approval" || status === "reviewed";
}

