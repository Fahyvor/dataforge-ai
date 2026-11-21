import React, { useState } from 'react';
import { FiX, FiCopy, FiTrash2, FiPlus, FiCheck } from 'react-icons/fi';
import { toast } from 'sleek-toast';
import { ApiKey, User, UserRole } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateRole: (role: UserRole) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateRole,
}) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: 'key-1',
      name: 'Airflow Orchestrator',
      keyPreview: 'df_live_9a4f••••••••••••3d82',
      scope: 'write',
      createdAt: '2026-11-10T08:00:00Z',
      lastUsedAt: '2026-11-20T12:40:00Z',
    },
    {
      id: 'key-2',
      name: 'Metrics Exporter',
      keyPreview: 'df_live_3c7b••••••••••••8e11',
      scope: 'ml_deploy',
      createdAt: '2026-11-14T14:20:00Z',
      lastUsedAt: '2026-11-20T16:15:00Z',
    },
  ]);

  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState<ApiKey['scope']>('write');
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast.warning('Please provide a key name');
      return;
    }

    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const fullKey = `df_live_${Date.now()}_${randomSuffix}`;
    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName,
      keyPreview: `df_live_${newKeyName.substring(0, 3)}••••••••${randomSuffix}`,
      fullKey,
      scope: newKeyScope,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };

    setApiKeys([newKey, ...apiKeys]);
    setGeneratedSecret(fullKey);
    setNewKeyName('');
    toast.success('Generated new API Key');
  };

  const handleCopyKey = (keyString: string) => {
    navigator.clipboard.writeText(keyString);
    toast.success('API Key copied');
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
    toast.info('API Key revoked');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg bg-white border border-zinc-300 shadow-xl p-6 text-zinc-900 max-h-[90vh] overflow-y-auto rounded-xs">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-5">
          <h3 className="text-sm font-bold tracking-tight text-black uppercase font-mono">
            Account & Access Tokens
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-black transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border border-zinc-200 space-y-3 mb-5 rounded-xs">
          <div className="flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-black">{user.name}</div>
              <div className="text-zinc-500 font-mono text-[11px]">{user.email}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-zinc-400 font-mono uppercase">Organization</div>
              <div className="font-medium text-zinc-800">{user.organization}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Role:</span>
            <select
              value={user.role}
              onChange={(e) => onUpdateRole(e.target.value as UserRole)}
              className="bg-white border border-zinc-300 px-2 py-0.5 text-xs text-black cursor-pointer rounded-xs"
            >
              <option value="Data Engineer">Data Engineer</option>
              <option value="ML Engineer">ML Engineer</option>
              <option value="Data Analyst">Data Analyst</option>
              <option value="Platform Admin">Platform Admin</option>
            </select>
          </div>
        </div>

        {/* API Keys section */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-black font-mono">
            API Keys
          </h4>

          {generatedSecret && (
            <div className="p-3 bg-zinc-50 border border-zinc-300 text-xs space-y-1 rounded-xs">
              <div className="font-medium text-black text-[11px]">Save key:</div>
              <div className="flex items-center gap-2 bg-white p-2 border border-zinc-200 font-mono text-[11px] justify-between">
                <span className="truncate">{generatedSecret}</span>
                <button
                  type="button"
                  onClick={() => handleCopyKey(generatedSecret)}
                  className="px-2 py-0.5 bg-black text-white text-[10px] font-medium rounded-xs"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Key label"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 px-2.5 py-1.5 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black rounded-xs"
            />
            <select
              value={newKeyScope}
              onChange={(e) => setNewKeyScope(e.target.value as any)}
              className="border border-zinc-300 text-xs text-zinc-700 px-2 py-1.5 cursor-pointer rounded-xs"
            >
              <option value="read">Read Only</option>
              <option value="write">Read & Write</option>
              <option value="ml_deploy">Deploy</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="button"
              onClick={handleCreateKey}
              className="px-3 py-1.5 bg-black hover:bg-zinc-800 text-white font-medium text-xs transition-colors cursor-pointer shrink-0 rounded-xs"
            >
              Create
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="p-2.5 border border-zinc-200 flex items-center justify-between text-xs rounded-xs"
              >
                <div>
                  <div className="font-medium text-black">{key.name}</div>
                  <div className="font-mono text-[11px] text-zinc-400">{key.keyPreview}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyKey(key.keyPreview)}
                    className="p-1 text-zinc-400 hover:text-black"
                    title="Copy"
                  >
                    <FiCopy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevokeKey(key.id)}
                    className="p-1 text-zinc-400 hover:text-black"
                    title="Revoke"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
