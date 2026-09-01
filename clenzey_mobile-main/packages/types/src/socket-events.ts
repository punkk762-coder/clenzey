import type { BookingStatus } from './booking';
import type { LocationStreamEvent } from './location';
import type { Service } from './service';
import type { Address } from './address';
import type { Quotation } from './quotation';

/** Server-emitted events */

export interface BookingStatusChangedEvent {
  bookingId: string;
  status: BookingStatus;
  updatedAt: string;
}

export interface PartnerLocationStreamEvent extends LocationStreamEvent {}

export interface EtaUpdatedEvent {
  bookingId: string;
  etaMinutes: number;
}

export interface PartnerLocationStaleEvent {
  bookingId: string;
  reason: string;
}

export interface ServiceCreatedEvent {
  service: Service;
}

export interface ServiceUpdatedEvent {
  service: Service;
}

export interface ServiceDeletedEvent {
  serviceId: string;
}

export interface QuotationCreatedEvent {
  quotation: Quotation;
}

export interface QuotationUpdatedEvent {
  quotation: Quotation;
}

export interface AddressCreatedEvent {
  address: Address;
}

export interface AddressUpdatedEvent {
  address: Address;
}

export interface AddressDeletedEvent {
  addressId: string;
}

export interface BookingPartnerProposedEvent {
  assignmentId: string;
  bookingId: string;
}

/** Client-emitted events */

export interface BookingSubscribePayload {
  bookingId: string;
}

export interface BookingUnsubscribePayload {
  bookingId: string;
}

/** Event name constants */

export type ServerEvent =
  | 'booking:status_changed'
  | 'partner:location_stream'
  | 'eta:updated'
  | 'partner:location_stale'
  | 'service:created'
  | 'service:updated'
  | 'service:deleted'
  | 'quotation:created'
  | 'quotation:updated'
  | 'address:created'
  | 'address:updated'
  | 'address:deleted'
  | 'booking:partner_proposed';

export type ClientEvent =
  | 'booking:subscribe'
  | 'booking:unsubscribe';
