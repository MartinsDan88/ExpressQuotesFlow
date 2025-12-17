
import React, { useState } from 'react';
import { Role, User } from '../types';
import { IconPlus, IconTrash, IconCheck } from './Icons';

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

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email: email.toLowerCase(),
      role
    };
    
    onInvite(newUser);
    setName('');
    setEmail('');
    setRole(Role.SALES);
    alert(`Usuário ${name} cadastrado com sucesso!`);
  };

  return (
    <div className="glass-panel p-8 rounded-2xl shadow-glass max-w-4xl mx-auto backdrop-blur-xl animate-fade-in">
      <div className="flex justify-between items-center mb-8 border-b border-black/5 pb-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Gestão de Colaboradores</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-medium">Cadastro direto de equipe</p>
        </div>
        <button onClick={onClose} className="px-4 py-2 text-xs border border-slate-300/40 rounded-lg bg-white/50 hover:bg-white/80 text-slate-600 transition-all shadow-sm font-medium">Voltar ao Dashboard</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/40 p-6 rounded-xl border border-white/50 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide flex items-center">
               Cadastrar Novo
            </h3>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nome Completo</label>
                <input 
                  required 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="glass-input w-full p-2.5 rounded-lg text-sm" 
                  placeholder="Nome do colaborador" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">E-mail Corporativo</label>
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
                type="submit" 
                className="w-full bg-accent text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center shadow-lg hover:brightness-110 transition-all transform active:scale-95"
              >
                <IconPlus /> <span className="ml-2">Salvar Colaborador</span>
              </button>
            </form>
          </div>
        </div>

        {/* User List */}
        <div className="lg:col-span-2">
          <div className="bg-white/40 rounded-xl border border-white/50 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 bg-white/50 border-b border-white/40 flex justify-between items-center">
               <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Colaboradores no Sistema</h3>
               <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{invitedUsers.length}</span>
            </div>
            <div className="overflow-y-auto max-h-[400px] custom-scrollbar">
              <table className="min-w-full divide-y divide-black/5">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Colaborador</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Acesso</th>
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
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full uppercase w-fit mb-1">
                                {u.role.replace(/_/g, ' ')}
                            </span>
                            <span className={`text-[8px] uppercase font-bold ${u.password ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {u.password ? '● Senha Definida' : '○ Aguardando 1º Acesso'}
                            </span>
                        </div>
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
                        Nenhum colaborador cadastrado.
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
