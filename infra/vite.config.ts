import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { wayfinder } from '@laravel/vite-plugin-wayfinder'

const devUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
const { hostname, port } = new URL(devUrl)

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
        port: Number(port) || 5173,
        strictPort: true,
        origin: devUrl,                       // 'http://localhost:5173'
        hmr: { host: hostname, port: Number(port) || 5173 },

        cors: {
            origin: ['http://localhost:8000'],  // ровно тот origin, где открыт Laravel
            methods: ['GET', 'HEAD', 'OPTIONS'],
            allowedHeaders: ['*'],
            credentials: false,
        },
        headers: {
            'Access-Control-Allow-Origin': 'http://localhost:8000',
        },
    },
})
