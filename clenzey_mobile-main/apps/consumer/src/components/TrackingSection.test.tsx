import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SocketManager } from '@clenzey/socket-client';

// Mock react-native-maps before importing TrackingSection
jest.mock('react-native-maps', () => {
  const React = require('react');
  const RN = require('react-native');
  const MockMapView = (props: any) =>
    React.createElement(RN.View, { testID: 'map-view' }, props.children);
  const MockMarker = (props: any) =>
    React.createElement(RN.View, { testID: `marker-${props.title || 'unknown'}` });
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    PROVIDER_GOOGLE: 'google',
  };
});

// Mock the socket-client hooks
const mockPartnerLocation = { latitude: 12.97, longitude: 77.59, heading: 45, etaMinutes: 5, isStale: false };
let mockPartnerLocationReturn: typeof mockPartnerLocation | null = null;
let mockEtaReturn: { etaMinutes: number } | null = null;
let mockBookingStatusReturn: { status: string; updatedAt: string } | null = null;

jest.mock('@clenzey/socket-client', () => ({
  usePartnerLocation: () => mockPartnerLocationReturn,
  useEtaUpdates: () => mockEtaReturn,
  useBookingStatus: () => mockBookingStatusReturn,
}));

// Mock the ETA API
jest.mock('../lib/api', () => ({
  etaApi: {
    getEta: jest.fn().mockResolvedValue({ etaMinutes: 10 }),
  },
}));

jest.mock('../hooks/useBookingEta', () => ({
  useBookingEta: jest.fn(() => ({ etaMinutes: null, isLoading: false, isFetching: false, isError: false, refetch: jest.fn() })),
}));

// Import after mocks are set up
import { TrackingSection } from './TrackingSection';
import { useBookingEta } from '../hooks/useBookingEta';

const mockUseBookingEta = useBookingEta as jest.Mock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function createMockSocketManager(): SocketManager {
  return {
    subscribeToBooking: jest.fn(),
    unsubscribeFromBooking: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getSocket: jest.fn(() => null),
    isConnected: jest.fn(() => true),
    connect: jest.fn(),
    disconnect: jest.fn(),
  } as unknown as SocketManager;
}

function renderWithWrapper(ui: React.ReactElement): ReactTestRenderer {
  const Wrapper = createWrapper();
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<Wrapper>{ui}</Wrapper>);
  });
  return renderer;
}

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.findAll(
    (node: any) => node.props.testID === testID && node.type === 'View',
  );
}

function findByText(renderer: ReactTestRenderer, text: string) {
  return renderer.root.findAll(
    (node: any) =>
      typeof node.children?.[0] === 'string' &&
      node.children[0] === text &&
      typeof node.type === 'string',
  );
}

describe('TrackingSection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPartnerLocationReturn = null;
    mockEtaReturn = null;
    mockBookingStatusReturn = null;
    mockUseBookingEta.mockReturnValue({ etaMinutes: null, isLoading: false, isFetching: false, isError: false, refetch: jest.fn() });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when status is PENDING (not trackable)', () => {
    const socketManager = createMockSocketManager();
    const renderer = renderWithWrapper(
      <TrackingSection
        bookingId="booking-123"
        bookingStatus="PENDING"
        socketManager={socketManager}
      />,
    );
    const maps = findByTestId(renderer, 'map-view');
    expect(maps.length).toBe(0);
  });

  it('renders nothing when status is CONFIRMED', () => {
    const socketManager = createMockSocketManager();
    const renderer = renderWithWrapper(
      <TrackingSection
        bookingId="booking-123"
        bookingStatus="CONFIRMED"
        socketManager={socketManager}
      />,
    );
    const maps = findByTestId(renderer, 'map-view');
    expect(maps.length).toBe(0);
  });

  it('renders nothing when status is PROFESSIONAL_ASSIGNED (before EN_ROUTE)', () => {
    const socketManager = createMockSocketManager();
    const renderer = renderWithWrapper(
      <TrackingSection
        bookingId="booking-123"
        bookingStatus="PROFESSIONAL_ASSIGNED"
        socketManager={socketManager}
      />,
    );
    const maps = findByTestId(renderer, 'map-view');
    expect(maps.length).toBe(0);
  });

  it('renders map view when status is PROFESSIONAL_EN_ROUTE', () => {
    mockPartnerLocationReturn = mockPartnerLocation;
    const socketManager = createMockSocketManager();
    const renderer = renderWithWrapper(
      <TrackingSection
        bookingId="booking-123"
        bookingStatus="PROFESSIONAL_EN_ROUTE"
        socketManager={socketManager}
      />,
    );
    const maps = findByTestId(renderer, 'map-view');
    expect(maps.length).toBe(1);
  });

  it('renders map view when status is CHECKED_IN', () => {
    mockPartnerLocationReturn = mockPartnerLocation;
    const socketManager = createMockSocketManager();
    const renderer = renderWithWrapper(
      <TrackingSection
        bookingId="booking-123"
        bookingStatus="CHECKED_IN"
        socketManager={socketManager}
      />,
    );
    const maps = findByTestId(renderer, 'map-view');
    expect(maps.length).toBe(1);
  });

  it('renders map view when status is IN_PROGRESS', () => {
    mockPartnerLocationReturn = mockPartnerLocation;
    const socketManager = createMockSocketManager();
    const renderer = renderWithWrapper(
      <TrackingSection
        bookingId="booking-123"
        bookingStatus="IN_PROGRESS"
        socketManager={socketManager}
      />,
    );
    const maps = findByTestId(renderer, 'map-view');
    expect(maps.length).toBe(1);
  });

  it('displays partner marker when location data is available', () => {
    mockPartnerLocationReturn = mockPartnerLocation;
    const socketManager = createMockSocketManager();
    const renderer = renderWithWrapper(
      <TrackingSection
        bookingId="booking-123"
        bookingStatus="PROFESSIONAL_EN_ROUTE"
        socketManager={socketManager}
      />,
    );
    const partnerMarkers = findByTestId(renderer, 'marker-Partner');
    expect(partnerMarkers.length).toBe(1);
  });

  it('displays ETA text from REST API when partner location is unavailable', () => {
    mockUseBookingEta.mockReturnValue({ etaMinutes: 10, isLoading: false, isFetching: false, isError: false, refetch: jest.fn() });
    const socketManager = createMockSocketManager();
    const renderer = renderWithWrapper(
      <TrackingSection
        bookingId="booking-123"
        bookingStatus="PROFESSIONAL_EN_ROUTE"
        socketManager={socketManager}
      />,
    );

    const etaNodes = renderer.root.findAll((node: any) => {
      const children = node.children;
      if (!children || children.length === 0) return false;
      const fullText = children.filter((c: any) => typeof c === 'string').join('');
      return fullText.includes('Arriving in') && fullText.includes('10 min');
    });

    expect(etaNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('displays ETA text from partner location etaMinutes', () => {
    mockPartnerLocationReturn = { ...mockPartnerLocation, etaMinutes: 7 };
    const socketManager = createMockSocketManager();
    const renderer = renderWithWrapper(
      <TrackingSection
        bookingId="booking-123"
        bookingStatus="PROFESSIONAL_EN_ROUTE"
        socketManager={socketManager}
      />,
    );
    // Find all text-like nodes that contain part of the ETA string
    const etaNodes = renderer.root.findAll(
      (node: any) => {
        const children = node.children;
        if (!children || children.length === 0) return false;
        const fullText = children
          .filter((c: any) => typeof c === 'string')
          .join('');
        return fullText.includes('Arriving in') && fullText.includes('7 min');
      },
    );
    expect(etaNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('displays stale location indicator when partner location is stale', () => {
    mockPartnerLocationReturn = { ...mockPartnerLocation, isStale: true };
    const socketManager = createMockSocketManager();
    const renderer = renderWithWrapper(
      <TrackingSection
        bookingId="booking-123"
        bookingStatus="PROFESSIONAL_EN_ROUTE"
        socketManager={socketManager}
      />,
    );
    const staleTexts = findByText(renderer, 'Partner location temporarily unavailable');
    expect(staleTexts.length).toBe(1);
  });

  it('displays destination marker when address coordinates are provided', () => {
    mockPartnerLocationReturn = mockPartnerLocation;
    const socketManager = createMockSocketManager();
    const renderer = renderWithWrapper(
      <TrackingSection
        bookingId="booking-123"
        bookingStatus="PROFESSIONAL_EN_ROUTE"
        socketManager={socketManager}
        addressLatitude={12.98}
        addressLongitude={77.60}
      />,
    );
    const destMarkers = findByTestId(renderer, 'marker-Service Location');
    expect(destMarkers.length).toBe(1);
  });

  it('does not display destination marker when address coordinates are missing', () => {
    mockPartnerLocationReturn = mockPartnerLocation;
    const socketManager = createMockSocketManager();
    const renderer = renderWithWrapper(
      <TrackingSection
        bookingId="booking-123"
        bookingStatus="PROFESSIONAL_EN_ROUTE"
        socketManager={socketManager}
      />,
    );
    const destMarkers = findByTestId(renderer, 'marker-Service Location');
    expect(destMarkers.length).toBe(0);
  });
});
