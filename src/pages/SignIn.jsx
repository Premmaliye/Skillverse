import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Zap, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function SignIn() {
  const [loginId, setLoginId]     = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginId || !password) { setError('Please enter your email and password.'); return; }
    if (!loginId.includes('@')) { setError('Please enter a valid email address.'); return; }
    setIsLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: loginId, password });
    setIsLoading(false);
    if (signInError) { setError(signInError.message || 'Login failed. Please check your credentials.'); return; }
    navigate('/home');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', flexDirection: 'column' }}>

      {/* Top nav */}
      <nav style={{ borderBottom: '1px solid #e4e0f0', background: 'rgba(250,250,250,0.85)', backdropFilter: 'blur(20px)', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={15} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f0a1a', letterSpacing: '-0.03em' }}>
            Skill<span className="gradient-text">Verse</span>
          </span>
        </Link>
      </nav>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Card */}
          <div className="card animate-fade-in" style={{ padding: '40px 36px', borderRadius: 20 }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ display: 'inline-flex', width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}>
                <Zap size={24} color="#fff" fill="#fff" />
              </div>
              <h1 style={{ fontWeight: 800, fontSize: '1.7rem', color: '#0f0a1a', letterSpacing: '-0.04em', margin: '0 0 6px' }}>Welcome back</h1>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Sign in to continue your journey</p>
            </div>

            {/* Error */}
            {error && <div className="alert-error animate-fade-in" style={{ marginBottom: 20 }}>{error}</div>}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: 7, letterSpacing: '-0.01em' }}>Email address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#a08ec0', pointerEvents: 'none' }} />
                  <input
                    type="email"
                    value={loginId}
                    onChange={e => setLoginId(e.target.value)}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    className="input input-icon-left"
                    style={{ paddingLeft: 42 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: 7, letterSpacing: '-0.01em' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#a08ec0', pointerEvents: 'none' }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="input input-icon-left"
                    style={{ paddingLeft: 42, paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a08ec0', display: 'flex', padding: 4 }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', marginTop: 4, padding: '13px', fontSize: '0.95rem' }}>
                {isLoading ? 'Signing in…' : 'Sign In'} {!isLoading && <ArrowRight size={17} />}
              </button>
            </form>

            {/* Divider */}
            <div className="divider" style={{ margin: '24px 0' }} />

            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>Create one →</Link>
            </p>
          </div>

          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.78rem', marginTop: 20 }}>
            Use the email and password you registered with.
          </p>
        </div>
      </div>
    </div>
  );
}
