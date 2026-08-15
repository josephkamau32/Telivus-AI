-- Fix RLS policies on chat_subscriptions and chat_messages that are missing
-- the TO clause, causing them to apply to PUBLIC (anon + authenticated) instead
-- of only service_role.
--
-- Without this fix, any authenticated user could:
--   1. UPDATE any chat_subscriptions row (e.g. grant themselves unlimited access)
--   2. INSERT chat_messages into any session (tamper with another user's chat history)
--
-- This migration drops the two vulnerable policies and recreates them scoped
-- to service_role, matching the pattern used in 20251112090000_add_chat_cache.sql.

-- 1. Fix "Service role can update subscriptions" on chat_subscriptions
--    Original: no TO clause → applies to PUBLIC
DROP POLICY IF EXISTS "Service role can update subscriptions" ON public.chat_subscriptions;

CREATE POLICY "Service role can update subscriptions"
  ON public.chat_subscriptions
  FOR UPDATE
  TO service_role
  USING (true);

-- 2. Fix "Service role can insert messages" on chat_messages
--    Original: no TO clause → applies to PUBLIC
DROP POLICY IF EXISTS "Service role can insert messages" ON public.chat_messages;

CREATE POLICY "Service role can insert messages"
  ON public.chat_messages
  FOR INSERT
  TO service_role
  WITH CHECK (true);
