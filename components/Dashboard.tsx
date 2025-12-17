import React, { useState, useEffect } from 'react';
import { QuoteRequest, Role, QuoteStatus, ModalType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { User } from '../types';
import { getUserName } from '../services/db';
import { IconSearch, IconShip, IconPlane, IconTruck, IconClock } from './Icons';

interface Props {
  user: User;
  quotes: QuoteRequest[];
  onStatusClick: (status: QuoteStatus) => void;
  onQuoteClick: (quote: QuoteRequest) => void;
}

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE'];

interface DrillDownItem {
    id: string;
    client: string;
    hours: number;
    timestamp: string;
}

interface DrillDownData {
    title: string;
    items: DrillDownItem[];
}

const getBusinessDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // First Business Day
    let firstDay = new Date(year, month, 1);
    if (firstDay.getDay() === 0) firstDay.setDate(2); // Sunday -> Monday
    else if (firstDay.getDay() === 6) firstDay.setDate(3); // Saturday -> Monday

    // Last Business Day
    let lastDay = new Date(year, month + 1, 0); // Last day of current month
    if (lastDay.getDay() === 0) lastDay.setDate(lastDay.getDate() - 2); // Sunday -> Friday
    else if (lastDay.getDay() === 6) lastDay.setDate(lastDay.getDate() - 1); // Saturday -> Friday

    const formatDate = (date: Date) => {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    };

    return { start: formatDate(firstDay), end: formatDate(lastDay) };
};

const Dashboard: React.FC<Props> = ({ user, quotes, onStatusClick, onQuoteClick }) => {
  const businessDates = getBusinessDates();
  const [searchTerm, setSearchTerm] = useState('');
  // Initialize with business dates
  const [startDate, setStartDate] = useState(businessDates.start);
  const [endDate, setEndDate] = useState(businessDates.end);
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
  
  // 1. Filter logic based on role (Base access)
  const myQuotes = quotes.filter(q => {
    if (user.role === Role.INSIDE_SALES || user.role === Role.MANAGEMENT) return true;
    if (user.role === Role.SALES) return q.requesterId === user.id;
    if (user.role.startsWith('PRICING')) return q.assignedPricingRole === user.role;
    return false;
  });

  // 2. Filter logic based on Date Range (For Analytics)
  const dateFilteredQuotes = myQuotes.filter(q => {
      if (!q.createdDate) return false;
      const qDate = new Date(q.createdDate).getTime();
      
      const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
      const end = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;

      if (start && qDate < start) return false;
      if (end && qDate > end) return false;
      return true;
  });

  // 3. Search Logic (Global within role, can overlay date)
  const filteredQuotes = searchTerm.trim() === '' 
    ? [] 
    : myQuotes.filter(q => 
        q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.clientRef.toLowerCase().includes(searchTerm.toLowerCase())
      );

  // --- USE dateFilteredQuotes FOR ALL ANALYTICS BELOW ---

  const counts = {
    pendingPricing: dateFilteredQuotes.filter(q => q.status === QuoteStatus.PENDING_PRICING).length,
    pendingSale: dateFilteredQuotes.filter(q => q.status === QuoteStatus.PENDING_SALE || q.status === QuoteStatus.PRICED).length,
    overdue: dateFilteredQuotes.filter(q => {
        const start = new Date(q.createdDate).getTime();
        const now = new Date().getTime();
        return (now - start) > (22 * 60 * 60 * 1000) && q.status !== QuoteStatus.CLOSED_WON && q.status !== QuoteStatus.CLOSED_LOST;
    }).length,
    revalidation: dateFilteredQuotes.filter(q => q.status === QuoteStatus.REVALIDATION_REQ).length,
  };

  const isPricing = user.role.startsWith('PRICING');
  const isManagement = user.role === Role.MANAGEMENT;
  const isInside = user.role === Role.INSIDE_SALES;

  // --- KPI HELPER FUNCTION ---
  const calculateAverageHours = (dataset: QuoteRequest[], startField: keyof QuoteRequest, endField: keyof QuoteRequest) => {
      const validItems = dataset.filter(q => q[startField] && q[endField]);
      if (validItems.length === 0) return 0;

      const totalMs = validItems.reduce((acc, q) => {
          const start = new Date(q[startField] as string).getTime();
          const end = new Date(q[endField] as string).getTime();
          return acc + (end - start);
      }, 0);

      const avgHours = totalMs / validItems.length / (1000 * 60 * 60);
      return parseFloat(avgHours.toFixed(1));
  };

  // --- SPECIFIC TIME METRICS ---
  
  // 1. Inside Sales Metrics
  const insideMetrics = {
      receiptToRequest: calculateAverageHours(dateFilteredQuotes, 'createdDate', 'sentToPricingAt'), // Receipt -> Sent to Pricing
      pricingTime: calculateAverageHours(dateFilteredQuotes, 'sentToPricingAt', 'pricedAt'), // Pricing Duration
  };

  // 2. Pricing Air Metrics
  const airQuotes = dateFilteredQuotes.filter(q => q.modalMain.includes('Aéreo'));
  const airMetrics = {
      export: calculateAverageHours(airQuotes.filter(q => q.operationType === 'Export' && q.modalMain !== ModalType.AIR_COURIER), 'sentToPricingAt', 'pricedAt'),
      import: calculateAverageHours(airQuotes.filter(q => q.operationType === 'Import' && q.modalMain !== ModalType.AIR_COURIER), 'sentToPricingAt', 'pricedAt'),
      courier: calculateAverageHours(airQuotes.filter(q => q.modalMain === ModalType.AIR_COURIER), 'sentToPricingAt', 'pricedAt'),
  };

  // 3. Pricing Sea Metrics
  const seaQuotes = dateFilteredQuotes.filter(q => q.modalMain.includes('Marítimo'));
  const seaMetrics = {
      lclImp: calculateAverageHours(seaQuotes.filter(q => q.modalMain === ModalType.SEA_LCL && q.operationType === 'Import'), 'sentToPricingAt', 'pricedAt'),
      lclExp: calculateAverageHours(seaQuotes.filter(q => q.modalMain === ModalType.SEA_LCL && q.operationType === 'Export'), 'sentToPricingAt', 'pricedAt'),
      fclImp: calculateAverageHours(seaQuotes.filter(q => q.modalMain === ModalType.SEA_FCL && q.operationType === 'Import'), 'sentToPricingAt', 'pricedAt'),
      fclExp: calculateAverageHours(seaQuotes.filter(q => q.modalMain === ModalType.SEA_FCL && q.operationType === 'Export'), 'sentToPricingAt', 'pricedAt'),
  };

  // 4. Pricing Road Metrics
  const roadQuotes = dateFilteredQuotes.filter(q => q.modalMain.includes('Rodoviário'));
  const roadMetrics = {
      national: calculateAverageHours(roadQuotes.filter(q => q.modalMain === ModalType.ROAD_NATIONAL), 'sentToPricingAt', 'pricedAt'),
      intlImp: calculateAverageHours(roadQuotes.filter(q => q.modalMain === ModalType.ROAD_INTL && q.operationType === 'Import'), 'sentToPricingAt', 'pricedAt'),
      intlExp: calculateAverageHours(roadQuotes.filter(q => q.modalMain === ModalType.ROAD_INTL && q.operationType === 'Export'), 'sentToPricingAt', 'pricedAt'),
  };

  // --- SUPPLIER PERFORMANCE CALCULATION ---
  const supplierStats: Record<string, { totalTimeMs: number; count: number }> = {};
  
  dateFilteredQuotes.forEach(q => {
      if (q.pricingOptions) {
          q.pricingOptions.forEach(opt => {
              if (opt.supplierName && opt.requestedAt && opt.respondedAt) {
                  const duration = new Date(opt.respondedAt).getTime() - new Date(opt.requestedAt).getTime();
                  if (duration > 0) {
                      if (!supplierStats[opt.supplierName]) {
                          supplierStats[opt.supplierName] = { totalTimeMs: 0, count: 0 };
                      }
                      supplierStats[opt.supplierName].totalTimeMs += duration;
                      supplierStats[opt.supplierName].count++;
                  }
              }
          });
      }
  });

  const topSuppliers = Object.keys(supplierStats)
      .map(name => ({
          name,
          avgMinutes: Math.round((supplierStats[name].totalTimeMs / supplierStats[name].count) / 60000), // In Minutes
          count: supplierStats[name].count
      }))
      .sort((a, b) => a.avgMinutes - b.avgMinutes) // Fastest first
      .slice(0, 10);


  // --- ANALYTICS DATA CALCULATION ---
  
  // 1. Pricing Response Time (General for charts)
  const pricingTimeStats: Record<string, { totalHours: number; count: number; details: DrillDownItem[] }> = {};
  
  dateFilteredQuotes.forEach(q => {
      if (q.pricedAt && q.createdDate) {
          const hours = (new Date(q.pricedAt).getTime() - new Date(q.createdDate).getTime()) / (1000 * 60 * 60);
          const role = q.assignedPricingRole.replace('PRICING_', '');
          
          if (!pricingTimeStats[role]) pricingTimeStats[role] = { totalHours: 0, count: 0, details: [] };
          
          pricingTimeStats[role].totalHours += hours;
          pricingTimeStats[role].count++;
          pricingTimeStats[role].details.push({
              id: q.id,
              client: q.clientName,
              hours: parseFloat(hours.toFixed(1)),
              timestamp: q.pricedAt
          });
      }
  });

  const pricingChartData = Object.keys(pricingTimeStats).map(role => ({
      name: role,
      hours: parseFloat((pricingTimeStats[role].totalHours / pricingTimeStats[role].count).toFixed(1)),
      details: pricingTimeStats[role].details
  }));

  // 2. Sales Response Time
  const salesTimeStats: Record<string, { totalHours: number; count: number; details: DrillDownItem[] }> = {};
  
  dateFilteredQuotes.forEach(q => {
      if (q.proposalSavedAt && q.pricedAt) {
          const hours = (new Date(q.proposalSavedAt).getTime() - new Date(q.pricedAt).getTime()) / (1000 * 60 * 60);
          const userName = getUserName(q.requesterId); 
          
          if (!salesTimeStats[userName]) salesTimeStats[userName] = { totalHours: 0, count: 0, details: [] };
          
          salesTimeStats[userName].totalHours += hours;
          salesTimeStats[userName].count++;
          salesTimeStats[userName].details.push({
              id: q.id,
              client: q.clientName,
              hours: parseFloat(hours.toFixed(1)),
              timestamp: q.proposalSavedAt
          });
      }
  });

  const salesChartData = Object.keys(salesTimeStats).map(name => ({
      name: name.split(' ')[0], 
      fullName: name,
      hours: parseFloat((salesTimeStats[name].totalHours / salesTimeStats[name].count).toFixed(1)),
      details: salesTimeStats[name].details
  }));

  // 3. Total Turnaround Time
  const totalTimeStats: Record<string, { totalHours: number; count: number; details: DrillDownItem[] }> = {};

  dateFilteredQuotes.forEach(q => {
      if (q.proposalSavedAt && q.createdDate) {
          const hours = (new Date(q.proposalSavedAt).getTime() - new Date(q.createdDate).getTime()) / (1000 * 60 * 60);
          const key = q.modalMain;

          if (!totalTimeStats[key]) totalTimeStats[key] = { totalHours: 0, count: 0, details: [] };
          
          totalTimeStats[key].totalHours += hours;
          totalTimeStats[key].count++;
          totalTimeStats[key].details.push({
              id: q.id,
              client: q.clientName,
              hours: parseFloat(hours.toFixed(1)),
              timestamp: q.proposalSavedAt
          });
      }
  });

  const totalChartData = Object.keys(totalTimeStats).map(key => ({
      name: key,
      hours: parseFloat((totalTimeStats[key].totalHours / totalTimeStats[key].count).toFixed(1)),
      details: totalTimeStats[key].details
  }));

  // 4. Client Analytics (Top 10 Wins & Profit)
  const clientStats: Record<string, { wins: number; profit: number }> = {};
  
  // Seed with visual mock data because seed DB is sparse
  const mockClients = [
      { name: 'Tech Imports Ltd', wins: 15, profit: 12500 },
      { name: 'Agro Exports SA', wins: 12, profit: 8900 },
      { name: 'Fast Retail', wins: 10, profit: 15400 },
      { name: 'Global Motors', wins: 8, profit: 22100 },
      { name: 'Nexus Trading', wins: 7, profit: 6500 },
      { name: 'Solar Energy Co', wins: 6, profit: 9800 },
      { name: 'Foods & Goods', wins: 5, profit: 4200 },
      { name: 'Luxury Home', wins: 5, profit: 7100 },
      { name: 'Steel Works', wins: 4, profit: 11200 },
      { name: 'BioMed Inc', wins: 3, profit: 3400 },
  ];

  dateFilteredQuotes.forEach(q => {
      if (!clientStats[q.clientName]) clientStats[q.clientName] = { wins: 0, profit: 0 };
      
      if (q.status === QuoteStatus.CLOSED_WON) {
          clientStats[q.clientName].wins += 1;
      }

      // Calculate profit from best option
      const profit = q.pricingOptions?.reduce((max, opt) => Math.max(max, opt.estimatedProfit || 0), 0) || 0;
      if (profit > 0) {
          clientStats[q.clientName].profit += profit;
      }
  });

  // Use real data if available, or if the filter is active and returns nothing, show nothing (don't show mock data if filter is active)
  const isFiltering = startDate !== '' || endDate !== '';
  const hasRealData = Object.values(clientStats).some(x => x.wins > 0 || x.profit > 0);
  
  let finalClientData = mockClients;
  if (hasRealData) {
      finalClientData = Object.entries(clientStats).map(([name, stats]) => ({ name, ...stats }));
  } else if (isFiltering && dateFilteredQuotes.length === 0) {
      finalClientData = []; // Show empty if filtering yields no results
  }

  const topClientsWins = [...finalClientData].sort((a,b) => b.wins - a.wins).slice(0, 10);
  const topClientsProfit = [...finalClientData].sort((a,b) => b.profit - a.profit).slice(0, 10);

  // 5. Modal Distribution with Conversion Rates
  const modalStats: Record<string, { total: number; won: number }> = {
      'Marítimo': { total: 0, won: 0 },
      'Aéreo': { total: 0, won: 0 },
      'Rodoviário': { total: 0, won: 0 },
  };

  dateFilteredQuotes.forEach(q => {
      let key = 'Outros';
      if (q.modalMain.includes('Marítimo')) key = 'Marítimo';
      else if (q.modalMain.includes('Aéreo')) key = 'Aéreo';
      else if (q.modalMain.includes('Rodoviário')) key = 'Rodoviário';

      if(modalStats[key]) {
           modalStats[key].total++;
           if (q.status === QuoteStatus.CLOSED_WON) modalStats[key].won++;
      }
  });

  const hasRealModalData = Object.values(modalStats).some(m => m.total > 0);

  // Fallback data structure that mimics the request: "150 cotados, 70 ganhos" type logic
  const mockModalData = [
      { name: 'Marítimo', value: 150, won: 70, rate: '46.7' },
      { name: 'Aéreo', value: 80, won: 30, rate: '37.5' },
      { name: 'Rodoviário', value: 50, won: 45, rate: '90.0' },
  ];

  let modalChartData = mockModalData;
  if (hasRealModalData) {
       modalChartData = Object.keys(modalStats)
        .filter(key => modalStats[key].total > 0)
        .map(key => ({
            name: key,
            value: modalStats[key].total,
            won: modalStats[key].won,
            rate: modalStats[key].total > 0 ? ((modalStats[key].won / modalStats[key].total) * 100).toFixed(1) : '0.0'
        }));
  } else if (isFiltering && dateFilteredQuotes.length === 0) {
      modalChartData = [];
  }


  const StatCard = ({ title, count, color, onClick, borderColor }: any) => (
    <div 
        onClick={onClick} 
        className={`cursor-pointer glass-panel p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
    >
        <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
            <p className={`text-4xl font-semibold ${color} tracking-tight`}>{count}</p>
        </div>
        <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-20 blur-xl ${borderColor.replace('bg-', 'bg-')}`}></div>
    </div>
  );

  const TimeMetricCard = ({ title, value, icon }: any) => (
      <div className="bg-white/50 border border-white/60 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">{title}</p>
              <div className="flex items-baseline">
                  <span className="text-xl font-bold text-slate-700">{value}</span>
                  <span className="text-xs text-slate-400 ml-1">h</span>
              </div>
          </div>
          <div className="text-slate-300 bg-slate-100/50 p-2 rounded-lg">
              {icon || <IconClock />}
          </div>
      </div>
  );

  // Custom Tooltip for Pie Chart
  const CustomModalTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="glass-panel p-4 rounded-xl border border-white/60 shadow-xl backdrop-blur-md min-w-[180px]">
                <p className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">{data.name}</p>
                
                <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>Volume Total:</span>
                        <span className="font-semibold text-slate-700 text-xs">{data.value}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>Fechamentos:</span>
                        <span className="font-semibold text-emerald-600 text-xs">{data.won}</span>
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-200/50">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Conversão</span>
                        <span className="text-xs font-bold text-emerald-600">{data.rate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                         <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${data.rate}%` }}></div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-10 relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1">
            <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">
                Visão Geral
            </h1>
             <p className="text-slate-500 text-sm mt-1">Bem-vindo(a), {user.name.split(' ')[0]}</p>
        </div>
        
        {/* Filters Container */}
        <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto z-20">
            {/* Date Filters */}
            <div className="flex items-center bg-white/40 p-1 rounded-xl border border-white/60 shadow-sm backdrop-blur-sm">
                <div className="flex items-center px-2 border-r border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">De:</span>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent border-none text-xs text-slate-700 focus:ring-0 p-1 w-28 font-medium" 
                    />
                </div>
                <div className="flex items-center px-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Até:</span>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent border-none text-xs text-slate-700 focus:ring-0 p-1 w-28 font-medium" 
                    />
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-64 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 group-focus-within:text-accent transition-colors"><IconSearch /></span>
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-accent/50 transition-all"
                    placeholder="Buscar Cotação..."
                />
            </div>
        </div>
      </div>

      {/* Drill Down Modal Overlay */}
      {drillDownData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in" onClick={() => setDrillDownData(null)}>
              <div className="glass-panel w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-black/5 flex justify-between items-center bg-white/40 backdrop-blur-md">
                      <div>
                          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Detalhamento: {drillDownData.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">Lista de cotações contabilizadas na média</p>
                      </div>
                      <button onClick={() => setDrillDownData(null)} className="text-slate-400 hover:text-rose-500 transition-colors text-2xl leading-none">&times;</button>
                  </div>
                  <div className="overflow-y-auto p-0 flex-1 custom-scrollbar bg-white/30">
                      <table className="min-w-full divide-y divide-black/5">
                          <thead className="bg-white/40 sticky top-0 backdrop-blur-md">
                              <tr>
                                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">ID</th>
                                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Cliente</th>
                                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Conclusão</th>
                                  <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Tempo (h)</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-black/5">
                              {drillDownData.items.map(item => (
                                  <tr key={item.id} className="hover:bg-white/40 transition-colors">
                                      <td className="px-6 py-3 text-xs font-mono font-medium text-accent">{item.id}</td>
                                      <td className="px-6 py-3 text-xs text-slate-700">{item.client}</td>
                                      <td className="px-6 py-3 text-[10px] text-slate-500">
                                          {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </td>
                                      <td className="px-6 py-3 text-right">
                                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${item.hours > 22 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                              {item.hours}h
                                          </span>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* Search Results Overlay */}
      {searchTerm && (
          <div className="animate-fade-in glass-panel rounded-2xl p-6 shadow-glass border-accent/20">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center">
                  Resultados da Busca <span className="ml-2 bg-accent text-white text-[10px] px-2 py-0.5 rounded-full">{filteredQuotes.length}</span>
              </h3>
              
              {filteredQuotes.length > 0 ? (
                  <div className="overflow-x-auto">
                      <table className="min-w-full text-left">
                          <thead className="text-[10px] uppercase text-slate-500 border-b border-black/5">
                              <tr>
                                  <th className="px-4 py-2 font-bold">ID</th>
                                  <th className="px-4 py-2 font-bold">Cliente</th>
                                  <th className="px-4 py-2 font-bold">Modal</th>
                                  <th className="px-4 py-2 font-bold">Status</th>
                                  <th className="px-4 py-2 font-bold text-right">Ação</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-black/5">
                              {filteredQuotes.map(q => (
                                  <tr key={q.id} onClick={() => onQuoteClick(q)} className="hover:bg-accent/5 cursor-pointer transition-colors group">
                                      <td className="px-4 py-3 font-mono text-xs text-accent font-medium">{q.id}</td>
                                      <td className="px-4 py-3 text-sm text-slate-700 font-medium">{q.clientName}</td>
                                      <td className="px-4 py-3 text-xs text-slate-500 flex items-center">
                                         <span className="mr-2">
                                            {q.modalMain.includes('Aéreo') && <IconPlane />}
                                            {q.modalMain.includes('Marítimo') && <IconShip />}
                                            {q.modalMain.includes('Rodoviário') && <IconTruck />}
                                         </span>
                                         {q.modalMain}
                                      </td>
                                      <td className="px-4 py-3">
                                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                              {q.status === QuoteStatus.CLOSED_WON ? 'Ganho' : q.status === QuoteStatus.CLOSED_LOST ? 'Perdido' : q.status.replace(/_/g, ' ')}
                                          </span>
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                          <span className="text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                              Abrir ›
                                          </span>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              ) : (
                  <div className="text-center py-8 text-slate-400">
                      <p>Nenhum resultado encontrado para "{searchTerm}"</p>
                  </div>
              )}
          </div>
      )}

      {/* Standard Dashboard Content */}
      {!searchTerm && (
        <>
            {/* Main KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard 
                    title="Aguardando Pricing" 
                    count={counts.pendingPricing} 
                    color="text-slate-800" 
                    borderColor="bg-yellow-400"
                    onClick={() => onStatusClick(QuoteStatus.PENDING_PRICING)} 
                />
                
                <StatCard 
                    title={isPricing ? 'Cotadas' : 'Aguardando Venda'}
                    count={counts.pendingSale} 
                    color="text-slate-800" 
                    borderColor="bg-blue-400"
                    onClick={() => onStatusClick(QuoteStatus.PENDING_SALE)} 
                />

                <StatCard 
                    title="Atrasadas (>22h)" 
                    count={counts.overdue} 
                    color="text-rose-500" 
                    borderColor="bg-rose-500"
                    onClick={() => onStatusClick(QuoteStatus.OVERDUE)} 
                />

                <StatCard 
                    title="Revalidações" 
                    count={counts.revalidation} 
                    color="text-slate-800" 
                    borderColor="bg-orange-400"
                    onClick={() => onStatusClick(QuoteStatus.REVALIDATION_REQ)} 
                />
            </div>

            {/* Department Specific Time Metrics */}
            <div className="mt-8">
                {/* 1. Inside Sales Time Metrics */}
                {(isInside || isManagement) && (
                    <div className="mb-6">
                         <div className="flex items-center space-x-2 mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tempos Médios - Inside Sales</h3>
                            <div className="h-px bg-slate-200 flex-1"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <TimeMetricCard title="Recebimento → Solicitação" value={insideMetrics.receiptToRequest} />
                            <TimeMetricCard title="Tempo de Precificação" value={insideMetrics.pricingTime} />
                        </div>
                    </div>
                )}

                {/* 2. Pricing Air Metrics */}
                {(user.role === Role.PRICING_AIR || isManagement) && (
                    <div className="mb-6">
                        <div className="flex items-center space-x-2 mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tempos Médios - Pricing Aéreo</h3>
                            <div className="h-px bg-slate-200 flex-1"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <TimeMetricCard title="Exportação" value={airMetrics.export} icon={<IconPlane />} />
                            <TimeMetricCard title="Importação" value={airMetrics.import} icon={<IconPlane />} />
                            <TimeMetricCard title="Courier" value={airMetrics.courier} icon={<IconPlane />} />
                        </div>
                    </div>
                )}

                {/* 3. Pricing Sea Metrics */}
                 {(user.role === Role.PRICING_SEA || isManagement) && (
                    <div className="mb-6">
                         <div className="flex items-center space-x-2 mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tempos Médios - Pricing Marítimo</h3>
                            <div className="h-px bg-slate-200 flex-1"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <TimeMetricCard title="LCL Importação" value={seaMetrics.lclImp} icon={<IconShip />} />
                            <TimeMetricCard title="LCL Exportação" value={seaMetrics.lclExp} icon={<IconShip />} />
                            <TimeMetricCard title="FCL Importação" value={seaMetrics.fclImp} icon={<IconShip />} />
                            <TimeMetricCard title="FCL Exportação" value={seaMetrics.fclExp} icon={<IconShip />} />
                        </div>
                    </div>
                )}

                {/* 4. Pricing Road Metrics */}
                {(user.role === Role.PRICING_ROAD || isManagement) && (
                    <div className="mb-6">
                         <div className="flex items-center space-x-2 mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tempos Médios - Pricing Rodoviário</h3>
                            <div className="h-px bg-slate-200 flex-1"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <TimeMetricCard title="Nacional" value={roadMetrics.national} icon={<IconTruck />} />
                            <TimeMetricCard title="Intl. Importação" value={roadMetrics.intlImp} icon={<IconTruck />} />
                            <TimeMetricCard title="Intl. Exportação" value={roadMetrics.intlExp} icon={<IconTruck />} />
                        </div>
                    </div>
                )}
            </div>

            {/* Supplier Performance Section */}
            {(isPricing || isManagement) && topSuppliers.length > 0 && (
                <div className="mb-8 glass-panel p-6 rounded-2xl shadow-sm">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Desempenho de Fornecedores (Top 10 Mais Rápidos)</h3>
                        <span className="text-[10px] text-slate-400 bg-white px-2 py-1 rounded border border-slate-100">Tempo médio de resposta (Valores Preenchidos)</span>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="flex space-x-4 pb-2">
                             {topSuppliers.map((s, idx) => (
                                 <div key={idx} className="flex-shrink-0 w-48 bg-white/40 p-4 rounded-xl border border-white/50 flex flex-col items-center text-center backdrop-blur-sm">
                                     <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 ${idx < 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                         {idx + 1}
                                     </div>
                                     <p className="text-xs font-bold text-slate-700 truncate w-full" title={s.name}>{s.name}</p>
                                     <div className="mt-2 flex items-baseline">
                                         <span className="text-lg font-bold text-emerald-600">{s.avgMinutes}</span>
                                         <span className="text-[10px] text-slate-400 ml-1">min</span>
                                     </div>
                                     <p className="text-[9px] text-slate-400 mt-1">{s.count} cotações</p>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
            )}

            {/* SLA Management Report (Visible only to Management) */}
            {isManagement && (
                <div className="space-y-8 mt-4">
                    <div className="flex items-center space-x-2">
                        <div className="h-px bg-slate-300 flex-1"></div>
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-4">Relatório Gerencial de SLA (22h Úteis)</h2>
                        <div className="h-px bg-slate-300 flex-1"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Chart 1: Average Pricing Time by Role */}
                        <div className="glass-panel p-6 rounded-2xl shadow-sm">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Tempo Médio - Pricing</h3>
                            <p className="text-xs text-slate-400 mb-6">Tempo entre Criação e Precificação (Clique para detalhes)</p>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={pricingChartData} barSize={40}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8e8e93', fontSize: 11}} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#8e8e93', fontSize: 11}} />
                                        <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        <ReferenceLine y={22} label="SLA 22h" stroke="red" strokeDasharray="3 3" />
                                        <Bar 
                                            dataKey="hours" 
                                            fill="#007AFF" 
                                            radius={[4, 4, 0, 0]} 
                                            name="Horas" 
                                            onClick={(data) => {
                                                if (data && data.payload && data.payload.details) {
                                                    setDrillDownData({ title: `Pricing - ${data.payload.name}`, items: data.payload.details });
                                                }
                                            }}
                                            cursor="pointer"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Chart 2: Average Sales Proposal Time by User */}
                        <div className="glass-panel p-6 rounded-2xl shadow-sm">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Tempo Médio - Vendas</h3>
                            <p className="text-xs text-slate-400 mb-6">Tempo entre Precificação Recebida e Proposta Gerada (Clique para detalhes)</p>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={salesChartData} barSize={40}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8e8e93', fontSize: 11}} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#8e8e93', fontSize: 11}} />
                                        <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        <Bar 
                                            dataKey="hours" 
                                            fill="#34C759" 
                                            radius={[4, 4, 0, 0]} 
                                            name="Horas"
                                            onClick={(data) => {
                                                if (data && data.payload && data.payload.details) {
                                                    setDrillDownData({ title: `Vendas - ${data.payload.fullName}`, items: data.payload.details });
                                                }
                                            }}
                                            cursor="pointer"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Chart 3: Total End-to-End Time */}
                    <div className="glass-panel p-6 rounded-2xl shadow-sm">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Tempo Total (End-to-End)</h3>
                        <p className="text-xs text-slate-400 mb-6">Tempo Total: Criação ➔ Proposta Final (Agrupado por Modal)</p>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={totalChartData} barSize={60}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8e8e93', fontSize: 11}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#8e8e93', fontSize: 11}} />
                                    <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                    <Bar 
                                        dataKey="hours" 
                                        fill="#AF52DE" 
                                        radius={[4, 4, 0, 0]} 
                                        name="Horas Totais"
                                        onClick={(data) => {
                                            if (data && data.payload && data.payload.details) {
                                                setDrillDownData({ title: `Tempo Total - ${data.payload.name}`, items: data.payload.details });
                                            }
                                        }}
                                        cursor="pointer"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* General Analytics Section (Top 10s) */}
            {isManagement && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    {/* Top 10 Clients by Closing Volume */}
                    <div className="glass-panel p-6 rounded-2xl shadow-sm">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-6">Top 10 Clientes (Fechamentos)</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topClientsWins} layout="vertical" margin={{ left: 30, right: 30 }} barSize={15}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(0,0,0,0.03)" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#8e8e93', fontSize: 10}} hide />
                                    <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 500}} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.9)', fontSize: '12px' }} 
                                        cursor={{fill: 'rgba(0,0,0,0.02)'}}
                                    />
                                    <Bar dataKey="wins" fill="#34C759" name="Fechamentos (Qtd)" radius={[0, 4, 4, 0]}>
                                        {/* Label on the right */}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top 10 Clients by Profitability */}
                    <div className="glass-panel p-6 rounded-2xl shadow-sm">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-6">Top 10 Clientes (Rentabilidade)</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topClientsProfit} layout="vertical" margin={{ left: 30, right: 30 }} barSize={15}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(0,0,0,0.03)" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#8e8e93', fontSize: 10}} hide />
                                    <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 500}} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.9)', fontSize: '12px' }} 
                                        cursor={{fill: 'rgba(0,0,0,0.02)'}}
                                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Lucro']}
                                    />
                                    <Bar dataKey="profit" fill="#007AFF" name="Lucro Estimado" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal Distribution */}
            {isManagement && (
                 <div className="mt-8 glass-panel p-6 rounded-2xl shadow-sm">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-6">Distribuição por Modal (com Taxa de Conversão)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={modalChartData} 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={70} 
                                    outerRadius={90} 
                                    fill="#8884d8" 
                                    paddingAngle={5} 
                                    dataKey="value" 
                                    stroke="none"
                                >
                                    {modalChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomModalTooltip />} />
                                <Legend wrapperStyle={{fontSize: '12px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default Dashboard;