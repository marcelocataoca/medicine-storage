import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  buildMessage,
  evaluateMedicines,
  isCriticalThreshold,
  isQuietHour,
  type MedicineForExpiry,
  type NotificationGroup,
} from '@/lib/expiry-evaluator';
import {
  pruneStaleEntries,
  readLastNotifiedMap,
  recordNotificationsSent,
} from '@/lib/notification-storage';

/**
 * Wrapper around `expo-notifications` exposing the side-effectful pieces of
 * the expiry-warning feature: handler config, permissions, Android channel
 * setup, and the daily orchestration entry point `runDailyExpiryCheck`.
 *
 * Local-only: nothing in here talks to a server. Notifications are scheduled
 * with `trigger: null` so the OS presents them immediately during the daily
 * check.
 */

export const ANDROID_CHANNEL_ID = 'expiry-warnings';

let handlerConfigured = false;
let permissionsEnsured = false;

/**
 * Configures how notifications appear when the app is in foreground. Called
 * once on first use; safe to call multiple times.
 */
export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
}

/**
 * Requests permission to show notifications, caching the result for the
 * session. Returns true when the user granted permission (or the platform
 * doesn't require asking).
 */
export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (permissionsEnsured) {
    const current = await Notifications.getPermissionsAsync();
    return Boolean(current.granted || current.ios?.status === 3 /* provisional */);
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    permissionsEnsured = true;
    return true;
  }

  if (!current.canAskAgain) {
    permissionsEnsured = true;
    return false;
  }

  const next = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  permissionsEnsured = true;
  return next.granted;
}

/**
 * Sets up the Android notification channel used for expiry warnings.
 * No-op on iOS/Web.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Avisos de validade',
    importance: Notifications.AndroidImportance.HIGH,
    description: 'Alertas locais sobre medicamentos próximos da validade.',
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0a7ea4',
    enableVibrate: true,
    enableLights: true,
    showBadge: false,
  });
}

/**
 * Presents one notification per group. Quiet-hours rule mutes the sound for
 * non-critical groups; the short-term tier (`threshold === 15`, dias 1–15) counts
 * as critical and keeps the sound on regardless.
 */
export async function dispatchExpiryNotifications(
  groups: NotificationGroup[],
  now: Date = new Date()
): Promise<string[]> {
  if (groups.length === 0) return [];

  const quiet = isQuietHour(now);
  const ids: string[] = [];

  for (const group of groups) {
    const { title, body } = buildMessage(group);
    const critical = isCriticalThreshold(group.threshold);
    const playSound = critical || !quiet;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: playSound ? 'default' : false,
        data: {
          kind: 'expiry-warning',
          threshold: group.threshold,
          medicineIds: group.medicines.map((m) => m.id),
        },
      },
      trigger: null,
    });
    ids.push(id);
  }

  return ids;
}

export type DailyCheckResult = {
  groups: NotificationGroup[];
  notifiedMedicineIds: string[];
  notificationIds: string[];
  permissionGranted: boolean;
};

/**
 * Top-level entry point. Pulls the cooldown map from storage, evaluates the
 * medicine list, fires any pending notifications, and records the timestamps
 * so we don't re-notify within the cooldown window.
 *
 * Idempotent on the storage side: calling it twice in a row does nothing the
 * second time because the just-written timestamps now block the same items.
 */
export async function runDailyExpiryCheck(
  medicines: MedicineForExpiry[],
  now: Date = new Date()
): Promise<DailyCheckResult> {
  configureNotificationHandler();

  const granted = await ensureNotificationPermissions();
  if (!granted) {
    return { groups: [], notifiedMedicineIds: [], notificationIds: [], permissionGranted: false };
  }

  await ensureAndroidChannel();

  const lastNotifiedAt = await readLastNotifiedMap();

  const groups = evaluateMedicines(medicines, { now, lastNotifiedAt });
  const notificationIds = await dispatchExpiryNotifications(groups, now);

  const notifiedMedicineIds = groups.flatMap((g) => g.medicines.map((m) => m.id));
  if (notifiedMedicineIds.length > 0) {
    await recordNotificationsSent(notifiedMedicineIds, now.toISOString());
  }

  await pruneStaleEntries(medicines.map((m) => m.id));

  return {
    groups,
    notifiedMedicineIds,
    notificationIds,
    permissionGranted: true,
  };
}
