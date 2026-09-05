// Flat config: ESLint 10 removed eslintrc and deprecated formatting rules,
// so .eslintrc.json + .eslint-configs/* were merged here. Formatting rules
// moved to @stylistic/*, everything else keeps its original options.
import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import unicorn from 'eslint-plugin-unicorn'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // dist is linted by the `postbuild` script, so it must stay unignored
  { ignores: ['coverage', 'node_modules'] },

  js.configs.all,
  unicorn.configs.all,

  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/array-element-newline': ['error', 'consistent'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/dot-location': ['error', 'property'],
      '@stylistic/eol-last': 'error',
      'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
      '@stylistic/function-call-argument-newline': ['error', 'consistent'],
      '@stylistic/function-paren-newline': ['error', 'multiline-arguments'],
      '@stylistic/indent': ['error', 2, { SwitchCase: 1 }],
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
      '@stylistic/operator-linebreak': ['error', 'before', { overrides: { '=': 'after' } }],
      '@stylistic/padded-blocks': ['error', 'never'],
      '@stylistic/quote-props': ['error', 'consistent-as-needed'],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],

      'unicorn/consistent-boolean-name': 'off',
      'unicorn/consistent-class-member-order': ['error', {
        order: [
          'static-field',
          'static-block',
          'static-method',
          'constructor',
          'public-field',
          'private-field',
          'public-method',
          'private-method',
        ],
      }],
      'unicorn/filename-case': ['error', {
        cases: {
          camelCase: true,
          pascalCase: true,
        },
        ignore: [
          '\\.d\\.ts$',
        ],
      }],
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-keyword-prefix': 'off',
      // `prev`/`next` are the domain vocabulary of this library
      'unicorn/name-replacements': 'off',
      'unicorn/no-nested-ternary': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-useless-undefined': 'off',
      'unicorn/numeric-separators-style': ['error', {
        number: {
          minimumDigits: 4,
        },
      }],
      'unicorn/prefer-top-level-await': 'off',
      // concise arrows are enforced by core `arrow-body-style` instead
      'unicorn/consistent-arrow-return-style': 'off',
      // spec legitimately exercises `Date` — the library supports it
      'unicorn/prefer-temporal': 'off',
      // hot loops intentionally reuse `let` bindings instead of re-declaring per iteration
      'unicorn/prefer-smaller-scope': 'off',

      'array-element-newline': 'off',
      'capitalized-comments': 'off',
      'class-methods-use-this': 'off',
      'consistent-return': 'off',
      'curly': ['error', 'multi-line'],
      'default-case': 'off',
      'id-length': ['error', { exceptions: ['q', 'x', 'y'] }],
      'line-comment-position': 'off',
      'max-lines-per-function': ['error', { max: 100 }],
      'max-statements': ['error', { max: 25 }],
      'multiline-comment-style': 'off',
      'no-console': 'error',
      'no-duplicate-imports': 'off',
      'no-inline-comments': 'off',
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      'no-ternary': 'off',
      'no-undefined': 'off',
      'no-use-before-define': ['error', { functions: false }],
      'no-void': 'off',
      'no-warning-comments': 'off',
      'object-curly-spacing': 'off',
      'object-property-newline': 'off',
      'one-var': ['error', 'never'],
      'quotes': 'off',
      'require-unicode-regexp': 'off',
      'semi': 'off',
      'sort-imports': 'off',
      'sort-keys': 'off',
      'spaced-comment': 'off',
    },
  },

  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.all],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@stylistic/comma-spacing': 'error',
      '@stylistic/member-delimiter-style': ['error', {
        multiline: { delimiter: 'none', requireLast: true },
        singleline: { delimiter: 'comma', requireLast: false },
        multilineDetection: 'brackets',
      }],

      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      }],
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
      '@typescript-eslint/init-declarations': 'off',
      '@typescript-eslint/max-params': ['error', { max: 5 }],
      '@typescript-eslint/member-ordering': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/no-misused-promises': ['error', {
        checksConditionals: true,
        checksVoidReturn: {
          arguments: true,
          attributes: false,
          properties: true,
          returns: true,
          variables: true,
        },
      }],
      '@typescript-eslint/no-magic-numbers': ['error', {
        ignore: [0],
        ignoreArrayIndexes: true,
        detectObjects: false,
      }],
      // `{}` constraint marks "any non-nullish object-like value" by design
      '@typescript-eslint/no-empty-object-type': ['error', { allowObjectTypes: 'always' }],
      '@typescript-eslint/no-unsafe-function-type': 'off',
      // runtime narrowing is the whole point of this library, assertions are intentional
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-use-before-define': ['error', {
        functions: false,
        classes: true,
        variables: true,
        enums: true,
        typedefs: true,
        ignoreTypeReferences: true,
      }],
      '@typescript-eslint/parameter-properties': ['error', { prefer: 'parameter-property' }],
      '@typescript-eslint/prefer-destructuring': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      '@typescript-eslint/promise-function-async': 'off',
      '@typescript-eslint/sort-type-constituents': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      'max-params': 'off',
      'no-magic-numbers': 'off',
      'no-use-before-define': 'off',
    },
  },

  {
    files: ['src/react/**/*.ts'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // index.ts is the public `./react` subpath entry, not an internal barrel
      'unicorn/no-barrel-files': 'off',
    },
  },

  {
    files: ['eslint.config.mjs'],
    rules: {
      // rule options legitimately contain numeric values and escaped regexes
      'no-magic-numbers': 'off',
      'unicorn/prefer-string-raw': 'off',
    },
  },

  {
    // compiled output: tsc emits interop helpers (`__importDefault`, `__esModule`, `this`, anonymous IIFEs)
    files: ['dist/**/*.{js,d.ts}'],
    rules: {
      // dist is CommonJS but is parsed as ESM by default, where the rule strips
      // tsc's top-level "use strict" as redundant on --fix — keep the directive
      'strict': 'off',
      'func-names': 'off',
      'no-underscore-dangle': 'off',
      'no-invalid-this': 'off',
      'unicorn/no-this-outside-of-class': 'off',
      'unicorn/no-barrel-files': 'off',
      'unicorn/prefer-module': 'off',
      'camelcase': 'off',
      'init-declarations': 'off',
      'no-magic-numbers': 'off',
      'no-multi-assign': 'off',
      // comment-only catch bodies compile to empty blocks (removeComments);
      // swallowing the failed reuse write is intentional
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
)
