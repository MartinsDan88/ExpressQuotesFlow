
import React, { useState } from 'react';
import { Role, User } from '../types';
import { IconPlus, IconSend, IconTrash, IconCheck } from './Icons';

interface Props {
  invitedUsers: User[];
  onInvite: (user: User) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

const AdminPanel: React.FC<Props> = ({ invitedUsers, onInvite, onRemove, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(Role.SALES);
  const [isSending, setIsSending] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setIsSending(true);
    
    // Simulate API Delay
    setTimeout(() => {
      const newUser: User = {
        id: `user-${Date.now()}`,
        name,
        email, // Using email as part of the user object now
        role
      };
      
      onInvite(newUser);
      setName('');
      setEmail('');
      setRole(Role.SALES);
      setIsSending(false);
      alert(`Convite enviado com sucesso para ${email}!`);
    }, 1000);
  };

  return (
    <div className="glass-panel p-8 rounded-2xl shadow-glass max-w-4xl mx-auto backdrop-blur-xl animate-fade-in">
      <div className="flex justify-between items-center mb-8 border-b border-black/5 pb-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Painel do Administrador</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-medium">Gestão de Convites e Equipe</p>
        </div>
        <button onClick={onClose} className="px-4 py-2 text-xs border border-slate-300/40 rounded-lg bg-white/50 hover:bg-white/80 text-slate-600 transition-all shadow-sm font-medium">Fechar Painel</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Invitation Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/40 p-6 rounded-xl border border-white/50 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide flex items-center">
               Convidar Novo Usuário
            </h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nome Completo</label>
                <input 
                  required 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="glass-input w-full p-2.5 rounded-lg text-sm" 
                  placeholder="Ex: João Silva" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">E-mail</label>
                <input 
                  required 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="glass-input w-full p-2.5 rounded-lg text-sm" 
                  placeholder="usuario@empresa.com" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Cargo / Permissão</label>
                <select 
                  value={role} 
                  onChange={e => setRole(e.target.value as Role)} 
                  className="glass-input w-full p-2.5 rounded-lg text-sm"
                >
                  {Object.values(Role).map(r => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <button 
                disabled={isSending}
                type="submit" 
                className="w-full bg-accent text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all transform active:scale-95 disabled:opacity-50"
              >
                {isSending ? 'Enviando...' : <><IconSend /> <span className="ml-2">Enviar Convite</span></>}
              </button>
            </form>
          </div>
        </div>

        {/* User List */}
        <div className="lg:col-span-2">
          <div className="bg-white/40 rounded-xl border border-white/50 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 bg-white/50 border-b border-white/40 flex justify-between items-center">
               <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Usuários Ativos / Convidados</h3>
               <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{invitedUsers.length}</span>
            </div>
            <div className="overflow-y-auto max-h-[400px] custom-scrollbar">
              <table className="min-w-full divide-y divide-black/5">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Usuário</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Cargo</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {invitedUsers.map(u => (
                    <tr key={u.id} className="hover:bg-white/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800">{u.name}</div>
                        <div className="text-[10px] text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full uppercase">
                          {u.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => onRemove(u.id)}
                          className="text-rose-400 hover:text-rose-600 p-2 transition-colors"
                        >
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {invitedUsers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-xs italic">
                        Nenhum usuário convidado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
