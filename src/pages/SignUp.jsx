import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, User, Lock, ArrowRight, Check, Zap, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const perks = [
  'Free to join and start showcasing',
  'Access to thousands of opportunities',
  'Connect with clients worldwide',
];

export default function SignUp() {
  const [formData, setFormData] = useState({ name: '', email: '', otp: '', password: '', confirmPassword: '' });
  const [error, setError]           = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [otpSent, setOtpSent]       = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [showPw, setShowPw]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const sendOtp = async () => {
    const { error: otpError } = await supabase.auth.signInWithOtp({ email: formData.email, options: { shouldCreateUser: true, data: { full_name: formData.name } } });
    if (otpError) { setError(otpError.message || 'Failed to send OTP.'); return false; }
    setOtpSent(true);
    setSuccessMessage('OTP sent! Check your email for the 8-digit code.');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMessage('');

    if (!otpSent) {
      if (!formData.name || !formData.email) { setError('Please fill in all fields.'); return; }
      if (formData.name.length < 2) { setError('Name must be at least 2 characters.'); return; }
      if (!formData.email.includes('@')) { setError('Please enter a valid email.'); return; }
      if (!agreeTerms) { setError('Please agree to the Terms of Service.'); return; }
      setIsLoading(true); await sendOtp(); setIsLoading(false); return;
    }

    if (!otpVerified) {
      if (!formData.otp || formData.otp.length !== 8) { setError('Enter the 8-digit OTP sent to your email.'); return; }
      setIsLoading(true);
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: formData.email, token: formData.otp, type: 'email' });
      setIsLoading(false);
      if (verifyError) { setError(verifyError.message || 'Invalid OTP. Please try again.'); return; }
      setOtpVerified(true);
      setFormData(p => ({ ...p, otp: '' }));
      setSuccessMessage('✓ Email verified! Now create your password.');
      return;
    }

    if (!formData.password || !formData.confirmPassword) { setError('Please set and confirm your password.'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match.'); return; }
    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: formData.password, data: { full_name: formData.name } });
    setIsLoading(false);
    if (updateError) { setError(updateError.message || 'Failed to set password.'); return; }
    navigate('/onboarding');
  };

  /* Step indicator */
  const step = !otpSent ? 1 : !otpVerified ? 2 : 3;
  const stepLabels = ['Your Info', 'Verify Email', 'Set Password'];

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

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 460 }}>
          <div className="card animate-fade-in" style={{ padding: '40px 36px', borderRadius: 20 }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h1 style={{ fontWeight: 800, fontSize: '1.7rem', color: '#0f0a1a', letterSpacing: '-0.04em', margin: '0 0 6px' }}>Create your account</h1>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Join SkillVerse and start earning</p>
            </div>

            {/* Step progress */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 28, alignItems: 'center' }}>
              {stepLabels.map((label, i) => {
                const done = i + 1 < step;
                const active = i + 1 === step;
                return (
                  <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: 4, borderRadius: 99, background: done || active ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : '#e4e0f0', marginBottom: 6, transition: 'background 0.3s' }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: done || active ? 600 : 400, color: done ? '#7c3aed' : active ? '#7c3aed' : '#9ca3af' }}>
                      {done ? '✓ ' : ''}{label}
                    </span>
                  </div>
                );
              })}
            </div>

            {error && <div className="alert-error animate-fade-in" style={{ marginBottom: 18 }}>{error}</div>}
            {successMessage && <div className="alert-success animate-fade-in" style={{ marginBottom: 18 }}>{successMessage}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Step 1 */}
              {!otpSent && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: 7 }}>Full Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#a08ec0', pointerEvents: 'none' }} />
                      <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Your full name" disabled={isLoading} className="input input-icon-left" style={{ paddingLeft: 42 }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: 7 }}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#a08ec0', pointerEvents: 'none' }} />
                      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" disabled={isLoading} className="input input-icon-left" style={{ paddingLeft: 42 }} />
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <div onClick={() => setAgreeTerms(v => !v)} style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${agreeTerms ? '#7c3aed' : '#d1c9e8'}`, background: agreeTerms ? '#7c3aed' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0, cursor: 'pointer', transition: 'all 0.18s' }}>
                      {agreeTerms && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: '0.83rem', color: '#6b7280', lineHeight: 1.5 }}>
                      I agree to the{' '}<a href="#" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>Terms</a>{' '}and{' '}<a href="#" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</a>
                    </span>
                  </label>
                </>
              )}

              {/* Step 2 — OTP */}
              {otpSent && !otpVerified && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: 7 }}>Email OTP</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#a08ec0', pointerEvents: 'none' }} />
                    <input type="text" name="otp" value={formData.otp} onChange={handleChange} placeholder="Enter 8-digit code" inputMode="numeric" maxLength={8} className="input input-icon-left" style={{ paddingLeft: 42, letterSpacing: '0.15em', fontWeight: 600 }} />
                  </div>
                  <button type="button" onClick={async () => { setError(''); setSuccessMessage(''); setIsLoading(true); await sendOtp(); setIsLoading(false); }} disabled={isLoading} style={{ marginTop: 8, fontSize: '0.83rem', color: '#7c3aed', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    Resend code →
                  </button>
                </div>
              )}

              {/* Step 3 — Password */}
              {otpVerified && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: 7 }}>Create Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#a08ec0', pointerEvents: 'none' }} />
                      <input type={showPw ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Min. 6 characters" disabled={isLoading} className="input input-icon-left" style={{ paddingLeft: 42, paddingRight: 44 }} />
                      <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a08ec0', display: 'flex', padding: 4 }}>
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: 7 }}>Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#a08ec0', pointerEvents: 'none' }} />
                      <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat your password" disabled={isLoading} className="input input-icon-left" style={{ paddingLeft: 42, paddingRight: 44 }} />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a08ec0', display: 'flex', padding: 4 }}>
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', marginTop: 4, padding: '13px', fontSize: '0.95rem' }}>
                {isLoading ? 'Please wait…' : otpVerified ? 'Finish & Continue' : otpSent ? 'Verify Code' : 'Send OTP'}
                {!isLoading && <ArrowRight size={17} />}
              </button>
            </form>

            <div className="divider" style={{ margin: '24px 0' }} />

            {/* Perks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {perks.map(perk => (
                <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={10} color="#7c3aed" strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: '0.83rem', color: '#6b7280' }}>{perk}</span>
                </div>
              ))}
            </div>

            <div className="divider" style={{ margin: '20px 0' }} />
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
              Already have an account?{' '}
              <Link to="/signin" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
