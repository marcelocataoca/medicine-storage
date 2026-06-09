import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import UserRegistrationForm from '@/components/user-registration-form';
import { createUserProfile } from '@/lib/user-registration-service';

// ---------------------------------------------------------------------------
// Integração com Firestore simulada: o formulário deve delegar a persistência
// a um módulo dedicado (testável e mockável), alinhado à coleção `user`.
// ---------------------------------------------------------------------------
jest.mock('@/lib/user-registration-service', () => ({
  createUserProfile: jest.fn(() => Promise.resolve(undefined)),
}));

const mockedCreateUserProfile = createUserProfile as jest.MockedFunction<
  typeof createUserProfile
>;

describe('UserRegistrationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('Renderização do formulário', () => {
    it('deve renderizar o título e os campos nome, e-mail, idade e histórico médico', () => {
      render(<UserRegistrationForm />);

      expect(screen.getByText('Cadastro de usuário')).toBeTruthy();
      expect(screen.getByPlaceholderText('Seu nome completo')).toBeTruthy();
      expect(screen.getByPlaceholderText('seu@email.com')).toBeTruthy();
      expect(screen.getByPlaceholderText('Ex.: 30')).toBeTruthy();
      expect(
        screen.getByPlaceholderText('Descreva seu histórico médico relevante')
      ).toBeTruthy();
      expect(screen.getByTestId('user-registration-submit')).toBeTruthy();
      expect(screen.getByText('Cadastrar')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('Validação dos campos obrigatórios', () => {
    it('deve exibir mensagens de erro ao submeter com campos obrigatórios vazios', async () => {
      render(<UserRegistrationForm />);

      fireEvent.press(screen.getByTestId('user-registration-submit'));

      await waitFor(() => {
        expect(screen.getByText('Nome é obrigatório')).toBeTruthy();
        expect(screen.getByText('E-mail é obrigatório')).toBeTruthy();
        expect(screen.getByText('Idade é obrigatória')).toBeTruthy();
        expect(screen.getByText('Histórico médico é obrigatório')).toBeTruthy();
      });

      expect(mockedCreateUserProfile).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('Validação de formato de e-mail', () => {
    it('deve rejeitar e-mail com formato inválido mesmo com demais campos preenchidos', async () => {
      render(<UserRegistrationForm />);

      fireEvent.changeText(screen.getByPlaceholderText('Seu nome completo'), 'Maria Silva');
      fireEvent.changeText(screen.getByPlaceholderText('seu@email.com'), 'email-invalido');
      fireEvent.changeText(screen.getByPlaceholderText('Ex.: 30'), '35');
      fireEvent.changeText(
        screen.getByPlaceholderText('Descreva seu histórico médico relevante'),
        'Hipertensão controlada'
      );

      fireEvent.press(screen.getByTestId('user-registration-submit'));

      await waitFor(() => {
        expect(screen.getByText('Informe um e-mail válido')).toBeTruthy();
      });

      expect(mockedCreateUserProfile).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('Comportamento ao submeter formulário vazio', () => {
    it('não deve chamar o serviço de cadastro quando nenhum campo foi preenchido', async () => {
      render(<UserRegistrationForm />);

      fireEvent.press(screen.getByTestId('user-registration-submit'));

      await waitFor(() => {
        expect(screen.getByText('Nome é obrigatório')).toBeTruthy();
      });

      expect(mockedCreateUserProfile).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('Submissão com dados válidos e integração simulada com Firebase', () => {
    it('deve chamar createUserProfile com o payload esperado e idade como número', async () => {
      render(<UserRegistrationForm />);

      fireEvent.changeText(screen.getByPlaceholderText('Seu nome completo'), 'Maria Silva');
      fireEvent.changeText(screen.getByPlaceholderText('seu@email.com'), 'maria@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('Ex.: 30'), '42');
      fireEvent.changeText(
        screen.getByPlaceholderText('Descreva seu histórico médico relevante'),
        'Alergia a dipirona'
      );

      fireEvent.press(screen.getByTestId('user-registration-submit'));

      await waitFor(() => {
        expect(mockedCreateUserProfile).toHaveBeenCalledTimes(1);
      });

      expect(mockedCreateUserProfile).toHaveBeenCalledWith({
        name: 'Maria Silva',
        email: 'maria@example.com',
        idade: 42,
        medicalHistory: 'Alergia a dipirona',
      });
    });
  });
});
