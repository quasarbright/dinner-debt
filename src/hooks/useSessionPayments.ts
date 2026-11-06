// Subscribe to a session's payments.
// status is 'unavailable' when there's no session, sessions are disabled, or
// the backend fails; callers then just behave like link-only mode.

import { useEffect, useState } from 'react';
import { getSessionBackend } from '../session/sessionClient';
import type { Payment, SessionBackend } from '../session/types';

export type SessionStatus = 'loading' | 'live' | 'unavailable';

export function useSessionPayments(sessionId: string | null | undefined) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [status, setStatus] = useState<SessionStatus>(sessionId ? 'loading' : 'unavailable');
  const [backend, setBackend] = useState<SessionBackend | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus('unavailable');
      return;
    }
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    setStatus('loading');

    getSessionBackend().then(loaded => {
      if (cancelled) return;
      if (!loaded) {
        setStatus('unavailable');
        return;
      }
      setBackend(loaded);
      unsubscribe = loaded.subscribeToPayments(
        sessionId,
        next => {
          setPayments(next);
          setStatus('live');
        },
        error => {
          console.warn('Live status unavailable:', error);
          setStatus('unavailable');
        }
      );
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [sessionId]);

  return { payments, status, backend };
}
