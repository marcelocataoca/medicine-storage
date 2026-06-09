import {
  ADVANCE_NOTICE_DAYS,
  buildMessage,
  classifyExpiryThreshold,
  daysUntilExpiry,
  evaluateMedicines,
  isCriticalThreshold,
  isOnCooldown,
  isQuietHour,
  NOTIFICATION_COOLDOWN_DAYS,
  SHORT_TERM_MAX_DAYS,
  SHORT_TERM_MIN_DAYS,
} from '@/lib/expiry-evaluator';

function localDate(
  year: number,
  month: number,
  day: number,
  hour: number = 12,
  minute: number = 0
): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

describe('daysUntilExpiry', () => {
  const now = localDate(2026, 4, 28, 15);

  it('retorna número positivo quando o vencimento é no futuro', () => {
    expect(daysUntilExpiry('2026-06-12', now)).toBe(45);
    expect(daysUntilExpiry('2026-05-13', now)).toBe(15);
  });

  it('retorna 0 no dia do vencimento', () => {
    expect(daysUntilExpiry('2026-04-28', now)).toBe(0);
  });

  it('retorna número negativo para medicamentos já vencidos', () => {
    expect(daysUntilExpiry('2026-04-27', now)).toBe(-1);
    expect(daysUntilExpiry('2026-01-01', now)).toBeLessThan(0);
  });

  it('aceita Date como entrada', () => {
    expect(daysUntilExpiry(localDate(2026, 6, 12), now)).toBe(45);
  });

  it('retorna NaN para entradas inválidas', () => {
    expect(Number.isNaN(daysUntilExpiry('not-a-date', now))).toBe(true);
  });
});

describe('classifyExpiryThreshold', () => {
  it('retorna 45 apenas quando faltam exatamente ADVANCE_NOTICE_DAYS dias', () => {
    expect(classifyExpiryThreshold(ADVANCE_NOTICE_DAYS)).toBe(45);
    expect(classifyExpiryThreshold(44)).toBe(null);
    expect(classifyExpiryThreshold(46)).toBe(null);
  });

  it('retorna 15 para cada dia entre SHORT_TERM_MIN_DAYS e SHORT_TERM_MAX_DAYS', () => {
    expect(classifyExpiryThreshold(SHORT_TERM_MIN_DAYS)).toBe(15);
    expect(classifyExpiryThreshold(SHORT_TERM_MAX_DAYS)).toBe(15);
    expect(classifyExpiryThreshold(7)).toBe(15);
  });

  it('não classifica vencidos, dia da validade (0) nem faixa intermediária', () => {
    expect(classifyExpiryThreshold(-1)).toBe(null);
    expect(classifyExpiryThreshold(0)).toBe(null);
    expect(classifyExpiryThreshold(16)).toBe(null);
    expect(classifyExpiryThreshold(30)).toBe(null);
  });
});

describe('isQuietHour', () => {
  it('retorna true entre 22h e 8h', () => {
    expect(isQuietHour(localDate(2026, 4, 28, 22))).toBe(true);
    expect(isQuietHour(localDate(2026, 4, 28, 23))).toBe(true);
    expect(isQuietHour(localDate(2026, 4, 28, 0))).toBe(true);
    expect(isQuietHour(localDate(2026, 4, 28, 7))).toBe(true);
  });

  it('retorna false durante o dia', () => {
    expect(isQuietHour(localDate(2026, 4, 28, 8))).toBe(false);
    expect(isQuietHour(localDate(2026, 4, 28, 12))).toBe(false);
    expect(isQuietHour(localDate(2026, 4, 28, 21, 59))).toBe(false);
  });
});

describe('isOnCooldown', () => {
  const now = localDate(2026, 4, 28, 12);

  it('retorna false quando nunca foi notificado', () => {
    expect(isOnCooldown(undefined, now)).toBe(false);
    expect(isOnCooldown(null, now)).toBe(false);
  });

  it(`retorna true se a última notificação foi há menos de ${NOTIFICATION_COOLDOWN_DAYS} dias`, () => {
    const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000).toISOString();
    expect(isOnCooldown(threeDaysAgo, now)).toBe(true);
  });

  it(`retorna false após ${NOTIFICATION_COOLDOWN_DAYS} dias completos`, () => {
    const sixDaysAgo = new Date(now.getTime() - 6 * 86_400_000).toISOString();
    expect(isOnCooldown(sixDaysAgo, now)).toBe(false);
  });

  it('ignora valores inválidos e libera a notificação', () => {
    expect(isOnCooldown('definitely-not-iso', now)).toBe(false);
  });
});

describe('evaluateMedicines', () => {
  const now = localDate(2026, 4, 28, 15);

  const medicines = [
    { id: 'a', name: 'Paracetamol', expiresAt: '2026-06-12' /* 45 dias */ },
    { id: 'b', name: 'Dipirona', expiresAt: '2026-05-13' /* 15 dias */ },
    { id: 'c', name: 'Ibuprofeno', expiresAt: '2026-06-15' /* 48 dias */ },
    { id: 'd', name: 'Vitamina C', expiresAt: '2026-04-20' /* já vencido */ },
    { id: 'e', name: 'Amoxicilina', expiresAt: '2026-06-12' /* 45 dias */ },
    { id: 'f', name: 'Loratadina', expiresAt: '2026-05-10' /* 12 dias */ },
  ];

  it('seleciona limiar 45 (exato) e curto prazo entre 1 e 15 dias', () => {
    const groups = evaluateMedicines(medicines, { now, lastNotifiedAt: {} });

    expect(groups).toHaveLength(2);

    const short = groups.find((g) => g.threshold === 15);
    const fortyFive = groups.find((g) => g.threshold === 45);

    expect(short?.medicines.map((m) => ({ id: m.id, daysRemaining: m.daysRemaining }))).toEqual([
      { id: 'b', daysRemaining: 15 },
      { id: 'f', daysRemaining: 12 },
    ]);
    expect(fortyFive?.medicines.map((m) => m.id).sort()).toEqual(['a', 'e']);
  });

  it('agrupa múltiplos medicamentos no mesmo limiar', () => {
    const groups = evaluateMedicines(medicines, { now });
    const fortyFive = groups.find((g) => g.threshold === 45);
    expect(fortyFive?.medicines.length).toBe(2);
    const short = groups.find((g) => g.threshold === 15);
    expect(short?.medicines.length).toBe(2);
  });

  it('descarta medicamentos vencidos e os com mais de 45 dias restantes (exceto exatamente 45)', () => {
    const groups = evaluateMedicines(medicines, { now });
    const allIds = groups.flatMap((g) => g.medicines.map((m) => m.id));
    expect(allIds).not.toContain('c');
    expect(allIds).not.toContain('d');
    expect(allIds).toContain('f');
  });

  it('respeita a janela de cooldown e ignora medicamentos notificados recentemente', () => {
    const oneDayAgo = new Date(now.getTime() - 1 * 86_400_000).toISOString();
    const groups = evaluateMedicines(medicines, {
      now,
      lastNotifiedAt: { a: oneDayAgo, b: oneDayAgo },
    });

    const allIds = groups.flatMap((g) => g.medicines.map((m) => m.id));
    expect(allIds).not.toContain('a');
    expect(allIds).not.toContain('b');
    expect(allIds).toContain('e');
    expect(allIds).toContain('f');
  });

  it('libera notificação após o cooldown expirar', () => {
    const sixDaysAgo = new Date(now.getTime() - 6 * 86_400_000).toISOString();
    const groups = evaluateMedicines(medicines, {
      now,
      lastNotifiedAt: { a: sixDaysAgo },
    });
    const fortyFive = groups.find((g) => g.threshold === 45);
    expect(fortyFive?.medicines.map((m) => m.id).sort()).toEqual(['a', 'e']);
  });

  it('retorna lista vazia quando não há candidatos', () => {
    const groups = evaluateMedicines([{ id: 'x', name: 'Sem urgência', expiresAt: '2027-01-01' }], {
      now,
    });
    expect(groups).toEqual([]);
  });
});

describe('buildMessage', () => {
  it('usa a mensagem oficial para 1 medicamento no limiar de 45 dias', () => {
    const { title, body } = buildMessage({
      threshold: 45,
      daysRemaining: ADVANCE_NOTICE_DAYS,
      medicines: [{ id: 'a', name: 'Paracetamol', daysRemaining: ADVANCE_NOTICE_DAYS }],
    });
    expect(title).toBe('Validade próxima');
    expect(body).toBe(
      `Atenção: o medicamento Paracetamol vence em ${ADVANCE_NOTICE_DAYS} dias. Programe-se para utilizá-lo ou descartá-lo com segurança.`
    );
  });

  it('usa os dias reais para 1 medicamento em curto prazo', () => {
    const { title, body } = buildMessage({
      threshold: 15,
      daysRemaining: 7,
      medicines: [{ id: 'b', name: 'Dipirona', daysRemaining: 7 }],
    });
    expect(title).toBe('Validade muito próxima');
    expect(body).toBe('Importante: o medicamento Dipirona vence em breve (7 dias).');
  });

  it('agrega quando há múltiplos medicamentos no limiar de 45 dias', () => {
    const { title, body } = buildMessage({
      threshold: 45,
      daysRemaining: ADVANCE_NOTICE_DAYS,
      medicines: [
        { id: 'a', name: 'Paracetamol', daysRemaining: ADVANCE_NOTICE_DAYS },
        { id: 'b', name: 'Amoxicilina', daysRemaining: ADVANCE_NOTICE_DAYS },
      ],
    });
    expect(title).toBe(`2 medicamentos vencem em ${ADVANCE_NOTICE_DAYS} dias`);
    expect(body).toContain(`2 medicamentos vencem em ${ADVANCE_NOTICE_DAYS} dias`);
    expect(body).toContain('Paracetamol');
    expect(body).toContain('Amoxicilina');
  });

  it('trunca o preview de nomes quando há mais de 3 medicamentos (curto prazo)', () => {
    const { body } = buildMessage({
      threshold: 15,
      daysRemaining: 3,
      medicines: [
        { id: '1', name: 'A', daysRemaining: 3 },
        { id: '2', name: 'B', daysRemaining: 4 },
        { id: '3', name: 'C', daysRemaining: 5 },
        { id: '4', name: 'D', daysRemaining: 6 },
        { id: '5', name: 'E', daysRemaining: 7 },
      ],
    });
    expect(body).toContain('A, B, C e mais 2');
    expect(body).toContain(`${SHORT_TERM_MIN_DAYS}`);
    expect(body).toContain(`${SHORT_TERM_MAX_DAYS}`);
  });
});

describe('isCriticalThreshold', () => {
  it('considera curto prazo (threshold 15) como crítico (mantém som mesmo em quiet hours)', () => {
    expect(isCriticalThreshold(15)).toBe(true);
  });

  it('considera 45 dias como não crítico', () => {
    expect(isCriticalThreshold(45)).toBe(false);
  });
});
