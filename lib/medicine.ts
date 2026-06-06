import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type MedicineDocument = {
  name?: unknown;
  description?: unknown;
  validate?: unknown;
  amount?: unknown;
};

export type Medicine = {
  id: string;
  name: string;
  description: string;
  /** ISO YYYY-MM-DD */
  validade: string;
  quantidade: number;
};

export type MedicineFormSnapshot = {
  nome: string;
  descricao: string;
  validade: Date | null;
  quantidade: string;
};

function isFirestoreTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as Timestamp).toDate === 'function'
  );
}

export function dateToISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isoDateToLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function normalizeMedicine(id: string, data: MedicineDocument): Medicine {
  const validateDate = isFirestoreTimestamp(data.validate) ? data.validate.toDate() : null;

  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Medicamento sem nome',
    description: typeof data.description === 'string' ? data.description : '',
    validade: validateDate ? dateToISODate(validateDate) : '',
    quantidade: typeof data.amount === 'number' ? data.amount : 0,
  };
}

export function medicineToFormSnapshot(medicine: Medicine): MedicineFormSnapshot {
  return {
    nome: medicine.name,
    descricao: medicine.description,
    validade: medicine.validade ? isoDateToLocalDate(medicine.validade) : null,
    quantidade: String(medicine.quantidade),
  };
}

export function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

export function validateMedicineForm(nome: string, validade: Date | null): string | null {
  if (!nome.trim()) {
    return 'Informe o nome do medicamento.';
  }
  if (!validade) {
    return 'Selecione a validade do medicamento.';
  }
  return null;
}

export function parseQuantidade(quantidade: string): number {
  const quantidadeNumero = Number.parseInt(quantidade, 10);
  return Number.isNaN(quantidadeNumero) ? 0 : quantidadeNumero;
}

export function isFormDirty(
  current: MedicineFormSnapshot,
  original: MedicineFormSnapshot
): boolean {
  const currentValidade = current.validade?.getTime() ?? null;
  const originalValidade = original.validade?.getTime() ?? null;

  return (
    current.nome.trim() !== original.nome.trim() ||
    current.descricao.trim() !== original.descricao.trim() ||
    currentValidade !== originalValidade ||
    current.quantidade.trim() !== original.quantidade.trim()
  );
}

export async function fetchMedicineById(id: string): Promise<Medicine | null> {
  const snapshot = await getDoc(doc(db, 'medicines', id));
  if (!snapshot.exists()) {
    return null;
  }
  return normalizeMedicine(snapshot.id, snapshot.data() as MedicineDocument);
}

export async function updateMedicine(
  id: string,
  data: {
    name: string;
    description: string;
    amount: number;
    validate: Date;
  }
): Promise<void> {
  await updateDoc(doc(db, 'medicines', id), {
    name: data.name.trim(),
    description: data.description.trim(),
    amount: data.amount,
    validate: Timestamp.fromDate(data.validate),
  });
}
