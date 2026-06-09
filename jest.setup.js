// Valores mínimos para `lib/firebase.ts` (assertConfig) em testes.
process.env.EXPO_PUBLIC_FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'test-api-key';
process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN =
  process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'test.firebaseapp.com';
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID =
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'test-project';
process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET =
  process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'test-project.appspot.com';
process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID =
  process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '123456789';
process.env.EXPO_PUBLIC_FIREBASE_APP_ID =
  process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:123456789:web:abcdef';

// Patches expo/src/winter lazy globals installed by jest-expo's preset setup.
// Those getters load ESM-only packages (e.g. @ungap/structured-clone) via
// require(), which Jest 30's CJS runtime rejects before any test runs.
// We redefine each property with a safe stub/native value so the getter is
// never invoked.

const GLOBALS_TO_PATCH = [
  '__ExpoImportMetaRegistry',
  'structuredClone',
  'TextDecoder',
  'TextDecoderStream',
  'TextEncoderStream',
  'URL',
  'URLSearchParams',
];

for (const name of GLOBALS_TO_PATCH) {
  const existing = Object.getOwnPropertyDescriptor(global, name);
  // Only patch if expo installed a lazy getter (has 'get' but no 'value')
  if (existing && typeof existing.get === 'function' && !('value' in existing)) {
    Object.defineProperty(global, name, {
      configurable: true,
      enumerable: false,
      writable: true,
      // Use the native global if available, otherwise a no-op stub
      value: global[name] ?? (() => {}),
    });
  }
}
