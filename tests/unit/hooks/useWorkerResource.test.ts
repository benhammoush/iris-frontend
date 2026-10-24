import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  type ResourceLoader,
  useWorkerResource,
} from '../../../src/hooks/useWorkerResource';

let hidden = false;

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

test('pauses polling while hidden and refreshes once when visible', async () => {
  const load = vi
    .fn<ResourceLoader<{ value: number }, null>>()
    .mockResolvedValue({ data: { value: 1 }, meta: null });
  const { unmount } = renderHook(() => useWorkerResource(load, [], 60_000));

  await act(async () => {});
  expect(load).toHaveBeenCalledTimes(1);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(load).toHaveBeenCalledTimes(2);

  hidden = true;
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120_000);
  });
  expect(load).toHaveBeenCalledTimes(2);

  hidden = false;
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(load).toHaveBeenCalledTimes(3);

  unmount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(load).toHaveBeenCalledTimes(3);
});

test('retains loaded data and metadata when a refresh rejects an unknown value', async () => {
  const load = vi
    .fn<ResourceLoader<{ value: number }, { stale: boolean }>>()
    .mockResolvedValueOnce({ data: { value: 1 }, meta: { stale: false } })
    .mockRejectedValueOnce('provider rejected');
  const { result } = renderHook(() => useWorkerResource(load));
  await act(async () => {});
  expect(result.current.data).toEqual({ value: 1 });
  await act(async () => result.current.refetch());
  expect(result.current).toMatchObject({
    data: { value: 1 },
    meta: { stale: false },
    loading: false,
    refreshing: false,
    error: 'provider rejected',
  });
});

test('aborts the previous loader and ignores its late result after dependencies change', async () => {
  let complete: ((result: { data: number; meta: null }) => void) | undefined;
  const pending = new Promise<{ data: number; meta: null }>((resolve) => {
    complete = resolve;
  });
  const load = vi
    .fn<ResourceLoader<number, null>>()
    .mockReturnValueOnce(pending)
    .mockResolvedValueOnce({ data: 2, meta: null });
  const { result, rerender, unmount } = renderHook(
    ({ id }) => useWorkerResource(load, [id]),
    { initialProps: { id: 1 } },
  );
  const initialSignal = load.mock.calls[0]?.[0].signal;
  expect(initialSignal?.aborted).toBe(false);
  rerender({ id: 2 });
  await act(async () => {});
  expect(initialSignal?.aborted).toBe(true);
  expect(result.current.data).toBe(2);
  await act(async () => complete?.({ data: 1, meta: null }));
  expect(result.current.data).toBe(2);
  const currentSignal = load.mock.calls[1]?.[0].signal;
  unmount();
  expect(currentSignal?.aborted).toBe(true);
});
