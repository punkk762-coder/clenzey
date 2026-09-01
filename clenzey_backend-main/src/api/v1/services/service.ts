import { randomUUID } from "node:crypto";

import { BadRequestError, NotFoundError } from "../../../errors/appErrors.ts";
import { domainEvents } from "../../../realtime/domainEvents.ts";
import {
  computeLargeOfficeBasePrice,
  type LargeOfficeScope,
} from "./largeOfficePricing.ts";
import type {
  EnrichedQuotation,
  QuotationRecord,
  ServiceAddonJson,
  ServiceInclusionJson,
  ServiceSubVariantJson,
  ServiceVariantJson,
} from "./repository.ts";
import * as repo from "./repository.ts";

// ─── Read ─────────────────────────────────────────────────────────

export const listServices = async () => {
  return await repo.listActiveServices();
};

export const getServiceDetail = async (serviceId: string) => {
  const service = await repo.findServiceById(serviceId);
  if (!service) throw new NotFoundError("Service not found.");

  // Sort variants/addons/inclusions by sortOrder for a stable client view.
  const variants = [...service.variants].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const addons = [...service.addons].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const inclusions = [...service.inclusions].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const exclusions = [...(service.exclusions ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return { ...service, addons, exclusions, inclusions, variants };
};

// ─── Estimate ─────────────────────────────────────────────────────

type EstimateBreakdownItem = { amount: number; label: string };

export const calculateEstimate = async (
  serviceId: string,
  variantId: string,
  addonIds: string[] = [],
) => {
  const service = await repo.findServiceById(serviceId);
  if (!service) throw new NotFoundError("Service not found.");

  const variant = service.variants.find((v) => v.id === variantId);
  if (!variant) {
    throw new BadRequestError("Invalid variant for this service.");
  }

  const addons = service.addons.filter((a) => addonIds.includes(a.id));
  if (addons.length !== addonIds.length) {
    throw new BadRequestError("One or more add-ons are invalid for this service.");
  }

  const basePrice = parseFloat(variant.basePrice);
  const addonsTotal = addons.reduce((sum, a) => sum + parseFloat(a.price), 0);
  const total = basePrice + addonsTotal;

  const breakdown: EstimateBreakdownItem[] = [
    { amount: basePrice, label: variant.label },
  ];
  for (const addon of addons) {
    breakdown.push({ amount: parseFloat(addon.price), label: addon.name });
  }

  return { addonsTotal, basePrice, breakdown, total };
};

export const calculateLargeOfficeEstimate = async (
  serviceId: string,
  variantId: string,
  scope: LargeOfficeScope,
) => {
  const service = await repo.findServiceById(serviceId);
  if (!service) throw new NotFoundError("Service not found.");

  const variant = service.variants.find((item) => item.id === variantId);
  if (
    service.category !== "CORPORATE" ||
    !variant ||
    variant.value !== "emp_100_plus" ||
    variant.pricingModel !== "INSPECTION"
  ) {
    throw new BadRequestError(
      "Large-office estimates are only available for the 100+ employees option.",
    );
  }

  const mappedTier = service.variants.find(
    (item) => item.value === "emp_51_100",
  );
  if (!mappedTier) {
    throw new BadRequestError(
      "The reference employee-size tier is not configured for this service.",
    );
  }

  return computeLargeOfficeBasePrice(
    scope,
    parseFloat(mappedTier.discountedPrice ?? mappedTier.basePrice),
    mappedTier.label,
  );
};

// ─── Variant / addon / inclusion lookups (used by bookings flow) ──

export const findVariantInService = async (
  serviceId: string,
  variantId: string,
): Promise<null | ServiceVariantJson> => {
  const service = await repo.findServiceById(serviceId);
  return service?.variants.find((v) => v.id === variantId) ?? null;
};

export const findAddonsInService = async (
  serviceId: string,
  addonIds: string[],
): Promise<ServiceAddonJson[]> => {
  if (addonIds.length === 0) return [];
  const service = await repo.findServiceById(serviceId);
  if (!service) return [];
  return service.addons.filter((a) => addonIds.includes(a.id));
};

// ─── Quotation ────────────────────────────────────────────────────

type QuotationInput = {
  address: string;
  consumerId?: string;
  name: string;
  notes?: string;
  phone: string;
  preferredTime?: string;
  serviceId?: string;
  variantId?: string;
};

export const submitQuotationRequest = async (input: QuotationInput) => {
  const { preferredTime, ...rest } = input;
  const quotation = await repo.createQuotationRequest({
    ...rest,
    preferredTime: preferredTime ? new Date(preferredTime) : null,
  });
  domainEvents.emitQuotationCreated({
    quotation: quotation as unknown as Record<string, unknown>,
    consumerId: quotation.consumerId ?? null,
    timestamp: new Date().toISOString(),
  });
  return quotation;
};

export const listQuotations = async (filter: {
  status?: QuotationRecord["status"];
  consumerId?: string;
  limit?: number;
  offset?: number;
}): Promise<EnrichedQuotation[]> => {
  return await repo.listQuotationRequests(filter);
};

export const patchQuotationStatus = async (
  id: string,
  status: QuotationRecord["status"],
  quotedAmount?: number,
) => {
  const quotation = await repo.updateQuotationStatus(id, status, quotedAmount);
  if (quotation) {
    domainEvents.emitQuotationUpdated({
      quotation: quotation as unknown as Record<string, unknown>,
      consumerId: quotation.consumerId ?? null,
      timestamp: new Date().toISOString(),
    });
  }
  return quotation;
};

export const deleteQuotation = async (id: string, consumerId: string) => {
  const quotation = await repo.deleteQuotationAsConsumer(id, consumerId);
  if (quotation) {
    domainEvents.emitQuotationUpdated({
      quotation: quotation as unknown as Record<string, unknown>,
      consumerId: quotation.consumerId ?? null,
      timestamp: new Date().toISOString(),
    });
  }
  return quotation;
};

export const acceptQuotation = async (id: string, consumerId: string) => {
  const quotation = await repo.acceptQuotationAsConsumer(id, consumerId);
  if (quotation) {
    domainEvents.emitQuotationUpdated({
      quotation: quotation as unknown as Record<string, unknown>,
      consumerId: quotation.consumerId ?? null,
      timestamp: new Date().toISOString(),
    });
  }
  return quotation;
};

// ─── Service create / update / delete ─────────────────────────────

type SubVariantInput = {
  id?: string;
  label: string;
  description?: string | null;
  basePrice: number | string;
  discountedPrice: number | string;
  discountPercentage?: number;
  pricingModel?: "FIXED" | "INSPECTION";
  sortOrder?: number;
};

type VariantInput = {
  id?: string;
  label: string;
  value: string;
  basePrice: number | string;
  discountedPrice?: number | string;
  discountPercentage?: number;
  pricingModel?: "FIXED" | "INSPECTION";
  sortOrder?: number;
  inclusions?: InclusionInput[];
  subVariants?: SubVariantInput[];
};

type AddonInput = {
  id?: string;
  name: string;
  description?: string | null;
  price: number | string;
  discountedPrice?: number | string;
  discountPercentage?: number;
  sortOrder?: number;
};

type InclusionInput = {
  id?: string;
  title: string;
  description?: string | null;
  sortOrder?: number;
};

type CreateServiceInput = {
  description?: string;
  imageUrl?: string | null;
  name: string;
  serviceType?: string;
  sortOrder?: number;
  tagline?: string;
  variants?: VariantInput[];
  addons?: AddonInput[];
  inclusions?: InclusionInput[];
  exclusions?: InclusionInput[];
};

const computeDiscountPct = (base: number, discounted: number): number => {
  if (base <= 0 || discounted >= base) return 0;
  return Math.round(((base - discounted) / base) * 100);
};

const normalizeSubVariants = (input: SubVariantInput[]): ServiceSubVariantJson[] =>
  input.map((sv, i) => {
    const base = Number(sv.basePrice);
    const discounted = Number(sv.discountedPrice);
    return {
      id: sv.id ?? randomUUID(),
      label: sv.label,
      ...(sv.description !== undefined && { description: sv.description }),
      basePrice: String(base),
      discountedPrice: String(discounted),
      discountPercentage: sv.discountPercentage ?? computeDiscountPct(base, discounted),
      ...(sv.pricingModel !== undefined && { pricingModel: sv.pricingModel }),
      sortOrder: sv.sortOrder ?? i,
    };
  });

const normalizeVariants = (input: VariantInput[]): ServiceVariantJson[] =>
  input.map((v, i) => {
    const base = Number(v.basePrice);
    const discounted = v.discountedPrice !== undefined ? Number(v.discountedPrice) : base;
    return {
      id: v.id ?? randomUUID(),
      label: v.label,
      value: v.value,
      basePrice: String(base),
      discountedPrice: String(discounted),
      discountPercentage: v.discountPercentage ?? computeDiscountPct(base, discounted),
      ...(v.pricingModel !== undefined && { pricingModel: v.pricingModel }),
      sortOrder: v.sortOrder ?? i,
      ...(v.inclusions !== undefined && { inclusions: normalizeInclusions(v.inclusions) }),
      ...(v.subVariants !== undefined && { subVariants: normalizeSubVariants(v.subVariants) }),
    };
  });

const normalizeAddons = (input: AddonInput[]): ServiceAddonJson[] =>
  input.map((a, i) => {
    const base = Number(a.price);
    const discounted = a.discountedPrice !== undefined ? Number(a.discountedPrice) : base;
    return {
      id: a.id ?? randomUUID(),
      name: a.name,
      description: a.description ?? null,
      price: String(base),
      discountedPrice: String(discounted),
      discountPercentage: a.discountPercentage ?? computeDiscountPct(base, discounted),
      sortOrder: a.sortOrder ?? i,
    };
  });

const normalizeInclusions = (input: InclusionInput[]): ServiceInclusionJson[] =>
  input.map((inc, i) => ({
    id: inc.id ?? randomUUID(),
    title: inc.title,
    description: inc.description ?? null,
    sortOrder: inc.sortOrder ?? i,
  }));

export const createService = async (input: CreateServiceInput) => {
  const created = await repo.insertService({
    addons: normalizeAddons(input.addons ?? []),
    description: input.description,
    imageUrl: input.imageUrl ?? null,
    inclusions: normalizeInclusions(input.inclusions ?? []),
    exclusions: normalizeInclusions(input.exclusions ?? []),
    name: input.name,
    serviceType: input.serviceType ?? "B2C",
    sortOrder: input.sortOrder ?? 0,
    tagline: input.tagline,
    variants: normalizeVariants(input.variants ?? []),
  });
  domainEvents.emitServiceCreated({
    service: created as unknown as Record<string, unknown>,
    timestamp: new Date().toISOString(),
  });
  return created;
};

type UpdateServiceInput = Partial<CreateServiceInput> & { isActive?: boolean };

export const updateService = async (
  serviceId: string,
  input: UpdateServiceInput,
) => {
  const existing = await repo.findServiceById(serviceId);
  if (!existing) throw new NotFoundError("Service not found.");

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.tagline !== undefined) patch.tagline = input.tagline;
  if (input.description !== undefined) patch.description = input.description;
  if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) patch.isActive = input.isActive;
  if (input.serviceType !== undefined) patch.serviceType = input.serviceType;
  if (input.variants !== undefined)
    patch.variants = normalizeVariants(input.variants);
  if (input.addons !== undefined)
    patch.addons = normalizeAddons(input.addons);
  if (input.inclusions !== undefined)
    patch.inclusions = normalizeInclusions(input.inclusions);
  if (input.exclusions !== undefined)
    patch.exclusions = normalizeInclusions(input.exclusions);

  const updated = await repo.updateService(serviceId, patch);
  if (!updated) throw new NotFoundError("Service not found.");
  domainEvents.emitServiceUpdated({
    service: updated as unknown as Record<string, unknown>,
    timestamp: new Date().toISOString(),
  });
  return updated;
};

export const deleteService = async (serviceId: string) => {
  const existing = await repo.findServiceById(serviceId);
  if (!existing) throw new NotFoundError("Service not found.");
  await repo.softDeleteService(serviceId);
  domainEvents.emitServiceDeleted({
    serviceId,
    timestamp: new Date().toISOString(),
  });
};
