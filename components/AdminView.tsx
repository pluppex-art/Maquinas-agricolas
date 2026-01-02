
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
    alert('Configurações de integração salvas!');
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

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[200] bg-black bg-opacity-90 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <img src={selectedPhoto} className="max-w-full max-h-full rounded-lg shadow-2xl" alt="Preview Horímetro" />
          <button className="absolute top-4 right-4 text-white p-2 bg-white bg-opacity-20 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

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
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h4 className="text-lg font-bold text-gray-800 mb-6">Uso por Máquina</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.machineHours}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h4 className="text-lg font-bold text-gray-800 mb-6">Serviços</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.serviceDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({ name }) => name}>
                      {stats.serviceDistribution.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Data</th>
                  <th className="p-4">Operador</th>
                  <th className="p-4">Trator</th>
                  <th className="p-4 text-right">Horas</th>
                  <th className="p-4 text-right">Litros</th>
                </tr>
              </thead>
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
        </div>
      )}

      {activeTab === 'machines' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-xl font-bold text-gray-800">Frota</h4>
            <button onClick={() => handleOpenModal()} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold shadow-sm text-sm">Adicionar Máquina</button>
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
                <div className="flex justify-between text-sm py-2 border-t border-gray-50"><span>Eficiência Alvo</span><span className="font-bold">{tractor.expectedConsumption} L/h</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'operators' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-xl font-bold text-gray-800">Operadores</h4>
            <button onClick={() => handleOpenUserModal()} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold shadow-sm text-sm">Novo Operador</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr><th className="p-4">Nome</th><th className="p-4">Função</th><th className="p-4">PIN</th><th className="p-4 text-right">Ações</th></tr>
              </thead>
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
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-800">Conexão Google Planilhas</h4>
                <p className="text-sm text-gray-500">Sincronize automaticamente seus dados com o Google.</p>
              </div>
            </div>

            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wider">URL do Apps Script (Web App)</label>
                <input 
                  type="text" 
                  value={sheetUrlInput} 
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full p-4 border-2 border-gray-100 rounded-xl bg-white text-gray-900 focus:border-emerald-500 outline-none font-mono text-xs"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={handleSaveConfig}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-700 transition-all flex-1"
                >
                  Salvar Configuração
                </button>
                <button 
                  onClick={handleSync}
                  disabled={!config.googleSheetUrl || syncStatus?.status === 'loading'}
                  className={`px-6 py-3 rounded-xl font-bold shadow-md transition-all flex-1 flex items-center justify-center gap-2 ${!config.googleSheetUrl ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50'}`}
                >
                  {syncStatus?.status === 'loading' ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></span>
                  ) : 'Sincronizar Tudo Agora'}
                </button>
              </div>

              {syncStatus && (
                <div className={`p-4 rounded-xl text-sm font-semibold text-center animate-fade-in ${syncStatus.status === 'success' ? 'bg-emerald-100 text-emerald-800' : syncStatus.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                  {syncStatus.message}
                </div>
              )}
            </div>

            <div className="mt-10 p-6 bg-gray-50 rounded-2xl border border-gray-200">
              <h5 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Como configurar?
              </h5>
              <ol className="text-sm text-gray-600 space-y-3 list-decimal ml-4">
                <li>Crie uma Planilha Google.</li>
                <li>Vá em <strong>Extensões > Apps Script</strong>.</li>
                <li>Copie e cole o código que você recebeu do suporte (função <code>doPost</code>).</li>
                <li>Clique em <strong>Implantar > Nova Implantação</strong>.</li>
                <li>Escolha <strong>App da Web</strong>, acesso para <strong>Qualquer Pessoa</strong>.</li>
                <li>Copie a URL gerada e cole no campo acima.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Modals remain same as before, but with updated logic for submission */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-6">{editingTractor ? 'Editar Máquina' : 'Nova Máquina'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-semibold text-gray-600 mb-1">Nome/Identificação</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-emerald-500 outline-none" /></div>
              <div><label className="block text-sm font-semibold text-gray-600 mb-1">Modelo</label><input type="text" required value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-emerald-500 outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-gray-600 mb-1">Horímetro</label><input type="number" step="0.1" required value={formData.currentHorimeter} onChange={e => setFormData({...formData, currentHorimeter: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-emerald-500 outline-none" /></div>
                <div><label className="block text-sm font-semibold text-gray-600 mb-1">Consumo Alvo</label><input type="number" step="0.1" required value={formData.expectedConsumption} onChange={e => setFormData({...formData, expectedConsumption: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-emerald-500 outline-none" /></div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border-2 border-gray-100 text-gray-500 font-bold rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-md">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-6">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div><label className="block text-sm font-semibold text-gray-600 mb-1">Nome Completo</label><input type="text" required value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-emerald-500 outline-none" /></div>
              <div><label className="block text-sm font-semibold text-gray-600 mb-1">PIN (4 dígitos)</label><input type="password" maxLength={4} required value={userFormData.pin} onChange={e => setUserFormData({...userFormData, pin: e.target.value.replace(/\D/g, '')})} className="w-full p-3 border-2 border-gray-100 rounded-xl text-center text-xl tracking-widest outline-none" /></div>
              <div><label className="block text-sm font-semibold text-gray-600 mb-1">Função</label><select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})} className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none"><option value={UserRole.OPERATOR}>Operador</option><option value={UserRole.ADMIN}>Administrador</option></select></div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-3 border-2 border-gray-100 text-gray-500 font-bold rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-md">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
