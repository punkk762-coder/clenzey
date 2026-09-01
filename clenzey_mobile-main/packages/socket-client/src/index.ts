export { SocketManager } from './client';
export type { SocketConfig, TypedSocket } from './client';
export type {
  ServerEvents,
  ClientEvents,
  BookingStatusEvent,
  PartnerProposedEvent,
  LocationStreamEvent,
  LocationStaleEvent,
  EtaUpdatedEvent,
  ServiceCreatedEvent,
  ServiceUpdatedEvent,
  ServiceDeletedEvent,
  QuotationCreatedEvent,
  QuotationUpdatedEvent,
  AddressCreatedEvent,
  AddressUpdatedEvent,
  AddressDeletedEvent,
} from './events';
export {
  useSocket,
  useBookingStatus,
  usePartnerLocation,
  useEtaUpdates,
  useServiceUpdates,
  useQuotationUpdates,
  useAddressUpdates,
} from './hooks';
export type {
  UseSocketResult,
  BookingStatusState,
  PartnerLocationState,
  EtaState,
  ServiceUpdateType,
  ServiceUpdatePayload,
  QuotationUpdateType,
  QuotationUpdatePayload,
  AddressUpdateType,
  AddressUpdatePayload,
} from './hooks';
