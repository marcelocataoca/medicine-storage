import { signOut } from 'firebase/auth';
import { router } from 'expo-router';
import { doc, deleteDoc, setDoc, collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { useEffect, useRef, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth, db } from '@/lib/firebase';
import {
  formatISODateBR,
  normalizeMedicine,
  type Medicine,
  type MedicineDocument,
} from '@/lib/medicine';

type PendingDelete = {
  id: string;
  backup: Medicine;
};

type ExpiryUrgency = 'critical' | 'warning' | 'ok';

type ExpiryVisuals = {
  iconName: keyof typeof Ionicons.glyphMap;
  tagStyle: object;
  iconColor: string;
};

function daysUntilExpiry(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const expiry = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
}

function getExpiryUrgency(isoDate: string): ExpiryUrgency {
  if (!isoDate) return 'ok';
  const days = daysUntilExpiry(isoDate);
  if (days < 30) return 'critical';
  if (days < 90) return 'warning';
  return 'ok';
}

function getFilteredMedicines(query: string, medicines: Medicine[]): Medicine[] {
  if (!query) return medicines;
  const q = query.toLowerCase();
  return medicines.filter((m) => (m.name + ' ' + m.description).toLowerCase().includes(q));
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const [text, setText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedForDeleteId, setSelectedForDeleteId] = useState<string | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(true);
  const [medicineLoadError, setMedicineLoadError] = useState<string | null>(null);

  useEffect(() => {
    const medicinesQuery = query(collection(db, 'medicines'), orderBy('validate', 'asc'));

    const unsubscribe = onSnapshot(
      medicinesQuery,
      (snapshot) => {
        const items = snapshot.docs.map((doc) =>
          normalizeMedicine(doc.id, doc.data() as MedicineDocument)
        );
        setMedicines(items);
        setMedicineLoadError(null);
        setIsLoadingMedicines(false);
      },
      (error) => {
        console.log('Erro ao carregar medicamentos:', error);
        setMedicineLoadError('Não foi possível carregar os medicamentos.');
        setIsLoadingMedicines(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    };
  }, []);

  const filteredMedicines = useMemo(() => getFilteredMedicines(text, medicines), [text, medicines]);

  const closeMenu = () => setMenuVisible(false);

  const goToCadastro = () => {
    closeMenu();
    router.push('/(tabs)/medicine-register');
  };

  const handleLogout = async () => {
    closeMenu();
    try {
      await signOut(auth);
      router.replace('/login');
    } catch {
      Alert.alert('Erro', 'Não foi possível sair.');
    }
  };

  function clearUndoTimer() {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

  function clearUndoState() {
    clearUndoTimer();
    setUndoVisible(false);
    setPendingDelete(null);
  }

  function confirmDelete(item: Medicine) {
    Alert.alert(
      'Excluir medicamento',
      `Deseja excluir "${item.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void executeDelete(item);
          },
        },
      ]
    );
  }

  async function executeDelete(item: Medicine) {
    try {
      setSelectedForDeleteId(null);
      setPendingDelete({ id: item.id, backup: item });
      setUndoVisible(true);

      await deleteDoc(doc(db, 'medicines', item.id));

      clearUndoTimer();
      undoTimerRef.current = setTimeout(() => {
        setUndoVisible(false);
        setPendingDelete(null);
        undoTimerRef.current = null;
      }, 5000);
    } catch (error) {
      console.log('Erro ao excluir medicamento:', error);
      Alert.alert('Erro', 'Não foi possível excluir o medicamento.');
      clearUndoState();
    }
  }

  async function handleUndoDelete() {
    if (!pendingDelete) return;

    try {
      const { id, backup } = pendingDelete;

      await setDoc(doc(db, 'medicines', id), {
        name: backup.name,
        description: backup.description,
        amount: backup.quantidade,
        validate: backup.validade
          ? Timestamp.fromDate(new Date(`${backup.validade}T00:00:00`))
          : null,
      });

      clearUndoState();
    } catch (error) {
      console.log('Erro ao desfazer exclusão:', error);
      Alert.alert('Erro', 'Não foi possível desfazer a exclusão.');
    }
  }

  function handleRowPress(item: Medicine) {
    if (selectedForDeleteId === item.id || selectedForDeleteId === null) {
      setSelectedForDeleteId(null);
      return;
    }

    router.push({
      pathname: '/medicine/details',
      params: { id: item.id },
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="Abrir menu"
          accessibilityRole="button"
          accessibilityState={{ expanded: menuVisible }}
          hitSlop={12}
          onPress={() => setMenuVisible(true)}
          style={({ pressed }) => [
            styles.menuButton,
            colorScheme === 'dark' ? styles.menuButtonSurfaceDark : styles.menuButtonSurfaceLight,
            pressed &&
              (colorScheme === 'dark' ? styles.menuButtonPressedDark : styles.menuButtonPressedLight),
          ]}>
          <Ionicons name="menu" size={30} color={palette.text} />
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={closeMenu}
        transparent
        visible={menuVisible}>
        <View style={styles.menuOverlay}>
          <Pressable
            accessibilityLabel="Fechar menu"
            style={styles.menuBackdrop}
            onPress={closeMenu}
          />
          <View
            accessibilityRole="menu"
            style={[styles.menuPanel, { top: insets.top + 20 }]}
            pointerEvents="box-none">
            <View style={styles.menuSection}>
              <Pressable
                accessibilityLabel="Ir para cadastro de medicamentos"
                accessibilityRole="menuitem"
                onPress={goToCadastro}
                style={({ pressed }) => [
                  styles.menuRow,
                  pressed && styles.menuRowPressed,
                ]}>
                <Ionicons name="add-circle-outline" size={24} color={Colors.light.text} />
                <Text style={styles.menuRowLabel}>Cadastro</Text>
              </Pressable>
            </View>
            <View style={styles.menuDivider} />
            <View style={styles.menuSection}>
              <Pressable
                accessibilityLabel="Sair da conta"
                accessibilityRole="menuitem"
                onPress={() => void handleLogout()}
                style={({ pressed }) => [
                  styles.menuRow,
                  pressed && styles.menuRowPressed,
                ]}>
                <Ionicons name="log-out-outline" size={24} color="#B91C1C" />
                <Text style={[styles.menuRowLabel, styles.menuRowLabelDanger]}>Sair</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.contentContainer}>
        <Input
          placeholder="Busque o remédio"
          value={text}
          onChangeText={setText}
          style={styles.contentInput}
        />

        <View style={styles.resultBox}>
          {renderMedicinesBody({
            isLoading: isLoadingMedicines,
            loadError: medicineLoadError,
            tint: palette.tint,
            medicines: filteredMedicines,
            selectedForDeleteId,
            onSelectForDelete: setSelectedForDeleteId,
            onRowPress: handleRowPress,
            onConfirmDelete: confirmDelete,
          })}
        </View>
      </View>
      {undoVisible && pendingDelete ? (
        <View style={[styles.undoToast, { bottom: insets.bottom + 12 }]}>
          <Text style={styles.undoToastText}>Medicamento excluído</Text>
          <Pressable onPress={() => void handleUndoDelete()}>
            <Text style={styles.undoToastAction}>Desfazer</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function getExpiryVisuals(urgency: ExpiryUrgency): ExpiryVisuals {
  if (urgency === 'critical') {
    return {
      iconName: 'alert-circle',
      tagStyle: styles.expiryTagCritical,
      iconColor: '#B91C1C',
    };
  }
  if (urgency === 'warning') {
    return {
      iconName: 'hourglass-outline',
      tagStyle: styles.expiryTagWarning,
      iconColor: '#A16207',
    };
  }
  return {
    iconName: 'checkmark-circle-outline',
    tagStyle: styles.expiryTagOk,
    iconColor: '#15803D',
  };
}

type MedicineListItemProps = {
  item: Medicine;
  selectedForDeleteId: string | null;
  onSelectForDelete: (id: string) => void;
  onRowPress: (item: Medicine) => void;
  onConfirmDelete: (item: Medicine) => void;
};

function MedicineListItem({
  item,
  selectedForDeleteId,
  onSelectForDelete,
  onRowPress,
  onConfirmDelete,
}: MedicineListItemProps) {
  const { iconName, tagStyle, iconColor } = getExpiryVisuals(getExpiryUrgency(item.validade));
  const showDelete = selectedForDeleteId === item.id;

  return (
    <View style={styles.resultItem}>
      <View
        style={[
          styles.resultItemRow,
          showDelete && styles.resultItemRowWithDeleteReveal,
        ]}>
        <Pressable
          accessibilityLabel={showDelete ? 'Fechar exclusão ou toque longo para outro item' : item.name}
          delayLongPress={300}
          onLongPress={() => onSelectForDelete(item.id)}
          onPress={() => onRowPress(item)}
          style={({ pressed }) => [
            styles.resultItemMainPressable,
            pressed && styles.resultItemPressed,
          ]}>
          <View
            style={[
              styles.resultItemLeft,
              showDelete && styles.resultItemLeftWhenDeleteVisible,
            ]}>
            <Text style={styles.resultItemTitle} numberOfLines={3} ellipsizeMode="tail">
              {item.name}
            </Text>
            <Text style={styles.resultItemDesc} numberOfLines={3} ellipsizeMode="tail">
              {item.description}
            </Text>
          </View>
          <View style={styles.resultItemRight}>
            <View style={styles.expiryLine}>
              <View style={[styles.expiryTag, tagStyle]}>
                <Ionicons name={iconName} size={14} color={iconColor} />
              </View>
              <Text style={styles.resultItemValidade}>{formatISODateBR(item.validade)}</Text>
            </View>
            <Text style={styles.resultItemQuantidade}>{item.quantidade} em estoque</Text>
          </View>
        </Pressable>

        {showDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Excluir ${item.name}`}
            hitSlop={8}
            onPress={() => onConfirmDelete(item)}
            style={({ pressed }) => [
              styles.deleteButtonInline,
              pressed && styles.deleteButtonPressed,
            ]}>
            <Ionicons name="trash-outline" size={18} color="#B91C1C" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type RenderMedicinesBodyParams = {
  isLoading: boolean;
  loadError: string | null;
  tint: string;
  medicines: Medicine[];
  selectedForDeleteId: string | null;
  onSelectForDelete: (id: string) => void;
  onRowPress: (item: Medicine) => void;
  onConfirmDelete: (item: Medicine) => void;
};

function renderMedicinesBody({
  isLoading,
  loadError,
  tint,
  medicines,
  selectedForDeleteId,
  onSelectForDelete,
  onRowPress,
  onConfirmDelete,
}: RenderMedicinesBodyParams) {
  if (isLoading) {
    return (
      <View style={styles.feedbackContainer}>
        <ActivityIndicator color={tint} />
        <Text style={styles.feedbackText}>Carregando medicamentos...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.feedbackContainer}>
        <Text style={styles.feedbackText}>{loadError}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={medicines}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>Nenhum medicamento encontrado.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <MedicineListItem
          item={item}
          selectedForDeleteId={selectedForDeleteId}
          onSelectForDelete={onSelectForDelete}
          onRowPress={onRowPress}
          onConfirmDelete={onConfirmDelete}
        />
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}

const Input = ({
  placeholder,
  value,
  onChangeText,
  style,
}: {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  style?: object;
}) => (
  <View style={[styles.inputContainer, style]}>
    <TextInput
      style={[styles.contentInput, style]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
    />
    <Ionicons name="search" size={20} color="#999" style={styles.icon} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    paddingBottom: 4,
    minHeight: 44,
  },
  menuButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 11,
  },
  menuButtonSurfaceLight: {
    backgroundColor: '#EEF1F4',
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 3,
  },
  menuButtonSurfaceDark: {
    backgroundColor: '#3A3D42',
    borderWidth: 1.5,
    borderColor: '#8E95A0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  menuButtonPressedLight: {
    backgroundColor: '#DDE2E8',
  },
  menuButtonPressedDark: {
    backgroundColor: '#4A4F56',
  },
  menuOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  menuPanel: {
    position: 'absolute',
    left: 12,
    minWidth: 251,
    backgroundColor: '#ffffff',
    borderRadius: 13,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  menuSection: {
    paddingVertical: 3,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 48,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  menuRowPressed: {
    backgroundColor: '#f3f4f6',
  },
  menuRowLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
  },
  menuRowLabelDanger: {
    color: '#B91C1C',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 14,
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
  },
  contentContainer: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  contentInput: {
    fontSize: 16,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '100%',
    color: '#000000',
    paddingRight: 40,
  },
  icon: {
    position: 'absolute',
    right: 12,
    marginTop: 28,
    transform: [{ translateY: -10 }],
  },
  resultBox: {
    width: '100%',
    height: 'auto',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginTop: 16,
    padding: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  feedbackContainer: {
    flex: 1,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  feedbackText: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  resultItemRowWithDeleteReveal: {
    gap: 4,
  },
  resultItemMainPressable: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultItemLeft: {
    flex: 1,
    minWidth: 0,
  },
  resultItemLeftWhenDeleteVisible: {
    transform: [{ translateX: -6 }],
  },
  resultItemRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  expiryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  expiryTag: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expiryTagCritical: {
    backgroundColor: '#FEE2E2',
  },
  expiryTagWarning: {
    backgroundColor: '#FEF9C3',
  },
  expiryTagOk: {
    backgroundColor: '#DCFCE7',
  },
  resultItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  resultItemDesc: {
    marginTop: 4,
    fontSize: 14,
    color: '#444',
  },
  resultItemValidade: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  resultItemQuantidade: {
    marginTop: 6,
    fontSize: 13,
    color: '#555',
  },
  resultItemPressed: {
    opacity: 0.92,
  },
  deleteButtonInline: {
    alignSelf: 'flex-start',
    marginTop: 2,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  deleteButtonPressed: {
    opacity: 0.75,
  },
  undoToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#1F2937',
  },
  undoToastText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '500',
  },
  undoToastAction: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '700',
  },
});
