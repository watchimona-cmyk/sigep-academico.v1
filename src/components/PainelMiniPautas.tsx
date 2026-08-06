import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  GraduationCap, 
  Layers, 
  Users, 
  ChevronLeft, 
  ArrowRight, 
  CheckCircle,
  Clock,
  Lock,
  Calendar,
  Award,
  Plus,
  BookOpen,
  Printer,
  Save,
  AlertTriangle,
  Sparkles,
  CreditCard,
  Search,
  X,
  User,
  CheckCircle2,
  Trash,
  Edit3,
  Shield,
  ShieldAlert,
  Unlock,
  Mail,
  RefreshCw,
  FileText
} from 'lucide-react';
import { Student, GradeRow, SchoolSettings, Staff, UserRole, SubjectType, ModalityType, getSubjectsForStudent, carregarGrelhaCurricular, getSpecialtyFromSection, getSpecialtyFullName } from '../types';
import { formatarNomePauta, gerarCodigoPauta } from '../utils/pautaLogic';
import { getSectionsList } from '../utils';
import { jsPDF } from 'jspdf';

const ALL_PUNIV_SPECIALTIES = [
  { code: 'CFB', label: 'Ciências Físicas e Biológicas (CFB)' },
  { code: 'CEJ', label: 'Ciências Económico-Jurídicas (CEJ)' },
  { code: 'CS', label: 'Ciências Sociais / Humanas (CS)' },
  { code: 'AV', label: 'Artes Visuais (AV)' },
];

const ALL_MAGISTERIO_SPECIALTIES = [
  { code: 'MF', label: 'Matemática e Física (Mat-Fisica)' },
  { code: 'GH', label: 'História e Geografia (Geo-Historia)' },
  { code: 'BQ', label: 'Biologia e Química (Bio-química)' },
  { code: 'LEMC', label: 'Português e EMC' },
  { code: 'ING_EMC', label: 'Inglês e EMC' },
  { code: 'FRA_EMC', label: 'Francês e EMC' },
  { code: 'EVP', label: 'Educação Visual e Plástica (EVP)' },
  { code: 'EDF', label: 'Educação Física (Ed.F)' },
  { code: 'EMC', label: 'Educação Moral e Cívica (EMC)' },
  { code: 'EP', label: 'Ensino Primário' },
  { code: 'PE', label: 'Pré-Escolar' },
];

interface PainelMiniPautasProps {
  students: Student[];
  grades: GradeRow[];
  staffList: Staff[];
  activeModality: ModalityType;
  setActiveModality: (m: ModalityType) => void;
  currentClass: string;
  setCurrentClass: (c: string) => void;
  currentSection: string;
  setCurrentSection: (s: string) => void;
  isClosingPeriod: boolean;
  setIsClosingPeriod: (b: boolean) => void;
  handleUpdateGradeFields: (
    studentId: string,
    subject: SubjectType,
    trimester: 'I' | 'II' | 'III',
    fields: { mac?: number | null; npp?: number | null; npt?: number | null; mt?: number | null }
  ) => void;
  handlePovoarAlunosSub: any;
  userRole: UserRole;
  loggedInStaff: Staff | null;
  schoolSettings: SchoolSettings;
  useNpp?: boolean;
  onToggleNpp?: (val: boolean) => void;
}

export default function PainelMiniPautas({
  students,
  grades,
  staffList,
  activeModality,
  setActiveModality,
  currentClass,
  setCurrentClass,
  currentSection,
  setCurrentSection,
  isClosingPeriod,
  setIsClosingPeriod,
  handleUpdateGradeFields,
  handlePovoarAlunosSub,
  userRole,
  loggedInStaff,
  schoolSettings,
  useNpp = false,
  onToggleNpp
}: PainelMiniPautasProps) {
  
  // Local state for the centralized cadernetas selector panel
  const [isViewingMiniPauta, setIsViewingMiniPauta] = useState<boolean>(false);
  const [localModality, setLocalModality] = useState<ModalityType>(() => {
    // Default to the first active component
    if (schoolSettings.activeComponents?.ENSINO_PRIMARIO !== false) return 'ENSINO_PRIMARIO';
    if (schoolSettings.activeComponents?.PUNIV !== false) return 'PUNIV';
    if (schoolSettings.activeComponents?.MAGISTERIO !== false) return 'MAGISTERIO';
    return 'ENSINO_PRIMARIO';
  });

  const [localClass, setLocalClass] = useState<string>(() => {
    return localModality === 'ENSINO_PRIMARIO' ? '1' : '10';
  });
  
  const [localSection, setLocalSection] = useState<string>('A');
  const [localSpecialty, setLocalSpecialty] = useState<string>(() => {
    if (localModality === 'PUNIV') return 'CFB';
    if (localModality === 'MAGISTERIO') return 'MF';
    return 'GERAL';
  });

  const [localSubject, setLocalSubject] = useState<SubjectType>('L. PORTUGUESA');
  const [localTrimester, setLocalTrimester] = useState<'I' | 'II' | 'III'>('I');



  // --- ROLE CHECKS ---
  const isProfessorRole = userRole === 'PROFESSOR' || (loggedInStaff && loggedInStaff.role === 'PROFESSOR');
  
  const isAdminUser = (userRole as string) === 'DIRECTOR_GERAL' || userRole === 'SUB_DIRECTOR_PEDAGOGICO' || (loggedInStaff && (loggedInStaff.role === 'DIRECTOR_GERAL' || loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO'));

  // --- STRICT ACCESS CONTROL & REAL-TIME WEBSOCKET LOCKS STATE ---
  const [activeTemporaryUnlocks, setActiveTemporaryUnlocks] = useState<any[]>([]);

  useEffect(() => {
    const syncUnlocks = () => {
      try {
        const raw = localStorage.getItem('sigep_temporary_unlocks_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          // Filter out expired locks
          const validUnlocks = parsed.filter((u: any) => u.expiresAt > Date.now());
          if (validUnlocks.length !== parsed.length) {
            localStorage.setItem('sigep_temporary_unlocks_v1', JSON.stringify(validUnlocks));
          }
          setActiveTemporaryUnlocks(validUnlocks);
        } else {
          setActiveTemporaryUnlocks([]);
        }
      } catch (e) {
        console.error(e);
      }
    };

    syncUnlocks();
    window.addEventListener('storage', syncUnlocks);
    const interval = setInterval(syncUnlocks, 1000); // 1s interval for countdown updates!
    return () => {
      window.removeEventListener('storage', syncUnlocks);
      clearInterval(interval);
    };
  }, []);

  const isTrimesterClosed = (trimester: 'I' | 'II' | 'III') => {
    if (trimester === 'I') return (schoolSettings?.trimesterI_Status || 'ABERTO') === 'FECHADO';
    if (trimester === 'II') return (schoolSettings?.trimesterII_Status || 'FECHADO') === 'FECHADO';
    if (trimester === 'III') return (schoolSettings?.trimesterIII_Status || 'FECHADO') === 'FECHADO';
    return false;
  };

  const isTrimesterSequenceBlocked = (trimester: 'I' | 'II' | 'III') => {
    if (trimester === 'I') return false;
    if (trimester === 'II') {
      // Se o Director Geral abriu explicitamente o IIº Trimestre, não está bloqueado!
      if (schoolSettings?.trimesterII_Status === 'ABERTO') return false;
      const trimIStatus = schoolSettings?.trimesterI_Status || 'ABERTO';
      return trimIStatus === 'ABERTO';
    }
    if (trimester === 'III') {
      // Se o Director Geral abriu explicitamente o IIIº Trimestre, não está bloqueado!
      if (schoolSettings?.trimesterIII_Status === 'ABERTO') return false;
      const trimIIStatus = schoolSettings?.trimesterII_Status || 'FECHADO';
      return trimIIStatus === 'ABERTO';
    }
    return false;
  };

  const isSelectedTrimesterClosedForTeacher = (trimester: 'I' | 'II' | 'III') => {
    return isTrimesterClosed(trimester);
  };

  const isGradeImmutableForTeacher = (studentId: string, subject: string, trimester: 'I' | 'II' | 'III') => {
    if (isAdminUser) return false;
    const hasActiveTemporaryUnlock = activeTemporaryUnlocks.some(
      u => u.studentId === studentId && u.subject === subject && u.trimester === trimester && u.expiresAt > Date.now()
    );
    if (hasActiveTemporaryUnlock) return false;

    const gRecord = grades.find(g => g.studentId === studentId && g.subject === subject && g.trimester === trimester);
    const hasExistingGrade = gRecord && (gRecord.mac !== null || gRecord.npp !== null || gRecord.npt !== null);
    return !!hasExistingGrade;
  };

  const isCellEditableByProfessor = (studentId: string, subject: string, trimester: 'I' | 'II' | 'III') => {
    // 0. STRICT PROFESSOR SUBJECT PERMISSION GATE:
    // A professor can ONLY launch or edit grades for subjects assigned during registration
    if (isProfessorRole && loggedInStaff && loggedInStaff.role === 'PROFESSOR') {
      const assigned = loggedInStaff.subjects || [];
      if (!assigned.includes(subject as SubjectType)) {
        return false;
      }
    }

    // 1. Check if trimester status is FECHADO by Director or blocked in sequence
    if (isTrimesterClosed(trimester) || isTrimesterSequenceBlocked(trimester)) {
      // Allow only if there's an explicit active temporary unlock for this cell
      const hasActiveTemporaryUnlock = activeTemporaryUnlocks.some(
        u => u.studentId === studentId && u.subject === subject && u.trimester === trimester && u.expiresAt > Date.now()
      );
      if (hasActiveTemporaryUnlock) return true;
      return false;
    }

    if (isAdminUser) return true;
    if (!isProfessorRole) return true;

    // Check if there is an active temporary unlock
    const hasActiveTemporaryUnlock = activeTemporaryUnlocks.some(
      u => u.studentId === studentId && u.subject === subject && u.trimester === trimester && u.expiresAt > Date.now()
    );
    if (hasActiveTemporaryUnlock) return true;

    // By default, if teacher grade entry is disabled globally, they can't edit
    const globalAllowed = schoolSettings?.allowTeacherGradeEntry === true;
    if (!globalAllowed) return false;

    // Check if grade already exists (Imutabilidade de Notas Lançadas)
    if (isGradeImmutableForTeacher(studentId, subject, trimester)) {
      return false;
    }

    return true;
  };

  const handleCreateTemporaryUnlock = (studentId: string, subject: string, trimester: 'I' | 'II' | 'III') => {
    try {
      const raw = localStorage.getItem('sigep_temporary_unlocks_v1');
      const parsed = raw ? JSON.parse(raw) : [];
      const newUnlock = {
        studentId,
        subject,
        trimester,
        expiresAt: Date.now() + 120000
      };
      const updated = [...parsed.filter((u: any) => !(u.studentId === studentId && u.subject === subject && u.trimester === trimester)), newUnlock];
      localStorage.setItem('sigep_temporary_unlocks_v1', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));

      const chatLogs = JSON.parse(localStorage.getItem('sigep_log_comunicacao_interna_v2') || '[]');
      const sysMsg = {
        id: `sys-unlocked-${Date.now()}`,
        remetente_id: 'SYSTEM',
        remetente_nome: 'Segurança SIGEP',
        remetente_cargo: 'Desbloqueio',
        destinatario_id: 'pautas-pedagogico',
        mensagem: `🔓 NOTA DESBLOQUEADA EM TEMPO REAL:
Aluno ID: ${studentId}
Disciplina: ${subject} | Trimestre: ${trimester}º
Autorizado por: ${loggedInStaff ? loggedInStaff.name : 'Director Geral'}
Validade: 2 Minutos (Expira em: ${new Date(newUnlock.expiresAt).toLocaleTimeString()})`,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('sigep_log_comunicacao_interna_v2', JSON.stringify([...chatLogs, sysMsg]));
      window.dispatchEvent(new Event('storage'));

      addAuditLog(`Desbloqueou temporariamente a nota do aluno ID ${studentId} na disciplina ${subject}`, `Validade: 2 min`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveTemporaryUnlock = (studentId: string, subject: string, trimester: 'I' | 'II' | 'III') => {
    try {
      const raw = localStorage.getItem('sigep_temporary_unlocks_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        const filtered = parsed.filter((u: any) => !(u.studentId === studentId && u.subject === subject && u.trimester === trimester));
        localStorage.setItem('sigep_temporary_unlocks_v1', JSON.stringify(filtered));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- SECURITY HUB AND PERMISSION REQUEST STATES ---
  const [activeApprovedRequests, setActiveApprovedRequests] = useState<any[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [pendingRequestData, setPendingRequestData] = useState<any | null>(null);
  const [requestReason, setRequestReason] = useState<string>('');
  const [physicalAuthId, setPhysicalAuthId] = useState<string>('');
  const [physicalAuthPassword, setPhysicalAuthPassword] = useState<string>('');
  const [physicalError, setPhysicalError] = useState<string | null>(null);
  const [physicalSuccess, setPhysicalSuccess] = useState<string | null>(null);
  const [onlineApprovedSuccess, setOnlineApprovedSuccess] = useState<string | null>(null);
  const [onlineRequestSent, setOnlineRequestSent] = useState<boolean>(false);

  // Sync / poll requests from localStorage for real-time response simulation
  useEffect(() => {
    const loadRequests = () => {
      try {
        const data = localStorage.getItem('sigep_grade_requests_v1');
        if (data) {
          setActiveApprovedRequests(JSON.parse(data));
        } else {
          setActiveApprovedRequests([]);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadRequests();
    window.addEventListener('storage', loadRequests);
    const interval = setInterval(loadRequests, 1500);
    return () => {
      window.removeEventListener('storage', loadRequests);
      clearInterval(interval);
    };
  }, []);

  const addAuditLog = (action: string, target: string) => {
    try {
      const logs = JSON.parse(localStorage.getItem('sigep_audit_logs_v1') || '[]');
      const newLog = {
        id: 'log-' + Date.now(),
        user: loggedInStaff ? `${loggedInStaff.name} (${loggedInStaff.role})` : 'Secretaria',
        action,
        timestamp: new Date().toISOString(),
        target
      };
      localStorage.setItem('sigep_audit_logs_v1', JSON.stringify([newLog, ...logs]));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOnlineSubmitRequest = () => {
    if (!requestReason.trim()) {
      alert("Por favor, preencha o motivo da alteração.");
      return;
    }
    const newReq = {
      id: 'req-' + Date.now(),
      requesterId: loggedInStaff ? loggedInStaff.id : 'SECRETARIO',
      requesterName: loggedInStaff ? loggedInStaff.name : 'Secretário',
      requesterRole: loggedInStaff ? loggedInStaff.role : 'SECRETARIO',
      studentId: pendingRequestData.studentId,
      studentName: pendingRequestData.studentName,
      subject: pendingRequestData.subject,
      trimester: localTrimester,
      reason: requestReason,
      status: 'PENDING',
      timestamp: new Date().toISOString()
    };

    const currentReqs = JSON.parse(localStorage.getItem('sigep_grade_requests_v1') || '[]');
    localStorage.setItem('sigep_grade_requests_v1', JSON.stringify([...currentReqs, newReq]));
    window.dispatchEvent(new Event('storage'));

    // Write internal log message in the chat automatically
    try {
      const chatLogs = JSON.parse(localStorage.getItem('sigep_log_comunicacao_interna_v2') || '[]');
      const reqMsg = {
        id: `sys-req-${Date.now()}`,
        remetente_id: 'SYSTEM',
        remetente_nome: 'Segurança SIGEP',
        remetente_cargo: 'Solicitação',
        destinatario_id: 'pautas-pedagogico', // pautas-pedagogico channel!
        mensagem: `🚨 PEDIDO D'ALTERAÇÃO DE NOTA EM TEMPO REAL (MINI-PAUTAS):
Solicitante: ${newReq.requesterName} (${newReq.requesterRole})
Aluno: ${newReq.studentName} (${newReq.studentId})
Disciplina: ${newReq.subject} | Trimestre: ${newReq.trimester}º
Motivo: "${newReq.reason}"

Aceda ao Painel de Direcção para deferir ou indeferir este pedido.`,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('sigep_log_comunicacao_interna_v2', JSON.stringify([...chatLogs, reqMsg]));
    } catch (e) {
      console.error(e);
    }

    addAuditLog(`Solicitou alteração de notas em tempo real para ${newReq.studentName} na disciplina ${newReq.subject}`, `Motivo: ${newReq.reason}`);
    setOnlineRequestSent(true);
  };

  const handlePhysicalUnlock = () => {
    if (!physicalAuthId || !physicalAuthPassword) {
      setPhysicalError('Por favor, preencha o ID e a Senha d\'Acesso do Director.');
      return;
    }
    const approver = staffList.find(s => s.id === physicalAuthId);
    if (!approver || (approver.role !== 'DIRECTOR_GERAL' && approver.role !== 'SUB_DIRECTOR_PEDAGOGICO')) {
      setPhysicalError('O funcionário seleccionado não possui permissões de Direcção.');
      return;
    }
    const correctPassword = approver.password || '12345';
    if (physicalAuthPassword !== correctPassword) {
      setPhysicalError('Senha d\'Acesso incorrecta para as credenciais físicas.');
      return;
    }

    // Authenticated! Save as approved request
    const approvedReq = {
      id: 'req-' + Date.now(),
      requesterId: loggedInStaff ? loggedInStaff.id : 'SECRETARIO',
      requesterName: loggedInStaff ? loggedInStaff.name : 'Secretário',
      requesterRole: loggedInStaff ? loggedInStaff.role : 'SECRETARIO',
      studentId: pendingRequestData.studentId,
      studentName: pendingRequestData.studentName,
      subject: pendingRequestData.subject,
      trimester: localTrimester,
      reason: 'Código de Validação Física Directa',
      status: 'APPROVED',
      code: 'PHYSICAL-' + Math.floor(1000 + Math.random() * 9000),
      approverName: approver.name,
      approvedAt: new Date().toISOString()
    };

    const currentReqs = JSON.parse(localStorage.getItem('sigep_grade_requests_v1') || '[]');
    localStorage.setItem('sigep_grade_requests_v1', JSON.stringify([...currentReqs, approvedReq]));
    window.dispatchEvent(new Event('storage'));

    addAuditLog(`Autorizou alteração de notas físicas para ${pendingRequestData.studentName} na disciplina ${pendingRequestData.subject}`, `Aprovador Físico: ${approver.name}`);
    
    setPhysicalSuccess('✓ Autorização Física Validada com Sucesso!');
    setPhysicalError(null);
    setTimeout(() => {
      // Create temporary unlock directly!
      handleCreateTemporaryUnlock(approvedReq.studentId, approvedReq.subject, localTrimester);
      setIsRequestModalOpen(false);
      setPhysicalSuccess(null);
      setPhysicalAuthPassword('');
      setOnlineRequestSent(false);
      setRequestReason('');
      setIsLaunchModalOpen(true); // Open the launch modal back!
    }, 1500);
  };

  // Sync / monitor active requests for automatic instant approval
  useEffect(() => {
    if (isRequestModalOpen && pendingRequestData) {
      const approved = activeApprovedRequests.find(r => 
        r.studentId === pendingRequestData.studentId &&
        r.subject === pendingRequestData.subject &&
        r.trimester === localTrimester &&
        r.status === 'APPROVED'
      );
      if (approved) {
        setOnlineApprovedSuccess('✓ Aprovado e assinado digitalmente em tempo real!');
        setTimeout(() => {
          // Create temporary unlock directly!
          handleCreateTemporaryUnlock(approved.studentId, approved.subject, localTrimester);
          setIsRequestModalOpen(false);
          setOnlineApprovedSuccess(null);
          setOnlineRequestSent(false);
          setRequestReason('');
          setIsLaunchModalOpen(true); // Open the launch modal back!
        }, 1500);
      }
    }
  }, [activeApprovedRequests, isRequestModalOpen, pendingRequestData]);

  // Launcher modal states (SiGeP 1.1.0 Engine)
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState<boolean>(false);
  const [forceEditByDir, setForceEditByDir] = useState<boolean>(false);
  const [searchStudentId, setSearchStudentId] = useState<string>('');
  const [modalStudent, setModalStudent] = useState<Student | null>(null);
  const [modalError, setModalError] = useState<string>('');
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);
  const [selectedSubjectForLaunch, setSelectedSubjectForLaunch] = useState<SubjectType | ''>('');
  const [modalMac, setModalMac] = useState<string>('');
  const [modalNpp, setModalNpp] = useState<string>('');
  const [modalNpt, setModalNpt] = useState<string>('');

  const getModalSubjectsForStudent = (student: Student): SubjectType[] => {
    const studentSubjects = getSubjectsForStudent(student, localModality) as SubjectType[];
    if (isProfessorRole && loggedInStaff && loggedInStaff.role === 'PROFESSOR') {
      const assigned = loggedInStaff.subjects || [];
      return studentSubjects.filter(sub => assigned.includes(sub));
    }
    return studentSubjects;
  };

  const handleSearchStudent = () => {
    setModalError('');
    setModalSuccessMsg(null);
    const searchId = searchStudentId.trim().toUpperCase();
    if (!searchId) {
      setModalError('Por favor, introduza um ID de Aluno.');
      return;
    }

    const found = students.find(s => 
      s.id.toUpperCase() === searchId ||
      (s.guiaTransferenciaEntrada && s.guiaTransferenciaEntrada.toUpperCase() === searchId) ||
      (s.guiaTransferenciaSaida && s.guiaTransferenciaSaida.toUpperCase() === searchId) ||
      (s.biNumber && s.biNumber.toUpperCase() === searchId)
    );
    if (!found) {
      setModalError(`Aluno com ID "${searchId}" não foi encontrado no sistema.`);
      setModalStudent(null);
      return;
    }

    setModalStudent(found);
    const subjectsForClass = getModalSubjectsForStudent(found);
    if (subjectsForClass.length > 0) {
      const firstSub = subjectsForClass[0] as SubjectType;
      setSelectedSubjectForLaunch(firstSub);
      
      // Look up existing grades
      const existingGrade = grades.find(g => g.studentId === found.id && g.subject === firstSub && g.trimester === localTrimester);
      const isClass13 = found.class === '13' || firstSub === 'PAP' || firstSub === 'NEC';
      if (isClass13) {
        const notaVal = existingGrade?.mt !== null && existingGrade?.mt !== undefined 
          ? String(existingGrade.mt) 
          : (existingGrade?.mac !== null && existingGrade?.mac !== undefined ? String(existingGrade.mac) : '');
        setModalMac(notaVal);
        setModalNpp('');
        setModalNpt(notaVal);
      } else {
        setModalMac(existingGrade?.mac !== null && existingGrade?.mac !== undefined ? String(existingGrade.mac) : '');
        setModalNpp(existingGrade?.npp !== null && existingGrade?.npp !== undefined ? String(existingGrade.npp) : '');
        setModalNpt(existingGrade?.npt !== null && existingGrade?.npt !== undefined ? String(existingGrade.npt) : '');
      }
    } else {
      setSelectedSubjectForLaunch('' as SubjectType);
      setModalMac('');
      setModalNpp('');
      setModalNpt('');
      if (isProfessorRole) {
        setModalError(`Atenção: O seu perfil de professor não possui autorização para lançar notas ao aluno ${found.name} (${found.id}), pois nenhuma das suas disciplinas atribuídas faz parte desta turma.`);
      } else {
        setModalError(`Nenhuma disciplina encontrada na grelha curricular para este aluno.`);
      }
    }
  };

  const handleLaunchSubjectChange = (subj: SubjectType) => {
    setSelectedSubjectForLaunch(subj);
    if (!modalStudent) return;
    const existingGrade = grades.find(g => g.studentId === modalStudent.id && g.subject === subj && g.trimester === localTrimester);
    const isClass13 = modalStudent.class === '13' || subj === 'PAP' || subj === 'NEC';
    if (isClass13) {
      const notaVal = existingGrade?.mt !== null && existingGrade?.mt !== undefined 
        ? String(existingGrade.mt) 
        : (existingGrade?.mac !== null && existingGrade?.mac !== undefined ? String(existingGrade.mac) : '');
      setModalMac(notaVal);
      setModalNpp('');
      setModalNpt(notaVal);
    } else {
      setModalMac(existingGrade?.mac !== null && existingGrade?.mac !== undefined ? String(existingGrade.mac) : '');
      setModalNpp(existingGrade?.npp !== null && existingGrade?.npp !== undefined ? String(existingGrade.npp) : '');
      setModalNpt(existingGrade?.npt !== null && existingGrade?.npt !== undefined ? String(existingGrade.npt) : '');
    }
  };

  const handleSaveModalGrades = () => {
    if (!modalStudent || !selectedSubjectForLaunch) return;

    // SECURITY GATE CHECK:
    if (!isCellEditableByProfessor(modalStudent.id, selectedSubjectForLaunch, localTrimester)) {
      setModalError(`Erro de Segurança: Lançamento bloqueado para ${selectedSubjectForLaunch}. Requer autorização da Direção.`);
      return;
    }

    const classNum = parseInt(modalStudent.class, 10) || 1;
    const maxLimit = classNum >= 7 ? 20 : 10;
    const isClass13 = modalStudent.class === '13' || selectedSubjectForLaunch === 'PAP' || selectedSubjectForLaunch === 'NEC';

    if (isClass13) {
      const parsedNota = modalMac.trim() === '' ? null : parseFloat(modalMac.replace(',', '.'));
      if (parsedNota !== null && (isNaN(parsedNota) || parsedNota < 0 || parsedNota > maxLimit)) {
        setModalError(`Nota de ${selectedSubjectForLaunch} inválida. O valor deve estar entre 0 e ${maxLimit}.`);
        return;
      }
      const confirmar = window.confirm(`Deseja realmente gravar a nota única de ${modalStudent.name} para a disciplina ${selectedSubjectForLaunch}?`);
      if (!confirmar) return;

      handleUpdateGradeFields(modalStudent.id, selectedSubjectForLaunch as SubjectType, localTrimester, {
        mac: parsedNota,
        npp: null,
        npt: parsedNota,
        mt: parsedNota
      });

      try {
        const saved13 = localStorage.getItem('sigep_13_grades_v2');
        const parsed13 = saved13 ? JSON.parse(saved13) : {};
        const student13Obj = parsed13[modalStudent.id] || { avg10: 10, avg11: 10, avg12: 10, pap: 0, nec: 0 };
        
        const isPap = String(selectedSubjectForLaunch) === 'PAP' || String(selectedSubjectForLaunch) === 'Trabalho de Conclusão';
        const isNec = String(selectedSubjectForLaunch) === 'NEC' || String(selectedSubjectForLaunch) === 'Prática Pedagógica' || String(selectedSubjectForLaunch) === 'Estágio';

        if (isPap) {
          student13Obj.pap = parsedNota ?? 0;
        } else if (isNec) {
          student13Obj.nec = parsedNota ?? 0;
        }
        parsed13[modalStudent.id] = student13Obj;
        localStorage.setItem('sigep_13_grades_v2', JSON.stringify(parsed13));

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sigep_pauta_exame_13') || key === 'sigep_exam_rows_13')) {
            const val = localStorage.getItem(key);
            if (val) {
              const rows = JSON.parse(val) as any[];
              const updatedRows = rows.map((r: any) => {
                if (r.id === modalStudent.id || (r.name && r.name.toLowerCase() === modalStudent.name.toLowerCase())) {
                  return {
                    ...r,
                    pap: isPap ? (parsedNota ?? r.pap) : r.pap,
                    nec: isNec ? (parsedNota ?? r.nec) : r.nec
                  };
                }
                return r;
              });
              localStorage.setItem(key, JSON.stringify(updatedRows));
            }
          }
        }
      } catch (err) {
        console.error("Error syncing 13th grade launch:", err);
      }

      handleRemoveTemporaryUnlock(modalStudent.id, selectedSubjectForLaunch, localTrimester);

      setModalSuccessMsg(`Nota única de ${selectedSubjectForLaunch} gravada com sucesso para ${modalStudent.name}!`);
      setModalError('');
      return;
    }

    const parsedMac = modalMac.trim() === '' ? null : parseFloat(modalMac.replace(',', '.'));
    const parsedNpp = modalNpp.trim() === '' ? null : parseFloat(modalNpp.replace(',', '.'));
    const parsedNpt = modalNpt.trim() === '' ? null : parseFloat(modalNpt.replace(',', '.'));

    if (parsedMac !== null && (isNaN(parsedMac) || parsedMac < 0 || parsedMac > maxLimit)) {
      setModalError(`MAC inválida. O valor deve estar entre 0 e ${maxLimit}.`);
      return;
    }
    if (parsedNpp !== null && (isNaN(parsedNpp) || parsedNpp < 0 || parsedNpp > maxLimit)) {
      setModalError(`NPP inválida. O valor deve estar entre 0 e ${maxLimit}.`);
      return;
    }
    if (parsedNpt !== null && (isNaN(parsedNpt) || parsedNpt < 0 || parsedNpt > maxLimit)) {
      setModalError(`NPT inválida. O valor deve estar entre 0 e ${maxLimit}.`);
      return;
    }

    const confirmar = window.confirm(`Deseja realmente gravar as notas de ${modalStudent.name} para a disciplina ${selectedSubjectForLaunch}?`);
    if (!confirmar) return;

    let newMt: number | null = null;
    if (useNpp) {
      if (parsedMac !== null || parsedNpp !== null || parsedNpt !== null) {
        const mac = parsedMac ?? 0;
        const npp = parsedNpp ?? 0;
        const npt = parsedNpt ?? 0;
        newMt = parseFloat(((mac + npp + npt) / 3).toFixed(1));
      }
    } else {
      if (parsedMac !== null || parsedNpt !== null) {
        const mac = parsedMac ?? 0;
        const npt = parsedNpt ?? 0;
        newMt = parseFloat(((mac + npt) / 2).toFixed(1));
      }
    }

    // Call update handler
    handleUpdateGradeFields(modalStudent.id, selectedSubjectForLaunch as SubjectType, localTrimester, {
      mac: parsedMac,
      npp: parsedNpp,
      npt: parsedNpt,
      mt: newMt
    });

    setModalMac(parsedMac !== null ? String(parsedMac) : '');
    setModalNpp(parsedNpp !== null ? String(parsedNpp) : '');
    setModalNpt(parsedNpt !== null ? String(parsedNpt) : '');

    // Auto-lock immediately:
    handleRemoveTemporaryUnlock(modalStudent.id, selectedSubjectForLaunch, localTrimester);

    setModalSuccessMsg(`Notas de ${selectedSubjectForLaunch} gravadas com sucesso para ${modalStudent.name}!`);
    setModalError('');
  };

  // Get filtered subject list based on modality, specialty, class, and logged-in professor permissions
  const getFilteredSubjects = (): SubjectType[] => {
    const grelha = carregarGrelhaCurricular();
    const filtered = grelha.filter(item => {
      if (item.active === false) return false;
      const matchMod = item.modality === localModality;
      const matchCl = item.class === localClass;
      const matchSpec = localModality === 'ENSINO_PRIMARIO' ? true : item.specialty === localSpecialty;
      return matchMod && matchCl && matchSpec;
    });

    let unique = Array.from(new Set(filtered.map(item => item.subject))) as SubjectType[];

    // If logged in user is a PROFESSOR, filter strictly by subjects assigned during registration in their profile
    if (isProfessorRole && loggedInStaff && loggedInStaff.role === 'PROFESSOR') {
      const assigned = loggedInStaff.subjects || [];
      unique = unique.filter(sub => assigned.includes(sub));
    }

    return unique;
  };

  const filteredSubjects = getFilteredSubjects();

  // Set default subject if the currently selected one is not in the filtered list
  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!filteredSubjects.includes(localSubject)) {
        setLocalSubject(filteredSubjects[0]);
      }
    } else {
      setLocalSubject('' as SubjectType);
    }
  }, [localModality, localClass, localSpecialty, JSON.stringify(filteredSubjects)]);

  // Synchronize defaults on modality changes
  useEffect(() => {
    if (localModality === 'ENSINO_PRIMARIO') {
      setLocalClass('1');
      setLocalSpecialty('GERAL');
      setLocalSection('A');
    } else if (localModality === 'PUNIV') {
      setLocalClass('10');
      setLocalSpecialty('CFB');
      setLocalSection('FB-A');
    } else {
      setLocalClass('10');
      setLocalSpecialty('MF');
      setLocalSection('MF-A');
    }
  }, [localModality]);

  // Available classes for selected modality
  const getClassesForModality = (mod: ModalityType) => {
    switch (mod) {
      case 'ENSINO_PRIMARIO':
        return ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
      case 'PUNIV':
        return ['10', '11', '12'];
      case 'MAGISTERIO':
        return ['10', '11', '12', '13'];
      default:
        return ['10'];
    }
  };

  // Available sections for selected modality
  const getSectionsForModality = (mod: ModalityType) => {
    if (mod === 'ENSINO_PRIMARIO') {
      return getSectionsList('ENSINO_PRIMARIO');
    }
    // If we have a specific specialty (not 'GERAL'), get only those 4 sections
    if (localSpecialty && localSpecialty !== 'GERAL' && localSpecialty !== 'All') {
      return getSectionsList(mod, localSpecialty);
    }
    // Otherwise return all of them
    if (mod === 'PUNIV') {
      return [
        ...getSectionsList('PUNIV', 'CFB'),
        ...getSectionsList('PUNIV', 'CEJ'),
        ...getSectionsList('PUNIV', 'CS'),
        ...getSectionsList('PUNIV', 'AV')
      ];
    } else {
      return [
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
      ];
    }
  };

  // Helper to accurately extract specialty code from section without fallback to CFB
  const parseSpecialtyFromSection = (section: string): string | undefined => {
    if (!section) return undefined;
    const sec = section.trim().toUpperCase();
    if (sec.startsWith('CFB') || sec.startsWith('CB') || sec.startsWith('FM') || sec.startsWith('FB')) return 'CFB';
    if (sec.startsWith('CEJ') || sec.startsWith('CSE') || sec.startsWith('EJ')) return 'CEJ';
    if (sec.startsWith('CS') || sec.startsWith('HUM')) return 'CS';
    if (sec.startsWith('AV') || sec.startsWith('LA')) return 'AV';
    
    if (sec.startsWith('MF')) return 'MF';
    if (sec.startsWith('EP')) return 'EP';
    if (sec.startsWith('BQ')) return 'BQ';
    if (sec.startsWith('ING')) return 'ING_EMC';
    if (sec.startsWith('FRA')) return 'FRA_EMC';
    if (sec.startsWith('EVP')) return 'EVP';
    if (sec.startsWith('EDF') || sec.startsWith('EF')) return 'EDF';
    if (sec.startsWith('EMC') || sec.startsWith('MOR')) return 'EMC';
    if (sec.startsWith('LEMC') || sec.startsWith('LE') || sec.startsWith('MC')) return 'LEMC';
    if (sec.startsWith('GH') || sec.startsWith('HG')) return 'GH';
    if (sec.startsWith('PRE') || sec.startsWith('PE')) return 'PE';
    return undefined;
  };

  // Extract all assigned specialty codes for a professor
  const getProfessorAssignedSpecialties = (): Set<string> => {
    const set = new Set<string>();
    if (!loggedInStaff) return set;
    
    // 1. Explicit specialty from professor profile
    if (loggedInStaff.specialty && loggedInStaff.specialty !== 'GERAL') {
      set.add(loggedInStaff.specialty.toUpperCase());
    }

    // 2. Specialties derived from assigned turmas / sections
    if (loggedInStaff.sections && loggedInStaff.sections.length > 0) {
      loggedInStaff.sections.forEach(sec => {
        const spec = parseSpecialtyFromSection(sec);
        if (spec) set.add(spec.toUpperCase());
      });
    }

    // 3. Fallback: only if set is empty, check for unique technical subjects (excluding common core subjects)
    if (set.size === 0 && loggedInStaff.subjects && loggedInStaff.subjects.length > 0) {
      const commonCoreSubjects = new Set([
        'L. PORTUGUESA', 'PORTUGUES', 'MATEMATICA', 'ED. FISICA', 'EDUCACAO FISICA',
        'BIOLOGIA', 'QUIMICA', 'FISICA', 'HISTORIA', 'GEOGRAFIA', 'INGLES', 'FRANCES',
        'EMC', 'TIC', 'DESENHO', 'PEDAGOGIA', 'PSICOLOGIA', 'DDA'
      ]);

      const grelha = carregarGrelhaCurricular();
      loggedInStaff.subjects.forEach(subj => {
        const upperSubj = (subj || '').toUpperCase();
        if (!commonCoreSubjects.has(upperSubj)) {
          grelha.filter(item => item.subject === subj).forEach(item => {
            if (item.specialty) set.add(item.specialty.toUpperCase());
          });
        }
      });
    }

    return set;
  };

  const getAvailableSpecialtyOptions = () => {
    const rawOptions = localModality === 'PUNIV' ? ALL_PUNIV_SPECIALTIES : ALL_MAGISTERIO_SPECIALTIES;
    
    if (isProfessorRole && loggedInStaff && loggedInStaff.role === 'PROFESSOR') {
      const assignedCodes = getProfessorAssignedSpecialties();
      if (assignedCodes.size > 0) {
        const filtered = rawOptions.filter(opt => assignedCodes.has(opt.code.toUpperCase()));
        if (filtered.length > 0) {
          return filtered;
        }
      }
    }
    return rawOptions;
  };

  const availableSpecialtyOptions = getAvailableSpecialtyOptions();

  // Keep localSpecialty synchronized if current selection is not available for this professor
  useEffect(() => {
    if (localModality !== 'ENSINO_PRIMARIO' && availableSpecialtyOptions.length > 0) {
      const exists = availableSpecialtyOptions.some(opt => opt.code === localSpecialty);
      if (!exists) {
        setLocalSpecialty(availableSpecialtyOptions[0].code);
      }
    }
  }, [localModality, JSON.stringify(availableSpecialtyOptions), localSpecialty]);

  // Filter options based on staff / professor roles (least privilege)
  const availableClasses = loggedInStaff && loggedInStaff.role === 'PROFESSOR'
    ? (loggedInStaff.classes && loggedInStaff.classes.length > 0 ? loggedInStaff.classes : getClassesForModality(localModality))
    : getClassesForModality(localModality);

  const getProfessorSections = () => {
    if (!loggedInStaff || !loggedInStaff.sections || loggedInStaff.sections.length === 0) {
      return getSectionsForModality(localModality);
    }
    if (localModality !== 'ENSINO_PRIMARIO' && localSpecialty) {
      const specSections = loggedInStaff.sections.filter(sec => {
        const spec = parseSpecialtyFromSection(sec);
        return spec === localSpecialty || (spec as any) === 'GERAL';
      });
      if (specSections.length > 0) return specSections;
    }
    return loggedInStaff.sections;
  };

  const availableSections = loggedInStaff && loggedInStaff.role === 'PROFESSOR'
    ? getProfessorSections()
    : getSectionsForModality(localModality);

  const getFilteredStudents = () => {
    return students.filter(student => {
      const matchClassSec = student.class === localClass && student.section === localSection;
      if (!matchClassSec) return false;
      if (localModality !== 'ENSINO_PRIMARIO' && localSpecialty !== 'GERAL') {
        // Students may have a specialty field matching
        return !student.specialty || student.specialty === localSpecialty;
      }
      return true;
    });
  };

  const filteredStudents = getFilteredStudents();

  const handleLimparMiniPauta = () => {
    const confirmar = window.confirm(`Deseja realmente eliminar TODAS as notas de ${localSubject} desta pauta (${localClass}ª, Turma ${localSection}, ${localTrimester}º Trimestre)? Esta acção não pode ser desfeita.`);
    if (!confirmar) return;

    filteredStudents.forEach(student => {
      handleUpdateGradeFields(student.id, localSubject, localTrimester, {
        mac: null,
        npp: null,
        npt: null,
        mt: null
      });
    });

    alert('Notas limpas com sucesso nesta pauta!');
  };

  // Handle grade change and auto-calculate MT
  const handleGradeChange = (studentId: string, field: 'mac' | 'npp' | 'npt', valStr: string) => {
    const cleanStr = valStr.trim().replace(',', '.');
    const val = cleanStr === '' ? null : parseFloat(cleanStr);

    if (val !== null && (isNaN(val) || val < 0 || val > (localModality === 'ENSINO_PRIMARIO' ? 10 : 20))) {
      return; // Ignore invalid values out of bounds
    }

    // SECURITY CHECK:
    if (!isCellEditableByProfessor(studentId, localSubject, localTrimester)) {
      if (isTrimesterSequenceBlocked(localTrimester)) {
        alert(`Bloqueio de Sequência: Não é permitido lançar notas no ${localTrimester}º Trimestre porque o anterior ainda está activo/aberto. Solicite o fecho à Direcção.`);
        return;
      }
      if (isSelectedTrimesterClosedForTeacher(localTrimester)) {
        alert(`Bloqueio Temporal: O ${localTrimester}º Trimestre encontra-se FECHADO pela Direcção.`);
        return;
      }
      if (schoolSettings?.allowTeacherGradeEntry !== true && isProfessorRole) {
        alert(`Bloqueio d'Acesso: O lançamento de notas está desativado pela Direcção. Solicite o desbloqueio desta nota no Chat do Staff.`);
        return;
      }
      if (isGradeImmutableForTeacher(studentId, localSubject, localTrimester)) {
        const student = students.find(s => s.id === studentId);
        if (student) {
          setPendingRequestData({
            studentId: student.id,
            studentName: student.name,
            subject: localSubject,
            trimester: localTrimester
          });
          setIsRequestModalOpen(true);
        }
        return;
      }
      alert('Nota Bloqueada: Não tem permissão para editar esta nota. Solicite o desbloqueio no Chat do Staff.');
      return;
    }

    // Pop-up de Confirmação Obrigatória (SIGEP 1.1.0)
    const studentObj = students.find(s => s.id === studentId);
    const studentName = studentObj ? studentObj.name : studentId;
    let labelNota = 'Nota';
    if (field === 'mac') labelNota = 'MAC (Avaliação Contínua)';
    else if (field === 'npp') labelNota = 'NPP (Prova Parcial)';
    else if (field === 'npt') labelNota = 'NPT (Prova Trimestral)';

    const confirmar = window.confirm(`Deseja lançar a nota de ${labelNota} com o valor "${val === null ? 'vazio' : val}" para o aluno "${studentName}"?`);
    if (!confirmar) {
      return;
    }

    // Get current record
    const row = grades.find(g => g.studentId === studentId && g.subject === localSubject && g.trimester === localTrimester) || {
      mac: null,
      npp: null,
      npt: null,
      mt: null
    };

    const newMac = field === 'mac' ? val : row.mac;
    const newNpp = field === 'npp' ? val : (row.npp ?? null);
    const newNpt = field === 'npt' ? val : row.npt;

    let newMt: number | null = null;
    if (useNpp) {
      if (newMac !== null || newNpp !== null || newNpt !== null) {
        const mac = newMac ?? 0;
        const npp = newNpp ?? 0;
        const npt = newNpt ?? 0;
        newMt = parseFloat(((mac + npp + npt) / 3).toFixed(1));
      }
    } else {
      if (newMac !== null || newNpt !== null) {
        const mac = newMac ?? 0;
        const npt = newNpt ?? 0;
        newMt = parseFloat(((mac + npt) / 2).toFixed(1));
      }
    }

    handleUpdateGradeFields(studentId, localSubject, localTrimester, {
      mac: newMac,
      npp: newNpp,
      npt: newNpt,
      mt: newMt
    });

    // Auto-lock immediately
    handleRemoveTemporaryUnlock(studentId, localSubject, localTrimester);
  };

  const getGradeRow = (studentId: string) => {
    const found = grades.find(g => g.studentId === studentId && g.subject === localSubject && g.trimester === localTrimester);
    if (!found) {
      return { mac: null, npp: null, npt: null, mt: null };
    }
    return {
      mac: typeof found.mac === 'number' && !isNaN(found.mac) ? found.mac : null,
      npp: typeof found.npp === 'number' && !isNaN(found.npp) ? found.npp : null,
      npt: typeof found.npt === 'number' && !isNaN(found.npt) ? found.npt : null,
      mt: typeof found.mt === 'number' && !isNaN(found.mt) ? found.mt : null
    };
  };

  const handlePopulateClassGrades = () => {
    if (!confirm('Esta acção irá registar e vincular todos os alunos desta turma a esta disciplina no livro de notas nominal. Deseja prosseguir?')) return;
    handlePovoarAlunosSub();
  };

  // PDF Export for Caderneta / Mini-pauta
  const exportMiniPautaPDF = (isBlankMode: boolean = false) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Outer border decoration
    doc.setDrawColor(200, 200, 200);
    doc.rect(5, 5, 200, 287);

    // 1. SCHOOL LOGO (Dynamic Insignia)
    const logoUrl = schoolSettings?.logoType === 'PUBLIC' ? schoolSettings?.publicLogoUrl : schoolSettings?.privateLogoUrl;
    if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
      try {
        let format = 'PNG';
        if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) {
          format = 'JPEG';
        } else if (logoUrl.includes('image/gif')) {
          format = 'GIF';
        }
        doc.addImage(logoUrl, format, 98, 6, 14, 14);
      } catch (err) {
        console.error('Error adding school logo to PDF:', err);
      }
    }

    // Header (REPÚBLICA DE ANGOLA, MINISTÉRIO DA EDUCAÇÃO, School Name)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('REPÚBLICA DE ANGOLA', 105, 25, { align: 'center' });
    doc.text('MINISTÉRIO DA EDUCAÇÃO', 105, 30, { align: 'center' });
    doc.text(schoolSettings.schoolName.toUpperCase(), 105, 35, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    // Alteração do Título Principal: Altera o texto estático para apenas: "MINI PAUTA"
    doc.text('MINI PAUTA', 105, 49, { align: 'center' });

    // Curriculum details
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont('Helvetica', 'normal');
    
    // Regra Estrita de Rótulo: "Classe: 10ª" em vez de "Classe: 10ª Classe"
    const formattedClass = `${localClass}ª`;

    doc.text(`Ano Lectivo: ${schoolSettings.academicYear}`, 15, 58);
    doc.text(`Ciclo: ${localModality === 'ENSINO_PRIMARIO' ? 'Ensino Primário' : localModality === 'PUNIV' ? 'PUNIV (Geral)' : 'Magistério'}`, 15, 63);
    doc.text(`Classe: ${formattedClass}`, 15, 68);
    doc.setFontSize(7.5);
    doc.text(`Cód: ${gerarCodigoPauta(schoolSettings.academicYear || '2025/2026', localClass)}`, 15, 71);
    doc.setFontSize(9);
    doc.text(`Turma / Secção: ${localSection}`, 15, 73);

    doc.text(`Disciplina: ${localSubject}`, 120, 58);
    doc.text(`Trimestre: ${localTrimester}º Trimestre`, 120, 63);
    doc.text(`Especialidade: ${localModality === 'ENSINO_PRIMARIO' ? 'Tronco Comum' : localSpecialty}`, 120, 68);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-AO')}`, 120, 73);

    // Table Header
    doc.setFillColor(243, 244, 246);
    doc.rect(15, 82, 180, 8, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(15, 82, 180, 8);

    // Nova Ordem de Colunas no Cabeçalho e Grid:
    // 1. Nº (15 to 25)
    // 2. ID (25 to 50)
    // 3. Nome Completo (50 to 110/128 depending on useNpp)
    // 4. Gên. (110/128 to 122/140)
    // 5. MAC, NPP (optional), NPT, M.T. (split remaining space evenly)
    const colBoundaries = useNpp 
      ? [15, 25, 50, 110, 122, 140, 158, 176, 195]
      : [15, 25, 50, 128, 140, 158, 176, 195];

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);

    // Nº label (column 15 to 25, center 20)
    doc.text('Nº', 20, 87, { align: 'center' });
    // ID label (column 25 to 50, center 37.5)
    doc.text('ID', 37.5, 87, { align: 'center' });
    // Nome Completo label (centered inside column 50 to 110/128)
    const nameColCenter = useNpp ? 80 : 89;
    doc.text('Nome Completo', nameColCenter, 87, { align: 'center' });
    // Gên. label
    const genColCenter = useNpp ? 116 : 134;
    doc.text('Gên.', genColCenter, 87, { align: 'center' });
    // Grades labels
    const macColCenter = useNpp ? 131 : 149;
    doc.text('MAC', macColCenter, 87, { align: 'center' });
    
    if (useNpp) {
      doc.text('NPP', 149, 87, { align: 'center' });
      doc.text('NPT', 167, 87, { align: 'center' });
      doc.text('M.T.', 185.5, 87, { align: 'center' });
    } else {
      doc.text('NPT', 167, 87, { align: 'center' });
      doc.text('M.T.', 185.5, 87, { align: 'center' });
    }

    // Table Rows
    let currentY = 90;
    const displayStudents = (isBlankMode && filteredStudents.length === 0) 
      ? Array.from({ length: 25 }, (_, i) => ({ id: `BLANK_${i}`, name: '                                                  ', gender: ' ' }))
      : filteredStudents;

    displayStudents.forEach((student, index) => {
      const row = getGradeRow(student.id);
      
      // Draw row bottom line
      doc.setDrawColor(180, 180, 180);
      doc.line(15, currentY + 6.2, 195, currentY + 6.2);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);

      // Nº (centered at 20)
      doc.text(String(index + 1), 20, currentY + 4.3, { align: 'center' });
      
      // ID (left-aligned with padding at 27)
      if (student.id && !student.id.startsWith('BLANK_')) {
        doc.text(student.id, 27, currentY + 4.3);
      } else {
        doc.text('-', 37.5, currentY + 4.3, { align: 'center' });
      }

      // Nome Completo (left-aligned with padding at 52)
      const maxNameLength = useNpp ? 34 : 44;
      const displayStudentName = student.name.length > maxNameLength 
        ? student.name.substring(0, maxNameLength - 2) + '...' 
        : student.name;
      doc.text(displayStudentName, 52, currentY + 4.3);

      // Gên. (centered)
      const genCenter = useNpp ? 116 : 134;
      doc.text(student.gender || 'M', genCenter, currentY + 4.3, { align: 'center' });

      // Grades with red color for negatives
      const maxScore = localModality === 'ENSINO_PRIMARIO' ? 10 : 20;
      const passScore = maxScore / 2;

      // Grade column centers
      const macCenter = useNpp ? 131 : 149;
      const nppCenter = 149;
      const nptCenter = 167;
      const mtCenter = 185.5;

      if (!isBlankMode) {
        // MAC
        if (typeof row.mac === 'number' && !isNaN(row.mac)) {
          if (row.mac < passScore) doc.setTextColor(220, 38, 38);
          doc.text(row.mac.toFixed(1), macCenter, currentY + 4.3, { align: 'center' });
          doc.setTextColor(30, 30, 30);
        } else {
          doc.text('-', macCenter, currentY + 4.3, { align: 'center' });
        }

        // NPP
        if (useNpp) {
          if (typeof row.npp === 'number' && !isNaN(row.npp)) {
            if (row.npp < passScore) doc.setTextColor(220, 38, 38);
            doc.text(row.npp.toFixed(1), nppCenter, currentY + 4.3, { align: 'center' });
            doc.setTextColor(30, 30, 30);
          } else {
            doc.text('-', nppCenter, currentY + 4.3, { align: 'center' });
          }
        }

        // NPT
        if (typeof row.npt === 'number' && !isNaN(row.npt)) {
          if (row.npt < passScore) doc.setTextColor(220, 38, 38);
          doc.text(row.npt.toFixed(1), nptCenter, currentY + 4.3, { align: 'center' });
          doc.setTextColor(30, 30, 30);
        } else {
          doc.text('-', nptCenter, currentY + 4.3, { align: 'center' });
        }

        // MT
        if (typeof row.mt === 'number' && !isNaN(row.mt)) {
          doc.setFont('Helvetica', 'bold');
          if (row.mt < passScore) doc.setTextColor(220, 38, 38);
          doc.text(row.mt.toFixed(1), mtCenter, currentY + 4.3, { align: 'center' });
          doc.setTextColor(30, 30, 30);
          doc.setFont('Helvetica', 'normal');
        } else {
          doc.text('-', mtCenter, currentY + 4.3, { align: 'center' });
        }
      } else {
        // empty space for physical entry
        doc.text(' ', macCenter, currentY + 4.3, { align: 'center' });
        if (useNpp) {
          doc.text(' ', nppCenter, currentY + 4.3, { align: 'center' });
        }
        doc.text(' ', nptCenter, currentY + 4.3, { align: 'center' });
        doc.text(' ', mtCenter, currentY + 4.3, { align: 'center' });
      }

      currentY += 6.2;
    });

    // Draw all vertical lines of the grid (from top of header Y=82 to currentY)
    doc.setDrawColor(180, 180, 180);
    colBoundaries.forEach(x => {
      doc.line(x, 82, x, currentY);
    });

    // Signature Area
    const signY = 258;
    
    // Labels above the line
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.text('O Professor(a)', 42.5, signY - 10, { align: 'center' });
    doc.text('A Direcção Pedagógica', 167.5, signY - 10, { align: 'center' });

    // Lines
    doc.setDrawColor(200, 200, 200);
    doc.line(15, signY, 70, signY);
    doc.line(140, signY, 195, signY);

    // Names below the line
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    
    // Teacher name
    let teacherName = '';
    if (loggedInStaff && loggedInStaff.role === 'PROFESSOR') {
      teacherName = loggedInStaff.name;
    } else {
      const assignedTeacher = staffList.find(s => 
        s.role === 'PROFESSOR' && 
        s.classes?.includes(localClass) && 
        s.sections?.includes(localSection) && 
        s.subjects?.includes(localSubject as any)
      );
      if (assignedTeacher) {
        teacherName = assignedTeacher.name;
      } else {
        const subTeacher = staffList.find(s => 
          s.role === 'PROFESSOR' && 
          s.subjects?.includes(localSubject as any)
        );
        if (subTeacher) {
          teacherName = subTeacher.name;
        }
      }
    }

    if (teacherName) {
      doc.text(teacherName, 42.5, signY + 4, { align: 'center' });
    } else {
      doc.setFont('Helvetica', 'italic');
      doc.text('Professor indisponível', 42.5, signY + 4, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
    }

    // Pedagogical Director name
    const pedagogicDirectorName = schoolSettings.subdirectorName || schoolSettings.directorName || 'Director Pedagógico';
    doc.text(pedagogicDirectorName, 167.5, signY + 4, { align: 'center' });

    // Save
    const filename = isBlankMode 
      ? `SIGEP_MODELO_BRANCO_${localModality}_Cl${localClass}_Turma${localSection}_${localSubject}.pdf`
      : `SIGEP_MINI_PAUTA_${localModality}_Cl${localClass}_Turma${localSection}_${localSubject}.pdf`;
    doc.save(filename);
  };

  const isPrimary = localModality === 'ENSINO_PRIMARIO';
  const scoreMax = isPrimary ? 10 : 20;

  return (
    <div id="central-mini-pautas-panel" className="space-y-6">
      
      {/* 1. SELECTION PANEL (isViewingMiniPauta === false) */}
      {!isViewingMiniPauta ? (
        <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-6 md:p-8 space-y-8 shadow-xs">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-650">
                <CheckSquare className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  Painel Central de Mini-Pautas
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-bold tracking-wide">
                Seleccione o ciclo de ensino, curso, classe, turma, disciplina e trimestre para gerir as classificações individuais de forma isolada.
              </p>
            </div>
            
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100/60 text-xs font-bold text-indigo-700">
              <Clock className="w-4 h-4 text-indigo-550 shrink-0" />
              <span>Ano Lectivo: {schoolSettings.academicYear}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Step 1: Ciclo de Ensino (Modalidade) */}
            <div className="space-y-4">
              <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>1. Seleccione o Ciclo de Ensino (Ativo)</span>
              </h2>
              
              <div className="grid grid-cols-1 gap-3">
                {schoolSettings.activeComponents?.ENSINO_PRIMARIO !== false && (
                  <button
                    type="button"
                    onClick={() => setLocalModality('ENSINO_PRIMARIO')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      localModality === 'ENSINO_PRIMARIO'
                        ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100/50 flex items-center justify-center text-indigo-600 text-lg font-bold">🎒</div>
                      <div>
                        <p className="text-xs font-black">Ensino Primário</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Classes de 1ª a 9ª</p>
                      </div>
                    </div>
                    {localModality === 'ENSINO_PRIMARIO' && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                  </button>
                )}

                {schoolSettings.activeComponents?.PUNIV !== false && (
                  <button
                    type="button"
                    onClick={() => setLocalModality('PUNIV')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      localModality === 'PUNIV'
                        ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100/50 flex items-center justify-center text-indigo-600 text-lg font-bold">🎓</div>
                      <div>
                        <p className="text-xs font-black">IIº CICLO DO ENSINO SECUNDÁRIO GERAL (LICEUS)</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Classes de 10ª a 12ª</p>
                      </div>
                    </div>
                    {localModality === 'PUNIV' && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                  </button>
                )}

                {schoolSettings.activeComponents?.MAGISTERIO !== false && (
                  <button
                    type="button"
                    onClick={() => setLocalModality('MAGISTERIO')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      localModality === 'MAGISTERIO'
                        ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100/50 flex items-center justify-center text-indigo-600 text-lg font-bold">👩‍🏫</div>
                      <div>
                        <p className="text-xs font-black">IIº CICLO DO ENSINO SECUNDÁRIO PEDAGÓGICO (MAGISTÉRIO)</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Classes de 10ª a 13ª</p>
                      </div>
                    </div>
                    {localModality === 'MAGISTERIO' && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                  </button>
                )}
              </div>
            </div>

            {/* Step 2: Curso & Parâmetros */}
            <div className="space-y-4">
              <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>2. Parametrizar Filtro de Turma</span>
              </h2>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3.5 shadow-2xs">
                
                {/* Course/Specialty selector if PUNIV or Magistério */}
                {localModality !== 'ENSINO_PRIMARIO' && (
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Especialidade / Curso {isProfessorRole && <span className="text-indigo-600 font-bold">(Atribuídas ao Perfil)</span>}
                    </label>
                    <select
                      value={localSpecialty}
                      onChange={(e) => setLocalSpecialty(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 w-full cursor-pointer focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-black text-indigo-950"
                    >
                      {availableSpecialtyOptions.map(opt => (
                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Classe</label>
                    <select
                      value={localClass}
                      onChange={(e) => setLocalClass(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 w-full cursor-pointer focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      {availableClasses.map(c => (
                        <option key={c} value={c}>{c}ª Classe</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Turma / Secção</label>
                    <select
                      value={localSection}
                      onChange={(e) => setLocalSection(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 w-full cursor-pointer focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      {availableSections.map(s => (
                        <option key={s} value={s}>Turma {s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject Selection (Filtered by Curriculum grid & Professor profile!) */}
                <div>
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Disciplina (Atribuída ao Perfil)</label>
                  <select
                    value={localSubject}
                    onChange={(e) => setLocalSubject(e.target.value as SubjectType)}
                    disabled={filteredSubjects.length === 0}
                    className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 w-full cursor-pointer focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {filteredSubjects.length > 0 ? (
                      filteredSubjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))
                    ) : (
                      <option value="">Nenhuma disciplina atribuída ao seu perfil para esta turma</option>
                    )}
                  </select>
                </div>

                {/* Trimester selection */}
                <div>
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Trimestre Lectivo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['I', 'II', 'III'] as const).map(tri => {
                      const isClosed = isTrimesterClosed(tri);
                      const isSeqBlocked = isTrimesterSequenceBlocked(tri);
                      const isLocked = isClosed || isSeqBlocked;
                      const isSelected = localTrimester === tri;

                      return (
                        <button
                          key={tri}
                          type="button"
                          onClick={() => setLocalTrimester(tri)}
                          className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? isLocked
                                ? 'bg-rose-600 border-rose-600 text-white font-black shadow-2xs'
                                : 'bg-indigo-600 border-indigo-600 text-white font-black shadow-2xs'
                              : isLocked
                              ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/70'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {isLocked ? (
                              <Lock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-rose-600'}`} />
                            ) : (
                              <Unlock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                            )}
                            <span>{tri}º Trimestre</span>
                          </div>
                          <span className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.2 rounded-full tracking-wider ${
                            isLocked
                              ? isSelected ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                              : isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {isClosed ? 'Fechado' : isSeqBlocked ? 'Bloqueado' : 'Aberto'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {(isTrimesterClosed(localTrimester) || isTrimesterSequenceBlocked(localTrimester)) && (
                    <div className="mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 animate-fadeIn">
                      <div className="p-2 bg-rose-600 text-white rounded-xl shrink-0 mt-0.5 shadow-2xs">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-wide text-rose-800">
                            {localTrimester}º Trimestre Inativo / Bloqueado
                          </h4>
                          <span className="text-[9px] font-extrabold bg-rose-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Perfil Director
                          </span>
                        </div>
                        <p className="text-[11px] font-medium leading-relaxed text-rose-700">
                          {isTrimesterClosed(localTrimester)
                            ? `Este trimestre foi fechado pelo Director Geral. O painel central de mini-pautas e o lançamento de notas para o ${localTrimester}º Trimestre encontram-se inactivos até que o Director Geral proceda ao seu desbloqueio no seu perfil.`
                            : `Não é permitido aceder ou lançar notas no ${localTrimester}º Trimestre enquanto o trimestre anterior não estiver devidamente fechado.`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Action button to open CADERNETA */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-200 flex-wrap gap-2">
            <button
              type="button"
              disabled={isTrimesterClosed(localTrimester) || isTrimesterSequenceBlocked(localTrimester)}
              onClick={() => {
                if (isTrimesterClosed(localTrimester) || isTrimesterSequenceBlocked(localTrimester)) {
                  alert(`O ${localTrimester}º Trimestre encontra-se bloqueado pelo Director Geral.`);
                  return;
                }
                setSearchStudentId('');
                setModalStudent(null);
                setModalError('');
                setModalSuccessMsg(null);
                setIsLaunchModalOpen(true);
              }}
              className={`px-4 py-2.5 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                (isTrimesterClosed(localTrimester) || isTrimesterSequenceBlocked(localTrimester))
                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  : 'text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Lançamento Individual por ID</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isTrimesterClosed(localTrimester) || isTrimesterSequenceBlocked(localTrimester)) {
                  alert(`Atenção: O ${localTrimester}º Trimestre está bloqueado pelo Director Geral. O painel da mini-pauta estará acessível apenas em modo inativo / de consulta.`);
                }
                setActiveModality(localModality);
                setCurrentClass(localClass);
                setCurrentSection(localSection);
                setIsViewingMiniPauta(true);
              }}
              className={`px-6 py-3 font-black text-xs text-white rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer ${
                (isTrimesterClosed(localTrimester) || isTrimesterSequenceBlocked(localTrimester))
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'
                  : 'bg-indigo-600 hover:bg-indigo-750 shadow-indigo-600/10'
              }`}
            >
              {(isTrimesterClosed(localTrimester) || isTrimesterSequenceBlocked(localTrimester)) ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Aceder à Mini-Pauta ({localTrimester}º Trim. Inativo)</span>
                </>
              ) : (
                <>
                  <span>Aceder à Mini-Pauta da Disciplina</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </div>
      ) : (
        
        // 2. ACTIVE VIEW (isViewingMiniPauta === true)
        <div className="space-y-5 animate-pulseOnce">
          
          {(isTrimesterClosed(localTrimester) || isTrimesterSequenceBlocked(localTrimester)) && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-rose-900 shadow-xs animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-xl shrink-0 shadow-2xs">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wide text-rose-800 flex items-center gap-2">
                    <span>PAINEL DE MINI-PAUTA INACTIVO — {localTrimester}º TRIMESTRE BLOQUEADO</span>
                    <span className="bg-rose-200 text-rose-900 text-[9px] font-extrabold px-2 py-0.5 rounded-md">Perfil Director</span>
                  </h4>
                  <p className="text-[11px] font-medium text-rose-700 mt-0.5">
                    {isTrimesterClosed(localTrimester)
                      ? `O lançamento, alteração e eliminação de notas para o ${localTrimester}º Trimestre encontram-se inactivos por estarem fechados/bloqueados nas definições do Director Geral.`
                      : `Não é possível efetuar lançamentos no ${localTrimester}º Trimestre enquanto o trimestre anterior não for encerrado.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Header Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setIsViewingMiniPauta(false)}
                className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Voltar ao Painel Central</span>
              </button>
              
              <h2 className="text-sm md:text-base font-black text-slate-800 uppercase flex items-center gap-2 mt-1">
                <CheckSquare className="w-5 h-5 text-indigo-600" />
                <span>Mini-Pauta: {localSubject} - {localClass}ª ({localSection})</span>
              </h2>
              
              <div className="flex flex-wrap gap-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                <span>Trimestre: {localTrimester}º Trimestre</span>
                <span>•</span>
                <span>Ciclo: {localModality === 'ENSINO_PRIMARIO' ? 'Ensino Primário' : localModality === 'PUNIV' ? 'Liceu (Ensino Geral)' : 'Magistério (Ensino Pedagógico)'}</span>
                <span>•</span>
                <span>Especialidade: {localModality === 'ENSINO_PRIMARIO' ? 'Geral' : localSpecialty}</span>
              </div>
            </div>

            <div className="flex gap-2.5 flex-wrap">
              {loggedInStaff?.role === 'DIRECTOR_GERAL' && (
                <>
                  <button
                    type="button"
                    onClick={handleLimparMiniPauta}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 border border-rose-650 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Trash className="w-4 h-4" />
                    <span>Limpar Pauta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForceEditByDir(!forceEditByDir)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer ${
                      forceEditByDir 
                        ? 'bg-amber-600 text-white border-amber-650' 
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-200'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>{forceEditByDir ? 'Bloquear Nota' : 'Editar Nota'}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setSearchStudentId('');
                  setModalStudent(null);
                  setModalError('');
                  setModalSuccessMsg(null);
                  setIsLaunchModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-650 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-indigo-200" />
                <span>Lançar por ID Aluno</span>
              </button>

              <button
                type="button"
                onClick={() => exportMiniPautaPDF(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Mini-Pauta</span>
              </button>

              <button
                type="button"
                onClick={() => exportMiniPautaPDF(true)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                <span>Modelo em Branco</span>
              </button>
            </div>
          </div>

          {/* Locked / Read-Only Warning */}
          {isClosingPeriod && (
            <div className={`rounded-xl p-3 flex items-center gap-3 text-xs font-semibold border ${
              forceEditByDir 
                ? 'bg-emerald-50 border-emerald-200/55 text-emerald-800' 
                : 'bg-amber-50 border-amber-250/50 text-amber-800'
            }`}>
              {forceEditByDir ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Desbloqueio de Direção Activo: Edição e lançamento de notas autorizados pelo Director Geral.</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>O período de lançamento de notas está trancado para esta época. Apenas visualização disponível.</span>
                </>
              )}
            </div>
          )}

          {/* Students list grade sheet */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider text-[9px] border-b border-slate-200">
                    <th className="p-3.5 w-[50px]">Nº</th>
                    <th className="p-3.5 w-[120px]">Matrícula / ID</th>
                    <th className="p-3.5 max-w-[220px] truncate">Nome Completo do Aluno</th>
                    <th className="p-3.5 w-[60px] text-center">Gên.</th>
                    <th className="p-3.5 w-[110px] text-center bg-indigo-50/20">MAC (Contínua)</th>
                    {useNpp && <th className="p-3.5 w-[110px] text-center bg-indigo-50/20">NPP (Parcial)</th>}
                    <th className="p-3.5 w-[110px] text-center bg-indigo-50/20">NPT (Prova)</th>
                    <th className="p-3.5 w-[100px] text-center bg-indigo-50/50">Média Trimestral</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.map((student, index) => {
                    const row = getGradeRow(student.id);
                    const macValue = row.mac !== null ? String(row.mac) : '';
                    const nppValue = row.npp !== null && row.npp !== undefined ? String(row.npp) : '';
                    const nptValue = row.npt !== null ? String(row.npt) : '';
                    const passScore = scoreMax / 2;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/40 transition-all">
                        <td className="p-3.5 text-slate-400 font-bold font-mono">{index + 1}</td>
                        <td className="p-3.5 text-slate-500 font-bold font-mono text-[10.5px]">{student.id}</td>
                        <td className="p-3.5 text-slate-800 font-extrabold text-[12px] truncate max-w-[220px]">{formatarNomePauta(student.name)}</td>
                        <td className="p-3.5 text-center text-slate-500 font-bold font-mono">{student.gender || 'M'}</td>
                        
                        {/* MAC edit input */}
                        <td className="p-3 bg-indigo-50/10 text-center">
                          <input
                            key={`${student.id}_mac_${macValue}`}
                            type="text"
                            defaultValue={macValue}
                            disabled={isClosingPeriod && !forceEditByDir}
                            placeholder="-"
                            onBlur={(e) => handleGradeChange(student.id, 'mac', e.target.value)}
                            className={`w-16 mx-auto text-center px-2 py-1 text-xs font-black font-mono rounded-lg border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all ${
                              row.mac !== null && row.mac < passScore
                                ? 'bg-rose-50 border-rose-200 text-rose-600 focus:border-rose-400'
                                : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-400'
                            }`}
                          />
                        </td>

                        {/* NPP edit input */}
                        {useNpp && (
                          <td className="p-3 bg-indigo-50/10 text-center">
                            <input
                              key={`${student.id}_npp_${nppValue}`}
                              type="text"
                              defaultValue={nppValue}
                              disabled={isClosingPeriod && !forceEditByDir}
                              placeholder="-"
                              onBlur={(e) => handleGradeChange(student.id, 'npp', e.target.value)}
                              className={`w-16 mx-auto text-center px-2 py-1 text-xs font-black font-mono rounded-lg border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all ${
                                row.npp !== null && row.npp !== undefined && row.npp < passScore
                                  ? 'bg-rose-50 border-rose-200 text-rose-600 focus:border-rose-400'
                                  : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-400'
                              }`}
                            />
                          </td>
                        )}

                        {/* NPT edit input */}
                        <td className="p-3 bg-indigo-50/10 text-center">
                          <input
                            key={`${student.id}_npt_${nptValue}`}
                            type="text"
                            defaultValue={nptValue}
                            disabled={isClosingPeriod && !forceEditByDir}
                            placeholder="-"
                            onBlur={(e) => handleGradeChange(student.id, 'npt', e.target.value)}
                            className={`w-16 mx-auto text-center px-2 py-1 text-xs font-black font-mono rounded-lg border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all ${
                              row.npt !== null && row.npt < passScore
                                ? 'bg-rose-50 border-rose-200 text-rose-600 focus:border-rose-400'
                                : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-400'
                            }`}
                          />
                        </td>

                        {/* calculated MT view */}
                        <td className="p-3.5 bg-indigo-50/30 text-center">
                          {typeof row.mt === 'number' && !isNaN(row.mt) ? (
                            <span className={`text-sm font-black font-mono ${
                              row.mt >= passScore ? 'text-indigo-650' : 'text-rose-500'
                            }`}>
                              {row.mt.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono font-bold">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={useNpp ? 8 : 7} className="p-12 text-center text-slate-400 font-bold italic">
                        Nenhum aluno inscrito nesta turma ou correspondente a esta especialidade. 
                        Aceda à Secretaria para registar alunos na {localClass}ª (Turma {localSection}).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- JANELA POPUP / MODAL DE LANÇAMENTO DE NOTAS POR ID DO ALUNO (MINI PAUTAS) --- */}
      {isLaunchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp text-slate-800">
            
            {/* Header */}
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-heading font-semibold text-sm">Janela de Lançamento de Notas (Mini-Pautas)</h3>
                  <p className="text-[10px] text-slate-400">Insira as notas do período letivo usando o ID de matrícula do aluno</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLaunchModalOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 font-sans">
              
              {/* Search Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block font-heading">
                  Chamar por ID de Matrícula (Ex: MA7B85)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="Introduza o código da matrícula do aluno..."
                      value={searchStudentId}
                      onChange={(e) => setSearchStudentId(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearchStudent();
                      }}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-700 font-mono font-bold uppercase"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchStudent}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Chamar Aluno
                  </button>
                </div>
              </div>

              {/* Status Notifications */}
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{modalSuccessMsg}</span>
                </div>
              )}

              {/* Student details if matched */}
              {modalStudent ? (
                <div className="space-y-4 animate-fadeIn text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm font-heading">{modalStudent.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">
                        Nº {modalStudent.id} • {modalStudent.class}ª • Turma {modalStudent.section}
                      </p>
                    </div>
                    <div className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-amber-200">
                      Limite de Nota: 0 a {parseInt(modalStudent.class, 10) >= 7 ? '20' : '10'}
                    </div>
                  </div>

                  {/* Select Discipline dropdown */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
                    <label className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block font-heading">
                      Disciplina a Lançar Nota
                    </label>
                    <select
                      value={selectedSubjectForLaunch}
                      onChange={(e) => handleLaunchSubjectChange(e.target.value as SubjectType)}
                      disabled={getModalSubjectsForStudent(modalStudent).length === 0}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-850 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {getModalSubjectsForStudent(modalStudent).length > 0 ? (
                        getModalSubjectsForStudent(modalStudent).map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))
                      ) : (
                        <option value="">Nenhuma disciplina autorizada para o seu perfil neste aluno</option>
                      )}
                    </select>
                  </div>

                  {/* Fields list for selected subject */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-heading mb-1">
                      CLASSIFICAÇÃO DE NOTAS - {localTrimester}º TRIMESTRE
                    </p>

                    {(() => {
                      const sub = selectedSubjectForLaunch;
                      if (!sub) return null;
                      
                      const isEditable = isCellEditableByProfessor(modalStudent.id, sub, localTrimester);
                      const isUnlockActive = activeTemporaryUnlocks.find(
                        u => u.studentId === modalStudent.id && u.subject === sub && u.trimester === localTrimester
                      );
                      const secondsLeft = isUnlockActive ? Math.max(0, Math.ceil((isUnlockActive.expiresAt - Date.now()) / 1000)) : 0;

                      return (
                        <div className="space-y-4">
                          <div className="p-4 bg-indigo-50/40 border border-indigo-100/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <span className="text-xs font-extrabold text-indigo-950 truncate flex-1 block">
                              {sub}
                            </span>
                            
                            <div className="flex items-center gap-3">
                              {modalStudent.class === '13' || sub === 'PAP' || sub === 'NEC' ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase">Nota Única:</span>
                                  <input
                                    type="text"
                                    value={modalMac}
                                    placeholder="0 a 20"
                                    disabled={!isEditable}
                                    onChange={(e) => {
                                      const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
                                      setModalMac(cleaned);
                                      setModalNpt(cleaned);
                                    }}
                                    className={`w-20 py-1.5 border rounded-lg text-center text-xs font-mono font-extrabold focus:outline-none ${!isEditable ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-indigo-300 focus:border-indigo-600 text-indigo-900 shadow-xs'}`}
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">MAC:</span>
                                    <input
                                      type="text"
                                      value={modalMac}
                                      placeholder="-"
                                      disabled={!isEditable}
                                      onChange={(e) => {
                                        const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
                                        setModalMac(cleaned);
                                      }}
                                      className={`w-14 py-1.5 border rounded-lg text-center text-xs font-mono font-extrabold focus:outline-none ${!isEditable ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-850'}`}
                                    />
                                  </div>

                                  {useNpp && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">NPP:</span>
                                      <input
                                        type="text"
                                        value={modalNpp}
                                        placeholder="-"
                                        disabled={!isEditable}
                                        onChange={(e) => {
                                          const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
                                          setModalNpp(cleaned);
                                        }}
                                        className={`w-14 py-1.5 border rounded-lg text-center text-xs font-mono font-extrabold focus:outline-none ${!isEditable ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-850'}`}
                                      />
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">NPT:</span>
                                    <input
                                      type="text"
                                      value={modalNpt}
                                      placeholder="-"
                                      disabled={!isEditable}
                                      onChange={(e) => {
                                        const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
                                        setModalNpt(cleaned);
                                      }}
                                      className={`w-14 py-1.5 border rounded-lg text-center text-xs font-mono font-extrabold focus:outline-none ${!isEditable ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-850'}`}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Status and Real-time Action Controls Row */}
                          <div className="flex items-center justify-between px-2 text-xs">
                            {isUnlockActive ? (
                              <div className="flex items-center gap-1.5 text-emerald-600 font-bold font-mono animate-pulse">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                <span>🔓 DESBLOQUEADO ({Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')})</span>
                              </div>
                            ) : !isEditable ? (
                              <div className="flex items-center gap-1.5 text-rose-600 font-bold font-mono">
                                <Lock className="w-3.5 h-3.5" />
                                <span>BLOQUEADO: AUTORIZAÇÃO REQUERIDA</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-emerald-600 font-bold font-mono">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>EDITÁVEL: AUTORIZAÇÃO ATIVA</span>
                              </div>
                            )}

                            {!isEditable && (
                              <div>
                                {isAdminUser ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const promptPass = window.prompt("Introduza a sua Senha de Desbloqueio Administrativa (Director ou Subdirector Pedagógico):");
                                      if (promptPass !== null) {
                                        const adminStaff = staffList.find(
                                          s => (s.role === 'DIRECTOR_GERAL' || s.role === 'SUB_DIRECTOR_PEDAGOGICO') &&
                                               s.password === promptPass
                                        );
                                        if (adminStaff) {
                                          handleCreateTemporaryUnlock(modalStudent.id, sub, localTrimester);
                                          alert(`Sucesso! Nota desbloqueada em tempo real por ${adminStaff.name}.`);
                                          // Refresh fields
                                          handleLaunchSubjectChange(sub);
                                        } else {
                                          alert("Erro: Senha administrativa inválida ou sem permissões.");
                                        }
                                      }
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                    Desbloquear Nota
                                  </button>
                                ) : isProfessorRole ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPendingRequestData({
                                        studentId: modalStudent.id,
                                        studentName: modalStudent.name,
                                        subject: sub,
                                        trimester: localTrimester
                                      });
                                      setIsRequestModalOpen(true);
                                      setIsLaunchModalOpen(false);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                    Solicitar Desbloqueio
                                  </button>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <User className="w-12 h-12 text-slate-300" />
                  <p className="text-xs max-w-xs">Introduza o ID do aluno no campo de pesquisa acima para carregar a pauta nominal de avaliações.</p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-100 font-sans">
              <span className="text-[10px] text-slate-400 font-mono">SiGeP Pauta Window Engine</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsLaunchModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Fechar Janela
                </button>
                {modalStudent && (
                  <button
                    type="button"
                    onClick={handleSaveModalGrades}
                    disabled={!selectedSubjectForLaunch || !isCellEditableByProfessor(modalStudent.id, selectedSubjectForLaunch, localTrimester)}
                    className={`font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer ${
                      selectedSubjectForLaunch && isCellEditableByProfessor(modalStudent.id, selectedSubjectForLaunch, localTrimester)
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "bg-slate-300 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    Gravar Notas
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL DE AUTORIZAÇÃO / SOLICITAÇÃO DE ALTERAÇÃO DE NOTAS (Enterprise Shield) --- */}
      {isRequestModalOpen && pendingRequestData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn text-slate-800">
          <div className="bg-white rounded-3xl border border-rose-100 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-scaleUp">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-800 to-slate-900 p-5 text-white flex justify-between items-center border-b border-rose-900/20">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
                <div>
                  <h3 className="font-sans font-extrabold text-sm uppercase tracking-wide">Shield de Segurança Escolar</h3>
                  <p className="text-[10px] text-slate-350 font-medium">Controle de Integridade e Histórico Pedagógico MED Angola</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRequestModalOpen(false);
                  setPendingRequestData(null);
                  setOnlineRequestSent(false);
                  setPhysicalError(null);
                  setPhysicalSuccess(null);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh] text-left">
              {/* Context Alert */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[10.5px] text-amber-850 font-semibold leading-relaxed">
                  Aviso: Qualquer alteração ou lançamento tardio de notas nas pautas é auditado e exige autorização prévia por escrito ou credencial digital da Direcção Geral.
                </div>
              </div>

              {/* Request Specs */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs border-b border-slate-150 pb-1.5">
                  <span className="text-slate-500">Aluno</span>
                  <span className="text-slate-900 font-extrabold font-mono text-[11px]">{pendingRequestData.studentName} ({pendingRequestData.studentId})</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-slate-150 pb-1.5">
                  <span className="text-slate-500">Disciplina</span>
                  <span className="text-indigo-900 font-extrabold font-mono text-[11px]">{pendingRequestData.subject}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-0.5">
                  <span className="text-slate-500">Período Letivo</span>
                  <span className="text-slate-900 font-extrabold font-mono text-[11px]">{localTrimester}º Trimestre</span>
                </div>
              </div>

              {/* OPÇÃO 1: SOLICITAÇÃO ONLINE EM TEMPO REAL */}
              <div className="bg-indigo-50/30 border border-indigo-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-1.5 border-b border-indigo-100 pb-2">
                  <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin-slow" />
                  <span className="text-xs font-black text-indigo-950 uppercase tracking-wider">Opção A: Pedido Digital em Tempo Real</span>
                </div>

                {!onlineRequestSent ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-700 block mb-1">Motivo do Pedido de Alteração (Obrigatório)</label>
                      <textarea
                        value={requestReason}
                        onChange={(e) => setRequestReason(e.target.value)}
                        placeholder="Ex: Erro material verificado na transposição da pauta física para o sistema, justificado sob reclamação deferida..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-3xs placeholder-slate-400 h-20 resize-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleOnlineSubmitRequest}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Enviar Pedido de Assinatura à Direcção
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    {onlineApprovedSuccess ? (
                      <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-2xl space-y-1">
                        <span className="text-emerald-700 font-black text-xs block">{onlineApprovedSuccess}</span>
                        <p className="text-[9px] text-slate-550">Processando salvamento seguro no PC Central...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping" />
                          <span className="text-[11px] text-indigo-900 font-extrabold tracking-wide">Aguardando Aprovação do Diretor...</span>
                        </div>
                        <p className="text-[9.5px] text-slate-550 leading-relaxed max-w-xs mx-auto">
                          O seu pedido foi enviado para a Central de Autorizações e para o Canal de Direcção. O Director ou Subdirector Pedagógico pode aprovar a partir do perfil deles.
                        </p>
                        <button
                          type="button"
                          onClick={() => setOnlineRequestSent(false)}
                          className="text-[10px] text-indigo-600 hover:underline font-bold"
                        >
                          ← Alterar Motivo ou Tentar Outra Opção
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* OPÇÃO 2: VALIDAÇÃO FÍSICA IMEDIATA */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Lock className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Opção B: Credenciais de Direcção Físicas</span>
                </div>
                
                <p className="text-[10px] text-slate-500 leading-snug">
                  Se a rede local estiver offline ou se o Director Geral estiver fisicamente ao seu lado, ele pode validar directamente aqui:
                </p>

                {physicalError && (
                  <div className="bg-red-50 text-red-700 text-[10px] p-2.5 rounded-xl border border-red-150 font-bold">
                    {physicalError}
                  </div>
                )}

                {physicalSuccess && (
                  <div className="bg-emerald-50 text-emerald-700 text-[10px] p-2.5 rounded-xl border border-emerald-150 font-bold">
                    {physicalSuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9.5px] font-bold text-slate-600 block mb-1">Autorizador</label>
                    <select
                      value={physicalAuthId}
                      onChange={(e) => setPhysicalAuthId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-indigo-500 shadow-3xs"
                    >
                      <option value="">-- Seleccionar --</option>
                      {staffList
                        .filter(s => s.role === 'DIRECTOR_GERAL' || s.role === 'SUB_DIRECTOR_PEDAGOGICO')
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.role === 'DIRECTOR_GERAL' ? 'Dir. Geral' : 'Subdirector Pedagógico'})</option>
                        ))
                      }
                    </select>
                  </div>

                  <div>
                    <label className="text-[9.5px] font-bold text-slate-600 block mb-1">Senha d'Acesso</label>
                    <input
                      type="password"
                      value={physicalAuthPassword}
                      onChange={(e) => setPhysicalAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 shadow-3xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePhysicalUnlock}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Validar e Desbloquear Fisicamente
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
