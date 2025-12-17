import React, { useState, useEffect } from 'react';
import { QuoteRequest, Role, QuoteStatus, ModalType, Incoterm, CargoItem, ContainerItem } from '../types';
import { getRoleForModal } from '../services/db';
import { IconPlus, IconCheck, IconEdit } from './Icons';

interface Props {
  user: { id: string; role: Role };
  initialData?: QuoteRequest; // If present, we are in Edit Mode
  onSubmit: (quote: QuoteRequest) => void;
  onCancel: () => void;
}

const NewQuoteForm: React.FC<Props> = ({ user, initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;

  // Initialize all fields as empty/undefined to satisfy "caixas em branco" requirement
  const [formData, setFormData] = useState<Partial<QuoteRequest>>({
    clientName: '',
    clientRef: '',
    operationType: undefined,
    modalMain: undefined,
    modalSec: undefined,
    incoterm: undefined,
    createdDate: '',
    createdTime: '',
    originCountry: '',
    destCountry: '',
    pol_aol: '',
    pod_aod: '',
    pickupAddress: '',
    deliveryAddress: '',
    containerItems: [],
    cargoItems: [],
    pricingOptions: [],
    observation: '',
    hasInsurance: false,
    cargoValue: undefined,
  });

  const [useSecondaryModal, setUseSecondaryModal] = useState(false);

  // Populate form if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        // Ensure date format is correct for input[type="date"]
        createdDate: initialData.createdDate.split('T')[0],
      });
      setUseSecondaryModal(!!initialData.modalSec);
    }
  }, [initialData]);
  
  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContainerAdd = () => {
    const newItem: ContainerItem = { id: Date.now().toString(), type: '20ST', quantity: 1, ncm: '' };
    setFormData(prev => ({ ...prev, containerItems: [...(prev.containerItems || []), newItem] }));
  };

  const updateContainer = (id: string, field: keyof ContainerItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      containerItems: prev.containerItems?.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleCargoAdd = () => {
    const newItem: CargoItem = { id: Date.now().toString(), ncm: '', qty: 1, length: 0, width: 0, height: 0, weight: 0 };
    setFormData(prev => ({ ...prev, cargoItems: [...(prev.cargoItems || []), newItem] }));
  };

  const updateCargo = (id: string, field: keyof CargoItem, value: any) => {
    setFormData(prev => {
      const items = prev.cargoItems?.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        
        // Recalculate computed fields if dimension changed
        if (['length', 'width', 'height', 'qty'].includes(field as string)) {
            if (formData.modalMain?.includes('Aéreo')) {
                // Chargeable weight calculation: (LxWxH in cm) / 6000
                const volWeight = (updated.length * updated.width * updated.height) / 6000;
                updated.chargeableWeight = parseFloat((volWeight * updated.qty).toFixed(2));
            } else if (formData.modalMain?.includes('LCL') || formData.modalMain?.includes('Rodoviário')) {
                // Volume m3: LxWxH in meters
                const vol = updated.length * updated.width * updated.height;
                updated.volume = parseFloat((vol * updated.qty).toFixed(4));
            }
        }
        return updated;
      });
      return { ...prev, cargoItems: items };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.modalMain || !formData.operationType || !formData.incoterm || !formData.createdDate || !formData.createdTime) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    // Determine Logic for Cargo Type based on Main Modal
    let cargoType: 'FCL' | 'LCL' | 'AIR' = 'LCL';
    if (formData.modalMain.includes('FCL')) cargoType = 'FCL';
    if (formData.modalMain.includes('Aéreo')) cargoType = 'AIR';

    // Construct SLA start time from manual input (or keep original if strictly preserving)
    // NOTE: For editing, if management changes the date, it WILL update the SLA calculation base,
    // which is usually desired if the original entry was wrong. 
    // However, other timestamps (sentToPricingAt, etc.) are preserved below.
    const slaStartDate = new Date(`${formData.createdDate}T${formData.createdTime}`);
    
    let finalQuote: QuoteRequest;

    if (isEditing && initialData) {
        // --- UPDATE EXISTING QUOTE ---
        finalQuote = {
            ...initialData, // Keep all original fields (including ID, timestamps, history)
            ...formData,    // Overwrite with new form data
            
            // Explicitly preserve critical ID/Stats fields just in case formData overwrote them wrongly
            id: initialData.id,
            status: initialData.status, 
            requesterId: initialData.requesterId,
            sentToPricingAt: initialData.sentToPricingAt,
            pricedAt: initialData.pricedAt,
            proposalSavedAt: initialData.proposalSavedAt,
            pricingOptions: initialData.pricingOptions, // Preserve pricing data
            
            // Recalculate derived fields
            cargoType: cargoType,
            modalSec: useSecondaryModal ? formData.modalSec : undefined,
            assignedPricingRole: getRoleForModal(formData.modalMain),
            // Re-construct full ISO string for createdDate if changed
            createdDate: slaStartDate.toISOString(), 
        } as QuoteRequest;

    } else {
        // --- CREATE NEW QUOTE ---
        // Generate ID: MTN-{SEQ}-{MM}-{YY}
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        const seq = Math.floor(Math.random() * 9000) + 1000; 
        const newId = `MTN-${seq}-${mm}-${yy}`;

        finalQuote = {
          id: newId,
          status: QuoteStatus.PENDING_PRICING,
          requesterId: user.id,
          assignedPricingRole: getRoleForModal(formData.modalMain),
          cargoType,
          pricingOptions: [],
          clientName: formData.clientName,
          clientRef: formData.clientRef || '',
          operationType: formData.operationType as 'Import' | 'Export',
          modalMain: formData.modalMain,
          modalSec: useSecondaryModal ? formData.modalSec : undefined,
          incoterm: formData.incoterm as Incoterm,
          createdDate: slaStartDate.toISOString(), // SLA starts from the manually entered receipt time
          createdTime: formData.createdTime || '00:00',
          sentToPricingAt: new Date().toISOString(), // Track when the quote was actually sent to pricing
          originCountry: formData.originCountry || '',
          destCountry: formData.destCountry || '',
          pol_aol: formData.pol_aol || '',
          pod_aod: formData.pod_aod || '',
          pickupAddress: formData.pickupAddress,
          deliveryAddress: formData.deliveryAddress,
          containerItems: formData.containerItems || [],
          cargoItems: formData.cargoItems || [],
          observation: formData.observation || '',
          hasInsurance: formData.hasInsurance || false,
          cargoValue: formData.cargoValue || 0,
        };
    }

    onSubmit(finalQuote);
  };

  // Logic flags for UI state
  const isSea = formData.modalMain?.includes('Marítimo');
  const isAir = formData.modalMain?.includes('Aéreo');
  const isRoad = formData.modalMain?.includes('Rodoviário');
  
  const isFCL = formData.modalMain?.includes('FCL');
  
  // Logic for Cargo Input type: Road uses LCL-style inputs usually
  const isLCL = formData.modalMain?.includes('LCL') || isRoad;

  // Address visibility logic: Road OR specific Incoterms
  const needsPickup = isRoad || ['EXW', 'FCA'].includes(formData.incoterm || '');
  const needsDelivery = isRoad || ['DAP', 'DDP', 'DDU'].includes(formData.incoterm || '');

  // Port/Airport visibility logic: Air OR Sea
  const showPolPod = isAir || isSea;

  return (
    <div className="glass-panel p-8 rounded-2xl shadow-glass max-w-4xl mx-auto backdrop-blur-xl border-accent/20">
      <div className="flex items-center justify-between mb-8 border-b border-black/5 pb-4">
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight flex items-center">
            {isEditing ? <><IconEdit /><span className="ml-2">Editar Cotação (Admin)</span></> : 'Nova Cotação'}
        </h2>
        {isEditing && (
            <div className="text-[10px] uppercase font-bold text-slate-500 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                Modo de Edição Gerencial - Estatísticas Preservadas
            </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">Cliente</label>
            <input required type="text" name="clientName" value={formData.clientName} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 placeholder-slate-400 text-sm" placeholder="Nome do Cliente" />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">Referência do Cliente</label>
            <input type="text" name="clientRef" value={formData.clientRef} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 placeholder-slate-400 text-sm" placeholder="Ref." />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">Tipo de Operação</label>
            <select required name="operationType" value={formData.operationType || ''} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 text-sm">
              <option value="" disabled>Selecione...</option>
              <option value="Import">Importação</option>
              <option value="Export">Exportação</option>
            </select>
          </div>
           <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">Recebimento (SLA Start)</label>
            <div className="flex space-x-2">
                 <input required type="date" name="createdDate" value={formData.createdDate} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 text-sm" />
                 <input required type="time" name="createdTime" value={formData.createdTime} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 text-sm" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">Valor Total da Carga</label>
            <div className="relative">
                 <span className="absolute left-3 top-3 text-slate-500 text-sm font-medium">R$</span>
                 <input type="number" name="cargoValue" value={formData.cargoValue || ''} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 pl-10 text-slate-800 placeholder-slate-400 text-sm" placeholder="0.00" />
            </div>
          </div>

          <div className="flex items-end pb-1">
             <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-white/40 hover:bg-white/60 transition-colors w-full border border-white/40 backdrop-blur-sm">
                <input type="checkbox" name="hasInsurance" checked={formData.hasInsurance || false} onChange={e => setFormData(prev => ({...prev, hasInsurance: e.target.checked}))} className="rounded text-accent focus:ring-accent h-4 w-4 border-slate-300" />
                <span className="text-sm font-medium text-slate-700">Com Seguro</span>
            </label>
          </div>
        </div>

        {/* Modal & Routing */}
        <div className="border-t border-black/5 pt-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6 flex items-center">
              Modal & Rota
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">Modal Principal</label>
                    <select required name="modalMain" value={formData.modalMain || ''} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 text-sm">
                        <option value="" disabled>Selecione...</option>
                        {Object.values(ModalType).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="flex items-end pb-1">
                    <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-white/40 hover:bg-white/60 transition-colors w-full border border-white/40 backdrop-blur-sm">
                        <input type="checkbox" checked={useSecondaryModal} onChange={e => setUseSecondaryModal(e.target.checked)} className="rounded text-accent focus:ring-accent h-4 w-4 border-slate-300" />
                        <span className="text-sm font-medium text-slate-700">Multimodal (Secundário)</span>
                    </label>
                </div>
                {useSecondaryModal && (
                    <div className="col-span-2 space-y-2">
                        <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">Modal Secundário</label>
                        <select name="modalSec" value={formData.modalSec || ''} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 text-sm">
                            <option value="" disabled>Selecione...</option>
                            {Object.values(ModalType).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                )}
                
                <div className="space-y-2">
                     <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">Incoterm</label>
                    <select required name="incoterm" value={formData.incoterm || ''} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 text-sm">
                        <option value="" disabled>Selecione...</option>
                        {Object.values(Incoterm).map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                </div>
            </div>

            {/* Dynamic Address Fields (Road or Incoterm) */}
            {(needsPickup || needsDelivery) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 bg-blue-50/40 p-6 rounded-xl border border-blue-100/50 backdrop-blur-sm">
                    {needsPickup && (
                        <div className="space-y-2">
                             <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">Endereço de Coleta</label>
                             <input type="text" name="pickupAddress" value={formData.pickupAddress || ''} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 text-sm" placeholder="Rua, Cidade, ZIP" />
                        </div>
                    )}
                    {needsDelivery && (
                        <div className="space-y-2">
                             <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">Endereço de Entrega</label>
                             <input type="text" name="deliveryAddress" value={formData.deliveryAddress || ''} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 text-sm" placeholder="Rua, Cidade, ZIP" />
                        </div>
                    )}
                </div>
            )}

            {/* Port / Airport Fields (Air or Sea) */}
            {showPolPod && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                     <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">{isAir ? 'Aeroporto de Carregamento (AOL)' : 'Porto de Carregamento (POL)'}</label>
                        <input type="text" name="pol_aol" value={formData.pol_aol} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 text-sm" placeholder="" />
                    </div>
                     <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">{isAir ? 'Aeroporto de Destino (AOD)' : 'Porto de Destino (POD)'}</label>
                        <input type="text" name="pod_aod" value={formData.pod_aod} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 text-sm" placeholder="" />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                 <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">País de Origem</label>
                    <input type="text" name="originCountry" value={formData.originCountry} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 text-sm" placeholder="" />
                </div>
                 <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">País de Destino</label>
                    <input type="text" name="destCountry" value={formData.destCountry} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-slate-800 text-sm" placeholder="" />
                </div>
            </div>
        </div>

        {/* Cargo Details */}
        <div className="border-t border-black/5 pt-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6 flex items-center">
              Dados da Carga
            </h3>
            
            {!isFCL && !isLCL && !isAir && (
                <div className="p-4 bg-white/40 rounded-xl text-center border border-white/50 backdrop-blur-sm">
                    <p className="text-sm text-slate-500 italic">Selecione o modal principal para inserir os dados da carga.</p>
                </div>
            )}

            {/* FCL Section */}
            {isFCL && (
                <div className="space-y-4">
                    {formData.containerItems?.map((item, idx) => (
                        <div key={item.id} className="flex gap-4 items-end bg-white/40 p-4 rounded-xl border border-white/50 backdrop-blur-sm flex-wrap">
                             <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                                <select value={item.type} onChange={(e) => updateContainer(item.id, 'type', e.target.value)} className="glass-input w-28 rounded-md p-2 text-sm">
                                    <option value="20ST">20ST</option>
                                    <option value="40ST">40ST</option>
                                    <option value="40HC">40HC</option>
                                    <option value="20RF">20RF</option>
                                    <option value="40RF">40RF</option>
                                    <option value="40NOR">40NOR</option>
                                </select>
                            </div>
                             <div className="space-y-1 flex-1 min-w-[120px]">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">NCM</label>
                                <input type="text" value={item.ncm || ''} onChange={(e) => updateContainer(item.id, 'ncm', e.target.value)} className="glass-input w-full rounded-md p-2 text-sm" placeholder="Código NCM" />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Qtd</label>
                                <input type="number" min="1" value={item.quantity} onChange={(e) => updateContainer(item.id, 'quantity', parseInt(e.target.value))} className="glass-input w-24 rounded-md p-2 text-sm" />
                            </div>
                            {item.type.includes('RF') && (
                                <div className="space-y-1">
                                     <label className="block text-[10px] font-bold text-slate-500 uppercase">Temp (ºC)</label>
                                     <input type="text" value={item.temperature || ''} onChange={(e) => updateContainer(item.id, 'temperature', e.target.value)} className="glass-input w-24 rounded-md p-2 text-sm" />
                                </div>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={handleContainerAdd} className="flex items-center text-sm font-medium text-accent hover:text-blue-600 transition-colors bg-white/50 px-4 py-2 rounded-lg border border-white/60 backdrop-blur-sm">
                        <span className="mr-2"><IconPlus /></span> Adicionar Equipamento
                    </button>
                </div>
            )}

            {/* LCL / Air / Road Section */}
            {(isAir || isLCL) && (
                 <div className="space-y-4">
                    <div className="grid grid-cols-8 gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        <span>NCM</span>
                        <span>Qtd</span>
                        <span>Comp ({isAir ? 'cm' : 'm'})</span>
                        <span>Larg ({isAir ? 'cm' : 'm'})</span>
                        <span>Alt ({isAir ? 'cm' : 'm'})</span>
                        <span>Peso (kg)</span>
                        <span className="col-span-2 text-right pr-2">{isAir ? 'Peso Taxado' : 'Cubagem (m3)'}</span>
                    </div>
                     {formData.cargoItems?.map((item) => (
                         <div key={item.id} className="grid grid-cols-8 gap-3 items-center bg-white/40 p-3 rounded-xl border border-white/50">
                             <input type="text" value={item.ncm || ''} onChange={e => updateCargo(item.id, 'ncm', e.target.value)} className="glass-input rounded-md p-2 w-full text-sm" placeholder="NCM" />
                             <input type="number" value={item.qty} onChange={e => updateCargo(item.id, 'qty', parseFloat(e.target.value))} className="glass-input rounded-md p-2 w-full text-sm" placeholder="Qtd" />
                             <input type="number" value={item.length} onChange={e => updateCargo(item.id, 'length', parseFloat(e.target.value))} className="glass-input rounded-md p-2 w-full text-sm" placeholder="C" />
                             <input type="number" value={item.width} onChange={e => updateCargo(item.id, 'width', parseFloat(e.target.value))} className="glass-input rounded-md p-2 w-full text-sm" placeholder="L" />
                             <input type="number" value={item.height} onChange={e => updateCargo(item.id, 'height', parseFloat(e.target.value))} className="glass-input rounded-md p-2 w-full text-sm" placeholder="A" />
                             <input type="number" value={item.weight} onChange={e => updateCargo(item.id, 'weight', parseFloat(e.target.value))} className="glass-input rounded-md p-2 w-full text-sm" placeholder="Peso" />
                             <div className="col-span-2 bg-white/50 p-2 rounded-md text-right text-slate-700 font-mono text-sm border border-white/30">
                                 {isAir ? (item.chargeableWeight?.toFixed(2) || '0.00') : (item.volume?.toFixed(4) || '0.0000')}
                             </div>
                         </div>
                     ))}
                      <button type="button" onClick={handleCargoAdd} className="flex items-center text-sm font-medium text-accent hover:text-blue-600 transition-colors bg-white/50 px-4 py-2 rounded-lg border border-white/60 mt-2 backdrop-blur-sm">
                        <span className="mr-2"><IconPlus /></span> Adicionar Volume
                    </button>
                 </div>
            )}
        </div>

        {/* Observations */}
        <div className="border-t border-black/5 pt-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center">
                Observações
            </h3>
            <textarea
                name="observation"
                value={formData.observation}
                onChange={handleInputChange}
                className="glass-input w-full rounded-xl p-4 text-slate-700 h-28 resize-none placeholder-slate-400 text-sm"
                placeholder="Informações adicionais, instruções especiais, etc..."
            />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 border-t border-black/5 pt-8">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 bg-white/50 border border-white/60 rounded-xl text-slate-600 hover:bg-white/80 transition-all font-medium backdrop-blur-sm text-sm">Cancelar</button>
            <button type="submit" className="px-6 py-2.5 bg-accent text-white rounded-xl hover:bg-blue-600 shadow-lg shadow-blue-500/30 flex items-center transition-all transform hover:-translate-y-0.5 font-medium text-sm">
                {isEditing ? <><IconCheck /><span className="ml-2">Salvar Alterações</span></> : <><IconCheck /><span className="ml-2">Enviar ao Pricing</span></>}
            </button>
        </div>
      </form>
    </div>
  );
};

export default NewQuoteForm;