import type { Consumer } from './consumer';
import type { Partner } from './partner';

export interface InitiateResponse {
  token: string;
}

export interface ValidateResponse {
  accessToken: string;
  isNewUser?: boolean;
  user: Consumer | Partner;
}

export interface RefreshResponse {
  accessToken: string;
}
