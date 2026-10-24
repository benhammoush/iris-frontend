/**
 * Independent feedback for watchlist reads, refreshes and mutations.
 * @packageDocumentation
 */

/** Render independent watchlist load, mutation and refresh feedback. */
export default function WatchlistFeedback({
  loadError,
  mutationError,
  feedback,
  loading,
  refresh,
}: {
  loadError: string;
  mutationError: string;
  feedback: string;
  loading: boolean;
  /** Refresh the currently scoped resource without accepting results from a superseded identity. */
  refresh: () => Promise<void>;
}) {
  return (
    <div className="iris-watchlist-feedback">
      {loadError && (
        <p role="alert">
          {loadError} Any previously loaded items may be out of date.
        </p>
      )}
      {mutationError && <p role="alert">{mutationError}</p>}
      {feedback && <p role="status">{feedback}</p>}
      {loadError && (
        <button type="button" disabled={loading} onClick={() => void refresh()}>
          Retry watchlist
        </button>
      )}
    </div>
  );
}
