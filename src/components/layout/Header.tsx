import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLogOut, FiLogIn } from 'react-icons/fi';
import { Dataset, User } from '../../types';

interface HeaderProps {
  user: User | null;
  datasets: Dataset[];
  activeDataset: Dataset | null;
  onSelectDataset: (id: string) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  datasets,
  activeDataset,
  onSelectDataset,
  onOpenProfile,
  onLogout,
}) => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-30 px-6 py-3">
      <div className="flex items-center justify-between gap-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 shrink-0 hover:opacity-85 transition-opacity">
          <div className="w-6 h-6 bg-black flex items-center justify-center text-white font-mono font-bold text-xs rounded-xs">
            D
          </div>
          <span className="font-bold text-sm tracking-tight text-black uppercase">
            DATAFORGE
          </span>
        </Link>

        {/* Center: Dataset Selector */}
        <div className="flex items-center gap-2 max-w-sm w-full">
          <div className="flex items-center gap-2 border border-zinc-300 hover:border-black px-2.5 py-1 text-xs w-full transition-colors rounded-xs">
            <span className="text-zinc-400 font-mono text-[11px] shrink-0">Dataset:</span>
            <select
              value={activeDataset?.id || ''}
              onChange={(e) => onSelectDataset(e.target.value)}
              className="bg-transparent text-zinc-900 text-xs focus:outline-none cursor-pointer truncate flex-1 font-medium font-mono"
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id} className="bg-white text-zinc-900">
                  {ds.name} ({ds.format.toUpperCase()} · {ds.rowCount} rows)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: User Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={onOpenProfile}
                className="px-2.5 py-1 border border-zinc-300 hover:border-black text-zinc-800 transition-colors cursor-pointer rounded-xs"
              >
                <span className="font-medium">{user.name}</span>
                <span className="text-zinc-400 text-[11px] ml-1.5 font-mono">({user.role})</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 border border-zinc-300 hover:border-black hover:text-black text-zinc-500 transition-colors cursor-pointer rounded-xs"
                title="Sign Out"
              >
                <FiLogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1 bg-black text-white hover:bg-zinc-800 transition-colors cursor-pointer rounded-xs"
              >
                <FiLogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className="px-3 py-1 border border-zinc-300 hover:border-black text-black transition-colors cursor-pointer rounded-xs"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
