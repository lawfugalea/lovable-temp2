import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  {
    // This Pages Router app intentionally loads external state in effects and
    // is not compiled with React Compiler. Keep the actionable hooks rules
    // while excluding compiler-oriented diagnostics for those established flows.
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'public/smart-images/**',
    '.claude/**',
  ]),
])
