import { isRecord } from '../data/record';

function DataStatus({ meta, error }: { meta?: unknown; error?: unknown }) {
  if (!meta && !error) return null;
  return (
    <div className="iris-data-status" role="status">
      <p>
        {error
          ? `Data unavailable: ${isRecord(error) ? String(error.message) : 'undefined'}`
          : 'Data from Jupiter, Birdeye, and DefiLlama'}
      </p>
    </div>
  );
}

export default DataStatus;
