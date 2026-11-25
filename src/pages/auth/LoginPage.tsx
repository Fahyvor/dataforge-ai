import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { toast } from 'sleek-toast';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginWithCredentials } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.warning('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithCredentials(email.trim(), password);
      toast.success('Signed in successfully');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col justify-between p-6 sm:p-10 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-zinc-900 hover:opacity-85 transition-opacity">
          <div className="w-7 h-7 bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-xs rounded-md shadow-xs">
            D
          </div>
          <span className="font-extrabold text-sm tracking-tight uppercase">DATAFORGE</span>
        </Link>

        <Link
          to="/"
          className="text-xs font-mono text-zinc-500 hover:text-blue-600 transition-colors"
        >
          ← Return to Platform
        </Link>
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-sm mx-auto my-12 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Sign In</h1>
          <p className="text-xs text-zinc-500 font-mono">
            Authenticate with your registered workspace credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-mono uppercase text-zinc-500 mb-1.5 block">
              Work Email
            </label>
            <input
              type="email"
              required
              placeholder="name@organization.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-600 rounded-lg font-mono transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase text-zinc-500 mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-9 py-2 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-600 rounded-lg font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-blue-600 transition-colors cursor-pointer p-0.5"
              >
                {showPassword ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-mono text-xs font-medium transition-colors cursor-pointer rounded-lg shadow-xs"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Link to Register */}
        <div className="pt-4 text-center text-xs text-zinc-600 border-t border-zinc-200">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2">
            Create an account
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] font-mono text-zinc-400">
        DATAFORGE · SECURE WORKSPACE ACCESS
      </div>
    </div>
  );
};
