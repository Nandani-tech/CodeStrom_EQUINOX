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

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (selectedStatusTab !== 'all' && r.status !== selectedStatusTab) return false;
      if (selectedCategory !== 'All Categories' && r.category !== selectedCategory) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const vendor = (r.vendor || '').toLowerCase();
        const invoice = (r.invoice_number || '').toLowerCase();
        const notes = (r.notes || '').toLowerCase();
        const cat = (r.category || '').toLowerCase();
        if (!vendor.includes(term) && !invoice.includes(term) && !notes.includes(term) && !cat.includes(term)) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === 'total') { valA = Number(valA || 0); valB = Number(valB || 0); }
      else { valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase(); }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [receipts, selectedStatusTab, selectedCategory, searchTerm, sortBy, sortOrder]);

  const counts = useMemo(() => ({
    all: receipts.length,
    confirmed: receipts.filter(r => r.status === 'confirmed').length,
    pending_review: receipts.filter(r => r.status === 'pending_review').length,
    duplicate_flagged: receipts.filter(r => r.status === 'duplicate_flagged').length,
  }), [receipts]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('desc'); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-600" />
            <span>Business Expense Receipts Ledger</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Audit-grade persistently stored expense records with verification &amp; duplicate detection
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <a
            href={getCsvExportUrl(selectedStatusTab === 'all' ? 'confirmed' : selectedStatusTab)}
            download
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export {selectedStatusTab === 'all' ? 'Confirmed' : selectedStatusTab.replace('_', ' ')} (CSV)</span>
          </a>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-gray-200">
        {[
          { key: 'all', label: 'All Receipts', count: counts.all, active: 'bg-gray-100 text-gray-800 border border-gray-300', badge: 'bg-gray-200 text-gray-600', hover: 'hover:text-gray-700' },
          { key: 'confirmed', label: 'Confirmed', count: counts.confirmed, active: 'bg-emerald-50 text-emerald-700 border border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', hover: 'hover:text-emerald-600' },
          { key: 'pending_review', label: 'Pending Review', count: counts.pending_review, active: 'bg-amber-50 text-amber-700 border border-amber-200', badge: 'bg-amber-100 text-amber-700', hover: 'hover:text-amber-600' },
          { key: 'duplicate_flagged', label: 'Duplicate Flagged', count: counts.duplicate_flagged, active: 'bg-rose-50 text-rose-700 border border-rose-200', badge: 'bg-rose-100 text-rose-700', hover: 'hover:text-rose-600' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatusTab(tab.key)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              selectedStatusTab === tab.key
                ? `${tab.active} shadow-sm`
                : `text-gray-500 ${tab.hover} hover:bg-gray-100`
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${tab.badge}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by vendor, invoice #, notes, or category..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-white border border-gray-300 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-gray-800 placeholder-gray-400 outline-none transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-700">
              Clear
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-white border border-gray-300 text-gray-700 focus:border-amber-400 outline-none appearance-none cursor-pointer"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-white text-gray-800">{cat}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-gray-500 bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  { label: 'ID & Vendor', col: 'id', align: '' },
                  { label: 'Date', col: 'date', align: '' },
                  { label: 'Category', col: 'category', align: '' },
                  { label: 'Total (₹)', col: 'total', align: 'text-right' },
                ].map(({ label, col, align }) => (
                  <th key={col} className={`py-3.5 px-4 font-semibold cursor-pointer select-none ${align}`} onClick={() => toggleSort(col)}>
                    <div className={`flex items-center space-x-1 ${align === 'text-right' ? 'justify-end' : ''}`}>
                      <span>{label}</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    </div>
                  </th>
                ))}
                <th className="py-3.5 px-3 font-semibold text-center">Confidence</th>
                <th className="py-3.5 px-3 font-semibold text-center cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  <div className="flex items-center justify-center space-x-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
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
                      className={`hover:bg-gray-50 transition-colors group ${
                        isDuplicate ? 'bg-rose-50/50' : isPending ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* ID & Vendor */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-mono text-gray-500 flex-shrink-0">
                            #{r.id}
                          </span>
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-800 block truncate max-w-[180px] group-hover:text-amber-700 transition-colors">
                              {r.vendor}
                            </span>
                            <span className="text-[10px] text-gray-400 block truncate">
                              {r.invoice_number ? `Inv: ${r.invoice_number}` : (r.payment_method || 'No Ref')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 text-gray-600 whitespace-nowrap font-mono text-[11px]">{r.date}</td>

                      {/* Category */}
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 text-[11px] font-medium text-gray-700">
                          {r.category}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <span className="font-bold text-gray-800 text-sm">
                          ₹{Number(r.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {r.tax > 0 && (
                          <span className="block text-[10px] text-gray-400">(tax: ₹{Number(r.tax).toFixed(2)})</span>
                        )}
                      </td>

                      {/* Confidence */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <span className={`text-[10px] font-mono font-semibold ${
                            r.confidence_score >= 0.95 ? 'text-emerald-600' : r.confidence_score >= 0.85 ? 'text-amber-600' : 'text-rose-500'
                          }`}>
                            {Math.round((r.confidence_score || 0.9) * 100)}%
                          </span>
                          {hasUncertainty && (
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {uncertainList.slice(0, 2).map((field) => (
                                <span key={field} title={`Field '${field}' is uncertain`}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                  {field}?
                                </span>
                              ))}
                              {uncertainList.length > 2 && <span className="text-[9px] text-amber-600">+{uncertainList.length - 2}</span>}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          isConfirmed ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isDuplicate ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isConfirmed && <Check className="w-3 h-3" />}
                          {isDuplicate && <ShieldAlert className="w-3 h-3" />}
                          {isPending && <AlertTriangle className="w-3 h-3" />}
                          <span>{isConfirmed ? 'Confirmed' : isDuplicate ? 'Duplicate Flag' : 'Needs Review'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {!isConfirmed && (
                            <button onClick={() => onQuickConfirm(r.id)} title="Confirm"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white transition-all border border-emerald-200">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => onSelectReceipt(r)} title="Review"
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-amber-500 text-gray-600 hover:text-white transition-all text-[11px] font-medium border border-gray-200 hover:border-amber-500">
                            <Edit3 className="w-3 h-3" />
                            <span>Review</span>
                          </button>
                          <button onClick={() => onDeleteReceipt(r.id)} title="Delete"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <HelpCircle className="w-8 h-8 text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">No receipts match the selected filters.</p>
                      {(searchTerm || selectedCategory !== 'All Categories' || selectedStatusTab !== 'all') && (
                        <button onClick={() => { setSearchTerm(''); setSelectedCategory('All Categories'); setSelectedStatusTab('all'); }}
                          className="text-xs text-amber-600 hover:text-amber-700 underline">
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

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>Showing {filteredReceipts.length} of {receipts.length} total receipts</span>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="flex items-center space-x-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-400" /><span>Confirmed</span></span>
            <span className="flex items-center space-x-1 text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400" /><span>Needs Review</span></span>
            <span className="flex items-center space-x-1 text-rose-600"><span className="w-2 h-2 rounded-full bg-rose-400" /><span>Duplicate Flag</span></span>
          </div>
        </div>
      </div>

    </div>
  );
}
