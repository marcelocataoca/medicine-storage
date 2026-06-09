import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { auth } from '@/lib/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

const FORM_MAX_WIDTH = 440;

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;
  const { width: windowWidth } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const inputBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const inputText = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'icon');
  const borderColor = useThemeColor({ light: '#e2e8f0', dark: '#3a3a3c' }, 'icon');
  const mutedText = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'icon');

  const formWidth = Math.min(windowWidth - 40, FORM_MAX_WIDTH);

  const handleLogin = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert('Campos obrigatórios', 'Informe e-mail e senha.');
      return;
    }
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      router.replace('/(tabs)');
    } catch (err) {
      const message =
        err instanceof FirebaseError
          ? mapAuthErrorToMessage(err.code)
          : 'Não foi possível entrar. Tente novamente.';
      Alert.alert('Não foi possível entrar', message);
    } finally {
      setSubmitting(false);
    }
  }, [email, password]);

  const handleForgotPassword = useCallback(() => {
    // Future: sendPasswordResetEmail(auth, email) ou fluxo dedicado
    Alert.alert(
      'Esqueci minha senha',
      'O fluxo de recuperação de senha será adicionado na integração com autenticação.',
    );
  }, []);

  const handleSignUp = useCallback(() => {
    router.push('/(tabs)/medicine-register');
  }, []);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={[styles.formColumn, { maxWidth: formWidth, alignSelf: 'center' }]}>
              <ThemedText type="title" style={styles.headline}>
                Entrar
              </ThemedText>
              <ThemedText style={[styles.subhead, { color: mutedText }]}>
                Acesse sua conta para gerenciar o estoque de medicamentos.
              </ThemedText>

              <ThemedText type="defaultSemiBold" style={styles.label}>
                E-mail
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBg, color: inputText, borderColor },
                ]}
                placeholder="seu@email.com"
                placeholderTextColor={placeholderColor}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
              />

              <ThemedText type="defaultSemiBold" style={styles.label}>
                Senha
              </ThemedText>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputPassword,
                    { backgroundColor: inputBg, color: inputText, borderColor },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={placeholderColor}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                  style={({ pressed }) => [
                    styles.eyeButton,
                    { opacity: pressed ? 0.65 : 1 },
                  ]}
                  onPress={() => setPasswordVisible((v) => !v)}
                  hitSlop={8}>
                  <MaterialIcons
                    name={passwordVisible ? 'visibility-off' : 'visibility'}
                    size={22}
                    color={placeholderColor}
                  />
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [styles.forgotWrap, { opacity: pressed ? 0.75 : 1 }]}
                onPress={handleForgotPassword}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <ThemedText style={[styles.linkText, { color: tint }]}>Esqueci minha senha</ThemedText>
              </Pressable>

              <Pressable
                disabled={submitting}
                style={({ pressed }) => {
                  let opacity = 1;
                  if (submitting) opacity = 0.65;
                  else if (pressed) opacity = 0.85;
                  return [styles.primaryButton, { backgroundColor: tint, opacity }];
                }}
                onPress={() => {
                  void handleLogin();
                }}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText
                    lightColor="#fff"
                    darkColor="#11181C"
                    style={styles.primaryButtonLabel}>
                    Entrar
                  </ThemedText>
                )}
              </Pressable>

              <View style={styles.signUpRow}>
                <ThemedText style={{ color: mutedText }}>Não tem uma conta?</ThemedText>
                <Pressable
                  style={({ pressed }) => [styles.signUpPressable, { opacity: pressed ? 0.75 : 1 }]}
                  onPress={handleSignUp}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                  <ThemedText style={[styles.linkText, { color: tint }]}>Cadastre-se</ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function mapAuthErrorToMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada.';
    case 'auth/user-not-found':
      return 'Não há conta com este e-mail.';
    case 'auth/wrong-password':
      return 'Senha incorreta.';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'E-mail ou senha incorretos.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
    case 'auth/network-request-failed':
      return 'Sem conexão. Verifique a internet.';
    default:
      return 'Verifique e-mail e senha e tente novamente.';
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  formColumn: {
    width: '100%',
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 8,
  },
  subhead: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  passwordRow: {
    position: 'relative',
    marginBottom: 0,
  },
  inputPassword: {
    paddingRight: 48,
    marginBottom: 8,
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    padding: 4,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  signUpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  signUpPressable: {
    marginLeft: 2,
  },
});
