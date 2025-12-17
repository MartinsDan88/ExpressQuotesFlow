
import React, { useState, useEffect } from 'react';
import { User, Role, QuoteRequest, QuoteStatus, SupplierQuote } from './types';
import { getInitialQuotes, calculateSLA } from './services/db';
import Dashboard from './components/Dashboard';
import NewQuoteForm from './components/NewQuoteForm';
import PricingForm from './components/PricingForm';
import SalesProposalForm from './components/SalesProposalForm';
import DynamicFilter from './components/DynamicFilter';
import AdminPanel from './components/AdminPanel';
import { IconShip, IconPlane, IconTruck, IconClock, IconCheck, IconPlus, IconTrash, IconDollar, IconSearch, IconEdit, IconSend } from './components/Icons';

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
  
  // Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginStep, setLoginStep] = useState<'EMAIL' | 'PASSWORD' | 'FIRST_ACCESS'>('EMAIL');
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState('');

  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'NEW_QUOTE' | 'LIST' | 'PRICING_TASK' | 'SALES_PROPOSAL' | 'DYNAMIC_FILTER' | 'EDIT_QUOTE' | 'ADMIN_PANEL'>('DASHBOARD');
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState<QuoteRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'ALL'>('ALL');
  
  // Mobile UI States
  const [showMobileMenu, setShowMobileMenu] = useState(true);

  useEffect(() => {
    try {
      const savedQuotes = localStorage.getItem('expressflow_quotes');
      if (savedQuotes) {
          setQuotes(JSON.parse(savedQuotes));
      } else {
          setQuotes(getInitialQuotes());
      }

      const savedUsers = localStorage.getItem('expressflow_users');
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed)) setInvitedUsers(parsed);
      }
    } catch (e) {
      console.error("Erro ao carregar dados iniciais:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('expressflow_users', JSON.stringify(invitedUsers));
    } catch (e) {
      console.warn("LocalStorage indisponível");
    }
  }, [invitedUsers]);

  useEffect(() => {
    try {
      localStorage.setItem('expressflow_quotes', JSON.stringify(quotes));
    } catch (e) {
      console.warn("LocalStorage indisponível");
    }
  }, [quotes]);

  const navigateTo = (view: any, status: QuoteStatus | 'ALL' = 'ALL') => {
    setCurrentView(view);
    setFilterStatus(status);
    setShowMobileMenu(false); // Esconde o menu no mobile após clicar
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const email = loginEmail.toLowerCase().trim();
    
    if (email === 'martins_dan@icloud.com') {
        setTargetUser({ 
            id: 'admin-master', 
            name: 'Administrador Master', 
            role: Role.MANAGEMENT, 
            email: 'martins_dan@icloud.com',
            password: 'zeroumaonove' 
        });
        setLoginStep('PASSWORD');
        return;
    }

    const found = invitedUsers.find(u => u.email.toLowerCase().trim() === email);
    if (found) {
        setTargetUser(found);
        if (!found.password) {
            setLoginStep('FIRST_ACCESS');
        } else {
            setLoginStep('PASSWORD');
        }
    } else {
        setLoginError('E-mail não encontrado no sistema.');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;

    if (loginPassword === targetUser.password) {
        setCurrentUser(targetUser);
        setLoginError('');
        setCurrentView('DASHBOARD');
        setShowMobileMenu(true); // Garante que comece no menu no mobile
    } else {
        setLoginError('Senha incorreta.');
    }
  };

  const handleSetFirstPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !loginPassword) return;

    const updatedUsers = invitedUsers.map(u => {
        if (u.id === targetUser.id) {
            return { ...u, password: loginPassword };
        }
        return u;
    });

    setInvitedUsers(updatedUsers);
    const updatedTarget = { ...targetUser, password: loginPassword };
    setCurrentUser(updatedTarget);
    setCurrentView('DASHBOARD');
    setShowMobileMenu(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginStep('EMAIL');
    setLoginEmail('');
    setLoginPassword('');
    setTargetUser(null);
  };

  const handleAddUser = (user: User) => {
    setInvitedUsers(prev => [...prev, user]);
  };

  const handleRemoveUser = (id: string) => {
    if (window.confirm("Remover este usuário?")) {
      setInvitedUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleCreateQuote = (newQuote: QuoteRequest) => {
    setQuotes(prev => [newQuote, ...prev]);
    navigateTo('DASHBOARD');
  };

  const handleUpdateQuote = (updatedQuote: QuoteRequest) => {
    setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));
    setEditingQuote(null);
    navigateTo('LIST');
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
    navigateTo('DASHBOARD');
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
    navigateTo('LIST');
  };

  const handleStatusChange = (id: string, newStatus: QuoteStatus) => {
    setQuotes(prev => prev.map(q => {
        if (q.id === id) {
            return { ...q, status: newStatus, lastStatusChange: new Date().toISOString() };
        }
        return q;
    }));
  };

  const handleQuoteClick = (quote: QuoteRequest) => {
    if (!currentUser) return;
    const isPricing = currentUser.role.startsWith('PRICING');
    const isSales = currentUser.role === Role.SALES || currentUser.role === Role.INSIDE_SALES;
    const isMgmt = currentUser.role === Role.MANAGEMENT;
    if (quote.status === QuoteStatus.PENDING_PRICING && (isPricing || isMgmt)) {
        setActiveQuoteId(quote.id);
        navigateTo('PRICING_TASK');
    } else if ((quote.status === QuoteStatus.PRICED || quote.status === QuoteStatus.PENDING_SALE) && (isSales || isMgmt)) {
        setActiveQuoteId(quote.id);
        navigateTo('SALES_PROPOSAL');
    } else {
        navigateTo('LIST', quote.status);
    }
  };

  const filteredQuotes = quotes.filter(q => {
    if (!currentUser) return false;
    if (currentUser.role === Role.MANAGEMENT || currentUser.role === Role.INSIDE_SALES) return true;
    if (currentUser.role === Role.SALES) {
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

  // Botão Voltar Mobile
  const MobileBackButton = () => (
    <button 
        onClick={() => setShowMobileMenu(true)} 
        className="md:hidden flex items-center space-x-2 bg-white/20 hover:bg-white/40 border border-white/20 text-slate-700 px-4 py-3 rounded-2xl mb-6 font-bold text-sm w-full transition-all active:scale-95"
    >
        <span className="text-xl">‹</span>
        <span>Voltar ao Menu Principal</span>
    </button>
  );

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-screen">
        <div className="w-full max-w-md glass-panel rounded-3xl shadow-2xl overflow-hidden relative z-50 animate-fade-in">
          <div className="p-8 text-center flex flex-col items-center border-b border-black/5">
             <h1 className="text-3xl font-bold text-slate-800 tracking-tight">ExpressFlow</h1>
             <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-semibold">Acesso ao Sistema</p>
          </div>
          <div className="p-8">
            {loginStep === 'EMAIL' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">E-mail Cadastrado</label>
                  <input required type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="glass-input w-full p-4 rounded-2xl text-sm" placeholder="digite seu e-mail corporativo" />
                </div>
                {loginError && <p className="text-[10px] text-rose-500 font-bold text-center">{loginError}</p>}
                <button type="submit" className="w-full bg-accent text-white py-4 rounded-2xl font-bold shadow-glow hover:brightness-110 transition-all active:scale-95">Prosseguir</button>
              </form>
            )}
            {loginStep === 'PASSWORD' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fade-in">
                 <div className="flex items-center mb-4">
                    <button type="button" onClick={() => { setLoginStep('EMAIL'); setLoginPassword(''); }} className="text-[10px] font-bold text-accent uppercase tracking-wider">‹ Mudar E-mail</button>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 mb-2">Olá <strong>{targetUser?.name}</strong>, digite sua senha:</p>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Senha</label>
                  <input required autoFocus type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="glass-input w-full p-4 rounded-2xl text-sm" placeholder="••••••••" />
                </div>
                {loginError && <p className="text-[10px] text-rose-500 font-bold text-center">{loginError}</p>}
                <button type="submit" className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-black transition-all active:scale-95">Entrar no Sistema</button>
              </form>
            )}
            {loginStep === 'FIRST_ACCESS' && (
              <form onSubmit={handleSetFirstPassword} className="space-y-4 animate-fade-in">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-4 text-center">
                    <p className="text-xs text-blue-700 font-medium">Este é seu primeiro acesso, crie uma senha.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Crie sua Senha</label>
                  <input required autoFocus type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="glass-input w-full p-4 rounded-2xl text-sm" placeholder="escolha uma senha forte" />
                </div>
                <button type="submit" className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-glow hover:bg-emerald-600 transition-all active:scale-95">Definir Senha e Entrar</button>
              </form>
            )}
          </div>
        </div>
        <p className="mt-8 text-slate-400 text-[10px] font-bold tracking-widest relative z-50 uppercase">ExpressFlow v2.0</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent">
      {/* Sidebar - Visible on Desktop or when mobileMenuOpen is true */}
      <aside className={`
        ${showMobileMenu ? 'flex' : 'hidden'} 
        md:flex w-full md:w-64 glass-sidebar text-white flex-shrink-0 flex-col h-screen sticky top-0 z-50 shadow-2xl
      `}>
        <div className="p-6 border-b border-white/10 flex flex-col items-center">
          <div className="mb-6 text-center">
             <h1 className="text-xl font-bold tracking-tight text-white/90">ExpressFlow</h1>
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
        <nav className="p-6 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          <button onClick={() => navigateTo('DASHBOARD')} className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-semibold ${currentView === 'DASHBOARD' && !showMobileMenu ? 'bg-accent text-white shadow-glow' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>Dashboard</button>
          
          {canCreateQuote && (
            <>
                <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Comercial</div>
                <button onClick={() => navigateTo('NEW_QUOTE')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center transition-all ${currentView === 'NEW_QUOTE' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><IconPlus /> <span className="ml-2">Nova Cotação</span></button>
                <button onClick={() => navigateTo('LIST', QuoteStatus.PENDING_SALE)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${currentView === 'LIST' && filterStatus === QuoteStatus.PENDING_SALE ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>Vendas Pendentes</button>
            </>
          )}
          {canViewPricingTasks && (
               <>
                <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Pricing</div>
                <button onClick={() => navigateTo('LIST', QuoteStatus.PENDING_PRICING)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${currentView === 'LIST' && filterStatus === QuoteStatus.PENDING_PRICING ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>Tarefas Pendentes</button>
               </>
          )}
          {isManagement && (
               <>
                <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Gestão / Admin</div>
                <button onClick={() => navigateTo('ADMIN_PANEL')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${currentView === 'ADMIN_PANEL' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>Gerenciar Equipe</button>
                <button onClick={() => navigateTo('LIST', 'ALL')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${currentView === 'LIST' && filterStatus === 'ALL' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>Todas as Cotações</button>
                <button onClick={() => navigateTo('DYNAMIC_FILTER')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center transition-all ${currentView === 'DYNAMIC_FILTER' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><IconSearch /> <span className="ml-2">Relatórios</span></button>
               </>
          )}
        </nav>
        <div className="p-6 border-t border-white/10">
           <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-3 rounded-xl border border-white/10 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm font-bold">Sair</button>
        </div>
      </aside>

      {/* Main Content - Visible on Desktop or when mobileMenuOpen is false */}
      <main className={`
        ${!showMobileMenu ? 'flex' : 'hidden md:flex'} 
        flex-1 overflow-y-auto p-4 md:p-8 h-screen relative z-10 custom-scrollbar flex-col
      `}>
        {!showMobileMenu && <MobileBackButton />}

        {currentView === 'DASHBOARD' && <Dashboard user={currentUser} quotes={quotes} onStatusClick={(status) => navigateTo('LIST', status)} onQuoteClick={handleQuoteClick} />}
        {currentView === 'ADMIN_PANEL' && <AdminPanel invitedUsers={invitedUsers} onInvite={handleAddUser} onRemove={handleRemoveUser} onClose={() => navigateTo('DASHBOARD')} />}
        {currentView === 'NEW_QUOTE' && <NewQuoteForm user={currentUser} onSubmit={handleCreateQuote} onCancel={() => navigateTo('DASHBOARD')} />}
        {currentView === 'EDIT_QUOTE' && editingQuote && <NewQuoteForm user={currentUser} initialData={editingQuote} onSubmit={handleUpdateQuote} onCancel={() => navigateTo('LIST')} />}
        {currentView === 'PRICING_TASK' && activeQuoteId && <PricingForm quote={quotes.find(q => q.id === activeQuoteId)!} onSubmit={handlePricingSubmit} onCancel={() => navigateTo('LIST')} />}
        {currentView === 'SALES_PROPOSAL' && activeQuoteId && <SalesProposalForm quote={quotes.find(q => q.id === activeQuoteId)!} onSubmit={handleSalesProposalSubmit} onCancel={() => navigateTo('LIST')} />}
        {currentView === 'DYNAMIC_FILTER' && <DynamicFilter quotes={quotes} onQuoteClick={handleQuoteClick} />}
        
        {currentView === 'LIST' && (
          <div className="glass-panel rounded-3xl shadow-glass overflow-hidden min-h-[600px] flex flex-col backdrop-blur-2xl animate-fade-in">
             <div className="p-6 border-b border-black/5 flex justify-between items-center bg-white/30 sticky top-0 z-10 backdrop-blur-md">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Cotações</h2>
                    <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-widest">{filteredQuotes.length} registros</p>
                </div>
                <button onClick={() => navigateTo('DASHBOARD')} className="hidden md:block px-4 py-2 text-xs border border-slate-300/40 rounded-lg bg-white/50 text-slate-600 font-medium">Voltar</button>
             </div>
             <div className="overflow-x-auto flex-1 pb-24">
                <table className="min-w-full divide-y divide-black/5">
                    <thead className="bg-white/40">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID / Cliente</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:table-cell">Modal / Rota</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Tempo</th>
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
                                                <div className="text-[9px] text-slate-500 font-mono font-bold">{q.id}</div>
                                                <div className="text-sm font-bold text-slate-800">{q.clientName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                        <div className="flex items-center text-xs text-slate-700">
                                            <span className="text-slate-500 mr-2 bg-white/50 p-1 rounded-md border border-white/40">{q.modalMain.includes('Aéreo') ? <IconPlane /> : q.modalMain.includes('Marítimo') ? <IconShip /> : <IconTruck />}</span>
                                            <span className="font-medium">{q.modalMain}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1 ml-8">{q.originCountry} → {q.destCountry}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 inline-flex text-[9px] font-bold uppercase rounded-full border shadow-sm ${q.status === QuoteStatus.PENDING_PRICING ? 'bg-amber-100 text-amber-700' : q.status === QuoteStatus.PRICED ? 'bg-sky-100 text-sky-700' : q.status === QuoteStatus.CLOSED_WON ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {q.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 relative hidden md:table-cell">
                                        <div className={`flex items-center text-xs font-medium ${isOverdue ? 'text-rose-500' : 'text-slate-600'}`}><IconClock /><span className="ml-1.5">{hoursElapsed}h <span className="text-slate-400">/ 22h</span></span></div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            {isManagement && <button onClick={() => { setEditingQuote(q); navigateTo('EDIT_QUOTE'); }} className="p-2 text-slate-400 hover:text-accent transition-colors"><IconEdit /></button>}
                                            {showPricingAction && <button onClick={() => { setActiveQuoteId(q.id); navigateTo('PRICING_TASK'); }} className="bg-accent text-white px-3 py-2 rounded-xl text-xs font-bold shadow-glow">Atender</button>}
                                            {showSalesAction && <button onClick={() => { setActiveQuoteId(q.id); navigateTo('SALES_PROPOSAL'); }} className="bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-glow flex items-center"><IconDollar /><span className="ml-1">Ofertas</span></button>}
                                            {!showPricingAction && !showSalesAction && <button onClick={() => handleQuoteClick(q)} className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"><IconSearch /></button>}
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
