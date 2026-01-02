
import React, { useState, useEffect } from 'react';
import { User, UserRole, WorkLog, Tractor, ServiceType, AppConfig } from './types';
import { INITIAL_USERS, INITIAL_TRACTORS, INITIAL_SERVICES, STORAGE_KEYS } from './constants';
import Login from './components/Login';
import OperatorView from './components/OperatorView';
import AdminView from './components/AdminView';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [config, setConfig] = useState<AppConfig>({ 
    googleSheetUrl: 'https://script.google.com/macros/s/AKfycbx5M-BGMRTu9jEIaggpFOgHOr6aXHSoTHbbjI8L_rbogER1VvtIhDkXCG3-R2IsV_CnTg/exec', 
    autoSync: true 
  });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    const storedTractors = localStorage.getItem(STORAGE_KEYS.TRACTORS);
    const storedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
    const storedServices = localStorage.getItem(STORAGE_KEYS.SERVICES);
    const storedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    const storedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);

    if (!storedUsers) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    if (!storedTractors) localStorage.setItem(STORAGE_KEYS.TRACTORS, JSON.stringify(INITIAL_TRACTORS));
    if (!storedServices) localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));

    setUsers(storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS);
    setTractors(storedTractors ? JSON.parse(storedTractors) : INITIAL_TRACTORS);
    setServices(storedServices ? JSON.parse(storedServices) : INITIAL_SERVICES);
    setLogs(storedLogs ? JSON.parse(storedLogs) : []);
    
    // Se já houver config no storage, usa ela. Caso contrário, mantém o padrão com a URL fornecida.
    if (storedConfig) {
      setConfig(JSON.parse(storedConfig));
    } else {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    }

    if (storedUser) setCurrentUser(JSON.parse(storedUser));
    
    setInitialized(true);
  }, []);

  const saveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(newConfig));
  };

  const syncToGoogleSheets = async (dataToSync: { logs?: WorkLog[], tractors?: Tractor[], users?: User[] }) => {
    if (!config.googleSheetUrl) return { success: false, message: 'URL da planilha não configurada.' };

    try {
      // Usamos no-cors pois o Apps Script redireciona e o navegador bloqueia a leitura da resposta, 
      // mas o dado chega com sucesso no Google.
      await fetch(config.googleSheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(dataToSync)
      });
      return { success: true, message: 'Dados enviados com sucesso para o Google!' };
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return { success: false, message: 'Erro ao conectar com o Google Sheets.' };
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  };

  const addLog = async (newLog: WorkLog) => {
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updatedLogs));

    const updatedTractors = tractors.map(t => 
      t.id === newLog.tractorId ? { ...t, currentHorimeter: newLog.endHorimeter, lastUpdateDate: new Date().toISOString() } : t
    );
    setTractors(updatedTractors);
    localStorage.setItem(STORAGE_KEYS.TRACTORS, JSON.stringify(updatedTractors));

    if (config.autoSync && config.googleSheetUrl) {
      syncToGoogleSheets({ logs: [newLog], tractors: updatedTractors });
    }
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

  const addUser = (user: User) => {
    const updated = [...users, user];
    setUsers(updated);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
  };

  const updateUser = (updatedUser: User) => {
    const updated = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsers(updated);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    }
  };

  const deleteUser = (id: string) => {
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
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
                users={users}
                config={config}
                onSaveConfig={saveConfig}
                onSyncAll={() => syncToGoogleSheets({ logs, tractors, users })}
                onAddTractor={addTractor}
                onUpdateTractor={updateTractor}
                onDeleteTractor={deleteTractor}
                onAddUser={addUser}
                onUpdateUser={updateUser}
                onDeleteUser={deleteUser}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
};

export default App;
