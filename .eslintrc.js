module.exports = {
    parser: '@typescript-eslint/parser',
    extends: [
        'plugin:@typescript-eslint/recommended'
    ],
    parserOptions:  {
        ecmaVersion: 2019,
        sourceType: 'module'
    },
    rules: {
        '@typescript-eslint/member-delimiter-style': ['off'],
        '@typescript-eslint/ban-ts-ignore': ['off']
    }
};