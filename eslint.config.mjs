import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  { rules: { '@typescript-eslint/no-unused-vars': 'off', 'prefer-const': 'off' } },
  globalIgnores(['build/**', '.next/**', 'reference/**']),
]);
