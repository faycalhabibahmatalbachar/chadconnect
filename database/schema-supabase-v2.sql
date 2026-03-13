-- ChadConnect - PostgreSQL Schema for Supabase (Simplified)
-- Version 2 - Sans RLS (utilise service_role pour backend)

-- ============================================
-- CORE AUTH TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone VARCHAR(32) NULL UNIQUE,
    email VARCHAR(255) NULL UNIQUE,
    username VARCHAR(64) NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    display_name VARCHAR(120) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','admin','moderator')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
    preferred_lang VARCHAR(2) NOT NULL DEFAULT 'fr' CHECK (preferred_lang IN ('fr','ar')),
    avatar_url VARCHAR(500) NULL,
    bio TEXT NULL,
    last_seen_at TIMESTAMP NULL,
    followers_count INT NOT NULL DEFAULT 0,
    following_count INT NOT NULL DEFAULT 0,
    posts_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Admin sessions
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_admin_sessions_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- User sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    refresh_token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP NULL,
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ============================================
-- INSTITUTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.institutions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    city VARCHAR(120) NOT NULL,
    country VARCHAR(120) NOT NULL DEFAULT 'Chad',
    created_by_user_id BIGINT NOT NULL,
    validation_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending','approved','rejected')),
    validated_by_user_id BIGINT NULL,
    validated_at TIMESTAMP NULL,
    rejection_reason VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_institutions_created_by FOREIGN KEY (created_by_user_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.classes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id BIGINT NOT NULL,
    name VARCHAR(120) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    created_by_user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_classes_institution FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE,
    CONSTRAINT fk_classes_created_by FOREIGN KEY (created_by_user_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.class_members (
    class_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    member_role VARCHAR(20) NOT NULL CHECK (member_role IN ('student','teacher')),
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (class_id, user_id),
    CONSTRAINT fk_class_members_class FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_class_members_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.planning_goals (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    week_start DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_planning_goals_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ============================================
-- CONTENT / STUDY
-- ============================================

CREATE TABLE IF NOT EXISTS public.subjects (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name_fr VARCHAR(120) NOT NULL,
    name_ar VARCHAR(120) NOT NULL,
    track VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chapters (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subject_id BIGINT NOT NULL,
    title_fr VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_chapters_subject FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chapter_id BIGINT NOT NULL,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('course','summary')),
    content_fr TEXT NULL,
    content_ar TEXT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_lessons_chapter FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE,
    UNIQUE (chapter_id, kind)
);

CREATE TABLE IF NOT EXISTS public.study_progress (
    user_id BIGINT NOT NULL,
    chapter_id BIGINT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, chapter_id),
    CONSTRAINT fk_study_progress_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_study_progress_chapter FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.study_favorites (
    user_id BIGINT NOT NULL,
    chapter_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, chapter_id),
    CONSTRAINT fk_study_favorites_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_study_favorites_chapter FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE
);

-- ============================================
-- REVIEW (SRS)
-- ============================================

CREATE TABLE IF NOT EXISTS public.review_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chapter_id BIGINT NOT NULL,
    item_type VARCHAR(20) NOT NULL DEFAULT 'summary_card' CHECK (item_type IN ('summary_card')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_review_items_chapter FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE,
    UNIQUE (chapter_id, item_type)
);

CREATE TABLE IF NOT EXISTS public.user_review_schedule (
    user_id BIGINT NOT NULL,
    review_item_id BIGINT NOT NULL,
    due_at TIMESTAMP NOT NULL,
    interval_seconds INT NOT NULL DEFAULT 0,
    ease_factor DECIMAL(4,2) NOT NULL DEFAULT 2.50,
    repetitions INT NOT NULL DEFAULT 0,
    lapses INT NOT NULL DEFAULT 0,
    last_reviewed_at TIMESTAMP NULL,
    suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, review_item_id),
    CONSTRAINT fk_user_review_schedule_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_review_schedule_item FOREIGN KEY (review_item_id) REFERENCES public.review_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.review_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    review_item_id BIGINT NOT NULL,
    rating VARCHAR(10) NOT NULL CHECK (rating IN ('again','hard','good','easy')),
    reviewed_at TIMESTAMP NOT NULL,
    due_before TIMESTAMP NULL,
    due_after TIMESTAMP NULL,
    interval_before_seconds INT NOT NULL DEFAULT 0,
    interval_after_seconds INT NOT NULL DEFAULT 0,
    ease_before DECIMAL(4,2) NOT NULL DEFAULT 2.50,
    ease_after DECIMAL(4,2) NOT NULL DEFAULT 2.50,
    reps_before INT NOT NULL DEFAULT 0,
    reps_after INT NOT NULL DEFAULT 0,
    lapses_before INT NOT NULL DEFAULT 0,
    lapses_after INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_review_logs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_logs_item FOREIGN KEY (review_item_id) REFERENCES public.review_items(id) ON DELETE CASCADE
);

-- ============================================
-- SOCIAL
-- ============================================

CREATE TABLE IF NOT EXISTS public.posts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    institution_id BIGINT NULL,
    class_id BIGINT NULL,
    body TEXT NOT NULL,
    media_url VARCHAR(500) NULL,
    media_kind VARCHAR(20) NULL CHECK (media_kind IN ('image','pdf','video')),
    media_mime VARCHAR(120) NULL,
    media_name VARCHAR(200) NULL,
    media_size_bytes INT NULL,
    video_status VARCHAR(20) NULL CHECK (video_status IN ('processing','ready','failed')),
    video_duration_ms INT NULL,
    video_width INT NULL,
    video_height INT NULL,
    video_thumb_url VARCHAR(500) NULL,
    video_hls_url VARCHAR(500) NULL,
    video_variants_json JSONB NULL,
    tags_json JSONB NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','deleted')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_posts_institution FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL,
    CONSTRAINT fk_posts_class FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.comments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_comment_id BIGINT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','deleted')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.comment_likes (
    comment_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id),
    CONSTRAINT fk_comment_likes_comment FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_likes_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.post_likes (
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id),
    CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.post_reactions (
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reaction VARCHAR(20) NOT NULL CHECK (reaction IN ('like','love','haha','wow','sad','angry')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id),
    CONSTRAINT fk_post_reactions_post FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_reactions_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.post_bookmarks (
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id),
    CONSTRAINT fk_post_bookmarks_post FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_bookmarks_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.video_uploads (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    upload_id CHAR(36) NOT NULL UNIQUE,
    original_path VARCHAR(700) NOT NULL,
    original_mime VARCHAR(120) NULL,
    original_size_bytes BIGINT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'init' CHECK (status IN ('init','uploaded','processing','ready','failed')),
    error_message VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_video_uploads_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL DEFAULT 'unknown' CHECK (platform IN ('android','ios','web','unknown')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user_push_tokens_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.reports (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reporter_user_id BIGINT NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post','comment','user')),
    target_id BIGINT NOT NULL,
    reason VARCHAR(200) NOT NULL,
    details TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','rejected')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ============================================
-- HASHTAGS & TAGS
-- ============================================

CREATE TABLE IF NOT EXISTS public.tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_tags (
    post_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, tag_id),
    CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_tags_tag FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE
);

-- ============================================
-- USER FOLLOWS
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_follows (
    follower_id BIGINT NOT NULL,
    following_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT fk_user_follows_follower FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_follows_following FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT chk_user_follows_not_self CHECK (follower_id <> following_id)
);

-- ============================================
-- MENTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.mentions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mentioned_user_id BIGINT NOT NULL,
    mentioner_user_id BIGINT NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('post','comment')),
    entity_id BIGINT NOT NULL,
    position_start INT NOT NULL,
    position_end INT NOT NULL,
    seen_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_mentions_mentioned FOREIGN KEY (mentioned_user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_mentions_mentioner FOREIGN KEY (mentioner_user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('inapp','push','sms')),
    title VARCHAR(160) NOT NULL,
    body VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
    scheduled_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    data_json JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id BIGINT NOT NULL PRIMARY KEY,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    follow_notify BOOLEAN NOT NULL DEFAULT TRUE,
    mention_notify BOOLEAN NOT NULL DEFAULT TRUE,
    like_notify BOOLEAN NOT NULL DEFAULT TRUE,
    comment_notify BOOLEAN NOT NULL DEFAULT TRUE,
    review_notify BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notification_prefs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.sms_queue (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    to_phone VARCHAR(32) NOT NULL,
    message VARCHAR(500) NOT NULL,
    priority INT NOT NULL DEFAULT 5,
    provider VARCHAR(60) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
    try_count INT NOT NULL DEFAULT 0,
    last_error VARCHAR(255) NULL,
    scheduled_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP NULL
);

-- ============================================
-- MONETIZATION
-- ============================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    store VARCHAR(20) NOT NULL CHECK (store IN ('google_play','app_store')),
    product_id VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active','expired','canceled')),
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.ad_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('impression','click')),
    placement VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- GRANT PERMISSIONS FOR SERVICE ROLE
-- ============================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
