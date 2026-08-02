import React, { useState } from 'react';
import { Lock, Unlock, LogOut, Key, AlertCircle, ShieldAlert } from 'lucide-react';
import { Staff } from '../types';

interface OSLockOverlayProps {
  loggedInStaff: Staff;
  onUnlock: (password: string) => boolean;
  onLogout: () => void;
  schoolName?: string;
}

export default function OSLockOverlay({ loggedInStaff, onUnlock, onLogout, schoolName }: OSLockOverlayProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cargo = 
    loggedInStaff.role === 'DIRECTOR_GERAL' ? 'Director Geral' :
    loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' ? 'Subdirector Pedagógico' :
    loggedInStaff.role === 'SUB_DIRECTOR_ADMINISTRATIVO' ? 'Subdirector Administrativo' :
    loggedInStaff.role === 'CHEFE_SECRETARIA' ? 'Chefe de Secretaria' :
    loggedInStaff.role === 'COORDENADOR_TURNO' ? 'Coordenador de Turno' :
    loggedInStaff.role === 'COORDENADOR_DISCIPLINA' ? 'Coordenador de Disciplina' :
    loggedInStaff.role === 'PROFESSOR' ? 'Professor' : loggedInStaff.role;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password.trim()) {
      setError('Por favor, introduza a sua senha de acesso.');
      return;
    }

    const success = onUnlock(password);
    if (!success) {
      setError('Senha incorreta! Por favor, tente novamente ou contacte o Administrador.');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none animate-fadeIn" id="os-lock-overlay">
      {/* Decorative gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/85 border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-black/80 flex flex-col space-y-6 relative overflow-hidden">
        {/* Subtle top header bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700" />

        {/* Security Shield Indicator */}
        <div className="mx-auto w-14 h-14 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-950/20 text-indigo-400">
          <Lock className="w-6 h-6 animate-pulse" />
        </div>

        {/* App Title */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Sessão Bloqueada
          </h2>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
            {schoolName || 'SIGEP - Academic'}
          </p>
        </div>

        {/* Security Warning Notice */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 flex gap-3 items-start">
          <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            Esta sessão foi suspensa por inatividade ou bloqueio do sistema operativo para salvaguardar a integridade dos dados e pautas. Introduza a senha para retomar de onde parou.
          </p>
        </div>

        {/* User Card */}
        <div className="bg-slate-950/40 border border-slate-800/40 rounded-2xl p-4 flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-xl border border-indigo-500/20 flex items-center justify-center font-extrabold text-indigo-400 text-lg uppercase shadow-inner">
            {loggedInStaff.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-100 truncate">
              {loggedInStaff.name}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              {cargo}
            </p>
          </div>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Senha d'Acesso
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Insira a sua senha para desbloquear..."
                className="w-full bg-slate-950/80 text-slate-100 placeholder-slate-600 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-3.5 text-sm transition-all focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Unlock Action Button */}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 cursor-pointer border border-indigo-500/30"
          >
            <Unlock className="w-4 h-4" />
            Desbloquear Sessão
          </button>
        </form>

        {/* Fallback Log out Button */}
        <div className="pt-2 text-center border-t border-slate-800/60">
          <button
            onClick={() => {
              if (confirm('Tem a certeza que deseja encerrar completamente a sessão? Quaisquer dados pendentes serão salvaguardados.')) {
                onLogout();
              }
            }}
            className="text-slate-500 hover:text-rose-400 font-semibold text-[11px] uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Terminar Sessão (Sair)
          </button>
        </div>
      </div>
    </div>
  );
}
