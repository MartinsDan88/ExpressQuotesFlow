import React, { useState, useEffect } from 'react';
import { QuoteRequest, SupplierQuote, QuoteStatus } from '../types';
import { IconPlus, IconCheck, IconClock, IconSend } from './Icons';

interface Props {
  quote: QuoteRequest;
  onSubmit: (pricingData: SupplierQuote[]) => void;
  onCancel: () => void;
}

const PricingForm: React.FC<Props> = ({ quote, onSubmit, onCancel }) => {
  const [suppliers, setSuppliers] = useState<SupplierQuote[]>(() => {
      // If editing existing, use them, otherwise start with one empty row that has timer started
      if (quote.pricingOptions && quote.pricingOptions.length > 0) {
          return quote.pricingOptions;
      }
      return [{ 
          supplierName: '', 
          currency: 'USD', 
          freightRate: 0, 
          originCharges: 0, 
          destinationCharges: 0, 
          allInValue: 0,
          requestedAt: new Date().toISOString() // Start timer immediately
      }];
  });

  // Force a re-render every minute to update the "timer" display if needed, 
  // though static calculation on render is usually enough for this prototype.
  const [, setTick] = useState(0);
  useEffect(() => {
      const timer = setInterval(() => setTick(t => t + 1), 60000);
      return () => clearInterval(timer);
  }, []);

  const updateSupplier = (index: number, field: keyof SupplierQuote, value: any) => {
    setSuppliers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto calc all in
      const s = updated[index];
      const freight = typeof s.freightRate === 'number' ? s.freightRate : 0;
      const origin = typeof s.originCharges === 'number' ? s.originCharges : 0;
      const dest = typeof s.destinationCharges === 'number' ? s.destinationCharges : 0;
      
      updated[index].allInValue = freight + origin + dest;

      // Stop Timer Logic: If All In > 0 and timer hasn't stopped, stop it now.
      // We only set it automatically if it hasn't been set yet.
      if (updated[index].allInValue > 0 && updated[index].requestedAt && !updated[index].respondedAt) {
          updated[index].respondedAt = new Date().toISOString();
      }

      return updated;
    });
  };

  const updateResponseTime = (index: number, isoString: string) => {
      setSuppliers(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], respondedAt: isoString };
          return updated;
      });
  };

  const addSupplier = () => {
    setSuppliers(prev => [...prev, { 
        supplierName: '', 
        currency: 'USD', 
        freightRate: 0, 
        originCharges: 0, 
        destinationCharges: 0, 
        allInValue: 0,
        requestedAt: new Date().toISOString() // Start timer immediately on add
    }]);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validation: Check for at least 3 valid quotes
    const validQuotes = suppliers.filter(s => s.supplierName.trim() !== '' && s.allInValue > 0);
    
    if (validQuotes.length < 3) {
      alert("É necessário inserir ao menos 3 cotações de fornecedores distintos com valores válidos (All In > 0).");
      return;
    }
    onSubmit(suppliers);
  };

  const getElapsedTime = (start?: string, end?: string) => {
      if (!start) return '-';
      const startTime = new Date(start).getTime();
      const endTime = end ? new Date(end).getTime() : new Date().getTime();
      
      // Handle negative time (if user sets received time before request time manually)
      if (endTime < startTime) return 'Erro (Data < Pedido)';

      const diffMins = Math.floor((endTime - startTime) / 60000);
      
      if (diffMins < 60) return `${diffMins} min`;
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
  };

  // Helper to convert ISO string to "YYYY-MM-DDThh:mm" for input type="datetime-local"
  const formatForInput = (isoString?: string) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      // Adjust for local timezone offset to display correctly in input
      const offset = date.getTimezoneOffset() * 60000;
      const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
      return localISOTime;
  };

  const unitLabel = quote.cargoType === 'AIR' ? 'Kg' : (quote.cargoType === 'FCL' ? 'Container' : 'm3');
  
  // Calculate lowest All In Value
  const validAllInValues = suppliers
      .filter(s => s.allInValue > 0 && s.supplierName)
      .map(s => s.allInValue);
  const minAllIn = validAllInValues.length > 0 ? Math.min(...validAllInValues) : null;

  return (
    <div className="glass-panel p-8 rounded-2xl shadow-glass max-w-6xl mx-auto backdrop-blur-xl">
      <div className="mb-6 border-b border-black/5 pb-4 flex justify-between items-end">
        <div>
            <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Pricing <span className="text-slate-400 font-light">{quote.id}</span></h2>
            <div className="flex mt-2 space-x-2 text-xs font-medium">
                <span className="bg-blue-100/60 text-blue-700 px-3 py-1 rounded-full border border-blue-200/50">{quote.modalMain}</span>
                <span className="flex items-center text-slate-600 bg-white/50 px-3 py-1 rounded-full border border-white/40">
                    {quote.operationType} <span className="mx-2 text-slate-300">•</span> {quote.incoterm}
                </span>
            </div>
        </div>
      </div>

      {/* --- QUOTE SUMMARY SECTION --- */}
      <div className="bg-white/40 rounded-xl p-6 mb-8 border border-white/50 shadow-sm backdrop-blur-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide flex items-center">
             Resumo da Solicitação
          </h3>

          {/* 1. General Info & Route */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="col-span-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide">Cliente</p>
                  <p className="text-slate-800 font-semibold text-sm">{quote.clientName}</p>
                  {quote.clientRef && <p className="text-[10px] text-slate-500 mt-0.5">Ref: {quote.clientRef}</p>}
              </div>
              <div className="col-span-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide">Origem</p>
                  <p className="text-slate-800 font-semibold text-sm">{quote.originCountry}</p>
              </div>
              <div className="col-span-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide">Destino</p>
                  <p className="text-slate-800 font-semibold text-sm">{quote.destCountry}</p>
              </div>
               <div className="col-span-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide">Entrada SLA</p>
                  <p className="text-slate-800 font-semibold text-sm">
                      {new Date(quote.createdDate).toLocaleDateString()} {quote.createdTime}
                  </p>
              </div>
          </div>

          {/* 2. Specific Locations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-slate-50/50 p-4 rounded-xl border border-white/50">
               <div>
                  <p className="text-[10px] font-bold text-slate-500/80 uppercase mb-1">
                      {quote.modalMain.includes('Aéreo') ? 'Aeroporto de Origem (AOL)' : quote.modalMain.includes('Marítimo') ? 'Porto de Origem (POL)' : 'Local de Coleta'}
                  </p>
                  <p className="text-slate-800 font-bold text-base tracking-tight">
                      {quote.pol_aol || quote.pickupAddress || '-'}
                  </p>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-slate-500/80 uppercase mb-1">
                      {quote.modalMain.includes('Aéreo') ? 'Aeroporto de Destino (AOD)' : quote.modalMain.includes('Marítimo') ? 'Porto de Destino (POD)' : 'Local de Entrega'}
                  </p>
                  <p className="text-slate-800 font-bold text-base tracking-tight">
                      {quote.pod_aod || quote.deliveryAddress || '-'}
                  </p>
               </div>
          </div>

          {/* 3. Cargo Details */}
          <div className="mb-4">
               <h4 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Detalhes da Carga</h4>
               
               {quote.cargoType === 'FCL' ? (
                   <div className="overflow-x-auto rounded-lg border border-white/40">
                       <table className="min-w-full text-xs text-left">
                           <thead className="bg-slate-50/50 text-slate-500">
                               <tr>
                                   <th className="px-4 py-2 font-semibold">Tipo Container</th>
                                   <th className="px-4 py-2 font-semibold">Quantidade</th>
                                   <th className="px-4 py-2 font-semibold">Temperatura</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-white/30 bg-white/20">
                               {quote.containerItems.map((c, i) => (
                                   <tr key={i}>
                                       <td className="px-4 py-2 font-medium text-slate-700">{c.type}</td>
                                       <td className="px-4 py-2 text-slate-600">{c.quantity}</td>
                                       <td className="px-4 py-2 text-slate-600">{c.temperature || 'N/A'}</td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               ) : (
                   <div className="overflow-x-auto rounded-lg border border-white/40">
                        <table className="min-w-full text-xs text-left">
                           <thead className="bg-slate-50/50 text-slate-500">
                               <tr>
                                   <th className="px-4 py-2 font-semibold">Qtd</th>
                                   <th className="px-4 py-2 font-semibold">Dimensões (CxLxA)</th>
                                   <th className="px-4 py-2 font-semibold">Peso Bruto</th>
                                   <th className="px-4 py-2 font-semibold text-right">
                                       {quote.cargoType === 'AIR' ? 'Peso Taxado Total' : 'Volume Total (m3)'}
                                   </th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-white/30 bg-white/20">
                               {quote.cargoItems.map((c, i) => (
                                   <tr key={i}>
                                       <td className="px-4 py-2 font-medium text-slate-700">{c.qty}</td>
                                       <td className="px-4 py-2 text-slate-600">{c.length}x{c.width}x{c.height} {quote.cargoType === 'AIR' ? 'cm' : 'm'}</td>
                                       <td className="px-4 py-2 text-slate-600">{c.weight} kg</td>
                                       <td className="px-4 py-2 text-right font-bold text-slate-700">
                                           {quote.cargoType === 'AIR' ? c.chargeableWeight?.toFixed(2) + ' kg' : c.volume?.toFixed(4) + ' m3'}
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               )}
          </div>
      </div>

      {/* --- PRICING INPUT FORM --- */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <h3 className="text-lg font-semibold text-slate-800 flex justify-between items-center">
             <span>Cotações de Fornecedores</span>
             <span className="text-[10px] font-normal text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">Tempo inicia ao indicar o fornecedor</span>
        </h3>

        <div className="overflow-x-auto rounded-xl border border-white/50 shadow-sm">
          <table className="min-w-full divide-y divide-white/30">
            <thead className="bg-white/40 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fornecedor</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Moeda</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tarifa / {unitLabel}</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Origem</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Destino</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">All In</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Tempo Resposta</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Ação</th>
              </tr>
            </thead>
            <tbody className="bg-white/20 divide-y divide-white/30">
              {suppliers.map((s, idx) => {
                 const isBestOption = minAllIn !== null && s.allInValue === minAllIn && s.allInValue > 0 && s.supplierName.trim() !== '';
                 const elapsedTime = getElapsedTime(s.requestedAt, s.respondedAt);
                 const isFinished = !!s.respondedAt;

                 return (
                    <tr key={idx} className={`transition-colors ${isBestOption ? 'bg-emerald-50/50' : 'hover:bg-white/40'}`}>
                      <td className="px-4 py-3">
                        <input required type="text" value={s.supplierName} onChange={e => updateSupplier(idx, 'supplierName', e.target.value)} className="glass-input w-full rounded-md shadow-sm p-2 text-xs placeholder-slate-400" placeholder="Nome" />
                      </td>
                      <td className="px-4 py-3 w-28">
                         <select value={s.currency} onChange={e => updateSupplier(idx, 'currency', e.target.value)} className="glass-input w-full rounded-md shadow-sm p-2 text-xs">
                           <option value="USD">USD</option>
                           <option value="EUR">EUR</option>
                           <option value="BRL">BRL</option>
                         </select>
                      </td>
                      <td className="px-4 py-3 w-32">
                        <input type="number" step="0.01" value={s.freightRate} onChange={e => updateSupplier(idx, 'freightRate', parseFloat(e.target.value))} className="glass-input w-full rounded-md shadow-sm p-2 text-xs" />
                      </td>
                      <td className="px-4 py-3 w-32">
                        <input type="number" step="0.01" value={s.originCharges} onChange={e => updateSupplier(idx, 'originCharges', parseFloat(e.target.value))} className="glass-input w-full rounded-md shadow-sm p-2 text-xs" />
                      </td>
                      <td className="px-4 py-3 w-32">
                        <input type="number" step="0.01" value={s.destinationCharges} onChange={e => updateSupplier(idx, 'destinationCharges', parseFloat(e.target.value))} className="glass-input w-full rounded-md shadow-sm p-2 text-xs" />
                      </td>
                       <td className="px-4 py-3 w-32">
                        <input disabled type="number" value={s.allInValue} className={`w-full rounded-md shadow-sm p-2 text-xs font-bold border ${isBestOption ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-white/50 text-slate-700 border-white/50'}`} />
                      </td>
                      <td className="px-4 py-3 w-40 text-center">
                         {isFinished ? (
                             <div className="flex flex-col items-center">
                                 {/* Manual Date Edit Input */}
                                 <input 
                                    type="datetime-local" 
                                    value={formatForInput(s.respondedAt)} 
                                    onChange={(e) => updateResponseTime(idx, new Date(e.target.value).toISOString())}
                                    className="glass-input w-full text-[10px] p-1 rounded mb-1 text-center"
                                 />
                                 <div className="flex items-center justify-center space-x-1 text-xs font-medium text-slate-600">
                                     <IconClock />
                                     <span>{elapsedTime}</span>
                                 </div>
                             </div>
                         ) : (
                             <div className={`flex items-center justify-center space-x-1 text-xs font-medium px-2 py-1 rounded-full border bg-amber-100 text-amber-700 border-amber-200 animate-pulse`}>
                                 <IconClock />
                                 <span>{elapsedTime}</span>
                             </div>
                         )}
                      </td>
                      <td className="px-4 py-3 w-40 text-center">
                          {isBestOption && (
                              <button 
                                  type="button" 
                                  onClick={() => handleSubmit()} 
                                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs py-2 px-3 rounded-lg shadow-lg shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 font-bold flex items-center justify-center animate-pulse-slow"
                              >
                                  <IconSend /> <span className="ml-1">Enviar ao Inside</span>
                              </button>
                          )}
                      </td>
                    </tr>
                 );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
            <button type="button" onClick={addSupplier} className="flex-1 group flex items-center text-xs font-medium text-accent hover:text-blue-600 transition-colors bg-white/30 px-5 py-3 rounded-xl border border-dashed border-blue-200/60 justify-center backdrop-blur-sm">
                <IconPlus /> <span className="ml-2 group-hover:underline">Adicionar Fornecedor (Inicia contador)</span>
            </button>
            <button type="button" onClick={addSupplier} className="flex-1 group flex items-center text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-50/30 px-5 py-3 rounded-xl border border-dashed border-emerald-200/60 justify-center backdrop-blur-sm">
                <IconPlus /> <span className="ml-2 group-hover:underline">Incluir Despesa em Outra Moeda</span>
            </button>
        </div>

        <div className="flex justify-end space-x-4 border-t border-black/5 pt-6">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 bg-white/50 border border-white/60 rounded-xl text-slate-600 hover:bg-white/80 transition-all font-medium backdrop-blur-sm text-sm">Cancelar</button>
            {/* Submit is now handled by the row button for the best option. */}
        </div>
      </form>
    </div>
  );
};

export default PricingForm;