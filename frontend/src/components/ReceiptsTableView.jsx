import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Download, 
  Check, 
  Edit3, 
  Trash2, 
  Eye, 
  AlertTriangle, 
  Copy, 
  ShieldAlert, 
  HelpCircle,
  FileSpreadsheet,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { getCsvExportUrl } from '../api';

const ALL_CATEGORIES = [
  "All Categories",
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

export default function ReceiptsTableView({ 
  receipts = [], 
  onSelectReceipt, 
  onQuickConfirm, 
  onDeleteReceipt,
  selectedStatusTab = 'all',
  setSelectedStatusTab
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filter & sort logic
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      // Status filter
      if (selectedStatusTab !== 'all' && r.status !== selectedStatusTab) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'All Categories' && r.category !== selectedCategory) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const vendor = (r.vendor || '').toLowerCase();
        const invoice = (r.invoice_number || '').toLowerCase();
        const notes = (r.notes || '').toLowerCase();
        const cat = (r.category || '').toLowerCase();
        if (!vendor.includes(term) && !invoice.includes(term) && !notes.includes(term) && !cat.includes(term)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'total') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [receipts, selectedStatusTab, selectedCategory, searchTerm, sortBy, sortOrder]);

  const counts = useMemo(() => {
    return {
      all: receipts.length,
      confirmed: receipts.filter(r => r.status === 'confirmed').length,
      pending_review: receipts.filter(r => r.status === 'pending_review').length,
      duplicate_flagged: receipts.filter(r => r.status === 'duplicate_flagged').length,
    };
  }, [receipts]);

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <span>Business Expense Receipts Ledger</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit-grade persistently stored expense records with verification & duplicate detection
          </p>
        </div>

        {/* CSV Export Button */}
        <div className="flex items-center space-x-2.5">
          <a
            href={getCsvExportUrl(selectedStatusTab === 'all' ? 'confirmed' : selectedStatusTab)}
            download
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export {selectedStatusTab === 'all' ? 'Confirmed' : selectedStatusTab.replace('_', ' ')} (CSV)</span>
          </a>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-slate-800">
        <button
          onClick={() => setSelectedStatusTab('all')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            selectedStatusTab === 'all'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <span>All Receipts</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-700 text-slate-300">
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatusTab('confirmed')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            selectedStatusTab === 'confirmed'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-900'
          }`}
        >
          <span>Confirmed</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300">
            {counts.confirmed}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatusTab('pending_review')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            selectedStatusTab === 'pending_review'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-amber-400 hover:bg-slate-900'
          }`}
        >
          <span>Pending Review</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
            {counts.pending_review}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatusTab('duplicate_flagged')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            selectedStatusTab === 'duplicate_flagged'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm'
              : 'text-slate-400 hover:text-rose-400 hover:bg-slate-900'
          }`}
        >
          <span>Duplicate Flagged</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300">
            {counts.duplicate_flagged}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by vendor, invoice #, notes, or category..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-900/90 border border-slate-800 text-slate-200 focus:border-indigo-500 outline-none appearance-none cursor-pointer"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                {cat}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/90 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold cursor-pointer select-none" onClick={() => toggleSort('id')}>
                  <div className="flex items-center space-x-1">
                    <span>ID & Vendor</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort('category')}>
                  <div className="flex items-center space-x-1">
                    <span>Category</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-3 font-semibold text-right cursor-pointer select-none" onClick={() => toggleSort('total')}>
                  <div className="flex items-center justify-end space-x-1">
                    <span>Total (USD)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-3 font-semibold text-center">Confidence / Uncertain</th>
                <th className="py-3.5 px-3 font-semibold text-center cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  <div className="flex items-center justify-center space-x-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredReceipts.length > 0 ? (
                filteredReceipts.map((r) => {
                  const isConfirmed = r.status === 'confirmed';
                  const isDuplicate = r.status === 'duplicate_flagged';
                  const isPending = r.status === 'pending_review';
                  const uncertainList = Array.isArray(r.uncertain_fields) ? r.uncertain_fields : [];
                  const hasUncertainty = uncertainList.length > 0 || (r.confidence_score && r.confidence_score < 0.85);

                  return (
                    <tr 
                      key={r.id} 
                      className={`hover:bg-slate-900/60 transition-colors group ${
                        isDuplicate ? 'bg-rose-500/[0.02]' : isPending ? 'bg-amber-500/[0.02]' : ''
                      }`}
                    >
                      {/* ID & Vendor */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center text-[10px] font-mono text-slate-400 flex-shrink-0">
                            #{r.id}
                          </span>
                          <div className="min-w-0">
                            <span className="font-semibold text-white block truncate max-w-[180px] group-hover:text-indigo-400 transition-colors">
                              {r.vendor}
                            </span>
                            {r.invoice_number ? (
                              <span className="text-[10px] text-slate-400 block truncate">
                                Inv: {r.invoice_number}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 block truncate">
                                {r.payment_method || 'No Ref'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 text-slate-300 whitespace-nowrap font-mono text-[11px]">
                        {r.date}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 text-slate-300">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/40 text-[11px] font-medium text-slate-200">
                          {r.category}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <span className="font-bold text-white text-sm">
                          ${Number(r.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {r.tax > 0 && (
                          <span className="block text-[10px] text-slate-400">
                            (tax: ${Number(r.tax).toFixed(2)})
                          </span>
                        )}
                      </td>

                      {/* Confidence & Uncertain Fields */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          {/* Confidence score pill */}
                          <div className="flex items-center space-x-1">
                            <span className={`text-[10px] font-mono font-semibold ${
                              r.confidence_score >= 0.95 ? 'text-emerald-400' : r.confidence_score >= 0.85 ? 'text-indigo-400' : 'text-amber-400'
                            }`}>
                              {Math.round((r.confidence_score || 0.9) * 100)}%
                            </span>
                          </div>

                          {/* Flagged uncertain fields */}
                          {hasUncertainty && (
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {uncertainList.slice(0, 2).map((field) => (
                                <span 
                                  key={field} 
                                  title={`Field '${field}' is uncertain or estimated`}
                                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                >
                                  {field}?
                                </span>
                              ))}
                              {uncertainList.length > 2 && (
                                <span className="text-[9px] text-amber-400">+{uncertainList.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          isConfirmed 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : isDuplicate
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/25 animate-pulse'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                        }`}>
                          {isConfirmed && <Check className="w-3 h-3" />}
                          {isDuplicate && <ShieldAlert className="w-3 h-3" />}
                          {isPending && <AlertTriangle className="w-3 h-3" />}
                          <span>{isConfirmed ? 'Confirmed' : isDuplicate ? 'Duplicate Flag' : 'Needs Review'}</span>
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Quick Confirm button if not confirmed */}
                          {!isConfirmed && (
                            <button
                              onClick={() => onQuickConfirm(r.id)}
                              title="Confirm and accept into verified ledger"
                              className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit / Review Form */}
                          <button
                            onClick={() => onSelectReceipt(r)}
                            title="Open editable review form"
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all text-[11px] font-medium"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Review</span>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDeleteReceipt(r.id)}
                            title="Delete receipt record"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <HelpCircle className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-medium text-slate-400">No receipts match the selected filters.</p>
                      {(searchTerm || selectedCategory !== 'All Categories' || selectedStatusTab !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedCategory('All Categories');
                            setSelectedStatusTab('all');
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredReceipts.length} of {receipts.length} total receipts</span>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="flex items-center space-x-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Confirmed</span>
            </span>
            <span className="flex items-center space-x-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Needs Review</span>
            </span>
            <span className="flex items-center space-x-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Duplicate Flag</span>
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
