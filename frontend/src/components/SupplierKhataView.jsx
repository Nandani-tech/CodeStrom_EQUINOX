import React, { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  Phone,
  AlertTriangle,
  Clock,
  CreditCard,
  Banknote,
  X,
  Edit2,
  Trash2,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Building2
} from 'lucide-react';
import {
  fetchSuppliers,
  createSupplier,
  deleteSupplier,
  recordSupplierTransaction
} from '../api';

const CATEGORIES = ['Grocery', 'FMCG', 'Dairy', 'Fruits & Veg', 'Beverages', 'Snacks', 'Spices', 'Electronics', 'Stationery', 'Other'];

export default function SupplierKhataView({ lang = 'en', t, onShowToast }) {
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(null); // supplier object
  const [expandedId, setExpandedId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [addForm, setAddForm] = useState({
    name: '', contact_person: '', phone: '', category: 'Grocery',
    credit_limit: '', payment_terms_days: '30', notes: ''
  });

  const [txForm, setTxForm] = useState({ amount: '', type: 'payment', notes: '', due_date: '' });

  const loadSuppliers = async () => {
    try {
      const res = await fetchSuppliers();
      setSuppliers(res.suppliers || []);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      onShowToast({ type: 'error', message: err.message || 'Failed to load suppliers' });
    }
  };

  useEffect(() => { loadSuppliers(); }, []);

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setIsSaving(true);
    try {
      await createSupplier({ ...addForm });
      onShowToast({ type: 'success', message: lang === 'hi' ? `${addForm.name} को सप्लायर खाते में जोड़ दिया!` : `Supplier "${addForm.name}" added successfully!` });
      setShowAddModal(false);
      setAddForm({ name: '', contact_person: '', phone: '', category: 'Grocery', credit_limit: '', payment_terms_days: '30', notes: '' });
      loadSuppliers();
    } catch (err) {
      onShowToast({ type: 'error', message: err.message });
    } finally { setIsSaving(false); }
  };

  const handleRecordTx = async (e) => {
    e.preventDefault();
    if (!txForm.amount || parseFloat(txForm.amount) <= 0) {
      onShowToast({ type: 'warning', message: 'Please enter a valid amount' });
      return;
    }
    setIsSaving(true);
    try {
      await recordSupplierTransaction(showTxModal.id, {
        ...txForm,
        amount: parseFloat(txForm.amount)
      });
      const msgEn = txForm.type === 'payment'
        ? `Payment of ₹${txForm.amount} recorded for ${showTxModal.name}`
        : `Purchase of ₹${txForm.amount} from ${showTxModal.name} added`;
      const msgHi = txForm.type === 'payment'
        ? `${showTxModal.name} को ₹${txForm.amount} का भुगतान दर्ज हो गया!`
        : `${showTxModal.name} से ₹${txForm.amount} की माल खरीद जोड़ी गई!`;
      onShowToast({ type: 'success', message: lang === 'hi' ? msgHi : msgEn });
      setShowTxModal(null);
      setTxForm({ amount: '', type: 'payment', notes: '', due_date: '' });
      loadSuppliers();
    } catch (err) {
      onShowToast({ type: 'error', message: err.message });
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (sup) => {
    if (!window.confirm(lang === 'hi' ? `क्या आप "${sup.name}" सप्लायर को हटाना चाहते हैं?` : `Delete supplier "${sup.name}"?`)) return;
    try {
      await deleteSupplier(sup.id);
      onShowToast({ type: 'success', message: `Supplier "${sup.name}" deleted` });
      loadSuppliers();
    } catch (err) {
      onShowToast({ type: 'error', message: err.message });
    }
  };

  const totalDues = suppliers.reduce((s, x) => s + (x.balance_due || 0), 0);
  const overdueCount = suppliers.filter(s => s.is_overdue).length;
  const dueSoonCount = suppliers.filter(s => s.is_due_soon && !s.is_overdue).length;

  const getDueStatus = (sup) => {
    if (!sup.balance_due || sup.balance_due <= 0) return null;
    if (sup.is_overdue) return 'overdue';
    if (sup.is_due_soon) return 'soon';
    return 'ok';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Store className="w-6 h-6 text-amber-400" />
            <span>{t.suppliers.title}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t.suppliers.subtitle}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-600/25 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t.suppliers.addSupplierBtn}</span>
        </button>
      </div>

      {/* KPI Banner */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t.suppliers.totalDues}</span>
          <p className="text-2xl font-black text-rose-400 mt-1.5">₹{totalDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">{suppliers.length} {lang === 'hi' ? 'सप्लायर' : 'suppliers'}</span>
        </div>
        <div className={`glass-card p-5 rounded-2xl ${overdueCount > 0 ? 'border-rose-500/30 bg-rose-950/15' : ''}`}>
          <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block">{t.suppliers.overdueAlert}</span>
          <p className="text-2xl font-black text-rose-400 mt-1.5">{overdueCount}</p>
          <span className="text-[10px] text-rose-400/80 mt-1 block">{lang === 'hi' ? 'सप्लायर — भुगतान बकाया' : 'suppliers need immediate payment'}</span>
        </div>
        <div className={`glass-card p-5 rounded-2xl ${dueSoonCount > 0 ? 'border-amber-500/30 bg-amber-950/15' : ''}`}>
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">{t.suppliers.dueSoonAlert}</span>
          <p className="text-2xl font-black text-amber-400 mt-1.5">{dueSoonCount}</p>
          <span className="text-[10px] text-amber-400/80 mt-1 block">{lang === 'hi' ? '7 दिन में देना है' : 'due within 7 days'}</span>
        </div>
      </div>

      {/* Suppliers List */}
      {suppliers.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">{t.suppliers.noSuppliers}</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors"
          >
            {t.suppliers.addSupplierBtn}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((sup) => {
            const dueStatus = getDueStatus(sup);
            const isExpanded = expandedId === sup.id;

            return (
              <div
                key={sup.id}
                className={`glass-panel rounded-2xl border transition-all duration-200 ${
                  dueStatus === 'overdue'
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : dueStatus === 'soon'
                    ? 'border-amber-500/30 bg-amber-950/10'
                    : 'border-slate-800'
                }`}
              >
                {/* Main Row */}
                <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : sup.id)}>
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                      dueStatus === 'overdue' ? 'bg-rose-600 text-white' :
                      dueStatus === 'soon' ? 'bg-amber-600 text-white' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {sup.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className="font-bold text-sm text-white truncate">{sup.name}</span>
                        {dueStatus === 'overdue' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{t.suppliers.overdueAlert}</span>
                          </span>
                        )}
                        {dueStatus === 'soon' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                            <Clock className="w-3 h-3" />
                            <span>{t.suppliers.dueSoonAlert}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-3">
                        {sup.category && <span>{sup.category}</span>}
                        {sup.contact_person && <span>• {sup.contact_person}</span>}
                        {sup.phone && (
                          <a
                            href={`tel:${sup.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{sup.phone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-slate-400">{t.suppliers.balanceDue}</div>
                      <div className={`text-sm font-black ${(sup.balance_due || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ₹{(sup.balance_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowTxModal(sup); setTxForm({ amount: '', type: 'payment', notes: '', due_date: '' }); }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                      >
                        {lang === 'hi' ? 'भुगतान' : 'Pay / Buy'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(sup); }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-800/60 pt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div className="bg-slate-900 rounded-xl p-3">
                        <span className="text-slate-400 block mb-1">{t.suppliers.totalPurchased}</span>
                        <span className="font-black text-white">₹{(sup.total_purchased || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="bg-slate-900 rounded-xl p-3">
                        <span className="text-slate-400 block mb-1">{t.suppliers.totalPaid}</span>
                        <span className="font-black text-emerald-400">₹{(sup.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="bg-slate-900 rounded-xl p-3">
                        <span className="text-slate-400 block mb-1">{t.suppliers.balanceDue}</span>
                        <span className={`font-black ${(sup.balance_due || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ₹{(sup.balance_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bg-slate-900 rounded-xl p-3">
                        <span className="text-slate-400 block mb-1">{t.suppliers.nextDueDate}</span>
                        <span className={`font-bold ${dueStatus === 'overdue' ? 'text-rose-400' : dueStatus === 'soon' ? 'text-amber-400' : 'text-slate-300'}`}>
                          {sup.next_due_date ? new Date(sup.next_due_date).toLocaleDateString('en-IN') : '—'}
                        </span>
                      </div>
                    </div>
                    {sup.notes && (
                      <p className="mt-3 text-[11px] text-slate-400 bg-slate-900/60 rounded-xl px-3 py-2">{sup.notes}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>{lang === 'hi' ? 'नया सप्लायर जोड़ें' : 'Add New Supplier'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">
                    {lang === 'hi' ? 'सप्लायर / दुकान का नाम' : 'Supplier / Shop Name'} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder={lang === 'hi' ? 'जैसे: शर्मा होलसेल, राम ट्रेडिंग' : 'e.g. Sharma Wholesale, Ram Traders'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{lang === 'hi' ? 'संपर्क व्यक्ति' : 'Contact Person'}</label>
                  <input
                    type="text"
                    value={addForm.contact_person}
                    onChange={(e) => setAddForm({ ...addForm, contact_person: e.target.value })}
                    placeholder={lang === 'hi' ? 'जैसे: रमेश भाई' : 'e.g. Ramesh Bhai'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{t.suppliers.phone}</label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{t.stock.category}</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{lang === 'hi' ? 'भुगतान की शर्त (दिन)' : 'Payment Terms (Days)'}</label>
                  <input
                    type="number"
                    min="1"
                    value={addForm.payment_terms_days}
                    onChange={(e) => setAddForm({ ...addForm, payment_terms_days: e.target.value })}
                    placeholder="30"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">{lang === 'hi' ? 'नोट्स' : 'Notes'}</label>
                  <input
                    type="text"
                    value={addForm.notes}
                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                    placeholder={lang === 'hi' ? 'कोई खास बात...' : 'Any special notes...'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800">
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/25 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? '...' : (lang === 'hi' ? 'सप्लायर जोड़ें' : 'Add Supplier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment / Purchase Transaction Modal */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{t.suppliers.paymentModalTitle}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{showTxModal.name}</p>
              </div>
              <button onClick={() => setShowTxModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs bg-slate-900 rounded-xl p-3 border border-slate-800">
              <span className="text-slate-400">{t.suppliers.balanceDue}</span>
              <span className="font-black text-rose-400 text-sm">₹{(showTxModal.balance_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <form onSubmit={handleRecordTx} className="space-y-4 text-xs">
              {/* Transaction Type Toggle */}
              <div>
                <label className="block font-semibold text-slate-300 mb-2">{t.suppliers.paymentType}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'payment' })}
                    className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border font-semibold transition-all ${
                      txForm.type === 'payment'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    <span>{lang === 'hi' ? 'भुगतान (बाकी घटाएं)' : 'Payment (Reduce Due)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'purchase' })}
                    className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border font-semibold transition-all ${
                      txForm.type === 'purchase'
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>{lang === 'hi' ? 'माल खरीद (बाकी जोड़ें)' : 'Purchase (Add Due)'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">{t.suppliers.amountToPay} <span className="text-rose-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl text-base font-black bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">{lang === 'hi' ? 'नई देय तिथि (वैकल्पिक)' : 'New Due Date (optional)'}</label>
                <input
                  type="date"
                  value={txForm.due_date}
                  onChange={(e) => setTxForm({ ...txForm, due_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">{lang === 'hi' ? 'नोट्स' : 'Notes'}</label>
                <input
                  type="text"
                  value={txForm.notes}
                  onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                  placeholder={lang === 'hi' ? 'जैसे: आटा 5 बोरी, UPI भुगतान' : 'e.g. 5 bags flour, paid via UPI'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowTxModal(null)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800">
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-5 py-2 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all disabled:opacity-50 ${
                    txForm.type === 'payment'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
                  }`}
                >
                  {isSaving ? '...' : (txForm.type === 'payment' ? t.suppliers.recordPaymentBtn : t.suppliers.recordPurchaseBtn)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
