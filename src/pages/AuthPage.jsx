import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function AuthPage() {
  const [hovered, setHovered] = useState(null); // 'login' | 'register' | null
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [regData, setRegData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, regData.email, regData.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginActive = hovered === 'login';
  const registerActive = hovered === 'register';

  return (
    <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center p-4 font-sans">
      <div
        className="w-full max-w-4xl flex rounded-3xl overflow-hidden shadow-2xl border border-white/10"
        style={{ minHeight: 560 }}
      >
        {/* LOGIN SIDE */}
        <div
          className="flex-1 flex flex-col justify-center px-10 py-12 cursor-default transition-all duration-500"
          style={{
            background: loginActive
              ? '#ffffff'
              : registerActive
              ? 'linear-gradient(135deg, #3b0764 0%, #4c1d95 100%)'
              : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: loginActive ? '#0a0d14' : '#fff',
            transition: 'background 0.45s ease, color 0.35s ease',
          }}
          onMouseEnter={() => setHovered('login')}
          onMouseLeave={() => setHovered(null)}
        >
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-2"
            style={{ color: loginActive ? '#7c3aed' : '#a78bfa' }}
          >
            Welcome back
          </p>
          <h2 className="text-3xl font-bold mb-8 leading-tight">Sign In</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              required
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none border transition-all duration-300"
              style={{
                background: loginActive ? '#f3f0ff' : 'rgba(255,255,255,0.08)',
                borderColor: loginActive ? '#c4b5fd' : 'rgba(255,255,255,0.12)',
                color: loginActive ? '#1e1b4b' : '#fff',
              }}
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none border transition-all duration-300"
              style={{
                background: loginActive ? '#f3f0ff' : 'rgba(255,255,255,0.08)',
                borderColor: loginActive ? '#c4b5fd' : 'rgba(255,255,255,0.12)',
                color: loginActive ? '#1e1b4b' : '#fff',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 mt-1"
              style={{
                background: loginActive ? '#7c3aed' : '#a78bfa',
                color: '#fff',
              }}
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>
        </div>

        {/* DIVIDER */}
        <div
          className="flex items-center justify-center w-px"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        />

        {/* REGISTER SIDE */}
        <div
          className="flex-1 flex flex-col justify-center px-10 py-12 cursor-default"
          style={{
            background: registerActive
              ? '#ffffff'
              : loginActive
              ? 'linear-gradient(135deg, #3b0764 0%, #4c1d95 100%)'
              : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: registerActive ? '#0a0d14' : '#fff',
            transition: 'background 0.45s ease, color 0.35s ease',
          }}
          onMouseEnter={() => setHovered('register')}
          onMouseLeave={() => setHovered(null)}
        >
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-2"
            style={{ color: registerActive ? '#7c3aed' : '#a78bfa' }}
          >
            New here?
          </p>
          <h2 className="text-3xl font-bold mb-8 leading-tight">Register</h2>
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              required
              value={regData.email}
              onChange={(e) => setRegData({ ...regData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none border transition-all duration-300"
              style={{
                background: registerActive ? '#f3f0ff' : 'rgba(255,255,255,0.08)',
                borderColor: registerActive ? '#c4b5fd' : 'rgba(255,255,255,0.12)',
                color: registerActive ? '#1e1b4b' : '#fff',
              }}
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={regData.password}
              onChange={(e) => setRegData({ ...regData, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none border transition-all duration-300"
              style={{
                background: registerActive ? '#f3f0ff' : 'rgba(255,255,255,0.08)',
                borderColor: registerActive ? '#c4b5fd' : 'rgba(255,255,255,0.12)',
                color: registerActive ? '#1e1b4b' : '#fff',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 mt-1"
              style={{
                background: registerActive ? '#7c3aed' : '#a78bfa',
                color: '#fff',
              }}
            >
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <p className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-900/80 text-red-200 text-sm px-5 py-3 rounded-xl border border-red-500/30">
          {error}
        </p>
      )}
    </div>
  );
}
