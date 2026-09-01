import { AxiosInstance } from 'axios';
import { Consumer } from '@clenzey/types';

/**
 * Payload for updating consumer profile.
 */
export interface UpdateConsumerProfilePayload {
  fullName: string;
}

/**
 * Creates the consumers endpoint module.
 *
 * Provides typed methods for consumer profile management:
 * - getProfile: Fetch the current consumer's profile
 * - updateProfile: Update the consumer's profile (e.g., fullName)
 */
export function createConsumersEndpoints(client: AxiosInstance) {
  return {
    /** GET /api/v1/consumers/me — Get consumer profile */
    getProfile: () => client.get<Consumer>('/api/v1/consumers/me'),

    /** PATCH /api/v1/consumers/me — Update consumer profile */
    updateProfile: (data: UpdateConsumerProfilePayload) =>
      client.patch<Consumer>('/api/v1/consumers/me', data),
  };
}
