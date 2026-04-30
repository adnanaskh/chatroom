import { RefreshCw } from 'lucide-react';

export default function RefreshButton({ label = 'Refresh', className = '', style, onClick, ...props }) {
  const handleClick = (event) => {
    if (onClick) {
      onClick(event);
      return;
    }
    window.location.reload();
  };

  return (
    <button
      type="button"
      className={`btn btn-secondary btn-sm ${className}`.trim()}
      onClick={handleClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', ...style }}
      {...props}
    >
      <RefreshCw size={14} />
      {label}
    </button>
  );
}
