import { envConfig } from "./environmentConfig.ts";

export const dispatchConfig = {
  escalationMin: envConfig.DISPATCH_ESCALATION_MIN,
  initialRadiusM: envConfig.DISPATCH_INITIAL_RADIUS_M,
  locationStaleMin: envConfig.DISPATCH_LOCATION_STALE_MIN,
  maxDailyCapacity: envConfig.DISPATCH_MAX_DAILY_CAPACITY,
  maxRadiusM: envConfig.DISPATCH_MAX_RADIUS_M,
  radiusIncrementM: envConfig.DISPATCH_RADIUS_INCREMENT_M,
  redispatchIntervalSec: envConfig.DISPATCH_REDIRECT_INTERVAL_SEC,
  revalidateLeadMin: envConfig.DISPATCH_REVALIDATE_LEAD_MIN,
  scheduledDispatchCron: envConfig.SCHEDULED_DISPATCH_CRON,
  scheduledCatchupHours: envConfig.DISPATCH_SCHEDULED_CATCHUP_HOURS,
};

export const SCORE_WEIGHTS = {
  distance: 0.5,
  rating: 0.3,
  workload: 0.2,
} as const;

export const DEFAULT_RATING = 3;
