import { useState } from 'react';

function initials(symbol?: string | null) {
  return (
    (symbol || '?')
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

export default function AssetIcon({
  src,
  symbol,
  alt = '',
}: {
  src?: string | null;
  symbol?: string | null;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed)
    return (
      <span
        className="iris-asset-icon-fallback"
        aria-label={alt || `${symbol || 'Asset'} icon`}
      >
        {initials(symbol)}
      </span>
    );
  return <img src={src} alt={alt} onError={() => setFailed(true)} />;
}
