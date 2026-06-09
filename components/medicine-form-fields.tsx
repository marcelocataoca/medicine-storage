import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatDateBR } from '@/lib/medicine';

type MedicineFormFieldsProps = {
  nome: string;
  onNomeChange: (value: string) => void;
  descricao: string;
  onDescricaoChange: (value: string) => void;
  validade: Date | null;
  onValidadeChange: (value: Date | null) => void;
  quantidade: string;
  onQuantidadeChange: (value: string) => void;
  showBarcodeScanner?: boolean;
  onOpenScanner?: () => void;
  isLoadingBarcode?: boolean;
  minimumValidadeDate?: Date;
  /** Quando true, não impõe data mínima (útil na edição de itens já cadastrados). */
  allowPastValidade?: boolean;
};

export function MedicineFormFields({
  nome,
  onNomeChange,
  descricao,
  onDescricaoChange,
  validade,
  onValidadeChange,
  quantidade,
  onQuantidadeChange,
  showBarcodeScanner = false,
  onOpenScanner,
  isLoadingBarcode = false,
  minimumValidadeDate,
  allowPastValidade = false,
}: MedicineFormFieldsProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;

  const [showDatePicker, setShowDatePicker] = useState(false);

  const inputBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const inputText = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'icon');
  const borderColor = useThemeColor({ light: '#e2e8f0', dark: '#3a3a3c' }, 'icon');

  const defaultMinValidadeDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }, []);

  const minValidadeDate = minimumValidadeDate ?? defaultMinValidadeDate;
  const pickerMinimumDate = allowPastValidade ? undefined : minValidadeDate;
  const validadeLabel = validade ? formatDateBR(validade) : 'DD/MM/AAAA';

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
      onValidadeChange(normalizedDate);
    }

    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
  }

  return (
    <>
      <View style={styles.labelRow}>
        <ThemedText type="defaultSemiBold" style={styles.labelInline}>
          Nome
        </ThemedText>
        {showBarcodeScanner ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ler código de barras"
            disabled={isLoadingBarcode}
            style={({ pressed }) => [
              styles.cameraButton,
              {
                borderColor,
                backgroundColor: pressed ? `${tint}18` : inputBg,
                opacity: isLoadingBarcode ? 0.7 : 1,
              },
            ]}
            onPress={onOpenScanner}
            hitSlop={8}>
            {isLoadingBarcode ? (
              <ActivityIndicator color={tint} size="small" />
            ) : (
              <Ionicons name="camera-outline" size={20} color={tint} />
            )}
          </Pressable>
        ) : null}
      </View>
      <TextInput
        style={[styles.input, { backgroundColor: inputBg, color: inputText, borderColor }]}
        placeholder="Ex.: Paracetamol 500mg"
        placeholderTextColor={placeholderColor}
        value={nome}
        onChangeText={onNomeChange}
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
        onChangeText={onDescricaoChange}
        multiline
        textAlignVertical="top"
      />

      <ThemedText type="defaultSemiBold" style={styles.label}>
        Validade
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Selecionar validade"
        style={[styles.input, styles.dateInput, { backgroundColor: inputBg, borderColor }]}
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
          minimumDate={pickerMinimumDate}
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
        style={[styles.input, { backgroundColor: inputBg, color: inputText, borderColor }]}
        placeholder="Unidades em estoque"
        placeholderTextColor={placeholderColor}
        value={quantidade}
        onChangeText={onQuantidadeChange}
        keyboardType="number-pad"
      />
    </>
  );
}

export const medicineFormStyles = StyleSheet.create({
  label: {
    marginBottom: 6,
    fontSize: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  labelInline: {
    fontSize: 14,
  },
  cameraButton: {
    minWidth: 42,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
});

const styles = medicineFormStyles;
