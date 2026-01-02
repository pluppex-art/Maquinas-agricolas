
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
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
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

    return { totalHours, totalFuel, avgConsumption, machineHours, serviceDistribution, filteredLogsCount: filteredLogs.length };
  }, [logs, tractors, dashboardTractorId]);

  const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

  const handleSync = async () => {
    setSyncStatus({ status: 'loading', message: 'Sincronizando dados...' });
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
    alert('Configuração de URL salva!');
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

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Excluir trator ${name}?`)) onDeleteTractor(id);
  };

  const handleUserDelete = (id: string, name: string) => {
    if (confirm(`Excluir operador ${name}?`)) onDeleteUser(id);
  };

  const selectedTractorName = dashboardTractorId === 'all' 
    ? 'Todas as Máquinas' 
    : tractors.find(t => t.id === dashboardTractorId)?.name || 'Máquina Selecionada';

  // Código do Apps Script para exibir na tela
  const appScriptCode = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Histórico de Logs
  if (data.logs && data.logs.length > 0) {
    var sheet = getOrCreateSheet(ss, "Historico");
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID", "Data", "Operador", "Trator", "Serviço", "H. Inicial", "H. Final", "Total Horas", "Combustível", "Notas"]);
    }
    data.logs.forEach(function(log) {
      sheet.appendRow([log.id, log.date, log.operatorName, log.tractorName, log.serviceName, log.startHorimeter, log.endHorimeter, log.totalHours, log.fuelLiters, log.notes]);
    });
  }

  // 2. Cadastro de Máquinas
  if (data.tractors && data.tractors.length > 0) {
    var sheet = getOrCreateSheet(ss, "Maquinas");
    sheet.clear();
    sheet.appendRow(["ID", "Nome", "Modelo", "Horímetro Atual", "Consumo Alvo", "Última Atualização"]);
    data.tractors.forEach(function(t) {
      sheet.appendRow([t.id, t.name, t.model, t.currentHorimeter, t.expectedConsumption, t.lastUpdateDate]);
    });
  }

  // 3. Cadastro de Operadores
  if (data.users && data.users.length > 0) {
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
      {/* Navigation Tabs */}
      <div className="flex bg-white rounded-xl shadow-sm p-1 mb-6 border border-gray-100 overflow-x-auto whitespace-nowrap">
        <button onClick={() => setActiveTab('dashboard')} className={`flex-1 min-w-[100px] py-3 px-2 rounded-lg font-medium transition-all text-sm ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Dashboard</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[100px] py-3 px-2 rounded-lg font-medium transition-all text-sm ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Histórico</button>
        <button onClick={() => setActiveTab('machines')} className={`flex-1 min-w-[100px] py-3 px-2 rounded-lg font-medium transition-all text-sm ${activeTab === 'machines' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Máquinas</button>
        <button onClick={() => setActiveTab('operators')} className={`flex-1 min-w-[100px] py-3 px-2 rounded-lg font-medium transition-all text-sm ${activeTab === 'operators' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Operadores</button>
        <button onClick={() => setActiveTab('integration')} className={`flex-1 min-w-[100px] py-3 px-2 rounded-lg font-medium transition-all text-sm ${activeTab === 'integration' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Integração</button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Resumo Operacional</h2>
              <p className="text-sm text-gray-500">Máquina: <span className="font-semibold text-emerald-700">{selectedTractorName}</span></p>
            </div>
            <div className="w-full sm:w-64">
              <select value={dashboardTractorId} onChange={(e) => setDashboardTractorId(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="all">Todas as Máquinas</option>
                {tractors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
              <p className="text-sm font-semibold text-gray-500 uppercase">Horas Totais</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.totalHours.toFixed(1)} h</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
              <p className="text-sm font-semibold text-gray-500 uppercase">Combustível</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.totalFuel.toFixed(0)} L</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500">
              <p className="text-sm font-semibold text-gray-500 uppercase">Eficiência</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.avgConsumption.toFixed(2)} L/h</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-64">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={stats.machineHours}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="hours" fill="#059669" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-64">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.serviceDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({ name }) => name}>{stats.serviceDistribution.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase"><tr><th className="p-4">Data</th><th className="p-4">Operador</th><th className="p-4">Trator</th><th className="p-4 text-right">Horas</th><th className="p-4 text-right">Litros</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="p-4 text-sm">{new Date(log.date).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-medium">{log.operatorName}</td>
                  <td className="p-4 text-sm">{log.tractorName}</td>
                  <td className="p-4 text-sm font-bold text-emerald-600 text-right">{log.totalHours.toFixed(1)}h</td>
                  <td className="p-4 text-sm text-gray-500 text-right">{log.fuelLiters || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'machines' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-xl font-bold text-gray-800">Frota</h4>
            <button onClick={() => handleOpenModal()} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm">Adicionar Máquina</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tractors.map(tractor => (
              <div key={tractor.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group">
                <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenModal(tractor)} className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:text-emerald-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                  <button onClick={() => handleDelete(tractor.id, tractor.name)} className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                </div>
                <h5 className="font-bold text-lg">{tractor.name}</h5>
                <p className="text-xs text-gray-400 mb-4">{tractor.model}</p>
                <div className="flex justify-between text-sm py-2 border-t border-gray-50"><span>Horímetro Atual</span><span className="font-bold">{tractor.currentHorimeter.toFixed(1)}h</span></div>
                <div className="flex justify-between text-sm py-2 border-t border-gray-50"><span>Alvo L/h</span><span className="font-bold">{tractor.expectedConsumption}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'operators' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-xl font-bold text-gray-800">Operadores</h4>
            <button onClick={() => handleOpenUserModal()} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm">Novo Operador</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase"><tr><th className="p-4">Nome</th><th className="p-4">Função</th><th className="p-4">PIN</th><th className="p-4 text-right">Ações</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="p-4 text-sm font-medium">{user.name}</td>
                    <td className="p-4 text-sm"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${user.role === UserRole.ADMIN ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{user.role}</span></td>
                    <td className="p-4 text-sm font-mono">{user.pin}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleOpenUserModal(user)} className="text-gray-400 hover:text-emerald-600 mr-2">Editar</button>
                      <button onClick={() => handleUserDelete(user.id, user.name)} className="text-gray-400 hover:text-red-600">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'integration' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="text-xl font-bold text-gray-800 mb-4">Configuração do Google Planilhas</h4>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-600 mb-2">URL do Web App (Apps Script)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={sheetUrlInput} 
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 p-3 border-2 border-gray-100 rounded-xl bg-white text-gray-900 focus:border-emerald-500 outline-none font-mono text-xs"
                />
                <button onClick={handleSaveConfig} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm">Salvar URL</button>
              </div>
            </div>

            <div className="flex gap-4 mb-8">
              <button 
                onClick={handleSync}
                disabled={!config.googleSheetUrl || syncStatus?.status === 'loading'}
                className="flex-1 bg-white border-2 border-emerald-600 text-emerald-600 py-3 rounded-xl font-bold hover:bg-emerald-50 disabled:opacity-50"
              >
                {syncStatus?.status === 'loading' ? 'Sincronizando...' : '🔄 Forçar Sincronização Total'}
              </button>
            </div>

            {syncStatus && (
              <div className={`p-4 rounded-xl text-sm font-semibold text-center mb-6 ${syncStatus.status === 'success' ? 'bg-emerald-100 text-emerald-800' : syncStatus.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                {syncStatus.message}
              </div>
            )}

            <div className="border-t pt-6">
              <h5 className="font-bold text-gray-800 mb-4">Instruções de Instalação:</h5>
              <ol className="text-sm text-gray-600 space-y-4 list-decimal ml-4">
                <li>Abra sua Planilha Google.</li>
                <li>Vá em <strong>Extensões > Apps Script</strong>.</li>
                <li>Apague tudo o que estiver lá e cole o código abaixo:</li>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-[10px] overflow-x-auto font-mono max-h-64">
                    {appScriptCode}
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(appScriptCode)}
                    className="absolute top-2 right-2 bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-2 py-1 rounded text-[10px]"
                  >
                    Copiar Código
                  </button>
                </div>
                <li>Clique no ícone de salvar (disquete).</li>
                <li>Clique em <strong>Implantar > Nova Implantação</strong>.</li>
                <li>Selecione o tipo <strong>App da Web</strong>.</li>
                <li>Em "Quem pode acessar", selecione obrigatoriamente <strong>Qualquer pessoa</strong>.</li>
                <li>Clique em Implantar e autorize as permissões.</li>
                <li>Copie a <strong>URL do App da Web</strong> e cole no campo acima.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Modals remain for adding/editing */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-6">{editingTractor ? 'Editar Máquina' : 'Nova Máquina'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" required placeholder="Nome" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl" />
              <input type="text" required placeholder="Modelo" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.1" required placeholder="Horímetro" value={formData.currentHorimeter} onChange={e => setFormData({...formData, currentHorimeter: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl" />
                <input type="number" step="0.1" required placeholder="Consumo Alvo" value={formData.expectedConsumption} onChange={e => setFormData({...formData, expectedConsumption: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-500">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-6">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <input type="text" required placeholder="Nome Completo" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl" />
              <input type="password" maxLength={4} required placeholder="PIN (4 dígitos)" value={userFormData.pin} onChange={e => setUserFormData({...userFormData, pin: e.target.value.replace(/\D/g, '')})} className="w-full p-3 border-2 border-gray-100 rounded-xl text-center text-xl tracking-widest" />
              <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})} className="w-full p-3 border-2 border-gray-100 rounded-xl">
                <option value={UserRole.OPERATOR}>Operador</option>
                <option value={UserRole.ADMIN}>Administrador</option>
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-3 text-gray-500">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
