export { createConsumerAuthEndpoints } from './consumer-auth';
export type { ConsumerValidateResponse } from './consumer-auth';

export { createPartnerAuthEndpoints } from './partner-auth';
export type { PartnerValidateResponse } from './partner-auth';

export { createAddressesEndpoints } from './addresses';
export type { CreateAddressPayload, UpdateAddressPayload } from './addresses';

export { createServicesEndpoints } from './services';
export type { EstimatePayload, EstimateResponse } from './services';

export { createBookingsEndpoints } from './bookings';
export type {
  CreateBookingPayload,
  BookingPreview,
  ListBookingsParams,
  ListBookingsResponse,
  TransitionPayload,
  ReschedulePayload,
  AvailabilityPeriodName,
  AvailabilityHourlySlot,
  AvailabilityPeriodGroup,
  AvailabilityAlternativeDay,
  CheckAvailabilityPayload,
  AvailabilityMatchSuccess,
  AvailabilityMatchFailure,
  CheckAvailabilityResponse,
} from './bookings';

export { createPaymentsEndpoints } from './payments';
export type { PaymentConfirmResponse } from './payments';

export { createCouponsEndpoints } from './coupons';
export type {
  ValidateCouponPayload,
  ValidateCouponResponse,
  CouponOffer,
  CouponDiscountType,
  ListCouponOffersParams,
  ListCouponOffersResponse,
} from './coupons';

export { createLocationEndpoints } from './location';
export type {
  GeocodedAddress,
  ReverseGeocodeResponse,
  PlacePrediction,
  PlacesSearchResponse,
  PlacesDetailsResponse,
  ServiceabilityResponse,
} from './location';

export { createNotificationsEndpoints } from './notifications';
export type {
  RegisterTokenPayload,
  PushPlatform,
  RemoveTokenPayload,
  ListNotificationsParams,
} from './notifications';

export { createReviewsEndpoints } from './reviews';
export type {
  CreateReviewPayload,
  ListReviewsResponse,
  ListReviewsParams,
} from './reviews';

export { createQuotationsEndpoints } from './quotations';
export type { CreateQuotationPayload } from './quotations';

export { createPartnersEndpoints } from './partners';
export type {
  AddAvailabilityPayload,
  UpdateLocationPayload,
} from './partners';

export { createContactEndpoints } from './contact';
export type { ContactResponse } from './contact';

export { createEtaEndpoints } from './eta';
export type { EtaResponse } from './eta';

export { createConsumersEndpoints } from './consumers';
export type { UpdateConsumerProfilePayload } from './consumers';

export { createDisputesEndpoints } from './disputes';

export { createReferralsEndpoints } from './referrals';
