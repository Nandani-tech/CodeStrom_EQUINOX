import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Package, 
  Copy, 
  ArrowRight, 
  TrendingUp,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export default function SmartActionsBanner({ 
  actions = [], 
  onNavigateTab, 
  lang = 'en',
  t 
}) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-slate-950 p-4 sm:p-5 shadow-xl mb-6 animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
              <span>{t.actions.title}</span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {actions.length} {lang === 'hi' ? 'सूचनाएं' : 'Alerts'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">{t.actions.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.slice(0, 3).map((action, idx) => {
          const isHigh = action.priority === 'high';
          const isSupplier = action.type === 'supplier_due';
          const isStock = action.type === 'low_stock';
          const isDup = action.type === 'duplicate_receipt';

          const title = lang === 'hi' ? action.hindi_title : action.title;
          const msg = lang === 'hi' ? action.hindi_message : action.message;

          return (
            <div 
              key={idx}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                isHigh 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200 hover:border-rose-500/50' 
                  : isStock
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 hover:border-amber-500/50'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200 hover:border-indigo-500/50'
              }`}
            >
              <div>
                <div className="flex items-center space-x-2 mb-1.5">
                  {isSupplier && <Clock className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                  {isStock && <Package className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                  {isDup && <Copy className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                  <span className="text-xs font-bold truncate text-white">{title}</span>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                  {msg}
                </p>
              </div>

              <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
                  {isHigh ? (lang === 'hi' ? 'जरूरी' : 'Urgent') : (lang === 'hi' ? 'ध्यान दें' : 'Notice')}
                </span>
                <button
                  onClick={() => onNavigateTab(action.action_tab)}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-white hover:underline"
                >
                  <span>{action.action_text}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
