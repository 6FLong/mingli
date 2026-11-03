# Supabase backend

This directory is the source of truth for the cloud schema and Edge Functions.

- `migrations/` contains ordered, repeatable database migrations.
- `functions/` contains server-side functions. Secrets are read from Supabase Edge Function Secrets.
- The browser may receive only the Project URL and publishable key.
- Never commit the database password, service role key, DeepSeek API key, access tokens, or administrator password.

Apply migrations in filename order. The production project reference is declared in `config.toml`; authentication is still required before linking or deployment.
