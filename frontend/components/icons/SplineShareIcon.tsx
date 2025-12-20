import React from 'react';

interface SplineShareIconProps {
  className?: string;
}

export const SplineShareIcon: React.FC<SplineShareIconProps> = ({ 
  className = '' 
}) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Smooth S-curve arrow */}
      <path
        d="M4 12C4 12 6 6 12 6C18 6 20 12 20 12C20 12 18 18 12 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* Arrow head */}
      <path
        d="M9 15L12 18L9 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

