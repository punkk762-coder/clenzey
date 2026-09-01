import { customType, timestamp } from "drizzle-orm/pg-core";

export const timestamps = {
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
};

export const geographyPoint = customType<{ data: string }>({
  dataType() {
    return "geography";
  },
});

export const geographyPolygon = customType<{ data: string }>({
  dataType() {
    return "geography";
  },
});
