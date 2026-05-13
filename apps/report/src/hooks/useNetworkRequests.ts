import type { ExecutionTask } from '@midscene/core';
import { useEffect, useState } from 'react';
import type { NetworkRequest } from '../types';

// Fetch once per page load, shared across all components
type FetchState =
  | { status: 'pending' }
  | { status: 'unavailable' }
  | { status: 'ready'; requests: NetworkRequest[] };

let globalState: FetchState = { status: 'pending' };
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

function initFetch() {
  if (globalState.status !== 'pending') return;
  fetch('./network-requests.json')
    .then((res) => {
      if (!res.ok) throw new Error('not found');
      return res.json() as Promise<NetworkRequest[]>;
    })
    .then((data) => {
      globalState = {
        status: 'ready',
        requests: Array.isArray(data) ? data : [],
      };
    })
    .catch(() => {
      globalState = { status: 'unavailable' };
    })
    .finally(notify);
}

initFetch();

function filterForTask(
  requests: NetworkRequest[],
  task: ExecutionTask,
): NetworkRequest[] {
  const hasTiming =
    typeof task.timing?.start === 'number' &&
    typeof task.timing?.end === 'number';

  return requests.filter((req) => {
    // Prefer explicit taskId binding
    if (task.taskId && req.taskId) {
      return req.taskId === task.taskId;
    }
    // Fall back to time-range matching
    if (hasTiming && typeof req.timestamp === 'number') {
      return (
        req.timestamp >= task.timing!.start! &&
        req.timestamp <= task.timing!.end!
      );
    }
    return false;
  });
}

export type NetworkRequestsState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; requests: NetworkRequest[] };

function useGlobalState(): NetworkRequestsState {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1);
    listeners.add(update);
    // If fetch completed before this component mounted, we missed the notify() call
    if (globalState.status !== 'pending') {
      forceUpdate((n) => n + 1);
    }
    return () => {
      listeners.delete(update);
    };
  }, []);

  if (globalState.status === 'pending') return { status: 'loading' };
  if (globalState.status === 'unavailable') return { status: 'unavailable' };
  return { status: 'ready', requests: globalState.requests };
}

/** All requests — used by NetworkPanel to show everything */
export function useAllNetworkRequests(): NetworkRequestsState {
  return useGlobalState();
}

/** Requests filtered to those matching the given task */
export function useNetworkRequests(
  task: ExecutionTask | null,
): NetworkRequestsState {
  const base = useGlobalState();
  if (base.status !== 'ready') return base;
  if (!task) return { status: 'ready', requests: [] };
  return { status: 'ready', requests: filterForTask(base.requests, task) };
}
