import { describe, expect, it } from "vitest";

import { parseStoredUploadKey } from "../src/services/s3PresignService.ts";

describe("dispute evidence file URL validation", () => {
  const userId = "c1000001-0001-4001-8001-000000000001";
  const bookingId = "b1000001-0001-4001-8001-000000000005";
  const fileUrl = `https://clenzey-dev-uploads.s3.ap-south-1.amazonaws.com/dispute-evidence/${userId}/${bookingId}/photo.jpg`;

  it("parses dispute evidence object key from stored URL", () => {
    const key = parseStoredUploadKey(fileUrl);
    expect(key).toBe(`dispute-evidence/${userId}/${bookingId}/photo.jpg`);
    expect(key?.startsWith(`dispute-evidence/${userId}/${bookingId}/`)).toBe(
      true,
    );
  });
});
