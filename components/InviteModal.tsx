
import React, { useState } from 'react';
import { Role, User } from '../types';
import { IconSend } from './Icons';

interface Props {
  onClose: () => void;
  onInvite: (user: User) => void;
}

const InviteModal: React.FC<Props> = ({ onClose, onInvite }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(Role.SALES);
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    // 1. Cadastrar o usuário no sistema local (permite login imediato)
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      role
    };
    
    onInvite(newUser);

    // 2. Preparar o link de e-mail (Opção 2)
    const subject = encodeURIComponent("Convite para Colaboração - Portal ExpressFlow");
    const roleDisplay = role.replace(/_/g, ' ');
    const body = encodeURIComponent(
      `Olá ${name},\n\n` +
      `Você foi convidado para colaborar no portal logístico ExpressFlow.\n\n` +
      `Detalhes do seu acesso:\n` +
      `- Cargo: ${roleDisplay}\n` +
      `- E-mail cadastrado: ${email}\n\n` +
      `Sua conta já está ativa no sistema. Basta selecionar seu nome na tela de login de usuários.\n\n` +
      `Atenciosamente,\n` +
      `Administração ExpressFlow`
    );

    // 3. Abrir o cliente de e-mail
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;

    // 4. Feedback visual e fechamento
    setTimeout(() => {
      setIsSending(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in border border-white/20">
        <div className="p-6 border-b border-black/5 flex justify-between items-center bg-white/40">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Novo Colaborador</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 text-2xl transition-colors">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome do Colaborador</label>
            <input 
              required 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ex: João Silva" 
              className="glass-input w-full p-3.5 rounded-2xl text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">E-mail de Contato</label>
            <input 
              required 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="exemplo@empresa.com" 
              className="glass-input w-full p-3.5 rounded-2xl text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cargo / Função</label>
            <select 
              value={role} 
              onChange={e => setRole(e.target.value as Role)} 
              className="glass-input w-full p-3.5 rounded-2xl text-sm"
            >
              <option value={Role.SALES}>Comercial (Sales)</option>
              <option value={Role.INSIDE_SALES}>Inside Sales</option>
              <option value={Role.PRICING_AIR}>Pricing Aéreo</option>
              <option value={Role.PRICING_SEA}>Pricing Marítimo</option>
              <option value={Role.PRICING_ROAD}>Pricing Rodoviário</option>
              <option value={Role.MANAGEMENT}>Gestão / Gerente</option>
            </select>
          </div>

          <div className="pt-4">
            <button 
              disabled={isSending}
              type="submit" 
              className="w-full bg-accent text-white py-4 rounded-2xl font-bold shadow-glow flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              <IconSend />
              <span>{isSending ? "Preparando E-mail..." : "Enviar Convite"}</span>
            </button>
          </div>
          <p className="text-[9px] text-slate-400 text-center uppercase tracking-widest font-bold px-4 leading-relaxed">
            Ao clicar, seu app de e-mail abrirá com o convite pronto para envio.
          </p>
        </form>
      </div>
    </div>
  );
};

export default InviteModal;
