// resources/js/solana/useWalletLogin.ts
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { router } from '@inertiajs/react';

export function useWalletLogin() {
  const { publicKey, signMessage } = useWallet();

  const login = async () => {
    if (!publicKey || !signMessage) throw new Error('Wallet not ready');

    // 1) берём nonce и message
    const nonceResp = await fetch('/wallet/nonce', {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    const { nonce, message } = await nonceResp.json();

    // 2) подписываем точный UTF-8-текст
    const encoded = new TextEncoder().encode(message);
    const sig = await signMessage(encoded);
    const signatureB58 = bs58.encode(sig);

    // 3) шлём verify c CSRF
    const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
    const verifyResp = await fetch('/wallet/verify', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': token ?? '',
      },
      body: JSON.stringify({
        address: publicKey.toBase58(),
        signature: signatureB58,
        nonce,
      }),
    });

    if (!verifyResp.ok) {
      const text = await verifyResp.text().catch(() => '');
      throw new Error(text || 'Login failed');
    }

    // 🔁 подтянуть только props.auth без полного перезагруза
    await router.reload({ only: ['auth'] });
    return true;
  };

  return { login };
}
