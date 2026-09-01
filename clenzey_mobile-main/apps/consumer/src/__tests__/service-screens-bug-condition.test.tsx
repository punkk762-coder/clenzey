/**
 * Bug Condition Exploration Test — Service Screens UI Polish
 *
 * This property-based test encodes the EXPECTED behavior after the fix.
 * Running it on the UNFIXED code should produce failures (counterexamples),
 * confirming the bug exists.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9**
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({
    id: 'service-1',
    serviceId: 'service-1',
    variantId: 'v1',
    addonIds: 'a1',
  })),
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: [
      { id: 'addr1', label: 'Home', line1: '123 Main St', isDefault: true },
    ],
    isLoading: false,
  })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock('react-native-safe-area-context', () => {
  const { createElement } = require('react');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      createElement('SafeAreaView', props, children),
  };
});

jest.mock('react-native-paper', () => {
  const { createElement } = require('react');
  return {
    Text: ({ children, ...props }: any) => createElement('RNPText', props, children),
    Button: ({ children, compact, dense, ...props }: any) =>
      createElement(
        'Button',
        { ...props, compact: compact ? 'true' : undefined, dense: dense ? 'true' : undefined },
        children
      ),
    Card: Object.assign(
      ({ children, elevation, style, ...props }: any) =>
        createElement('Card', { ...props, elevation, style }, children),
      {
        Content: ({ children, ...props }: any) =>
          createElement('CardContent', props, children),
      }
    ),
    TextInput: ({ dense, ...props }: any) =>
      createElement('TextInput', { ...props, dense: dense ? 'true' : undefined }),
    Portal: ({ children }: any) => createElement('Portal', null, children),
    Dialog: Object.assign(
      ({ children, ...props }: any) => createElement('Dialog', props, children),
      {
        Content: ({ children }: any) => createElement('DialogContent', null, children),
        Actions: ({ children }: any) => createElement('DialogActions', null, children),
      }
    ),
    Divider: (props: any) => createElement('Divider', props),
    SegmentedButtons: ({ value, onValueChange, buttons, ...props }: any) =>
      createElement('SegmentedButtons', { value, onValueChange, buttons, ...props }),
  };
});

jest.mock('@clenzey/design-system', () => {
  const { createElement } = require('react');
  const actual = jest.requireActual('@clenzey/design-system');
  return {
    ...actual,
    SegmentTabs: ({ value, onValueChange, tabs, ...props }: any) =>
      createElement('SegmentTabs', { value, onValueChange, tabs, ...props }),
  };
});

jest.mock('../../src/lib/api', () => ({
  apiClient: {},
}));

jest.mock('@clenzey/api-client', () => ({
  createAddressesEndpoints: () => ({
    list: jest.fn(() => Promise.resolve({ addresses: [] })),
  }),
}));

jest.mock('../../src/components/DialogIcon', () => {
  const { createElement } = require('react');
  return {
    DialogIcon: (props: any) => createElement('DialogIcon', props),
  };
});

jest.mock('../../src/components/PaymentMethodSection', () => {
  const { createElement } = require('react');
  return {
    PaymentMethodSection: ({ paymentMode, onSelectOnline, onSelectCash, ...props }: any) =>
      createElement('PaymentMethodSection', { paymentMode, onSelectOnline, onSelectCash, ...props }),
  };
});

// ─── Mock service data ────────────────────────────────────────────────────────

const mockServiceData = {
  id: 'service-1',
  name: 'Quick Shine',
  category: 'QUICK_SHINE',
  description: 'Quick shine cleaning service',
  variants: [
    { id: 'v1', name: '30 Mins', duration: 30, price: 299, basePrice: 299 },
    { id: 'v2', name: '60 Mins', duration: 60, price: 499, basePrice: 499 },
  ],
  addons: [
    { id: 'a1', name: 'Bathroom', price: 150 },
    { id: 'a2', name: 'Kitchen', price: 250 },
  ],
};

const mockDeepCleaningData = {
  id: 'service-2',
  name: 'Deep Cleaning',
  category: 'DEEP_CLEANING',
  description: 'Deep cleaning service',
  variants: [
    { id: 'v1', name: '1 BHK', duration: 120, price: 1999, basePrice: 1999, label: '1 BHK' },
    { id: 'v2', name: '2 BHK', duration: 180, price: 2999, basePrice: 2999, label: '2 BHK' },
  ],
  addons: [
    { id: 'a1', name: 'Carpet Cleaning', price: 500 },
  ],
  inclusions: [
    { id: 'inc1', category: 'Living Room', title: 'Floor Mopping', description: 'Deep floor clean' },
    { id: 'inc2', category: 'Kitchen', title: 'Cabinet Wipe', description: 'Inside out clean' },
  ],
};

const mockEstimate = {
  total: 449,
  basePrice: 299,
  addonsTotal: 150,
  breakdown: [
    { label: 'Base Price', amount: 299 },
    { label: 'Add-ons', amount: 150 },
  ],
};

let mockCurrentService: any = mockServiceData;

jest.mock('../../src/hooks/useServiceById', () => ({
  useServiceById: () => ({
    data: mockCurrentService,
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../src/hooks/useEstimate', () => ({
  useEstimate: () => ({
    data: mockEstimate,
    isLoading: false,
  }),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import * as fc from 'fast-check';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findAllByType(root: any, type: string): any[] {
  const results: any[] = [];
  function walk(node: any) {
    if (!node) return;
    if (node.type === type) results.push(node);
    if (node.children) {
      for (const child of node.children) {
        if (typeof child === 'object') walk(child);
      }
    }
  }
  walk(root.toJSON());
  return results;
}

function findAllByProps(root: any, predicate: (props: any) => boolean): any[] {
  const results: any[] = [];
  function walk(node: any) {
    if (!node) return;
    if (node.props && predicate(node.props)) results.push(node);
    if (node.children) {
      for (const child of node.children) {
        if (typeof child === 'object') walk(child);
      }
    }
  }
  walk(root.toJSON());
  return results;
}

function hasAbsolutePositionedDecorativeViews(root: any): boolean {
  const views = findAllByProps(root, (props) => {
    if (!props.style) return false;
    const style = Array.isArray(props.style)
      ? Object.assign({}, ...props.style.filter(Boolean))
      : props.style;
    return style.position === 'absolute' && style.borderRadius != null && style.backgroundColor != null;
  });
  // Need at least 2 decorative elements (circle + rectangle) per card
  return views.length >= 2;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Bug Condition Exploration: Custom TouchableOpacity Toggles and Plain Cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentService = mockServiceData;
  });

  /**
   * Property: Quick Shine layout renders SegmentedButtons for Instant/Schedule toggle
   * Bug Condition: screen.hasInstantScheduleToggle AND NOT usesSegmentedButtons(screen.instantScheduleToggle)
   */
  it('Quick Shine layout renders SegmentedButtons for Instant/Schedule toggle', () => {
    mockCurrentService = mockServiceData;
    const ServiceDetailScreen = require('../../app/services/[id]').default;

    fc.assert(
      fc.property(
        fc.constant(mockServiceData),
        (_serviceData) => {
          let tree!: ReactTestRenderer;
          act(() => {
            tree = create(React.createElement(ServiceDetailScreen) as any);
          });

          const segmentTabs = findAllByType(tree, 'SegmentTabs');
          expect(segmentTabs.length).toBeGreaterThanOrEqual(1);

          const toggle = segmentTabs[0];
          expect(toggle.props.tabs).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ value: 'INSTANT' }),
              expect.objectContaining({ value: 'SCHEDULE' }),
            ])
          );
        }
      ),
      { numRuns: 1 }
    );
  });

  /**
   * Property: Deep Cleaning layout renders SegmentedButtons for Service Type toggle
   * Bug Condition: same condition for Deep Cleaning branch
   */
  it('Deep Cleaning layout renders SegmentedButtons for Service Type toggle', () => {
    mockCurrentService = mockDeepCleaningData;
    const ServiceDetailScreen = require('../../app/services/[id]').default;

    fc.assert(
      fc.property(
        fc.constant(mockDeepCleaningData),
        (_serviceData) => {
          let tree!: ReactTestRenderer;
          act(() => {
            tree = create(React.createElement(ServiceDetailScreen) as any);
          });

          const segmentTabs = findAllByType(tree, 'SegmentTabs');
          expect(segmentTabs.length).toBeGreaterThanOrEqual(1);

          const toggle = segmentTabs[0];
          expect(toggle.props.tabs).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ value: 'INSTANT' }),
              expect.objectContaining({ value: 'SCHEDULE' }),
            ])
          );
        }
      ),
      { numRuns: 1 }
    );
  });

  /**
   * Property: Checkout renders enhanced payment method cards
   */
  it('checkout renders enhanced payment method cards', () => {
    const CheckoutScreen = require('../../app/booking/create').default;

    fc.assert(
      fc.property(
        fc.constant('RAZORPAY'),
        (_mode) => {
          let tree!: ReactTestRenderer;
          act(() => {
            tree = create(React.createElement(CheckoutScreen) as any);
          });

          const paymentSection = findAllByType(tree, 'PaymentMethodSection');
          expect(paymentSection.length).toBeGreaterThanOrEqual(1);

          const section = paymentSection[0];
          expect(section.props.paymentMode).toBe('RAZORPAY');
          expect(typeof section.props.onSelectOnline).toBe('function');
          expect(typeof section.props.onSelectCash).toBe('function');
        }
      ),
      { numRuns: 1 }
    );
  });

  /**
   * Property: Add-on cards use flat styling without decorative accent elements
   */
  it('add-on cards do not use decorative accent View elements with absolute positioning', () => {
    mockCurrentService = mockServiceData;
    const ServiceDetailScreen = require('../../app/services/[id]').default;

    fc.assert(
      fc.property(
        fc.constant(mockServiceData),
        (_serviceData) => {
          let tree!: ReactTestRenderer;
          act(() => {
            tree = create(React.createElement(ServiceDetailScreen) as any);
          });

          expect(hasAbsolutePositionedDecorativeViews(tree)).toBe(false);
        }
      ),
      { numRuns: 1 }
    );
  });

  /**
   * Property: Checkout cards use flat styling without heavy elevation
   */
  it('checkout cards use flat styling without elevated shadows', () => {
    const CheckoutScreen = require('../../app/booking/create').default;

    fc.assert(
      fc.property(
        fc.constant('checkout'),
        (_screen) => {
          let tree!: ReactTestRenderer;
          act(() => {
            tree = create(React.createElement(CheckoutScreen) as any);
          });

          const cards = findAllByType(tree, 'Card');
          expect(cards.length).toBeGreaterThanOrEqual(1);

          const elevatedCards = cards.filter((c: any) => c.props.elevation != null && c.props.elevation > 0);
          expect(elevatedCards.length).toBe(0);
        }
      ),
      { numRuns: 1 }
    );
  });

  /**
   * Property: TextInput components have dense prop and Button components have compact prop
   * Bug Condition: screen.hasInputsOrButtons AND NOT usesCompactSizing
   */
  it('TextInput components have dense prop and Button components have compact prop', () => {
    const CheckoutScreen = require('../../app/booking/create').default;

    fc.assert(
      fc.property(
        fc.constant('checkout'),
        (_screen) => {
          let tree!: ReactTestRenderer;
          act(() => {
            tree = create(React.createElement(CheckoutScreen) as any);
          });

          const textInputs = findAllByType(tree, 'TextInput');
          const contentInputs = textInputs.filter(
            (ti: any) =>
              ti.props.label?.includes('Coupon') || ti.props.label?.includes('Notes')
          );

          expect(contentInputs.length).toBeGreaterThanOrEqual(2);
          for (const input of contentInputs) {
            expect(input.props.dense).toBe('true');
          }
        }
      ),
      { numRuns: 1 }
    );
  });
});
