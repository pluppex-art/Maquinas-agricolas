
export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
}

export interface Tractor {
  id: string;
  name: string;
  model: string;
  currentHorimeter: number;
  expectedConsumption: number; // liters per hour
  lastUpdateDate?: string; // ISO date string
}

export interface ServiceType {
  id: string;
  name: string;
}

export interface WorkLog {
  id: string;
  operatorId: string;
  operatorName: string;
  tractorId: string;
  tractorName: string;
  serviceId: string;
  serviceName: string;
  serviceDescription: string;
  date: string;
  startHorimeter: number;
  endHorimeter: number;
  startHorimeterPhoto: string; // Base64
  endHorimeterPhoto: string;   // Base64
  fuelLiters: number;
  notes: string;
  totalHours: number;
  createdAt: string;
}
