import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { TrendingUp, AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

interface TrendItem {
  date: string;
  displayDate: string;
  total: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

interface FleetIncidentTrendsProps {
  token: string;
}

export default function FleetIncidentTrends({ token }: FleetIncidentTrendsProps) {
  const [trends, setTrends] = React.useState<TrendItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterSeverity, setFilterSeverity] = React.useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/incident-trends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.trends) {
        setTrends(data.trends);
      }
    } catch (err) {
      console.error('Failed to load incident trends:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTrends();
  }, [token]);

  // Aggregate totals
  const totalIncidents30d = trends.reduce((acc, t) => acc + t.total, 0);
  const criticalIncidents30d = trends.reduce((acc, t) => acc + t.critical, 0);
  const highIncidents30d = trends.reduce((acc, t) => acc + t.high, 0);
  const peakDay = trends.reduce((max, t) => t.total > max.total ? t : max, { total: 0, displayDate: 'N/A' });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Fleet Incident Trends (Last 30 Days)</span>
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Monitor volume, severity spikes, and reporting rate patterns across all connected fleet platforms.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Severity Only</option>
            <option value="medium">Medium Severity</option>
            <option value="low">Low Severity</option>
          </select>

          <button
            onClick={fetchTrends}
            className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
            title="Refresh Trends Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">30-Day Volume</div>
          <div className="text-2xl font-black text-slate-900">{totalIncidents30d}</div>
          <div className="text-[11px] text-slate-500 font-medium">Logged incident claims</div>
        </div>

        <div className="p-4 bg-red-50/60 rounded-xl border border-red-100 space-y-1">
          <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Critical Reports</span>
          </div>
          <div className="text-2xl font-black text-red-700">{criticalIncidents30d}</div>
          <div className="text-[11px] text-red-600/80 font-medium">Immediate threat cases</div>
        </div>

        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-1">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center space-x-1">
            <ShieldAlert className="h-3 w-3" />
            <span>High Severity</span>
          </div>
          <div className="text-2xl font-black text-amber-800">{highIncidents30d}</div>
          <div className="text-[11px] text-amber-700/80 font-medium font-semibold">Major damage/theft</div>
        </div>

        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1">
          <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Peak Incident Day</span>
          </div>
          <div className="text-xl font-black text-blue-900 truncate">{peakDay.displayDate}</div>
          <div className="text-[11px] text-blue-700/80 font-medium">{peakDay.total} reports filed</div>
        </div>
      </div>

      {/* Recharts Visualization */}
      <div className="h-72 w-full pt-2">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span>Loading incident trend data...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '0.75rem',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                }}
                labelStyle={{ fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />

              {(filterSeverity === 'all' || filterSeverity === 'critical') && (
                <Line
                  type="monotone"
                  dataKey="critical"
                  name="Critical Severity"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#ef4444' }}
                  activeDot={{ r: 6 }}
                />
              )}

              {(filterSeverity === 'all' || filterSeverity === 'high') && (
                <Line
                  type="monotone"
                  dataKey="high"
                  name="High Severity"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#f97316' }}
                />
              )}

              {(filterSeverity === 'all' || filterSeverity === 'medium') && (
                <Line
                  type="monotone"
                  dataKey="medium"
                  name="Medium Severity"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              )}

              {(filterSeverity === 'all' || filterSeverity === 'low') && (
                <Line
                  type="monotone"
                  dataKey="low"
                  name="Low Severity"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={false}
                />
              )}

              {filterSeverity === 'all' && (
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total Incoming Reports"
                  stroke="#0f172a"
                  strokeWidth={3}
                  strokeDasharray="4 2"
                  dot={{ r: 3, fill: '#0f172a' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
