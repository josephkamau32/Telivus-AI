# MediSense AI - Health Report System Setup & Usage

## 🚀 Quick Setup

### Environment Variables Required

Add these secrets to your Supabase project:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Database Tables

The following tables are already created in your Supabase project:

```sql
-- Health reports table
CREATE TABLE health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  age INTEGER NOT NULL,
  feeling TEXT NOT NULL,
  symptoms JSONB NOT NULL,
  status TEXT NOT NULL,
  report JSONB,
  otc_medicines JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs table for debugging
CREATE TABLE report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_report_id UUID,
  event_type TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 📋 How It Works

### 1. User Flow
1. User selects feeling (Good, Unwell, Tired, Anxious, Stressed)
2. User selects symptoms from predefined list or adds custom ones
3. User enters age (0-130)
4. System validates input client-side
5. Calls serverless edge function with retry logic
6. AI generates structured medical report
7. Report saved to Supabase and displayed to user

### 2. Server-side Processing
- **Validation**: Checks required fields and age range
- **Database Logging**: Creates health_report record with 'processing' status
- **AI Generation**: Calls Gemini with structured prompt for JSON response
- **Retry Logic**: 2 retries with exponential backoff for network errors
- **Persistence**: Updates record with results or error information

## 🔧 API Reference

### POST /functions/v1/generate-medical-report

**Request Body:**
```json
{
  "feelings": "unwell",
  "symptoms": ["Headache", "Fever", "Nausea"],
  "age": 30,
  "userId": null
}
```

**Success Response (200):**
```json
{
  "possible_conditions": [
    {
      "condition": "Viral Upper Respiratory Infection",
      "probability": "High",
      "rationale": "Combination of headache, fever, and nausea commonly seen in viral infections"
    }
  ],
  "recommendations": [
    {
      "category": "Immediate Care",
      "instruction": "Rest and increase fluid intake"
    }
  ],
  "otc_medicines": [
    {
      "name": "Acetaminophen (Tylenol)",
      "dosage": "500mg every 6 hours",
      "instructions": "Take with food to reduce stomach irritation",
      "contraindications": "Avoid if allergic to acetaminophen or have liver disease"
    }
  ],
  "confidence_scores": {
    "overall_assessment": 85,
    "medication_recommendations": 90
  },
  "red_flags": [
    "Severe headache with neck stiffness",
    "Temperature above 103°F (39.4°C)"
  ],
  "disclaimer": "This assessment is for informational purposes only and does not replace professional medical consultation, diagnosis, or treatment.",
  "timestamp": "2025-01-25T10:30:00.000Z",
  "health_report_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Error Response (400/500):**
```json
{
  "error": "Validation failed",
  "details": ["Age must be a number between 0 and 130"],
  "error_code": "VALIDATION_FAILED"
}
```

## 🧪 Testing & Debugging

### Run Basic Tests
```bash
# Manual testing - follow instructions in tests/health-report.test.ts
# Or use the browser developer tools to test the API directly
```

### Sample curl Command for Testing
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/generate-medical-report" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "feelings": "unwell",
    "symptoms": ["Headache", "Fever"],
    "age": 30,
    "userId": null
  }'
```

### Check Logs in Supabase
1. Go to your Supabase dashboard
2. Navigate to Edge Functions → generate-medical-report → Logs
3. Check for any errors or performance issues

### Database Queries for Debugging
```sql
-- Check recent health reports
SELECT * FROM health_reports 
ORDER BY created_at DESC 
LIMIT 10;

-- Check error logs
SELECT * FROM report_logs 
WHERE event_type = 'request_failed'
ORDER BY created_at DESC 
LIMIT 10;

-- Check success rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM health_reports 
GROUP BY status;
```

## 🐛 Common Issues & Solutions

### 1. "Rate Limited" Error (429)
- **Cause**: Too many requests to Gemini API
- **Solution**: Wait 60 seconds before retrying
- **Prevention**: Implement user-based rate limiting

### 2. "Validation Failed" Error
- **Cause**: Invalid input data
- **Check**: Ensure age is 0-130, symptoms array not empty, feeling not empty

### 3. "Generation Failed" Error
- **Cause**: Gemini API issues or network problems
- **Check**: Verify GEMINI_API_KEY is set correctly
- **Check**: Look at edge function logs for detailed error

### 4. Reports Not Saving
- **Cause**: Database permission issues
- **Check**: Verify SUPABASE_SERVICE_ROLE_KEY is correct
- **Check**: Database tables exist and are accessible

## 🔒 Security Features

- ✅ Input validation on both client and server
- ✅ SQL injection protection (using Supabase client)
- ✅ Rate limiting through Gemini API
- ✅ Error logging without exposing sensitive data
- ✅ Structured JSON responses to prevent XSS

## 📈 Performance Features

- ✅ Retry logic with exponential backoff
- ✅ Client-side validation to reduce server load
- ✅ Efficient database queries
- ✅ Proper error handling and logging
- ✅ Loading states and duplicate submission prevention

## 🚨 Production Considerations

1. **Rate Limiting**: Implement user-based rate limiting
2. **Authentication**: Add user authentication for personalized reports
3. **Caching**: Cache common symptom combinations
4. **Monitoring**: Set up alerts for high error rates
5. **Backup**: Regular database backups
6. **HIPAA Compliance**: If handling real medical data, ensure compliance