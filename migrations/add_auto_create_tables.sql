-- Migration: Add Auto Create Quiz tables and fields
-- Created: 2025-01-26

-- Add new fields to existing quizzes table
ALTER TABLE quizzes 
ADD COLUMN is_auto_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN source_type TEXT,
ADD COLUMN original_content TEXT,
ADD COLUMN ai_model TEXT,
ADD COLUMN generation_metadata JSONB;

-- Create auto_create_usage table for rate limiting
CREATE TABLE IF NOT EXISTS auto_create_usage (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    usage_date DATE NOT NULL,
    usage_count INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(ip_address, usage_date)
);

-- Create content_cache table for caching extracted content
CREATE TABLE IF NOT EXISTS content_cache (
    id SERIAL PRIMARY KEY,
    content_hash VARCHAR(64) NOT NULL UNIQUE,
    content_type VARCHAR(20) NOT NULL,
    original_url TEXT,
    extracted_content TEXT NOT NULL,
    content_quality INTEGER,
    extraction_metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- Create auto_create_generation_log table for tracking generations
CREATE TABLE IF NOT EXISTS auto_create_generation_log (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    user_id INTEGER,
    quiz_id INTEGER,
    input_sources JSONB NOT NULL,
    generation_settings JSONB NOT NULL,
    ai_model VARCHAR(50) NOT NULL,
    generation_time INTEGER,
    questions_generated INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auto_create_usage_ip_date ON auto_create_usage(ip_address, usage_date);
CREATE INDEX IF NOT EXISTS idx_content_cache_hash ON content_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_content_cache_expires ON content_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_generation_log_ip ON auto_create_generation_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_generation_log_created ON auto_create_generation_log(created_at);
CREATE INDEX IF NOT EXISTS idx_quizzes_auto_generated ON quizzes(is_auto_generated);

-- Add foreign key constraints
ALTER TABLE auto_create_generation_log 
ADD CONSTRAINT fk_generation_log_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE auto_create_generation_log 
ADD CONSTRAINT fk_generation_log_quiz 
FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE SET NULL;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto_create_usage table
CREATE TRIGGER update_auto_create_usage_updated_at 
    BEFORE UPDATE ON auto_create_usage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM content_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Comments for documentation
COMMENT ON TABLE auto_create_usage IS 'Tracks daily usage of auto-create feature per IP address for rate limiting';
COMMENT ON TABLE content_cache IS 'Caches extracted content from URLs and documents to avoid re-processing';
COMMENT ON TABLE auto_create_generation_log IS 'Logs all auto-create quiz generation attempts for analytics and debugging';

COMMENT ON COLUMN quizzes.is_auto_generated IS 'Flag indicating if quiz was generated using auto-create feature';
COMMENT ON COLUMN quizzes.source_type IS 'Type of source used: document, link, youtube, topic, or mixed';
COMMENT ON COLUMN quizzes.original_content IS 'Original input content used for generation (truncated if too long)';
COMMENT ON COLUMN quizzes.ai_model IS 'AI model used for question generation (e.g., gemini-1.5-pro)';
COMMENT ON COLUMN quizzes.generation_metadata IS 'JSON metadata about generation settings and process';