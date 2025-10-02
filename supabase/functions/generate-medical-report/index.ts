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
        payload: { validationErrors, requestBody },
        user_id: userId || null
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
      payload: { feelings, symptoms, age, userId },
      user_id: userId || null
    });

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `You are a medical assistant generating a professional medical report. Generate ONLY the information explicitly provided below. Do NOT invent, guess, or add information. If information is missing, state "Not provided."

PATIENT INFORMATION PROVIDED:
- Age: ${age} years old
- Symptoms: ${symptoms.join(', ')}
- How they feel: ${feelings}

Generate a JSON response with this EXACT structure:

{
  "demographic_header": {
    "name": "Not provided",
    "age": "${age}",
    "gender": "Not provided",
    "date": "${new Date().toISOString().split('T')[0]}"
  },
  "chief_complaint": "Brief statement of primary symptom based on: ${symptoms[0] || 'general discomfort'}",
  "history_present_illness": "Description based on: ${feelings} with symptoms including ${symptoms.join(', ')}. Duration and onset not specified.",
  "past_medical_history": "Not provided",
  "past_surgical_history": "Not provided",
  "medications": "Not provided",
  "allergies": "Not provided",
  "assessment": "Based on the reported symptoms (${symptoms.join(', ')}) and patient description (${feelings}), possible causes may include [list 2-3 general possibilities with cautious language like 'may include', 'could suggest', 'possibly indicates']. Further evaluation needed for definitive diagnosis.",
  "diagnostic_plan": "Recommend seeing a licensed healthcare provider for comprehensive evaluation, physical examination, and appropriate diagnostic tests. Patient should seek immediate care if symptoms worsen or new concerning symptoms develop.",
  "otc_recommendations": [
    {
      "medicine": "Generic/Brand name of OTC medicine",
      "dosage": "Recommended dosage (e.g., 500mg every 6 hours)",
      "purpose": "What it helps with",
      "instructions": "How and when to take it",
      "precautions": "Important warnings or when to avoid",
      "max_duration": "Maximum days to use without consulting a doctor"
    }
  ]
}

CRITICAL: 
- Use ONLY the information provided above for patient details
- For OTC recommendations, suggest 2-4 appropriate over-the-counter medicines based on the symptoms
- Be cautious and neutral in assessment. Avoid absolute diagnoses
- Include clear precautions and maximum usage duration for each OTC medicine
- Return ONLY valid JSON, no additional text`;

    // Call Gemini API with retry logic - using Gemini 2.5 Flash
    const geminiResponse = await retryWithBackoff(async () => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1500,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error response:', errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      return response;
    });

    const data = await geminiResponse.json();
    const reportText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reportText) {
      throw new Error('No response from Gemini AI');
    }

    // Try to parse as JSON, fallback to text format if parsing fails
    let parsedReport;
    try {
      // Clean the response to extract JSON
      const jsonMatch = reportText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : reportText;
      parsedReport = JSON.parse(jsonString);
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
      payload: { success: true, reportLength: reportText.length },
      user_id: userId || null
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
        payload: { error: errorMessage, stack: error instanceof Error ? error.stack : undefined },
        user_id: userId || null
      });
    }

    // Provide specific guidance for quota issues
    const isQuotaError = error instanceof Error && error.message.includes('429');
    const errorResponse = {
      error: isQuotaError 
        ? 'Gemini API quota exceeded. Please upgrade to a paid plan or try again later.'
        : errorMessage,
      error_code: isQuotaError ? 'QUOTA_EXCEEDED' : 'GENERATION_FAILED',
      ...(isQuotaError && {
        retry_after: '1 hour',
        upgrade_info: 'Consider upgrading to Gemini API Pro for higher quotas'
      })
    };

    return new Response(JSON.stringify(errorResponse), {
      status: isQuotaError ? 429 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});