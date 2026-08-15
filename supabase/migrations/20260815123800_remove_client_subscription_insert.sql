-- Remove the client-side INSERT policy on chat_subscriptions that allows
-- any authenticated user to insert a fully "active" subscription row for
-- themselves, bypassing Paystack payment verification entirely.
--
-- Grep of the entire codebase confirms no legitimate code path uses a
-- client-side (anon/authenticated key) INSERT into chat_subscriptions:
--   - src/components/ChatInterface.tsx: SELECT only
--   - supabase/functions/initialize-payment/index.ts: INSERT via supabaseAdmin (service_role, bypasses RLS)
--   - supabase/functions/verify-payment/index.ts: SELECT + UPDATE via supabaseAdmin
--   - supabase/functions/chat-with-ai/index.ts: SELECT + UPDATE via supabaseAdmin
--
-- All subscription writes go through edge functions using the service_role key,
-- so this policy is both unnecessary and dangerous.

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.chat_subscriptions;
