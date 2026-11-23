import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  datasetCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ datasetCount }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navSections = [
    {
      label: 'Data',
      items: [
        { path: '/', label: 'Datasets', count: datasetCount },
        { path: '/upload', label: 'Upload' },
        { path: '/warehouse', label: 'Warehouse & SQL' },
      ],
    },
    {
      label: 'Engineering',
      items: [
        { path: '/validation', label: 'Validation' },
        { path: '/cleaning', label: 'Transformation' },
        { path: '/pipelines', label: 'Pipelines' },
      ],
    },
    {
      label: 'Analytics',
      items: [
        { path: '/eda', label: 'Exploration' },
        { path: '/dashboard', label: 'Dashboards' },
      ],
    },
    {
      label: 'Modeling',
      items: [
        { path: '/models', label: 'Model Studio' },
        { path: '/evaluation', label: 'Evaluation' },
      ],
    },
    {
      label: 'Governance',
      items: [
        { path: '/quality', label: 'Quality & Lineage' },
        { path: '/reports', label: 'Reports' },
      ],
    },
  ];

  const isItemActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/' || currentPath === '/datasets';
    }
    return currentPath === path;
  };

  return (
    <aside className="w-56 border-r border-zinc-200 bg-white flex flex-col shrink-0 select-none overflow-y-auto">
      <div className="py-4 px-3 space-y-6">
        {navSections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-2.5 text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
              {sec.label}
            </div>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const active = isItemActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-all cursor-pointer text-left rounded-lg ${
                      active
                        ? 'bg-blue-50/80 text-blue-700 font-semibold border border-blue-200/60 shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 font-normal border border-transparent'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.count !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          active
                            ? 'bg-blue-100 text-blue-800 font-semibold'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto p-4 border-t border-zinc-200 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
        <span>DATAFORGE</span>
        <span className="text-blue-600 font-semibold">v1.0</span>
      </div>
    </aside>
  );
};
