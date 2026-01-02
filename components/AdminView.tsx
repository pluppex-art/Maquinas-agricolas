
import React, { useState, useMemo } from 'react';
import { WorkLog, Tractor, ServiceType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AdminViewProps {
  logs: WorkLog[];
  tractors: Tractor[];
  services: ServiceType[];
  onAddTractor: (tractor: Tractor) => void;
  onUpdateTractor: (tractor: Tractor) => void;
  onDeleteTractor: (id: string) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ logs, tractors, services, onAddTractor, onUpdateTractor, onDeleteTractor }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'machines'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTractor, setEditingTractor] = useState<Tractor | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  // Dashboard Filter State
  const [dashboardTractorId, setDashboardTractorId] = useState<string>('all');

  const getToday = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '',
    model: '',
    currentHorimeter: '',
    expectedConsumption: '',
    date: getToday()
  });

  const stats = useMemo(() => {
    // Filter logs based on dashboard selection
    const filteredLogs = dashboardTractorId === 'all' 
      ? logs 
      : logs.filter(log => log.tractorId === dashboardTractorId);

    const totalHours = filteredLogs.reduce((sum, log) => sum + log.totalHours, 0);
    const totalFuel = filteredLogs.reduce((sum, log) => sum + log.fuelLiters, 0);
    const avgConsumption = totalHours > 0 ? totalFuel / totalHours : 0;
    
    // Machine comparison data (stays constant or adapts)
    const machineHours = tractors.map(t => {
      const hours = logs.filter(l => l.tractorId === t.id).reduce((sum, l) => sum + l.totalHours, 0);
      return { name: t.name, hours };
    });

    // Service distribution based on filtered logs
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

  const handleOpenModal = (tractor?: Tractor) => {
    if (tractor) {
      setEditingTractor(tractor);
      setFormData({
        name: tractor.name,
        model: tractor.model,
        currentHorimeter: tractor.currentHorimeter.toString(),
        expectedConsumption: tractor.expectedConsumption.toString(),
        date: tractor.lastUpdateDate || getToday()
      });
    } else {
      setEditingTractor(null);
      setFormData({ 
        name: '', 
        model: '', 
        currentHorimeter: '', 
        expectedConsumption: '',
        date: getToday()
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Tractor = {
      id: editingTractor ? editingTractor.id : Date.now().toString(),
      name: formData.name,
      model: formData.model,
      currentHorimeter: parseFloat(formData.currentHorimeter),
      expectedConsumption: parseFloat(formData.expectedConsumption),
      lastUpdateDate: formData.date
    };

    if (editingTractor) {
      onUpdateTractor(data);
    } else {
      onAddTractor(data);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o trator ${name}? Isso não apagará os históricos de trabalho.`)) {
      onDeleteTractor(id);
    }
  };

  const exportCSV = () => {
    const headers = "Data,Operador,Trator,Serviço,Descrição do Serviço,Horímetro Inicial,Horímetro Final,Horas,Combustível (L),Observações\n";
    const rows = logs.map(l => 
      `${l.date},${l.operatorName},${l.tractorName},${l.serviceName},"${(l.serviceDescription || '').replace(/"/g, '""')}",${l.startHorimeter},${l.endHorimeter},${l.totalHours.toFixed(1)},${l.fuelLiters},"${(l.notes || '').replace(/"/g, '""')}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `mucambinho_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="flex bg-white rounded-xl shadow-sm p-1 mb-6 border border-gray-100">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Histórico
        </button>
        <button 
          onClick={() => setActiveTab('machines')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'machines' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Máquinas
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Dashboard Header with Selector */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Resumo Operacional</h2>
              <p className="text-sm text-gray-500">Visualizando dados de: <span className="font-semibold text-emerald-700">{selectedTractorName}</span></p>
            </div>
            
            <div className="w-full sm:w-64">
              <label htmlFor="tractor-filter" className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Selecionar Máquina</label>
              <select
                id="tractor-filter"
                value={dashboardTractorId}
                onChange={(e) => setDashboardTractorId(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
              >
                <option value="all">Todas as Máquinas</option>
                {tractors.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.model})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
              <p className="text-sm font-semibold text-gray-500 uppercase">Horas Trabalhadas</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.totalHours.toFixed(1)} h</h3>
              <p className="text-xs text-gray-400 mt-2">Baseado em {stats.filteredLogsCount} registros</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
              <p className="text-sm font-semibold text-gray-500 uppercase">Combustível Total</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.totalFuel.toFixed(0)} L</h3>
              <p className="text-xs text-gray-400 mt-2">Volume total abastecido</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500">
              <p className="text-sm font-semibold text-gray-500 uppercase">Consumo Médio</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.avgConsumption.toFixed(2)} L/h</h3>
              <p className="text-xs text-gray-400 mt-2">Média de eficiência</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h4 className="text-lg font-bold text-gray-800 mb-6">Comparativo: Uso por Máquina (Horas)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.machineHours}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="hours" 
                      fill="#059669" 
                      radius={[4, 4, 0, 0]} 
                      activeBar={{ fill: '#047857' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h4 className="text-lg font-bold text-gray-800 mb-6">Distribuição de Serviços</h4>
              <div className="h-64 flex justify-center">
                {stats.serviceDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.serviceDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {stats.serviceDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center text-gray-400">Sem registros para esta seleção</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <h4 className="text-lg font-bold text-gray-800">Registros Recentes</h4>
            <button 
              onClick={exportCSV}
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg text-sm font-semibold flex items-center transition-all border border-emerald-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-semibold">Data</th>
                  <th className="p-4 font-semibold">Operador</th>
                  <th className="p-4 font-semibold">Trator</th>
                  <th className="p-4 font-semibold">Serviço / Fotos</th>
                  <th className="p-4 font-semibold text-right">Horas</th>
                  <th className="p-4 font-semibold text-right">Lts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length > 0 ? logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{new Date(log.date).toLocaleDateString('pt-BR')}</td>
                    <td className="p-4 text-sm font-medium text-gray-800">{log.operatorName}</td>
                    <td className="p-4 text-sm text-gray-600">{log.tractorName}</td>
                    <td className="p-4 text-sm">
                      <div className="font-semibold text-emerald-800">{log.serviceName}</div>
                      <div className="flex gap-2 mt-2">
                        {log.startHorimeterPhoto && (
                          <button onClick={() => setSelectedPhoto(log.startHorimeterPhoto)} className="relative group">
                            <img src={log.startHorimeterPhoto} className="h-10 w-10 object-cover rounded border border-gray-200" title="Foto Inicial" />
                            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] px-1 rounded">Ini</span>
                          </button>
                        )}
                        {log.endHorimeterPhoto && (
                          <button onClick={() => setSelectedPhoto(log.endHorimeterPhoto)} className="relative group">
                            <img src={log.endHorimeterPhoto} className="h-10 w-10 object-cover rounded border border-gray-200" title="Foto Final" />
                            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] px-1 rounded">Fim</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-bold text-emerald-600 text-right">{log.totalHours.toFixed(1)}h</td>
                    <td className="p-4 text-sm text-gray-500 text-right">{log.fuelLiters || '-'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-gray-400">Nenhum registro encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'machines' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-xl font-bold text-gray-800">Frota de Máquinas</h4>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold shadow-sm hover:bg-emerald-700 transition-all flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Adicionar Máquina
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tractors.map(tractor => {
              const tractorLogs = logs.filter(l => l.tractorId === tractor.id);
              const tractorHours = tractorLogs.reduce((sum, l) => sum + l.totalHours, 0);
              const tractorFuel = tractorLogs.reduce((sum, l) => sum + l.fuelLiters, 0);
              const efficiency = tractorHours > 0 ? (tractorFuel / tractorHours).toFixed(1) : '0.0';
              
              return (
                <div key={tractor.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full relative group hover:shadow-md transition-shadow">
                  <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(tractor)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(tractor.id, tractor.name)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="font-bold text-lg text-gray-800">{tractor.name}</h5>
                      <p className="text-sm text-gray-500">{tractor.model}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 flex-grow">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Horímetro Atual</span>
                      <span className="font-bold text-gray-800">{tractor.currentHorimeter.toFixed(1)} h</span>
                    </div>
                    {tractor.lastUpdateDate && (
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>Última Atualização</span>
                        <span>{new Date(tractor.lastUpdateDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Horas (Período)</span>
                      <span className="font-semibold text-gray-800">{tractorHours.toFixed(1)} h</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Consumo Médio</span>
                      <span className={`font-bold ${parseFloat(efficiency) > tractor.expectedConsumption ? 'text-red-500' : 'text-emerald-600'}`}>
                        {efficiency} L/h
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-50">
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min((parseFloat(efficiency) || 0) / tractor.expectedConsumption * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-bold uppercase">
                      <span>Meta: {tractor.expectedConsumption} L/h</span>
                      <span>Real: {efficiency} L/h</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal para Adicionar/Editar Máquina */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-6">{editingTractor ? 'Editar Máquina' : 'Nova Máquina'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Nome/Identificação</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl bg-white text-gray-900 focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Modelo</label>
                <input type="text" required value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl bg-white text-gray-900 focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Data</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl bg-white text-gray-900 focus:border-emerald-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Horímetro Inicial</label>
                  <input type="number" step="0.1" required value={formData.currentHorimeter} onChange={e => setFormData({...formData, currentHorimeter: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl bg-white text-gray-900 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Consumo Alvo (L/h)</label>
                  <input type="number" step="0.1" required value={formData.expectedConsumption} onChange={e => setFormData({...formData, expectedConsumption: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl bg-white text-gray-900 focus:border-emerald-500 outline-none" />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 border-2 border-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md transition-all">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
