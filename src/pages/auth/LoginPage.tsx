import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sleek-toast';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning('Please enter both email and password');
      return;
    }

    const user: User = {
      id: `usr-${Date.now().toString(36)}`,
      name: email.split('@')[0],
      email,
      organization: 'DataForge Engineering Lab',
      role: 'ML Engineer',
      createdAt: new Date().toISOString(),
    };

    login(user);
    toast.success('Signed in successfully');
    navigate('/');
  };

  const handleDemoLogin = (role: UserRole) => {
    const demoUser: User = {
      id: 'usr-admin-demo',
      name: `${role.replace(' ', '')} Lead`,
      email: `${role.toLowerCase().replace(' ', '.')}.lead@dataforge.io`,
      organization: 'DataForge Engineering Lab',
      role,
      createdAt: '2026-11-01T00:00:00Z',
    };

    login(demoUser);
    toast.info(`Signed in as ${role}`);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col justify-between p-6 sm:p-10 font-sans selection:bg-black selection:text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-black hover:opacity-80 transition-opacity">
          <div className="w-6 h-6 bg-black flex items-center justify-center text-white font-mono font-bold text-xs rounded-xs">
            D
          </div>
          <span className="font-bold text-sm tracking-tight uppercase">DATAFORGE</span>
        </Link>

        <Link
          to="/"
          className="text-xs font-mono text-zinc-500 hover:text-black transition-colors"
        >
          ← Return to Platform
        </Link>
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-sm mx-auto my-12 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-black">Sign In</h1>
          <p className="text-xs text-zinc-500 font-mono">
            Enter your credentials to access workspaces
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
              className="w-full px-3 py-2 border border-zinc-300 text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black rounded-xs font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase text-zinc-500 mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black rounded-xs font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white font-mono text-xs font-medium transition-colors cursor-pointer rounded-xs"
          >
            Sign In
          </button>
        </form>

        {/* Demo Fast Access */}
        <div className="pt-5 border-t border-zinc-200 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            One-Click Demo Profiles
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => handleDemoLogin('Data Engineer')}
              className="px-2.5 py-1.5 border border-zinc-300 hover:border-black text-black transition-colors cursor-pointer text-center rounded-xs"
            >
              Data Engineer
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('ML Engineer')}
              className="px-2.5 py-1.5 border border-zinc-300 hover:border-black text-black transition-colors cursor-pointer text-center rounded-xs"
            >
              ML Engineer
            </button>
          </div>
        </div>

        {/* Link to Register */}
        <div className="pt-2 text-center text-xs text-zinc-600">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-black underline underline-offset-2 hover:opacity-80">
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
