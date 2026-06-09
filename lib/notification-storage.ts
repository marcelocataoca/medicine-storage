import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AsyncStorage layer that persists when each medicine was last notified about
 * its expiry. The map is keyed by medicine id and stored as a single JSON blob
 * to keep reads/writes atomic and cheap.
 */

const STORAGE_KEY = '@medicine-storage:expiry-notifications:last-notified-v1';

export type LastNotifiedMap = Record<string, string>;

export async function readLastNotifiedMap(): Promise<LastNotifiedMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: LastNotifiedMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

export async function writeLastNotifiedMap(map: LastNotifiedMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function recordNotificationsSent(
  medicineIds: string[],
  whenIso: string = new Date().toISOString()
): Promise<LastNotifiedMap> {
  if (medicineIds.length === 0) return readLastNotifiedMap();
  const current = await readLastNotifiedMap();
  for (const id of medicineIds) {
    current[id] = whenIso;
  }
  await writeLastNotifiedMap(current);
  return current;
}

/**
 * Removes entries whose IDs are no longer present, keeping the storage
 * footprint bounded as the user deletes medicines over time.
 */
export async function pruneStaleEntries(activeIds: Iterable<string>): Promise<void> {
  const current = await readLastNotifiedMap();
  const active = new Set(activeIds);
  let mutated = false;
  for (const id of Object.keys(current)) {
    if (!active.has(id)) {
      delete current[id];
      mutated = true;
    }
  }
  if (mutated) await writeLastNotifiedMap(current);
}
