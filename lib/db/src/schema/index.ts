import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serversTable = pgTable("servers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  transferCode: text("transfer_code"),
  transferCodeExpiry: timestamp("transfer_code_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serverMembersTable = pgTable("server_members", {
  serverId: text("server_id").notNull().references(() => serversTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userColor: text("user_color"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const messagesTable = pgTable("messages", {
  id: text("id").primaryKey(),
  serverId: text("server_id").notNull().references(() => serversTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userColor: text("user_color"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const presenceTable = pgTable("presence", {
  serverId: text("server_id").notNull().references(() => serversTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userColor: text("user_color"),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
});

export const typingTable = pgTable("typing", {
  serverId: text("server_id").notNull().references(() => serversTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  isTyping: boolean("is_typing").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertServerSchema = createInsertSchema(serversTable);
export const insertMessageSchema = createInsertSchema(messagesTable);
export const insertPresenceSchema = createInsertSchema(presenceTable);
export const insertTypingSchema = createInsertSchema(typingTable);

export type Server = typeof serversTable.$inferSelect;
export type ServerMember = typeof serverMembersTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
export type Presence = typeof presenceTable.$inferSelect;
export type Typing = typeof typingTable.$inferSelect;
