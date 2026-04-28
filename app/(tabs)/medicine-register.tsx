import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { db } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';

export default function MedicineRegisterScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [validade, setValidade] = useState<Date | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const inputBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const inputText = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'icon');
  const borderColor = useThemeColor({ light: '#e2e8f0', dark: '#3a3a3c' }, 'icon');

  const minValidadeDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }, []);

  const validadeLabel = validade ? formatDateBR(validade) : 'DD/MM/AAAA';

  async function handleRegister() {
    if (!nome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do medicamento.');
      return;
    }
    if (!validade) {
      Alert.alert('Campo obrigatório', 'Selecione a validade do medicamento.');
      return;
    }

    const quantidadeNumero = Number.parseInt(quantidade, 10);
    const quantidadeNormalizada = Number.isNaN(quantidadeNumero) ? 0 : quantidadeNumero;

    try {
      await addDoc(collection(db, 'medicines'), {
        name: nome.trim(),
        description: descricao.trim(),
        amount: quantidadeNormalizada,
        validate: Timestamp.fromDate(validade),     
        // createdAt: serverTimestamp(),
      });

      Alert.alert('Medicamento registrado', 'O medicamento foi salvo com sucesso.');
      setNome('');
      setDescricao('');
      setValidade(null);
      setQuantidade('');
    } catch (err){
       if (err instanceof FirebaseError) {
        console.log('Firestore error:', err.code, err.message);
        Alert.alert('Erro ao registrar', `${err.code}: ${err.message}`);
      } else {
        console.log('Erro desconhecido:', err);
        Alert.alert('Erro ao registrar', 'Erro desconhecido ao salvar medicamento.');
      }
    }
  }

  function handleOpenDatePicker() {
    setShowDatePicker(true);
  }

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      const normalizedDate = new Date(selectedDate);
      normalizedDate.setHours(0, 0, 0, 0);
      setValidade(normalizedDate);
    }

    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        style={styles.flex}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode="on-drag"
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Selecionar validade"
              style={[
                styles.input,
                styles.dateInput,
                { backgroundColor: inputBg, borderColor },
              ]}
              onPress={handleOpenDatePicker}>
              <ThemedText style={{ color: validade ? inputText : placeholderColor }}>
                {validadeLabel}
              </ThemedText>
            </Pressable>
            {showDatePicker ? (
              <DateTimePicker
                value={validade ?? minValidadeDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={minValidadeDate}
                onChange={handleDateChange}
              />
            ) : null}
            {showDatePicker && Platform.OS === 'ios' ? (
              <Pressable
                style={({ pressed }) => [styles.iosDateDoneButton, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => setShowDatePicker(false)}>
                <ThemedText style={styles.iosDateDoneButtonLabel}>Confirmar data</ThemedText>
              </Pressable>
            ) : null}

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
              onPress={() => {
                void handleRegister();
              }}>
              <ThemedText lightColor="#fff" darkColor="#11181C" style={styles.buttonLabel}>
                Registrar medicamento
              </ThemedText>
            </Pressable>
          </ScrollView>
        </TouchableWithoutFeedback>
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
    paddingBottom: 40,
    flexGrow: 1,
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
  dateInput: {
    justifyContent: 'center',
  },
  iosDateDoneButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  iosDateDoneButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
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

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}
