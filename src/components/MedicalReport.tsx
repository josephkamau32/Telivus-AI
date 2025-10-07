import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Home, AlertTriangle, Clock, User, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

interface MedicalReportProps {
  report: any;
  userInfo: {
    feelings: string;
    symptoms: string[];
    age: number;
  };
  timestamp: string;
  onBackToHome: () => void;
}

export const MedicalReport = ({ report, userInfo, timestamp, onBackToHome }: MedicalReportProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // Handle report object directly
  const parsedReport = typeof report === 'object' && report !== null ? report : null;

  // Helper function to check if a field has meaningful content
  const hasContent = (value: any): boolean => {
    if (!value) return false;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      return normalized !== '' &&
             normalized !== 'not provided' &&
             normalized !== 'not specified' &&
             normalized !== 'no significant past medical history reported' &&
             normalized !== 'no surgical history reported' &&
             normalized !== 'no current medications reported' &&
             normalized !== 'no known allergies reported' &&
             !normalized.includes('not provided') &&
             !normalized.includes('not specified');
    }
    return true;
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = 20;

      // Helper to add text with wrapping
      const addText = (text: string, fontSize: number, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const lines = doc.splitTextToSize(text, contentWidth);
        
        lines.forEach((line: string) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, margin, yPos);
          yPos += fontSize * 0.5;
        });
        yPos += 3;
      };

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('MEDICAL ASSESSMENT REPORT', margin, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date(timestamp).toLocaleString()}`, margin, 28);
      
      yPos = 45;
      doc.setTextColor(0, 0, 0);

      if (parsedReport) {
        // Demographic Header
        addText('DEMOGRAPHIC & ADMINISTRATIVE INFORMATION', 14, true);
        addText(`Name: ${parsedReport.demographic_header?.name || 'Not provided'}`, 11);
        addText(`Age: ${parsedReport.demographic_header?.age || userInfo.age} years`, 11);
        addText(`Gender: ${parsedReport.demographic_header?.gender || 'Not provided'}`, 11);
        addText(`Date: ${parsedReport.demographic_header?.date || new Date().toLocaleDateString()}`, 11);
        yPos += 5;

        // Chief Complaint
        addText('CHIEF COMPLAINT (CC)', 14, true);
        addText(parsedReport.chief_complaint || 'Not provided', 11);
        yPos += 5;

        // History of Present Illness
        addText('HISTORY OF PRESENT ILLNESS (HPI)', 14, true);
        addText(parsedReport.history_present_illness || 'Not provided', 11);
        yPos += 5;

        // Past Medical History
        addText('PAST MEDICAL HISTORY (PMH)', 14, true);
        addText(parsedReport.past_medical_history || 'Not provided', 11);
        yPos += 5;

        // Past Surgical History
        addText('PAST SURGICAL HISTORY (PSH)', 14, true);
        addText(parsedReport.past_surgical_history || 'Not provided', 11);
        yPos += 5;

        // Medications
        addText('MEDICATIONS', 14, true);
        addText(parsedReport.medications || 'Not provided', 11);
        yPos += 5;

        // Allergies
        addText('ALLERGIES', 14, true);
        addText(parsedReport.allergies || 'Not provided', 11);
        yPos += 5;

        // Assessment
        addText('ASSESSMENT (IMPRESSION)', 14, true);
        addText(parsedReport.assessment || 'Not provided', 11);
        yPos += 5;

        // Diagnostic Plan
        addText('DIAGNOSTIC PLAN', 14, true);
        addText(parsedReport.diagnostic_plan || 'Not provided', 11);
        yPos += 5;

        // OTC Recommendations
        if (parsedReport.otc_recommendations && parsedReport.otc_recommendations.length > 0) {
          addText('OVER-THE-COUNTER MEDICINE RECOMMENDATIONS', 14, true);
          parsedReport.otc_recommendations.forEach((otc: any, index: number) => {
            addText(`${index + 1}. ${otc.medicine}`, 12, true);
            addText(`Dosage: ${otc.dosage}`, 10);
            addText(`Purpose: ${otc.purpose}`, 10);
            addText(`Instructions: ${otc.instructions}`, 10);
            addText(`Precautions: ${otc.precautions}`, 10);
            addText(`Max Duration: ${otc.max_duration}`, 10);
            yPos += 3;
          });
          addText('Note: Always read medicine labels and consult a pharmacist or doctor if you have questions.', 9);
          yPos += 5;
        }
      } else {
        addText('Report content unavailable', 11);
      }

      // Disclaimer
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      yPos += 10;
      doc.setFillColor(254, 202, 202);
      doc.rect(margin, yPos - 5, contentWidth, 25, 'F');
      doc.setTextColor(153, 27, 27);
      addText('IMPORTANT DISCLAIMER', 12, true);
      doc.setTextColor(0, 0, 0);
      addText('This report is for informational purposes only and does not replace professional medical consultation, diagnosis, or treatment. Please consult a licensed healthcare provider.', 9);

      doc.save(`Medical-Report-${new Date(timestamp).toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
    
    setIsDownloading(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <User className="w-8 h-8" />
              Your Health Assessment Report
            </CardTitle>
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <Clock className="w-4 h-4" />
              Generated on {new Date(timestamp).toLocaleString()}
            </div>
          </CardHeader>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Assessment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Age</Label>
                <p className="text-lg font-semibold">{userInfo.age} years</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Current Feeling</Label>
                <Badge className="mt-1 capitalize">{userInfo.feelings}</Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Symptoms Count</Label>
                <p className="text-lg font-semibold">{userInfo.symptoms.length} reported</p>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Reported Symptoms</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {userInfo.symptoms.map((symptom) => (
                  <Badge key={symptom} variant="outline">
                    {symptom}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Report Sections */}
        {parsedReport ? (
          <>
            {/* Demographic Header */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Demographic & Administrative Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <p className="font-medium">{parsedReport.demographic_header?.name || 'Not provided'}</p>
                </div>
                <div>
                  <Label>Age</Label>
                  <p className="font-medium">{parsedReport.demographic_header?.age || userInfo.age} years</p>
                </div>
                <div>
                  <Label>Gender</Label>
                  <p className="font-medium">{parsedReport.demographic_header?.gender || 'Not provided'}</p>
                </div>
                <div>
                  <Label>Report Date</Label>
                  <p className="font-medium">{parsedReport.demographic_header?.date || new Date().toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Chief Complaint */}
            <Card>
              <CardHeader>
                <CardTitle>Chief Complaint (CC)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed">{parsedReport.chief_complaint || 'Not provided'}</p>
              </CardContent>
            </Card>

            {/* History of Present Illness */}
            {hasContent(parsedReport.history_present_illness) && (
              <Card className="bg-gradient-to-r from-blue-50/50 to-white dark:from-blue-950/20 dark:to-background">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    History of Present Illness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    {parsedReport.history_present_illness.split(/\.\s+/).filter((sentence: string) => sentence.trim()).map((sentence: string, idx: number) => (
                      <p key={idx} className="text-sm md:text-base leading-relaxed pl-4 border-l-2 border-blue-300">
                        {sentence.trim()}.
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medical History Grid - Only show fields with content */}
            {(hasContent(parsedReport.past_medical_history) || hasContent(parsedReport.past_surgical_history) || 
              hasContent(parsedReport.medications) || hasContent(parsedReport.allergies)) && (
              <div className="grid md:grid-cols-2 gap-6">
                {hasContent(parsedReport.past_medical_history) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Past Medical History (PMH)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="leading-relaxed">{parsedReport.past_medical_history}</p>
                    </CardContent>
                  </Card>
                )}

                {hasContent(parsedReport.past_surgical_history) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Past Surgical History (PSH)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="leading-relaxed">{parsedReport.past_surgical_history}</p>
                    </CardContent>
                  </Card>
                )}

                {hasContent(parsedReport.medications) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Current Medications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="leading-relaxed">{parsedReport.medications}</p>
                    </CardContent>
                  </Card>
                )}

                {hasContent(parsedReport.allergies) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Allergies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="leading-relaxed">{parsedReport.allergies}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Assessment */}
            {hasContent(parsedReport.assessment) && (
              <Card className="border-l-4 border-l-primary bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-primary">●</span> Clinical Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    {parsedReport.assessment.split(/\.\s+/).filter((sentence: string) => sentence.trim()).map((sentence: string, idx: number) => (
                      <p key={idx} className="text-sm md:text-base leading-relaxed">
                        {sentence.trim()}.
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Diagnostic Plan */}
            {hasContent(parsedReport.diagnostic_plan) && (
              <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-blue-500">●</span> Diagnostic & Treatment Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-gray-700 dark:text-gray-300">
                    {parsedReport.diagnostic_plan.split(/\d+\)\s+/).filter((section: string) => section.trim()).map((section: string, idx: number) => {
                      const [title, ...content] = section.split(':');
                      return (
                        <div key={idx} className="pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                          {title.includes('**') ? (
                            <p className="font-bold text-gray-900 dark:text-gray-100 mb-2">
                              {title.replace(/\*\*/g, '').trim()}:
                            </p>
                          ) : (
                            <p className="font-bold text-gray-900 dark:text-gray-100 mb-2">{title.trim()}:</p>
                          )}
                          <p className="text-sm md:text-base leading-relaxed">
                            {content.join(':').trim()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* OTC Recommendations */}
            {parsedReport.otc_recommendations && parsedReport.otc_recommendations.length > 0 && (
              <Card className="border-l-4 border-l-green-600 bg-gradient-to-r from-green-50 to-white dark:from-green-950/20 dark:to-background">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">💊</span>
                    <span className="text-green-700 dark:text-green-400">Over-the-Counter Medication Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {parsedReport.otc_recommendations.map((otc: any, index: number) => (
                      <div key={index} className="p-5 bg-white dark:bg-gray-800 rounded-lg border-2 border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </span>
                          <h4 className="font-bold text-green-900 dark:text-green-100 text-lg mt-1">{otc.medicine}</h4>
                        </div>
                        <div className="space-y-3 ml-11">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">💉 Dosage:</p>
                            <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 pl-6">{otc.dosage}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">🎯 Purpose:</p>
                            <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 pl-6">{otc.purpose}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">📋 Instructions:</p>
                            <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 pl-6">{otc.instructions}</p>
                          </div>
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border-l-4 border-yellow-400">
                            <p className="font-semibold text-yellow-900 dark:text-yellow-400 mb-1">⚠️ Precautions:</p>
                            <p className="text-sm text-yellow-900 dark:text-yellow-200 pl-6">{otc.precautions}</p>
                          </div>
                          {otc.max_duration && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border-l-4 border-red-400">
                              <p className="font-semibold text-red-900 dark:text-red-400 mb-1">⏱️ Maximum Duration:</p>
                              <p className="text-sm text-red-900 dark:text-red-200 pl-6">{otc.max_duration}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Alert className="mt-4 border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    <AlertDescription className="text-sm">
                      These are general recommendations. Always read medicine labels, follow package instructions, and consult a pharmacist or doctor if you have questions or concerns.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Report Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed">{report}</p>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="font-medium">
            <strong>Important Disclaimer:</strong> Telivus AI is not a substitute for professional medical advice. 
            Please consult a licensed healthcare provider for diagnosis and treatment. This assessment is for 
            informational purposes only and should not be used as the sole basis for medical decisions.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isDownloading}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Generating PDF...' : 'Download PDF Report'}
          </Button>
          
          <Button variant="outline" onClick={onBackToHome}>
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

      </div>
    </div>
  );
};

const Label = ({ className, children, ...props }: { className?: string; children: React.ReactNode }) => (
  <div className={`text-sm font-medium ${className}`} {...props}>
    {children}
  </div>
);