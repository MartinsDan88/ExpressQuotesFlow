
import { QuoteRequest, Role, QuoteStatus, ModalType, Incoterm, User } from '../types';

export const calculateSLA = (startTime: string): { hoursElapsed: number; isOverdue: boolean } => {
  const start = new Date(startTime).getTime();
  const now = new Date().getTime();
  const diffHours = (now - start) / (1000 * 60 * 60);
  return {
    hoursElapsed: parseFloat(diffHours.toFixed(1)),
    isOverdue: diffHours > 22
  };
};

export const getRoleForModal = (modal: ModalType): Role => {
  if (modal.includes('Aéreo')) return Role.PRICING_AIR;
  if (modal.includes('Marítimo')) return Role.PRICING_SEA;
  return Role.PRICING_ROAD;
};

export const getUserName = (id: string): string => {
  if (id === 'admin-master') return 'Administrador Master';
  
  try {
    const saved = localStorage.getItem('expressflow_users');
    if (saved) {
      const users: User[] = JSON.parse(saved);
      const found = users.find((u: User) => u.id === id);
      if (found) return found.name;
    }
  } catch (e) {
    // Fail silently
  }

  return 'Colaborador';
};

// Seed Data - Clean for production
const initialQuotes: QuoteRequest[] = [];

export const getInitialQuotes = () => initialQuotes;
