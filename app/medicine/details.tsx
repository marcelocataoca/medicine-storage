import { FirebaseError } from 'firebase/app';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';

import { MedicineFormFields } from '@/components/medicine-form-fields';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  fetchMedicineById,
  isFormDirty,
  medicineToFormSnapshot,
  parseQuantidade,
  updateMedicine,
  validateMedicineForm,
  type MedicineFormSnapshot,
} from '@/lib/medicine';

export default function MedicineDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;
  const borderColor = colorScheme === 'dark' ? '#3a3a3c' : '#e2e8f0';

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [validade, setValidade] = useState<Date | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const originalSnapshotRef = useRef<MedicineFormSnapshot | null>(null);

  const currentSnapshot = useMemo<MedicineFormSnapshot>(
    () => ({
      nome,
      descricao,
      validade,
      quantidade,
    }),
    [nome, descricao, validade, quantidade]
  );

  const isDirty = useMemo(() => {
    if (!originalSnapshotRef.current) return false;
    return isFormDirty(currentSnapshot, originalSnapshotRef.current);
  }, [currentSnapshot]);

  const loadMedicine = useCallback(async (medicineId: string) => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const medicine = await fetchMedicineById(medicineId);
      if (!medicine) {
        setLoadError('Medicamento não encontrado.');
        return;
      }

      const snapshot = medicineToFormSnapshot(medicine);
      originalSnapshotRef.current = snapshot;
      setNome(snapshot.nome);
      setDescricao(snapshot.descricao);
      setValidade(snapshot.validade);
      setQuantidade(snapshot.quantidade);
    } catch (error) {
      console.log('Erro ao carregar medicamento:', error);
      setLoadError('Não foi possível carregar os dados do medicamento.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof id !== 'string' || !id) {
      setLoadError('Identificador do medicamento inválido.');
      setIsLoading(false);
      return;
    }

    void loadMedicine(id);
  }, [id, loadMedicine]);

  function handleCancel() {
    if (isDirty) {
      Alert.alert(
        'Descartar alterações?',
        'Existem alterações não salvas.',
        [
          { text: 'Continuar editando', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
      return;
    }

    router.back();
  }

  async function handleUpdate() {
    if (!id || typeof id !== 'string') return;

    const validationError = validateMedicineForm(nome, validade);
    if (validationError) {
      Alert.alert('Campo obrigatório', validationError);
      return;
    }

    setIsSaving(true);

    try {
      await updateMedicine(id, {
        name: nome.trim(),
        description: descricao.trim(),
        amount: parseQuantidade(quantidade),
        validate: validade as Date,
      });

      Alert.alert('Medicamento atualizado', 'As alterações foram salvas com sucesso.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      if (err instanceof FirebaseError) {
        console.log('Firestore error:', err.code, err.message);
        Alert.alert('Erro ao atualizar', `${err.code}: ${err.message}`);
      } else {
        console.log('Erro desconhecido:', err);
        Alert.alert('Erro ao atualizar', 'Erro desconhecido ao salvar medicamento.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={tint} size="large" />
        <ThemedText style={styles.feedbackText}>Carregando medicamento...</ThemedText>
      </ThemedView>
    );
  }

  if (loadError) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.feedbackText}>{loadError}</ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => router.back()}>
          <ThemedText style={styles.secondaryButtonLabel}>Voltar</ThemedText>
        </Pressable>
      </ThemedView>
    );
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

            <MedicineFormFields
              nome={nome}
              onNomeChange={setNome}
              descricao={descricao}
              onDescricaoChange={setDescricao}
              validade={validade}
              onValidadeChange={setValidade}
              quantidade={quantidade}
              onQuantidadeChange={setQuantidade}
              allowPastValidade
            />

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !isDirty || isSaving }}
              disabled={!isDirty || isSaving}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: tint,
                  opacity: !isDirty || isSaving ? 0.45 : pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => {
                void handleUpdate();
              }}>
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText lightColor="#fff" darkColor="#11181C" style={styles.buttonLabel}>
                  Editar Medicamento
                </ThemedText>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleCancel}>
              <ThemedText style={styles.secondaryButtonLabel}>Cancelar</ThemedText>
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
  secondaryButton: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  feedbackText: {
    fontSize: 15,
    textAlign: 'center',
  },
});
