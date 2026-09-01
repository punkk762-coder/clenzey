import { afterEach, describe, expect, it, vi } from "vitest";

import * as repo from "../src/api/v1/partnerZones/repository.ts";
import * as dispatchBootstrap from "../src/api/v1/partners/dispatchBootstrap.ts";
import {
  assignZones,
  getPartnerZones,
  removeZone,
  setPrimaryZone,
  updatePartnerBaseLocation,
} from "../src/api/v1/partnerZones/service.ts";

const PARTNER = "partner-1";
const ZONE_A = "zone-a";
const ZONE_B = "zone-b";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("assignZones", () => {
  it("assigns zones when the partner and all zones exist", async () => {
    vi.spyOn(repo, "partnerExists").mockResolvedValue(true);
    vi.spyOn(repo, "zoneExists").mockResolvedValue(true);
    const assignSpy = vi
      .spyOn(repo, "assignZones")
      .mockResolvedValue([] as never);

    await assignZones(PARTNER, [ZONE_A, ZONE_B], ZONE_A);

    expect(assignSpy).toHaveBeenCalledWith(PARTNER, [ZONE_A, ZONE_B], ZONE_A);
  });

  it("throws NotFoundError when the partner does not exist", async () => {
    vi.spyOn(repo, "partnerExists").mockResolvedValue(false);
    const assignSpy = vi.spyOn(repo, "assignZones");

    await expect(assignZones(PARTNER, [ZONE_A])).rejects.toThrow(
      "Partner not found.",
    );
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when a zone does not exist", async () => {
    vi.spyOn(repo, "partnerExists").mockResolvedValue(true);
    vi.spyOn(repo, "zoneExists").mockImplementation(async (zoneId) =>
      zoneId === ZONE_A,
    );
    const assignSpy = vi.spyOn(repo, "assignZones");

    await expect(assignZones(PARTNER, [ZONE_A, ZONE_B])).rejects.toThrow(
      `Zone ${ZONE_B} not found.`,
    );
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("throws BadRequestError when the primary zone is not in the zone list", async () => {
    vi.spyOn(repo, "partnerExists").mockResolvedValue(true);
    vi.spyOn(repo, "zoneExists").mockResolvedValue(true);
    const assignSpy = vi.spyOn(repo, "assignZones");

    await expect(
      assignZones(PARTNER, [ZONE_A], ZONE_B),
    ).rejects.toThrow("primaryZoneId must be included in zoneIds.");
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("returns the repository result", async () => {
    const record = [{ isPrimary: true, partnerId: PARTNER, zoneId: ZONE_A }];
    vi.spyOn(repo, "partnerExists").mockResolvedValue(true);
    vi.spyOn(repo, "zoneExists").mockResolvedValue(true);
    vi.spyOn(repo, "assignZones").mockResolvedValue(record as never);

    const result = await assignZones(PARTNER, [ZONE_A], ZONE_A);
    expect(result).toBe(record);
  });
});

describe("removeZone", () => {
  it("removes the zone when the partner exists", async () => {
    vi.spyOn(repo, "partnerExists").mockResolvedValue(true);
    const removeSpy = vi.spyOn(repo, "removeZone").mockResolvedValue(undefined);

    await removeZone(PARTNER, ZONE_A);

    expect(removeSpy).toHaveBeenCalledWith(PARTNER, ZONE_A);
  });

  it("throws NotFoundError when the partner does not exist", async () => {
    vi.spyOn(repo, "partnerExists").mockResolvedValue(false);
    const removeSpy = vi.spyOn(repo, "removeZone");

    await expect(removeZone(PARTNER, ZONE_A)).rejects.toThrow(
      "Partner not found.",
    );
    expect(removeSpy).not.toHaveBeenCalled();
  });
});

describe("setPrimaryZone", () => {
  it("sets the primary zone when the partner exists", async () => {
    vi.spyOn(repo, "partnerExists").mockResolvedValue(true);
    const setSpy = vi
      .spyOn(repo, "setPrimaryZone")
      .mockResolvedValue(undefined);

    await setPrimaryZone(PARTNER, ZONE_A);

    expect(setSpy).toHaveBeenCalledWith(PARTNER, ZONE_A);
  });

  it("throws NotFoundError when the partner does not exist", async () => {
    vi.spyOn(repo, "partnerExists").mockResolvedValue(false);
    const setSpy = vi.spyOn(repo, "setPrimaryZone");

    await expect(setPrimaryZone(PARTNER, ZONE_A)).rejects.toThrow(
      "Partner not found.",
    );
    expect(setSpy).not.toHaveBeenCalled();
  });
});

describe("getPartnerZones", () => {
  it("returns zones when the partner exists", async () => {
    const zones = [{ isPrimary: true, partnerId: PARTNER, zoneId: ZONE_A }];
    vi.spyOn(repo, "partnerExists").mockResolvedValue(true);
    vi.spyOn(repo, "getPartnerZones").mockResolvedValue(zones as never);

    const result = await getPartnerZones(PARTNER);
    expect(result).toBe(zones);
  });

  it("throws NotFoundError when the partner does not exist", async () => {
    vi.spyOn(repo, "partnerExists").mockResolvedValue(false);

    await expect(getPartnerZones(PARTNER)).rejects.toThrow("Partner not found.");
  });
});

describe("updatePartnerBaseLocation", () => {
  it("updates the base location when the partner exists", async () => {
    vi.spyOn(repo, "partnerExists").mockResolvedValue(true);
    const updateSpy = vi
      .spyOn(repo, "updatePartnerBaseLocation")
      .mockResolvedValue(undefined);
    const bootstrapSpy = vi
      .spyOn(dispatchBootstrap, "ensurePartnerDispatchReady")
      .mockResolvedValue(undefined);

    await updatePartnerBaseLocation(PARTNER, 12.97, 77.59);

    expect(updateSpy).toHaveBeenCalledWith(PARTNER, 77.59, 12.97);
    expect(bootstrapSpy).toHaveBeenCalledWith(PARTNER, {
      latitude: 12.97,
      longitude: 77.59,
      markOnline: true,
    });
  });

  it("throws NotFoundError when the partner does not exist", async () => {
    vi.spyOn(repo, "partnerExists").mockResolvedValue(false);
    const updateSpy = vi.spyOn(repo, "updatePartnerBaseLocation");

    await expect(
      updatePartnerBaseLocation(PARTNER, 12.97, 77.59),
    ).rejects.toThrow("Partner not found.");
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
