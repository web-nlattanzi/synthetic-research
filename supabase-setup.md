# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your Project URL and anon public key from the project settings

## 2. Create Database Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create runs table
CREATE TABLE IF NOT EXISTS runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'queued',
  research_type TEXT NOT NULL,
  n_respondents INTEGER NOT NULL,
  audience_description TEXT,
  questions_json JSONB,
  download_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust for production)
CREATE POLICY "Allow all operations on runs" ON runs
  FOR ALL USING (true);
```

## 3. Create Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `excel-exports`
3. Make it public so files can be downloaded directly

## 4. Set Environment Variables

Add these to your GitHub Codespace secrets or local environment:

- `SUPABASE_URL`: Your project URL (e.g., https://your-project.supabase.co)
- `SUPABASE_KEY`: Your anon public key

## 5. Test the Setup

1. Start your backend: `cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
2. Start your frontend: `cd frontend && npm run dev`
3. Configure the API URL in the frontend
4. Try creating a research run!