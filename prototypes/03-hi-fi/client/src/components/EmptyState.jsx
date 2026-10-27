export default function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <h5>{title}</h5>
      {description && <p className="mb-3">{description}</p>}
      {action}
    </div>
  );
}
