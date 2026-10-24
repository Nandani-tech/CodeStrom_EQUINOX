import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  RefreshCw,
  Plus,
  Trash2,
  FileCheck,
  Eye,
  ExternalLink
} from 'lucide-react';
import { uploadReceiptFile, fetchSampleFiles, updateReceipt, confirmReceipt, checkDuplicate } from '../api';

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

export default function UploadView({ onReceiptSaved, onShowToast }) {
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [samples, setSamples] = useState([]);
  
  // Review state after extraction
  const [extractedReceipt, setExtractedReceipt] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [formData, setFormData] = useState(null);
  const [items, setItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);

  // Load sample demo files for 1-click test
  useEffect(() => {
    fetchSampleFiles()
      .then(res => setSamples(res.samples || []))
      .catch(() => {});
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  // 1-Click sample test handler
  const handleSampleClick = async (sample) => {
    try {
      setIsUploading(true);
      setUploadStep(`Loading sample: ${sample.name}...`);
      
      const response = await fetch(sample.url);
      const blob = await response.blob();
      const file = new File([blob], sample.filename, { type: blob.type || 'image/png' });
      
      await handleProcessFile(file);
    } catch (err) {
      setIsUploading(false);
      onShowToast({ type: 'error', message: `Failed to load sample: ${err.message}` });
    }
  };

  const handleProcessFile = async (file) => {
    setIsUploading(true);
    setUploadStep('Uploading receipt document to server...');
    setExtractedReceipt(null);
    setDuplicateWarning(null);

    try {
      // Step simulation for visual delight in hackathon
      setTimeout(() => setUploadStep('Google Gemini extracting vendor, total, tax, and line items...'), 350);
      setTimeout(() => setUploadStep('Running real-time duplicate check against SQLite database...'), 900);

      const result = await uploadReceiptFile(file);
      const receipt = result.receipt;
      
      setExtractedReceipt(receipt);
      setDuplicateWarning(result.duplicate_detection);
      
      // Initialize form data
      setFormData({
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
        status: receipt.status || 'pending_review',
        confidence_score: receipt.confidence_score || 0.95,
        uncertain_fields: receipt.uncertain_fields || []
      });

      setItems(receipt.items && receipt.items.length > 0 ? receipt.items : [
        { description: 'Receipt Item', quantity: 1, unit_price: receipt.total, total_price: receipt.total }
      ]);

      setIsUploading(false);
      onShowToast({
        type: 'success',
        message: `Extracted ${receipt.vendor} ($${receipt.total.toFixed(2)}) via ${result.extracted_by}!`
      });
    } catch (err) {
      setIsUploading(false);
      onShowToast({ type: 'error', message: err.message || 'Error processing receipt' });
    }
  };

  // Form handlers
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
      { description: 'New Item', quantity: 1, unit_price: 0, total_price: 0 }
    ]);
  };

  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleRecalculateTotal = () => {
    const sum = items.reduce((acc, itm) => acc + (parseFloat(itm.total_price) || 0), 0);
    const tax = parseFloat(formData.tax) || 0;
    const tip = parseFloat(formData.tip) || 0;
    const calculatedTotal = Math.round((sum + tax + tip) * 100) / 100;
    setFormData(prev => ({ ...prev, total: calculatedTotal, subtotal: sum }));
    onShowToast({ type: 'info', message: `Recalculated total from items: $${calculatedTotal.toFixed(2)}` });
  };

  const handleSaveReview = async (confirmImmediately = false) => {
    if (!extractedReceipt) return;
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        total: parseFloat(formData.total) || 0,
        subtotal: formData.subtotal !== '' ? parseFloat(formData.subtotal) : null,
        tax: parseFloat(formData.tax) || 0,
        tip: parseFloat(formData.tip) || 0,
        status: confirmImmediately ? 'confirmed' : formData.status,
        uncertain_fields: confirmImmediately ? [] : formData.uncertain_fields,
        items: items.map(itm => ({
          description: itm.description,
          quantity: parseFloat(itm.quantity) || 1,
          unit_price: parseFloat(itm.unit_price) || 0,
          total_price: parseFloat(itm.total_price) || 0,
          category: formData.category
        }))
      };

      await updateReceipt(extractedReceipt.id, payload);

      if (confirmImmediately) {
        await confirmReceipt(extractedReceipt.id);
        onShowToast({ type: 'success', message: `Receipt #${extractedReceipt.id} confirmed to ledger!` });
      } else {
        onShowToast({ type: 'success', message: `Receipt #${extractedReceipt.id} changes saved.` });
      }

      setIsSaving(false);
      if (onReceiptSaved) onReceiptSaved();
      // Reset form view after completion
      setExtractedReceipt(null);
      setFormData(null);
    } catch (err) {
      setIsSaving(false);
      onShowToast({ type: 'error', message: err.message || 'Failed to save receipt' });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-300 text-black">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-black border border-indigo-200 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multimodal OCR & AI Financial Extraction</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">
          Upload Receipt & Invoice Documents
        </h2>
        <p className="text-sm text-black mt-2">
          Drop any receipt image or PDF. Gemini extracts line items, validates totals, detects duplicates, and flags uncertain fields.
        </p>
      </div>

      {/* Upload Box (when not reviewing) */}
      {!formData && (
        <div className="space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative p-10 sm:p-14 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]' 
                : 'border-gray-300 hover:border-indigo-400 bg-white hover:bg-indigo-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf,.svg"
              onChange={handleFileChange}
              className="hidden"
            />

            {isUploading ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <Sparkles className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-black">Extracting Financial Data</h3>
                  <p className="text-xs text-black font-mono mt-1 animate-pulse">{uploadStep}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-600/15 text-indigo-400 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-black">
                    Click to browse or drag and drop receipt file
                  </h3>
                  <p className="text-xs text-black mt-1">
                    Supports PNG, JPG, JPEG, WEBP, and PDF receipts & invoices
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-100 hover:bg-indigo-200 text-black transition-all shadow-md shadow-indigo-600/10"
                >
                  Select File from Computer
                </button>
              </div>
            )}
          </div>

          {/* Quick-Test with Demo Receipts Bar */}
          {samples.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-black flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>1-Click Hackathon Demo Receipts (No Local File Needed)</span>
                </span>
                <span className="text-[11px] text-black">Click any pill to test OCR</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {samples.slice(0, 8).map((sample) => (
                  <button
                    key={sample.filename}
                    onClick={() => handleSampleClick(sample)}
                    disabled={isUploading}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-indigo-50 text-black border border-gray-200 hover:border-indigo-300 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {sample.filename.endsWith('.pdf') ? (
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span>{sample.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editable Review Form after Upload */}
      {formData && extractedReceipt && (
        <div className="glass-panel rounded-3xl border border-gray-200 overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          
          {/* Form Header */}
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-black border border-indigo-200">
                  Receipt #{extractedReceipt.id}
                </span>
                <h3 className="text-lg font-bold text-black">Editable Financial Review Form</h3>
              </div>
              <p className="text-xs text-black mt-0.5">
                Verify extracted values, resolve any flagged fields, and confirm into ledger.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => { setFormData(null); setExtractedReceipt(null); }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 hover:bg-gray-200 text-black transition-colors"
              >
                Upload Another
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Duplicate Flag Alert Banner if matched */}
            {duplicateWarning && duplicateWarning.is_duplicate && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-black space-y-2">
                <div className="flex items-center space-x-2 font-semibold text-sm">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <span>Possible Duplicate Receipt Detected!</span>
                </div>
                <div className="text-xs space-y-1 pl-7 text-black">
                  {duplicateWarning.matches.map((m, idx) => (
                    <p key={idx}>
                      • Matched <strong>Receipt #{m.receipt_id}</strong> ({m.vendor} on {m.date} for ${m.total.toFixed(2)}): <em>{m.reason}</em>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Uncertain Fields Alert */}
            {formData.uncertain_fields && formData.uncertain_fields.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-black flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-sm text-black">
                    Flagged Uncertain or Missing Fields:
                  </p>
                  <p className="mt-1 text-black">
                    The AI detected blurry, estimated, or missing fields: {' '}
                    {formData.uncertain_fields.map((f, i) => (
                      <span key={i} className="inline-block mx-1 px-1.5 py-0.2 rounded bg-amber-100 font-mono text-[10px] text-black border border-amber-200">
                        {f}
                      </span>
                    ))}
                    . Please review and update the highlighted inputs below before confirming.
                  </p>
                </div>
              </div>
            )}

            {/* Main Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Vendor */}
              <div>
                <label className="block text-xs font-semibold text-black mb-1.5">
                Vendor Name <span className="text-black">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => handleInputChange('vendor', e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border text-black outline-none focus:ring-1 focus:ring-indigo-500 ${
                    formData.uncertain_fields.includes('vendor') ? 'border-amber-500 ring-1 ring-amber-500/40' : 'border-gray-300'
                  }`}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-black mb-1.5">
                Transaction Date <span className="text-black">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border text-black outline-none focus:ring-1 focus:ring-indigo-500 ${
                    formData.uncertain_fields.includes('date') ? 'border-amber-500 ring-1 ring-amber-500/40' : 'border-gray-300'
                  }`}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-black mb-1.5">
                  Expense Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-gray-300 text-black outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Total */}
              <div>
                <label className="block text-xs font-semibold text-black mb-1.5">
                Total Amount (USD) <span className="text-black">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-black">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total}
                    onChange={(e) => handleInputChange('total', e.target.value)}
                    className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl text-xs bg-white border font-bold text-black outline-none focus:ring-1 focus:ring-indigo-500 ${
                      formData.uncertain_fields.includes('total') ? 'border-amber-500 ring-1 ring-amber-500/40' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>

              {/* Subtotal */}
              <div>
                <label className="block text-xs font-semibold text-black mb-1.5">
                  Subtotal
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-black">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.subtotal}
                    onChange={(e) => handleInputChange('subtotal', e.target.value)}
                    placeholder="Auto or optional"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl text-xs bg-white border border-gray-300 text-black outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Tax */}
              <div>
                <label className="block text-xs font-semibold text-black mb-1.5">
                  Sales Tax
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-black">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tax}
                    onChange={(e) => handleInputChange('tax', e.target.value)}
                    className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl text-xs bg-white border text-black outline-none focus:ring-1 focus:ring-indigo-500 ${
                      formData.uncertain_fields.includes('tax') ? 'border-amber-500 ring-1 ring-amber-500/40' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>

              {/* Tip */}
              <div>
                <label className="block text-xs font-semibold text-black mb-1.5">
                  Tip / Gratuity
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-black">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tip}
                    onChange={(e) => handleInputChange('tip', e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl text-xs bg-white border border-gray-300 text-black outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-black mb-1.5">
                  Payment Method
                </label>
                <input
                  type="text"
                  value={formData.payment_method}
                  onChange={(e) => handleInputChange('payment_method', e.target.value)}
                  placeholder="e.g. Visa (...1234)"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-gray-300 text-black outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-xs font-semibold text-black mb-1.5">
                  Invoice / Ref Number
                </label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                  placeholder="e.g. INV-2026-001"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-gray-300 text-black outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-black mb-1.5">
                  Review Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-gray-300 text-black outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="pending_review">Pending Review</option>
                  <option value="confirmed">Confirmed (Approved)</option>
                  <option value="duplicate_flagged">Duplicate Flagged</option>
                </select>
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-black mb-1.5">
                  Business Purpose / Notes
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Reason for expense or project allocation"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-gray-300 text-black outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

            </div>

            {/* Line Items Editor Section */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-black">Itemized Line Items</h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleRecalculateTotal}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-black transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Recalculate Total</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-100 hover:bg-indigo-200 text-black transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      placeholder="Item description"
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-white border border-gray-300 text-black outline-none"
                    />
                    <div className="w-20">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-full px-2 py-1.5 rounded-lg text-xs bg-white border border-gray-300 text-black text-center outline-none"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                        placeholder="Price"
                        className="w-full px-2 py-1.5 rounded-lg text-xs bg-white border border-gray-300 text-black text-right outline-none"
                      />
                    </div>
                    <div className="w-24 text-right pr-2 font-semibold text-black text-xs">
                      ${Number(item.total_price || 0).toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="p-1.5 text-black hover:text-black disabled:opacity-20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Preview Link */}
            {extractedReceipt.file_name && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-black">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Document: {extractedReceipt.file_name}</span>
                </div>
                <a
                  href={`/uploads/${extractedReceipt.file_name}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-black hover:text-black underline"
                >
                  <span>Open Document Preview</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => handleSaveReview(false)}
                disabled={isSaving}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-black transition-all disabled:opacity-50"
              >
                Save Changes (Keep Pending)
              </button>

              <button
                type="button"
                onClick={() => handleSaveReview(true)}
                disabled={isSaving}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-black transition-all shadow-lg shadow-emerald-600/10 active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Add to Ledger</span>
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
