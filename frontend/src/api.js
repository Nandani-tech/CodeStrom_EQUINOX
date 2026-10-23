/**
 * ShopLedger API Service Client (Shopkeeper Edition)
 */

const API_BASE = '/api';

function jsonStringify(obj) {
  return JSON.stringify(obj, (k, v) => (v === undefined ? null : v));
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch health status');
  return res.json();
}

// ==============================================================================
// 1. DAILY HISAB
// ==============================================================================

export async function fetchDailyHisab(dateStr = null) {
  const url = dateStr ? `${API_BASE}/hisab/daily?date=${dateStr}` : `${API_BASE}/hisab/daily`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch daily hisab');
  return res.json();
}

export async function recordSale(saleData) {
  const res = await fetch(`${API_BASE}/hisab/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify(saleData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to record sale');
  }
  return res.json();
}

export async function deleteSale(saleId) {
  const res = await fetch(`${API_BASE}/hisab/sales/${saleId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete sale #${saleId}`);
  return res.json();
}

// ==============================================================================
// 2. SUPPLIER KHATA
// ==============================================================================

export async function fetchSuppliers() {
  const res = await fetch(`${API_BASE}/suppliers`);
  if (!res.ok) throw new Error('Failed to fetch suppliers');
  return res.json();
}

export async function fetchSupplierById(id) {
  const res = await fetch(`${API_BASE}/suppliers/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch supplier #${id}`);
  return res.json();
}

export async function createSupplier(data) {
  const res = await fetch(`${API_BASE}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create supplier');
  }
  return res.json();
}

export async function updateSupplier(id, data) {
  const res = await fetch(`${API_BASE}/suppliers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify(data),
  });
  if (!res.ok) throw new Error('Failed to update supplier');
  return res.json();
}

export async function deleteSupplier(id) {
  const res = await fetch(`${API_BASE}/suppliers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete supplier');
  return res.json();
}

export async function recordSupplierTransaction(supplierId, txData) {
  const res = await fetch(`${API_BASE}/suppliers/${supplierId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify(txData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to record transaction');
  }
  return res.json();
}

// ==============================================================================
// 3. SMART STOCK
// ==============================================================================

export async function fetchInventory() {
  const res = await fetch(`${API_BASE}/inventory`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export async function fetchInventoryItem(id) {
  const res = await fetch(`${API_BASE}/inventory/${id}`);
  if (!res.ok) throw new Error('Failed to fetch inventory item');
  return res.json();
}

export async function createInventoryItem(data) {
  const res = await fetch(`${API_BASE}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add item');
  }
  return res.json();
}

export async function updateInventoryItem(id, data) {
  const res = await fetch(`${API_BASE}/inventory/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify(data),
  });
  if (!res.ok) throw new Error('Failed to update inventory item');
  return res.json();
}

export async function deleteInventoryItem(id) {
  const res = await fetch(`${API_BASE}/inventory/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete item');
  return res.json();
}

export async function confirmStockFromReceipt(receiptId, items) {
  const res = await fetch(`${API_BASE}/inventory/confirm-from-receipt/${receiptId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify({ items }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to sync stock from receipt');
  }
  return res.json();
}

export async function fetchLowStockAlerts() {
  const res = await fetch(`${API_BASE}/inventory/alerts`);
  if (!res.ok) throw new Error('Failed to fetch stock alerts');
  return res.json();
}

// ==============================================================================
// 4. PROFIT OVERVIEW & SMART ACTIONS
// ==============================================================================

export async function fetchProfitOverview(period = 'month', startDate = null, endDate = null) {
  const query = new URLSearchParams({ period });
  if (startDate) query.set('start_date', startDate);
  if (endDate) query.set('end_date', endDate);
  const res = await fetch(`${API_BASE}/profit-overview?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch profit overview');
  return res.json();
}

export async function fetchSmartActions() {
  const res = await fetch(`${API_BASE}/smart-actions`);
  if (!res.ok) throw new Error('Failed to fetch smart actions');
  return res.json();
}

// ==============================================================================
// 5. RECEIPTS & AI ASSISTANT (PRESERVED)
// ==============================================================================

export async function fetchReceipts(params = {}) {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.category && params.category !== 'all') query.set('category', params.category);
  if (params.search) query.set('search', params.search);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  if (params.sort_order) query.set('sort_order', params.sort_order);

  const res = await fetch(`${API_BASE}/receipts?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch receipts');
  return res.json();
}

export async function fetchReceiptById(id) {
  const res = await fetch(`${API_BASE}/receipts/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch receipt #${id}`);
  return res.json();
}

export async function uploadReceiptFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/receipts/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload receipt');
  }
  return res.json();
}

export async function updateReceipt(id, data) {
  const res = await fetch(`${API_BASE}/receipts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update receipt #${id}`);
  }
  return res.json();
}

export async function confirmReceipt(id) {
  const res = await fetch(`${API_BASE}/receipts/${id}/confirm`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to confirm receipt #${id}`);
  }
  return res.json();
}

export async function deleteReceipt(id) {
  const res = await fetch(`${API_BASE}/receipts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete receipt #${id}`);
  }
  return res.json();
}

export async function checkDuplicate(candidateData) {
  const res = await fetch(`${API_BASE}/receipts/check-duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify(candidateData),
  });
  if (!res.ok) throw new Error('Failed to check duplicate');
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/analytics`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function askAssistant(query) {
  const res = await fetch(`${API_BASE}/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify({ query }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to query assistant');
  }
  return res.json();
}

export async function resetDemoData() {
  const res = await fetch(`${API_BASE}/demo/seed`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset demo data');
  return res.json();
}

export async function fetchSampleFiles() {
  const res = await fetch(`${API_BASE}/demo/samples`);
  if (!res.ok) throw new Error('Failed to fetch sample files');
  return res.json();
}

export function getCsvExportUrl(status = 'confirmed') {
  return `${API_BASE}/receipts/export/csv?status=${status}`;
}
