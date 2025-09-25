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

// Fallback report generator when Gemini API is unavailable
const generateFallbackReport = (feelings: string, symptoms: string[], age: number) => {
  const commonSymptoms = ['headache', 'fever', 'fatigue', 'cough', 'nausea', 'dizziness', 'pain'];
  const hasCommonSymptoms = symptoms.some(symptom => 
    commonSymptoms.some(common => symptom.toLowerCase().includes(common))
  );
  
  return {
    possible_conditions: [
      {
        condition: "General Health Assessment",
        probability: "Informational",
        rationale: `Based on your reported symptoms: ${symptoms.join(', ')}, and feeling ${feelings}, this appears to be a common health inquiry that may benefit from general wellness guidance.`
      }
    ],
    recommendations: [
      {
        category: "Self-care",
        instruction: "Stay hydrated, get adequate rest, and monitor your symptoms."
      },
      {
        category: "Lifestyle",
        instruction: "Maintain a balanced diet and consider gentle physical activity as tolerated."
      },
      {
        category: "Monitoring",
        instruction: "Keep track of your symptoms and note any changes or worsening."
      },
      {
        category: "Follow-up",
        instruction: "Contact a healthcare provider if symptoms persist, worsen, or if you develop concerning signs."
      }
    ],
    otc_medicines: hasCommonSymptoms ? [
      {
        name: "General wellness support",
        dosage: "As directed on packaging",
        instructions: "Consider over-the-counter options as appropriate for your symptoms",
        contraindications: "Always read labels and consult a pharmacist or healthcare provider"
      }
    ] : [],
    confidence_scores: {
      overall_assessment: 60,
      medication_recommendations: 50
    },
    red_flags: [
      "Severe or worsening symptoms",
      "High fever (over 103°F/39.4°C)",
      "Difficulty breathing or chest pain", 
      "Signs of dehydration",
      "Symptoms that persist for more than a few days",
      "Any symptoms that cause significant concern"
    ],
    disclaimer: "This is a general wellness guide provided when our AI system is temporarily unavailable. This information is for educational purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult healthcare professionals for medical concerns.",
    fallback_notice: "This response was generated using our backup system as our AI service is temporarily unavailable. For personalized medical advice, please consult a healthcare professional."
  };
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

    // Create a unique identifier to prevent caching issues
    const uniqueId = `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const prompt = `You are a healthcare information assistant providing educational content about health symptoms. Based on the following presentation, provide informational guidance about general health topics. This is for educational purposes only.

HEALTH INQUIRY CASE [${uniqueId}]:
- Reported symptoms: ${symptoms.join(', ')}
- Current feeling: ${feelings}
- Age group: ${age} years

Please provide educational health information in JSON format with the following structure:

{
  "educational_information": [
    {
      "topic": "General information about reported symptoms",
      "likelihood": "Common/Uncommon/Rare",
      "description": "Educational description"
    }
  ],
  "general_guidance": [
    {
      "category": "Self-care/Lifestyle/When to seek help",
      "suggestion": "General health guidance"
    }
  ],
  "wellness_suggestions": [
    {
      "type": "General wellness product",
      "usage": "General guidance on usage",
      "note": "When this type of product is typically considered"
    }
  ],
  "health_awareness": {
    "information_quality": 75,
    "guidance_confidence": 70
  },
  "important_signs": [
    "Signs that would warrant professional medical consultation"
  ],
  "educational_disclaimer": "This information is for educational purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult healthcare professionals for medical concerns."
}

Provide only valid JSON format. Focus on educational content rather than diagnostic statements.`;

    // Call Gemini API with retry logic
    const geminiResponse = await retryWithBackoff(async () => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
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
            maxOutputTokens: 2048,
            topP: 0.8,
            topK: 40,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ]
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
      const rawReport = JSON.parse(jsonString);
      
      // Convert new format to old format for compatibility
      parsedReport = {
        possible_conditions: rawReport.educational_information?.map((info: any) => ({
          condition: info.topic,
          probability: info.likelihood,
          rationale: info.description
        })) || [],
        recommendations: rawReport.general_guidance?.map((guidance: any) => ({
          category: guidance.category,
          instruction: guidance.suggestion
        })) || [],
        otc_medicines: rawReport.wellness_suggestions?.map((suggestion: any) => ({
          name: suggestion.type,
          dosage: suggestion.usage,
          instructions: suggestion.note,
          contraindications: "Consult healthcare provider if symptoms persist"
        })) || [],
        confidence_scores: {
          overall_assessment: rawReport.health_awareness?.information_quality || 75,
          medication_recommendations: rawReport.health_awareness?.guidance_confidence || 70
        },
        red_flags: rawReport.important_signs || [],
        disclaimer: rawReport.educational_disclaimer || "This information is for educational purposes only and does not constitute medical advice, diagnosis, or treatment."
      };
    } catch (parseError) {
      console.warn('Failed to parse JSON response, using text format:', parseError);
      parsedReport = {
        text_report: reportText,
        possible_conditions: [],
        recommendations: [],
        otc_medicines: [],
        confidence_scores: { overall_assessment: 75, medication_recommendations: 70 },
        red_flags: [],
        disclaimer: "This information is for educational purposes only and does not constitute medical advice, diagnosis, or treatment."
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
    const isQuotaExceeded = errorMessage.includes('429') || errorMessage.includes('quota exceeded') || errorMessage.includes('RESOURCE_EXHAUSTED');
    const isAPIKeyError = errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403');
    
    // If Gemini API is unavailable due to quota or API key issues, provide a fallback response
    if (isQuotaExceeded || isAPIKeyError) {
      console.log('Gemini API unavailable, providing fallback response');
      
      const fallbackReport = generateFallbackReport(feelings, symptoms, age);
      
      // Update health report with fallback
      if (healthReportId) {
        const { error: updateError } = await supabase
          .from('health_reports')
          .update({
            status: 'completed',
            report: fallbackReport,
            otc_medicines: fallbackReport.otc_medicines || []
          })
          .eq('id', healthReportId);

        if (updateError) {
          console.error('Error updating health report with fallback:', updateError);
        }

        // Log fallback usage
        await supabase.from('report_logs').insert({
          health_report_id: healthReportId,
          event_type: 'fallback_used',
          payload: { reason: isQuotaExceeded ? 'quota_exceeded' : 'api_key_error', fallback: true }
        });
      }

      return new Response(JSON.stringify({ 
        ...fallbackReport,
        timestamp: new Date().toISOString(),
        health_report_id: healthReportId,
        fallback_used: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
        payload: { error: errorMessage, stack: error instanceof Error ? error.stack : undefined }
      });
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      error_code: isQuotaExceeded ? 'RATE_LIMITED' : (isAPIKeyError ? 'API_KEY_ERROR' : 'GENERATION_FAILED')
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});