
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
        <div className="bg-emerald-500 text-white p-10 rounded-[40px] shadow-2xl mb-8">
          <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-black mb-2">TUDO PRONTO!</h2>
          <p className="font-bold opacity-80 uppercase tracking-widest text-xs">Dados salvos com sucesso na planilha.</p>
        </div>
        <button 
          onClick={() => setSuccess(false)}
          className="bg-emerald-100 text-emerald-800 font-black py-4 px-8 rounded-2xl uppercase text-xs"
        >
          Fazer novo registro
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-20">
      <div className="bg-white rounded-[32px] shadow-sm p-6 mb-6 border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Diário de Campo</h2>
          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase">Novo</span>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seleção de Máquina */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Qual máquina você usou?</label>
            <select
              value={selectedTractorId}
              onChange={(e) => {
                setSelectedTractorId(e.target.value);
                const t = tractors.find(x => x.id === e.target.value);
                if (t) setStartHorimeter(t.currentHorimeter.toString());
              }}
              required
              className="w-full p-5 border-2 border-gray-100 rounded-2xl bg-gray-50 text-gray-900 focus:border-emerald-500 outline-none font-bold text-lg appearance-none"
            >
              <option value="">Escolha o Trator...</option>
              {tractors.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.model})</option>
              ))}
            </select>
          </div>

          {/* Horímetros e Fotos - Visual Cartão */}
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Horímetros e Fotos</label>
            
            {/* Bloco Inicial */}
            <div className="bg-emerald-50/50 p-5 rounded-3xl border-2 border-emerald-100">
              <p className="text-[10px] font-black text-emerald-700 uppercase mb-4 tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-700 text-white rounded-full flex items-center justify-center">1</span> 
                Início do Trabalho
              </p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.1"
                    value={startHorimeter}
                    onChange={(e) => setStartHorimeter(e.target.value)}
                    placeholder="Horímetro"
                    className="w-full p-4 border-2 border-white rounded-xl bg-white text-gray-900 font-black text-center focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
                <div className="w-20">
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputStart} onChange={(e) => handleFileChange(e, setStartPhoto)} />
                  <button type="button" onClick={() => fileInputStart.current?.click()} className={`w-full h-full flex items-center justify-center rounded-xl transition-all ${startPhoto ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-600 border-2 border-white shadow-sm'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              </div>
              {startPhoto && <img src={startPhoto} className="mt-3 w-full h-20 object-cover rounded-xl border-2 border-white shadow-sm" alt="Foto Inicial" />}
            </div>

            {/* Bloco Final */}
            <div className="bg-amber-50/50 p-5 rounded-3xl border-2 border-amber-100">
              <p className="text-[10px] font-black text-amber-700 uppercase mb-4 tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-700 text-white rounded-full flex items-center justify-center">2</span> 
                Fim do Trabalho
              </p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.1"
                    value={endHorimeter}
                    onChange={(e) => setEndHorimeter(e.target.value)}
                    placeholder="Horímetro"
                    className="w-full p-4 border-2 border-white rounded-xl bg-white text-gray-900 font-black text-center focus:border-amber-500 outline-none"
                    required
                  />
                </div>
                <div className="w-20">
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputEnd} onChange={(e) => handleFileChange(e, setEndPhoto)} />
                  <button type="button" onClick={() => fileInputEnd.current?.click()} className={`w-full h-full flex items-center justify-center rounded-xl transition-all ${endPhoto ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 border-2 border-white shadow-sm'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              </div>
              {endPhoto && <img src={endPhoto} className="mt-3 w-full h-20 object-cover rounded-xl border-2 border-white shadow-sm" alt="Foto Final" />}
            </div>
          </div>

          {/* Serviço e Combustível */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">O que você fez hoje?</label>
              <input type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Ex: Aragem de Terra" required className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 text-gray-900 font-bold focus:border-emerald-500 outline-none" />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Quantos Litros Abasteceu?</label>
              <div className="relative">
                <input type="number" value={fuel} onChange={(e) => setFuel(e.target.value)} placeholder="0" required className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 text-gray-900 font-black text-2xl focus:border-emerald-500 outline-none" />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-gray-300">LITROS</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-6 rounded-3xl shadow-xl shadow-emerald-200 text-white font-black text-xl tracking-widest uppercase transition-all active:scale-95 ${isSubmitting ? 'bg-gray-300' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ENVIANDO...
              </span>
            ) : 'FINALIZAR JORNADA'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OperatorView;
