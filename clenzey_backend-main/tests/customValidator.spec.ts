import { describe, expect, it } from "vitest";

import { phoneNumberValidator } from "../src/validations/customValidator.ts";

describe("phoneNumberValidator", () => {
  it("accepts a valid Indian mobile number in E.164 format", () => {
    expect(phoneNumberValidator("+919876543210")).toBe(true);
  });

  it("accepts another valid Indian mobile number", () => {
    expect(phoneNumberValidator("+918123456789")).toBe(true);
  });

  it("rejects a valid mobile number from a different country", () => {
    // Valid US mobile number, but not an Indian number.
    expect(phoneNumberValidator("+14155552671")).toBe(false);
  });

  it("returns undefined for non-string input", () => {
    expect(phoneNumberValidator(9876543210)).toBeUndefined();
    expect(phoneNumberValidator(undefined)).toBeUndefined();
    expect(phoneNumberValidator(null)).toBeUndefined();
    expect(phoneNumberValidator({})).toBeUndefined();
  });

  it("rejects a UK number as it is not an Indian mobile", () => {
    expect(phoneNumberValidator("+442071838750")).toBe(false);
  });

  it("rejects invalid Indian phone numbers", () => {
    expect(phoneNumberValidator("+91987654321")).toBe(false);
  });

  it("rejects valid Indian landline numbers because only mobile is allowed", () => {
    expect(phoneNumberValidator("+912212345678")).toBe(false);
  });
});
