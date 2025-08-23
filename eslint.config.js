// @ts-check

import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['**/node_modules', '**/dist', '.DS_Store'],
  },

  // Base configuration for all TypeScript files
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },

  // Client-specific configuration for App source files
  {
    files: ['client/src/**/*.{ts,tsx}'],
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      'react-refresh': pluginReactRefresh,
    },
    languageOptions: {
      parserOptions: {
        project: 'client/tsconfig.app.json',
      },
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react-refresh/only-export-components': 'warn',
    },
  },

  // Client-specific configuration for config files
  {
    files: ['client/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: 'client/tsconfig.node.json',
      },
      globals: {
        ...globals.node,
      },
    },
  },

  // Server-specific configuration
  {
    files: ['server/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: 'server/tsconfig.json',
      },
      globals: {
        ...globals.node,
      },
    },
  },

  // Prettier configuration must be last
  eslintConfigPrettier
);
