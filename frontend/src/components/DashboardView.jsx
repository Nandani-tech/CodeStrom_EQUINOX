import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, IndianRupee,
  Users, ArrowUpRight, RefreshCw, Lightbulb, ChevronRight,
  UploadCloud, Bot, FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import { fetchProfitOverview, fetchCustomers, fetchReceipts, fetchSales } from '../api';

const PERIOD_TABS = [
  { id: 'today',  label: 'Today' },
  { id: 'week',   label: '7 Days' },
  { id: 'month',  label: '30 Days' },
  { id: 'custom_month', label: 'This Month' },
];

const STOCK_CATEGORIES = [
  'Hardware & Equipment',
  'Inventory',
  'Groceries',
  'Stock Purchase',
  'Dairy & Milk',
  'FMCG Wholesale',
];

const OPERATING_CATEGORIES = [
  'Utilities & Phone',
  'Meals & Entertainment',
  'Office Supplies',
  'Marketing & Advertising',
  'Professional Services',
  'Other Business Expense',
];

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtFull = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPeriodRange(period) {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  if (period === 'week') start.setDate(start.getDate() - 6);
  if (period === 'month') start.setDate(start.getDate() - 29);
  if (period === 'custom_month') start.setDate(1);

  return { startDate: formatDate(start), endDate: formatDate(end) };
}

function getChartData(startDate, endDate, sales, receipts) {
  const dataByDate = new Map();
  const date = new Date(`${startDate}T00:00:00`);
  const lastDate = new Date(`${endDate}T00:00:00`);

  while (date <= lastDate) {
    const key = formatDate(date);
    dataByDate.set(key, {
      name: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      Sales: 0,
      Expenses: 0,
    });
    date.setDate(date.getDate() + 1);
  }

  sales.forEach((sale) => {
    const row = dataByDate.get(sale.date);
    if (row) row.Sales += Number(sale.amount) || 0;
  });

  receipts.forEach((receipt) => {
    const row = dataByDate.get(receipt.date);
    if (!row || receipt.status !== 'confirmed') return;

    const amount = Number(receipt.total) || 0;
    if (receipt.expense_type === 'stock_purchase' || STOCK_CATEGORIES.includes(receipt.category)) {
      row.Expenses += amount;
    }
    if (receipt.expense_type === 'operating_expense' || OPERATING_CATEGORIES.includes(receipt.category)) {
      row.Expenses += amount;
    }
  });

  return Array.from(dataByDate.values());
}

// Custom bar chart tooltip
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-bold text-black mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmtFull(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function DashboardView({ onNavigateTab, onOpenUpload, onShowToast }) {
  const [period, setPeriod] = useState('month');
  const [profitData, setProfitData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      const { startDate, endDate } = getPeriodRange(period);
      const [profit, cust, salesResponse, receiptsResponse] = await Promise.all([
        fetchProfitOverview('custom', startDate, endDate),
        fetchCustomers(),
        fetchSales(startDate, endDate),
        fetchReceipts({ status: 'confirmed', start_date: startDate, end_date: endDate })
      ]);
      if (requestId !== latestRequest.current) return;
      setProfitData(profit);
      setCustomers(cust.customers || []);
      setChartData(getChartData(
        startDate,
        endDate,
        salesResponse.sales || [],
        receiptsResponse.receipts || []
      ));
    } catch (err) {
      if (requestId === latestRequest.current) {
        console.error('Dashboard load error:', err);
        onShowToast?.({ type: 'error', message: err.message || 'Failed to load dashboard data' });
      }
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false);
    }
  }, [period, onShowToast]);

  useEffect(() => { load(); }, [load]);

  // ── Derived numbers ─────────────────────────────────────────────────────────
  const sales      = profitData?.total_sales || 0;
  const expenses   = (profitData?.stock_purchases || 0) + (profitData?.operating_expenses || 0);
  const profit     = profitData?.estimated_net_profit || 0;
  const isProfit   = profit >= 0;

  // Pending Udhaar from customers
  const totalUdhaar = customers.reduce((s, c) => s + (c.balance_due || 0), 0);
  const udhaarCount = customers.filter(c => c.balance_due > 0).length;

  // ── Business Insights (up to 3) ─────────────────────────────────────────────
  const insights = [];
  if (profitData) {
    const margin = sales > 0 ? ((profit / sales) * 100).toFixed(1) : 0;
    if (!isProfit) {
      insights.push({
        icon: '⚠️',
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        text: `Your expenses (${fmt(expenses)}) are higher than sales (${fmt(sales)}). Cut costs or grow sales.`
      });
    } else {
      insights.push({
        icon: '✅',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        text: `Good! You earned ${fmt(profit)} profit at a ${margin}% margin this period.`
      });
    }
    if (totalUdhaar > 0) {
      insights.push({
        icon: '💰',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        text: `${udhaarCount} customer${udhaarCount > 1 ? 's' : ''} owe you ${fmt(totalUdhaar)}. Collect soon to improve cash flow.`
      });
    }
    if (profitData.operating_expenses > 0 && sales > 0) {
      const opexPct = ((profitData.operating_expenses / sales) * 100).toFixed(1);
      insights.push({
        icon: '📊',
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        text: `Operating expenses are ${opexPct}% of your sales. ${opexPct > 20 ? 'Consider reducing overhead.' : 'That looks manageable.'}`
      });
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-black tracking-tight">Business snapshot</h2>
          <p className="text-xs text-gray-500 mt-0.5">Your sales, expenses and pending credit at a glance</p>
        </div>
        <button
          onClick={() => {
            setIsLoading(true);
            load();
          }}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Period Filter Tabs ── */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-1 sm:gap-2 bg-gray-100 p-1 rounded-2xl w-full sm:w-fit">
        {PERIOD_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setIsLoading(true);
              setPeriod(tab.id);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              period === tab.id
                ? 'bg-white text-black shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 4 KPI Cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Total Sales */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Sales</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-black text-black leading-tight">{fmt(sales)}</p>
            <p className="text-[11px] text-gray-500 mt-1">{profitData?.sales_count || 0} transactions</p>
          </div>

          {/* Total Expenses */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Expenses</span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-rose-600" />
              </div>
            </div>
            <p className="text-2xl font-black text-black leading-tight">{fmt(expenses)}</p>
            <p className="text-[11px] text-gray-500 mt-1">Stock + Operating costs</p>
          </div>

          {/* Profit / Loss */}
          <div className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow ${
            isProfit ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isProfit ? 'Profit' : 'Loss'}
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isProfit ? 'bg-emerald-200' : 'bg-rose-200'}`}>
                <IndianRupee className={`w-4 h-4 ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`} />
              </div>
            </div>
            <p className={`text-2xl font-black leading-tight ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isProfit ? '+' : '-'}{fmt(Math.abs(profit))}
            </p>
            <p className={`text-[11px] mt-1 ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
              {sales > 0 ? `${Math.abs(((profit / sales) * 100)).toFixed(1)}% margin` : 'No sales recorded'}
            </p>
          </div>

          {/* Pending Udhaar */}
          <div
            className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onNavigateTab('customers')}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Udhaar</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-black text-black leading-tight">{fmt(totalUdhaar)}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-amber-600">{udhaarCount} customer{udhaarCount !== 1 ? 's' : ''} owe you</p>
              <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
            </div>
          </div>

        </div>
      )}

      {/* ── Sales vs Expenses Bar Chart ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-black">Sales vs Expenses</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {PERIOD_TABS.find(t => t.id === period)?.label} — hover/tap bars for exact values
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-52 bg-gray-100 rounded-xl animate-pulse" />
        ) : chartData.every((day) => day.Sales === 0 && day.Expenses === 0) ? (
          <div className="h-52 flex items-center justify-center text-sm text-gray-400">
            No data for this period. Add transactions to see your chart.
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="25%" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  fontSize={11}
                  interval={period === 'today' ? 0 : period === 'week' ? 0 : 'preserveStartEnd'}
                  tick={{ fill: '#000', fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  fontSize={11}
                  tick={{ fill: '#6b7280' }}
                  tickFormatter={(v) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', fontWeight: 700, paddingTop: '8px' }}
                  formatter={(val) => <span style={{ color: '#000' }}>{val}</span>}
                />
                <Bar dataKey="Sales" fill="#10b981" radius={[6, 6, 0, 0]} name="Sales" />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Business Insights ── */}
      {insights.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-black text-black">Business Insights</h3>
          </div>
          <div className="space-y-2">
            {insights.slice(0, 3).map((ins, i) => (
              <div key={i} className={`flex items-start space-x-2.5 p-3 rounded-xl border text-xs font-medium ${ins.color}`}>
                <span className="text-base leading-none mt-0.5 flex-shrink-0">{ins.icon}</span>
                <span>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={onOpenUpload || (() => onNavigateTab('upload'))}
          className="flex items-center space-x-3 p-4 rounded-2xl bg-white border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-left group shadow-sm"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-black">Upload Receipt</p>
            <p className="text-[11px] text-gray-500">Photo or PDF auto-scan</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400 ml-auto" />
        </button>

        <button
          onClick={() => onNavigateTab('assistant')}
          className="flex items-center space-x-3 p-4 rounded-2xl bg-white border border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all text-left group shadow-sm"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-black">Ask AI Assistant</p>
            <p className="text-[11px] text-gray-500">Ask about your business</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400 ml-auto" />
        </button>

        <button
          onClick={() => onNavigateTab('receipts')}
          className="flex items-center space-x-3 p-4 rounded-2xl bg-white border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left group shadow-sm"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-black">All Receipts</p>
            <p className="text-[11px] text-gray-500">Search, filter &amp; export</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400 ml-auto" />
        </button>
      </div>

    </div>
  );
}
