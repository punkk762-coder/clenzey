import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Booking, BookingStatus } from '@clenzey/types';
import { normalizePopulatedBooking, type PopulatedBooking } from './booking-response';

type BookingsListPage = {
  bookings: PopulatedBooking[];
  total: number;
};

type BookingTab = 'all' | 'active' | 'completed' | 'cancelled';

const ACTIVE_BOOKING_STATUSES = new Set<BookingStatus>([
  'PENDING',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'PROFESSIONAL_ASSIGNED',
  'PROFESSIONAL_EN_ROUTE',
  'CHECKED_IN',
  'IN_PROGRESS',
]);

function toPopulatedBooking(booking: unknown): PopulatedBooking {
  return normalizePopulatedBooking(booking);
}

function shouldIncludeBookingInTab(tab: BookingTab, status: BookingStatus): boolean {
  if (tab === 'all') return true;
  if (tab === 'active') return ACTIVE_BOOKING_STATUSES.has(status);
  if (tab === 'completed') return status === 'COMPLETED';
  return status === 'CANCELLED';
}

function prependToQueryData(
  old: InfiniteData<BookingsListPage> | undefined,
  populated: PopulatedBooking,
): InfiniteData<BookingsListPage> | undefined {
  const alreadyListed = old?.pages?.some((page) =>
    page.bookings.some((item) => item.id === populated.id),
  );
  if (alreadyListed) {
    return old;
  }

  if (!old?.pages?.length) {
    return {
      pageParams: [0],
      pages: [{ bookings: [populated], total: 1 }],
    };
  }

  const [firstPage, ...restPages] = old.pages;
  return {
    ...old,
    pages: [
      {
        ...firstPage,
        bookings: [populated, ...firstPage.bookings],
        total: (firstPage.total ?? firstPage.bookings.length) + 1,
      },
      ...restPages,
    ],
  };
}

export function prependBookingToBookingsCache(
  queryClient: QueryClient,
  booking: Booking | PopulatedBooking,
) {
  const populated = 'serviceName' in booking ? booking : toPopulatedBooking(booking);
  const tabs: BookingTab[] = ['all', 'active', 'completed', 'cancelled'];

  for (const tab of tabs) {
    if (!shouldIncludeBookingInTab(tab, populated.status)) {
      continue;
    }

    queryClient.setQueriesData<InfiniteData<BookingsListPage>>(
      { queryKey: ['bookings', tab] },
      (old) => prependToQueryData(old, populated),
    );
  }
}

export async function syncBookingsAfterCreate(
  queryClient: QueryClient,
  booking: unknown,
) {
  try {
    prependBookingToBookingsCache(queryClient, toPopulatedBooking(booking));
  } catch {
    // Fall back to server refresh when the create response cannot be normalized.
  }

  await queryClient.invalidateQueries({ queryKey: ['bookings'] });
}
