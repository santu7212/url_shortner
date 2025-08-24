// import { relations } from "drizzle-orm";
// import {  boolean, text, timestamp } from "drizzle-orm/gel-core";
// import { int, mysqlTable, varchar,sql } from "drizzle-orm/mysql-core";

import { relations,sql } from "drizzle-orm";
import { boolean, text, timestamp, int, mysqlTable, varchar, mysqlEnum } from "drizzle-orm/mysql-core";



export const shortLinkTable = mysqlTable("short_link", {
  id: int().autoincrement().primaryKey(),
  url: varchar({ length: 255 }).notNull(),
  shortCode: varchar("short_code", { length: 20 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: int("user_id")
    .notNull()
    .references(() => usersTable.id),
});

export const sessionTable = mysqlTable("sessions", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  valid: boolean().default(true).notNull(),
  userAgent: text("user_agent"),
  ip: varchar({ length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const verifyEmailTokensTable=mysqlTable("is_email_valid",{
  id:int().autoincrement().primaryKey(),
  userId:int("user_id").notNull().references(()=>usersTable.id,{onDelete:"cascade"}),
  token: varchar({length:8}).notNull(),
   expiresAt: timestamp("expires_at")
    // The brackets inside sql`` is necessary here, otherwise you would get syntax error.
    .default(sql`(CURRENT_TIMESTAMP + INTERVAL 1 DAY)`)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),

});
 


export const passwordResetTokensTable = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at")
    .default(sql`(CURRENT_TIMESTAMP + INTERVAL 1 HOUR)`)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});



export const oauthAccountsTable = mysqlTable("oauth_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  provider: mysqlEnum("provider", ["google", "github"]).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 })
    .notNull()
    .unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersTable = mysqlTable("users", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }),
  avatarUrl:text("avatar_url"),
  isEmailValid: boolean("is_email_valid").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A user can have many short Links
export const userRealtion = relations(usersTable, ({ many }) => ({
  shortLink: many(shortLinkTable),
  session: many(sessionTable),
}));

//  A short link belon to a user
export const shortLinksRelation = relations(shortLinkTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [shortLinkTable.userId], //forign key
    references: [usersTable.id],
  }),
}));

export const sessionsRelation = relations(sessionTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionTable.userId],
    references: [usersTable.id],
  }),
}));
