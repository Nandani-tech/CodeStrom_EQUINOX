import React from 'react';
import { 
  DollarSign, 
  Receipt, 
  AlertTriangle, 
  TrendingUp, 
  Building2, 
  ArrowUpRight, 
  CheckCircle, 
  Sparkles,
  Bot,
  UploadCloud,
  FileText,
  Clock,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

const CATEGORY_COLORS = [
  '#6366f1', // Indigo - Software & SaaS
  '#ec4899', // Pink - Hardware & Equipment
  '#3b82f6', // Blue - Travel & Lodging
  '#f59e0b', // Amber - Meals & Entertainment
  '#10b981', // Emerald - Marketing & Advertising
  '#8b5cf6', // Violet - Office Supplies
  '#14b8a6', // Teal - Utilities & Phone
  '#f97316', // Orange - Professional Services
  '#64748b', // Slate - Other
];

export default function DashboardView({ 
  analytics, 
  recentReceipts = [], 
  onSelectReceipt, 
  onNavigateTab,
  onOpenUpload
}) {
  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const {
    confirmed_total = 0,
    confirmed_count = 0,
    pending_count = 0,
    duplicate_count = 0,
    avg_receipt = 0,
    category_breakdown = [],
    monthly_trend = [],
    top_vendors = [],
    attention_needed_count = 0
  } = analytics;

  const totalFlagged = pending_count + duplicate_count;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-300 mb-1">{label}</p>
          <p className="text-sm font-bold text-indigo-400">
            ${Number(payload[0].value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          {payload[0].payload.count && (
            <p className="text-[11px] text-slate-400 mt-0.5">{payload[0].payload.count} receipt(s)</p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-300">{data.name}</p>
          <p className="text-sm font-bold text-indigo-400 mt-0.5">
            ${Number(data.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400">
            {data.payload.percentage}% of confirmed spend ({data.payload.count} receipts)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner Alert if Attention Needed */}
      {totalFlagged > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-200">
                {totalFlagged} Receipt{totalFlagged > 1 ? 's' : ''} Require Human Review
              </h3>
              <p className="text-xs text-amber-300/80 mt-0.5">
                {duplicate_count > 0 && `${duplicate_count} potential duplicate(s) flagged. `}
                {pending_count > 0 && `${pending_count} pending review or contains low-confidence fields.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('receipts', 'pending_review')}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
          >
            <span>Review Items</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Confirmed Total */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Confirmed Spend</span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              ${confirmed_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <div className="flex items-center space-x-1.5 mt-2 text-xs text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Audit-verified across {confirmed_count} records</span>
            </div>
          </div>
        </div>

        {/* Confirmed Receipts */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Total Confirmed</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {confirmed_count}
            </h2>
            <div className="flex items-center space-x-1.5 mt-2 text-xs text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ledger records in good standing</span>
            </div>
          </div>
        </div>

        {/* Attention Needed */}
        <div 
          onClick={() => onNavigateTab('receipts', 'pending_review')}
          className="glass-card p-6 rounded-2xl relative overflow-hidden group cursor-pointer border-amber-500/20 hover:border-amber-500/40"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Needs Attention</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-extrabold text-amber-300 tracking-tight">
              {totalFlagged}
            </h2>
            <div className="flex items-center justify-between mt-2 text-xs text-amber-400/90">
              <span>{duplicate_count} Duplicates · {pending_count} Pending</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Avg Receipt Spend */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Avg Receipt</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              ${avg_receipt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <div className="flex items-center space-x-1.5 mt-2 text-xs text-slate-400">
              <span>Per confirmed business invoice</span>
            </div>
          </div>
        </div>

      </div>

      {/* Charts Section: Monthly Trend & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Trend Area Chart (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-white">Monthly Expense Trajectory</h3>
              <p className="text-xs text-slate-400 mt-0.5">Aggregated confirmed business spending by month</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              USD ($)
            </span>
          </div>

          <div className="h-[280px] w-full">
            {monthly_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="total_spend" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#spendGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-500">
                No monthly data available
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut Chart (1 col) */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Category Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Confirmed spend distribution</p>
          </div>

          <div className="h-[240px] w-full my-auto">
            {category_breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={category_breakdown}
                    dataKey="spend"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {category_breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-500">
                No category data
              </div>
            )}
          </div>

          {/* Top 3 Category Chips */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            {category_breakdown.slice(0, 3).map((cat, idx) => (
              <div key={cat.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate max-w-[170px]">
                  <span 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} 
                  />
                  <span className="text-slate-300 truncate">{cat.category}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white">${cat.spend.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400">({cat.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Grid: Top Vendors & Recent Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Vendors Leaderboard (1 col) */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Top Vendors</span>
            </h3>
            <span className="text-xs text-slate-400">By Spend</span>
          </div>

          <div className="space-y-3.5">
            {top_vendors.map((vendor, idx) => {
              const maxSpend = top_vendors[0]?.total_spend || 1;
              const pct = Math.round((vendor.total_spend / maxSpend) * 100);

              return (
                <div key={vendor.vendor} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">
                      {idx + 1}. {vendor.vendor}
                    </span>
                    <span className="font-semibold text-white">
                      ${vendor.total_spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>{vendor.category}</span>
                    <span>{vendor.count} receipt(s)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Ledger Activity (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Recent Ledger Records</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Latest receipts processed by ShopLedger</p>
            </div>
            <button
              onClick={() => onNavigateTab('receipts')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Vendor</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentReceipts.slice(0, 6).map((r) => {
                  const isConfirmed = r.status === 'confirmed';
                  const isDuplicate = r.status === 'duplicate_flagged';
                  const isPending = r.status === 'pending_review';

                  return (
                    <tr key={r.id} className="hover:bg-slate-900/60 transition-colors group">
                      <td className="py-3 font-medium text-slate-200 group-hover:text-white">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                            #{r.id}
                          </span>
                          <span className="truncate max-w-[140px]">{r.vendor}</span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-400 whitespace-nowrap">{r.date}</td>
                      <td className="py-3 text-slate-400">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-800/80 text-[11px] text-slate-300 truncate max-w-[120px]">
                          {r.category}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-white whitespace-nowrap">
                        ${Number(r.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isConfirmed 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isDuplicate
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {isConfirmed ? 'Confirmed' : isDuplicate ? 'Duplicate' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onSelectReceipt(r)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Quick Action Floating Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <button
          onClick={onOpenUpload || (() => onNavigateTab('upload'))}
          className="p-4 rounded-xl glass-panel hover:border-indigo-500/50 flex items-center space-x-4 transition-all text-left group"
        >
          <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
              Upload New Receipt
            </h4>
            <p className="text-xs text-slate-400">Photos & PDF automated OCR parsing</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('assistant')}
          className="p-4 rounded-xl glass-panel hover:border-violet-500/50 flex items-center space-x-4 transition-all text-left group"
        >
          <div className="p-3 rounded-xl bg-violet-600/20 text-violet-400 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white group-hover:text-violet-400 transition-colors">
              Ask AI Financial Assistant
            </h4>
            <p className="text-xs text-slate-400">Query spending with verified DB citations</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('receipts')}
          className="p-4 rounded-xl glass-panel hover:border-emerald-500/50 flex items-center space-x-4 transition-all text-left group"
        >
          <div className="p-3 rounded-xl bg-emerald-600/20 text-emerald-400 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
              Manage Receipts Ledger
            </h4>
            <p className="text-xs text-slate-400">Search, filter, edit & export confirmed CSV</p>
          </div>
        </button>
      </div>

    </div>
  );
}
