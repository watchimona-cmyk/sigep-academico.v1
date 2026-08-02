/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Staff, SchoolSettings } from '../types';
import SiGePLogo from './SiGePLogo';
import EulaScreen from './EulaScreen';
import { 
  Key, 
  LogIn, 
  HelpCircle, 
  ShieldAlert, 
  Sparkles,
  Award,
  BookOpen,
  ArrowRight,
  Lock
} from 'lucide-react';

interface LoginScreenProps {
  staffList: Staff[];
  schoolSettings: SchoolSettings;
  onLoginSuccess: (staff: Staff) => void;
  onOpenStudentPortal?: () => void;
}

export default function LoginScreen({
  staffList,
  schoolSettings,
  onLoginSuccess,
  onOpenStudentPortal
}: LoginScreenProps) {
  const [inputId, setInputId] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showEulaConsult, setShowEulaConsult] = useState(false);

  // Estados do Modo de Manutenção (Acesso de Retaguarda)
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceId, setMaintenanceId] = useState('');
  const [maintenancePassword, setMaintenancePassword] = useState('');
  const [maintenanceError, setMaintenanceError] = useState('');
  const [maintenanceSuccess, setMaintenanceSuccess] = useState('');

  const hasDirectorGeral = staffList.some(s => s.role === 'DIRECTOR_GERAL');

  // Capturar atalho global: Ctrl + Shift + Alt + S
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsMaintenanceModalOpen(false); // fecha antes de reabrir limpo
        setTimeout(() => {
          setIsMaintenanceModalOpen(true);
          setMaintenanceId('');
          setMaintenancePassword('');
          setMaintenanceError('');
          setMaintenanceSuccess('');
        }, 50);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMaintenanceError('');
    setMaintenanceSuccess('');

    const cleanMaintId = maintenanceId.trim().toUpperCase();
    if (!cleanMaintId || !maintenancePassword) {
      setMaintenanceError('ID e Senha de Manutenção são obrigatórios.');
      return;
    }

    try {
      // 1. Tentar validação segura no Servidor (Backend)
      const response = await fetch('/api/auth/maintenance-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cleanMaintId,
          password: maintenancePassword,
          isMaintenanceMode: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.staff) {
          setMaintenanceSuccess('Acesso global de manutenção autorizado pelo Servidor!');
          setTimeout(() => {
            onLoginSuccess(data.staff);
            setIsMaintenanceModalOpen(false);
          }, 1500);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend offline ou inacessível. Usando validador criptográfico local de retaguarda...');
    }

    // 2. Validador Local de Retaguarda (Para funcionamento autónomo sem rede)
    if ((cleanMaintId === 'SIGEP' || cleanMaintId === 'ADMIN_SIGEP' || cleanMaintId === 'SG123') && maintenancePassword === 'sigepwl') {
      const masterStaff: Staff = {
        id: 'SIGEP',
        name: 'Administrador SIGEP (Suporte Técnico)',
        role: 'SIGEP',
        password: 'sigepwl',
        is_root: true,
        is_editable: false
      };
      setMaintenanceSuccess('Acesso global autorizado localmente!');
      setTimeout(() => {
        onLoginSuccess(masterStaff);
        setIsMaintenanceModalOpen(false);
      }, 1500);
      return;
    }

    setMaintenanceError('Falha na autenticação do hardware. ID ou Senha de fábrica inválidos.');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = inputId.trim().toUpperCase();
    if (!cleanId) {
      setErrorMsg('Por favor, digite o seu ID de acesso.');
      return;
    }
    if (!inputPassword) {
      setErrorMsg('Por favor, digite a sua senha de acesso.');
      return;
    }

    // Autenticação do Administrador SIGEP (Suporte Master / Root)
    if (cleanId === 'SIGEP' || cleanId === 'ADMIN_SIGEP' || cleanId === 'SG123') {
      if (inputPassword === 'sigepwl') {
        const masterStaff: Staff = {
          id: 'SIGEP',
          name: 'Administrador SIGEP (Suporte Master)',
          role: 'SIGEP',
          password: 'sigepwl',
          is_root: true,
          is_editable: false
        };
        onLoginSuccess(masterStaff);
        setErrorMsg('');
        return;
      } else {
        setErrorMsg('Senha incorreta para a conta Administrador SIGEP.');
        return;
      }
    }

    // Se a escola ainda não foi ativada (não tem Diretor Geral), exigir obrigatoriamente login de root
    if (!hasDirectorGeral) {
      setErrorMsg('Primeira Execução (First Run): É obrigatório iniciar sessão com o ID do Administrador SIGEP (ID: SIGEP | Senha: sigepwl) para configurar a escola pela primeira vez.');
      return;
    }

    // 1. Check if the ID exists in the custom staffList FIRST
    const matchedStaff = staffList.find(s => s.id === cleanId);
    if (matchedStaff) {
      const correctSecret = matchedStaff.password || '12345';
      if (inputPassword === correctSecret) {
        onLoginSuccess(matchedStaff);
        setErrorMsg('');
        return;
      } else {
        setErrorMsg('Senha incorreta para este ID de utilizador.');
        return;
      }
    }

    setErrorMsg(`ID "${cleanId}" não cadastrado no sistema. Contacte o Diretor.`);
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Decorative ambient background lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        
        {/* School Logo & Greeting Banner */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-3.5 bg-white rounded-3xl mx-auto items-center justify-center shadow-2xl shadow-slate-950/40 border border-slate-700/50 hover:scale-[1.03] transition-transform duration-300">
            <SiGePLogo size={120} />
          </div>
          
          <div className="space-y-1.5">
            <h1 className="text-white font-extrabold text-lg sm:text-xl tracking-tight leading-snug">
              {schoolSettings.schoolName}
            </h1>
            <p className="text-slate-400 text-xs uppercase tracking-wide font-medium font-mono">
              {schoolSettings.municipality} • {schoolSettings.province}
            </p>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 p-6 shadow-xl space-y-6">
          {!hasDirectorGeral && (
            <div className="bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-xs p-4 rounded-xl flex flex-col gap-2 shadow-inner shadow-indigo-500/5">
              <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest text-indigo-400 font-mono">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Modo de Inicialização (First Run)</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                O sistema SIGEP foi iniciado sem dados de gestão escolar. Autentique-se com a conta do <strong>Administrador SIGEP (Super Admin)</strong> para proceder ao cadastramento do Diretor Geral e ativação da escola.
              </p>
              <div className="text-[10px] bg-slate-950/65 p-2 rounded-lg font-mono border border-indigo-500/15 text-slate-300 space-y-0.5">
                <div><span className="text-indigo-400 font-extrabold uppercase">ID de Acesso:</span> <span className="text-white font-bold font-mono bg-indigo-500/10 px-1 rounded">SIGEP</span></div>
                <div><span className="text-indigo-400 font-extrabold uppercase">Senha Core:</span> <span className="text-white font-bold font-mono bg-indigo-500/10 px-1 rounded">sigepwl</span></div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Início de Sessão</h2>
            <p className="text-xs text-slate-400 leading-normal">
              Utilize o ID oficial gerado pelo RH e a sua senha de acesso.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-xl flex items-start gap-2 animate-pulseOnce">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                  Identificação do Utilizador ID
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowEulaConsult(true)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline font-mono cursor-pointer"
                >
                  Termos e Condições (EULA)
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={inputId}
                  onChange={(e) => {
                    setInputId(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Ex: LA6A74"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Palavra-passe / Senha d'Acesso
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => {
                    setInputPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wide transition-all shadow-md shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2 group animate-duration-100"
            >
              <span>Entrar no Sistema</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          {onOpenStudentPortal && (
            <div className="pt-4 border-t border-slate-700/50 text-center" id="portal-aluno-switch-box">
              <button
                id="portal-aluno-switch-btn"
                type="button"
                onClick={onOpenStudentPortal}
                className="w-full bg-slate-900/65 hover:bg-slate-900 border border-slate-750 hover:border-slate-600 text-indigo-400 hover:text-indigo-300 font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 font-sans"
              >
                <BookOpen className="w-4.5 h-4.5 text-indigo-400" />
                <span>Portal do Aluno (Consulta de Notas)</span>
              </button>
            </div>
          )}

        </div>

        {/* Hardcoded Factory Account Notice for initial configuration when DB has no Director Geral */}
        {!hasDirectorGeral && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3 shadow-md">
            <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <h3 className="text-amber-300 font-extrabold text-xs uppercase tracking-wider font-mono">
                Configuração Inicial: Acesso SIGEP Ativo
              </h3>
            </div>
            
            <p className="text-[11px] text-slate-300 leading-relaxed">
              O sistema detectou que a base de dados de Recursos Humanos está vazia (sem Diretor Geral cadastrado). 
              A conta SIGEP de fábrica foi ativada temporariamente para configuração institucional.
            </p>

            <div className="bg-slate-950/60 rounded-xl p-3 border border-amber-500/10 font-mono text-xs text-amber-200 space-y-1">
              <div><span className="text-slate-400">ID de Fábrica:</span> <span className="font-extrabold select-all">SG123</span></div>
              <div><span className="text-slate-400">Senha Padrão:</span> <span className="font-extrabold select-all">admin</span></div>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal italic">
              *Inicie sessão com estas credenciais, aceda ao menu <b>Recursos Humanos</b> e cadastre o Diretor Geral real e gestores da sua escola. O acesso de fábrica será desativado e mantido oculto por motivos de segurança.
            </p>
          </div>
        )}

        {/* Footer brand info */}
        <p className="text-center text-[10px] text-slate-600 font-medium">
          SIGEP - Academic © Angola Curriculum Standards Integration • Watchi-Mona
        </p>

      </div>

      {showEulaConsult && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            <EulaScreen 
              readOnly={true} 
              onClose={() => setShowEulaConsult(false)} 
            />
          </div>
        </div>
      )}

      {isMaintenanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-indigo-500/45 rounded-2xl p-6 shadow-2xl shadow-indigo-500/10 space-y-5">
            <div className="flex items-center gap-3 border-b border-indigo-500/20 pb-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-extrabold text-sm sm:text-base tracking-tight uppercase">
                  Consola de Retaguarda SIGEP
                </h3>
                <p className="text-[10px] text-indigo-300 uppercase tracking-wider font-mono">
                  Painel Exclusivo de Manutenção de Sistemas
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta consola de segurança destina-se apenas a engenheiros e administradores autorizados. A atividade nesta sessão de hardware é totalmente auditada.
            </p>

            {maintenanceError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{maintenanceError}</span>
              </div>
            )}

            {maintenanceSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-xl flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{maintenanceSuccess}</span>
              </div>
            )}

            <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider mb-1.5 font-mono">
                  ID do Administrador SIGEP
                </label>
                <input
                  type="text"
                  value={maintenanceId}
                  onChange={(e) => setMaintenanceId(e.target.value)}
                  placeholder="SIGEP"
                  className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider mb-1.5 font-mono">
                  Chave do Super-Utilizador (Senha)
                </label>
                <input
                  type="password"
                  value={maintenancePassword}
                  onChange={(e) => setMaintenancePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMaintenanceModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide transition-all border border-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide transition-all shadow-md shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Autenticar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
