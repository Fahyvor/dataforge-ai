import React from 'react';

export type ActiveTab =
  | 'datasets'
  | 'upload'
  | 'validation'
  | 'cleaning'
  | 'pipelines'
  | 'warehouse'
  | 'eda'
  | 'dashboard'
  | 'ml_studio'
  | 'evaluation'
  | 'quality'
  | 'experiments';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  datasetCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, datasetCount }) => {
  const navSections = [
    {
      label: 'Data',
      items: [
        { id: 'datasets' as ActiveTab, label: 'Datasets', count: datasetCount },
        { id: 'upload' as ActiveTab, label: 'Upload' },
        { id: 'warehouse' as ActiveTab, label: 'Warehouse & SQL' },
      ],
    },
    {
      label: 'Engineering',
      items: [
        { id: 'validation' as ActiveTab, label: 'Validation' },
        { id: 'cleaning' as ActiveTab, label: 'Transformation' },
        { id: 'pipelines' as ActiveTab, label: 'Pipelines' },
      ],
    },
    {
      label: 'Analytics',
      items: [
        { id: 'eda' as ActiveTab, label: 'Exploration' },
        { id: 'dashboard' as ActiveTab, label: 'Dashboards' },
      ],
    },
    {
      label: 'Modeling',
      items: [
        { id: 'ml_studio' as ActiveTab, label: 'Model Studio' },
        { id: 'evaluation' as ActiveTab, label: 'Evaluation' },
      ],
    },
    {
      label: 'Governance',
      items: [
        { id: 'quality' as ActiveTab, label: 'Quality & Lineage' },
        { id: 'experiments' as ActiveTab, label: 'Reports' },
      ],
    },
  ];

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
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left rounded-xs ${
                      isActive
                        ? 'bg-black text-white font-medium'
                        : 'text-zinc-600 hover:text-black hover:bg-zinc-100 font-normal'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.count !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-1 rounded-xs ${
                          isActive ? 'text-zinc-300' : 'text-zinc-400'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto p-4 border-t border-zinc-200 text-[11px] font-mono text-zinc-400">
        DATAFORGE v1.0
      </div>
    </aside>
  );
};
