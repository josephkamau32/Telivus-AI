/*
  # Add Chat Response Cache for Performance Optimization

  1. New Table
    - `chat_response_cache`
      - `id` (uuid, primary key)
      - `message_hash` (text, unique) - Hash of recent conversation + new message
      - `response` (text) - Cached AI response
      - `hit_count` (integer) - Number of times cache was used
      - `created_at` (timestamp)
      - `expires_at` (timestamp) - Cache expiration (1 hour for chat)

  2. Security
    - Enable RLS on `chat_response_cache` table
    - Service role can read/write cache entries
    - Regular users cannot access cache directly

  3. Indexes
    - Index on message_hash for fast lookups
    - Index on expires_at for cleanup
*/

CREATE TABLE IF NOT EXISTS public.chat_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_hash TEXT UNIQUE NOT NULL,
  response TEXT NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.chat_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can read chat cache"
  ON public.chat_response_cache
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert chat cache"
  ON public.chat_response_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update chat cache"
  ON public.chat_response_cache
  FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role can delete chat cache"
  ON public.chat_response_cache
  FOR DELETE
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS idx_chat_cache_hash ON public.chat_response_cache(message_hash);
CREATE INDEX IF NOT EXISTS idx_chat_cache_expires ON public.chat_response_cache(expires_at);

/*
  # Pre-populate Report Cache with Common Scenarios

  This will provide instant reports for frequently encountered symptoms
*/

-- Insert common report cache entries
INSERT INTO public.report_cache (cache_key, report_data, expires_at, hit_count) VALUES
-- Headache scenario
(
  'headache|i feel terrible with a bad headache|25',
  '{
    "chief_complaint": "Severe headache with nausea",
    "history_present_illness": "25-year-old patient presents with severe headache that started 2 hours ago. The headache is described as throbbing and located in the frontal region. Patient reports associated nausea and sensitivity to light. No previous history of similar headaches.",
    "assessment": "The patient most likely has tension-type headache, which is the most common type of primary headache. Differential diagnoses include migraine without aura and cluster headache. The symptoms are consistent with tension headache based on the gradual onset, bilateral location, and absence of aura or autonomic symptoms.",
    "diagnostic_plan": "Consultations: Neurology if headaches become chronic | Tests: None indicated at this time | RED FLAGS: Sudden onset thunderclap headache, neurological deficits, fever | Follow-up: Return if headache worsens or persists beyond 48 hours",
    "otc_recommendations": [
      {
        "medicine": "Ibuprofen (Advil, Motrin)",
        "dosage": "200-400 mg every 4-6 hours as needed",
        "purpose": "Reduces inflammation and relieves headache pain",
        "instructions": "Take with food to avoid stomach upset. Do not exceed 1200 mg per day.",
        "precautions": "Avoid if allergic to NSAIDs. May cause stomach irritation. Safe with no reported medications or allergies.",
        "max_duration": "3 days"
      },
      {
        "medicine": "Acetaminophen (Tylenol)",
        "dosage": "500-1000 mg every 4-6 hours as needed",
        "purpose": "Relieves headache pain and reduces fever if present",
        "instructions": "Take with plenty of water. Do not exceed 3000 mg per day.",
        "precautions": "Avoid if liver disease present. Safe with no reported medications or allergies.",
        "max_duration": "3 days"
      }
    ]
  }',
  NOW() + INTERVAL '30 days',
  0
),
-- Fever scenario
(
  'fever,i feel hot and sick|30',
  '{
    "chief_complaint": "Fever with chills and body aches",
    "history_present_illness": "30-year-old patient presents with fever up to 101°F that started yesterday. Patient reports chills, body aches, and fatigue. No cough, shortness of breath, or other respiratory symptoms noted.",
    "assessment": "The patient most likely has a viral infection, such as influenza or common cold. Differential diagnoses include bacterial infection or COVID-19. The presentation is consistent with a viral syndrome based on acute onset and constitutional symptoms.",
    "diagnostic_plan": "Consultations: Primary care if symptoms worsen | Tests: None indicated unless symptoms persist | RED FLAGS: High fever >103°F, difficulty breathing, chest pain | Follow-up: Return if fever persists >3 days or worsens",
    "otc_recommendations": [
      {
        "medicine": "Acetaminophen (Tylenol)",
        "dosage": "500-1000 mg every 4-6 hours as needed",
        "purpose": "Reduces fever and relieves body aches",
        "instructions": "Take with plenty of water. Do not exceed 3000 mg per day.",
        "precautions": "Avoid if liver disease present. Safe with no reported medications or allergies.",
        "max_duration": "3 days"
      },
      {
        "medicine": "Ibuprofen (Advil, Motrin)",
        "dosage": "200-400 mg every 4-6 hours as needed",
        "purpose": "Reduces fever and inflammation, relieves body aches",
        "instructions": "Take with food to avoid stomach upset. Do not exceed 1200 mg per day.",
        "precautions": "Avoid if allergic to NSAIDs. May cause stomach irritation. Safe with no reported medications or allergies.",
        "max_duration": "3 days"
      }
    ]
  }',
  NOW() + INTERVAL '30 days',
  0
),
-- Cough scenario
(
  'cough,i have a persistent cough|35',
  '{
    "chief_complaint": "Persistent dry cough",
    "history_present_illness": "35-year-old patient presents with dry cough that started 3 days ago. Cough is non-productive and worse at night. No fever, shortness of breath, or chest pain reported. Patient reports recent upper respiratory infection symptoms that are improving.",
    "assessment": "The patient most likely has post-viral cough or mild bronchitis. Differential diagnoses include asthma exacerbation or allergic rhinitis. The cough appears to be resolving upper respiratory infection based on timing and absence of concerning features.",
    "diagnostic_plan": "Consultations: Primary care if cough persists >2 weeks | Tests: None indicated at this time | RED FLAGS: Shortness of breath, chest pain, blood in sputum | Follow-up: Return if cough worsens or new symptoms develop",
    "otc_recommendations": [
      {
        "medicine": "Dextromethorphan (Delsym, Robitussin DM)",
        "dosage": "10-20 mg every 4 hours as needed",
        "purpose": "Suppresses dry cough reflex",
        "instructions": "Measure dose carefully. Do not exceed recommended dose.",
        "precautions": "May cause drowsiness. Avoid alcohol. Safe with no reported medications or allergies.",
        "max_duration": "7 days"
      },
      {
        "medicine": "Guaifenesin (Mucinex)",
        "dosage": "200-400 mg every 4 hours as needed",
        "purpose": "Helps loosen mucus in respiratory tract",
        "instructions": "Take with plenty of water. May be taken with or without food.",
        "precautions": "May cause stomach upset. Safe with no reported medications or allergies.",
        "max_duration": "7 days"
      }
    ]
  }',
  NOW() + INTERVAL '30 days',
  0
)
ON CONFLICT (cache_key) DO NOTHING;