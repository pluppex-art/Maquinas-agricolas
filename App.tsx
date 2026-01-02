
import React, { useState, useEffect } from 'react';
import { User, UserRole, WorkLog, Tractor, ServiceType } from './types';
import { INITIAL_USERS, INITIAL_TRACTORS, INITIAL_SERVICES, STORAGE_KEYS } from './constants';
import Login from './components/Login';
import OperatorView from './components/OperatorView';
import AdminView from './components/AdminView';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Load data from LocalStorage or use initials
    const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    const storedTractors = localStorage.getItem(STORAGE_KEYS.TRACTORS);
    const storedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
    const storedServices = localStorage.getItem(STORAGE_KEYS.SERVICES);
    const storedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);

    if (!storedUsers) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    if (!storedTractors) localStorage.setItem(STORAGE_KEYS.TRACTORS, JSON.stringify(INITIAL_TRACTORS));
    if (!storedServices) localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));

    setTractors(storedTractors ? JSON.parse(storedTractors) : INITIAL_TRACTORS);
    setServices(storedServices ? JSON.parse(storedServices) : INITIAL_SERVICES);
    setLogs(storedLogs ? JSON.parse(storedLogs) : []);
    
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    
    setInitialized(true);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  };

  const addLog = (newLog: WorkLog) => {
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updatedLogs));

    // Update tractor horimeter
    const updatedTractors = tractors.map(t => 
      t.id === newLog.tractorId ? { ...t, currentHorimeter: newLog.endHorimeter } : t
    );
    setTractors(updatedTractors);
    localStorage.setItem(STORAGE_KEYS.TRACTORS, JSON.stringify(updatedTractors));
  };

  const addTractor = (tractor: Tractor) => {
    const updated = [...tractors, tractor];
    setTractors(updated);
    localStorage.setItem(STORAGE_KEYS.TRACTORS, JSON.stringify(updated));
  };

  const updateTractor = (updatedTractor: Tractor) => {
    const updated = tractors.map(t => t.id === updatedTractor.id ? updatedTractor : t);
    setTractors(updated);
    localStorage.setItem(STORAGE_KEYS.TRACTORS, JSON.stringify(updated));
  };

  const deleteTractor = (id: string) => {
    const updated = tractors.filter(t => t.id !== id);
    setTractors(updated);
    localStorage.setItem(STORAGE_KEYS.TRACTORS, JSON.stringify(updated));
  };

  if (!initialized) return <div className="flex items-center justify-center h-screen">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!currentUser ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <header className="bg-emerald-800 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
            <div>
              <h1 className="text-lg font-bold leading-tight">Fazenda Mucambinho</h1>
              <p className="text-xs opacity-80">{currentUser.name} • {currentUser.role === UserRole.ADMIN ? 'Administrador' : 'Operador'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded-md text-sm transition-colors"
            >
              Sair
            </button>
          </header>

          <main className="flex-grow pb-10">
            {currentUser.role === UserRole.OPERATOR ? (
              <OperatorView 
                operator={currentUser} 
                tractors={tractors} 
                services={services} 
                onAddLog={addLog} 
              />
            ) : (
              <AdminView 
                logs={logs} 
                tractors={tractors} 
                services={services}
                onAddTractor={addTractor}
                onUpdateTractor={updateTractor}
                onDeleteTractor={deleteTractor}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
};

export default App;
