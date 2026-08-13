/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Student, GradeRow, ActiveSheet, SubjectType, UserRole, SchoolSettings, Staff, StudentFinance, getSubjectsForClass, getSubjectsForStudent, getSubjectAbbreviation, ModalityType, SUBJECTS, carregarGrelhaCurricular, PontoRecord } from './types';
import { INITIAL_STUDENTS, generateInitialGrades, INITIAL_STAFF } from './initialData';
import PainelMatriculas from './components/PainelMatriculas';
import RawGradesDatabase from './components/RawGradesDatabase';
import PautaAnnual from './components/PautaAnnual';
import PautaTrimester from './components/PautaTrimester';
import PainelPautas from './components/PainelPautas';
import PainelMiniPautas from './components/PainelMiniPautas';
import RelacaoNominal from './components/RelacaoNominal';
import CabecalhoSettings from './components/CabecalhoSettings';
import { SchoolSettingsProvider } from './context/SchoolSettingsContext';
import { HermeticSubsystemProvider } from './context/HermeticSubsystemContext';
import UserSection from './components/UserSection';
import LoginScreen from './components/LoginScreen';
import RecursosHumanos from './components/RecursosHumanos';
import DeclaracoesCertificados from './components/DeclaracoesCertificados';
import HistoricoAnosModal from './components/HistoricoAnosModal';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import SiGePLogo from './components/SiGePLogo';
import EulaScreen from './components/EulaScreen';
import SystemLockScreen from './components/SystemLockScreen';
import PortalAluno from './components/PortalAluno';
import { useSessionLock } from './hooks/useSessionLock';
import OSLockOverlay from './components/OSLockOverlay';
import { 
  obterOuCriarIdPC, 
  validarLicencaOffline, 
  calcularDiasRestantes 
} from './utils/licenca';

import { 
  Clock,
  CheckCircle2,
  GraduationCap, 
  FolderLock, 
  Lock,
  Calendar,
  Archive,
  CheckSquare, 
  FileSpreadsheet, 
  Database, 
  Users, 
  Settings, 
  Info, 
  PlusCircle, 
  HelpCircle,
  Headset,
  RefreshCw,
  Trophy,
  UserX,
  TrendingUp,
  Sliders,
  Sparkles,
  Download,
  AlertCircle,
  Printer,
  User,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Menu,
  Award,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  MessageSquare,
  LogOut,
  X,
  ArrowLeft
} from 'lucide-react';
import SeccaoFinanceira from './components/SeccaoFinanceira';
import Student360Modal from './components/Student360Modal';
import DirectorGeneralPanel, { AuditLog, RolePermission } from './components/DirectorGeneralPanel';
import PainelAlertasChefia from './components/PainelAlertasChefia';
import RelatoriosPanel from './components/RelatoriosPanel';
import ChatStaff from './components/ChatStaff';
import AcademicArea from './components/AcademicArea';
import StatsDashboard from './components/StatsDashboard';
import { NAVIGATION_CONFIG, MenuItemConfig } from './navigationConfig';
import { getSectionsList, sanitizeStaffList, getProfessorAllowedClasses, getProfessorAllowedSections } from './utils';

const LOCAL_STORAGE_STUDENTS_KEY = 'sigep_students_v1';
const LOCAL_STORAGE_GRADES_KEY = 'sigep_grades_v1';
const LOCAL_STORAGE_SCHOOL_SETTINGS_KEY = 'sigep_school_settings_v1';
const LOCAL_STORAGE_STAFF_KEY = 'sigep_staff_v1';
const LOCAL_STORAGE_LOGGED_IN_STAFF_KEY = 'sigep_logged_in_staff_v1';

function saveStaffToLocalStorage(staffList: Staff[]) {
  console.log('[DEBUG LOCAL_STORAGE_STAFF_KEY] Gravando lista de RH no localStorage:', {
    quantidade: staffList.length,
    professores: staffList.filter(s => s.role === 'PROFESSOR').map(p => ({
      id: p.id,
      name: p.name,
      subjects: p.subjects,
      assignmentsCount: p.assignments?.length || 0
    }))
  });
  safeSetItem(LOCAL_STORAGE_STAFF_KEY, JSON.stringify(staffList));
}

const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: "COMPLEXO ESCOLAR Nº 1709 LNO, WATCHIMONA",
  municipality: "Cafunfo",
  province: "Lunda Norte",
  address: "Complexo Escolar Nº 1709 LNO, _Terra-Nova Cafunfo",
  email: "ComplexoEscolar1709@gmail.com",
  phone: "Telefone: 9xxxxxxxx / 93xxxxxxxxx",
  directorName: "Manuel das Fisgas",
  subdirectorName: "Gaspar Da Fatima",
  subdirectorAdminName: "António Muanza",
  coordinators: ["Faustino", "Leonel", "Morais"],
  secretaryName: "Domingos Wamba",
  logoType: 'PUBLIC',
  privateLogoUrl: '🎓',
  publicLogoUrl: '🇦🇴',
  syncEnabled: false,
  syncServerUrl: "",
  academicYear: "2025/2026",
  activeComponents: {
    ENSINO_PRIMARIO: true,
    PUNIV: true,
    MAGISTERIO: true
  },
  decretoExecutivo: "Decreto Executivo nº 445/16 de 25 de Novembro",
  leiBaseRegulamento: "disposto na alínea b) do Artigo 109º da LBEE 17/16, de 7 de Outubro",
  leiBase6a: "disposto na alínea b) do Artigo 109º da LBEE 17/16, de 7 de Outubro",
  leiBase6aActive: true,
  leiBase9a: "disposto na alínea b) do Artigo 109º da LBEE 17/16, de 7 de Outubro",
  leiBase9aActive: true,
  leiBase12a: "disposto no Decreto Executivo nº 445/16 de 25 de Novembro",
  leiBase12aActive: true,
  leiBase13a: "disposto na alínea (f) do artigo 109º da LBSEE 17/16, de 07 de Outubro",
  leiBase13aActive: true,
  headerLine1: "REPÚBLICA DE ANGOLA",
  headerLine1Active: true,
  headerLine2: "MINISTÉRIO DA EDUCAÇÃO",
  headerLine2Active: true,
  headerLine3: "GOVERNO PROVINCIAL DE LUNDA NORTE",
  headerLine3Active: true,
  headerLine4: "DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE CAFUNFO",
  headerLine4Active: true,
  directorRoleLabel: "Director Geral",
  subdirectorRoleLabel: "Subdirector Pedagógico",
  subdirectorAdminRoleLabel: "Subdirector Administrativo",
  secretaryRoleLabel: "Secretário-Geral",
  onlineCandidaturesEnabled: true,
  allowTeacherGradeEntry: false,
  trimesterI_Status: 'ABERTO',
  trimesterII_Status: 'FECHADO',
  trimesterIII_Status: 'FECHADO'
};

const TAB_NAMES_MAP: Record<string, string> = {
  PAINEL_PAUTAS: "Painel Central de Pautas",
  PAINEL_MINI_PAUTAS: "Painel de Mini-Pautas",
  PAUTA1TM1: "MINI PAUTA",
  PAUTA1: "Pauta Geral",
  Cadastro_BaseDados: "Cadastro de Alunos",
  FINANCEIRO: "Propina & Finanças",
  MINI_PAUTA1_BANCODADOS: "Banco de Notas Geral",
  UTILIZADOR: "Painel do Utilizador",
  RECURSOS_HUMANOS: "Recursos Humanos",
  PAUTA_ANUAL: "Pauta Geral Anual",
  RELACAO_NOMINAL: "Relação Nominal de Alunos",
  CONFIGURACOES: "Configurações Globais",
  DECLARACOES_CERTIFICADOS: "Declarações & Certificados",
  AREA_ACADEMICA: "Área Académica - Cursos & Especialidades",
  HOME: "Página Inicial (Home)"
};

// Safely write to / read from / remove from localStorage to avoid iframe SecurityErrors
const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn("Storage access is blocked or unavailable:", e);
    return null;
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("Storage access is blocked or unavailable:", e);
  }
};

const safeRemoveItem = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("Storage access is blocked or unavailable:", e);
  }
};

// Safely write to / read from / remove from sessionStorage so closing Electron window destroys active login session
const safeGetSessionItem = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch (e) {
    console.warn("Session storage access is blocked or unavailable:", e);
    return null;
  }
};

const safeSetSessionItem = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value);
  } catch (e) {
    console.warn("Session storage access is blocked or unavailable:", e);
  }
};

const safeRemoveSessionItem = (key: string) => {
  try {
    sessionStorage.removeItem(key);
  } catch (e) {
    console.warn("Session storage access is blocked or unavailable:", e);
  }
};

export default function App() {
  // EULA States
  const [eulaAccepted, setEulaAccepted] = useState<boolean>(() => {
    const isNetworkAccess = typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';
    if (isNetworkAccess) return true;
    return safeGetItem('sigep_eula_accepted_v1') === 'true';
  });
  const [eulaDeclined, setEulaDeclined] = useState<boolean>(false);

  // Hardware Mismatch Lock State
  const [hasHardwareMismatch, setHasHardwareMismatch] = useState<boolean>(() => {
    const isNetworkAccess = typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';
    if (isNetworkAccess) return false; // Network terminals always obey Central Server license

    const key = safeGetItem('sigep_lic_chave_v1') || '';
    if (!key) return false;
    const currentIdPC = obterOuCriarIdPC();
    const inicio = safeGetItem('sigep_lic_inicio_v1') || '';
    const fim = safeGetItem('sigep_lic_fim_v1') || '';
    const licIdPC = safeGetItem('sigep_lic_id_pc_v1') || '';

    // Detetar cópia: se o ID do PC da licença for diferente do ID do PC físico atual
    if (licIdPC && licIdPC !== currentIdPC) {
      // DESCARTAR a licença anterior e bloquear o acesso
      safeRemoveItem('sigep_lic_chave_v1');
      safeRemoveItem('sigep_lic_inicio_v1');
      safeRemoveItem('sigep_lic_fim_v1');
      safeRemoveItem('sigep_lic_id_pc_v1');
      safeRemoveItem('sigep_custom_dias_restantes');
      return true;
    }

    const validation = validarLicencaOffline(currentIdPC, key, inicio, fim);
    if (!validation.isValid) {
      // Se a chave não bate com o ID do PC atual, descarta também
      safeRemoveItem('sigep_lic_chave_v1');
      safeRemoveItem('sigep_lic_inicio_v1');
      safeRemoveItem('sigep_lic_fim_v1');
      safeRemoveItem('sigep_lic_id_pc_v1');
      safeRemoveItem('sigep_custom_dias_restantes');
      return true;
    }
    return false;
  });

  const handleAcceptEula = () => {
    setEulaAccepted(true);
    safeSetItem('sigep_eula_accepted_v1', 'true');
  };

  const handleDeclineEula = () => {
    setEulaDeclined(true);
  };

  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);

  // =========================================================================
  // RESTRUTURAÇÃO ARQUITETURAL: FLUXO DE DADOS HERMÉTICO E FILTRO DINÂMICO NA RAIZ
  // =========================================================================
  const hermeticStudents = useMemo(() => {
    if (!schoolSettings || !schoolSettings.activeComponents) return students;
    
    const isPrimarioActive = schoolSettings.activeComponents.ENSINO_PRIMARIO !== false;
    const isPunivActive = schoolSettings.activeComponents.PUNIV !== false;
    const isMagisterioActive = schoolSettings.activeComponents.MAGISTERIO !== false;
    
    return students.filter(student => {
      const classNum = parseInt(student.class, 10);
      const cleanClass = (student.class || '').trim();
      
      if (cleanClass === '13' || classNum === 13) {
        return isMagisterioActive;
      }

      if (classNum >= 1 && classNum <= 9) {
        return isPrimarioActive;
      }

      const spec = (student.specialty || '').toUpperCase().trim();
      const normSpec = spec.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const punivKeys = ['CFB', 'CEJ', 'CS', 'CSH', 'AV', 'LICEU', 'CIENCIAS', 'FISICAS', 'ECONOMICAS', 'JURIDICAS', 'SOCIAIS', 'ARTES'];
      const magisterioKeys = ['MF', 'BQ', 'LEMC', 'GH', 'ING_EMC', 'FRA_EMC', 'EVP', 'EDF', 'EMC', 'EP', 'PE', 'EI', 'PORTUGUES', 'MATEMATICA', 'BIOLOGIA', 'QUIMICA', 'HISTORIA', 'GEOGRAFIA', 'ENSINO', 'PEDAGOGIA', 'INGLES', 'FRANCES', 'EDUCACAO', 'PRE', 'PROFESSORES', 'INFANCIA'];

      const isPunivSpecialty = spec && punivKeys.some(key => normSpec.includes(key) || spec.includes(key));
      const isMagisterioSpecialty = spec && magisterioKeys.some(key => normSpec.includes(key) || spec.includes(key));

      if (classNum >= 10 && classNum <= 12) {
        if (isMagisterioSpecialty) return isMagisterioActive;
        if (isPunivSpecialty) return isPunivActive;
        return isPunivActive || isMagisterioActive;
      }
      
      return isPrimarioActive || isPunivActive || isMagisterioActive;
    });
  }, [students, schoolSettings]);

  const hermeticGrades = useMemo(() => {
    const studentIds = new Set(hermeticStudents.map(s => s.id));
    return grades.filter(row => studentIds.has(row.studentId));
  }, [grades, hermeticStudents]);

  const propinasRecords = useMemo<StudentFinance[]>(() => {
    const saved = safeGetItem('sigep_propinas_v1');
    let records: StudentFinance[] = [];
    if (saved) {
      try {
        records = JSON.parse(saved);
      } catch (e) {
        records = [];
      }
    }
    const recordMap = new Map(records.map(r => [r.id, r]));
    return hermeticStudents.map(student => {
      const existing = recordMap.get(student.id);
      if (existing) {
        return {
          ...existing,
          name: student.name,
          class: student.class,
          section: student.section,
          periodo: student.periodo
        };
      }
      return {
        id: student.id,
        name: student.name,
        class: student.class,
        section: student.section,
        periodo: student.periodo || 'Manhã',
        modalidade: 'Regular',
        desconto: '0%',
        mesesPagos: Array(11).fill(false),
        totalPago: 0,
        totalDivida: 0,
        dataUltimoPg: '',
        observacoes: '',
        faltasInjustificadas: 0,
        faltasJustificadas: 0,
        faltasPagas: 0
      };
    });
  }, [hermeticStudents]);

  const [activeTab, setActiveTab] = useState<ActiveSheet>(() => {
    const savedTab = safeGetItem('sigep_active_tab_v1') as ActiveSheet | null;
    return savedTab || 'HOME';
  });

  const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);

  const [loggedInStaff, setLoggedInStaff] = useState<Staff | null>(() => {
    // Session-based auth: read from sessionStorage so closing window destroys the active login session
    const saved = safeGetSessionItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.id) {
          return parsed;
        }
      } catch (e) {
        console.warn("Error parsing saved logged-in staff session:", e);
      }
    }
    // Remove lingering legacy session from localStorage to ensure exit forces re-authentication
    safeRemoveItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY);
    return null;
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = safeGetSessionItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.role === 'DIRECTOR_GERAL' || parsed?.role === 'SUB_DIRECTOR_PEDAGOGICO' || parsed?.role === 'SUB_DIRECTOR_ADMINISTRATIVO') {
          return 'SUB_DIRECTOR_PEDAGOGICO';
        } else if (parsed?.role === 'CHEFE_SECRETARIA') {
          return 'SECRETARIO';
        } else if (parsed?.role === 'PROFESSOR') {
          return 'PROFESSOR';
        }
      } catch (e) {}
    }
    return 'SUB_DIRECTOR_PEDAGOGICO';
  });

  const [staffList, setStaffList] = useState<Staff[]>([]);

  // Ativar o Hook de Gestão de Bloqueio por Inatividade e OS
  const { isLocked, unlockSession } = useSessionLock({
    loggedInStaff,
    onLockStateChange: (locked) => {
      if (locked) {
        logAction(loggedInStaff?.name || 'Utilizador', 'Sessão auto-bloqueada por inatividade ou evento de OS', 'Segurança');
      } else {
        logAction(loggedInStaff?.name || 'Utilizador', 'Sessão desbloqueada com sucesso', 'Segurança');
      }
    }
  });

  // Persistir a aba/ecrã ativo no localStorage para preservar onde o utilizador estava a trabalhar
  useEffect(() => {
    if (activeTab) {
      safeSetItem('sigep_active_tab_v1', activeTab);
    }
  }, [activeTab]);

  // Redirecionamento automático e restrição de ecrã para perfil de Coordenação (acesso exclusivo à janela Financeira)
  useEffect(() => {
    if (loggedInStaff && ['COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA', 'COORDENADOR'].includes(loggedInStaff.role)) {
      if (activeTab === 'HOME') {
        setActiveTab('FINANCEIRO');
      }
    }
  }, [loggedInStaff, activeTab]);
  const [isStudentPortalActive, setIsStudentPortalActive] = useState<boolean>(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null);

  // Auto-Update and Database Sychronization States (v4.2.0)
  const [startupLog, setStartupLog] = useState<string>('A carregar ficheiros locais do executável...');
  const [dbSchemaVersion, setDbSchemaVersion] = useState<string>('4.1.9');
  
  // Reset authorization state
  const [isResetAllowed, setIsResetAllowed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sigep_reset_allowed_v1');
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });

  // --- GRADE EDIT AUTHORIZATION SHIELD STATES (App.tsx) ---
  const [isAuthHubOpen, setIsAuthHubOpen] = useState<boolean>(false);
  const [gradeRequests, setGradeRequests] = useState<any[]>([]);
  const [authHubPasswordConfirm, setAuthHubPasswordConfirm] = useState<string>('');
  const [authHubError, setAuthHubError] = useState<string | null>(null);
  const [authHubSuccess, setAuthHubSuccess] = useState<string | null>(null);
  const [signingRequestId, setSigningRequestId] = useState<string | null>(null);

  // --- PONTO DIGITAL & ASSIDUIDADE (ESTADO GLOBAL EM TEMPO REAL) ---
  const [pontoRecords, setPontoRecords] = useState<PontoRecord[]>(() => {
    try {
      const saved = localStorage.getItem('sigep_ponto_digital_records');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const savePontoRecords = useCallback((updated: PontoRecord[]) => {
    setPontoRecords(updated);
    safeSetItem('sigep_ponto_digital_records', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sigep_ponto_updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('sigep:data-updated'));
    }
    fetch('/api/ponto_records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  }, []);

  // Motor de Conversão de Ausências em Faltas Automáticas (>24h decorridas e no Turno do RH)
  const runAutoAbsenceEngine = useCallback((currentStaffList: Staff[], currentPonto: PontoRecord[]) => {
    if (!currentStaffList || currentStaffList.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    let hasChanges = false;
    let updatedPonto = [...currentPonto];

    // 1. Verificação do Turno de Hoje
    currentStaffList.forEach(st => {
      if (!st.id || st.role === 'SIGEP' || st.is_root) return;

      const periodo = st.periodoTrabalho || st.periodo || 'MATINAL';
      let cutoffHour = 13; // MATINAL -> 13:00
      if (periodo === 'VESPERTINO') cutoffHour = 18;
      else if (periodo === 'NOTURNO') cutoffHour = 22;
      else if (periodo === 'ADMINISTRATIVO') cutoffHour = 17;

      if (currentHour >= cutoffHour) {
        const existingRecord = updatedPonto.find(r => r.staffId === st.id && r.date === todayStr);
        if (!existingRecord) {
          const autoFalta: PontoRecord = {
            id: `PONTO_${st.id}_${todayStr}`,
            staffId: st.id,
            staffName: st.name,
            staffRole: st.role,
            date: todayStr,
            timestamp: `${cutoffHour}:00:00`,
            status: 'FALTA_INJUSTIFICADA',
            periodoTrabalho: periodo as any,
            statusWorkflow: 'AGUARDANDO_ESCLARECIMENTO',
            motivoEsclarecimentoSolicitado: `Ausência de assinatura no Ponto Digital durante o turno ${periodo}. Convertida em falta pelo motor automático de assiduidade SIGEP.`
          };
          updatedPonto.push(autoFalta);
          hasChanges = true;
        }
      }
    });

    // 2. Verificação Retroativa de Datas Passadas (> 24 Horas)
    const knownPastDates = Array.from(new Set(updatedPonto.map(r => r.date))).filter(d => d < todayStr);
    knownPastDates.forEach(pastDate => {
      currentStaffList.forEach(st => {
        if (!st.id || st.role === 'SIGEP' || st.is_root) return;
        const existing = updatedPonto.find(r => r.staffId === st.id && r.date === pastDate);
        if (!existing) {
          const periodo = st.periodoTrabalho || st.periodo || 'MATINAL';
          const autoFaltaPast: PontoRecord = {
            id: `PONTO_${st.id}_${pastDate}`,
            staffId: st.id,
            staffName: st.name,
            staffRole: st.role,
            date: pastDate,
            timestamp: '23:59:59',
            status: 'FALTA_INJUSTIFICADA',
            periodoTrabalho: periodo as any,
            statusWorkflow: 'AGUARDANDO_ESCLARECIMENTO',
            motivoEsclarecimentoSolicitado: `Ausência de assinatura no Ponto Digital (>24h decorridas). Convertida automaticamente em falta no relatório SIGEP.`
          };
          updatedPonto.push(autoFaltaPast);
          hasChanges = true;
        }
      });
    });

    if (hasChanges) {
      setPontoRecords(updatedPonto);
      safeSetItem('sigep_ponto_digital_records', JSON.stringify(updatedPonto));
      fetch('/api/ponto_records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPonto)
      }).catch(() => {});
    }
  }, []);

  const [chatNotificationBanner, setChatNotificationBanner] = useState<string | null>(null);

  useEffect(() => {
    const loadRequests = () => {
      try {
        const saved = localStorage.getItem('sigep_grade_requests_v1');
        if (saved) {
          setGradeRequests(JSON.parse(saved));
        } else {
          setGradeRequests([]);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadRequests();
    window.addEventListener('storage', loadRequests);
    window.addEventListener('sigep_request_created', loadRequests);
    const interval = setInterval(loadRequests, 1500);
    return () => {
      window.removeEventListener('storage', loadRequests);
      window.removeEventListener('sigep_request_created', loadRequests);
      clearInterval(interval);
    };
  }, []);

  // Notificações em Tempo Real de Chat para Professores e Colaboradores Autorizados
  useEffect(() => {
    if (!loggedInStaff) {
      setChatNotificationBanner(null);
      return;
    }

    const checkChatNotifs = () => {
      try {
        const savedConv = localStorage.getItem('sigep_canais_convidados_v1');
        const convList = savedConv ? JSON.parse(savedConv) : [];
        if (Array.isArray(convList)) {
          const userInvites = convList.filter((inv: any) => 
            (inv.id_utilizador === loggedInStaff.id || inv.id_utilizador === loggedInStaff.role) && 
            (inv.status_convite === 'ACEITO' || inv.status_convite === 'PENDENTE')
          );

          if (userInvites.length > 0) {
            const seenKey = `sigep_seen_chat_invites_${loggedInStaff.id}`;
            const lastSeen = localStorage.getItem(seenKey);
            if (!lastSeen || parseInt(lastSeen, 10) < userInvites.length) {
              setChatNotificationBanner(`💬 NOTIFICAÇÃO DO CHAT: Foi autorizado(a) a participar no Chat do Staff / Canal de Comunicação! Clique no menu 'CHAT DO STAFF' para ver.`);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    checkChatNotifs();
    window.addEventListener('storage', checkChatNotifs);
    window.addEventListener('sigep_chat_updated', checkChatNotifs);
    const interval = setInterval(checkChatNotifs, 2500);

    return () => {
      window.removeEventListener('storage', checkChatNotifs);
      window.removeEventListener('sigep_chat_updated', checkChatNotifs);
      clearInterval(interval);
    };
  }, [loggedInStaff]);

  const pendingGradeRequestsCount = gradeRequests.filter(r => r.status === 'PENDING').length;

  const handleToggleResetAllowed = (allowed: boolean) => {
    setIsResetAllowed(allowed);
    try {
      localStorage.setItem('sigep_reset_allowed_v1', allowed ? 'true' : 'false');
    } catch (e) {}
    
    logAction(
      loggedInStaff?.name || 'SISTEMA', 
      `${allowed ? 'Autorizou' : 'Revogou'} a permissão global para operação de Reset de Fábrica da Base de Dados`, 
      'Segurança do Sistema'
    );
  };

  const handleApproveGradeRequest = (reqId: string, passwordConfirm: string) => {
    setAuthHubError(null);
    setAuthHubSuccess(null);

    if (!loggedInStaff || (loggedInStaff.role !== 'DIRECTOR_GERAL' && loggedInStaff.role !== 'SUB_DIRECTOR_PEDAGOGICO')) {
      setAuthHubError('Apenas o Director Geral ou Subdirector Pedagógico podem assinar autorizações.');
      return;
    }

    const correctPassword = loggedInStaff.password || '12345';
    if (passwordConfirm !== correctPassword) {
      setAuthHubError('Senha d\'Acesso incorrecta. Assinatura recusada.');
      return;
    }

    const updated = gradeRequests.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: 'APPROVED',
          code: 'SIGEP-APP-' + Math.floor(1000 + Math.random() * 9000),
          approverName: loggedInStaff.name,
          approvedAt: new Date().toISOString()
        };
      }
      return r;
    });

    localStorage.setItem('sigep_grade_requests_v1', JSON.stringify(updated));
    setGradeRequests(updated);
    window.dispatchEvent(new Event('storage'));

    // Sync updated grade requests with central server
    fetch('/api/grade_requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});

    const targetReq = gradeRequests.find(r => r.id === reqId);
    if (targetReq) {
      // Create temporary unlock so teacher can edit the grade immediately
      const newUnlock = {
        id: `unlock-${targetReq.studentId}-${targetReq.subject}-${targetReq.trimester}`,
        studentId: targetReq.studentId,
        subject: targetReq.subject,
        trimester: targetReq.trimester,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes unlock
      };
      try {
        const existingUnlocks = JSON.parse(localStorage.getItem('sigep_temporary_unlocks_v1') || '[]');
        const updatedUnlocks = [...existingUnlocks.filter((u: any) => !(u.studentId === targetReq.studentId && u.subject === targetReq.subject && u.trimester === targetReq.trimester)), newUnlock];
        localStorage.setItem('sigep_temporary_unlocks_v1', JSON.stringify(updatedUnlocks));
        fetch('/api/unlocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUnlocks)
        }).catch(() => {});
      } catch (e) {}

      // Log to Audit logs
      logAction(
        loggedInStaff.name,
        `Aprovou alteração de notas para o aluno ${targetReq.studentName} na disciplina ${targetReq.subject} (${targetReq.trimester}º Trimestre) sob justificação: "${targetReq.reason}"`,
        'Segurança Escolar'
      );

      // Write in central chat
      try {
        const chatLogs = JSON.parse(localStorage.getItem('sigep_log_comunicacao_interna_v2') || '[]');
        const appMsg = {
          id: `sys-app-${Date.now()}`,
          remetente_id: 'SYSTEM',
          remetente_nome: 'Segurança SIGEP',
          remetente_cargo: 'Assinatura',
          destinatario_id: 'pautas-pedagogico',
          mensagem: `✅ PEDIDO D'ALTERAÇÃO DE NOTA DEFERIDO:
O Director/Subdirector ${loggedInStaff.name} assinou digitalmente a autorização de alteração de notas de ${targetReq.studentName}. A alteração está desbloqueada!`,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('sigep_log_comunicacao_interna_v2', JSON.stringify([...chatLogs, appMsg]));
      } catch (e) {}
    }

    setAuthHubSuccess('✓ Assinatura Digital efetuada com sucesso!');
    setAuthHubPasswordConfirm('');
    setSigningRequestId(null);
    setTimeout(() => setAuthHubSuccess(null), 3000);
  };

  const handleRejectGradeRequest = (reqId: string) => {
    const updated = gradeRequests.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: 'REJECTED',
          rejectedAt: new Date().toISOString()
        };
      }
      return r;
    });

    localStorage.setItem('sigep_grade_requests_v1', JSON.stringify(updated));
    setGradeRequests(updated);
    window.dispatchEvent(new Event('storage'));

    // Sync rejected request with central server
    fetch('/api/grade_requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});

    const targetReq = gradeRequests.find(r => r.id === reqId);
    if (targetReq && loggedInStaff) {
      logAction(
        loggedInStaff.name,
        `Recusou alteração de notas para o aluno ${targetReq.studentName} na disciplina ${targetReq.subject} (${targetReq.trimester}º Trimestre)`,
        'Segurança Escolar'
      );
    }
  };

  // SIGEP 4.2.0 Universal Search & Student 360 View states
  const [universalSearchQuery, setUniversalSearchQuery] = useState('');
  const [selected360Student, setSelected360Student] = useState<Student | null>(null);

  // Access control & logs states
  const [permissions, setPermissions] = useState<RolePermission[]>(() => {
    try {
      const saved = localStorage.getItem('sigep_role_permissions_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        role: 'SUB_DIRECTOR_PEDAGOGICO',
        allowedModules: ['MINI_PAUTAS', 'PAUTAS', 'DOCUMENTOS', 'RELATORIO', 'BANCO_DE_DADOS'],
        canEdit: true
      },
      {
        role: 'SUB_DIRECTOR_ADMINISTRATIVO',
        allowedModules: ['MATRICULA', 'RH', 'PAUTAS', 'DOCUMENTOS', 'FINANCAS', 'RELATORIO'],
        canEdit: true
      },
      {
        role: 'CHEFE_SECRETARIA',
        allowedModules: ['MATRICULA', 'PAUTAS', 'DOCUMENTOS', 'FINANCAS'],
        canEdit: true
      },
      {
        role: 'TECNICO_PEDAGOGICO',
        allowedModules: ['MINI_PAUTAS', 'PAUTAS', 'DOCUMENTOS'],
        canEdit: true
      },
      {
        role: 'TECNICO_ADMINISTRATIVO',
        allowedModules: ['FINANCAS', 'RH'],
        canEdit: true
      }
    ];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('sigep_audit_logs_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'log-seed-1',
        user: 'SISTEMA',
        action: 'Arranque e inicialização do SIGEP Académico executado com sucesso.',
        timestamp: new Date().toLocaleDateString('pt-AO') + ' ' + new Date().toLocaleTimeString('pt-AO'),
        target: 'Servidor Central'
      }
    ];
  });

  const logAction = (user: string, action: string, target: string) => {
    const newLog: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      user,
      action,
      timestamp: new Date().toLocaleDateString('pt-AO') + ' ' + new Date().toLocaleTimeString('pt-AO'),
      target
    };
    setAuditLogs(prev => {
      const updated = [...prev, newLog];
      localStorage.setItem('sigep_audit_logs_v1', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearLogs = () => {
    setAuditLogs([]);
    localStorage.removeItem('sigep_audit_logs_v1');
    logAction(loggedInStaff?.name || 'SISTEMA', 'Limpeza completa dos registos de auditoria', 'Logs Globais');
  };

  const handleUpdatePermissions = (newPerms: RolePermission[]) => {
    setPermissions(newPerms);
    localStorage.setItem('sigep_role_permissions_v1', JSON.stringify(newPerms));
    logAction(loggedInStaff?.name || 'DIRECTOR_GERAL', 'Actualizou matriz de permissões e delegações de acesso', 'Segurança do Sistema');
  };

  // State to support sub-routing under finances/relatórios from the side menu
  const [selectedReportSubTab, setSelectedReportSubTab] = useState<'financeiro' | 'academico'>('financeiro');
  const [selectedFinanceSubTab, setSelectedFinanceSubTab] = useState<'propinas' | 'faltas_multas'>('propinas');
  const [academicSubTab, setAcademicSubTab] = useState<'DASHBOARD' | 'CURRICULO' | 'MATRICULA' | 'CANDIDATURAS' | 'RECONFIRMACAO' | 'TRANSFERIDO_ENTRADA' | 'TRANSFERIDO_SAIDA'>('DASHBOARD');

  // Scroll Listener: Hides main header when user scrolls down from absolute top
  // Anti-jitter hysteresis algorithm:
  // - Hides header when scroll > 40px down.
  // - Shows header ONLY when scroll reaches absolute top (<= 2px).
  // - Dead-zone (2px to 40px) ensures header stays hidden and motionless during back-and-forth scrolling, avoiding flickering/trembling.
  const [isScrolledFromTop, setIsScrolledFromTop] = useState(false);

  useEffect(() => {
    const handleScroll = (e?: Event) => {
      const targetEl = e?.target as HTMLElement | null;
      const targetScrollTop = (targetEl && typeof targetEl.scrollTop === 'number') ? targetEl.scrollTop : 0;
      const currentScroll = Math.max(
        window.scrollY || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0,
        targetScrollTop
      );

      if (currentScroll > 40) {
        setIsScrolledFromTop(true);
      } else if (currentScroll <= 2) {
        setIsScrolledFromTop(false);
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    MATRICULA: true,
    RH: true,
    MINI_PAUTAS: true,
    PAUTAS: true,
    DOCUMENTOS: true,
    FINANCAS: true,
    RELATORIO: true,
    BANCO_DE_DADOS: true
  });

  // Splash Screen timer & Sychronized Database Migration Simulation (Especificação Técnica v1.1.0)
  useEffect(() => {
    if (!showSplash) return;

    const logs = [
      { t: 0, txt: 'A carregar ficheiros locais do executável SIGEP v1.1.0...' },
      { t: 50, txt: 'A estabelecer ligação local ao Servidor Central (PostgreSQL)...' },
      { t: 100, txt: 'Ligação LAN com PC Central estabelecida com sucesso.' },
      { t: 150, txt: 'Versão de Dados detectada: v1.1.0. A verificar integridade...' },
      { t: 200, txt: 'Integridade dos dados verificada com sucesso!' },
      { t: 250, txt: 'SIGEP Académico pronto.' }
    ];

    const timeouts = logs.map(item => {
      return setTimeout(() => {
        setStartupLog(item.txt);
        if (item.txt.includes('verificada com sucesso')) {
          setDbSchemaVersion('1.1.0');
        }
      }, item.t);
    });

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 280);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(timer);
    };
  }, []);

  // Auto-close mobile hamburger menu when active tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  // Check PostgreSQL Connection
  useEffect(() => {
    let isMounted = true;
    const checkConn = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setDbConnected(data.connected === true);
        } else {
          if (isMounted) setDbConnected(false);
        }
      } catch (err) {
        if (isMounted) setDbConnected(false);
      }
    };

    checkConn();
    const interval = setInterval(checkConn, 15000); // check every 15 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // License Management States
  const [licencaChave, setLicencaChave] = useState<string>(() => {
    return safeGetItem('sigep_lic_chave_v1') || '';
  });
  const [licencaInicio, setLicencaInicio] = useState<string>(() => {
    return safeGetItem('sigep_lic_inicio_v1') || '';
  });
  const [licencaFim, setLicencaFim] = useState<string>(() => {
    return safeGetItem('sigep_lic_fim_v1') || '';
  });
  const [diasRestantes, setDiasRestantes] = useState<number>(() => {
    const saved = localStorage.getItem('sigep_custom_dias_restantes');
    if (saved !== null) return parseInt(saved, 10);
    return 15; // default trial max 15 days
  });

  // Central License Sync Function (Enforces Central Server Expiration across LAN / Wi-Fi)
  const syncCentralLicense = useCallback(async () => {
    try {
      const res = await fetch('/api/license');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.diasRestantes === 'number') {
          setDiasRestantes(data.diasRestantes);
          localStorage.setItem('sigep_custom_dias_restantes', String(data.diasRestantes));

          if (data.licencaChave) {
            setLicencaChave(data.licencaChave);
            safeSetItem('sigep_lic_chave_v1', data.licencaChave);
          }
          if (data.licencaInicio) {
            setLicencaInicio(data.licencaInicio);
            safeSetItem('sigep_lic_inicio_v1', data.licencaInicio);
          }
          if (data.licencaFim) {
            setLicencaFim(data.licencaFim);
            safeSetItem('sigep_lic_fim_v1', data.licencaFim);
          }
          return;
        }
      }
    } catch (e) {
      console.warn("Aviso ao sincronizar licença do servidor central:", e);
    }

    // Fallback if offline or server API not reachable
    const currentIdPC = obterOuCriarIdPC();
    if (licencaChave) {
      const validation = validarLicencaOffline(currentIdPC, licencaChave, licencaInicio, licencaFim);
      if (validation.isValid) {
        const rest = calcularDiasRestantes(licencaFim);
        setDiasRestantes(rest);
        localStorage.setItem('sigep_custom_dias_restantes', String(rest));
        return;
      }
    }

    const firstLaunchKey = 'sigep_first_launch_date_v1';
    let firstLaunch = localStorage.getItem(firstLaunchKey);
    if (!firstLaunch) {
      firstLaunch = new Date().toISOString();
      localStorage.setItem(firstLaunchKey, firstLaunch);
    }
    const firstLaunchDate = new Date(firstLaunch);
    const msPassed = new Date().getTime() - firstLaunchDate.getTime();
    const daysPassed = Math.floor(msPassed / (1000 * 60 * 60 * 24));
    const trialDaysLeft = Math.max(0, 15 - daysPassed);

    setDiasRestantes(trialDaysLeft);
    localStorage.setItem('sigep_custom_dias_restantes', String(trialDaysLeft));
  }, [licencaChave, licencaInicio, licencaFim]);

  // Periodically Auto-updating license status from Central Server every 15 seconds
  useEffect(() => {
    syncCentralLicense();
    const interval = setInterval(syncCentralLicense, 15 * 1000);
    const handleDataUpdated = () => syncCentralLicense();
    window.addEventListener('sigep:data-updated', handleDataUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('sigep:data-updated', handleDataUpdated);
    };
  }, [syncCentralLicense]);

  // Redirection: Force user out of restricted tabs when license/trial is expired (diasRestantes <= 0)
  useEffect(() => {
    if (diasRestantes <= 0) {
      const allowedTabs: ActiveSheet[] = ['HOME', 'RELACAO_NOMINAL', 'DECLARACOES_CERTIFICADOS', 'UTILIZADOR'];
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('HOME');
        setVbaLog("Sistema suspenso: Licença expirada no Servidor Central. Redirecionado para o modo leitura.");
      }
    }
  }, [diasRestantes, activeTab]);

  const handleUpdateLicenca = (chave: string, start: string, end: string) => {
    const currentIdPC = obterOuCriarIdPC();
    setLicencaChave(chave);
    setLicencaInicio(start);
    setLicencaFim(end);
    safeSetItem('sigep_lic_chave_v1', chave);
    safeSetItem('sigep_lic_inicio_v1', start);
    safeSetItem('sigep_lic_fim_v1', end);
    safeSetItem('sigep_lic_id_pc_v1', currentIdPC);
    
    const rest = calcularDiasRestantes(end);
    setDiasRestantes(rest);
    localStorage.setItem('sigep_custom_dias_restantes', String(rest));
    
    // Broadcast & Save activation to Central Server (PostgreSQL / Express API)
    fetch('/api/license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licencaChave: chave,
        licencaInicio: start,
        licencaFim: end,
        diasRestantes: rest,
        serverHardwareId: currentIdPC
      })
    }).catch(err => console.warn('Erro ao registrar ativação de licença no servidor central:', err));

    const isNetworkAccess = typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';

    if (!isNetworkAccess) {
      const validation = validarLicencaOffline(currentIdPC, chave, start, end);
      setHasHardwareMismatch(!validation.isValid);
    }

    setVbaLog(`Licença ativada com sucesso no Servidor Central: ${chave}. Válida até ${end.substring(6,8)}/${end.substring(4,6)}/${end.substring(0,4)}.`);
  };

  const handleSetDiasRestantes = (days: number) => {
    setDiasRestantes(days);
    localStorage.setItem('sigep_custom_dias_restantes', String(days));

    fetch('/api/license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licencaChave,
        licencaInicio,
        licencaFim,
        diasRestantes: days
      })
    }).catch(err => console.warn('Erro ao sincronizar ajuste de licença no servidor central:', err));

    setVbaLog(`Período de licença ajustado no Servidor Central para: ${days} dias.`);
  };

  
  // School filters: defaults as in the VBA routines: A1 (Classe) and A2 (Turma)
  const [currentClass, setCurrentClass] = useState<string>('1');
  const [currentSection, setCurrentSection] = useState<string>('A');
  
  const [activeModality, setActiveModality] = useState<ModalityType>(() => {
    const saved = safeGetItem('sigep_active_modality_v1');
    return (saved as ModalityType) || 'ENSINO_PRIMARIO';
  });

  const [selectedLevel, setSelectedLevel] = useState<string>('NIVEL1');
  const [isClosingPeriod, setIsClosingPeriod] = useState<boolean>(true); // Periodo de Fechamento default active
  const [useNpp, setUseNpp] = useState<boolean>(() => {
    const saved = safeGetItem('sigep_use_npp_v1');
    return saved !== null ? saved === 'true' : true; // Padrão com NPP ativado (MAC+NPP+NPT)/3
  });

  const handleToggleNpp = (val: boolean) => {
    setUseNpp(val);
    safeSetItem('sigep_use_npp_v1', String(val));
    setVbaLog(`Fórmula de Média Trimestral (MT) alterada para: ${val ? 'Com NPP: (MAC + NPP + NPT) / 3' : 'Sem NPP: (MAC + NPT) / 2'}.`);
    setTimeout(() => setVbaLog(null), 5000);
  };

  // Synchronize selectedLevel with currentClass changes
  useEffect(() => {
    if (activeModality === 'ENSINO_PRIMARIO') {
      const classNum = parseInt(currentClass) || 1;
      if (classNum >= 1 && classNum <= 4) {
        setSelectedLevel('NIVEL1');
      } else if (classNum === 5 || classNum === 6) {
        setSelectedLevel('NIVEL2');
      } else if (classNum >= 7 && classNum <= 9) {
        setSelectedLevel('NIVEL3');
      }
    } else {
      setSelectedLevel(currentClass);
    }
  }, [currentClass, activeModality]);

  useEffect(() => {
    if (activeModality === 'ENSINO_PRIMARIO') {
      setSelectedLevel('NIVEL1');
      setCurrentClass('1');
      setCurrentSection('A');
    } else {
      setSelectedLevel('10');
      setCurrentClass('10');
      setCurrentSection(activeModality === 'PUNIV' ? 'FB-A' : 'MF-A');
    }
  }, [activeModality]);

  // Garantir fallback para modalidade ativa caso a atual seja desativada nas configurações (SIGEP 4.2.0)
  useEffect(() => {
    if (schoolSettings.activeComponents) {
      const isCurrentActive = schoolSettings.activeComponents[activeModality] !== false;
      if (!isCurrentActive) {
        const availableModalities: ModalityType[] = [];
        if (schoolSettings.activeComponents.ENSINO_PRIMARIO !== false) availableModalities.push('ENSINO_PRIMARIO');
        if (schoolSettings.activeComponents.PUNIV !== false) availableModalities.push('PUNIV');
        if (schoolSettings.activeComponents.MAGISTERIO !== false) availableModalities.push('MAGISTERIO');
        
        if (availableModalities.length > 0) {
          handleSetModality(availableModalities[0]);
        }
      }
    }
  }, [schoolSettings.activeComponents, activeModality]);

  const handleSetModality = (mod: ModalityType) => {
    setActiveModality(mod);
    safeSetItem('sigep_active_modality_v1', mod);
    setVbaLog(`Modalidade de ensino alterada para: ${mod === 'ENSINO_PRIMARIO' ? 'Ensino Primário (1ª - 9ª)' : mod === 'PUNIV' ? 'IIº CICLO DO ENSINO SECUNDÁRIO GERAL (LICEUS)' : 'IIº CICLO DO ENSINO SECUNDÁRIO PEDAGÓGICO (MAGISTÉRIO)'}`);
  };

  const getLevelsForModality = () => {
    if (activeModality === 'ENSINO_PRIMARIO') {
      return [
        { id: 'NIVEL1', label: 'Nível 1 (1ª - 4ª)' },
        { id: 'NIVEL2', label: 'Nível 2 (5ª - 6ª)' },
        { id: 'NIVEL3', label: 'Nível 3 (7ª - 9ª)' }
      ];
    } else if (activeModality === 'PUNIV') {
      return [
        { id: '10', label: '10ª (LICEU)' },
        { id: '11', label: '11ª (LICEU)' },
        { id: '12', label: '12ª (LICEU)' }
      ];
    } else {
      return [
        { id: '10', label: '10ª (MAGISTÉRIO)' },
        { id: '11', label: '11ª (MAGISTÉRIO)' },
        { id: '12', label: '12ª (MAGISTÉRIO)' },
        { id: '13', label: '13ª (MAGISTÉRIO)' }
      ];
    }
  };

  // Action status/notifications mapping
  const [vbaLog, setVbaLog] = useState<string | null>(null);
  const [resetConfirmActive, setResetConfirmActive] = useState<boolean>(false);

  // States for organized sidebar submenus
  const [isMainMenuOpen, setIsMainMenuOpen] = useState<boolean>(true);
  const [isMiniPautasOpen, setIsMiniPautasOpen] = useState<boolean>(false);
  const [isPautaGeralOpen, setIsPautaGeralOpen] = useState<boolean>(false);
  const [isPautaTrimesterOpen, setIsPautaTrimesterOpen] = useState<boolean>(false);
  const [isCadastroOpen, setIsCadastroOpen] = useState<boolean>(false);

  // Available options
  const classesList = activeModality === 'ENSINO_PRIMARIO'
    ? ['1', '2', '3', '4', '5', '6', '7', '8', '9']
    : activeModality === 'PUNIV'
    ? ['10', '11', '12']
    : ['10', '11', '12', '13'];

  const sectionsList = Array.from(new Set(activeModality === 'ENSINO_PRIMARIO'
    ? getSectionsList('ENSINO_PRIMARIO')
    : activeModality === 'PUNIV'
    ? [
        ...getSectionsList('PUNIV', 'CFB'),
        ...getSectionsList('PUNIV', 'CEJ'),
        ...getSectionsList('PUNIV', 'CS'),
        ...getSectionsList('PUNIV', 'AV')
      ]
    : [
        ...getSectionsList('MAGISTERIO', 'MF'),
        ...getSectionsList('MAGISTERIO', 'GH'),
        ...getSectionsList('MAGISTERIO', 'BQ'),
        ...getSectionsList('MAGISTERIO', 'LEMC'),
        ...getSectionsList('MAGISTERIO', 'EP'),
        ...getSectionsList('MAGISTERIO', 'PE'),
        ...getSectionsList('MAGISTERIO', 'ING_EMC'),
        ...getSectionsList('MAGISTERIO', 'FRA_EMC'),
        ...getSectionsList('MAGISTERIO', 'EVP'),
        ...getSectionsList('MAGISTERIO', 'EDF')
      ]));

  const filteredClassesList = loggedInStaff && loggedInStaff.role === 'PROFESSOR'
    ? getProfessorAllowedClasses(loggedInStaff, classesList)
    : classesList;

  const classesForSelectedLevel = filteredClassesList.filter(cl => {
    if (activeModality === 'ENSINO_PRIMARIO') {
      const classNum = parseInt(cl) || 1;
      if (selectedLevel === 'NIVEL1') return classNum >= 1 && classNum <= 4;
      if (selectedLevel === 'NIVEL2') return classNum === 5 || classNum === 6;
      if (selectedLevel === 'NIVEL3') return classNum >= 7 && classNum <= 9;
    } else {
      return cl === selectedLevel;
    }
    return true;
  });

  const handleSelectLevel = (level: string) => {
    setSelectedLevel(level);
    if (activeModality === 'ENSINO_PRIMARIO') {
      const levelClasses = level === 'NIVEL1' ? ['1', '2', '3', '4'] : level === 'NIVEL2' ? ['5', '6'] : ['7', '8', '9'];
      const allowed = levelClasses.filter(cl => filteredClassesList.includes(cl));
      if (allowed.length > 0) {
        setCurrentClass(allowed[0]);
      }
    } else {
      if (filteredClassesList.includes(level)) {
        setCurrentClass(level);
      }
    }
  };

  const handleSelectPautaLevel = (level: string) => {
    setActiveTab('PAUTA1');
    handleSelectLevel(level);
    setVbaLog(`Navegou para a Pauta Geral: ${level}.`);
  };

  const handleSelectMiniPautaLevel = (level: string) => {
    setActiveTab('PAUTA1TM1');
    handleSelectLevel(level);
    setVbaLog(`Navegou para a Mini Pauta: ${level}.`);
  };

  const handleNavigationAction = (item: any) => {
    if (item.targetTab) {
      setActiveTab(item.targetTab as ActiveSheet);
    }
    if (item.targetModality) {
      handleSetModality(item.targetModality);
    }
    if (item.targetSubTab) {
      if (item.actionType === 'FINANCES_SUBTAB') {
        setSelectedFinanceSubTab(item.targetSubTab as 'propinas' | 'faltas_multas');
      } else if (item.actionType === 'REPORT_SUBTAB') {
        setSelectedReportSubTab(item.targetSubTab as 'financeiro' | 'academico');
      } else if (item.targetTab === 'AREA_ACADEMICA') {
        setAcademicSubTab(item.targetSubTab as any);
      }
    }
    
    // Auto-fill active levels on modality change
    if (item.id === 'MP_PRIMARIO') {
      setSelectedLevel('NIVEL1');
    } else if (item.id === 'MP_PUNIV' || item.id === 'MP_MAGISTERIO') {
      setSelectedLevel('10');
    }

    setVbaLog(`Navegou para: ${item.label}`);
  };

  const filteredSectionsList = loggedInStaff && loggedInStaff.role === 'PROFESSOR'
    ? getProfessorAllowedSections(loggedInStaff, currentClass, sectionsList)
    : sectionsList;

  // Enforce Tab Restrictions for Professor
  useEffect(() => {
    const isProf = userRole === 'PROFESSOR' || loggedInStaff?.role === 'PROFESSOR';
    if (isProf && activeTab !== 'PAINEL_MINI_PAUTAS' && activeTab !== 'UTILIZADOR') {
      setActiveTab('PAINEL_MINI_PAUTAS');
    }
  }, [userRole, loggedInStaff?.role, activeTab]);

  // Synchronize dynamic lists and resets for Professor
  useEffect(() => {
    if (loggedInStaff && loggedInStaff.role === 'PROFESSOR') {
      const allowedClasses = getProfessorAllowedClasses(loggedInStaff, classesList);
      const allowedSections = getProfessorAllowedSections(loggedInStaff, currentClass, sectionsList);
      if (allowedClasses.length > 0 && !allowedClasses.includes(currentClass)) {
        setCurrentClass(allowedClasses[0]);
      }
      if (allowedSections.length > 0 && !allowedSections.includes(currentSection)) {
        setCurrentSection(allowedSections[0]);
      }
    }
  }, [loggedInStaff?.id, currentClass, currentSection]);

  // Initialize DB with complete schema preservation and parsing safety
  useEffect(() => {
    try {
      const savedStudents = safeGetItem(LOCAL_STORAGE_STUDENTS_KEY);
      const savedGrades = safeGetItem(LOCAL_STORAGE_GRADES_KEY);
      const savedSettings = safeGetItem(LOCAL_STORAGE_SCHOOL_SETTINGS_KEY);
      const savedStaff = safeGetItem(LOCAL_STORAGE_STAFF_KEY);
      const savedLoggedInStaff = safeGetItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY);

      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed && typeof parsed === 'object') {
            if (parsed.syncServerUrl === 'http://localhost:3000') {
              parsed.syncServerUrl = '';
            }
            setSchoolSettings({
              ...DEFAULT_SCHOOL_SETTINGS,
              ...parsed
            });
          }
        } catch (e) {
          console.warn("Malformed settings JSON. Overwriting with defaults.");
          setSchoolSettings(DEFAULT_SCHOOL_SETTINGS);
        }
      }

      const isRhCleared = localStorage.getItem('sigep_rh_cleared') === 'true';

      if (isRhCleared) {
        setStaffList([]);
        saveStaffToLocalStorage([]);
      } else if (savedStaff) {
        try {
          const parsedStaff = JSON.parse(savedStaff);
          if (Array.isArray(parsedStaff) && parsedStaff.length > 0) {
            const sanitized = sanitizeStaffList(parsedStaff);
            setStaffList(sanitized);
            saveStaffToLocalStorage(sanitized);
          } else {
            const sanitized = sanitizeStaffList(INITIAL_STAFF);
            setStaffList(sanitized);
            saveStaffToLocalStorage(sanitized);
          }
        } catch (e) {
          const sanitized = sanitizeStaffList(INITIAL_STAFF);
          setStaffList(sanitized);
          saveStaffToLocalStorage(sanitized);
        }
      } else {
        const sanitized = sanitizeStaffList(INITIAL_STAFF);
        setStaffList(sanitized);
        saveStaffToLocalStorage(sanitized);
      }

      // Para conformidade com a Persistência de Sessão Segura (SIGEP 4.2.0),
      // não são permitidos acessos automáticos ou persistentes sem reautenticação.
      // O utilizador deve autenticar-se a cada novo arranque do executável/página.
      // Modificação: restauramos o utilizador, mas ativamos imediatamente o bloqueio visual por segurança.
      if (savedLoggedInStaff) {
        try {
          const parsed = JSON.parse(savedLoggedInStaff);
          if (parsed && typeof parsed === 'object') {
            setLoggedInStaff(parsed);
            if (parsed.role === 'DIRECTOR_GERAL' || parsed.role === 'SUB_DIRECTOR_PEDAGOGICO' || parsed.role === 'SUB_DIRECTOR_ADMINISTRATIVO') {
              setUserRole('SUB_DIRECTOR_PEDAGOGICO');
            } else if (parsed.role === 'CHEFE_SECRETARIA') {
              setUserRole('SECRETARIO');
            } else if (parsed.role === 'PROFESSOR') {
              setUserRole('PROFESSOR');
            }
          }
        } catch (e) {
          console.warn("Error parsing saved logged-in staff");
        }
      }

      if (savedStudents && savedGrades) {
        const parsedStudents = JSON.parse(savedStudents);
        const parsedGrades = JSON.parse(savedGrades);
        
        if (Array.isArray(parsedStudents) && Array.isArray(parsedGrades) && parsedStudents.length > 0) {
          setStudents(parsedStudents);
          setGrades(parsedGrades);
          return;
        }
      }
    } catch (e) {
      console.warn("Error parsing or validating saved state, resetting to defaults:", e);
    }

    // Default fallback load
    setStudents(INITIAL_STUDENTS);
    const generated = generateInitialGrades(INITIAL_STUDENTS);
    setGrades(generated);
    safeSetItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(INITIAL_STUDENTS));
    safeSetItem(LOCAL_STORAGE_GRADES_KEY, JSON.stringify(generated));
  }, []);

  // Sincronização automática inicial de utilizadores/credenciais a partir do servidor central
  useEffect(() => {
    let isMounted = true;
    const autoSyncStaffOnBoot = async () => {
      const isCleared = localStorage.getItem('sigep_rh_cleared') === 'true';
      if (isCleared) {
        console.log('[SIGEP Sync] Banco de dados de RH foi zerado pelo utilizador. Ignorando sincronização com servidor remoto.');
        return;
      }
      try {
        const apiUrl = await resolveWorkingApiUrl(schoolSettings?.syncServerUrl);
        if (!apiUrl && apiUrl !== '') return;
        const res = await fetchWithTimeout(`${apiUrl}/api/funcionarios`, {}, 5000);
        if (res.ok) {
          const remoteStaff = await res.json();
          if (isMounted && Array.isArray(remoteStaff) && remoteStaff.length > 0) {
            // Fusão inteligente entre estado/localStorage local e dados remotos do servidor
            const savedStaffRaw = localStorage.getItem(LOCAL_STORAGE_STAFF_KEY);
            let localStaffList: Staff[] = [];
            if (savedStaffRaw) {
              try { localStaffList = JSON.parse(savedStaffRaw); } catch (e) {}
            }
            if (!Array.isArray(localStaffList)) localStaffList = [];

            const mergedMap = new Map<string, Staff>();

            // 1. Carregar colaboradores locais
            localStaffList.forEach(localItem => {
              if (localItem && localItem.id) {
                mergedMap.set(localItem.id.trim().toUpperCase(), { ...localItem });
              }
            });

            // 2. Fundir com colaboradores remotos mantendo a maior riqueza de dados
            remoteStaff.forEach((remoteItem: Staff) => {
              if (!remoteItem || !remoteItem.id) return;
              const key = remoteItem.id.trim().toUpperCase();
              const localItem = mergedMap.get(key);

              if (!localItem) {
                mergedMap.set(key, remoteItem);
              } else {
                // Preservar e combinar assignments
                const combinedAssignments = [
                  ...(localItem.assignments || []),
                  ...(remoteItem.assignments || [])
                ];

                const uniqueAssMap = new Map<string, any>();
                combinedAssignments.forEach(a => {
                  if (a && a.class && a.section && a.subject) {
                    const assKey = `${a.class}_${a.section}_${a.subject}`;
                    uniqueAssMap.set(assKey, a);
                  }
                });
                let mergedAssignments = Array.from(uniqueAssMap.values());

                const mergedClasses = Array.from(new Set([
                  ...(localItem.classes || []),
                  ...(remoteItem.classes || []),
                  ...mergedAssignments.map(a => a.class)
                ]));

                const mergedSections = Array.from(new Set([
                  ...(localItem.sections || []),
                  ...(remoteItem.sections || []),
                  ...mergedAssignments.map(a => a.section)
                ]));

                const mergedSubjects = Array.from(new Set([
                  ...(localItem.subjects || []),
                  ...(remoteItem.subjects || []),
                  ...mergedAssignments.map(a => a.subject)
                ]));

                if (mergedAssignments.length === 0 && mergedClasses.length > 0 && mergedSections.length > 0 && mergedSubjects.length > 0) {
                  const rebuilt: any[] = [];
                  mergedClasses.forEach(c => {
                    mergedSections.forEach(sec => {
                      mergedSubjects.forEach(sub => {
                        rebuilt.push({ class: c, section: sec, subject: sub, specialty: remoteItem.specialty || localItem.specialty || '' });
                      });
                    });
                  });
                  mergedAssignments = rebuilt;
                }

                mergedMap.set(key, {
                  ...localItem,
                  ...remoteItem,
                  name: remoteItem.name || localItem.name,
                  role: remoteItem.role || localItem.role,
                  password: remoteItem.password || localItem.password || '12345',
                  contact: remoteItem.contact || localItem.contact || '',
                  specialty: remoteItem.specialty || localItem.specialty || '',
                  classes: mergedClasses.length > 0 ? mergedClasses : undefined,
                  sections: mergedSections.length > 0 ? mergedSections : undefined,
                  subjects: mergedSubjects.length > 0 ? mergedSubjects : undefined,
                  assignments: mergedAssignments.length > 0 ? mergedAssignments : undefined
                });
              }
            });

            const mergedList = Array.from(mergedMap.values());
            const sanitized = sanitizeStaffList(mergedList);
            setStaffList(sanitized);
            saveStaffToLocalStorage(sanitized);
            console.log('[SIGEP Sync] Utilizadores, credenciais e atribuições curriculares sincronizados com sucesso (fusão inteligente).');

            // Re-sincronizar dados consolidados de volta ao servidor backend
            fetchWithTimeout(`${apiUrl}/api/funcionarios/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sanitized)
            }, 5000).catch(err => console.warn('[SIGEP Sync] Aviso ao consolidar banco remoto:', err));
          }
        }
      } catch (e) {
        // Silencioso se o servidor backend offline
      }
    };
    autoSyncStaffOnBoot();
    return () => { isMounted = false; };
  }, [schoolSettings?.syncServerUrl]);

  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err: any) {
      clearTimeout(id);
      if (err.name === 'AbortError') {
        throw new Error(`Tempo limite esgotado (${timeoutMs / 1000}s) ao conectar ao servidor ${url}. O servidor não respondeu.`);
      }
      throw err;
    }
  };

  const handleUpdateSchoolSettings = (updated: SchoolSettings) => {
    setSchoolSettings(updated);
    safeSetItem(LOCAL_STORAGE_SCHOOL_SETTINGS_KEY, JSON.stringify(updated));

    // Always push settings update to local server API so schoolSettings (trimesters open/closed) are saved in PostgreSQL
    fetchWithTimeout('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolSettings: updated })
    }, 5000).catch(err => console.warn("Erro ao salvar config no Postgres:", err));

    if (updated.syncEnabled && updated.syncServerUrl) {
      const url = updated.syncServerUrl;
      if (url && typeof window !== 'undefined' && !url.includes(window.location.host)) {
        fetchWithTimeout(`${url}/api/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolSettings: updated })
        }, 5000).catch(err => console.warn("Erro ao salvar config no servidor remoto:", err));
      }
    }
  };

  const resolveWorkingApiUrl = async (configuredUrl?: string): Promise<string> => {
    let formatted = (configuredUrl || '').trim();
    if (formatted) {
      if (!/^https?:\/\//i.test(formatted)) formatted = 'http://' + formatted;
      formatted = formatted.replace(/\/$/, '');

      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${formatted}/api/health`, { signal: controller.signal, mode: 'cors' });
        clearTimeout(id);
        if (res.ok) return formatted;
      } catch (e) {
        console.warn(`[SIGEP Sync] Servidor no IP ${formatted} não respondeu ao teste. Verificando conexão local...`);
      }
    }

    // 1. Tentar caminho relativo da própria janela
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`/api/health`, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) return typeof window !== 'undefined' ? window.location.origin : '';
    } catch (e) {}

    // 2. Tentar http://localhost:3000
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`http://localhost:3000/api/health`, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) return 'http://localhost:3000';
    } catch (e) {}

    // 3. Fallback para formatted
    if (formatted) return formatted;
    return typeof window !== 'undefined' ? window.location.origin : '';
  };

  const pushData = async (
    settingsToUse = schoolSettings,
    onProgress?: (percent: number, stepMessage: string) => void
  ) => {
    onProgress?.(2, "Resolvendo e testando rota de conexão com o Servidor...");
    const url = await resolveWorkingApiUrl(settingsToUse.syncServerUrl);

    setVbaLog("Iniciando envio (Push) de dados locais para o banco PostgreSQL central...");
    onProgress?.(5, "Iniciando conexão e validação de dados...");

    // Envio fracionado em lotes (batching) para escalar com milhares de registros sem estourar tempo limite
    const sendBatchChunks = async (
      endpoint: string,
      items: any[],
      startPct: number,
      endPct: number,
      label: string
    ) => {
      if (!Array.isArray(items) || items.length === 0) {
        onProgress?.(endPct, `Sem dados em ${label}.`);
        const res = await fetchWithTimeout(`${url}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([])
        }, 15000);
        return res;
      }

      const chunkSize = 500; // Tamanho ideal do lote por requisição
      const totalChunks = Math.ceil(items.length / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        const chunk = items.slice(i * chunkSize, (i + 1) * chunkSize);
        const currentPct = Math.min(
          99,
          Math.round(startPct + ((i + 1) / totalChunks) * (endPct - startPct))
        );
        
        onProgress?.(
          currentPct,
          `A enviar ${label} (Lote ${i + 1}/${totalChunks} • ${chunk.length} de ${items.length} registros)...`
        );

        const res = await fetchWithTimeout(`${url}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk)
        }, 25000);

        if (!res.ok) throw new Error(`Erro ao sincronizar ${label} (Lote ${i + 1})`);
      }
    };

    // 1. Alunos (10% -> 30%)
    await sendBatchChunks('/api/alunos/sync', students, 10, 30, 'Cadastros e Alunos');

    // 2. Notas (30% -> 55%)
    await sendBatchChunks('/api/notas/sync', grades, 30, 55, 'Pautas e Lançamentos de Notas');

    // 3. Funcionários (55% -> 70%)
    await sendBatchChunks('/api/funcionarios/sync', staffList, 55, 70, 'Recursos Humanos e Docentes');

    // 4. Grelha Curricular (70% -> 82%)
    const savedGrelha = localStorage.getItem('sigep_grelha_curricular_pedagogia_v5_magisterio');
    const grelha = savedGrelha ? JSON.parse(savedGrelha) : carregarGrelhaCurricular();
    await sendBatchChunks('/api/grelha/sync', Array.isArray(grelha) ? grelha : [], 70, 82, 'Grelha Curricular');

    // 5. Propinas (82% -> 94%)
    const savedPropinas = localStorage.getItem('sigep_propinas_v1');
    const propinas = savedPropinas ? JSON.parse(savedPropinas) : [];
    await sendBatchChunks('/api/propinas/sync', Array.isArray(propinas) ? propinas : [], 82, 94, 'Finanças e Propinas');

    // 6. Configurações (94% -> 100%)
    onProgress?.(96, 'A enviar Parâmetros e Configurações da Instituição...');
    const resConfig = await fetchWithTimeout(`${url}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolSettings: settingsToUse })
    }, 12000);
    if (!resConfig.ok) throw new Error("Erro ao sincronizar configurações institucionais");

    onProgress?.(100, 'Sincronização global concluída com sucesso!');
    setVbaLog("Sincronização Push: Todos os dados locais foram carregados com sucesso no PostgreSQL!");

    return {
      studentsCount: students?.length || 0,
      staffCount: staffList?.length || 0,
      gradesCount: grades?.length || 0,
      propinasCount: Array.isArray(propinas) ? propinas.length : 0,
      grelhaCount: Array.isArray(grelha) ? grelha.length : 0
    };
  };

  const pullData = async (
    settingsToUse = schoolSettings,
    onProgress?: (percent: number, stepMessage: string) => void
  ) => {
    onProgress?.(2, "Resolvendo e testando rota de conexão com o Servidor...");
    const url = await resolveWorkingApiUrl(settingsToUse.syncServerUrl);

    setVbaLog("Buscando dados remotos do PostgreSQL central...");
    onProgress?.(5, 'A conectar ao banco PostgreSQL central...');

    // 1. Alunos (5% -> 25%)
    onProgress?.(15, 'A importar Cadastros, Matrículas e Estudantes...');
    const resAlunos = await fetchWithTimeout(`${url}/api/alunos`, {}, 12000);
    if (!resAlunos.ok) throw new Error("Falha ao buscar alunos do servidor");
    const gotStudents = await resAlunos.json();

    // 2. Notas (25% -> 50%)
    onProgress?.(35, 'A importar Pautas, Mini-Pautas e Avaliações...');
    const resNotas = await fetchWithTimeout(`${url}/api/notas`, {}, 15000);
    if (!resNotas.ok) throw new Error("Falha ao buscar notas do servidor");
    const gotGrades = await resNotas.json();

    // 3. Funcionários (50% -> 70%)
    onProgress?.(60, 'A importar Recursos Humanos e Docentes...');
    const resStaff = await fetchWithTimeout(`${url}/api/funcionarios`, {}, 12000);
    if (!resStaff.ok) throw new Error("Falha ao buscar funcionários do servidor");
    const gotStaff = await resStaff.json();

    // 4. Propinas (70% -> 85%)
    onProgress?.(75, 'A importar Finanças, Recibos e Mensalidades...');
    const resPropinas = await fetchWithTimeout(`${url}/api/propinas`, {}, 12000);
    if (!resPropinas.ok) throw new Error("Falha ao buscar propinas do servidor");
    const gotPropinas = await resPropinas.json();

    // 5. Grelha Curricular (85% -> 92%)
    onProgress?.(88, 'A importar Grelha Curricular e Matrizes...');
    let gotGrelha = null;
    try {
      const resGrelha = await fetchWithTimeout(`${url}/api/grelha`, {}, 10000);
      if (resGrelha.ok) {
        gotGrelha = await resGrelha.json();
      }
    } catch (e) {
      console.warn("Falha ao carregar grelha curricular remota, usando local:", e);
    }

    // 6. Configurações da Escola e Trimestres (92% -> 96%)
    onProgress?.(93, 'A importar Configurações Institucionais e Estado dos Trimestres...');
    try {
      const resConfig = await fetchWithTimeout(`${url}/api/config`, {}, 10000);
      if (resConfig.ok) {
        const gotConfig = await resConfig.json();
        if (gotConfig && gotConfig.schoolSettings) {
          setSchoolSettings(prev => ({ ...prev, ...gotConfig.schoolSettings }));
          safeSetItem(LOCAL_STORAGE_SCHOOL_SETTINGS_KEY, JSON.stringify(gotConfig.schoolSettings));
        }
      }
    } catch (e) {
      console.warn("Falha ao carregar configurações remotas:", e);
    }

    // 7. Desbloqueios Temporários e Solicitações de Alteração de Notas (96% -> 98%)
    try {
      const resUnlocks = await fetchWithTimeout(`${url}/api/unlocks`, {}, 10000);
      if (resUnlocks.ok) {
        const gotUnlocks = await resUnlocks.json();
        if (Array.isArray(gotUnlocks)) {
          safeSetItem('sigep_temporary_unlocks_v1', JSON.stringify(gotUnlocks));
        }
      }
    } catch (e) {}

    try {
      const resGradeReqs = await fetchWithTimeout(`${url}/api/grade_requests`, {}, 10000);
      if (resGradeReqs.ok) {
        const gotReqs = await resGradeReqs.json();
        if (Array.isArray(gotReqs)) {
          setGradeRequests(gotReqs);
          safeSetItem('sigep_grade_requests_v1', JSON.stringify(gotReqs));
        }
      }
    } catch (e) {}

    // Process & Save
    onProgress?.(98, 'A atualizar banco de dados local e memória...');
    setStudents(gotStudents);
    setGrades(gotGrades);
    setStaffList(gotStaff);

    safeSetItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(gotStudents));
    safeSetItem(LOCAL_STORAGE_GRADES_KEY, JSON.stringify(gotGrades));
    safeSetItem(LOCAL_STORAGE_STAFF_KEY, JSON.stringify(gotStaff));
    safeSetItem('sigep_propinas_v1', JSON.stringify(gotPropinas));
    if (gotGrelha && gotGrelha.length > 0) {
      safeSetItem('sigep_grelha_curricular_pedagogia_v5_magisterio', JSON.stringify(gotGrelha));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sigep:data-updated'));
    }

    onProgress?.(100, 'Importação global concluída com sucesso!');
    setVbaLog("Importação concluída: Todos os dados foram atualizados a partir do PostgreSQL!");

    return {
      studentsCount: Array.isArray(gotStudents) ? gotStudents.length : 0,
      staffCount: Array.isArray(gotStaff) ? gotStaff.length : 0,
      gradesCount: Array.isArray(gotGrades) ? gotGrades.length : 0,
      propinasCount: Array.isArray(gotPropinas) ? gotPropinas.length : 0,
      grelhaCount: Array.isArray(gotGrelha) ? gotGrelha.length : 0
    };
  };

  // Sincronizar dados do perfil logado (ex: disciplinas atribuídas ao professor) quando staffList é atualizado via IP
  useEffect(() => {
    if (loggedInStaff && loggedInStaff.id) {
      const currentInList = staffList.find(s => String(s.id).trim().toUpperCase() === String(loggedInStaff.id).trim().toUpperCase());
      if (currentInList) {
        const hasChangedAssignments = JSON.stringify(currentInList.assignments || []) !== JSON.stringify(loggedInStaff.assignments || []);
        const hasChangedRole = currentInList.role !== loggedInStaff.role;
        if (hasChangedAssignments || hasChangedRole) {
          setLoggedInStaff(currentInList);
          safeSetSessionItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY, JSON.stringify(currentInList));
        }
      }
    }
  }, [staffList]);

  // Automatic Sync Pull on Mount (Garante que qualquer navegador cliente no Wi-Fi/LAN receba os dados do Servidor Central)
  useEffect(() => {
    const autoPullOnStart = async () => {
      try {
        let baseUrl = schoolSettings.syncEnabled && schoolSettings.syncServerUrl ? schoolSettings.syncServerUrl : '';
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
            baseUrl = '';
          }
        }
        
        // 1. Funcionários
        let resStaff = await fetchWithTimeout(`${baseUrl}/api/funcionarios`, {}, 4000).catch(() => null);
        if ((!resStaff || !resStaff.ok) && baseUrl !== '') {
          resStaff = await fetchWithTimeout('/api/funcionarios', {}, 4000).catch(() => null);
        }
        if (resStaff && resStaff.ok) {
          const gotStaff = await resStaff.json();
          if (Array.isArray(gotStaff) && gotStaff.length > 0) {
            setStaffList(gotStaff);
            safeSetItem(LOCAL_STORAGE_STAFF_KEY, JSON.stringify(gotStaff));
          }
        }

        // 2. Alunos
        let resAlunos = await fetchWithTimeout(`${baseUrl}/api/alunos`, {}, 4000).catch(() => null);
        if ((!resAlunos || !resAlunos.ok) && baseUrl !== '') {
          resAlunos = await fetchWithTimeout('/api/alunos', {}, 4000).catch(() => null);
        }
        if (resAlunos && resAlunos.ok) {
          const gotStudents = await resAlunos.json();
          if (Array.isArray(gotStudents) && gotStudents.length > 0) {
            setStudents(gotStudents);
            safeSetItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(gotStudents));
          }
        }

        // 3. Notas
        let resNotas = await fetchWithTimeout(`${baseUrl}/api/notas`, {}, 4000).catch(() => null);
        if ((!resNotas || !resNotas.ok) && baseUrl !== '') {
          resNotas = await fetchWithTimeout('/api/notas', {}, 4000).catch(() => null);
        }
        if (resNotas && resNotas.ok) {
          const gotGrades = await resNotas.json();
          if (Array.isArray(gotGrades) && gotGrades.length > 0) {
            setGrades(gotGrades);
            safeSetItem(LOCAL_STORAGE_GRADES_KEY, JSON.stringify(gotGrades));
          }
        }

        // 4. Propinas
        let resPropinas = await fetchWithTimeout(`${baseUrl}/api/propinas`, {}, 4000).catch(() => null);
        if ((!resPropinas || !resPropinas.ok) && baseUrl !== '') {
          resPropinas = await fetchWithTimeout('/api/propinas', {}, 4000).catch(() => null);
        }
        if (resPropinas && resPropinas.ok) {
          const gotPropinas = await resPropinas.json();
          safeSetItem('sigep_propinas_v1', JSON.stringify(gotPropinas));
        }

        // 5. Configuração da Escola
        let resConfig = await fetchWithTimeout(`${baseUrl}/api/config`, {}, 4000).catch(() => null);
        if ((!resConfig || !resConfig.ok) && baseUrl !== '') {
          resConfig = await fetchWithTimeout('/api/config', {}, 4000).catch(() => null);
        }
        if (resConfig && resConfig.ok) {
          const gotConfig = await resConfig.json();
          if (gotConfig && gotConfig.schoolSettings) {
            setSchoolSettings(prev => ({ ...prev, ...gotConfig.schoolSettings }));
            safeSetItem(LOCAL_STORAGE_SCHOOL_SETTINGS_KEY, JSON.stringify(gotConfig.schoolSettings));
          }
        }

        // 6. Desbloqueios Temporários e Solicitações de Alteração de Notas
        let resUnlocks = await fetchWithTimeout(`${baseUrl}/api/unlocks`, {}, 4000).catch(() => null);
        if ((!resUnlocks || !resUnlocks.ok) && baseUrl !== '') {
          resUnlocks = await fetchWithTimeout('/api/unlocks', {}, 4000).catch(() => null);
        }
        if (resUnlocks && resUnlocks.ok) {
          const gotUnlocks = await resUnlocks.json();
          if (Array.isArray(gotUnlocks)) {
            safeSetItem('sigep_temporary_unlocks_v1', JSON.stringify(gotUnlocks));
          }
        }

        let resReqs = await fetchWithTimeout(`${baseUrl}/api/grade_requests`, {}, 4000).catch(() => null);
        if ((!resReqs || !resReqs.ok) && baseUrl !== '') {
          resReqs = await fetchWithTimeout('/api/grade_requests', {}, 4000).catch(() => null);
        }
        if (resReqs && resReqs.ok) {
          const gotReqs = await resReqs.json();
          if (Array.isArray(gotReqs)) {
            setGradeRequests(gotReqs);
            safeSetItem('sigep_grade_requests_v1', JSON.stringify(gotReqs));
          }
        }

        setVbaLog("Sincronização Automática: Todos os dados foram atualizados com sucesso a partir do Servidor Central!");
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sigep:data-updated'));
        }
      } catch (err: any) {
        setVbaLog(`Aviso de Sincronização: Executando no modo local offline.`);
      }
    };

    autoPullOnStart();
  }, []);

  // Motor de Sincronização Contínua e Instantânea em Tempo Real via LAN / Wi-Fi (SSE + Polling de Alta Velocidade < 2s)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollTimer: any = null;
    let fastTimer: any = null;
    let lastKnownVersion = 0;

    const syncFastLightweightData = async () => {
      try {
        let baseUrl = schoolSettings.syncEnabled && schoolSettings.syncServerUrl ? schoolSettings.syncServerUrl : '';
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) baseUrl = '';
        }

        // 1. Solicitações de alteração de notas (Grade Requests) - Resposta imediata para o Director Geral
        const resReqs = await fetch(`${baseUrl}/api/grade_requests`).catch(() => null);
        if (resReqs && resReqs.ok) {
          const gotReqs = await resReqs.json();
          if (Array.isArray(gotReqs)) {
            setGradeRequests(gotReqs);
            safeSetItem('sigep_grade_requests_v1', JSON.stringify(gotReqs));
          }
        }

        // 2. Registos do Ponto Digital (Presenças e Faltas)
        const resPonto = await fetch(`${baseUrl}/api/ponto_records`).catch(() => null);
        if (resPonto && resPonto.ok) {
          const gotPonto = await resPonto.json();
          if (Array.isArray(gotPonto)) {
            setPontoRecords(gotPonto);
            safeSetItem('sigep_ponto_digital_records', JSON.stringify(gotPonto));
            runAutoAbsenceEngine(staffList, gotPonto);
          }
        }

        // 3. Desbloqueios temporários de notas
        const resUnlocks = await fetch(`${baseUrl}/api/unlocks`).catch(() => null);
        if (resUnlocks && resUnlocks.ok) {
          const gotUnlocks = await resUnlocks.json();
          if (Array.isArray(gotUnlocks)) {
            safeSetItem('sigep_temporary_unlocks_v1', JSON.stringify(gotUnlocks));
          }
        }
      } catch {}
    };

    const setupRealtimeConnection = () => {
      try {
        const streamUrl = schoolSettings.syncEnabled && schoolSettings.syncServerUrl 
          ? `${schoolSettings.syncServerUrl}/api/realtime/events`
          : '/api/realtime/events';

        eventSource = new EventSource(streamUrl);

        eventSource.addEventListener('DATA_UPDATED', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            syncFastLightweightData();
            if (data.timestamp && data.timestamp > lastKnownVersion) {
              lastKnownVersion = data.timestamp;
              pullData().catch(() => {});
            }
          } catch (err) {
            console.warn("Erro ao processar evento de sincronização em tempo real:", err);
          }
        });

        eventSource.onerror = () => {
          // Fallback silencioso mantendo o canal limpo
        };
      } catch (err) {
        console.warn("Sincronização SSE em tempo real indisponível. Recorrendo ao polling de contingência.");
      }
    };

    setupRealtimeConnection();
    syncFastLightweightData();

    // Polling rápido a cada 2 segundos para solicitações e ponto digital
    fastTimer = setInterval(syncFastLightweightData, 2000);

    // Polling de contingência a cada 4 segundos para a versão global de tabelas grandes
    pollTimer = setInterval(async () => {
      try {
        const versionUrl = schoolSettings.syncEnabled && schoolSettings.syncServerUrl 
          ? `${schoolSettings.syncServerUrl}/api/realtime/version`
          : '/api/realtime/version';

        const res = await fetch(versionUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.version && data.version > lastKnownVersion) {
            syncFastLightweightData();
            if (lastKnownVersion > 0) {
              pullData().catch(() => {});
            }
            lastKnownVersion = data.version;
          }
        }
      } catch {}
    }, 4000);

    const handleWindowEvents = () => syncFastLightweightData();
    window.addEventListener('sigep_request_created', handleWindowEvents);
    window.addEventListener('sigep_ponto_updated', handleWindowEvents);
    window.addEventListener('sigep:data-updated', handleWindowEvents);

    return () => {
      if (eventSource) eventSource.close();
      if (pollTimer) clearInterval(pollTimer);
      if (fastTimer) clearInterval(fastTimer);
      window.removeEventListener('sigep_request_created', handleWindowEvents);
      window.removeEventListener('sigep_ponto_updated', handleWindowEvents);
      window.removeEventListener('sigep:data-updated', handleWindowEvents);
    };
  }, [schoolSettings.syncEnabled, schoolSettings.syncServerUrl, staffList, runAutoAbsenceEngine]);

  // Proteção de rotas em tempo real: verifica se o Diretor Geral já existe na base de dados (hasDirectorGeral)
  useEffect(() => {
    const verificarPresencaDirectorGeral = async () => {
      // 1. Verificar na base de dados do Postgres
      let backendHasDirector = false;
      try {
        const res = await fetch('/api/auth/check-director');
        if (res.ok) {
          const data = await res.json();
          backendHasDirector = data.hasDirector === true;
        }
      } catch (e) {
        // Fallback para offline se falhar a ligação ao backend
      }

      // 2. Verificar na staffList local
      const localHasDirector = staffList.some(s => s.role === 'DIRECTOR_GERAL');

      const hasDirector = localHasDirector || backendHasDirector;

      // Se não há Diretor Geral cadastrado (seja no Postgres ou localmente no React)
      if (!hasDirector) {
        // Se houver algum utilizador logado que não seja o Administrador SIGEP, forçar logout imediato
        if (loggedInStaff && loggedInStaff.id !== 'SIGEP' && loggedInStaff.id !== 'ADMIN_SIGEP' && !loggedInStaff.is_root) {
          console.warn("Segurança do Core: Detetada tentativa de acesso sem Diretor Geral. Forçando logout para primeiro arranque.");
          setLoggedInStaff(null);
          localStorage.removeItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY);
        }
      }
    };

    verificarPresencaDirectorGeral();
  }, [staffList, loggedInStaff]);

  const handleLoginSuccess = (staff: Staff) => {
    setLoggedInStaff(staff);
    safeSetSessionItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY, JSON.stringify(staff));
    safeRemoveItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY);
    try {
      localStorage.removeItem('sigep_session_locked_v1');
      sessionStorage.removeItem('sigep_session_locked_v1');
    } catch (e) {}

    // set appropriate role simulation
    if (staff.role === 'DIRECTOR_GERAL' || staff.role === 'SUB_DIRECTOR_PEDAGOGICO' || staff.role === 'SUB_DIRECTOR_ADMINISTRATIVO') {
      setUserRole('SUB_DIRECTOR_PEDAGOGICO');
    } else if (staff.role === 'CHEFE_SECRETARIA') {
      setUserRole('SECRETARIO');
    } else if (staff.role === 'PROFESSOR') {
      setUserRole('PROFESSOR');
      setActiveTab('PAINEL_MINI_PAUTAS');
      
      // Also automatically pre-fill A1 (Class) and A2 (Section) with one of their class/sections if assigned
      if (staff.classes && staff.classes.length > 0) {
        setCurrentClass(staff.classes[0]);
      }
      if (staff.sections && staff.sections.length > 0) {
        setCurrentSection(staff.sections[0]);
      }
    }

    // Set Welcome Toast Notification in the requested format
    const cargo = 
      staff.role === 'DIRECTOR_GERAL' ? 'Director Geral' :
      staff.role === 'SUB_DIRECTOR_PEDAGOGICO' ? 'Subdirector Pedagógico' :
      staff.role === 'SUB_DIRECTOR_ADMINISTRATIVO' ? 'Subdirector Administrativo' :
      staff.role === 'CHEFE_SECRETARIA' ? 'Chefe de Secretaria' :
      staff.role === 'COORDENADOR_TURNO' ? 'Coordenador de Turno' :
      staff.role === 'COORDENADOR_DISCIPLINA' ? 'Coordenador de Disciplina' :
      staff.role === 'PROFESSOR' ? 'Professor' : staff.role;

    setWelcomeToast(`${staff.name} (${cargo}), seja bem-vindo ao SIGEP-Académico; Sistema Integrado de Gestão Escolar Profissional.`);
    
    // Automatically close toast after 10 seconds to keep it non-intrusive
    setTimeout(() => {
      setWelcomeToast(prev => {
        // Only clear if it matches the current user's toast
        if (prev && prev.startsWith(staff.name)) {
          return null;
        }
        return prev;
      });
    }, 10000);
  };

  const handleLogout = (overrideStaffList?: Staff[]) => {
    // 1. Gravação automática de dados pendentes para integridade
    try {
      const staffToSave = overrideStaffList || staffList;
      safeSetItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(students));
      safeSetItem(LOCAL_STORAGE_GRADES_KEY, JSON.stringify(grades));
      safeSetItem(LOCAL_STORAGE_STAFF_KEY, JSON.stringify(staffToSave));
      safeSetItem(LOCAL_STORAGE_SCHOOL_SETTINGS_KEY, JSON.stringify(schoolSettings));
      
      logAction(loggedInStaff?.name || 'Utilizador', 'Encerramento de sessão seguro e auto-gravação de dados concluída', 'Segurança');
      
      // Acionar backup automático silencioso de término de sessão no servidor
      fetch('/api/backup/auto', { method: 'POST' }).catch(() => {});
    } catch (err) {
      console.warn("Erro ao gravar dados no encerramento:", err);
    }

    // 2. Invalidação imediata do token / credencial de sessão
    setLoggedInStaff(null);
    try {
      safeRemoveSessionItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY);
      safeRemoveItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY);
      sessionStorage.removeItem('sigep_session_locked_v1');
      localStorage.removeItem('sigep_session_locked_v1');
      localStorage.removeItem('sigep_active_tab_v1');
    } catch (e) {
      console.warn(e);
    }
    setActiveTab('HOME');

    // 3. Fecho seguro / Recarga limpa de estado
    setVbaLog("Sessão encerrada com segurança! Redirecionando...");
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const handleAddStaff = (newStaff: Staff, originalId?: string) => {
    const targetId = originalId || newStaff.id;

    // Bloqueio rigoroso de cargos de chefia únicos/exclusivos
    const exclusiveRoles = [
      'DIRECTOR_GERAL',
      'SUB_DIRECTOR_PEDAGOGICO',
      'SUB_DIRECTOR_ADMINISTRATIVO',
      'CHEFE_SECRETARIA'
    ];

    if (exclusiveRoles.includes(newStaff.role)) {
      const existingConflict = staffList.find(s => s.role === newStaff.role && s.id !== targetId);
      if (existingConflict) {
        const roleLabel = newStaff.role === 'DIRECTOR_GERAL' ? 'Director Geral'
          : newStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' ? 'Subdirector Pedagógico'
          : newStaff.role === 'SUB_DIRECTOR_ADMINISTRATIVO' ? 'Subdirector Administrativo'
          : 'Chefe de Secretaria';
        alert(`Bloqueio de Cargo Único: O cargo de chefia de "${roleLabel}" já se encontra preenchido por "${existingConflict.name}" (ID: ${existingConflict.id}). O sistema não permite publicar ou atribuir o mesmo cargo de chefia a mais de um colaborador.`);
        return;
      }
    }

    const existingStaff = staffList.find(s => s.id === targetId);

    // Preservar e fundir atribuições e disciplinas existentes para que o histórico e o cadastro do professor nunca sumam
    let mergedAssignments = (newStaff.assignments && newStaff.assignments.length > 0)
      ? newStaff.assignments
      : (existingStaff?.assignments && existingStaff.assignments.length > 0 ? existingStaff.assignments : (newStaff.assignments || []));

    const mergedSubjects = Array.from(new Set([
      ...(existingStaff?.subjects || []),
      ...(newStaff.subjects || []),
      ...((mergedAssignments || []).map(a => a.subject) as SubjectType[])
    ]));

    const mergedClasses = Array.from(new Set([
      ...(existingStaff?.classes || []),
      ...(newStaff.classes || []),
      ...((mergedAssignments || []).map(a => a.class))
    ]));

    const mergedSections = Array.from(new Set([
      ...(existingStaff?.sections || []),
      ...(newStaff.sections || []),
      ...((mergedAssignments || []).map(a => a.section))
    ]));

    if (mergedAssignments.length === 0 && mergedClasses.length > 0 && mergedSections.length > 0 && mergedSubjects.length > 0) {
      const rebuilt: any[] = [];
      mergedClasses.forEach(c => {
        mergedSections.forEach(sec => {
          mergedSubjects.forEach(sub => {
            rebuilt.push({ class: c, section: sec, subject: sub, specialty: newStaff.specialty || existingStaff?.specialty });
          });
        });
      });
      mergedAssignments = rebuilt;
    }

    const sanitizedNewStaff: Staff = {
      ...existingStaff,
      ...newStaff,
      classes: mergedClasses.length > 0 ? mergedClasses : undefined,
      sections: mergedSections.length > 0 ? mergedSections : undefined,
      subjects: mergedSubjects.length > 0 ? mergedSubjects : undefined,
      assignments: (mergedAssignments && mergedAssignments.length > 0) ? mergedAssignments : undefined
    };

    localStorage.removeItem('sigep_rh_cleared');

    let updated: Staff[];
    if (existingStaff) {
      updated = staffList.map(s => s.id === targetId ? { ...sanitizedNewStaff, password: sanitizedNewStaff.password || s.password || '12345' } : s);
    } else {
      updated = [...staffList, { ...sanitizedNewStaff, password: sanitizedNewStaff.password || '12345' }];
    }
    const sanitized = sanitizeStaffList(updated);
    setStaffList(sanitized);
    saveStaffToLocalStorage(sanitized);

    console.log(`[VERIFICAÇÃO DE PERSISTÊNCIA APÓS handleAddStaff - ID: ${targetId}] Professores persistidos no estado e localStorage:`,
      sanitized.filter(s => s.role === 'PROFESSOR').map(p => ({
        id: p.id,
        name: p.name,
        subjects: p.subjects,
        assignmentsCount: p.assignments?.length || 0,
        classes: p.classes,
        sections: p.sections
      }))
    );

    if (loggedInStaff && loggedInStaff.id === targetId) {
      const updatedLoggedIn = { ...sanitizedNewStaff, password: sanitizedNewStaff.password || loggedInStaff.password || '12345' };
      setLoggedInStaff(updatedLoggedIn);
      safeSetItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY, JSON.stringify(updatedLoggedIn));
      
      if (updatedLoggedIn.role === 'DIRECTOR_GERAL' || updatedLoggedIn.role === 'SUB_DIRECTOR_PEDAGOGICO' || updatedLoggedIn.role === 'SUB_DIRECTOR_ADMINISTRATIVO') {
        setUserRole('SUB_DIRECTOR_PEDAGOGICO');
      } else if (updatedLoggedIn.role === 'CHEFE_SECRETARIA') {
        setUserRole('SECRETARIO');
      } else if (updatedLoggedIn.role === 'PROFESSOR') {
        setUserRole('PROFESSOR');
      }
    }

    // Always sync locally with server endpoint
    fetch('/api/funcionarios/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(err => console.warn("Erro ao sincronizar funcionários localmente:", err));

    // Trigger de Autodestruição Visual / Ocultação Automática se o Administrador SIGEP cadastrar o Diretor Geral
    const isRootUser = loggedInStaff && (loggedInStaff.id === 'SIGEP' || loggedInStaff.id === 'ADMIN_SIGEP' || loggedInStaff.role === 'SIGEP' || loggedInStaff.is_root);
    const isAddingDirector = newStaff.role === 'DIRECTOR_GERAL';

    if (schoolSettings.syncEnabled && schoolSettings.syncServerUrl) {
      // If the ID was changed, delete the old ID on the Postgres server to prevent duplicate active records
      if (originalId && originalId !== newStaff.id) {
        fetch(`${schoolSettings.syncServerUrl}/api/funcionarios/${originalId}`, {
          method: 'DELETE'
        }).catch(err => console.warn("Erro ao apagar ID antigo de funcionário no Postgres:", err));
      }

      fetch(`${schoolSettings.syncServerUrl}/api/funcionarios/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      })
      .then(() => {
        if (isRootUser && isAddingDirector) {
          alert("Escola Ativada com Sucesso! O perfil de Administrador SIGEP foi ocultado e a sessão será encerrada para dar lugar à liderança do Diretor Geral.");
          handleLogout(updated);
        }
      })
      .catch(err => {
        console.warn("Erro ao salvar funcionarios no Postgres:", err);
        if (isRootUser && isAddingDirector) {
          alert("Escola Ativada com Sucesso! O perfil de Administrador SIGEP foi ocultado e a sessão será encerrada para dar lugar à liderança do Diretor Geral.");
          handleLogout(updated);
        }
      });
    } else {
      if (isRootUser && isAddingDirector) {
        alert("Escola Ativada com Sucesso! O perfil de Administrador SIGEP foi ocultado e a sessão será encerrada para dar lugar à liderança do Diretor Geral.");
        handleLogout(updated);
      }
    }
  };

  const getDirectorPassword = () => {
    const dir = staffList.find(s => s.role === 'DIRECTOR_GERAL');
    return dir?.password || '12345';
  };

  const handleDeleteStaff = (id: string) => {
    const updated = staffList.filter(s => s.id !== id);
    const sanitized = sanitizeStaffList(updated);
    setStaffList(sanitized);
    saveStaffToLocalStorage(sanitized);

    console.log(`[VERIFICAÇÃO DE PERSISTÊNCIA APÓS handleDeleteStaff - ID removido: ${id}] Professores restantes no estado e localStorage:`,
      sanitized.filter(s => s.role === 'PROFESSOR').map(p => ({
        id: p.id,
        name: p.name,
        subjects: p.subjects,
        assignmentsCount: p.assignments?.length || 0
      }))
    );

    // Sempre apagar no backend local
    fetch(`/api/funcionarios/${id}`, { method: 'DELETE' }).catch(() => null);

    if (schoolSettings.syncEnabled && schoolSettings.syncServerUrl) {
      // Delete from remote PostgreSQL server
      fetch(`${schoolSettings.syncServerUrl}/api/funcionarios/${id}`, {
        method: 'DELETE'
      }).catch(err => console.warn("Erro ao apagar funcionario no Postgres:", err));
    }
  };

  const handleUpdateStaffPassword = (id: string, newPassword: string) => {
    const updated = staffList.map(s => s.id === id ? { ...s, password: newPassword } : s);
    setStaffList(updated);
    safeSetItem(LOCAL_STORAGE_STAFF_KEY, JSON.stringify(updated));
    if (loggedInStaff && loggedInStaff.id === id) {
      const updatedLoggedIn = { ...loggedInStaff, password: newPassword };
      setLoggedInStaff(updatedLoggedIn);
      safeSetItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY, JSON.stringify(updatedLoggedIn));
    }

    // Sempre sincronizar a nova senha com o servidor Express local (PostgreSQL)
    fetch('/api/funcionarios/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(err => console.warn("Erro ao sincronizar senha no backend local:", err));

    if (schoolSettings.syncEnabled && schoolSettings.syncServerUrl) {
      fetch(`${schoolSettings.syncServerUrl}/api/funcionarios/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(err => console.warn("Erro ao salvar funcionarios no Postgres:", err));
    }
  };

  // Sync to localstorage & backend
  const saveState = (updatedStudents: Student[], updatedGrades: GradeRow[]) => {
    setStudents(updatedStudents);
    setGrades(updatedGrades);
    safeSetItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(updatedStudents));
    safeSetItem(LOCAL_STORAGE_GRADES_KEY, JSON.stringify(updatedGrades));

    // Sempre envia a atualização para o backend local Express em tempo real
    fetch('/api/alunos/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedStudents)
    }).catch(err => console.warn("Erro ao sincronizar alunos com o backend local:", err));

    fetch('/api/notas/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedGrades)
    }).catch(err => console.warn("Erro ao sincronizar notas com o backend local:", err));

    // Sincronização secundária para Servidor PostgreSQL remoto caso configurado
    if (schoolSettings.syncEnabled && schoolSettings.syncServerUrl) {
      const url = schoolSettings.syncServerUrl;
      fetch(`${url}/api/alunos/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStudents)
      }).catch(err => console.warn("Erro ao salvar alunos no Postgres:", err));

      fetch(`${url}/api/notas/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedGrades)
      }).catch(err => console.warn("Erro ao salvar notas no Postgres:", err));
    }
  };

  // Add new student
  const handleAddStudent = (newStudent: Student) => {
    if (diasRestantes <= 0) {
      setVbaLog("Operação cancelada: O sistema está bloqueado por falta de licença ativa.");
      return;
    }
    const exists = students.some(s => s.id === newStudent.id);
    let updated: Student[];
    let newGrades = [...grades];
    if (exists) {
      // It's an update!
      updated = students.map(s => s.id === newStudent.id ? newStudent : s);
      // Update student name in all grade records if it changed!
      newGrades = grades.map(g => g.studentId === newStudent.id ? { ...g, studentName: newStudent.name } : g);
    } else {
      // New student!
      updated = [...students, newStudent];
      // Pre-create blank grade records for all class level subjects and 3 trimesters
      const subjects = getSubjectsForClass(newStudent.class);
      subjects.forEach(sub => {
        (['I', 'II', 'III'] as const).forEach(tri => {
          newGrades.push({
            studentId: newStudent.id,
            studentName: newStudent.name,
            subject: sub as SubjectType,
            trimester: tri,
            mac: null,
            npt: null,
            mt: null
          });
        });
      });
    }
    saveState(updated, newGrades);
  };

  // Delete student
  const handleDeleteStudent = (id: string) => {
    if (diasRestantes <= 0) {
      setVbaLog("Operação cancelada: O sistema está bloqueado por falta de licença ativa.");
      return;
    }

    const directorPass = getDirectorPassword();
    const senha = prompt("Aviso de Segurança (Eliminação de Aluno):\nEsta operação é irreversível.\nDigite a senha do perfil Diretor Geral para validar a eliminação de aluno:");
    if (senha === null) return;
    if (senha !== directorPass) {
      alert("Operação rejeitada: Senha do Diretor Geral inválida.");
      return;
    }

    const updatedStudents = students.filter(s => s.id !== id);
    const updatedGrades = grades.filter(g => g.studentId !== id);
    saveState(updatedStudents, updatedGrades);

    if (schoolSettings.syncEnabled && schoolSettings.syncServerUrl) {
      fetch(`${schoolSettings.syncServerUrl}/api/alunos/${id}`, {
        method: 'DELETE'
      }).catch(err => console.warn("Erro ao apagar aluno no Postgres:", err));
    }
  };

  // Update a grade's MT directly
  const handleUpdateGradeMT = (
    studentId: string,
    subject: SubjectType,
    trimester: 'I' | 'II' | 'III',
    value: number | null
  ) => {
    const canEditGrades = canUserEditModule('MINI_PAUTAS') || canUserEditModule('PAUTAS') || canUserEditModule('BANCO_DE_DADOS');
    if (!canEditGrades) {
      window.alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    if (diasRestantes <= 0) {
      setVbaLog("Edição bloqueada: O sistema está em modo leitura devido à expiração da licença.");
      return;
    }
    const studentObj = students.find(s => s.id === studentId);
    const studentName = studentObj ? studentObj.name : studentId;
    const exists = grades.some(row => row.studentId === studentId && row.subject === subject && row.trimester === trimester);
    let updated: GradeRow[];
    if (exists) {
      updated = grades.map(row => {
        if (row.studentId === studentId && row.subject === subject && row.trimester === trimester) {
          return {
            ...row,
            mt: value,
            mac: value !== null ? value : row.mac,
            npt: value !== null ? value : row.npt
          };
        }
        return row;
      });
    } else {
      updated = [...grades, {
        studentId,
        studentName,
        subject,
        trimester,
        mac: value,
        npp: null,
        npt: value,
        mt: value
      }];
    }
    saveState(students, updated);
  };

  // Update specific fields like MAc or npt (used in the TM1 sheet cells editing)
  const handleUpdateGradeFields = (
    studentId: string,
    subject: SubjectType,
    trimester: 'I' | 'II' | 'III',
    fields: { mac?: number | null; npp?: number | null; npt?: number | null; mt?: number | null }
  ) => {
    const canEditGrades = canUserEditModule('MINI_PAUTAS') || canUserEditModule('PAUTAS') || canUserEditModule('BANCO_DE_DADOS');
    if (!canEditGrades) {
      window.alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    if (diasRestantes <= 0) {
      setVbaLog("Edição bloqueada: O sistema está em modo leitura devido à expiração da licença.");
      return;
    }
    const studentObj = students.find(s => s.id === studentId);
    const studentName = studentObj ? studentObj.name : studentId;
    const exists = grades.some(row => row.studentId === studentId && row.subject === subject && row.trimester === trimester);
    let updated: GradeRow[];
    if (exists) {
      updated = grades.map(row => {
        if (row.studentId === studentId && row.subject === subject && row.trimester === trimester) {
          return {
            ...row,
            ...fields
          };
        }
        return row;
      });
    } else {
      const newRow: GradeRow = {
        studentId,
        studentName,
        subject,
        trimester,
        mac: fields.mac ?? null,
        npp: fields.npp ?? null,
        npt: fields.npt ?? null,
        mt: fields.mt ?? null
      };
      updated = [...grades, newRow];
    }
    saveState(students, updated);
  };

  // Update specific field inside raw table
  const handleUpdateRawValue = (
    studentId: string,
    subject: SubjectType,
    trimester: 'I' | 'II' | 'III',
    field: 'mac' | 'npp' | 'npt' | 'mt',
    value: number | null
  ) => {
    const canEditGrades = canUserEditModule('MINI_PAUTAS') || canUserEditModule('PAUTAS') || canUserEditModule('BANCO_DE_DADOS');
    if (!canEditGrades) {
      window.alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    if (diasRestantes <= 0) {
      setVbaLog("Edição bloqueada: O sistema está em modo leitura devido à expiração da licença.");
      return;
    }
    const studentObj = students.find(s => s.id === studentId);
    const studentName = studentObj ? studentObj.name : studentId;
    const exists = grades.some(row => row.studentId === studentId && row.subject === subject && row.trimester === trimester);
    let updated: GradeRow[];
    if (exists) {
      updated = grades.map(row => {
        if (row.studentId === studentId && row.subject === subject && row.trimester === trimester) {
          const item = { ...row, [field]: value };
          // Recalculate MT dynamically if changing mac or npt or npp
          if (field === 'mac' || field === 'npt' || field === 'npp') {
            const macVal = item.mac ?? 0;
            const nppVal = item.npp ?? 0;
            const nptVal = item.npt ?? 0;
            item.mt = useNpp
              ? parseFloat(((macVal + nppVal + nptVal) / 3).toFixed(1))
              : parseFloat(((macVal + nptVal) / 2).toFixed(1));
          }
          return item;
        }
        return row;
      });
    } else {
      const macVal = field === 'mac' ? value : null;
      const nppVal = field === 'npp' ? value : null;
      const nptVal = field === 'npt' ? value : null;
      let mtVal = field === 'mt' ? value : null;
      if (mtVal === null && (macVal !== null || nppVal !== null || nptVal !== null)) {
        const m = macVal ?? 0;
        const p = nppVal ?? 0;
        const t = nptVal ?? 0;
        mtVal = useNpp
          ? parseFloat(((m + p + t) / 3).toFixed(1))
          : parseFloat(((m + t) / 2).toFixed(1));
      }
      updated = [...grades, {
        studentId,
        studentName,
        subject,
        trimester,
        mac: macVal,
        npp: nppVal,
        npt: nptVal,
        mt: mtVal
      }];
    }
    saveState(students, updated);
  };

  // VBA Trigger to Map and Initialize Empty Nominal Grade Sheets
  const handlePovoarAlunosSub = (sheetName = 'PAUTA1') => {
    const canEditGrades = canUserEditModule('MINI_PAUTAS') || canUserEditModule('PAUTAS') || canUserEditModule('BANCO_DE_DADOS');
    if (!canEditGrades) {
      window.alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    // Register empty grade rows for target students to ensure they exist on the sheet
    const targetStudents = students.filter(s => s.class === currentClass && s.section === currentSection);
    
    let updatedGrades = [...grades];
    let addedCount = 0;

    targetStudents.forEach((student) => {
      SUBJECTS.forEach((subject) => {
        (['I', 'II', 'III'] as const).forEach((trimester) => {
          // Check if there is an existing grade row
          const existingIdx = updatedGrades.findIndex(
            g => g.studentId === student.id && g.subject === subject && g.trimester === trimester
          );

          if (existingIdx < 0) {
            updatedGrades.push({
              studentId: student.id,
              studentName: student.name,
              subject,
              trimester,
              mac: null,
              npp: null,
              npt: null,
              mt: null
            });
            addedCount++;
          }
        });
      });
    });

    setGrades(updatedGrades);
    safeSetItem(LOCAL_STORAGE_GRADES_KEY, JSON.stringify(updatedGrades));

    setVbaLog(`✓ Sucesso: Alunos da ${currentClass}ª Classe, Turma ${currentSection} vinculados com sucesso ao livro de notas nominal (${addedCount} novas grelhas de notas limpas geradas).`);
    setTimeout(() => setVbaLog(null), 8000);
  };

  const handleConsolidarNotasSub = (sheetName = 'PAUTA1') => {
    // Recalculate MT dynamically for all students in the current class and section
    const targetStudents = students.filter(s => s.class === currentClass && s.section === currentSection);
    const targetStudentIds = targetStudents.map(s => s.id);

    const updated = grades.map(row => {
      if (targetStudentIds.includes(row.studentId)) {
        let mtVal: number | null = null;
        if (useNpp) {
          if (row.mac !== null || (row.npp !== undefined && row.npp !== null) || row.npt !== null) {
            const macVal = row.mac ?? 0;
            const nppVal = row.npp ?? 0;
            const nptVal = row.npt ?? 0;
            mtVal = parseFloat(((macVal + nppVal + nptVal) / 3).toFixed(1));
          }
        } else {
          if (row.mac !== null || row.npt !== null) {
            const macVal = row.mac ?? 0;
            const nptVal = row.npt ?? 0;
            mtVal = parseFloat(((macVal + nptVal) / 2).toFixed(1));
          }
        }
        return {
          ...row,
          mt: mtVal
        };
      }
      return row;
    });

    setGrades(updated);
    safeSetItem(LOCAL_STORAGE_GRADES_KEY, JSON.stringify(updated));

    setVbaLog(`✓ Consolidação concluída: Médias trimestrais da ${currentClass}ª Classe, Turma ${currentSection} recalculadas com sucesso.`);
    setTimeout(() => setVbaLog(null), 7500);
  };

  // Factreset DB
  const handleResetDatabase = (skipAuthCheck = false) => {
    if (!skipAuthCheck) {
      if (!isResetAllowed) {
        setVbaLog('Aviso de Segurança: Reset de fábrica bloqueado! Esta operação exige a autorização prévia do Director Geral a partir do seu painel de permissões.');
        setTimeout(() => setVbaLog(null), 8000);
        return;
      }

      const directorPass = getDirectorPassword();
      const senha = prompt("Aviso de Segurança (Reset de Fábrica):\nEsta operação irá restaurar a base de dados ao estado original.\nDigite a senha do perfil Diretor Geral para validar:");
      if (senha === null) return;
      if (senha !== directorPass) {
        alert("Operação rejeitada: Senha do Diretor Geral inválida.");
        return;
      }
    }

    setStudents([]);
    setGrades([]);
    safeSetItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify([]));
    safeSetItem(LOCAL_STORAGE_GRADES_KEY, JSON.stringify([]));
    safeSetItem('sigep_propinas_v1', JSON.stringify([]));
    safeSetItem('sigep_propinas_db', JSON.stringify({}));
    
    setVbaLog('Base de dados restaurada para o estado de fábrica com sucesso.');
    setTimeout(() => setVbaLog(null), 4000);
    setResetConfirmActive(false);
  };

  const evaluateStudentOutcome = (student: any, allGrades: GradeRow[]) => {
    const studentGrades = allGrades.filter(g => g.studentId === student.id);
    if (studentGrades.length === 0) return 'TRANSITA';

    const subjectGradesMap: Record<string, { I: number | null, II: number | null, III: number | null }> = {};
    studentGrades.forEach(g => {
      if (!subjectGradesMap[g.subject]) {
        subjectGradesMap[g.subject] = { I: null, II: null, III: null };
      }
      if (g.trimester === 'I') subjectGradesMap[g.subject].I = g.mt;
      if (g.trimester === 'II') subjectGradesMap[g.subject].II = g.mt;
      if (g.trimester === 'III') subjectGradesMap[g.subject].III = g.mt;
    });

    let totalMFD = 0;
    let subjectsCount = 0;

    Object.entries(subjectGradesMap).forEach(([subj, trimesters]) => {
      const mt1 = trimesters.I ?? 0;
      const mt2 = trimesters.II ?? 0;
      const mt3 = trimesters.III ?? 0;
      const mfd = (mt1 + mt2 + mt3) / 3;
      totalMFD += mfd;
      subjectsCount++;
    });

    const overallAverage = subjectsCount > 0 ? (totalMFD / subjectsCount) : 0;
    const classNum = parseInt(student.class, 10) || 1;
    const passThreshold = classNum >= 7 ? 10 : 5;

    return overallAverage >= passThreshold ? 'TRANSITA' : 'RETIDO';
  };

  const handleCloseAcademicYear = (newYear: string) => {
    setVbaLog("Iniciando o processo de fecho de ano lectivo e arquivamento...");
    
    const archiveKey = 'sigep_archive_years_v1';
    let currentArchive: any[] = [];
    const savedArchive = localStorage.getItem(archiveKey);
    if (savedArchive) {
      try {
        currentArchive = JSON.parse(savedArchive);
      } catch (e) {
        console.warn("Malformed archive database. Resetting archive.");
      }
    }

    const newArchiveRecord = {
      academicYear: schoolSettings.academicYear || '2025/2026',
      students: [...students],
      grades: [...grades],
      timestamp: new Date().toLocaleString()
    };
    currentArchive.push(newArchiveRecord);
    localStorage.setItem(archiveKey, JSON.stringify(currentArchive));

    const updatedStudents = students.map(student => {
      const outcome = evaluateStudentOutcome(student, grades);
      
      if (outcome === 'TRANSITA') {
        const classNum = parseInt(student.class, 10) || 1;
        if (classNum >= 1 && classNum <= 5) {
          return {
            ...student,
            class: String(classNum + 1)
          };
        } else if (classNum === 6) {
          return {
            ...student,
            class: '7'
          };
        } else if (classNum >= 7 && classNum <= 8) {
          return {
            ...student,
            class: String(classNum + 1)
          };
        } else if (classNum === 9) {
          return {
            ...student,
            class: '10'
          };
        } else if (classNum >= 10 && classNum <= 11) {
          return {
            ...student,
            class: String(classNum + 1)
          };
        } else if (classNum === 12) {
          return {
            ...student,
            class: 'CONCLUIDO'
          };
        } else if (classNum === 13) {
          return {
            ...student,
            class: 'CONCLUIDO'
          };
        }
      } else {
        return student;
      }
      return student;
    });

    const activeStudents = updatedStudents.filter(s => s.class !== 'CONCLUIDO');
    const freshGrades = generateInitialGrades(activeStudents);

    const updatedSettings = {
      ...schoolSettings,
      academicYear: newYear
    };

    setStudents(activeStudents);
    setGrades(freshGrades);
    setSchoolSettings(updatedSettings);
    safeSetItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(activeStudents));
    safeSetItem(LOCAL_STORAGE_GRADES_KEY, JSON.stringify(freshGrades));
    safeSetItem(LOCAL_STORAGE_SCHOOL_SETTINGS_KEY, JSON.stringify(updatedSettings));

    const logId = `LOG-${Date.now()}`;
    const newLog = {
      id: logId,
      user: 'DIRECTOR_GERAL',
      action: `Fecho de Ano Lectivo concluído com sucesso. Transição para o ano de ${newYear}.`,
      timestamp: new Date().toLocaleString(),
      target: `Ano Lectivo ${schoolSettings.academicYear} -> ${newYear}`
    };
    setAuditLogs(prev => [...prev, newLog]);
    safeSetItem('sigep_audit_logs_v1', JSON.stringify([...auditLogs, newLog]));

    setVbaLog(`✓ Ano Lectivo encerrado com sucesso! Dados históricos arquivados e alunos elegíveis promovidos para ${newYear}.`);
    setTimeout(() => setVbaLog(null), 8500);
  };

  // Statistics calculation for the current group
  const groupStudents = students.filter(s => s.class === currentClass && s.section === currentSection);
  
  const calculateGroupStats = () => {
    if (groupStudents.length === 0) return { avg: 0, approvals: 0, failures: 0, dropouts: 0, approvalRate: 0 };
    
    let totalMf = 0;
    let transitionCount = 0;
    let failureCount = 0;
    let dropoutCount = 0;

    const isSecundario = parseInt(currentClass, 10) >= 7;
    const isTransitaPassScore = isSecundario ? 10 : 5;

    groupStudents.forEach(student => {
      let mfAcm = 0;
      let checkins = 0;
      let redGradesCount = 0;

      // Obter as disciplinas de forma dinâmica para cada aluno de acordo com a modalidade e a especialidade
      const studentSubjects = getSubjectsForStudent(student, activeModality);

      studentSubjects.forEach(subject => {
        const mt1 = grades.find(g => g.studentId === student.id && g.subject === subject && g.trimester === 'I')?.mt ?? 0;
        const mt2 = grades.find(g => g.studentId === student.id && g.subject === subject && g.trimester === 'II')?.mt ?? 0;
        const mt3 = grades.find(g => g.studentId === student.id && g.subject === subject && g.trimester === 'III')?.mt ?? 0;

        if (grades.find(g => g.studentId === student.id && g.subject === subject && g.trimester === 'I')?.mt !== null) checkins++;
        if (grades.find(g => g.studentId === student.id && g.subject === subject && g.trimester === 'II')?.mt !== null) checkins++;
        if (grades.find(g => g.studentId === student.id && g.subject === subject && g.trimester === 'III')?.mt !== null) checkins++;

        const maxLimit = isSecundario ? 20 : 10;

        const mfd = (mt1 + mt2 + mt3) / 3;
        let roundedMfd = Math.floor(mfd);
        if (mfd - roundedMfd >= 0.5) roundedMfd += 1;
        if (roundedMfd > maxLimit) roundedMfd = maxLimit;

        if (roundedMfd < isTransitaPassScore) {
          redGradesCount++;
        }

        mfAcm += roundedMfd;
      });

      const subjectsCount = studentSubjects.length || 1;
      let mf = Math.round(mfAcm / subjectsCount);
      const hasTooManyReds = isSecundario && redGradesCount >= 3;
      
      if (isClosingPeriod && checkins <= (subjectsCount * 1.5)) {
        dropoutCount++;
      } else {
        if (mf >= isTransitaPassScore && !hasTooManyReds) {
          transitionCount++;
        } else {
          failureCount++;
        }
      }
      totalMf += mf;
    });

    const studentCount = groupStudents.length;
    const avgScore = totalMf / studentCount;
    const approvalRate = (transitionCount / studentCount) * 100;

    return {
      avg: parseFloat(avgScore.toFixed(1)),
      approvals: transitionCount,
      failures: failureCount,
      dropouts: dropoutCount,
      approvalRate: parseFloat(approvalRate.toFixed(0))
    };
  };

  const stats = calculateGroupStats();

  // Export current active pauta into real Excel (.xlsx) file representation
  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    let wsData: any[] = [];
    const subjects = getSubjectsForClass(currentClass, activeModality);
    const isSecundario = parseInt(currentClass, 10) >= 7;
    const isTransitaPassScore = isSecundario ? 10 : 5;
    
    if (activeTab === 'PAUTA1') {
      const subjectHeaders = subjects.map(sub => `${getSubjectAbbreviation(sub)}_MFD`);
      wsData.push([
        "Nº", "ID Aluno", "Nome Aluno", "Sexo", 
        ...subjectHeaders, 
        "Média Final", "Situação"
      ]);
      
      groupStudents.forEach((student, idx) => {
        let mfAcm = 0;
        let checkins = 0;
        const rowScores: number[] = [];
        let redGradesCount = 0;
        
        subjects.forEach(subject => {
          const mt1 = grades.find(g => g.studentId === student.id && g.subject === subject && g.trimester === 'I')?.mt ?? 0;
          const mt2 = grades.find(g => g.studentId === student.id && g.subject === subject && g.trimester === 'II')?.mt ?? 0;
          const mt3 = grades.find(g => g.studentId === student.id && g.subject === subject && g.trimester === 'III')?.mt ?? 0;
          
          if (grades.find(g => g.studentId === student.id && g.subject === subject && g.trimester === 'I')?.mt !== null) checkins++;
          if (grades.find(g => g.studentId === student.id && g.subject === subject && g.trimester === 'II')?.mt !== null) checkins++;
          if (grades.find(g => g.studentId === student.id && g.subject === subject && g.trimester === 'III')?.mt !== null) checkins++;

          const mfd = (mt1 + mt2 + mt3) / 3;
          let r = Math.floor(mfd);
          if (mfd - r >= 0.5) r += 1;
          
          if (r < isTransitaPassScore) {
            redGradesCount++;
          }
          
          mfAcm += r;
          rowScores.push(r);
        });

        const subjectsCount = subjects.length || 1;
        let mf = Math.round(mfAcm / subjectsCount);
        const hasTooManyReds = isSecundario && redGradesCount >= 3;
        
        let status = (mf >= isTransitaPassScore && !hasTooManyReds) ? 'TRANSITA' : 'N/TRANSITA';
        if (isClosingPeriod && checkins <= (subjectsCount * 1.5)) {
          mf = 0;
          status = 'DESISTENTE';
        }

        wsData.push([
          idx + 1,
          student.id,
          student.name,
          student.gender,
          ...rowScores,
          mf,
          status
        ]);
      });
    } else {
      wsData.push(["Nº", "ID Aluno", "Nome Aluno", "Sexo", "Matéria", "MAC", "NPT", "MT"]);
      
      groupStudents.forEach((student, idx) => {
        subjects.forEach(sub => {
          const match = grades.find(g => g.studentId === student.id && g.subject === sub && g.trimester === 'I');
          wsData.push([
            idx + 1,
            student.id,
            student.name,
            student.gender,
            sub,
            match?.mac ?? '',
            match?.npt ?? '',
            match?.mt ?? ''
          ]);
        });
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Pauta");
    
    XLSX.writeFile(wb, `SiGeP_Pauta_${currentClass}aClasse_Turma${currentSection}.xlsx`);
    
    logAction(
      loggedInStaff?.name || 'SISTEMA', 
      `Exportou pauta oficial (${activeTab === 'PAUTA1' ? 'Anual' : 'Trimestral'}) para formato Excel (.xlsx)`, 
      'Exportação'
    );
  };

  if (hasHardwareMismatch) {
    return <SystemLockScreen />;
  }

  if (loggedInStaff && isLocked) {
    return (
      <OSLockOverlay
        loggedInStaff={loggedInStaff}
        onUnlock={unlockSession}
        onLogout={handleLogout}
        schoolName={schoolSettings.schoolName}
      />
    );
  }

  if (showSplash) {
    return (
      <div 
        onClick={() => setShowSplash(false)}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white font-sans overflow-hidden select-none cursor-pointer"
        title="Clique para abrir imediatamente"
      >
        {/* Decorative background light rays */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

        <div className="flex flex-col items-center max-w-sm px-6 text-center space-y-8 animate-fadeIn">
          {/* Logo with pulsing glow & scale entrance */}
          <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-slate-950/50 border border-slate-700/40 animate-scaleUp">
            <SiGePLogo size={150} />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              Sistema de Gestão Escolar
            </h1>
            <p className="text-indigo-400 text-xs font-mono font-extrabold uppercase tracking-widest">
              SIGEP - Academic v1.1.0 • Fabricante: SIGEP-Group
            </p>
          </div>

          {/* Elegant Loading Bar */}
          <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/20">
            <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full animate-loadingBar" />
          </div>

          <p className="text-[10px] text-slate-300 font-mono tracking-wide">
            {startupLog}
          </p>
        </div>
      </div>
    );
  }

  if (eulaDeclined) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 select-none text-center space-y-6" id="sigep-eula-declined-screen">
        <div className="mx-auto w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center border-2 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
          <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" id="sigep-eula-declined-icon">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2" id="sigep-eula-declined-msg-group">
          <h1 className="text-xl font-bold text-white uppercase tracking-wider" id="sigep-eula-declined-title">Acesso Recusado</h1>
          <p className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed" id="sigep-eula-declined-desc">
            O uso do Sistema de Gestão Escolar Profissional (SIGEP) requer a aceitação integral do Acordo de Licença de Utilizador Final (EULA).
          </p>
        </div>
        <button
          id="sigep-eula-reconsider-btn"
          onClick={() => setEulaDeclined(false)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl text-xs uppercase tracking-wide transition-all cursor-pointer"
        >
          Voltar e Rever Termos
        </button>
      </div>
    );
  }

  if (!eulaAccepted) {
    return (
      <EulaScreen 
        onAccept={handleAcceptEula} 
        onDecline={handleDeclineEula} 
      />
    );
  }

  if (isStudentPortalActive) {
    return (
      <PortalAluno
        students={students}
        grades={grades}
        onClose={() => setIsStudentPortalActive(false)}
        schoolSettings={schoolSettings}
      />
    );
  }

  if (!loggedInStaff) {
    return (
      <LoginScreen
        staffList={staffList}
        schoolSettings={schoolSettings}
        onLoginSuccess={handleLoginSuccess}
        onOpenStudentPortal={() => setIsStudentPortalActive(true)}
        onRefreshStaff={(updated) => {
          setStaffList(updated);
          safeSetItem(LOCAL_STORAGE_STAFF_KEY, JSON.stringify(updated));
        }}
        onResetPassword={(staffId, newPassword) => {
          const updated = staffList.map(s => s.id === staffId ? { ...s, password: newPassword } : s);
          setStaffList(updated);
          safeSetItem(LOCAL_STORAGE_STAFF_KEY, JSON.stringify(updated));
          const target = updated.find(s => s.id === staffId);
          if (target) {
            fetch('/api/funcionarios', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(target)
            }).catch(() => null);
          }
        }}
      />
    );
  }

  const canUserEditModule = (moduleId: string): boolean => {
    if (!loggedInStaff) {
      return userRole === 'DIRECTOR_GERAL' || userRole === 'SIGEP';
    }
    if (loggedInStaff.role === 'DIRECTOR_GERAL' || loggedInStaff.role === 'SIGEP' || loggedInStaff.is_root || loggedInStaff.id === 'SIGEP') {
      return true;
    }
    const perm = permissions.find(p => p.role === loggedInStaff.role);
    if (!perm) {
      return true;
    }
    return perm.canEdit && perm.allowedModules.includes(moduleId);
  };

  return (
    <SchoolSettingsProvider initialSettings={schoolSettings} onSaveSettings={handleUpdateSchoolSettings}>
      <HermeticSubsystemProvider allStudents={students} allGrades={grades}>
        <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased relative">
      {/* Welcome Toast Notification */}
      {welcomeToast && (
        <div className="fixed top-6 right-6 max-w-md w-full sm:w-[420px] bg-slate-900 border border-indigo-500/80 text-white p-5 rounded-2xl shadow-2xl z-[100] animate-fadeIn flex gap-3.5 items-start select-none">
          <div className="p-2.5 bg-indigo-600/30 rounded-xl text-indigo-400 mt-0.5 border border-indigo-500/30 shrink-0">
            <Shield className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="flex-1 space-y-1 pr-12">
            <span className="block text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 font-mono">
              Notificação de Acesso
            </span>
            <p className="text-xs font-semibold text-slate-100 leading-relaxed font-sans">
              {welcomeToast}
            </p>
          </div>
          <button
            onClick={() => setWelcomeToast(null)}
            className="absolute top-3 right-3 text-[10px] font-black uppercase font-mono tracking-wider text-indigo-300 hover:text-white bg-indigo-500/15 hover:bg-indigo-500/30 px-2.5 py-1 rounded-md transition-all cursor-pointer border border-indigo-500/25"
            title="Fechar Mensagem"
          >
            FECHAR
          </button>
        </div>
      )}

      {/* Backdrop overlay for mobile menu drawer */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/65 z-30 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`bg-gradient-to-b from-[#0f172a]/90 via-[#083344]/85 to-[#020617]/95 backdrop-blur-2xl border-r border-cyan-500/15 flex flex-col shrink-0 fixed md:sticky inset-y-0 left-0 z-40 h-screen text-slate-300 transition-all duration-300 ease-in-out shadow-2xl ${
        isMobileMenuOpen 
          ? 'w-64 translate-x-0' 
          : 'w-64 -translate-x-full md:translate-x-0 ' + (isMainMenuOpen ? 'md:w-64' : 'md:w-0 md:-translate-x-full overflow-hidden')
      }`}>
        <div className="p-4 flex flex-col gap-2 border-b border-cyan-500/10 bg-cyan-950/15">
          {activeTab !== 'ESTATISTICAS' ? (
            <>
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-700/50 p-0.5 shrink-0 overflow-hidden">
                    <SiGePLogo size={26} />
                  </div>
                  <div>
                    <h1 className="font-bold text-sm text-white tracking-tight leading-none">SIGEP</h1>
                    <span className="text-[9px] text-indigo-400 font-mono font-bold">Academic v1.1.0</span>
                  </div>
                </div>
                {/* Close button for mobile hamburger menu */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="md:hidden p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-450 hover:text-white transition-colors cursor-pointer"
                  title="Fechar Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="pt-1 px-0.5 flex items-center gap-2">
                {(() => {
                  const logoUrl = schoolSettings.logoType === 'PUBLIC' ? schoolSettings.publicLogoUrl : schoolSettings.privateLogoUrl;
                  if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
                    return (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="w-7 h-7 rounded-md object-cover border border-slate-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    );
                  }
                  return null;
                })()}
                <div className="min-w-0 flex-1">
                  <p className="text-white text-[11px] font-extrabold uppercase truncate tracking-wide leading-tight" title={schoolSettings.schoolName}>
                    {schoolSettings.logoType === 'PUBLIC' ? '' : '🏢 '}{schoolSettings.schoolName}
                  </p>
                  <p className="text-slate-400 text-[9px] font-bold font-mono tracking-wider uppercase mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                    {schoolSettings.logoType === 'PUBLIC' ? '' : '📍 '}{schoolSettings.municipality} • {schoolSettings.province}
                  </p>
                </div>
              </div>
              
              {/* Persistent License Status Badge */}
              <div className="mt-2 pt-2 border-t border-cyan-500/10">
                {diasRestantes > 30 ? (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[#7FFF00] text-[9px] font-bold font-mono uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-[#7FFF00] rounded-full shrink-0"></span>
                    <span>Licença Ativa: {diasRestantes} dias</span>
                  </div>
                ) : diasRestantes > 0 ? (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[#FFA500] text-[9px] font-bold font-mono uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-[#FFA500] rounded-full shrink-0 animate-pulse"></span>
                    <span>Expira em: {diasRestantes} dias</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-rose-500/15 border border-rose-500/30 text-[#FF4500] text-[9px] font-bold font-mono uppercase tracking-wider animate-pulse">
                    <span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full shrink-0"></span>
                    <span>Licença Expirada!</span>
                  </div>
                )}
              </div>

              {/* PostgreSQL Connection Badge */}
              <div className="mt-1 px-0.5">
                {!schoolSettings.syncEnabled ? (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-slate-500/10 border border-slate-500/20 text-slate-400 text-[9px] font-bold font-mono uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full shrink-0"></span>
                    <span>Banco de Dados: Local 💻</span>
                  </div>
                ) : dbConnected === true ? (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold font-mono uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0 animate-pulse"></span>
                    <span>PostgreSQL: On-line 🌐</span>
                  </div>
                ) : dbConnected === false ? (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-bold font-mono uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"></span>
                    <span>PostgreSQL: Off-line ⚠️</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[9px] font-bold font-mono uppercase tracking-wider animate-pulse">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0 animate-spin"></span>
                    <span>PostgreSQL: Conectando...</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-700/50 p-0.5 shrink-0 overflow-hidden">
                  <SiGePLogo size={26} />
                </div>
                <div>
                  <h1 className="font-bold text-sm text-white tracking-tight leading-none">SIGEP</h1>
                  <span className="text-[9px] text-indigo-400 font-mono font-bold">Academic v1.1.0</span>
                </div>
              </div>
              {/* Close button for mobile hamburger menu */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-450 hover:text-white transition-colors cursor-pointer"
                title="Fechar Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Modality Selector / Seletor de Subsistema */}
          <div className="mt-2 pt-2 border-t border-cyan-500/10 flex flex-col gap-1 select-none">
            <span className="text-[9px] font-extrabold text-slate-200 uppercase tracking-wider font-mono">Modalidade / Subsistema</span>
            <select
              value={activeModality}
              onChange={(e) => handleSetModality(e.target.value as ModalityType)}
              disabled={loggedInStaff?.role === 'PROFESSOR'}
              className="w-full bg-cyan-950/40 backdrop-blur-md border border-cyan-500/20 rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold text-[#7FFF00] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-inner"
            >
              {schoolSettings.activeComponents?.ENSINO_PRIMARIO !== false && (
                <option value="ENSINO_PRIMARIO">🏫 Ensino Primário</option>
              )}
              {schoolSettings.activeComponents?.PUNIV !== false && (
                <option value="PUNIV">🎓 Liceu</option>
              )}
              {schoolSettings.activeComponents?.MAGISTERIO !== false && (
                <option value="MAGISTERIO">📚 Magistério</option>
              )}
            </select>
          </div>
        </div>
        
        {/* Dynamic menu icons map helper */}
        {(() => {
          // Declare helper so it's scoped near render
          const renderMenuIcon = (iconName: string) => {
            switch (iconName) {
              case 'User': return <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
              case 'Users': return <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
              case 'CheckSquare': return <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
              case 'FileSpreadsheet': return <FileSpreadsheet className="w-3.5 h-3.5 text-amber-450 shrink-0" />;
              case 'Award': return <Award className="w-3.5 h-3.5 text-[#7FFF00] shrink-0" />;
              case 'DollarSign': return <DollarSign className="w-3.5 h-3.5 text-teal-400 shrink-0" />;
              case 'TrendingUp': return <TrendingUp className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
              case 'Database': return <Database className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
              case 'Settings': return <Settings className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
              case 'MessageSquare': return <MessageSquare className="w-3.5 h-3.5 text-violet-450 shrink-0 animate-pulse" />;
              case 'GraduationCap': return <GraduationCap className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
              case 'Printer': return <Printer className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
              default: return <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
            }
          };

          return (
            <nav className="flex-1 p-3 space-y-2.5 overflow-y-auto custom-scrollbar select-none">
              {/* SIGEP 4.2.0 Hierarchical Menu & Principle of Least Privilege / Access Delegation */}
              {NAVIGATION_CONFIG.map((menu) => {
                const isRootSigep = loggedInStaff && (loggedInStaff.role === 'SIGEP' || loggedInStaff.is_root || loggedInStaff.id === 'SIGEP' || loggedInStaff.id === 'ADMIN_SIGEP');

                if (!isRootSigep) {
                  // Special check for Chat: Coordinators only see Chat if explicitly invited
                  if (menu.id === 'COMUNICACAO' && loggedInStaff && ['COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA', 'COORDENADOR'].includes(loggedInStaff.role)) {
                    const savedConv = localStorage.getItem('sigep_canais_convidados_v1');
                    const convList = savedConv ? JSON.parse(savedConv) : [];
                    const hasInvite = Array.isArray(convList) && convList.some((inv: any) => 
                      (inv.id_utilizador === loggedInStaff.id || inv.id_utilizador === loggedInStaff.role) && 
                      (inv.status_convite === 'ACEITO' || inv.status_convite === 'PENDENTE')
                    );
                    if (!hasInvite) return null;
                  } else if (menu.rolesAllowed && loggedInStaff && !menu.rolesAllowed.includes(loggedInStaff.role)) {
                    // 1. Filter by global role restriction (Principle of Least Privilege)
                    return null;
                  }

                  // 2. Filter by delegated permissions from Director Geral (Access Delegation check)
                  if (loggedInStaff && loggedInStaff.role !== 'DIRECTOR_GERAL' && menu.rolesAllowed) {
                    const rolePerm = permissions.find(p => p.role === loggedInStaff.role);
                    if (rolePerm && !rolePerm.allowedModules.includes(menu.id)) {
                      return null;
                    }
                  }
                }

                return (
                  <div key={menu.id} className="bg-cyan-950/10 backdrop-blur-md rounded-xl border border-cyan-500/10 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        if (menu.targetTab) {
                          setActiveTab(menu.targetTab as ActiveSheet);
                          setVbaLog(`Navegou para: ${menu.label}`);
                          if (menu.id === 'AREA_ACADEMICA') {
                            setAcademicSubTab('DASHBOARD');
                          }
                        }
                      }}
                      className={`w-full flex items-center gap-2 p-3 text-left font-bold text-[10px] tracking-wider transition-all duration-200 cursor-pointer transform ${
                        activeTab === menu.targetTab
                          ? 'bg-indigo-600 text-white font-black border-l-4 border-indigo-400 translate-x-1 scale-[1.02]'
                          : 'text-slate-100 hover:bg-cyan-500/10 hover:text-white bg-cyan-950/10 hover:translate-x-0.5'
                      }`}
                    >
                      {renderMenuIcon(menu.iconName)}
                      <span>{menu.label}</span>
                    </button>
                  </div>
                );
              })}

              {/* Director General exclusive entry point button if logged in (or Root SIGEP) */}
              {(loggedInStaff?.role === 'DIRECTOR_GERAL' || loggedInStaff?.role === 'SIGEP' || loggedInStaff?.is_root || loggedInStaff?.id === 'SIGEP') && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setActiveTab('PAINEL_DIRECTOR_GERAL');
                    setVbaLog("Acedeu ao Painel do Director Geral");
                  }}
                  className={`w-full flex items-center gap-2.5 p-3 rounded-xl border font-bold text-[10px] tracking-wider transition-all cursor-pointer ${
                    activeTab === 'PAINEL_DIRECTOR_GERAL'
                      ? 'bg-amber-500 border-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/10'
                      : 'bg-cyan-950/20 border-cyan-500/15 text-amber-300 hover:bg-cyan-950/35 hover:text-amber-200'
                  }`}
                >
                  <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>PAINEL DO DIRECTOR GERAL</span>
                </button>
              )}

              {/* Profile Section Tab */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActiveTab('UTILIZADOR');
                  setVbaLog("Acedeu ao Perfil do Utilizador");
                }}
                className={`w-full flex items-center gap-2.5 p-3 rounded-xl border font-bold text-[10px] tracking-wider transition-all cursor-pointer ${
                  activeTab === 'UTILIZADOR'
                    ? 'bg-indigo-600 border-indigo-500 text-white font-black'
                    : 'bg-cyan-950/20 border-cyan-500/15 text-slate-200 hover:bg-cyan-950/35 hover:text-white'
                }`}
              >
                <User className="w-4 h-4 text-teal-400 shrink-0" />
                <span>MINHA CONTA / LICENÇA</span>
              </button>
            </nav>
          );
        })()}
        
        {/* Informação do Utilizador Autenticado - Compacta */}
        <div id="security-interactive-switcher-sidebar-disabled" className="p-2 bg-cyan-950/30 backdrop-blur-md border-t border-cyan-500/15 flex items-center gap-2 select-none">
          <span className="text-sm shrink-0">
            {loggedInStaff?.role === 'DIRECTOR_GERAL' || loggedInStaff?.role === 'SUB_DIRECTOR_PEDAGOGICO' || loggedInStaff?.role === 'SUB_DIRECTOR_ADMINISTRATIVO' ? '👑' :
             loggedInStaff?.role === 'CHEFE_SECRETARIA' ? '📝' : '👨‍🏫'}
          </span>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold text-white truncate leading-none mb-0.5">{loggedInStaff?.name || 'Administrador'}</span>
            <span className="block text-[8px] text-indigo-400 uppercase tracking-wider font-extrabold leading-none">
              {loggedInStaff ? (
                loggedInStaff.role === 'SIGEP' || loggedInStaff.is_root ? '👑 Admin Master' :
                loggedInStaff.role === 'DIRECTOR_GERAL' ? 'Dir. Geral' :
                loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' ? 'Pedagógico' :
                loggedInStaff.role === 'SUB_DIRECTOR_ADMINISTRATIVO' ? 'Adm.' :
                loggedInStaff.role === 'CHEFE_SECRETARIA' ? 'Secretaria' :
                loggedInStaff.role === 'COORDENADOR' ? 'Coordenador' :
                loggedInStaff.role === 'PROFESSOR' ? 'Professor' : 'Docente'
              ) : 'Fábrica'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Sticky Header & Inverted Navigation Bar Wrapper */}
        <div className="sticky top-0 z-30 bg-white">
          {/* Header Bar */}
          <header className={`bg-white flex items-center justify-between px-3 sm:px-5 shrink-0 shadow-3xs z-20 overflow-x-auto custom-scrollbar gap-2 transition-all duration-300 ease-in-out transform origin-top ${
            isScrolledFromTop 
              ? 'max-h-0 h-0 opacity-0 overflow-hidden border-none py-0 pointer-events-none scale-y-95' 
              : 'max-h-20 h-16 opacity-100 border-b border-slate-200 scale-y-100'
          }`}>
            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop Menu Collapse Toggle */}
              <button
                type="button"
                onClick={() => setIsMainMenuOpen(!isMainMenuOpen)}
                className="hidden md:flex p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-750 transition-all cursor-pointer shadow-3xs"
                title={isMainMenuOpen ? "Ocultar Menu Lateral" : "Mostrar Menu Lateral"}
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>

            {/* SIGEP 4.2.0 Universal ID/BI Search Bar (Reduced width for desktop balance) */}
            <div className="hidden md:flex items-center gap-1.5 w-32 sm:w-36 lg:w-40 relative shrink-0">
              <input
                type="text"
                value={universalSearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setUniversalSearchQuery(val);
                  
                  // Instantly search students by ID, BI or Name
                  if (val.trim()) {
                    const match = students.find(s => 
                      s.id.toLowerCase() === val.trim().toLowerCase() || 
                      s.biNumber?.toLowerCase() === val.trim().toLowerCase() ||
                      s.name.toLowerCase().includes(val.trim().toLowerCase())
                    );
                    if (match) {
                      setSelected360Student(match);
                      logAction(loggedInStaff?.name || 'SISTEMA', `Pesquisa Universal encontrou aluno ${match.name} (${match.id})`, 'Pesquisa');
                    }
                  }
                }}
                placeholder="Pesquisar (ID/Nome)..."
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-indigo-500 rounded-xl pl-7 pr-2 py-1 text-[11px] text-slate-850 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono shadow-inner truncate"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
            </div>
            
            <div className="flex gap-1.5 items-center shrink-0">
              {/* Suporte Técnico / Headset */}
              <button
                id="top-action-suporte"
                type="button"
                onClick={() => {
                  window.location.href = 'mailto:suport.sigep@outlook.com';
                }}
                className="group relative flex items-center justify-center p-2 rounded-lg text-white bg-slate-900 border border-slate-800 hover:bg-indigo-600 transition-all cursor-pointer shadow-3xs shrink-0"
                title="Precisa de ajuda? Fale connosco."
              >
                <Headset className="w-3.5 h-3.5" />
                <span className="absolute top-full mt-2 hidden group-hover:block whitespace-nowrap bg-slate-900 text-white text-[10px] font-extrabold py-1.5 px-2.5 rounded-lg shadow-lg border border-slate-700 right-0 z-50 font-sans tracking-wide">
                  Precisa de ajuda? Fale connosco.
                </span>
              </button>

              {/* Header License Status Badge */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono tracking-wide bg-slate-50 border border-slate-200 shrink-0">
                {diasRestantes > 30 ? (
                  <>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <span className="text-slate-600">Licença: <span className="text-emerald-600 font-extrabold">{diasRestantes}d</span></span>
                  </>
                ) : diasRestantes > 0 ? (
                  <>
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                    <span className="text-slate-600">Licença: <span className="text-amber-600 font-extrabold">{diasRestantes}d</span></span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                    <span className="text-rose-600 font-extrabold uppercase">Expirada!</span>
                  </>
                )}
              </div>

              {/* Piloto de Ligação PostgreSQL do SIGEP */}
              <div className="hidden xl:flex items-center shrink-0">
                {dbConnected === true ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-[10px] font-bold font-mono tracking-wide shadow-3xs" title="Base de dados sigep_db ligada e pronta via PostgreSQL">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    <span>PostgreSQL: <span className="font-extrabold uppercase text-emerald-600">LIGADO</span></span>
                  </div>
                ) : dbConnected === false ? (
                  <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 text-[10px] font-bold font-mono tracking-wide shadow-3xs animate-pulse" title="Base de dados sigep_db offline ou sem ligação ao PostgreSQL local">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    <Database className="w-3.5 h-3.5 text-rose-600" />
                    <span>PostgreSQL: <span className="font-extrabold uppercase text-rose-600">OFFLINE</span></span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1 text-[10px] font-bold font-mono tracking-wide shadow-3xs animate-pulse" title="A verificar estado da ligação ao PostgreSQL local...">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500 animate-pulse"></span>
                    </span>
                    <Database className="w-3.5 h-3.5 text-indigo-600 animate-spin" style={{ animationDuration: '3s' }} />
                    <span>PostgreSQL: <span className="font-extrabold uppercase text-indigo-600 animate-pulse">A LIGAR...</span></span>
                  </div>
                )}
              </div>

              {/* CENTRAL DE AUTORIZAÇÕES (Shield de Notas) TRIGGER */}
              <button
                type="button"
                onClick={() => setIsAuthHubOpen(true)}
                className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border shrink-0 ${
                  pendingGradeRequestsCount > 0 
                    ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse font-black shadow-rose-100 shadow-xs'
                    : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                }`}
                title="Central d'Autorizações Digitais SIGEP (Shield de Notas)"
              >
                <ShieldAlert className={`w-3.5 h-3.5 ${pendingGradeRequestsCount > 0 ? 'text-rose-600 animate-bounce' : 'text-indigo-600'}`} />
                <span className="hidden sm:inline uppercase tracking-wider">Autorizações</span>
                {pendingGradeRequestsCount > 0 && (
                  <span className="bg-rose-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {pendingGradeRequestsCount}
                  </span>
                )}
              </button>

              {/* Quick Interactive user-role badge */}
              <button
                id="top-action-user-profile"
                type="button"
                onClick={() => {
                  setActiveTab('UTILIZADOR');
                  setVbaLog("Navegou para a ficha de controlo de utilizador.");
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                  activeTab === 'UTILIZADOR'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0"></span>
                <span className="text-[10px] font-bold leading-none max-w-[90px] sm:max-w-[120px] truncate">
                  {loggedInStaff ? (
                    loggedInStaff.role === 'SIGEP' || loggedInStaff.is_root ? '👑 Admin Master' :
                    loggedInStaff.role === 'DIRECTOR_GERAL' ? '👑 Dir. Geral' :
                    loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' ? '👑 Subdir. Pedagógico' :
                    loggedInStaff.role === 'SUB_DIRECTOR_ADMINISTRATIVO' ? '👑 Subdir. Adm.' :
                    loggedInStaff.role === 'CHEFE_SECRETARIA' ? '📝 Chefe Sec.' :
                    loggedInStaff.role === 'COORDENADOR' ? '👨‍🏫 Coordenador' :
                    loggedInStaff.role === 'PROFESSOR' ? '👨‍🏫 Prof. Disciplina' : 'Funcionário'
                  ) : (
                    userRole === 'SUB_DIRECTOR_PEDAGOGICO' ? '👑 Dir. Geral (Mestre)' :
                    userRole === 'SECRETARIO' ? '📝 Chefe Secretaria' : '👨‍🏫 Prof. Disciplina'
                  )}
                </span>
              </button>

              {/* Indicador de Ano Lectivo do SIGEP */}
              <div 
                id="header-academic-year-display"
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-900 flex items-center gap-1 shadow-3xs cursor-pointer hover:bg-indigo-100 transition-all shrink-0"
                onClick={() => {
                  if (loggedInStaff?.role === 'DIRECTOR_GERAL' || loggedInStaff?.role === 'SIGEP' || loggedInStaff?.is_root) {
                    setActiveTab('PAINEL_DIRECTOR_GERAL');
                    setVbaLog("Navegou para o Painel do Director Geral (Gestão de Ano Lectivo).");
                  } else {
                    setActiveTab('CABECALHO');
                    setVbaLog("Visualizou Ano Lectivo Activo nas Definições.");
                  }
                }}
                title="Ano Lectivo Corrente e Activo no SIGEP (Gerido no Painel do Director Geral)"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-[10px]">Ano: <span className="text-indigo-600 font-extrabold">{schoolSettings.academicYear || '2025/2026'}</span></span>
              </div>

              {/* Botão de Histórico e Anos Lectivos Anteriores */}
              <button
                type="button"
                onClick={() => setIsHistoricoModalOpen(true)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all shrink-0"
                title="Consultar Pautas e Anos Lectivos Arquivados do SIGEP"
              >
                <Archive className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-[10px] font-bold">Anos Anteriores</span>
              </button>

              {/* Encerrar Sessão (Logout) Button - High visibility highlight inside screen boundary */}
              <button
                id="top-action-logout"
                type="button"
                onClick={() => handleLogout()}
                className="px-3 py-1.5 text-xs font-black rounded-lg flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-rose-700 transition-all cursor-pointer shadow-xs shrink-0"
                title="Encerrar Sessão com segurança no SIGEP"
              >
                <LogOut className="w-3.5 h-3.5 text-white" />
                <span className="uppercase tracking-wider text-[10px] font-black">SAIR</span>
              </button>
            </div>
          </header>

          {/* BANNERS DE NOTIFICAÇÃO EM TEMPO REAL EM DESTAQUE */}
          {loggedInStaff && (loggedInStaff.role === 'DIRECTOR_GERAL' || loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' || loggedInStaff.role === 'SIGEP' || loggedInStaff.is_root) && pendingGradeRequestsCount > 0 && (
            <div className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold animate-pulse shadow-md z-30 shrink-0 border-b border-rose-700">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-300 animate-bounce shrink-0" />
                <span>
                  🚨 <strong>SOLICITAÇÃO DE AUTORIZAÇÃO DE NOTAS / TRIMESTRE PENDENTE!</strong> Existe(m) <span className="bg-white text-rose-800 px-1.5 py-0.5 rounded font-black">{pendingGradeRequestsCount}</span> pedido(s) aguardando sua assinatura digital.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthHubOpen(true)}
                className="px-3.5 py-1 bg-white text-rose-800 hover:bg-rose-50 font-black rounded-lg shadow-sm cursor-pointer text-[11px] uppercase tracking-wider shrink-0"
              >
                Assinar / Liberar
              </button>
            </div>
          )}

          {chatNotificationBanner && (
            <div className="bg-gradient-to-r from-violet-600 via-indigo-700 to-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold shadow-md z-30 shrink-0 border-b border-indigo-800 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-violet-200 animate-bounce shrink-0" />
                <span>{chatNotificationBanner}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('COMUNICACAO');
                    if (loggedInStaff) {
                      const savedConv = localStorage.getItem('sigep_canais_convidados_v1');
                      const convList = savedConv ? JSON.parse(savedConv) : [];
                      const count = Array.isArray(convList) ? convList.length : 1;
                      localStorage.setItem(`sigep_seen_chat_invites_${loggedInStaff.id}`, count.toString());
                    }
                    setChatNotificationBanner(null);
                  }}
                  className="px-3.5 py-1 bg-white text-indigo-950 hover:bg-violet-50 font-black rounded-lg shadow-sm cursor-pointer text-[11px] uppercase tracking-wider"
                >
                  Aceder ao Chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (loggedInStaff) {
                      const savedConv = localStorage.getItem('sigep_canais_convidados_v1');
                      const convList = savedConv ? JSON.parse(savedConv) : [];
                      const count = Array.isArray(convList) ? convList.length : 1;
                      localStorage.setItem(`sigep_seen_chat_invites_${loggedInStaff.id}`, count.toString());
                    }
                    setChatNotificationBanner(null);
                  }}
                  className="p-1 hover:bg-white/20 rounded-md cursor-pointer text-white"
                  title="Fechar Notificação"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* BANNER UNIVERSAL OBRIGATÓRIO DE PRESENÇA / PONTO DIGITAL DA ESCOLA (OCULTO APÓS ASSINAR) */}
          {loggedInStaff && (() => {
            const todayStr = new Date().toISOString().split('T')[0];
            const todayRec = pontoRecords.find(r => r.staffId === loggedInStaff.id && r.date === todayStr);
            const isPresent = todayRec?.status === 'PRESENTE' || todayRec?.status === 'PRESENCA_JUSTIFICADA';
            
            // Oculta o banner após assinar a presença para não ocupar espaço na tela
            if (isPresent) return null;

            const periodoStr = loggedInStaff.periodoTrabalho || loggedInStaff.periodo || 'MATINAL';

            return (
              <div className="px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md z-30 shrink-0 border-b text-xs font-bold transition-all bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white border-rose-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl border shrink-0 bg-rose-900/70 border-rose-500/50 text-rose-300 animate-pulse">
                    <Clock className="w-5 h-5 text-amber-300 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-wider bg-rose-500/30 text-rose-200 border-rose-400/50 font-mono animate-pulse">
                        🚨 PONTO DIGITAL OBRIGATÓRIO
                      </span>
                      <span className="text-[10px] font-mono text-slate-300">
                        {todayStr}
                      </span>
                    </div>
                    <p className="text-xs font-extrabold text-white mt-0.5">
                      {loggedInStaff.name} <span className="text-slate-300 font-normal">({loggedInStaff.role})</span> • Turno RH: <strong className="text-amber-200 uppercase">{periodoStr}</strong>
                    </p>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      const nowTime = new Date().toLocaleTimeString('pt-PT');
                      const newRec: PontoRecord = {
                        id: `PONTO_${loggedInStaff.id}_${todayStr}`,
                        staffId: loggedInStaff.id,
                        staffName: loggedInStaff.name,
                        staffRole: loggedInStaff.role,
                        date: todayStr,
                        timestamp: nowTime,
                        status: 'PRESENTE',
                        periodoTrabalho: periodoStr as any,
                        statusWorkflow: 'CONFIRMADO'
                      };
                      const updated = [...pontoRecords.filter(r => !(r.staffId === loggedInStaff.id && r.date === todayStr)), newRec];
                      savePontoRecords(updated);
                      window.alert(`✅ Presença de ${loggedInStaff.name} confirmada com sucesso às ${nowTime}!`);
                    }}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 border border-rose-400/50 hover:scale-105 uppercase tracking-wider"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Assinar Minha Presença de Hoje ({new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })})</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Horizontal Inverted Navigation Sub-Bar (Appears when Sidebar Menu is Hidden) */}
          {!isMainMenuOpen && (
            <div className="bg-[#0f172a] border-b border-slate-800 px-3 py-1.5 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 shadow-md select-none z-10 transition-all">
              <div className="flex items-center gap-1.5 min-w-max">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 font-mono pr-2 border-r border-slate-700/80 mr-0.5 flex items-center gap-1">
                  <Menu className="w-3 h-3 text-indigo-400" />
                  <span>MENU:</span>
                </span>

                {NAVIGATION_CONFIG.map((menu) => {
                  // Permission check
                  const userRoleResolved = loggedInStaff?.role || userRole;
                  const isRootSigep = (loggedInStaff && (loggedInStaff.role === 'SIGEP' || loggedInStaff.is_root || loggedInStaff.id === 'SIGEP' || loggedInStaff.id === 'ADMIN_SIGEP')) || userRoleResolved === 'SIGEP';
                  if (!isRootSigep) {
                    if (menu.id === 'COMUNICACAO' && loggedInStaff && ['COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA', 'COORDENADOR'].includes(userRoleResolved)) {
                      const savedConv = localStorage.getItem('sigep_canais_convidados_v1');
                      const convList = savedConv ? JSON.parse(savedConv) : [];
                      const hasInvite = Array.isArray(convList) && convList.some((inv: any) => 
                        (inv.id_utilizador === loggedInStaff.id || inv.id_utilizador === loggedInStaff.role) && 
                        (inv.status_convite === 'ACEITO' || inv.status_convite === 'PENDENTE')
                      );
                      if (!hasInvite) return null;
                    } else if (menu.rolesAllowed && menu.rolesAllowed.length > 0) {
                      if (!menu.rolesAllowed.includes(userRoleResolved)) {
                        return null;
                      }
                    }
                  }

                  const isActive = activeTab === menu.targetTab;

                  return (
                    <button
                      key={menu.id}
                      type="button"
                      onClick={() => {
                        if (menu.targetTab) {
                          setActiveTab(menu.targetTab as ActiveSheet);
                          setVbaLog(`Navegou para: ${menu.label}`);
                          if (menu.id === 'AREA_ACADEMICA') {
                            setAcademicSubTab('DASHBOARD');
                          }
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-indigo-600 text-white font-black shadow-xs ring-1 ring-indigo-400'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800 bg-slate-800/60 border border-slate-700/60'
                      }`}
                    >
                      {menu.iconName === 'User' && <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      {menu.iconName === 'Users' && <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      {menu.iconName === 'CheckSquare' && <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {menu.iconName === 'FileSpreadsheet' && <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {menu.iconName === 'Award' && <Award className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
                      {menu.iconName === 'DollarSign' && <DollarSign className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                      {menu.iconName === 'TrendingUp' && <TrendingUp className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      {menu.iconName === 'Database' && <Database className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                      {menu.iconName === 'Settings' && <Settings className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                      {menu.iconName === 'MessageSquare' && <MessageSquare className="w-3.5 h-3.5 text-violet-400 shrink-0 animate-pulse" />}
                      {menu.iconName === 'GraduationCap' && <GraduationCap className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                      {menu.iconName === 'Printer' && <Printer className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      <span>{menu.label}</span>
                    </button>
                  );
                })}

                {/* Director General exclusive entry point button if logged in (or Root SIGEP) */}
                {(loggedInStaff?.role === 'DIRECTOR_GERAL' || loggedInStaff?.role === 'SIGEP' || loggedInStaff?.is_root || loggedInStaff?.id === 'SIGEP') && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('PAINEL_DIRECTOR_GERAL');
                      setVbaLog("Acedeu ao Painel do Director Geral");
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider transition-all cursor-pointer whitespace-nowrap border ${
                      activeTab === 'PAINEL_DIRECTOR_GERAL'
                        ? 'bg-amber-500 border-amber-400 text-slate-950 font-black shadow-xs'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>DIRECTOR GERAL</span>
                  </button>
                )}

                {/* Profile & License Account Section */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('UTILIZADOR');
                    setVbaLog("Acedeu ao Perfil do Utilizador");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider transition-all cursor-pointer whitespace-nowrap border ${
                    activeTab === 'UTILIZADOR'
                      ? 'bg-indigo-600 border-indigo-500 text-white font-black'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>MINHA CONTA / LICENÇA</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden print:hidden bg-[#1E293B] text-slate-300 p-3 flex items-center justify-between border-b border-slate-800 z-10 sticky top-0 shadow-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
              title="Abrir Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center p-0.5 overflow-hidden shrink-0">
                <SiGePLogo size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xs text-white leading-none tracking-tight">SiGeP v1.1.0</span>
                <span className="text-[10px] text-indigo-400 font-extrabold leading-normal mt-0.5">
                  {TAB_NAMES_MAP[activeTab] || activeTab}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Display Active License / DB Connection Dot */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-800/80 text-[9px] font-bold font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${
                schoolSettings.syncEnabled 
                  ? dbConnected === true ? 'bg-emerald-450 animate-pulse' : 'bg-rose-500' 
                  : 'bg-slate-450'
              }`} />
              <span className="text-slate-400 uppercase">
                {schoolSettings.syncEnabled ? (dbConnected === true ? 'ON' : 'OFF') : 'LCL'}
              </span>
            </div>
            
            {/* User Initials Badge */}
            {loggedInStaff && (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold border border-indigo-500/20" title={loggedInStaff.name}>
                {loggedInStaff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Filter & Logic Bar */}
        {(activeTab === 'PAUTA1' || activeTab === 'PAUTA1TM1') && (
          <div className="bg-white border-b border-slate-200/80 p-4 shrink-0 px-6 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm z-10">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-heading">
                  {activeModality === 'ENSINO_PRIMARIO' ? 'Nível de Ensino' : 'Classe Seleccionada'}
                </label>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {getLevelsForModality().map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => handleSelectLevel(lvl.id)}
                      className={`px-3 py-1 text-[11px] font-extrabold rounded-md transition-all ${
                        selectedLevel === lvl.id
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {activeModality === 'ENSINO_PRIMARIO' ? (lvl.id === 'NIVEL1' ? 'Nível 1' : lvl.id === 'NIVEL2' ? 'Nível 2' : 'Nível 3') : `${lvl.id}ª`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-heading">Classe</label>
                {/* Selector de Classe */}
                <select
                  id="classe-top-selector"
                  value={currentClass}
                  onChange={(e) => {
                    setCurrentClass(e.target.value);
                    setVbaLog(`Filtro alterado para ${e.target.value}ª. Por favor re-execute os povoamentos.`);
                  }}
                  className="bg-indigo-50/50 text-indigo-700 border border-indigo-200/80 px-3 py-1.5 rounded font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer min-w-[100px]"
                >
                  {classesForSelectedLevel.map(cl => (
                    <option key={cl} value={cl}>{cl}ª</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-heading">Turma</label>
                {/* Selector de Turma */}
                <select
                  id="turma-top-selector"
                  value={currentSection}
                  onChange={(e) => {
                    setCurrentSection(e.target.value);
                    setVbaLog(`Filtro alterado para Turma ${e.target.value}. Por favor re-execute os povoamentos.`);
                  }}
                  className="bg-indigo-50/50 text-indigo-700 border border-indigo-200/80 px-3 py-1.5 rounded font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer min-w-[100px]"
                >
                  {filteredSectionsList.map(sec => (
                    <option key={sec} value={sec}>Turma {sec}</option>
                  ))}
                </select>
              </div>

              {(userRole === 'DIRECTOR_GERAL' || loggedInStaff?.role === 'DIRECTOR_GERAL') && (
              <>
                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-heading">Período de Fecho</span>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={isClosingPeriod}
                      onChange={(e) => setIsClosingPeriod(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </>
              )}
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                STATUS DA PLANILHA
              </p>
              <p className="text-xs font-bold text-emerald-600 flex items-center sm:justify-end gap-1.5 mt-0.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> 
                Pronto para cálculo
              </p>
            </div>
          </div>
        )}

        {/* Outer scrolling main area */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Dynamic Warning Alert on Dropout Conditions (Home only) */}
            {(activeTab === 'PAUTA1' || activeTab === 'PAUTA1TM1') && isClosingPeriod && stats.dropouts > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex items-start gap-3 animate-slideDown shadow-2xs">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold underline">Perigo de Desistência Detetado:</span> Há <strong>{stats.dropouts} aluno(s)</strong> que possuem menos de 10 notas trimestrais lançadas no período corrente. No cálculo regulamentar, eles receberão avaliação em branco e classificação final de <span className="text-amber-800 font-extrabold uppercase bg-amber-200 px-1 py-0.5 rounded">DESISTENTE</span>.
                </div>
              </div>
            )}

            {/* VBA Terminal log message emulator (Home only) */}
            {(activeTab === 'PAUTA1' || activeTab === 'PAUTA1TM1') && vbaLog && (
              <div className="bg-slate-800 border border-slate-700 text-slate-300 p-3.5 rounded-xl font-mono text-xs flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span>{vbaLog}</span>
                </div>
                <span className="text-[10px] bg-slate-705 px-2 py-0.5 rounded text-indigo-300 font-bold uppercase">SIGEP LOG</span>
              </div>
            )}

            {/* Top Grade Statistics Widgets bar (Home only) */}
            {(activeTab === 'PAUTA1' || activeTab === 'PAUTA1TM1') && (
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-heading">Alunos na Turma</div>
                    <div className="text-base font-bold text-slate-800 mt-1">{groupStudents.length} inscritos</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-750 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-heading">Transições</div>
                    <div className="text-base font-bold text-slate-800 mt-1">
                      {stats.approvalRate}% <span className="text-xs font-normal text-slate-400">({stats.approvals} apr)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                  <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-heading">Não Transitados</div>
                    <div className="text-base font-bold text-slate-800 mt-1">{stats.failures} alunos</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                  <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                    <AlertSquareWrapper />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-heading">Desistências</div>
                    <div className="text-base font-bold text-slate-800 mt-1">
                      {stats.dropouts} <span className="text-[9px] font-normal text-slate-400">{isClosingPeriod ? '(Ativo)' : '(Inat.)'}</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Spreadsheet Tab Layout Switcher / Active Panel Content Card */}
            <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[460px] ${
              (activeTab !== 'HOME') ? 'p-6 sm:p-8 bg-white' : ''
            }`}>
              
              {/* Back Arrow Button for Active Panels (seta no canto superior esquerdo para voltar) */}
              {activeTab !== 'HOME' && (
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  {loggedInStaff && ['COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA', 'COORDENADOR'].includes(loggedInStaff.role) ? (
                    activeTab !== 'FINANCEIRO' ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab('FINANCEIRO')}
                        className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center gap-2 shadow-3xs cursor-pointer group shrink-0"
                      >
                        <ArrowLeft className="w-4 h-4 text-indigo-650 group-hover:-translate-x-0.5 transition-transform" />
                        <span>Voltar às Finanças</span>
                      </button>
                    ) : <div />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('HOME')}
                      className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center gap-2 shadow-3xs cursor-pointer group shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4 text-indigo-650 group-hover:-translate-x-0.5 transition-transform" />
                      <span>Voltar ao Painel Principal</span>
                    </button>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-heading font-black uppercase text-slate-700 tracking-wider">
                      {activeTab === 'PAINEL_PAUTAS' ? 'Pautas Gerais de Aproveitamento' :
                       activeTab === 'PAINEL_MINI_PAUTAS' ? 'Lançamento de Notas / Mini Pautas' :
                       activeTab === 'Cadastro_BaseDados' ? 'Cadastro Geral de Alunos' :
                       activeTab === 'MINI_PAUTA1_BANCODADOS' ? 'Banco de Dados de Classificações' :
                       activeTab === 'RELACAO_NOMINAL' ? 'Relação Nominal de Turma' :
                       activeTab === 'CABECALHO' ? 'Células de Identidade da Escola' :
                       activeTab === 'RECURSOS_HUMANOS' ? 'Gestão de Recursos Humanos (RH)' :
                       activeTab === 'UTILIZADOR' ? 'Perfil de Acesso & Licença' :
                       activeTab === 'FINANCEIRO' ? 'Gestão Financeira Escolar' :
                       activeTab === 'DECLARACOES_CERTIFICADOS' ? 'Emissão de Documentos Oficiais' :
                       activeTab === 'RELATORIOS' ? 'Painel de Relatórios Estatísticos' :
                       activeTab === 'PAINEL_DIRECTOR_GERAL' ? 'Painel de Auditoria do Director Geral' :
                       activeTab === 'COMUNICACAO' ? 'Chat do Staff Escolar' :
                       activeTab === 'AREA_ACADEMICA' ? 'Área Académica - Currículos' :
                       activeTab === 'ESTATISTICAS' ? 'Estatísticas Escolares' : 'Módulo Ativo'}
                    </span>
                  </div>
                </div>
              )}

              {/* Secondary Navigation bar inside content (Home spreadsheet view only) */}
              {(activeTab === 'PAUTA1' || activeTab === 'PAUTA1TM1') && (
                <div className="flex border-b border-slate-200 overflow-x-auto custom-scrollbar bg-slate-50/50 p-2 gap-1 md:hidden">
                  <button
                  type="button"
                  onClick={() => setActiveTab('PAUTA1TM1')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11.5px] font-heading font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                    activeTab === 'PAUTA1TM1'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  MINI PAUTA - {selectedLevel === 'NIVEL1' ? 'Nível 1' : selectedLevel === 'NIVEL2' ? 'Nível 2' : selectedLevel === 'NIVEL3' ? 'Nível 3' : `${selectedLevel}ª`}
                </button>

                {(userRole !== 'PROFESSOR' && loggedInStaff?.role !== 'PROFESSOR') && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('PAUTA1')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11.5px] font-heading font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                        activeTab === 'PAUTA1'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Pauta Geral
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('RELACAO_NOMINAL')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11.5px] font-heading font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                        (activeTab as string) === 'RELACAO_NOMINAL'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Relação Nominal
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('AREA_ACADEMICA')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11.5px] font-heading font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                        (activeTab as string) === 'AREA_ACADEMICA'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Área Académica
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('FINANCEIRO')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11.5px] font-heading font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                        (activeTab as string) === 'FINANCEIRO'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      Secção Financeira
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('MINI_PAUTA1_BANCODADOS')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11.5px] font-heading font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                        (activeTab as string) === 'MINI_PAUTA1_BANCODADOS'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5" />
                      Base de Dados
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('CABECALHO')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11.5px] font-heading font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                        (activeTab as string) === 'CABECALHO'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Cabeçalho / Escola
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('RECURSOS_HUMANOS')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11.5px] font-heading font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                        (activeTab as string) === 'RECURSOS_HUMANOS'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 text-purple-450" />
                      Recursos Humanos (RH)
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('UTILIZADOR')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11.5px] font-heading font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                    (activeTab as string) === 'UTILIZADOR'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Utilizador / Perfil
                </button>
              </div>
              )}

              <div className="p-4 sm:p-6">
                {/* Cabeçalho de Identificação do Módulo Activo (Substitui o aviso de licença superior) */}
                <div className="mb-6 bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                      <Database className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest block mb-0.5">Módulo Activo do SIGEP</span>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                        {activeTab === 'PAUTA1' ? 'Pauta Geral de Classificações' : 
                         activeTab === 'PAUTA1TM1' ? `MINI PAUTA - ${selectedLevel === 'NIVEL1' ? 'Nível 1' : selectedLevel === 'NIVEL2' ? 'Nível 2' : selectedLevel === 'NIVEL3' ? 'Nível 3' : `${selectedLevel}ª`}` :
                         activeTab === 'Cadastro_BaseDados' ? 'Cadastro Geral de Alunos e Matrículas' : 
                         activeTab === 'RELACAO_NOMINAL' ? 'Relação Nominal Oficial de Turma' : 
                         activeTab === 'CABECALHO' ? 'Células de Identidade da Escola / Ano Lectivo' : 
                         activeTab === 'RECURSOS_HUMANOS' ? 'Gestão de Recursos Humanos (Docentes e Staff)' : 
                         activeTab === 'UTILIZADOR' ? 'Perfil de Acesso do Utilizador e Licenciamento' : 
                         activeTab === 'DECLARACOES_CERTIFICADOS' ? 'Emissão de Declarações & Certificados Académicos' :
                         activeTab === 'FINANCEIRO' ? 'Gestão Financeira e Controlo de Mensalidades' : 
                         activeTab === 'AREA_ACADEMICA' ? 'Área Académica - Cursos & Especialidades' :
                         activeTab === 'ESTATISTICAS' ? 'Estatísticas Escolares Oficiais (Gráficos Dinâmicos)' : 'Página Inicial - Painel Geral de Métricas'}
                      </h2>
                    </div>
                  </div>

                  {/* Alerta do Estado de Conexão da Base de Dados (Substitui o alerta de licença) */}
                  <div className="shrink-0">
                    {dbConnected === true ? (
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-150 text-emerald-900 rounded-xl px-3.5 py-2 text-[10.5px] font-semibold shadow-3xs">
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <Database className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                        <span>PostgreSQL: <span className="font-extrabold uppercase text-emerald-600">LIGADO (sigep_db)</span></span>
                      </div>
                    ) : dbConnected === false ? (
                      <div className="flex items-center gap-2 bg-rose-50 border border-rose-150 text-rose-900 rounded-xl px-3.5 py-2 text-[10.5px] font-semibold animate-pulse shadow-3xs">
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                        </span>
                        <Database className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                        <span>PostgreSQL: <span className="font-extrabold uppercase text-rose-600">DESLIGADO</span></span>
                        <button
                          type="button"
                          onClick={() => {
                            setDbConnected(null);
                            setTimeout(() => {
                              fetch('/api/health')
                                .then(res => res.json())
                                .then(data => setDbConnected(data.connected === true))
                                .catch(() => setDbConnected(false));
                            }, 1000);
                          }}
                          className="ml-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-2 py-1 rounded-lg text-[9.5px] uppercase tracking-wide transition-all cursor-pointer shadow-px"
                        >
                          Tentar Ligar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-150 text-indigo-900 rounded-xl px-3.5 py-2 text-[10.5px] font-semibold animate-pulse shadow-3xs">
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                        </span>
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                        <span>PostgreSQL: <span className="font-extrabold uppercase text-indigo-600">A LIGAR...</span></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Aviso Crítico de Licença Expirada (Bloqueante) */}
                {loggedInStaff?.role === 'DIRECTOR_GERAL' && diasRestantes <= 0 && (
                  <div className="mb-6 bg-rose-50 border-2 border-rose-200 text-rose-950 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-pulse">
                    <div className="flex items-start gap-3 text-left">
                      <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                      </div>
                      <div>
                        <span className="block font-bold text-sm text-rose-900 leading-tight">SISTEMA BLOQUEADO - LICENÇA EXPIRADA</span>
                        <span className="block text-xs text-rose-750 mt-1 leading-normal">
                          O período operacional de homologação offline desta cópia do SiGeP v1.1.0 expirou há <b>{Math.abs(diasRestantes)} dias</b>. Para proteger a integridade dos dados escolares e cumprir os termos de licença institucional, os recursos de edição de notas, relatórios oficiais e exportações de pautas foram preventivamente suspensos.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('UTILIZADOR');
                        setTimeout(() => {
                          const card = document.getElementById('license-management-card');
                          if (card) {
                            card.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                      className="bg-rose-650 hover:bg-rose-750 bg-rose-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shadow-px shrink-0"
                    >
                      Introduzir Nova Chave
                    </button>
                  </div>
                )}

                {/* Conditional Sheet Content mounting */}
                {activeTab === 'PAINEL_PAUTAS' && (
                  <PainelPautas
                    students={hermeticStudents}
                    grades={hermeticGrades}
                    staffList={staffList}
                    activeModality={activeModality}
                    setActiveModality={setActiveModality}
                    currentClass={currentClass}
                    setCurrentClass={setCurrentClass}
                    currentSection={currentSection}
                    setCurrentSection={setCurrentSection}
                    isClosingPeriod={isClosingPeriod}
                    setIsClosingPeriod={setIsClosingPeriod}
                    handleUpdateGradeMT={handleUpdateGradeMT}
                    handleUpdateGradeFields={handleUpdateGradeFields}
                    handlePovoarAlunosSub={handlePovoarAlunosSub}
                    handleConsolidarNotasSub={handleConsolidarNotasSub}
                    userRole={userRole}
                    loggedInStaff={loggedInStaff}
                    schoolSettings={schoolSettings}
                    useNpp={useNpp}
                    onToggleNpp={handleToggleNpp}
                  />
                )}

                {activeTab === 'PAINEL_MINI_PAUTAS' && (
                  <PainelMiniPautas
                    students={hermeticStudents}
                    grades={hermeticGrades}
                    staffList={staffList}
                    activeModality={activeModality}
                    setActiveModality={setActiveModality}
                    currentClass={currentClass}
                    setCurrentClass={setCurrentClass}
                    currentSection={currentSection}
                    setCurrentSection={setCurrentSection}
                    isClosingPeriod={isClosingPeriod}
                    setIsClosingPeriod={setIsClosingPeriod}
                    handleUpdateGradeFields={handleUpdateGradeFields}
                    handlePovoarAlunosSub={handlePovoarAlunosSub}
                    userRole={userRole}
                    loggedInStaff={loggedInStaff}
                    schoolSettings={schoolSettings}
                    useNpp={useNpp}
                    onToggleNpp={handleToggleNpp}
                  />
                )}

                {activeTab === 'PAUTA1' && (
                  <StatsDashboard
                    students={hermeticStudents}
                    grades={hermeticGrades}
                    settings={schoolSettings}
                    userRole={loggedInStaff ? loggedInStaff.role : ''}
                  />
                )}

                {activeTab === 'PAUTA1TM1' && (
                  <StatsDashboard
                    students={hermeticStudents}
                    grades={hermeticGrades}
                    settings={schoolSettings}
                    userRole={loggedInStaff ? loggedInStaff.role : ''}
                  />
                )}

                {activeTab === 'RELACAO_NOMINAL' && (
                  <RelacaoNominal
                    students={hermeticStudents}
                    currentClass={currentClass}
                    currentSection={currentSection}
                    userRole={userRole}
                    schoolSettings={schoolSettings}
                    loggedInStaff={loggedInStaff}
                    staffList={staffList}
                    activeModality={activeModality}
                  />
                )}

                {activeTab === 'CABECALHO' && (
                  <CabecalhoSettings
                    settings={schoolSettings}
                    onChangeSettings={handleUpdateSchoolSettings}
                    userRole={userRole}
                    onPullData={(onProgress) => pullData(schoolSettings, onProgress)}
                    onPushData={(onProgress) => pushData(schoolSettings, onProgress)}
                  />
                )}

                {activeTab === 'RECURSOS_HUMANOS' && (
                  <RecursosHumanos
                    staffList={staffList}
                    onAddStaff={handleAddStaff}
                    onDeleteStaff={handleDeleteStaff}
                    onClearAllStaff={() => {
                      console.log('[RH RESET] Limpando todo o banco de dados de Recursos Humanos...');
                      setStaffList([]);
                      saveStaffToLocalStorage([]);
                      localStorage.setItem('sigep_rh_cleared', 'true');
                      setLoggedInStaff(null);
                      safeSetItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY, 'null');

                      fetch('/api/funcionarios_all', { method: 'DELETE' }).catch(err => console.warn("Erro ao apagar funcionarios no backend local:", err));
                      if (schoolSettings.syncEnabled && schoolSettings.syncServerUrl) {
                        fetch(`${schoolSettings.syncServerUrl}/api/funcionarios_all`, { method: 'DELETE' }).catch(err => console.warn("Erro ao apagar funcionarios no backend remoto:", err));
                      }

                      handleLogout([]);
                    }}
                    userRole={userRole}
                    canEdit={canUserEditModule('RH')}
                    loggedInStaff={loggedInStaff}
                    activeModality={activeModality}
                    schoolSettings={schoolSettings}
                  />
                )}

                {activeTab === 'UTILIZADOR' && (
                  <UserSection
                    userRole={userRole}
                    schoolSettings={schoolSettings}
                    vbaLogs={vbaLog || ""}
                    loggedInStaff={loggedInStaff}
                    onLogout={handleLogout}
                    onUpdatePassword={handleUpdateStaffPassword}
                    staffList={staffList}
                    onSwitchProfile={handleLoginSuccess}
                    licencaChave={licencaChave}
                    licencaInicio={licencaInicio}
                    licencaFim={licencaFim}
                    diasRestantes={diasRestantes}
                    onUpdateLicenca={handleUpdateLicenca}
                    onSetDiasRestantes={handleSetDiasRestantes}
                  />
                )}

                {activeTab === 'Cadastro_BaseDados' && (
                  <PainelMatriculas
                    students={hermeticStudents}
                    onAddStudent={handleAddStudent}
                    onDeleteStudent={handleDeleteStudent}
                    classes={classesList}
                    sections={sectionsList}
                    userRole={userRole}
                    loggedInStaff={loggedInStaff}
                    activeModality={activeModality}
                    schoolSettings={schoolSettings}
                  />
                )}

                {activeTab === 'MINI_PAUTA1_BANCODADOS' && (
                  <RawGradesDatabase
                    grades={hermeticGrades}
                    students={hermeticStudents}
                    onAddGrade={(g) => saveState(students, [...grades, g])}
                    onUpdateValue={handleUpdateRawValue}
                    userRole={userRole}
                    loggedInStaff={loggedInStaff}
                    schoolSettings={schoolSettings}
                    activeModality={activeModality}
                  />
                )}

                {activeTab === 'FINANCEIRO' && (
                  <SeccaoFinanceira
                    students={hermeticStudents}
                    userRole={userRole}
                    loggedInStaff={loggedInStaff}
                    diasRestantes={diasRestantes}
                    staffList={staffList}
                    canEdit={canUserEditModule('FINANCAS')}
                  />
                )}

                {activeTab === 'DECLARACOES_CERTIFICADOS' && (
                  <DeclaracoesCertificados
                    students={hermeticStudents}
                    grades={hermeticGrades}
                    schoolSettings={schoolSettings}
                    userRole={userRole}
                    loggedInStaff={loggedInStaff}
                    activeModality={activeModality}
                  />
                )}

                {loggedInStaff && activeTab === 'PAINEL_DIRECTOR_GERAL' && (
                  <DirectorGeneralPanel
                    staffList={staffList}
                    onUpdatePermissions={handleUpdatePermissions}
                    permissions={permissions}
                    auditLogs={auditLogs}
                    onClearLogs={handleClearLogs}
                    loggedInStaff={loggedInStaff}
                    isResetAllowed={isResetAllowed}
                    onToggleResetAllowed={handleToggleResetAllowed}
                    onResetDatabase={handleResetDatabase}
                    resetConfirmActive={resetConfirmActive}
                    schoolSettings={schoolSettings}
                    onCloseAcademicYear={handleCloseAcademicYear}
                    onUpdateSchoolSettings={handleUpdateSchoolSettings}
                    financeRecords={propinasRecords}
                    onNavigateToFinance={() => setActiveTab('FINANCEIRO')}
                  />
                )}

                {activeTab === 'RELATORIOS' && (
                  <RelatoriosPanel
                    students={hermeticStudents}
                    grades={hermeticGrades}
                    currentSubTab={selectedReportSubTab}
                    activeModality={activeModality}
                  />
                )}

                {activeTab === 'AREA_ACADEMICA' && (
                  <AcademicArea
                    userRole={loggedInStaff ? loggedInStaff.role : ''}
                    students={hermeticStudents}
                    grades={hermeticGrades}
                    onSaveState={saveState}
                    schoolSettings={schoolSettings}
                    onAddStudent={handleAddStudent}
                    onDeleteStudent={handleDeleteStudent}
                    classes={classesList}
                    sections={sectionsList}
                    loggedInStaff={loggedInStaff}
                    activeModality={activeModality}
                    initialTab={academicSubTab}
                    onTabChange={(tab) => setAcademicSubTab(tab)}
                    canEdit={canUserEditModule('AREA_ACADEMICA') || canUserEditModule('MATRICULA')}
                  />
                )}

                {activeTab === 'HOME' && (
                  <>
                    {loggedInStaff && (
                      <PainelAlertasChefia
                        loggedInStaff={loggedInStaff}
                        staffList={staffList}
                        financeRecords={propinasRecords}
                        schoolSettings={schoolSettings}
                        onNavigateToFinance={() => setActiveTab('FINANCEIRO')}
                      />
                    )}
                    <StatsDashboard
                      students={hermeticStudents}
                      grades={hermeticGrades}
                      settings={schoolSettings}
                      userRole={loggedInStaff ? loggedInStaff.role : ''}
                      activeModality={activeModality}
                      currentClass={currentClass}
                      currentSection={currentSection}
                      isHome={true}
                    />
                  </>
                )}

                {loggedInStaff && activeTab === 'COMUNICACAO' && (
                  <ChatStaff
                    loggedInStaff={loggedInStaff}
                    staffList={staffList}
                  />
                )}
              </div>
            </div>

            {/* Student 360 view Modal overlay */}
            {selected360Student && (
              <Student360Modal
                student={selected360Student}
                grades={hermeticGrades}
                onClose={() => {
                  setSelected360Student(null);
                  setUniversalSearchQuery('');
                }}
              />
            )}

            {/* --- CENTRAL DE AUTORIZAÇÕES (Shield de Notas) MODAL --- */}
            {isAuthHubOpen && (
              <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp">
                  
                  {/* Header */}
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex justify-between items-center border-b border-indigo-950">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                        <ShieldCheck className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-sans font-extrabold text-sm uppercase tracking-wider">Central de Autorizações</h3>
                        <p className="text-[10px] text-indigo-355 font-bold">Assinaturas Digitais e Desbloqueio de Notas SIGEP</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAuthHubOpen(false);
                        setSigningRequestId(null);
                        setAuthHubPasswordConfirm('');
                        setAuthHubError(null);
                        setAuthHubSuccess(null);
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 overflow-y-auto space-y-4">
                    
                    {/* Role Indicator Banner */}
                    <div className="p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold bg-slate-50 border-slate-200">
                      <div className="flex items-center gap-2 text-slate-700">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                        <span>Seu Perfil de Acesso: <span className="text-indigo-950 font-extrabold">{loggedInStaff?.name} ({loggedInStaff?.role === 'SIGEP' || loggedInStaff?.is_root ? 'Administrador Master SIGEP' : loggedInStaff?.role === 'DIRECTOR_GERAL' ? 'Director Geral' : loggedInStaff?.role === 'SUB_DIRECTOR_PEDAGOGICO' ? 'Subdirector Pedagógico' : 'Utilizador Comum'})</span></span>
                      </div>
                      {!(loggedInStaff?.role === 'DIRECTOR_GERAL' || loggedInStaff?.role === 'SUB_DIRECTOR_PEDAGOGICO' || loggedInStaff?.role === 'SIGEP' || loggedInStaff?.is_root) && (
                        <span className="text-[9.5px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-amber-700 font-extrabold uppercase">Modo Leitura</span>
                      )}
                    </div>

                    {authHubError && (
                      <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-2xl border border-red-150 font-bold animate-fadeIn">
                        {authHubError}
                      </div>
                    )}

                    {authHubSuccess && (
                      <div className="bg-emerald-50 text-emerald-700 text-xs p-3.5 rounded-2xl border border-emerald-150 font-bold animate-fadeIn">
                        {authHubSuccess}
                      </div>
                    )}

                    {/* Pending and Previous Requests */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Lista de Solicitações d'Alteração</h4>
                      
                      {gradeRequests.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-slate-200 rounded-3xl space-y-2">
                          <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs text-slate-500 font-bold">Nenhuma solicitação registada na base de dados.</p>
                          <p className="text-[10px] text-slate-400">Pedidos feitos pelas secretarias ou professores aparecerão aqui em tempo real.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {gradeRequests.map((req: any) => {
                            const isPending = req.status === 'PENDING';
                            const isApproved = req.status === 'APPROVED';
                            const isRejected = req.status === 'REJECTED';
                            
                            return (
                              <div 
                                key={req.id} 
                                className={`border rounded-2.5xl p-4.5 space-y-3 transition-all ${
                                  isPending ? 'bg-amber-50/20 border-amber-200 shadow-3xs' :
                                  isApproved ? 'bg-emerald-50/15 border-emerald-150' : 'bg-slate-50/50 border-slate-200'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-4">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-slate-900 font-extrabold text-xs">{req.studentName} ({req.studentId})</span>
                                      <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-650 font-mono font-bold">Trimestre {req.trimester}º</span>
                                      <span className="text-[9.5px] text-indigo-750 font-extrabold font-mono">{req.subject}</span>
                                    </div>
                                    <p className="text-[10.5px] text-slate-500 mt-1 font-semibold">
                                      Solicitante: <span className="text-slate-800 font-extrabold">{req.requesterName}</span> | Motivo: <span className="text-slate-700 italic font-medium">"{req.reason}"</span>
                                    </p>
                                    <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">Realizado em {new Date(req.timestamp).toLocaleString('pt-PT')}</span>
                                  </div>

                                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                                    {isPending && (
                                      <span className="text-[9px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">Aguardando Assinatura</span>
                                    )}
                                    {isApproved && (
                                      <div className="text-right">
                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">Aprovado e Assinado</span>
                                        <span className="text-[8.5px] text-slate-500 block mt-1 font-bold font-mono">Cód: {req.code}</span>
                                      </div>
                                    )}
                                    {isRejected && (
                                      <span className="text-[9px] bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">Recusado / Indeferido</span>
                                    )}
                                  </div>
                                </div>

                                {/* Signing Controls */}
                                {isPending && (loggedInStaff?.role === 'DIRECTOR_GERAL' || loggedInStaff?.role === 'SUB_DIRECTOR_PEDAGOGICO' || loggedInStaff?.role === 'SIGEP' || loggedInStaff?.is_root) && (
                                  <div className="pt-3 border-t border-dashed border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 -mx-4.5 -mb-4.5 p-4.5 rounded-b-2.5xl">
                                    {signingRequestId === req.id ? (
                                      <div className="w-full space-y-2.5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                          <label className="text-[10px] font-black text-indigo-950 uppercase tracking-wide block">Introduza a sua Senha d'Acesso para Assinatura</label>
                                          <button
                                            type="button"
                                            onClick={() => setSigningRequestId(null)}
                                            className="text-[9.5px] text-rose-600 font-bold hover:underline"
                                          >
                                            Cancelar Assinatura
                                          </button>
                                        </div>
                                        <div className="flex gap-2">
                                          <input
                                            type="password"
                                            value={authHubPasswordConfirm}
                                            onChange={(e) => setAuthHubPasswordConfirm(e.target.value)}
                                            placeholder="Sua senha pessoal..."
                                            className="bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full shadow-inner font-mono"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleApproveGradeRequest(req.id, authHubPasswordConfirm)}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
                                          >
                                            Confirmar e Assinar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-full flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleRejectGradeRequest(req.id)}
                                          className="bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                                        >
                                          Indeferir Pedido
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSigningRequestId(req.id);
                                            setAuthHubError(null);
                                            setAuthHubSuccess(null);
                                          }}
                                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer"
                                        >
                                          <ShieldCheck className="w-3.5 h-3.5" />
                                          Assinar e Liberar Nota
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Footer */}
                  <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold font-mono">
                    SISTEMA INTEGRADO DE GESTÃO ESCOLAR PROFISSIONAL • SIGEP SHIELD V1.1
                  </div>

                </div>
              </div>
            )}

            {/* Footer Status Brand */}
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-medium px-4 py-3 bg-white border-t border-slate-200/80 rounded-xl mt-4 shrink-0 shadow-xs gap-2 select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>SiGeP Academic Engine • v1.1.0 Estável</span>
                <span className="text-slate-300">|</span>
                <span className="font-semibold text-slate-600">Fabricante: SIGEP-Group</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => window.location.href = 'mailto:suport.sigep@outlook.com'}
                  className="group relative flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors font-bold cursor-pointer"
                  title="Precisa de ajuda? Fale connosco."
                >
                  <Headset className="w-3.5 h-3.5 text-indigo-550" />
                  <span>Suporte Técnico: suport.sigep@outlook.com</span>
                  <span className="absolute bottom-full mb-2 hidden group-hover:block whitespace-nowrap bg-slate-900 text-white text-[10px] font-extrabold py-1 px-2 rounded-md shadow-lg border border-slate-700 right-0 z-50">
                    Precisa de ajuda? Fale connosco.
                  </span>
                </button>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="font-mono text-[10px] font-bold text-slate-500">Fabricante Oficial: SIGEP-Group</span>
              </div>
            </div>

            {/* Modal de Consulta e Histórico de Anos Lectivos Anteriores */}
            <HistoricoAnosModal
              isOpen={isHistoricoModalOpen}
              onClose={() => setIsHistoricoModalOpen(false)}
              currentStudents={hermeticStudents}
              currentGrades={hermeticGrades}
              schoolSettings={schoolSettings}
              userRole={userRole}
              staffList={staffList}
              loggedInStaff={loggedInStaff}
              onSelectYearForDocuments={(year) => {
                setActiveTab('DECLARACOES_CERTIFICADOS');
              }}
            />

            {/* Modal de Alteração Obrigatória de Senha Expirada / Pós-Restauro */}
            {loggedInStaff && (loggedInStaff.senha_expirada || loggedInStaff.password_expired) && (
              <PasswordChangeModal
                staff={loggedInStaff}
                onPasswordUpdated={(updatedStaff) => {
                  setLoggedInStaff(updatedStaff);
                  safeSetSessionItem(LOCAL_STORAGE_LOGGED_IN_STAFF_KEY, JSON.stringify(updatedStaff));
                  setStaffList(prev => prev.map(s => String(s.id).trim().toUpperCase() === String(updatedStaff.id).trim().toUpperCase() ? updatedStaff : s));
                }}
              />
            )}

          </div>
        </div>
      </div>
    </div>
    </HermeticSubsystemProvider>
    </SchoolSettingsProvider>
  );
}

// Wrapper for visual compatibility
function AlertSquareWrapper() {
  return <Info className="w-5 h-5" />;
}
