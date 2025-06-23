import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const testTable = pgTable("test_table", {
  id: serial("id").primaryKey(),
  name: text("name"),
});

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authId: text("auth_id").unique(),
  email: text("email").unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  telegram_id: integer("telegram_id").notNull().unique(),
  username: varchar("username", { length: 255 }),
  first_name: varchar("first_name", { length: 255 }),
  last_name: varchar("last_name", { length: 255 }),
  subscription_level: varchar("subscription_level", { length: 50 })
    .default("'free'")
    .notNull(),
  subscription_expires_at: timestamp("subscription_expires_at"),
  last_active_at: timestamp("last_active_at").defaultNow(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  industry: varchar("industry", { length: 255 }),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// New tables for Instagram Scraper Bot

export const competitorsTable = pgTable(
  "competitors",
  {
    id: serial("id").primaryKey(),
    project_id: integer("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 255 }).notNull(),
    profile_url: text("profile_url").notNull(),
    full_name: varchar("full_name", { length: 255 }),
    notes: text("notes"),
    is_active: boolean("is_active").default(true).notNull(),
    added_at: timestamp("added_at").defaultNow().notNull(),
    last_scraped_at: timestamp("last_scraped_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      projectUsernameUnq: unique("project_username_unq").on(
        table.project_id,
        table.username
      ),
    };
  }
);

export const hashtagsTable = pgTable(
  "hashtags",
  {
    id: serial("id").primaryKey(),
    project_id: integer("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    tag_name: varchar("tag_name", { length: 255 }).notNull(),
    notes: text("notes"),
    is_active: boolean("is_active").default(true).notNull(),
    added_at: timestamp("added_at").defaultNow().notNull(),
    last_scraped_at: timestamp("last_scraped_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      projectTagNameUnq: unique("project_tag_name_unq").on(
        table.project_id,
        table.tag_name
      ),
    };
  }
);

export const reelsTable = pgTable("reels", {
  id: serial("id").primaryKey(),
  reel_url: text("reel_url").unique(),
  project_id: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  source_type: varchar("source_type", { length: 50 }),
  source_identifier: varchar("source_identifier", { length: 255 }),
  profile_url: text("profile_url"),
  author_username: varchar("author_username", { length: 255 }),
  description: text("description"),
  views_count: integer("views_count"),
  likes_count: integer("likes_count"),
  comments_count: integer("comments_count"),
  published_at: timestamp("published_at"),
  audio_title: varchar("audio_title", { length: 255 }),
  audio_artist: varchar("audio_artist", { length: 255 }),
  thumbnail_url: text("thumbnail_url"),
  video_download_url: text("video_download_url"),
  transcript: text("transcript"), // Транскрипция аудио из видео
  raw_data: jsonb("raw_data"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const parsingRunsTable = pgTable("parsing_runs", {
  id: serial("id").primaryKey(),
  run_id: uuid("run_id").notNull().unique(),
  project_id: integer("project_id").references(() => projectsTable.id, {
    onDelete: "set null",
  }), // или cascade, если нужно удалять логи при удалении проекта
  source_type: varchar("source_type", { length: 50 }), // e.g., 'competitor', 'hashtag', 'overall'
  source_id: integer("source_id"), // FK to competitorsTable.id or hashtagsTable.id, or null if 'overall'
  status: varchar("status", { length: 50 }).notNull(), // e.g., 'started', 'running', 'completed', 'failed'
  started_at: timestamp("started_at").defaultNow().notNull(),
  ended_at: timestamp("ended_at"),
  reels_found_count: integer("reels_found_count").default(0).notNull(),
  reels_added_count: integer("reels_added_count").default(0).notNull(),
  errors_count: integer("errors_count").default(0).notNull(),
  log_message: text("log_message"),
  error_details: jsonb("error_details"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const similarUsersTable = pgTable("similar_users", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  source_username: varchar("source_username", { length: 255 }).notNull(), // Исходный пользователь для поиска похожих
  username: varchar("username", { length: 255 }).notNull(),
  user_id: varchar("user_id", { length: 255 }),
  full_name: varchar("full_name", { length: 255 }),
  biography: text("biography"),
  profile_pic_url: text("profile_pic_url"),
  profile_pic_url_hd: text("profile_pic_url_hd"),
  is_private: boolean("is_private").default(false),
  is_verified: boolean("is_verified").default(false),
  is_business_account: boolean("is_business_account").default(false),
  is_joined_recently: boolean("is_joined_recently").default(false),
  is_professional_account: boolean("is_professional_account").default(false),
  followers_count: integer("followers_count"),
  following_count: integer("following_count"),
  posts_count: integer("posts_count"),
  external_url: text("external_url"),
  business_category_name: varchar("business_category_name", { length: 255 }),
  category_name: varchar("category_name", { length: 255 }),
  similarity_score: integer("similarity_score"), // Оценка схожести (если предоставляется API)
  mutual_followers_count: integer("mutual_followers_count"),
  mutual_following_count: integer("mutual_following_count"),
  raw_data: jsonb("raw_data"), // Полные данные от API
  scraped_at: timestamp("scraped_at").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => {
  return {
    projectUsernameUnq: unique("similar_users_project_username_unq").on(
      table.project_id,
      table.username
    ),
  };
});

export const rapidApiLogsTable = pgTable("rapid_api_logs", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id")
    .references(() => projectsTable.id, { onDelete: "set null" }),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  username_or_id: varchar("username_or_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // 'success', 'error', 'rate_limited'
  response_code: integer("response_code"),
  response_time_ms: integer("response_time_ms"),
  users_found: integer("users_found").default(0),
  users_saved: integer("users_saved").default(0),
  error_message: text("error_message"),
  raw_response: jsonb("raw_response"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
