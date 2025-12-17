
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

// Added getUserName export to handle user name lookups from IDs in the dashboard and filters
export const getUserName = (id: string): string => {
  if (id === 'user-0') return 'Admin Root';
  if (id === 'admin-root') return 'Super Administrador';
  
  try {
    const saved = localStorage.getItem('expressflow_users');
    if (saved) {
      const users: User[] = JSON.parse(saved);
      const found = users.find((u: User) => u.id === id);
      if (found) return found.name;
    }
  } catch (e) {
    // Fail silently in case of storage issues
  }

  return 'Colaborador';
};

// Seed Data
const initialQuotes: QuoteRequest[] = [
  {
    id: 'MTN-1001-12-25',
    clientName: 'Tech Imports Ltd',
    clientRef: 'IMP-2023-001',
    operationType: 'Import',
    modalMain: ModalType.SEA_FCL,
    incoterm: Incoterm.FOB,
    createdDate: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
    createdTime: '09:00',
    originCountry: 'China',
    destCountry: 'Brazil',
    pol_aol: 'Shanghai',
    pod_aod: 'Santos',
    cargoType: 'FCL',
    cargoItems: [],
    containerItems: [{ id: 'c1', type: '40HC', quantity: 2 }],
    status: QuoteStatus.PENDING_PRICING,
    requesterId: 'user-0', // Default mock id
    assignedPricingRole: Role.PRICING_SEA,
    pricingOptions: []
  }
];

export const getInitialQuotes = () => initialQuotes;
