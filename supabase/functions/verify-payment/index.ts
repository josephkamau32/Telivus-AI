import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { reference } = await req.json();

    if (!reference || typeof reference !== "string") {
      return new Response(
        JSON.stringify({ error: "Payment reference is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the subscription by payment reference first
    const { data: subscription, error: subLookupError } = await supabaseAdmin
      .from("chat_subscriptions")
      .select("*")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (subLookupError || !subscription) {
      return new Response(
        JSON.stringify({ error: "Subscription not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // H-06 Remediation: Verify payment belongs strictly to the authenticated caller
    if (subscription.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: payment does not belong to authenticated user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // H-03 Remediation: Idempotency check — if already active, return success without duplicate activation
    if (subscription.status === "active") {
      return new Response(
        JSON.stringify({
          success: true,
          subscription_type: subscription.subscription_type,
          already_active: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify transaction with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!verifyResponse.ok) {
      console.error("Paystack verification HTTP error:", verifyResponse.status);
      throw new Error("Failed to verify payment with provider");
    }

    const verifyData = await verifyResponse.json();

    if (verifyData.data?.status !== "success") {
      return new Response(
        JSON.stringify({ error: "Payment was not successful with payment provider" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set expiry for unlimited plan (30 days from now)
    let expiresAt: string | null = null;
    if (subscription.subscription_type === "unlimited") {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      expiresAt = expiryDate.toISOString();
    }

    // H-04: Execute atomic activation via PostgreSQL RPC with row-level locking
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      "activate_subscription_atomic",
      {
        p_subscription_id: subscription.id,
        p_user_id: user.id,
        p_subscription_type: subscription.subscription_type,
        p_expires_at: expiresAt,
      }
    );

    if (rpcError) {
      console.error("CRITICAL: RPC activate_subscription_atomic failed:", rpcError.message);
      return new Response(
        JSON.stringify({ error: "Payment verification failed: unable to activate subscription atomically" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!rpcResult || !rpcResult.success) {
      return new Response(
        JSON.stringify({ error: rpcResult?.error || "Failed to activate subscription" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription_type: subscription.subscription_type,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in verify-payment:", error);
    return new Response(
      JSON.stringify({ error: "Payment verification failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});