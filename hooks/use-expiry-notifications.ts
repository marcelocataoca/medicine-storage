import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import {
  collection,
  onSnapshot,
  query,
  Timestamp,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { MedicineForExpiry } from '@/lib/expiry-evaluator';
import { runDailyExpiryCheck } from '@/lib/notification-service';

/**
 * React hook that wires the expiry-warning feature to the live medicine list:
 *
 * 1. Subscribes to the Firestore `medicines` collection (only while `enabled`).
 * 2. Runs a daily check whenever the list changes, when the app comes to the
 *    foreground, and on a periodic interval (covers users that keep the app
 *    open across midnight).
 *
 * The orchestrator (`runDailyExpiryCheck`) handles permissions, cooldown
 * persistence, and notification dispatch — this hook only decides *when* to
 * call it.
 *
 * The hook intentionally keeps the medicine list in a ref instead of state to
 * avoid re-rendering the consumer (the root layout) on every Firestore tick.
 */

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const MIN_CHECK_INTERVAL_MS = 30 * 1000;

export function useExpiryNotifications(enabled: boolean): void {
  const medicinesRef = useRef<MedicineForExpiry[]>([]);
  const lastCheckAtRef = useRef<number>(0);
  const inflightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS === 'web') return;

    let cancelled = false;

    const runCheck = async (): Promise<void> => {
      if (cancelled) return;
      const now = Date.now();
      if (now - lastCheckAtRef.current < MIN_CHECK_INTERVAL_MS) return;
      if (inflightRef.current !== null) {
        await inflightRef.current;
        return;
      }
      lastCheckAtRef.current = now;
      const promise = runDailyExpiryCheck(medicinesRef.current, new Date()).then(
        () => undefined,
        (error: unknown) => {
          console.log('Falha no daily expiry check:', error);
        }
      );
      inflightRef.current = promise;
      try {
        await promise;
      } finally {
        if (inflightRef.current === promise) inflightRef.current = null;
      }
    };

    const medicinesQuery = query(collection(db, 'medicines'));
    const unsubscribe = onSnapshot(
      medicinesQuery,
      (snapshot) => {
        medicinesRef.current = snapshotToMedicines(snapshot);
        void runCheck();
      },
      (error) => {
        console.log('Falha ao observar medicines para notificações:', error);
      }
    );

    const handleAppState = (state: AppStateStatus): void => {
      if (state === 'active') void runCheck();
    };
    const subscription = AppState.addEventListener('change', handleAppState);

    const intervalId = setInterval(() => {
      void runCheck();
    }, SIX_HOURS_MS);

    return () => {
      cancelled = true;
      unsubscribe();
      subscription.remove();
      clearInterval(intervalId);
    };
  }, [enabled]);
}

function snapshotToMedicines(snapshot: QuerySnapshot<DocumentData>): MedicineForExpiry[] {
  const result: MedicineForExpiry[] = [];
  for (const doc of snapshot.docs) {
    const data = doc.data() as { name?: unknown; validate?: unknown };
    const name = typeof data.name === 'string' && data.name ? data.name : 'Medicamento';
    const expiresAt = parseValidate(data.validate);
    if (!expiresAt) continue;
    result.push({ id: doc.id, name, expiresAt });
  }
  return result;
}

function parseValidate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as Timestamp).toDate === 'function'
  ) {
    return (value as Timestamp).toDate();
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}
