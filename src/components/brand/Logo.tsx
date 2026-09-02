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
      {/* Modern M-based Gradient Vector Icon */}
      <div
        className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 shrink-0 ${
          sizeMap[size]
        } ${animated ? "animate-pulse" : ""}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-white ${iconSizeMap[size]}`}
        >
          <path d="M3 20V4l9 7 9-7v16" />
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

