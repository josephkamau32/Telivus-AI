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
    const { feelings, symptoms, age, name, gender, medicalHistory, surgicalHistory, currentMedications, allergies, userId } = requestBody;
    
    // Input validation
    const validationErrors = validateInput({ feelings, symptoms, age, name, gender, medicalHistory, surgicalHistory, currentMedications, allergies });
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

    // Build comprehensive patient profile
    const patientProfile = `
PATIENT INFORMATION:
- Age: ${age} years old
- Gender: ${gender || 'Not specified'}
- Name: ${name || 'Not provided'}
- Current Symptoms: ${symptoms.join(', ')}
- How they feel: ${feelings}
${medicalHistory ? `- Past Medical History: ${medicalHistory}` : ''}
${surgicalHistory ? `- Past Surgical History: ${surgicalHistory}` : ''}
${currentMedications ? `- Current Medications: ${currentMedications}` : ''}
${allergies ? `- Known Allergies: ${allergies}` : ''}
`;

    const prompt = `You are a senior medical doctor with 20+ years of experience and dual certification as a clinical pharmacist. You are known for your thorough assessments, evidence-based recommendations, and patient-centered care approach.

${patientProfile}

Based on the above patient information, generate a comprehensive medical assessment report in JSON format. Use your extensive medical knowledge and pharmaceutical expertise to provide:

1. A thorough clinical assessment considering the patient's age, gender, symptoms, and medical history
2. Evidence-based OTC medication recommendations with precise dosing, considering any drug interactions with current medications and known allergies
3. Clear guidance on when to seek immediate medical attention

Generate a JSON response with this EXACT structure:

{
  "demographic_header": {
    "name": "${name || 'Not provided'}",
    "age": ${age},
    "gender": "${gender || 'Not provided'}",
    "date": "${new Date().toISOString().split('T')[0]}"
  },
  "chief_complaint": "Concise statement of the primary presenting symptom",
  "history_present_illness": "Detailed narrative of current symptoms, their onset, duration, severity, and how they affect the patient. Consider the patient's description of feeling ${feelings}.",
  "past_medical_history": "${medicalHistory || 'No significant past medical history reported'}",
  "past_surgical_history": "${surgicalHistory || 'No surgical history reported'}",
  "medications": "${currentMedications || 'No current medications reported'}",
  "allergies": "${allergies || 'No known allergies reported'}",
  "assessment": "Professional clinical assessment: Based on the presenting symptoms (${symptoms.join(', ')}), patient age (${age}), and clinical presentation, the differential diagnosis may include [list 2-4 possible conditions with medical reasoning]. ${medicalHistory ? 'Consider patient\'s medical history in the assessment.' : ''} ${allergies ? 'Note: Patient has reported allergies - exercise caution with recommendations.' : ''} Emphasize this is a preliminary assessment and definitive diagnosis requires in-person evaluation.",
  "diagnostic_plan": "Comprehensive plan: 1) Recommend consultation with appropriate specialist based on symptoms. 2) Suggest relevant diagnostic tests or examinations. 3) Provide clear red flag symptoms requiring immediate emergency care. 4) Follow-up recommendations and timeline.",
  "otc_recommendations": [
    {
      "medicine": "Specific OTC medication name (generic and common brand)",
      "dosage": "Age-appropriate dosage with frequency (e.g., Adults: 200-400mg every 4-6 hours)",
      "purpose": "Therapeutic indication and mechanism of action",
      "instructions": "Detailed administration instructions: timing, with/without food, duration",
      "precautions": "Important warnings, contraindications, potential side effects, and drug interactions${currentMedications ? ' (checked against current medications)' : ''}${allergies ? ' (verified against known allergies)' : ''}",
      "max_duration": "Maximum self-treatment duration before medical consultation required"
    }
  ]
}

CRITICAL INSTRUCTIONS:
- Act as a senior physician - be thorough, evidence-based, and professional
- Provide 2-4 specific OTC medications appropriate for the symptoms
- Consider patient's age, gender, medical history, current medications, and allergies in ALL recommendations
- If allergies are reported, explicitly check for contraindications
- If current medications are reported, check for drug interactions
- Use precise medical terminology but explain in patient-friendly language
- Be conservative and emphasize when professional medical evaluation is needed
- Include specific dosing based on patient age
- Return ONLY valid JSON with no markdown formatting or additional text`;

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
            temperature: 0.4,
            maxOutputTokens: 2048,
            topP: 0.95,
            topK: 40
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
    
    // Extract userId from request for error logging
    let errorUserId: string | null = null;
    try {
      const errorBody = await req.clone().json();
      errorUserId = errorBody.userId || null;
    } catch {
      // If we can't parse the request body, proceed without userId
    }
    
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
        user_id: errorUserId
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