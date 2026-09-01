import { useAuthStore, getToken } from './auth';
import type { Partner } from '@clenzey/types';

// Mock expo-secure-store
const mockStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore[key] = value;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) => {
    return Promise.resolve(mockStore[key] ?? null);
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockStore[key];
    return Promise.resolve();
  }),
}));

const mockPartner: Partner = {
  id: 'partner-1',
  phone: '+919876543210',
  fullName: 'Test Partner',
  approvalStatus: 'APPROVED',
  isOnline: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('Partner Auth Store', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });
    // Clear mock secure store
    Object.keys(mockStore).forEach((key) => delete mockStore[key]);
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have null accessToken and user, not authenticated, and loading', () => {
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(true);
    });
  });

  describe('setToken', () => {
    it('should set the access token and mark as authenticated', () => {
      const { setToken } = useAuthStore.getState();
      setToken('test-token-123');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('test-token-123');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should persist token to secure store', () => {
      const SecureStore = require('expo-secure-store');
      const { setToken } = useAuthStore.getState();
      setToken('test-token-123');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'clenzey_partner_access_token',
        'test-token-123'
      );
    });
  });

  describe('setUser', () => {
    it('should set the user in state', () => {
      const { setUser } = useAuthStore.getState();
      setUser(mockPartner);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockPartner);
      expect(state.user?.approvalStatus).toBe('APPROVED');
    });

    it('should persist user JSON to secure store', () => {
      const SecureStore = require('expo-secure-store');
      const { setUser } = useAuthStore.getState();
      setUser(mockPartner);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'clenzey_partner_user',
        JSON.stringify(mockPartner)
      );
    });
  });

  describe('logout', () => {
    it('should clear all auth state', () => {
      // Set up authenticated state
      useAuthStore.setState({
        accessToken: 'some-token',
        user: mockPartner,
        isAuthenticated: true,
      });

      const { logout } = useAuthStore.getState();
      logout();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should remove keys from secure store', () => {
      const SecureStore = require('expo-secure-store');
      const { logout } = useAuthStore.getState();
      logout();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('clenzey_partner_access_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('clenzey_partner_user');
    });
  });

  describe('hydrate', () => {
    it('should load token and user from secure store and set isAuthenticated', async () => {
      mockStore['clenzey_partner_access_token'] = 'stored-token';
      mockStore['clenzey_partner_user'] = JSON.stringify(mockPartner);

      const { hydrate } = useAuthStore.getState();
      await hydrate();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('stored-token');
      expect(state.user).toEqual(mockPartner);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should set isAuthenticated to false when no token stored', async () => {
      const { hydrate } = useAuthStore.getState();
      await hydrate();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should handle errors gracefully and reset state', async () => {
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockRejectedValueOnce(new Error('Storage error'));

      const { hydrate } = useAuthStore.getState();
      await hydrate();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should handle token without user', async () => {
      mockStore['clenzey_partner_access_token'] = 'token-only';

      const { hydrate } = useAuthStore.getState();
      await hydrate();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('token-only');
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('getToken helper', () => {
    it('should retrieve token from secure store', async () => {
      mockStore['clenzey_partner_access_token'] = 'helper-token';

      const token = await getToken();
      expect(token).toBe('helper-token');
    });

    it('should return null when no token stored', async () => {
      const token = await getToken();
      expect(token).toBeNull();
    });
  });
});
