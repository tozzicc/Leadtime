import React from 'react';

interface Step {
  sigla: string;
  dias: number;
  dataPrevista: string;
}

interface ProductTimelineProps {
  steps: Step[];
  totalDays: number;
  colors: { [key: string]: string };
}

const ProductTimeline: React.FC<ProductTimelineProps> = ({ steps, totalDays, colors }) => {
  return (
    <div className="timeline-wrapper">
      <div className="timeline-container">
        {steps.map((step, idx) => {
          // Calculate incremental width
          // If it's the first step, width is its days.
          // Otherwise, it's step.dias - previousStep.dias.
          const prevDays = idx > 0 ? steps[idx - 1].dias : 0;
          const segmentDays = step.dias - prevDays;
          const width = totalDays > 0 ? (segmentDays / totalDays) * 100 : 0;
          
          if (width <= 0 && segmentDays <= 0 && idx > 0) return null;

          return (
            <div
              key={idx}
              className="timeline-step"
              style={{ 
                width: `${width}%`, 
                backgroundColor: colors[step.sigla] || '#6366f1',
                minWidth: segmentDays > 0 ? '2px' : '0'
              }}
            >
              <div className="step-label-above">
                <span className="step-sigla">{step.sigla}</span>
                <span className="step-date">{step.dataPrevista}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductTimeline;
