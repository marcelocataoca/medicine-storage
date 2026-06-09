import { CameraView, useCameraPermissions } from 'expo-camera';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { MedicineFormFields } from '@/components/medicine-form-fields';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { lookupProductByBarcode } from '@/lib/barcode-product-lookup';
import { auth, db } from '@/lib/firebase';
import { parseQuantidade, validateMedicineForm } from '@/lib/medicine';
import { FirebaseError } from 'firebase/app';

export default function MedicineRegisterScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [validade, setValidade] = useState<Date | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isLoadingBarcode, setIsLoadingBarcode] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const isFetchingProduct = useRef(false);

  const uid = auth.currentUser?.uid;
if (!uid) throw new Error('Usuário não autenticado');

  async function handleRegister() {
    const validationError = validateMedicineForm(nome, validade);
    if (validationError) {
      Alert.alert('Campo obrigatório', validationError);
      return;
    }

    const quantidadeNormalizada = parseQuantidade(quantidade);

    try {
      await addDoc(collection(db, 'medicines'), {
        name: nome.trim(),
        description: descricao.trim(),
        amount: quantidadeNormalizada,
        validate: Timestamp.fromDate(validade as Date),
        ownerId: uid,
      });

      Alert.alert('Medicamento registrado', 'O medicamento foi salvo com sucesso.');
      setNome('');
      setDescricao('');
      setValidade(null);
      setQuantidade('');
    } catch (err) {
      if (err instanceof FirebaseError) {
        console.log('Firestore error:', err.code, err.message);
        Alert.alert('Erro ao registrar', `${err.code}: ${err.message}`);
      } else {
        console.log('Erro desconhecido:', err);
        Alert.alert('Erro ao registrar', 'Erro desconhecido ao salvar medicamento.');
      }
    }
  }

  async function handleOpenScanner() {
    if (isLoadingBarcode) return;

    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permissão necessária', 'Permita o uso da câmera para ler o código de barras.');
        return;
      }
    }
    isFetchingProduct.current = false;
    setShowScanner(true);
  }

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (isFetchingProduct.current) return;

    const code = data?.trim();
    if (!code) {
      Alert.alert('Leitura inválida', 'Não foi possível obter o código de barras.');
      return;
    }

    isFetchingProduct.current = true;
    setIsLoadingBarcode(true);
    setShowScanner(false);

    try {
      const product = await lookupProductByBarcode(code);

      if (!product) {
        Alert.alert('Produto não encontrado', 'Nenhuma informação retornada para este código.');
        return;
      }

      setNome(product.name);
      if (product.description) setDescricao(product.description);
      Alert.alert('Produto encontrado', 'Nome e descrição preenchidos automaticamente.');
    } catch {
      Alert.alert(
        'Erro na leitura',
        'Não foi possível ler o código ou buscar o produto. Tente novamente.',
      );
    } finally {
      isFetchingProduct.current = false;
      setIsLoadingBarcode(false);
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

            <MedicineFormFields
              nome={nome}
              onNomeChange={setNome}
              descricao={descricao}
              onDescricaoChange={setDescricao}
              validade={validade}
              onValidadeChange={setValidade}
              quantidade={quantidade}
              onQuantidadeChange={setQuantidade}
              showBarcodeScanner
              onOpenScanner={() => {
                void handleOpenScanner();
              }}
              isLoadingBarcode={isLoadingBarcode}
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

      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
            }}
            onBarcodeScanned={showScanner ? handleBarcodeScanned : undefined}
          />
          <Pressable
            style={({ pressed }) => [styles.closeScanner, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => setShowScanner(false)}>
            <ThemedText style={styles.closeScannerLabel}>Fechar câmera</ThemedText>
          </Pressable>
        </View>
      </Modal>
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
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  closeScanner: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#111',
  },
  closeScannerLabel: {
    color: '#fff',
    fontSize: 16,
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
