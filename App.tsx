
import React, { useState, useEffect } from 'react';
import { User, UserRole, WorkLog, Tractor, ServiceType, AppConfig } from './types';
import { INITIAL_USERS, INITIAL_TRACTORS, INITIAL_SERVICES, STORAGE_KEYS } from './constants';
import OperatorView from './components/OperatorView';
import AdminView from './components/AdminView';

type ViewMode = 'selection' | 'operator_list' | 'operator_form' | 'admin';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('selection');
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
  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    const loadLocalData = () => {
      const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      const storedTractors = localStorage.getItem(STORAGE_KEYS.TRACTORS);
      const storedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
      const storedServices = localStorage.getItem(STORAGE_KEYS.SERVICES);
      const storedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);

      if (storedUsers) setUsers(JSON.parse(storedUsers)); else setUsers(INITIAL_USERS);
      if (storedTractors) setTractors(JSON.parse(storedTractors)); else setTractors(INITIAL_TRACTORS);
      if (storedServices) setServices(JSON.parse(storedServices)); else setServices(INITIAL_SERVICES);
      if (storedLogs) setLogs(JSON.parse(storedLogs));
      if (storedConfig) setConfig(JSON.parse(storedConfig));
      
      setInitialized(true);
    };

    loadLocalData();
  }, []);

  // Puxar dados automaticamente ao entrar no Admin
  useEffect(() => {
    if (view === 'admin' && config.googleSheetUrl && initialized) {
      pullFromGoogleSheets();
    }
  }, [view]);

  const syncToGoogleSheets = async (dataToSync: { logs?: WorkLog[], tractors?: Tractor[], users?: User[] }) => {
    if (!config.googleSheetUrl) return { success: false, message: 'URL da planilha não configurada.' };
    try {
      // POST para Google Apps Script deve usar mode: 'no-cors' para evitar erro de redirecionamento CORS
      // No entanto, isso impede que leiamos a resposta. Para logs críticos, é o método mais estável.
      await fetch(config.googleSheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(dataToSync)
      });
      return { success: true, message: 'Dados enviados com sucesso!' };
    } catch (error) {
      console.error("Erro no Sync:", error);
      return { success: false, message: 'Erro ao enviar dados.' };
    }
  };

  const pullFromGoogleSheets = async () => {
    if (!config.googleSheetUrl) return { success: false, message: 'URL não configurada.' };
    
    setIsPulling(true);
    try {
      // Cache buster para evitar respostas antigas do navegador
      const urlWithCacheBuster = `${config.googleSheetUrl}${config.googleSheetUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      
      const response = await fetch(urlWithCacheBuster, { 
        method: 'GET', 
        mode: 'cors', 
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com erro ${response.status}. Verifique se a implantação no Apps Script está como 'Qualquer Pessoa'.`);
      }
      
      const remoteData = await response.json();

      if (remoteData.error) {
        throw new Error(remoteData.error);
      }

      // Atualizar Logs
      if (remoteData.logs && Array.isArray(remoteData.logs)) {
        const formattedLogs = remoteData.logs.map((log: any) => ({
          ...log,
          startHorimeter: parseFloat(log.startHorimeter) || 0,
          endHorimeter: parseFloat(log.endHorimeter) || 0,
          totalHours: parseFloat(log.totalHours) || 0,
          fuelLiters: parseFloat(log.fuelLiters) || 0,
          date: log.date || new Date().toISOString().split('T')[0]
        }));
        setLogs(formattedLogs);
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(formattedLogs));
      }
      
      // Atualizar Máquinas
      if (remoteData.tractors && Array.isArray(remoteData.tractors)) {
        const formattedTractors = remoteData.tractors.map((t: any) => ({
          ...t,
          currentHorimeter: parseFloat(t.currentHorimeter) || 0,
          expectedConsumption: parseFloat(t.expectedConsumption) || 0
        }));
        setTractors(formattedTractors);
        localStorage.setItem(STORAGE_KEYS.TRACTORS, JSON.stringify(formattedTractors));
      }

      // Atualizar Usuários
      if (remoteData.users && Array.isArray(remoteData.users)) {
        setUsers(remoteData.users);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(remoteData.users));
      }

      return { success: true, message: 'Dados sincronizados com sucesso!' };
    } catch (error) {
      console.error("Erro ao puxar dados do Google:", error);
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      return { 
        success: false, 
        message: `Falha na conexão: ${msg}. Verifique a URL do script e as permissões de acesso.` 
      };
    } finally {
      setIsPulling(false);
    }
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

    if (config.autoSync) {
      await syncToGoogleSheets({ logs: [newLog], tractors: updatedTractors });
    }
  };

  if (!initialized) return <div className="flex items-center justify-center h-screen bg-emerald-950 text-white font-black uppercase tracking-tighter text-2xl">Carregando...</div>;

  if (view === 'selection') {
    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-6 space-y-8">
        <div className="text-center mb-8">
          <div className="inline-block p-6 bg-emerald-600 rounded-[30px] mb-6 shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">FAZENDA MUCAMBINHO</h1>
          <p className="text-emerald-400 font-bold text-xs uppercase tracking-[0.3em] mt-3">Sistema de Gestão de Frota</p>
        </div>

        <div className="grid grid-cols-1 gap-6 w-full max-w-sm">
          <button 
            onClick={() => setView('operator_list')}
            className="group relative bg-white hover:bg-emerald-50 p-8 rounded-[40px] shadow-2xl transition-all active:scale-95 text-center"
          >
            <span className="block text-4xl mb-2">🚜</span>
            <span className="block text-emerald-900 font-black text-xl uppercase tracking-tighter">Operador</span>
            <span className="block text-gray-800 text-[10px] font-bold uppercase tracking-widest mt-1">Registrar Trabalho</span>
          </button>

          <button 
            onClick={() => setView('admin')}
            className="group relative bg-emerald-800 hover:bg-emerald-700 p-8 rounded-[40px] shadow-2xl transition-all active:scale-95 text-center border-2 border-emerald-700"
          >
            <span className="block text-4xl mb-2">📊</span>
            <span className="block text-white font-black text-xl uppercase tracking-tighter">Dashboard</span>
            <span className="block text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1">Gestão e Relatórios</span>
          </button>
        </div>

        <div className="pt-10">
           <button 
            disabled={isPulling}
            onClick={pullFromGoogleSheets} 
            className="text-emerald-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:text-white transition-colors disabled:opacity-50"
           >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isPulling ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isPulling ? 'Sincronizando...' : 'Sincronizar Dados'}
           </button>
        </div>
      </div>
    );
  }

  if (view === 'operator_list') {
    return (
      <div className="min-h-screen bg-white p-6 flex flex-col">
        <header className="flex justify-between items-center mb-10">
          <button onClick={() => setView('selection')} className="p-4 bg-gray-100 rounded-2xl text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Quem está operando?</h2>
          <div className="w-12"></div>
        </header>
        
        <div className="grid grid-cols-1 gap-4 max-w-md mx-auto w-full">
          {users.filter(u => u.role === UserRole.OPERATOR).map(u => (
            <button 
              key={u.id}
              onClick={() => { setCurrentUser(u); setView('operator_form'); }}
              className="bg-gray-50 hover:bg-emerald-600 hover:text-white p-6 rounded-3xl text-left transition-all border-2 border-transparent hover:border-emerald-400 group flex items-center justify-between"
            >
              <span className="font-black text-lg uppercase tracking-tight text-gray-900">{u.name}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-emerald-800 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('selection')} className="bg-white/10 p-2 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-black leading-none uppercase tracking-tighter">Mucambinho</h1>
            <p className="text-[9px] uppercase tracking-widest opacity-70 mt-1">
              {view === 'admin' ? 'Painel Gestão' : `Operador: ${currentUser?.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view === 'admin' && (
            <button 
              onClick={pullFromGoogleSheets}
              disabled={isPulling}
              className={`p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all ${isPulling ? 'animate-spin opacity-50' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          <button onClick={() => setView('selection')} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border border-white/20 uppercase">Início</button>
        </div>
      </header>

      <main className="flex-grow pb-10">
        {view === 'operator_form' && currentUser ? (
          <OperatorView operator={currentUser} tractors={tractors} services={services} onAddLog={addLog} />
        ) : (
          <AdminView 
            logs={logs} 
            tractors={tractors} 
            services={services}
            users={users}
            config={config}
            onSaveConfig={(c) => { setConfig(c); localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(c)); }}
            onSyncAll={() => syncToGoogleSheets({ logs, tractors, users })}
            onPullAll={pullFromGoogleSheets}
            onAddTractor={(t) => { const u = [...tractors, t]; setTractors(u); localStorage.setItem(STORAGE_KEYS.TRACTORS, JSON.stringify(u)); }}
            onUpdateTractor={(t) => { const u = tractors.map(x => x.id === t.id ? t : x); setTractors(u); localStorage.setItem(STORAGE_KEYS.TRACTORS, JSON.stringify(u)); }}
            onDeleteTractor={(id) => { const u = tractors.filter(x => x.id !== id); setTractors(u); localStorage.setItem(STORAGE_KEYS.TRACTORS, JSON.stringify(u)); }}
            onAddUser={(u) => { const x = [...users, u]; setUsers(x); localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(x)); }}
            onUpdateUser={(u) => { const x = users.map(i => i.id === u.id ? u : i); setUsers(x); localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(x)); }}
            onDeleteUser={(id) => { const x = users.filter(u => u.id !== id); setUsers(x); localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(x)); }}
          />
        )}
      </main>
    </div>
  );
};

export default App;
