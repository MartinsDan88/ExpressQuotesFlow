import React, { useState, useMemo } from 'react';
import { QuoteRequest, QuoteStatus, ModalType, Role } from '../types';
import { getUserName } from '../services/db';
import { IconSearch, IconShip, IconPlane, IconTruck, IconCheck, IconTrash } from './Icons';

interface Props {
  quotes: QuoteRequest[];
  onQuoteClick: (quote: QuoteRequest) => void;
}

const DynamicFilter: React.FC<Props> = ({ quotes, onQuoteClick }) => {
  // Filter States
  const [clientFilter, setClientFilter] = useState('');
  const [opTypeFilter, setOpTypeFilter] = useState<'Import' | 'Export' | 'ALL'>('ALL');
  const [modalFilter, setModalFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [requesterFilter, setRequesterFilter] = useState(''); // Text search for requester name

  // Clear Filters
  const clearFilters = () => {
      setClientFilter('');
      setOpTypeFilter('ALL');
      setModalFilter('ALL');
      setStatusFilter('ALL');
      setStartDate('');
      setEndDate('');
      setRequesterFilter('');
  };

  // Filter Logic
  const filteredData = useMemo(() => {
    return quotes.filter(q => {
        // Client
        if (clientFilter && !q.clientName.toLowerCase().includes(clientFilter.toLowerCase())) return false;
        
        // Operation Type
        if (opTypeFilter !== 'ALL' && q.operationType !== opTypeFilter) return false;
        
        // Modal
        if (modalFilter !== 'ALL' && q.modalMain !== modalFilter) return false;
        
        // Status
        if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
        
        // Date Range
        if (startDate || endDate) {
            const qDate = new Date(q.createdDate).getTime();
            const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
            const end = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;

            if (start && qDate < start) return false;
            if (end && qDate > end) return false;
        }

        // Requester Name
        if (requesterFilter) {
            const requesterName = getUserName(q.requesterId).toLowerCase();
            if (!requesterName.includes(requesterFilter.toLowerCase())) return false;
        }

        return true;
    });
  }, [quotes, clientFilter, opTypeFilter, modalFilter, statusFilter, startDate, endDate, requesterFilter]);

  // Statistics Calculation
  const stats = useMemo(() => {
      const total = filteredData.length;
      const closedWon = filteredData.filter(q => q.status === QuoteStatus.CLOSED_WON).length;
      const totalProfit = filteredData.reduce((acc, q) => {
           const profit = q.pricingOptions?.reduce((max, opt) => Math.max(max, opt.estimatedProfit || 0), 0) || 0;
           return acc + profit;
      }, 0);
      const conversionRate = total > 0 ? ((closedWon / total) * 100).toFixed(1) : '0.0';

      return { total, closedWon, totalProfit, conversionRate };
  }, [filteredData]);

  return (
    <div className="glass-panel p-8 rounded-2xl shadow-glass min-h-full backdrop-blur-xl animate-fade-in flex flex-col h-full">
        <div className="mb-6 border-b border-black/5 pb-4 flex justify-between items-center">
             <div>
                <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Filtro Dinâmico</h2>
                <p className="text-xs text-slate-500 mt-1">Gerador de relatórios e busca avançada</p>
             </div>
             <button onClick={clearFilters} className="text-xs text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-rose-100 flex items-center">
                 <IconTrash /> <span className="ml-1">Limpar Filtros</span>
             </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8 bg-white/40 p-6 rounded-2xl border border-white/50 shadow-sm backdrop-blur-md">
             <div className="col-span-1 md:col-span-2">
                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cliente</label>
                 <input 
                    type="text" 
                    value={clientFilter} 
                    onChange={e => setClientFilter(e.target.value)} 
                    placeholder="Nome do cliente..." 
                    className="glass-input w-full rounded-lg p-2 text-xs"
                 />
             </div>
             
             <div className="col-span-1">
                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operação</label>
                 <select 
                    value={opTypeFilter} 
                    onChange={e => setOpTypeFilter(e.target.value as any)} 
                    className="glass-input w-full rounded-lg p-2 text-xs"
                 >
                     <option value="ALL">Todas</option>
                     <option value="Import">Importação</option>
                     <option value="Export">Exportação</option>
                 </select>
             </div>

             <div className="col-span-1">
                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Modal</label>
                 <select 
                    value={modalFilter} 
                    onChange={e => setModalFilter(e.target.value)} 
                    className="glass-input w-full rounded-lg p-2 text-xs"
                 >
                     <option value="ALL">Todos</option>
                     {Object.values(ModalType).map(m => <option key={m} value={m}>{m}</option>)}
                 </select>
             </div>

             <div className="col-span-1 md:col-span-2">
                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                 <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)} 
                    className="glass-input w-full rounded-lg p-2 text-xs"
                 >
                     <option value="ALL">Todos</option>
                     {Object.values(QuoteStatus).map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
             </div>

              <div className="col-span-1 md:col-span-2">
                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Inicial</label>
                 <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    className="glass-input w-full rounded-lg p-2 text-xs"
                 />
             </div>
             <div className="col-span-1 md:col-span-2">
                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Final</label>
                 <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    className="glass-input w-full rounded-lg p-2 text-xs"
                 />
             </div>

             <div className="col-span-1 md:col-span-2">
                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vendedor / Solicitante</label>
                 <input 
                    type="text" 
                    value={requesterFilter} 
                    onChange={e => setRequesterFilter(e.target.value)} 
                    placeholder="Nome do vendedor..." 
                    className="glass-input w-full rounded-lg p-2 text-xs"
                 />
             </div>
        </div>

        {/* Live Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/50 rounded-xl p-4 border border-white/60 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Encontrado</p>
                <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
            </div>
            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 text-center">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Fechamentos</p>
                <p className="text-2xl font-bold text-emerald-700">{stats.closedWon}</p>
            </div>
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 text-center">
                <p className="text-[10px] font-bold text-blue-600 uppercase">Taxa Conversão</p>
                <p className="text-2xl font-bold text-blue-700">{stats.conversionRate}%</p>
            </div>
             <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100 text-center">
                <p className="text-[10px] font-bold text-amber-600 uppercase">Lucro Estimado</p>
                <p className="text-2xl font-bold text-amber-700">R$ {stats.totalProfit.toLocaleString()}</p>
            </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto flex-1 custom-scrollbar border border-white/40 rounded-xl bg-white/20">
             <table className="min-w-full divide-y divide-black/5">
                    <thead className="bg-white/40 backdrop-blur-sm sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID / Data</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cliente</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operação / Rota</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vendedor</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 bg-white/10">
                        {filteredData.map(q => (
                            <tr key={q.id} className="hover:bg-white/40 transition-colors">
                                <td className="px-6 py-3">
                                    <div className="text-[10px] font-bold text-accent font-mono">{q.id}</div>
                                    <div className="text-[10px] text-slate-400">{new Date(q.createdDate).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-3 text-xs font-medium text-slate-700">
                                    {q.clientName}
                                </td>
                                <td className="px-6 py-3 text-xs text-slate-600">
                                     <span className="inline-block mr-2 text-[10px] uppercase font-bold text-slate-400 bg-white/50 px-1 rounded">{q.operationType}</span>
                                     {q.modalMain}
                                     <div className="text-[10px] text-slate-400 mt-0.5">{q.originCountry} → {q.destCountry}</div>
                                </td>
                                <td className="px-6 py-3 text-xs text-slate-600">
                                     {getUserName(q.requesterId).split(' ')[0]}
                                </td>
                                <td className="px-6 py-3">
                                     <span className={`px-2 py-0.5 inline-flex text-[9px] leading-4 font-bold uppercase tracking-wide rounded-full border shadow-sm
                                        ${q.status === QuoteStatus.CLOSED_WON ? 'bg-emerald-100/60 text-emerald-700 border-emerald-200/50' : 'bg-slate-100/60 text-slate-600 border-slate-200/50'}
                                     `}>
                                        {q.status}
                                     </span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => onQuoteClick(q)} className="text-xs text-accent font-medium hover:underline">Abrir</button>
                                </td>
                            </tr>
                        ))}
                         {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                                    Nenhum resultado encontrado com os filtros selecionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
            </table>
        </div>
    </div>
  );
};

export default DynamicFilter;