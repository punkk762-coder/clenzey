import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios");

const mockedAxios = vi.mocked(axios);

describe("geocodingAdapter production behavior", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("../src/configs/environmentConfig.ts");
    vi.resetModules();
  });

  it("throws instead of returning mock data when Google returns REQUEST_DENIED in prod", async () => {
    vi.doMock("../src/configs/environmentConfig.ts", () => ({
      envConfig: {
        GOOGLE_MAPS_API_KEY: "test-google-key",
        NODE_ENV: "prod",
      },
    }));

    mockedAxios.get.mockResolvedValue({
      data: { results: [], status: "REQUEST_DENIED" },
    });

    const { reverseGeocode } = await import(
      "../src/utilities/geocodingAdapter.ts"
    );

    await expect(reverseGeocode(12.9716, 77.5946)).rejects.toThrow(
      "Reverse geocode failed: REQUEST_DENIED",
    );
  });

  it("falls back to mock data when Google returns REQUEST_DENIED in dev", async () => {
    vi.doMock("../src/configs/environmentConfig.ts", () => ({
      envConfig: {
        GOOGLE_MAPS_API_KEY: "test-google-key",
        NODE_ENV: "dev",
      },
    }));

    mockedAxios.get.mockResolvedValue({
      data: { results: [], status: "REQUEST_DENIED" },
    });

    const { reverseGeocode } = await import(
      "../src/utilities/geocodingAdapter.ts"
    );

    const result = await reverseGeocode(12.9716, 77.5946);
    expect(result.placeId).toBe("mock_12.9716_77.5946");
    expect(result.city).toBe("Bengaluru");
  });
});
