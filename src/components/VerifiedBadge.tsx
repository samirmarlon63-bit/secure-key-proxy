import React from "react";

/**
 * Realistic verified badge inspired by X/Instagram.
 * Smooth scalloped edge, soft depth, blue gradient, crisp white check.
 */
const VerifiedBadge = React.forwardRef<SVGSVGElement, { className?: string; size?: number }>(
  ({ className = "", size = 18 }, ref) => (
    <svg
      ref={ref}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vb-fill" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4DB8FF" />
          <stop offset="55%" stopColor="#1D9BF0" />
          <stop offset="100%" stopColor="#0A6DC2" />
        </linearGradient>
        <linearGradient id="vb-highlight" x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="45%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter id="vb-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.6" stdDeviation="0.6" floodColor="#0A6DC2" floodOpacity="0.45" />
        </filter>
      </defs>
      {/* Scalloped seal */}
      <path
        filter="url(#vb-shadow)"
        fill="url(#vb-fill)"
        d="M12 1.6l1.83 1.4a2 2 0 0 0 1.55.38l2.27-.4 .7 2.2a2 2 0 0 0 1.13 1.24l2.15.86-.4 2.27a2 2 0 0 0 .38 1.55L23 12l-1.4 1.83a2 2 0 0 0-.38 1.55l.4 2.27-2.15.86a2 2 0 0 0-1.13 1.24l-.7 2.2-2.27-.4a2 2 0 0 0-1.55.38L12 22.4l-1.83-1.4a2 2 0 0 0-1.55-.38l-2.27.4-.7-2.2a2 2 0 0 0-1.13-1.24l-2.15-.86.4-2.27a2 2 0 0 0-.38-1.55L1 12l1.4-1.83a2 2 0 0 0 .38-1.55l-.4-2.27 2.15-.86a2 2 0 0 0 1.13-1.24l.7-2.2 2.27.4a2 2 0 0 0 1.55-.38L12 1.6z"
      />
      {/* Top gloss */}
      <path
        opacity="0.9"
        fill="url(#vb-highlight)"
        d="M12 1.6l1.83 1.4a2 2 0 0 0 1.55.38l2.27-.4 .7 2.2a2 2 0 0 0 1.13 1.24l2.15.86-.4 2.27a2 2 0 0 0 .38 1.55L23 12H1l1.4-1.83a2 2 0 0 0 .38-1.55l-.4-2.27 2.15-.86a2 2 0 0 0 1.13-1.24l.7-2.2 2.27.4a2 2 0 0 0 1.55-.38L12 1.6z"
      />
      {/* Check */}
      <path
        d="M9.2 12.4l1.9 1.9 4.2-4.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
);

VerifiedBadge.displayName = "VerifiedBadge";

export default VerifiedBadge;
