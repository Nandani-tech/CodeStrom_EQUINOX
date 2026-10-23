import React from 'react';
import { 
  Receipt, 
  LayoutDashboard, 
  FileSpreadsheet, 
  UploadCloud, 
  Bot, 
  RotateCcw, 
  Download, 
  Sparkles,
  Store,
  Package,
  BarChart2,
  Calculator,
  X,
  Languages
} from 'lucide-react';
import { getCsvExportUrl } from '../api';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  pendingCount = 0, 
  duplicateCount = 0,
  onResetSeed, 
  isResetting,
  healthData,
  onOpenUpload,
  mobileOpen = false,
  setMobileOpen,
  lang = 'en',
  setLang,
  t
}) {
  const attentionCount = pendingCount + duplicateCount;

  const navGroups = [
    {
      groupLabel: lang === 'hi' ? '🏪 दुकान प्रबंधन' : '🏪 Shop Management',
      items: [
        {
          id: 'hisab',
          label: t?.tabs?.hisab || 'Daily Hisab',
          icon: Calculator,
          badge: null,
          desc: t?.tabs?.hisabDesc || 'Sales, Cash & Expenses'
        },
        {
          id: 'suppliers',
          label: t?.tabs?.suppliers || 'Supplier Khata',
          icon: Store,
          badge: null,
          desc: t?.tabs?.suppliersDesc || 'Balances & Due Dates'
        },
        {
          id: 'stock',
          label: t?.tabs?.stock || 'Smart Stock',
          icon: Package,
          badge: null,
          desc: t?.tabs?.stockDesc || 'Inventory & Low Stock'
        },
        {
          id: 'profit',
          label: t?.tabs?.profit || 'Profit Overview',
          icon: BarChart2,
          badge: null,
          desc: t?.tabs?.profitDesc || 'P&L & Transparency'
        },
      ]
    },
    {
      groupLabel: lang === 'hi' ? '🤖 AI & रसीद टूल्स' : '🤖 AI & Receipt Tools',
      items: [
        {
          id: 'dashboard',
          label: t?.tabs?.dashboard || 'Analytics Dashboard',
          icon: LayoutDashboard,
          badge: null,
          desc: t?.tabs?.dashboardDesc || 'Financial charts'
        },
        {
          id: 'receipts',
          label: t?.tabs?.receipts || 'Receipts Ledger',
          icon: FileSpreadsheet,
          badge: attentionCount > 0 ? `${attentionCount}` : null,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          desc: t?.tabs?.receiptsDesc || 'All records & audit'
        },
        {
          id: 'upload',
          label: t?.tabs?.upload || 'Upload & Review',
          icon: UploadCloud,
          badge: 'OCR',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
          desc: t?.tabs?.uploadDesc || 'Scan bill / receipt'
        },
        {
          id: 'assistant',
          label: t?.tabs?.assistant || 'AI Assistant',
          icon: Bot,
          badge: lang === 'hi' ? 'हिंदी' : 'Chat',
          badgeColor: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent',
          desc: t?.tabs?.assistantDesc || 'Hinglish voice & chat'
        }
      ]
    }
  ];

  const handleNavClick = (id) => {
    setCurrentTab(id);
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-slate-950/95 border-r border-slate-800/90 backdrop-blur-xl flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Brand Header */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center space-x-3 cursor-pointer group" 
              onClick={() => handleNavClick('hisab')}
            >
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <Receipt className="w-5 h-5 text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold tracking-tight text-white font-sans">
                    Shop<span className="text-indigo-400">Ledger</span>
                  </span>
                </div>
                <span className="inline-flex items-center text-[10px] font-semibold text-indigo-400">
                  <Sparkles className="w-3 h-3 mr-1" /> Gemini 2.5 AI
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Middle: Vertical Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {navGroups.map((group) => (
            <div key={group.groupLabel}>
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.groupLabel}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-md shadow-indigo-600/5'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`p-1.5 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                            : 'bg-slate-900 text-slate-400 group-hover:text-indigo-400 group-hover:bg-slate-800'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left truncate">
                          <span className="block truncate text-xs font-semibold">{item.label}</span>
                          <span className="block text-[10px] text-slate-500 font-normal truncate">
                            {item.desc}
                          </span>
                        </div>
                      </div>

                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Upload CTA */}
          <div className="pt-2 px-1">
            <button
              onClick={() => {
                if (onOpenUpload) onOpenUpload();
                else handleNavClick('upload');
              }}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{t?.common?.uploadReceipt || 'Upload Bill'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
          
          {/* Language Toggle */}
          {setLang && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800/90 text-xs">
              <div className="flex items-center space-x-2">
                <Languages className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-300 font-medium text-[11px]">Language / भाषा</span>
              </div>
              <div className="flex items-center space-x-1 bg-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setLang('en')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${lang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('hi')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${lang === 'hi' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  हिं
                </button>
              </div>
            </div>
          )}

          {/* AI Engine Status */}
          <div 
            title={healthData?.gemini_configured ? "Gemini 2.5 Flash Connected" : "Local Python Financial Engine Active (Add GEMINI_API_KEY in .env for Gemini multimodal API)"}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800/90 text-xs"
          >
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${healthData?.gemini_configured ? 'bg-emerald-400 glow-emerald' : 'bg-indigo-400 glow-indigo'}`} />
              <span className="text-[11px] font-medium text-slate-300">
                {healthData?.gemini_configured ? 'Gemini 2.5 Flash' : 'Analytical Engine'}
              </span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              {t?.common?.online || 'Online'}
            </span>
          </div>

          {/* Secondary Quick Action Row */}
          <div className="grid grid-cols-2 gap-2">
            {/* CSV Export */}
            <a
              href={getCsvExportUrl('confirmed')}
              download
              title="Export Confirmed Receipts to CSV"
              className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>{t?.common?.exportCsv || 'Export CSV'}</span>
            </a>

            {/* Reseed Demo Data */}
            <button
              onClick={onResetSeed}
              disabled={isResetting}
              title="Reseed Indian Shopkeeper Demo Data"
              className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-indigo-400 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? (lang === 'hi' ? 'लोड...' : 'Seeding...') : (t?.common?.resetDemo || 'Reset')}</span>
            </button>
          </div>

          <div className="text-center pt-1">
            <span className="text-[10px] text-slate-500 font-mono">
              ShopLedger v2.0 · Hackathon Edition
            </span>
          </div>

        </div>

      </aside>
    </>
  );
}
