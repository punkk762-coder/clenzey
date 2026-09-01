/**
 * Events emitted by the server to connected clients.
 *
 * @validates Requirements 11.1, 11.6, 27.4, 27.5, 27.6
 */
export interface ServerEvents {
  'booking:status_changed': (data: BookingStatusEvent) => void;
  'booking:partner_proposed': (data: PartnerProposedEvent) => void;
  'partner:location_stream': (data: LocationStreamEvent) => void;
  'partner:location_stale': (data: LocationStaleEvent) => void;
  'eta:updated': (data: EtaUpdatedEvent) => void;
  'service:created': (data: ServiceCreatedEvent) => void;
  'service:updated': (data: ServiceUpdatedEvent) => void;
  'service:deleted': (data: ServiceDeletedEvent) => void;
  'quotation:created': (data: QuotationCreatedEvent) => void;
  'quotation:updated': (data: QuotationUpdatedEvent) => void;
  'address:created': (data: AddressCreatedEvent) => void;
  'address:updated': (data: AddressUpdatedEvent) => void;
  'address:deleted': (data: AddressDeletedEvent) => void;
}

/**
 * Events emitted by the client to the server.
 *
 * @validates Requirements 11.1, 11.6
 */
export interface ClientEvents {
  'booking:subscribe': (data: { bookingId: string }) => void;
  'booking:unsubscribe': (data: { bookingId: string }) => void;
  'room:join': (data: { room: string }) => void;
}

// --- Booking events ---

export interface BookingStatusEvent {
  bookingId: string;
  status: string;
  updatedAt: string;
}

export interface PartnerProposedEvent {
  assignmentId: string;
  bookingId: string;
}

// --- Location & ETA events ---

export interface LocationStreamEvent {
  latitude: number;
  longitude: number;
  heading: number;
  etaMinutes: number;
}

export interface LocationStaleEvent {
  bookingId: string;
  partnerId: string;
}

export interface EtaUpdatedEvent {
  bookingId: string;
  etaMinutes: number;
}

// --- Service events (Req 27.4) ---

export interface ServiceCreatedEvent {
  serviceId: string;
}

export interface ServiceUpdatedEvent {
  serviceId: string;
}

export interface ServiceDeletedEvent {
  serviceId: string;
}

// --- Quotation events (Req 27.5) ---

export interface QuotationCreatedEvent {
  quotationId: string;
}

export interface QuotationUpdatedEvent {
  quotationId: string;
}

// --- Address events (Req 27.6) ---

export interface AddressCreatedEvent {
  addressId: string;
}

export interface AddressUpdatedEvent {
  addressId: string;
}

export interface AddressDeletedEvent {
  addressId: string;
}
