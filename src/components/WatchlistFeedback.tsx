/**
 * Independent feedback for watchlist reads, refreshes and mutations.
 * @packageDocumentation
 */

/** Separate watchlist read/mutation messages and controlled refresh state. */
interface WatchlistFeedbackProps {
  loadError: string;
  mutationError: string;
  feedback: string;
  loading: boolean;
  /** Refresh the currently scoped resource without accepting results from a superseded identity.
   * @returns Completion of the account-scoped refresh.
   */
  refresh: () => Promise<void>;
}

/** Render independent watchlist load, mutation and refresh feedback.
 * @param props - Independent read/mutation failures, success feedback and refresh controls.
 * @returns Accessible feedback and a manual retry for failed watchlist loads.
 */
export default function WatchlistFeedback(props: WatchlistFeedbackProps) {
  const { loadError, mutationError, feedback, loading, refresh } = props;
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
