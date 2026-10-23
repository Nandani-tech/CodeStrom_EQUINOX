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
          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-white border border-apricot-200 text-xs text-stone-800 shadow-xs">
            <Calendar className="w-4 h-4 text-apricot-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-stone-800 font-semibold outline-none cursor-pointer"
            />
          </div>

          {/* Quick Record Sale CTA - Golden Apricot Highlight Button */}
          <button
            onClick={() => setShowSaleModal(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-apricot-500 to-amber-500 hover:from-apricot-600 hover:to-amber-600 shadow-md shadow-apricot-500/30 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.hisab.recordSaleBtn}</span>
          </button>
        </div>
      </div>

      {/* ⚡ 1-Step Quick Add Bar (Fewer Steps for Shopkeepers) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 border border-apricot-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-stone-700">
          <span className="p-1 rounded-lg bg-apricot-100 text-apricot-700">⚡</span>
          <span>{lang === 'hi' ? '1-क्लिक तुरंत बिक्री जोड़ें:' : '1-Tap Quick Sale:'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[20, 50, 100, 200, 500].map((quickAmt) => (
            <button
              key={quickAmt}
              onClick={() => {
                setSaleForm({
                  amount: quickAmt.toString(),
                  payment_mode: 'cash',
                  customer_name: lang === 'hi' ? 'काउंटर नकद' : 'Counter Cash',
                  notes: `Quick ₹${quickAmt}`
                });
                setShowSaleModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black text-apricot-800 bg-apricot-50 hover:bg-apricot-100 border border-apricot-300 hover:border-apricot-400 active:scale-95 transition-all shadow-2xs"
            >
              +₹{quickAmt}
            </button>
          ))}
          <button
            onClick={() => {
              setSaleForm({
                amount: '',
                payment_mode: 'credit',
                customer_name: '',
                notes: ''
              });
              setShowSaleModal(true);
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 active:scale-95 transition-all"
          >
            {lang === 'hi' ? '+ नया उधार' : '+ Add Udhaar'}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Morning Light & Golden Apricots */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Sales */}
        <div className="glass-card p-5 rounded-2xl border-apricot-200 bg-gradient-to-br from-white to-apricot-50/50">
          <span className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wider block">
            {t.hisab.todaySales}
          </span>
          <p className="text-2xl sm:text-3xl font-black text-stone-900 mt-1.5 tracking-tight">
            ₹{sales.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center space-x-1.5 mt-2 text-[11px] text-emerald-700 font-bold">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>{sales.count} {t.hisab.salesCount}</span>
          </div>
        </div>

        {/* Cash in Hand (Galla / Rokad) */}
        <div className="glass-card p-5 rounded-2xl border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider block">
              {t.hisab.cashInHand}
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1.5 tracking-tight">
            ₹{summary.estimated_cash_in_hand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            {lang === 'hi' ? 'दुकान गल्ला (Cash Sales - Cash Expenses)' : 'Physical cash in drawer'}
          </span>
        </div>

        {/* Customer Udhar / Credit */}
        <div className="glass-card p-5 rounded-2xl border-amber-300 bg-gradient-to-br from-amber-50/80 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider block">
              {t.hisab.creditSales}
            </span>
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-1.5 tracking-tight">
            ₹{sales.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-amber-800 font-semibold mt-1 block">
            {lang === 'hi' ? 'आज ग्राहकों को दिया उधार खाता' : 'Customer ledger balance'}
          </span>
        </div>

        {/* Shop Operating Expenses (Kharcha) */}
        <div className="glass-card p-5 rounded-2xl border-apricot-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wider block">
              {t.hisab.shopExpenses}
            </span>
            <div className="p-1.5 rounded-lg bg-apricot-100 text-apricot-700">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900 mt-1.5 tracking-tight">
            ₹{opex.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-stone-500 font-medium mt-1 block">
            {lang === 'hi' ? 'बिजली, भाड़ा, चाय व पैकेजिंग' : 'Freight, electricity, refreshments'}
          </span>
        </div>

      </div>

      {/* Payment Modes Breakdown Bar */}
      <div className="p-4 rounded-2xl bg-white border border-apricot-200 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs">
        <span className="font-bold text-stone-700 flex items-center space-x-2">
          <span>{lang === 'hi' ? 'भुगतान माध्यम अनुसार बिक्री:' : 'Sales Payment Breakdown:'}</span>
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>{t.hisab.cashSales}: ₹{sales.cash.toFixed(2)}</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-apricot-50 border border-apricot-200 text-apricot-900 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-apricot-500" />
            <span>{t.hisab.upiSales}: ₹{sales.upi.toFixed(2)}</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>{t.hisab.creditSales}: ₹{sales.credit.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Main Tables: Sales Records & Confirmed Daily Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Sales Table (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-apricot-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>{t.hisab.todayTransactions} ({sales.items?.length || 0})</span>
            </h3>
            <button
              onClick={() => setShowSaleModal(true)}
              className="text-xs font-bold text-apricot-700 hover:text-apricot-800 bg-apricot-100 hover:bg-apricot-200 px-3 py-1.5 rounded-xl transition-all"
            >
              + {lang === 'hi' ? 'बिक्री जोड़ें' : 'Add Sale'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-stone-400 border-b border-apricot-200">
                <tr>
                  <th className="pb-3 font-bold">{t.hisab.customerName}</th>
                  <th className="pb-3 font-bold">{t.hisab.paymentMode}</th>
                  <th className="pb-3 font-bold">{t.hisab.notes}</th>
                  <th className="pb-3 font-bold text-right">{t.hisab.amount}</th>
                  <th className="pb-3 font-bold text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apricot-100">
                {sales.items && sales.items.length > 0 ? (
                  sales.items.map((sale) => (
                    <tr key={sale.id} className="hover:bg-apricot-50/60 transition-colors">
                      <td className="py-3 font-bold text-stone-800">
                        {sale.customer_name || (lang === 'hi' ? 'काउंटर ग्राहक' : 'Counter Retail')}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          sale.payment_mode === 'cash' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : sale.payment_mode === 'upi'
                            ? 'bg-apricot-100 text-apricot-800 border border-apricot-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {sale.payment_mode === 'credit' ? (lang === 'hi' ? 'उधार' : 'Credit') : sale.payment_mode}
                        </span>
                      </td>
                      <td className="py-3 text-stone-500 font-medium truncate max-w-[160px]">
                        {sale.notes || '-'}
                      </td>
                      <td className="py-3 text-right font-black text-stone-900">
                        ₹{Number(sale.amount).toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteSale(sale.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400 font-medium">
                      {t.hisab.noSalesToday}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operating Expenses on Selected Date (1 col) */}
        <div className="glass-panel p-6 rounded-2xl border border-apricot-200">
          <h3 className="text-sm font-extrabold text-stone-900 mb-4 flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-apricot-600" />
            <span>{lang === 'hi' ? 'आज के दुकान खर्चे' : "Today's Expenses"} ({dailyReceipts.length})</span>
          </h3>

          <div className="space-y-3">
            {dailyReceipts.length > 0 ? (
              dailyReceipts.map((rec) => (
                <div key={rec.id} className="p-3.5 rounded-2xl bg-white border border-apricot-200 shadow-2xs">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-stone-800 truncate max-w-[150px]">{rec.vendor}</span>
                    <span className="font-black text-rose-600">₹{Number(rec.total).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-500 font-medium">
                    <span>{rec.category}</span>
                    <span>{rec.payment_method}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-stone-400 font-medium text-center py-6">
                {lang === 'hi' ? 'इस तारीख को कोई बिल/खर्चा दर्ज नहीं है।' : 'No verified expenses on this date.'}
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Record Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md rounded-3xl bg-white border border-apricot-200 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-apricot-100">
              <h3 className="text-base font-extrabold text-stone-900 flex items-center space-x-2">
                <Plus className="w-5 h-5 text-apricot-600" />
                <span>{lang === 'hi' ? 'नई बिक्री दर्ज करें' : 'Record New Sale'}</span>
              </h3>
              <button 
                onClick={() => setShowSaleModal(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-apricot-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSale} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t.hisab.amount} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-stone-500 text-base font-black">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={saleForm.amount}
                    onChange={(e) => setSaleForm({ ...saleForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl text-lg font-black bg-morning-50 border border-apricot-200 text-stone-900 outline-none focus:ring-2 focus:ring-apricot-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
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
                      className={`py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                        saleForm.payment_mode === m.id
                          ? 'bg-gradient-to-r from-apricot-500 to-amber-500 text-white border-transparent shadow-xs'
                          : 'bg-morning-50 text-stone-600 border-apricot-200 hover:border-apricot-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t.hisab.customerName}
                </label>
                <input
                  type="text"
                  value={saleForm.customer_name}
                  onChange={(e) => setSaleForm({ ...saleForm, customer_name: e.target.value })}
                  placeholder={lang === 'hi' ? 'जैसे: रमेश जी, शर्मा जी (वैकल्पिक)' : 'e.g. Ramesh Kumar'}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-morning-50 border border-apricot-200 text-stone-900 outline-none focus:ring-2 focus:ring-apricot-400 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t.hisab.notes}
                </label>
                <input
                  type="text"
                  value={saleForm.notes}
                  onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                  placeholder={lang === 'hi' ? 'जैसे: 10 किलो आटा + 2 किलो चीनी' : 'Items purchased or description'}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-morning-50 border border-apricot-200 text-stone-900 outline-none focus:ring-2 focus:ring-apricot-400 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-stone-600 hover:text-stone-900 bg-morning-100 font-bold"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSavingSale}
                  className="px-6 py-2.5 rounded-2xl font-black bg-gradient-to-r from-apricot-500 to-amber-500 hover:from-apricot-600 hover:to-amber-600 text-white shadow-md shadow-apricot-500/30 active:scale-95 transition-all disabled:opacity-50"
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
