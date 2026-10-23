import React from 'react';
import { 
  Menu, 
  UploadCloud, 
  Download, 
  RotateCcw, 
  Sparkles,
  LayoutDashboard,
  FileSpreadsheet,
  Bot,
  Calculator,
  Store,
  Package,
  BarChart2,
  Languages
} from 'lucide-react';
import { getCsvExportUrl } from '../api';

const TAB_INFO = {
  hisab: {
    en: { title: 'Daily Hisab', subtitle: 'Daily sales, cash in hand, expenses & customer credit tracking' },
    hi: { title: 'दैनिक हिसाब', subtitle: 'आज की बिक्री, गल्ला, खर्चे और ग्राहकों का उधार' },
    icon: Calculator
  },
  suppliers: {
    en: { title: 'Supplier Khata', subtitle: 'Track wholesale suppliers, purchases, payments & outstanding dues' },
    hi: { title: 'सप्लायर खाता', subtitle: 'थोक सप्लायर, माल खरीद, भुगतान और बाकी रकम का हिसाब' },
    icon: Store
  },
  stock: {
    en: { title: 'Smart Stock', subtitle: 'Real-time inventory levels, low-stock alerts & receipt auto-sync' },
    hi: { title: 'स्मार्ट स्टॉक', subtitle: 'इन्वेंट्री, कम स्टॉक अलर्ट और बिल से स्टॉक जोड़ें' },
    icon: Package
  },
  profit: {
    en: { title: 'Profit Overview', subtitle: 'Transparent P&L: sales, COGS, operating expenses & estimated net profit' },
    hi: { title: 'मुनाफा रिपोर्ट', subtitle: 'पारदर्शी हिसाब: बिक्री, माल लागत, खर्चे और शुद्ध मुनाफा' },
    icon: BarChart2
  },
  dashboard: {
    en: { title: 'Analytics Dashboard', subtitle: 'Live confirmed business spending & analytics overview' },
    hi: { title: 'एनालिटिक्स डैशबोर्ड', subtitle: 'कन्फर्म किए गए बिजनेस खर्चे और एनालिटिक्स' },
    icon: LayoutDashboard
  },
  receipts: {
    en: { title: 'Receipts Ledger', subtitle: 'Search, filter, verify, and audit all transaction records' },
    hi: { title: 'रसीद लेजर', subtitle: 'सभी बिल खोजें, जांचें और कन्फर्म करें' },
    icon: FileSpreadsheet
  },
  upload: {
    en: { title: 'Upload & Review', subtitle: 'Multimodal OCR bill parsing with instant editable review' },
    hi: { title: 'बिल स्कैन / अपलोड', subtitle: 'मल्टीमॉडल OCR से बिल स्कैन करें और तुरंत जांचें' },
    icon: UploadCloud
  },
  assistant: {
    en: { title: 'AI Business Assistant', subtitle: 'Ask business questions in Hindi/Hinglish with real data answers' },
    hi: { title: 'AI व्यापार सहायक', subtitle: 'हिंदी/हिंग्लिश में पूछें — असली डेटा से जवाब मिलेगा' },
    icon: Bot
  }
};

export default function Navbar({ 
  currentTab, 
  pendingCount = 0, 
  duplicateCount = 0,
  onResetSeed, 
  isResetting,
  healthData,
  onOpenUpload,
  setMobileOpen,
  lang = 'en',
  setLang,
  t
}) {
  const info = TAB_INFO[currentTab] || TAB_INFO.hisab;
  const tabText = info[lang] || info.en;
  const Icon = info.icon;
  const attentionCount = pendingCount + duplicateCount;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Mobile Menu Toggle & Current Page Title */}
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => setMobileOpen && setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5">
              <div className="hidden sm:flex p-2 rounded-xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/20">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {tabText.title}
                  </h1>
                  {currentTab === 'receipts' && attentionCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {attentionCount} {lang === 'hi' ? 'जांचें' : 'Need Review'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 hidden md:block">
                  {tabText.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center space-x-2">
            {/* Language Toggle (mobile) */}
            {setLang && (
              <div className="flex items-center space-x-0.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5 lg:hidden">
                <button
                  onClick={() => setLang('en')}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${lang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('hi')}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${lang === 'hi' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  हिं
                </button>
              </div>
            )}

            {/* Quick Upload CTA */}
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all active:scale-95"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t?.common?.uploadReceipt || 'Upload Bill'}</span>
              <span className="sm:hidden">{lang === 'hi' ? 'बिल' : 'Upload'}</span>
            </button>

            {/* CSV Export */}
            <a
              href={getCsvExportUrl('confirmed')}
              download
              title="Export Confirmed Receipts to CSV"
              className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>{t?.common?.exportCsv || 'Export CSV'}</span>
            </a>

            {/* Reseed Demo Data */}
            <button
              onClick={onResetSeed}
              disabled={isResetting}
              title="Reseed Indian Shopkeeper Demo Data"
              className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-indigo-400 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? (lang === 'hi' ? 'लोड...' : 'Seeding...') : (t?.common?.resetDemo || 'Reset Demo')}</span>
            </button>

            {/* AI Status Indicator */}
            <div 
              title={healthData?.gemini_configured ? "Gemini 2.5 Flash Connected" : "Local Analytical Engine Active"}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-300"
            >
              <span className={`w-2 h-2 rounded-full ${healthData?.gemini_configured ? 'bg-emerald-400 glow-emerald' : 'bg-indigo-400 glow-indigo'}`} />
              <span className="text-[11px] font-mono hidden md:inline">
                {healthData?.gemini_configured ? 'Gemini 2.5' : 'Engine Ready'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
