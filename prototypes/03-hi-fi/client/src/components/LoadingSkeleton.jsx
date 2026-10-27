export default function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="skeleton-stack" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="skeleton-line" key={index} style={{ width: `${90 - index * 12}%` }} />
      ))}
    </div>
  );
}
