'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '/';

  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha, rememberMe }),
      });

      if (!res.ok) {
        setError('Login ou senha incorretos');
        setLoading(false);
        return;
      }

      router.push(from);
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Montserrat:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #FBF7F0;
          font-family: 'Montserrat', sans-serif;
        }

        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #FBF7F0 0%, #F5EDD8 100%);
          padding: 1rem;
        }

        .login-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 8px 48px rgba(184, 146, 75, 0.12);
          padding: 3rem 2.5rem;
          width: 100%;
          max-width: 400px;
          border: 1px solid rgba(184, 146, 75, 0.15);
        }

        .logo-area {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .logo-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #B8924B, #D4A96A);
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          box-shadow: 0 4px 16px rgba(184, 146, 75, 0.3);
        }

        .logo-icon svg {
          width: 32px;
          height: 32px;
          fill: white;
        }

        .logo-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2rem;
          font-weight: 500;
          color: #2D2D2D;
          letter-spacing: 0.08em;
        }

        .logo-subtitle {
          font-size: 0.7rem;
          color: #B8924B;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-top: 0.25rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        label {
          display: block;
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 0.5rem;
        }

        input[type="text"],
        input[type="password"] {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #E8DCC8;
          border-radius: 8px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.9rem;
          color: #2D2D2D;
          background: #FDFAF5;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }

        input[type="text"]:focus,
        input[type="password"]:focus {
          border-color: #B8924B;
          box-shadow: 0 0 0 3px rgba(184, 146, 75, 0.1);
          background: #fff;
        }

        .remember-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.75rem;
          cursor: pointer;
          user-select: none;
        }

        .remember-row input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #B8924B;
          cursor: pointer;
        }

        .remember-label {
          font-size: 0.78rem;
          color: #666;
          letter-spacing: 0;
          text-transform: none;
          font-weight: 400;
          margin: 0;
          cursor: pointer;
        }

        .btn-login {
          width: 100%;
          padding: 0.85rem;
          background: linear-gradient(135deg, #B8924B, #D4A96A);
          color: white;
          border: none;
          border-radius: 8px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          box-shadow: 0 4px 16px rgba(184, 146, 75, 0.35);
        }

        .btn-login:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .btn-login:active {
          transform: translateY(0);
        }

        .btn-login:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-msg {
          background: #FFF0F0;
          border: 1px solid #FFCDD2;
          color: #C62828;
          border-radius: 8px;
          padding: 0.65rem 1rem;
          font-size: 0.8rem;
          margin-bottom: 1.25rem;
          text-align: center;
        }
      `}</style>

      <div className="login-wrapper">
        <div className="login-card">
          <div className="logo-area">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
              </svg>
            </div>
            <div className="logo-title">Miva</div>
            <div className="logo-subtitle">Gestao de Joias</div>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label htmlFor="login">Login</label>
              <input
                id="login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="senha">Senha</label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <label className="remember-row" htmlFor="rememberMe">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="remember-label">Lembrar senha por 30 dias</span>
            </label>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
