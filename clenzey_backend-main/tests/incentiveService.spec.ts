import { afterEach, describe, expect, it, vi } from "vitest";

import * as earningsService from "../src/api/v1/earnings/service.ts";
import * as repo from "../src/api/v1/incentive/repository.ts";
import {
  calculateIncentive,
  createConfig,
  creditFiveStarIncentive,
  getConfigById,
  listConfigs,
  resolveIncentiveConfig,
  resolveIncentivePercentage,
  updateConfig,
} from "../src/api/v1/incentive/service.ts";
import { NotFoundError } from "../src/errors/appErrors.ts";

const baseConfig = {
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  id: "config-1",
  isActive: true,
  percentage: "25",
  serviceId: "service-1",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
} as repo.IncentiveConfigRecord;

describe("calculateIncentive", () => {
  it("uses 20% fallback when no config is provided", () => {
    expect(calculateIncentive(1000, null)).toBe(200);
  });

  it("uses configured percentage when provided", () => {
    expect(calculateIncentive(1000, { percentage: 15 })).toBe(150);
  });
});

describe("resolveIncentiveConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the service-specific config when one exists", async () => {
    vi.spyOn(repo, "findActiveConfigByServiceId").mockResolvedValue(baseConfig);
    const findGlobal = vi.spyOn(repo, "findActiveGlobalConfig");

    const result = await resolveIncentiveConfig("service-1");

    expect(result).toEqual(baseConfig);
    expect(findGlobal).not.toHaveBeenCalled();
  });

  it("falls back to the global config when no service config exists", async () => {
    const globalConfig = { ...baseConfig, id: "global-1", serviceId: null };
    vi.spyOn(repo, "findActiveConfigByServiceId").mockResolvedValue(null);
    vi.spyOn(repo, "findActiveGlobalConfig").mockResolvedValue(globalConfig);

    const result = await resolveIncentiveConfig("service-1");

    expect(result).toEqual(globalConfig);
  });
});

describe("resolveIncentivePercentage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses the percentage from the resolved config", async () => {
    vi.spyOn(repo, "findActiveConfigByServiceId").mockResolvedValue(baseConfig);

    await expect(resolveIncentivePercentage("service-1")).resolves.toBe(25);
  });

  it("uses the 20% fallback when no config is found", async () => {
    vi.spyOn(repo, "findActiveConfigByServiceId").mockResolvedValue(null);
    vi.spyOn(repo, "findActiveGlobalConfig").mockResolvedValue(null);

    await expect(resolveIncentivePercentage("service-1")).resolves.toBe(20);
  });
});

describe("createConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inserts a config with normalized values", async () => {
    const insertSpy = vi.spyOn(repo, "insertConfig").mockResolvedValue(baseConfig);

    const result = await createConfig({
      effectiveFrom: "2026-02-01T00:00:00.000Z",
      percentage: 25,
      serviceId: "service-1",
    });

    expect(insertSpy).toHaveBeenCalledWith({
      effectiveFrom: new Date("2026-02-01T00:00:00.000Z"),
      isActive: true,
      percentage: "25",
      serviceId: "service-1",
    });
    expect(result).toEqual(baseConfig);
  });
});

describe("updateConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates an existing config", async () => {
    const updated = { ...baseConfig, percentage: "30" };
    vi.spyOn(repo, "findConfigById").mockResolvedValue(baseConfig);
    vi.spyOn(repo, "updateConfig").mockResolvedValue(updated);

    const result = await updateConfig("config-1", { percentage: 30 });

    expect(repo.updateConfig).toHaveBeenCalledWith("config-1", {
      percentage: "30",
    });
    expect(result).toEqual(updated);
  });

  it("patches optional fields on update", async () => {
    const updated = {
      ...baseConfig,
      effectiveFrom: new Date("2026-03-01T00:00:00.000Z"),
      isActive: false,
      serviceId: null,
    };
    vi.spyOn(repo, "findConfigById").mockResolvedValue(baseConfig);
    vi.spyOn(repo, "updateConfig").mockResolvedValue(updated);

    await updateConfig("config-1", {
      effectiveFrom: "2026-03-01T00:00:00.000Z",
      isActive: false,
      serviceId: null,
    });

    expect(repo.updateConfig).toHaveBeenCalledWith("config-1", {
      effectiveFrom: new Date("2026-03-01T00:00:00.000Z"),
      isActive: false,
      serviceId: null,
    });
  });

  it("throws NotFoundError when the config does not exist", async () => {
    vi.spyOn(repo, "findConfigById").mockResolvedValue(null);

    await expect(
      updateConfig("missing", { percentage: 30 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("listConfigs", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates to the repository with filters", async () => {
    vi.spyOn(repo, "listConfigs").mockResolvedValue([baseConfig]);

    const result = await listConfigs({ activeOnly: true, limit: 10, offset: 5 });

    expect(repo.listConfigs).toHaveBeenCalledWith({
      activeOnly: true,
      limit: 10,
      offset: 5,
    });
    expect(result).toEqual([baseConfig]);
  });
});

describe("getConfigById", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the config when it exists", async () => {
    vi.spyOn(repo, "findConfigById").mockResolvedValue(baseConfig);

    await expect(getConfigById("config-1")).resolves.toEqual(baseConfig);
  });

  it("throws NotFoundError when the config does not exist", async () => {
    vi.spyOn(repo, "findConfigById").mockResolvedValue(null);

    await expect(getConfigById("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("creditFiveStarIncentive", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a ledger entry using the resolved incentive percentage", async () => {
    vi.spyOn(repo, "findActiveConfigByServiceId").mockResolvedValue(baseConfig);
    const createLedgerEntry = vi
      .spyOn(earningsService, "createLedgerEntry")
      .mockResolvedValue({ id: "ledger-1" } as never);

    const result = await creditFiveStarIncentive({
      bookingId: "booking-1",
      partnerId: "partner-1",
      reviewId: "review-1",
      serviceId: "service-1",
      subtotal: 1000,
    });

    expect(createLedgerEntry).toHaveBeenCalledWith({
      amount: 250,
      bookingId: "booking-1",
      description: "5-star review incentive",
      earningDate: expect.any(Date),
      metadata: {
        incentivePct: 25,
        subtotal: 1000,
      },
      partnerId: "partner-1",
      reviewId: "review-1",
      type: "INCENTIVE",
    });
    expect(result).toEqual({ id: "ledger-1" });
  });
});
