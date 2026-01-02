
import React, { useState, useRef } from 'react';
import { User, Tractor, ServiceType, WorkLog } from '../types';

interface OperatorViewProps {
  operator: User;
  tractors: Tractor[];
  services: ServiceType[];
  onAddLog: (log: WorkLog) => void;
}

const OperatorView: React.FC<OperatorViewProps> = ({ operator, tractors, services, onAddLog }) => {
  const [selectedTractorId, setSelectedTractorId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [startHorimeter, setStartHorimeter] = useState('');
  const [endHorimeter, setEndHorimeter] = useState('');
  const [fuel, setFuel] = useState('');
  const [notes, setNotes] = useState('');
  
  const [startPhoto, setStartPhoto] = useState<string>('');
  const [endPhoto, setEndPhoto] = useState<string>('');
  
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputStart = useRef<HTMLInputElement>(null);
  const fileInputEnd = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setPhoto: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startPhoto || !endPhoto) {
      alert("⚠️ Você precisa tirar a foto do horímetro (Início e Fim).");
      return;
    }

    const sHorimeter = parseFloat(startHorimeter);
    const eHorimeter = parseFloat(endHorimeter);
    
    if (isNaN(sHorimeter) || isNaN(eHorimeter)) {
      alert("⚠️ Por favor, insira valores válidos para o horímetro.");
      return;
    }

    if (eHorimeter < sHorimeter) {
      alert("⚠️ O horímetro final não pode ser menor que o inicial.");
      return;
    }

    setIsSubmitting(true);

    try {
      const totalHours = eHorimeter - sHorimeter;
      const tractor = tractors.find(t => t.id === selectedTractorId);

      const newLog: WorkLog = {
        id: Date.now().toString(),
        operatorId: operator.id,
        operatorName: operator.name,
        tractorId: selectedTractorId,
        tractorName: tractor?.name || '?',
        serviceId: serviceName.toLowerCase().replace(/\s+/g, '-'),
        serviceName: serviceName,
        serviceDescription: serviceDescription,
        date: new Date().toISOString().split('T')[0],
        startHorimeter: sHorimeter,
        endHorimeter: eHorimeter,
        startHorimeterPhoto: startPhoto,
        endHorimeterPhoto: endPhoto,
        fuelLiters: parseFloat(fuel) || 0,
        notes,
        totalHours,
        createdAt: new Date().toISOString()
      };

      await onAddLog(newLog);
      setSuccess(true);
      
      setTimeout(() => {
        setSuccess(false);
        resetForm();
      }, 3000);
    } catch (err) {
      alert("Erro ao enviar. Verifique sua internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedTractorId('');
    setServiceName('');
    setServiceDescription('');
    setStartHorimeter('');
    setEndHorimeter('');
    setFuel('');
    setNotes('');
    setStartPhoto('');
    setEndPhoto('');
  };

  if (success) {
    return (
      <div className="p-6 text-center animate-in fade-in duration-500">
        <div className="bg-emerald-600 text-white p-10 rounded-[40px] shadow-2xl mb-8">
          <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-black mb-2 uppercase">Registro Salvo!</h2>
          <p className="font-bold uppercase tracking-widest text-xs">Os dados foram enviados para a planilha.</p>
        </div>
        <button 
          onClick={() => setSuccess(false)}
          className="bg-emerald-800 text-white font-black py-5 px-10 rounded-2xl uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all"
        >
          Novo Registro
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-20">
      <div className="bg-white rounded-[32px] shadow-sm p-6 mb-6 border-4 border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-gray-950 uppercase tracking-tighter">Diário de Campo</h2>
          <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-emerald-200">Operação</span>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seleção de Máquina */}
          <div>
            <label className="block text-xs font-black text-gray-950 uppercase tracking-wider mb-3">Selecione a Máquina:</label>
            <div className="relative">
              <select
                value={selectedTractorId}
                onChange={(e) => {
                  setSelectedTractorId(e.target.value);
                  const t = tractors.find(x => x.id === e.target.value);
                  if (t) setStartHorimeter(t.currentHorimeter.toString());
                }}
                required
                className="w-full p-5 border-4 border-gray-200 rounded-2xl bg-gray-50 text-gray-950 focus:border-emerald-600 outline-none font-black text-lg appearance-none"
              >
                <option value="" className="text-gray-900">Escolha o Trator...</option>
                {tractors.map(t => (
                  <option key={t.id} value={t.id} className="text-gray-950">{t.name} ({t.model})</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-950">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Horímetros e Fotos */}
          <div className="space-y-4">
            <label className="block text-xs font-black text-gray-950 uppercase tracking-wider">Horímetros (Leitura da Máquina)</label>
            
            {/* Bloco Inicial */}
            <div className="bg-emerald-50 p-5 rounded-3xl border-4 border-emerald-200 shadow-sm">
              <p className="text-[11px] font-black text-emerald-950 uppercase mb-4 tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-700 text-white rounded-full flex items-center justify-center text-[10px]">1</span> 
                INÍCIO DO DIA
              </p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.1"
                    value={startHorimeter}
                    onChange={(e) => setStartHorimeter(e.target.value)}
                    placeholder="Horas iniciais"
                    className="w-full p-5 border-4 border-emerald-100 rounded-xl bg-white text-gray-950 font-black text-center focus:border-emerald-600 outline-none text-xl placeholder-gray-500"
                    required
                  />
                </div>
                <div className="w-24">
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputStart} onChange={(e) => handleFileChange(e, setStartPhoto)} />
                  <button type="button" onClick={() => fileInputStart.current?.click()} className={`w-full h-full flex items-center justify-center rounded-xl transition-all border-4 ${startPhoto ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-emerald-300 text-emerald-600 shadow-sm'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              </div>
              {startPhoto && (
                <div className="mt-4 relative rounded-xl overflow-hidden border-2 border-emerald-400">
                  <img src={startPhoto} className="w-full h-24 object-cover" alt="Foto Inicial" />
                  <div className="absolute bottom-1 right-1 bg-emerald-700 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">Foto OK</div>
                </div>
              )}
            </div>

            {/* Bloco Final */}
            <div className="bg-amber-50 p-5 rounded-3xl border-4 border-amber-200 shadow-sm">
              <p className="text-[11px] font-black text-amber-950 uppercase mb-4 tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 bg-amber-700 text-white rounded-full flex items-center justify-center text-[10px]">2</span> 
                FIM DO DIA
              </p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.1"
                    value={endHorimeter}
                    onChange={(e) => setEndHorimeter(e.target.value)}
                    placeholder="Horas finais"
                    className="w-full p-5 border-4 border-amber-100 rounded-xl bg-white text-gray-950 font-black text-center focus:border-amber-600 outline-none text-xl placeholder-gray-500"
                    required
                  />
                </div>
                <div className="w-24">
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputEnd} onChange={(e) => handleFileChange(e, setEndPhoto)} />
                  <button type="button" onClick={() => fileInputEnd.current?.click()} className={`w-full h-full flex items-center justify-center rounded-xl transition-all border-4 ${endPhoto ? 'bg-amber-600 border-amber-600 text-white shadow-md' : 'bg-white border-amber-300 text-amber-600 shadow-sm'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              </div>
              {endPhoto && (
                <div className="mt-4 relative rounded-xl overflow-hidden border-2 border-amber-400">
                  <img src={endPhoto} className="w-full h-24 object-cover" alt="Foto Final" />
                  <div className="absolute bottom-1 right-1 bg-amber-700 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">Foto OK</div>
                </div>
              )}
            </div>
          </div>

          {/* Serviço e Combustível */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-950 uppercase tracking-wider mb-3">Qual serviço foi feito?</label>
              <input 
                type="text" 
                value={serviceName} 
                onChange={(e) => setServiceName(e.target.value)} 
                placeholder="Ex: Grade aradora" 
                required 
                className="w-full p-5 border-4 border-gray-200 rounded-2xl bg-gray-50 text-gray-950 font-black focus:border-emerald-600 outline-none text-lg placeholder-gray-500" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-black text-gray-950 uppercase tracking-wider mb-3">Diesel Abastecido (Litros):</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={fuel} 
                  onChange={(e) => setFuel(e.target.value)} 
                  placeholder="0" 
                  required 
                  className="w-full p-5 border-4 border-gray-200 rounded-2xl bg-gray-50 text-gray-950 font-black text-3xl focus:border-emerald-600 outline-none placeholder-gray-500" 
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-gray-500 text-lg">L</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-7 rounded-[25px] shadow-2xl shadow-emerald-200 text-white font-black text-2xl tracking-widest uppercase transition-all active:scale-95 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'}`}
          >
            {isSubmitting ? 'SALVANDO...' : 'SALVAR TRABALHO'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OperatorView;
