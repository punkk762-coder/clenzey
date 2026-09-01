/** Backend list endpoints reject limits above 100. */
export const API_MAX_PAGE_SIZE = 100;
export function toApiDateRange(filter: {
  startDate?: string;
  endDate?: string;
}): { dateFrom?: string; dateTo?: string } {
  return {
    ...(filter.startDate && { dateFrom: filter.startDate }),
    ...(filter.endDate && { dateTo: filter.endDate }),
  };
}

/** Map analytics date params (startDate/endDate → dateFrom/dateTo). */
export function toAnalyticsDateParams(params: {
  startDate: string;
  endDate: string;
}): { dateFrom: string; dateTo: string } {
  return { dateFrom: params.startDate, dateTo: params.endDate };
}
