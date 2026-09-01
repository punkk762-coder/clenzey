/**
 * Preservation Property Tests - Service Screens UI Polish
 *
 * These tests verify that the functional behavior of the service detail
 * and checkout screens remains unchanged after UI polish changes.
 * They should PASS on both unfixed and fixed code.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */
import React from 'react';
import { Text, TouchableOpacity, TextInput } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import * as fc from 'fast-check';

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

const mockUseServiceById = jest.fn();
jest.mock('../../src/hooks/useServiceById', () => ({
  useServiceById: (...args: any[]) => mockUseServiceById(...args),
}));

const mockUseEstimate = jest.fn();
jest.mock('../../src/hooks/useEstimate', () => ({
  useEstimate: (...args: any[]) => mockUseEstimate(...args),
}));

const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: any) => children,
}));

jest.mock('react-native-safe-area-context', () => {
  const RN = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) => <RN.View {...props}>{children}</RN.View>,
  };
});

jest.mock('react-native-paper', () => {
  const RN = require('react-native');
  return {
    Text: ({ children, ...props }: any) => <RN.Text {...props}>{children}</RN.Text>,
    Button: ({ children, onPress, ...props }: any) => (
      <RN.TouchableOpacity onPress={onPress} {...props}>
        <RN.Text>{typeof children === 'string' ? children : ''}</RN.Text>
      </RN.TouchableOpacity>
    ),
    Card: Object.assign(
      ({ children, ...props }: any) => <RN.View {...props}>{children}</RN.View>,
      { Content: ({ children, ...props }: any) => <RN.View {...props}>{children}</RN.View> }
    ),
    TextInput: ({ label, value, onChangeText, ...props }: any) => (
      <RN.TextInput placeholder={label} value={value} onChangeText={onChangeText} />
    ),
    SegmentedButtons: ({ value, onValueChange, buttons }: any) => (
      <RN.View testID="segmented-buttons">
        {buttons.map((btn: any) => (
          <RN.TouchableOpacity key={btn.value} testID={`segment-${btn.value}`} onPress={() => onValueChange(btn.value)}>
            <RN.Text>{btn.label}</RN.Text>
          </RN.TouchableOpacity>
        ))}
      </RN.View>
    ),
    Portal: ({ children }: any) => <>{children}</>,
    Dialog: Object.assign(
      ({ children, visible }: any) => {
        if (!visible) return null;
        const { View: V } = require('react-native');
        return <V>{children}</V>;
      },
      {
        Content: ({ children }: any) => {
          const { View: V } = require('react-native');
          return <V>{children}</V>;
        },
        Actions: ({ children }: any) => {
          const { View: V } = require('react-native');
          return <V>{children}</V>;
        },
      }
    ),
    Divider: () => null,
  };
});

jest.mock('../../src/components/DialogIcon', () => ({
  DialogIcon: () => null,
}));

jest.mock('@clenzey/api-client', () => ({
  createAddressesEndpoints: () => ({ list: jest.fn(() => Promise.resolve({ addresses: [] })) }),
}));

jest.mock('../../src/lib/api', () => ({
  apiClient: {},
  servicesApi: {},
  bookingsApi: {
    checkAvailability: jest.fn(() =>
      Promise.resolve({
        matched: true,
        partnerId: 'partner-1',
        distanceMeters: 1200,
        scheduledAt: '2026-06-18T18:00:00+05:30',
        scheduledEndAt: '2026-06-18T19:00:00+05:30',
      }),
    ),
  },
}));

jest.mock('../../src/hooks/useSelectedAddress', () => ({
  useSelectedAddress: () => ({
    selectedAddressId: 'address-1',
    selectedAddress: null,
    locationLabel: 'Home',
    locationSubtitle: '123 Main St',
  }),
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { useLocalSearchParams } from 'expo-router';

// ─── Load components ────────────────────────────────────────────────────────

const ServiceDetailScreen = require('../../app/services/[id]').default;
const CheckoutScreen = require('../../app/booking/create').default;

// ─── Helpers ────────────────────────────────────────────────────────────────

const VARIANT_LABELS = ['30 MINS', '60 MINS', '90 MINS', '120 MINS'];
const VARIANT_DURATIONS = [30, 60, 90, 120];
const ADDON_NAMES = ['Bathroom', 'Kitchen', 'Balcony', 'Bedroom'];

function makeService(seed: {
  id: string;
  name: string;
  variantCount: number;
  addonCount: number;
  variantIds: string[];
  addonIds: string[];
  prices: number[];
}) {
  return {
    id: seed.id,
    name: seed.name,
    category: 'QUICK_SHINE' as const,
    description: 'Fast cleaning service',
    variants: Array.from({ length: seed.variantCount }, (_, i) => ({
      id: seed.variantIds[i],
      name: `${VARIANT_DURATIONS[i]} Mins`,
      duration: VARIANT_DURATIONS[i],
      price: seed.prices[i] || 100 + i * 50,
      basePrice: seed.prices[i] || 100 + i * 50,
      label: VARIANT_LABELS[i],
    })),
    addons: Array.from({ length: seed.addonCount }, (_, i) => ({
      id: seed.addonIds[i],
      name: ADDON_NAMES[i],
      price: 50 + i * 25,
      description: 'Extra cleaning',
    })),
  };
}

/** Find all Text nodes matching a string within a react-test-renderer tree */
function findTextNodes(root: TestRenderer.ReactTestInstance, text: string | RegExp): TestRenderer.ReactTestInstance[] {
  return root.findAll((node) => {
    // Check if node is a Text element (by type name or reference)
    const typeName = typeof node.type === 'string' ? node.type : (node.type as any)?.displayName || (node.type as any)?.name || '';
    const isText = (node.type as any) === Text || typeName === 'Text';
    if (!isText) return false;

    const children = node.props.children;
    if (typeof children === 'string') {
      return typeof text === 'string' ? children === text : text.test(children);
    }
    return false;
  });
}

/** Find the nearest ancestor TouchableOpacity of a node */
function findTouchableParent(node: TestRenderer.ReactTestInstance): TestRenderer.ReactTestInstance | null {
  let current = node.parent;
  while (current) {
    const typeName = typeof current.type === 'string' ? current.type : (current.type as any)?.displayName || (current.type as any)?.name || '';
    if (current.type === TouchableOpacity || typeName === 'TouchableOpacity') return current;
    current = current.parent;
  }
  return null;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const serviceArb = fc
  .record({
    id: fc.uuid(),
    name: fc.constantFrom('Express Home Polish', 'Quick Shine Standard'),
    variantCount: fc.integer({ min: 2, max: 4 }),
    addonCount: fc.integer({ min: 1, max: 4 }),
    variantIds: fc.array(fc.uuid(), { minLength: 4, maxLength: 4 }),
    addonIds: fc.array(fc.uuid(), { minLength: 4, maxLength: 4 }),
    prices: fc.array(fc.integer({ min: 100, max: 5000 }), { minLength: 4, maxLength: 4 }),
  })
  .map(makeService);

const addressArb = fc.record({
  id: fc.uuid(),
  consumerId: fc.uuid(),
  label: fc.constantFrom('Home', 'Work', 'Other'),
  addressType: fc.constantFrom('HOME', 'WORK', 'OTHER') as fc.Arbitrary<'HOME' | 'WORK' | 'OTHER'>,
  line1: fc.constantFrom('123 Main St', '456 Oak Ave', '789 Pine Rd'),
  line2: fc.option(fc.constant('Apt 4B'), { nil: undefined }),
  landmark: fc.option(fc.constant('Near Mall'), { nil: undefined }),
  city: fc.constantFrom('Mumbai', 'Delhi', 'Bangalore'),
  state: fc.constantFrom('Maharashtra', 'Delhi', 'Karnataka'),
  pincode: fc.constantFrom('400001', '110001', '560001'),
  isDefault: fc.boolean(),
  createdAt: fc.constant('2024-01-01T00:00:00Z'),
  updatedAt: fc.constant('2024-01-01T00:00:00Z'),
});

const paymentModeArb = fc.constantFrom('RAZORPAY', 'CASH') as fc.Arbitrary<'RAZORPAY' | 'CASH'>;
const couponArb = fc.constantFrom('', 'SAVE10', 'FLAT200', 'NEW50');
const notesArb = fc.constantFrom('', 'Please ring the bell', 'Leave at door');

// ─── Test Suite: Service Detail Screen ──────────────────────────────────────

describe('Preservation Property Tests - Service Detail Screen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 2.1: For all variant selections, `selectedVariantId` updates correctly
   * and estimate hook is called with new variantId.
   *
   * **Validates: Requirements 3.1**
   */
  it('property: for all variant selections, selectedVariantId updates and estimate is called with correct variantId', () => {
    fc.assert(
      fc.property(
        serviceArb,
        fc.integer({ min: 1, max: 3 }),
        (service, variantIndexRaw) => {
          jest.clearAllMocks();

          const variantIndex = variantIndexRaw % service.variants.length;
          if (variantIndex === 0) return; // skip default selection
          const targetVariant = service.variants[variantIndex];

          (useLocalSearchParams as jest.Mock).mockReturnValue({ id: service.id });
          mockUseServiceById.mockReturnValue({ data: service, isLoading: false, error: null });
          mockUseEstimate.mockReturnValue({ data: { total: 100, breakdown: [] } });

          let tree: TestRenderer.ReactTestRenderer;
          act(() => {
            tree = TestRenderer.create(<ServiceDetailScreen />);
          });

          const root = tree!.root;

          // Find and press the target variant pill by its unique label
          const variantTextNodes = findTextNodes(root, targetVariant.label);
          expect(variantTextNodes.length).toBeGreaterThan(0);

          const touchable = findTouchableParent(variantTextNodes[0]);
          expect(touchable).not.toBeNull();

          act(() => {
            touchable!.props.onPress();
          });

          // After pressing variant, useEstimate should have been called with the selected variant's id
          const estimateCalls = mockUseEstimate.mock.calls;
          const lastCall = estimateCalls[estimateCalls.length - 1];
          expect(lastCall[0].variantId).toBe(targetVariant.id);
          expect(lastCall[0].serviceId).toBe(service.id);

          act(() => { tree!.unmount(); });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 2.2: For all add-on toggle combinations, `selectedAddonIds` state
   * reflects the toggled set.
   *
   * **Validates: Requirements 3.2**
   */
  it('property: for all add-on toggle combinations, selectedAddonIds reflects the toggled set', () => {
    fc.assert(
      fc.property(
        serviceArb,
        fc.array(fc.boolean(), { minLength: 1, maxLength: 4 }),
        (service, togglePattern) => {
          jest.clearAllMocks();

          (useLocalSearchParams as jest.Mock).mockReturnValue({ id: service.id });
          mockUseServiceById.mockReturnValue({ data: service, isLoading: false, error: null });
          mockUseEstimate.mockReturnValue({ data: { total: 100, breakdown: [] } });

          let tree: TestRenderer.ReactTestRenderer;
          act(() => {
            tree = TestRenderer.create(<ServiceDetailScreen />);
          });

          const root = tree!.root;

          // Track which addons we expect to be selected
          const expectedSelected: string[] = [];

          service.addons.forEach((addon, idx) => {
            if (idx < togglePattern.length && togglePattern[idx]) {
              const addonTextNodes = findTextNodes(root, addon.name);
              if (addonTextNodes.length > 0) {
                const touchable = findTouchableParent(addonTextNodes[0]);
                if (touchable) {
                  act(() => { touchable.props.onPress(); });
                  expectedSelected.push(addon.id);
                }
              }
            }
          });

          // After toggling, useEstimate should be called with correct addonIds
          const estimateCalls = mockUseEstimate.mock.calls;
          const lastCall = estimateCalls[estimateCalls.length - 1];

          if (expectedSelected.length > 0) {
            expect(lastCall[0].addonIds).toEqual(expectedSelected);
          } else {
            // If nothing is toggled, addonIds should be undefined
            expect(lastCall[0].addonIds).toBeUndefined();
          }

          act(() => { tree!.unmount(); });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 2.3: For all valid booking configurations, "Book Now" navigates
   * with correct params (serviceId, variantId, addonIds).
   *
   * **Validates: Requirements 3.3**
   */
  it('property: for all valid booking configurations, Book Now navigates with correct params', async () => {
    await fc.assert(
      fc.asyncProperty(
        serviceArb,
        fc.array(fc.boolean(), { minLength: 0, maxLength: 4 }),
        async (service, addonToggles) => {
          jest.clearAllMocks();

          (useLocalSearchParams as jest.Mock).mockReturnValue({ id: service.id });
          mockUseServiceById.mockReturnValue({ data: service, isLoading: false, error: null });
          mockUseEstimate.mockReturnValue({ data: { total: 500, breakdown: [] } });

          let tree: TestRenderer.ReactTestRenderer;
          act(() => {
            tree = TestRenderer.create(<ServiceDetailScreen />);
          });

          const root = tree!.root;

          // Toggle some addons
          const expectedAddonIds: string[] = [];
          service.addons.forEach((addon, idx) => {
            if (idx < addonToggles.length && addonToggles[idx]) {
              const addonTextNodes = findTextNodes(root, addon.name);
              if (addonTextNodes.length > 0) {
                const touchable = findTouchableParent(addonTextNodes[0]);
                if (touchable) {
                  act(() => { touchable.props.onPress(); });
                  expectedAddonIds.push(addon.id);
                }
              }
            }
          });

          // Press "Book Now"
          const bookNowNodes = findTextNodes(root, 'Book Now');
          expect(bookNowNodes.length).toBeGreaterThan(0);
          const bookNowTouchable = findTouchableParent(bookNowNodes[0]);
          expect(bookNowTouchable).not.toBeNull();

          await act(async () => {
            bookNowTouchable!.props.onPress();
          });

          // Verify navigation params
          expect(mockPush).toHaveBeenCalledWith({
            pathname: '/booking/create',
            params: {
              serviceId: service.id,
              variantId: service.variants[0].id, // default is first variant
              addonIds: expectedAddonIds.join(','),
              bookingType: 'INSTANT',
            },
          });

          act(() => { tree!.unmount(); });
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Test Suite: Checkout Screen ────────────────────────────────────────────

describe('Preservation Property Tests - Checkout Screen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 2.4: For all address/payment/coupon/notes combinations,
   * `handlePay` navigates with correct params.
   *
   * **Validates: Requirements 3.4, 3.5**
   */
  it('property: for all address/payment/coupon/notes combinations, handlePay navigates with correct params', () => {
    fc.assert(
      fc.property(
        serviceArb,
        fc.array(addressArb, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 0, max: 2 }),
        paymentModeArb,
        couponArb,
        notesArb,
        (service, addresses, addressIndexRaw, paymentMode, coupon, notesVal) => {
          jest.clearAllMocks();

          const addressIndex = addressIndexRaw % addresses.length;
          const selectedAddress = addresses[addressIndex];
          const variantId = service.variants[0].id;
          const addonIds = service.addons.slice(0, 2).map((a) => a.id);

          (useLocalSearchParams as jest.Mock).mockReturnValue({
            serviceId: service.id,
            variantId,
            addonIds: addonIds.join(','),
          });

          mockUseServiceById.mockReturnValue({ data: service, isLoading: false, error: null });
          mockUseEstimate.mockReturnValue({
            data: { total: 500, breakdown: [{ label: 'Base', amount: 500 }] },
            isLoading: false,
          });

          // Mock useQuery to return addresses
          mockUseQuery.mockReturnValue({
            data: addresses,
            isLoading: false,
          });

          let tree: TestRenderer.ReactTestRenderer;
          act(() => {
            tree = TestRenderer.create(<CheckoutScreen />);
          });

          const root = tree!.root;

          // Select the target address by finding its label text and pressing it
          const addrLabel = `${selectedAddress.label}${selectedAddress.isDefault ? ' (Default)' : ''}`;
          const addrTextNodes = findTextNodes(root, addrLabel);
          if (addrTextNodes.length > 0) {
            const addrTouchable = findTouchableParent(addrTextNodes[0]);
            if (addrTouchable) {
              act(() => { addrTouchable.props.onPress(); });
            }
          }

          // Select payment mode if CASH (default is RAZORPAY)
          if (paymentMode === 'CASH') {
            const cashTextNodes = findTextNodes(root, 'Pay in Cash');
            if (cashTextNodes.length > 0) {
              const cashTouchable = findTouchableParent(cashTextNodes[0]);
              if (cashTouchable) {
                act(() => { cashTouchable.props.onPress(); });
              }
            }
          }

          // Enter coupon code
          if (coupon) {
            const couponInputs = root.findAll(
              (node) => (node.type as any) === TextInput && node.props.placeholder === 'Coupon Code (optional)'
            );
            if (couponInputs.length > 0) {
              act(() => { couponInputs[0].props.onChangeText(coupon); });
            }
          }

          // Enter notes
          if (notesVal) {
            const notesInputs = root.findAll(
              (node) => (node.type as any) === TextInput && node.props.placeholder === 'Notes (optional)'
            );
            if (notesInputs.length > 0) {
              act(() => { notesInputs[0].props.onChangeText(notesVal); });
            }
          }

          // Press Pay button — find the button that contains "Pay" text
          const payTextNodes = findTextNodes(root, /Pay/);
          expect(payTextNodes.length).toBeGreaterThan(0);
          const payTouchable = findTouchableParent(payTextNodes[0]);
          expect(payTouchable).not.toBeNull();

          act(() => {
            payTouchable!.props.onPress();
          });

          // Verify navigation
          expect(mockPush).toHaveBeenCalled();
          const lastCall = mockPush.mock.calls[mockPush.mock.calls.length - 1][0];
          expect(lastCall.pathname).toBe('/booking/payment');
          expect(lastCall.params.serviceId).toBe(service.id);
          expect(lastCall.params.variantId).toBe(variantId);
          expect(lastCall.params.paymentMode).toBe(paymentMode);
          expect(lastCall.params.addonIds).toBe(addonIds.join(','));
          expect(lastCall.params.couponCode).toBe(coupon.trim() || '');
          expect(lastCall.params.consumerNotes).toBe(notesVal.trim() || '');
          // addressId should be set (selected or default)
          expect(lastCall.params.addressId).toBeTruthy();

          act(() => { tree!.unmount(); });
        }
      ),
      { numRuns: 50 }
    );
  });
});
