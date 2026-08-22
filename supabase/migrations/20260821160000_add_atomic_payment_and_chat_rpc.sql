-- Migration: Add atomic subscription activation and chat decrement RPC functions
-- Finding H-04: Prevent race conditions in payment activation and pay-per-chat balance deduction

-- 1. Atomic subscription activation with row locking
CREATE OR REPLACE FUNCTION activate_subscription_atomic(
    p_subscription_id UUID,
    p_user_id UUID,
    p_subscription_type TEXT,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sub chat_subscriptions%ROWTYPE;
BEGIN
    -- Lock the target subscription row exclusively
    SELECT * INTO v_sub
    FROM chat_subscriptions
    WHERE id = p_subscription_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SUBSCRIPTION_NOT_FOUND');
    END IF;

    -- Idempotency check: If already active, return early without re-processing
    IF v_sub.status = 'active' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_active', true,
            'subscription_type', v_sub.subscription_type
        );
    END IF;

    -- Expire any other active subscriptions for this user
    UPDATE chat_subscriptions
    SET status = 'expired', updated_at = now()
    WHERE user_id = p_user_id AND status = 'active' AND id != p_subscription_id;

    -- Activate the selected subscription
    UPDATE chat_subscriptions
    SET status = 'active',
        expires_at = p_expires_at,
        updated_at = now()
    WHERE id = p_subscription_id;

    RETURN jsonb_build_object(
        'success', true,
        'already_active', false,
        'subscription_type', v_sub.subscription_type
    );
END;
$$;

-- 2. Atomic pay-per-chat balance consumption with row locking
CREATE OR REPLACE FUNCTION consume_chat_atomic(
    p_user_id UUID,
    p_subscription_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_remaining INT;
BEGIN
    -- Find and lock the target subscription row
    SELECT chats_remaining INTO v_remaining
    FROM chat_subscriptions
    WHERE id = p_subscription_id
      AND user_id = p_user_id
      AND status = 'active'
      AND subscription_type = 'pay_per_chat'
      AND chats_remaining > 0
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Expire if 0 chats remaining
        UPDATE chat_subscriptions
        SET status = 'expired', updated_at = now()
        WHERE id = p_subscription_id AND user_id = p_user_id AND chats_remaining <= 0;

        RETURN jsonb_build_object('success', false, 'error', 'NO_CHATS_REMAINING');
    END IF;

    -- Decrement atomically
    UPDATE chat_subscriptions
    SET chats_remaining = chats_remaining - 1,
        updated_at = now()
    WHERE id = p_subscription_id
    RETURNING chats_remaining INTO v_remaining;

    RETURN jsonb_build_object(
        'success', true,
        'subscription_id', p_subscription_id,
        'chats_remaining', v_remaining
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION activate_subscription_atomic(UUID, UUID, TEXT, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION consume_chat_atomic(UUID, UUID) TO authenticated, service_role;
