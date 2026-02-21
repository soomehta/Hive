function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

// Validated lazily on first access
let _env: ReturnType<typeof loadEnv> | null = null;

function loadEnv() {
  return {
    // Database
    DATABASE_URL: required("DATABASE_URL"),

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),

    // Encryption
    ENCRYPTION_KEY: required("ENCRYPTION_KEY"),

    // AI (lazy — only required when used)
    OPENAI_API_KEY: optional("OPENAI_API_KEY"),
    ANTHROPIC_API_KEY: optional("ANTHROPIC_API_KEY"),

    // Voice (lazy)
    DEEPGRAM_API_KEY: optional("DEEPGRAM_API_KEY"),
    GLADIA_API_KEY: optional("GLADIA_API_KEY"),

    // OAuth (lazy)
    GOOGLE_CLIENT_ID: optional("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: optional("GOOGLE_CLIENT_SECRET"),
    GOOGLE_REDIRECT_URI: optional("GOOGLE_REDIRECT_URI"),
    MICROSOFT_CLIENT_ID: optional("MICROSOFT_CLIENT_ID"),
    MICROSOFT_CLIENT_SECRET: optional("MICROSOFT_CLIENT_SECRET"),
    MICROSOFT_REDIRECT_URI: optional("MICROSOFT_REDIRECT_URI"),
    SLACK_CLIENT_ID: optional("SLACK_CLIENT_ID"),
    SLACK_CLIENT_SECRET: optional("SLACK_CLIENT_SECRET"),
    SLACK_REDIRECT_URI: optional("SLACK_REDIRECT_URI"),

    // Storage
    R2_ACCESS_KEY_ID: optional("R2_ACCESS_KEY_ID"),
    R2_SECRET_ACCESS_KEY: optional("R2_SECRET_ACCESS_KEY"),
    R2_BUCKET: optional("R2_BUCKET"),
    R2_ENDPOINT: optional("R2_ENDPOINT"),

    // Redis
    REDIS_URL: optional("REDIS_URL"),

    // Cron
    CRON_SECRET: optional("CRON_SECRET"),

    // Sentry
    NEXT_PUBLIC_SENTRY_DSN: optional("NEXT_PUBLIC_SENTRY_DSN"),
    SENTRY_AUTH_TOKEN: optional("SENTRY_AUTH_TOKEN"),
    SENTRY_ORG: optional("SENTRY_ORG"),
    SENTRY_PROJECT: optional("SENTRY_PROJECT"),

    // Logging
    LOG_LEVEL: optional("LOG_LEVEL"),

    // Upstash Redis (rate limiting)
    UPSTASH_REDIS_REST_URL: optional("UPSTASH_REDIS_REST_URL"),
    UPSTASH_REDIS_REST_TOKEN: optional("UPSTASH_REDIS_REST_TOKEN"),
  };
}

export function env() {
  if (!_env) _env = loadEnv();
  return _env;
}
