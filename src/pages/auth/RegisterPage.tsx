import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { toast } from 'sleek-toast';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState<UserRole>('Data Engineer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { registerUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.warning('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        organization: organization.trim() || undefined,
        role,
      });
      toast.success('Account created successfully');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
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
              placeholder="Your full name"
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
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-mono text-xs font-medium transition-colors cursor-pointer rounded-lg shadow-xs mt-2"
          >
            {isSubmitting ? 'Creating Account...' : 'Register Account'}
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
