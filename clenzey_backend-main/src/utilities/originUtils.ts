export const normalizeOrigin = (origin: string): string => {
  const trimmed = origin.trim();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const DEV_TUNNEL_PATTERNS = [
  /^https:\/\/[\w-]+\.ngrok-free\.dev$/,
  /^https:\/\/[\w-]+\.ngrok-free\.app$/,
  /^https:\/\/[\w-]+\.ngrok\.io$/,
];

export const isDevTunnelOrigin = (origin: string): boolean => {
  const normalized = normalizeOrigin(origin);
  return DEV_TUNNEL_PATTERNS.some((pattern) => pattern.test(normalized));
};
