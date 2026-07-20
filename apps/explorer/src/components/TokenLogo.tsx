/** Small circular token/contract logo (Etherscan / BscScan style). */
export function TokenLogo({
  src,
  alt = "",
  size = 20,
  className = "",
}: {
  src: string | null | undefined;
  alt?: string;
  size?: number;
  className?: string;
}) {
  if (!src?.trim()) return null;
  return (
    <img
      src={src.trim()}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`inline-block shrink-0 rounded-full object-cover shadow-sm ring-1 ring-slate-200/80 ${className}`}
      style={{ width: size, height: size }}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
