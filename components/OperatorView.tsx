
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
      alert("Erro: Você deve anexar as fotos do horímetro inicial e final.");
      return;
    }

    const sHorimeter = parseFloat(startHorimeter);
    const eHorimeter = parseFloat(endHorimeter);
    
    if (eHorimeter < sHorimeter) {
      alert("Erro: O horímetro final não pode ser menor que o inicial.");
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

      onAddLog(newLog);
      setSuccess(true);
      
      setTimeout(() => {
        setSuccess(false);
        resetForm();
      }, 3000);
    } catch (err) {
      alert("Erro ao enviar registro. Tente novamente.");
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

  const selectedTractor = tractors.find(t => t.id === selectedTractorId);

  if (success) {
    return (
      <div className="p-6 text-center">
        <div className="bg-emerald-100 text-emerald-800 p-8 rounded-2xl shadow-sm animate-bounce mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h2 className="text-2xl font-bold">Registro Enviado!</h2>
          <p className="mt-2">Obrigado pelo seu trabalho hoje.</p>
        </div>
        <button 
          onClick={() => setSuccess(false)}
          className="text-emerald-700 font-semibold underline"
        >
          Fazer outro registro
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Nova Jornada</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Machine Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Máquina (Obrigatório)</label>
            <select
              value={selectedTractorId}
              onChange={(e) => {
                setSelectedTractorId(e.target.value);
                const t = tractors.find(x => x.id === e.target.value);
                if (t) setStartHorimeter(t.currentHorimeter.toString());
              }}
              required
              className="w-full p-4 border-2 border-gray-100 rounded-xl bg-white text-gray-900 focus:border-emerald-500 focus:ring-0 outline-none text-lg appearance-none"
            >
              <option value="">Selecione o Trator</option>
              {tractors.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.model})</option>
              ))}
            </select>
          </div>

          {/* Service Entry */}
          <div className="space-y-4 pt-2 border-t border-gray-50">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Tipo de Serviço (Obrigatório)</label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="Ex: Aragem de Terra"
                required
                className="w-full p-4 border-2 border-gray-100 rounded-xl bg-white text-gray-900 focus:border-emerald-500 outline-none text-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Descrição do Serviço (Obrigatório)</label>
              <textarea
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                placeholder="Descreva o que foi feito..."
                required
                className="w-full p-4 border-2 border-gray-100 rounded-xl bg-white text-gray-900 focus:border-emerald-500 outline-none text-lg"
                rows={2}
              />
            </div>
          </div>

          {/* Horimeters + Photos */}
          <div className="space-y-6 pt-2 border-t border-gray-50">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-200">
                <label className="block text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">1. Início da Jornada</label>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">Horímetro</p>
                    <input
                      type="number"
                      step="0.1"
                      value={startHorimeter}
                      onChange={(e) => setStartHorimeter(e.target.value)}
                      placeholder="0.0"
                      className="w-full p-3 border-2 border-gray-100 rounded-lg bg-white text-gray-900 focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      className="hidden" 
                      ref={fileInputStart} 
                      onChange={(e) => handleFileChange(e, setStartPhoto)}
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputStart.current?.click()}
                      className={`w-full p-3 rounded-lg font-bold flex flex-col items-center justify-center transition-all ${startPhoto ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'bg-emerald-600 text-white shadow-md'}`}
                    >
                      {startPhoto ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-[10px]">Alterar Foto</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                          <span className="text-[10px]">Foto Inicial</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {startPhoto && (
                  <div className="mt-3 relative">
                    <img src={startPhoto} alt="Horímetro Inicial" className="w-full h-32 object-cover rounded-lg" />
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-200">
                <label className="block text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">2. Fim da Jornada</label>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">Horímetro</p>
                    <input
                      type="number"
                      step="0.1"
                      value={endHorimeter}
                      onChange={(e) => setEndHorimeter(e.target.value)}
                      placeholder="0.0"
                      className="w-full p-3 border-2 border-gray-100 rounded-lg bg-white text-gray-900 focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      className="hidden" 
                      ref={fileInputEnd} 
                      onChange={(e) => handleFileChange(e, setEndPhoto)}
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputEnd.current?.click()}
                      className={`w-full p-3 rounded-lg font-bold flex flex-col items-center justify-center transition-all ${endPhoto ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'bg-emerald-600 text-white shadow-md'}`}
                    >
                      {endPhoto ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-[10px]">Alterar Foto</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                          <span className="text-[10px]">Foto Final</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {endPhoto && (
                  <div className="mt-3 relative">
                    <img src={endPhoto} alt="Horímetro Final" className="w-full h-32 object-cover rounded-lg" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Combustível Abastecido (Obrigatório)</label>
            <input
              type="number"
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              placeholder="Digite 0 se não abasteceu"
              required
              className="w-full p-4 border-2 border-gray-100 rounded-xl bg-white text-gray-900 focus:border-emerald-500 outline-none text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide text-xs">Observações Gerais (Opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Algum problema mecânico ou detalhe..."
              className="w-full p-4 border-2 border-gray-100 rounded-xl bg-white text-gray-900 focus:border-emerald-500 outline-none text-lg"
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white font-bold py-5 rounded-xl shadow-lg transform active:scale-95 transition-all text-xl mt-4 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {isSubmitting ? 'Enviando...' : 'Finalizar e Enviar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OperatorView;
