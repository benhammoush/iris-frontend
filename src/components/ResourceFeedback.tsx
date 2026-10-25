/**
 * Reusable loading, retained-data and retry feedback for resource views.
 * @packageDocumentation
 */

import { useEffect, useRef, useState } from 'react';

/** Independent resource state, controlled messages and an explicit retry action. */
interface ResourceFeedbackProps {
  label: string;
  error?: unknown;
  busy?: boolean;
  hasData?: boolean;
  /** Ask the resource owner to retry its failed load. */
  onRetry?: () => void;
  retryLabel?: string;
  errorMessage?: string;
}

/** Announces resource transitions and keeps keyboard focus stable during retries.
 * @param props - Resource load/refresh state, retained-data state and optional retry control.
 * @returns A persistent live region with controlled feedback and an explicit retry button.
 */
export default function ResourceFeedback(props: ResourceFeedbackProps) {
  const {
    label,
    error,
    busy = false,
    hasData = false,
    onRetry,
    retryLabel = 'Retry',
    errorMessage = `${label} is currently unavailable.`,
  } = props;
  const feedback = useRef<HTMLDivElement>(null);
  const [retried, setRetried] = useState(false);
  useEffect(() => {
    if (busy || error || !retried) return;
    // Leave recovery in the live region long enough to be announced.
    const timeout = setTimeout(() => setRetried(false), 3000);
    return () => clearTimeout(timeout);
  }, [busy, error, retried]);

  const message =
    busy && (!hasData || retried || error)
      ? `${hasData ? 'Refreshing' : 'Loading'} ${label.toLowerCase()}...`
      : error
        ? `${errorMessage}${hasData ? ' Previously loaded data is still shown.' : ''}`
        : retried
          ? `${label} loaded.`
          : '';

  return (
    <div
      ref={feedback}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={-1}
      className={error || retried ? 'iris-resource-feedback' : 'iris-sr-only'}
    >
      {message && <p>{message}</p>}
      {Boolean(error) && onRetry && (
        <button
          type="button"
          className="iris-retry"
          disabled={busy}
          onClick={() => {
            // The button can disappear while loading; its live region persists.
            feedback.current?.focus({ preventScroll: true });
            setRetried(true);
            onRetry();
          }}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
