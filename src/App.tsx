import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart3, 
  LineChart as LineIcon, 
  AreaChart as AreaIcon, 
  Database, 
  Globe, 
  Settings2, 
  Download, 
  RefreshCw,
  ChevronDown,
  Info,
  Check,
  Layers,
  Trophy,
  Zap,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchMultiSeriesData, ENTITIES, INDICATORS, fetchCountries } from './services/dataService';
import { DataPoint, ChartConfig, SeriesConfig, DataCategory, Entity } from './types';
import ChartView from './components/ChartView';

const COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#0ea5e9', // Sky
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
];

type ComparisonMode = 'entity' | 'indicator';

export default function App() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Entity[]>([]);
  const [category, setCategory] = useState<DataCategory>('public');
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('entity');
  const [selectedLeague, setSelectedLeague] = useState<string>('NFL');
  const [entitySearch, setEntitySearch] = useState('');
  const [indicatorSearch, setIndicatorSearch] = useState('');
  
  // Fetch countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      const list = await fetchCountries();
      setCountries(list);
    };
    loadCountries();
  }, []);

  // Filtered lists based on category and league
  const filteredEntities = useMemo(() => {
    let base = category === 'public' 
      ? (countries.length > 0 ? countries : ENTITIES.filter(e => e.category === 'public'))
      : ENTITIES.filter(e => e.category === 'sports' && e.subCategory === selectedLeague);
    
    if (entitySearch) {
      const search = entitySearch.toLowerCase();
      base = base.filter(e => e.name.toLowerCase().includes(search) || e.code.toLowerCase().includes(search));
    }
    return base;
  }, [category, selectedLeague, countries, entitySearch]);

  const filteredIndicators = useMemo(() => {
    let base = INDICATORS.filter(i => i.category === category);
    if (indicatorSearch) {
      const search = indicatorSearch.toLowerCase();
      base = base.filter(i => i.name.toLowerCase().includes(search));
    }
    return base;
  }, [category, indicatorSearch]);

  // Selection states
  const [selectedEntityCodes, setSelectedEntityCodes] = useState<string[]>([filteredEntities[0]?.code || '']);
  const [selectedIndicatorIds, setSelectedIndicatorIds] = useState<string[]>([filteredIndicators[0]?.id || '']);
  
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [startYear, setStartYear] = useState<number>(2000);
  const [endYear, setEndYear] = useState<number>(new Date().getFullYear());
  const [customColors, setCustomColors] = useState<{ [key: string]: string }>({});

  // Reset selections when category or league changes
  useEffect(() => {
    const newEntities = category === 'public' 
      ? (countries.length > 0 ? countries : ENTITIES.filter(e => e.category === 'public'))
      : ENTITIES.filter(e => e.category === 'sports' && e.subCategory === selectedLeague);
    
    const newIndicators = INDICATORS.filter(i => i.category === category);
    
    if (newEntities.length > 0) setSelectedEntityCodes([newEntities[0].code]);
    if (newIndicators.length > 0) setSelectedIndicatorIds([newIndicators[0].id]);
    setComparisonMode('entity');
    
    // Reset time range based on category
    if (category === 'public') {
      setStartYear(1990);
    } else {
      setStartYear(new Date().getFullYear() - 15);
    }
  }, [category, selectedLeague, countries]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let requests: { entityCode: string; indicatorId: string; seriesKey: string; category: DataCategory }[] = [];
      
      if (comparisonMode === 'entity') {
        const indicatorId = selectedIndicatorIds[0];
        requests = selectedEntityCodes.map(code => ({
          entityCode: code,
          indicatorId,
          seriesKey: code,
          category
        }));
      } else {
        const entityCode = selectedEntityCodes[0];
        requests = selectedIndicatorIds.map(id => ({
          entityCode,
          indicatorId: id,
          seriesKey: id,
          category
        }));
      }

      const result = await fetchMultiSeriesData(requests);
      setData(result);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [category, comparisonMode, selectedEntityCodes, selectedIndicatorIds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredData = useMemo(() => {
    return data.filter(d => d.year >= startYear && d.year <= endYear);
  }, [data, startYear, endYear]);

  const chartConfig = useMemo((): ChartConfig => {
    const series: SeriesConfig[] = [];
    let yAxisLabelRight = undefined;
    
    if (comparisonMode === 'entity') {
      selectedEntityCodes.forEach((code, index) => {
        const entity = ENTITIES.find(e => e.code === code);
        series.push({
          key: code,
          name: entity?.name || code,
          color: customColors[code] || COLORS[index % COLORS.length],
          yAxisId: 'left'
        });
      });
    } else {
      selectedIndicatorIds.forEach((id, index) => {
        const indicator = INDICATORS.find(i => i.id === id);
        const yAxisId = index === 0 ? 'left' : 'right';
        if (index === 1) {
          yAxisLabelRight = indicator?.name;
        }
        series.push({
          key: id,
          name: indicator?.name || id,
          color: customColors[id] || COLORS[index % COLORS.length],
          yAxisId
        });
      });
    }

    const indicatorName = INDICATORS.find(i => i.id === selectedIndicatorIds[0])?.name;
    const entityName = ENTITIES.find(e => e.code === selectedEntityCodes[0])?.name;

    return {
      type: chartType,
      title: comparisonMode === 'entity' ? `${indicatorName} Comparison` : `${entityName} Analysis`,
      xAxisLabel: 'Year',
      yAxisLabel: indicatorName || 'Value',
      yAxisLabelRight,
      series
    };
  }, [comparisonMode, selectedEntityCodes, selectedIndicatorIds, chartType, customColors]);

  const toggleSelection = (id: string, type: 'entity' | 'indicator') => {
    if (type === 'entity') {
      if (comparisonMode === 'entity') {
        setSelectedEntityCodes(prev => 
          prev.includes(id) ? (prev.length > 1 ? prev.filter(c => c !== id) : prev) : [...prev, id]
        );
      } else {
        setSelectedEntityCodes([id]);
      }
    } else {
      if (comparisonMode === 'indicator') {
        setSelectedIndicatorIds(prev => 
          prev.includes(id) ? (prev.length > 1 ? prev.filter(i => i !== id) : prev) : [...prev, id]
        );
      } else {
        setSelectedIndicatorIds([id]);
      }
    }
  };

  const handleExport = () => {
    if (filteredData.length === 0) return;
    const headers = ['Year', ...chartConfig.series.map(s => s.name)].join(',');
    const rows = filteredData.map(point => {
      const values = chartConfig.series.map(s => point[s.key] || '');
      return [point.year, ...values].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Datalyzer_Export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleColorChange = (key: string, color: string) => {
    setCustomColors(prev => ({ ...prev, [key]: color }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-slate-900 border-b lg:border-r border-slate-800 p-6 flex flex-col gap-8 overflow-y-auto max-h-screen">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <Zap className="text-slate-950 w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white italic">DATALYZER 3000</h1>
            <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.2em]">Stonks Analysis Engine</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Data Category */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <Database className="w-3 h-3" />
              Data Domain
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCategory('public')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  category === 'public' 
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Public
              </button>
              <button
                onClick={() => setCategory('sports')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  category === 'sports' 
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                Sports
              </button>
            </div>
          </section>

          {/* League Selection (Sports Only) */}
          <AnimatePresence>
            {category === 'sports' && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <Trophy className="w-3 h-3" />
                  Select League
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {['NFL', 'NBA', 'MLB', 'NHL'].map(league => (
                    <button
                      key={league}
                      onClick={() => setSelectedLeague(league)}
                      className={`py-2 rounded-lg text-[10px] font-black transition-all border ${
                        selectedLeague === league
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
                      }`}
                    >
                      {league}
                    </button>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Comparison Mode */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <Layers className="w-3 h-3" />
              Compare Mode
            </div>
            <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700">
              <button
                onClick={() => {
                  setComparisonMode('entity');
                  setSelectedIndicatorIds([selectedIndicatorIds[0]]);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  comparisonMode === 'entity' ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {category === 'public' ? 'Countries' : 'Teams'}
              </button>
              <button
                onClick={() => {
                  setComparisonMode('indicator');
                  setSelectedEntityCodes([selectedEntityCodes[0]]);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  comparisonMode === 'indicator' ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Metrics
              </button>
            </div>
          </section>

          {/* Selection */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <Globe className="w-3 h-3" />
                {comparisonMode === 'entity' ? (category === 'public' ? 'Select Countries' : 'Select Teams') : (category === 'public' ? 'Select Country' : 'Select Team')}
              </div>
              <div className="relative group">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="Search..."
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg pl-7 pr-2 py-1 text-[10px] w-24 focus:w-32 focus:border-emerald-500 outline-none transition-all text-slate-300 placeholder:text-slate-600"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto bg-slate-800/50 border border-slate-800 rounded-xl p-2 space-y-1 custom-scrollbar">
              {filteredEntities.map(e => (
                <button
                  key={e.code}
                  onClick={() => toggleSelection(e.code, 'entity')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    selectedEntityCodes.includes(e.code)
                      ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                      : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span>{e.name}</span>
                    {e.subCategory && <span className="text-[9px] opacity-50 font-mono uppercase">{e.subCategory}</span>}
                  </div>
                  {selectedEntityCodes.includes(e.code) && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <Database className="w-3 h-3" />
                {comparisonMode === 'indicator' ? 'Select Metrics' : 'Select Metric'}
              </div>
              <div className="relative group">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="Search..."
                  value={indicatorSearch}
                  onChange={(e) => setIndicatorSearch(e.target.value)}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg pl-7 pr-2 py-1 text-[10px] w-24 focus:w-32 focus:border-emerald-500 outline-none transition-all text-slate-300 placeholder:text-slate-600"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto bg-slate-800/50 border border-slate-800 rounded-xl p-2 space-y-1 custom-scrollbar">
              {filteredIndicators.map(i => (
                <button
                  key={i.id}
                  onClick={() => toggleSelection(i.id, 'indicator')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-all ${
                    selectedIndicatorIds.includes(i.id)
                      ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                      : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <span className="truncate">{i.name}</span>
                  {selectedIndicatorIds.includes(i.id) && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </section>

          {/* Time Range */}
          <section className="space-y-4 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <RefreshCw className="w-3 h-3" />
              Time Range
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Start</label>
                <input 
                  type="number" 
                  value={startYear}
                  onChange={(e) => setStartYear(parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-emerald-400 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">End</label>
                <input 
                  type="number" 
                  value={endYear}
                  onChange={(e) => setEndYear(parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-emerald-400 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Chart Customization */}
          <section className="space-y-4 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <Settings2 className="w-3 h-3" />
              Viz Style
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'line', icon: LineIcon },
                { id: 'bar', icon: BarChart3 },
                { id: 'area', icon: AreaIcon },
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setChartType(type.id as any)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                    chartType === type.id 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                      : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  <type.icon className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-bold uppercase">{type.id}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <button 
            onClick={handleExport}
            disabled={loading || data.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-slate-950 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-30 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 flex flex-col gap-6 overflow-hidden bg-slate-950">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Live Analysis Active</span>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">{chartConfig.title}</h2>
            <p className="text-slate-500 text-xs font-medium flex items-center gap-1.5 mt-1">
              <Layers className="w-3.5 h-3.5" />
              {comparisonMode === 'entity' 
                ? `${selectedEntityCodes.length} ${category === 'public' ? 'Regions' : 'Teams'} Active` 
                : `${selectedIndicatorIds.length} Metrics Active`}
              <span className="mx-1 opacity-30">|</span>
              Source: {category === 'public' ? 'World Bank' : 'SportsDB Historical'}
            </p>
          </div>
          
          <button 
            onClick={loadData}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-emerald-400 transition-all shadow-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
            RE-SYNC
          </button>
        </header>

        {/* Visualization Area */}
        <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 lg:p-10 relative min-h-[400px] shadow-2xl overflow-hidden">
          {/* Background Grid Decoration */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/40 backdrop-blur-sm z-10"
              >
                <div className="relative">
                  <div className="w-16 h-16 border-2 border-emerald-500/20 rounded-full" />
                  <div className="absolute inset-0 w-16 h-16 border-t-2 border-emerald-500 rounded-full animate-spin" />
                </div>
                <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.3em] animate-pulse">Crunching Numbers...</p>
              </motion.div>
            ) : (
              <motion.div 
                key="chart"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full h-full"
              >
                <ChartView data={filteredData} config={chartConfig} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legend / Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {chartConfig.series.map((s) => (
            <div key={s.key} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 hover:border-emerald-500/30 transition-all group relative">
              <div className="relative">
                <button 
                  onClick={(e) => {
                    const picker = e.currentTarget.nextElementSibling as HTMLElement;
                    picker.classList.toggle('hidden');
                  }}
                  className="w-3 h-10 rounded-full transition-all group-hover:shadow-[0_0_10px_currentColor] cursor-pointer" 
                  style={{ backgroundColor: s.color, color: s.color }} 
                />
                <div className="hidden absolute bottom-full left-0 mb-2 p-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 grid grid-cols-4 gap-1">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={(e) => {
                        handleColorChange(s.key, c);
                        e.currentTarget.parentElement?.classList.add('hidden');
                      }}
                      className="w-4 h-4 rounded-full hover:scale-125 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate mb-0.5">{s.name}</h4>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-black text-white truncate tracking-tighter">
                    {filteredData.length > 0 && filteredData[filteredData.length - 1][s.key] !== undefined 
                      ? Number(filteredData[filteredData.length - 1][s.key]).toLocaleString() 
                      : '---'}
                  </p>
                  <span className="text-[9px] font-mono text-emerald-500/60 font-bold">LATEST</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}
