import type { Consumer } from '@clenzey/types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/**
 * Normalizes consumer profile API responses.
 * Supports `{ consumer: Consumer }`, `{ data: { consumer } }`, and plain `Consumer`.
 */
export function normalizeConsumer(value: unknown): Consumer {
  const record = asRecord(value);
  if (!record) {
    return {
      id: '',
      phone: '',
      fullName: '',
      createdAt: '',
      updatedAt: '',
    };
  }

  // Axios response shape (status + data) — unwrap and retry
  if ('data' in record && ('status' in record || 'headers' in record)) {
    return normalizeConsumer(record.data);
  }

  let consumerRecord = record;

  if (asRecord(record.consumer)) {
    consumerRecord = asRecord(record.consumer)!;
  } else if (asRecord(record.data)) {
    const data = asRecord(record.data)!;
    consumerRecord = asRecord(data.consumer) ?? data;
  }

  return {
    id: String(consumerRecord.id ?? ''),
    phone: String(consumerRecord.phone ?? ''),
    fullName: String(consumerRecord.fullName ?? ''),
    createdAt: String(consumerRecord.createdAt ?? ''),
    updatedAt: String(consumerRecord.updatedAt ?? ''),
  };
}
