import { useCallback, useState } from "react";

type CopyButtonProps = {
  text: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
};

export function CopyButton({ text, label = "Copy", className = "", size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied */
    }
  }, [text]);

  const pad = size === "md" ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[11px]";

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={copied ? "Copied" : `Copy ${label}`}
      aria-label={copied ? "Copied" : `Copy ${label}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border font-semibold transition ${pad} ${
        copied
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600"
          : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--card-muted)] hover:border-brand-500/50 hover:text-brand-600"
      } ${className}`}
    >
      {copied ? (
        <>
          <IconCheck className="h-3.5 w-3.5" />
          Copied
        </>
      ) : (
        <>
          <IconCopy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
