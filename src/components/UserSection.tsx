/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SchoolSettings, UserRole, Staff, Student, GradeRow, getSpecialtyFullName, getSpecialtyFromSection, carregarGrelhaCurricular } from '../types';
import StudentHistoryConsultation from './StudentHistoryConsultation';
import { 
  User, 
  Shield, 
  Lock, 
  Unlock, 
  CheckCircle, 
  AlertTriangle, 
  FileCheck, 
  Layers, 
  Key, 
  Activity, 
  Award,
  HelpCircle,
  LogOut,
  BookOpen,
  Copy,
  Check,
  Calendar
} from 'lucide-react';
import { 
  obterOuCriarIdPC, 
  validarLicencaOffline, 
  calcularDiasRestantes, 
  formatarDataLegivel 
} from '../utils/licenca';
import LicencaBannerStatus from './LicencaBannerStatus';

interface UserSectionProps {
  userRole: UserRole;
  schoolSettings: SchoolSettings;
  vbaLogs?: string;
  loggedInStaff?: Staff | null;
  students?: Student[];
  grades?: GradeRow[];
  onLogout?: () => void;
  onUpdatePassword?: (id: string, newPassword: string) => void;
  
  // Transition profile props
  staffList?: Staff[];
  onSwitchProfile?: (staff: Staff) => void;
  
  // License Management Props
  licencaChave: string;
  licencaInicio: string;
  licencaFim: string;
  diasRestantes: number;
  onUpdateLicenca: (chave: string, start: string, end: string) => void;
  onSetDiasRestantes?: (days: number) => void;
}

export default function UserSection({
  userRole,
  schoolSettings,
  vbaLogs = "",
  loggedInStaff = null,
  students = [],
  grades = [],
  onLogout,
  onUpdatePassword,
  staffList: rawStaffList = [],
  onSwitchProfile,
  licencaChave,
  licencaInicio,
  licencaFim,
  diasRestantes,
  onUpdateLicenca,
  onSetDiasRestantes
}: UserSectionProps) {
  const staffList = rawStaffList.filter(s => {
    const isCurrentUserRoot = loggedInStaff && (loggedInStaff.id === 'SIGEP' || loggedInStaff.id === 'ADMIN_SIGEP' || loggedInStaff.role === 'SIGEP' || loggedInStaff.is_root);
    if (!isCurrentUserRoot && (s.id === 'SIGEP' || s.id === 'ADMIN_SIGEP' || s.role === 'SIGEP' || s.is_root)) {
      return false;
    }
    return true;
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  // Profile switch form inputs
  const [switchId, setSwitchId] = useState('');
  const [switchPassword, setSwitchPassword] = useState('');
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [switchSuccess, setSwitchSuccess] = useState<string | null>(null);

  // License form inputs
  const [inputChave, setInputChave] = useState('');
  const [inputInicio, setInputInicio] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  });
  const [inputAnos, setInputAnos] = useState<number>(1);
  const [detectedAnos, setDetectedAnos] = useState<number | null>(null);
  const [licError, setLicError] = useState<string | null>(null);
  const [licSuccess, setLicSuccess] = useState<string | null>(null);

  // Synchronize inputInicio with today's date on mount
  useEffect(() => {
    const today = new Date();
    setInputInicio(today.toISOString().split('T')[0]);
  }, []);

  // Real-time automatic detection of the license years from the typed key
  useEffect(() => {
    const cleanChave = inputChave.trim().toUpperCase();
    if (!cleanChave || !cleanChave.startsWith("SGP-")) {
      setDetectedAnos(null);
      return;
    }

    const today = new Date();
    const formattedStart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const currentIdPC = obterOuCriarIdPC();

    let found: number | null = null;
    for (let a = 1; a <= 3; a++) {
      const dFim = new Date(today);
      dFim.setFullYear(today.getFullYear() + a);
      const testEnd = `${dFim.getFullYear()}${String(dFim.getMonth() + 1).padStart(2, '0')}${String(dFim.getDate()).padStart(2, '0')}`;
      
      const res = validarLicencaOffline(currentIdPC, cleanChave, formattedStart, testEnd);
      if (res.isValid) {
        found = a;
        setInputAnos(a);
        break;
      }
    }
    setDetectedAnos(found);
  }, [inputChave]);

  // Computer Device ID (Offline license registration)
  const [idPC] = useState(() => obterOuCriarIdPC());
  const [copiedId, setCopiedId] = useState(false);

  const handleActivateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    setLicError(null);
    setLicSuccess(null);

    const cleanChave = inputChave.trim().toUpperCase();
    const currentIdPC = obterOuCriarIdPC();
    const today = new Date();
    const formattedStart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    if (detectedAnos === null) {
      setLicError("Esta chave de licença não pôde ser ativada. O período da licença (1 a 3 anos) deve ser válido para este computador com a data de ativação de hoje.");
      return;
    }

    const dFim = new Date(today);
    dFim.setFullYear(today.getFullYear() + detectedAnos);
    const formattedEnd = `${dFim.getFullYear()}${String(dFim.getMonth() + 1).padStart(2, '0')}${String(dFim.getDate()).padStart(2, '0')}`;

    onUpdateLicenca(cleanChave, formattedStart, formattedEnd);
    setLicSuccess(`Licença de ${detectedAnos} Ano(s) validada, preenchida e aplicada de forma automática com sucesso!`);
    setInputChave('');
    setDetectedAnos(null);
    setTimeout(() => setLicSuccess(null), 4000);
  };



  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (!loggedInStaff) {
      setPwdError("Deve iniciar sessão primeiro para alterar a senha.");
      return;
    }

    if (!newPassword) {
      setPwdError("A nova senha não pode estar vazia.");
      return;
    }

    if (newPassword.length < 4) {
      setPwdError("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("As senhas inseridas não coincidem.");
      return;
    }

    if (onUpdatePassword) {
      onUpdatePassword(loggedInStaff.id, newPassword);
      setPwdSuccess("Senha atualizada com sucesso!");
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSuccess(null), 4000);
    }
  };

  const handleSwitchProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSwitchError(null);
    setSwitchSuccess(null);

    const cleanId = switchId.trim().toUpperCase();
    if (!cleanId) {
      setSwitchError("Por favor introduza o ID de acesso.");
      return;
    }
    if (!switchPassword) {
      setSwitchError("Por favor introduza a senha.");
      return;
    }

    if (!staffList || !onSwitchProfile) {
      setSwitchError("Função de transição indisponível de momento.");
      return;
    }

    // 1. Check if the ID exists in the custom staffList FIRST
    const matchedStaff = staffList.find(s => s.id === cleanId);
    if (matchedStaff) {
      const correctSecret = matchedStaff.password || '12345';
      if (switchPassword === correctSecret) {
        setSwitchSuccess(`Autenticado como ${matchedStaff.name}! A transitar...`);
        setTimeout(() => {
          onSwitchProfile(matchedStaff);
          setSwitchId('');
          setSwitchPassword('');
          setSwitchSuccess(null);
        }, 1000);
      } else {
        setSwitchError("Senha incorreta para o ID de utilizador fornecido.");
      }
      return;
    }

    // 2. Fallback to Fixed Factory Account only if not customized in the staffList
    if (cleanId === 'SG123' && switchPassword === 'admin') {
      const masterStaff: Staff = {
        id: 'SG123',
        name: 'Administrador Mestre (Suporte Técnico)',
        role: 'DIRECTOR_GERAL',
        password: 'admin'
      };
      setSwitchSuccess("Autenticação Mestre bem-sucedida! A transitar...");
      setTimeout(() => {
        onSwitchProfile(masterStaff);
        setSwitchId('');
        setSwitchPassword('');
        setSwitchSuccess(null);
      }, 1000);
      return;
    }

    setSwitchError(`O ID "${cleanId}" não se encontra cadastrado.`);
  };



  // Extract a list of simulated recent logs to show in the user's activity card
  const recentLogs = vbaLogs 
    ? vbaLogs.split('\n').filter(Boolean).slice(-6).reverse() 
    : [
        "Sessão iniciada na plataforma SiGeP.",
        "Sincronização global de cabeçalhos ativada com sucesso.",
        "Base de dados de pautas e registos carregada a partir do armazenamento local."
      ];

  // Map active profile properties
  const activeProfile = {
    name: loggedInStaff ? loggedInStaff.name : (
          userRole === 'SUB_DIRECTOR_PEDAGOGICO' ? schoolSettings.directorName :
          userRole === 'SECRETARIO' ? schoolSettings.secretaryName : 
          'Prof. António Chilombo (L. Portuguesa & Matemática)'
    ),
    roleTitle: loggedInStaff ? (
                loggedInStaff.role === 'DIRECTOR_GERAL' ? 'Director Geral' :
                loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' ? 'Subdirector Pedagógico' :
                loggedInStaff.role === 'SUB_DIRECTOR_ADMINISTRATIVO' ? 'Subdirector Administrativo' :
                loggedInStaff.role === 'CHEFE_SECRETARIA' ? 'Chefe de Secretaria / Secretário(a)' :
                loggedInStaff.role === 'COORDENADOR_TURNO' ? 'Coordenador de Turno' :
                loggedInStaff.role === 'COORDENADOR_DISCIPLINA' ? 'Coordenador de Disciplina' :
                loggedInStaff.role === 'PROFESSOR' ? 'Professor de Disciplina' : 'Funcionário de Apoio'
              ) : (
                userRole === 'SUB_DIRECTOR_PEDAGOGICO' ? 'Direção da Escola (Director / Subdirectores)' :
                userRole === 'SECRETARIO' ? 'Chefe de Secretaria / Secretário(a)' : 
                'Professor de Disciplina da Classe'
              ),
    avatarChar: loggedInStaff ? (
                  loggedInStaff.role === 'DIRECTOR_GERAL' ? '👑' :
                  loggedInStaff.role === 'PROFESSOR' ? '👨‍🏫' : '📝'
                ) : (
                  userRole === 'SUB_DIRECTOR_PEDAGOGICO' ? '👑' :
                  userRole === 'SECRETARIO' ? '📝' : '👨‍🏫'
                ),
    id: loggedInStaff ? loggedInStaff.id : 'N/A'
  };

  return (
    <div id="user-section-container" className="space-y-6">
      
      {/* Toast Notification */}
      {successMsg && (
        <div id="toast-role-notification" className="bg-slate-900 border border-indigo-500 text-white p-4 rounded-xl flex items-center gap-3 text-xs font-bold shadow-lg animate-pulseOnce">
          <Key className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card & Role Switcher */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="text-center pb-6 border-b border-slate-100 space-y-3">
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-inner border bg-slate-50 relative`}>
              <span>{activeProfile.avatarChar}</span>
              <span className="absolute bottom-1.5 right-1.5 bg-emerald-500 w-3.5 h-3.5 rounded-full border-2 border-white" title="Sessão Ativa"></span>
            </div>
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">{activeProfile.name}</h3>
              <p className="text-[10.5px] font-bold text-indigo-650 uppercase tracking-wide font-mono bg-indigo-50 px-2.5 py-0.5 rounded-full inline-block">
                {activeProfile.roleTitle}
              </p>
              <div className="text-[10px] text-slate-400 font-mono font-bold mt-1">ID: {activeProfile.id}</div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 italic">
              Instituição: <span className="font-semibold text-slate-650">{schoolSettings.schoolName}</span>
            </div>
          </div>

          {/* Active Assignments Info for Registered Staff */}
          {loggedInStaff && loggedInStaff.role === 'PROFESSOR' && (() => {
            const sections = loggedInStaff.sections || [];
            const subjects = loggedInStaff.subjects || [];
            const mainSpecialty = loggedInStaff.specialty || '';
            const grelha = carregarGrelhaCurricular();

            // Especialidades estritamente associadas ao perfil do professor conforme cadastrado no RH
            const specSet = new Set<string>();
            if (mainSpecialty && mainSpecialty !== 'GERAL') {
              specSet.add(mainSpecialty);
            }

            sections.forEach(sec => {
              const spec = getSpecialtyFromSection(sec);
              if (spec) specSet.add(spec);
            });

            if (specSet.size === 0) {
              specSet.add(mainSpecialty || 'GERAL');
            }

            const specList = Array.from(specSet);

            // Agrupar turmas e disciplinas por especialidade
            const groups = specList.map(specCode => {
              const specSections = sections.filter(sec => {
                const sSpec = getSpecialtyFromSection(sec);
                return sSpec === specCode || (!sSpec && (specCode === mainSpecialty || specCode === 'GERAL'));
              });
              
              const specSubjects = subjects.filter(subj => {
                const matchedItems = grelha.filter(i => i.subject === subj);
                if (matchedItems.length === 0) return true;
                return matchedItems.some(i => i.specialty === specCode || !i.specialty || specCode === 'GERAL');
              });

              return {
                specCode,
                specName: getSpecialtyFullName(specCode),
                sections: specSections.length > 0 ? specSections : (specCode === mainSpecialty ? sections : []),
                subjects: specSubjects
              };
            });

            const finalGroups = groups;

            return (
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3 text-xs">
                <div className="font-extrabold text-indigo-950 flex items-center justify-between border-b border-indigo-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Atribuições Curriculares do Professor</span>
                  </div>
                  <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-md font-mono font-bold border border-indigo-100">
                    {finalGroups.length} Especialidade(s)
                  </span>
                </div>

                {/* Overall Classes */}
                <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100 text-[11px] flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Classes Lecionadas (Geral):</span>
                  <span className="text-slate-900 font-extrabold">{loggedInStaff.classes?.map(c => `${c}ª`).join(', ') || 'Nenhuma'}</span>
                </div>

                {/* Mirrored breakdown per Specialty */}
                <div className="space-y-2.5">
                  {finalGroups.map(group => (
                    <div key={group.specCode} className="bg-white/90 p-3 rounded-xl border border-indigo-150 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
                        <span className="text-[10px] text-indigo-700 font-mono font-bold uppercase tracking-wider">
                          Especialidade / Ramo:
                        </span>
                        <span className="text-xs font-black text-indigo-950">
                          {group.specName} ({group.specCode})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block font-medium">Turmas Atribuídas:</span>
                          <span className="text-emerald-700 font-extrabold">
                            {group.sections.length > 0 ? group.sections.join(', ') : (sections.join(', ') || 'Nenhuma')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Disciplinas Autorizadas:</span>
                          <span className="text-indigo-900 font-extrabold">
                            {group.subjects.length > 0 ? group.subjects.join(', ') : (subjects.join(', ') || 'Nenhuma')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Informação de Jurisdição e Competência no SIGEP */}
          {loggedInStaff && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Jurisdição & Competências</span>
              </div>
              
              <div className="space-y-2">
                <div className="bg-white p-2.5 rounded-lg border border-slate-150">
                  <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block font-mono">
                    Área de Atuação:
                  </span>
                  <p className="text-slate-800 font-bold mt-0.5 leading-snug">
                    {loggedInStaff.role === 'DIRECTOR_GERAL' && "Administração Geral & Segurança"}
                    {loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' && "Direção Pedagógica & Pautas"}
                    {loggedInStaff.role === 'SUB_DIRECTOR_ADMINISTRATIVO' && "Direção Administrativa & Recursos Humanos"}
                    {loggedInStaff.role === 'CHEFE_SECRETARIA' && "Secretaria Escolar & Matrículas"}
                    {loggedInStaff.role === 'COORDENADOR_TURNO' && "Coordenação de Turno"}
                    {loggedInStaff.role === 'COORDENADOR_DISCIPLINA' && "Coordenação de Disciplina"}
                    {loggedInStaff.role === 'PROFESSOR' && "Corpo Docente & Lançamento de Notas"}
                    {loggedInStaff.role !== 'DIRECTOR_GERAL' && 
                     loggedInStaff.role !== 'SUB_DIRECTOR_PEDAGOGICO' && 
                     loggedInStaff.role !== 'SUB_DIRECTOR_ADMINISTRATIVO' && 
                     loggedInStaff.role !== 'CHEFE_SECRETARIA' && 
                     loggedInStaff.role !== 'COORDENADOR_TURNO' && 
                     loggedInStaff.role !== 'COORDENADOR_DISCIPLINA' && 
                     loggedInStaff.role !== 'PROFESSOR' && "Funcionário e Apoio Geral"}
                  </p>
                </div>

                <div className="bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100/50">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">
                    Descrição da Jurisdição:
                  </span>
                  <p className="text-slate-600 text-[11px] mt-1 leading-snug">
                    {loggedInStaff.role === 'DIRECTOR_GERAL' && "Acesso absoluto à administração global do sistema, infraestrutura, segurança, logs de auditoria e parametrização de permissões no Computador Central."}
                    {loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' && "Gestão direta e validação de pautas, turmas, notas dos alunos, distribuição de professores e acompanhamento do histórico pedagógico da escola."}
                    {loggedInStaff.role === 'SUB_DIRECTOR_ADMINISTRATIVO' && "Responsável pela infraestrutura escolar, controle logístico, recursos humanos gerais e liberação de autorizações financeiras/atrasos."}
                    {loggedInStaff.role === 'CHEFE_SECRETARIA' && "Responsável pelo atendimento, matrículas e inscrições de novos alunos, emissão de listagens físicas, declarações e processamento administrativo geral."}
                    {loggedInStaff.role === 'COORDENADOR_TURNO' && "Supervisão de turmas e controle pedagógico de presença e andamento letivo no turno correspondente."}
                    {loggedInStaff.role === 'COORDENADOR_DISCIPLINA' && "Controle do plano de aulas, provas e harmonia entre professores da mesma disciplina pedagógica."}
                    {loggedInStaff.role === 'PROFESSOR' && "Visualização e lançamento de notas (MAC, NPP, NPT) exclusivamente para as turmas e disciplinas vinculadas diretamente ao seu código de RH."}
                    {loggedInStaff.role !== 'DIRECTOR_GERAL' && 
                     loggedInStaff.role !== 'SUB_DIRECTOR_PEDAGOGICO' && 
                     loggedInStaff.role !== 'SUB_DIRECTOR_ADMINISTRATIVO' && 
                     loggedInStaff.role !== 'CHEFE_SECRETARIA' && 
                     loggedInStaff.role !== 'COORDENADOR_TURNO' && 
                     loggedInStaff.role !== 'COORDENADOR_DISCIPLINA' && 
                     loggedInStaff.role !== 'PROFESSOR' && "Acesso limitado de consulta e apoio aos processos internos da instituição escolar."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide transition-all border border-rose-250/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Encerrar Sessão</span>
            </button>
          )}

          {/* Change Password form */}
          {loggedInStaff && (
            <form onSubmit={handlePasswordChange} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
              <div className="font-bold text-slate-850 flex items-center gap-1.5 text-xs">
                <Lock className="w-4 h-4 text-indigo-650" />
                <span>Mudar de Senha d'Acesso</span>
              </div>
              
              {pwdError && (
                <div className="text-[10px] text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg font-medium">
                  {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 p-2 rounded-lg font-medium animate-pulseOnce">
                  {pwdSuccess}
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 font-mono">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (pwdError) setPwdError(null);
                    }}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 font-mono">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (pwdError) setPwdError(null);
                    }}
                    placeholder="Repita a senha"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded-xl text-[10.5px] uppercase tracking-wide transition-all cursor-pointer shadow-xs text-center flex items-center justify-center gap-1.5"
              >
                <span>Guardar Nova Senha</span>
              </button>
            </form>
          )}



          {/* Profile Transition Form */}
          <form onSubmit={handleSwitchProfileSubmit} className="p-4 bg-slate-900 text-slate-100 border border-slate-800 rounded-xl space-y-3 shadow-md relative overflow-hidden">
            <div className="absolute top-[-50%] right-[-50%] w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Transição de Perfil (Autenticação)</span>
            </div>
            
            <p className="text-[10px] text-slate-400 leading-snug">
              Introduza as credenciais oficiais de outro utilizador para transitar a sessão ativa em tempo real.
            </p>

            {switchError && (
              <div className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg font-medium">
                ⚠️ {switchError}
              </div>
            )}
            {switchSuccess && (
              <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg font-medium animate-pulseOnce">
                ✓ {switchSuccess}
              </div>
            )}

            <div className="space-y-2">
              <div>
                <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 font-mono">
                  ID de Sessão do Utilizador:
                </label>
                <input
                  type="text"
                  value={switchId}
                  onChange={(e) => {
                    setSwitchId(e.target.value);
                    if (switchError) setSwitchError(null);
                  }}
                  placeholder="Ex: MAP674"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 font-mono font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 font-mono">
                  Senha d'Acesso:
                </label>
                <input
                  type="password"
                  value={switchPassword}
                  onChange={(e) => {
                    setSwitchPassword(e.target.value);
                    if (switchError) setSwitchError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded-xl text-[10.5px] uppercase tracking-wide transition-all cursor-pointer shadow-xs text-center flex items-center justify-center gap-1.5"
            >
              <span>Autenticar & Transitar</span>
            </button>
          </form>

          {/* Quick Stats Block */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Cidade:</span>
              <span className="font-semibold text-slate-800">{schoolSettings.municipality}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Província:</span>
              <span className="font-semibold text-slate-800">{schoolSettings.province}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Registo de Escola:</span>
              <span className="font-mono font-bold text-indigo-600">Complexo Nº 1709</span>
            </div>
          </div>

        </div>

        {/* Right column stacked container */}
        <div className="lg:col-span-2 space-y-6">

          {(userRole === 'PROFESSOR' || loggedInStaff?.role === 'PROFESSOR') ? (
            <div className="space-y-6">
              {/* Painel do Perfil e Ficha de Docência do Professor */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-650" />
                      <h3 className="font-heading font-extrabold text-slate-900 text-sm sm:text-base">
                        Ficha de Identificação e Cadastramento do Docente
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Campos do perfil do professor preenchidos automaticamente com base nas atribuições e seções do cadastro RH.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    SESSÃO DE DOCÊNCIA ATIVA ✓
                  </span>
                </div>

                {/* Pre-filled Form Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  {/* Nome Completo */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                      Nome Completo do Docente:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={loggedInStaff?.name || activeProfile.name}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-default"
                    />
                  </div>

                  {/* ID de RH */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                      Código / ID de RH:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={loggedInStaff?.id || activeProfile.id}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-700 font-mono focus:outline-none cursor-default"
                    />
                  </div>

                  {/* Cargo Pedagógico */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                      Cargo / Função Pedagógica:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={activeProfile.roleTitle}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-default"
                    />
                  </div>

                  {/* Categoria Pedagógica */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                      Categoria Pedagógica (RH):
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={loggedInStaff?.categoriaPedagogica || "Professor do Ensino Secundário"}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-default"
                    />
                  </div>

                  {/* Especialidade / Ramo */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                      Especialidade / Ramo de Ensino:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={getSpecialtyFullName(loggedInStaff?.specialty) || 'Ensino Geral'}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-default"
                    />
                  </div>

                  {/* Classes Lecionadas */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                      Classes Lecionadas:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={loggedInStaff?.classes?.map(c => `${c}ª Classe`).join(', ') || 'Todas as Classes'}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-default"
                    />
                  </div>

                  {/* Turmas Atribuídas / Seções */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 sm:col-span-2 md:col-span-1">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                      Turmas (Seções) Atribuídas:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={loggedInStaff?.sections?.map(s => `Turma ${s}`).join(', ') || 'Todas as Turmas'}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-emerald-800 font-mono focus:outline-none cursor-default"
                    />
                  </div>

                  {/* Disciplinas Autorizadas */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 sm:col-span-2 md:col-span-2">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                      Disciplinas Autorizadas para Docência:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={loggedInStaff?.subjects?.join(', ') || 'Todas as Disciplinas'}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-indigo-900 focus:outline-none cursor-default"
                    />
                  </div>
                </div>

                {/* Additional Summary Row */}
                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-150 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-indigo-950 font-bold">
                    <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Jurisdição de Lançamento: Permitida a atribuição e modificação de notas apenas das disciplinas sob sua docência.</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {schoolSettings.schoolName} • {schoolSettings.municipality}
                  </div>
                </div>
              </div>

              {/* Consulta do Histórico Académico dos Alunos */}
              <StudentHistoryConsultation
                students={students}
                grades={grades}
                loggedInStaff={loggedInStaff}
                schoolSettings={schoolSettings}
              />
            </div>
          ) : (
            <>
              {/* Detailed Privilege Matrix */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Matriz de Competências Pedagógicas (Angola Diretrizes Curriculares)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Visão institucional das permissões ativas atribuídas ao seu nível de utilitário</p>
                </div>

                {/* Graphical Authorization List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Permission 1: Grade editing */}
                  <div className="p-4 rounded-xl border border-slate-100 flex items-start gap-3 bg-slate-50/50">
                    {userRole !== 'SECRETARIO' ? (
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                        <Unlock className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                    )}
                    <div className="text-xs">
                      <span className="block font-bold text-slate-800 mb-0.5">Modificação de Notas / Fichas</span>
                      <span className="block text-slate-500 leading-snug">
                        {userRole === 'SUB_DIRECTOR_PEDAGOGICO' ? 'Acesso absoluto livre. A Direção da Escola (Director Geral e Subdirectores) pode alterar MAC, NPT e pautas gerais.' :
                         (userRole as string) === 'PROFESSOR' ? 'Permitido atribuir e modificar notas apenas das disciplinas sob sua docência.' :
                         'Protegido contra adulteração de notas. Fórmulas de cálculo MT e Pautas Trimester bloqueadas.'}
                      </span>
                      <span className={`inline-block text-[9px] font-extrabold uppercase mt-2 px-2 py-0.5 rounded-sm ${
                        userRole !== 'SECRETARIO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {userRole !== 'SECRETARIO' ? 'AUTORIZADO' : 'NÃO AUTORIZADO'}
                      </span>
                    </div>
                  </div>

                  {/* Permission 2: School Header Editing */}
                  <div className="p-4 rounded-xl border border-slate-100 flex items-start gap-3 bg-slate-50/50">
                    {userRole === 'SUB_DIRECTOR_PEDAGOGICO' ? (
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                        <Unlock className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                    )}
                    <div className="text-xs">
                      <span className="block font-bold text-slate-800 mb-0.5">Estruturar Cabeçalhos & Municípios</span>
                      <span className="block text-slate-500 leading-snug">
                        {userRole === 'SUB_DIRECTOR_PEDAGOGICO' ? 'Livre para customizar nomenclatura da escola, emblemas e assinaturas de pautas.' :
                         'Bloqueado. Apenas o Director Geral pode reformar as configurações institucionais da escola.'}
                      </span>
                      <span className={`inline-block text-[9px] font-extrabold uppercase mt-2 px-2 py-0.5 rounded-sm ${
                        userRole === 'SUB_DIRECTOR_PEDAGOGICO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {userRole === 'SUB_DIRECTOR_PEDAGOGICO' ? 'AUTORIZADO' : 'NÃO AUTORIZADO'}
                      </span>
                    </div>
                  </div>

                  {/* Permission 3: Student Registration */}
                  <div className="p-4 rounded-xl border border-slate-100 flex items-start gap-3 bg-slate-50/50">
                    {userRole === 'SUB_DIRECTOR_PEDAGOGICO' || userRole === 'SECRETARIO' ? (
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                        <Unlock className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                    )}
                    <div className="text-xs">
                      <span className="block font-bold text-slate-800 mb-0.5">Cadastrar / Remover Alunos</span>
                      <span className="block text-slate-500 leading-snug">
                        {userRole === 'SUB_DIRECTOR_PEDAGOGICO' || userRole === 'SECRETARIO'
                          ? 'Pleno acesso ao Directório Geral de Alunos para inclusão e processamento de informações.'
                          : 'Sem privilégios. Professores não possuem consentimento administrativo para remover ou adicionar alunos ao banco de dados.'}
                      </span>
                      <span className={`inline-block text-[9px] font-extrabold uppercase mt-2 px-2 py-0.5 rounded-sm ${
                        userRole === 'SUB_DIRECTOR_PEDAGOGICO' || userRole === 'SECRETARIO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {userRole === 'SUB_DIRECTOR_PEDAGOGICO' || userRole === 'SECRETARIO' ? 'AUTORIZADO' : 'NÃO AUTORIZADO'}
                      </span>
                    </div>
                  </div>

                  {/* Permission 4: EXCEL/CSV Export / Printable Relatorios */}
                  <div className="p-4 rounded-xl border border-slate-100 flex items-start gap-3 bg-slate-50/50">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                      <Unlock className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <span className="block font-bold text-slate-800 mb-0.5">Exportação & Impressão Física</span>
                      <span className="block text-slate-500 leading-snug">
                        Todos os utilizadores estão homologados a exportar tabelas oficiais em formato CSV (Microsoft Excel) bem como emitir listagens físicas das turmas.
                      </span>
                      <span className="inline-block text-[9px] font-extrabold uppercase mt-2 px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-100">
                        AUTORIZADO GERAL
                      </span>
                    </div>
                  </div>

                </div>

                {/* Activity Logs inside user settings */}
                <div className="pt-4 border-t border-slate-150 space-y-3">
                   <div className="flex items-center gap-2">
                     <Activity className="w-4 h-4 text-slate-500" />
                     <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Registo de Atividades da Sessão (Auditoria)</h4>
                   </div>

                   <div className="bg-slate-900 text-slate-300 font-mono text-[10px] p-4 rounded-xl border border-slate-800 space-y-2 whitespace-pre-wrap max-h-[140px] overflow-y-auto shadow-inner">
                     {recentLogs.map((log, index) => (
                       <div key={index} className="flex gap-2 text-slate-350">
                         <span className="text-emerald-400 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                         <span>{log}</span>
                       </div>
                     ))}
                   </div>
                </div>
              </div>

              {/* Offline Licensing & Cryptographic Motor */}
              <div id="license-management-card" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-heading font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-650" />
                    <span>Contrôlo de Licenciamento Criptográfico (OFFLINE)</span>
                  </h3>
                  <p className="text-[11px] text-slate-450 mt-1">
                    Motor de licenças matemáticas do SiGeP v1.1. Garante o registo seguro das credenciais sem rede.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Panel: Current License Status */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Estado da Licença Ativa</h4>
                    
                    <LicencaBannerStatus diasRestantes={diasRestantes} />

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-white font-mono">
                      <div>
                        <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">IDENTIFICADOR DO DISPOSITIVO (ID PC)</span>
                        <div className="flex items-center justify-between gap-2 mt-1.5 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                          <code className="text-xs font-bold text-indigo-400 break-all select-all">{idPC}</code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(idPC);
                              setCopiedId(true);
                              setTimeout(() => setCopiedId(false), 2000);
                            }}
                            className="text-slate-400 hover:text-white transition-colors p-1"
                            title="Copiar ID PC"
                          >
                            {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest font-medium">CHAVE CRIPTOGRÁFICA INSTALADA</span>
                        <div className="bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 mt-1">
                          <code className="text-[11px] text-yellow-400 font-bold block break-all select-all">{licencaChave || "SEM REGISTO"}</code>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-1 text-[10px]">
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[8px]">Data de Início:</span>
                          <span className="font-bold text-slate-300">{formatarDataLegivel(licencaInicio)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[8px]">Data de Fim:</span>
                          <span className="font-bold text-slate-300">{formatarDataLegivel(licencaFim)}</span>
                        </div>
                      </div>


                    </div>
                  </div>

                  {/* Right Panel: Activation Form */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ativar ou Renovar Licença</h4>
                    
                    <form onSubmit={handleActivateLicense} className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                      {licError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-bold flex gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{licError}</span>
                        </div>
                      )}
                      {licSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl font-bold flex gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{licSuccess}</span>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono mb-1">
                          Chave de Licença SGP:
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="SGP-XXXX-XXXX-XXXX"
                          value={inputChave}
                          onChange={(e) => setInputChave(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono mb-1">
                            Data Início (Auto):
                          </label>
                          <input
                            type="date"
                            disabled
                            value={inputInicio}
                            className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-500 font-mono cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono mb-1">
                            Anos Validade (Auto):
                          </label>
                          <div className={`w-full border rounded-lg px-2 py-1.5 text-xs font-bold font-mono text-center transition-all duration-300 ${
                            detectedAnos !== null 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                              : inputChave.trim().length > 4 
                                ? 'bg-rose-50 border-rose-200 text-rose-600' 
                                : 'bg-slate-100 border-slate-200 text-slate-500'
                          }`}>
                            {detectedAnos !== null 
                              ? `${detectedAnos} Ano${detectedAnos > 1 ? 's' : ''} (Detetado ✓)` 
                              : inputChave.trim().length > 4 
                                ? 'Chave Inválida ✗' 
                                : 'Aguardando Chave...'}
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-100 rounded-lg p-2.5 border border-slate-200 text-[10px]">
                        <div className="flex justify-between mb-1 text-slate-500">
                          <span>Início de Ativação (Hoje):</span>
                          <span className="font-bold text-slate-800">{inputInicio.split('-').reverse().join('/')}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Fim de Validade (Auto):</span>
                          <span className="font-bold text-indigo-600">
                            {(() => {
                              if (detectedAnos === null) {
                                return 'Aguardando Chave...';
                              }
                              const parts = inputInicio.split('-');
                              if (parts.length === 3) {
                                const y = parseInt(parts[0], 10) + detectedAnos;
                                return `${parts[2]}/${parts[1]}/${y}`;
                              }
                              return 'Aguardando Chave...';
                            })()}
                          </span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Key className="w-4 h-4 text-indigo-400" />
                        <span>Aplicar Licença Offline</span>
                      </button>
                    </form>
                  </div>

                </div>

              </div>
            </>
          )}

        </div>

      </div>

    </div>
  );
}

