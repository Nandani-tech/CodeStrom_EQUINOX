import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
  Trash2,
  X,
  CheckSquare,
  Square,
  Boxes,
  Edit2,
  ArrowUpCircle
} from 'lucide-react';
import {
  fetchInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  fetchReceipts,
  confirmStockFromReceipt
} from '../api';

const UNITS = ['kg', 'g', 'litre', 'ml', 'pcs', 'packet', 'box', 'dozen', 'bag', 'bottle'];
const CATEGORIES = ['Grocery', 'FMCG', 'Dairy', 'Fruits & Veg', 'Beverages', 'Snacks', 'Spices', 'Electronics', 'Stationery', 'Other'];

export default function SmartStockView({ lang = 'en', t, onShowToast }) {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showReceiptSync, setShowReceiptSync] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedLineItems, setSelectedLineItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [filterLow, setFilterLow] = useState(false);

  const defaultForm = {
    name: '', name_hindi: '', category: 'Grocery', unit: 'kg',
    current_stock: '', min_stock_alert: '', cost_price: '', selling_price: ''
  };
  const [form, setForm] = useState(defaultForm);

  const load = async () => {
    try {
      const res = await fetchInventory();
      setInventory(res.inventory || []);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      onShowToast({ type: 'error', message: err.message });
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name || '',
      name_hindi: item.name_hindi || '',
      category: item.category || 'Grocery',
      unit: item.unit || 'kg',
      current_stock: item.current_stock?.toString() || '',
      min_stock_alert: item.min_stock_alert?.toString() || '',
      cost_price: item.cost_price?.toString() || '',
      selling_price: item.selling_price?.toString() || ''
    });
    setShowAddModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setIsSaving(true);
    const payload = {
      ...form,
      current_stock: parseFloat(form.current_stock) || 0,
      min_stock_alert: parseFloat(form.min_stock_alert) || 0,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      selling_price: form.selling_price ? parseFloat(form.selling_price) : null
    };
    try {
      if (editItem) {
        await updateInventoryItem(editItem.id, payload);
        onShowToast({ type: 'success', message: lang === 'hi' ? `${form.name} अपडेट हो गया!` : `"${form.name}" updated` });
      } else {
        await createInventoryItem(payload);
        onShowToast({ type: 'success', message: lang === 'hi' ? `${form.name} स्टॉक में जोड़ दिया!` : `"${form.name}" added to inventory` });
      }
      setShowAddModal(false);
      setEditItem(null);
      setForm(defaultForm);
      load();
    } catch (err) {
      onShowToast({ type: 'error', message: err.message });
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(lang === 'hi' ? `"${item.name}" को स्टॉक से हटाएं?` : `Remove "${item.name}" from inventory?`)) return;
    try {
      await deleteInventoryItem(item.id);
      onShowToast({ type: 'success', message: `"${item.name}" removed from inventory` });
      load();
    } catch (err) {
      onShowToast({ type: 'error', message: err.message });
    }
  };

  const openReceiptSync = async () => {
    try {
      const res = await fetchReceipts({ status: 'confirmed', sort_by: 'date', sort_order: 'desc' });
      setReceipts(res.receipts || []);
      setShowReceiptSync(true);
    } catch (err) {
      onShowToast({ type: 'error', message: err.message });
    }
  };

  const handleReceiptSelect = (receipt) => {
    setSelectedReceipt(receipt);
    setSelectedLineItems((receipt.items || []).map((it, idx) => ({ ...it, _idx: idx, _selected: true, qty: it.quantity || 1 })));
  };

  const handleConfirmSync = async () => {
    if (!selectedReceipt || !selectedLineItems.filter(i => i._selected).length) {
      onShowToast({ type: 'warning', message: 'Select at least one item' });
      return;
    }
    setIsSaving(true);
    try {
      const items = selectedLineItems.filter(i => i._selected).map(i => ({
        name: i.name || i.description || 'Unknown Item',
        quantity: parseFloat(i.qty) || 1,
        unit: i.unit || 'pcs',
        cost_price: i.unit_price || i.price || null
      }));
      await confirmStockFromReceipt(selectedReceipt.id, items);
      onShowToast({ type: 'success', message: lang === 'hi' ? `${items.length} सामान बिल से स्टॉक में जोड़े गए!` : `${items.length} items synced to inventory from receipt!` });
      setShowReceiptSync(false);
      setSelectedReceipt(null);
      load();
    } catch (err) {
      onShowToast({ type: 'error', message: err.message });
    } finally { setIsSaving(false); }
  };

  const totalValue = inventory.reduce((s, i) => s + ((i.current_stock || 0) * (i.cost_price || 0)), 0);
  const lowStockItems = inventory.filter(i => i.is_low_stock);
  const displayed = filterLow ? lowStockItems : inventory;

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
            <Package className="w-6 h-6 text-teal-400" />
            <span>{t.stock.title}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t.stock.subtitle}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={openReceiptSync}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-300 border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 transition-all"
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t.stock.confirmReceiptStockBtn}</span>
            <span className="sm:hidden">Sync Bill</span>
          </button>
          <button
            onClick={() => { setEditItem(null); setForm(defaultForm); setShowAddModal(true); }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-lg shadow-teal-600/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t.stock.addItemBtn}</span>
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`glass-card p-5 rounded-2xl cursor-pointer transition-all ${filterLow ? 'border-rose-500/40 bg-rose-950/15' : ''}`}
          onClick={() => setFilterLow(f => !f)}>
          <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block">{t.stock.lowStockCount}</span>
          <p className="text-2xl font-black text-rose-400 mt-1.5">{lowStockItems.length}</p>
          <span className="text-[10px] text-rose-400/80 mt-1 block flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            {filterLow ? (lang === 'hi' ? 'सभी दिखाएं' : 'Show All') : (lang === 'hi' ? 'फ़िल्टर करें' : 'Click to filter')}
          </span>
        </div>
        <div className="glass-card p-5 rounded-2xl">
          <span className="text-[11px] font-bold text-black uppercase tracking-wider block">{t.stock.trackedItems}</span>
          <p className="text-2xl font-black text-black mt-1.5">{inventory.length}</p>
          <span className="text-[10px] text-gray-600 mt-1 block">{lang === 'hi' ? 'कुल ट्रैक किए गए' : 'total tracked'}</span>
        </div>
        <div className="glass-card p-5 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t.stock.totalAssetValue}</span>
          <p className="text-2xl font-black text-teal-400 mt-1.5">₹{(Number(totalValue) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">{lang === 'hi' ? 'मौजूदा माल का मूल्य' : 'current stock value'}</span>
        </div>
      </div>

      {/* Low Stock Banner */}
      {lowStockItems.length > 0 && (
        <div className="flex items-center space-x-3 p-3 rounded-xl bg-rose-50 border border-rose-300">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-black">
              {lang === 'hi' ? `${lowStockItems.length} सामान खत्म होने वाले हैं:` : `${lowStockItems.length} items are running low:`}
            </span>
            <span className="text-xs text-black ml-2 font-medium">
              {lowStockItems.slice(0, 4).map(i => i.name).join(', ')}{lowStockItems.length > 4 ? '...' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      {displayed.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center">
          <Boxes className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {filterLow
              ? (lang === 'hi' ? 'कोई आइटम कम स्टॉक में नहीं है!' : 'No low stock items right now!')
              : (lang === 'hi' ? 'कोई स्टॉक आइटम नहीं जोड़ा गया है।' : 'No inventory items added yet.')}
          </p>
          {!filterLow && (
            <button
              onClick={() => { setEditItem(null); setForm(defaultForm); setShowAddModal(true); }}
              className="mt-4 px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 transition-colors"
            >
              {t.stock.addItemBtn}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-black border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">{t.stock.itemName}</th>
                  <th className="px-4 py-3 text-left font-bold">{t.stock.category}</th>
                  <th className="px-4 py-3 text-right font-bold">{t.stock.currentStock}</th>
                  <th className="px-4 py-3 text-right font-bold">{t.stock.costPrice}</th>
                  <th className="px-4 py-3 text-right font-bold">{t.stock.estMargin}</th>
                  <th className="px-4 py-3 text-center font-bold">{t.stock.status}</th>
                  <th className="px-4 py-3 text-right font-bold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map((item) => {
                  const margin = item.selling_price && item.cost_price
                    ? (((item.selling_price - item.cost_price) / item.selling_price) * 100).toFixed(1)
                    : null;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-black">{item.name}</div>
                        {item.name_hindi && <div className="text-[11px] text-gray-500">{item.name_hindi}</div>}
                      </td>
                      <td className="px-4 py-3 text-black font-medium">{item.category || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${item.is_low_stock ? 'text-rose-600' : 'text-black'}`}>
                          {item.current_stock ?? '—'}
                        </span>
                        <span className="text-gray-500 ml-1">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-black font-medium">
                        {item.cost_price ? `₹${Number(item.cost_price).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {margin !== null ? (
                          <span className={`font-semibold ${parseFloat(margin) >= 15 ? 'text-emerald-400' : parseFloat(margin) >= 5 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {margin}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.is_low_stock ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{t.stock.lowStock}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                            <span>✓ {t.stock.inStock}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-400 hover:bg-teal-500/10 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Package className="w-4 h-4 text-teal-400" />
                <span>{editItem ? (lang === 'hi' ? 'स्टॉक आइटम संपादित करें' : 'Edit Item') : t.stock.addItemBtn}</span>
              </h3>
              <button onClick={() => { setShowAddModal(false); setEditItem(null); setForm(defaultForm); }} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{t.stock.itemName} <span className="text-rose-400">*</span></label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Wheat Flour, Sugar"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{t.stock.hindiName}</label>
                  <input
                    type="text"
                    value={form.name_hindi}
                    onChange={(e) => setForm({ ...form, name_hindi: e.target.value })}
                    placeholder="जैसे: गेहूं का आटा, चीनी"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{t.stock.category}</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{t.stock.unit}</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{t.stock.currentStock}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.current_stock}
                    onChange={(e) => setForm({ ...form, current_stock: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{t.stock.minAlert}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.min_stock_alert}
                    onChange={(e) => setForm({ ...form, min_stock_alert: e.target.value })}
                    placeholder={lang === 'hi' ? 'इतना कम होने पर अलर्ट' : 'alert when below'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{t.stock.costPrice}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.cost_price}
                      onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{t.stock.sellingPrice}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.selling_price}
                      onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); setEditItem(null); setForm(defaultForm); }} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800">
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/25 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? '...' : (editItem ? t.common.save : (lang === 'hi' ? 'जोड़ें' : 'Add Item'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Sync Modal */}
      {showReceiptSync && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-2xl rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <ArrowUpCircle className="w-4 h-4 text-teal-400" />
                <span>{t.stock.receiptSyncTitle}</span>
              </h3>
              <button onClick={() => { setShowReceiptSync(false); setSelectedReceipt(null); }} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!selectedReceipt ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <p className="text-xs text-slate-400">
                  {lang === 'hi' ? 'कौन से बिल से स्टॉक जोड़ना है?' : 'Select a confirmed receipt to sync stock from:'}
                </p>
                {receipts.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">{lang === 'hi' ? 'कोई कन्फर्म किया हुआ बिल नहीं मिला।' : 'No confirmed receipts found.'}</p>
                )}
                {receipts.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleReceiptSelect(r)}
                    disabled={!r.items || r.items.length === 0}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 transition-all text-left disabled:opacity-40"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{r.vendor}</div>
                      <div className="text-[11px] text-slate-400">{r.date} · {r.category} · {r.items?.length || 0} line items</div>
                    </div>
                    <span className="text-xs font-bold text-white">₹{Number(r.total).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  {lang === 'hi' ? `"${selectedReceipt.vendor}" बिल से जोड़ने के लिए आइटम चुनें:` : `Select items from "${selectedReceipt.vendor}" to add to inventory:`}
                </p>
                {selectedLineItems.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedLineItems(prev => prev.map((i, ii) => ii === idx ? { ...i, _selected: !i._selected } : i))}
                      className="text-teal-400 hover:text-teal-300 shrink-0"
                    >
                      {item._selected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-500" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{item.name || item.description || 'Item'}</div>
                      {item.unit_price && <div className="text-[11px] text-slate-400">₹{Number(item.unit_price).toFixed(2)} / unit</div>}
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs text-slate-400">{lang === 'hi' ? 'मात्रा:' : 'Qty:'}</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={item.qty}
                        onChange={(e) => setSelectedLineItems(prev => prev.map((i, ii) => ii === idx ? { ...i, qty: e.target.value } : i))}
                        className="w-16 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <span className="text-xs text-slate-400">{item.unit || 'pcs'}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => setSelectedReceipt(null)} className="text-xs text-slate-400 hover:text-white">
                    ← {lang === 'hi' ? 'दूसरा बिल चुनें' : 'Back'}
                  </button>
                  <button
                    onClick={handleConfirmSync}
                    disabled={isSaving || !selectedLineItems.some(i => i._selected)}
                    className="px-5 py-2 rounded-xl font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/25 active:scale-95 transition-all disabled:opacity-50 text-xs"
                  >
                    {isSaving ? '...' : t.stock.confirmAddSelected}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
