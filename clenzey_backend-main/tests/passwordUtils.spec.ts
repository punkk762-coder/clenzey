import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockHash, mockCompare } = vi.hoisted(() => ({
  mockCompare: vi.fn(),
  mockHash: vi.fn(),
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: mockCompare,
    hash: mockHash,
  },
}));

import {
  BCRYPT_COST_FACTOR,
  hashPassword,
  verifyPassword,
} from "../src/utilities/passwordUtils.ts";

describe("passwordUtils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses bcrypt cost factor 12", () => {
    expect(BCRYPT_COST_FACTOR).toBe(12);
  });

  it("hashes passwords with the configured cost factor", async () => {
    mockHash.mockResolvedValue("$2b$12$hashed");

    const hash = await hashPassword("secure-password-123");

    expect(mockHash).toHaveBeenCalledWith("secure-password-123", 12);
    expect(hash).toBe("$2b$12$hashed");
  });

  it("verifies passwords via bcrypt compare", async () => {
    mockCompare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    expect(await verifyPassword("secure-password-123", "$2b$12$hashed")).toBe(
      true,
    );
    expect(await verifyPassword("wrong-password", "$2b$12$hashed")).toBe(false);
    expect(mockCompare).toHaveBeenCalledWith(
      "secure-password-123",
      "$2b$12$hashed",
    );
  });
});
