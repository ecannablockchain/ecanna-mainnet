/** Pulse placeholder while API data streams in */
export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/90 dark:bg-slate-600/80 ${className}`}
    />
  );
}

export function SkeletonStat({ className = "" }: { className?: string }) {
  return <SkeletonLine className={`h-8 w-28 max-w-full ${className}`} />;
}

export function SkeletonTableBody({ rows = 10, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="pes-td py-3">
              <SkeletonLine className={`h-4 ${j === 0 ? "w-20" : "w-full max-w-[10rem]"}`} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function PageDataSkeleton({ titleWidth = "w-40" }: { titleWidth?: string }) {
  return (
    <div className="space-y-4">
      <SkeletonLine className={`h-8 ${titleWidth} max-w-full`} />
      <SkeletonLine className="h-4 w-64 max-w-full" />
      <div className="pes-table-wrap overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              {Array.from({ length: 5 }).map((_, i) => (
                <th key={i} className="pes-th">
                  <SkeletonLine className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <SkeletonTableBody rows={12} cols={5} />
        </table>
      </div>
    </div>
  );
}
