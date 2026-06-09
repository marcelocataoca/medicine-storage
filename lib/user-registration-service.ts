/**
 * Persistência do perfil na coleção Firestore `user`.
 * Corpo da implementação será preenchido após os testes (TDD).
 */
export type UserRegistrationPayload = {
  name: string;
  email: string;
  idade: number;
  medicalHistory: string;
};

export async function createUserProfile(
  _payload: UserRegistrationPayload
): Promise<void> {
  throw new Error('createUserProfile ainda não implementado');
}
