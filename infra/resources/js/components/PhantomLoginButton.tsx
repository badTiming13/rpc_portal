// resources/js/components/PhantomLoginButton.tsx
import React from 'react';
import bs58 from 'bs58';

declare global {
  interface Window { solana?: any; }
}

export default function PhantomLoginButton() {
  const login = async () => {
    try {
      console.log('[Phantom] click');
      const provider = window.solana;
      if (!provider || !provider.isPhantom) {
        console.warn('[Phantom] provider not found');
        alert('Install Phantom wallet (browser extension)');
        return;
      }

      console.log('[Phantom] connecting…');
      const { publicKey } = await provider.connect({ onlyIfTrusted: false });
      const pubkeyBase58 = publicKey?.toString?.();
      console.log('[Phantom] connected as', pubkeyBase58);

      const nonceRes = await fetch('/auth/phantom/nonce', {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!nonceRes.ok) throw new Error('Failed to get nonce');
      const { nonce, message } = await nonceRes.json();
      console.log('[Phantom] nonce', nonce);

      const bytes = new TextEncoder().encode(message);
      const signed = await provider.signMessage(bytes, 'utf8'); // { signature: Uint8Array }
      const sigBase58 = bs58.encode(new Uint8Array(signed.signature));
      console.log('[Phantom] signature(b58)', sigBase58.slice(0, 12) + '…');

      const verifyRes = await fetch('/auth/phantom/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
        },
        body: JSON.stringify({ publicKey: pubkeyBase58, signature: sigBase58, nonce }),
      });

      if (!verifyRes.ok) {
        const e = await verifyRes.json().catch(() => ({}));
        throw new Error(e.error || verifyRes.statusText);
      }

      console.log('[Phantom] verified, reloading…');
      window.location.reload();
    } catch (err: any) {
      console.error('[Phantom] error', err);
      alert(err?.message ?? 'Phantom login failed');
    }
  };

  return (
    <button
      type="button"
      onClick={login}
      className="relative z-50 pointer-events-auto inline-flex items-center rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring"
    >
      Connect Phantom
    </button>
  );
}
