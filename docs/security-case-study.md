# Finding and Fixing a Payment-Bypass Vulnerability in a Production Supabase Project

**Project:** Telivus AI — an AI health-chat application (React/TypeScript frontend, Supabase Postgres + Edge Functions, Paystack payments)
**Role:** Sole developer, working with an AI coding agent under direct review
**Scope:** Row-Level Security (RLS) audit of a live, deployed Supabase project

## Context

While investigating an unrelated bug — the AI chat not responding for a user with an active subscription — I traced the failure into the subscription-access logic in a Supabase Edge Function. That investigation surfaced something more serious than the original bug: two Row-Level Security policies that were supposed to be restricted to the backend service role were actually open to any authenticated client.

Rather than patch just the two policies I'd stumbled on, I treated it as a signal to audit the whole authorization surface rather than assume the rest was fine.

## Methodology

I extracted and read every `CREATE POLICY` statement across all six migration files in the project — 25 policies in total — and classified each one against a specific question: **does this policy check who is making the request, and separately, does it constrain what they're allowed to write?** Those are two different checks, and it's the second one that's easy to miss, because a policy can look safe at a glance (`auth.uid() = user_id`) while still allowing a user to write arbitrary values into columns that control access, price, or ownership.

## What I found

### 1. Two policies missing role scoping entirely

```sql
CREATE POLICY "Service role can update subscriptions"
  ON public.chat_subscriptions
  FOR UPDATE
  USING (true);
```

This policy had no `TO` clause. In Postgres, a policy without an explicit `TO` applies to `PUBLIC` — every role, not just the intended `service_role`. Despite the name, any authenticated user could run this directly from the browser:

```js
await supabase.from('chat_subscriptions')
  .update({ status: 'active', subscription_type: 'unlimited', expires_at: null })
  .eq('id', anySubscriptionId);
```

No ownership check, no role restriction — any user could grant themselves (or overwrite anyone else's) subscription state. A near-identical issue existed on the `chat_messages` INSERT policy, allowing arbitrary message injection into other users' chat sessions.

**Fix:** scope both policies explicitly `TO service_role`, matching the pattern already used correctly elsewhere in the schema.

### 2. A correctly-scoped policy that still allowed payment bypass

This was the one that would have been easy to miss on a narrower audit. The client-facing INSERT policy on `chat_subscriptions` was scoped correctly to the requesting user:

```sql
CREATE POLICY "Users can insert their own subscriptions"
  ON public.chat_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

This looks reasonable — it only lets you insert a row where `user_id` matches your own ID. But `WITH CHECK` only validated *ownership*, not the *values* being written. Nothing stopped an authenticated user from inserting a fully "paid" row for themselves:

```js
await supabase.from('chat_subscriptions').insert({
  user_id: myUserId,
  subscription_type: 'unlimited',
  status: 'active',
  expires_at: farFutureDate,
});
```

I checked whether the frontend ever legitimately needed this — it didn't. Every real subscription write went through Edge Functions using the service-role key, which bypasses RLS entirely. The client-side insert policy existed but was never actually used by any legitimate code path.

**Fix:** removed the policy outright, forcing all subscription writes through the payment-verified Edge Function.

### 3. An ownership check that didn't check the right foreign key

The same class of bug, in a different table. The `chat_messages` INSERT policy verified `user_id` matched the caller, but never verified that the `session_id` being written to actually belonged to a session that user owned:

```sql
WITH CHECK (auth.uid() = user_id)  -- before
```

A user could satisfy this check with their own `user_id` while targeting someone *else's* `session_id` — injecting content into a stranger's private chat history. Because the chat function reads message history by `session_id` to build conversation context for the AI, this wasn't just cosmetic vandalism; it was a route to inject fabricated content into another user's AI conversation.

**Fix:**

```sql
WITH CHECK (
  auth.uid() = user_id
  AND role = 'user'
  AND EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE id = session_id AND user_id = auth.uid()
  )
)
```

Added both a session-ownership check and a role restriction — only the service role should ever be allowed to write `role = 'assistant'` rows.

## Verification

Each fix went through the same process before being accepted: I pulled the actual commit from GitHub and diffed it myself rather than relying on a written summary of the change. This caught two things after the fact worth mentioning honestly, since they're part of the actual story:

- A commit that was meant to contain only the RLS fix also silently included an unrelated, previously-staged file that had no business being there. Caught by diffing the real commit instead of trusting the change description.
- A later, unrelated task reported a lint result that turned out to be from a narrower, differently-scoped command than what was implied. Caught by re-running the exact command myself against the real repository state.

Neither of these were security issues, but they reinforced the same principle the RLS audit was built on: a description of a system's state is not the same as the system's actual state, and the gap between the two is exactly where bugs — and vulnerabilities — hide.

I also independently re-verified the audit's own "safe" classifications rather than trusting the first pass: three separate rounds of "here's what's fixed" were each followed by "let me re-check what you called safe," which is how the second and third findings above were actually caught. The first fix alone would have left two more open holes.

## Outcome

Three real vulnerabilities found and fixed, live-verified via `supabase db push` against the production database, with an incident log added to the repository (`SECURITY.md`) documenting the finding, the fix, and the date for each. A defense-in-depth flag (`--no-verify-jwt`) added during unrelated deployment work was also caught and removed after being unable to justify its presence.

## Takeaway

The generalizable lesson, not specific to this project: **an ownership check (`auth.uid() = user_id`) answers "is this the right person?" — it does not answer "are these the right values, and is this the right target row?"** Those are three separate questions, and a policy that answers the first one correctly can still fail the other two. Any table where a write affects entitlement, price, or another user's data needs all three checked explicitly, not assumed from the presence of the first.
