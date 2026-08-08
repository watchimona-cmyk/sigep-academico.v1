/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, GradeRow, getSubjectsForClass, getSubjectAbbreviation, getSubjectsForStudent, getStudentSpecialty, SubjectType, UserRole, Staff, getSpecialtyFromSection, getSpecialtyFullName, isEnglishSubject, isFrenchSubject } from '../types';
import { Award, Layers, CreditCard, ChevronRight, CheckCircle2, RefreshCw, Layers3, Play, AlertTriangle, Database, Lock, Unlock, Mail, Search, Save, X, Sparkles, Shield, User, Printer, FileText, Ban, ShieldAlert, Trash, Edit3 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatarNomePauta, calcularObservacaoPauta, TipoClasse, NotaDisciplina, AlunoPauta, obterCorObservacaoClass, gerarCodigoPauta } from '../utils/pautaLogic';
import { getSectionsList } from '../utils';
import NotaFormatada from './NotaFormatada';

interface PautaTrimesterProps {
  students: Student[];
  grades: GradeRow[];
  staffList: Staff[];
  currentClass: string;
  currentSection: string;
  onUpdateGradeFields: (
    studentId: string,
    subject: string,
    trimester: 'I' | 'II' | 'III',
    fields: { mac?: number | null; npt?: number | null; npp?: number | null; mt?: number | null }
  ) => void;
  onPovoarAlunos: (sheet: string) => void;
  onConsolidarNotas: (sheet: string) => void;
  userRole?: UserRole;
  loggedInStaff?: Staff | null;
  schoolSettings?: any;
  activeModality?: 'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO';
  useNpp?: boolean;
  onToggleNpp?: (val: boolean) => void;
  foreignLanguageProp?: 'INGLÊS' | 'FRANCÊS';
}

export default function PautaTrimester({
  students,
  grades,
  staffList = [],
  currentClass,
  currentSection,
  onUpdateGradeFields,
  onPovoarAlunos,
  onConsolidarNotas,
  userRole = 'SUB_DIRECTOR_PEDAGOGICO',
  loggedInStaff = null,
  schoolSettings,
  activeModality,
  useNpp = false,
  onToggleNpp,
  foreignLanguageProp
}: PautaTrimesterProps) {
  const [selectedTrim, setSelectedTrim] = useState<'I' | 'II' | 'III'>('I');
  const [povoadoAlunos, setPovoadoAlunos] = useState<Student[]>([]);
  const [isPdfGenerating, setIsPdfGenerating] = useState<boolean>(false);
  const [lastCalculatedAt, setLastCalculatedAt] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [selectedSubjectForLaunch, setSelectedSubjectForLaunch] = useState<string | ''>('');

  // --- STATE FOR BLANK PAUTA EXPORT WITH DIRECTIVES ---
  const [showBlankConfigModal, setShowBlankConfigModal] = useState<boolean>(false);
  const [blankClass, setBlankClass] = useState<string>(currentClass || '10');
  const [blankSpecialty, setBlankSpecialty] = useState<string>(() => {
    const actSpec = getSpecialtyFromSection(currentSection, activeModality);
    return actSpec || (activeModality === 'MAGISTERIO' ? 'MF' : activeModality === 'PUNIV' ? 'CFB' : 'Geral');
  });
  const [blankSection, setBlankSection] = useState<string>(currentSection || 'A');
  const [blankSubject, setBlankSubject] = useState<SubjectType>('L. PORTUGUESA');

  // --- DIRECTOR SECURITY & LOCKED TRIMESTER STATES ---
  const [isDirectorAuthorized, setIsDirectorAuthorized] = useState<boolean>(false);
  const [forceEdit, setForceEdit] = useState<boolean>(false);
  const [directorPrompt, setDirectorPrompt] = useState<{
    isOpen: boolean;
    message: string;
    onSuccess: () => void;
  } | null>(null);
  const [promptPassword, setPromptPassword] = useState<string>('');
  const [promptError, setPromptError] = useState<string>('');

  // Helper to validate the Director General key or password
  const validateDirectorKey = (key: string): boolean => {
    const dirGeral = staffList.find(s => s.role === 'DIRECTOR_GERAL');
    if (dirGeral) {
      return key === dirGeral.password || key === dirGeral.id || key === '12345';
    }
    return key === '12345';
  };

  // Helper to request Director General permission
  const requestDirectorPermission = (message: string, onSuccess: () => void) => {
    if (isDirectorAuthorized || forceEdit) {
      onSuccess();
      return;
    }
    setDirectorPrompt({
      isOpen: true,
      message,
      onSuccess
    });
  };

  const handleLimparPautaGeral = () => {
    const confirmar = window.confirm(`Deseja realmente eliminar TODAS as notas desta pauta (${currentClass}ª Classe, Turma ${currentSection}, ${selectedTrim}º Trimestre)? Esta acção não pode ser desfeita.`);
    if (!confirmar) return;

    povoadoAlunos.forEach(student => {
      activeSubjects.forEach(subject => {
        onUpdateGradeFields(student.id, subject, selectedTrim, {
          mac: null,
          npp: null,
          npt: null,
          mt: null
        });
      });
    });

    alert('Notas de toda a pauta limpas com sucesso!');
  };

  // Helper to validate prompt password entry
  const handleValidatePrompt = () => {
    setPromptError('');
    if (!promptPassword) {
      setPromptError('A palavra-passe não pode estar vazia.');
      return;
    }

    const isValid = validateDirectorKey(promptPassword);
    if (isValid) {
      setIsDirectorAuthorized(true);
      const callback = directorPrompt?.onSuccess;
      setDirectorPrompt(null);
      setPromptPassword('');
      setPromptError('');
      if (callback) callback();
    } else {
      setPromptError('Erro: Chave do Director Geral incorreta.');
    }
  };

  // Helper to get completion status of a trimester
  const getTrimesterCompletionStatus = (t: 'I' | 'II' | 'III') => {
    const classStudents = students.filter(s => s.class === currentClass && s.section === currentSection);
    if (classStudents.length === 0) {
      return { complete: false, total: 0, filled: 0, percent: 0 };
    }
    
    let totalCells = 0;
    let filledCells = 0;
    
    classStudents.forEach(student => {
      const studentSubjects = getSubjectsForStudent(student, activeModality);
      totalCells += studentSubjects.length * 2; // both mac and npt
      
      studentSubjects.forEach(sub => {
        const gRecord = grades.find(g => g.studentId === student.id && g.subject === sub && g.trimester === t);
        if (gRecord) {
          if (gRecord.mac !== null && gRecord.mac !== undefined) filledCells++;
          if (gRecord.npt !== null && gRecord.npt !== undefined) filledCells++;
        }
      });
    });
    
    return {
      complete: filledCells === totalCells,
      total: totalCells,
      filled: filledCells,
      percent: totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0
    };
  };

  // In-line cell editing state
  const [editingCell, setEditingCell] = useState<{
    studentId: string;
    subject: string;
    field: 'mac' | 'npt';
  } | null>(null);
  const [editVal, setEditVal] = useState<string>('');

  // Active highlighted cell coordinates
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  // --- SECURITY GATE STATE FOR PROFESSOR ROLE ---
  const isProfessorRole = userRole === 'PROFESSOR' || (loggedInStaff && loggedInStaff.role === 'PROFESSOR');
  
  const [profInputId, setProfInputId] = useState<string>('');
  const [profValidated, setProfValidated] = useState<boolean>(false);
  const [validatedProfId, setValidatedProfId] = useState<string>('');
  const [profSelectedSubject, setProfSelectedSubject] = useState<string | ''>('');
  const [profSelectedTrim, setProfSelectedTrim] = useState<'I' | 'II' | 'III'>('I');
  const [profError, setProfError] = useState<string>('');
  const [validatedProfObj, setValidatedProfObj] = useState<Staff | null>(null);

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

  const isAdminUser = (userRole as string) === 'DIRECTOR_GERAL' || userRole === 'SUB_DIRECTOR_PEDAGOGICO' || (loggedInStaff && (loggedInStaff.role === 'DIRECTOR_GERAL' || loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO'));

  const isTrimesterClosed = (trimester: 'I' | 'II' | 'III') => {
    if (trimester === 'I') return (schoolSettings?.trimesterI_Status || 'ABERTO') === 'FECHADO';
    if (trimester === 'II') return (schoolSettings?.trimesterII_Status || 'FECHADO') === 'FECHADO';
    if (trimester === 'III') return (schoolSettings?.trimesterIII_Status || 'FECHADO') === 'FECHADO';
    return false;
  };

  const isTrimesterSequenceBlocked = (trimester: 'I' | 'II' | 'III') => {
    if (trimester === 'I') return false;
    if (trimester === 'II') {
      if (schoolSettings?.trimesterII_Status === 'ABERTO') return false;
      const trimIStatus = schoolSettings?.trimesterI_Status || 'ABERTO';
      return trimIStatus === 'ABERTO';
    }
    if (trimester === 'III') {
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
    if (isTrimesterClosed(trimester) || isTrimesterSequenceBlocked(trimester)) {
      const hasActiveTemporaryUnlock = activeTemporaryUnlocks.some(
        u => u.studentId === studentId && u.subject === subject && u.trimester === trimester && u.expiresAt > Date.now()
      );
      if (hasActiveTemporaryUnlock) return true;
      return false;
    }

    if (isAdminUser) return true;
    if (!isProfessorRole) return true;

    // Check trimester status first
    if (isSelectedTrimesterClosedForTeacher(trimester) || isTrimesterSequenceBlocked(trimester)) {
      return false;
    }

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

      // Push unlock to central server API for real-time LAN/Wi-Fi sync across computers
      fetch('/api/unlocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});

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

        fetch('/api/unlocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filtered)
        }).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sync state if loggedInStaff changes or role is changed
  useEffect(() => {
    if (!isProfessorRole) {
      setProfValidated(false);
      setValidatedProfId('');
      setProfSelectedSubject('');
      setValidatedProfObj(null);
    } else if (loggedInStaff && loggedInStaff.role === 'PROFESSOR') {
      // Auto-validate if loggedInStaff is already a Professor!
      setValidatedProfId(loggedInStaff.id);
      setValidatedProfObj(loggedInStaff);
      if (loggedInStaff.subjects && loggedInStaff.subjects.length > 0) {
        setProfSelectedSubject(loggedInStaff.subjects[0] as SubjectType);
      }
      setProfValidated(true);
    }
  }, [isProfessorRole, loggedInStaff]);

  // --- STUDENT GRADEs LAUNCHER MODAL STATES ---
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState<boolean>(false);
  const [searchStudentId, setSearchStudentId] = useState<string>('');
  const [modalStudent, setModalStudent] = useState<Student | null>(null);
  const [modalError, setModalError] = useState<string>('');
  // Local state for modal inputs: { [subj]: { mac: string, npt: string, npp?: string } }
  const [modalFields, setModalFields] = useState<{ [key: string]: { mac: string; npt: string; npp?: string } }>({});
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);

  const [selectedForeignLanguage, setSelectedForeignLanguage] = useState<'INGLÊS' | 'FRANCÊS'>(
    foreignLanguageProp || 'INGLÊS'
  );

  useEffect(() => {
    if (foreignLanguageProp) {
      setSelectedForeignLanguage(foreignLanguageProp);
    }
  }, [foreignLanguageProp]);

  // --- GRADE EDIT SECURITY HUB AND PERMISSION REQUEST STATES ---
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

  const canEditGradesNatively = 
    userRole === 'SUB_DIRECTOR_PEDAGOGICO' || 
    (loggedInStaff && (loggedInStaff.role === 'DIRECTOR_GERAL' || loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO'));

  const hasApprovedRequest = (studentId: string, subject: string, trimester: string) => {
    if (canEditGradesNatively) return true;
    const staffId = loggedInStaff ? loggedInStaff.id : 'SECRETARIO';
    
    return activeApprovedRequests.some(r => 
      r.studentId === studentId && 
      r.subject === subject && 
      r.trimester === trimester && 
      r.status === 'APPROVED' &&
      (r.requesterId === staffId || staffId === 'SECRETARIO')
    );
  };

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

  const executePendingGradeSave = (studentId: string, subject: string, trimester: 'I' | 'II' | 'III') => {
    if (!pendingRequestData) return;
    
    if (pendingRequestData.fields) {
      // Cell Inline Save
      onUpdateGradeFields(studentId, subject as any, trimester, pendingRequestData.fields);
    } else if (pendingRequestData.modalSubjects && pendingRequestData.modalFieldsData) {
      // Modal Batch Save
      executeSaveModalGrades(
        modalStudent!,
        trimester,
        pendingRequestData.modalSubjects,
        classeNum >= 7 ? 20 : 10,
        pendingRequestData.modalFieldsData
      );
    }
    setPendingRequestData(null);
  };

  // Sync / monitor active requests for automatic instant approval
  useEffect(() => {
    if (isRequestModalOpen && pendingRequestData) {
      const activeTrim = isProfessorRole && profValidated ? profSelectedTrim : selectedTrim;
      const approved = activeApprovedRequests.find(r => 
        r.studentId === pendingRequestData.studentId &&
        r.subject === pendingRequestData.subject &&
        r.trimester === activeTrim &&
        r.status === 'APPROVED'
      );
      if (approved) {
        setOnlineApprovedSuccess('✓ Aprovado e assinado digitalmente em tempo real!');
        setTimeout(() => {
          executePendingGradeSave(approved.studentId, approved.subject, approved.trimester);
          setIsRequestModalOpen(false);
          setOnlineApprovedSuccess(null);
          setOnlineRequestSent(false);
          setRequestReason('');
        }, 1500);
      }
    }
  }, [activeApprovedRequests, isRequestModalOpen, pendingRequestData]);

  const handleOnlineSubmitRequest = () => {
    if (!requestReason.trim()) {
      alert("Por favor, preencha o motivo da alteração.");
      return;
    }
    const activeTrim = isProfessorRole && profValidated ? profSelectedTrim : selectedTrim;
    const newReq = {
      id: 'req-' + Date.now(),
      requesterId: loggedInStaff ? loggedInStaff.id : 'SECRETARIO',
      requesterName: loggedInStaff ? loggedInStaff.name : 'Secretário',
      requesterRole: loggedInStaff ? loggedInStaff.role : 'SECRETARIO',
      studentId: pendingRequestData.studentId,
      studentName: pendingRequestData.studentName,
      subject: pendingRequestData.subject,
      trimester: activeTrim,
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
        mensagem: `🚨 PEDIDO D'ALTERAÇÃO DE NOTA EM TEMPO REAL:
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
    const activeTrim = isProfessorRole && profValidated ? profSelectedTrim : selectedTrim;
    const approvedReq = {
      id: 'req-' + Date.now(),
      requesterId: loggedInStaff ? loggedInStaff.id : 'SECRETARIO',
      requesterName: loggedInStaff ? loggedInStaff.name : 'Secretário',
      requesterRole: loggedInStaff ? loggedInStaff.role : 'SECRETARIO',
      studentId: pendingRequestData.studentId,
      studentName: pendingRequestData.studentName,
      subject: pendingRequestData.subject,
      trimester: activeTrim,
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
      executePendingGradeSave(approvedReq.studentId, approvedReq.subject, approvedReq.trimester);
      setIsRequestModalOpen(false);
      setPhysicalSuccess(null);
      setPhysicalAuthPassword('');
      setOnlineRequestSent(false);
      setRequestReason('');
    }, 1500);
  };

  // Derive class limits
  const classeNum = parseInt(currentClass) || 1;
  let maxLimit = 10; // Default Level 1 and 2 (1ª - 6ª Classe)
  if (classeNum >= 7) {
    maxLimit = 20; // Level 3 (7ª - 9ª Classe) e Ensino Secundário (10ª - 13ª Classe)
  }

  // Find specialty of the current class/section
  const sectionStudents = students.filter(s => s.class === currentClass && s.section === currentSection);
  const activeSpecialty = getSpecialtyFromSection(currentSection, activeModality);

  // Active subjects list, restricted if Professor is validated
  const classSubjects = getSubjectsForClass(currentClass, activeModality, activeSpecialty);

  const isNotMagisterio = activeModality !== 'MAGISTERIO';
  const shouldFilterForeignLanguage = isNotMagisterio && (classeNum >= 7 || activeModality === 'PUNIV');

  const filteredClassSubjects = shouldFilterForeignLanguage
    ? classSubjects.filter(sub => {
        if (isEnglishSubject(sub) && selectedForeignLanguage !== 'INGLÊS') return false;
        if (isFrenchSubject(sub) && selectedForeignLanguage !== 'FRANCÊS') return false;
        return true;
      })
    : classSubjects;

  const activeSubjects = isProfessorRole && profValidated && profSelectedSubject
    ? [profSelectedSubject as SubjectType]
    : filteredClassSubjects;

  const targetStudents = students.filter((student) => {
    const matchesClassAndSection = student.class === currentClass && student.section === currentSection;
    if (!matchesClassAndSection) return false;
    if (shouldFilterForeignLanguage) {
      const studentLang = student.foreignLanguage || 'INGLÊS';
      return studentLang === selectedForeignLanguage;
    }
    return true;
  });

  // Sync povoadoAlunos when targetStudents or current parameters change
  useEffect(() => {
    setPovoadoAlunos(targetStudents.slice(0, 75));
  }, [currentClass, currentSection, selectedForeignLanguage, students, activeModality]);

  // Database sheet name based on class (VBA Logic)
  const dbSheetName = classeNum >= 7 ? 'MINI PAUTA3_BANCODADOS' : classeNum >= 5 ? 'MINI_PAUTA2_BANCODADOS' : 'MINI_PAUTA1_BANCODADOS';

  // Count saved notes in this database partition
  const studentIds = targetStudents.map(s => s.id);
  const currentActiveTrim = selectedTrim;

  const partitionGrades = grades.filter(
    g => studentIds.includes(g.studentId) && 
         activeSubjects.includes(g.subject) && 
         g.trimester === currentActiveTrim
  );

  const completedLaunches = partitionGrades.filter(g => g.mac !== null && g.npt !== null).length;
  const totalPossibleLaunches = targetStudents.length * activeSubjects.length;
  const calculatedSyncPercent = totalPossibleLaunches > 0 ? Math.round((completedLaunches / totalPossibleLaunches) * 100) : 0;

  const handlePovoar = () => {
    if (userRole === 'SECRETARIO') {
      setAlertMsg('Acesso Restrito: O Secretário não está autorizado a executar subrotinas ou povoar dados.');
      return;
    }
    const limited = targetStudents.slice(0, 75);
    setPovoadoAlunos(limited);
    setAlertMsg(null);
    onPovoarAlunos(`PAUTA1TM${currentActiveTrim === 'I' ? '1' : currentActiveTrim === 'II' ? '2' : '3'}`);
  };

  const handleConsolidar = () => {
    if (userRole === 'SECRETARIO') {
      setAlertMsg('Acesso Restrito: O Secretário não está autorizado a realizar a consolidação de médias trimestrais.');
      return;
    }
    if (povoadoAlunos.length === 0) {
      setAlertMsg('Por favor, execute "Povoar Alunos" primeiro para mapear o painel nominal.');
      return;
    }
    setAlertMsg(null);
    const now = new Date();
    setLastCalculatedAt(now.toLocaleTimeString());
    onConsolidarNotas(`PAUTA1TM${currentActiveTrim === 'I' ? '1' : currentActiveTrim === 'II' ? '2' : '3'}`);
  };

  const handlePrintMiniPauta = async (
    isBlankMode: boolean,
    overrideClass?: string,
    overrideSection?: string,
    overrideSpecialty?: string,
    overrideSubject?: SubjectType
  ) => {
    setIsPdfGenerating(true);
    try {
      const activeClass = isBlankMode ? (overrideClass || blankClass) : currentClass;
      const activeSection = isBlankMode ? (overrideSection || blankSection) : currentSection;
      const activeSpecialty = isBlankMode 
        ? (overrideSpecialty || blankSpecialty) 
        : getSpecialtyFromSection(activeSection, activeModality);
      const activeSubject = isBlankMode 
        ? (overrideSubject || blankSubject) 
        : (profSelectedSubject || 'L. PORTUGUESA' as SubjectType);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const studentsPerPage = 25;
      
      let displayList: any[] = [];
      if (isBlankMode) {
        // Query from students database based on activeClass, activeSection, and specialty
        displayList = students.filter(student => {
          const matchesClassAndSection = student.class === activeClass && student.section === activeSection;
          if (!matchesClassAndSection) return false;
          
          if (activeSpecialty && activeSpecialty !== 'Geral') {
            return student.specialty === activeSpecialty;
          }
          return true;
        });

        // Fallback if no students are found
        if (displayList.length === 0) {
          displayList = Array.from({ length: 25 }, (_, i) => ({ id: '', name: '', gender: '' }));
        }
      } else {
        displayList = povoadoAlunos;
      }

      if (!isBlankMode && displayList.length === 0) {
        setAlertMsg('Erro: Precisa de povoar os alunos antes de gerar a Mini-Pauta preenchida.');
        setIsPdfGenerating(false);
        return;
      }

      const totalStudents = displayList.length;
      const totalPages = Math.ceil(totalStudents / studentsPerPage) || 1;

      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const today = new Date();
      const dateText = `${schoolSettings?.municipality || 'Cafunfo'}, aos ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (pageNum > 1) {
          doc.addPage();
        }

        // 1. SCHOOL LOGO
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

        // 2. STATE HEADER (Centered on A4 - 105mm)
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);

        let hY1 = 25;
        if (schoolSettings?.headerLine1Active !== false) {
          doc.text((schoolSettings?.headerLine1 || 'REPÚBLICA DE ANGOLA').toUpperCase(), 105, hY1, { align: 'center' });
          hY1 += 4;
        }
        if (schoolSettings?.headerLine2Active !== false) {
          doc.text((schoolSettings?.headerLine2 || 'MINISTÉRIO DA EDUCAÇÃO').toUpperCase(), 105, hY1, { align: 'center' });
          hY1 += 4;
        }
        if (schoolSettings?.headerLine3Active !== false) {
          const provincialGov = schoolSettings?.headerLine3 || `GOVERNO PROVINCIAL DE ${String(schoolSettings?.province || 'LUANDA').toUpperCase()}`;
          doc.text(provincialGov.toUpperCase(), 105, hY1, { align: 'center' });
          hY1 += 4;
        }
        if (schoolSettings?.headerLine4Active !== false) {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(7.5);
          const municipalityText = schoolSettings?.headerLine4 || `DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${String(schoolSettings?.municipality || 'MUNICIPIO').toUpperCase()}`;
          doc.text(municipalityText.toUpperCase(), 105, hY1, { align: 'center' });
          hY1 += 4;
        }

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        const schoolTitle = String(schoolSettings?.schoolName || 'Complexo Escolar Nº 1709 LNO').toUpperCase();
        const schoolTitleY = hY1 + 1;
        doc.text(schoolTitle, 105, schoolTitleY, { align: 'center' });

        const metaY = 58;
        const titleY = Math.round((schoolTitleY + metaY) / 2);

        // Subtitle Document Title
        doc.setFontSize(11);
        doc.setFont('Helvetica', 'bold');
        const documentTitle = "MINI PAUTA";
        doc.text(documentTitle, 105, titleY, { align: 'center' });

        // Meta Info Columns
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(60, 60, 60);

        const currentSubName = activeSubject || 'L. PORTUGUESA';
        doc.setFont('Helvetica', 'bold');
        doc.text(`Disciplina: ${currentSubName}`, 15, metaY);
        doc.setFont('Helvetica', 'normal');
        
        const specialtyName = activeSpecialty ? getSpecialtyFullName(activeSpecialty) : 'Geral';
        doc.text(`Classe: ${activeClass}ª - Especialidade: ${specialtyName.toUpperCase()}`, 105, metaY, { align: 'center' });
        doc.setFontSize(7.5);
        doc.text(`Cód. Pauta: ${gerarCodigoPauta(schoolSettings?.academicYear || '2025/2026', activeClass)}`, 105, metaY + 3.5, { align: 'center' });
        doc.setFontSize(8.5);
        doc.text(`Turma: ${activeSection}`, 145, metaY);
        doc.text(`Sala Nº_____`, 170, metaY);
        doc.text(`Ano Lectivo: ${schoolSettings?.academicYear || '2025/2026'}`, 15, metaY + 5);
        doc.text(`Período: Regular`, 105, metaY + 5, { align: 'center' });
        doc.text(`Trimestre: ${isBlankMode ? 'Anual' : selectedTrim + 'º Trimestre'}`, 150, metaY + 5);

        // TABLE MATRIX LAYOUT DRAWING
        const startY = 75;
        const colNoX = 15;        // width 8mm
        const colIdX = 23;        // width 18mm

        const colNameX = useNpp ? 40 : 41;
        const colGenX = useNpp ? 85 : 106;
        
        const colT1X = useNpp ? 91 : 112;
        const colT2X = useNpp ? 115 : 130;
        const colT3X = useNpp ? 139 : 148;
        const colMfdX = useNpp ? 163 : 166;
        const colObsX = useNpp ? 175 : 178;

        // Draw Table Headers (2 rows for spanned trimester headers)
        doc.setFillColor(245, 247, 250);
        doc.rect(colNoX, startY, 180, 10, 'F');
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.25);
        doc.rect(colNoX, startY, 180, 10, 'D');

        // Draw inner header division line
        doc.line(colT1X, startY + 5, colObsX, startY + 5);

        // Vertical division lines in header
        doc.line(colIdX, startY, colIdX, startY + 10);
        doc.line(colNameX, startY, colNameX, startY + 10);
        doc.line(colGenX, startY, colGenX, startY + 10);
        
        doc.line(colT1X, startY, colT1X, startY + 10);
        doc.line(colT2X, startY, colT2X, startY + 10);
        doc.line(colT3X, startY, colT3X, startY + 10);
        doc.line(colMfdX, startY, colMfdX, startY + 10);
        doc.line(colObsX, startY, colObsX, startY + 10);

        // Vertical lines for sub-headers (MAC, NPP, NPT, MT)
        if (useNpp) {
          doc.line(colT1X + 6, startY + 5, colT1X + 6, startY + 10);
          doc.line(colT1X + 12, startY + 5, colT1X + 12, startY + 10);
          doc.line(colT1X + 18, startY + 5, colT1X + 18, startY + 10);

          doc.line(colT2X + 6, startY + 5, colT2X + 6, startY + 10);
          doc.line(colT2X + 12, startY + 5, colT2X + 12, startY + 10);
          doc.line(colT2X + 18, startY + 5, colT2X + 18, startY + 10);

          doc.line(colT3X + 6, startY + 5, colT3X + 6, startY + 10);
          doc.line(colT3X + 12, startY + 5, colT3X + 12, startY + 10);
          doc.line(colT3X + 18, startY + 5, colT3X + 18, startY + 10);
        } else {
          doc.line(colT1X + 6, startY + 5, colT1X + 6, startY + 10);
          doc.line(colT1X + 12, startY + 5, colT1X + 12, startY + 10);

          doc.line(colT2X + 6, startY + 5, colT2X + 6, startY + 10);
          doc.line(colT2X + 12, startY + 5, colT2X + 12, startY + 10);

          doc.line(colT3X + 6, startY + 5, colT3X + 6, startY + 10);
          doc.line(colT3X + 12, startY + 5, colT3X + 12, startY + 10);
        }

        // Headers text
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(40, 40, 40);

        doc.text('Nº', colNoX + 4, startY + 6.5, { align: 'center' });
        doc.text('Matrícula', colIdX + (useNpp ? 8.5 : 9), startY + 6.5, { align: 'center' });
        doc.text('Nome Completo do Aluno', colNameX + 3, startY + 6.5);
        doc.text('Gê', colGenX + 3, startY + 6.5, { align: 'center' });

        doc.text('I TRIMESTRE', colT1X + (useNpp ? 12 : 9), startY + 4, { align: 'center' });
        doc.text('II TRIMESTRE', colT2X + (useNpp ? 12 : 9), startY + 4, { align: 'center' });
        doc.text('III TRIMESTRE', colT3X + (useNpp ? 12 : 9), startY + 4, { align: 'center' });
        doc.text('MFD', colMfdX + 6, startY + 6.5, { align: 'center' });
        doc.text('OBS.', colObsX + (useNpp ? 10 : 8.5), startY + 6.5, { align: 'center' });

        // Subheaders text
        doc.setFontSize(6.5);
        const subHeaders = useNpp ? ['MAC', 'NPP', 'NPT', 'MT'] : ['MAC', 'NPT', 'MT'];
        const numSub = subHeaders.length;
        for (let i = 0; i < numSub; i++) {
          doc.text(subHeaders[i], colT1X + i * 6 + 3, startY + 8.8, { align: 'center' });
          doc.text(subHeaders[i], colT2X + i * 6 + 3, startY + 8.8, { align: 'center' });
          doc.text(subHeaders[i], colT3X + i * 6 + 3, startY + 8.8, { align: 'center' });
        }

        // DRAW ROWS
        const startRowIdx = (pageNum - 1) * studentsPerPage;
        const endRowIdx = Math.min(startRowIdx + studentsPerPage, totalStudents);
        const rowHeight = 6.2;
        let currentY = startY + 10;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);

        for (let i = startRowIdx; i < endRowIdx; i++) {
          const student = displayList[i];
          const actualNo = i + 1;

          // Draw horizontal border
          doc.rect(colNoX, currentY, 180, rowHeight, 'D');

          // Draw vertical divisions
          doc.line(colIdX, currentY, colIdX, currentY + rowHeight);
          doc.line(colNameX, currentY, colNameX, currentY + rowHeight);
          doc.line(colGenX, currentY, colGenX, currentY + rowHeight);
          doc.line(colT1X, currentY, colT1X, currentY + rowHeight);
          doc.line(colT2X, currentY, colT2X, currentY + rowHeight);
          doc.line(colT3X, currentY, colT3X, currentY + rowHeight);
          doc.line(colMfdX, currentY, colMfdX, currentY + rowHeight);
          doc.line(colObsX, currentY, colObsX, currentY + rowHeight);

          // Subheaders lines
          if (useNpp) {
            doc.line(colT1X + 6, currentY, colT1X + 6, currentY + rowHeight);
            doc.line(colT1X + 12, currentY, colT1X + 12, currentY + rowHeight);
            doc.line(colT1X + 18, currentY, colT1X + 18, currentY + rowHeight);

            doc.line(colT2X + 6, currentY, colT2X + 6, currentY + rowHeight);
            doc.line(colT2X + 12, currentY, colT2X + 12, currentY + rowHeight);
            doc.line(colT2X + 18, currentY, colT2X + 18, currentY + rowHeight);

            doc.line(colT3X + 6, currentY, colT3X + 6, currentY + rowHeight);
            doc.line(colT3X + 12, currentY, colT3X + 12, currentY + rowHeight);
            doc.line(colT3X + 18, currentY, colT3X + 18, currentY + rowHeight);
          } else {
            doc.line(colT1X + 6, currentY, colT1X + 6, currentY + rowHeight);
            doc.line(colT1X + 12, currentY, colT1X + 12, currentY + rowHeight);

            doc.line(colT2X + 6, currentY, colT2X + 6, currentY + rowHeight);
            doc.line(colT2X + 12, currentY, colT2X + 12, currentY + rowHeight);

            doc.line(colT3X + 6, currentY, colT3X + 6, currentY + rowHeight);
            doc.line(colT3X + 12, currentY, colT3X + 12, currentY + rowHeight);
          }

          // Row Content
          doc.setFont('Helvetica', 'bold');
          doc.text(String(actualNo), colNoX + 4, currentY + 4.2, { align: 'center' });
          doc.setFont('Helvetica', 'normal');

          if (student && (student.id || student.name)) {
            doc.setFont('Helvetica', 'bold');
            doc.text(String(student.id || ''), colIdX + (useNpp ? 8.5 : 9), currentY + 4.2, { align: 'center' });
            doc.setFont('Helvetica', 'normal');

            const origName = student.name || '';
            const dispName = origName.length > 34 ? origName.slice(0, 32) + '..' : origName;
            doc.text(dispName, colNameX + 3, currentY + 4.2);
            doc.text(String(student.gender || ''), colGenX + 3, currentY + 4.2, { align: 'center' });
          }

          if (!isBlankMode && student && student.id) {
            const recordI = grades.find(g => g.studentId === student.id && g.subject === activeSubject && g.trimester === 'I');
            const recordII = grades.find(g => g.studentId === student.id && g.subject === activeSubject && g.trimester === 'II');
            const recordIII = grades.find(g => g.studentId === student.id && g.subject === activeSubject && g.trimester === 'III');

            const passLimit = maxLimit === 20 ? 10 : 5;

            // DRAW TI GRADES
            if (recordI) {
              if (recordI.mac !== null) doc.text(String(recordI.mac), colT1X + 3, currentY + 4.2, { align: 'center' });
              if (useNpp) {
                if (recordI.npp !== null && recordI.npp !== undefined) doc.text(String(recordI.npp), colT1X + 9, currentY + 4.2, { align: 'center' });
                if (recordI.npt !== null) doc.text(String(recordI.npt), colT1X + 15, currentY + 4.2, { align: 'center' });
                if (recordI.mt !== null) {
                  doc.setFont('Helvetica', 'bold');
                  if (recordI.mt < passLimit) doc.setTextColor(185, 28, 28);
                  doc.text(String(recordI.mt), colT1X + 21, currentY + 4.2, { align: 'center' });
                  doc.setTextColor(0, 0, 0);
                  doc.setFont('Helvetica', 'normal');
                }
              } else {
                if (recordI.npt !== null) doc.text(String(recordI.npt), colT1X + 9, currentY + 4.2, { align: 'center' });
                if (recordI.mt !== null) {
                  doc.setFont('Helvetica', 'bold');
                  if (recordI.mt < passLimit) doc.setTextColor(185, 28, 28);
                  doc.text(String(recordI.mt), colT1X + 15, currentY + 4.2, { align: 'center' });
                  doc.setTextColor(0, 0, 0);
                  doc.setFont('Helvetica', 'normal');
                }
              }
            }

            // DRAW TII GRADES
            if (recordII) {
              if (recordII.mac !== null) doc.text(String(recordII.mac), colT2X + 3, currentY + 4.2, { align: 'center' });
              if (useNpp) {
                if (recordII.npp !== null && recordII.npp !== undefined) doc.text(String(recordII.npp), colT2X + 9, currentY + 4.2, { align: 'center' });
                if (recordII.npt !== null) doc.text(String(recordII.npt), colT2X + 15, currentY + 4.2, { align: 'center' });
                if (recordII.mt !== null) {
                  doc.setFont('Helvetica', 'bold');
                  if (recordII.mt < passLimit) doc.setTextColor(185, 28, 28);
                  doc.text(String(recordII.mt), colT2X + 21, currentY + 4.2, { align: 'center' });
                  doc.setTextColor(0, 0, 0);
                  doc.setFont('Helvetica', 'normal');
                }
              } else {
                if (recordII.npt !== null) doc.text(String(recordII.npt), colT2X + 9, currentY + 4.2, { align: 'center' });
                if (recordII.mt !== null) {
                  doc.setFont('Helvetica', 'bold');
                  if (recordII.mt < passLimit) doc.setTextColor(185, 28, 28);
                  doc.text(String(recordII.mt), colT2X + 15, currentY + 4.2, { align: 'center' });
                  doc.setTextColor(0, 0, 0);
                  doc.setFont('Helvetica', 'normal');
                }
              }
            }

            // DRAW TIII GRADES
            if (recordIII) {
              if (recordIII.mac !== null) doc.text(String(recordIII.mac), colT3X + 3, currentY + 4.2, { align: 'center' });
              if (useNpp) {
                if (recordIII.npp !== null && recordIII.npp !== undefined) doc.text(String(recordIII.npp), colT3X + 9, currentY + 4.2, { align: 'center' });
                if (recordIII.npt !== null) doc.text(String(recordIII.npt), colT3X + 15, currentY + 4.2, { align: 'center' });
                if (recordIII.mt !== null) {
                  doc.setFont('Helvetica', 'bold');
                  if (recordIII.mt < passLimit) doc.setTextColor(185, 28, 28);
                  doc.text(String(recordIII.mt), colT3X + 21, currentY + 4.2, { align: 'center' });
                  doc.setTextColor(0, 0, 0);
                  doc.setFont('Helvetica', 'normal');
                }
              } else {
                if (recordIII.npt !== null) doc.text(String(recordIII.npt), colT3X + 9, currentY + 4.2, { align: 'center' });
                if (recordIII.mt !== null) {
                  doc.setFont('Helvetica', 'bold');
                  if (recordIII.mt < passLimit) doc.setTextColor(185, 28, 28);
                  doc.text(String(recordIII.mt), colT3X + 15, currentY + 4.2, { align: 'center' });
                  doc.setTextColor(0, 0, 0);
                  doc.setFont('Helvetica', 'normal');
                }
              }
            }

            // Calculate and Draw MFD & OBS
            const mt1 = recordI?.mt ?? null;
            const mt2 = recordII?.mt ?? null;
            const mt3 = recordIII?.mt ?? null;

            const mtList = [mt1, mt2, mt3].filter((v): v is number => v !== null);
            if (mtList.length > 0) {
              const sum = mtList.reduce((a, b) => a + b, 0);
              const mfd = Math.round(sum / mtList.length);

              doc.setFont('Helvetica', 'bold');
              if (mfd < passLimit) doc.setTextColor(185, 28, 28);
              doc.text(String(mfd), colMfdX + 6, currentY + 4.2, { align: 'center' });
              doc.setTextColor(0, 0, 0);

              doc.setFontSize(6);
              if (mtList.length === 3) {
                if (mfd >= passLimit) {
                  doc.setTextColor(16, 124, 65);
                  doc.text('APROVADO', colObsX + (useNpp ? 10 : 8.5), currentY + 4.2, { align: 'center' });
                } else {
                  doc.setTextColor(185, 28, 28);
                  doc.text('REPROVADO', colObsX + (useNpp ? 10 : 8.5), currentY + 4.2, { align: 'center' });
                }
              } else {
                doc.setTextColor(100, 100, 100);
                doc.text('FREQUÊNCIA', colObsX + (useNpp ? 10 : 8.5), currentY + 4.2, { align: 'center' });
              }
              doc.setFontSize(7);
              doc.setTextColor(0, 0, 0);
              doc.setFont('Helvetica', 'normal');
            }
          }

          currentY += rowHeight;
        }

        // LAST PAGE ONLY - Render Statistics & Signatures
        if (pageNum === totalPages) {
          let statY = 236;
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.text('QUADRO ESTATÍSTICO DE RENDIMENTO', 15, statY);

          const gridW = 12;
          const labelW = 22;
          doc.setFillColor(248, 250, 252);
          doc.rect(15, statY + 2, labelW + 3 * gridW, 20, 'F');
          doc.rect(15, statY + 2, labelW + 3 * gridW, 20, 'D');

          doc.line(15 + labelW, statY + 2, 15 + labelW, statY + 22);
          doc.line(15 + labelW + gridW, statY + 2, 15 + labelW + gridW, statY + 22);
          doc.line(15 + labelW + 2 * gridW, statY + 2, 15 + labelW + 2 * gridW, statY + 22);

          for (let r = 1; r <= 3; r++) {
            doc.line(15, statY + 2 + r * 5, 15 + labelW + 3 * gridW, statY + 2 + r * 5);
          }

          doc.setFontSize(7);
          doc.text('Género', 15 + 4, statY + 5.5);
          doc.text('M', 15 + labelW + 4.5, statY + 5.5);
          doc.text('F', 15 + labelW + gridW + 4.5, statY + 5.5);
          doc.text('Total', 15 + labelW + 2 * gridW + 3, statY + 5.5);

          doc.setFont('Helvetica', 'normal');
          doc.text('Matriculados', 15 + 2, statY + 10.5);
          doc.text('Aprovados', 15 + 2, statY + 15.5);
          doc.text('Reprovados', 15 + 2, statY + 20.5);

          if (!isBlankMode) {
            const activeSubject = profSelectedSubject || 'L. PORTUGUESA';
            const passLimit = maxLimit === 20 ? 10 : 5;

            const mCount = displayList.filter(s => s.gender === 'M').length;
            const fCount = displayList.filter(s => s.gender === 'F').length;

            let mPass = 0, fPass = 0, mFail = 0, fFail = 0;
            displayList.forEach(student => {
              const recordI = grades.find(g => g.studentId === student.id && g.subject === activeSubject && g.trimester === 'I');
              const recordII = grades.find(g => g.studentId === student.id && g.subject === activeSubject && g.trimester === 'II');
              const recordIII = grades.find(g => g.studentId === student.id && g.subject === activeSubject && g.trimester === 'III');

              const mtList = [recordI?.mt, recordII?.mt, recordIII?.mt].filter((v): v is number => v !== null && v !== undefined);
              if (mtList.length > 0) {
                const sum = mtList.reduce((a, b) => a + b, 0);
                const mfd = Math.round(sum / mtList.length);
                if (mfd >= passLimit) {
                  if (student.gender === 'M') mPass++; else fPass++;
                } else {
                  if (student.gender === 'M') mFail++; else fFail++;
                }
              }
            });

            doc.setFont('Helvetica', 'bold');
            doc.text(String(mCount), 15 + labelW + 4.5, statY + 10.5);
            doc.text(String(fCount), 15 + labelW + gridW + 4.5, statY + 10.5);
            doc.text(String(mCount + fCount), 15 + labelW + 2 * gridW + 3, statY + 10.5);

            doc.text(String(mPass), 15 + labelW + 4.5, statY + 15.5);
            doc.text(String(fPass), 15 + labelW + gridW + 4.5, statY + 15.5);
            doc.text(String(mPass + fPass), 15 + labelW + 2 * gridW + 3, statY + 15.5);

            doc.text(String(mFail), 15 + labelW + 4.5, statY + 20.5);
            doc.text(String(fFail), 15 + labelW + gridW + 4.5, statY + 20.5);
            doc.text(String(mFail + fFail), 15 + labelW + 2 * gridW + 3, statY + 20.5);
          }

          let sigY = statY + 28;
          const lineLength = 60;

          doc.setFontSize(8);
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(dateText, 15, statY + 22, { align: 'left' });

          doc.setFontSize(7.5);
          doc.setFont('Helvetica', 'bold');

          // O Professor signature centered perfectly at 105mm on A4
          doc.line(105 - (lineLength / 2), sigY + 10, 105 + (lineLength / 2), sigY + 10);
          doc.text('O Professor', 105, sigY + 14, { align: 'center' });
          
          const assignedTeacher = staffList.find(s => 
            s.classes?.includes(activeClass) && 
            s.sections?.includes(activeSection) && 
            s.subjects?.includes(activeSubject as SubjectType)
          );
          const profName = isBlankMode 
            ? (assignedTeacher?.name || '___________________________') 
            : (validatedProfObj?.name || 'Docente Responsável');

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(7);
          doc.text(profName, 105, sigY + 18, { align: 'center' });

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(140, 140, 140);
          doc.rect(142, sigY + 23, 36, 10, 'D');
          doc.text('MINISTÉRIO DA EDUCAÇÃO - MED', 160, sigY + 26.5, { align: 'center' });
          doc.text('CHANCELA REGULAMENTAR', 160, sigY + 30.5, { align: 'center' });
        }

        doc.setFontSize(6.5);
        doc.setFont('Helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        const contactLine = `${schoolSettings?.schoolName || 'Complexo Escolar Nº 1709 LNO'}  |  Endereço: ${schoolSettings?.address || `${schoolSettings?.municipality || 'Cafunfo'}, ${schoolSettings?.province || 'Lunda-Norte'}`}  |  Tel: ${schoolSettings?.contact || '923 000 000'}  |  E-mail: ${schoolSettings?.email || 'geral@sigep.ao'}`;
        doc.text(contactLine, 105, 290, { align: 'center' });
        doc.text(`Página ${pageNum} de ${totalPages}`, 195, 290, { align: 'right' });
      }

      const fileSuffix = isBlankMode ? 'MODELO_BRANCO' : `${currentClass}_CLASSE_TURMA_${currentSection}`;
      doc.save(`MINI_PAUTA_${fileSuffix}.pdf`);
    } catch (error) {
      console.error('Error generating Mini Pauta PDF:', error);
      setAlertMsg('Erro ao compilar ou descarregar o ficheiro PDF.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handlePrintPautaTrimestral = async () => {
    if (povoadoAlunos.length === 0) {
      setAlertMsg('Erro: Precisa de povoar os alunos antes de gerar a Pauta Trimestral.');
      return;
    }

    setIsPdfGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      const pageWidth = 420;
      const pageHeight = 297;

      // Calculate column widths
      const colsPerSubject = useNpp ? 4 : 3;
      const totalSubjectCols = activeSubjects.length * colsPerSubject;

      const targetTableWidth = 396; // mm
      const targetSubjectsWidth = 280; // mm

      let noteColWidth = targetSubjectsWidth / totalSubjectCols;
      if (noteColWidth > 12) noteColWidth = 12;
      if (noteColWidth < 4) noteColWidth = 4;

      const actualSubjectsWidth = totalSubjectCols * noteColWidth;

      const colWidthNo = 6;
      const colWidthMat = 16;
      const colWidthGen = 6;
      const colWidthObs = 20;

      let colWidthName = targetTableWidth - (colWidthNo + colWidthMat + colWidthGen + actualSubjectsWidth + colWidthObs);
      if (colWidthName < 40) {
        colWidthName = 40;
      }

      const finalTableWidth = colWidthNo + colWidthMat + colWidthName + colWidthGen + actualSubjectsWidth + colWidthObs;
      const leftMargin = (pageWidth - finalTableWidth) / 2;
      const rightMargin = leftMargin;

      let tableFontSize = 6.5;
      let tablePadding = 0.8;

      if (noteColWidth < 4.5) {
        tableFontSize = 4.2;
        tablePadding = 0.3;
      } else if (noteColWidth < 5.5) {
        tableFontSize = 5.0;
        tablePadding = 0.4;
      } else if (noteColWidth < 7.0) {
        tableFontSize = 5.8;
        tablePadding = 0.6;
      }

      // 1. Setup Headers
      const headRow1 = [
        { content: 'Nº', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: Math.max(tableFontSize, 5.5), fontStyle: 'bold' } },
        { content: 'Matrícula', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: Math.max(tableFontSize, 5.5), fontStyle: 'bold' } },
        { content: 'Nome Completo do Aluno', rowSpan: 2, styles: { valign: 'middle', fontSize: Math.max(tableFontSize, 5.5), fontStyle: 'bold' } },
        { content: 'Gên', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: Math.max(tableFontSize, 5.5), fontStyle: 'bold' } }
      ];

      activeSubjects.forEach(sub => {
        headRow1.push({
          content: getSubjectAbbreviation(sub),
          colSpan: colsPerSubject,
          styles: { halign: 'center', fontSize: Math.max(tableFontSize, 5.0), fontStyle: 'bold', fillColor: [224, 231, 255] }
        } as any);
      });

      headRow1.push({ content: 'Observação', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: Math.max(tableFontSize, 5.5), fontStyle: 'bold' } } as any);

      const headRow2: any[] = [];
      activeSubjects.forEach(() => {
        headRow2.push({ content: 'MAc', styles: { halign: 'center', fontSize: Math.max(tableFontSize - 0.2, 3.8) } });
        if (useNpp) {
          headRow2.push({ content: 'NPP', styles: { halign: 'center', fontSize: Math.max(tableFontSize - 0.2, 3.8) } });
        }
        headRow2.push({ content: 'NPT', styles: { halign: 'center', fontSize: Math.max(tableFontSize - 0.2, 3.8) } });
        headRow2.push({ content: 'MT', styles: { halign: 'center', fontSize: Math.max(tableFontSize - 0.2, 3.8), fontStyle: 'bold', fillColor: [241, 245, 249] } });
      });

      const headRegular = [headRow1, headRow2];

      // 2. Setup Rows
      const bodyRegular = povoadoAlunos.map((student, localIdx) => {
        const row: any[] = [
          localIdx + 1,
          student.id,
          formatarNomePauta(student.name),
          student.gender
        ];

        // Montar a estrutura AlunoPauta para validação de Observação baseada estritamente nas disciplinas do aluno
        const studentRealSubjects = getSubjectsForStudent(student, activeModality);
        const studentDisciplinas: NotaDisciplina[] = studentRealSubjects.map((sub) => {
          const score = getGradeRecord(student.id, sub as SubjectType);
          const escala = activeModality === 'ENSINO_PRIMARIO' ? 10 : 20;
          const isNeg = score.mt !== null && (escala === 10 ? score.mt < 5.0 : score.mt < 10.0);
          return {
            idDisciplina: sub,
            mac: score.mac,
            npp: useNpp ? (score.npp ?? null) : 0, // Se não usa npp, considera preenchido (0)
            npt: score.npt,
            mt: score.mt,
            reprovadoNaDisciplina: isNeg
          };
        });

        const studentPauta: AlunoPauta = {
          id: student.id,
          nome: student.name,
          disciplinas: studentDisciplinas
        };

        const tipoClasse: TipoClasse = ['6', '9', '12'].includes(currentClass) ? 'EXAME' : 'CONTINUA';
        const obs = student.status === 'Desistente' ? 'Desistente' : calcularObservacaoPauta(studentPauta, tipoClasse);

        // Adicionar notas do aluno
        activeSubjects.forEach((sub) => {
          const score = getGradeRecord(student.id, sub);
          row.push(score.mac !== null && score.mac !== undefined ? score.mac.toFixed(1).replace('.', ',') : '-');
          if (useNpp) {
            row.push(score.npp !== null && score.npp !== undefined ? score.npp.toFixed(1).replace('.', ',') : '-');
          }
          row.push(score.npt !== null && score.npt !== undefined ? score.npt.toFixed(1).replace('.', ',') : '-');
          row.push(score.mt !== null && score.mt !== undefined ? score.mt.toFixed(1).replace('.', ',') : '-');
        });

        row.push(obs);

        return row;
      });

      const colStyles: any = {
        0: { cellWidth: colWidthNo, halign: 'center' },
        1: { cellWidth: colWidthMat, halign: 'center' },
        2: { cellWidth: colWidthName },
        3: { cellWidth: colWidthGen, halign: 'center' }
      };

      const totalCols = 4 + (activeSubjects.length * colsPerSubject) + 1;
      for (let i = 4; i < totalCols - 1; i++) {
        colStyles[i] = { cellWidth: noteColWidth, halign: 'center' };
      }
      colStyles[totalCols - 1] = { cellWidth: colWidthObs, halign: 'center' };

      // Print Header on first page (drawn manually since autoTable does it on top)
      const drawHeaderOnPage = (data: any) => {
        // Only on page 1
        if (data.pageNumber !== 1) return;
        
        const logoUrl = schoolSettings?.logoType === 'PUBLIC' ? schoolSettings?.publicLogoUrl : schoolSettings?.privateLogoUrl;
        if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
          try {
            let format = 'PNG';
            if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) format = 'JPEG';
            doc.addImage(logoUrl, format, 203, 6, 14, 14);
          } catch (e) {
            console.error(e);
          }
        }

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(40, 40, 40);

        let hY2 = 25;
        if (schoolSettings?.headerLine1Active !== false) {
          doc.text((schoolSettings?.headerLine1 || 'REPÚBLICA DE ANGOLA').toUpperCase(), 210, hY2, { align: 'center' });
          hY2 += 4;
        }
        if (schoolSettings?.headerLine2Active !== false) {
          doc.text((schoolSettings?.headerLine2 || 'MINISTÉRIO DA EDUCAÇÃO').toUpperCase(), 210, hY2, { align: 'center' });
          hY2 += 4;
        }
        if (schoolSettings?.headerLine3Active !== false) {
          const provincialGov = schoolSettings?.headerLine3 || `GOVERNO PROVINCIAL DE ${String(schoolSettings?.province || 'LUANDA').toUpperCase()}`;
          doc.text(provincialGov.toUpperCase(), 210, hY2, { align: 'center' });
          hY2 += 4;
        }
        if (schoolSettings?.headerLine4Active !== false) {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(7.5);
          const municipalityText = schoolSettings?.headerLine4 || `DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${String(schoolSettings?.municipality || 'MUNICIPIO').toUpperCase()}`;
          doc.text(municipalityText.toUpperCase(), 210, hY2, { align: 'center' });
          hY2 += 4;
        }

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        const schoolTitle = String(schoolSettings?.schoolName || 'Complexo Escolar Nº 1709 LNO').toUpperCase();
        const schoolTitleY = hY2 + 1;
        doc.text(schoolTitle, 210, schoolTitleY, { align: 'center' });

        const metaY = 52;
        const titleY = Math.round((schoolTitleY + metaY) / 2);

        // Document Title
        doc.setFontSize(12);
        doc.setFont('Helvetica', 'bold');
        doc.text(`PAUTA TRIMESTRAL ${selectedTrim}`, 210, titleY, { align: 'center' });

        // Meta parameters
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`Classe: ${currentClass}ª`, leftMargin, metaY);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(`Cód: ${gerarCodigoPauta(schoolSettings?.academicYear || '2025/2026', currentClass)}`, leftMargin, metaY + 3.5);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`Turma: ${currentSection}`, leftMargin + 50, metaY);
        doc.text(`Sala Nº_____`, leftMargin + 95, metaY);
        doc.text(`Período: Regular`, leftMargin + 145, metaY);
        
        const specialtyName = activeSpecialty ? getSpecialtyFullName(activeSpecialty) : 'Geral';
        doc.text(`Especialidade: ${specialtyName.toUpperCase()}`, leftMargin + 195, metaY);
        doc.text(`Ano Lectivo: ${schoolSettings?.academicYear || '2025/2026'}`, pageWidth - rightMargin - 60, metaY);
      };

      autoTable(doc, {
        startY: 57,
        margin: { top: 25, bottom: 40, left: leftMargin, right: rightMargin },
        head: headRegular,
        body: bodyRegular,
        theme: 'grid',
        styles: {
          fontSize: tableFontSize,
          cellPadding: tablePadding,
          font: 'Helvetica',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          valign: 'middle'
        },
        headStyles: {
          fillColor: [248, 250, 252],
          textColor: [15, 23, 42],
          lineColor: [148, 163, 184],
          lineWidth: 0.25,
          fontStyle: 'bold'
        },
        columnStyles: colStyles,
        didParseCell: function(data) {
          if (data.section === 'body' && typeof data.cell.raw === 'string' && data.cell.raw !== '-') {
            const rawVal = data.cell.raw.trim().toUpperCase();
            if (rawVal === 'TRANSITA' || rawVal === 'APTO') {
              data.cell.styles.textColor = [0, 0, 255]; // Azul Puro
              data.cell.styles.fontStyle = 'bold';
            } else if (
              rawVal === 'N/TRANSITA' || 
              rawVal === 'N/APTO' || 
              rawVal === 'DESISTENTE' || 
              rawVal === 'REPROVADO' || 
              rawVal === 'NÃO TRANSITA' || 
              rawVal === 'NÃO APTO'
            ) {
              data.cell.styles.textColor = [255, 0, 0]; // Vermelho Puro
              data.cell.styles.fontStyle = 'bold';
            } else {
              const val = parseFloat(data.cell.raw.replace(',', '.'));
              if (!isNaN(val)) {
                const escala = activeModality === 'ENSINO_PRIMARIO' ? 10 : 20;
                let isPositive = false;
                if (escala === 10) {
                  isPositive = val >= 5.0;
                } else if (escala === 20) {
                  isPositive = val >= 10.0;
                }
                
                if (isPositive) {
                  data.cell.styles.textColor = [0, 0, 255]; // Azul Puro
                } else {
                  data.cell.styles.textColor = [255, 0, 0]; // Vermelho Puro
                }
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        },
        didDrawPage: function(data) {
          drawHeaderOnPage(data);

          const totalPages = doc.getNumberOfPages();
          const pageNum = data.pageNumber;
          
          doc.setFontSize(7);
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          
          const footerContact = `${schoolSettings?.schoolName || 'Complexo Escolar Nº 1709 LNO'} | Endereço: ${schoolSettings?.address || `${schoolSettings?.municipality || 'Cafunfo'}, ${schoolSettings?.province || 'Lunda-Norte'}`} | Tel: ${schoolSettings?.contact || '923 000 000'} | Email: ${schoolSettings?.email || 'geral@sigep.ao'}`;
          doc.text(footerContact, 210, 288, { align: 'center' });
          doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - rightMargin, 288, { align: 'right' });
        }
      });

      // --- APPEND STATISTICAL TABLE & SIGNATURES BLOCK ON LAST PAGE ---
      let finalY = (doc as any).lastAutoTable.finalY + 10;
      const requiredHeight = 70; // Space needed for stats table + signatures
      if (finalY + requiredHeight > pageHeight - 15) {
        doc.addPage();
        const newTotalPages = doc.getNumberOfPages();
        doc.setPage(newTotalPages);
        finalY = 40; // Start higher up on the new page
      }

      // 1. Calculate Stats for Pauta Trimestral
      let mascTotal = 0, mascAptos = 0, mascNAptos = 0;
      let femTotal = 0, femAptos = 0, femNAptos = 0;

      povoadoAlunos.forEach((student) => {
        const studentDisciplinas: NotaDisciplina[] = activeSubjects.map((sub) => {
          const score = getGradeRecord(student.id, sub);
          const escala = activeModality === 'ENSINO_PRIMARIO' ? 10 : 20;
          const isNeg = score.mt !== null && (escala === 10 ? score.mt < 5.0 : score.mt < 10.0);
          return {
            idDisciplina: sub,
            mac: score.mac,
            npp: useNpp ? (score.npp ?? null) : 0,
            npt: score.npt,
            mt: score.mt,
            reprovadoNaDisciplina: isNeg
          };
        });

        const studentPauta: AlunoPauta = {
          id: student.id,
          nome: student.name,
          disciplinas: studentDisciplinas
        };

        const tipoClasse: TipoClasse = ['6', '9', '12'].includes(currentClass) ? 'EXAME' : 'CONTINUA';
        const obs = calcularObservacaoPauta(studentPauta, tipoClasse);
        const isApto = obs === 'Apto' || obs === 'Transita';

        if (student.gender === 'M') {
          mascTotal++;
          if (isApto) mascAptos++;
          else mascNAptos++;
        } else {
          femTotal++;
          if (isApto) femAptos++;
          else femNAptos++;
        }
      });

      const tTotal = mascTotal + femTotal;
      const tAptos = mascAptos + femAptos;
      const tNAptos = mascNAptos + femNAptos;

      const isExameClass = ['6', '9', '12'].includes(currentClass);
      const labelAprovados = isExameClass ? 'Aptos' : 'Transitas';
      const labelReprovados = isExameClass ? 'N/Aptos' : 'N/Transitas';

      // Draw statistical table using autoTable in PautaTrimester.tsx
      autoTable(doc, {
        startY: finalY,
        margin: { left: leftMargin },
        head: [
          [
            { content: 'Informação Estatística', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fontSize: 7.5, fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
          ],
          [
            { content: 'Género', styles: { halign: 'left', fontStyle: 'bold', fontSize: 6.5 } },
            { content: 'Total', styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 } },
            { content: labelAprovados, styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 } },
            { content: labelReprovados, styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5 } }
          ]
        ],
        body: [
          ['Masculino', mascTotal, mascAptos, mascNAptos],
          ['Feminino', femTotal, femAptos, femNAptos],
          [
            { content: 'Total', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'left', fontSize: 6.5 } },
            { content: String(tTotal), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'center', fontSize: 6.5 } },
            { content: String(tAptos), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'center', fontSize: 6.5 } },
            { content: String(tNAptos), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'center', fontSize: 6.5 } }
          ]
        ],
        theme: 'grid',
        styles: {
          fontSize: 6.5,
          cellPadding: 1.2,
          font: 'Helvetica',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          textColor: [40, 40, 40]
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [15, 23, 42],
          lineColor: [148, 163, 184],
          lineWidth: 0.15
        },
        tableWidth: 80 // Elegant small table width
      });

      // Update finalY to draw date and signatures block side by side with stats or slightly below
      finalY = (doc as any).lastAutoTable.finalY + 12;
      if (finalY + 35 > pageHeight - 15) {
        doc.addPage();
        const newTotalPages = doc.getNumberOfPages();
        doc.setPage(newTotalPages);
        finalY = 40;
      }

      // Now let's draw date
      const today = new Date();
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const dateText = `${schoolSettings?.municipality || 'Cafunfo'}, aos ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;

      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(dateText, pageWidth / 2, finalY, { align: 'center' });

      // Draw signatures centered side by side
      const lineLength = 65;
      const sigY = finalY + 12;

      const midX = pageWidth / 2;
      const sigGap = 40;
      const totalSigWidth = 2 * lineLength + sigGap;
      const sigStartX1 = midX - (totalSigWidth / 2);
      const sigStartX2 = sigStartX1 + lineLength + sigGap;

      // Column 1: O Subdirector Pedagógico
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(schoolSettings?.subdirectorRoleLabel || 'O Sub-Director Pedagógico', sigStartX1 + (lineLength / 2), sigY, { align: 'center' });
      doc.line(sigStartX1, sigY + 12, sigStartX1 + lineLength, sigY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`( ${schoolSettings?.subdirectorName || 'Gaspar Da Fatima'} )`, sigStartX1 + (lineLength / 2), sigY + 16, { align: 'center' });

      // Column 2: O Director Geral
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(schoolSettings?.directorRoleLabel || 'O Director Geral', sigStartX2 + (lineLength / 2), sigY, { align: 'center' });
      doc.line(sigStartX2, sigY + 12, sigStartX2 + lineLength, sigY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`( ${schoolSettings?.directorName || 'Manuel das Fisgas'} )`, sigStartX2 + (lineLength / 2), sigY + 16, { align: 'center' });

      // Set page number and metadata on all pages (handling additions perfectly)
      const finalTotalPages = doc.getNumberOfPages();
      for (let p = 1; p <= finalTotalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const footerContact = `${schoolSettings?.schoolName || 'Complexo Escolar Nº 1709 LNO'} | Endereço: ${schoolSettings?.address || `${schoolSettings?.municipality || 'Cafunfo'}, ${schoolSettings?.province || 'Lunda-Norte'}`} | Tel: ${schoolSettings?.contact || '923 000 000'} | Email: ${schoolSettings?.email || 'geral@sigep.ao'}`;
        doc.text(footerContact, 210, 288, { align: 'center' });
        doc.text(`Página ${p} de ${finalTotalPages}`, pageWidth - rightMargin, 288, { align: 'right' });
      }

      doc.save(`PAUTA_TRIMESTRAL_${selectedTrim}_TRIM_${currentClass}_CLASSE_${currentSection}.pdf`);
    } catch (e) {
      console.error(e);
      setAlertMsg('Erro ao gerar a Pauta Trimestral.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleTrimesterTabClick = (tNum: 'I' | 'II' | 'III') => {
    if (tNum === 'I') {
      setSelectedTrim('I');
      setPovoadoAlunos([]);
      setLastCalculatedAt(null);
      return;
    }
    
    const statusI = getTrimesterCompletionStatus('I');
    if (tNum === 'II') {
      if (statusI.complete || isDirectorAuthorized) {
        setSelectedTrim('II');
        setPovoadoAlunos([]);
        setLastCalculatedAt(null);
      } else {
        requestDirectorPermission(
          `O Iº Trimestre não está concluído (${statusI.percent}% lançado). Introduza a senha do Director Geral para abrir o IIº Trimestre.`,
          () => {
            setSelectedTrim('II');
            setPovoadoAlunos([]);
            setLastCalculatedAt(null);
          }
        );
      }
      return;
    }
    
    const statusII = getTrimesterCompletionStatus('II');
    if (tNum === 'III') {
      if (statusII.complete || isDirectorAuthorized) {
        setSelectedTrim('III');
        setPovoadoAlunos([]);
        setLastCalculatedAt(null);
      } else {
        const prevTrimName = !statusI.complete ? 'Iº' : 'IIº';
        const prevTrimPercent = !statusI.complete ? statusI.percent : statusII.percent;
        requestDirectorPermission(
          `O ${prevTrimName} Trimestre não está concluído (${prevTrimPercent}% lançado). Introduza a senha do Director Geral para abrir o IIIº Trimestre.`,
          () => {
            setSelectedTrim('III');
            setPovoadoAlunos([]);
            setLastCalculatedAt(null);
          }
        );
      }
    }
  };

  // Find grade matching student, subject, trimester
  const getGradeRecord = (studentId: string, subject: string): GradeRow => {
    const trimToQuery = selectedTrim;
    const record = grades.find(
      (g) => g.studentId === studentId && g.subject === subject && g.trimester === trimToQuery
    );
    return record || {
      studentId,
      studentName: '',
      subject: subject as any,
      trimester: trimToQuery,
      mac: null,
      npt: null,
      mt: null
    };
  };

  const formatGradeValue = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    return val.toString().replace('.', ',');
  };

  const handleCellClick = (
    studentId: string,
    subject: string,
    field: 'mac' | 'npt',
    currentVal: number | null,
    cellIdx: number,
    rowIdx: number
  ) => {
    setAlertMsg('Visualização Apenas: O lançamento e a edição de notas devem ser realizados estritamente através da secção "MINI PAUTAS" na barra lateral.');
  };

  const saveInlineEdit = (studentId: string, subject: string, field: 'mac' | 'npp' | 'npt') => {
    if (!editingCell) return;
    
    const parsed = editVal === '' ? null : Math.min(maxLimit, Math.max(0, parseFloat(editVal.replace(',', '.')) || 0));
    
    // Get currently existing values to recalculate MT
    const row = getGradeRecord(studentId, subject);
    const newMac = field === 'mac' ? parsed : row.mac;
    const newNpp = field === 'npp' ? parsed : row.npp;
    const newNpt = field === 'npt' ? parsed : row.npt;

    let newMt: number | null = null;
    if (useNpp) {
      if (newMac !== null || (newNpp !== undefined && newNpp !== null) || newNpt !== null) {
        const macVal = newMac ?? 0;
        const nppVal = newNpp ?? 0;
        const nptVal = newNpt ?? 0;
        newMt = parseFloat(((macVal + nppVal + nptVal) / 3).toFixed(1));
      }
    } else {
      if (newMac !== null || newNpt !== null) {
        const macVal = newMac ?? 0;
        const nptVal = newNpt ?? 0;
        newMt = parseFloat(((macVal + nptVal) / 2).toFixed(1));
      }
    }

    const activeTrim = isProfessorRole && profValidated ? profSelectedTrim : selectedTrim;

    // Check security permission requests
    if (!hasApprovedRequest(studentId, subject, activeTrim)) {
      setPendingRequestData({
        studentId,
        studentName: students.find(s => s.id === studentId)?.name || studentId,
        subject,
        trimester: activeTrim,
        fields: {
          mac: newMac,
          npp: newNpp,
          npt: newNpt,
          mt: newMt
        }
      });
      setIsRequestModalOpen(true);
      setEditingCell(null);
      return;
    }

    onUpdateGradeFields(studentId, subject, activeTrim, {
      mac: newMac,
      npp: newNpp,
      npt: newNpt,
      mt: newMt
    });
    // Immediately remove temporary unlock to lock the cell again
    handleRemoveTemporaryUnlock(studentId, subject, activeTrim);
    setEditingCell(null);
  };

  // --- HANDLE SEARCH IN LAUNCHER MODAL ---
  const handleSearchStudent = () => {
    setModalError('');
    setModalSuccessMsg(null);
    const searchId = searchStudentId.trim().toUpperCase();
    if (!searchId) {
      setModalError('Por favor, introduza um ID de Aluno.');
      return;
    }

    // Find student in our database (by ID, GE, GS or B.I.)
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

    // Check if the current active trimester is complete and locked
    const currentTrimStatus = getTrimesterCompletionStatus(selectedTrim);
    if (currentTrimStatus.complete && !isDirectorAuthorized && !forceEdit) {
      requestDirectorPermission(
        `O ${selectedTrim}º Trimestre foi concluído e trancado. É necessária a senha do Director Geral para aceder ao formulário de edição de notas.`,
        () => {
          loadStudentIntoModal(found);
        }
      );
      return;
    }

    loadStudentIntoModal(found);
  };

  const loadStudentIntoModal = (student: Student) => {
    setModalStudent(student);

    // Load existing grades into inputs
    const activeTrim = selectedTrim;
    const initialValues: typeof modalFields = {};
    const subjectsForClass = getSubjectsForStudent(student, activeModality);
    
    subjectsForClass.forEach(sub => {
      const gRecord = grades.find(g => g.studentId === student.id && g.subject === sub && g.trimester === activeTrim);
      const isClass13 = student.class === '13' || sub === 'PAP' || sub === 'NEC';
      if (isClass13) {
        const notaVal = gRecord?.mt !== null && gRecord?.mt !== undefined 
          ? String(gRecord.mt) 
          : (gRecord?.mac !== null && gRecord?.mac !== undefined ? String(gRecord.mac) : '');
        initialValues[sub] = { mac: notaVal, npp: '', npt: notaVal };
      } else {
        initialValues[sub] = {
          mac: gRecord?.mac !== null && gRecord?.mac !== undefined ? String(gRecord.mac) : '',
          npp: gRecord?.npp !== null && gRecord?.npp !== undefined ? String(gRecord.npp) : '',
          npt: gRecord?.npt !== null && gRecord?.npt !== undefined ? String(gRecord.npt) : ''
        };
      }
    });
    setModalFields(initialValues);
    if (subjectsForClass.length > 0) {
      setSelectedSubjectForLaunch(subjectsForClass[0]);
    }
  };

  // Pre-fill student in modal directly from row button click
  const handleLaunchForStudent = (student: Student) => {
    // Check if the current active trimester is complete and locked
    const currentTrimStatus = getTrimesterCompletionStatus(selectedTrim);
    if (currentTrimStatus.complete && !isDirectorAuthorized && !forceEdit) {
      requestDirectorPermission(
        `O ${selectedTrim}º Trimestre foi concluído e trancado. É necessária a senha do Director Geral para aceder ao formulário de edição de notas.`,
        () => {
          openLaunchModalForStudent(student);
        }
      );
      return;
    }

    openLaunchModalForStudent(student);
  };

  const openLaunchModalForStudent = (student: Student) => {
    setSearchStudentId(student.id);
    setModalError('');
    setModalSuccessMsg(null);
    setModalStudent(student);

    const activeTrim = selectedTrim;
    const initialValues: typeof modalFields = {};
    const subjectsForClass = getSubjectsForStudent(student, activeModality);

    subjectsForClass.forEach(sub => {
      const gRecord = grades.find(g => g.studentId === student.id && g.subject === sub && g.trimester === activeTrim);
      const isClass13 = student.class === '13' || sub === 'PAP' || sub === 'NEC';
      if (isClass13) {
        const notaVal = gRecord?.mt !== null && gRecord?.mt !== undefined 
          ? String(gRecord.mt) 
          : (gRecord?.mac !== null && gRecord?.mac !== undefined ? String(gRecord.mac) : '');
        initialValues[sub] = { mac: notaVal, npp: '', npt: notaVal };
      } else {
        initialValues[sub] = {
          mac: gRecord?.mac !== null && gRecord?.mac !== undefined ? String(gRecord.mac) : '',
          npp: gRecord?.npp !== null && gRecord?.npp !== undefined ? String(gRecord.npp) : '',
          npt: gRecord?.npt !== null && gRecord?.npt !== undefined ? String(gRecord.npt) : ''
        };
      }
    });
    setModalFields(initialValues);
    if (subjectsForClass.length > 0) {
      setSelectedSubjectForLaunch(subjectsForClass[0]);
    }
    setIsLaunchModalOpen(true);
  };

  // --- SAVE GRADES FROM MODAL ---
  const handleSaveModalGrades = () => {
    if (!modalStudent) return;

    const classNumForModal = parseInt(modalStudent.class) || 1;
    const modalMaxLimit = classNumForModal >= 7 ? 20 : 10;
    const activeTrim = selectedTrim;

    const subjectsToSave = selectedSubjectForLaunch
      ? [selectedSubjectForLaunch as SubjectType]
      : [];

    // Check if any existing grades are being modified/overwritten
    let isOverwriting = false;
    subjectsToSave.forEach(sub => {
      const oldRecord = grades.find(g => g.studentId === modalStudent.id && g.subject === sub && g.trimester === activeTrim);
      if (oldRecord && (oldRecord.mac !== null || oldRecord.npp !== null || oldRecord.npt !== null)) {
        const fieldData = modalFields[sub] || { mac: '', npp: '', npt: '' };
        const newMac = fieldData.mac.trim() === '' ? null : parseFloat(fieldData.mac.trim().replace(',', '.'));
        const newNpp = fieldData.npp && fieldData.npp.trim() === '' ? null : (fieldData.npp ? parseFloat(fieldData.npp.trim().replace(',', '.')) : null);
        const newNpt = fieldData.npt.trim() === '' ? null : parseFloat(fieldData.npt.trim().replace(',', '.'));
        
        if ((oldRecord.mac !== null && newMac !== oldRecord.mac) || 
            (oldRecord.npp !== null && oldRecord.npp !== undefined && newNpp !== oldRecord.npp) ||
            (oldRecord.npt !== null && newNpt !== oldRecord.npt)) {
          isOverwriting = true;
        }
      }
    });

    if (isOverwriting && !isDirectorAuthorized && !forceEdit) {
      requestDirectorPermission(
        `Algumas notas deste aluno já foram lançadas anteriormente. É necessária a chave do Director Geral para autorizar a regravação.`,
        () => {
          executeSaveModalGrades(modalStudent, activeTrim, subjectsToSave, modalMaxLimit);
        }
      );
      return;
    }

    executeSaveModalGrades(modalStudent, activeTrim, subjectsToSave, modalMaxLimit);
  };

  const executeSaveModalGrades = (
    student: Student,
    activeTrim: 'I' | 'II' | 'III',
    subjectsToSave: SubjectType[],
    modalMaxLimit: number,
    overrideFields?: any
  ) => {
    // Intercept with authorization check
    const firstSubject = subjectsToSave[0] || 'LÍNGUA PORTUGUESA';
    if (!hasApprovedRequest(student.id, firstSubject, activeTrim)) {
      setPendingRequestData({
        studentId: student.id,
        studentName: student.name,
        subject: firstSubject,
        trimester: activeTrim,
        modalSubjects: subjectsToSave,
        modalFieldsData: overrideFields || modalFields
      });
      setIsRequestModalOpen(true);
      setIsLaunchModalOpen(false);
      return;
    }

    // Pop-up de Confirmação Obrigatória (SIGEP 1.1.0)
    const confirmar = window.confirm(`Deseja realmente gravar as notas de ${student.name} para o ${activeTrim}º Trimestre no Banco de Dados Central?`);
    if (!confirmar) return;

    let hasInvalidInput = false;
    const fieldsToUse = overrideFields || modalFields;

    subjectsToSave.forEach(sub => {
      // Security guard to prevent unauthorized saves
      if (!isCellEditableByProfessor(student.id, sub, activeTrim)) {
        alert(`Erro de Segurança: Não tem autorização para gravar notas para a disciplina de ${sub} no ${activeTrim}º Trimestre.`);
        hasInvalidInput = true;
        return;
      }

      const fieldData = fieldsToUse[sub] || { mac: '', npp: '', npt: '' };
      
      const isClass13 = student.class === '13' || sub === 'PAP' || sub === 'NEC';
      if (isClass13) {
        const rawNota = typeof fieldData.mac === 'string' ? fieldData.mac.trim().replace(',', '.') : (fieldData.mac !== undefined ? String(fieldData.mac) : '');
        const parsedNota = rawNota === '' ? null : parseFloat(rawNota);
        if (parsedNota !== null && (isNaN(parsedNota) || parsedNota < 0 || parsedNota > modalMaxLimit)) {
          hasInvalidInput = true;
          return;
        }
        onUpdateGradeFields(student.id, sub, activeTrim, {
          mac: parsedNota,
          npp: null,
          npt: parsedNota,
          mt: parsedNota
        });

        try {
          const saved13 = localStorage.getItem('sigep_13_grades_v2');
          const parsed13 = saved13 ? JSON.parse(saved13) : {};
          const student13Obj = parsed13[student.id] || { avg10: 10, avg11: 10, avg12: 10, pap: 0, nec: 0 };
          
          const isPap = String(sub) === 'PAP' || String(sub) === 'Trabalho de Conclusão';
          const isNec = String(sub) === 'NEC' || String(sub) === 'Prática Pedagógica' || String(sub) === 'Estágio';

          if (isPap) {
            student13Obj.pap = parsedNota ?? 0;
          } else if (isNec) {
            student13Obj.nec = parsedNota ?? 0;
          }
          parsed13[student.id] = student13Obj;
          localStorage.setItem('sigep_13_grades_v2', JSON.stringify(parsed13));

          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sigep_pauta_exame_13') || key === 'sigep_exam_rows_13')) {
              const val = localStorage.getItem(key);
              if (val) {
                const rows = JSON.parse(val) as any[];
                const updatedRows = rows.map((r: any) => {
                  if (r.id === student.id || (r.name && r.name.toLowerCase() === student.name.toLowerCase())) {
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
          console.error("Error syncing 13th grade launch in PautaTrimester:", err);
        }

        handleRemoveTemporaryUnlock(student.id, sub, activeTrim);
        return;
      }

      const rawMac = typeof fieldData.mac === 'string' ? fieldData.mac.trim().replace(',', '.') : (fieldData.mac !== undefined ? String(fieldData.mac) : '');
      const rawNpp = typeof fieldData.npp === 'string' ? fieldData.npp.trim().replace(',', '.') : (fieldData.npp !== undefined ? String(fieldData.npp) : '');
      const rawNpt = typeof fieldData.npt === 'string' ? fieldData.npt.trim().replace(',', '.') : (fieldData.npt !== undefined ? String(fieldData.npt) : '');

      const parsedMac = rawMac === '' ? null : parseFloat(rawMac);
      const parsedNpp = rawNpp === '' ? null : parseFloat(rawNpp);
      const parsedNpt = rawNpt === '' ? null : parseFloat(rawNpt);

      if ((parsedMac !== null && (isNaN(parsedMac) || parsedMac < 0 || parsedMac > modalMaxLimit)) ||
          (parsedNpp !== null && (isNaN(parsedNpp) || parsedNpp < 0 || parsedNpp > modalMaxLimit)) ||
          (parsedNpt !== null && (isNaN(parsedNpt) || parsedNpt < 0 || parsedNpt > modalMaxLimit))) {
        hasInvalidInput = true;
        return;
      }

      let mtVal: number | null = null;
      if (useNpp) {
        if (parsedMac !== null || parsedNpp !== null || parsedNpt !== null) {
          const mac = parsedMac ?? 0;
          const npp = parsedNpp ?? 0;
          const npt = parsedNpt ?? 0;
          mtVal = parseFloat(((mac + npp + npt) / 3).toFixed(1));
        }
      } else {
        if (parsedMac !== null || parsedNpt !== null) {
          const mac = parsedMac ?? 0;
          const npt = parsedNpt ?? 0;
          mtVal = parseFloat(((mac + npt) / 2).toFixed(1));
        }
      }

      onUpdateGradeFields(student.id, sub, activeTrim, {
        mac: parsedMac,
        npp: parsedNpp,
        npt: parsedNpt,
        mt: mtVal
      });

      // REGRA DE OURO / AUTO-BLOQUEIO IMEDIATO:
      // O campo é re-bloqueado de forma imediata após gravação bem sucedida!
      handleRemoveTemporaryUnlock(student.id, sub, activeTrim);
    });

    if (hasInvalidInput) {
      setModalError(`Verifique as notas inseridas. Devem ser valores numéricos de 0 a ${modalMaxLimit}.`);
      return;
    }

    setModalSuccessMsg('✓ Notas guardadas com sucesso no banco de dados!');
    setModalError('');

    setTimeout(() => {
      setIsLaunchModalOpen(false);
      setModalStudent(null);
      setSearchStudentId('');
      setModalSuccessMsg(null);
    }, 1500);
  };

  // --- SUBMIT SECURITY GATE ---
  const handleVerifyProfessorGate = (e: React.FormEvent) => {
    e.preventDefault();
    setProfError('');

    const targetId = profInputId.trim().toUpperCase();
    if (!targetId) {
      setProfError('Introduza o seu ID de Professor.');
      return;
    }

    if (!profSelectedSubject) {
      setProfError('Por favor selecione a disciplina.');
      return;
    }

    // Verify in staff list
    const matched = staffList.find(s => s.id.toUpperCase() === targetId);
    if (!matched) {
      setProfError('Erro de Autenticação: ID do Professor inválido ou não cadastrado.');
      return;
    }

    // Verify catalog list
    const subjectsOfProf = matched.subjects || [];
    if (!subjectsOfProf.includes(profSelectedSubject as SubjectType)) {
      setProfError(`Bloqueio de Segurança: Não tem autorização para aceder à disciplina de ${profSelectedSubject}. Esta matéria não consta no seu catálogo de docência.`);
      return;
    }

    // Successful lock validation!
    setValidatedProfId(matched.id);
    setValidatedProfObj(matched);
    setProfValidated(true);
    setSelectedTrim(profSelectedTrim); // Sync general tab with professor selection
    setPovoadoAlunos([]); // Force refresh
    setAlertMsg(null);
  };

  // --- RENDER SECURITY GATE SCREEN FOR UNVERIFIED PROFESSORS ---
  if (isProfessorRole && !profValidated) {
    return (
      <div id="professor-security-gate" className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-slideUp">
        <div className="bg-slate-900 p-6 text-white text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-heading font-semibold">SiGeP Security Gate</h2>
          <p className="text-xs text-slate-400">Validação de Acesso Obrigatória para Corpo Docente</p>
        </div>

        <form onSubmit={handleVerifyProfessorGate} className="p-6 space-y-5">
          {profError && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{profError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-heading">
              1. ID do Professor (Ex: IJ5PR67)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={profInputId}
                onChange={(e) => setProfInputId(e.target.value)}
                placeholder="Introduza o seu código nominal..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 uppercase font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-heading">
              2. Selecione a Disciplina
            </label>
            <select
              value={profSelectedSubject}
              onChange={(e) => setProfSelectedSubject(e.target.value as SubjectType)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 font-medium"
            >
              <option value="">-- Selecione a Matéria --</option>
              {filteredClassSubjects.map(sub => (
                <option key={sub} value={sub}>{getSubjectAbbreviation(sub)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-heading">
              3. Selecione o Trimestre letivo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['I', 'II', 'III'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setProfSelectedTrim(t)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    profSelectedTrim === t
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t}º Trimestre
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            Validar Credenciais e Abrir Pauta
          </button>
        </form>
      </div>
    );
  }

  // --- RENDER MAIN MINI-PAUTA VIEW ---
  if (currentClass === '13') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900 max-w-2xl mx-auto my-8 text-center shadow-xs">
        <h3 className="text-sm font-black uppercase tracking-wider mb-2">Classe não elegível para Pauta Trimestral</h3>
        <p className="text-xs leading-relaxed font-semibold">
          A 13ª Classe (Estágio Pedagógico) é uma classe de formação prática integral e por isso não possui pautas trimestrais parciais nem notas periódicas (MT1, MT2, MT3).
        </p>
        <p className="text-[11px] mt-4 text-amber-700 font-medium">
          Por favor, utilize o <strong>"Painel Central de Pautas"</strong> e selecione o tipo de pauta <strong>"Pauta Geral Anual"</strong> para realizar o lançamento e exportação dos resultados desta classe.
        </p>
      </div>
    );
  }

  return (
    <div id="pauta-trimester-sheet" className="space-y-6">
      
      {alertMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-4 flex items-start gap-3 animate-slideDown shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed flex-1">
            <span className="font-bold underline">Aviso do Sistema:</span> {alertMsg}
          </div>
          <button 
            type="button"
            onClick={() => setAlertMsg(null)} 
            className="text-rose-600 hover:text-rose-800 font-extrabold text-xs px-2 py-1 bg-white hover:bg-rose-100 rounded border border-rose-200 transition-colors cursor-pointer"
          >
            OK
          </button>
        </div>
      )}
      
      {/* Selector Tabs and VBA Commands */}
      <div className="flex flex-col lg:flex-row justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <h2 className="text-lg font-heading font-semibold text-slate-800 flex items-center gap-1.5">
              MINI PAUTA - Nível {classeNum <= 4 ? '1' : classeNum <= 6 ? '2' : '3'}
              <span className="text-xs font-normal text-slate-400 font-sans ml-2">
                ({classeNum}ª • Turma {currentSection} • {currentActiveTrim}º Trimestre)
              </span>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-lg border border-indigo-100 flex items-center gap-1.5 shadow-3xs uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              {activeModality === 'ENSINO_PRIMARIO' ? 'Subsistema: Ensino Primário' : `Especialidade: ${getSpecialtyFullName(activeSpecialty || 'GERAL')}`}
            </span>
          </div>
          {isProfessorRole && validatedProfObj && (
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 bg-indigo-50 border border-indigo-100 p-2 rounded-lg max-w-fit">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                Sessão Validada de Docência: <strong>{validatedProfObj.name}</strong> • Disciplina: <strong>{profSelectedSubject}</strong>
              </span>
              <button
                onClick={() => setProfValidated(false)}
                className="text-rose-600 underline font-bold hover:text-rose-800 ml-2"
              >
                Trocar Disciplina
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500 max-w-xl">
            Registo contínuo de <strong>MAc</strong> (Avaliação Contínua) e <strong>NPT</strong> (Prova Trimestral) do nível regulamentar. Classificação de 0 a 10 para Nível 1 & 2, e 0 a 20 para Nível 3.
          </p>

          {shouldFilterForeignLanguage && (
            <div className="flex items-center gap-1 bg-indigo-50/60 p-1 rounded-xl border border-indigo-100/50 max-w-xs mt-3 animate-fadeIn">
              <button
                onClick={() => setSelectedForeignLanguage('INGLÊS')}
                className={`flex-1 py-1 px-3 text-[10px] font-extrabold rounded-lg transition-all ${
                  selectedForeignLanguage === 'INGLÊS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-650 hover:bg-indigo-100/40 hover:text-indigo-800'
                }`}
              >
                🇺🇸 LÍNGUA INGLESA
              </button>
              <button
                onClick={() => setSelectedForeignLanguage('FRANCÊS')}
                className={`flex-1 py-1 px-3 text-[10px] font-extrabold rounded-lg transition-all ${
                  selectedForeignLanguage === 'FRANCÊS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-650 hover:bg-indigo-100/40 hover:text-indigo-800'
                }`}
              >
                🇫🇷 LÍNGUA FRANCESA
              </button>
            </div>
          )}
        </div>

        {/* Tab switcher for Trimesters (Unified with automated secure locks) */}
        <div className="flex items-center bg-slate-100 border border-slate-200/50 p-1.5 rounded-xl gap-1">
          {(['I', 'II', 'III'] as const).map((tNum, idx) => {
            const statusI = getTrimesterCompletionStatus('I');
            const statusII = getTrimesterCompletionStatus('II');
            
            let isLockedTab = false;
            let tooltip = '';
            
            if (tNum === 'II') {
              isLockedTab = !statusI.complete && !isDirectorAuthorized;
              tooltip = isLockedTab ? 'Trancado: Requer conclusão do Iº Trimestre ou Chave do Director' : 'Iº Trimestre concluído / Autorizado';
            } else if (tNum === 'III') {
              isLockedTab = !statusII.complete && !isDirectorAuthorized;
              tooltip = isLockedTab ? 'Trancado: Requer conclusão do IIº Trimestre ou Chave do Director' : 'IIº Trimestre concluído / Autorizado';
            }

            const isActive = selectedTrim === tNum;

            return (
              <button
                key={tNum}
                type="button"
                title={tooltip}
                onClick={() => handleTrimesterTabClick(tNum)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-800 shadow-2xs font-extrabold border border-slate-200/30'
                    : isLockedTab
                      ? 'text-slate-400 hover:text-slate-500'
                      : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {isLockedTab ? (
                  <Lock className="w-3 h-3 text-amber-500" />
                ) : (
                  <CheckCircle2 className={`w-3 h-3 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                )}
                <span>{idx + 1}º Trimestre ({tNum})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Monitor do Banco de Dados de Notas por Classe, Turma e Disciplina (VBA Logic replication) */}
      <div id="banco-dados-sync-monitor" className="bg-slate-900 border border-slate-800 text-slate-100 p-5 rounded-2xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-heading pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Database className="w-5 h-5 text-emerald-400" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base de Dados Conectada</h4>
              <span className="font-mono text-xs font-bold text-emerald-400">{dbSheetName}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isDirectorAuthorized && (
              <button
                type="button"
                onClick={() => {
                  setIsDirectorAuthorized(false);
                  setAlertMsg('Autorização do Director Geral revogada com sucesso. Modo de segurança restabelecido.');
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-extrabold transition-all shadow-xs cursor-pointer"
                title="Revogar Chave do Director"
              >
                <X className="w-3 h-3" />
                Sair Modo Supervisor
              </button>
            )}
            
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700">
              <Lock className="w-3 text-indigo-400" />
              <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-extrabold">
                {isDirectorAuthorized 
                  ? '🔓 AUTORIZAÇÃO DG ATIVA' 
                  : userRole === 'SUB_DIRECTOR_PEDAGOGICO' 
                    ? '👑 MODO SUBDIRECTOR PEDAGÓGICO' 
                    : '🔒 MODO LANÇAMENTO (DOCENTE)'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-1">Classe & Turma Focos</p>
            <p className="text-sm font-semibold text-white font-heading">{currentClass}ª — Turma {currentSection}</p>
          </div>

          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-1">Limite Máximo de Nota</p>
            <p className="text-sm font-semibold text-amber-400 font-heading">A Classificação de 0 a {maxLimit}</p>
          </div>
          
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-1">Disciplinas Activas</p>
            <p className="text-sm font-semibold text-emerald-400 font-heading">
              {activeSubjects.length} {activeSubjects.length === 1 ? 'Matéria assignada' : 'Matérias assignadas'}
            </p>
          </div>

          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-1">Lançamentos Completos</p>
            <div className="flex items-center justify-between text-sm text-white font-heading">
              <span>{completedLaunches} de {totalPossibleLaunches}</span>
              <span className="font-mono font-bold text-indigo-400">{calculatedSyncPercent}%</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
          <div 
            className="bg-indigo-500 h-full transition-all duration-500 ease-out rounded-full"
            style={{ width: `${calculatedSyncPercent}%` }}
          ></div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200/50 p-4 rounded-2xl">
        <div className="text-xs font-semibold text-slate-500">
          * Para lançar avaliações individuais por ID Aluno, utilize a secção <span className="font-bold text-indigo-600">Mini-Pautas</span>.
        </div>

        <div className="flex items-center gap-2.5">
          {loggedInStaff?.role === 'DIRECTOR_GERAL' && (
            <button
              type="button"
              onClick={handleLimparPautaGeral}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all border border-rose-650 shadow-sm cursor-pointer"
            >
              <Trash className="w-3.5 h-3.5 text-white" />
              <span>Limpar Pauta</span>
            </button>
          )}

          <button
            id="tm-vba-print-trimestral"
            onClick={handlePrintPautaTrimestral}
            disabled={isPdfGenerating}
            className="flex items-center gap-1.5 bg-emerald-55 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all border border-emerald-200 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-600" />
            {isPdfGenerating ? 'A gerar...' : 'Imprimir Pauta Trimestral'}
          </button>

          {onToggleNpp && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Fórmula NPP:</span>
              <button
                type="button"
                onClick={() => onToggleNpp(!useNpp)}
                className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  useNpp 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {useNpp ? 'Ativo (MAC+NPP+NPT)/3' : 'Inativo (MAC+NPT)/2'}
              </button>
            </div>
          )}

          <button
            id="tm-vba-povoar"
            onClick={handlePovoar}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-150 text-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all border border-slate-250 shadow-2xs cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
            Povoar Alunos
          </button>

          <button
            id="tm-vba-consolidar"
            onClick={handleConsolidar}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer animate-pulse-delayed"
          >
            <RefreshCw className="w-3.5 h-3.5 text-white" />
            Consolidar Médias
          </button>
        </div>
      </div>

      {lastCalculatedAt && (
        <div className="bg-emerald-50 border border-emerald-200/60 p-4 rounded-xl flex items-center gap-3 text-emerald-800 animate-slideUp">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold font-heading">✓ Sucesso (SiGeP):</span> Notas de <strong>MAc e NPT</strong> consolidadas do banco de dados com sucesso às <span className="font-mono font-bold">{lastCalculatedAt}</span>.
          </div>
        </div>
      )}

      {povoadoAlunos.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-12 text-center md:p-16 flex flex-col items-center justify-center space-y-3">
          <Layers3 className="w-10 h-10 text-indigo-500" />
          <h3 className="text-base font-semibold text-slate-800 font-heading">Estrutura Trimestral Vazia</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Clique no comando <strong className="text-slate-600">Actualizar a pauta</strong> para carregar o mapa nominal desta classe e turma focais.
          </p>
          <button
            onClick={handlePovoar}
            className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Actualizar a pauta
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xs">
          <div className="bg-emerald-50/40 border-b border-slate-100 px-6 py-2.5 flex justify-between items-center text-xs font-semibold text-slate-600">
            <div className="flex gap-4 font-mono">
              <div>Pauta: <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">PAUTA1TM{currentActiveTrim === 'I' ? '1' : currentActiveTrim === 'II' ? '2' : '3'}</span></div>
              <div>Trimestre: <span className="font-bold text-slate-700">{currentActiveTrim}º Trimestre</span></div>
            </div>
            <div className="text-slate-400">Total: {povoadoAlunos.length} Alunos mapeados</div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
                  <th className="py-2.5 px-3 border border-slate-200 text-center text-[10px]" rowSpan={2} style={{ width: '5ch', minWidth: '5ch' }}>Nº</th>
                  <th className="py-2.5 px-3 border border-slate-200 text-center text-[10px]" rowSpan={2} style={{ width: '10ch', minWidth: '10ch' }}>Matrícula</th>
                  <th className="py-2.5 px-4 border border-slate-250" rowSpan={2} style={{ width: '30ch', minWidth: '30ch' }}>Nome do Aluno</th>
                  <th className="py-2.5 px-2 border border-slate-200 text-center text-[10px]" rowSpan={2} style={{ width: '5ch', minWidth: '5ch' }}>Gên</th>
                  <th className="py-2.5 px-3 border border-slate-200 text-center text-[10px]" rowSpan={2} style={{ width: '10ch', minWidth: '10ch' }}>Janela</th>
                  
                  {activeSubjects.map((sub) => (
                    <th key={sub} className="py-1 px-2 border border-slate-200 text-center bg-slate-100/30" colSpan={useNpp ? 4 : 3}>
                      <span className="text-[10px] font-extrabold tracking-wider truncate block max-w-[120px] mx-auto text-slate-700">
                        {getSubjectAbbreviation(sub)}
                      </span>
                    </th>
                  ))}

                  <th className="py-2.5 px-3 border border-slate-200 text-center text-[10px]" rowSpan={2} style={{ width: '15ch', minWidth: '15ch' }}>Observação</th>
                </tr>

                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                  {activeSubjects.map((sub) => (
                    <React.Fragment key={`${sub}-sub-metrics`}>
                      <th className="py-1 border border-slate-200 text-center text-[8px] font-mono text-slate-400 w-12 px-[6px]" style={{ fontSize: '70%' }}>MAc</th>
                      {useNpp && <th className="py-1 border border-slate-200 text-center text-[8px] font-mono text-slate-400 w-12 px-[6px]" style={{ fontSize: '70%' }}>NPP</th>}
                      <th className="py-1 border border-slate-200 text-center text-[8px] font-mono text-slate-400 w-12 px-[6px]" style={{ fontSize: '70%' }}>NPT</th>
                      <th className="py-1 border border-slate-200 text-center text-[8px] font-bold text-slate-800 bg-slate-100/80 w-12 px-[6px]" style={{ fontSize: '70%' }}>MT</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-sm">
                {povoadoAlunos.map((student, rowIdx) => {
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-3 border border-slate-200 text-center font-mono text-xs text-slate-400" style={{ width: '5ch', minWidth: '5ch' }}>{rowIdx + 1}</td>
                      <td className="py-2 px-3 border border-slate-200 text-center font-mono text-xs font-semibold text-slate-500" style={{ width: '10ch', minWidth: '10ch' }}>{student.id}</td>
                      <td className="py-2 px-4 border border-slate-200 font-medium text-slate-800 text-xs truncate" style={{ width: '30ch', minWidth: '30ch', maxWidth: '30ch' }}>{formatarNomePauta(student.name)}</td>
                      <td className="py-2 px-2 border border-slate-200 text-center font-mono text-xs text-slate-500" style={{ width: '5ch', minWidth: '5ch' }}>{student.gender}</td>
                      <td className="py-2 px-2 border border-slate-200 text-center" style={{ width: '10ch', minWidth: '10ch' }}>
                        <button
                          type="button"
                          onClick={() => handleLaunchForStudent(student)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer"
                        >
                          Lançar
                        </button>
                      </td>

                      {activeSubjects.map((subject, subIdx) => {
                        const scoreRow = getGradeRecord(student.id, subject);
                        const colSeed = subIdx * (useNpp ? 4 : 3);

                        const isEditingMac = editingCell?.studentId === student.id && editingCell?.subject === subject && editingCell?.field === 'mac';
                        const isEditingNpp = editingCell?.studentId === student.id && editingCell?.subject === subject && (editingCell?.field as string) === 'npp';
                        const isEditingNpt = editingCell?.studentId === student.id && editingCell?.subject === subject && editingCell?.field === 'npt';

                        const renderEditCell = (field: 'mac' | 'npp' | 'npt', isEd: boolean, val: number | null, index: number) => {
                          if (isEd) {
                            return (
                              <td key={`${subject}-${field}`} className="p-0 border border-slate-200 text-center bg-blue-50 w-12" style={{ width: '3rem', minWidth: '3rem' }}>
                                <input
                                  type="text"
                                  value={editVal}
                                  onChange={(e) => {
                                    const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
                                    setEditVal(cleaned);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveInlineEdit(student.id, subject, field as any);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  onBlur={() => saveInlineEdit(student.id, subject, field as any)}
                                  autoFocus
                                  className="w-full h-full text-center text-xs font-mono font-bold bg-white focus:outline-none text-slate-800"
                                />
                              </td>
                            );
                          }

                          const activeTrim = isProfessorRole && profValidated ? profSelectedTrim : selectedTrim;
                          const isEditable = isCellEditableByProfessor(student.id, subject, activeTrim);
                          const isUnlockActive = activeTemporaryUnlocks.some(
                            u => u.studentId === student.id && u.subject === subject && u.trimester === activeTrim && u.expiresAt > Date.now()
                          );
                          const isActive = activeCell?.row === rowIdx && activeCell?.col === index;

                          return (
                            <td
                              key={`${subject}-${field}`}
                              onClick={() => handleCellClick(student.id, subject, field as any, val, index, rowIdx)}
                              className={`border border-slate-200 text-center text-xs font-mono cursor-pointer transition-colors w-12 px-[6px] ${
                                isActive ? 'grid-cell-active font-extrabold text-blue-600' : ''
                              } ${
                                isUnlockActive
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold border-emerald-300'
                                  : !isEditable && isProfessorRole
                                    ? 'bg-slate-100/50 hover:bg-rose-50/40 text-slate-400 font-normal'
                                    : 'hover:bg-slate-50 text-slate-700 font-medium'
                              }`}
                              title={!isEditable && isProfessorRole ? "Bloqueado: Requer autorização em tempo real (Chat do Staff)" : undefined}
                            >
                              <NotaFormatada valor={val} escala={activeModality === 'ENSINO_PRIMARIO' ? 10 : 20} />
                            </td>
                          );
                        };

                        return (
                          <React.Fragment key={`${student.id}-${subject}-grades-tm`}>
                            {renderEditCell('mac', isEditingMac, scoreRow.mac, colSeed)}
                            {useNpp && renderEditCell('npp', isEditingNpp, scoreRow.npp ?? null, colSeed + 1)}
                            {renderEditCell('npt', isEditingNpt, scoreRow.npt, colSeed + (useNpp ? 2 : 1))}
                            
                            <td className="border border-slate-200 text-center text-xs font-mono font-extrabold bg-slate-100/80 text-slate-800 w-12 px-[6px]">
                              <NotaFormatada valor={scoreRow.mt} escala={activeModality === 'ENSINO_PRIMARIO' ? 10 : 20} />
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {(() => {
                        const studentRealSubjects = getSubjectsForStudent(student, activeModality);
                        const studentDisciplinas: NotaDisciplina[] = studentRealSubjects.map((sub) => {
                          const score = getGradeRecord(student.id, sub as SubjectType);
                          const escala = activeModality === 'ENSINO_PRIMARIO' ? 10 : 20;
                          const isNeg = score.mt !== null && (escala === 10 ? score.mt < 5.0 : score.mt < 10.0);
                          return {
                            idDisciplina: sub,
                            mac: score.mac,
                            npp: useNpp ? (score.npp ?? null) : 0,
                            npt: score.npt,
                            mt: score.mt,
                            reprovadoNaDisciplina: isNeg
                          };
                        });
                        const studentPauta: AlunoPauta = {
                          id: student.id,
                          nome: student.name,
                          disciplinas: studentDisciplinas
                        };
                        const tipoClasse: TipoClasse = ['6', '9', '12'].includes(currentClass) ? 'EXAME' : 'CONTINUA';
                        const obs = student.status === 'Desistente' ? 'Desistente' : calcularObservacaoPauta(studentPauta, tipoClasse);

                        return (
                          <td className="border border-slate-200 text-center text-xs font-bold px-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${obterCorObservacaoClass(obs)}`}>
                              {obs}
                            </span>
                          </td>
                        );
                      })()}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 text-slate-400 text-xs flex justify-between items-center sm:px-6">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 bg-emerald-100 border border-emerald-400 rounded-sm"></span>
              <span>Dica: Dê duplo clique nas células ou use o botão "Lançar" para abrir a janela dedicada para o aluno por ID.</span>
            </div>
            <div className="font-mono">SiGeP Pauta TM Core</div>
          </div>
        </div>
      )}

      {/* --- MODAL DE AUTORIZAÇÃO / SOLICITAÇÃO DE ALTERAÇÃO DE NOTAS (Enterprise Shield) --- */}
      {isRequestModalOpen && pendingRequestData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
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

            <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
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
                  <span className="text-slate-900 font-extrabold font-mono text-[11px]">{pendingRequestData.trimester}º Trimestre</span>
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

      {/* --- JANELA POPUP / MODAL DE LANÇAMENTO DE NOTAS POR ID DO ALUNO --- */}
      {isLaunchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            
            {/* Header */}
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-heading font-semibold text-sm">Janela de Lançamento de Notas</h3>
                  <p className="text-[10px] text-slate-400">Insira as notas do período letivo usando o ID de matrícula</p>
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
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Search Box (Always visible, allow quick lookup of any student ID) */}
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
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex items-start gap-2 animate-bounce">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{modalSuccessMsg}</span>
                </div>
              )}

              {/* Student details if matched */}
              {modalStudent ? (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm font-heading">{modalStudent.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">
                        Nº {modalStudent.id} • {modalStudent.class}ª • Turma {modalStudent.section}
                      </p>
                    </div>
                    <div className="bg-amber-55/15 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-lg">
                      Limite de Nota: 0 a {classeNum >= 7 ? '20' : '10'}
                    </div>
                  </div>

                  {/* Select Discipline dropdown */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
                    <label className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block font-heading">
                      Disciplina a Lançar Nota
                    </label>
                    <select
                      value={selectedSubjectForLaunch}
                      onChange={(e) => setSelectedSubjectForLaunch(e.target.value as SubjectType)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-850 focus:outline-none focus:border-indigo-500"
                    >
                      {getSubjectsForStudent(modalStudent, activeModality).map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fields list for each active subject */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-heading mb-1">
                      CLASSIFICAÇÃO DE NOTAS - {currentActiveTrim}º TRIMESTRE
                    </p>

                    <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1.5 custom-scrollbar">
                      {(() => {
                        const sub = selectedSubjectForLaunch;
                        if (!sub) return null;
                        const itemFields = modalFields[sub] || { mac: '', npp: '', npt: '' };
                        
                        const isEditable = isCellEditableByProfessor(modalStudent.id, sub, currentActiveTrim);
                        const isUnlockActive = activeTemporaryUnlocks.find(
                          u => u.studentId === modalStudent.id && u.subject === sub && u.trimester === currentActiveTrim
                        );
                        const secondsLeft = isUnlockActive ? Math.max(0, Math.ceil((isUnlockActive.expiresAt - Date.now()) / 1000)) : 0;

                        return (
                          <div key={sub} className="space-y-3 block w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-indigo-50/40 border border-indigo-100/70 rounded-2xl hover:bg-indigo-50/60 transition-colors gap-4">
                              <span className="text-xs font-extrabold text-indigo-950 truncate flex-1 block">
                                {sub}
                              </span>
                              
                              <div className="flex items-center gap-3">
                                {modalStudent.class === '13' || sub === 'PAP' || sub === 'NEC' ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase">Nota Única:</span>
                                    <input
                                      type="text"
                                      value={itemFields.mac}
                                      placeholder="0 a 20"
                                      disabled={!isEditable}
                                      onChange={(e) => {
                                        const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
                                        setModalFields(prev => ({
                                          ...prev,
                                          [sub]: { ...prev[sub], mac: cleaned, npt: cleaned, npp: '' }
                                        }));
                                      }}
                                      className={`w-20 py-1.5 border rounded-lg text-center text-xs font-mono font-extrabold focus:outline-none ${!isEditable ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-indigo-300 focus:border-indigo-600 text-indigo-900 shadow-xs'}`}
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">MAc:</span>
                                      <input
                                        type="text"
                                        value={itemFields.mac}
                                        placeholder="-"
                                        disabled={!isEditable}
                                        onChange={(e) => {
                                          const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
                                          setModalFields(prev => ({
                                            ...prev,
                                            [sub]: { ...prev[sub], mac: cleaned }
                                          }));
                                        }}
                                        className={`w-14 py-1.5 border rounded-lg text-center text-xs font-mono font-extrabold focus:outline-none ${!isEditable ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-850'}`}
                                      />
                                    </div>

                                    {useNpp && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">NPP:</span>
                                        <input
                                          type="text"
                                          value={itemFields.npp ?? ''}
                                          placeholder="-"
                                          disabled={!isEditable}
                                          onChange={(e) => {
                                            const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
                                            setModalFields(prev => ({
                                              ...prev,
                                              [sub]: { ...prev[sub], npp: cleaned }
                                            }));
                                          }}
                                          className={`w-14 py-1.5 border rounded-lg text-center text-xs font-mono font-extrabold focus:outline-none ${!isEditable ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-850'}`}
                                        />
                                      </div>
                                    )}

                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">NPT:</span>
                                      <input
                                        type="text"
                                        value={itemFields.npt}
                                        placeholder="-"
                                        disabled={!isEditable}
                                        onChange={(e) => {
                                          const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
                                          setModalFields(prev => ({
                                            ...prev,
                                            [sub]: { ...prev[sub], npt: cleaned }
                                          }));
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
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
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
                                            handleCreateTemporaryUnlock(modalStudent.id, sub, currentActiveTrim);
                                            alert(`Sucesso! Nota desbloqueada em tempo real por ${adminStaff.name}.`);
                                          } else {
                                            alert("Erro: Senha administrativa inválida ou sem permissões.");
                                          }
                                        }
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                    >
                                      <Unlock className="w-3 h-3" />
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
                                          trimester: currentActiveTrim,
                                          modalSubjects: [sub],
                                          modalFieldsData: modalFields
                                        });
                                        setIsRequestModalOpen(true);
                                        setIsLaunchModalOpen(false);
                                      }}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                    >
                                      <Mail className="w-3 h-3" />
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
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <User className="w-12 h-12 text-slate-300" />
                  <p className="text-xs max-w-xs">Introduza o ID do aluno no campo de pesquisa acima para carregar a pauta nominal de avaliações.</p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
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
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer"
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

      {/* --- MODAL DE AUTORIZAÇÃO DE CHAVE DO DIRECTOR GERAL --- */}
      {directorPrompt && directorPrompt.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-scaleUp">
            <div className="bg-slate-900 p-5 text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/30 animate-pulse">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm">Chave do Director Requerida</h3>
                <p className="text-[10px] text-slate-400">Controlo de Segurança e Integridade Escolar</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed bg-amber-50 border border-amber-100 p-3 rounded-xl flex gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{directorPrompt.message}</span>
              </div>

              {promptError && (
                <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-800 text-[11px] rounded-lg">
                  {promptError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Chave / Senha do Director Geral (ID ou Password)
                </label>
                <input
                  type="password"
                  value={promptPassword}
                  onChange={(e) => setPromptPassword(e.target.value)}
                  placeholder="Introduza o código do Director (ex: 12345)..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 font-mono font-bold"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleValidatePrompt();
                    }
                  }}
                />
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDirectorPrompt(null);
                  setPromptPassword('');
                  setPromptError('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleValidatePrompt}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Confirmar Chave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAÇÃO MINI-PAUTA EM BRANCO (MODELO EM BRANCO) */}
      {showBlankConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-zoomIn">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-sans font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                  Directrizes do Modelo em Branco
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBlankConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Configure as directrizes pedagógicas para exportar a Mini-Pauta em Branco. O sistema irá ler a base de dados de alunos para preencher automaticamente os nomes e matrículas correspondentes.
              </p>

              {/* CLASSE */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Classe
                </label>
                <select
                  value={blankClass}
                  onChange={(e) => setBlankClass(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 font-semibold cursor-pointer"
                >
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'].map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}ª Classe
                    </option>
                  ))}
                </select>
              </div>

              {/* TURMA */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Turma
                </label>
                <select
                  value={blankSection}
                  onChange={(e) => setBlankSection(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 font-semibold cursor-pointer"
                >
                  {getSectionsList(activeModality || 'PUNIV', blankSpecialty).map((sec) => (
                    <option key={sec} value={sec}>
                      Turma {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* ESPECIALIDADE */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Especialidade
                </label>
                <select
                  value={blankSpecialty}
                  onChange={(e) => {
                    const newSpec = e.target.value;
                    setBlankSpecialty(newSpec);
                    const sections = getSectionsList(activeModality || 'PUNIV', newSpec);
                    if (sections.length > 0) {
                      setBlankSection(sections[0]);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 font-semibold cursor-pointer"
                >
                  <option value="Geral">Ensino Geral (Padrão)</option>
                  <option value="CFB">Ciências Físicas e Biológicas (CFB)</option>
                  <option value="CEJ">Ciências Económico-Jurídicas (CEJ)</option>
                  <option value="CS">Ciências Sociais / Humanas (CS)</option>
                  <option value="AV">Artes Visuais (AV)</option>
                  <option value="MF">Matemática e Física (Mat-Fisica)</option>
                  <option value="GH">História e Geografia (Geo-Historia)</option>
                  <option value="BQ">Biologia e Química (Bio-química)</option>
                  <option value="LEMC">Português e EMC</option>
                  <option value="ING_EMC">Inglês e EMC</option>
                  <option value="FRA_EMC">Francês e EMC</option>
                  <option value="EVP">Educação Visual e Plástica (EVP)</option>
                  <option value="EDF">Educação Física (Ed.F)</option>
                  <option value="EMC">Educação Moral e Cívica (EMC)</option>
                  <option value="EP">Ensino Primário</option>
                  <option value="PE">Pré-Escolar</option>
                </select>
              </div>

              {/* DISCIPLINA */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Disciplina
                </label>
                <select
                  value={blankSubject}
                  onChange={(e) => setBlankSubject(e.target.value as SubjectType)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 font-semibold cursor-pointer"
                >
                  {[
                    'L. PORTUGUESA',
                    'MATEMATICA',
                    'EST. MEIO',
                    'ED. MUSICAL',
                    'E.M.P.',
                    'ED. FISICA',
                    'L. ANGOLA',
                    'L. ESTRANGEIRA',
                    'CIDADANIA',
                    'CIENCIAS INTEGRADAS',
                    'HISTORIA',
                    'GEOGRAFIA',
                    'BIOLOGIA',
                    'FISICA',
                    'QUIMICA',
                    'ED. VISUAL',
                    'L. INGLESA',
                    'L. FRANCESA'
                  ].map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBlankConfigModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBlankConfigModal(false);
                  handlePrintMiniPauta(true, blankClass, blankSection, blankSpecialty, blankSubject);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Exportar PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
