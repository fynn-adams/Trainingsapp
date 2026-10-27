import { useState } from 'react';
import { supabase } from '../data/supabaseStore';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError('Anmeldung fehlgeschlagen – E-Mail oder Passwort prüfen.');
    setBusy(false);
  };

  return (
    <div className="login">
      <header className="hero">
        <div className="container hero-inner">
          <div>
            <div className="hero-kicker">Fynn &amp; Louisa · Generali Köln</div>
            <h1>Halbmarathon 2027</h1>
          </div>
        </div>
      </header>
      <main className="container">
        <form onSubmit={submit} className="card">
          <h2 style={{ fontSize: 24 }}>Anmelden</h2>
          <label className="field">
            E-Mail
            <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            Passwort
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div className="banner">{error}</div>}
          <button className="btn block" disabled={busy}>
            {busy ? 'Moment …' : 'Los geht’s'}
          </button>
        </form>
      </main>
    </div>
  );
}
