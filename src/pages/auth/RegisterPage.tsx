import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sleek-toast';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole } from '../../types';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState<UserRole>('ML Engineer');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.warning('Please complete all required fields');
      return;
    }

    const newUser: User = {
      id: `usr-${Date.now().toString(36)}`,
      name,
      email,
      organization: organization || 'DataForge Engineering Lab',
      role,
      createdAt: new Date().toISOString(),
    };

    login(newUser);
    toast.success('Account created successfully');
    navigate('/');
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
      <div className="w-full max-w-sm mx-auto my-10 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Create Account</h1>
          <p className="text-xs text-zinc-500 font-mono">
            Register a new workspace identity
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-[11px] font-mono uppercase text-zinc-500 mb-1.5 block">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="Jordan Hayes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-600 rounded-lg transition-colors"
            />
          </div>

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
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-600 rounded-lg font-mono transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase text-zinc-500 mb-1.5 block">
              Organization
            </label>
            <input
              type="text"
              placeholder="Company or Research Lab"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-600 rounded-lg transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase text-zinc-500 mb-1.5 block">
              Platform Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-zinc-300 text-xs text-zinc-900 focus:outline-none focus:border-blue-600 cursor-pointer rounded-lg transition-colors"
            >
              <option value="Data Engineer">Data Engineer</option>
              <option value="ML Engineer">ML Engineer</option>
              <option value="Data Analyst">Data Analyst</option>
              <option value="Platform Admin">Platform Admin</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-medium transition-colors cursor-pointer rounded-lg shadow-xs mt-2"
          >
            Register Account
          </button>
        </form>

        {/* Link to Login */}
        <div className="pt-2 text-center text-xs text-zinc-600 border-t border-zinc-200">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2">
            Sign In
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
