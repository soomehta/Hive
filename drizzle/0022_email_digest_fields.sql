ALTER TABLE pa_profiles ADD COLUMN IF NOT EXISTS email_briefing boolean DEFAULT false NOT NULL;
ALTER TABLE pa_profiles ADD COLUMN IF NOT EXISTS email_digest boolean DEFAULT false NOT NULL;
ALTER TABLE pa_profiles ADD COLUMN IF NOT EXISTS personality_traits text DEFAULT '';
