import React, { useEffect, useState } from 'react';
import { 
  X, 
  Receipt, 
  Calendar, 
  Tag, 
  CreditCard, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  History, 
  ExternalLink,
  Edit,
  Trash2
} from 'lucide-react';
import { fetchReceiptById, confirmReceipt } from '../api';

export default function ReceiptDetailModal({ 
  receiptId, 
  onClose, 
  onOpenEdit, 
  onConfirmed, 
  onDelete, 
  onShowToast 
}) {
  const [receipt, setReceipt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!receiptId) return;
    setIsLoading(true);
    fetchReceiptById(receiptId)
      .then(data => {
        setReceipt(data);
        setIsLoading(false);
      })
      .catch(err => {
        setIsLoading(false);
        onShowToast({ type: 'error', message: `Could not load receipt: ${err.message}` });
        onClose();
      });
  }, [receiptId]);

  if (!receiptId) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const res = await confirmReceipt(receiptId);
      setReceipt(res.receipt);
      setIsConfirming(false);
      onShowToast({ type: 'success', message: `Receipt #${receiptId} confirmed to ledger!` });
      if (onConfirmed) onConfirmed();
    } catch (err) {
      setIsConfirming(false);
      onShowToast({ type: 'error', message: err.message || 'Confirmation failed' });
    }
  };

  const isConfirmed = receipt?.status === 'confirmed';
  const isDuplicate = receipt?.status === 'duplicate_flagged';
  const isPending = receipt?.status === 'pending_review';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">
                  {receipt ? receipt.vendor : 'Loading Receipt...'}
                </h3>
                <span className="text-xs font-mono text-slate-400">#{receiptId}</span>
              </div>
              <p className="text-xs text-slate-400">
                {receipt?.date} · {receipt?.category}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {receipt && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isConfirmed 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : isDuplicate
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
              }`}>
                {isConfirmed ? 'Confirmed' : isDuplicate ? 'Duplicate Flagged' : 'Pending Review'}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : receipt ? (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* Main Financial Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Amount</span>
                <p className="text-xl font-extrabold text-white mt-1">
                  ${Number(receipt.total).toFixed(2)}
                </p>
                <span className="text-[10px] text-slate-500">{receipt.currency || 'USD'}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Subtotal / Tax</span>
                <p className="text-sm font-bold text-slate-200 mt-1">
                  Sub: ${receipt.subtotal !== null ? Number(receipt.subtotal).toFixed(2) : '-'}
                </p>
                <span className="text-[10px] text-slate-400">Tax: ${Number(receipt.tax).toFixed(2)}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Confidence</span>
                <p className="text-xl font-extrabold text-indigo-400 mt-1">
                  {Math.round((receipt.confidence_score || 0.95) * 100)}%
                </p>
                <span className="text-[10px] text-slate-400">
                  {receipt.uncertain_fields?.length > 0 
                    ? `${receipt.uncertain_fields.length} uncertain field(s)` 
                    : 'High confidence'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Invoice / Ref</span>
                <p className="text-xs font-mono font-bold text-white mt-1 truncate">
                  {receipt.invoice_number || 'N/A'}
                </p>
                <span className="text-[10px] text-slate-400 truncate block">{receipt.payment_method}</span>
              </div>
            </div>

            {/* Document Preview & Details Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: Line Items & Notes */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Itemized Line Items ({receipt.items?.length || 0})
                </h4>

                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Description</th>
                        <th className="py-2.5 px-2 text-center font-semibold">Qty</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {receipt.items && receipt.items.length > 0 ? (
                        receipt.items.map((itm, i) => (
                          <tr key={i} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3 text-slate-200">
                              <span className="font-medium">{itm.description}</span>
                              {itm.unit_price > 0 && (
                                <span className="block text-[10px] text-slate-500">
                                  @ ${Number(itm.unit_price).toFixed(2)} / ea
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center text-slate-400">{itm.quantity}</td>
                            <td className="py-2 px-3 text-right font-semibold text-white">
                              ${Number(itm.total_price).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-500">
                            No individual line items recorded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {receipt.notes && (
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                    <span className="font-semibold text-slate-400 block mb-1">Business Notes:</span>
                    <p className="text-slate-200">{receipt.notes}</p>
                  </div>
                )}

                {/* Audit Logs */}
                {receipt.audit_logs && receipt.audit_logs.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                      <History className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Audit Trail History</span>
                    </h5>
                    <div className="space-y-1 text-[11px]">
                      {receipt.audit_logs.map((log) => (
                        <div key={log.id} className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-slate-400">
                          <span>{log.details || log.action}</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Receipt Document Viewer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Receipt Document Attachment
                  </h4>
                  {receipt.file_name && (
                    <a
                      href={`/uploads/${receipt.file_name}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      <span>Full view</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="h-[360px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center p-2 relative group">
                  {receipt.file_name ? (
                    <img
                      src={`/uploads/${receipt.file_name}`}
                      alt={`Receipt ${receipt.vendor}`}
                      className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                      onError={(e) => {
                        // If image fails, show PDF / document card
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="hidden flex-col items-center justify-center text-center p-6 space-y-2">
                    <FileText className="w-12 h-12 text-indigo-400" />
                    <p className="text-xs font-semibold text-slate-200">{receipt.file_name || 'Document File'}</p>
                    <a
                      href={`/uploads/${receipt.file_name}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-semibold text-white"
                    >
                      Open Document
                    </a>
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : null}

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div>
            {receipt && onDelete && (
              <button
                type="button"
                onClick={() => { onDelete(receipt.id); onClose(); }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            {receipt && onOpenEdit && (
              <button
                type="button"
                onClick={() => { onOpenEdit(receipt); onClose(); }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Open Edit Form</span>
              </button>
            )}

            {!isConfirmed && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isConfirming}
                className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{isConfirming ? 'Confirming...' : 'Confirm Receipt'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
