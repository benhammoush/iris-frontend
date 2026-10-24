/**
 * Asset imagery with a stable text fallback for missing or failed images.
 * @packageDocumentation
 */

import { useState } from 'react';

/** Derive the text fallback for an unavailable asset image. */
function initials(symbol?: string | null) {
  return (
    (symbol || '?')
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

/** Render the asset image with a stable text fallback when loading fails. */
export default function AssetIcon({
  src,
  symbol,
  alt = '',
}: {
  src?: string | null;
  symbol?: string | null;
  alt?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src)
    return (
      <span
        className="iris-asset-icon-fallback"
        aria-label={alt || `${symbol || 'Asset'} icon`}
      >
        {initials(symbol)}
      </span>
    );
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSource(src)}
    />
  );
}
