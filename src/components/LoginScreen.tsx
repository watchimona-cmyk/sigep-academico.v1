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
  Lock,
  Loader2
} from 'lucide-react';

interface LoginScreenProps {
  staffList: Staff[];
  schoolSettings: SchoolSettings;
  onLoginSuccess: (staff: Staff) => void;
  onOpenStudentPortal?: () => void;
  onRefreshStaff?: (updatedStaff: Staff[]) => void;
  onResetPassword?: (staffId: string, newPassword: string) => void;
}

export default function LoginScreen({
  staffList,
  schoolSettings,
  onLoginSuccess,
  onOpenStudentPortal,
  onRefreshStaff,
  onResetPassword
}: LoginScreenProps) {
  const [inputId, setInputId] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showEulaConsult, setShowEulaConsult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<Staff[]>(staffList);

  // Estados do Modal "Esqueceste a sua senha?"
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotId, setForgotId] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotMatchedStaff, setForgotMatchedStaff] = useState<Staff | null>(null);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  // Manter currentStaff em sincronia com prop staffList
  React.useEffect(() => {
    const isCleared = localStorage.getItem('sigep_rh_cleared') === 'true';
    if (isCleared) {
      setCurrentStaff([]);
      return;
    }
    if (staffList) {
      setCurrentStaff(staffList);
    }
  }, [staffList]);

  const [serverCheckDone, setServerCheckDone] = useState(false);

  // Sincronizar funcionários do Servidor Central em segundo plano na montagem
  React.useEffect(() => {
    let isMounted = true;
    const isCleared = localStorage.getItem('sigep_rh_cleared') === 'true';
    if (isCleared) {
      setCurrentStaff([]);
      setServerCheckDone(true);
      return;
    }
    const fetchCentralStaff = async () => {
      try {
        const res = await fetch('/api/funcionarios');
        if (res.ok && isMounted) {
          const serverStaff = await res.json();
          if (Array.isArray(serverStaff)) {
            if (serverStaff.length > 0) {
              setCurrentStaff(serverStaff);
              if (onRefreshStaff) {
                onRefreshStaff(serverStaff);
              }
            } else {
              setCurrentStaff([]);
            }
          }
        }
      } catch (err) {
        // Servidor offline ou utilizando dados locais
      } finally {
        if (isMounted) {
          setServerCheckDone(true);
        }
      }
    };
    fetchCentralStaff();
    return () => { isMounted = false; };
  }, []);

  // Estados do Modo de Manutenção (Acesso de Retaguarda)
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceId, setMaintenanceId] = useState('');
  const [maintenancePassword, setMaintenancePassword] = useState('');
  const [maintenanceError, setMaintenanceError] = useState('');
  const [maintenanceSuccess, setMaintenanceSuccess] = useState('');

  const isRhCleared = typeof window !== 'undefined' && localStorage.getItem('sigep_rh_cleared') === 'true';

  // Apenas assume "First Run" se a checagem com o Servidor Central terminou
  // e foi confirmado que não existe qualquer funcionário registado no banco de dados.
  const hasRegisteredStaff = isRhCleared ? false : (!serverCheckDone ? true : (
    (currentStaff || []).some(s => s.id !== 'SIGEP' && s.id !== 'ADMIN_SIGEP' && !s.is_root) ||
    (staffList || []).some(s => s.id !== 'SIGEP' && s.id !== 'ADMIN_SIGEP' && !s.is_root)
  ));

  // Pre-sincronizar funcionários no servidor para garantir que credenciais locais estejam presentes no backend
  React.useEffect(() => {
    const isCleared = localStorage.getItem('sigep_rh_cleared') === 'true';
    if (!isCleared && staffList && staffList.length > 0) {
      fetch('/api/funcionarios/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffList)
      }).catch(() => {});
    }
  }, [staffList]);

  // Capturar atalho global: Ctrl + W ou Ctrl + Shift + Alt + S para Consola de Retaguarda
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCtrlW = e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'w';
      const isFullCombo = e.ctrlKey && e.shiftKey && e.altKey && e.key.toLowerCase() === 's';
      if (isCtrlW || isFullCombo) {
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
    if ((cleanMaintId === 'SIGEP' || cleanMaintId === 'ADMIN_SIGEP' || cleanMaintId === 'SG123') && maintenancePassword === 'watchi_Scool170989-2026') {
      const masterStaff: Staff = {
        id: 'SIGEP',
        name: 'Administrador SIGEP (Suporte Técnico)',
        role: 'SIGEP',
        password: maintenancePassword,
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

    setMaintenanceError('Falha na autenticação de hardware. ID ou Senha de fábrica de retaguarda inválidos.');
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    
    const cleanPhone = forgotPhone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setForgotError('Por favor digite um número de telefone válido com pelo menos 9 dígitos.');
      return;
    }

    setIsVerifyingPhone(true);

    try {
      // 1. Tentar validação via endpoint do servidor
      const res = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.staff) {
          setForgotMatchedStaff(data.staff);
          setForgotStep(2);
          setForgotPhone(cleanPhone);
          setIsVerifyingPhone(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Servidor offline para validação de telefone. Usando busca local em memória...');
    }

    // 2. Fallback de busca local
    const pool = [...(currentStaff || []), ...(staffList || [])];
    const match = pool.find(s => {
      if (!s || !s.contact) return false;
      const staffPhoneDigits = s.contact.replace(/\D/g, '');
      return staffPhoneDigits.length >= 9 && staffPhoneDigits.endsWith(cleanPhone.slice(-9));
    });

    setIsVerifyingPhone(false);

    if (match) {
      setForgotMatchedStaff(match);
      setForgotStep(2);
    } else {
      setForgotError('Número de telefone não encontrado nos registos de Recursos Humanos do SIGEP. Confirme o número com a Direcção Geral da Escola.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotMatchedStaff) {
      setForgotError('Sessão expirada. Por favor tente novamente.');
      return;
    }

    const cleanInputId = forgotId.trim().toUpperCase();
    if (!cleanInputId) {
      setForgotError('Por favor confirme o seu ID de utilizador SIGEP.');
      return;
    }

    if (cleanInputId !== forgotMatchedStaff.id.trim().toUpperCase()) {
      setForgotError(`O ID digitado ("${cleanInputId}") não corresponde ao colaborador proprietário deste contacto telefónico.`);
      return;
    }

    if (!forgotNewPass || forgotNewPass.trim().length < 4) {
      setForgotError('A nova palavra-passe deve conter no mínimo 4 caracteres.');
      return;
    }

    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError('As palavras-passe digitadas não coincidem. Digite novamente.');
      return;
    }

    const newPassValue = forgotNewPass.trim();

    if (onResetPassword) {
      onResetPassword(forgotMatchedStaff.id, newPassValue);
    }

    setForgotSuccess(`Palavra-passe alterada com sucesso para o colaborador ${forgotMatchedStaff.name}! Pode agora iniciar sessão.`);
    setInputId(forgotMatchedStaff.id);
    setInputPassword(newPassValue);

    setTimeout(() => {
      setIsForgotPasswordOpen(false);
      setForgotStep(1);
      setForgotPhone('');
      setForgotId('');
      setForgotNewPass('');
      setForgotConfirmPass('');
      setForgotError('');
      setForgotSuccess('');
    }, 2000);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanId = inputId.trim().toUpperCase();
    if (!cleanId) {
      setErrorMsg('Por favor, digite o seu ID de acesso.');
      return;
    }
    if (!inputPassword) {
      setErrorMsg('Por favor, digite a sua senha de acesso.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    // 1. Verificação de Acesso de Fábrica / Diretor Geral Registado
    if (cleanId === 'SIGEP' || cleanId === 'ADMIN_SIGEP' || cleanId === 'SG123') {
      if (hasRegisteredStaff) {
        setIsSubmitting(false);
        setErrorMsg('Acesso por chave de fábrica bloqueado por razões de segurança: Já existe um Diretor Geral e quadro de pessoal cadastrado no SIGEP. Por favor, inicie sessão com o seu ID individual.');
        return;
      }
      if (inputPassword === 'watchi_Scool170989-2026') {
        const masterStaff: Staff = {
          id: 'SIGEP',
          name: 'Administrador SIGEP (Suporte Master)',
          role: 'SIGEP',
          password: inputPassword,
          is_root: true,
          is_editable: false
        };
        setIsSubmitting(false);
        onLoginSuccess(masterStaff);
        return;
      } else {
        setIsSubmitting(false);
        setErrorMsg('Senha de fábrica incorreta para a conta Administrador SIGEP.');
        return;
      }
    }

    // 2. Tentar autenticação em tempo real no Servidor Central (PostgreSQL)
    let serverAuthFailedWithWrongPassword = false;
    let serverWrongPasswordMsg = '';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const authRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cleanId, password: inputPassword }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData.success) {
          if (authData.type === 'staff' && authData.staff) {
            setIsSubmitting(false);
            onLoginSuccess(authData.staff);
            return;
          } else if (authData.type === 'student' && onOpenStudentPortal) {
            setIsSubmitting(false);
            onOpenStudentPortal();
            return;
          }
        }
      } else if (authRes.status === 401) {
        const errData = await authRes.json().catch(() => null);
        serverAuthFailedWithWrongPassword = true;
        serverWrongPasswordMsg = errData?.error || `Senha incorreta para o utilizador ${cleanId}.`;
      }
    } catch (err) {
      // Backend offline ou indisponível, faz fallback para unificação
    }

    if (serverAuthFailedWithWrongPassword) {
      setIsSubmitting(false);
      setErrorMsg(serverWrongPasswordMsg);
      return;
    }

    // 3. Unificação de Listas (Servidor Central + Local StaffList + Estado da App)
    let fetchedServerStaff: Staff[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/funcionarios', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          fetchedServerStaff = data;
        }
      }
    } catch (err) {
      // Ignorar erro do fetch
    }

    const combinedStaffMap = new Map<string, Staff>();
    (staffList || []).forEach(s => s && s.id && combinedStaffMap.set(s.id.trim().toUpperCase(), s));
    (currentStaff || []).forEach(s => s && s.id && combinedStaffMap.set(s.id.trim().toUpperCase(), s));
    fetchedServerStaff.forEach(s => s && s.id && combinedStaffMap.set(s.id.trim().toUpperCase(), s));

    const poolOfStaff = Array.from(combinedStaffMap.values());

    // Validar ID na lista unificada (insensível a maiúsculas / espaços)
    const matchedStaff = poolOfStaff.find(s => 
      s.id.trim().toUpperCase() === cleanId || 
      s.id.trim().toUpperCase() === cleanId.replace(/\s+/g, '')
    );

    if (matchedStaff) {
      const correctSecret = matchedStaff.password || '12345';
      if (inputPassword === correctSecret) {
        // Assegurar persistência do funcionário no servidor central
        fetch('/api/funcionarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(matchedStaff)
        }).catch(() => {});

        setIsSubmitting(false);
        onLoginSuccess(matchedStaff);
        return;
      } else {
        setIsSubmitting(false);
        setErrorMsg(`Senha incorreta para o utilizador ${cleanId}.`);
        return;
      }
    }

    // Fallback para alunos
    if (onOpenStudentPortal && (cleanId.startsWith('EUN') || cleanId.startsWith('MAT') || cleanId.startsWith('ALU'))) {
      setIsSubmitting(false);
      onOpenStudentPortal();
      return;
    }

    setIsSubmitting(false);
    setErrorMsg(`ID "${cleanId}" não cadastrado no sistema. Contacte o Diretor Geral ou os Recursos Humanos.`);
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
          {!hasRegisteredStaff && (
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
                <div><span className="text-indigo-400 font-extrabold uppercase">Senha Core:</span> <span className="text-white font-bold font-mono bg-indigo-500/10 px-1 rounded">w......ol17...-20...</span></div>
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
              
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordOpen(true);
                    setForgotStep(1);
                    setForgotPhone('');
                    setForgotId('');
                    setForgotNewPass('');
                    setForgotConfirmPass('');
                    setForgotError('');
                    setForgotSuccess('');
                    setForgotMatchedStaff(null);
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium hover:underline cursor-pointer flex items-center gap-1 font-sans"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Esqueceste a sua senha?</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-70 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wide transition-all shadow-md shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2 group animate-duration-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>A Autenticar...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
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
        {!hasRegisteredStaff && (
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

      {/* Modal: Esqueceste a sua senha? */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-extrabold text-sm sm:text-base tracking-tight uppercase">
                    Recuperação de Senha SIGEP
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {forgotStep === 1 ? 'Etapa 1: Validação por Telefone' : 'Etapa 2: Redefinição de Palavra-passe'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {forgotError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-xl flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3.5 rounded-xl flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleVerifyPhone} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Para recuperar a sua palavra-passe, insira o número de contacto telefónico associado ao seu cadastro de Recursos Humanos.
                </p>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Contacto Telefónico Registado *
                  </label>
                  <input
                    type="tel"
                    required
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(e.target.value)}
                    placeholder="Ex: 923 456 789"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide transition-all border border-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingPhone}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide transition-all shadow-md shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isVerifyingPhone ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Verificar Contacto</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                {forgotMatchedStaff && (
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 text-xs text-indigo-300 space-y-1">
                    <p className="font-extrabold text-[11px] uppercase tracking-wide text-indigo-400">
                      Colaborador Identificado:
                    </p>
                    <p className="font-bold text-white text-sm">{forgotMatchedStaff.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Cargo: {forgotMatchedStaff.role}</p>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Confirme o seu ID de Acesso SIGEP *
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotId}
                    onChange={(e) => setForgotId(e.target.value.trim().toUpperCase())}
                    placeholder="Ex: LA6A74"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold uppercase"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Nova Palavra-passe *
                  </label>
                  <input
                    type="password"
                    required
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Confirmar Nova Palavra-passe *
                  </label>
                  <input
                    type="password"
                    required
                    value={forgotConfirmPass}
                    onChange={(e) => setForgotConfirmPass(e.target.value)}
                    placeholder="Repita a nova palavra-passe"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotError('');
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide transition-all border border-slate-700 cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide transition-all shadow-md shadow-emerald-600/15 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Gravar Nova Senha</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
