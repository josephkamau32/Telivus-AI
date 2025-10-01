-- Add user_id column to report_logs for proper access control
ALTER TABLE public.report_logs 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill user_id from health_reports for existing records
UPDATE public.report_logs rl
SET user_id = hr.user_id
FROM public.health_reports hr
WHERE rl.health_report_id = hr.id;

-- Enable Row Level Security on report_logs
ALTER TABLE public.report_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own report logs
CREATE POLICY "Users can view their own report logs"
ON public.report_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role can insert logs (for edge functions)
CREATE POLICY "Service role can insert report logs"
ON public.report_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create index for performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_report_logs_user_id ON public.report_logs(user_id);