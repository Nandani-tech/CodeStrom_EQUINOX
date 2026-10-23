import React, { useState } from 'react';
import { 
  X, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  RefreshCw,
  ExternalLink,
  FileText
} from 'lucide-react';
import { updateReceipt, confirmReceipt } from '../api';

const CATEGORIES = [
  "Software & SaaS",
  "Meals & Entertainment",
  "Travel & Lodging",
  "Office Supplies",
  "Hardware & Equipment",
  "Marketing & Advertising",
  "Utilities & Phone",
  "Professional Services",
  "Other Business Expense"
];

export default function ReceiptEditModal({ 
  receipt, 
  onClose, 
  onSaved, 
  onShowToast 
}) {
  if (!receipt) return null;

  const [formData, setFormData] = useState({
    vendor: receipt.vendor || '',
    date: receipt.date || '',
    total: receipt.total || 0,
    subtotal: receipt.subtotal !== null && receipt.subtotal !== undefined ? receipt.subtotal : '',
    tax: receipt.tax || 0,
    tip: receipt.tip || 0,
    currency: receipt.currency || 'USD',
    category: receipt.category || 'Other Business Expense',
    payment_method: receipt.payment_method || 'Corporate Card',
    invoice_number: receipt.invoice_number || '',
    notes: receipt.notes || '',
    status: receipt.status || 'confirmed',
    uncertain_fields: receipt.uncertain_fields || []
  });

  const [items, setItems] = useState(
    receipt.items && receipt.items.length > 0 
      ? receipt.items 
      : [{ description: 'Expense Item', quantity: 1, unit_price: receipt.total, total_price: receipt.total }]
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        const qty = parseFloat(field === 'quantity' ? value : updated[index].quantity) || 1;
        const unit = parseFloat(field === 'unit_price' ? value : updated[index].unit_price) || 0;
        updated[index].total_price = Math.round(qty * unit * 100) / 100;
      }
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { description: 'New Line Item', quantity: 1, unit_price: 0, total_price: 0 }
    ]);
  };

  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleRecalculateTotal = () => {
    const sum = items.reduce((acc, itm) => acc + (parseFloat(itm.total_price) || 0), 0);
    const tax = parseFloat(formData.tax) || 0;
    const tip = parseFloat(formData.tip) || 0;
    const calc = Math.round((sum + tax + tip) * 100) / 100;
    setFormData(prev => ({ ...prev, total: calc, subtotal: sum }));
    onShowToast({ type: 'info', message: `Recalculated total: $${calc.toFixed(2)}` });
  };

  const handleSave = async (confirmNow = false) => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        total: parseFloat(formData.total) || 0,
        subtotal: formData.subtotal !== '' ? parseFloat(formData.subtotal) : null,
        tax: parseFloat(formData.tax) || 0,
        tip: parseFloat(formData.tip) || 0,
        status: confirmNow ? 'confirmed' : formData.status,
        uncertain_fields: confirmNow ? [] : formData.uncertain_fields,
        items: items.map(itm => ({
          description: itm.description,
          quantity: parseFloat(itm.quantity) || 1,
          unit_price: parseFloat(itm.unit_price) || 0,
          total_price: parseFloat(itm.total_price) || 0,
          category: formData.category
        }))
      };

      await updateReceipt(receipt.id, payload);

      if (confirmNow) {
        await confirmReceipt(receipt.id);
        onShowToast({ type: 'success', message: `Receipt #${receipt.id} confirmed to ledger!` });
      } else {
        onShowToast({ type: 'success', message: `Receipt #${receipt.id} updated successfully.` });
      }

      setIsSaving(false);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setIsSaving(false);
      onShowToast({ type: 'error', message: err.message || 'Failed to update receipt' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">Review & Edit Receipt #{receipt.id}</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {receipt.vendor}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Modify transaction fields, category classification, and line items.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Main Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Vendor Name</label>
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) => handleInputChange('vendor', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Total Amount (USD)</label>
              <input
                type="number"
                step="0.01"
                value={formData.total}
                onChange={(e) => handleInputChange('total', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subtotal</label>
              <input
                type="number"
                step="0.01"
                value={formData.subtotal}
                onChange={(e) => handleInputChange('subtotal', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Sales Tax</label>
              <input
                type="number"
                step="0.01"
                value={formData.tax}
                onChange={(e) => handleInputChange('tax', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Invoice #</label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payment Method</label>
              <input
                type="text"
                value={formData.payment_method}
                onChange={(e) => handleInputChange('payment_method', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ledger Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="confirmed">Confirmed</option>
                <option value="pending_review">Pending Review</option>
                <option value="duplicate_flagged">Duplicate Flagged</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">Line Items</h4>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleRecalculateTotal}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-indigo-400 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Recalculate Total</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Line</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-white outline-none"
                  />
                  <div className="w-20">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="w-full px-2 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-white text-center outline-none"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                      placeholder="Unit Price"
                      className="w-full px-2 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-white text-right outline-none"
                    />
                  </div>
                  <div className="w-24 text-right pr-2 font-semibold text-white text-xs">
                    ${Number(item.total_price || 0).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all disabled:opacity-50"
            >
              Save Changes
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="inline-flex items-center space-x-1.5 px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Approve</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
