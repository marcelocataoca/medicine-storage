import React from 'react';
import { Alert } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';

import RegisterScreen from '@/app/(tabs)/register';

describe('RegisterScreen', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');

  beforeEach(() => {
    alertSpy.mockClear();
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  it('renderiza o título, o botão principal e os quatro campos do formulário', () => {
    render(<RegisterScreen />);

    expect(
      screen.getByText('Registre o novo medicamento')
    ).toBeTruthy();
    expect(screen.getByText('Registrar medicamento')).toBeTruthy();

    expect(screen.getByPlaceholderText('Ex.: Paracetamol 500mg')).toBeTruthy();
    expect(
      screen.getByPlaceholderText('Indicação ou observações')
    ).toBeTruthy();
    expect(screen.getByPlaceholderText('DD/MM/AAAA')).toBeTruthy();
    expect(
      screen.getByPlaceholderText('Unidades em estoque')
    ).toBeTruthy();
  });

  it('exibe os rótulos de todos os campos', () => {
    render(<RegisterScreen />);

    expect(screen.getByText('Nome')).toBeTruthy();
    expect(screen.getByText('Indicação')).toBeTruthy();
    expect(screen.getByText('Validade')).toBeTruthy();
    expect(screen.getByText('Quantidade')).toBeTruthy();
  });

  it('atualiza o campo Nome ao digitar', () => {
    render(<RegisterScreen />);
    const input = screen.getByPlaceholderText('Ex.: Paracetamol 500mg');

    fireEvent.changeText(input, 'Paracetamol 500mg');

    expect(input.props.value).toBe('Paracetamol 500mg');
  });

  it('atualiza o campo Indicação ao digitar (multiline)', () => {
    render(<RegisterScreen />);
    const input = screen.getByPlaceholderText('Indicação ou observações');

    fireEvent.changeText(input, 'Dor e febre');

    expect(input.props.value).toBe('Dor e febre');
  });

  it('atualiza Validade e Quantidade ao digitar', () => {
    render(<RegisterScreen />);

    const validade = screen.getByPlaceholderText('DD/MM/AAAA');
    const quantidade = screen.getByPlaceholderText('Unidades em estoque');

    fireEvent.changeText(validade, '31/12/2026');
    fireEvent.changeText(quantidade, '24');

    expect(validade.props.value).toBe('31/12/2026');
    expect(quantidade.props.value).toBe('24');
  });

  it('ao enviar com nome vazio exibe alerta de campo obrigatório e não mostra o fluxo mock', () => {
    render(<RegisterScreen />);

    fireEvent.press(screen.getByText('Registrar medicamento'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'Campo obrigatório',
      'Informe o nome do medicamento.'
    );
  });

  it('ao enviar com nome apenas em branco exibe o mesmo alerta de validação', () => {
    render(<RegisterScreen />);
    const nome = screen.getByPlaceholderText('Ex.: Paracetamol 500mg');
    fireEvent.changeText(nome, '   ');

    fireEvent.press(screen.getByText('Registrar medicamento'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Campo obrigatório',
      'Informe o nome do medicamento.'
    );
  });

  it('com nome preenchido exibe o alerta de registro mock com a mensagem esperada', () => {
    render(<RegisterScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('Ex.: Paracetamol 500mg'),
      'Ibuprofeno'
    );

    fireEvent.press(screen.getByText('Registrar medicamento'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'Registro (mock)',
      'Nesta etapa os dados ainda não são salvos. Na próxima versão eles entrarão no estoque junto com a lista de consulta.',
      expect.any(Array)
    );
  });

  it('ao confirmar o OK do alerta de sucesso limpa todos os campos', async () => {
    render(<RegisterScreen />);
    const nome = screen.getByPlaceholderText('Ex.: Paracetamol 500mg');
    const indicacao = screen.getByPlaceholderText('Indicação ou observações');
    const validade = screen.getByPlaceholderText('DD/MM/AAAA');
    const quantidade = screen.getByPlaceholderText('Unidades em estoque');

    fireEvent.changeText(nome, 'Vitamina C');
    fireEvent.changeText(indicacao, 'Imunidade');
    fireEvent.changeText(validade, '01/01/2027');
    fireEvent.changeText(quantidade, '10');

    fireEvent.press(screen.getByText('Registrar medicamento'));

    const buttons = alertSpy.mock.calls[0][2] as
      | { text?: string; onPress?: () => void }[]
      | undefined;
    const ok = buttons?.find((b) => b.text === 'OK');
    expect(ok?.onPress).toBeDefined();
    await act(async () => {
      ok?.onPress?.();
    });

    expect(screen.getByPlaceholderText('Ex.: Paracetamol 500mg').props.value).toBe(
      ''
    );
    expect(
      screen.getByPlaceholderText('Indicação ou observações').props.value
    ).toBe('');
    expect(screen.getByPlaceholderText('DD/MM/AAAA').props.value).toBe('');
    expect(
      screen.getByPlaceholderText('Unidades em estoque').props.value
    ).toBe('');
  });

  it('snapshot da árvore do formulário permanece consistente', () => {
    const tree = render(<RegisterScreen />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
