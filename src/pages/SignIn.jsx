import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function SignIn() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginId || !password) {
      setError('Please enter ID/email and password');
      return;
    }

    if (!loginId.includes('@')) {
      setError('Please enter a valid email as your ID');
      return;
    }

    setIsLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginId,
      password
    });

    setIsLoading(false);

    if (signInError) {
      setError(signInError.message || 'Login failed. Please check your credentials.');
      return;
    }

    navigate('/home');
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

      {/* Sign In Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
            <p className="text-foreground/70">Sign in to continue your learning journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">ID / Email</label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-3 text-foreground/50" />
                <input
                  type="email"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-3 text-foreground/50" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? 'Signing in...' : 'Sign In'} <ArrowRight size={20} />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-foreground/70">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:text-primary/80 transition-colors font-medium">
                Sign up here
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-foreground/50">
            <p>Use the email and password you registered with.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
