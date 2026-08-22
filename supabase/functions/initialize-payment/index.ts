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

    const { planType } = await req.json();

    if (!planType || !["pay_per_chat", "unlimited"].includes(planType)) {
      return new Response(
        JSON.stringify({ error: "Invalid plan type. Must be 'pay_per_chat' or 'unlimited'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile for email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    const email = user.email || `${profile?.username || user.id}@telivus.co.ke`;
    const amount = planType === "pay_per_chat" ? 5000 : 30000; // In kobo / cents (50 KES and 300 KES)

    // Initialize Paystack transaction with validated callback
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount,
        metadata: {
          user_id: user.id,
          plan_type: planType,
        },
        callback_url: "https://telivus.co.ke/chat?payment=success",
      }),
    });

    if (!paystackResponse.ok) {
      console.error("Paystack initialization HTTP error:", paystackResponse.status);
      throw new Error("Failed to initialize payment with provider");
    }

    const paystackData = await paystackResponse.json();

    if (!paystackData.data?.reference || !paystackData.data?.authorization_url) {
      throw new Error("Invalid response received from payment provider");
    }

    // Create pending subscription record bound strictly to authenticated user
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("chat_subscriptions")
      .insert({
        user_id: user.id,
        subscription_type: planType,
        status: "pending",
        payment_reference: paystackData.data.reference,
        amount: amount / 100, // Convert to main currency unit
        chats_remaining: planType === "pay_per_chat" ? 1 : 0,
      })
      .select()
      .single();

    if (subError) {
      console.error("Subscription creation error:", subError);
      throw new Error("Failed to create subscription record");
    }

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in initialize-payment:", error);
    return new Response(
      JSON.stringify({ error: "Failed to initialize payment" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});