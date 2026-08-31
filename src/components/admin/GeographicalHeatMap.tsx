import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line
} from 'recharts';
import { MapPin, ShieldAlert, AlertTriangle, Filter, Flame, Users, RefreshCw } from 'lucide-react';

interface RegionalStat {
  regionName: string;
  province: string;
  totalIncidents: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  topCategory: string;
  flaggedDriversCount: number;
  riskIndex: number;
}

interface GeographicalHeatMapProps {
  token: string;
}

export default function GeographicalHeatMap({ token }: GeographicalHeatMapProps) {
  const [regionsData, setRegionsData] = useState<RegionalStat[]>([]);
  const [totalMapped, setTotalMapped] = useState(0);
  const [highestRiskRegion, setHighestRiskRegion] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<'total' | 'risk_index' | 'critical'>('total');

  const fetchRegionalData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/regional-incidents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRegionsData(data.regions || []);
        setTotalMapped(data.totalMappedIncidents || 0);
        setHighestRiskRegion(data.highestRiskRegion || 'Gauteng');
      }
    } catch (err) {
      console.error('Failed to load regional heat map data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegionalData();
  }, [token]);

  // Filter regions by selected province
  const filteredRegions = regionsData.filter(r => {
    if (selectedProvince === 'all') return true;
    return r.province.toLowerCase() === selectedProvince.toLowerCase();
  });

  // Unique provinces list
  const provinces = Array.from(new Set(regionsData.map(r => r.province)));

  // Custom Bar Color based on Risk Index
  const getRiskColor = (riskIndex: number) => {
    if (riskIndex >= 70) return '#dc2626'; // red-600
    if (riskIndex >= 45) return '#ea580c'; // orange-600
    if (riskIndex >= 25) return '#d97706'; // amber-600
    return '#2563eb'; // blue-600
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: RegionalStat = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 text-white p-3.5 rounded-2xl shadow-xl text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center space-x-1.5 font-black text-blue-400">
            <MapPin className="h-4 w-4" />
            <span>{data.regionName}</span>
          </div>
          <div className="pt-1 border-t border-slate-800 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Incidents:</span>
              <strong className="text-white font-black">{data.totalIncidents}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-red-400">Critical Incidents:</span>
              <strong className="text-red-400 font-black">{data.critical}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400">High Severity:</span>
              <strong className="text-amber-400 font-black">{data.high}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Top Complaint Category:</span>
              <strong className="text-slate-200 capitalize">{data.topCategory}</strong>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400">Regional Risk Index:</span>
              <span className="px-1.5 py-0.5 bg-red-950 text-red-300 font-black rounded">
                {data.riskIndex} / 100
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-red-100 text-red-700 rounded-xl">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">Geographical Incident Heat Map</h3>
              <p className="text-xs text-slate-500 font-medium">Regional frequency distribution mapping high-risk driver hotspot areas</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Province Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="bg-transparent font-extrabold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Provinces</option>
              {provinces.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs">
            <button
              onClick={() => setSelectedMetric('total')}
              className={`px-3 py-1 rounded-lg font-extrabold transition-all cursor-pointer ${
                selectedMetric === 'total' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Total Incidents
            </button>
            <button
              onClick={() => setSelectedMetric('risk_index')}
              className={`px-3 py-1 rounded-lg font-extrabold transition-all cursor-pointer ${
                selectedMetric === 'risk_index' ? 'bg-white text-red-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Risk Index
            </button>
          </div>

          <button
            onClick={fetchRegionalData}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors cursor-pointer"
            title="Refresh regional heat map data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-red-50/70 border border-red-100 rounded-2xl flex items-center space-x-3">
          <div className="p-3 bg-red-100 text-red-700 rounded-2xl shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-red-600 tracking-wider">Top Hotspot Hub</span>
            <h4 className="font-extrabold text-slate-900 text-sm leading-tight mt-0.5">{highestRiskRegion}</h4>
            <p className="text-[10px] text-red-700 font-bold mt-0.5">Highest regional threat concentration</p>
          </div>
        </div>

        <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center space-x-3">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl shrink-0">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Total Mapped Incidents</span>
            <h4 className="font-extrabold text-slate-900 text-xl leading-tight mt-0.5">{totalMapped}</h4>
            <p className="text-[10px] text-blue-700 font-bold mt-0.5">Across 8 primary metropolitan regions</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-2xl flex items-center space-x-3">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Monitored Drivers</span>
            <h4 className="font-extrabold text-slate-900 text-xl leading-tight mt-0.5">
              {regionsData.reduce((acc, curr) => acc + curr.flaggedDriversCount, 0)}
            </h4>
            <p className="text-[10px] text-amber-700 font-bold mt-0.5">Drivers flagged with regional incident history</p>
          </div>
        </div>
      </div>

      {/* Main Recharts Visualization */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider flex items-center space-x-1.5">
          <span>Metropolitan Regional Incident Heat Index</span>
        </h4>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400 font-medium">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
            Loading geographical heatmap calculations...
          </div>
        ) : filteredRegions.length === 0 ? (
          <div className="h-48 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-xs text-slate-400">
            No regional incident data matches the selected province filter.
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredRegions} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="regionName"
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#dc2626', fontWeight: 700 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />

                <Bar
                  yAxisId="left"
                  dataKey={selectedMetric === 'risk_index' ? 'riskIndex' : 'totalIncidents'}
                  name={selectedMetric === 'risk_index' ? 'Risk Index (0-100)' : 'Total Incident Reports'}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={45}
                >
                  {filteredRegions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getRiskColor(entry.riskIndex)} />
                  ))}
                </Bar>

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="critical"
                  name="Critical Severity Incidents"
                  stroke="#991b1b"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#991b1b' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Regional Detail Breakdown Table */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
          Regional Risk Matrix & Top Complaint Categories
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 bg-slate-50/80">
                <th className="py-2.5 px-3">Metropolitan Region</th>
                <th className="py-2.5 px-3">Province</th>
                <th className="py-2.5 px-3 text-center">Total Incidents</th>
                <th className="py-2.5 px-3 text-center">Critical</th>
                <th className="py-2.5 px-3">Top Category</th>
                <th className="py-2.5 px-3 text-center">Risk Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredRegions.map((r) => (
                <tr key={r.regionName} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-extrabold text-slate-900 flex items-center space-x-1.5">
                    <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span>{r.regionName}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-semibold">{r.province}</td>
                  <td className="py-2.5 px-3 text-center font-black">{r.totalIncidents}</td>
                  <td className="py-2.5 px-3 text-center font-black text-red-600">
                    {r.critical > 0 ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold">{r.critical}</span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-700 capitalize">{r.topCategory}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${
                      r.riskIndex >= 60
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : r.riskIndex >= 35
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {r.riskIndex} / 100
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
