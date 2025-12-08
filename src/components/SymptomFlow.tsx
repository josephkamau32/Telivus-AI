import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronLeft, ChevronRight, CheckCircle, ChevronDown, Image as ImageIcon } from 'lucide-react';
import VoiceInput from './VoiceInput';
import ImageAnalysis, { ImageAnalysisResult } from './ImageAnalysis';
import { useTranslation } from '@/contexts/LanguageContext';

export interface PatientData {
  feelings: string;
  symptoms: string[];
  age: number;
  name?: string;
  gender?: string;
  medicalHistory?: string;
  surgicalHistory?: string;
  currentMedications?: string;
  allergies?: string;
}

interface SymptomFlowProps {
  onComplete: (data: PatientData) => void;
  onBack: () => void;
}

const FEELING_OPTIONS = [
  { labelKey: 'good', value: 'good', color: 'bg-secondary text-secondary-foreground' },
  { labelKey: 'unwell', value: 'unwell', color: 'bg-destructive text-destructive-foreground' },
  { labelKey: 'tired', value: 'tired', color: 'bg-muted text-muted-foreground' },
  { labelKey: 'anxious', value: 'anxious', color: 'bg-primary text-primary-foreground' },
  { labelKey: 'stressed', value: 'stressed', color: 'bg-accent text-accent-foreground' },
];

const SYMPTOM_OPTIONS = [
  'Fever', 'Headache', 'Cough', 'Nausea', 'Fatigue', 'Sore Throat',
  'Body Aches', 'Runny Nose', 'Dizziness', 'Chest Pain', 'Shortness of Breath',
  'Abdominal Pain', 'Diarrhea', 'Constipation', 'Rash', 'Loss of Appetite'
];

export const SymptomFlow = ({ onComplete, onBack }: SymptomFlowProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [feelings, setFeelings] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [surgicalHistory, setSurgicalHistory] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageAnalysisOpen, setIsImageAnalysisOpen] = useState(false);
  const [imageAnalysisResults, setImageAnalysisResults] = useState<ImageAnalysisResult | null>(null);

  const handleSymptomToggle = (symptom: string) => {
    setSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleAddCustomSymptom = () => {
    if (customSymptom.trim() && customSymptom.length <= 100) {
      // Basic sanitization: remove special characters that could be used for XSS
      const sanitized = customSymptom.trim().replace(/[<>\"']/g, '');
      if (sanitized && !symptoms.includes(sanitized)) {
        setSymptoms(prev => [...prev, sanitized]);
        setCustomSymptom('');
      }
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    // Process the voice transcript to extract symptoms
    // Convert to lowercase and split by common separators
    const words = transcript.toLowerCase().split(/[,;.\s]+/);

    // Common symptom keywords to look for
    const symptomKeywords = [
      'headache', 'migraine', 'fever', 'cough', 'nausea', 'vomiting', 'diarrhea',
      'fatigue', 'tired', 'dizziness', 'pain', 'ache', 'sore', 'throat', 'stomach',
      'abdominal', 'chest', 'back', 'joint', 'muscle', 'rash', 'itching', 'runny',
      'nose', 'congestion', 'sneezing', 'chills', 'sweating', 'loss of appetite',
      'constipation', 'heartburn', 'indigestion', 'bloating', 'cramps'
    ];

    // Find matching symptoms
    const foundSymptoms = symptomKeywords.filter(keyword =>
      words.some(word => word.includes(keyword) || keyword.includes(word))
    );

    // Also check for exact matches from predefined symptoms
    const exactMatches = SYMPTOM_OPTIONS.filter(symptom =>
      transcript.toLowerCase().includes(symptom.toLowerCase())
    );

    // Combine and deduplicate
    const allFoundSymptoms = [...new Set([...foundSymptoms, ...exactMatches])];

    if (allFoundSymptoms.length > 0) {
      // Add found symptoms to the list
      setSymptoms(prev => {
        const newSymptoms = [...prev];
        allFoundSymptoms.forEach(symptom => {
          if (!newSymptoms.includes(symptom)) {
            newSymptoms.push(symptom);
          }
        });
        return newSymptoms;
      });
    } else {
      // If no specific symptoms found, add the transcript as a custom symptom
      const sanitized = transcript.trim().replace(/[<>\"']/g, '');
      if (sanitized && !symptoms.includes(sanitized)) {
        setSymptoms(prev => [...prev, sanitized]);
      }
    }
  };

  const handleImageAnalysisComplete = (results: ImageAnalysisResult) => {
    setImageAnalysisResults(results);
    // Add the detected symptoms to the symptoms list
    setSymptoms(prev => {
      const newSymptoms = [...prev];
      results.symptoms.forEach(symptom => {
        if (!newSymptoms.includes(symptom)) {
          newSymptoms.push(symptom);
        }
      });
      return newSymptoms;
    });
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const handleComplete = async () => {
    if (isSubmitting) return; // Prevent duplicate submissions
    
    // Enhanced validation
    if (!feelings?.trim()) {
      alert(t.selectFeelingAlert);
      return;
    }

    if (symptoms.length === 0) {
      alert(t.selectSymptomAlert);
      return;
    }

    if (!age || age < 0 || age > 130) {
      alert(t.validAgeAlert);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const data: PatientData = {
        feelings,
        symptoms,
        age,
        ...(name.trim() && { name: name.trim() }),
        ...(gender && { gender }),
        ...(medicalHistory.trim() && { medicalHistory: medicalHistory.trim() }),
        ...(surgicalHistory.trim() && { surgicalHistory: surgicalHistory.trim() }),
        ...(currentMedications.trim() && { currentMedications: currentMedications.trim() }),
        ...(allergies.trim() && { allergies: allergies.trim() })
      };
      await onComplete(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return feelings !== '';
      case 2: return symptoms.length > 0;
      case 3: return age !== null && age > 0 && age <= 130;
      case 4: return true; // Optional fields
      case 5: return true; // Optional fields
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-foreground">
            {t.healthAssessmentStep.replace('{step}', step.toString())}
          </CardTitle>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i <= step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">{t.howFeelingToday}</h3>

              {/* Voice Input Section */}
              <div className="text-center p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-3">{t.tryVoiceInputFeeling}</p>
                <div className="flex justify-center">
                  <VoiceInput
                    onTranscript={(transcript) => {
                      // Process voice transcript to match feelings
                      const lowerTranscript = transcript.toLowerCase();
                      const matchedFeeling = FEELING_OPTIONS.find(option =>
                        lowerTranscript.includes(option.value) ||
                        t[option.labelKey].toLowerCase().split(' ').some(word => lowerTranscript.includes(word))
                      );
                      if (matchedFeeling) {
                        setFeelings(matchedFeeling.value);
                      }
                    }}
                    placeholder={t.describeFeeling}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {FEELING_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={feelings === option.value ? "default" : "outline"}
                    onClick={() => setFeelings(option.value)}
                    className={`p-4 h-auto text-sm sm:text-base ${
                      feelings === option.value ? option.color : ''
                    }`}
                  >
                    {t[option.labelKey]}
                    {feelings === option.value && <CheckCircle className="ml-2 w-4 h-4" />}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">{t.whatSymptoms}</h3>

              {/* Voice Input Section */}
              <div className="text-center p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-3">{t.tryVoiceInputSymptoms}</p>
                <div className="flex justify-center">
                  <VoiceInput
                    onTranscript={handleVoiceTranscript}
                    placeholder={t.describeSymptoms}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {SYMPTOM_OPTIONS.map((symptom) => (
                  <Badge
                    key={symptom}
                    variant={symptoms.includes(symptom) ? "default" : "outline"}
                    className={`cursor-pointer p-3 justify-center text-sm ${
                      symptoms.includes(symptom)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => handleSymptomToggle(symptom)}
                  >
                    {symptom}
                    {symptoms.includes(symptom) && <CheckCircle className="ml-1 w-3 h-3" />}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder={t.addCustomSymptom}
                  value={customSymptom}
                  onChange={(e) => setCustomSymptom(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomSymptom()}
                  maxLength={100}
                />
                <Button onClick={handleAddCustomSymptom} variant="outline">
                  {t.add}
                </Button>
              </div>

              {symptoms.length > 0 && (
                <div className="p-4 bg-accent rounded-lg">
                  <p className="text-sm font-medium mb-2">{t.selectedSymptoms}</p>
                  <div className="flex flex-wrap gap-2">
                    {symptoms.map((symptom) => (
                      <Badge key={symptom} variant="secondary">
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Analysis Section */}
              <Collapsible open={isImageAnalysisOpen} onOpenChange={setIsImageAnalysisOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <ImageIcon className="w-4 h-4" />
                    {isImageAnalysisOpen ? t.hide : t.show} {t.imageAnalysis}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isImageAnalysisOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <ImageAnalysis onAnalysisComplete={handleImageAnalysisComplete} />
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">{t.basicInformation}</h3>
                <p className="text-muted-foreground mt-2">{t.personalizeReport}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="age">{t.ageRequired}</Label>
                  <Input
                    id="age"
                    type="number"
                    min="0"
                    max="130"
                    placeholder={t.enterAge}
                    value={age || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (isNaN(value) || value < 0 || value > 130) {
                        setAge(null);
                      } else {
                        setAge(value);
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="name">{t.fullNameOptional}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t.enterFullName}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">{t.genderOptional}</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.selectGender} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t.male}</SelectItem>
                      <SelectItem value="female">{t.female}</SelectItem>
                      <SelectItem value="other">{t.other}</SelectItem>
                      <SelectItem value="prefer-not-to-say">{t.preferNotToSay}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">{t.medicalHistory}</h3>
                <p className="text-muted-foreground mt-2">{t.provideMedicalHistory}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="medicalHistory">{t.pastMedicalHistory}</Label>
                  <Textarea
                    id="medicalHistory"
                    placeholder={t.chronicConditions}
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{medicalHistory.length}/500 characters</p>
                </div>
                <div>
                  <Label htmlFor="surgicalHistory">{t.pastSurgicalHistory}</Label>
                  <Textarea
                    id="surgicalHistory"
                    placeholder={t.previousSurgeries}
                    value={surgicalHistory}
                    onChange={(e) => setSurgicalHistory(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{surgicalHistory.length}/500 characters</p>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">{t.medicationsAllergies}</h3>
                <p className="text-muted-foreground mt-2">{t.saferRecommendations}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentMedications">{t.currentMedications}</Label>
                  <Textarea
                    id="currentMedications"
                    placeholder={t.listMedications}
                    value={currentMedications}
                    onChange={(e) => setCurrentMedications(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{currentMedications.length}/500 characters</p>
                </div>
                <div>
                  <Label htmlFor="allergies">{t.allergies}</Label>
                  <Textarea
                    id="allergies"
                    placeholder={t.drugFoodAllergies}
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{allergies.length}/500 characters</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              {step === 1 ? t.backToHome : t.previous}
            </Button>
            {step < 5 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                {t.next}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canProceed() || isSubmitting}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              >
                {isSubmitting ? t.generating : t.generateReport}
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};