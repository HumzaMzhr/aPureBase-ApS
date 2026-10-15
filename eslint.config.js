import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';
export default ts.config({ files: ['public/pcm-capture.js'], languageOptions: { globals: { AudioWorkletProcessor: 'readonly', registerProcessor: 'readonly', currentFrame: 'readonly', sampleRate: 'readonly' } } }, { ignores: ['dist/**', 'node_modules/**'] }, js.configs.recommended, ...ts.configs.recommended, {
  languageOptions: { globals: { ...globals.browser, ...globals.node } }
});
