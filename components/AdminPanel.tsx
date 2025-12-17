
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
    <div className="glass-panel p-4 md:p-8 rounded-3xl shadow-glass max-w-5xl mx-auto backdrop-blur-xl animate-fade-in w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-black/5 pb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Colaboradores</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Cadastro direto de equipe</p>
        </div>
        <button onClick={onClose} className="hidden md:block px-5 py-2.5 text-xs border border-slate-300/40 rounded-xl bg-white/50 hover:bg-white/80 text-slate-600 transition-all shadow-sm font-bold">Voltar ao Dashboard</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/40 p-6 rounded-2xl border border-white/50 shadow-sm backdrop-blur-md">
            <h3 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wide flex items-center">
               <span className="bg-accent/10 p-1.5 rounded-lg mr-2"><IconPlus /></span> Cadastrar Novo
            </h3>
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-wider">Nome Completo</label>
                <input 
                  required 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="glass-input w-full p-3.5 rounded-2xl text-sm" 
                  placeholder="Nome do colaborador" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-wider">E-mail Corporativo</label>
                <input 
                  required 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="glass-input w-full p-3.5 rounded-2xl text-sm" 
                  placeholder="usuario@empresa.com" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-wider">Carga / Permissão</label>
                <select 
                  value={role} 
                  onChange={e => setRole(e.target.value as Role)} 
                  className="glass-input w-full p-3.5 rounded-2xl text-sm appearance-none"
                  style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em'}}
                >
                  {Object.values(Role).map(r => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit" 
                className="w-full bg-accent text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center shadow-lg shadow-blue-500/20 hover:brightness-110 transition-all transform active:scale-95 mt-2"
              >
                <IconPlus /> <span className="ml-2">Salvar Colaborador</span>
              </button>
            </form>
          </div>
        </div>

        {/* User List */}
        <div className="lg:col-span-7">
          <div className="bg-white/40 rounded-2xl border border-white/50 shadow-sm overflow-hidden flex flex-col h-full backdrop-blur-md">
            <div className="p-5 bg-white/50 border-b border-white/40 flex justify-between items-center">
               <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Colaboradores no Sistema</h3>
               <span className="text-[10px] bg-accent/10 text-accent px-3 py-1 rounded-full font-bold border border-accent/20">{invitedUsers.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-black/5">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Colaborador</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Acesso / Status</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {invitedUsers.map(u => (
                    <tr key={u.id} className="hover:bg-white/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-800">{u.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1.5">
                            <span className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-lg uppercase w-fit">
                                {u.role.replace(/_/g, ' ')}
                            </span>
                            <span className={`text-[8px] uppercase font-bold tracking-widest flex items-center ${u.password ? 'text-emerald-500' : 'text-amber-500'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${u.password ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                {u.password ? 'Senha Definida' : 'Aguardando 1º Acesso'}
                            </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => onRemove(u.id)}
                          className="text-slate-300 hover:text-rose-500 p-2.5 bg-white/40 hover:bg-rose-50 rounded-xl transition-all border border-white/50"
                        >
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {invitedUsers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-16 text-center text-slate-400 text-sm italic font-medium">
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
