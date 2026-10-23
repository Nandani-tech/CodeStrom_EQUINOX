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
        className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-morning-100/95 border-r border-apricot-200 backdrop-blur-xl flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Brand Header */}
        <div className="p-5 border-b border-apricot-200/80 bg-white/60">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center space-x-3 cursor-pointer group" 
              onClick={() => handleNavClick('hisab')}
            >
              <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-apricot-500 via-amber-500 to-apricot-400 shadow-md shadow-apricot-500/30 group-hover:scale-105 transition-transform">
                <Store className="w-5 h-5 text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xl font-black tracking-tight text-stone-900 font-sans">
                    Dukan<span className="text-apricot-600">Desk</span>
                  </span>
                </div>
                <span className="inline-flex items-center text-[10px] font-bold text-apricot-700">
                  <Sparkles className="w-3 h-3 mr-1 text-apricot-600" /> Gemini 2.5 AI Powered
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-apricot-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Middle: Vertical Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {navGroups.map((group) => (
            <div key={group.groupLabel}>
              <div className="px-2.5 mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                {group.groupLabel}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl text-xs font-bold transition-all group ${
                        isActive
                          ? 'bg-gradient-to-r from-apricot-500 to-amber-500 text-white shadow-md shadow-apricot-500/25 scale-[1.01]'
                          : 'text-stone-700 hover:text-stone-900 hover:bg-apricot-100/70 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`p-2 rounded-xl transition-colors ${
                          isActive 
                            ? 'bg-white/20 text-white' 
                            : 'bg-white text-stone-600 group-hover:text-apricot-600 group-hover:bg-white shadow-xs border border-apricot-200/50'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-left truncate">
                          <span className={`block truncate text-xs font-bold ${isActive ? 'text-white' : 'text-stone-800'}`}>
                            {item.label}
                          </span>
                          <span className={`block text-[10px] font-medium truncate ${isActive ? 'text-white/80' : 'text-stone-400'}`}>
                            {item.desc}
                          </span>
                        </div>
                      </div>

                      {item.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${
                          isActive 
                            ? 'bg-white/25 text-white border-white/40' 
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Upload CTA - Golden Apricot Highlight Button */}
          <div className="pt-2 px-1">
            <button
              onClick={() => {
                if (onOpenUpload) onOpenUpload();
                else handleNavClick('upload');
              }}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-apricot-500 via-amber-500 to-apricot-600 hover:from-apricot-600 hover:to-amber-600 shadow-lg shadow-apricot-500/25 active:scale-95 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{t?.common?.uploadReceipt || 'Upload Bill'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-apricot-200/80 bg-white/70 space-y-3">
          
          {/* Language Toggle */}
          {setLang && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-morning-100 border border-apricot-200 text-xs">
              <div className="flex items-center space-x-2">
                <Languages className="w-4 h-4 text-apricot-600" />
                <span className="text-stone-700 font-bold text-[11px]">भाषा / Language</span>
              </div>
              <div className="flex items-center space-x-1 bg-white rounded-lg p-0.5 border border-apricot-200 shadow-2xs">
                <button
                  onClick={() => setLang('en')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${lang === 'en' ? 'bg-apricot-500 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('hi')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${lang === 'hi' ? 'bg-apricot-500 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
                >
                  हिं
                </button>
              </div>
            </div>
          )}

          {/* AI Engine Status */}
          <div 
            title={healthData?.gemini_configured ? "Gemini 2.5 Flash Connected" : "Local Python Financial Engine Active"}
            className="flex items-center justify-between p-2 rounded-xl bg-morning-100 border border-apricot-200 text-xs"
          >
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${healthData?.gemini_configured ? 'bg-emerald-500 glow-emerald' : 'bg-apricot-500 glow-apricot'}`} />
              <span className="text-[11px] font-bold text-stone-700">
                {healthData?.gemini_configured ? 'Gemini 2.5 Flash' : 'Smart Engine'}
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
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
              className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl text-[11px] font-bold text-stone-700 hover:text-stone-900 bg-white hover:bg-apricot-50 border border-apricot-200 shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-apricot-600" />
              <span>{t?.common?.exportCsv || 'Export CSV'}</span>
            </a>

            {/* Reseed Demo Data */}
            <button
              onClick={onResetSeed}
              disabled={isResetting}
              title="Reseed Indian Shopkeeper Demo Data"
              className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl text-[11px] font-bold text-stone-700 hover:text-stone-900 bg-white hover:bg-apricot-50 border border-apricot-200 shadow-2xs transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-apricot-600 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? (lang === 'hi' ? 'लोड...' : 'Seeding...') : (t?.common?.resetDemo || 'Reset')}</span>
            </button>
          </div>

          <div className="text-center pt-0.5">
            <span className="text-[10px] text-stone-400 font-medium">
              DukanDesk · Kirana Friendly v2.0
            </span>
          </div>

        </div>

      </aside>
    </>
  );
}
