// Internationalization setup for Telivus AI
export type Language = 'en' | 'sw';

export interface Translations {
  // Common
  loading: string;
  error: string;
  save: string;
  cancel: string;
  next: string;
  previous: string;
  back: string;
  close: string;
  yes: string;
  no: string;

  // Navigation
  home: string;
  about: string;
  contact: string;
  dashboard: string;
  chat: string;
  signIn: string;
  signOut: string;
  signUp: string;

  // Landing page
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroSubDescription: string;
  getStarted: string;
  learnMore: string;
  startAssessment: string;
  aiHealthChat: string;
  securePrivate: string;
  instantResults: string;
  personalizedCare: string;
  secureDescription: string;
  instantDescription: string;
  personalizedDescription: string;

  // Assessment
  healthAssessment: string;
  howFeeling: string;
  whatSymptoms: string;
  basicInfo: string;
  medicalHistory: string;
  medications: string;
  allergies: string;

  // Feelings
  good: string;
  unwell: string;
  tired: string;
  anxious: string;
  stressed: string;

  // Symptoms
  headache: string;
  fever: string;
  cough: string;
  nausea: string;
  fatigue: string;
  soreThroat: string;
  bodyAches: string;
  runnyNose: string;
  dizziness: string;
  chestPain: string;
  shortnessOfBreath: string;
  abdominalPain: string;
  diarrhea: string;
  constipation: string;
  rash: string;
  lossOfAppetite: string;

  // Dashboard
  healthDashboard: string;
  trackTrends: string;
  totalReports: string;
  aiChats: string;
  healthScore: string;
  thisWeek: string;
  healthTrends: string;
  symptomAnalysis: string;
  recentHistory: string;
  backToAssessment: string;
  symptomFrequency: string;
  severityTrends: string;
  weeklyActivityOverview: string;
  mostCommonSymptoms: string;
  recentHealthReports: string;
  viewDetails: string;

  // Voice/Image features
  voiceInput: string;
  describeSymptoms: string;
  describeFeeling: string;
  uploadPhoto: string;
  takePhoto: string;
  analyzeImage: string;
  imageAnalysis: string;

  // Errors and messages
  voiceNotSupported: string;
  imageAnalysisFailed: string;
  reportGenerated: string;
  instantReport: string;
  aiEnhanced: string;

  // Footer
  footerDescription: string;
  quickLinks: string;
  aboutUs: string;
  contactUs: string;
  followUs: string;
  copyright: string;
  privacyPolicy: string;
  termsOfService: string;

  // Symptom Flow
  healthAssessmentStep: string;
  howFeelingToday: string;
  tryVoiceInputFeeling: string;
  tryVoiceInputSymptoms: string;
  addCustomSymptom: string;
  add: string;
  selectedSymptoms: string;
  hide: string;
  show: string;
  basicInformation: string;
  personalizeReport: string;
  ageRequired: string;
  enterAge: string;
  fullNameOptional: string;
  enterFullName: string;
  genderOptional: string;
  selectGender: string;
  male: string;
  female: string;
  other: string;
  preferNotToSay: string;
  provideMedicalHistory: string;
  pastMedicalHistory: string;
  pastSurgicalHistory: string;
  chronicConditions: string;
  previousSurgeries: string;
  medicationsAllergies: string;
  saferRecommendations: string;
  currentMedications: string;
  listMedications: string;
  drugFoodAllergies: string;
  backToHome: string;
  generateReport: string;
  generating: string;
  selectFeelingAlert: string;
  selectSymptomAlert: string;
  validAgeAlert: string;

  // Auth Page
  welcomeToTelivus: string;
  signInOrCreateAccount: string;
  alreadySignedIn: string;
  email: string;
  password: string;
  usernameOptional: string;
  youExampleCom: string;
  johndoe: string;
  sixCharacters: string;
  signingIn: string;
  signingOut: string;
  creatingAccount: string;
  goToDashboard: string;
  validationError: string;
  pleaseFillAllFields: string;
  passwordMin6Chars: string;
  emailAndPasswordRequired: string;
  success: string;
  checkEmailConfirm: string;
  signedOut: string;
  signedOutSuccessfully: string;
  signOutError: string;
  failedToSignOut: string;
  authenticationError: string;
  signInFailed: string;
  unexpectedError: string;

  // Landing Page
  landingHeroTitle: string;
  landingHeroSubtitle: string;
  landingHeroDescription: string;
  landingGetStarted: string;
  landingLearnMore: string;
  howTelivusHelps: string;
  experienceFutureHealthcare: string;
  comprehensiveSymptomAnalysis: string;
  conversationalAIAssistant: string;
  healthDataProtected: string;
  tailoredRecommendations: string;
  whyChooseTelivus: string;
  joinThousandsUsers: string;
  cuttingEdgeMLAlgorithms: string;
  healthInsightsSeconds: string;
  access247Guidance: string;
  simpleInterfaceEveryone: string;
  readyTakeControl: string;
  joinTelivusToday: string;
  startJourneyNow: string;
  advancedAI: string;
  alwaysAvailable: string;
  easyToUse: string;

  // Disclaimer
  medicalDisclaimer: string;
}

const englishTranslations: Translations = {
  // Common
  loading: 'Loading...',
  error: 'Error',
  save: 'Save',
  cancel: 'Cancel',
  next: 'Next',
  previous: 'Previous',
  back: 'Back',
  close: 'Close',
  yes: 'Yes',
  no: 'No',

  // Navigation
  home: 'Home',
  about: 'About',
  contact: 'Contact',
  dashboard: 'Dashboard',
  chat: 'Chat',
  signIn: 'Sign In',
  signOut: 'Sign Out',
  signUp: 'Sign Up',

  // Landing page
  heroTitle: 'Your AI Health Companion',
  heroSubtitle: 'Smart healthcare insights at your fingertips',
  heroDescription: 'Your AI-powered health companion for smarter self-care',
  heroSubDescription: 'Get personalized health insights and recommendations based on your symptoms. Fast, reliable, and designed to help you make informed health decisions.',
  getStarted: 'Get Started Free',
  learnMore: 'Learn More',
  startAssessment: 'Start Health Assessment',
  aiHealthChat: 'AI Health Chat',
  securePrivate: 'Secure & Private',
  instantResults: 'Instant Results',
  personalizedCare: 'Personalized Care',
  secureDescription: 'Your health data is processed securely with end-to-end encryption.',
  instantDescription: 'Get AI-powered health insights in seconds with advanced algorithms.',
  personalizedDescription: 'Tailored recommendations based on your unique health profile.',

  // Assessment
  healthAssessment: 'Health Assessment',
  howFeeling: 'How are you feeling today?',
  whatSymptoms: 'What symptoms are you experiencing?',
  basicInfo: 'Basic Information',
  medicalHistory: 'Medical History',
  medications: 'Medications & Allergies',
  allergies: 'Allergies',

  // Feelings
  good: 'Good',
  unwell: 'Unwell',
  tired: 'Tired',
  anxious: 'Anxious',
  stressed: 'Stressed',

  // Symptoms
  headache: 'Headache',
  fever: 'Fever',
  cough: 'Cough',
  nausea: 'Nausea',
  fatigue: 'Fatigue',
  soreThroat: 'Sore Throat',
  bodyAches: 'Body Aches',
  runnyNose: 'Runny Nose',
  dizziness: 'Dizziness',
  chestPain: 'Chest Pain',
  shortnessOfBreath: 'Shortness of Breath',
  abdominalPain: 'Abdominal Pain',
  diarrhea: 'Diarrhea',
  constipation: 'Constipation',
  rash: 'Rash',
  lossOfAppetite: 'Loss of Appetite',

  // Dashboard
  healthDashboard: 'Health Dashboard',
  trackTrends: 'Track your health trends and insights',
  totalReports: 'Total Reports',
  aiChats: 'AI Chats',
  healthScore: 'Health Score',
  thisWeek: 'This Week',
  healthTrends: 'Health Trends',
  symptomAnalysis: 'Symptom Analysis',
  recentHistory: 'Recent History',
  backToAssessment: 'Back to Assessment',
  symptomFrequency: 'Symptom Frequency',
  severityTrends: 'Severity Trends',
  weeklyActivityOverview: 'Weekly Activity Overview',
  mostCommonSymptoms: 'Most Common Symptoms',
  recentHealthReports: 'Recent Health Reports',
  viewDetails: 'View Details',

  // Voice/Image features
  voiceInput: 'Voice Input',
  describeSymptoms: 'Describe your symptoms',
  describeFeeling: 'Describe how you feel',
  uploadPhoto: 'Upload Photo',
  takePhoto: 'Take Photo',
  analyzeImage: 'Analyze Image',
  imageAnalysis: 'Image Analysis',

  // Errors and messages
  voiceNotSupported: 'Voice input not supported',
  imageAnalysisFailed: 'Image analysis failed',
  reportGenerated: 'Report Generated',
  instantReport: 'Instant Report Ready',
  aiEnhanced: 'Report Enhanced',

  // Footer
  footerDescription: 'Your AI-powered health companion for smarter self-care and personalized health insights.',
  quickLinks: 'Quick Links',
  aboutUs: 'About Us',
  contactUs: 'Contact Us',
  followUs: 'Follow Us',
  copyright: '© {year} Telivus. All rights reserved.',
  privacyPolicy: 'Privacy Policy',
  termsOfService: 'Terms of Service',

  // Symptom Flow
  healthAssessmentStep: 'Health Assessment - Step {step} of 5',
  howFeelingToday: 'How are you feeling today?',
  tryVoiceInputFeeling: 'Try voice input to describe how you feel',
  tryVoiceInputSymptoms: 'Try voice input for faster symptom entry',
  addCustomSymptom: 'Add custom symptom (max 100 chars)',
  add: 'Add',
  selectedSymptoms: 'Selected symptoms:',
  hide: 'Hide',
  show: 'Show',
  basicInformation: 'Basic Information',
  personalizeReport: 'Help us personalize your report',
  ageRequired: 'Age (required) *',
  enterAge: 'Enter your age',
  fullNameOptional: 'Full Name (optional)',
  enterFullName: 'Enter your full name',
  genderOptional: 'Gender (optional)',
  selectGender: 'Select gender',
  male: 'Male',
  female: 'Female',
  other: 'Other',
  preferNotToSay: 'Prefer not to say',
  provideMedicalHistory: 'Optional - Provide any relevant medical history',
  pastMedicalHistory: 'Past Medical History (optional)',
  pastSurgicalHistory: 'Past Surgical History (optional)',
  chronicConditions: 'Any chronic conditions, past illnesses, etc.',
  previousSurgeries: 'Any previous surgeries or procedures',
  medicationsAllergies: 'Medications & Allergies',
  saferRecommendations: 'Optional - Help us provide safer recommendations',
  currentMedications: 'Current Medications (optional)',
  listMedications: 'List any medications you\'re currently taking',
  drugFoodAllergies: 'Any drug allergies, food allergies, or other allergies',
  backToHome: 'Back to Home',
  generateReport: 'Generate Report',
  generating: 'Generating...',
  selectFeelingAlert: 'Please select how you are feeling',
  selectSymptomAlert: 'Please select at least one symptom',
  validAgeAlert: 'Please enter a valid age between 0 and 130',

  // Auth Page
  welcomeToTelivus: 'Welcome to Telivus',
  signInOrCreateAccount: 'Sign in or create an account to get started',
  alreadySignedIn: 'You are already signed in',
  email: 'Email',
  password: 'Password',
  usernameOptional: 'Username (optional)',
  youExampleCom: 'you@example.com',
  johndoe: 'johndoe',
  sixCharacters: '••••••••',
  signingIn: 'Signing in...',
  signingOut: 'Signing out...',
  creatingAccount: 'Creating account...',
  goToDashboard: 'Go to Dashboard',
  validationError: 'Validation Error',
  pleaseFillAllFields: 'Please fill in all fields',
  passwordMin6Chars: 'Password must be at least 6 characters',
  emailAndPasswordRequired: 'Email and password are required',
  success: 'Success!',
  checkEmailConfirm: 'Check your email to confirm your account',
  signedOut: 'Signed Out',
  signedOutSuccessfully: 'You have been signed out successfully',
  signOutError: 'Sign Out Error',
  failedToSignOut: 'Failed to sign out',
  authenticationError: 'Authentication Error',
  signInFailed: 'Sign In Failed',
  unexpectedError: 'An unexpected error occurred',

  // Landing Page
  landingHeroTitle: 'Your AI Health Companion',
  landingHeroSubtitle: 'Smart healthcare insights at your fingertips',
  landingHeroDescription: 'Telivus uses advanced AI to analyze your symptoms and provide personalized health recommendations. Get instant insights, connect with our AI health assistant, and take control of your wellness journey.',
  landingGetStarted: 'Get Started Free',
  landingLearnMore: 'Learn More',
  howTelivusHelps: 'How Telivus Helps You',
  experienceFutureHealthcare: 'Experience the future of healthcare with our AI-powered platform',
  comprehensiveSymptomAnalysis: 'Comprehensive symptom analysis with instant AI-powered insights',
  conversationalAIAssistant: '24/7 conversational AI assistant for health questions',
  healthDataProtected: 'Your health data protected with enterprise-grade security',
  tailoredRecommendations: 'Tailored recommendations based on your unique profile',
  whyChooseTelivus: 'Why Choose Telivus?',
  joinThousandsUsers: 'Join thousands of users who trust Telivus for their health insights',
  cuttingEdgeMLAlgorithms: 'Powered by cutting-edge machine learning algorithms',
  healthInsightsSeconds: 'Get health insights in seconds, not hours',
  access247Guidance: '24/7 access to health guidance whenever you need it',
  simpleInterfaceEveryone: 'Simple interface designed for everyone',
  readyTakeControl: 'Ready to Take Control of Your Health?',
  joinTelivusToday: 'Join Telivus today and experience the future of personalized healthcare',
  startJourneyNow: 'Start Your Journey Now',
  advancedAI: 'Advanced AI Technology',
  alwaysAvailable: 'Always Available',
  easyToUse: 'Easy to Use',

  // Disclaimer
  medicalDisclaimer: 'This is for informational purposes only. Always consult healthcare professionals.',
};

const swahiliTranslations: Translations = {
  // Common
  loading: 'Inapakia...',
  error: 'Kosa',
  save: 'Hifadhi',
  cancel: 'Ghairi',
  next: 'Ijayo',
  previous: 'Iliyopita',
  back: 'Rudi',
  close: 'Funga',
  yes: 'Ndio',
  no: 'Hapana',

  // Navigation
  home: 'Nyumbani',
  about: 'Kuhusu',
  contact: 'Wasiliana',
  dashboard: 'Dashibodi',
  chat: 'Mazungumzo',
  signIn: 'Ingia',
  signOut: 'Toka',
  signUp: 'Jisajili',

  // Landing page
  heroTitle: 'Mshirika Wako wa Afya wa AI',
  heroSubtitle: 'Maarifa ya afya ya akili kwenye vidole vyako',
  heroDescription: 'Mshirika wako wa afya wa AI kwa utunzaji wa akili zaidi',
  heroSubDescription: 'Pata maarifa ya afya ya kibinafsi na mapendekezo kulingana na dalili zako. Haraka, ya kuaminika, na iliyoundwa kusaidia kufanya maamuzi ya afya ya busara.',
  getStarted: 'Anza Bure',
  learnMore: 'Jifunze Zaidi',
  startAssessment: 'Anza Tathmini ya Afya',
  aiHealthChat: 'Mazungumzo ya Afya ya AI',
  securePrivate: 'Salama na Faragha',
  instantResults: 'Matokeo ya Papo Hapo',
  personalizedCare: 'Uangalizi wa Kibinafsi',
  secureDescription: 'Data yako ya afya inachakatwa kwa usalama na usimbaji wa mwisho hadi mwisho.',
  instantDescription: 'Pata maarifa ya afya ya AI kwa sekunde chache na algorithms ya hali ya juu.',
  personalizedDescription: 'Mapendekezo yaliyobinafsishwa kulingana na wasifu wako wa afya wa kipekee.',

  // Assessment
  healthAssessment: 'Tathmini ya Afya',
  howFeeling: 'Unajisikiaje leo?',
  whatSymptoms: 'Dalili gani unazopata?',
  basicInfo: 'Maelezo ya Msingi',
  medicalHistory: 'Historia ya Matibabu',
  medications: 'Dawa na Mzio',
  allergies: 'Mzio',

  // Feelings
  good: 'Nzuri',
  unwell: 'Sio mzuri',
  tired: 'Amechoka',
  anxious: 'Ana wasiwasi',
  stressed: 'Ana msongo wa mawazo',

  // Symptoms
  headache: 'Kuumwa kichwa',
  fever: 'Homa',
  cough: 'Kikohozi',
  nausea: 'Kichefuchefu',
  fatigue: 'Uchovu',
  soreThroat: 'Kuumwa koo',
  bodyAches: 'Kuuma mwili',
  runnyNose: 'Kutiririka pua',
  dizziness: 'Kizunguzungu',
  chestPain: 'Kuuma kifua',
  shortnessOfBreath: 'Upungufu wa pumzi',
  abdominalPain: 'Kuuma tumbo',
  diarrhea: 'Kuhara',
  constipation: 'Kukaa haja kubwa',
  rash: 'Upele',
  lossOfAppetite: 'Kupoteza hamu ya chakula',

  // Dashboard
  healthDashboard: 'Dashibodi ya Afya',
  trackTrends: 'Fuatilia mwenendo na maarifa ya afya yako',
  totalReports: 'Jumla ya Ripoti',
  aiChats: 'Mazungumzo ya AI',
  healthScore: 'Alama ya Afya',
  thisWeek: 'Wiki Hii',
  healthTrends: 'Mwenendo wa Afya',
  symptomAnalysis: 'Uchambuzi wa Dalili',
  recentHistory: 'Historia ya Hivi Karibuni',
  backToAssessment: 'Rudi kwenye Tathmini',
  symptomFrequency: 'Mara kwa Mara ya Dalili',
  severityTrends: 'Mwenendo wa Ukali',
  weeklyActivityOverview: 'Muhtasari wa Shughuli za Wiki',
  mostCommonSymptoms: 'Dalili za Kawaida Zaidi',
  recentHealthReports: 'Ripoti za Afya za Hivi Karibuni',
  viewDetails: 'Tazama Maelezo',

  // Voice/Image features
  voiceInput: 'Ingizo la Sauti',
  describeSymptoms: 'Eleza dalili zako',
  describeFeeling: 'Eleza jinsi unavyojisikia',
  uploadPhoto: 'Pakia Picha',
  takePhoto: 'Piga Picha',
  analyzeImage: 'Chambua Picha',
  imageAnalysis: 'Uchambuzi wa Picha',

  // Errors and messages
  voiceNotSupported: 'Ingizo la sauti halitumiki',
  imageAnalysisFailed: 'Uchambuzi wa picha umeshindikana',
  reportGenerated: 'Ripoti Imetolewa',
  instantReport: 'Ripoti ya Papo Hapo Ipo Tayari',
  aiEnhanced: 'Ripoti Imerekebishwa',

  // Footer
  footerDescription: 'Mshirika wako wa afya wa AI kwa utunzaji wa akili zaidi na maarifa ya afya ya kibinafsi.',
  quickLinks: 'Viungo vya Haraka',
  aboutUs: 'Kuhusu Sisi',
  contactUs: 'Wasiliana Nasi',
  followUs: 'Tufuate',
  copyright: '© {year} Telivus. Haki zote zimehifadhiwa.',
  privacyPolicy: 'Sera ya Faragha',
  termsOfService: 'Masharti ya Huduma',

  // Symptom Flow
  healthAssessmentStep: 'Tathmini ya Afya - Hatua {step} kati ya 5',
  howFeelingToday: 'Unajisikiaje leo?',
  tryVoiceInputFeeling: 'Jaribu ingizo la sauti kueleza jinsi unavyojisikia',
  tryVoiceInputSymptoms: 'Jaribu ingizo la sauti kwa kuingiza dalili haraka',
  addCustomSymptom: 'Ongeza dalili maalum (max 100 chars)',
  add: 'Ongeza',
  selectedSymptoms: 'Dalili zilizochaguliwa:',
  hide: 'Ficha',
  show: 'Onyesha',
  basicInformation: 'Maelezo ya Msingi',
  personalizeReport: 'Tusaidie kubinafsisha ripoti yako',
  ageRequired: 'Umri (inahitajika) *',
  enterAge: 'Ingiza umri wako',
  fullNameOptional: 'Jina Kamili (si lazima)',
  enterFullName: 'Ingiza jina lako kamili',
  genderOptional: 'Jinsia (si lazima)',
  selectGender: 'Chagua jinsia',
  male: 'Mwanaume',
  female: 'Mwanamke',
  other: 'Nyingine',
  preferNotToSay: 'Sipendi kusema',
  provideMedicalHistory: 'Si lazima - Toa historia yoyote ya matibabu inayofaa',
  pastMedicalHistory: 'Historia ya Matibabu ya Zamani (si lazima)',
  pastSurgicalHistory: 'Historia ya Upasuaji wa Zamani (si lazima)',
  chronicConditions: 'Magonjwa yoyote ya muda mrefu, magonjwa ya zamani, n.k.',
  previousSurgeries: 'Upasuaji wowote uliopita au taratibu',
  medicationsAllergies: 'Dawa na Mzio',
  saferRecommendations: 'Si lazima - Tusaidie kutoa mapendekezo salama zaidi',
  currentMedications: 'Dawa za Sasa (si lazima)',
  listMedications: 'Orodhesha dawa zozote unazotumia sasa',
  drugFoodAllergies: 'Mzio wowote wa dawa, chakula, au mzio mwingine',
  backToHome: 'Rudi Nyumbani',
  generateReport: 'Tengeneza Ripoti',
  generating: 'Inatengeneza...',
  selectFeelingAlert: 'Tafadhali chagua jinsi unavyojisikia',
  selectSymptomAlert: 'Tafadhali chagua angalau dalili moja',
  validAgeAlert: 'Tafadhali ingiza umri halali kati ya 0 na 130',

  // Auth Page
  welcomeToTelivus: 'Karibu Telivus',
  signInOrCreateAccount: 'Ingia au tengeneza akaunti ili kuanza',
  alreadySignedIn: 'Tayari umeingia',
  email: 'Barua pepe',
  password: 'Nenosiri',
  usernameOptional: 'Jina la mtumiaji (si lazima)',
  youExampleCom: 'wewe@mfano.com',
  johndoe: 'johndoe',
  sixCharacters: '••••••••',
  signingIn: 'Inaingia...',
  signingOut: 'Inatoka...',
  creatingAccount: 'Inatengeneza akaunti...',
  goToDashboard: 'Nenda kwenye Dashibodi',
  validationError: 'Kosa la Uthibitisho',
  pleaseFillAllFields: 'Tafadhali jaza sehemu zote',
  passwordMin6Chars: 'Nenosiri lazima liwe angalau herufi 6',
  emailAndPasswordRequired: 'Barua pepe na nenosiri zinahitajika',
  success: 'Mafanikio!',
  checkEmailConfirm: 'Angalia barua pepe yako ili kuthibitisha akaunti yako',
  signedOut: 'Umetoka',
  signedOutSuccessfully: 'Umetoka nje kwa mafanikio',
  signOutError: 'Kosa la Kutoka',
  failedToSignOut: 'Imeshindikana kutoka',
  authenticationError: 'Kosa la Uthibitisho',
  signInFailed: 'Imeshindikana Kuingia',
  unexpectedError: 'Kosa lisilotarajiwa limetokea',

  // Landing Page
  landingHeroTitle: 'Mshirika Wako wa Afya wa AI',
  landingHeroSubtitle: 'Maarifa ya afya ya akili kwenye vidole vyako',
  landingHeroDescription: 'Telivus hutumia AI ya hali ya juu kuchambua dalili zako na kutoa mapendekezo ya afya ya kibinafsi. Pata maarifa ya papo hapo, ungana na msaidizi wetu wa afya wa AI, na udhibiti safari yako ya afya.',
  landingGetStarted: 'Anza Bure',
  landingLearnMore: 'Jifunze Zaidi',
  howTelivusHelps: 'Jinsi Telivus Inavyokusaidia',
  experienceFutureHealthcare: 'Pata uzoefu wa mustakabali wa afya na jukwaa letu la AI',
  comprehensiveSymptomAnalysis: 'Uchambuzi wa dalili kamili na maarifa ya AI ya papo hapo',
  conversationalAIAssistant: 'Msaidizi wa AI wa mazungumzo wa saa 24/7 kwa maswali ya afya',
  healthDataProtected: 'Data yako ya afya inalindwa na usalama wa kiwango cha biashara',
  tailoredRecommendations: 'Mapendekezo yaliyobinafsishwa kulingana na wasifu wako wa kipekee',
  whyChooseTelivus: 'Kwa Nini Uchague Telivus?',
  joinThousandsUsers: 'Jiunge na maelfu ya watumiaji wanaoamini Telivus kwa maarifa yao ya afya',
  cuttingEdgeMLAlgorithms: 'Inaendeshwa na algorithms za machine learning za hali ya juu',
  healthInsightsSeconds: 'Pata maarifa ya afya kwa sekunde, sio masaa',
  access247Guidance: 'Upatikanaji wa mwongozo wa afya saa 24/7 unapohitaji',
  simpleInterfaceEveryone: 'Interface rahisi iliyoundwa kwa kila mtu',
  readyTakeControl: 'Uko Tayari Kudhibiti Afya Yako?',
  joinTelivusToday: 'Jiunge na Telivus leo na pata uzoefu wa mustakabali wa afya ya kibinafsi',
  startJourneyNow: 'Anza Safari Yako Sasa',
  advancedAI: 'Teknolojia ya AI ya Juu',
  alwaysAvailable: 'Inapatikana Daima',
  easyToUse: 'Rahisi Kutumia',

  // Disclaimer
  medicalDisclaimer: 'Hii ni kwa madhumuni ya habari pekee. Daima shauriana na wataalamu wa afya.',
};

export const translations: Record<Language, Translations> = {
  en: englishTranslations,
  sw: swahiliTranslations,
};

export const getBrowserLanguage = (): Language => {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('sw')) return 'sw';
  return 'en'; // Default to English
};

export const formatMessage = (message: string, ...args: any[]): string => {
  return message.replace(/{(\d+)}/g, (match, index) => {
    return typeof args[index] !== 'undefined' ? args[index] : match;
  });
};