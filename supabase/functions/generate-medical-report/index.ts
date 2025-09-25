import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const validateInput = (data: any) => {
  const errors: string[] = [];
  
  if (!data.feelings || typeof data.feelings !== 'string' || data.feelings.trim().length === 0) {
    errors.push('Feeling is required');
  }
  
  if (!Array.isArray(data.symptoms) || data.symptoms.length === 0) {
    errors.push('At least one symptom is required');
  }
  
  if (!data.age || typeof data.age !== 'number' || data.age < 0 || data.age > 130) {
    errors.push('Age must be a number between 0 and 130');
  }
  
  return errors;
};

// Retry function with exponential backoff
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 2) => {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) or if it's an Error with message
      if (error instanceof Error) {
        if (error.message.includes('400') || error.message.includes('401') || error.message.includes('403')) {
          throw error;
        }
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let healthReportId: string | null = null;

  try {
    const requestBody = await req.json();
    const { feelings, symptoms, age, userId } = requestBody;
    
    // Input validation
    const validationErrors = validateInput({ feelings, symptoms, age });
    if (validationErrors.length > 0) {
      // Log validation failure
      await supabase.from('report_logs').insert({
        event_type: 'validation_failed',
        payload: { validationErrors, requestBody }
      });
      
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validationErrors 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create initial health report record
    const { data: healthReport, error: insertError } = await supabase
      .from('health_reports')
      .insert({
        user_id: userId || null,
        age,
        feeling: feelings,
        symptoms,
        status: 'processing'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating health report:', insertError);
      throw new Error('Failed to create health report record');
    }

    healthReportId = healthReport.id;

    // Log request start
    await supabase.from('report_logs').insert({
      health_report_id: healthReportId,
      event_type: 'request_started',
      payload: { feelings, symptoms, age, userId }
    });

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `You are Dr. MediSense AI, an experienced medical doctor with a PhD in Medicine and Pharmacy, with over 20 years of clinical experience. Based on the comprehensive patient information provided, generate a detailed professional medical assessment report.

PATIENT PRESENTATION:
- Current Symptoms: ${symptoms.join(', ')}
- Patient's Subjective Feeling: ${feelings}
- Age: ${age} years old

Please provide a structured, professional medical assessment report. Return your response as a JSON object with the following structure:

{
  "possible_conditions": [
    {
      "condition": "Condition Name",
      "probability": "High/Medium/Low",
      "rationale": "Brief explanation"
    }
  ],
  "recommendations": [
    {
      "category": "Immediate Care/Lifestyle/Monitoring/Follow-up",
      "instruction": "Specific recommendation"
    }
  ],
  "otc_medicines": [
    {
      "name": "Brand/Generic Name",
      "dosage": "Specific dosage",
      "instructions": "How to take",
      "contraindications": "When to avoid"
    }
  ],
  "confidence_scores": {
    "overall_assessment": 0-100,
    "medication_recommendations": 0-100
  },
  "red_flags": [
    "Symptom or condition requiring immediate medical attention"
  ],
  "disclaimer": "This assessment is for informational purposes only and does not replace professional medical consultation, diagnosis, or treatment."
}

Format the response as valid JSON only, no additional text.`;

    // Call Gemini API with retry logic and model fallback
    let lastRetryAfter: string | null = null;
    const callGemini = async (model: string) => {
      return await retryWithBackoff(async () => {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
              responseMimeType: 'application/json'
            }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Gemini API error response:', errorText);
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter) {
            lastRetryAfter = retryAfter;
            console.warn(`Retry-After header from Gemini: ${retryAfter}`);
          }
          throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        return response;
      });
    };

    let geminiResponse;
    try {
      geminiResponse = await callGemini('gemini-1.5-pro');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        console.warn('Rate limited on gemini-1.5-pro, falling back to gemini-1.5-flash');
        geminiResponse = await callGemini('gemini-1.5-flash');
      } else {
        throw e;
      }
    }

    const data = await geminiResponse.json();
    const reportText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reportText) {
      throw new Error('No response from Gemini AI');
    }

    // Try to parse as JSON, fallback to text format if parsing fails
    let parsedReport;
    try {
      parsedReport = JSON.parse(reportText);
    } catch (parseError) {
      console.warn('Failed to parse JSON response, using text format:', parseError);
      parsedReport = {
        text_report: reportText,
        possible_conditions: [],
        recommendations: [],
        otc_medicines: [],
        confidence_scores: { overall_assessment: 75, medication_recommendations: 70 },
        disclaimer: "This assessment is for informational purposes only and does not replace professional medical consultation, diagnosis, or treatment."
      };
    }

    // Update health report with success
    const { error: updateError } = await supabase
      .from('health_reports')
      .update({
        status: 'completed',
        report: parsedReport,
        otc_medicines: parsedReport.otc_medicines || []
      })
      .eq('id', healthReportId);

    if (updateError) {
      console.error('Error updating health report:', updateError);
    }

    // Log successful completion
    await supabase.from('report_logs').insert({
      health_report_id: healthReportId,
      event_type: 'request_completed',
      payload: { success: true, reportLength: reportText.length }
    });

    console.log(`Successfully generated medical report for health_report_id: ${healthReportId}`);

    return new Response(JSON.stringify({ 
      ...parsedReport,
      timestamp: new Date().toISOString(),
      health_report_id: healthReportId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-medical-report:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate medical report';
    
    // Update health report with error if we have an ID
    if (healthReportId) {
      await supabase
        .from('health_reports')
        .update({
          status: 'failed',
          error_message: errorMessage
        })
        .eq('id', healthReportId);

      // Log error
      await supabase.from('report_logs').insert({
        health_report_id: healthReportId,
        event_type: 'request_failed',
        payload: { error: errorMessage, stack: error instanceof Error ? error.stack : undefined }
      });
    }

    const isRateLimited = error instanceof Error && (error.message.includes('429') || error.message.includes('RATE_LIMITED') || error.message.includes('RESOURCE_EXHAUSTED'));
    const statusCode = isRateLimited ? 429 : 500;
    const headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' };
    if (isRateLimited && lastRetryAfter) {
      headers['Retry-After'] = lastRetryAfter;
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      error_code: isRateLimited ? 'RATE_LIMITED' : 'GENERATION_FAILED'
    }), {
      status: statusCode,
      headers,
    });
  }
});