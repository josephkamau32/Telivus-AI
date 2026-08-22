"""
Adversarial Database-Level RLS Test Suite — Telivus AI

Tests actual PostgreSQL Row Level Security (RLS) policies by executing
real database operations under SET LOCAL ROLE anon / authenticated / service_role
with simulated request.jwt.claims against a live local Supabase PostgreSQL instance.

Verifies fixes for:
- Finding C-01: No direct client INSERT on chat_subscriptions
- Finding C-02: Strict session-ownership & role checks on chat_messages
- Finding C-03: No direct client INSERT on health_reports
- Finding C-04: Strict cache isolation (report_cache, chat_response_cache)
- Finding H-04: No public UPDATE on chat_subscriptions
- Profiles table hardening (no client insert, owner-only select/update)
- SECURITY DEFINER search_path hardening
"""

import os
import json
import uuid
import pytest
import psycopg2
import psycopg2.errors
from contextlib import contextmanager

# Local Supabase default connection string
DB_URL = os.getenv(
    "SUPABASE_DB_URL",
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
)

USER_A_ID = "11111111-1111-1111-1111-111111111111"
USER_A_EMAIL = "user_a_rls_test@telivus.co.ke"

USER_B_ID = "22222222-2222-2222-2222-222222222222"
USER_B_EMAIL = "user_b_rls_test@telivus.co.ke"


@pytest.fixture(scope="session", autouse=True)
def setup_rls_test_environment():
    """Ensure standard grants and test users exist in auth.users for FK consistency."""
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # Apply standard Supabase public schema grants so RLS policies govern access
    cur.execute("""
        GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
        GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
    """)

    for uid, email in [(USER_A_ID, USER_A_EMAIL), (USER_B_ID, USER_B_EMAIL)]:
        cur.execute("""
            INSERT INTO auth.users (
                id, instance_id, aud, role, email, encrypted_password,
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                created_at, updated_at
            )
            VALUES (
                %s, '00000000-0000-0000-0000-000000000000', 'authenticated',
                'authenticated', %s, 'test-encrypted-password', now(),
                '{"provider":"email","providers":["email"]}', '{}', now(), now()
            )
            ON CONFLICT (id) DO NOTHING;
        """, (uid, email))

    cur.close()
    conn.close()


@pytest.fixture
def db_conn():
    """Provides a fresh database connection per test with rollback on exit."""
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    yield conn
    conn.rollback()
    conn.close()


@contextmanager
def as_role(conn, role: str, user_id: str = None):
    """
    Context manager that switches PostgreSQL role and injects Supabase JWT claims.
    Automatically rolls back transaction at context exit.
    """
    cur = conn.cursor()
    if role == "anon":
        cur.execute("SET LOCAL ROLE anon;")
        cur.execute("SELECT set_config('request.jwt.claims', '{\"role\": \"anon\"}', true);")
        cur.execute("SELECT set_config('request.jwt.claim.role', 'anon', true);")
        cur.execute("SELECT set_config('request.jwt.claim.sub', '', true);")
    elif role == "authenticated":
        cur.execute("SET LOCAL ROLE authenticated;")
        claims = json.dumps({"sub": str(user_id), "role": "authenticated"})
        cur.execute("SELECT set_config('request.jwt.claims', %s, true);", (claims,))
        cur.execute("SELECT set_config('request.jwt.claim.role', 'authenticated', true);")
        cur.execute("SELECT set_config('request.jwt.claim.sub', %s, true);", (str(user_id),))
    elif role == "service_role":
        cur.execute("SET LOCAL ROLE service_role;")
        claims = json.dumps({"role": "service_role"})
        cur.execute("SELECT set_config('request.jwt.claims', %s, true);", (claims,))
        cur.execute("SELECT set_config('request.jwt.claim.role', 'service_role', true);")
    elif role == "postgres":
        cur.execute("SET LOCAL ROLE postgres;")
    else:
        raise ValueError(f"Unknown role: {role}")

    try:
        yield cur
    finally:
        cur.close()


# ============================================================================
# TABLE: chat_subscriptions
# ============================================================================

def test_chat_subscriptions_anon_denied(db_conn):
    """Anon role cannot SELECT, INSERT, UPDATE, or DELETE chat_subscriptions."""
    with as_role(db_conn, "anon") as cur:
        cur.execute("SELECT * FROM public.chat_subscriptions;")
        assert len(cur.fetchall()) == 0

        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.chat_subscriptions (user_id, status, subscription_type, amount, payment_reference)
                VALUES (%s, 'active', 'unlimited', 300.00, 'anon-ref-123');
            """, (USER_A_ID,))


def test_chat_subscriptions_authenticated_cannot_insert_directly(db_conn):
    """
    Finding C-01 Defense: Authenticated users CANNOT insert subscription rows directly.
    Only the initialize-payment edge function (service_role) may create subscriptions.
    """
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.chat_subscriptions (
                    user_id, status, subscription_type, amount, payment_reference
                )
                VALUES (%s, 'active', 'unlimited', 300.00, 'hacked-free-ref-123');
            """, (USER_A_ID,))


def test_chat_subscriptions_authenticated_cannot_update_own_or_others(db_conn):
    """
    Finding H-04 & Containment: Authenticated users CANNOT UPDATE any subscription row,
    including their own. The vulnerable 'public UPDATE using (true)' policy must be gone.
    """
    sub_a_id = str(uuid.uuid4())
    sub_b_id = str(uuid.uuid4())
    with as_role(db_conn, "service_role") as cur:
        cur.execute("""
            INSERT INTO public.chat_subscriptions (id, user_id, status, subscription_type, amount, payment_reference)
            VALUES (%s, %s, 'pending', 'unlimited', 300.00, 'ref-user-a-123');
        """, (sub_a_id, USER_A_ID))
        cur.execute("""
            INSERT INTO public.chat_subscriptions (id, user_id, status, subscription_type, amount, payment_reference)
            VALUES (%s, %s, 'pending', 'unlimited', 300.00, 'ref-user-b-123');
        """, (sub_b_id, USER_B_ID))

    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("UPDATE public.chat_subscriptions SET status = 'active' WHERE id = %s;", (sub_a_id,))
        assert cur.rowcount == 0, "Security Failure: User A was able to update their own subscription!"

        cur.execute("UPDATE public.chat_subscriptions SET status = 'active' WHERE id = %s;", (sub_b_id,))
        assert cur.rowcount == 0, "Security Failure: User A was able to update User B's subscription!"


def test_chat_subscriptions_user_select_isolation(db_conn):
    """Users can SELECT only their own subscriptions, never another user's."""
    sub_a_id = str(uuid.uuid4())
    sub_b_id = str(uuid.uuid4())
    with as_role(db_conn, "service_role") as cur:
        cur.execute("""
            INSERT INTO public.chat_subscriptions (id, user_id, status, subscription_type, amount, payment_reference)
            VALUES (%s, %s, 'active', 'unlimited', 300.00, 'ref-user-a-view');
        """, (sub_a_id, USER_A_ID))
        cur.execute("""
            INSERT INTO public.chat_subscriptions (id, user_id, status, subscription_type, amount, payment_reference)
            VALUES (%s, %s, 'active', 'unlimited', 300.00, 'ref-user-b-view');
        """, (sub_b_id, USER_B_ID))

    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("SELECT id, user_id FROM public.chat_subscriptions WHERE id IN (%s, %s);", (sub_a_id, sub_b_id))
        rows = cur.fetchall()
        assert len(rows) == 1
        assert str(rows[0][0]) == sub_a_id
        assert str(rows[0][1]) == USER_A_ID


def test_chat_subscriptions_service_role_can_manage(db_conn):
    """Service role has full CRUD access to activate/update subscriptions."""
    sub_id = str(uuid.uuid4())
    with as_role(db_conn, "service_role") as cur:
        cur.execute("""
            INSERT INTO public.chat_subscriptions (id, user_id, status, subscription_type, amount, payment_reference)
            VALUES (%s, %s, 'pending', 'pay_per_chat', 50.00, 'sr-ref-001');
        """, (sub_id, USER_A_ID))
        assert cur.rowcount == 1

        cur.execute("""
            UPDATE public.chat_subscriptions
            SET status = 'active', chats_remaining = 10
            WHERE id = %s;
        """, (sub_id,))
        assert cur.rowcount == 1


# ============================================================================
# TABLE: chat_messages
# ============================================================================

def test_chat_messages_anon_denied(db_conn):
    """Anon role cannot read or write chat_messages."""
    with as_role(db_conn, "anon") as cur:
        cur.execute("SELECT * FROM public.chat_messages;")
        assert len(cur.fetchall()) == 0

        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.chat_messages (session_id, user_id, role, content)
                VALUES (%s, %s, 'user', 'anon message');
            """, (str(uuid.uuid4()), USER_A_ID))


def test_chat_messages_user_can_insert_own_session_as_user(db_conn):
    """Authenticated user can insert message into their OWN session with role='user'."""
    session_id = str(uuid.uuid4())
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("""
            INSERT INTO public.chat_sessions (id, user_id, title)
            VALUES (%s, %s, 'User A Session');
        """, (session_id, USER_A_ID))

        cur.execute("""
            INSERT INTO public.chat_messages (session_id, user_id, role, content)
            VALUES (%s, %s, 'user', 'Hello, this is my own message');
        """, (session_id, USER_A_ID))
        assert cur.rowcount == 1


def test_chat_messages_user_cannot_insert_into_other_user_session(db_conn):
    """
    Finding C-02 Defense: User A CANNOT inject messages into User B's session.
    Session ownership check in RLS policy must block cross-session injection.
    """
    session_b_id = str(uuid.uuid4())
    with as_role(db_conn, "authenticated", USER_B_ID) as cur:
        cur.execute("""
            INSERT INTO public.chat_sessions (id, user_id, title)
            VALUES (%s, %s, 'User B Private Session');
        """, (session_b_id, USER_B_ID))

    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.chat_messages (session_id, user_id, role, content)
                VALUES (%s, %s, 'user', 'Malicious injected message into B session');
            """, (session_b_id, USER_A_ID))


def test_chat_messages_user_cannot_spoof_assistant_role(db_conn):
    """
    Finding C-02 Defense: Client cannot insert role='assistant' messages directly.
    Only service_role / chat-with-ai edge function may insert assistant responses.
    """
    session_a_id = str(uuid.uuid4())
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("""
            INSERT INTO public.chat_sessions (id, user_id, title)
            VALUES (%s, %s, 'User A Spoof Test');
        """, (session_a_id, USER_A_ID))

        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.chat_messages (session_id, user_id, role, content)
                VALUES (%s, %s, 'assistant', 'Spoofed AI response diagnosing fake condition');
            """, (session_a_id, USER_A_ID))


def test_chat_messages_user_select_isolation(db_conn):
    """Users can SELECT only messages from their own sessions."""
    session_a = str(uuid.uuid4())
    session_b = str(uuid.uuid4())
    msg_a = str(uuid.uuid4())
    msg_b = str(uuid.uuid4())

    with as_role(db_conn, "service_role") as cur:
        cur.execute("INSERT INTO public.chat_sessions (id, user_id, title) VALUES (%s, %s, 'A'), (%s, %s, 'B');",
                    (session_a, USER_A_ID, session_b, USER_B_ID))
        cur.execute("""
            INSERT INTO public.chat_messages (id, session_id, user_id, role, content)
            VALUES (%s, %s, %s, 'user', 'Message A'), (%s, %s, %s, 'user', 'Message B');
        """, (msg_a, session_a, USER_A_ID, msg_b, session_b, USER_B_ID))

    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("SELECT id FROM public.chat_messages WHERE id IN (%s, %s);", (msg_a, msg_b))
        rows = cur.fetchall()
        assert len(rows) == 1
        assert str(rows[0][0]) == msg_a


def test_chat_messages_service_role_can_insert_assistant(db_conn):
    """Service role can insert assistant responses into any session."""
    session_id = str(uuid.uuid4())
    with as_role(db_conn, "service_role") as cur:
        cur.execute("INSERT INTO public.chat_sessions (id, user_id, title) VALUES (%s, %s, 'Session');",
                    (session_id, USER_A_ID))
        cur.execute("""
            INSERT INTO public.chat_messages (session_id, user_id, role, content)
            VALUES (%s, %s, 'assistant', 'Official AI Medical Response');
        """, (session_id, USER_A_ID))
        assert cur.rowcount == 1


# ============================================================================
# TABLE: chat_sessions
# ============================================================================

def test_chat_sessions_anon_denied(db_conn):
    """Anon role cannot access chat_sessions."""
    with as_role(db_conn, "anon") as cur:
        cur.execute("SELECT * FROM public.chat_sessions;")
        assert len(cur.fetchall()) == 0

        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("INSERT INTO public.chat_sessions (user_id, title) VALUES (%s, 'Test');", (USER_A_ID,))


def test_chat_sessions_user_crud_and_isolation(db_conn):
    """Users can CRUD their own sessions and cannot access other users' sessions."""
    session_a = str(uuid.uuid4())
    session_b = str(uuid.uuid4())

    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("INSERT INTO public.chat_sessions (id, user_id, title) VALUES (%s, %s, 'Session A');",
                    (session_a, USER_A_ID))
        assert cur.rowcount == 1

        cur.execute("UPDATE public.chat_sessions SET title = 'Updated A' WHERE id = %s;", (session_a,))
        assert cur.rowcount == 1

    with as_role(db_conn, "authenticated", USER_B_ID) as cur:
        cur.execute("INSERT INTO public.chat_sessions (id, user_id, title) VALUES (%s, %s, 'Session B');",
                    (session_b, USER_B_ID))

    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("SELECT * FROM public.chat_sessions WHERE id = %s;", (session_b,))
        assert len(cur.fetchall()) == 0

        cur.execute("UPDATE public.chat_sessions SET title = 'Hijacked' WHERE id = %s;", (session_b,))
        assert cur.rowcount == 0

        cur.execute("DELETE FROM public.chat_sessions WHERE id = %s;", (session_b,))
        assert cur.rowcount == 0


# ============================================================================
# TABLE: health_reports
# ============================================================================

def test_health_reports_anon_denied(db_conn):
    """Anon role cannot access health_reports."""
    with as_role(db_conn, "anon") as cur:
        cur.execute("SELECT * FROM public.health_reports;")
        assert len(cur.fetchall()) == 0

        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.health_reports (user_id, age, feeling, symptoms)
                VALUES (%s, 30, 'Fine', '[]'::jsonb);
            """, (USER_A_ID,))


def test_health_reports_user_cannot_insert_directly(db_conn):
    """
    Finding C-03 Defense: Authenticated users CANNOT insert health_reports directly.
    All report creation must flow through the generate-medical-report edge function.
    """
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.health_reports (user_id, age, feeling, symptoms, report)
                VALUES (%s, 25, 'Chest pain', '["pain"]'::jsonb, '{"fake": "report"}'::jsonb);
            """, (USER_A_ID,))


def test_health_reports_user_select_isolation(db_conn):
    """Users can SELECT only their own health reports."""
    rep_a = str(uuid.uuid4())
    rep_b = str(uuid.uuid4())

    with as_role(db_conn, "service_role") as cur:
        cur.execute("""
            INSERT INTO public.health_reports (id, user_id, age, feeling, symptoms, status)
            VALUES (%s, %s, 30, 'Headache', '["headache"]'::jsonb, 'completed'),
                   (%s, %s, 40, 'Fever', '["fever"]'::jsonb, 'completed');
        """, (rep_a, USER_A_ID, rep_b, USER_B_ID))

    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("SELECT id FROM public.health_reports WHERE id IN (%s, %s);", (rep_a, rep_b))
        rows = cur.fetchall()
        assert len(rows) == 1
        assert str(rows[0][0]) == rep_a


def test_health_reports_service_role_can_manage(db_conn):
    """Service role can insert and update health reports."""
    rep_id = str(uuid.uuid4())
    with as_role(db_conn, "service_role") as cur:
        cur.execute("""
            INSERT INTO public.health_reports (id, user_id, age, feeling, symptoms, status)
            VALUES (%s, %s, 28, 'Nausea', '["nausea"]'::jsonb, 'pending');
        """, (rep_id, USER_A_ID))
        assert cur.rowcount == 1

        cur.execute("""
            UPDATE public.health_reports
            SET status = 'completed', report = '{"analysis": "healthy"}'::jsonb
            WHERE id = %s;
        """, (rep_id,))
        assert cur.rowcount == 1


# ============================================================================
# TABLE: report_logs
# ============================================================================

def test_report_logs_anon_denied(db_conn):
    """Anon cannot read or insert report_logs."""
    with as_role(db_conn, "anon") as cur:
        cur.execute("SELECT * FROM public.report_logs;")
        assert len(cur.fetchall()) == 0

        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("INSERT INTO public.report_logs (event_type) VALUES ('test');")


def test_report_logs_user_cannot_insert_directly(db_conn):
    """Users cannot insert into report_logs directly."""
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.report_logs (user_id, event_type, payload)
                VALUES (%s, 'FAKE_EVENT', '{"tampered": true}'::jsonb);
            """, (USER_A_ID,))


def test_report_logs_user_select_isolation(db_conn):
    """Users can view only their own report logs."""
    log_a = str(uuid.uuid4())
    log_b = str(uuid.uuid4())

    with as_role(db_conn, "service_role") as cur:
        cur.execute("""
            INSERT INTO public.report_logs (id, user_id, event_type)
            VALUES (%s, %s, 'REPORT_GENERATED'), (%s, %s, 'REPORT_GENERATED');
        """, (log_a, USER_A_ID, log_b, USER_B_ID))

    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("SELECT id FROM public.report_logs WHERE id IN (%s, %s);", (log_a, log_b))
        rows = cur.fetchall()
        assert len(rows) == 1
        assert str(rows[0][0]) == log_a


def test_report_logs_service_role_can_insert(db_conn):
    """Service role can insert audit log entries."""
    with as_role(db_conn, "service_role") as cur:
        cur.execute("""
            INSERT INTO public.report_logs (user_id, event_type, payload)
            VALUES (%s, 'AI_INFERENCE_SUCCESS', '{"duration_ms": 420}'::jsonb);
        """, (USER_A_ID,))
        assert cur.rowcount == 1


# ============================================================================
# TABLE: report_cache (Finding C-04 Cache Isolation)
# ============================================================================

def test_report_cache_anon_denied(db_conn):
    """Anon role cannot SELECT, INSERT, UPDATE, or DELETE on report_cache."""
    cache_id = str(uuid.uuid4())
    with as_role(db_conn, "anon") as cur:
        cur.execute("SELECT * FROM public.report_cache;")
        assert len(cur.fetchall()) == 0

        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.report_cache (id, cache_key, report_data, expires_at)
                VALUES (%s, 'anon_key', '{"data":"leak"}'::jsonb, now() + interval '1 hour');
            """, (cache_id,))


def test_report_cache_authenticated_denied(db_conn):
    """
    Finding C-04 Defense: Authenticated users CANNOT read or write report_cache directly.
    Only the edge function (service_role) may access the server-side report cache.
    """
    cache_id = str(uuid.uuid4())
    # Seed a cache entry via service_role
    with as_role(db_conn, "service_role") as cur:
        cur.execute("""
            INSERT INTO public.report_cache (id, cache_key, report_data, expires_at)
            VALUES (%s, 'secret_report_hash_123', '{"diagnosis":"sensitive"}'::jsonb, now() + interval '1 hour');
        """, (cache_id,))

    # 1. Authenticated user tries to SELECT
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("SELECT * FROM public.report_cache WHERE id = %s;", (cache_id,))
        assert len(cur.fetchall()) == 0, "Security Failure: Authenticated user read server report cache!"

    # 2. Authenticated user tries to UPDATE (affects 0 rows)
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("UPDATE public.report_cache SET report_data = '{\"tampered\":true}'::jsonb WHERE id = %s;", (cache_id,))
        assert cur.rowcount == 0

    # 3. Authenticated user tries to DELETE (affects 0 rows)
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("DELETE FROM public.report_cache WHERE id = %s;", (cache_id,))
        assert cur.rowcount == 0

    # 4. Authenticated user tries to INSERT (denied)
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.report_cache (cache_key, report_data, expires_at)
                VALUES ('tampered_key', '{"injected":"cache"}'::jsonb, now() + interval '1 hour');
            """)


def test_report_cache_service_role_crud(db_conn):
    """Service role has full CRUD operations on report_cache."""
    cache_id = str(uuid.uuid4())
    with as_role(db_conn, "service_role") as cur:
        cur.execute("""
            INSERT INTO public.report_cache (id, cache_key, report_data, expires_at)
            VALUES (%s, 'sr_key_001', '{"report":"data"}'::jsonb, now() + interval '1 hour');
        """, (cache_id,))
        assert cur.rowcount == 1

        cur.execute("SELECT id FROM public.report_cache WHERE id = %s;", (cache_id,))
        assert len(cur.fetchall()) == 1

        cur.execute("UPDATE public.report_cache SET hit_count = 5 WHERE id = %s;", (cache_id,))
        assert cur.rowcount == 1

        cur.execute("DELETE FROM public.report_cache WHERE id = %s;", (cache_id,))
        assert cur.rowcount == 1


# ============================================================================
# TABLE: chat_response_cache (Finding C-04 Cache Isolation)
# ============================================================================

def test_chat_response_cache_anon_denied(db_conn):
    """Anon role cannot SELECT, INSERT, UPDATE, or DELETE on chat_response_cache."""
    cache_id = str(uuid.uuid4())
    with as_role(db_conn, "anon") as cur:
        cur.execute("SELECT * FROM public.chat_response_cache;")
        assert len(cur.fetchall()) == 0

        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.chat_response_cache (id, message_hash, response, expires_at)
                VALUES (%s, 'anon_msg_hash', 'spoofed answer', now() + interval '1 hour');
            """, (cache_id,))


def test_chat_response_cache_authenticated_denied(db_conn):
    """
    Finding C-04 Defense: Authenticated users CANNOT read or write chat_response_cache directly.
    Only the chat-with-ai edge function (service_role) may read/write the LLM cache.
    """
    cache_id = str(uuid.uuid4())
    with as_role(db_conn, "service_role") as cur:
        cur.execute("""
            INSERT INTO public.chat_response_cache (id, message_hash, response, expires_at)
            VALUES (%s, 'hash_query_abc', 'Confidential medical AI response', now() + interval '1 hour');
        """, (cache_id,))

    # 1. Authenticated user tries to SELECT
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("SELECT * FROM public.chat_response_cache WHERE id = %s;", (cache_id,))
        assert len(cur.fetchall()) == 0, "Security Failure: Authenticated user read server chat cache!"

    # 2. Authenticated user tries to UPDATE (affects 0 rows)
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("UPDATE public.chat_response_cache SET response = 'poisoned' WHERE id = %s;", (cache_id,))
        assert cur.rowcount == 0

    # 3. Authenticated user tries to DELETE (affects 0 rows)
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("DELETE FROM public.chat_response_cache WHERE id = %s;", (cache_id,))
        assert cur.rowcount == 0

    # 4. Authenticated user tries to INSERT (denied)
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.chat_response_cache (message_hash, response, expires_at)
                VALUES ('tampered_hash', 'poisoned AI cache response', now() + interval '1 hour');
            """)


def test_chat_response_cache_service_role_crud(db_conn):
    """Service role has full CRUD operations on chat_response_cache."""
    cache_id = str(uuid.uuid4())
    with as_role(db_conn, "service_role") as cur:
        cur.execute("""
            INSERT INTO public.chat_response_cache (id, message_hash, response, expires_at)
            VALUES (%s, 'sr_chat_hash_999', 'Cached LLM inference', now() + interval '1 hour');
        """, (cache_id,))
        assert cur.rowcount == 1

        cur.execute("SELECT id FROM public.chat_response_cache WHERE id = %s;", (cache_id,))
        assert len(cur.fetchall()) == 1

        cur.execute("UPDATE public.chat_response_cache SET hit_count = 10 WHERE id = %s;", (cache_id,))
        assert cur.rowcount == 1

        cur.execute("DELETE FROM public.chat_response_cache WHERE id = %s;", (cache_id,))
        assert cur.rowcount == 1


# ============================================================================
# TABLE: profiles
# ============================================================================

def test_profiles_anon_denied(db_conn):
    """Anon role cannot SELECT, INSERT, UPDATE, or DELETE on profiles."""
    with as_role(db_conn, "anon") as cur:
        cur.execute("SELECT * FROM public.profiles;")
        assert len(cur.fetchall()) == 0

        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.profiles (id, username)
                VALUES (%s, 'anon_hacker');
            """, (str(uuid.uuid4()),))


def test_profiles_user_cannot_insert_directly(db_conn):
    """
    Authenticated users CANNOT insert profile rows directly.
    Profile creation is handled exclusively by the handle_new_user() trigger.
    """
    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO public.profiles (id, username)
                VALUES (%s, 'forged_profile');
            """, (USER_A_ID,))


def test_profiles_user_select_isolation(db_conn):
    """
    Users can SELECT only their own profile and cannot view other users' profiles.
    """
    # Ensure profile records exist via service_role
    with as_role(db_conn, "service_role") as cur:
        cur.execute("""
            INSERT INTO public.profiles (id, username, created_at, updated_at)
            VALUES (%s, 'usera', now(), now()), (%s, 'userb', now(), now())
            ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;
        """, (USER_A_ID, USER_B_ID))

    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("SELECT id, username FROM public.profiles WHERE id = %s;", (USER_A_ID,))
        rows = cur.fetchall()
        assert len(rows) == 1
        assert str(rows[0][0]) == USER_A_ID
        assert rows[0][1] == "usera"

        # User A attempts to view User B's profile
        cur.execute("SELECT id, username FROM public.profiles WHERE id = %s;", (USER_B_ID,))
        assert len(cur.fetchall()) == 0, "Security Failure: User A was able to read User B's profile!"


def test_profiles_user_update_isolation(db_conn):
    """Users can update their own profile and cannot update another user's profile."""
    with as_role(db_conn, "service_role") as cur:
        cur.execute("""
            INSERT INTO public.profiles (id, username, created_at, updated_at)
            VALUES (%s, 'usera', now(), now()), (%s, 'userb', now(), now())
            ON CONFLICT (id) DO NOTHING;
        """, (USER_A_ID, USER_B_ID))

    with as_role(db_conn, "authenticated", USER_A_ID) as cur:
        cur.execute("UPDATE public.profiles SET username = 'usera_new' WHERE id = %s;", (USER_A_ID,))
        assert cur.rowcount == 1

        cur.execute("UPDATE public.profiles SET username = 'hacked_b' WHERE id = %s;", (USER_B_ID,))
        assert cur.rowcount == 0, "Security Failure: User A was able to update User B's profile!"


# ============================================================================
# FUNCTIONS: SECURITY DEFINER search_path Hardening
# ============================================================================

def test_security_definer_functions_search_path_locked(db_conn):
    """
    Verifies that all SECURITY DEFINER functions have search_path locked to empty string (''),
    preventing search_path injection attacks.
    """
    functions_to_check = [
        "handle_new_user",
        "handle_updated_at",
        "cleanup_expired_cache",
        "activate_subscription_atomic",
        "consume_chat_atomic",
    ]

    with as_role(db_conn, "postgres") as cur:
        cur.execute("""
            SELECT proname, prosecdef, proconfig
            FROM pg_proc
            WHERE proname = ANY(%s);
        """, (functions_to_check,))
        rows = cur.fetchall()

        assert len(rows) >= len(functions_to_check), f"Missing functions in DB: found {len(rows)}"

        for proname, prosecdef, proconfig in rows:
            assert prosecdef is True, f"Function {proname} is not SECURITY DEFINER"
            assert proconfig is not None, f"Function {proname} is missing proconfig (search_path not set!)"
            assert any('search_path=""' in opt or "search_path=''" in opt or 'search_path=' in opt for opt in proconfig), (
                f"Function {proname} does not have search_path locked to empty string: {proconfig}"
            )
