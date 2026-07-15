type Props = {
  /** Shown under the logo */
  subtitle?: string;
  /** Full viewport overlay vs in-flow block */
  variant?: "fullscreen" | "inline";
};

/**
 * Branded splash: project mark + spinner until React / data is ready.
 */
export function BrandedLoader({ subtitle = "Loading…", variant = "fullscreen" }: Props) {
  const wrap =
    variant === "fullscreen"
      ? "fixed inset-0 z-[9999] flex min-h-[100dvh] flex-col items-center justify-center px-6"
      : "flex min-h-[40vh] flex-col items-center justify-center px-6 py-16";

  return (
    // <div
    //   className={wrap}
    //   style={{ background: "var(--page-bg, #f8f9fa)", color: "var(--card-heading, #212529)" }}
    //   role="status"
    //   aria-live="polite"
    //   aria-busy="true"
    // >
    //   <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
    //     <div
    //       className="absolute h-[5.5rem] w-[5.5rem] rounded-full border-[3px] border-cyan-500/20 border-t-cyan-500"
    //       style={{ animation: "ecnascan-spin 0.85s linear infinite" }}
    //     />
    //     <img
    //       src="../logo-thumb.png"
    //       alt=""
    //       className="relative z-[1] h-16 w-16 shrink-0 ecna-icon-mark"
    //       width={64}
    //       height={64}
    //       draggable={false}
    //     />
    //   </div>
    //   <p className="font-display text-center text-lg font-semibold tracking-tight opacity-90">{subtitle}</p>
    //   <p className="mt-2 text-center text-sm font-medium text-[var(--card-muted,#6c757d)]">ECNASCAN Explorer</p>  
    // </div>

     <div className={`ecna-loader-container ${wrap}`} role="status" aria-busy="true">
      
      {/* Visual Loader Section */}
      <div className="ecna-loader-visual">
        <div className="ecna-loader-ring-outer"></div>
        <div className="ecna-loader-radar"></div>
        <div className="ecna-loader-ring-inner"></div>
        
        <div className="ecna-loader-logo-core">
          <img
            src="../logo-thumb.png"
            alt="Logo"
            className="ecna-loader-icon"
            draggable={false}
          />
        </div>
      </div>

      {/* Text Section */}
      <div className="ecna-loader-info">
        <h2 className="ecna-loader-title">
          {subtitle || "Loading"}
          <span className="ecna-loader-dot-anim">
            <span>.</span><span>.</span><span>.</span>
          </span>
        </h2>
        
        <div className="ecna-loader-badge">
          <span className="ecna-loader-pulse-dot"></span>
          ECNASCAN Explorer
        </div>
      </div>

    </div>

    
  );
}
