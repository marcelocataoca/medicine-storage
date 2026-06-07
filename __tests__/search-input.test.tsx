import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import SearchInput from '@/components/search-input';

// ---------------------------------------------------------------------------
// Mock de lista para simular resultados de busca futuros, caso o componente
// evolua para receber uma prop `data`. Já preparado para extensibilidade.
// ---------------------------------------------------------------------------
const MOCK_MEDICINES = [
  { id: '1', name: 'Paracetamol', description: 'Dor e febre' },
  { id: '2', name: 'Ibuprofeno', description: 'Anti-inflamatório' },
  { id: '3', name: 'Amoxicilina', description: 'Antibiótico' },
];

// ---------------------------------------------------------------------------
describe('SearchInput', () => {
  // -------------------------------------------------------------------------
  describe('Renderização inicial', () => {
    it('deve renderizar o label com o texto correto', () => {
      // Valida que o label estático aparece na tela ao montar o componente.
      render(<SearchInput />);
      expect(
        screen.getByText('Busque um remédio ou insira sua queixa')
      ).toBeTruthy();
    });

    it('deve renderizar o campo de busca com o placeholder correto', () => {
      // Garante que o TextInput está visível e com o placeholder esperado,
      // tornando possível localizar o input sem depender de testID.
      render(<SearchInput />);
      expect(
        screen.getByPlaceholderText('Digite sua busca aqui...')
      ).toBeTruthy();
    });

    it('deve exibir o valor atual vazio ao inicializar', () => {
      // O componente exibe "Valor atual: {searchText}"; ao montar, searchText
      // é '' então o texto deve ser exatamente "Valor atual: ".
      render(<SearchInput />);
      expect(screen.getByText('Valor atual: ')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('Interação com o input', () => {
    it('deve atualizar o valor atual ao digitar no campo de busca', () => {
      // Simula o usuário digitando "Paracetamol" e verifica se o estado
      // interno (refletido no texto "Valor atual:") é atualizado corretamente.
      render(<SearchInput />);
      const input = screen.getByPlaceholderText('Digite sua busca aqui...');

      fireEvent.changeText(input, 'Paracetamol');

      expect(screen.getByText('Valor atual: Paracetamol')).toBeTruthy();
    });

    it('deve atualizar o valor ao digitar texto parcial', () => {
      // Valida que qualquer digitação — mesmo parcial — é refletida no estado,
      // confirmando que cada tecla dispara o onChangeText corretamente.
      render(<SearchInput />);
      const input = screen.getByPlaceholderText('Digite sua busca aqui...');

      fireEvent.changeText(input, 'Ibu');

      expect(screen.getByText('Valor atual: Ibu')).toBeTruthy();
    });

    it('deve voltar ao valor vazio ao limpar o campo', () => {
      // Verifica o caso de limpar o texto: o estado deve voltar para ''
      // e o display "Valor atual:" deve refletir essa limpeza.
      render(<SearchInput />);
      const input = screen.getByPlaceholderText('Digite sua busca aqui...');

      fireEvent.changeText(input, 'Vitamina C');
      fireEvent.changeText(input, '');

      expect(screen.getByText('Valor atual: ')).toBeTruthy();
    });

    it('deve aceitar texto com caracteres especiais e acentos', () => {
      // Garante que o componente não quebra com entradas que contêm caracteres
      // especiais comuns em nomes de remédios (ex.: "Ácido Fólico").
      render(<SearchInput />);
      const input = screen.getByPlaceholderText('Digite sua busca aqui...');

      fireEvent.changeText(input, 'Ácido Fólico');

      expect(screen.getByText('Valor atual: Ácido Fólico')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('Mudanças de estado', () => {
    it('deve preservar o último valor digitado entre re-renders', () => {
      // Assegura que múltiplas mudanças de texto resultam sempre no último
      // valor digitado sendo exibido, sem regressão de estado.
      render(<SearchInput />);
      const input = screen.getByPlaceholderText('Digite sua busca aqui...');

      fireEvent.changeText(input, 'Ômega');
      fireEvent.changeText(input, 'Ômega 3');

      expect(screen.getByText('Valor atual: Ômega 3')).toBeTruthy();
      expect(screen.queryByText('Valor atual: Ômega')).toBeNull();
    });

    it('não deve exibir texto anterior após nova digitação', () => {
      // Confirma que o display de valor atual nunca mostra um estado "stale"
      // — apenas o valor mais recente deve estar presente no DOM.
      render(<SearchInput />);
      const input = screen.getByPlaceholderText('Digite sua busca aqui...');

      fireEvent.changeText(input, 'Dipirona');
      fireEvent.changeText(input, 'Cetal');

      expect(screen.queryByText('Valor atual: Dipirona')).toBeNull();
      expect(screen.getByText('Valor atual: Cetal')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('Dados mock — compatibilidade de nomes da lista', () => {
    // Estes testes validam que o componente SearchInput exibe corretamente
    // os termos digitados que correspondem à lista mock de remédios.
    // São úteis como base para quando o componente evoluir e receber `data`.
    it.each(MOCK_MEDICINES)(
      'deve aceitar o nome "$name" como entrada válida',
      ({ name }) => {
        // Para cada item da lista mock, simula o usuário digitando o nome
        // do remédio e verifica que o estado reflete o valor digitado.
        render(<SearchInput />);
        const input = screen.getByPlaceholderText('Digite sua busca aqui...');

        fireEvent.changeText(input, name);

        expect(screen.getByText(`Valor atual: ${name}`)).toBeTruthy();
      }
    );
  });

  // -------------------------------------------------------------------------
  describe('Cenários de borda (edge cases)', () => {
    it('deve tratar entrada somente com espaços sem quebrar', () => {
      // Garante que espaços em branco não causam exceção ou comportamento
      // inesperado no estado ou na renderização.
      render(<SearchInput />);
      const input = screen.getByPlaceholderText('Digite sua busca aqui...');

      fireEvent.changeText(input, '   ');

      expect(screen.getByText('Valor atual:    ')).toBeTruthy();
    });

    it('deve tratar uma string muito longa sem quebrar o layout', () => {
      // Simula um texto excessivamente longo para garantir que o componente
      // não lança erros e continua exibindo o valor no estado.
      render(<SearchInput />);
      const input = screen.getByPlaceholderText('Digite sua busca aqui...');
      const longText = 'A'.repeat(200);

      fireEvent.changeText(input, longText);

      expect(screen.getByText(`Valor atual: ${longText}`)).toBeTruthy();
    });

    it('deve montar e desmontar o componente sem erros', () => {
      // Testa o ciclo de vida básico: montagem e desmontagem não devem
      // disparar warnings de memory leak ou side effects não limpos.
      const { unmount } = render(<SearchInput />);
      expect(() => unmount()).not.toThrow();
    });
  });
});
