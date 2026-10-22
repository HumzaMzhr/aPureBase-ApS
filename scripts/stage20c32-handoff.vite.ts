import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig({plugins:[react()],publicDir:false,build:{rollupOptions:{input:resolve(process.cwd(),'stage20c32-retest.html')}}});
