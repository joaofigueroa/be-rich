import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const workspaceTypeEnum = pgEnum("workspace_type", ["PERSONAL", "FAMILY"]);
export const workspaceRoleEnum = pgEnum("workspace_role", ["OWNER", "EDITOR"]);
export const inviteStatusEnum = pgEnum("invite_status", [
  "PENDING",
  "ACCEPTED",
  "REVOKED",
  "EXPIRED",
]);

const uuidV7 = (name: string) => uuid(name).default(sql`uuid_generate_v7()`).primaryKey();
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuidV7("id"),
    name: text("name").notNull(),
    type: workspaceTypeEnum("type").notNull(),
    baseCurrency: text("base_currency").default("BRL").notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("workspaces_owner_id_idx").on(table.ownerId)],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("workspace_members_workspace_user_idx").on(table.workspaceId, table.userId),
    index("workspace_members_user_id_idx").on(table.userId),
  ],
);

export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    role: workspaceRoleEnum("role").default("EDITOR").notNull(),
    status: inviteStatusEnum("status").default("PENDING").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    acceptedBy: uuid("accepted_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workspace_invites_token_idx").on(table.tokenHash),
    index("workspace_invites_workspace_id_idx").on(table.workspaceId),
    index("workspace_invites_invited_by_idx").on(table.invitedBy),
    index("workspace_invites_accepted_by_idx").on(table.acceptedBy),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_events_workspace_id_idx").on(table.workspaceId),
    index("audit_events_actor_id_idx").on(table.actorId),
  ],
);
