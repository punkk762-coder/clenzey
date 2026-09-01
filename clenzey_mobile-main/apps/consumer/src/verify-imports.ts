/**
 * Verification file — ensures consumer app can import from all shared packages.
 * This file is checked by `tsc --noEmit` during typecheck.
 */

// @clenzey/types — key types are accessible
import type {
  Consumer,
  Partner,
  Booking,
  BookingStatus,
  Address,
  Service,
  ServiceVariant,
  Notification,
  PaymentOrder,
  PaymentConfirmation,
  Assignment,
  AvailabilitySlot,
  PartnerLocation,
  LocationStreamEvent,
  BookingStatusChangedEvent,
  PartnerLocationStreamEvent,
  EtaUpdatedEvent,
} from '@clenzey/types';

// @clenzey/api-client — createApiClient, endpoint creators are exported
import {
  createApiClient,
  isApiError,
  createConsumerAuthEndpoints,
  createPartnerAuthEndpoints,
  createAddressesEndpoints,
  createServicesEndpoints,
  createBookingsEndpoints,
  createPaymentsEndpoints,
  createCouponsEndpoints,
  createLocationEndpoints,
  createNotificationsEndpoints,
  createReviewsEndpoints,
  createQuotationsEndpoints,
  createPartnersEndpoints,
  createContactEndpoints,
  createEtaEndpoints,
  createConsumersEndpoints,
} from '@clenzey/api-client';
import type { ApiConfig, ApiResponse, ApiError } from '@clenzey/api-client';

// @clenzey/socket-client — SocketManager, hooks are exported
import {
  SocketManager,
  useSocket,
  useBookingStatus,
  usePartnerLocation,
  useEtaUpdates,
  useServiceUpdates,
  useAddressUpdates,
} from '@clenzey/socket-client';
import type { SocketConfig, UseSocketResult } from '@clenzey/socket-client';

// @clenzey/design-system — ThemeProvider, Button, TextInput are exported
import {
  ThemeProvider,
  useTheme,
  Button,
  TextInput,
  Card,
  Modal,
  BottomSheet,
  Toast,
  Badge,
  Chip,
  Avatar,
  Divider,
  LoadingSpinner,
  theme,
  colors,
  typography,
  spacing,
  borderRadius,
} from '@clenzey/design-system';
import { useDesignSystemFonts } from '@clenzey/design-system/fonts';
import type { ButtonProps, TextInputProps, CardProps } from '@clenzey/design-system';

// Type assertions to verify types are usable (not just importable)
type _VerifyConsumer = Consumer;
type _VerifyBookingStatus = BookingStatus;
type _VerifyApiConfig = ApiConfig;
type _VerifySocketConfig = SocketConfig;
type _VerifyButtonProps = ButtonProps;

export {};
