import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';
const config = tseslint.config(
  {ignores:['.next/**','coverage/**','next-env.d.ts']},
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {files:['**/*.{ts,tsx}'],plugins:{'react-hooks':hooks,'jsx-a11y':a11y},
    rules:{...hooks.configs.recommended.rules,...a11y.configs.recommended.rules}},
  {files:['**/*.mjs'],languageOptions:{globals:{process:'readonly'}}},
);
export default config;
