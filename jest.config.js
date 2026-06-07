module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    // Force CJS build — @ungap/structured-clone ships "type":"module" which
    // can't be require()'d by Jest's CJS runtime.
    '^@ungap/structured-clone$':
      '<rootDir>/node_modules/@ungap/structured-clone/cjs/index.js',
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Runs after jest-expo's setupFiles but before the test framework.
  // Needed to patch expo/winter lazy globals before Jest 30 triggers them.
  setupFiles: ['<rootDir>/jest.setup.js'],
  verbose: true,
};
