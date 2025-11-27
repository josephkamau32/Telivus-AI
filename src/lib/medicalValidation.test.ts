import { describe, it, expect } from 'vitest';
import { validateMedicalContent, quickValidateMedicalContent, filterSensitiveContent } from './medicalValidation';
import type { MedicalContent } from './medicalValidation';

describe('Medical Content Validation', () => {
  describe('validateMedicalContent', () => {
    it('should validate safe medical content', () => {
      const content: MedicalContent = {
        chiefComplaint: 'Headache and fatigue',
        assessment: 'Patient reports tension headache. This is common and usually benign.',
        diagnosticPlan: {
          consultations: ['Primary care physician if symptoms persist'],
          tests: ['None needed for routine headache'],
          red_flags: ['Severe headache with neurological symptoms'],
          follow_up: 'Return if symptoms worsen'
        },
        otcRecommendations: [
          {
            medicine: 'Acetaminophen (Tylenol)',
            dosage: '500-1000 mg every 4-6 hours',
            purpose: 'Pain relief',
            instructions: 'Take with food',
            precautions: 'Do not exceed recommended dose',
            max_duration: '3 days'
          }
        ],
        lifestyleRecommendations: ['Rest and hydration'],
        whenToSeekHelp: 'Seek immediate care for severe symptoms'
      };

      const result = validateMedicalContent(content);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(80);
      expect(result.confidence).toBe('high');
    });

    it('should flag dangerous medical advice', () => {
      const content: MedicalContent = {
        assessment: 'This treatment always works and is completely safe for everyone.',
        otcRecommendations: [
          {
            medicine: 'Aspirin',
            dosage: 'Any amount',
            purpose: 'Cure all ailments',
            instructions: 'Take whenever you feel like it',
            precautions: 'No precautions needed',
            max_duration: 'Forever'
          }
        ]
      };

      const result = validateMedicalContent(content);

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(50);
      expect(result.issues.some(issue => issue.category === 'safety')).toBe(true);
    });

    it('should detect missing emergency guidance', () => {
      const content: MedicalContent = {
        chiefComplaint: 'Chest pain and shortness of breath',
        assessment: 'Patient has serious symptoms',
        diagnosticPlan: {
          consultations: ['Doctor'],
          tests: ['ECG'],
          red_flags: [],
          follow_up: 'Follow up'
        }
      };

      const result = validateMedicalContent(content);

      expect(result.warnings.some(w => w.message.includes('emergency'))).toBe(true);
    });

    it('should validate pediatric medication safety', () => {
      const content: MedicalContent = {
        patientAge: 15,
        otcRecommendations: [
          {
            medicine: 'Aspirin',
            dosage: '325 mg',
            purpose: 'Pain relief',
            instructions: 'Take as needed',
            precautions: 'Standard precautions',
            max_duration: '5 days'
          }
        ]
      };

      const result = validateMedicalContent(content);

      expect(result.issues.some(issue => issue.message.includes('aspirin') && issue.message.includes('18'))).toBe(true);
    });
  });

  describe('quickValidateMedicalContent', () => {
    it('should provide quick validation results', () => {
      const content: MedicalContent = {
        assessment: 'This is guaranteed to cure everything safely.',
      };

      const result = quickValidateMedicalContent(content);

      expect(result.hasCriticalIssues).toBe(true);
      expect(result.score).toBeLessThan(70);
    });
  });

  describe('filterSensitiveContent', () => {
    it('should filter email addresses', () => {
      const text = 'Contact support@example.com for help';
      const filtered = filterSensitiveContent(text);

      expect(filtered).toContain('[REDACTED]');
      expect(filtered).not.toContain('support@example.com');
    });

    it('should filter credit card numbers', () => {
      const text = 'Card number: 4111-1111-1111-1111';
      const filtered = filterSensitiveContent(text);

      expect(filtered).toContain('[REDACTED]');
      expect(filtered).not.toContain('4111-1111-1111-1111');
    });

    it('should handle multiple sensitive items', () => {
      const text = 'Email: test@example.com and card: 4111111111111111';
      const filtered = filterSensitiveContent(text);

      expect(filtered.match(/\[REDACTED\]/g)).toHaveLength(2);
    });
  });
});