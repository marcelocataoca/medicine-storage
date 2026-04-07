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
