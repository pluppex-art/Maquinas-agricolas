
import React, { useState } from 'react';
import { User } from '../types';
import { STORAGE_KEYS } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const usersStr = localStorage.getItem(STORAGE_KEYS.USERS);
    if (usersStr) {
      const users: User[] = JSON.parse(usersStr);
      const user = users.find(u => u.pin === pin);
      if (user) {
        onLogin(user);
      } else {
        setError('PIN incorreto. Tente novamente.');
        setPin('');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-emerald-900">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-emerald-100 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Fazenda Mucambinho</h2>
          <p className="text-gray-500">Acesso ao Sistema de Máquinas</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Digite seu PIN de acesso</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="0000"
              className="w-full text-center text-3xl tracking-widest py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:border-emerald-500 focus:ring-0 transition-all outline-none"
              required
            />
            {error && <p className="mt-2 text-sm text-red-600 text-center">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transform active:scale-95 transition-all text-lg"
          >
            Entrar
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Dica para o MVP</p>
          <p className="text-sm text-gray-500 mt-2">PIN Admin: 1234 | Operador: 0001</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
