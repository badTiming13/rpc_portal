import '@inertiajs/core';

declare module '@inertiajs/core' {
  interface PageProps {
    auth: {
      user: { id: number; name: string; wallet?: string | null } | null;
    };
  }
}
