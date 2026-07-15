import type { ReactNode } from "react";
import { CopyButton } from "./CopyButton";

type InfoPanelProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  accent?: boolean;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function InfoPanel({ title, subtitle, icon, accent = true, children, action, className = "" }: InfoPanelProps) {
  return (
    <div className={`info-panel ${accent ? "info-panel-accent" : ""} ${className}`}>
      <div className="info-panel-header">
        {icon ? <div className="info-panel-icon">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold text-[var(--card-heading)]">{title}</p>
          {subtitle ? <p className="text-xs text-[var(--card-muted)]">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

type DataRowProps = {
  label: string;
  value: string;
  copyable?: boolean;
  copyValue?: string;
  href?: string;
  required?: boolean;
  mono?: boolean;
};

export function DataRow({ label, value, copyable = false, copyValue, href, required = false, mono = true }: DataRowProps) {
  const canCopy =
    copyable &&
    value &&
    !value.includes("—") &&
    !value.toLowerCase().includes("not configured");
  const copyText = copyValue ?? value;
  const isAddress = /^0x[a-fA-F0-9]{40}$/.test(value);

  return (
    <div className="data-row">
      <div className="flex items-center gap-2">
        <span className="data-row-label">{label}</span>
        {required ? <span className="badge-required">Required</span> : null}
      </div>
      <div className="data-row-value-wrap">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="data-value data-value-link">
            {value}
          </a>
        ) : (
          <span className={`${mono ? "data-value" : "text-sm text-[var(--card-heading)]"} ${isAddress ? "sm:max-w-[280px]" : "sm:max-w-md"}`}>
            {value}
          </span>
        )}
        {canCopy ? <CopyButton text={copyText} label={label} /> : null}
      </div>
    </div>
  );
}
