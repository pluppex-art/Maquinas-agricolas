
import { Tractor, User, UserRole, ServiceType } from './types';

const today = new Date().toISOString().split('T')[0];

export const INITIAL_TRACTORS: Tractor[] = [
  { id: 't1', name: 'Trator 01', model: 'John Deere 6115J', currentHorimeter: 1250.5, expectedConsumption: 12, lastUpdateDate: today },
  { id: 't2', name: 'Trator 02', model: 'Massey Ferguson 4275', currentHorimeter: 840.2, expectedConsumption: 8, lastUpdateDate: today },
  { id: 't3', name: 'Trator 03', model: 'Case IH Farmall 80', currentHorimeter: 2100.8, expectedConsumption: 7.5, lastUpdateDate: today },
];

export const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Admin Mucambinho', role: UserRole.ADMIN, pin: '1234' },
  { id: 'u2', name: 'João da Silva', role: UserRole.OPERATOR, pin: '0001' },
  { id: 'u3', name: 'Manoel Oliveira', role: UserRole.OPERATOR, pin: '0002' },
];

export const INITIAL_SERVICES: ServiceType[] = [
  { id: 's1', name: 'Aragem' },
  { id: 's2', name: 'Gradagem' },
  { id: 's3', name: 'Plantio' },
  { id: 's4', name: 'Pulverização' },
  { id: 's5', name: 'Colheita' },
  { id: 's6', name: 'Transporte' },
];

export const STORAGE_KEYS = {
  USERS: 'mucambinho_users',
  TRACTORS: 'mucambinho_tractors',
  LOGS: 'mucambinho_logs',
  SERVICES: 'mucambinho_services',
  CURRENT_USER: 'mucambinho_current_user'
};
