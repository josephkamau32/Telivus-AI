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
        <div className="space-y-4 sm:space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative p-6 sm:p-8 bg-gradient-to-br from-primary to-secondary rounded-full">
                <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
              </div>
            </div>
          </div>
          <p className="text-center text-muted-foreground text-sm sm:text-base leading-relaxed px-2">
            Telivus AI combines advanced artificial intelligence with medical knowledge
            to provide personalized health insights and guidance.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-6">
            <div className="text-center p-3 sm:p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
              <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-primary mx-auto mb-3" />
              <p className="text-sm sm:text-base font-semibold text-primary">Secure & Private</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Your data is protected</p>
            </div>
            <div className="text-center p-3 sm:p-4 rounded-lg bg-secondary/5 hover:bg-secondary/10 transition-colors">
              <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-secondary mx-auto mb-3" />
              <p className="text-sm sm:text-base font-semibold text-secondary">Instant Results</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Get insights in seconds</p>
            </div>
            <div className="text-center p-3 sm:p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
              <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-primary mx-auto mb-3" />
              <p className="text-sm sm:text-base font-semibold text-primary">Personalized Care</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Tailored to your needs</p>
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
                className="h-auto p-4 flex flex-col gap-2 min-h-[80px]"
                onClick={() => {
                  onComplete();
                  // Could trigger navigation to assessment
                }}
              >
                <FileText className="w-6 h-6 flex-shrink-0" />
                <span className="text-sm text-center">Start Assessment</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col gap-2 min-h-[80px]"
                onClick={() => {
                  onComplete();
                  // Could trigger navigation to chat
                }}
              >
                <MessageSquare className="w-6 h-6 flex-shrink-0" />
                <span className="text-sm text-center">Try AI Chat</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col gap-2 min-h-[80px]"
                onClick={() => {
                  onComplete();
                  // Could trigger navigation to dashboard
                }}
              >
                <BarChart3 className="w-6 h-6 flex-shrink-0" />
                <span className="text-sm text-center">View Dashboard</span>
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
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto p-4 sm:p-6">
        <DialogHeader className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Badge variant="secondary" className="px-2 py-1 text-xs font-medium">
                {step + 1} of {tutorialSteps.length}
              </Badge>
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl leading-tight">{currentTutorialStep.title}</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="h-8 w-8 p-0 self-end sm:self-auto hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base leading-relaxed">{currentTutorialStep.description}</p>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Progress Bar */}
          <div className="space-y-3">
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-xs sm:text-sm text-muted-foreground font-medium">
              <span>Progress</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
          </div>

          {/* Step Content */}
          <Card className="border-0 shadow-none bg-muted/30">
            <CardContent className="p-4 sm:p-6 lg:p-8">
              {currentTutorialStep.content}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={step === 0}
              className="gap-2 w-full sm:w-auto h-11 sm:h-10 text-sm sm:text-base"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="w-full sm:w-auto h-11 sm:h-10 text-sm sm:text-base hover:bg-muted"
              >
                Skip Tutorial
              </Button>
              <Button
                onClick={handleNext}
                className="gap-2 w-full sm:w-auto h-11 sm:h-10 text-sm sm:text-base bg-primary hover:bg-primary/90"
              >
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
          <div className="flex justify-center gap-2 py-2">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                  index < step
                    ? 'bg-primary scale-110'
                    : index === step
                    ? 'bg-primary animate-pulse scale-125'
                    : 'bg-muted hover:bg-muted/80'
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