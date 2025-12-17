
import React, { useState, useEffect } from 'react';
import { User, Role, QuoteRequest, QuoteStatus, SupplierQuote } from './types';
import { getInitialQuotes, calculateSLA } from './services/db';
import Dashboard from './components/Dashboard';
import NewQuoteForm from './components/NewQuoteForm';
import PricingForm from './components/PricingForm';
import SalesProposalForm from './components/SalesProposalForm';
import DynamicFilter from './components/DynamicFilter';
import AdminPanel from './components/AdminPanel';
import { IconShip, IconPlane, IconTruck, IconClock, IconCheck, IconPlus, IconTrash, IconDollar, IconSearch, IconEdit } from './components/Icons';

const formatDuration = (startStr?: string, endStr?: string) => {
    if (!startStr) return '-';
    const start = new Date(startStr).getTime();
    const end = endStr ? new Date(endStr).getTime() : new Date().getTime();
    if (end < start) return '0h 0m'; 
    const diffMs = end - start;
    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<User[]>([]);
  const [loginStep, setLoginStep] = useState<'INITIAL' | 'USER_LOGIN' | 'ADMIN_LOGIN'>('INITIAL');
  
  // Admin Login States
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'NEW_QUOTE' | 'LIST' | 'PRICING_TASK' | 'SALES_PROPOSAL' | 'DYNAMIC_FILTER' | 'EDIT_QUOTE' | 'ADMIN_PANEL'>('DASHBOARD');
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState<QuoteRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'ALL'>('ALL');

  useEffect(() => {
    setQuotes(getInitialQuotes());
    const saved = localStorage.getItem('expressflow_users');
    if (saved) setInvitedUsers(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('expressflow_users', JSON.stringify(invitedUsers));
  }, [invitedUsers]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setLoginStep('INITIAL');
    setLoginError('');
    setCurrentView('DASHBOARD');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Strict validation based on user request
    if (adminEmailInput === 'martins_dan@icloud.com' && adminPasswordInput === 'zeroumaonove') {
        handleLogin({ 
            id: 'admin-master', 
            name: 'Administrador Master', 
            role: Role.MANAGEMENT, 
            email: 'martins_dan@icloud.com' 
        });
        setAdminEmailInput('');
        setAdminPasswordInput('');
    } else {
        setLoginError('Credenciais de administrador inválidas.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginStep('INITIAL');
    setAdminEmailInput('');
    setAdminPasswordInput('');
  };

  const handleInviteUser = (user: User) => {
    setInvitedUsers(prev => [...prev, user]);
  };

  const handleRemoveUser = (id: string) => {
    if (window.confirm("Remover este usuário?")) {
      setInvitedUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleCreateQuote = (newQuote: QuoteRequest) => {
    setQuotes(prev => [newQuote, ...prev]);
    setCurrentView('DASHBOARD');
  };

  const handleUpdateQuote = (updatedQuote: QuoteRequest) => {
    setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));
    setEditingQuote(null);
    setCurrentView('LIST');
  };

  const handlePricingSubmit = (pricingData: SupplierQuote[]) => {
    if (!activeQuoteId) return;
    setQuotes(prev => prev.map(q => {
      if (q.id === activeQuoteId) {
        return {
          ...q,
          status: QuoteStatus.PRICED,
          pricingOptions: pricingData,
          pricedAt: new Date().toISOString()
        };
      }
      return q;
    }));
    setActiveQuoteId(null);
    setCurrentView('DASHBOARD');
  };

  const handleSalesProposalSubmit = (updatedOptions: SupplierQuote[]) => {
    if (!activeQuoteId) return;
    setQuotes(prev => prev.map(q => {
      if (q.id === activeQuoteId) {
        return {
          ...q,
          status: QuoteStatus.PENDING_SALE,
          pricingOptions: updatedOptions,
          proposalSavedAt: new Date().toISOString()
        };
      }
      return q;
    }));
    setActiveQuoteId(null);
    setCurrentView('LIST');
  };

  const handleStatusChange = (id: string, newStatus: QuoteStatus) => {
    setQuotes(prev => prev.map(q => {
        if (q.id === id) {
            return { ...q, status: newStatus, lastStatusChange: new Date().toISOString() };
        }
        return q;
    }));
  };

  const handleCancelQuote = (id: string) => {
    if (window.confirm("Cancelar esta solicitação?")) {
      handleStatusChange(id, QuoteStatus.CANCELLED);
    }
  };

  const handleQuoteClick = (quote: QuoteRequest) => {
    if (!currentUser) return;
    const isPricing = currentUser.role.startsWith('PRICING');
    const isSales = currentUser.role === Role.SALES || currentUser.role === Role.INSIDE_SALES;
    const isMgmt = currentUser.role === Role.MANAGEMENT;
    if (quote.status === QuoteStatus.PENDING_PRICING && (isPricing || isMgmt)) {
        setActiveQuoteId(quote.id);
        setCurrentView('PRICING_TASK');
    } else if ((quote.status === QuoteStatus.PRICED || quote.status === QuoteStatus.PENDING_SALE) && (isSales || isMgmt)) {
        setActiveQuoteId(quote.id);
        setCurrentView('SALES_PROPOSAL');
    } else {
        setFilterStatus(quote.status);
        setCurrentView('LIST');
    }
  };

  const filteredQuotes = quotes.filter(q => {
    if (!currentUser) return false;
    if (currentUser.role === Role.MANAGEMENT || currentUser.role === Role.INSIDE_SALES) { } 
    else if (currentUser.role === Role.SALES) {
        if (q.requesterId !== currentUser.id) return false;
    } else if (currentUser.role.startsWith('PRICING')) {
        if (q.assignedPricingRole !== currentUser.role) return false;
    }
    if (filterStatus === 'ALL') return true;
    if (filterStatus === QuoteStatus.OVERDUE) return calculateSLA(q.createdDate).isOverdue;
    if (filterStatus === QuoteStatus.PENDING_SALE) return q.status === QuoteStatus.PRICED || q.status === QuoteStatus.PENDING_SALE;
    return q.status === filterStatus;
  });

  const canCreateQuote = currentUser?.role === Role.SALES || currentUser?.role === Role.INSIDE_SALES || currentUser?.role === Role.MANAGEMENT;
  const canViewPricingTasks = currentUser?.role.startsWith('PRICING') || currentUser?.role === Role.MANAGEMENT;
  const isManagement = currentUser?.role === Role.MANAGEMENT;
  const canCancel = currentUser?.role === Role.SALES || currentUser?.role === Role.INSIDE_SALES || isManagement;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel rounded-2xl shadow-2xl overflow-hidden relative z-10 backdrop-blur-2xl">
          <div className="p-8 text-center flex flex-col items-center border-b border-black/5">
             <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">ExpressFlow</h1>
             <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-medium">Portal Logístico</p>
          </div>
          
          <div className="p-8">
            {loginStep === 'INITIAL' && (
              <div className="space-y-4">
                <button 
                  onClick={() => setLoginStep('USER_LOGIN')}
                  className="w-full p-4 rounded-xl bg-accent text-white font-bold shadow-glow flex justify-between items-center group transition-all"
                >
                  <span>Entrar como Usuário</span>
                  <span className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all">›</span>
                </button>
                <button 
                  onClick={() => { setLoginStep('ADMIN_LOGIN'); setLoginError(''); }}
                  className="w-full p-4 rounded-xl bg-white/40 border border-slate-200 text-slate-600 font-bold flex justify-between items-center group transition-all"
                >
                  <span>Acesso Administrador</span>
                  <span className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all">›</span>
                </button>
              </div>
            )}

            {loginStep === 'ADMIN_LOGIN' && (
              <form onSubmit={handleAdminLogin} className="space-y-4 animate-fade-in">
                <div className="flex items-center mb-6">
                    <button type="button" onClick={() => setLoginStep('INITIAL')} className="text-xs font-medium text-accent hover:text-blue-700 flex items-center px-3 py-1.5 rounded-lg">
                        ‹ Voltar
                    </button>
                    <h2 className="text-sm font-bold text-slate-800 ml-auto mr-auto uppercase tracking-wide">Login Administrador</h2>
                    <div className="w-12"></div>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">E-mail</label>
                      <input 
                        required
                        type="email" 
                        value={adminEmailInput}
                        onChange={e => setAdminEmailInput(e.target.value)}
                        className="glass-input w-full p-3 rounded-xl text-sm" 
                        placeholder="exemplo@icloud.com"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Senha</label>
                      <input 
                        required
                        type="password" 
                        value={adminPasswordInput}
                        onChange={e => setAdminPasswordInput(e.target.value)}
                        className="glass-input w-full p-3 rounded-xl text-sm" 
                        placeholder="••••••••"
                      />
                   </div>
                   {loginError && <p className="text-[10px] text-rose-500 font-bold text-center animate-pulse">{loginError}</p>}
                   <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-lg shadow-black/20 hover:bg-black transition-colors">Acessar Painel</button>
                </div>
              </form>
            )}

            {loginStep === 'USER_LOGIN' && (
               <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center mb-6">
                    <button type="button" onClick={() => setLoginStep('INITIAL')} className="text-xs font-medium text-accent hover:text-blue-700 flex items-center px-3 py-1.5 rounded-lg">
                        ‹ Voltar
                    </button>
                    <h2 className="text-sm font-bold text-slate-800 ml-auto mr-auto uppercase tracking-wide">Selecionar Usuário</h2>
                    <div className="w-12"></div>
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {invitedUsers.length > 0 ? (
                      invitedUsers.map(u => (
                        <button
                          key={u.id}
                          onClick={() => handleLogin(u)}
                          className="w-full p-4 rounded-xl bg-white/40 border border-white/50 hover:bg-accent hover:text-white hover:shadow-glow transition-all duration-300 text-left"
                        >
                          <div className="font-bold text-sm">{u.name}</div>
                          <div className="text-[10px] opacity-70 uppercase tracking-widest">{u.role.replace(/_/g, ' ')}</div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-10 text-slate-400 space-y-4">
                        <p className="text-sm">Nenhum usuário cadastrado.</p>
                        <p className="text-[10px] uppercase">O administrador deve enviar convites.</p>
                      </div>
                    )}
                  </div>
               </div>
            )}
          </div>
        </div>
        <p className="mt-8 text-slate-400 text-[10px] font-medium tracking-widest relative z-10 uppercase">ExpressFlow v1.2</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent">
      <aside className="w-full md:w-64 glass-sidebar text-white flex-shrink-0 flex flex-col h-screen sticky top-0 z-50 shadow-2xl">
        <div className="p-6 border-b border-white/10 flex flex-col items-center">
          <div className="mb-6 text-center">
             <h1 className="text-lg font-semibold tracking-tight text-white/90">ExpressFlow</h1>
          </div>
          <div className="flex items-center space-x-3 w-full bg-white/5 p-2 rounded-xl backdrop-blur-md border border-white/10">
             <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex-shrink-0 flex items-center justify-center font-bold text-xs text-white">
                 {currentUser.name.charAt(0)}
             </div>
             <div className="overflow-hidden">
                 <p className="text-xs font-medium truncate text-white/90">{currentUser.name}</p>
                 <p className="text-[10px] text-white/50 truncate uppercase tracking-wide">{currentUser.role.replace(/_/g, ' ')}</p>
             </div>
          </div>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          <button onClick={() => { setCurrentView('DASHBOARD'); setFilterStatus('ALL'); }} className={`w-full text-left px-3 py-2 rounded-lg transition-all text-xs ${currentView === 'DASHBOARD' ? 'bg-accent text-white shadow-glow' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
            Dashboard
          </button>
          
          {canCreateQuote && (
            <>
                <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Comercial</div>
                <button onClick={() => setCurrentView('NEW_QUOTE')} className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center transition-all ${currentView === 'NEW_QUOTE' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                    <IconPlus /> <span className="ml-2">Nova Cotação</span>
                </button>
                <button onClick={() => { setCurrentView('LIST'); setFilterStatus(QuoteStatus.PENDING_SALE); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${currentView === 'LIST' && filterStatus === QuoteStatus.PENDING_SALE ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                    Vendas Pendentes
                </button>
            </>
          )}

          {canViewPricingTasks && (
               <>
                <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pricing</div>
                <button onClick={() => { setCurrentView('LIST'); setFilterStatus(QuoteStatus.PENDING_PRICING); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${currentView === 'LIST' && filterStatus === QuoteStatus.PENDING_PRICING ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                    Tarefas Pendentes
                </button>
               </>
          )}

          {isManagement && (
               <>
                <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestão / Admin</div>
                <button onClick={() => setCurrentView('ADMIN_PANEL')} className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${currentView === 'ADMIN_PANEL' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                    Gerenciar Equipe
                </button>
                <button onClick={() => { setCurrentView('LIST'); setFilterStatus('ALL'); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${currentView === 'LIST' && filterStatus === 'ALL' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                    Todas as Cotações
                </button>
                 <button onClick={() => setCurrentView('DYNAMIC_FILTER')} className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center transition-all ${currentView === 'DYNAMIC_FILTER' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                    <IconSearch /> <span className="ml-2">Relatórios</span>
                </button>
               </>
          )}
        </nav>
        
        <div className="p-4 border-t border-white/10">
           <button onClick={handleLogout} className="w-full flex items-center justify-center px-3 py-2 rounded-lg border border-white/10 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-xs font-medium">
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 h-screen relative z-10 custom-scrollbar">
        {currentView === 'DASHBOARD' && (
          <Dashboard 
            user={currentUser} 
            quotes={quotes} 
            onStatusClick={(status) => { setFilterStatus(status); setCurrentView('LIST'); }}
            onQuoteClick={handleQuoteClick}
          />
        )}

        {currentView === 'ADMIN_PANEL' && (
          <AdminPanel 
            invitedUsers={invitedUsers}
            onInvite={handleInviteUser}
            onRemove={handleRemoveUser}
            onClose={() => setCurrentView('DASHBOARD')}
          />
        )}

        {currentView === 'NEW_QUOTE' && (
          <NewQuoteForm 
            user={currentUser} 
            onSubmit={handleCreateQuote} 
            onCancel={() => setCurrentView('DASHBOARD')} 
          />
        )}

        {currentView === 'EDIT_QUOTE' && editingQuote && (
          <NewQuoteForm 
            user={currentUser} 
            initialData={editingQuote}
            onSubmit={handleUpdateQuote} 
            onCancel={() => { setEditingQuote(null); setCurrentView('LIST'); }} 
          />
        )}

        {currentView === 'PRICING_TASK' && activeQuoteId && (
          <PricingForm 
            quote={quotes.find(q => q.id === activeQuoteId)!}
            onSubmit={handlePricingSubmit}
            onCancel={() => { setActiveQuoteId(null); setCurrentView('LIST'); }}
          />
        )}

        {currentView === 'SALES_PROPOSAL' && activeQuoteId && (
          <SalesProposalForm
            quote={quotes.find(q => q.id === activeQuoteId)!}
            onSubmit={handleSalesProposalSubmit}
            onCancel={() => { setActiveQuoteId(null); setCurrentView('LIST'); }}
          />
        )}

        {currentView === 'DYNAMIC_FILTER' && <DynamicFilter quotes={quotes} onQuoteClick={handleQuoteClick} />}

        {currentView === 'LIST' && (
          <div className="glass-panel rounded-2xl shadow-glass overflow-hidden min-h-[600px] flex flex-col backdrop-blur-2xl animate-fade-in">
             <div className="p-6 border-b border-black/5 flex justify-between items-center bg-white/30 sticky top-0 z-10 backdrop-blur-md">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Cotações</h2>
                    <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">{filteredQuotes.length} registros</p>
                </div>
                <button onClick={() => setCurrentView('DASHBOARD')} className="px-4 py-2 text-xs border border-slate-300/40 rounded-lg bg-white/50 text-slate-600 font-medium">Voltar</button>
             </div>
             
             <div className="overflow-x-auto flex-1 pb-24">
                <table className="min-w-full divide-y divide-black/5">
                    <thead className="bg-white/40">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID / Cliente</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modal / Rota</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tempo</th>
                            <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 bg-white/20">
                        {filteredQuotes.map(q => {
                            const { hoursElapsed, isOverdue } = calculateSLA(q.createdDate);
                            const idParts = q.id.split('-');
                            const seq = idParts.length >= 2 ? idParts[1] : q.id;
                            const showPricingAction = (currentUser.role.startsWith('PRICING') || isManagement) && q.status === QuoteStatus.PENDING_PRICING;
                            const showSalesAction = (currentUser.role === Role.SALES || currentUser.role === Role.INSIDE_SALES || isManagement) && (q.status === QuoteStatus.PRICED || q.status === QuoteStatus.PENDING_SALE);
                            const showStatusControl = (currentUser.role === Role.SALES || currentUser.role === Role.INSIDE_SALES || isManagement) && 
                                                      (q.status === QuoteStatus.PRICED || q.status === QuoteStatus.PENDING_SALE || q.status === QuoteStatus.CLOSED_WON || q.status === QuoteStatus.CLOSED_LOST || q.status === QuoteStatus.REVALIDATION_REQ);

                            return (
                                <tr key={q.id} className="hover:bg-white/40 transition-colors group relative">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-lg bg-white/60 shadow-sm flex items-center justify-center text-accent font-bold text-[10px] mr-3 border border-white/60">{seq}</div>
                                            <div>
                                                <div className="text-[10px] text-slate-500 font-mono">{q.id}</div>
                                                <div className="text-sm font-medium text-slate-800">{q.clientName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-xs text-slate-700">
                                            <span className="text-slate-500 mr-2 bg-white/50 p-1 rounded-md border border-white/40">
                                                {q.modalMain.includes('Aéreo') ? <IconPlane /> : q.modalMain.includes('Marítimo') ? <IconShip /> : <IconTruck />}
                                            </span>
                                            <span className="font-medium">{q.modalMain}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1 ml-8">{q.originCountry} → {q.destCountry}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-0.5 inline-flex text-[10px] leading-5 font-bold uppercase rounded-full border shadow-sm
                                            ${q.status === QuoteStatus.PENDING_PRICING ? 'bg-amber-100 text-amber-700' : 
                                              q.status === QuoteStatus.PRICED ? 'bg-sky-100 text-sky-700' : 
                                              q.status === QuoteStatus.CLOSED_WON ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}
                                        `}>
                                            {q.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 relative">
                                        <div className={`flex items-center text-xs font-medium ${isOverdue ? 'text-rose-500' : 'text-slate-600'}`}>
                                            <IconClock />
                                            <span className="ml-1.5">{hoursElapsed}h <span className="text-slate-400">/ 22h</span></span>
                                        </div>
                                        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white rounded-xl p-3 shadow-2xl border border-black/5 z-50 text-[10px]">
                                            <div className="space-y-1">
                                                <div className="flex justify-between"><span>Pré-Pricing:</span><span className="font-mono">{formatDuration(q.createdDate, q.sentToPricingAt)}</span></div>
                                                <div className="flex justify-between"><span>Pricing:</span><span className="font-mono">{formatDuration(q.sentToPricingAt, q.pricedAt)}</span></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            {isManagement && (
                                                <button onClick={() => { setEditingQuote(q); setCurrentView('EDIT_QUOTE'); }} className="p-2 text-slate-400 hover:text-accent transition-colors"><IconEdit /></button>
                                            )}
                                            {showPricingAction && (
                                                <button onClick={() => { setActiveQuoteId(q.id); setCurrentView('PRICING_TASK'); }} className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-glow">Atender</button>
                                            )}
                                            {showSalesAction && (
                                                <button onClick={() => { setActiveQuoteId(q.id); setCurrentView('SALES_PROPOSAL'); }} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-glow flex items-center"><IconDollar /><span className="ml-1">Ofertas</span></button>
                                            )}
                                            {showStatusControl && (
                                                <select value={q.status} onChange={(e) => handleStatusChange(q.id, e.target.value as QuoteStatus)} className="bg-white/50 border border-slate-200 text-[9px] font-bold p-1 rounded-md uppercase">
                                                    <option value={QuoteStatus.PENDING_SALE}>Pendente</option>
                                                    <option value={QuoteStatus.CLOSED_WON}>Ganho</option>
                                                    <option value={QuoteStatus.CLOSED_LOST}>Perdido</option>
                                                    <option value={QuoteStatus.CANCELLED}>Cancelar</option>
                                                </select>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
