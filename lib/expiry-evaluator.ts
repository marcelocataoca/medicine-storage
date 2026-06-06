/**
 * Pure utilities for evaluating which medicines should trigger an expiry
 * notification. This module has no side effects and no React/Expo deps so it
 * can be unit tested in isolation.
 */

/** Limiar antecipado (45 dias). */
export type ExpiryThreshold = 45 | 15;

/** Curto prazo: bucket `15` agrupa dias entre SHORT_TERM_MIN_DAYS e SHORT_TERM_MAX_DAYS inclusive. */
export const SHORT_TERM_MIN_DAYS = 1;
export const SHORT_TERM_MAX_DAYS = 15;

/** Dias até vencer para o aviso antecipado (único disparo neste limiar). */
export const ADVANCE_NOTICE_DAYS = 45;

/** Minimum days between two notifications for the same medicine. */
export const NOTIFICATION_COOLDOWN_DAYS = 5;

/** Quiet-hours window: notifications fired at these hours skip the sound. */
export const QUIET_HOUR_START = 22;
export const QUIET_HOUR_END = 8;

/**
 * Minimal shape required to evaluate a medicine for expiry. Source models can
 * map their fields onto this contract before calling the evaluator.
 */
export type MedicineForExpiry = {
  id: string;
  name: string;
  /** Either an ISO date (YYYY-MM-DD) or a Date instance. */
  expiresAt: string | Date;
};

/** Um medicamento elegível dentro de um grupo de notificação. */
export type NotificationMedicineEntry = {
  id: string;
  name: string;
  /** Dias corridos até a validade (calendário local), igual a `daysUntilExpiry`. */
  daysRemaining: number;
};

export type NotificationGroup = {
  threshold: ExpiryThreshold;
  /** Para limiar 45: sempre 45. Para curto prazo (15): menor valor entre os do grupo (urgência). */
  daysRemaining: number;
  medicines: NotificationMedicineEntry[];
};

export type EvaluationOptions = {
  /** Reference "now" used to compute days remaining. Defaults to new Date(). */
  now?: Date;
  /** Map of medicineId -> ISO timestamp of the last notification sent. */
  lastNotifiedAt?: Record<string, string | null | undefined>;
  /** Override cooldown for tests. */
  cooldownDays?: number;
};

/**
 * Computes how many whole days separate `now` from the medicine's expiry date.
 *
 * - Both dates are normalized to local midnight before comparison so DST and
 *   "current time" don't shift the answer mid-day.
 * - Negative values mean the medicine has already expired.
 */
export function daysUntilExpiry(expiresAt: string | Date, now: Date = new Date()): number {
  const expiry = toLocalDateOnly(expiresAt);
  const today = toLocalDateOnly(now);
  if (!expiry || !today) return Number.NaN;
  const diffMs = expiry.getTime() - today.getTime();
  return Math.round(diffMs / 86_400_000);
}

/**
 * Returns true if the given timestamp falls inside the quiet-hours window
 * (22:00 inclusive – 08:00 exclusive in local time).
 */
export function isQuietHour(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= QUIET_HOUR_START || hour < QUIET_HOUR_END;
}

/**
 * Returns true if a medicine is still on cooldown (less than `cooldownDays`
 * have passed since the last notification). Items never notified before are
 * never on cooldown.
 */
export function isOnCooldown(
  lastNotifiedIso: string | null | undefined,
  now: Date,
  cooldownDays: number = NOTIFICATION_COOLDOWN_DAYS
): boolean {
  if (!lastNotifiedIso) return false;
  const last = new Date(lastNotifiedIso).getTime();
  if (Number.isNaN(last)) return false;
  const elapsedDays = (now.getTime() - last) / 86_400_000;
  return elapsedDays < cooldownDays;
}

/**
 * Classifica quantos dias faltam para vencer em um limiar de notificação.
 * - `45`: exatamente ADVANCE_NOTICE_DAYS antes da validade.
 * - `15`: curto prazo (SHORT_TERM_MIN_DAYS … SHORT_TERM_MAX_DAYS inclusive).
 * - `null`: fora dos critérios (inclui vencidos, >45 exceto o dia 45, faixa 16–44, dia 0).
 */
export function classifyExpiryThreshold(days: number): ExpiryThreshold | null {
  if (!Number.isFinite(days)) return null;
  if (days < 0) return null;
  if (days === ADVANCE_NOTICE_DAYS) return 45;
  if (days >= SHORT_TERM_MIN_DAYS && days <= SHORT_TERM_MAX_DAYS) return 15;
  return null;
}

/**
 * Groups medicines that should trigger a notification today by threshold.
 * - Ignora vencidos (`days < 0`).
 * - Avisa em ADVANCE_NOTICE_DAYS (45) dias ou na faixa curta 1–15 dias.
 * - Ignora `days === 0` (validade no mesmo dia): não está na faixa 1–15 solicitada.
 * - Ignora medicamentos entre 16 e 44 dias e os com mais de 45 dias (exceto exatamente 45).
 * - Skips medicines on cooldown (NOTIFICATION_COOLDOWN_DAYS).
 */
export function evaluateMedicines(
  medicines: MedicineForExpiry[],
  options: EvaluationOptions = {}
): NotificationGroup[] {
  const now = options.now ?? new Date();
  const cooldownDays = options.cooldownDays ?? NOTIFICATION_COOLDOWN_DAYS;
  const lastNotifiedAt = options.lastNotifiedAt ?? {};

  const buckets = new Map<ExpiryThreshold, NotificationGroup>();

  for (const medicine of medicines) {
    const days = daysUntilExpiry(medicine.expiresAt, now);
    const threshold = classifyExpiryThreshold(days);
    if (!threshold) continue;

    if (isOnCooldown(lastNotifiedAt[medicine.id], now, cooldownDays)) continue;

    const entry: NotificationMedicineEntry = {
      id: medicine.id,
      name: medicine.name,
      daysRemaining: days,
    };

    let group = buckets.get(threshold);
    if (!group) {
      group = {
        threshold,
        daysRemaining: days,
        medicines: [],
      };
      buckets.set(threshold, group);
    }
    group.medicines.push(entry);
    if (threshold === 15) {
      group.daysRemaining = Math.min(group.daysRemaining, days);
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.threshold - b.threshold);
}

/**
 * The short-term bucket (`threshold === 15`) counts as "critical" — sound is
 * allowed even during quiet hours, per the product spec.
 */
export function isCriticalThreshold(threshold: ExpiryThreshold): boolean {
  return threshold === 15;
}

/**
 * Builds the human-friendly title and body for a notification group, using the
 * exact wording suggested by the product spec for single-medicine cases where
 * applicable and aggregate copy for multi-medicine cases.
 */
export function buildMessage(group: NotificationGroup): { title: string; body: string } {
  const { threshold, medicines } = group;
  const count = medicines.length;

  if (count === 1) {
    const name = medicines[0]?.name ?? 'medicamento';
    const days = medicines[0]?.daysRemaining ?? threshold;
    if (threshold === 45) {
      return {
        title: 'Validade próxima',
        body: `Atenção: o medicamento ${name} vence em ${ADVANCE_NOTICE_DAYS} dias. Programe-se para utilizá-lo ou descartá-lo com segurança.`,
      };
    }
    return {
      title: 'Validade muito próxima',
      body: `Importante: o medicamento ${name} vence em breve (${days} dias).`,
    };
  }

  const namesPreview = formatNamesPreview(medicines.map((m) => m.name));
  if (threshold === 45) {
    return {
      title: `${count} medicamentos vencem em ${ADVANCE_NOTICE_DAYS} dias`,
      body: `Atenção: ${count} medicamentos vencem em ${ADVANCE_NOTICE_DAYS} dias (${namesPreview}). Programe-se para utilizá-los ou descartá-los com segurança.`,
    };
  }
  return {
    title: `${count} medicamentos vencem em breve`,
    body: `Importante: ${count} medicamentos com validade entre ${SHORT_TERM_MIN_DAYS} e ${SHORT_TERM_MAX_DAYS} dias (${namesPreview}).`,
  };
}

function formatNamesPreview(names: string[], max: number = 3): string {
  if (names.length <= max) return names.join(', ');
  const head = names.slice(0, max).join(', ');
  const remaining = names.length - max;
  return `${head} e mais ${remaining}`;
}

function toLocalDateOnly(input: string | Date): Date | null {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  if (typeof input !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
  if (!match) {
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}
