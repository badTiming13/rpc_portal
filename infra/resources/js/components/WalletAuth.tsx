'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePage, router } from '@inertiajs/react';
import bs58 from 'bs58';

type PageProps = {
  auth?: { user?: { id: number; name: string; wallet: string } | null };
};

const short = (a?: string) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '');

export default function WalletAuth() {
  const { 
    connected, 
    publicKey, 
    signMessage, 
    disconnect, 
    select, 
    connect, 
    wallet,
    wallets,
    connecting 
  } = useWallet();
  
  const { props } = usePage<PageProps>();
  const isAuthed = !!props.auth?.user;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'select' | 'connect' | null>(null);

  // Логирование состояния
  useEffect(() => {
    console.log('=== Wallet State ===', {
      connected,
      connecting,
      wallet: wallet?.adapter?.name,
      wallets: wallets.map(w => w.adapter.name),
      publicKey: publicKey?.toBase58(),
      busy,
      pendingAction,
      isAuthed
    });
  }, [connected, connecting, wallet, wallets, publicKey, busy, pendingAction, isAuthed]);

  // Находим Phantom wallet
  const phantomWallet = useMemo(
    () => wallets.find((w) => 
      w.adapter.name === 'Phantom' || 
      w.adapter.name.includes('Phantom')
    ),
    [wallets]
  );

  const login = useCallback(async () => {
    console.log('🔐 Starting login...');
    if (!connected || !publicKey || !signMessage) {
      console.error('❌ Login failed - missing requirements:', { connected, publicKey: !!publicKey, signMessage: !!signMessage });
      throw new Error('Wallet not connected or signMessage unavailable');
    }

    try {
      // 1) nonce + message
      const nonceResp = await fetch('/wallet/nonce', {
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      const { nonce, message } = await nonceResp.json();
      console.log('📝 Got nonce:', nonce);

      // 2) подпись
      const sig = await signMessage(new TextEncoder().encode(message));
      const signatureB58 = bs58.encode(sig);
      console.log('✍️ Signed message');

      // 3) verify
      const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
      const resp = await fetch('/wallet/verify', {
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

      if (!resp.ok) throw new Error((await resp.text().catch(() => '')) || 'Login failed');
      
      console.log('✅ Login successful');
      await router.reload({ only: ['auth'] });
    } catch (e: any) {
      console.error('❌ Login error:', e);
      throw e;
    }
  }, [connected, publicKey, signMessage]);

  // Эффект для обработки выбора wallet и подключения
  useEffect(() => {
    const handlePendingAction = async () => {
      console.log('🔄 useEffect pendingAction:', pendingAction, 'wallet:', wallet?.adapter?.name);
      
      // Если ждем выбор wallet и он появился
      if (pendingAction === 'select' && wallet && wallet.adapter && wallet.adapter.name.includes('Phantom')) {
        console.log('👻 Phantom selected, attempting connection...');
        
        // Небольшая задержка после select для стабильности
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setPendingAction('connect');
        
        try {
          console.log('🔌 Calling connect() from hook...');
          await connect();
          console.log('✅ Connected successfully, connected state:', connected);
          setPendingAction(null);
        } catch (e: any) {
          console.error('❌ Connection error:', e);
          console.error('Error name:', e?.name);
          console.error('Error message:', e?.message);
          
          // Если ошибка WalletNotSelectedError, пробуем еще раз
          if (e?.name === 'WalletNotSelectedError') {
            console.log('🔄 Retrying with select + connect...');
            try {
              // Повторяем select
              select(wallet.adapter.name);
              await new Promise(resolve => setTimeout(resolve, 200));
              await connect();
              console.log('✅ Retry successful');
              setPendingAction(null);
            } catch (retryError: any) {
              console.error('❌ Retry failed:', retryError);
              setErr(retryError?.message || String(retryError));
              setPendingAction(null);
              setBusy(false);
            }
          } else if (!e?.message?.includes('User rejected')) {
            setErr(e?.message || String(e));
            setPendingAction(null);
            setBusy(false);
          } else {
            setPendingAction(null);
            setBusy(false);
          }
        }
      }
    };

    handlePendingAction();
  }, [wallet, pendingAction, connect, connected, select]);

  // Автоматический логин после подключения
  useEffect(() => {
    const autoLogin = async () => {
      console.log('🔄 Auto-login check:', {
        connected,
        hasPublicKey: !!publicKey,
        hasSignMessage: !!signMessage,
        isAuthed,
        busy,
        connecting
      });

      if (connected && publicKey && signMessage && !isAuthed && busy && !connecting) {
        console.log('🚀 Starting auto-login...');
        try {
          await login();
        } catch (e: any) {
          console.error('❌ Auto-login error:', e);
          if (!e?.message?.includes('User rejected')) {
            setErr(e?.message || String(e));
          }
        } finally {
          setBusy(false);
        }
      }
    };

    autoLogin();
  }, [connected, publicKey, signMessage, isAuthed, busy, connecting, login]);

  const handleConnect = useCallback(async () => {
    console.log('🖱️ Connect button clicked');
    setErr(null);

    // Если уже подключен и авторизован
    if (connected && isAuthed) {
      console.log('✅ Already connected and authenticated');
      return;
    }

    setBusy(true);

    try {
      // Если уже подключен, но не авторизован - сразу логинимся
      if (connected && !isAuthed && publicKey && signMessage) {
        console.log('🔐 Already connected, logging in...');
        await login();
        setBusy(false);
        return;
      }

      // Если не подключен
      if (!connected) {
        console.log('🔍 Not connected, checking for Phantom...');
        
        // Проверяем наличие Phantom
        if (!phantomWallet) {
          console.error('❌ Phantom wallet not found');
          setBusy(false);
          setErr('Phantom wallet not found. Please install Phantom extension.');
          return;
        }

        console.log('✅ Phantom found:', phantomWallet.adapter.name);

        // ВАЖНО: Проверяем что wallet действительно определен и выбран
        // После logout wallet становится undefined, даже если Phantom в списке
        if (wallet && wallet.adapter && wallet.adapter.name.includes('Phantom')) {
          console.log('📱 Wallet already selected, connecting with hook connect()...');
          try {
            // Используем connect() из хука, а не wallet.adapter.connect()
            await connect();
            console.log('✅ Direct connection successful');
          } catch (e: any) {
            console.error('❌ Direct connection failed:', e);
            if (!e?.message?.includes('User rejected')) {
              setErr(e?.message || String(e));
            }
            setBusy(false);
          }
        } else {
          // Wallet не выбран или undefined - нужно выбрать
          console.log('🎯 Wallet is undefined or not selected, selecting Phantom...');
          console.log('Current wallet state:', wallet);
          select(phantomWallet.adapter.name);
          setPendingAction('select');
          console.log('⏳ Waiting for wallet selection to complete...');
          // Подключение произойдет через useEffect
        }
      }
    } catch (e: any) {
      console.error('❌ HandleConnect error:', e);
      if (!e?.message?.includes('User rejected')) {
        setErr(e?.message || String(e));
      }
      setBusy(false);
    }
  }, [connected, isAuthed, publicKey, signMessage, wallet, phantomWallet, select, login]);

  const logout = useCallback(async () => {
    console.log('🚪 Logging out...');
    setErr(null);
    setBusy(true);
    setPendingAction(null);
    
    try {
      const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
      await fetch('/logout', {
        method: 'POST',
        headers: { 
          'X-CSRF-TOKEN': token ?? '', 
          'X-Requested-With': 'XMLHttpRequest' 
        },
        credentials: 'same-origin',
      });
      
      // Отключаем кошелек
      try { 
        await disconnect(); 
      } catch {}
      
      console.log('🔄 Reloading page...');
      // Перезагружаем страницу
      window.location.href = window.location.href;
    } catch (e: any) {
      console.error('❌ Logout error:', e);
      setErr(e?.message || String(e));
      setBusy(false);
    }
  }, [disconnect]);

  const buttonLabel = useMemo(() => {
    if (connecting || busy || pendingAction) return 'Connecting…';
    if (!connected) return 'Connect Phantom';
    if (connected && !isAuthed) return 'Sign in';
    return 'Connected';
  }, [connected, isAuthed, busy, connecting, pendingAction]);

  const isPhantomAvailable = useMemo(() => !!phantomWallet, [phantomWallet]);

  return (
    <div className="flex flex-col gap-3">
      {!isAuthed ? (
        <>
          <button
            onClick={handleConnect}
            disabled={busy || connecting || pendingAction !== null || (connected && isAuthed) || !isPhantomAvailable}
            className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
          >
            {!isPhantomAvailable ? 'Phantom not installed' : buttonLabel}
          </button>
          
          {!isPhantomAvailable && (
            <p className="text-xs text-yellow-500">
              Please install{' '}
              <a 
                href="https://phantom.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-yellow-400"
              >
                Phantom wallet extension
              </a>
            </p>
          )}
        </>
      ) : (
        <div className="flex justify-between items-center gap-3">
          <p className="text-sm text-gray-400">
            {publicKey ? ` ${short(publicKey.toBase58())}` : ''}
          </p>
          <button
            onClick={logout}
            disabled={busy}
            className="px-3 py-1.5 rounded border border-gray-600 text-gray-200 hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      )}

      {err && <div className="text-xs text-red-500">{err}</div>}
      
    </div>
  );
}