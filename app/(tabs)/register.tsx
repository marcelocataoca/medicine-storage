import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function RegisterScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [validade, setValidade] = useState('');
  const [quantidade, setQuantidade] = useState('');

  const inputBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const inputText = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'icon');
  const borderColor = useThemeColor({ light: '#e2e8f0', dark: '#3a3a3c' }, 'icon');

  function handleRegister() {
    if (!nome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do medicamento.');
      return;
    }
    Alert.alert(
      'Registro (mock)',
      'Nesta etapa os dados ainda não são salvos. Na próxima versão eles entrarão no estoque junto com a lista de consulta.',
      [
        {
          text: 'OK',
          onPress: () => {
            setNome('');
            setDescricao('');
            setValidade('');
            setQuantidade('');
          },
        },
      ]
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={styles.screenTitle}>
            Registre o novo medicamento
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.label}>
            Nome
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBg, color: inputText, borderColor },
            ]}
            placeholder="Ex.: Paracetamol 500mg"
            placeholderTextColor={placeholderColor}
            value={nome}
            onChangeText={setNome}
            autoCapitalize="sentences"
          />

          <ThemedText type="defaultSemiBold" style={styles.label}>
            Indicação
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.inputMultiline,
              { backgroundColor: inputBg, color: inputText, borderColor },
            ]}
            placeholder="Indicação ou observações"
            placeholderTextColor={placeholderColor}
            value={descricao}
            onChangeText={setDescricao}
            multiline
            textAlignVertical="top"
          />

          <ThemedText type="defaultSemiBold" style={styles.label}>
            Validade
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBg, color: inputText, borderColor },
            ]}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={placeholderColor}
            value={validade}
            onChangeText={setValidade}
            keyboardType="numbers-and-punctuation"
          />

          <ThemedText type="defaultSemiBold" style={styles.label}>
            Quantidade
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBg, color: inputText, borderColor },
            ]}
            placeholder="Unidades em estoque"
            placeholderTextColor={placeholderColor}
            value={quantidade}
            onChangeText={setQuantidade}
            keyboardType="number-pad"
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: tint, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleRegister}>
            <ThemedText lightColor="#fff" darkColor="#11181C" style={styles.buttonLabel}>
              Registrar medicamento
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 24,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  inputMultiline: {
    minHeight: 96,
    paddingTop: 12,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
