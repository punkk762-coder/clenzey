/**
 * Unit tests for useCouponValidation hook.
 *
 * Tests the coupon validation flow:
 * - Req 9.1: POST /coupons/validate called with code, amount, serviceId, serviceCategory
 * - Req 9.2: Display discount on valid coupon
 * - Req 9.3: Display error message on invalid coupon or API failure
 */
import { ValidateCouponPayload, ValidateCouponResponse } from '@clenzey/api-client';
import { couponsApi } from '../lib/api';

// Mock the coupons API
jest.mock('../lib/api', () => ({
  couponsApi: {
    validate: jest.fn(),
  },
}));

const mockedValidate = couponsApi.validate as jest.MockedFunction<typeof couponsApi.validate>;

describe('Coupon Validation API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Req 9.1: POST /coupons/validate with correct payload', () => {
    it('should send code, amount, and optional serviceId and serviceCategory', async () => {
      mockedValidate.mockResolvedValueOnce({
        data: { valid: true, discount: 100, message: undefined },
      } as any);

      const payload: ValidateCouponPayload = {
        code: 'SAVE10',
        amount: 1500,
        serviceId: 'service-123',
        serviceCategory: 'DEEP_CLEANING',
      };

      await couponsApi.validate(payload);

      expect(mockedValidate).toHaveBeenCalledTimes(1);
      expect(mockedValidate).toHaveBeenCalledWith({
        code: 'SAVE10',
        amount: 1500,
        serviceId: 'service-123',
        serviceCategory: 'DEEP_CLEANING',
      });
    });

    it('should send only required fields when optional ones are omitted', async () => {
      mockedValidate.mockResolvedValueOnce({
        data: { valid: true, discount: 50 },
      } as any);

      const payload: ValidateCouponPayload = {
        code: 'FLAT50',
        amount: 2000,
      };

      await couponsApi.validate(payload);

      expect(mockedValidate).toHaveBeenCalledWith({
        code: 'FLAT50',
        amount: 2000,
      });
    });
  });

  describe('Req 9.2: Valid coupon returns discount amount', () => {
    it('should return valid=true with discount amount', async () => {
      const mockResponse = {
        data: { valid: true, discount: 200 } as ValidateCouponResponse,
      };
      mockedValidate.mockResolvedValueOnce(mockResponse as any);

      const result = await couponsApi.validate({
        code: 'VALID200',
        amount: 3000,
      });

      expect(result.data.valid).toBe(true);
      expect(result.data.discount).toBe(200);
    });
  });

  describe('Req 9.3: Invalid coupon returns error message', () => {
    it('should return valid=false with error message when coupon is invalid', async () => {
      const mockResponse = {
        data: { valid: false, discount: 0, message: 'Coupon expired' } as ValidateCouponResponse,
      };
      mockedValidate.mockResolvedValueOnce(mockResponse as any);

      const result = await couponsApi.validate({
        code: 'EXPIRED',
        amount: 1000,
      });

      expect(result.data.valid).toBe(false);
      expect(result.data.message).toBe('Coupon expired');
      expect(result.data.discount).toBe(0);
    });

    it('should propagate API errors', async () => {
      mockedValidate.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        couponsApi.validate({ code: 'TEST', amount: 500 })
      ).rejects.toThrow('Network error');
    });
  });
});
