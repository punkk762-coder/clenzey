import { Alert } from 'react-native';
import type { SocketManager } from '@clenzey/socket-client';
import type { PartnerProposedEvent } from '@clenzey/socket-client';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock @tanstack/react-query
const mockInvalidateQueries = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

// Mock react to capture useEffect and useRef behavior
let effectCallback: (() => (() => void) | void) | null = null;
let effectDeps: any[] | undefined = undefined;

jest.mock('react', () => ({
  useEffect: jest.fn((cb, deps) => {
    effectCallback = cb;
    effectDeps = deps;
  }),
  useRef: jest.fn((initial) => ({ current: initial })),
}));

jest.spyOn(Alert, 'alert');

import { useAssignmentNotifications } from './useAssignmentNotifications';

describe('useAssignmentNotifications', () => {
  let mockSocketManager: {
    on: jest.Mock;
    off: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    effectCallback = null;
    effectDeps = undefined;

    mockSocketManager = {
      on: jest.fn(),
      off: jest.fn(),
    };
  });

  it('should register a listener for booking:partner_proposed when socketManager is provided', () => {
    useAssignmentNotifications(mockSocketManager as unknown as SocketManager);

    // Execute the effect
    const cleanup = effectCallback!();

    expect(mockSocketManager.on).toHaveBeenCalledWith(
      'booking:partner_proposed',
      expect.any(Function)
    );

    // Cleanup
    if (typeof cleanup === 'function') cleanup();
  });

  it('should not register a listener when socketManager is null', () => {
    useAssignmentNotifications(null);

    // Execute the effect
    effectCallback!();

    expect(mockSocketManager.on).not.toHaveBeenCalled();
  });

  it('should invalidate assignments query when event is received', () => {
    useAssignmentNotifications(mockSocketManager as unknown as SocketManager);

    // Execute the effect
    effectCallback!();

    // Get the registered handler
    const handler = mockSocketManager.on.mock.calls[0][1] as (data: PartnerProposedEvent) => void;

    const eventData: PartnerProposedEvent = {
      assignmentId: 'assignment-123',
      bookingId: 'booking-456',
    };

    handler(eventData);

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['assignments'],
    });
  });

  it('should show an Alert with "New Assignment" title when event is received', () => {
    useAssignmentNotifications(mockSocketManager as unknown as SocketManager);

    effectCallback!();

    const handler = mockSocketManager.on.mock.calls[0][1] as (data: PartnerProposedEvent) => void;

    handler({
      assignmentId: 'assignment-123',
      bookingId: 'booking-456',
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'New Assignment',
      'You have a new booking assignment!',
      expect.arrayContaining([
        expect.objectContaining({ text: 'View' }),
        expect.objectContaining({ text: 'Later', style: 'cancel' }),
      ])
    );
  });

  it('should navigate to assignment detail when "View" is pressed', () => {
    useAssignmentNotifications(mockSocketManager as unknown as SocketManager);

    effectCallback!();

    const handler = mockSocketManager.on.mock.calls[0][1] as (data: PartnerProposedEvent) => void;

    handler({
      assignmentId: 'assignment-123',
      bookingId: 'booking-456',
    });

    // Get the Alert buttons and simulate pressing "View"
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2];
    const viewButton = buttons.find((b: any) => b.text === 'View');
    viewButton.onPress();

    expect(mockPush).toHaveBeenCalledWith('/assignments/assignment-123');
  });

  it('should unregister the listener on cleanup', () => {
    useAssignmentNotifications(mockSocketManager as unknown as SocketManager);

    const cleanup = effectCallback!();

    expect(mockSocketManager.on).toHaveBeenCalled();

    // Execute cleanup
    if (typeof cleanup === 'function') cleanup();

    expect(mockSocketManager.off).toHaveBeenCalledWith(
      'booking:partner_proposed',
      expect.any(Function)
    );
  });

  it('should have socketManager as a dependency in the effect', () => {
    useAssignmentNotifications(mockSocketManager as unknown as SocketManager);

    // The effect's deps should include socketManager
    expect(effectDeps).toEqual([mockSocketManager]);
  });
});
