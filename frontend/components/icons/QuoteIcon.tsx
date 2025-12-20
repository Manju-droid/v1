import React from 'react';

interface QuoteIconProps {
  className?: string;
}

export const QuoteIcon: React.FC<QuoteIconProps> = ({ className = '' }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Rounded rectangle background */}
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.6"
      />
      {/* Left quote mark */}
      <path
        d="M8 10L10 12L8 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right quote mark */}
      <path
        d="M16 10L14 12L16 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

