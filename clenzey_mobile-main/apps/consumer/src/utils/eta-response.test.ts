import {
  estimateTravelMinutes,
  formatEtaMinutes,
  isEtaUnavailableError,
  normalizeEtaResponse,
} from './eta-response';

describe('normalizeEtaResponse', () => {
  it('unwraps direct etaMinutes payloads', () => {
    expect(normalizeEtaResponse({ etaMinutes: 8 })).toEqual({ etaMinutes: 8 });
  });

  it('unwraps nested data payloads', () => {
    expect(normalizeEtaResponse({ data: { etaMinutes: 12 } })).toEqual({ etaMinutes: 12 });
  });

  it('throws for invalid payloads', () => {
    expect(() => normalizeEtaResponse(null)).toThrow('Invalid ETA response');
  });
});

describe('formatEtaMinutes', () => {
  it('formats rounded minute values', () => {
    expect(formatEtaMinutes(7.2)).toBe('~7 min');
    expect(formatEtaMinutes(1)).toBe('~1 min');
    expect(formatEtaMinutes(0.2)).toBe('~1 min');
  });
});

describe('isEtaUnavailableError', () => {
  it('returns true for pending ETA 404 responses', () => {
    expect(
      isEtaUnavailableError({
        success: false,
        message: 'ETA not yet calculated for this booking',
        statusCode: 404,
        code: 'NOT_FOUND_ERROR',
      }),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(
      isEtaUnavailableError({
        success: false,
        message: 'Unauthorized',
        statusCode: 401,
      }),
    ).toBe(false);
  });
});

describe('estimateTravelMinutes', () => {
  it('returns at least one minute for nearby coordinates', () => {
    const eta = estimateTravelMinutes(12.9716, 77.5946, 12.9816, 77.6046);
    expect(eta).toBeGreaterThanOrEqual(1);
  });
});
