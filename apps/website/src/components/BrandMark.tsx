type BrandMarkProps = {
  className?: string;
};

/** ECNA mark from `public/logo-thumb.png`. */
export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <img
      src="/logo-thumb.png"
      alt=""
      className={`site-wordmark ${className}`.trim()}
      decoding="async"
    />
  );
}
