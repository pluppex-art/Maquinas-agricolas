
import React, { useState, useMemo } from 'react';
import { WorkLog, Tractor, ServiceType, User, UserRole, AppConfig } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AdminViewProps {
  logs: WorkLog[];
  tractors: Tractor[];
  services: ServiceType[];
  users: User[];
  config: AppConfig;
  onSaveConfig: (config: AppConfig) => void;
  onSyncAll: () => Promise<{success: boolean, message: string}>;
  onPullAll: () => Promise<{success: boolean, message: string}>;
  onAddTractor: (tractor: Tractor) => void;
  onUpdateTractor: (tractor: Tractor) => void;
  onDeleteTractor: (id: string) => void;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ 
  logs, tractors, services, users, config,
  onSaveConfig, onSyncAll, onPullAll,
  onAddTractor, onUpdateTractor, onDeleteTractor,
  onAddUser, onUpdateUser, onDeleteUser
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'machines' | 'operators' | 'integration'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingTractor, setEditingTractor] = useState<Tractor | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<{status: string, message: string} | null>(null);
  
  const [dashboardTractorId, setDashboardTractorId] = useState<string>('all');

  const getToday = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '', model: '', currentHorimeter: '', expectedConsumption: '', date: getToday()
  });

  const [userFormData, setUserFormData] = useState({
    name: '', pin: '', role: UserRole.OPERATOR
  });

  const [sheetUrlInput, setSheetUrlInput] = useState(config.googleSheetUrl);

  const stats = useMemo(() => {
    const filteredLogs = dashboardTractorId === 'all' 
      ? logs 
      : logs.filter(log => log.tractorId === dashboardTractorId);

    const totalHours = filteredLogs.reduce((sum, log) => sum + log.totalHours, 0);
    const totalFuel = filteredLogs.reduce((sum, log) => sum + log.fuelLiters, 0);
    const avgConsumption = totalHours > 0 ? totalFuel / totalHours : 0;
    
    const machineHours = tractors.map(t => {
      const hours = logs.filter(l => l.tractorId === t.id).reduce((sum, l) => sum + l.totalHours, 0);
      return { name: t.name, hours };
    });

    const serviceMap: Record<string, number> = {};
    filteredLogs.forEach(log => {
      serviceMap[log.serviceName] = (serviceMap[log.serviceName] || 0) + log.totalHours;
    });
    
    const serviceDistribution = Object.entries(serviceMap).map(([name, value]) => ({
      name, value
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    return { totalHours, totalFuel, avgConsumption, machineHours, serviceDistribution };
  }, [logs, tractors, dashboardTractorId]);

  const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

  const handleSyncPush = async () => {
    setSyncStatus({ status: 'loading', message: 'Enviando dados...' });
    const result = await onSyncAll();
    setSyncStatus({ status: result.success ? 'success' : 'error', message: result.message });
    setTimeout(() => setSyncStatus(null), 4000);
  };

  const handleSyncPull = async () => {
    setSyncStatus({ status: 'loading', message: 'Buscando dados da planilha...' });
    const result = await onPullAll();
    setSyncStatus({ status: result.success ? 'success' : 'error', message: result.message });
    setTimeout(() => setSyncStatus(null), 4000);
  };

  const handleSaveConfig = () => {
    onSaveConfig({ ...config, googleSheetUrl: sheetUrlInput });
    alert('URL da planilha salva com sucesso!');
  };

  const handleOpenModal = (tractor?: Tractor) => {
    if (tractor) {
      setEditingTractor(tractor);
      setFormData({
        name: tractor.name, model: tractor.model, 
        currentHorimeter: tractor.currentHorimeter.toString(),
        expectedConsumption: tractor.expectedConsumption.toString(),
        date: tractor.lastUpdateDate || getToday()
      });
    } else {
      setEditingTractor(null);
      setFormData({ name: '', model: '', currentHorimeter: '', expectedConsumption: '', date: getToday() });
    }
    setIsModalOpen(true);
  };

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({ name: user.name, pin: user.pin, role: user.role });
    } else {
      setEditingUser(null);
      setUserFormData({ name: '', pin: '', role: UserRole.OPERATOR });
    }
    setIsUserModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Tractor = {
      id: editingTractor ? editingTractor.id : Date.now().toString(),
      name: formData.name, model: formData.model,
      currentHorimeter: parseFloat(formData.currentHorimeter),
      expectedConsumption: parseFloat(formData.expectedConsumption),
      lastUpdateDate: formData.date
    };
    if (editingTractor) onUpdateTractor(data); else onAddTractor(data);
    setIsModalOpen(false);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: User = {
      id: editingUser ? editingUser.id : Date.now().toString(),
      name: userFormData.name, pin: userFormData.pin, role: userFormData.role
    };
    if (editingUser) onUpdateUser(data); else onAddUser(data);
    setIsUserModalOpen(false);
  };

  const appScriptCode = `/**
 * CÓDIGO DO GOOGLE APPS SCRIPT (v2.3 - ESTÁVEL)
 * Instruções OBRIGATÓRIAS para evitar erro de 'Failed to fetch':
 * 
 * 1. Abra sua Planilha Google.
 * 2. Vá em Extensões > Apps Script.
 * 3. Cole este código no arquivo Codigo.gs (apague o que estiver lá).
 * 4. Salve o projeto (ícone do disquete).
 * 5. Clique no botão azul "Implantar" > "Nova Implantação".
 * 6. Tipo: "App da Web".
 * 7. Descrição: "API Mucambinho v2.3".
 * 8. Executar como: "Eu" (Seu email).
 * 9. Quem tem acesso: "QUALQUER PESSOA" (Essencial para o app funcionar!).
 * 10. Clique em "Implantar".
 * 11. Autorize as permissões se solicitado.
 * 12. COPIE O "URL DO APP DA WEB" (termina em /exec) e cole no seu aplicativo.
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = { logs: [], tractors: [], users: [], status: "ok" };
    
    // Puxar Histórico
    var sheetH = ss.getSheetByName("Historico");
    if (sheetH && sheetH.getLastRow() > 1) {
      var data = sheetH.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        result.logs.push({
          id: String(data[i][0]), date: data[i][1], operatorName: data[i][2],
          tractorName: data[i][3], serviceName: data[i][4],
          startHorimeter: data[i][5], endHorimeter: data[i][6],
          totalHours: data[i][7], fuelLiters: data[i][8], notes: data[i][9]
        });
      }
    }

    // Puxar Máquinas
    var sheetM = ss.getSheetByName("Maquinas");
    if (sheetM && sheetM.getLastRow() > 1) {
      var data = sheetM.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        result.tractors.push({
          id: String(data[i][0]), name: data[i][1], model: data[i][2],
          currentHorimeter: data[i][3], expectedConsumption: data[i][4],
          lastUpdateDate: data[i][5]
        });
      }
    }

    // Puxar Operadores
    var sheetO = ss.getSheetByName("Operadores");
    if (sheetO && sheetO.getLastRow() > 1) {
      var data = sheetO.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        result.users.push({
          id: String(data[i][0]), name: data[i][1], pin: data[i][2], role: data[i][3]
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data.logs && data.logs.length > 0) {
      var sheet = getOrCreateSheet(ss, "Historico");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["ID", "Data", "Operador", "Trator", "Serviço", "H. Inicial", "H. Final", "Total Horas", "Combustível", "Notas"]);
      }
      data.logs.forEach(function(log) {
        sheet.appendRow([log.id, log.date, log.operatorName, log.tractorName, log.serviceName, log.startHorimeter, log.endHorimeter, log.totalHours, log.fuelLiters, log.notes]);
      });
    }

    if (data.tractors) {
      var sheet = getOrCreateSheet(ss, "Maquinas");
      sheet.clear();
      sheet.appendRow(["ID", "Nome", "Modelo", "Horímetro Atual", "Consumo Alvo", "Última Atualização"]);
      data.tractors.forEach(function(t) {
        sheet.appendRow([t.id, t.name, t.model, t.currentHorimeter, t.expectedConsumption, t.lastUpdateDate]);
      });
    }

    if (data.users) {
      var sheet = getOrCreateSheet(ss, "Operadores");
      sheet.clear();
      sheet.appendRow(["ID", "Nome", "PIN", "Função"]);
      data.users.forEach(function(u) {
        sheet.appendRow([u.id, u.name, u.pin, u.role]);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}`;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <nav className="flex flex-wrap bg-white rounded-2xl shadow-sm p-2 mb-8 border-2 border-gray-100 gap-2 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('dashboard')} className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-black transition-all text-[11px] uppercase tracking-wider ${activeTab === 'dashboard' ? 'bg-emerald-700 text-white shadow-lg' : 'text-gray-800 hover:bg-gray-100'}`}>Dashboard</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-black transition-all text-[11px] uppercase tracking-wider ${activeTab === 'history' ? 'bg-emerald-700 text-white shadow-lg' : 'text-gray-800 hover:bg-gray-100'}`}>Histórico</button>
        <button onClick={() => setActiveTab('machines')} className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-black transition-all text-[11px] uppercase tracking-wider ${activeTab === 'machines' ? 'bg-emerald-700 text-white shadow-lg' : 'text-gray-800 hover:bg-gray-100'}`}>Frota</button>
        <button onClick={() => setActiveTab('operators')} className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-black transition-all text-[11px] uppercase tracking-wider ${activeTab === 'operators' ? 'bg-emerald-700 text-white shadow-lg' : 'text-gray-800 hover:bg-gray-100'}`}>Operadores</button>
        <button onClick={() => setActiveTab('integration')} className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-black transition-all text-[11px] uppercase tracking-wider ${activeTab === 'integration' ? 'bg-emerald-700 text-white shadow-lg' : 'text-gray-800 hover:bg-gray-100'}`}>Sincronia</button>
      </nav>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-3">
               <h2 className="text-xl font-black text-gray-950 uppercase tracking-tighter">Resumo da Fazenda</h2>
               <button onClick={handleSyncPull} className="p-2.5 bg-emerald-100 text-emerald-900 rounded-xl hover:bg-emerald-700 hover:text-white transition-all shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
               </button>
             </div>
             <select value={dashboardTractorId} onChange={(e) => setDashboardTractorId(e.target.value)} className="w-full sm:w-64 p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-xs font-black text-gray-950 focus:border-emerald-600 outline-none">
                <option value="all">Todas as Máquinas</option>
                {tractors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-7 rounded-3xl shadow-sm border-l-[12px] border-emerald-600 border-2 border-gray-50"><p className="text-[11px] font-black text-gray-700 uppercase mb-1 tracking-widest">Horas Totais</p><h3 className="text-4xl font-black text-gray-950">{stats.totalHours.toFixed(1)}h</h3></div>
            <div className="bg-white p-7 rounded-3xl shadow-sm border-l-[12px] border-blue-600 border-2 border-gray-50"><p className="text-[11px] font-black text-gray-700 uppercase mb-1 tracking-widest">Combustível</p><h3 className="text-4xl font-black text-gray-950">{stats.totalFuel.toFixed(0)}L</h3></div>
            <div className="bg-white p-7 rounded-3xl shadow-sm border-l-[12px] border-amber-600 border-2 border-gray-50"><p className="text-[11px] font-black text-gray-700 uppercase mb-1 tracking-widest">Média L/h</p><h3 className="text-4xl font-black text-gray-950">{stats.avgConsumption.toFixed(2)}</h3></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-gray-100 h-96">
              <h4 className="text-[10px] font-black text-gray-600 uppercase mb-6 tracking-widest">Horas por Máquina</h4>
              <ResponsiveContainer width="100%" height="85%"><BarChart data={stats.machineHours}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" /><XAxis dataKey="name" fontSize={11} fontWeight="900" stroke="#333" /><YAxis fontSize={11} fontWeight="900" stroke="#333" /><Tooltip cursor={{fill: '#f0fdf4'}} /><Bar dataKey="hours" fill="#059669" radius={[12, 12, 0, 0]} /></BarChart></ResponsiveContainer>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-gray-100 h-96">
              <h4 className="text-[10px] font-black text-gray-600 uppercase mb-6 tracking-widest">Serviços Executados</h4>
              <ResponsiveContainer width="100%" height="85%"><PieChart><Pie data={stats.serviceDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value" label={({ name }) => name} paddingAngle={5}>{stats.serviceDistribution.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-100 overflow-hidden">
          <div className="p-7 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50">
             <h3 className="text-xs font-black uppercase tracking-widest text-gray-950">Histórico de Trabalho</h3>
             <button onClick={handleSyncPull} className="flex items-center gap-2 text-[11px] font-black text-emerald-900 uppercase bg-emerald-100 px-4 py-2 rounded-xl hover:bg-emerald-700 hover:text-white transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Sincronizar
             </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100 text-gray-950 text-[10px] uppercase font-black tracking-[0.2em] border-b-2 border-gray-200">
                <tr><th className="p-6">Data</th><th className="p-6">Operador</th><th className="p-6">Máquina</th><th className="p-6 text-right">Horas</th><th className="p-6 text-right">Litros</th></tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-100">
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="p-20 text-center text-gray-900 text-sm font-black uppercase tracking-widest">Nenhum registro encontrado.</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-emerald-50 transition-colors">
                      <td className="p-6 text-xs font-black text-gray-800">{new Date(log.date).toLocaleDateString('pt-BR')}</td>
                      <td className="p-6 text-xs font-black text-gray-950">{log.operatorName}</td>
                      <td className="p-6 text-xs font-bold text-gray-700">{log.tractorName}</td>
                      <td className="p-6 text-xs font-black text-emerald-900 text-right">{log.totalHours.toFixed(1)}h</td>
                      <td className="p-6 text-xs text-gray-800 text-right font-black">{log.fuelLiters || '0'}L</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'machines' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h4 className="text-2xl font-black text-gray-950 uppercase tracking-tight">Frota Mucambinho</h4>
            <button onClick={() => handleOpenModal()} className="bg-emerald-700 hover:bg-emerald-800 text-white px-7 py-5 rounded-[22px] font-black text-[11px] transition-all shadow-xl uppercase tracking-widest active:scale-95">ADICIONAR MÁQUINA</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-4">
            {tractors.map(tractor => (
              <div key={tractor.id} className="bg-white p-8 rounded-[40px] shadow-sm border-2 border-gray-100 relative group hover:shadow-xl transition-all">
                <div className="absolute top-6 right-6 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenModal(tractor)} className="p-3 bg-emerald-100 text-emerald-900 rounded-2xl hover:bg-emerald-700 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                  <button onClick={() => {if(confirm('Excluir máquina?')) onDeleteTractor(tractor.id)}} className="p-3 bg-red-100 text-red-700 rounded-2xl hover:bg-red-700 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <h5 className="font-black text-2xl text-gray-950 leading-tight mb-1">{tractor.name}</h5>
                <p className="text-[11px] font-black text-emerald-700 mb-8 uppercase tracking-[0.2em]">{tractor.model}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-gray-50 rounded-3xl border-2 border-gray-100"><span className="block text-[9px] font-black text-gray-700 uppercase mb-2">Horímetro</span><span className="font-black text-gray-950 text-xl">{tractor.currentHorimeter.toFixed(1)}h</span></div>
                  <div className="p-5 bg-gray-50 rounded-3xl border-2 border-gray-100"><span className="block text-[9px] font-black text-gray-700 uppercase mb-2">Consumo</span><span className="font-black text-gray-950 text-xl">{tractor.expectedConsumption}L/h</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'operators' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h4 className="text-2xl font-black text-gray-950 uppercase tracking-tight">Equipe de Campo</h4>
            <button onClick={() => handleOpenUserModal()} className="bg-emerald-700 hover:bg-emerald-800 text-white px-7 py-5 rounded-[22px] font-black text-[11px] transition-all shadow-xl uppercase tracking-widest active:scale-95">NOVO OPERADOR</button>
          </div>
          <div className="bg-white rounded-[40px] shadow-sm border-2 border-gray-100 overflow-hidden m-4">
            <table className="w-full text-left">
              <thead className="bg-gray-100 text-gray-950 text-[10px] uppercase font-black tracking-[0.2em] border-b-2 border-gray-200">
                <tr><th className="p-7">Nome</th><th className="p-7">Função</th><th className="p-7 text-center">PIN</th><th className="p-7 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-7 text-sm font-black text-gray-950">{user.name}</td>
                    <td className="p-7"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${user.role === UserRole.ADMIN ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-100 text-emerald-900 border-emerald-300'}`}>{user.role}</span></td>
                    <td className="p-7 text-center font-black text-sm tracking-[0.4em] text-gray-950">{user.pin}</td>
                    <td className="p-7 text-right space-x-6">
                      <button onClick={() => handleOpenUserModal(user)} className="text-[11px] font-black text-emerald-900 hover:underline uppercase tracking-widest">Editar</button>
                      <button onClick={() => {if(confirm('Remover operador?')) onDeleteUser(user.id)}} className="text-[11px] font-black text-red-700 hover:underline uppercase tracking-widest">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'integration' && (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
          <div className="bg-white p-10 rounded-[50px] shadow-sm border-4 border-emerald-100">
             <h4 className="text-3xl font-black text-gray-950 mb-3 uppercase tracking-tighter">Sincronização com Google Sheets</h4>
             <p className="text-sm text-gray-800 mb-10 font-bold">Gerencie a conexão do aplicativo com sua planilha central.</p>
            
            <div className="space-y-12">
              <div>
                <label className="block text-xs font-black text-gray-950 uppercase tracking-widest mb-4">URL do Aplicativo Web (Apps Script)</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input type="text" value={sheetUrlInput} onChange={(e) => setSheetUrlInput(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className="flex-1 p-5 border-4 border-gray-200 rounded-[25px] bg-gray-50 text-gray-950 focus:border-emerald-600 outline-none font-mono text-xs font-black placeholder-gray-400" />
                  <button onClick={handleSaveConfig} className="bg-black text-white px-10 py-5 rounded-[25px] font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">SALVAR URL</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <button onClick={handleSyncPush} disabled={!config.googleSheetUrl || syncStatus?.status === 'loading'} className="bg-emerald-700 text-white py-7 rounded-[30px] font-black text-[11px] uppercase tracking-widest hover:bg-emerald-800 transition-all shadow-xl shadow-emerald-200 disabled:opacity-30">
                  {syncStatus?.status === 'loading' ? 'ENVIANDO...' : '↑ ENVIAR DADOS DO APP'}
                </button>
                <button onClick={handleSyncPull} disabled={!config.googleSheetUrl || syncStatus?.status === 'loading'} className="bg-white border-4 border-emerald-700 text-emerald-800 py-7 rounded-[30px] font-black text-[11px] uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-xl disabled:opacity-30">
                  {syncStatus?.status === 'loading' ? 'BUSCANDO...' : '↓ PUXAR DADOS DA PLANILHA'}
                </button>
              </div>

              {syncStatus && (
                <div className={`p-8 rounded-[30px] text-xs font-black text-center uppercase tracking-widest border-4 ${syncStatus.status === 'success' ? 'bg-emerald-100 text-emerald-950 border-emerald-400' : syncStatus.status === 'error' ? 'bg-red-100 text-red-950 border-red-400' : 'bg-gray-100 text-gray-950 border-gray-400'}`}>
                  {syncStatus.message}
                </div>
              )}
            </div>

            <div className="mt-16 p-8 bg-gray-950 rounded-[40px] border-4 border-gray-900">
              <div className="flex justify-between items-center mb-6">
                <h5 className="font-black text-emerald-400 text-xs uppercase tracking-widest">Código Apps Script v2.3</h5>
                <button onClick={() => {navigator.clipboard.writeText(appScriptCode); alert('Código copiado!')}} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95">Copiar Código</button>
              </div>
              <p className="text-[10px] text-gray-400 mb-4 font-bold italic">IMPORTANTE: Ao implantar no Google, selecione acesso para "Qualquer Pessoa" para evitar erro de fetch.</p>
              <pre className="bg-black/50 text-emerald-400 p-6 rounded-3xl text-[9px] overflow-x-auto font-mono max-h-72 border border-white/10 leading-relaxed scrollbar-hide">
                {appScriptCode}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Modais com alto contraste */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-emerald-950/90 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-white rounded-[50px] shadow-2xl max-w-md w-full p-10 animate-in fade-in zoom-in duration-300 border-4 border-emerald-600">
            <h3 className="text-3xl font-black text-gray-950 mb-8 uppercase tracking-tighter leading-none">{editingTractor ? 'Editar' : 'Novo'} Trator</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <input type="text" required placeholder="Nome (Ex: Trator 01)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-5 border-4 border-gray-200 rounded-3xl outline-none focus:border-emerald-600 font-black bg-gray-50 text-gray-950 placeholder-gray-500" />
              <input type="text" required placeholder="Modelo (Ex: JD 6115)" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full p-5 border-4 border-gray-200 rounded-3xl outline-none focus:border-emerald-600 font-black bg-gray-50 text-gray-950 placeholder-gray-500" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.1" required placeholder="Horímetro" value={formData.currentHorimeter} onChange={e => setFormData({...formData, currentHorimeter: e.target.value})} className="w-full p-5 border-4 border-gray-200 rounded-3xl outline-none focus:border-emerald-600 font-black bg-gray-50 text-gray-950 placeholder-gray-500" />
                <input type="number" step="0.1" required placeholder="L/h" value={formData.expectedConsumption} onChange={e => setFormData({...formData, expectedConsumption: e.target.value})} className="w-full p-5 border-4 border-gray-200 rounded-3xl outline-none focus:border-emerald-600 font-black bg-gray-50 text-gray-950 placeholder-gray-500" />
              </div>
              <div className="flex gap-4 pt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-gray-800 font-black uppercase text-xs tracking-widest hover:bg-gray-100 rounded-2xl border-2 border-gray-100">Fechar</button>
                <button type="submit" className="flex-1 py-5 bg-emerald-700 text-white rounded-3xl font-black shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] bg-emerald-950/90 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-white rounded-[50px] shadow-2xl max-w-md w-full p-10 animate-in fade-in zoom-in duration-300 border-4 border-emerald-600">
            <h3 className="text-3xl font-black text-gray-950 mb-8 uppercase tracking-tighter leading-none">{editingUser ? 'Editar' : 'Novo'} Operador</h3>
            <form onSubmit={handleUserSubmit} className="space-y-5">
              <input type="text" required placeholder="Nome Completo" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-5 border-4 border-gray-200 rounded-3xl outline-none focus:border-emerald-600 font-black bg-gray-50 text-gray-950 placeholder-gray-500" />
              <input type="password" maxLength={4} required placeholder="PIN (4 números)" value={userFormData.pin} onChange={e => setUserFormData({...userFormData, pin: e.target.value.replace(/\D/g, '')})} className="w-full p-5 border-4 border-gray-200 rounded-3xl outline-none focus:border-emerald-600 text-center text-4xl tracking-[0.5em] font-black bg-gray-50 text-gray-950 placeholder-gray-500" />
              <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})} className="w-full p-5 border-4 border-gray-200 rounded-3xl outline-none focus:border-emerald-600 font-black bg-white text-gray-950 uppercase text-xs tracking-widest">
                <option value={UserRole.OPERATOR}>Operador</option>
                <option value={UserRole.ADMIN}>Administrador</option>
              </select>
              <div className="flex gap-4 pt-8">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-5 text-gray-800 font-black uppercase text-xs tracking-widest hover:bg-gray-100 rounded-2xl border-2 border-gray-100">Fechar</button>
                <button type="submit" className="flex-1 py-5 bg-emerald-700 text-white rounded-3xl font-black shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
