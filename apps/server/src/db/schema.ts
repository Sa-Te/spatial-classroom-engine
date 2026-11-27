import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const appMeta = pgTable('app_meta', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
