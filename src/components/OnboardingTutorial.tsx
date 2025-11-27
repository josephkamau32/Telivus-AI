import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Mic,
  FileText,
  MessageSquare,
  BarChart3,
  CheckCircle,
  Sparkles,
  Heart,
  Shield,
  Zap
} from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  action?: string;
  highlight?: string;
}

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentStep?: number;
}

export const OnboardingTutorial = ({
  isOpen,
  onClose,
  onComplete,
  currentStep = 0
}: OnboardingTutorialProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(currentStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Telivus AI! 👋',
      description: 'Your personal AI health assistant is ready to help',
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative p-6 bg-gradient-to-br from-primary to-secondary rounded-full">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
          <p className="text-center text-muted-foreground">
            Telivus AI combines advanced artificial intelligence with medical knowledge
            to provide personalized health insights and guidance.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Secure & Private</p>
            </div>
            <div className="text-center">
              <Zap className="w-8 h-8 text-secondary mx-auto mb-2" />
              <p className="text-sm font-medium">Instant Results</p>
            </div>
            <div className="text-center">
              <Heart className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Personalized Care</p>
            </div>
          </div>
        </div>
      ),
      action: 'Let\'s get started!'
    },
    {
      id: 'health-assessment',
      title: 'AI Health Assessment 🏥',
      description: 'Get comprehensive health insights powered by AI',
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <FileText className="w-12 h-12 text-primary" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Symptom Analysis</p>
                <p className="text-sm text-muted-foreground">Describe your symptoms or use voice input</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">AI-Powered Assessment</p>
                <p className="text-sm text-muted-foreground">Advanced AI analyzes your health data</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Personalized Report</p>
                <p className="text-sm text-muted-foreground">Get detailed recommendations and next steps</p>
              </div>
            </div>
          </div>
        </div>
      ),
      action: 'Try Health Assessment',
      highlight: 'assessment'
    },
    {
      id: 'voice-input',
      title: 'Voice Input 🎤',
      description: 'Speak naturally - our AI understands you',
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-secondary/10 rounded-full">
              <Mic className="w-12 h-12 text-secondary" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-4 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground mb-3">💡 <strong>Pro Tip:</strong> Voice input works best in Chrome, Edge, or Safari</p>
            <div className="space-y-2">
              <p className="text-sm">• Click the microphone button to start speaking</p>
              <p className="text-sm">• Describe your symptoms naturally</p>
              <p className="text-sm">• The AI will automatically detect and add relevant symptoms</p>
              <p className="text-sm">• Text input is always available as backup</p>
            </div>
          </div>
        </div>
      ),
      action: 'Got it!',
      highlight: 'voice'
    },
    {
      id: 'ai-chat',
      title: 'AI Health Chat 💬',
      description: 'Have conversations with your personal health assistant',
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <MessageSquare className="w-12 h-12 text-primary" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">24/7 Availability</p>
                <p className="text-sm text-muted-foreground">Get health guidance anytime</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Personalized Conversations</p>
                <p className="text-sm text-muted-foreground">Context-aware responses based on your health history</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Follow-up Care</p>
                <p className="text-sm text-muted-foreground">Discuss treatment progress and get ongoing support</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Chat sessions are preserved between visits for continuity of care.
            </p>
          </div>
        </div>
      ),
      action: 'Explore AI Chat',
      highlight: 'chat'
    },
    {
      id: 'dashboard',
      title: 'Health Dashboard 📊',
      description: 'Track your health journey and insights over time',
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-secondary/10 rounded-full">
              <BarChart3 className="w-12 h-12 text-secondary" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Assessment History</p>
                <p className="text-sm text-muted-foreground">View all your previous health assessments</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Health Trends</p>
                <p className="text-sm text-muted-foreground">Track patterns in your symptoms and health status</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Export Reports</p>
                <p className="text-sm text-muted-foreground">Download PDF reports for your records or to share with healthcare providers</p>
              </div>
            </div>
          </div>
        </div>
      ),
      action: 'View Dashboard',
      highlight: 'dashboard'
    },
    {
      id: 'getting-started',
      title: 'Ready to Begin! 🚀',
      description: 'You\'re all set to explore Telivus AI',
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative p-6 bg-gradient-to-br from-primary to-secondary rounded-full">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
          <div className="text-center space-y-3">
            <h3 className="text-lg font-semibold">What would you like to do first?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => {
                  onComplete();
                  // Could trigger navigation to assessment
                }}
              >
                <FileText className="w-6 h-6" />
                <span className="text-sm">Start Assessment</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => {
                  onComplete();
                  // Could trigger navigation to chat
                }}
              >
                <MessageSquare className="w-6 h-6" />
                <span className="text-sm">Try AI Chat</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => {
                  onComplete();
                  // Could trigger navigation to dashboard
                }}
              >
                <BarChart3 className="w-6 h-6" />
                <span className="text-sm">View Dashboard</span>
              </Button>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200 text-center">
              <strong>Remember:</strong> Telivus AI is for informational purposes only.
              Always consult healthcare professionals for medical advice.
            </p>
          </div>
        </div>
      ),
      action: 'Let\'s explore!'
    }
  ];

  const currentTutorialStep = tutorialSteps[step];
  const progress = ((step + 1) / tutorialSteps.length) * 100;

  const handleNext = () => {
    if (step < tutorialSteps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, step]));
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps(prev => new Set([...prev, ...Array.from({ length: tutorialSteps.length }, (_, i) => i)]));
    onComplete();
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1">
                {step + 1} of {tutorialSteps.length}
              </Badge>
              <DialogTitle className="text-xl">{currentTutorialStep.title}</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground mt-2">{currentTutorialStep.description}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
          </div>

          {/* Step Content */}
          <Card className="border-0 shadow-none bg-muted/30">
            <CardContent className="p-6">
              {currentTutorialStep.content}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={step === 0}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tutorial
              </Button>
              <Button onClick={handleNext} className="gap-2">
                {step === tutorialSteps.length - 1 ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Complete
                  </>
                ) : (
                  <>
                    {currentTutorialStep.action || 'Next'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index < step
                    ? 'bg-primary'
                    : index === step
                    ? 'bg-primary animate-pulse'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingTutorial;