type Props = {
  subtitle?: string;
};

/** Fullscreen branded splash until API / app config is ready (no Tailwind). */
export function BrandedLoader({ subtitle = 'Loading…' }: Props) {
  return (
   
   
   
     <div className="ecna-loader-container "  role="status" aria-busy="true">
      
      {/* Visual Loader Section */}
      <div className="ecna-loader-visual">
        <div className="ecna-loader-ring-outer"></div>
        <div className="ecna-loader-radar"></div>
        <div className="ecna-loader-ring-inner"></div>
        
        <div className="ecna-loader-logo-core">
          <img
            src="/logo-thumb.png"
            alt=""
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

   
    // <div
    //   className="ecnascan-loader-overlay"
    //   role="status"
    //   aria-live="polite"
    //   aria-busy="true"
    // >
    //   <div className="ecnascan-loader-mark-wrap">
    //     <div className="ecnascan-loader-ring" aria-hidden />
    //     <EcnaLogoMark className="ecnascan-loader-logo" prominent />
    //   </div>
    //   <p className="ecnascan-loader-title">{subtitle}</p>
    //   <p className="ecnascan-loader-foot">ECNASCAN Dashboard</p>
    // </div>





  );
}
