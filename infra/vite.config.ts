import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';

const devUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
const { hostname, port } = new URL(devUrl);

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
        wayfinder({ formVariants: true }),
    ],
    esbuild: { jsx: 'automatic' },
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        origin: 'http://192.168.0.39:5173',        // адрес, который встраивается в HTML
        hmr: { host: '192.168.0.39', port: 5173 },
        cors: { origin: 'http://192.168.0.39:8000' } // <- разрешаем запрашивать с 8000
        // альтернативно: cors: true  // (поставит ACAO: *)
    }
});
