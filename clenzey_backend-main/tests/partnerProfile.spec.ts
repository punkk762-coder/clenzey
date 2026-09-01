import { describe, expect, it } from "vitest";
import z from "zod";

const updatePartnerProfileBody = z
  .object({
    bio: z.string().max(500).nullable().optional(),
    dob: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "dob must be YYYY-MM-DD")
      .nullable()
      .optional(),
    experienceYears: z.number().int().min(0).max(50).nullable().optional(),
    fullName: z.string().min(2).max(100).optional(),
    gender: z.enum(["male", "female", "other"]).nullable().optional(),
    languages: z.array(z.string().trim().min(2).max(20)).max(10).optional(),
    profileImage: z.string().url().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required.",
  });

describe("partner profile update validation", () => {
  it("accepts a partial profile update", () => {
    const result = updatePartnerProfileBody.safeParse({
      fullName: "Amit Sharma",
      bio: "5 years of home cleaning experience.",
      languages: ["English", "Hindi"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty patch bodies", () => {
    const result = updatePartnerProfileBody.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid dob format", () => {
    const result = updatePartnerProfileBody.safeParse({ dob: "27-06-1990" });
    expect(result.success).toBe(false);
  });

  it("accepts clearing nullable profile fields", () => {
    const result = updatePartnerProfileBody.safeParse({
      bio: null,
      profileImage: null,
    });
    expect(result.success).toBe(true);
  });
});
