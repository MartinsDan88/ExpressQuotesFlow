
export enum Role {
  SALES = 'SALES',
  INSIDE_SALES = 'INSIDE_SALES',
  PRICING_SEA = 'PRICING_SEA',
  PRICING_AIR = 'PRICING_AIR',
  PRICING_ROAD = 'PRICING_ROAD',
  MANAGEMENT = 'MANAGEMENT',
}

export enum QuoteStatus {
  PENDING_PRICING = 'PENDING_PRICING',
  PRICED = 'PRICED',
  PENDING_SALE = 'PENDING_SALE',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
  OVERDUE = 'OVERDUE',
  REVALIDATION_REQ = 'REVALIDATION_REQ',
  CANCELLED = 'CANCELLED'
}

export enum ModalType {
  AIR_CIA = 'Aéreo Cia',
  AIR_COURIER = 'Aéreo Courier',
  SEA_LCL = 'Marítimo LCL',
  SEA_FCL = 'Marítimo FCL',
  SEA_PROJECT = 'Marítimo Projeto',
  ROAD_NATIONAL = 'Rodoviário Nacional',
  ROAD_INTL = 'Rodoviário Internacional',
}

export enum Incoterm {
  EXW = 'EXW',
  FCA = 'FCA',
  FOB = 'FOB',
  CFR = 'CFR',
  CIF = 'CIF',
  DAP = 'DAP',
  DDP = 'DDP',
}

export interface CargoItem {
  id: string;
  ncm?: string;
  qty: number;
  length: number;
  width: number;
  height: number;
  weight: number;
  volume?: number;
  chargeableWeight?: number;
}

export interface ContainerItem {
  id: string;
  type: string;
  ncm?: string;
  temperature?: string;
  quantity: number;
}

export interface SupplierQuote {
  supplierName: string;
  currency: string;
  freightRate: number; 
  originCharges: number;
  destinationCharges: number;
  allInValue: number;
  requestedAt?: string; 
  respondedAt?: string;
  salesFreightRate?: number;
  salesOriginCharges?: number;
  salesDestinationCharges?: number;
  salesTotal?: number;
  estimatedProfit?: number;
}

export interface QuoteRequest {
  id: string;
  clientName: string;
  clientRef: string;
  operationType: 'Import' | 'Export';
  modalMain: ModalType;
  modalSec?: ModalType;
  incoterm: Incoterm;
  createdDate: string;
  createdTime: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  originCountry: string;
  destCountry: string;
  pol_aol: string;
  pod_aod: string;
  cargoType: 'FCL' | 'LCL' | 'AIR';
  cargoItems: CargoItem[];
  containerItems: ContainerItem[];
  status: QuoteStatus;
  requesterId: string;
  assignedPricingRole: Role;
  pricingOptions: SupplierQuote[];
  sentToPricingAt?: string;
  pricedAt?: string;
  proposalSavedAt?: string;
  lastStatusChange?: string;
  observation?: string;
  hasInsurance?: boolean;
  cargoValue?: number;
}

export interface User {
  id: string;
  name: string;
  email: string; // Added email for invitations
  role: Role;
}
