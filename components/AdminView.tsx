
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
  onAddTractor: (tractor: Tractor) => void;
  onUpdateTractor: (tractor: Tractor) => void;
  onDeleteTractor: (id: string) => void;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ 
  logs, tractors, services, users, config,
  onSaveConfig, onSyncAll,
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

  const handleSync = async () => {
    setSyncStatus({ status: 'loading', message: 'Sincronizando...' });
    const result = await onSyncAll();
    if (result.success) {
      setSyncStatus({ status: 'success', message: result.message });
    } else {
      setSyncStatus({ status: 'error', message: result.message });
    }
    setTimeout(() => setSyncStatus(null), 5000);
  };

  const handleSaveConfig = () => {
    onSaveConfig({ ...config, googleSheetUrl: sheetUrlInput });
    alert('URL salva com sucesso!');
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

  const appScriptCode = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (data.logs) {
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
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}`;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Menu Superior Robusto */}
      <nav className="flex flex-wrap bg-white rounded-2xl shadow-sm p-2 mb-8 border border-gray-100 gap-2">
        <button onClick={() => setActiveTab('dashboard')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold transition-all text-xs uppercase tracking-wider ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>Dashboard</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold transition-all text-xs uppercase tracking-wider ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>Histórico</button>
        <button onClick={() => setActiveTab('machines')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold transition-all text-xs uppercase tracking-wider ${activeTab === 'machines' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>Frota</button>
        <button onClick={() => setActiveTab('operators')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold transition-all text-xs uppercase tracking-wider ${activeTab === 'operators' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>Operadores</button>
        <button onClick={() => setActiveTab('integration')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold transition-all text-xs uppercase tracking-wider ${activeTab === 'integration' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>Integração</button>
      </nav>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
             <h2 className="text-xl font-extrabold text-gray-800">Resumo Geral</h2>
             <select value={dashboardTractorId} onChange={(e) => setDashboardTractorId(e.target.value)} className="w-full sm:w-64 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none">
                <option value="all">Todas as Máquinas</option>
                {tractors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-500"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Horas Totais</p><h3 className="text-3xl font-black text-gray-800">{stats.totalHours.toFixed(1)}h</h3></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Combustível</p><h3 className="text-3xl font-black text-gray-800">{stats.totalFuel.toFixed(0)}L</h3></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-amber-500"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Média L/h</p><h3 className="text-3xl font-black text-gray-800">{stats.avgConsumption.toFixed(2)}</h3></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={stats.machineHours}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="hours" fill="#059669" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.serviceDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({ name }) => name}>{stats.serviceDistribution.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex justify-between items-center">
            <h4 className="font-bold text-gray-700">Registros Recentes</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                <tr><th className="p-5">Data</th><th className="p-5">Operador</th><th className="p-5">Máquina</th><th className="p-5 text-right">Horas</th><th className="p-5 text-right">Litros</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-gray-400 text-sm">Nenhum registro encontrado.</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-5 text-sm font-medium">{new Date(log.date).toLocaleDateString('pt-BR')}</td>
                      <td className="p-5 text-sm font-bold text-gray-700">{log.operatorName}</td>
                      <td className="p-5 text-sm text-gray-500">{log.tractorName}</td>
                      <td className="p-5 text-sm font-black text-emerald-600 text-right">{log.totalHours.toFixed(1)}h</td>
                      <td className="p-5 text-sm text-gray-500 text-right font-mono">{log.fuelLiters || '0'}L</td>
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
          <div className="flex justify-between items-center px-2">
            <h4 className="text-xl font-black text-gray-800 uppercase tracking-tight">Frota de Tratores</h4>
            <button onClick={() => handleOpenModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-md">ADICIONAR MÁQUINA</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tractors.map(tractor => (
              <div key={tractor.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group hover:shadow-md transition-all">
                <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenModal(tractor)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100">Editar</button>
                  <button onClick={() => {if(confirm('Excluir?')) onDeleteTractor(tractor.id)}} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">Excluir</button>
                </div>
                <h5 className="font-black text-xl text-gray-800">{tractor.name}</h5>
                <p className="text-xs font-bold text-gray-400 mb-6 uppercase tracking-widest">{tractor.model}</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"><span className="text-xs font-bold text-gray-400 uppercase">Horímetro Atual</span><span className="font-black text-emerald-600">{tractor.currentHorimeter.toFixed(1)}h</span></div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"><span className="text-xs font-bold text-gray-400 uppercase">Meta Consumo</span><span className="font-black text-blue-600">{tractor.expectedConsumption} L/h</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'operators' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h4 className="text-xl font-black text-gray-800 uppercase tracking-tight">Gestão de Equipe</h4>
            <button onClick={() => handleOpenUserModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-md">NOVO OPERADOR</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                <tr><th className="p-5">Nome do Operador</th><th className="p-5">Cargo</th><th className="p-5 text-center">PIN</th><th className="p-5 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-5 text-sm font-bold text-gray-800">{user.name}</td>
                    <td className="p-5"><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${user.role === UserRole.ADMIN ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{user.role}</span></td>
                    <td className="p-5 text-center font-mono text-sm tracking-widest bg-gray-50/50">{user.pin}</td>
                    <td className="p-5 text-right space-x-3">
                      <button onClick={() => handleOpenUserModal(user)} className="text-xs font-bold text-emerald-600 hover:underline">Editar</button>
                      <button onClick={() => {if(confirm('Remover?')) onDeleteUser(user.id)}} className="text-xs font-bold text-red-500 hover:underline">Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'integration' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-emerald-50 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
             <h4 className="text-2xl font-black text-gray-800 mb-2">Sincronização com Google</h4>
             <p className="text-sm text-gray-500 mb-8">Conecte o aplicativo à sua planilha para salvar todo o histórico.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">URL do Apps Script (Web App)</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    value={sheetUrlInput} 
                    onChange={(e) => setSheetUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 text-gray-900 focus:border-emerald-500 outline-none font-mono text-[10px]"
                  />
                  <button onClick={handleSaveConfig} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-lg shadow-emerald-100 active:scale-95 transition-all">SALVAR URL</button>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleSync}
                  disabled={!config.googleSheetUrl || syncStatus?.status === 'loading'}
                  className="w-full bg-white border-4 border-emerald-600 text-emerald-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {syncStatus?.status === 'loading' ? 'ENVIANDO DADOS...' : '🔄 FORÇAR ATUALIZAÇÃO DA PLANILHA'}
                </button>
              </div>

              {syncStatus && (
                <div className={`p-4 rounded-2xl text-xs font-black text-center animate-bounce ${syncStatus.status === 'success' ? 'bg-emerald-100 text-emerald-800' : syncStatus.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                  {syncStatus.message}
                </div>
              )}
            </div>

            <div className="mt-12 p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <h5 className="font-black text-emerald-800 text-sm mb-4">IMPORTANTE:</h5>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">O script abaixo cria automaticamente as abas <strong>Historico</strong>, <strong>Maquinas</strong> e <strong>Operadores</strong> se elas não existirem. </p>
              <div className="relative">
                <pre className="bg-gray-900 text-emerald-400 p-5 rounded-2xl text-[9px] overflow-x-auto font-mono max-h-48 scrollbar-hide">
                  {appScriptCode}
                </pre>
                <button 
                  onClick={() => {navigator.clipboard.writeText(appScriptCode); alert('Copiado!')}}
                  className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold"
                >
                  COPIAR CÓDIGO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modais de Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-gray-800 mb-6">{editingTractor ? 'Editar Máquina' : 'Nova Máquina'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" required placeholder="Nome do Trator" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:border-emerald-500 font-bold" />
              <input type="text" required placeholder="Modelo (Ex: JD 6115)" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:border-emerald-500 font-bold" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.1" required placeholder="Horímetro" value={formData.currentHorimeter} onChange={e => setFormData({...formData, currentHorimeter: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:border-emerald-500 font-bold" />
                <input type="number" step="0.1" required placeholder="Alvo L/h" value={formData.expectedConsumption} onChange={e => setFormData({...formData, expectedConsumption: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:border-emerald-500 font-bold" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-xs">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg uppercase text-xs">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-gray-800 mb-6">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <input type="text" required placeholder="Nome Completo" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:border-emerald-500 font-bold" />
              <input type="password" maxLength={4} required placeholder="PIN de Acesso (4 números)" value={userFormData.pin} onChange={e => setUserFormData({...userFormData, pin: e.target.value.replace(/\D/g, '')})} className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:border-emerald-500 text-center text-2xl tracking-[0.5em] font-black" />
              <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})} className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:border-emerald-500 font-bold bg-white">
                <option value={UserRole.OPERATOR}>OPERADOR (CAMPO)</option>
                <option value={UserRole.ADMIN}>ADMINISTRADOR (GESTÃO)</option>
              </select>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-xs">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg uppercase text-xs">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
