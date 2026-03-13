-- ChadConnect - PostgreSQL Functions for Supabase
-- Exécuter APRÈS le schéma

-- ============================================
-- HELPER FUNCTION FOR updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- USER COUNTER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION increment_posts_count(user_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET posts_count = posts_count + 1 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_posts_count(user_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET posts_count = GREATEST(posts_count - 1, 0) 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_followers_count(user_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET followers_count = followers_count + 1 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_followers_count(user_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET followers_count = GREATEST(followers_count - 1, 0) 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_following_count(user_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET following_count = following_count + 1 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_following_count(user_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET following_count = GREATEST(following_count - 1, 0) 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================

DROP TRIGGER IF EXISTS users_updated_at_trigger ON public.users;
CREATE TRIGGER users_updated_at_trigger
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS institutions_updated_at_trigger ON public.institutions;
CREATE TRIGGER institutions_updated_at_trigger
    BEFORE UPDATE ON public.institutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS planning_goals_updated_at_trigger ON public.planning_goals;
CREATE TRIGGER planning_goals_updated_at_trigger
    BEFORE UPDATE ON public.planning_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS lessons_updated_at_trigger ON public.lessons;
CREATE TRIGGER lessons_updated_at_trigger
    BEFORE UPDATE ON public.lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS study_progress_updated_at_trigger ON public.study_progress;
CREATE TRIGGER study_progress_updated_at_trigger
    BEFORE UPDATE ON public.study_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS user_review_schedule_updated_at_trigger ON public.user_review_schedule;
CREATE TRIGGER user_review_schedule_updated_at_trigger
    BEFORE UPDATE ON public.user_review_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS video_uploads_updated_at_trigger ON public.video_uploads;
CREATE TRIGGER video_uploads_updated_at_trigger
    BEFORE UPDATE ON public.video_uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS user_push_tokens_updated_at_trigger ON public.user_push_tokens;
CREATE TRIGGER user_push_tokens_updated_at_trigger
    BEFORE UPDATE ON public.user_push_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS notification_preferences_updated_at_trigger ON public.notification_preferences;
CREATE TRIGGER notification_preferences_updated_at_trigger
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
