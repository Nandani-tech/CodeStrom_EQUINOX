import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ShieldCheck,
  BarChart2,
  Info,
  RefreshCw,
  Calendar,
  CheckCircle,
  XCircle,
  Minus
} from 'lucide-react';
import { fetchProfitOverview } from '../api';

const PERIOD_OPTIONS = [
  { id: 'today', en: 'Today', hi: 'आज का' },
  { id: 'week', en: 'This Week', hi: 'इस हफ्ते' },
  { id: 'month', en: 'This Month', hi: 'इस महीने' },
  { id: 'custom', en: 'Custom Range', hi: 'कस्टम तारीख' }
];

function MetricCard({ label, value, icon: Icon, color, sub, highlight }) {
  return (
    <div className={`glass-card p-5 rounded-2xl ${highlight || ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-bold uppercase tracking-wider ${color || 'text-slate-400'}`}>{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${color || 'text-slate-500'}`} />}
      </div>
      <p className={`text-2xl font-black mt-1 ${color ? color : 'text-white'}`}>{value}</p>
      {sub && <span className="text-[10px] text-slate-400 mt-1 block">{sub}</span>}
    </div>
  );
}

function IntegrityRow({ label, status, detail }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-200 last:border-0">
      <span className="text-xs text-black font-medium">{label}</span>
      <div className="flex items-center space-x-2 text-right">
        {status === 'ok' && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
        {status === 'warn' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
        {status === 'missing' && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
        {status === 'neutral' && <Minus className="w-4 h-4 text-gray-400 shrink-0" />}
        <span className={`text-xs font-bold ${status === 'ok' ? 'text-emerald-700' : status === 'warn' ? 'text-amber-700' : status === 'missing' ? 'text-rose-700' : 'text-gray-500'}`}>
          {detail}
        </span>
      </div>
    </div>
  );
}

export default function ProfitOverviewView({ lang = 'en', t, onShowToast }) {
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetchProfitOverview(
        period === 'custom' ? 'custom' : period,
        period === 'custom' ? startDate : null,
        period === 'custom' ? endDate : null
      );
      setData(res);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      onShowToast({ type: 'error', message: err.message || 'Failed to load profit overview' });
    }
  };

  useEffect(() => { if (period !== 'custom') load(); }, [period]);

  const handleCustomLoad = () => {
    if (!startDate || !endDate) {
      onShowToast({ type: 'warning', message: lang === 'hi' ? 'कृपया दोनों तारीखें चुनें' : 'Please select both start and end dates' });
      return;
    }
    load();
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <p className="text-xs text-slate-400">{lang === 'hi' ? 'मुनाफा हिसाब लगाया जा रहा है...' : 'Calculating profit overview...'}</p>
      </div>
    );
  }

  const gross_profit = data?.gross_profit || 0;
  const net_profit = data?.net_profit || 0;
  const gross_margin = data?.gross_margin_pct || 0;
  const net_margin = data?.net_margin_pct || 0;
  const sales = data?.total_sales || 0;
  const cogs = data?.total_cogs || 0;
  const opex = data?.total_opex || 0;
  const isProfit = net_profit >= 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center space-x-2.5">
            <BarChart2 className="w-6 h-6 text-apricot-600" />
            <span>{t.profit.title}</span>
          </h2>
          <p className="text-xs text-stone-500 font-medium mt-1">{t.profit.subtitle}</p>
        </div>

        {/* Period Selector - Warm Pill Tabs */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-1.5 flex-wrap gap-1.5 bg-white p-1 rounded-2xl border border-apricot-200 shadow-2xs">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === p.id
                    ? 'bg-gradient-to-r from-apricot-500 to-amber-500 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-apricot-50'
                }`}
              >
                {lang === 'hi' ? p.hi : p.en}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-apricot-200 text-stone-900 text-xs outline-none focus:ring-1 focus:ring-apricot-400 font-semibold"
              />
              <span className="text-stone-400 text-xs font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-apricot-200 text-stone-900 text-xs outline-none focus:ring-1 focus:ring-apricot-400 font-semibold"
              />
              <button
                onClick={handleCustomLoad}
                className="px-4 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-apricot-500 to-amber-500 hover:from-apricot-600 shadow-xs transition-colors"
              >
                {lang === 'hi' ? 'देखें' : 'Apply'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label={t.profit.recordedSales}
          value={fmt(sales)}
          icon={TrendingUp}
          color="text-emerald-700"
          sub={lang === 'hi' ? `${data?.sales_count || 0} दर्ज बिक्री + ${data?.receipt_count || 0} बिल रसीदें` : `${data?.sales_count || 0} sale records + ${data?.receipt_count || 0} receipts`}
        />
        <MetricCard
          label={t.profit.stockPurchases}
          value={fmt(cogs)}
          icon={TrendingDown}
          color="text-amber-800"
          sub={lang === 'hi' ? 'सप्लायर बिल (माल लागत)' : 'Stock/COGS from suppliers'}
        />
        <MetricCard
          label={t.profit.operatingExpenses}
          value={fmt(opex)}
          icon={TrendingDown}
          color="text-rose-600"
          sub={lang === 'hi' ? 'बिजली, भाड़ा, अन्य खर्चे' : 'Electricity, rent, overhead'}
        />
        <MetricCard
          label={t.profit.estimatedGrossProfit}
          value={fmt(gross_profit)}
          icon={gross_profit >= 0 ? TrendingUp : TrendingDown}
          color={gross_profit >= 0 ? 'text-apricot-800' : 'text-rose-600'}
          sub={`${t.profit.profitMargin}: ${pct(gross_margin)}`}
        />
        <div className={`glass-card p-5 rounded-2xl col-span-2 lg:col-span-2 ${isProfit ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-white' : 'border-rose-300 bg-gradient-to-br from-rose-50/80 to-white'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-black uppercase tracking-wider ${isProfit ? 'text-emerald-800' : 'text-rose-800'}`}>
              {t.profit.estimatedNetProfit}
            </span>
            {isProfit ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-rose-600" />}
          </div>
          <p className={`text-3xl font-black tracking-tight ${isProfit ? 'text-emerald-800' : 'text-rose-600'}`}>{fmt(net_profit)}</p>
          <div className="flex items-center space-x-4 mt-2 text-xs">
            <span className={`font-bold ${isProfit ? 'text-emerald-700' : 'text-rose-600'}`}>
              {t.profit.profitMargin}: {pct(net_margin)}
            </span>
            {data?.period_label && (
              <span className="text-stone-500 font-semibold flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-apricot-600" />
                <span>{data.period_label}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visual Breakdown Bar */}
      {sales > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-black">{lang === 'hi' ? 'खर्चों का हिस्सा (बिक्री का प्रतिशत)' : 'Revenue Breakdown (% of Sales)'}</h3>
          <div className="w-full h-5 rounded-full overflow-hidden bg-gray-200 flex">
            {cogs > 0 && (
              <div
                style={{ width: `${Math.min((cogs / sales) * 100, 100)}%` }}
                className="h-full bg-amber-500/70 transition-all duration-500"
                title={`COGS: ${pct((cogs / sales) * 100)}`}
              />
            )}
            {opex > 0 && (
              <div
                style={{ width: `${Math.min((opex / sales) * 100, 100 - (cogs / sales) * 100)}%` }}
                className="h-full bg-rose-500/70 transition-all duration-500"
                title={`OpEx: ${pct((opex / sales) * 100)}`}
              />
            )}
            <div
              style={{ flex: 1 }}
              className="h-full bg-emerald-500/40 transition-all duration-500"
              title={`Profit: ${pct(net_margin)}`}
            />
          </div>
          <div className="flex items-center flex-wrap gap-4 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500/70 inline-block" />
              <span className="text-black font-medium">COGS: {pct(sales > 0 ? (cogs / sales) * 100 : 0)}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-rose-500/70 inline-block" />
              <span className="text-black font-medium">OpEx: {pct(sales > 0 ? (opex / sales) * 100 : 0)}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/40 inline-block" />
              <span className="text-black font-medium">{lang === 'hi' ? 'मुनाफा' : 'Net Profit'}: {pct(net_margin)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Data Integrity Panel */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-bold text-black">{t.profit.integrityTitle}</h3>
        </div>
        <div className="space-y-0">
          <IntegrityRow
            label={lang === 'hi' ? 'बिक्री रिकॉर्ड' : 'Sales Records'}
            status={data?.sales_count > 0 ? 'ok' : 'missing'}
            detail={data?.sales_count > 0
              ? `${data.sales_count} ${lang === 'hi' ? 'रिकॉर्ड' : 'records'}`
              : (lang === 'hi' ? 'कोई बिक्री नहीं' : 'No sales recorded')}
          />
          <IntegrityRow
            label={lang === 'hi' ? 'सप्लायर खरीद (COGS)' : 'Supplier Purchases (COGS)'}
            status={cogs > 0 ? 'ok' : 'warn'}
            detail={cogs > 0 ? fmt(cogs) : (lang === 'hi' ? 'कोई खरीद नहीं' : 'No purchases found')}
          />
          <IntegrityRow
            label={lang === 'hi' ? 'संचालन खर्च (OpEx)' : 'Operating Expenses (OpEx)'}
            status={opex > 0 ? 'ok' : 'warn'}
            detail={opex > 0 ? fmt(opex) : (lang === 'hi' ? 'कोई खर्च नहीं' : 'No expenses recorded')}
          />
          <IntegrityRow
            label={lang === 'hi' ? 'पुष्टि किए गए रसीद (वेरीफाइड)' : 'Confirmed Receipts in Ledger'}
            status={data?.receipt_count > 0 ? 'ok' : 'neutral'}
            detail={data?.receipt_count > 0 ? `${data.receipt_count} ${lang === 'hi' ? 'बिल' : 'receipts'}` : '0'}
          />
          {data?.missing_data_warnings?.length > 0 && data.missing_data_warnings.map((w, i) => (
            <IntegrityRow
              key={i}
              label={lang === 'hi' ? 'चेतावनी' : 'Warning'}
              status="warn"
              detail={w}
            />
          ))}
        </div>
        <div className="mt-4 flex items-start space-x-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-black font-medium">{t.profit.verifiedRecords}</p>
        </div>
      </div>

    </div>
  );
}
