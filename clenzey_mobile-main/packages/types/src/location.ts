export interface PartnerLocation {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  isOnline: boolean;
}

export interface LocationStreamEvent {
  latitude: number;
  longitude: number;
  heading: number;
  etaMinutes: number;
}
