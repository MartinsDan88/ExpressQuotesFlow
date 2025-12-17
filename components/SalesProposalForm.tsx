import React, { useState, useEffect } from 'react';
import { QuoteRequest, SupplierQuote } from '../types';
import { IconCheck, IconDollar } from './Icons';

interface Props {
  quote: QuoteRequest;
  onSubmit: (updatedOptions: SupplierQuote[]) => void;
  onCancel: () => void;
}

const SalesProposalForm: React.FC<Props> = ({ quote, onSubmit, onCancel }) => {
  const [options, setOptions] = useState<SupplierQuote[]>([]);

  useEffect(() => {
    // Initialize sales fields with existing data or copy cost if empty (optional strategy, here we start empty)
    const initOptions = quote.pricingOptions.map(opt => ({
      ...opt,
      salesFreightRate: opt.salesFreightRate ?? 0,
      salesOriginCharges: opt.salesOriginCharges ?? 0,
      salesDestinationCharges: opt.salesDestinationCharges ?? 0,
      salesTotal: opt.salesTotal ?? 0,
      estimatedProfit: opt.estimatedProfit ?? 0
    }));
    setOptions(initOptions);
  }, [quote]);

  const updateSalesValue = (index: number, field: keyof SupplierQuote, value: number) => {
    setOptions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      const opt = updated[index];
      // Calculate Total Sell
      const sellTotal = (opt.salesFreightRate || 0) + (opt.salesOriginCharges || 0) + (opt.salesDestinationCharges || 0);
      updated[index].salesTotal = sellTotal;

      // Calculate Profit
      // Profit = Sell Total - Buy Total (All In Value)
      updated[index].estimatedProfit = sellTotal - opt.allInValue;

      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(options);
  };

  const unitLabel = quote.cargoType === 'AIR' ? 'Kg' : (quote.cargoType === 'FCL' ? 'Container' : 'm3');

  return (
    <div className="glass-panel p-8 rounded-2xl shadow-glass max-w-7xl mx-auto backdrop-blur-xl animate-fade-in">
      <div className="mb-8 border-b border-black/5 pb-4">
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight flex items-center">
            <IconDollar /> <span className="ml-2">Análise de Ofertas & Lucratividade</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1">
            Cliente: <span className="font-semibold text-slate-700">{quote.clientName}</span> • Ref: {quote.id}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="overflow-x-auto rounded-xl border border-white/50 shadow-sm">
          <table className="min-w-full divide-y divide-white/30 text-sm">
            <thead className="bg-slate-800 text-white backdrop-blur-md">
              <tr>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider w-40">Fornecedor</th>
                {/* Cost Columns */}
                <th className="px-2 py-3 text-right font-medium text-slate-300 bg-slate-800/80 border-l border-white/10">Compra Frete</th>
                <th className="px-2 py-3 text-right font-medium text-slate-300 bg-slate-800/80">Compra Origem</th>
                <th className="px-2 py-3 text-right font-medium text-slate-300 bg-slate-800/80">Compra Destino</th>
                <th className="px-4 py-3 text-right font-bold text-slate-100 bg-slate-800/80 border-r border-white/10">Total Compra</th>
                
                {/* Sales Columns */}
                <th className="px-2 py-3 text-right font-bold text-emerald-300">Venda Frete</th>
                <th className="px-2 py-3 text-right font-bold text-emerald-300">Venda Origem</th>
                <th className="px-2 py-3 text-right font-bold text-emerald-300">Venda Destino</th>
                <th className="px-4 py-3 text-right font-bold text-white border-l border-white/10">Total Venda</th>
                
                {/* Profit Column */}
                <th className="px-4 py-3 text-center font-bold text-amber-400 border-l border-white/10">Profit (Lucro)</th>
              </tr>
            </thead>
            <tbody className="bg-white/40 divide-y divide-white/30 backdrop-blur-sm">
              {options.map((opt, idx) => (
                <tr key={idx} className="hover:bg-white/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {opt.supplierName}
                    <div className="text-[10px] text-slate-500">{opt.currency}</div>
                  </td>
                  
                  {/* Read-Only Cost Data */}
                  <td className="px-2 py-3 text-right text-slate-500 border-l border-white/40">{opt.freightRate.toFixed(2)}</td>
                  <td className="px-2 py-3 text-right text-slate-500">{opt.originCharges.toFixed(2)}</td>
                  <td className="px-2 py-3 text-right text-slate-500">{opt.destinationCharges.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700 bg-slate-50/30 border-r border-white/40">
                    {opt.allInValue.toFixed(2)}
                  </td>

                  {/* Editable Sales Data */}
                  <td className="px-2 py-3">
                    <input 
                        type="number" 
                        step="0.01" 
                        value={opt.salesFreightRate || ''} 
                        onChange={e => updateSalesValue(idx, 'salesFreightRate', parseFloat(e.target.value))}
                        className="glass-input w-full text-right p-1.5 rounded text-emerald-700 font-medium text-xs focus:ring-emerald-500" 
                        placeholder="0.00"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input 
                        type="number" 
                        step="0.01" 
                        value={opt.salesOriginCharges || ''} 
                        onChange={e => updateSalesValue(idx, 'salesOriginCharges', parseFloat(e.target.value))}
                        className="glass-input w-full text-right p-1.5 rounded text-emerald-700 font-medium text-xs focus:ring-emerald-500" 
                        placeholder="0.00"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input 
                        type="number" 
                        step="0.01" 
                        value={opt.salesDestinationCharges || ''} 
                        onChange={e => updateSalesValue(idx, 'salesDestinationCharges', parseFloat(e.target.value))}
                        className="glass-input w-full text-right p-1.5 rounded text-emerald-700 font-medium text-xs focus:ring-emerald-500" 
                        placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-800 bg-emerald-50/30 border-l border-white/40">
                    {(opt.salesTotal || 0).toFixed(2)}
                  </td>

                  {/* Profit Result */}
                  <td className="px-4 py-3 text-center border-l border-white/40">
                     <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                         (opt.estimatedProfit || 0) > 0 
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                            : (opt.estimatedProfit || 0) < 0 
                                ? 'bg-rose-100 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                     }`}>
                        {(opt.estimatedProfit || 0).toFixed(2)}
                     </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end space-x-4 border-t border-black/5 pt-6">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 bg-white/50 border border-white/60 rounded-xl text-slate-600 hover:bg-white/80 transition-all font-medium backdrop-blur-sm text-sm">Voltar</button>
            <button type="submit" className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center transition-all transform hover:-translate-y-0.5 font-medium text-sm">
                <IconCheck /> <span className="ml-2">Salvar Proposta</span>
            </button>
        </div>
      </form>
    </div>
  );
};

export default SalesProposalForm;