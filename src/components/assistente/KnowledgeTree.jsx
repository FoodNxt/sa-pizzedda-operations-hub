import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit, Trash2, FileText, Folder } from 'lucide-react';

export default function KnowledgeTree({ 
  pages = [], 
  parentId = null, 
  level = 0, 
  onEdit, 
  onDelete, 
  onAddChild,
  expandedPages,
  onToggleExpand 
}) {
  const childPages = pages
    .filter(p => (p.parent_page_id || null) === parentId)
    .sort((a, b) => (a.ordine || 0) - (b.ordine || 0));

  if (childPages.length === 0 && level > 0) return null;

  return (
    <div className={level > 0 ? 'ml-6 border-l-2 border-slate-200 pl-4 space-y-2' : 'space-y-2'}>
      {childPages.map(page => {
        const hasChildren = pages.some(p => p.parent_page_id === page.id);
        const isExpanded = expandedPages[page.id] !== false;
        
        return (
          <div key={page.id}>
            <div className={`neumorphic-pressed p-3 rounded-xl flex items-center justify-between group ${
              !page.attivo ? 'opacity-50' : ''
            }`}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {hasChildren && (
                  <button
                    onClick={() => onToggleExpand(page.id)}
                    className="hover:bg-slate-100 p-1 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                )}
                {!hasChildren && <div className="w-6" />}
                
                <span className="text-lg">{page.icona || (hasChildren ? '📁' : '📄')}</span>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{page.titolo}</p>
                  {page.store_specifico && (
                    <span className="text-xs text-purple-600">Store specifico</span>
                  )}
                </div>

                {page.notion_url && (
                  <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">
                    Notion
                  </span>
                )}
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onAddChild(page.id)}
                  className="nav-button p-2 rounded-lg hover:bg-green-50"
                  title="Aggiungi sottopagina"
                >
                  <Plus className="w-3 h-3 text-green-600" />
                </button>
                <button
                  onClick={() => onEdit(page)}
                  className="nav-button p-2 rounded-lg hover:bg-blue-50"
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                </button>
                <button
                  onClick={() => onDelete(page.id)}
                  className="nav-button p-2 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            {isExpanded && hasChildren && (
              <KnowledgeTree 
                pages={pages}
                parentId={page.id}
                level={level + 1}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddChild={onAddChild}
                expandedPages={expandedPages}
                onToggleExpand={onToggleExpand}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}