import { signOut } from 'firebase/auth';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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
import { auth } from '@/lib/firebase';

type Medicine = {
  id: string;
  name: string;
  description: string;
  /** ISO YYYY-MM-DD */
  validade: string;
  quantidade: number;
};

type ExpiryUrgency = 'critical' | 'warning' | 'ok';

function daysUntilExpiry(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const expiry = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
}

function getExpiryUrgency(isoDate: string): ExpiryUrgency {
  const days = daysUntilExpiry(isoDate);
  if (days < 30) return 'critical';
  if (days < 90) return 'warning';
  return 'ok';
}

function formatValidadeBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

  const Input = ({ placeholder, value, onChangeText, style }: {
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    style?: object;
  }) => {
    return (
      <View style={[styles.inputContainer, style]}>
        <TextInput 
          style={[styles.contentInput, style]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
        />
        <Ionicons 
          name="search" 
          size={20} 
          color="#999" 
          style={styles.icon}
        />
      </View>
    )
  };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const [text, setText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

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
          <FlatList
            data={getFilteredMedicines(text)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const urgency = getExpiryUrgency(item.validade);
              let iconName: keyof typeof Ionicons.glyphMap = 'checkmark-circle-outline';
              let tagStyle = styles.expiryTagOk;
              let iconColor = '#15803D';
              if (urgency === 'critical') {
                iconName = 'alert-circle';
                tagStyle = styles.expiryTagCritical;
                iconColor = '#B91C1C';
              } else if (urgency === 'warning') {
                iconName = 'hourglass-outline';
                tagStyle = styles.expiryTagWarning;
                iconColor = '#A16207';
              }

              return (
                <View style={styles.resultItem}>
                  <View style={styles.resultItemRow}>
                    <View style={styles.resultItemLeft}>
                      <Text style={styles.resultItemTitle}>{item.name}</Text>
                      <Text style={styles.resultItemDesc}>{item.description}</Text>
                    </View>
                    <View style={styles.resultItemRight}>
                      <View style={styles.expiryLine}>
                        <View style={[styles.expiryTag, tagStyle]}>
                          <Ionicons name={iconName} size={14} color={iconColor} />
                        </View>
                        <Text style={styles.resultItemValidade}>
                          {formatValidadeBR(item.validade)}
                        </Text>
                      </View>
                      <Text style={styles.resultItemQuantidade}>
                        {item.quantidade} em estoque
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>        
      </View>
    </SafeAreaView>
  );
}

/** Validades espalhadas para exercitar as tags (<30d vermelho, 30–89d amarelo, ≥90d verde). Referência: 2026-04-06. */
const MEDICINES: Medicine[] = [
  { id: '1', name: 'Paracetamol', description: 'Dor e febre', validade: '2026-04-25', quantidade: 24 },
  { id: '2', name: 'Ibuprofeno', description: 'Anti-inflamatório', validade: '2026-04-18', quantidade: 10 },
  { id: '3', name: 'Amoxicilina', description: 'Antibiótico', validade: '2026-06-01', quantidade: 14 },
  { id: '4', name: 'Cetirizina', description: 'Anti-histamínico', validade: '2026-05-20', quantidade: 30 },
  { id: '5', name: 'Omeprazol', description: 'Refluxo e azia', validade: '2026-07-10', quantidade: 8 },
  { id: '6', name: 'Losartana', description: 'Hipertensão', validade: '2028-04-06', quantidade: 60 },
  { id: '7', name: 'Metformina', description: 'Diabetes', validade: '2027-11-01', quantidade: 90 },
  { id: '8', name: 'Ranitidina', description: 'Úlcera gástrica', validade: '2026-05-05', quantidade: 5 },
  { id: '9', name: 'Cloridrato de sertralina', description: 'Antidepressivo', validade: '2026-08-20', quantidade: 28 },
  { id: '10', name: 'Vitamina C', description: 'Suplemento', validade: '2027-02-01', quantidade: 100 },
];

function getFilteredMedicines(query: string): Medicine[] {
  if (!query) return MEDICINES;
  const q = query.toLowerCase();
  return MEDICINES.filter(m => (m.name + ' ' + m.description).toLowerCase().includes(q));
}

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
    padding: 20,
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
    height: 420,
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
    gap: 12,
  },
  resultItemLeft: {
    flex: 1,
    minWidth: 0,
  },
  resultItemRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  expiryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
});
