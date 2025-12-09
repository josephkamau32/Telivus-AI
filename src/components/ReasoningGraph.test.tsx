import { render, screen, fireEvent } from '@testing-library/react';
import ReasoningGraph from './ReasoningGraph';

// Mock data for testing
const mockGraphData = {
  nodes: [
    {
      id: 'symptom_1',
      type: 'symptom',
      label: 'Headache',
      description: 'Patient reports headache',
      confidence_score: 0.95,
      evidence_sources: ['patient_report'],
      metadata: {}
    },
    {
      id: 'condition_1',
      type: 'condition',
      label: 'Tension Headache',
      description: 'Common headache type',
      confidence_score: 0.75,
      evidence_sources: ['medical_knowledge'],
      metadata: { icd_code: 'G44.2' }
    }
  ],
  edges: [
    {
      source_id: 'symptom_1',
      target_id: 'condition_1',
      relationship_type: 'supports',
      strength: 0.8,
      explanation: 'Headache supports tension headache diagnosis'
    }
  ],
  root_symptoms: ['symptom_1'],
  final_diagnosis: 'condition_1',
  triage_level: 'routine',
  reasoning_summary: 'Analysis completed successfully'
};

describe('ReasoningGraph', () => {
  it('renders without crashing', () => {
    render(<ReasoningGraph graph={mockGraphData} />);
    expect(screen.getByText('AI Reasoning Graph')).toBeInTheDocument();
  });

  it('displays triage level correctly', () => {
    render(<ReasoningGraph graph={mockGraphData} />);
    expect(screen.getByText('routine')).toBeInTheDocument();
  });

  it('shows symptoms section', () => {
    render(<ReasoningGraph graph={mockGraphData} />);
    expect(screen.getByText('Reported Symptoms')).toBeInTheDocument();
    expect(screen.getByText('Headache')).toBeInTheDocument();
  });

  it('shows conditions section', () => {
    render(<ReasoningGraph graph={mockGraphData} />);
    expect(screen.getByText('Possible Conditions')).toBeInTheDocument();
    expect(screen.getByText('Tension Headache')).toBeInTheDocument();
  });

  it('displays confidence scores', () => {
    render(<ReasoningGraph graph={mockGraphData} />);
    expect(screen.getByText('95% confidence')).toBeInTheDocument();
    expect(screen.getByText('75% confidence')).toBeInTheDocument();
  });

  it('shows final diagnosis badge', () => {
    render(<ReasoningGraph graph={mockGraphData} />);
    expect(screen.getByText('Final Diagnosis')).toBeInTheDocument();
  });

  it('handles invalid data gracefully', () => {
    const invalidData = { nodes: null, edges: null };
    render(<ReasoningGraph graph={invalidData as any} />);
    expect(screen.getByText('Reasoning Graph Unavailable')).toBeInTheDocument();
  });

  it('allows expanding condition details', () => {
    render(<ReasoningGraph graph={mockGraphData} />);
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);
    // Should show expanded content
    expect(screen.getByText('Supporting Relationships:')).toBeInTheDocument();
  });

  it('displays reasoning summary', () => {
    render(<ReasoningGraph graph={mockGraphData} />);
    expect(screen.getByText('AI Reasoning Summary')).toBeInTheDocument();
    expect(screen.getByText('Analysis completed successfully')).toBeInTheDocument();
  });
});