/**
 * Asset imagery with a stable text fallback for missing or failed images.
 * @packageDocumentation
 */

import { useState } from 'react';

/** Derive the text fallback for an unavailable asset image.
 * @param symbol - Optional asset symbol.
 * @returns Short initials with a stable unknown-symbol fallback.
 */
function initials(symbol?: string | null) {
  return (
    (symbol || '?')
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

/** Optional image source, fallback symbol and accessible alternative text. */
interface AssetIconProps {
  src?: string | null;
  symbol?: string | null;
  alt?: string;
}

/** Render the asset image with a stable text fallback when loading fails.
 * @param props - Image source, fallback symbol and alternative text.
 * @returns A lazy image or its stable labeled text fallback.
 */
export default function AssetIcon(props: AssetIconProps) {
  const { src, symbol, alt = '' } = props;
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
