import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Plus, 
  TrendingUp, 
  Wallet, 
  QrCode, 
  BookOpen, 
  Calendar, 
  Trash2, 
  CheckCircle,
  Receipt,
  X,
  CreditCard,
  Banknote
} from 'lucide-react';
import { fetchDailyHisab, recordSale, deleteSale } from '../api';

export default function DailyHisabView({ lang = 'en', t, onShowToast }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [hisabData, setHisabData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [isSavingSale, setIsSavingSale] = useState(false);

  // New Sale Form
  const [saleForm, setSaleForm] = useState({
    amount: '',
    payment_mode: 'cash',
    customer_name: '',
    notes: ''
  });

  const loadHisab = async (dateStr) => {
    setIsLoading(true);
    try {
      const data = await fetchDailyHisab(dateStr);
      setHisabData(data);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      onShowToast({ type: 'error', message: err.message || 'Failed to load hisab' });
    }
  };

  useEffect(() => {
    loadHisab(selectedDate);
  }, [selectedDate]);

  const handleSaveSale = async (e) => {
    e.preventDefault();
    if (!saleForm.amount || parseFloat(saleForm.amount) <= 0) {
      onShowToast({ type: 'warning', message: 'Please enter a valid sale amount' });
      return;
    }

    setIsSavingSale(true);
    try {
      await recordSale({
        ...saleForm,
        date: selectedDate,
        amount: parseFloat(saleForm.amount)
      });
      onShowToast({ 
        type: 'success', 
        message: lang === 'hi' ? `₹${saleForm.amount} की बिक्री दर्ज हो गई!` : `Sale of ₹${saleForm.amount} recorded!` 
      });
      setShowSaleModal(false);
      setSaleForm({ amount: '', payment_mode: 'cash', customer_name: '', notes: '' });
      setIsSavingSale(false);
      loadHisab(selectedDate);
    } catch (err) {
      setIsSavingSale(false);
      onShowToast({ type: 'error', message: err.message || 'Failed to record sale' });
    }
  };

  const handleDeleteSale = async (saleId) => {
    if (!window.confirm(lang === 'hi' ? 'क्या आप इस बिक्री को हटाना चाहते हैं?' : 'Delete this sale entry?')) return;
    try {
      await deleteSale(saleId);
      onShowToast({ type: 'success', message: 'Sale deleted' });
      loadHisab(selectedDate);
    } catch (err) {
      onShowToast({ type: 'error', message: err.message });
    }
  };

  const sales = hisabData?.sales || { total: 0, cash: 0, upi: 0, credit: 0, count: 0, items: [] };
  const summary = hisabData?.summary || { estimated_cash_in_hand: 0, net_daily_cashflow: 0 };
  const opex = hisabData?.operating_expenses || { total: 0, cash: 0, digital: 0, count: 0 };
  const dailyReceipts = hisabData?.daily_receipts || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header & Date Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Calculator className="w-6 h-6 text-indigo-400" />
            <span>{t.hisab.title}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t.hisab.subtitle}</p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Date Picker */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer"
            />
          </div>

          {/* Quick Record Sale CTA */}
          <button
            onClick={() => setShowSaleModal(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t.hisab.recordSaleBtn}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Sales */}
        <div className="glass-card p-5 rounded-2xl border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {t.hisab.todaySales}
          </span>
          <p className="text-2xl font-black text-white mt-1.5">
            ₹{sales.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center space-x-1 mt-1.5 text-[11px] text-emerald-400 font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{sales.count} {t.hisab.salesCount}</span>
          </div>
        </div>

        {/* Cash in Hand (Galla / Rokad) */}
        <div className="glass-card p-5 rounded-2xl border-emerald-500/30 bg-emerald-950/15">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
              {t.hisab.cashInHand}
            </span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300 mt-1.5">
            ₹{summary.estimated_cash_in_hand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-emerald-400/80 mt-1 block">
            {lang === 'hi' ? 'नकद गल्ला (Cash Sales - Cash Expenses)' : 'Physical cash available in drawer'}
          </span>
        </div>

        {/* Customer Udhar / Credit */}
        <div className="glass-card p-5 rounded-2xl border-amber-500/30 bg-amber-950/15">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
              {t.hisab.creditSales}
            </span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300 mt-1.5">
            ₹{sales.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-amber-400/80 mt-1 block">
            {lang === 'hi' ? 'आज ग्राहकों को दिया उधार खाता' : 'Recorded customer ledger balance'}
          </span>
        </div>

        {/* Shop Operating Expenses */}
        <div className="glass-card p-5 rounded-2xl border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {t.hisab.shopExpenses}
          </span>
          <p className="text-2xl font-black text-white mt-1.5">
            ₹{opex.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {lang === 'hi' ? 'बिजली, भाड़ा, चाय व पैकेजिंग' : 'Electricity, freight, refreshments'}
          </span>
        </div>

      </div>

      {/* Payment Modes Breakdown Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <span className="font-semibold text-slate-300 flex items-center space-x-2">
          <span>{lang === 'hi' ? 'भुगतान माध्यम अनुसार बिक्री:' : 'Sales Payment Breakdown:'}</span>
        </span>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>{t.hisab.cashSales}: ₹{sales.cash.toFixed(2)}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-indigo-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <span>{t.hisab.upiSales}: ₹{sales.upi.toFixed(2)}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>{t.hisab.creditSales}: ₹{sales.credit.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Main Tables: Sales Records & Confirmed Daily Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Sales Table (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>{t.hisab.todayTransactions} ({sales.items?.length || 0})</span>
            </h3>
            <button
              onClick={() => setShowSaleModal(true)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              + {lang === 'hi' ? 'जोड़ें' : 'Add Sale'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">{t.hisab.customerName}</th>
                  <th className="pb-3 font-semibold">{t.hisab.paymentMode}</th>
                  <th className="pb-3 font-semibold">{t.hisab.notes}</th>
                  <th className="pb-3 font-semibold text-right">{t.hisab.amount}</th>
                  <th className="pb-3 font-semibold text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sales.items && sales.items.length > 0 ? (
                  sales.items.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-3 font-medium text-white">
                        {sale.customer_name || (lang === 'hi' ? 'काउंटर ग्राहक' : 'Counter Retail')}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          sale.payment_mode === 'cash' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : sale.payment_mode === 'upi'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {sale.payment_mode === 'credit' ? (lang === 'hi' ? 'उधार' : 'Credit') : sale.payment_mode}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 truncate max-w-[160px]">
                        {sale.notes || '-'}
                      </td>
                      <td className="py-3 text-right font-bold text-white">
                        ₹{Number(sale.amount).toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteSale(sale.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      {t.hisab.noSalesToday}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operating Expenses on Selected Date (1 col) */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-indigo-400" />
            <span>{lang === 'hi' ? 'आज के दुकान खर्चे' : "Today's Expenses"} ({dailyReceipts.length})</span>
          </h3>

          <div className="space-y-3">
            {dailyReceipts.length > 0 ? (
              dailyReceipts.map((rec) => (
                <div key={rec.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-white truncate max-w-[150px]">{rec.vendor}</span>
                    <span className="font-bold text-rose-400">₹{Number(rec.total).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{rec.category}</span>
                    <span>{rec.payment_method}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">
                {lang === 'hi' ? 'इस तारीख को कोई बिल/खर्चा दर्ज नहीं है।' : 'No verified expenses on this date.'}
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Record Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="glass-panel w-full max-w-md rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'hi' ? 'नई बिक्री दर्ज करें' : 'Record New Sale'}</span>
              </h3>
              <button 
                onClick={() => setShowSaleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSale} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {t.hisab.amount} <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={saleForm.amount}
                    onChange={(e) => setSaleForm({ ...saleForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl text-base font-black bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {t.hisab.paymentMode}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: lang === 'hi' ? 'नकद (Cash)' : 'Cash' },
                    { id: 'upi', label: 'UPI / Online' },
                    { id: 'credit', label: lang === 'hi' ? 'उधार (Credit)' : 'Udhar' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSaleForm({ ...saleForm, payment_mode: m.id })}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        saleForm.payment_mode === m.id
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {t.hisab.customerName}
                </label>
                <input
                  type="text"
                  value={saleForm.customer_name}
                  onChange={(e) => setSaleForm({ ...saleForm, customer_name: e.target.value })}
                  placeholder={lang === 'hi' ? 'जैसे: रमेश जी, शर्मा जी (वैकल्पिक)' : 'e.g. Ramesh Kumar'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {t.hisab.notes}
                </label>
                <input
                  type="text"
                  value={saleForm.notes}
                  onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                  placeholder={lang === 'hi' ? 'जैसे: 10 किलो आटा + 2 किलो चीनी' : 'Items purchased or description'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSavingSale}
                  className="px-5 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSavingSale ? 'Saving...' : t.hisab.saveSale}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
