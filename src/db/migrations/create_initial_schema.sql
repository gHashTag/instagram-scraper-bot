-- Initial schema for Instagram Scraper Bot
-- This creates all necessary tables for the application

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id TEXT UNIQUE,
    email TEXT UNIQUE,
    name TEXT,
    avatar_url TEXT,
    telegram_id INTEGER NOT NULL UNIQUE,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    subscription_level VARCHAR(50) DEFAULT 'free' NOT NULL,
    subscription_expires_at TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(255),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Competitors table
CREATE TABLE IF NOT EXISTS competitors (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    profile_url TEXT NOT NULL,
    full_name VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    added_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_scraped_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(project_id, username)
);

-- Hashtags table
CREATE TABLE IF NOT EXISTS hashtags (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tag_name VARCHAR(255) NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    added_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_scraped_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(project_id, tag_name)
);

-- Reels table
CREATE TABLE IF NOT EXISTS reels (
    id SERIAL PRIMARY KEY,
    reel_url TEXT UNIQUE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_type VARCHAR(50),
    source_identifier VARCHAR(255),
    profile_url TEXT,
    author_username VARCHAR(255),
    description TEXT,
    views_count INTEGER,
    likes_count INTEGER,
    comments_count INTEGER,
    published_at TIMESTAMP,
    audio_title VARCHAR(255),
    audio_artist VARCHAR(255),
    thumbnail_url TEXT,
    video_download_url TEXT,
    transcript TEXT,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Parsing runs table
CREATE TABLE IF NOT EXISTS parsing_runs (
    id SERIAL PRIMARY KEY,
    run_id UUID NOT NULL UNIQUE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    source_type VARCHAR(50),
    source_id INTEGER,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP DEFAULT NOW() NOT NULL,
    ended_at TIMESTAMP,
    reels_found_count INTEGER DEFAULT 0 NOT NULL,
    reels_added_count INTEGER DEFAULT 0 NOT NULL,
    errors_count INTEGER DEFAULT 0 NOT NULL,
    log_message TEXT,
    error_details JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Test table (if needed)
CREATE TABLE IF NOT EXISTS test_table (
    id SERIAL PRIMARY KEY,
    name TEXT
);

-- Insert default user and project for testing
INSERT INTO users (telegram_id, username, first_name, subscription_level) 
VALUES (144022504, 'playra', 'Dmitrii', 'premium')
ON CONFLICT (telegram_id) DO NOTHING;

INSERT INTO projects (user_id, name, description, industry)
SELECT id, 'Coco Age', 'Aesthetic medicine and beauty content analysis', 'Beauty & Wellness'
FROM users WHERE telegram_id = 144022504
ON CONFLICT DO NOTHING;
