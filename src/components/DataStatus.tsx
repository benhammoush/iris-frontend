import { isRecord } from '../data/record';

function DataStatus({ meta, error }: { meta?: unknown; error?: unknown }) {
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
