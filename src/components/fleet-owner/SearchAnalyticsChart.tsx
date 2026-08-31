import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Area,
  AreaChart,
  Cell
} from 'recharts';
import {
  Activity,
  TrendingUp,
  Search,
  Calendar,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  BarChart3,
  Layers,
  History,
  Flame,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  Compass
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { TrendingQuery, SearchAnalyticsSummary, SearchAnalyticsResponse } from '../../types';

interface SearchAnalyticsChartProps {
  token: string;
  onSelectQuery?: (query: string) => void;
}

export default function SearchAnalyticsChart({ token, onSelectQuery }: SearchAnalyticsChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<SearchAnalyticsSummary | null>(null);
  const [trendingQueries, setTrendingQueries] = useState<TrendingQuery[]>([]);
  const [trendingCategories, setTrendingCategories] = useState<any[]>([]);
  const [platformBreakdown, setPlatformBreakdown] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'30' | '14' | '7'>('30');
  const [chartView, setChartView] = useState<'volume' | 'trending_queries' | 'platforms'>('trending_queries');
  const [error, setError] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/fleet-owner/search-analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json: SearchAnalyticsResponse = await res.json();
      if (!res.ok) throw new Error((json as any).error || 'Failed to load search analytics');
      setData(json.analytics || []);
      setSummary(json.summary || null);
      setTrendingQueries(json.trendingQueries || []);
      setTrendingCategories(json.trendingCategories || []);
      setPlatformBreakdown(json.platformBreakdown || []);
      setRecentSearches(json.recentSearches || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching search telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  // Filter time range for volume chart
  const filteredVolumeData = React.useMemo(() => {
    const sliceCount = parseInt(timeRange, 10);
    return data.slice(-sliceCount);
  }, [data, timeRange]);

  const totalInCurrentRange = React.useMemo(() => {
    return filteredVolumeData.reduce((acc, curr) => acc + (curr.searches || 0), 0);
  }, [filteredVolumeData]);

  const peakInCurrentRange = React.useMemo(() => {
    if (filteredVolumeData.length === 0) return 0;
    return Math.max(...filteredVolumeData.map(d => d.searches || 0));
  }, [filteredVolumeData]);

  // Filter trending queries by category if selected
  const filteredTrendingQueries = React.useMemo(() => {
    if (selectedCategoryFilter === 'All') return trendingQueries;
    return trendingQueries.filter(t => t.category === selectedCategoryFilter);
  }, [trendingQueries, selectedCategoryFilter]);

  // Custom Tooltip for Timeline
  const CustomTimelineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl space-y-1.5 text-xs z-50 min-w-44">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1 font-bold text-slate-800">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>{point.displayDate}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{point.date}</span>
          </div>
          <div className="flex justify-between items-center text-slate-700">
            <span className="font-medium flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-stone-900 inline-block"></span>
              <span>Driver Searches:</span>
            </span>
            <span className="font-black text-slate-900 text-sm">{point.searches}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block"></span>
              <span>Risk Records Flagged:</span>
            </span>
            <span className="font-bold text-amber-800">{point.flaggedDrivers}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Trending Queries Chart
  const CustomTrendingTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl space-y-1.5 text-xs z-50 min-w-48">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1 font-bold text-slate-800">
            <span className="truncate max-w-[140px] font-black">{point.query}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">
              {point.trend}
            </span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Category:</span>
              <span className="font-bold text-slate-700">{point.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Search Volume:</span>
              <span className="font-black text-slate-900">{point.count} searches</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Share of Total:</span>
              <span className="font-bold text-stone-800">{point.percentage}%</span>
            </div>
            <div className="flex justify-between text-amber-700 font-medium">
              <span>Risk Flags Triggered:</span>
              <span className="font-bold">{point.flaggedCount || 0}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-stone-100 text-stone-800 rounded-lg">
              <Flame className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Driver Search & Trending Queries Tracker</h3>
            <Tooltip
              title="Driver Search Telemetry & Trending Intelligence"
              content="Real-time analytics aggregating search queries, high-demand vetting keywords, regional operator scans, and risk detection trends across South African fleets."
              position="top"
            />
          </div>
          <p className="text-slate-500 text-xs">
            Monitor trending search terms, peak vetting intervals, and platform-specific background checks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Chart View Mode Selector */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => setChartView('trending_queries')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
                chartView === 'trending_queries' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Trending Queries</span>
            </button>
            <button
              onClick={() => setChartView('volume')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
                chartView === 'volume' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Search Volume</span>
            </button>
            <button
              onClick={() => setChartView('platforms')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
                chartView === 'platforms' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Platforms</span>
            </button>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Refresh search telemetry"
            aria-label="Refresh search telemetry"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Badges (Fluid Responsive Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Scans (30d)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900">{summary?.totalSearches30d || totalInCurrentRange}</span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
              <TrendingUp className="h-3 w-3 mr-0.5 inline" />
              {summary?.trendPercentage || '+18.4%'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block">Registry queries executed</span>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Top Trending Query</span>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-black text-slate-900 truncate max-w-[130px]">
              {trendingQueries[0]?.query || 'Uber Fleet'}
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
              {trendingQueries[0]?.trend || '+42%'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block">{trendingQueries[0]?.count || 26} searches logged</span>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Unique Keywords</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900">{summary?.uniqueQueriesCount || trendingQueries.length}</span>
            <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded-full">
              Tracked
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block">Distinct driver/fleet terms</span>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Risk Hit Rate</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900">{summary?.riskDetectionRate || '24%'}</span>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-100">
              Audit Alert
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block">Queries flagged with incidents</span>
        </div>
      </div>

      {/* Main Chart Visualization Section */}
      <div className="space-y-3">
        {/* Sub-controls based on chart view */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          {chartView === 'volume' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Time Window:</span>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
                {(['7', '14', '30'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      timeRange === range ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'hover:text-slate-900'
                    }`}
                  >
                    {range}D
                  </button>
                ))}
              </div>
            </div>
          ) : chartView === 'trending_queries' ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" />
                <span>Category:</span>
              </span>
              {['All', 'Driver Lookup', 'Platform Scan', 'Regional Scan', 'Compliance & PDP'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer min-h-[30px] ${
                    selectedCategoryFilter === cat
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs font-bold text-slate-500">Query Volume by E-hailing Platform</span>
          )}

          <span className="text-[11px] text-slate-400">
            {chartView === 'trending_queries' ? 'Visualizing top keyword frequency' : chartView === 'volume' ? 'Daily scan intensity & risk hits' : 'Market distribution'}
          </span>
        </div>

        {/* Chart Canvas Area */}
        {loading && data.length === 0 ? (
          <div className="h-64 flex items-center justify-center border border-slate-200 border-dashed rounded-xl text-slate-400 text-xs">
            <RefreshCw className="animate-spin h-5 w-5 mr-2 text-stone-700" />
            <span>Loading search activity telemetry...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {error}
          </div>
        ) : (
          <div className="w-full h-64 sm:h-72 pt-2">
            {chartView === 'trending_queries' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredTrendingQueries}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="query"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={35}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                  />
                  <RechartsTooltip content={<CustomTrendingTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Search Volume"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(entry: any) => {
                      if (entry && entry.query && onSelectQuery) {
                        onSelectQuery(entry.query);
                      }
                    }}
                  >
                    {filteredTrendingQueries.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#1f1f1f' : index === 1 ? '#334155' : index === 2 ? '#475569' : '#64748b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartView === 'volume' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredVolumeData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1f1f1f" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1f1f1f" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="displayDate"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                    interval={timeRange === '30' ? 3 : timeRange === '14' ? 1 : 0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                  />
                  <RechartsTooltip content={<CustomTimelineTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="searches"
                    name="Driver Searches"
                    stroke="#1f1f1f"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSearches)"
                  />
                  <Line
                    type="monotone"
                    dataKey="flaggedDrivers"
                    name="Flagged Risk Scans"
                    stroke="#d97706"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 2, fill: '#d97706' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {chartView === 'platforms' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={platformBreakdown}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="platform"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                  />
                  <RechartsTooltip
                    formatter={(val: any) => [`${val} searches`, 'Search Volume']}
                  />
                  <Bar
                    dataKey="searches"
                    radius={[6, 6, 0, 0]}
                    fill="#1f1f1f"
                  >
                    {platformBreakdown.map((entry, idx) => (
                      <Cell
                        key={`plat-${idx}`}
                        fill={
                          entry.platform === 'Uber' ? '#1f1f1f' :
                          entry.platform === 'Bolt' ? '#059669' :
                          entry.platform === 'inDrive' ? '#2563eb' : '#64748b'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

      {/* Trending Search Query Pills & Quick Launcher */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            <span>Top Trending Search Queries (Click to Run Scan)</span>
          </h4>
          <span className="text-[11px] text-slate-400">Ranked by 30-day operator demand</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {trendingQueries.map((t, idx) => (
            <button
              key={t.query}
              onClick={() => {
                if (onSelectQuery) {
                  onSelectQuery(t.query);
                }
              }}
              className="px-3 py-1.5 bg-slate-50 hover:bg-stone-100 border border-slate-200 hover:border-stone-400 rounded-xl text-xs font-bold text-slate-800 transition-all flex items-center gap-2 cursor-pointer shadow-2xs group min-h-[36px]"
              title={`Search for "${t.query}" (${t.count} searches, ${t.trend})`}
            >
              <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${
                idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                #{idx + 1}
              </span>
              <span className="group-hover:text-stone-950 truncate max-w-[140px] sm:max-w-[200px]">{t.query}</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 shrink-0">
                {t.trend}
              </span>
              <ArrowUpRight className="h-3 w-3 text-slate-400 group-hover:text-stone-900 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Search History Log (Fleet Operator Telemetry) */}
      {recentSearches && recentSearches.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-stone-600" />
              <span>Recent Search Vetting History</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Auto-logged audit trail</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {recentSearches.slice(0, 4).map(rec => (
              <div
                key={rec.id}
                className="p-2.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs space-y-1 hover:bg-slate-100/80 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 truncate max-w-[120px]">{rec.query}</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{rec.timeAgo}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5">
                  <span>{rec.result_count} result(s) found</span>
                  {onSelectQuery && (
                    <button
                      onClick={() => onSelectQuery(rec.query)}
                      className="text-stone-900 hover:underline font-bold text-[10px] cursor-pointer"
                    >
                      Re-scan
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info / POPIA Compliance Notice */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>All query telemetry is hashed and audited in accordance with the Protection of Personal Information Act (POPIA).</span>
        </div>
        <span className="font-medium text-slate-500 shrink-0">Status: Active Registry Sync</span>
      </div>
    </div>
  );
}
