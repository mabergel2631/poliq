export function Skeleton({ width, height = 16, style }: { width?: number | string; height?: number | string; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ width: width ?? '100%', height, ...style }} />;
}

export function PolicyCardSkeleton() {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Skeleton width={140} height={18} />
        <Skeleton width={60} height={22} style={{ borderRadius: 12 }} />
      </div>
      <Skeleton width={100} height={14} style={{ marginBottom: 8 }} />
      <Skeleton width={180} height={14} style={{ marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 16 }}>
        <Skeleton width={80} height={14} />
        <Skeleton width={80} height={14} />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <Skeleton width={i === 0 ? 120 : 80} height={14} />
        </td>
      ))}
    </tr>
  );
}

export function PolicyListSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <PolicyCardSkeleton key={i} />
      ))}
    </div>
  );
}
