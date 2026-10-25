/**
 * Visible resource provenance, freshness and failure feedback.
 * @packageDocumentation
 */

import { isRecord } from '../data/record';

/** Unknown resource metadata and failure values accepted at the display boundary. */
interface DataStatusProps {
  meta?: unknown;
  error?: unknown;
}

/** Expose response freshness or failure without mislabeling stale data as live.
 * @param props - Resource metadata and failure state to describe.
 * @returns A controlled status notice, or null when no resource context is available.
 */
function DataStatus(props: DataStatusProps) {
  const { meta, error } = props;
  if (!meta && !error) return null;
  const detail = isRecord(error) ? error.message : error;
  const message =
    typeof detail === 'string' && detail.trim()
      ? detail
      : 'The request failed. Please try again.';
  return (
    <div className="iris-data-status" role="status">
      <p>
        {error
          ? `Data unavailable: ${message}`
          : 'Data from Jupiter, Birdeye, and DefiLlama'}
      </p>
    </div>
  );
}

export default DataStatus;
