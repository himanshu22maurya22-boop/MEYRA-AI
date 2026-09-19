import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  animated?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  showText = false,
  className = "",
  animated = false,
}) => {
  const sizeMap = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-14 h-14",
  };

  const iconSizeMap = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-6 h-6",
    xl: "w-7 h-7",
  };

  const textMap = {
    sm: "text-sm font-bold",
    md: "text-base font-bold",
    lg: "text-xl font-extrabold",
    xl: "text-2xl font-black",
  };

  return (
    <div id="meyra-brand-logo" className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Modern Faceted MEYRA AI Emblem */}
      <div
        className={`relative flex items-center justify-center rounded-xl bg-slate-900 border border-indigo-500/30 shadow-lg shadow-indigo-500/20 shrink-0 overflow-hidden ${
          sizeMap[size]
        } ${animated ? "animate-pulse" : ""}`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full p-1.5`}
        >
          <defs>
            <linearGradient id="mLeft" x1="8" y1="38" x2="16" y2="8" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4F46E5" />
              <stop offset="1" stopColor="#818CF8" />
            </linearGradient>
            <linearGradient id="mRight" x1="40" y1="38" x2="32" y2="8" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7C3AED" />
              <stop offset="1" stopColor="#A78BFA" />
            </linearGradient>
            <linearGradient id="mInLeft" x1="16" y1="8" x2="24" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="1" stopColor="#4338CA" />
            </linearGradient>
            <linearGradient id="mInRight" x1="32" y1="8" x2="24" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#9333EA" />
              <stop offset="1" stopColor="#6D28D9" />
            </linearGradient>
            <linearGradient id="mCore" x1="20" y1="19" x2="28" y2="29" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" />
              <stop offset="1" stopColor="#C084FC" />
            </linearGradient>
          </defs>
          <path d="M8 38L8 14L16 8L16 32Z" fill="url(#mLeft)" />
          <path d="M40 38L40 14L32 8L32 32Z" fill="url(#mRight)" />
          <path d="M16 8L24 24L16 32Z" fill="url(#mInLeft)" />
          <path d="M32 8L24 24L32 32Z" fill="url(#mInRight)" />
          <path d="M24 19L28 24L24 29L20 24Z" fill="url(#mCore)" />
          <path d="M11 38H37L34 42H14L11 38Z" fill="#1E1E2D" />
          <path d="M24 7L25.5 10L28 11L25.5 12L24 15L22.5 12L20 11L22.5 10Z" fill="#38BDF8" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold tracking-tight text-white ${textMap[size]}`}>
              MEYRA AI
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium tracking-tight truncate">
            Intelligent Companion
          </span>
        </div>
      )}
    </div>
  );
};

