import { pgTable, foreignKey, unique, serial, integer, varchar, text, boolean, timestamp, uuid, jsonb, index, vector, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const hashtags = pgTable("hashtags", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	tagName: varchar("tag_name", { length: 255 }).notNull(),
	notes: text(),
	isActive: boolean("is_active").default(true).notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
	lastScrapedAt: timestamp("last_scraped_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "hashtags_project_id_projects_id_fk"
		}).onDelete("cascade"),
	unique("project_tag_name_unq").on(table.projectId, table.tagName),
]);

export const parsingRuns = pgTable("parsing_runs", {
	id: serial().primaryKey().notNull(),
	runId: uuid("run_id").notNull(),
	projectId: integer("project_id"),
	sourceType: varchar("source_type", { length: 50 }),
	sourceId: integer("source_id"),
	status: varchar({ length: 50 }).notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	endedAt: timestamp("ended_at", { mode: 'string' }),
	reelsFoundCount: integer("reels_found_count").default(0).notNull(),
	reelsAddedCount: integer("reels_added_count").default(0).notNull(),
	errorsCount: integer("errors_count").default(0).notNull(),
	logMessage: text("log_message"),
	errorDetails: jsonb("error_details"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "parsing_runs_project_id_projects_id_fk"
		}).onDelete("set null"),
	unique("parsing_runs_run_id_unique").on(table.runId),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	authId: text("auth_id"),
	email: text(),
	name: text(),
	avatarUrl: text("avatar_url"),
	telegramId: integer("telegram_id").notNull(),
	username: varchar({ length: 255 }),
	firstName: varchar("first_name", { length: 255 }),
	lastName: varchar("last_name", { length: 255 }),
	subscriptionLevel: varchar("subscription_level", { length: 50 }).default('\'free\'').notNull(),
	subscriptionExpiresAt: timestamp("subscription_expires_at", { mode: 'string' }),
	lastActiveAt: timestamp("last_active_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_auth_id_unique").on(table.authId),
	unique("users_email_unique").on(table.email),
	unique("users_telegram_id_unique").on(table.telegramId),
]);

export const testTable = pgTable("test_table", {
	id: serial().primaryKey().notNull(),
	name: text(),
});

export const projects = pgTable("projects", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	industry: varchar({ length: 255 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "projects_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const competitors = pgTable("competitors", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	username: varchar({ length: 255 }).notNull(),
	profileUrl: text("profile_url").notNull(),
	fullName: varchar("full_name", { length: 255 }),
	notes: text(),
	isActive: boolean("is_active").default(true).notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
	lastScrapedAt: timestamp("last_scraped_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "competitors_project_id_projects_id_fk"
		}).onDelete("cascade"),
	unique("project_username_unq").on(table.projectId, table.username),
]);

export const reels = pgTable("reels", {
	id: serial().primaryKey().notNull(),
	reelUrl: text("reel_url"),
	projectId: integer("project_id").notNull(),
	sourceType: varchar("source_type", { length: 50 }),
	sourceIdentifier: varchar("source_identifier", { length: 255 }),
	profileUrl: text("profile_url"),
	authorUsername: varchar("author_username", { length: 255 }),
	description: text(),
	viewsCount: integer("views_count"),
	likesCount: integer("likes_count"),
	commentsCount: integer("comments_count"),
	publishedAt: timestamp("published_at", { mode: 'string' }),
	audioTitle: varchar("audio_title", { length: 255 }),
	audioArtist: varchar("audio_artist", { length: 255 }),
	thumbnailUrl: text("thumbnail_url"),
	videoDownloadUrl: text("video_download_url"),
	rawData: jsonb("raw_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	transcript: text(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "reels_project_id_projects_id_fk"
		}).onDelete("cascade"),
	unique("reels_reel_url_unique").on(table.reelUrl),
]);

export const transcriptEmbeddings = pgTable("transcript_embeddings", {
	id: serial().primaryKey().notNull(),
	reelId: text("reel_id").notNull(),
	transcript: text().notNull(),
	embedding: vector({ dimensions: 1536 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("transcript_embeddings_embedding_idx").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({lists: "100"}),
	index("transcript_embeddings_reel_id_idx").using("btree", table.reelId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.reelId],
			foreignColumns: [reels.reelUrl],
			name: "transcript_embeddings_reel_id_fkey"
		}).onDelete("cascade"),
]);

export const chatHistory = pgTable("chat_history", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	reelId: text("reel_id").notNull(),
	message: text().notNull(),
	role: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("chat_history_reel_id_idx").using("btree", table.reelId.asc().nullsLast().op("text_ops")),
	index("chat_history_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("chat_history_user_reel_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.reelId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.reelId],
			foreignColumns: [reels.reelUrl],
			name: "chat_history_reel_id_fkey"
		}).onDelete("cascade"),
	check("chat_history_role_check", sql`role = ANY (ARRAY['user'::text, 'assistant'::text])`),
]);
