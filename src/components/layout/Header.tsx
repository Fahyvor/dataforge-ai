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
  onLogout: () => Promise<void>;
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

  const handleSignOut = async () => {
    await onLogout();
    navigate('/login');
  };

  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-30 px-6 py-3">
      <div className="flex items-center justify-between gap-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity">
          <div className="w-7 h-7 bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-xs rounded-md shadow-xs">
            D
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight text-zinc-900 uppercase">
              DATAFORGE
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/70 font-semibold">
              v1.0
            </span>
          </div>
        </Link>

        {/* Center: Dataset Selector */}
        <div className="flex items-center gap-2 max-w-sm w-full">
          <div className="flex items-center gap-2 border border-zinc-200 hover:border-blue-400 focus-within:border-blue-600 bg-zinc-50/50 hover:bg-white px-3 py-1.5 text-xs w-full transition-colors rounded-lg">
            <span className="text-zinc-400 font-mono text-[11px] shrink-0">Dataset:</span>
            {datasets.length === 0 ? (
              <span className="text-zinc-400 font-mono text-xs truncate">
                No datasets loaded
              </span>
            ) : (
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
            )}
          </div>
        </div>

        {/* Right: User Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={onOpenProfile}
                className="px-2.5 py-1.5 border border-zinc-200 hover:border-blue-400 hover:text-blue-700 text-zinc-800 transition-colors cursor-pointer rounded-lg bg-white"
              >
                <span className="font-medium">{user.name}</span>
                <span className="text-zinc-400 text-[11px] ml-1.5 font-mono">({user.role})</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 border border-zinc-200 hover:border-rose-400 hover:text-rose-600 text-zinc-500 transition-colors cursor-pointer rounded-lg bg-white"
                title="Sign Out"
              >
                <FiLogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer rounded-lg shadow-xs font-medium"
              >
                <FiLogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 border border-zinc-200 hover:border-blue-400 hover:text-blue-700 text-zinc-700 transition-colors cursor-pointer rounded-lg font-medium"
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
