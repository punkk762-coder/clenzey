import * as SecureStore from 'expo-secure-store';
import { useAuthStore, getToken } from './auth';
import type { Consumer } from '@clenzey/types';

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore> & {
  __resetStore: () => void;
};

const mockUser: Consumer = {
  id: 'user-123',
  phone: '+919876543210',
  fullName: 'Test User',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset Zustand store state
    useAuthStore.setState({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });
    // Reset secure store mock
    mockSecureStore.__resetStore();
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have null accessToken, null user, isAuthenticated false, and isLoading true', () => {
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(true);
    });
  });

  describe('setToken', () => {
    it('should set the access token in store and secure storage', () => {
      useAuthStore.getState().setToken('test-token-abc');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('test-token-abc');
      expect(state.isAuthenticated).toBe(true);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'clenzey_access_token',
        'test-token-abc'
      );
    });
  });

  describe('setUser', () => {
    it('should set the user in store and secure storage', () => {
      useAuthStore.getState().setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'clenzey_user',
        JSON.stringify(mockUser)
      );
    });

    it('should preserve existing profile fields when API response is partial', () => {
      useAuthStore.getState().setUser(mockUser);

      useAuthStore.getState().setUser({
        id: '',
        phone: '',
        fullName: '',
        createdAt: '',
        updatedAt: '2024-06-01T00:00:00Z',
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual({
        ...mockUser,
        updatedAt: '2024-06-01T00:00:00Z',
      });
    });

    it('should apply updated fullName from a partial profile response', () => {
      useAuthStore.setState({ user: { ...mockUser, fullName: '' } });

      useAuthStore.getState().setUser({
        id: '',
        phone: '',
        fullName: 'Updated Name',
        createdAt: '',
        updatedAt: '',
      });

      expect(useAuthStore.getState().user?.fullName).toBe('Updated Name');
      expect(useAuthStore.getState().user?.id).toBe(mockUser.id);
      expect(useAuthStore.getState().user?.phone).toBe(mockUser.phone);
    });
  });

  describe('logout', () => {
    it('should clear all auth state and secure storage', () => {
      // Set up authenticated state
      useAuthStore.setState({
        accessToken: 'some-token',
        user: mockUser,
        isAuthenticated: true,
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'clenzey_access_token'
      );
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'clenzey_user'
      );
    });
  });

  describe('hydrate', () => {
    it('should load token and user from secure storage and set isAuthenticated', async () => {
      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'clenzey_access_token') return Promise.resolve('stored-token');
        if (key === 'clenzey_user') return Promise.resolve(JSON.stringify(mockUser));
        return Promise.resolve(null);
      });

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('stored-token');
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should set isAuthenticated false when no token exists', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should set isLoading false even if secure store throws', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('Storage error'));

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });
});

describe('getToken', () => {
  beforeEach(() => {
    mockSecureStore.__resetStore();
    jest.clearAllMocks();
  });

  it('should read token directly from secure storage', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue('direct-token');

    const token = await getToken();

    expect(token).toBe('direct-token');
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('clenzey_access_token');
  });

  it('should return null when no token is stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const token = await getToken();

    expect(token).toBeNull();
  });
});
