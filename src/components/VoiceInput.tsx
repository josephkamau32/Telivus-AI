import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// TypeScript declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    mozSpeechRecognition: any;
    msSpeechRecognition: any;
  }
}

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const VoiceInput = ({
  onTranscript,
  placeholder = "Click to speak...",
  disabled = false,
  className = ""
}: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [listeningTime, setListeningTime] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const listeningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Check browser compatibility
  const checkBrowserSupport = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition ||
                             window.webkitSpeechRecognition ||
                             window.mozSpeechRecognition ||
                             window.msSpeechRecognition;

    return !!SpeechRecognition;
  }, []);

  const [isSupported, setIsSupported] = useState(() => checkBrowserSupport());


  const initializeSpeechRecognition = useCallback(() => {
    // Check for browser support with multiple prefixes
    let SpeechRecognition = window.SpeechRecognition ||
                           window.webkitSpeechRecognition ||
                           window.mozSpeechRecognition ||
                           window.msSpeechRecognition;


    if (!SpeechRecognition) {
      // Instead of just showing error, provide alternative options
      toast({
        title: "Voice Input Limited",
        description: "Your browser has limited voice support. Try Chrome, Edge, or Safari for best experience. You can still use text input.",
        variant: "default",
      });
      return null;
    }

    try {
      const recognition = new SpeechRecognition();

      // Configure recognition settings for better listening
      recognition.continuous = true; // Keep listening until stopped
      recognition.interimResults = true; // Get interim results for better UX
      recognition.lang = 'en-US'; // Can be made configurable later
      recognition.maxAlternatives = 3; // More alternatives for better accuracy

      // Extended timeout settings for longer listening
      if ('timeout' in recognition) {
        (recognition as any).timeout = 10000; // 10 seconds timeout
      }
      if ('maxAlternatives' in recognition) {
        recognition.maxAlternatives = 3;
      }
      if ('serviceURI' in recognition) {
        // Some polyfills support service URI configuration
      }

      // Try to set additional properties if supported
      if ('grammars' in recognition) {
        // Could add custom grammars for medical terms
      }

      recognition.onstart = () => {
        setIsListening(true);
        setIsProcessing(false);
        setListeningTime(0);
        setInterimTranscript('');

        // Start listening timer
        listeningTimerRef.current = setInterval(() => {
          setListeningTime(prev => {
            if (prev >= 15) { // Auto-stop after 15 seconds
              stopListening();
              return prev;
            }
            return prev + 1;
          });
        }, 1000);

        // Reset silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
      };

      recognition.onresult = (event) => {
        try {
          let finalTranscript = '';
          let interimText = '';

          // Process all results
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimText += transcript;
            }
          }

          setInterimTranscript(interimText);

          // Reset silence timer when we get results
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          // Set silence timer - stop listening after 3 seconds of silence
          silenceTimerRef.current = setTimeout(() => {
            if (finalTranscript.trim()) {
              setIsProcessing(true);
              onTranscript(finalTranscript.trim());
              stopListening();
            } else {
              // No final result, show message
              toast({
                title: "No Speech Detected",
                description: "Please speak clearly and try again.",
                variant: "default",
              });
              stopListening();
            }
          }, 3000);

          // If we have a final result, process it immediately
          if (finalTranscript.trim()) {
            setIsProcessing(true);
            onTranscript(finalTranscript.trim());
            stopListening();
          }
        } catch (error) {
          console.error('Error processing speech result:', error);
          toast({
            title: "Processing Error",
            description: "Failed to process speech. Please try again.",
            variant: "destructive",
          });
          stopListening();
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error, event);
        setIsListening(false);
        setIsProcessing(false);

        let errorMessage = "Voice input failed. Please try again.";
        let title = "Voice Input Error";

        switch (event.error) {
          case 'network':
            errorMessage = "Network error. Check your connection and try again.";
            break;
          case 'not-allowed':
          case 'permission-denied':
            errorMessage = "Microphone access denied. Please allow microphone access in your browser settings and try again.";
            break;
          case 'no-speech':
          case 'no-match':
            errorMessage = "No speech detected. Please speak clearly and try again.";
            break;
          case 'audio-capture':
            errorMessage = "Microphone not found or not accessible. Please check your microphone and try again.";
            break;
          case 'service-not-allowed':
            errorMessage = "Speech recognition service not available. Please try again later.";
            break;
          case 'language-not-supported':
            errorMessage = "Language not supported. Please try a different language setting.";
            break;
          case 'aborted':
            errorMessage = "Voice input was cancelled.";
            break;
          default:
            // For unknown errors, provide helpful fallback
            errorMessage = "Voice recognition failed. You can still type your symptoms manually.";
            title = "Voice Input Unavailable";
        }

        toast({
          title,
          description: errorMessage,
          variant: event.error === 'not-allowed' || event.error === 'permission-denied' ? "destructive" : "default",
        });
      };

      recognition.onend = () => {
        setIsListening(false);
        setIsProcessing(false);
        setInterimTranscript('');

        // Clean up timers
        if (listeningTimerRef.current) {
          clearInterval(listeningTimerRef.current);
          listeningTimerRef.current = null;
        }
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };

      // Handle browser-specific events
      if ('onaudiostart' in recognition) {
        recognition.onaudiostart = () => {
          console.log('Audio capture started');
        };
      }

      if ('onaudioend' in recognition) {
        recognition.onaudioend = () => {
          console.log('Audio capture ended');
        };
      }

      return recognition;
    } catch (error) {
      console.error('Error creating speech recognition:', error);
      toast({
        title: "Voice Input Setup Failed",
        description: "Failed to initialize voice recognition. Please use text input instead.",
        variant: "destructive",
      });
      return null;
    }
  }, [onTranscript, toast]);

  const startListening = () => {
    if (disabled || isProcessing) return;

    if (!recognitionRef.current) {
      recognitionRef.current = initializeSpeechRecognition();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast({
          title: "Voice Input Error",
          description: "Failed to start voice input. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }

    // Clean up timers
    if (listeningTimerRef.current) {
      clearInterval(listeningTimerRef.current);
      listeningTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      setIsProcessing(true);
      onTranscript(textInput.trim());
      setTextInput('');
      setShowTextFallback(false);
    }
  };

  const toggleTextFallback = () => {
    setShowTextFallback(!showTextFallback);
    if (isListening) {
      stopListening();
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Voice Input Button */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={isListening ? "destructive" : "outline"}
          size="sm"
          onClick={handleClick}
          disabled={disabled || isProcessing || !isSupported}
          className={`gap-2 ${isListening ? 'animate-listening' : ''}`}
          title={
            !isSupported
              ? "Voice input not supported in this browser"
              : isListening
                ? "Stop listening"
                : "Start voice input"
          }
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : isListening ? (
            <>
              <MicOff className="w-4 h-4" />
              Listening... ({listeningTime}s)
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              {isSupported ? placeholder : "Voice not supported"}
            </>
          )}
        </Button>

        {/* Text Input Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleTextFallback}
          disabled={disabled || isProcessing}
          className="gap-2"
          title="Switch to text input"
        >
          <AlertTriangle className="w-4 h-4" />
          Text
        </Button>
      </div>

      {/* Listening Status and Interim Transcript */}
      {isListening && (
        <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-red-800 dark:text-red-200">
              Listening... Speak now (max 15s)
            </span>
          </div>
          {interimTranscript && (
            <p className="text-sm text-red-700 dark:text-red-300 italic">
              "{interimTranscript}"
            </p>
          )}
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Will stop automatically after 3 seconds of silence or when you finish speaking.
          </p>
        </div>
      )}

      {/* Text Input Fallback */}
      {showTextFallback && (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
            placeholder="Type your symptoms here..."
            className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
            disabled={disabled || isProcessing}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleTextSubmit}
            disabled={disabled || isProcessing || !textInput.trim()}
          >
            Send
          </Button>
        </div>
      )}

      {/* Browser Compatibility Notice */}
      {!isSupported && (
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>💡 Browser Tip:</strong> Voice input works best in Chrome, Edge, or Safari.
            Don't worry - the text input option below works perfectly in all browsers!
          </p>
        </div>
      )}

      {/* Firefox-specific notice */}
      {isSupported && /^((?!chrome|android).)*firefox/i.test(navigator.userAgent) && (
        <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>🦊 Firefox User:</strong> Voice input is supported but works best in Chrome, Edge, or Safari.
            The text input option is always available and works great!
          </p>
        </div>
      )}
    </div>
  );
};

// TypeScript declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default VoiceInput;