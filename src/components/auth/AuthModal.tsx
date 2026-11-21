import React, { useState } from 'react';
import { FiX, FiArrowRight } from 'react-icons/fi';
import { toast } from 'sleek-toast';
import { User, UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState<UserRole>('ML Engineer');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning('Please provide both email and password');
      return;
    }

    if (mode === 'register' && !name) {
      toast.warning('Please enter your full name');
      return;
    }

    const newUser: User = {
      id: `usr-${Date.now().toString(36)}`,
      name: mode === 'register' ? name : email.split('@')[0],
      email,
      organization: organization || 'DataForge Engineering Lab',
      role,
      createdAt: new Date().toISOString(),
    };

    onLogin(newUser);
    toast.success(mode === 'register' ? 'Account registered' : 'Signed in');
    onClose();
  };

  const handleDemoSignIn = (demoRole: UserRole) => {
    const demoUser: User = {
      id: 'usr-admin-demo',
      name: `${demoRole.replace(' ', '')} Lead`,
      email: `${demoRole.toLowerCase().replace(' ', '.')}.lead@dataforge.io`,
      organization: 'DataForge Engineering Lab',
      role: demoRole,
      createdAt: '2026-11-01T00:00:00Z',
    };
    onLogin(demoUser);
    toast.info(`Signed in as ${demoRole}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm bg-white border border-zinc-300 shadow-xl p-6 text-zinc-900 relative rounded-xs">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-black transition-colors"
        >
          <FiX className="w-4 h-4" />
        </button>

        <div className="mb-5">
          <h2 className="text-sm font-bold tracking-tight uppercase font-mono text-black">
            {mode === 'login' ? 'Sign in to DataForge' : 'Register Account'}
          </h2>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 border border-zinc-300 mb-4 text-xs font-medium rounded-xs">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-1.5 transition-colors ${
              mode === 'login' ? 'bg-black text-white font-semibold' : 'text-zinc-600 hover:text-black'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-1.5 transition-colors ${
              mode === 'register' ? 'bg-black text-white font-semibold' : 'text-zinc-600 hover:text-black'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-mono uppercase text-zinc-500 mb-1 block">Full Name</label>
              <input
                type="text"
                required
                placeholder="Jordan Hayes"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black rounded-xs"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-mono uppercase text-zinc-500 mb-1 block">Email</label>
            <input
              type="email"
              required
              placeholder="name@organization.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black rounded-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase text-zinc-500 mb-1 block">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black rounded-xs"
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="text-[11px] font-mono uppercase text-zinc-500 mb-1 block">Organization</label>
                <input
                  type="text"
                  placeholder="Organization or Company"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black rounded-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-zinc-500 mb-1 block">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 text-xs text-zinc-900 focus:outline-none focus:border-black cursor-pointer rounded-xs"
                >
                  <option value="Data Engineer">Data Engineer</option>
                  <option value="ML Engineer">ML Engineer</option>
                  <option value="Data Analyst">Data Analyst</option>
                  <option value="Platform Admin">Platform Admin</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-black hover:bg-zinc-800 font-medium text-xs text-white transition-colors cursor-pointer mt-2 flex items-center justify-center gap-2 rounded-xs"
          >
            <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            <FiArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-2 text-center">
            Demo Logins
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleDemoSignIn('Data Engineer')}
              className="px-2 py-1 border border-zinc-300 hover:border-black text-zinc-700 text-[11px] transition-colors cursor-pointer text-center rounded-xs"
            >
              Data Engineer
            </button>
            <button
              type="button"
              onClick={() => handleDemoSignIn('ML Engineer')}
              className="px-2 py-1 border border-zinc-300 hover:border-black text-zinc-700 text-[11px] transition-colors cursor-pointer text-center rounded-xs"
            >
              ML Engineer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
