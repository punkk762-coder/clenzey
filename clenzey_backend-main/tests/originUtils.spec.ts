import { describe, expect, it } from "vitest";

import { isAllowedCorsOrigin } from "../src/configs/corsConfig.ts";
import {
  isDevTunnelOrigin,
  normalizeOrigin,
} from "../src/utilities/originUtils.ts";

describe("normalizeOrigin", () => {
  it("strips trailing slashes from origins", () => {
    expect(normalizeOrigin("https://togate-unorderly-bell.ngrok-free.dev/")).toBe(
      "https://togate-unorderly-bell.ngrok-free.dev",
    );
  });
});

describe("isDevTunnelOrigin", () => {
  it("allows ngrok-free.dev origins in dev", () => {
    expect(
      isDevTunnelOrigin("https://togate-unorderly-bell.ngrok-free.dev"),
    ).toBe(true);
  });

  it("rejects non-tunnel origins", () => {
    expect(isDevTunnelOrigin("https://evil.example.com")).toBe(false);
  });
});

describe("isAllowedCorsOrigin", () => {
  it("allows localhost and 127.0.0.1 dev frontend origins", () => {
    expect(isAllowedCorsOrigin("http://localhost:4000")).toBe(true);
    expect(isAllowedCorsOrigin("http://localhost:4001")).toBe(true);
    expect(isAllowedCorsOrigin("http://127.0.0.1:4000")).toBe(true);
    expect(isAllowedCorsOrigin("http://127.0.0.1:4001")).toBe(true);
  });
});
