import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Home, AlertTriangle, Clock, User, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

interface MedicalReportProps {
  report: string;
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

  // Parse the JSON report
  let parsedReport;
  try {
    parsedReport = typeof report === 'string' ? JSON.parse(report) : report;
  } catch {
    parsedReport = null;
  }

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
            <Card>
              <CardHeader>
                <CardTitle>History of Present Illness (HPI)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed">{parsedReport.history_present_illness || 'Not provided'}</p>
              </CardContent>
            </Card>

            {/* Medical History Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Past Medical History (PMH)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed">{parsedReport.past_medical_history || 'Not provided'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Past Surgical History (PSH)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed">{parsedReport.past_surgical_history || 'Not provided'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Medications</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed">{parsedReport.medications || 'Not provided'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Allergies</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed">{parsedReport.allergies || 'Not provided'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Assessment */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Assessment (Impression)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed">{parsedReport.assessment || 'Not provided'}</p>
              </CardContent>
            </Card>

            {/* Diagnostic Plan */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Diagnostic Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed">{parsedReport.diagnostic_plan || 'Not provided'}</p>
              </CardContent>
            </Card>

            {/* OTC Recommendations */}
            {parsedReport.otc_recommendations && parsedReport.otc_recommendations.length > 0 && (
              <Card className="border-green-500/20 bg-green-50/50 dark:bg-green-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Over-the-Counter Medicine Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {parsedReport.otc_recommendations.map((otc: any, index: number) => (
                      <div key={index} className="border border-border rounded-lg p-4 bg-background">
                        <div className="font-semibold text-lg mb-2">{otc.medicine}</div>
                        <div className="grid gap-2 text-sm">
                          <div><span className="font-medium">Dosage:</span> {otc.dosage}</div>
                          <div><span className="font-medium">Purpose:</span> {otc.purpose}</div>
                          <div><span className="font-medium">Instructions:</span> {otc.instructions}</div>
                          <div><span className="font-medium">Precautions:</span> {otc.precautions}</div>
                          <div><span className="font-medium">Max Duration:</span> {otc.max_duration}</div>
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
            <strong>Important Disclaimer:</strong> MediSense AI is not a substitute for professional medical advice. 
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