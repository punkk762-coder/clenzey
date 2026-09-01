const values = new Map<string, number>();

export const memoryCooldownStore = {
  async get(key: string) {
    const value = values.get(key);

    return value ?? null;
  },
  async set(key: string, value: number, ttlMs: number) {
    values.set(key, value);

    setTimeout(() => {
      values.delete(key);
    }, ttlMs).unref();
  },
};
