import { useId } from "react";

type EcnaLogoMarkProps = {
  className?: string;
  /** Larger glow — good on dark footer */
  prominent?: boolean;
};

/**
 * ECNA hex mark: high-contrast gold/amber fill + cyan strokes so it reads on light nav and dark footer.
 */
export function EcnaLogoMark({ className = "h-8 w-8", prominent }: EcnaLogoMarkProps) {
  const uid = useId().replace(/:/g, "");
  const gFill = `ecna-logo-fill-${uid}`;
  const gStroke = `ecna-logo-inner-${uid}`;

  return (
    <svg
      className={`${className} ${prominent ? "drop-shadow-[0_0_14px_rgba(251,191,36,0.55)]" : "drop-shadow-[0_1px_4px_rgba(245,158,11,0.45)]"}`}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gFill} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde047" />
          <stop offset="0.45" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id={gStroke} x1="10" y1="24" x2="22" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0784c3" />
        </linearGradient>
      </defs>
      <path
        d="M16 2l12 7v14l-12 7L4 23V9L16 2z"
        fill={`url(#${gFill})`}
        stroke="#0369a1"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M16 8v16M10 12l12 4M10 20l12-4"
        stroke={`url(#${gStroke})`}
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
