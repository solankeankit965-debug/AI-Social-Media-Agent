import { describe, expect, it } from "vitest";

import { canApprove, humanizeStatus } from "../lib/status";

describe("post status helpers", () => {
  it("formats API status values for people", () => {
    expect(humanizeStatus("waiting_for_approval")).toBe("Waiting For Approval");
  });

  it("only enables approval for reviewable states", () => {
    expect(canApprove("waiting_for_approval")).toBe(true);
    expect(canApprove("published")).toBe(false);
  });
});

