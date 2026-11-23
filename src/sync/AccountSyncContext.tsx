import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { db } from '../db/database';

const authUrl = import.meta.env.VITE_NEON_AUTH_URL?.trim() ?? '';
const syncUrl = import.meta.env.VITE_NEON_SYNC_URL?.trim() ?? '';
type OtpAuthClient = {
  getSession: () => Promise<{ data?: { user?: { id: string; email: string; name?: string | null } | null } }>;
  token: () => Promise<{ data?: { token?: string }; error?: { message?: string } | null }>;
  signOut: () => Promise<unknown>;
  emailOtp: {
    sendVerificationOtp: (input: { email: string; type: 'sign-in' }) => Promise<{ error?: { message?: string } | null }>;
  };
  signIn: {
    emailOtp: (input: { email: string; otp: string }) => Promise<{
      data?: { user?: { id: string; email: string; name?: string | null } };
      error?: { message?: string } | null;
    }>;
  };
};
let authClientPromise: Promise<OtpAuthClient> | null = null;

function getAuthClient(): Promise<OtpAuthClient> {
  if (!authUrl) return Promise.reject(new Error('Neon Auth is not configured for this build.'));
  if (!authClientPromise) {
    authClientPromise = import('@neon/auth').then(({ createAuthClient }) => {
      // Keep Neon Auth on the app origin so browsers can persist its session
      // cookies even when third-party cookies are disabled.
      const sameOriginAuthUrl = `${window.location.origin}/api/neon-auth`;
      return createAuthClient(sameOriginAuthUrl) as unknown as OtpAuthClient;
    }
    );
  }
  return authClientPromise;
}

type User = { id: string; email: string; name?: string | null };
type AccountStep = 'loading' | 'signedOut' | 'codeSent' | 'createRecovery' | 'recoveryCreated' | 'unlockRecovery' | 'ready';
type SyncStatus = 'idle' | 'syncing' | 'upToDate' | 'offline' | 'error';

interface AccountSyncContextValue {
  configured: boolean;
  user: User | null;
  step: AccountStep;
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
  error: string | null;
  recoveryCode: string | null;
  localCounts: { documents: number; games: number; collections: number };
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  createRecoveryCode: () => Promise<void>;
  confirmRecoveryCodeSaved: () => Promise<void>;
  unlockWithCode: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  dismissError: () => void;
}

const AccountSyncContext = createContext<AccountSyncContextValue | null>(null);

function getToken(): Promise<string> {
  return (async () => {
    const result = await (await getAuthClient()).token();
    if (result.error || !result.data?.token) {
      throw new Error(result.error?.message || 'Could not get a secure sign-in token.');
    }
    return result.data.token;
  })();
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export function AccountSyncProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState<AccountStep>(authUrl ? 'loading' : 'signedOut');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<CryptoKey | null>(null);
  const [localCounts, setLocalCounts] = useState({ documents: 0, games: 0, collections: 0 });
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  const syncNow = useCallback(async () => {
    if (!user || !recoveryKey || !syncUrl || busyRef.current) return;
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    busyRef.current = true;
    setSyncStatus('syncing');
    setError(null);
    try {
      const token = await getToken();
      const { syncWorkspace } = await import('./service');
      await syncWorkspace(syncUrl, token, recoveryKey);
      if (mountedRef.current) {
        setSyncStatus('upToDate');
        setLastSyncAt(Date.now());
      }
    } catch (syncError) {
      if (mountedRef.current) {
        setSyncStatus('error');
        setError(errorMessage(syncError));
      }
    } finally {
      busyRef.current = false;
    }
  }, [user, recoveryKey]);

  const continueAfterSignIn = useCallback(async (signedInUser: User) => {
    setUser(signedInUser);
    setError(null);
    const { checkRemoteArchive, getLocalArchiveCounts } = await import('./service');
    const [savedKey, counts] = await Promise.all([
      db.syncKeys.get(signedInUser.id),
      getLocalArchiveCounts(),
    ]);
    setLocalCounts(counts);
    if (savedKey) {
      setRecoveryKey(savedKey.key);
      setRecoveryCode(null);
      setStep('ready');
      return;
    }
    if (!syncUrl) throw new Error('Cloud sync is not configured for this build yet.');
    const token = await getToken();
    setStep(await checkRemoteArchive(syncUrl, token) ? 'unlockRecovery' : 'createRecovery');
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!authUrl) return () => { mountedRef.current = false; };
    void getAuthClient().then((client) => client.getSession()).then(async (result) => {
      const sessionUser = result.data?.user;
      if (sessionUser?.id && sessionUser.email) {
        await continueAfterSignIn({ id: sessionUser.id, email: sessionUser.email, name: sessionUser.name });
      } else {
        setStep('signedOut');
      }
    }).catch((sessionError: unknown) => {
      setError(errorMessage(sessionError));
      setStep('signedOut');
    });
    return () => { mountedRef.current = false; };
  }, [continueAfterSignIn]);

  useEffect(() => {
    if (step !== 'ready' || !user || !recoveryKey) return;
    void syncNow();
    const interval = window.setInterval(() => void syncNow(), 15_000);
    const onOnline = () => void syncNow();
    const onFocus = () => void syncNow();
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
    };
  }, [step, user, recoveryKey, syncNow]);

  useEffect(() => {
    if (step !== 'ready' || !user || !recoveryKey) return;
    const interval = window.setInterval(async () => {
      const { getLocalArchiveCounts } = await import('./service');
      const counts = await getLocalArchiveCounts();
      setLocalCounts(counts);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [step, user, recoveryKey, syncNow]);

  const sendCode = useCallback(async (email: string) => {
    if (!authUrl) throw new Error('Neon Auth is not configured for this build.');
    setError(null);
    const result = await (await getAuthClient()).emailOtp.sendVerificationOtp({ email: email.trim(), type: 'sign-in' });
    if (result.error) throw new Error(result.error.message || 'Could not send a sign-in code.');
    setStep('codeSent');
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    if (!authUrl) throw new Error('Neon Auth is not configured for this build.');
    setError(null);
    const result = await (await getAuthClient()).signIn.emailOtp({ email: email.trim(), otp: code.trim() });
    if (result.error || !result.data?.user) {
      throw new Error(result.error?.message || 'The sign-in code was not accepted.');
    }
    await continueAfterSignIn({
      id: result.data.user.id,
      email: result.data.user.email,
      name: result.data.user.name,
    });
  }, [continueAfterSignIn]);

  const createRecoveryCode = useCallback(async () => {
    setError(null);
    try {
      const { createRecoveryKey } = await import('./crypto');
      const generated = await createRecoveryKey();
      setRecoveryKey(generated.key);
      setRecoveryCode(generated.code);
      setStep('recoveryCreated');
    } catch (createError) {
      setError(errorMessage(createError));
    }
  }, []);

  const confirmRecoveryCodeSaved = useCallback(async () => {
    if (!user || !recoveryKey || !recoveryCode || !syncUrl) return;
    setError(null);
    try {
      const token = await getToken();
      const { registerRecoveryKey } = await import('./service');
      await registerRecoveryKey(syncUrl, token, recoveryKey);
      await db.syncKeys.put({ id: user.id, key: recoveryKey, createdAt: Date.now() });
      setRecoveryCode(null);
      setStep('ready');
      window.setTimeout(() => void syncNow(), 0);
    } catch (saveError) {
      setError(errorMessage(saveError));
    }
  }, [user, recoveryKey, recoveryCode, syncNow]);

  const unlockWithCode = useCallback(async (code: string) => {
    if (!user || !syncUrl) return;
    setError(null);
    try {
      const [{ importRecoveryKey }, { verifyRecoveryKey }] = await Promise.all([
        import('./crypto'),
        import('./service'),
      ]);
      const key = await importRecoveryKey(code);
      const token = await getToken();
      if (!await verifyRecoveryKey(syncUrl, token, key)) {
        throw new Error('That recovery code does not unlock this LOREKEEP archive. Check it and try again.');
      }
      await db.syncKeys.put({ id: user.id, key, createdAt: Date.now() });
      setRecoveryKey(key);
      setStep('ready');
    } catch (unlockError) {
      setError(errorMessage(unlockError));
    }
  }, [user]);

  const signOut = useCallback(async () => {
    if (authUrl) await (await getAuthClient()).signOut();
    setUser(null);
    setRecoveryKey(null);
    setRecoveryCode(null);
    setError(null);
    setSyncStatus('idle');
    setStep('signedOut');
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  const value = useMemo<AccountSyncContextValue>(() => ({
    configured: Boolean(authUrl && syncUrl),
    user,
    step,
    syncStatus,
    lastSyncAt,
    error,
    recoveryCode,
    localCounts,
    sendCode,
    verifyCode,
    createRecoveryCode,
    confirmRecoveryCodeSaved,
    unlockWithCode,
    signOut,
    syncNow,
    dismissError,
  }), [user, step, syncStatus, lastSyncAt, error, recoveryCode, localCounts, sendCode, verifyCode, createRecoveryCode, confirmRecoveryCodeSaved, unlockWithCode, signOut, syncNow, dismissError]);

  return <AccountSyncContext.Provider value={value}>{children}</AccountSyncContext.Provider>;
}

export function useAccountSync(): AccountSyncContextValue {
  const context = useContext(AccountSyncContext);
  if (!context) throw new Error('useAccountSync must be used inside AccountSyncProvider.');
  return context;
}
