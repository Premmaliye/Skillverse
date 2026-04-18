import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, User, Lock, ArrowRight, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    otp: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const sendOtp = async () => {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: formData.email,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: formData.name
        }
      }
    });

    if (otpError) {
      setError(otpError.message || 'Failed to send OTP. Please try again.');
      return false;
    }

    setOtpSent(true);
    setSuccessMessage('OTP sent to your email. Enter the 8-digit code to verify.');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!otpSent) {
      if (!formData.name || !formData.email) {
        setError('Please fill in all fields');
        return;
      }

      if (formData.name.length < 2) {
        setError('Name must be at least 2 characters');
        return;
      }

      if (!formData.email.includes('@')) {
        setError('Please enter a valid email');
        return;
      }

      if (!agreeTerms) {
        setError('Please agree to the terms and conditions');
        return;
      }

      setIsLoading(true);
      await sendOtp();
      setIsLoading(false);
      return;
    }

    if (!otpVerified) {
      if (!formData.otp || formData.otp.length !== 8) {
        setError('Enter the 8-digit OTP sent to your email.');
        return;
      }

      setIsLoading(true);

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: formData.otp,
        type: 'email'
      });

      setIsLoading(false);

      if (verifyError) {
        setError(verifyError.message || 'Invalid OTP. Please try again.');
        return;
      }

      setOtpVerified(true);
      setFormData((prev) => ({ ...prev, otp: '' }));
      setSuccessMessage('OTP verified. Create a password to complete your account.');
      return;
    }

    if (!formData.password || !formData.confirmPassword) {
      setError('Please enter password and confirm password.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    const { error: updateUserError } = await supabase.auth.updateUser({
      password: formData.password,
      data: {
        full_name: formData.name
      }
    });

    setIsLoading(false);

    if (updateUserError) {
      setError(updateUserError.message || 'Failed to set password. Please try again.');
      return;
    }

    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center">
          <Link to="/" className="font-bold text-2xl text-primary tracking-tight">
            SkillVerse
          </Link>
        </div>
      </nav>

      {/* Sign Up Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Create Account</h1>
            <p className="text-foreground/70">Join SkillVerse and start your learning journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-600">
                {successMessage}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <div className="relative">
                <User size={20} className="absolute left-3 top-3 text-foreground/50" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Prajakta Singam"
                  disabled={otpSent || isLoading}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-3 text-foreground/50" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  disabled={otpSent || isLoading}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {otpSent && !otpVerified && (
              <div>
                <label className="block text-sm font-medium mb-2">Email OTP</label>
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-3 text-foreground/50" />
                  <input
                    type="text"
                    name="otp"
                    value={formData.otp}
                    onChange={handleChange}
                    placeholder="Enter 8-digit OTP"
                    inputMode="numeric"
                    maxLength={8}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setError('');
                    setSuccessMessage('');
                    setIsLoading(true);
                    await sendOtp();
                    setIsLoading(false);
                  }}
                  disabled={isLoading}
                  className="mt-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Resend OTP
                </button>
              </div>
            )}

            {otpVerified && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Create Password</label>
                  <div className="relative">
                    <Lock size={20} className="absolute left-3 top-3 text-foreground/50" />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter password"
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock size={20} className="absolute left-3 top-3 text-foreground/50" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm password"
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </>
            )}

            <label className="flex items-start gap-3 mt-4">
              <input 
                type="checkbox" 
                checked={agreeTerms} 
                onChange={(e) => setAgreeTerms(e.target.checked)}
                disabled={otpSent || isLoading}
                className="mt-1"
              />
              <span className="text-sm text-foreground/70">
                I agree to the{' '}
                <a href="#" className="text-primary hover:text-primary/80 transition-colors">
                  Terms of Service
                </a>
                {' '}and{' '}
                <a href="#" className="text-primary hover:text-primary/80 transition-colors">
                  Privacy Policy
                </a>
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? 'Please wait...' : otpVerified ? 'Save Password' : otpSent ? 'Verify OTP' : 'Send OTP'} <ArrowRight size={20} />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-foreground/70">
              Already have an account?{' '}
              <Link to="/signin" className="text-primary hover:text-primary/80 transition-colors font-medium">
                Sign in here
              </Link>
            </p>
          </div>

          {/* Features */}
          <div className="mt-8 pt-8 border-t border-border space-y-3">
            {[
              'Free to join and start learning',
              'Access to thousands of courses',
              'Connect with industry experts'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-foreground/70">
                <Check size={16} className="text-primary flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
