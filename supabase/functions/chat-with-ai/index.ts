import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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

    const { sessionId, message } = await req.json();

    if (!sessionId || !message || typeof message !== "string" || !message.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid sessionId or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // C-02 Remediation: Validate session ownership
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !session || session.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Chat session not found or unauthorized" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has access (either active unlimited subscription or remaining pay_per_chat)
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("chat_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("Subscription lookup error:", subError);
    }

    let hasAccess = false;
    let needsPayment = false;

    if (subscription) {
      if (subscription.subscription_type === "unlimited") {
        if (!subscription.expires_at || new Date(subscription.expires_at) > new Date()) {
          hasAccess = true;
        } else {
          await supabaseAdmin
            .from("chat_subscriptions")
            .update({ status: "expired" })
            .eq("id", subscription.id);
          needsPayment = true;
        }
      } else if (subscription.subscription_type === "pay_per_chat") {
        // H-04: Atomic chat decrement via PostgreSQL RPC with row-level locking
        const { data: rpcConsume, error: rpcConsumeError } = await supabaseAdmin.rpc(
          "consume_chat_atomic",
          {
            p_user_id: user.id,
            p_subscription_id: subscription.id,
          }
        );

        if (!rpcConsumeError && rpcConsume && rpcConsume.success) {
          hasAccess = true;
        } else if (rpcConsumeError) {
          console.warn("RPC consume_chat_atomic unavailable, falling back to conditional update:", rpcConsumeError.message);
          if (subscription.chats_remaining > 0) {
            const { data: updatedSub, error: decError } = await supabaseAdmin
              .from("chat_subscriptions")
              .update({ chats_remaining: subscription.chats_remaining - 1 })
              .eq("id", subscription.id)
              .gt("chats_remaining", 0)
              .select();

            if (!decError && updatedSub && updatedSub.length > 0) {
              hasAccess = true;
            } else {
              needsPayment = true;
            }
          } else {
            await supabaseAdmin
              .from("chat_subscriptions")
              .update({ status: "expired" })
              .eq("id", subscription.id);
            needsPayment = true;
          }
        } else {
          needsPayment = true;
        }
      }
    } else {
      needsPayment = true;
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ needsPayment: true, message: "Payment required to continue chatting." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save user message
    await supabaseAdmin.from("chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role: "user",
      content: message.trim(),
    });

    // Get chat history for context (strictly within verified session)
    const { data: messages } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(20);

    const conversationHistory = messages?.slice(-10) || [];

    // System prompt for health assistant
    const systemPrompt = `You are Telivus AI, a compassionate and knowledgeable health assistant. Your role is to:

1. Personalized Nutrition Plans: Provide tailored nutrition advice based on user's health conditions, age, dietary preferences, and goals.

2. Symptom Follow-ups: Ask relevant follow-up questions about symptoms, their duration, severity, and associated factors. Help users understand when to seek medical attention.

3. Daily Health Check-ins: Conduct friendly daily check-ins about sleep, mood, exercise, water intake, and overall wellbeing.

Guidelines:
- Always be empathetic and supportive
- Provide evidence-based health information
- Encourage users to consult healthcare professionals for serious concerns
- Ask clarifying questions when needed
- Keep responses concise yet informative
- Use simple, easy-to-understand language
- CRITICAL: Always maintain conversation context and refer back to previous messages when appropriate`;

    const openAiMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openAiMessages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const isAuthError = response.status === 401;
      const isQuotaError = response.status === 429;

      if (isAuthError || isQuotaError) {
        return new Response(
          JSON.stringify({
            aiUnavailable: true,
            message: "The AI assistant is temporarily unavailable. Your message has been saved and will be visible in your chat history.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`OpenAI API error (${response.status})`);
    }

    const data = await response.json();
    let aiResponse = data.choices?.[0]?.message?.content || "I apologize, but I could not generate a response. Please try again.";

    // Clean up markdown formatting
    aiResponse = aiResponse
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`(.*?)`/g, "$1")
      .replace(/^#+\s*/gm, "")
      .replace(/^\*\s*/gm, "")
      .replace(/^\d+\.\s*/gm, "")
      .trim();

    // Save AI response
    await supabaseAdmin.from("chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role: "assistant",
      content: aiResponse,
    });

    return new Response(
      JSON.stringify({ message: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in chat-with-ai:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});