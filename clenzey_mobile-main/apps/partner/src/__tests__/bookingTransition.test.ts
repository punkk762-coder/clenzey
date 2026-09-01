/**
 * Unit tests for booking status transition validation logic.
 *
 * Tests the validateTransition function and NEXT_STATUS_MAP
 * that enforce Requirement 23.4: Prevent partner from skipping statuses.
 */
import { BookingStatus } from '@clenzey/types';
import {
  validateTransition,
  NEXT_STATUS_MAP,
} from '../../app/(tabs)/bookings/[id]';

describe('Partner Booking Status Transitions', () => {
  describe('NEXT_STATUS_MAP', () => {
    it('maps PROFESSIONAL_ASSIGNED to PROFESSIONAL_EN_ROUTE', () => {
      expect(NEXT_STATUS_MAP['PROFESSIONAL_ASSIGNED']).toBe('PROFESSIONAL_EN_ROUTE');
    });

    it('maps PROFESSIONAL_EN_ROUTE to CHECKED_IN', () => {
      expect(NEXT_STATUS_MAP['PROFESSIONAL_EN_ROUTE']).toBe('CHECKED_IN');
    });

    it('maps CHECKED_IN to IN_PROGRESS', () => {
      expect(NEXT_STATUS_MAP['CHECKED_IN']).toBe('IN_PROGRESS');
    });

    it('maps IN_PROGRESS to COMPLETED', () => {
      expect(NEXT_STATUS_MAP['IN_PROGRESS']).toBe('COMPLETED');
    });

    it('does not define a transition for COMPLETED', () => {
      expect(NEXT_STATUS_MAP['COMPLETED']).toBeUndefined();
    });

    it('does not define a transition for CANCELLED', () => {
      expect(NEXT_STATUS_MAP['CANCELLED']).toBeUndefined();
    });
  });

  describe('validateTransition', () => {
    it('returns null for valid transition PROFESSIONAL_ASSIGNED -> PROFESSIONAL_EN_ROUTE', () => {
      const result = validateTransition('PROFESSIONAL_ASSIGNED', 'PROFESSIONAL_EN_ROUTE');
      expect(result).toBeNull();
    });

    it('returns null for valid transition PROFESSIONAL_EN_ROUTE -> CHECKED_IN', () => {
      const result = validateTransition('PROFESSIONAL_EN_ROUTE', 'CHECKED_IN');
      expect(result).toBeNull();
    });

    it('returns null for valid transition CHECKED_IN -> IN_PROGRESS', () => {
      const result = validateTransition('CHECKED_IN', 'IN_PROGRESS');
      expect(result).toBeNull();
    });

    it('returns null for valid transition IN_PROGRESS -> COMPLETED', () => {
      const result = validateTransition('IN_PROGRESS', 'COMPLETED');
      expect(result).toBeNull();
    });

    it('returns error when skipping statuses (ASSIGNED -> IN_PROGRESS)', () => {
      const result = validateTransition('PROFESSIONAL_ASSIGNED', 'IN_PROGRESS');
      expect(result).not.toBeNull();
      expect(result).toContain('Cannot transition');
      expect(result).toContain('PROFESSIONAL_EN_ROUTE');
    });

    it('returns error when skipping statuses (ASSIGNED -> COMPLETED)', () => {
      const result = validateTransition('PROFESSIONAL_ASSIGNED', 'COMPLETED');
      expect(result).not.toBeNull();
      expect(result).toContain('Cannot transition');
    });

    it('returns error when skipping statuses (EN_ROUTE -> COMPLETED)', () => {
      const result = validateTransition('PROFESSIONAL_EN_ROUTE', 'COMPLETED');
      expect(result).not.toBeNull();
      expect(result).toContain('Cannot transition');
      expect(result).toContain('CHECKED_IN');
    });

    it('returns error when trying to transition backwards (IN_PROGRESS -> CHECKED_IN)', () => {
      const result = validateTransition('IN_PROGRESS', 'CHECKED_IN');
      expect(result).not.toBeNull();
      expect(result).toContain('Cannot transition');
    });

    it('returns error when no transitions available from COMPLETED', () => {
      const result = validateTransition('COMPLETED', 'IN_PROGRESS');
      expect(result).not.toBeNull();
      expect(result).toContain('No further transitions');
    });

    it('returns error when no transitions available from CANCELLED', () => {
      const result = validateTransition('CANCELLED', 'CONFIRMED');
      expect(result).not.toBeNull();
      expect(result).toContain('No further transitions');
    });

    it('returns error when transitioning from PENDING (not in partner flow)', () => {
      const result = validateTransition('PENDING', 'CONFIRMED');
      expect(result).not.toBeNull();
      expect(result).toContain('No further transitions');
    });
  });
});
