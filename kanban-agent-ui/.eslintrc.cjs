module.exports = {
  root: true,
  ignorePatterns: [
    'dist',
    'node_modules',
    'src/components/Header/**',
    'src/components/KanbanBoard/**',
    'src/components/Modals/**',
    'src/components/RightPanel/**',
    'src/components/Sessions/**',
    'src/components/AgentManager/**',
    'src/hooks/**',
    'src/utils/**',
    'src/store/**',
    'src/styles/**',
    'src/api/**',
    'src/assets/**',
  ],
  overrides: [
    {
      files: ['*.js', '*.jsx'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      env: {
        browser: true,
        es2021: true,
      },
      extends: ['eslint:recommended', 'plugin:react-hooks/recommended'],
      rules: {
        'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      env: {
        browser: true,
        es2021: true,
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
      ],
      rules: {
        '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      },
    },
  ],
}
