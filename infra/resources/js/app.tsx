import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { SolanaProvider } from './solana/SolanaProvider';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => title ? `${title} - ${appName}` : appName,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        const initialAuthUser = (props.initialPage.props as any)?.auth?.user;
        const autoConnect = !!initialAuthUser;

        root.render(
            <SolanaProvider autoConnect={autoConnect}>
                <App {...props} />
            </SolanaProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
