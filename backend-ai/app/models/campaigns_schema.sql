CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(30) NOT NULL,     -- 'poll', 'survey', 'quiz', 'rating', 'spin_wheel'
    reward_type VARCHAR(30),                -- 'coupon', 'points', 'free_sample', 'none'
    reward_value TEXT,                      -- e.g. '10% off', '₹100 credit'
    target_context VARCHAR(50) DEFAULT 'global',  -- 'global', 'home', 'category:Moisturizer', 'product:15'
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE campaign_questions (
    id SERIAL PRIMARY KEY,
    campaign_id INT REFERENCES campaigns(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL,     -- 'single_choice', 'multi_choice', 'rating', 'text'
    options JSONB,                          -- e.g. ["Dry","Oily","Combination"]
    order_index INT DEFAULT 0
);

CREATE TABLE campaign_responses (
    id SERIAL PRIMARY KEY,
    campaign_id INT REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    question_id INT REFERENCES campaign_questions(id),
    answer TEXT,
    submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE campaign_participation (
    id SERIAL PRIMARY KEY,
    campaign_id INT REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    completed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(campaign_id, user_id)
);


-- ============================================
-- BEAUTY MATCH GAME — Schema Extension
-- Plugs into existing campaigns engine
-- ============================================

-- Register 'memory_match' as a campaign_type value (no enum constraint exists,
-- so this is just a convention — campaigns.campaign_type = 'memory_match')

-- Master data: game-specific config for a campaign of type 'memory_match'
CREATE TABLE game_card_sets (
    id SERIAL PRIMARY KEY,
    campaign_id INT UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
    mode VARCHAR(30) NOT NULL DEFAULT 'product_concern',
        -- 'ingredient_benefit' | 'product_concern' | 'shade_match'
    pair_count INT NOT NULL DEFAULT 8        -- 8 pairs = 16 cards
);

-- Master data: individual card pairs within a set
CREATE TABLE game_card_pairs (
    id SERIAL PRIMARY KEY,
    card_set_id INT REFERENCES game_card_sets(id) ON DELETE CASCADE,
    card_a_label TEXT NOT NULL,       -- product name or image_url
    card_a_type VARCHAR(20) NOT NULL DEFAULT 'text',  -- 'text' | 'image'
    card_b_label TEXT NOT NULL,       -- concern / benefit / ingredient text
    product_id INT REFERENCES products(id),
    display_order INT DEFAULT 0
);

-- Master data: tiered performance rewards (optional layer on top of
-- campaigns.reward_type/reward_value, which covers the flat/default reward)
CREATE TABLE game_reward_rules (
    id SERIAL PRIMARY KEY,
    card_set_id INT REFERENCES game_card_sets(id) ON DELETE CASCADE,
    rule_type VARCHAR(30) NOT NULL,   -- 'under_par_moves' | 'under_time' | 'completion'
    threshold_value INT,              -- max moves or max seconds
    reward_type VARCHAR(30),          -- 'coupon' | 'points' | 'free_sample' (mirrors campaigns.reward_type)
    reward_value TEXT,                -- e.g. '15% off', '₹100 credit'
    priority INT DEFAULT 0            -- higher priority wins if multiple thresholds met
);

-- Transactional: per-play stats (campaign_participation only stores completed_at,
-- not moves/time, so this captures the game-specific detail)
CREATE TABLE game_sessions (
    id SERIAL PRIMARY KEY,
    campaign_id INT REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    moves_taken INT NOT NULL,
    time_taken_seconds INT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    reward_rule_id INT REFERENCES game_reward_rules(id),
    reward_issued_value TEXT,         -- snapshot of what was actually granted
    played_at TIMESTAMP DEFAULT NOW()
);

-- Transactional: streak tracking (reusable across any campaign_type, not just this game)
CREATE TABLE user_game_streaks (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_played_date DATE,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_card_pairs_set ON game_card_pairs(card_set_id);
CREATE INDEX idx_sessions_campaign ON game_sessions(campaign_id, played_at DESC);
CREATE INDEX idx_sessions_user ON game_sessions(user_id, played_at DESC);

-- === Skin Twin campaign tables ===

CREATE TABLE IF NOT EXISTS product_tags (
    product_id INT PRIMARY KEY REFERENCES products(id),
    skin_types TEXT[] NOT NULL,
    concerns TEXT[] NOT NULL,
    sensitivity_safe BOOLEAN NOT NULL,
    texture VARCHAR(20),
    tagged_at TIMESTAMP DEFAULT NOW(),
    tag_source VARCHAR(20) DEFAULT 'ai'
);

CREATE INDEX IF NOT EXISTS idx_product_tags_skin_types ON product_tags USING GIN (skin_types);
CREATE INDEX IF NOT EXISTS idx_product_tags_concerns ON product_tags USING GIN (concerns);

CREATE TABLE IF NOT EXISTS skin_profiles (
    profile_hash VARCHAR(64) PRIMARY KEY,
    skin_type VARCHAR(20) NOT NULL,
    concerns TEXT[] NOT NULL,
    ai_blurb TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_responses (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    campaign_id INT REFERENCES campaigns(id),
    answers JSONB,
    profile_hash VARCHAR(64) REFERENCES skin_profiles(profile_hash),
    created_at TIMESTAMP DEFAULT NOW()
);

-- === Mood Ritual campaign tables ===

CREATE TABLE IF NOT EXISTS mood_ritual_moods (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    subtext VARCHAR(150),
    emoji VARCHAR(10),
    relevant_categories TEXT[] NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mood_ritual_checkins (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    campaign_id INT REFERENCES campaigns(id) ON DELETE CASCADE,
    mood_slug VARCHAR(50) REFERENCES mood_ritual_moods(slug),
    resolved_products JSONB NOT NULL,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, campaign_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_mood_ritual_checkins_user_date
    ON mood_ritual_checkins (user_id, checkin_date DESC);