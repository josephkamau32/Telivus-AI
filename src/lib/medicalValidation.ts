// Medical Content Validation System
// Ensures AI-generated medical content meets safety and accuracy standards

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  recommendations: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ValidationIssue {
  type: 'critical' | 'major' | 'minor';
  category: 'safety' | 'accuracy' | 'completeness' | 'appropriateness';
  message: string;
  location?: string; // e.g., "assessment", "recommendations"
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'caution' | 'review' | 'enhancement';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export interface MedicalContent {
  chiefComplaint?: string;
  historyPresentIllness?: string;
  assessment?: string;
  diagnosticPlan?: any;
  otcRecommendations?: any[];
  lifestyleRecommendations?: string[];
  whenToSeekHelp?: string;
  patientAge?: number;
}

// Medical safety keywords and patterns
const DANGEROUS_PATTERNS = [
  /\b(?:never|always|definitely|absolutely|certainly)\b.*\b(?:safe|harmless|risk.free)\b/i,
  /\b(?:guaranteed|cure|treat|heal)\b.*\b(?:all|every|any)\b.*\b(?:condition|disease|illness)\b/i,
  /\b(?:ignore|disregard|skip)\b.*\b(?:professional|doctor|medical)\b.*\b(?:advice|help|care)\b/i,
  /\b(?:replace|substitute|instead of)\b.*\b(?:doctor|physician|healthcare)\b/i,
];

const REQUIRED_DISCLAIMERS = [
  'consult healthcare professional',
  'not medical advice',
  'seek professional help',
  'emergency symptoms',
  'not a substitute',
];

const EMERGENCY_KEYWORDS = [
  'chest pain', 'difficulty breathing', 'severe headache', 'unconsciousness',
  'severe bleeding', 'seizure', 'stroke symptoms', 'heart attack',
  'loss of consciousness', 'severe allergic reaction', 'high fever in infants'
];

class MedicalContentValidator {
  private content: MedicalContent;
  private issues: ValidationIssue[] = [];
  private warnings: ValidationWarning[] = [];
  private score: number = 100;

  constructor(content: MedicalContent) {
    this.content = content;
  }

  validate(): ValidationResult {
    this.issues = [];
    this.warnings = [];
    this.score = 100;

    this.validateSafety();
    this.validateAccuracy();
    this.validateCompleteness();
    this.validateAppropriateness();

    const isValid = this.issues.filter(issue => issue.type === 'critical').length === 0;
    const confidence = this.calculateConfidence();

    return {
      isValid,
      score: Math.max(0, this.score),
      issues: this.issues,
      warnings: this.warnings,
      recommendations: this.generateRecommendations(),
      confidence
    };
  }

  private validateSafety(): void {
    const allText = this.getAllText();

    // Check for dangerous patterns
    DANGEROUS_PATTERNS.forEach(pattern => {
      if (pattern.test(allText)) {
        this.addIssue({
          type: 'critical',
          category: 'safety',
          message: 'Potentially dangerous medical advice detected',
          suggestion: 'Remove absolute claims about safety or effectiveness'
        });
        this.score -= 30;
      }
    });

    // Check for emergency symptoms without proper warnings
    const hasEmergencyContent = EMERGENCY_KEYWORDS.some(keyword =>
      allText.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasEmergencyContent && !this.hasEmergencyGuidance()) {
      this.addIssue({
        type: 'major',
        category: 'safety',
        message: 'Emergency symptoms mentioned without clear guidance',
        suggestion: 'Add explicit instructions to seek immediate medical attention'
      });
      this.score -= 20;
    }

    // Check for required disclaimers
    const missingDisclaimers = REQUIRED_DISCLAIMERS.filter(disclaimer =>
      !allText.toLowerCase().includes(disclaimer.toLowerCase())
    );

    if (missingDisclaimers.length > 0) {
      this.addWarning({
        type: 'caution',
        message: `Missing important disclaimers: ${missingDisclaimers.join(', ')}`,
        priority: 'high'
      });
      this.score -= 10;
    }
  }

  private validateAccuracy(): void {
    // Check for medical accuracy issues
    if (this.content.assessment) {
      // Flag overly definitive diagnoses
      const definitiveTerms = /\b(?:definitely|clearly|obviously|certainly)\b.*\b(?:have|is|suffering from)\b/i;
      if (definitiveTerms.test(this.content.assessment)) {
        this.addWarning({
          type: 'review',
          message: 'Overly definitive diagnostic language detected',
          priority: 'medium'
        });
        this.score -= 5;
      }

      // Check for balanced differential diagnoses
      const diagnosisCount = (this.content.assessment.match(/\b(?:diagnosis|condition|disorder|syndrome)\b/gi) || []).length;
      if (diagnosisCount > 3) {
        this.addWarning({
          type: 'review',
          message: 'Multiple diagnoses suggested - ensure proper differential consideration',
          priority: 'medium'
        });
      }
    }

    // Validate OTC recommendations
    if (this.content.otcRecommendations) {
      this.content.otcRecommendations.forEach((rec, index) => {
        if (!rec.dosage || !rec.purpose || !rec.precautions) {
          this.addIssue({
            type: 'major',
            category: 'accuracy',
            message: `Incomplete OTC recommendation at index ${index}`,
            location: 'otc_recommendations',
            suggestion: 'Ensure all recommendations include dosage, purpose, and precautions'
          });
          this.score -= 15;
        }

        // Check for potentially inappropriate recommendations
        if (rec.medicine?.toLowerCase().includes('aspirin') && this.content.patientAge && this.content.patientAge < 18) {
          this.addIssue({
            type: 'critical',
            category: 'safety',
            message: 'Aspirin recommended for patient under 18',
            location: 'otc_recommendations',
            suggestion: 'Aspirin is contraindicated in children due to Reye syndrome risk'
          });
          this.score -= 25;
        }
      });
    }
  }

  private validateCompleteness(): void {
    // Check for required sections
    const requiredSections = ['chiefComplaint', 'assessment', 'diagnosticPlan'];
    const missingSections = requiredSections.filter(section =>
      !this.content[section as keyof MedicalContent]
    );

    if (missingSections.length > 0) {
      this.addIssue({
        type: 'major',
        category: 'completeness',
        message: `Missing required sections: ${missingSections.join(', ')}`,
        suggestion: 'Ensure all standard medical report sections are included'
      });
      this.score -= 20;
    }

    // Check diagnostic plan completeness
    if (this.content.diagnosticPlan) {
      const plan = this.content.diagnosticPlan;
      if (!plan.red_flags || plan.red_flags.length === 0) {
        this.addWarning({
          type: 'enhancement',
          message: 'No red flags identified in diagnostic plan',
          priority: 'medium'
        });
        this.score -= 5;
      }

      if (!plan.follow_up) {
        this.addWarning({
          type: 'enhancement',
          message: 'No follow-up recommendations provided',
          priority: 'low'
        });
        this.score -= 3;
      }
    }

    // Check for when to seek help guidance
    if (!this.content.whenToSeekHelp) {
      this.addWarning({
        type: 'enhancement',
        message: 'No guidance provided for when to seek professional help',
        priority: 'high'
      });
      this.score -= 10;
    }
  }

  private validateAppropriateness(): void {
    // Age-appropriate content validation
    if (this.content.patientAge) {
      const age = this.content.patientAge;

      // Pediatric considerations
      if (age < 12 && this.content.otcRecommendations && this.content.otcRecommendations.length > 0) {
        this.addWarning({
          type: 'caution',
          message: 'OTC recommendations for pediatric patient - ensure age-appropriate dosing',
          priority: 'high'
        });
        this.score -= 5;
      }

      // Geriatric considerations
      if (age > 65) {
        const allText = this.getAllText();
        if (!allText.toLowerCase().includes('elderly') && !allText.toLowerCase().includes('geriatric')) {
          this.addWarning({
            type: 'enhancement',
            message: 'Consider geriatric-specific considerations for elderly patient',
            priority: 'medium'
          });
        }
      }
    }

    // Content length validation
    const assessmentLength = this.content.assessment?.length || 0;
    if (assessmentLength < 50) {
      this.addWarning({
        type: 'enhancement',
        message: 'Assessment section is quite brief - consider more detailed explanation',
        priority: 'low'
      });
    } else if (assessmentLength > 1000) {
      this.addWarning({
        type: 'review',
        message: 'Assessment section is very long - ensure clarity and focus',
        priority: 'low'
      });
    }
  }

  private hasEmergencyGuidance(): boolean {
    const allText = this.getAllText().toLowerCase();
    return allText.includes('emergency') ||
           allText.includes('immediate medical attention') ||
           allText.includes('seek urgent care') ||
           allText.includes('call emergency') ||
           allText.includes('go to er') ||
           allText.includes('hospital');
  }

  private getAllText(): string {
    return [
      this.content.chiefComplaint,
      this.content.historyPresentIllness,
      this.content.assessment,
      JSON.stringify(this.content.diagnosticPlan),
      JSON.stringify(this.content.otcRecommendations),
      this.content.lifestyleRecommendations?.join(' '),
      this.content.whenToSeekHelp
    ].filter(Boolean).join(' ');
  }

  private addIssue(issue: ValidationIssue): void {
    this.issues.push(issue);
  }

  private addWarning(warning: ValidationWarning): void {
    this.warnings.push(warning);
  }

  private calculateConfidence(): 'high' | 'medium' | 'low' {
    if (this.score >= 80) return 'high';
    if (this.score >= 60) return 'medium';
    return 'low';
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.issues.some(issue => issue.type === 'critical')) {
      recommendations.push('Address critical safety issues before publishing');
    }

    if (this.warnings.some(w => w.priority === 'high')) {
      recommendations.push('Review high-priority warnings for content improvement');
    }

    if (this.score < 70) {
      recommendations.push('Consider content revision or expert medical review');
    }

    if (this.issues.length === 0 && this.warnings.length === 0) {
      recommendations.push('Content validation passed - ready for use');
    }

    return recommendations;
  }
}

// Main validation function
export function validateMedicalContent(content: MedicalContent): ValidationResult {
  const validator = new MedicalContentValidator(content);
  return validator.validate();
}

// Quick validation for real-time feedback
export function quickValidateMedicalContent(content: MedicalContent): {
  hasCriticalIssues: boolean;
  hasWarnings: boolean;
  score: number;
} {
  const result = validateMedicalContent(content);
  return {
    hasCriticalIssues: result.issues.some(issue => issue.type === 'critical'),
    hasWarnings: result.warnings.length > 0,
    score: result.score
  };
}

// Content filtering for sensitive medical information
export function filterSensitiveContent(text: string): string {
  // Remove or mask sensitive information
  const sensitivePatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // Credit cards
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
  ];

  let filtered = text;
  sensitivePatterns.forEach(pattern => {
    filtered = filtered.replace(pattern, '[REDACTED]');
  });

  return filtered;
}