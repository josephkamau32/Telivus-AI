-- Fix session-ownership and role check on chat_messages INSERT policy.
--
-- The original policy only checked auth.uid() = user_id, which confirms the
-- caller owns the user_id but does NOT verify that session_id belongs to a
-- session the caller owns. A user could inject messages (including fake
-- 'assistant' responses) into another user's chat session, which would then
-- be fed to OpenAI as conversation context on the next request.
--
-- Additionally, only service-role edge functions should ever insert
-- role = 'assistant' messages. Client-side inserts should be restricted to
-- role = 'user' as defense-in-depth. (Confirmed: no client-side code in
-- src/ inserts into chat_messages at all — all inserts go through
-- chat-with-ai/index.ts using supabaseAdmin.)
--
-- This migration drops and recreates the policy with:
--   1. Ownership check on user_id (as before)
--   2. Session ownership check via EXISTS subquery
--   3. Role restricted to 'user' only (service_role bypasses RLS for 'assistant')

DROP POLICY IF EXISTS "Users can insert their own messages" ON public.chat_messages;

CREATE POLICY "Users can insert their own messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'user'
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );
