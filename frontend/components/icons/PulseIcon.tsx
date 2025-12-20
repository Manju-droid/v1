import React from 'react';

interface PulseIconProps {
  active?: boolean;
  filled?: boolean;
  className?: string;
}

export const PulseIcon: React.FC<PulseIconProps> = ({ 
  active = false, 
  filled = false, 
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
      {/* Outer ring */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={active || filled ? "0.4" : "0.6"}
      />
      {/* Middle ring */}
      <circle
        cx="12"
        cy="12"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={active || filled ? "0.6" : "0.8"}
      />
      {/* Inner dot */}
      <circle
        cx="12"
        cy="12"
        r="3"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
};

