import { useState } from 'react';
import { Check, Clipboard, Cloud, CloudOff, LoaderCircle, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAccountSync } from '../sync/AccountSyncContext';

export function AccountSyncPanel() {
  const account = useAccountSync();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [savedCode, setSavedCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError ?? account.error;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setLocalError(null);
    try {
      await action();
    } catch (actionError) {
      setLocalError(actionError instanceof Error ? actionError.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const copyRecoveryCode = async () => {
    if (!account.recoveryCode) return;
    try {
      await navigator.clipboard.writeText(account.recoveryCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setLocalError('Clipboard access is unavailable. Select and copy the code manually.');
    }
  };

  const isSyncing = account.syncStatus === 'syncing' || busy;
  const statusText = account.syncStatus === 'syncing'
    ? 'Syncing your encrypted archive…'
    : account.syncStatus === 'offline'
      ? 'Offline · changes will sync when you reconnect.'
      : account.syncStatus === 'error'
        ? 'Sync needs attention.'
        : account.lastSyncAt
          ? `Last synced ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(account.lastSyncAt)}`
          : 'Ready to sync this device.';

  return (
    <section className="lk-account-sync" aria-labelledby="lk-account-sync-title">
      <div className="lk-account-sync-head">
        <span className="lk-account-sync-icon" aria-hidden="true">
          <ShieldCheck size={17} strokeWidth={1.9} />
        </span>
        <div className="lk-account-sync-title-wrap">
          <h3 id="lk-account-sync-title">Account &amp; sync</h3>
          <p>Use your archive on more than one device. Notes are encrypted before leaving this browser.</p>
        </div>
        <span className={`lk-account-sync-status ${account.step === 'ready' ? 'is-ready' : ''}`}>
          {account.step === 'ready' ? <Cloud size={13} /> : <CloudOff size={13} />}
          {account.step === 'ready' ? 'Connected' : account.user ? 'Setup' : 'Optional'}
        </span>
      </div>

      {!account.configured && (
        <p className="lk-account-sync-copy">
          Cloud sync is not configured for this build. Your local archive is available as usual.
        </p>
      )}

      {account.configured && account.step === 'loading' && (
        <div className="lk-account-sync-feedback"><LoaderCircle size={15} className="lk-account-spinner" /> Checking account…</div>
      )}

      {account.configured && account.step === 'signedOut' && (
        <form className="lk-account-auth-form" onSubmit={(event) => {
          event.preventDefault();
          void run(() => account.sendCode(email));
        }}>
          <label className="lk-label" htmlFor="lk-account-email">Email address</label>
          <div className="lk-account-auth-controls">
            <input
              id="lk-account-email"
              className="lk-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
            <button className="lk-btn-primary" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send sign-in code'}
            </button>
          </div>
          <p className="lk-account-sync-copy">A one-time code creates your account the first time, then signs you in on later visits.</p>
        </form>
      )}

      {account.configured && account.step === 'codeSent' && (
        <form className="lk-account-auth-form" onSubmit={(event) => {
          event.preventDefault();
          void run(() => account.verifyCode(email, code));
        }}>
          <label className="lk-label" htmlFor="lk-account-code">Code sent to {email}</label>
          <div className="lk-account-auth-controls">
            <input
              id="lk-account-code"
              className="lk-input lk-account-code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/gu, '').slice(0, 8))}
              placeholder="Enter the code"
            />
            <button className="lk-btn-primary" type="submit" disabled={busy || code.length < 4}>
              {busy ? 'Checking…' : 'Verify code'}
            </button>
          </div>
          <button type="button" className="lk-btn-ghost lk-account-back" onClick={() => {
            setCode('');
            setLocalError(null);
            void run(() => account.sendCode(email));
          }} disabled={busy}>Send a new code</button>
        </form>
      )}

      {account.configured && account.step === 'createRecovery' && (
        <div className="lk-account-key-step">
          <p className="lk-account-sync-copy">
            {account.localCounts.documents || account.localCounts.games || account.localCounts.collections
              ? `This device has ${account.localCounts.documents} notes, ${account.localCounts.games} games, and ${account.localCounts.collections} collections. They will be merged into your new encrypted archive; the local copy stays here.`
              : 'Create a private recovery code before enabling encrypted sync.'}
          </p>
          <button type="button" className="lk-btn-primary" onClick={() => void account.createRecoveryCode()} disabled={busy}>
            Create recovery code
          </button>
        </div>
      )}

      {account.configured && account.step === 'recoveryCreated' && account.recoveryCode && (
        <div className="lk-account-key-step">
          <div className="lk-account-key-warning">
            <strong>Save this code before continuing.</strong>
            <span>It is never sent to Neon. You will need it to unlock this archive on another device; it cannot be reset.</span>
          </div>
          <code className="lk-account-recovery-code" aria-label="64-character alphanumeric recovery code">{account.recoveryCode}</code>
          <button type="button" className="lk-btn-secondary lk-account-copy" onClick={() => void copyRecoveryCode()}>
            {copied ? <Check size={15} /> : <Clipboard size={15} />}
            {copied ? 'Copied' : 'Copy recovery code'}
          </button>
          <label className="lk-account-acknowledge">
            <input type="checkbox" checked={savedCode} onChange={(event) => setSavedCode(event.target.checked)} />
            <span>I have saved this code somewhere safe.</span>
          </label>
          <button type="button" className="lk-btn-primary" disabled={!savedCode || busy} onClick={() => void run(account.confirmRecoveryCodeSaved)}>
            {account.localCounts.documents || account.localCounts.games || account.localCounts.collections
              ? 'Save code and sync this archive'
              : 'Save code and enable sync'}
          </button>
        </div>
      )}

      {account.configured && account.step === 'unlockRecovery' && (
        <form className="lk-account-key-step" onSubmit={(event) => {
          event.preventDefault();
          void run(() => account.unlockWithCode(codeInput));
        }}>
          <p className="lk-account-sync-copy">This account already has an encrypted archive. Enter its recovery code to unlock it on this device.</p>
          <label className="lk-label" htmlFor="lk-recovery-code">Recovery code</label>
          <textarea
            id="lk-recovery-code"
            className="lk-textarea lk-account-recovery-input"
            autoComplete="off"
            spellCheck={false}
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value.replace(/[^a-z0-9\s]/giu, '').slice(0, 256))}
            placeholder="Paste the 64-character code"
            required
          />
          <p className="lk-account-sync-copy">Previously created 24-word recovery phrases are still accepted.</p>
          <button type="submit" className="lk-btn-primary" disabled={busy || !(/^[a-f0-9]{64}$/iu.test(codeInput.trim().replace(/\s+/gu, '')) || codeInput.trim().split(/\s+/u).length === 24)}>
            {busy ? 'Unlocking…' : 'Unlock and sync'}
          </button>
        </form>
      )}

      {account.configured && account.step === 'ready' && account.user && (
        <div className="lk-account-connected">
          <div className="lk-account-user-line">
            <span className="lk-account-email">{account.user.email}</span>
            <button type="button" className="lk-btn-ghost lk-account-signout" onClick={() => void run(account.signOut)} disabled={busy}>
              <LogOut size={14} /> Sign out
            </button>
          </div>
          <div className={`lk-account-sync-feedback ${account.syncStatus === 'error' ? 'has-error' : ''}`}>
            {isSyncing ? <LoaderCircle size={14} className="lk-account-spinner" /> : <Cloud size={14} />}
            <span>{statusText}</span>
            <button type="button" className="lk-icon-btn lk-account-sync-now" onClick={() => void account.syncNow()} aria-label="Sync now" title="Sync now" disabled={isSyncing}>
              <RefreshCw size={14} />
            </button>
          </div>
          <p className="lk-account-sync-copy">Cloud copies contain ciphertext. This browser keeps working offline and syncs again when it reconnects.</p>
        </div>
      )}

      {error && (
        <div className="lk-account-error" role="alert">
          <span>{error}</span>
          <button type="button" className="lk-btn-ghost" onClick={() => {
            setLocalError(null);
            account.dismissError();
          }}>Dismiss</button>
        </div>
      )}
    </section>
  );
}
