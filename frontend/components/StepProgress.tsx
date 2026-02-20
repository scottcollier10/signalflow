'use client';

import { useEffect, useState } from 'react';

interface StepProgressProps {
  className?: string;
  executionCount: number; // REQUIRED: Actual count from database
}

export function StepProgress({ className = '', executionCount }: StepProgressProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // CORE LOGIC: Derive state from execution count
  useEffect(() => {
    if (executionCount === 0) {
      // Dashboard empty = fresh start
      setCurrentStep(1);
      setCompletedSteps([]);
      // Clear any old localStorage
      localStorage.removeItem('signalflow-current-step');
      localStorage.removeItem('signalflow-completed-steps');
      return;
    }

    if (executionCount === 1) {
      // After 1st import: Steps 1-2 complete (redirected to analysis), Step 3 active
      setCurrentStep(3);
      setCompletedSteps([1, 2]);
      localStorage.setItem('signalflow-current-step', '3');
      localStorage.setItem('signalflow-completed-steps', JSON.stringify([1, 2]));
      return;
    }

    if (executionCount === 2) {
      // After 2nd import: Steps 1-3 complete, Step 4 active
      setCurrentStep(4);
      setCompletedSteps([1, 2, 3]);
      localStorage.setItem('signalflow-current-step', '4');
      localStorage.setItem('signalflow-completed-steps', JSON.stringify([1, 2, 3]));
      return;
    }

    // executionCount >= 3: Component will hide (see return null below)
  }, [executionCount]);

  // Listen for manual step updates (viewing analysis, clicking optimize)
  useEffect(() => {
    const handleStepUpdate = (event: CustomEvent) => {
      const { completed } = event.detail;

      if (completed !== undefined) {
        const newCompleted = [...new Set([...completedSteps, completed])];
        setCompletedSteps(newCompleted);
        setCurrentStep(completed + 1);

        localStorage.setItem('signalflow-current-step', (completed + 1).toString());
        localStorage.setItem('signalflow-completed-steps', JSON.stringify(newCompleted));
      }
    };

    window.addEventListener('updateStepProgress' as unknown as keyof WindowEventMap, handleStepUpdate as EventListener);
    return () => window.removeEventListener('updateStepProgress' as unknown as keyof WindowEventMap, handleStepUpdate as EventListener);
  }, [completedSteps]);

  // Hide if 3+ executions
  if (executionCount >= 3) {
    return null;
  }

  const steps = [
    { number: 1, label: 'Import Executions', sublabel: 'Upload or fetch workflow data' },
    { number: 2, label: 'View Analysis', sublabel: 'Review bottlenecks & insights' },
    { number: 3, label: 'Optimize w/ Claude Code', sublabel: 'Generate optimized workflow' },
    { number: 4, label: 'Import, Test, Repeat', sublabel: 'See the improvement' },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-3 ${className}`}>
      {steps.map((step) => {
        const isCompleted = completedSteps.includes(step.number);
        const isActive = currentStep === step.number && !isCompleted;
        const isLocked = step.number > currentStep && !isCompleted;

        return (
          <div
            key={step.number}
            className={`neu-raised-sm p-6 text-center transition-all duration-300 ${
              isActive ? 'ring-2 ring-neu-accent shadow-lg' : ''
            } ${isLocked ? 'opacity-60' : ''}`}
          >
            <div className="flex flex-col items-center gap-3">
              {/* Number/Checkmark Badge */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg ${
                  isCompleted
                    ? 'bg-gradient-to-br from-neu-green to-neu-teal text-white'
                    : isActive
                    ? 'bg-gradient-to-br from-neu-accent to-neu-accent-light text-white'
                    : 'bg-neu-shadow-light text-neu-text-muted'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>

              {/* Step Label */}
              <div>
                <div
                  className={`font-semibold text-sm mb-1 ${
                    isActive
                      ? 'text-neu-accent'
                      : isCompleted
                      ? 'text-neu-green'
                      : 'text-neu-text-muted'
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-xs text-neu-text-muted">{step.sublabel}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper function for manual step completion (viewing analysis, clicking optimize)
export function updateStepProgress(updates: { completed?: number }) {
  const event = new CustomEvent('updateStepProgress', { detail: updates });
  window.dispatchEvent(event);
}
