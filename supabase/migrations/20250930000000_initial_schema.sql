-- Baseline Migration: Create initial health_reports and report_logs tables
-- Resolves gap where initial tables were created via Supabase UI before migrations were tracked

-- 1. Create health_reports table
CREATE TABLE IF NOT EXISTS public.health_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    age INTEGER NOT NULL,
    feeling TEXT NOT NULL,
    symptoms JSONB NOT NULL,
    otc_medicines JSONB,
    report JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on health_reports
ALTER TABLE public.health_reports ENABLE ROW LEVEL SECURITY;

-- 2. Create report_logs table
CREATE TABLE IF NOT EXISTS public.report_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    health_report_id UUID REFERENCES public.health_reports(id) ON DELETE CASCADE,
    event_type TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on report_logs
ALTER TABLE public.report_logs ENABLE ROW LEVEL SECURITY;
