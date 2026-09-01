import type { DisputeCategory, DisputeStatus } from '@clenzey/types';
import { colors } from '@clenzey/design-system';

const STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under Review',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const STATUS_COLORS: Record<DisputeStatus, string> = {
  OPEN: '#F59E0B',
  UNDER_REVIEW: '#2563EB',
  RESOLVED: colors.success,
  CLOSED: colors.textSecondary,
};

const CATEGORY_LABELS: Record<DisputeCategory, string> = {
  SERVICE_QUALITY: 'Service Quality',
  PRICING: 'Pricing',
  DAMAGE: 'Damage',
  NO_SHOW: 'No Show',
  OTHER: 'Other',
};

export const DISPUTE_CATEGORIES: Array<{ value: DisputeCategory; label: string }> = [
  { value: 'SERVICE_QUALITY', label: CATEGORY_LABELS.SERVICE_QUALITY },
  { value: 'PRICING', label: CATEGORY_LABELS.PRICING },
  { value: 'DAMAGE', label: CATEGORY_LABELS.DAMAGE },
  { value: 'NO_SHOW', label: CATEGORY_LABELS.NO_SHOW },
  { value: 'OTHER', label: CATEGORY_LABELS.OTHER },
];

export function getDisputeStatusLabel(status: DisputeStatus | string): string {
  const known = STATUS_LABELS[status as DisputeStatus];
  if (known) return known;

  return String(status)
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export function getDisputeStatusColor(status: DisputeStatus | string): string {
  return STATUS_COLORS[status as DisputeStatus] ?? colors.textSecondary;
}

export function getDisputeCategoryLabel(category: DisputeCategory | string): string {
  return CATEGORY_LABELS[category as DisputeCategory] ?? String(category);
}

export function isResolvedDisputeStatus(status: DisputeStatus | string): boolean {
  return status === 'RESOLVED' || status === 'CLOSED';
}
