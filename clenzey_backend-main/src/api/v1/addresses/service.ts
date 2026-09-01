import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../errors/appErrors.ts";
import { domainEvents } from "../../../realtime/domainEvents.ts";
import * as zonesRepo from "../zones/repository.ts";
import * as repo from "./repository.ts";

const emitAddressUpdated = (consumerId: string, address: unknown) => {
  domainEvents.emitAddressUpdated({
    address: address as Record<string, unknown>,
    consumerId,
    timestamp: new Date().toISOString(),
  });
};

const MAX_ADDRESSES_PER_CONSUMER = 25;

export type AddressType = "HOME" | "OTHER" | "WORK";

type AddressBody = {
  accessNotes?: string;
  addressType?: AddressType;
  city: string;
  country?: string;
  label: string;
  landmark?: string;
  latitude?: number;
  line1: string;
  line2?: string;
  longitude?: number;
  pincode: string;
  placeId?: string;
  recipientName?: string;
  recipientPhone?: string;
  setAsDefault?: boolean;
  state: string;
};

/**
 * Looks up the active zone containing this address (if any) and returns
 * { zoneId, isServiceable } based on the configured zones.
 */
const resolveZoneForCoords = async (
  latitude: number | undefined,
  longitude: number | undefined,
): Promise<{ isServiceable: boolean; zoneId: null | string }> => {
  if (latitude == null || longitude == null) {
    return { isServiceable: false, zoneId: null };
  }
  const matches = await zonesRepo.findZonesContainingPoint(latitude, longitude);
  if (!matches.length) return { isServiceable: false, zoneId: null };
  const top = matches[0]!;
  return { isServiceable: true, zoneId: top.id };
};

export const createAddress = async (
  consumerId: string,
  input: AddressBody,
) => {
  const profileExists = await repo.consumerExists(consumerId);
  if (!profileExists) {
    throw new UnauthorizedError(
      "Your session is no longer valid. Please sign in again.",
    );
  }

  const existingLabel = await repo.findAddressByLabel(consumerId, input.label);
  if (existingLabel) {
    throw new BadRequestError(
      "An address with this label already exists. Use a different label or edit the existing one.",
    );
  }

  const count = await repo.countAddressesForConsumer(consumerId);
  if (count >= MAX_ADDRESSES_PER_CONSUMER) {
    throw new BadRequestError(
      `You can save up to ${MAX_ADDRESSES_PER_CONSUMER} addresses. Please delete an existing one.`,
    );
  }

  const duplicate = await repo.findDuplicateAddress(consumerId, {
    ...(input.latitude !== undefined && { latitude: input.latitude }),
    ...(input.longitude !== undefined && { longitude: input.longitude }),
    ...(input.placeId !== undefined && { placeId: input.placeId }),
  });
  if (duplicate) {
    throw new BadRequestError(
      "An address at this location is already saved. Edit it instead.",
    );
  }

  const { isServiceable, zoneId } = await resolveZoneForCoords(
    input.latitude,
    input.longitude,
  );

  const shouldBeDefault = input.setAsDefault === true || count === 0;

  const created = await repo.insertAddress({
    accessNotes: input.accessNotes ?? null,
    addressType: input.addressType ?? "HOME",
    city: input.city,
    consumerId,
    country: input.country ?? "India",
    isDefault: shouldBeDefault,
    isServiceable,
    label: input.label,
    landmark: input.landmark ?? null,
    ...(input.latitude !== undefined && { latitude: input.latitude }),
    line1: input.line1,
    line2: input.line2 ?? null,
    ...(input.longitude !== undefined && { longitude: input.longitude }),
    pincode: input.pincode,
    placeId: input.placeId ?? null,
    recipientName: input.recipientName ?? null,
    recipientPhone: input.recipientPhone ?? null,
    state: input.state,
    zoneId,
  });

  const final = shouldBeDefault
    ? await repo.setDefaultAddress(consumerId, created.id)
    : created;

  domainEvents.emitAddressCreated({
    address: final as unknown as Record<string, unknown>,
    consumerId,
    timestamp: new Date().toISOString(),
  });
  return final;
};

export const updateAddress = async (
  consumerId: string,
  addressId: string,
  patch: Partial<AddressBody>,
) => {
  const existing = await repo.findAddressById(addressId);
  if (!existing || existing.consumerId !== consumerId) {
    throw new NotFoundError("Address not found.");
  }

  if (patch.label !== undefined && patch.label !== existing.label) {
    const labelTaken = await repo.findAddressByLabel(consumerId, patch.label);
    if (labelTaken && labelTaken.id !== addressId) {
      throw new BadRequestError(
        "An address with this label already exists. Use a different label.",
      );
    }
  }

  let serviceabilityPatch: Partial<{
    isServiceable: boolean;
    zoneId: null | string;
  }> = {};
  if (patch.latitude !== undefined || patch.longitude !== undefined) {
    const latitude = patch.latitude ?? Number(existing.latitude);
    const longitude = patch.longitude ?? Number(existing.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const resolved = await resolveZoneForCoords(latitude, longitude);
      serviceabilityPatch = resolved;
    }
  }

  const setDefault = patch.setAsDefault === true;

  const updated = await repo.updateAddress(addressId, {
    ...(patch.accessNotes !== undefined && { accessNotes: patch.accessNotes }),
    ...(patch.addressType !== undefined && { addressType: patch.addressType }),
    ...(patch.city !== undefined && { city: patch.city }),
    ...(patch.country !== undefined && { country: patch.country }),
    ...(patch.label !== undefined && { label: patch.label }),
    ...(patch.landmark !== undefined && { landmark: patch.landmark }),
    ...(patch.latitude !== undefined && { latitude: patch.latitude }),
    ...(patch.line1 !== undefined && { line1: patch.line1 }),
    ...(patch.line2 !== undefined && { line2: patch.line2 }),
    ...(patch.longitude !== undefined && { longitude: patch.longitude }),
    ...(patch.pincode !== undefined && { pincode: patch.pincode }),
    ...(patch.placeId !== undefined && { placeId: patch.placeId }),
    ...(patch.recipientName !== undefined && {
      recipientName: patch.recipientName,
    }),
    ...(patch.recipientPhone !== undefined && {
      recipientPhone: patch.recipientPhone,
    }),
    ...(patch.state !== undefined && { state: patch.state }),
    ...serviceabilityPatch,
  });

  const final = setDefault
    ? await repo.setDefaultAddress(consumerId, addressId)
    : updated;

  if (final) emitAddressUpdated(consumerId, final);
  return final;
};

export const deleteAddress = async (
  consumerId: string,
  addressId: string,
): Promise<void> => {
  const existing = await repo.findAddressById(addressId);
  if (!existing || existing.consumerId !== consumerId) {
    throw new NotFoundError("Address not found.");
  }
  await repo.softDeleteAddress(addressId);
  domainEvents.emitAddressDeleted({
    addressId,
    consumerId,
    timestamp: new Date().toISOString(),
  });
  if (existing.isDefault) {
    const remaining = await repo.listAddressesForConsumer(consumerId);
    if (remaining.length > 0) {
      const newDefault = await repo.setDefaultAddress(
        consumerId,
        remaining[0]!.id,
      );
      if (newDefault) emitAddressUpdated(consumerId, newDefault);
    }
  }
};

export const setDefaultAddress = async (
  consumerId: string,
  addressId: string,
) => {
  const existing = await repo.findAddressById(addressId);
  if (!existing || existing.consumerId !== consumerId) {
    throw new NotFoundError("Address not found.");
  }
  const result = await repo.setDefaultAddress(consumerId, addressId);
  if (result) emitAddressUpdated(consumerId, result);
  return result;
};

export const listAddresses = async (consumerId: string) => {
  return await repo.listAddressesForConsumer(consumerId);
};

export const getAddress = async (consumerId: string, addressId: string) => {
  const address = await repo.findAddressById(addressId);
  if (!address || address.consumerId !== consumerId) {
    throw new NotFoundError("Address not found.");
  }
  return address;
};

export const getDefaultAddress = async (consumerId: string) => {
  return await repo.findDefaultAddressForConsumer(consumerId);
};

/**
 * Re-evaluates `isServiceable` and `zoneId` for every saved address with a
 * location, comparing the new resolution against what is stored. For every
 * row that changed, the DB is updated and an `address:updated` event is
 * emitted to the owning consumer's socket room.
 *
 * Called whenever a zone is created/updated/deleted. Currently scans the
 * full address table; bounding-box filtering by the affected polygon is a
 * future optimization.
 */
export const recomputeServiceabilityForAffectedAddresses =
  async (): Promise<void> => {
    const rows = await repo.listAllAddressesWithLocation();
    for (const row of rows) {
      const lat = row.latitude == null ? undefined : Number(row.latitude);
      const lng = row.longitude == null ? undefined : Number(row.longitude);
      if (lat == null || lng == null) continue;

      const resolved = await resolveZoneForCoords(lat, lng);
      const changed =
        resolved.isServiceable !== row.isServiceable ||
        resolved.zoneId !== row.zoneId;
      if (!changed) continue;

      const updated = await repo.updateAddress(row.id, {
        isServiceable: resolved.isServiceable,
        zoneId: resolved.zoneId,
      });
      emitAddressUpdated(row.consumerId, updated);
    }
  };
