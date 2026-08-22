import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const validateInput = (data: Record<string, unknown>) => {
  const errors: string[] = [];

  if (!data.feelings || typeof data.feelings !== "string" || data.feelings.trim().length === 0) {
    errors.push("Feeling description is required");
  }

  if (!Array.isArray(data.symptoms) || data.symptoms.length === 0) {
    errors.push("At least one symptom is required");
  }

  if (!data.age || typeof data.age !== "number" || data.age < 0 || data.age > 130) {
    errors.push("Age must be a number between 0 and 130");
  }

  return errors;
};

const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 2) => {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (error instanceof Error) {
        if (error.message.includes("400") || error.message.includes("401") || error.message.includes("403")) {
          throw error;
        }
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!supabaseUrl || !supabaseServiceKey || !openAiApiKey) {
    return new Response(
      JSON.stringify({ error: "Service configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // C-03 Remediation: Require valid Supabase JWT authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = user.id; // Bound strictly to authenticated session
  let healthReportId: string | null = null;

  try {
    const requestBody = await req.json();
    const {
      feelings,
      symptoms,
      age,
      name,
      gender,
      medicalHistory,
      surgicalHistory,
      currentMedications,
      allergies,
    } = requestBody;

    const validationErrors = validateInput({
      feelings,
      symptoms,
      age,
      name,
      gender,
      medicalHistory,
      surgicalHistory,
      currentMedications,
      allergies,
    });

    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validationErrors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // C-04 Remediation: Cross-user cache removed.
    // Medical reports must always be uniquely generated and confidential to the patient.
    const { data: healthReport, error: insertError } = await supabase
      .from("health_reports")
      .insert({
        user_id: userId,
        age,
        feeling: feelings,
        symptoms,
        status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating health report:", insertError);
      throw new Error("Failed to create health report record");
    }

    healthReportId = healthReport.id;

    await supabase.from("report_logs").insert({
      health_report_id: healthReportId,
      event_type: "request_started",
      payload: { feelings: feelings?.substring(0, 50), symptomsCount: symptoms?.length, age },
      user_id: userId,
    });

    const prompt = `Dr. Sarah Mitchell, MD, PharmD with 20+ years experience.

PATIENT: Age ${age}, ${gender || "gender not specified"}, symptoms: ${symptoms.join(", ")}, feels: ${feelings}
${medicalHistory ? `Medical history: ${medicalHistory}` : ""}
${surgicalHistory ? `Surgical history: ${surgicalHistory}` : ""}
${currentMedications ? `Medications: ${currentMedications}` : ""}
${allergies ? `Allergies: ${allergies}` : ""}

CRITICAL: Use ONLY stated symptoms. No hallucinations. FDA-approved OTC only. Return JSON only.

{
  "chief_complaint": "Primary symptoms",
  "history_present_illness": "3-4 sentences: symptoms + feelings + context",
  "assessment": "Diagnosis + 2 differentials + reasoning (4-5 sentences)",
  "diagnostic_plan": "Consultations | Tests | RED FLAGS | Follow-up",
  "otc_recommendations": [
    {
      "medicine": "Generic (Brand)",
      "dosage": "Age-${age} appropriate",
      "purpose": "Treats [symptom]",
      "instructions": "How/when to take",
      "precautions": "Warnings. ${currentMedications ? "Check vs: " + currentMedications : ""}${allergies ? " Safe with: " + allergies : ""}",
      "max_duration": "Days max"
    }
  ]
}`;

    const openaiResponse = await retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 1200,
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          throw new Error("OpenAI API quota exceeded. Please try again later.");
        } else if (response.status === 400) {
          throw new Error("Invalid request to AI service. Please check your input.");
        } else if (response.status === 401) {
          throw new Error("AI service authentication error.");
        } else if (response.status >= 500) {
          throw new Error("AI service temporarily unavailable. Please try again.");
        }
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      return response;
    });

    const data = await openaiResponse.json();
    const reportText = data.choices?.[0]?.message?.content;

    if (!reportText) {
      throw new Error("No response from OpenAI API");
    }

    let parsedReport;
    try {
      let cleanedText = reportText.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```(?:json)?\n?/gi, "").replace(/\n?```$/g, "");
      }
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in response");
      }
      parsedReport = JSON.parse(jsonMatch[0]);

      if (!parsedReport.chief_complaint || !parsedReport.assessment || !parsedReport.history_present_illness || !parsedReport.diagnostic_plan) {
        throw new Error("Missing required report fields from AI response");
      }

      if (!Array.isArray(parsedReport.otc_recommendations)) {
        parsedReport.otc_recommendations = [];
      }

      parsedReport.otc_recommendations.forEach((otc: Record<string, unknown>, index: number) => {
        if (!otc.medicine || typeof otc.medicine !== "string") {
          validationErrors.push(`OTC recommendation ${index + 1}: Missing medicine name`);
        }
        if (!otc.dosage || typeof otc.dosage !== "string") {
          validationErrors.push(`OTC recommendation ${index + 1}: Missing dosage`);
        }
        if (!otc.purpose || typeof otc.purpose !== "string") {
          validationErrors.push(`OTC recommendation ${index + 1}: Missing purpose`);
        }
        if (!otc.precautions || typeof otc.precautions !== "string") {
          validationErrors.push(`OTC recommendation ${index + 1}: Missing precautions`);
        }
      });

      parsedReport.demographic_header = {
        name: name || "Not provided",
        age: age,
        gender: gender || "Not provided",
        date: new Date().toISOString().split("T")[0],
      };
    } catch (parseError: unknown) {
      console.error("Failed to parse JSON response:", parseError);
      throw new Error("Failed to parse AI medical report response");
    }

    // Update report in database
    await supabase
      .from("health_reports")
      .update({
        status: "completed",
        report: parsedReport,
        otc_medicines: parsedReport.otc_recommendations || [],
      })
      .eq("id", healthReportId);

    await supabase.from("report_logs").insert({
      health_report_id: healthReportId,
      event_type: "request_completed",
      payload: { success: true },
      user_id: userId,
    });

    return new Response(
      JSON.stringify({
        ...parsedReport,
        timestamp: new Date().toISOString(),
        health_report_id: healthReportId,
        cached: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: unknown) {
    console.error("Error in generate-medical-report:", error);

    const errorMessage = error instanceof Error ? error.message : "Failed to generate medical report";

    if (healthReportId) {
      await supabase
        .from("health_reports")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", healthReportId);

      await supabase.from("report_logs").insert({
        health_report_id: healthReportId,
        event_type: "request_failed",
        payload: { error: errorMessage },
        user_id: userId,
      });
    }

    const isQuotaError = error instanceof Error && error.message.includes("quota exceeded");
    return new Response(
      JSON.stringify({
        error: isQuotaError
          ? "AI service quota temporarily reached. Please try again shortly."
          : "Failed to generate medical report. Please try again.",
        error_code: isQuotaError ? "QUOTA_EXCEEDED" : "GENERATION_FAILED",
      }),
      {
        status: isQuotaError ? 429 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});