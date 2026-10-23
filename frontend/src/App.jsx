import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import ReceiptsTableView from './components/ReceiptsTableView';
import UploadView from './components/UploadView';
import AIAssistantView from './components/AIAssistantView';
import DailyHisabView from './components/DailyHisabView';
import SupplierKhataView from './components/SupplierKhataView';
import SmartStockView from './components/SmartStockView';
import ProfitOverviewView from './components/ProfitOverviewView';
import ReceiptDetailModal from './components/ReceiptDetailModal';
import ReceiptEditModal from './components/ReceiptEditModal';
import Toast from './components/Toast';
import { 
  fetchAnalytics, 
  fetchReceipts, 
  fetchHealth, 
  confirmReceipt, 
  deleteReceipt, 
  resetDemoData 
} from './api';
import { translations } from './i18n/translations';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState('hisab');
  const [analytics, setAnalytics] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [toast, setToast] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang, setLang] = useState('en');

  const t = translations[lang] || translations.en;

  // Status tab filter on Receipts table
  const [selectedStatusTab, setSelectedStatusTab] = useState('all');

  // Modals state
  const [detailReceiptId, setDetailReceiptId] = useState(null);
  const [editReceipt, setEditReceipt] = useState(null);

  const showToast = useCallback((toast) => {
    setToast(toast);
  }, []);

  // Load all app data
  const loadData = useCallback(async () => {
    try {
      const [analyticsRes, receiptsRes, healthRes] = await Promise.all([
        fetchAnalytics(),
        fetchReceipts({ sort_by: 'date', sort_order: 'desc' }),
        fetchHealth().catch(() => ({ status: 'offline', gemini_configured: false }))
      ]);
      setAnalytics(analyticsRes);
      setReceipts(receiptsRes.receipts || []);
      setHealthData(healthRes);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load ShopLedger data:', err);
      setIsLoading(false);
      showToast({ type: 'error', message: 'Failed to connect to backend server. Ensure backend is running on port 5002.' });
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick confirm handler
  const handleQuickConfirm = async (id) => {
    try {
      await confirmReceipt(id);
      showToast({ type: 'success', message: lang === 'hi' ? `रसीद #${id} कन्फर्म हो गई!` : `Receipt #${id} confirmed into verified ledger!` });
      loadData();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to confirm receipt' });
    }
  };

  // Delete handler
  const handleDeleteReceipt = async (id) => {
    if (!window.confirm(lang === 'hi' ? `क्या आप रसीद #${id} को हटाना चाहते हैं?` : `Are you sure you want to delete receipt #${id}?`)) return;
    try {
      await deleteReceipt(id);
      showToast({ type: 'success', message: lang === 'hi' ? `रसीद #${id} हटा दी गई।` : `Receipt #${id} deleted.` });
      loadData();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to delete receipt' });
    }
  };

  // Reseed demo data handler
  const handleResetSeed = async () => {
    setIsResetting(true);
    try {
      const res = await resetDemoData();
      showToast({ type: 'success', message: res.message || 'Demo data successfully reset!' });
      await loadData();
      setIsResetting(false);
    } catch (err) {
      setIsResetting(false);
      showToast({ type: 'error', message: err.message || 'Failed to reset demo data' });
    }
  };

  // Navigation helper with optional status filter pre-selection
  const handleNavigateTab = (tab, statusFilter = null) => {
    setCurrentTab(tab);
    if (statusFilter) {
      setSelectedStatusTab(statusFilter);
    }
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const commonViewProps = { lang, t, onShowToast: showToast };

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-800 font-sans selection:bg-apricot-400 selection:text-white">
      
      {/* Toast notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Left Vertical Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab}
        pendingCount={analytics?.pending_count || 0}
        duplicateCount={analytics?.duplicate_count || 0}
        onResetSeed={handleResetSeed}
        isResetting={isResetting}
        healthData={healthData}
        onOpenUpload={() => handleNavigateTab('upload')}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        lang={lang}
        setLang={setLang}
        t={t}
      />

      {/* Main Content Area (Offset by sidebar width on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-72 transition-all duration-300">
        
        {/* Top Header Navbar */}
        <Navbar 
          currentTab={currentTab}
          pendingCount={analytics?.pending_count || 0}
          duplicateCount={analytics?.duplicate_count || 0}
          onResetSeed={handleResetSeed}
          isResetting={isResetting}
          healthData={healthData}
          onOpenUpload={() => handleNavigateTab('upload')}
          setMobileOpen={setMobileOpen}
          lang={lang}
          setLang={setLang}
          t={t}
        />

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="text-sm font-medium text-slate-400">{t.common.loading}</p>
            </div>
          ) : (
            <>
              {/* === SHOPKEEPER CORE FEATURES === */}
              {currentTab === 'hisab' && (
                <DailyHisabView {...commonViewProps} />
              )}

              {currentTab === 'suppliers' && (
                <SupplierKhataView {...commonViewProps} />
              )}

              {currentTab === 'stock' && (
                <SmartStockView {...commonViewProps} />
              )}

              {currentTab === 'profit' && (
                <ProfitOverviewView {...commonViewProps} />
              )}

              {/* === EXISTING RECEIPT & TOOLS FEATURES === */}
              {currentTab === 'dashboard' && (
                <DashboardView 
                  analytics={analytics}
                  recentReceipts={receipts}
                  onSelectReceipt={(r) => setDetailReceiptId(r.id)}
                  onNavigateTab={handleNavigateTab}
                  onOpenUpload={() => handleNavigateTab('upload')}
                />
              )}

              {currentTab === 'receipts' && (
                <ReceiptsTableView 
                  receipts={receipts}
                  onSelectReceipt={(r) => setEditReceipt(r)}
                  onQuickConfirm={handleQuickConfirm}
                  onDeleteReceipt={handleDeleteReceipt}
                  selectedStatusTab={selectedStatusTab}
                  setSelectedStatusTab={setSelectedStatusTab}
                />
              )}

              {currentTab === 'upload' && (
                <UploadView 
                  onReceiptSaved={loadData}
                  onShowToast={showToast}
                />
              )}

              {currentTab === 'assistant' && (
                <AIAssistantView 
                  onSelectReceiptId={(id) => setDetailReceiptId(id)}
                  onShowToast={showToast}
                  lang={lang}
                  t={t}
                />
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/80 py-5 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-300">ShopLedger</span>
              <span>·</span>
              <span>{lang === 'hi' ? 'छोटे दुकानदारों का AI सहायक' : 'AI Business Assistant for Small Retailers'}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Google Gemini 2.5 Flash</span>
              </span>
              <span>·</span>
              <span>React 19 + Tailwind + Python Flask + SQLite</span>
            </div>
          </div>
        </footer>

      </div>

      {/* Modals */}
      {detailReceiptId && (
        <ReceiptDetailModal
          receiptId={detailReceiptId}
          onClose={() => setDetailReceiptId(null)}
          onOpenEdit={(r) => {
            setDetailReceiptId(null);
            setEditReceipt(r);
          }}
          onConfirmed={loadData}
          onDelete={handleDeleteReceipt}
          onShowToast={showToast}
        />
      )}

      {editReceipt && (
        <ReceiptEditModal
          receipt={editReceipt}
          onClose={() => setEditReceipt(null)}
          onSaved={loadData}
          onShowToast={showToast}
        />
      )}

    </div>
  );
}
