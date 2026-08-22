-- Migration: Add UNIQUE constraint on chat_subscriptions.payment_reference
-- Remediation for finding H-06 (Payment reference replay / double-spending prevention)

DO $$
BEGIN
    -- Ensure unique constraint on payment_reference to prevent replay attacks
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chat_subscriptions_payment_reference_key'
    ) THEN
        ALTER TABLE public.chat_subscriptions 
        ADD CONSTRAINT chat_subscriptions_payment_reference_key UNIQUE (payment_reference);
    END IF;
END $$;

-- Create index for fast lookup by payment_reference during verification
CREATE INDEX IF NOT EXISTS idx_chat_subscriptions_payment_reference 
ON public.chat_subscriptions(payment_reference);
