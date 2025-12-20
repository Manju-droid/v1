import React from 'react';

interface HexSaveIconProps {
  saved?: boolean;
  className?: string;
}

export const HexSaveIcon: React.FC<HexSaveIconProps> = ({ 
  saved = false, 
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
      <defs>
        {saved && (
          <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
        )}
      </defs>
      {/* Hexagon with notch */}
      <path
        d="M12 2L20 7V17L12 22L4 17V7L12 2Z M17 5L17 3"
        stroke={saved ? "url(#hexGradient)" : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={saved ? "url(#hexGradient)" : "none"}
        opacity={saved ? "1" : "0.8"}
      />
      {/* Small notch at top-right */}
      <path
        d="M18 6.5L19.5 5.5"
        stroke={saved ? "url(#hexGradient)" : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

