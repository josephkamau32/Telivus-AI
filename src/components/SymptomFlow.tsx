import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

interface SymptomFlowProps {
  onComplete: (data: { feelings: string; symptoms: string[]; age: number }) => void;
  onBack: () => void;
}

const FEELING_OPTIONS = [
  { label: 'Good', value: 'good', color: 'bg-secondary text-secondary-foreground' },
  { label: 'Unwell', value: 'unwell', color: 'bg-destructive text-destructive-foreground' },
  { label: 'Tired', value: 'tired', color: 'bg-muted text-muted-foreground' },
  { label: 'Anxious', value: 'anxious', color: 'bg-primary text-primary-foreground' },
  { label: 'Stressed', value: 'stressed', color: 'bg-accent text-accent-foreground' },
];

const SYMPTOM_OPTIONS = [
  'Fever', 'Headache', 'Cough', 'Nausea', 'Fatigue', 'Sore Throat',
  'Body Aches', 'Runny Nose', 'Dizziness', 'Chest Pain', 'Shortness of Breath',
  'Abdominal Pain', 'Diarrhea', 'Constipation', 'Rash', 'Loss of Appetite'
];

export const SymptomFlow = ({ onComplete, onBack }: SymptomFlowProps) => {
  const [step, setStep] = useState(1);
  const [feelings, setFeelings] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSymptomToggle = (symptom: string) => {
    setSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleAddCustomSymptom = () => {
    if (customSymptom.trim() && !symptoms.includes(customSymptom.trim())) {
      setSymptoms(prev => [...prev, customSymptom.trim()]);
      setCustomSymptom('');
    }
  };

  const handleNext = () => {
    if (step < 3) {
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
      alert('Please select how you are feeling');
      return;
    }
    
    if (symptoms.length === 0) {
      alert('Please select at least one symptom');
      return;
    }
    
    if ((age === null || age === undefined) || age < 0 || age > 130) {
      alert('Please enter a valid age between 0 and 130');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onComplete({ feelings, symptoms, age });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return feelings !== '';
      case 2: return symptoms.length > 0;
      case 3: return age !== null && age >= 0 && age <= 130;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-foreground">
            Health Assessment - Step {step} of 3
          </CardTitle>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
              {[1, 2, 3].map((i) => (
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
              <h3 className="text-lg font-semibold text-center">How are you feeling today?</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {FEELING_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={feelings === option.value ? "default" : "outline"}
                    onClick={() => setFeelings(option.value)}
                    className={`p-4 h-auto ${
                      feelings === option.value ? option.color : ''
                    }`}
                  >
                    {option.label}
                    {feelings === option.value && <CheckCircle className="ml-2 w-4 h-4" />}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">What symptoms are you experiencing?</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SYMPTOM_OPTIONS.map((symptom) => (
                  <Badge
                    key={symptom}
                    variant={symptoms.includes(symptom) ? "default" : "outline"}
                    className={`cursor-pointer p-2 justify-center ${
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
                  placeholder="Add custom symptom..."
                  value={customSymptom}
                  onChange={(e) => setCustomSymptom(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomSymptom()}
                />
                <Button onClick={handleAddCustomSymptom} variant="outline">
                  Add
                </Button>
              </div>

              {symptoms.length > 0 && (
                <div className="p-4 bg-accent rounded-lg">
                  <p className="text-sm font-medium mb-2">Selected symptoms:</p>
                  <div className="flex flex-wrap gap-2">
                    {symptoms.map((symptom) => (
                      <Badge key={symptom} variant="secondary">
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">What is your age?</h3>
                <p className="text-muted-foreground mt-2">This helps us provide more accurate recommendations.</p>
              </div>
              
              <div className="max-w-xs mx-auto">
                <Label htmlFor="age">Age (required)</Label>
                <Input
                  id="age"
                  type="number"
                  min="0"
                  max="130"
                  placeholder="Enter your age"
                  value={age || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (isNaN(value) || value < 0 || value > 130) {
                      setAge(null);
                    } else {
                      setAge(value);
                    }
                  }}
                  className="text-center text-lg"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              {step === 1 ? 'Back to Home' : 'Previous'}
            </Button>

            {step < 3 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleComplete} 
                disabled={!canProceed() || isSubmitting}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              >
                {isSubmitting ? 'Generating...' : 'Generate Report'}
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};