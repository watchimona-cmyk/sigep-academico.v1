import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  UserMinus, 
  UserPlus, 
  Search, 
  AlertTriangle, 
  Printer, 
  RefreshCw, 
  History, 
  Sliders, 
  Check, 
  X, 
  ChevronRight, 
  AlertCircle, 
  ShieldAlert, 
  Plus, 
  ListOrdered, 
  FileSpreadsheet, 
  UserRound, 
  Building2, 
  ClipboardCheck, 
  Clock 
} from 'lucide-react';
import { Student, GradeRow } from '../types';
import { jsPDF } from 'jspdf';

interface CicloVidaAlunoProps {
  userRole: string;
  students: Student[];
  grades: GradeRow[];
  onSaveState: (updatedStudents: Student[], updatedGrades: GradeRow[]) => void;
  schoolSettings?: any;
  onConfirmEnrollment?: (candidate: any) => void;
}

interface Candidate {
  id: string; // CAND-2026-XXXX
  name: string;
  gender: 'M' | 'F';
  docType: 'BI' | 'CEDULA';
  docNumber: string;
  targetClass: string;
  level: 'PRIMARIO' | 'SECUNDARIO';
  specialty?: string;
  declarationVerified: boolean;
  biVerified: boolean;
  cert9ClasseVerified: boolean;
  notaProva1?: number;
  notaProva2?: number;
  media?: number;
  status: 'Pendente' | 'Apurado' | 'Aprovado' | 'Excluído' | 'Matriculado';
  birthDate?: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  studentId: string;
  studentName: string;
  action: string;
  justification: string;
  operator: string;
}

export default function CicloVidaAluno({ 
  userRole, 
  students = [], 
  grades = [], 
  onSaveState, 
  schoolSettings,
  onConfirmEnrollment
}: CicloVidaAlunoProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'CANDIDATURAS' | 'MATRICULA' | 'ABANDONO'>('CANDIDATURAS');

  // Shared Level Configuration
  const [currentTrimester, setCurrentTrimester] = useState<number>(() => {
    const saved = localStorage.getItem('sigep_lifecycle_trimester_v1');
    return saved ? parseInt(saved) : 1;
  });

  // State for Candidates
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    const saved = localStorage.getItem('sigep_candidates_v1');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // State for Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('sigep_audit_logs_v1');
    return saved ? JSON.parse(saved) : [];
  });

  // Candidate Form States
  const [candName, setCandName] = useState('');
  const [candGender, setCandGender] = useState<'M' | 'F'>('M');
  const [candDocType, setCandDocType] = useState<'BI' | 'CEDULA'>('BI');
  const [candDocNumber, setCandDocNumber] = useState('');
  const [candTargetClass, setCandTargetClass] = useState('10');
  const [candLevel, setCandLevel] = useState<'PRIMARIO' | 'SECUNDARIO'>('SECUNDARIO');
  const [candSpecialty, setCandSpecialty] = useState('PE');
  const [candBirthDate, setCandBirthDate] = useState('');
  
  // Secundário tests form scores (temporary)
  const [candNota1, setCandNota1] = useState('');
  const [candNota2, setCandNota2] = useState('');

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [capacityLimit, setCapacityLimit] = useState<number>(75);

  // Active Enrollment Process (Candidate selected for Matrícula)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [antifraudeAlert, setAntifraudeAlert] = useState<{ active: boolean; matchedStudent: Student | null } | null>(null);
  
  // Form Matricula state
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedPeriodo, setSelectedPeriodo] = useState<'Manhã' | 'Tarde' | 'Noite'>('Manhã');

  // Reconfirmação State filters
  const [reconClass, setReconClass] = useState('10');
  const [reconSection, setReconSection] = useState('A');

  // Overrule (Reverter Desistência) DG State
  const [showOverruleModal, setShowOverruleModal] = useState(false);
  const [overruleStudent, setOverruleStudent] = useState<Student | null>(null);
  const [overruleJustification, setOverruleJustification] = useState('');
  const [overruleError, setOverruleError] = useState<string | null>(null);
  const [overrulePassword, setOverrulePassword] = useState('');

  const getDirectorPassword = () => {
    try {
      const savedStaff = localStorage.getItem('sigep_staff_v1');
      if (savedStaff) {
        const parsed = JSON.parse(savedStaff);
        if (Array.isArray(parsed)) {
          const dir = parsed.find((s: any) => s.role === 'DIRECTOR_GERAL');
          if (dir && dir.password) return dir.password;
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return '12345'; // default fallback
  };

  // Effects to persist state
  useEffect(() => {
    localStorage.setItem('sigep_candidates_v1', JSON.stringify(candidates));
  }, [candidates]);

  useEffect(() => {
    localStorage.setItem('sigep_audit_logs_v1', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('sigep_lifecycle_trimester_v1', String(currentTrimester));
  }, [currentTrimester]);

  // Handle Trimester Auto-transitions for Abandonment Control
  const handleTrimesterChange = (newTrimester: number) => {
    setCurrentTrimester(newTrimester);
    
    if (newTrimester === 2) {
      // Auto transition Pendente -> Desistente for internal students
      const pendingStudents = students.filter(s => s.enrollmentType === 'Interno' && (!s.status || s.status === 'Pendente'));
      if (pendingStudents.length > 0) {
        const updatedStudents = students.map(s => {
          if (s.enrollmentType === 'Interno' && (!s.status || s.status === 'Pendente')) {
            return { ...s, status: 'Desistente' as const };
          }
          return s;
        });
        onSaveState(updatedStudents, grades);
        
        // Log the auto transition in audit logs
        const newLogs: AuditLog[] = pendingStudents.map(s => ({
          id: `LOG-AUTO-${Date.now()}-${s.id}`,
          timestamp: new Date().toLocaleString('pt-AO'),
          studentId: s.id,
          studentName: s.name,
          action: 'Transição Automática (Abandono)',
          justification: 'Aluno interno manteve-se Pendente até ao final do Iº Trimestre, transitando automaticamente para Desistente no IIº Trimestre de acordo com o MED.',
          operator: 'Sistema (Gatekeeper)'
        }));
        setAuditLogs(prev => [...newLogs, ...prev]);
      }
    }
  };

  // Checkbox Validation for Primário Candidacy
  const handleTogglePrimarioCheck = (candId: string) => {
    setCandidates(prev => prev.map(c => {
      if (c.id === candId) {
        const newValue = !c.declarationVerified;
        return {
          ...c,
          declarationVerified: newValue,
          status: newValue ? 'Apurado' : 'Pendente'
        };
      }
      return c;
    }));
  };

  // Add candidacy
  const handleAddCandidacy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candName.trim() || !candDocNumber.trim()) return;

    // Verify if already registered as candidate
    const existsCand = candidates.some(c => c.docNumber.toLowerCase() === candDocNumber.toLowerCase().trim());
    if (existsCand) {
      alert('Já existe uma candidatura registada com este Bilhete de Identidade ou Cédula.');
      return;
    }

    const newCand: Candidate = {
      id: `CAND-2026-${String(candidates.length + 1).padStart(3, '0')}`,
      name: candName.trim(),
      gender: candGender,
      docType: candDocType,
      docNumber: candDocNumber.trim(),
      targetClass: candTargetClass,
      level: candLevel,
      specialty: candLevel === 'SECUNDARIO' ? candSpecialty : undefined,
      declarationVerified: false,
      biVerified: candLevel === 'SECUNDARIO' ? false : false,
      cert9ClasseVerified: candLevel === 'SECUNDARIO' ? false : false,
      status: 'Pendente',
      birthDate: candBirthDate || undefined
    };

    setCandidates(prev => [...prev, newCand]);
    setCandName('');
    setCandDocNumber('');
    setCandBirthDate('');
    alert('Candidatura registada com sucesso! Prossiga com as validações documentais ou lançamento de provas.');
  };

  // Save Secundário Grades
  const handleSaveSecundarioGrades = (candId: string, n1: number, n2: number, certChecked: boolean, biChecked: boolean) => {
    setCandidates(prev => prev.map(c => {
      if (c.id === candId) {
        const mediaVal = (n1 + n2) / 2;
        // Check standard approval: If both checks are active and media >= 10, marked as Pendente ready for Meritocratic Ranking
        const statusVal = mediaVal < 10 ? 'Excluído' : 'Pendente';
        return {
          ...c,
          notaProva1: n1,
          notaProva2: n2,
          media: mediaVal,
          cert9ClasseVerified: certChecked,
          biVerified: biChecked,
          status: statusVal
        };
      }
      return c;
    }));
  };

  // Meritocratic Ranking and Spot Fill
  const handleRunRankingAndApuramento = (targetClass: string, specialty?: string) => {
    // 1. Get Secundário candidates for this class and specialty
    const eligible = candidates.filter(c => 
      c.level === 'SECUNDARIO' && 
      c.targetClass === targetClass && 
      (specialty ? c.specialty === specialty : true) &&
      c.status !== 'Matriculado'
    );

    if (eligible.length === 0) {
      alert('Não existem candidatos elegíveis para processamento de ranking.');
      return;
    }

    // 1. Filter: Eliminate candidates with score < 10
    const filtered = eligible.filter(c => c.media !== undefined && c.media >= 10);
    
    // 2. Sort: Descending by media
    const sorted = [...filtered].sort((a, b) => (b.media || 0) - (a.media || 0));

    // 3. Limit: preencha as vagas conforme a capacidade
    const apuradosIds = new Set<string>();
    const excluidosIds = new Set<string>();

    sorted.forEach((cand, idx) => {
      if (idx < capacityLimit) {
        apuradosIds.add(cand.id);
      } else {
        excluidosIds.add(cand.id);
      }
    });

    // Those who were under 10 are excluded as well
    eligible.forEach(cand => {
      if ((cand.media || 0) < 10) {
        excluidosIds.add(cand.id);
      }
    });

    setCandidates(prev => prev.map(c => {
      if (eligible.some(el => el.id === c.id)) {
        if (apuradosIds.has(c.id)) {
          return { ...c, status: 'Apurado' };
        } else if (excluidosIds.has(c.id)) {
          return { ...c, status: 'Excluído' };
        }
      }
      return c;
    }));

    alert(`Filtro meritocrático executado com sucesso!\nCandidatos Apurados: ${apuradosIds.size}\nExcluídos/Sem Vagas: ${excluidosIds.size}`);
  };

  // Generate jsPDF list of Candidatos Apurados
  const handlePrintApuradosReport = () => {
    const apuradosList = candidates.filter(c => c.status === 'Apurado');
    if (apuradosList.length === 0) {
      alert('Não existem candidatos apurados para gerar o relatório oficial.');
      return;
    }

    const doc = new jsPDF();
    const midX = 105;

    // Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('REPÚBLICA DE ANGOLA', midX, 15, { align: 'center' });
    doc.text('MINISTÉRIO DA EDUCAÇÃO', midX, 20, { align: 'center' });
    
    const prov = schoolSettings?.province || 'LUNDA-NORTE';
    const mun = schoolSettings?.municipality || 'CAFUNFO';
    doc.text(`GOVERNO PROVINCIAL DE ${prov.toUpperCase()}`, midX, 25, { align: 'center' });
    doc.text(`DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${mun.toUpperCase()}`, midX, 30, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(15, 35, 195, 35);
    
    // Title
    doc.setFontSize(13);
    doc.text('RELAÇÃO OFICIAL DE CANDIDATOS APURADOS', midX, 43, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Processo de Admissão Escolar - Ano Lectivo 2026/2027`, midX, 48, { align: 'center' });

    // Table Headers
    const startY = 56;
    doc.setFillColor(30, 41, 59); // dark slate
    doc.rect(15, startY, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Nº Cand.', 18, startY + 5.5);
    doc.text('Nome do Candidato', 45, startY + 5.5);
    doc.text('Classe', 115, startY + 5.5);
    doc.text('Subsistema / Especialidade', 135, startY + 5.5);
    doc.text('Nota Final', 178, startY + 5.5);

    doc.setTextColor(0, 0, 0);
    doc.setFont('Helvetica', 'normal');
    let currentY = startY + 8;

    apuradosList.forEach((c, index) => {
      // Row Background alternation
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, 7, 'F');
      }
      doc.setFontSize(8);
      doc.text(c.id, 18, currentY + 5);
      doc.text(c.name.substring(0, 36), 45, currentY + 5);
      doc.text(`${c.targetClass}ª`, 115, currentY + 5);
      
      const specialtyText = c.level === 'PRIMARIO' ? 'Ensino Primário' : `Mágisterio / ${c.specialty || 'N/A'}`;
      doc.text(specialtyText, 135, currentY + 5);
      
      const scoreText = c.level === 'PRIMARIO' ? 'Apto (Doc)' : (typeof c.media === 'number' && !isNaN(c.media) ? String(c.media.toFixed(2)) : 'N/A');
      doc.text(scoreText, 178, currentY + 5);
      
      doc.setDrawColor(226, 232, 240);
      doc.line(15, currentY + 7, 195, currentY + 7);
      currentY += 7;

      // Handle pagination if needed (extremely basic protection)
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }
    });

    // Footer
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('A DIREÇÃO DA ESCOLA', midX, currentY + 20, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.text('___________________________________________', midX, currentY + 28, { align: 'center' });
    doc.text('A Secretaria', midX, currentY + 33, { align: 'center' });

    doc.save('candidatos_apurados_sigep.pdf');
  };

  // Antifraude BI Verification on Selection for Enrollment (Matrícula)
  const handleSelectForEnrollment = (cand: Candidate) => {
    setSelectedCandidate(cand);
    setAntifraudeAlert(null);

    // CONSULT DATABASE BY BI
    const matched = students.find(s => s.bi?.trim() && s.bi.trim().toLowerCase() === cand.docNumber.trim().toLowerCase());
    if (matched) {
      setAntifraudeAlert({
        active: true,
        matchedStudent: matched
      });
    }
  };

  // Efetivar Matrícula - Transaction
  const handleEnrollCandidate = () => {
    if (!selectedCandidate) return;

    // Double-check anti-fraud state
    if (antifraudeAlert?.active) {
      alert('MATRÍCULA BLOQUEADA: Não é possível matricular este candidato pois o mesmo já se encontra registado como ALUNO INTERNO!');
      return;
    }

    // Verify limit check
    const currentCount = students.filter(s => s.class === selectedCandidate.targetClass && s.section === selectedSection).length;
    const isLimitExceeded = currentCount >= capacityLimit;
    if (isLimitExceeded) {
      alert(`MATRÍCULA RECUSADA: Esta turma já atingiu a capacidade máxima de ${capacityLimit} vagas parametrizada!`);
      return;
    }

    // Generate unique ID for new Student
    const newId = `EST-2026-${String(students.length + 1).padStart(4, '0')}`;
    
    const newStudent: Student = {
      id: newId,
      name: selectedCandidate.name,
      gender: selectedCandidate.gender,
      class: selectedCandidate.targetClass,
      section: selectedSection,
      bi: selectedCandidate.docType === 'BI' ? selectedCandidate.docNumber : undefined,
      cedulaRegisto: selectedCandidate.docType === 'CEDULA' ? selectedCandidate.docNumber : undefined,
      docType: selectedCandidate.docType,
      birthDate: selectedCandidate.birthDate,
      periodo: selectedPeriodo,
      specialty: selectedCandidate.specialty as any,
      status: 'Ativo',
      enrollmentType: 'Novo'
    };

    // Atomic Update: 
    // 1. Update Candidate list status
    setCandidates(prev => prev.map(c => {
      if (c.id === selectedCandidate.id) {
        return { ...c, status: 'Matriculado' };
      }
      return c;
    }));

    // 2. Add to Main global Student DB
    onSaveState([...students, newStudent], grades);

    // Clean up
    alert(`Transação concluída com sucesso!\nO candidato ${selectedCandidate.name} agora é um aluno regular Ativo na Turma ${selectedSection} com ID: ${newId}.`);
    setSelectedCandidate(null);
    setAntifraudeAlert(null);
  };

  // Reconfirm Matrícula for Internal Students
  const handleReconfirmInternal = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const updated = students.map(s => {
      if (s.id === studentId) {
        return { ...s, status: 'Ativo' as const, enrollmentType: 'Interno' as const };
      }
      return s;
    });

    onSaveState(updated, grades);
    alert(`Matrícula reconfirmada com sucesso para o aluno ${student.name}. Estado alterado para Ativo.`);
  };

  // Overrule Reversão de Desistência for Director General
  const handleOpenOverrule = (student: Student) => {
    if (userRole !== 'DIRETOR_GERAL' && userRole !== 'DIRECTOR_GERAL') {
      alert('Operação restrita! Apenas o Diretor Geral pode autorizar a reversão de desistências e homologar o log de auditoria.');
      return;
    }
    setOverruleStudent(student);
    setOverruleJustification('');
    setOverrulePassword('');
    setOverruleError(null);
    setShowOverruleModal(true);
  };

  const handleSaveOverrule = () => {
    if (!overruleStudent) return;
    if (!overruleJustification.trim()) {
      setOverruleError('Por favor, digite uma justificativa detalhada para o log de auditoria.');
      return;
    }

    if (overrulePassword !== getDirectorPassword()) {
      setOverruleError('A senha administrativa do Diretor Geral informada está incorreta.');
      return;
    }

    const updated = students.map(s => {
      if (s.id === overruleStudent.id) {
        return { ...s, status: 'Ativo' as const };
      }
      return s;
    });

    // Record audit log
    const newLog: AuditLog = {
      id: `LOG-REVERT-${Date.now()}`,
      timestamp: new Date().toLocaleString('pt-AO'),
      studentId: overruleStudent.id,
      studentName: overruleStudent.name,
      action: 'Reversão de Desistência Recomposta',
      justification: overruleJustification.trim(),
      operator: 'Diretor Geral (Homologado)'
    };

    onSaveState(updated, grades);
    setAuditLogs(prev => [newLog, ...prev]);
    setShowOverruleModal(false);
    setOverruleStudent(null);
    alert(`Desistência revertida com sucesso. O aluno ${overruleStudent.name} regressou ao estado Ativo.`);
  };

  // Helper count of available slots
  const getAvailableSlots = (targetClass: string, section: string) => {
    // Occupied = Promovidos + Retidos + Novos Matriculados
    const occupied = students.filter(s => s.class === targetClass && s.section === section).length;
    return Math.max(0, capacityLimit - occupied);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6 animate-fadeIn">
      {/* Module Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="font-sans font-black text-slate-900 text-base uppercase tracking-wider">Candidaturas & Testes de Admissão</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
            Gestão integrada do fluxo de candidatura: Inscrições, Testes de Seleção e Aprovação Final pela Direção da Escola.
          </p>
        </div>

        {/* Global Trimester Simulator */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-2xl shadow-2xs shrink-0">
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Período Letivo Activo:</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map(tri => (
              <button
                key={tri}
                onClick={() => handleTrimesterChange(tri)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  currentTrimester === tri 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {tri}º Tri
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Sub-Navigation Bar */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/60 rounded-2xl">
        <button
          onClick={() => setActiveTab('CANDIDATURAS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'CANDIDATURAS' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserRound className="w-4 h-4" />
          1. Inscrições & Testes
        </button>
        <button
          onClick={() => setActiveTab('MATRICULA')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'MATRICULA' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          2. Aprovação da Escola & Matrícula
        </button>
        <button
          onClick={() => setActiveTab('ABANDONO')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'ABANDONO' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserMinus className="w-4 h-4" />
          3. Controlo de Abandono
        </button>
      </div>

      {/* 1. MÓDULO DE CANDIDATURAS */}
      {activeTab === 'CANDIDATURAS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form de Cadastro */}
            <div className="bg-white p-5 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Plus className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Nova Candidatura</h3>
              </div>

              <form onSubmit={handleAddCandidacy} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={candName}
                    onChange={(e) => setCandName(e.target.value)}
                    placeholder="Nome completo do candidato"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gênero</label>
                    <select
                      value={candGender}
                      onChange={(e) => setCandGender(e.target.value as any)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 focus:outline-none focus:border-indigo-500 font-bold"
                    >
                      <option value="M">Masculino (M)</option>
                      <option value="F">Feminino (F)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Identidade</label>
                    <select
                      value={candDocType}
                      onChange={(e) => setCandDocType(e.target.value as any)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 focus:outline-none focus:border-indigo-500 font-bold"
                    >
                      <option value="BI">Bilhete de Identidade</option>
                      <option value="CEDULA">Cédula Pessoal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Número do Documento</label>
                  <input
                    type="text"
                    value={candDocNumber}
                    onChange={(e) => setCandDocNumber(e.target.value)}
                    placeholder="Número do documento"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-bold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subsistema</label>
                    <select
                      value={candLevel}
                      onChange={(e) => {
                        const lvl = e.target.value as any;
                        setCandLevel(lvl);
                        if (lvl === 'PRIMARIO') {
                          setCandTargetClass('7');
                        } else {
                          setCandTargetClass('10');
                        }
                      }}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 focus:outline-none focus:border-indigo-500 font-bold"
                    >
                      <option value="PRIMARIO">Ensino Primário</option>
                      <option value="SECUNDARIO">Secundário/Magistério</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Classe de Ingressso</label>
                    {candLevel === 'PRIMARIO' ? (
                      <select
                        value={candTargetClass}
                        onChange={(e) => setCandTargetClass(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 focus:outline-none focus:border-indigo-500 font-bold"
                      >
                        <option value="2">2ª Classe</option>
                        <option value="3">3ª Classe</option>
                        <option value="4">4ª Classe</option>
                        <option value="5">5ª Classe</option>
                        <option value="6">6ª Classe</option>
                        <option value="7">7ª Classe</option>
                        <option value="8">8ª Classe</option>
                        <option value="9">9ª Classe</option>
                      </select>
                    ) : (
                      <select
                        value={candTargetClass}
                        onChange={(e) => setCandTargetClass(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 focus:outline-none focus:border-indigo-500 font-bold"
                      >
                        <option value="10">10ª Classe</option>
                        <option value="11">11ª Classe</option>
                        <option value="12">12ª Classe</option>
                        <option value="13">13ª Classe</option>
                      </select>
                    )}
                  </div>
                </div>

                {candLevel === 'SECUNDARIO' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Especialidade / Curso</label>
                    <select
                      value={candSpecialty}
                      onChange={(e) => setCandSpecialty(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 focus:outline-none focus:border-indigo-500 font-bold"
                    >
                      <option value="MF">Matemática e Física (Mat-Fisica)</option>
                      <option value="GH">História e Geografia (Geo-Historia)</option>
                      <option value="BQ">Biologia e Química (Bio-química)</option>
                      <option value="LEMC">Português e EMC (LEMC)</option>
                      <option value="ING_EMC">Inglês e EMC</option>
                      <option value="FRA_EMC">Francês e EMC</option>
                      <option value="EVP">Educação Visual e Plástica (EVP)</option>
                      <option value="EDF">Educação Física (Ed.F)</option>
                      <option value="EMC">Educação Moral e Cívica (EMC)</option>
                      <option value="EP">Ensino Primário</option>
                      <option value="PE">Pré-Escolar</option>
                      <option value="CFB">Ciências Físicas e Biológicas (PUNIV)</option>
                      <option value="CEJ">Ciências Económico-Jurídicas (PUNIV)</option>
                      <option value="CS">Ciências Sociais (PUNIV)</option>
                      <option value="AV">Artes Visuais (PUNIV)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={candBirthDate}
                    onChange={(e) => setCandBirthDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Registrar Candidato
                </button>
              </form>
            </div>

            {/* Lista e Lançamento de Notas */}
            <div className="lg:col-span-2 bg-white p-5 border border-slate-200 rounded-2xl flex flex-col space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Candidatos Cadastrados ({candidates.length})</h3>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handlePrintApuradosReport}
                    className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Listar Apurados
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar candidatos por nome ou documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              {/* Main List */}
              <div className="flex-1 max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
                {candidates
                  .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.docNumber.includes(searchTerm))
                  .map(cand => {
                    const isPrimario = cand.level === 'PRIMARIO';
                    return (
                      <div 
                        key={cand.id}
                        className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-900">{cand.name}</span>
                            <span className="text-[9px] font-mono font-black bg-slate-200 px-1 py-0.5 rounded text-slate-600">{cand.id}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg uppercase ${
                              cand.status === 'Apurado' ? 'bg-emerald-100 text-emerald-800' :
                              cand.status === 'Matriculado' ? 'bg-blue-100 text-blue-800' :
                              cand.status === 'Excluído' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {cand.status}
                            </span>
                          </div>
                          
                          <div className="text-[10px] text-slate-500 font-bold flex flex-wrap gap-x-3 gap-y-1">
                            <span>Doc: {cand.docType} ({cand.docNumber})</span>
                            <span>Classe: {cand.targetClass}ª</span>
                            {cand.level === 'SECUNDARIO' && <span>Especialidade: <strong className="text-indigo-900">{cand.specialty}</strong></span>}
                          </div>
                        </div>

                        {/* CONDITIONAL ACTION FLOW */}
                        <div className="shrink-0 bg-white border border-slate-100 p-2.5 rounded-xl shadow-3xs w-full md:w-auto">
                          {isPrimario ? (
                            /* 1.1 ENSINO PRIMÁRIO (VALIDAÇÃO DOCUMENTAL) - SEM PROVAS */
                            <div className="flex items-center justify-between gap-4">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Validação Documental</span>
                                <span className="text-[9px] font-semibold text-slate-500 block">
                                  {cand.targetClass === '2' ? 'Declaração 1ª Classe' :
                                   cand.targetClass === '4' ? 'Declaração 3ª Classe' :
                                   cand.targetClass === '7' ? 'Certificado 6ª Classe' : 'Declaração 8ª Classe'}
                                </span>
                              </div>
                              <label className="relative flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={cand.declarationVerified}
                                  onChange={() => handleTogglePrimarioCheck(cand.id)}
                                  disabled={cand.status === 'Matriculado'}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-[10px] font-black uppercase text-slate-700">Validado</span>
                              </label>
                            </div>
                          ) : (
                            /* 1.2 ENSINO SECUNDÁRIO/MAGISTÉRIO (PROCESSO SELETIVO) */
                            <SecundarioGradesForm 
                              candidate={cand} 
                              onSave={(n1, n2, cert, bi) => handleSaveSecundarioGrades(cand.id, n1, n2, cert, bi)} 
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* SECUNDÁRIO MERITOCRATIC RANKING TRIGGER SECTION */}
          <div className="bg-white p-5 border border-slate-200 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ListOrdered className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Apuramento por Ranking Meritocrático (Ensino Secundário)</h3>
            </div>
            
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              O sistema eliminará os candidatos com média inferior a 10 valores, ordenará de forma decrescente os elegíveis e preencherá as vagas conforme o limite estipulado por especialidade.
            </p>

            <div className="flex flex-wrap items-end gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Classe Alvo</label>
                <select
                  id="rankClass"
                  className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-black focus:outline-none focus:border-indigo-500"
                >
                  <option value="10">10ª Classe</option>
                  <option value="11">11ª Classe</option>
                  <option value="12">12ª Classe</option>
                  <option value="13">13ª Classe</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Especialidade</label>
                <select
                  id="rankSpecialty"
                  className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-black focus:outline-none focus:border-indigo-500"
                >
                  <option value="MF">Matemática e Física (Mat-Fisica)</option>
                  <option value="GH">História e Geografia (Geo-Historia)</option>
                  <option value="BQ">Biologia e Química (Bio-química)</option>
                  <option value="LEMC">Português e EMC (LEMC)</option>
                  <option value="ING_EMC">Inglês e EMC</option>
                  <option value="FRA_EMC">Francês e EMC</option>
                  <option value="EVP">Educação Visual e Plástica (EVP)</option>
                  <option value="EDF">Educação Física (Ed.F)</option>
                  <option value="EMC">Educação Moral e Cívica (EMC)</option>
                  <option value="EP">Ensino Primário</option>
                  <option value="PE">Pré-Escolar</option>
                  <option value="CFB">Ciências Físicas e Biológicas (CFB)</option>
                  <option value="CEJ">Ciências Económico-Jurídicas (CEJ)</option>
                  <option value="CS">Ciências Sociais (CS)</option>
                  <option value="AV">Artes Visuais (AV)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vagas de Capacidade</label>
                <input
                  type="number"
                  value={capacityLimit}
                  onChange={(e) => setCapacityLimit(Math.max(1, parseInt(e.target.value) || 75))}
                  className="w-24 text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-black focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const targetCl = (document.getElementById('rankClass') as HTMLSelectElement).value;
                  const targetSpec = (document.getElementById('rankSpecialty') as HTMLSelectElement).value;
                  handleRunRankingAndApuramento(targetCl, targetSpec);
                }}
                className="bg-indigo-600 hover:bg-indigo-750 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer transition-colors shrink-0"
              >
                Gerar Apuramento Meritocrático
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MÓDULO DE APROVAÇÃO E MATRÍCULA */}
      {activeTab === 'MATRICULA' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white p-5 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4.5 h-4.5 text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Aprovação de Candidatos & Confirmação de Matrícula</h3>
              </div>
              <div className="text-[10px] font-bold text-slate-400 font-mono">
                Total de Candidatos: {candidates.length}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-3xl">
              Nesta fase, os candidatos que realizaram o teste de admissão e foram apurados pelo sistema (ou por validação documental) entram na lista abaixo aguardando a <strong>Aprovação Oficial da Escola</strong>. Uma vez aprovados, fica disponível a opção de <strong>Confirmar a Matrícula</strong>, que preenche automaticamente a ficha de matrícula do SIGEP com o nome completo, B.I e especialidade correspondente.
            </p>

            <div className="border border-slate-150 rounded-2xl overflow-hidden bg-slate-50/25">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[9px] border-b border-slate-200">
                      <th className="p-3.5">Nome do Candidato</th>
                      <th className="p-3.5 text-center">Nº Documento</th>
                      <th className="p-3.5 text-center">Classe</th>
                      <th className="p-3.5 text-center">Especialidade / Curso</th>
                      <th className="p-3.5 text-center">Estado de Seleção</th>
                      <th className="p-3.5 text-right">Ação / Confirmação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium bg-white">
                    {candidates
                      .filter(c => c.status === 'Apurado' || c.status === 'Aprovado' || c.status === 'Matriculado')
                      .map(cand => {
                        return (
                          <tr key={cand.id} className="hover:bg-slate-50/50">
                            <td className="p-3.5">
                              <div className="font-extrabold text-slate-900 text-xs">{cand.name}</div>
                              <div className="text-[8px] font-mono text-slate-400 mt-0.5">{cand.id}</div>
                            </td>
                            <td className="p-3.5 text-center font-mono text-slate-600">
                              {cand.docNumber}
                            </td>
                            <td className="p-3.5 text-center font-bold text-slate-700">
                              {cand.targetClass}ª Classe
                            </td>
                            <td className="p-3.5 text-center font-bold text-indigo-950">
                              {cand.specialty || 'Ensino Geral'}
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wide border ${
                                cand.status === 'Matriculado'
                                  ? 'bg-blue-55 text-blue-800 border-blue-200'
                                  : cand.status === 'Aprovado'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {cand.status === 'Apurado' ? 'Aguardando Aprovação' : cand.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex justify-end gap-2">
                                {cand.status === 'Apurado' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCandidates(prev => prev.map(c => {
                                        if (c.id === cand.id) {
                                          return { ...c, status: 'Aprovado' };
                                        }
                                        return c;
                                      }));
                                      alert(`Candidato ${cand.name} foi APROVADO pela escola com sucesso! A matrícula pode agora ser confirmada.`);
                                    }}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Aprovar Candidato
                                  </button>
                                )}

                                {cand.status === 'Aprovado' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onConfirmEnrollment) {
                                        onConfirmEnrollment(cand);
                                      } else {
                                        alert('Função de confirmação de matrícula não configurada.');
                                      }
                                    }}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                                  >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    Confirmar a Matrícula
                                  </button>
                                )}

                                {cand.status === 'Matriculado' && (
                                  <span className="text-emerald-600 font-extrabold text-[10px] uppercase flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" /> Matrícula Concluída
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {candidates.filter(c => c.status === 'Apurado' || c.status === 'Aprovado' || c.status === 'Matriculado').length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 font-semibold italic">
                          Não existem candidatos apurados ou aprovados no momento. Por favor, lance as provas e execute o ranking de seleção.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FLUXO DE GESTÃO DE ABANDONO */}
      {activeTab === 'ABANDONO' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Alertas de Abandono (Trimestre 3) */}
          {currentTrimester === 3 && (
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-800">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-950">Alertas de Abandono Definitivo (IIIº Trimestre)</h3>
              </div>
              <p className="text-[10px] text-rose-900 leading-normal font-semibold">
                Alerta de alta prioridade emitido automaticamente para a Direcção Geral e Secretaria. Os seguintes alunos encontram-se em situação de abandono definitivo e incondicional:
              </p>

              <div className="space-y-2 max-h-[25vh] overflow-y-auto custom-scrollbar">
                {students.filter(s => s.status === 'Desistente').length === 0 ? (
                  <div className="text-center py-4 text-rose-600 text-[10px] font-bold">
                    Nenhum aluno em situação de abandono neste momento.
                  </div>
                ) : (
                  students
                    .filter(s => s.status === 'Desistente')
                    .map(student => (
                      <div key={student.id} className="bg-white border border-rose-100 p-3 rounded-xl flex justify-between items-center text-xs font-bold text-rose-950 shadow-3xs">
                        <div>
                          <span>{student.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 block">ID: {student.id} • Classe: {student.class}ª - Turma: {student.section}</span>
                        </div>
                        <span className="text-[9px] bg-rose-100 text-rose-800 font-black px-2 py-0.5 rounded-lg uppercase">Abandono Homologado</span>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista Geral de Desistentes */}
            <div className="lg:col-span-2 bg-white p-5 border border-slate-200 rounded-2xl flex flex-col space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <UserMinus className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Alunos no Estado de Desistência</h3>
              </div>

              <div className="flex-1 max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2.5">
                {students.filter(s => s.status === 'Desistente').length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-medium space-y-1">
                    <Check className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p>Nenhum aluno em estado de desistência.</p>
                  </div>
                ) : (
                  students
                    .filter(s => s.status === 'Desistente')
                    .map(student => (
                      <div key={student.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex justify-between items-center gap-4">
                        <div>
                          <div className="text-xs font-black text-slate-900">{student.name}</div>
                          <div className="text-[10px] text-slate-500 font-bold flex gap-3">
                            <span>ID: {student.id}</span>
                            <span>BI: {student.bi || 'N/A'}</span>
                            <span>Classe: {student.class}ª - Turma: {student.section}</span>
                          </div>
                        </div>

                        {/* DG OVERRULE BUTTON */}
                        <button
                          onClick={() => handleOpenOverrule(student)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                        >
                          Reverter Desistência
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Audit Log timeline of Overrules */}
            <div className="bg-white p-5 border border-slate-200 rounded-2xl flex flex-col space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Log de Auditoria de Reversões</h3>
              </div>

              <div className="flex-1 max-h-[50vh] overflow-y-auto custom-scrollbar space-y-3 pr-1">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-medium">
                    Nenhum log de auditoria registado até ao momento.
                  </div>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1 text-[10px] leading-relaxed">
                      <div className="flex justify-between items-center font-bold text-slate-500 text-[9px] border-b border-slate-100 pb-1">
                        <span>{log.operator}</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <div className="font-bold text-indigo-950 mt-1">Acção: {log.action}</div>
                      <div className="font-semibold text-slate-700">Aluno: {log.studentName} ({log.studentId})</div>
                      <div className="text-slate-500 italic mt-1 font-medium bg-white/50 p-1.5 rounded border border-slate-100">" {log.justification} "</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DG OVERRULE CONFIRMATION MODAL */}
      {showOverruleModal && overruleStudent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl w-full max-w-lg p-6 space-y-4 animate-scaleIn">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-heading font-black text-sm uppercase tracking-wider text-rose-950">Homologação de Reversão pelo Diretor Geral</h3>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">
                Está a reverter o abandono do aluno(a) <strong>{overruleStudent.name}</strong> para o estado Ativo de forma administrativa. Esta acção exige uma justificação explícita que será inserida no log de auditoria do SIGEP.
              </p>
            </div>

            {overruleError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl text-[10px] font-bold">
                {overruleError}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Justificação Administrativa</label>
              <textarea
                value={overruleJustification}
                onChange={(e) => setOverruleJustification(e.target.value)}
                placeholder="Exemplo: Aluno apresentou atestado médico justificativo que valida as ausências e o Diretor Geral autorizou o regresso com amparo legal..."
                rows={3}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-rose-500 font-semibold leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Senha Administrativa do Diretor</label>
              <input
                type="password"
                value={overrulePassword}
                onChange={(e) => setOverrulePassword(e.target.value)}
                placeholder="Digite a senha do Diretor Geral..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-rose-500 font-bold"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowOverruleModal(false);
                  setOverruleStudent(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveOverrule}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-2.5 rounded-xl text-xs cursor-pointer transition-all uppercase tracking-wider"
              >
                Homologar Reversão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Secondary Sub-component for Secundário candidate grades input */
interface SecundarioGradesFormProps {
  candidate: Candidate;
  onSave: (n1: number, n2: number, certChecked: boolean, biChecked: boolean) => void;
}

function SecundarioGradesForm({ candidate, onSave }: SecundarioGradesFormProps) {
  const [nota1, setNota1] = useState(candidate.notaProva1 !== undefined ? String(candidate.notaProva1) : '');
  const [nota2, setNota2] = useState(candidate.notaProva2 !== undefined ? String(candidate.notaProva2) : '');
  const [certChecked, setCertChecked] = useState(candidate.cert9ClasseVerified);
  const [biChecked, setBiChecked] = useState(candidate.biVerified);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleApply = () => {
    const n1 = parseFloat(nota1);
    const n2 = parseFloat(nota2);

    if (isNaN(n1) || isNaN(n2) || n1 < 0 || n1 > 20 || n2 < 0 || n2 > 20) {
      alert('Por favor insira notas válidas entre 0 e 20 valores para ambas as provas.');
      return;
    }

    if (!certChecked) {
      alert('De acordo com as regras do MED, é obrigatório validar o Certificado da 9ª Classe (Mínimo de 12 valores) para o Ensino Secundário/Magistério!');
      return;
    }

    if (!biChecked) {
      alert('De acordo com as regras do MED, é obrigatório validar o Bilhete de Identidade (BI) do candidato!');
      return;
    }

    onSave(n1, n2, certChecked, biChecked);
    setHasUnsavedChanges(false);
    alert('Avaliações do Processo Seletivo gravadas temporariamente. O candidato está pronto para o processamento do ranking!');
  };

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2.5 items-center flex-wrap">
        {/* Checkboxes validation */}
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={biChecked}
            disabled={candidate.status === 'Matriculado'}
            onChange={(e) => {
              setBiChecked(e.target.checked);
              setHasUnsavedChanges(true);
            }}
            className="w-3.5 h-3.5 rounded text-indigo-600"
          />
          <span className="text-[9px] font-bold text-slate-600 uppercase">Validar B.I</span>
        </label>

        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={certChecked}
            disabled={candidate.status === 'Matriculado'}
            onChange={(e) => {
              setCertChecked(e.target.checked);
              setHasUnsavedChanges(true);
            }}
            className="w-3.5 h-3.5 rounded text-indigo-600"
          />
          <span className="text-[9px] font-bold text-slate-600 uppercase">Certificado 9ª Classe (≥ 12 Val)</span>
        </label>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div>
          <span className="text-[9px] font-bold text-slate-500 block">Prova 1</span>
          <input
            type="number"
            min={0}
            max={20}
            step={0.1}
            value={nota1}
            disabled={candidate.status === 'Matriculado'}
            onChange={(e) => {
              setNota1(e.target.value);
              setHasUnsavedChanges(true);
            }}
            placeholder="0-20"
            className="w-14 text-center text-xs bg-slate-50 border border-slate-200 rounded px-1 py-1 font-bold focus:outline-none"
          />
        </div>

        <div>
          <span className="text-[9px] font-bold text-slate-500 block">Prova 2</span>
          <input
            type="number"
            min={0}
            max={20}
            step={0.1}
            value={nota2}
            disabled={candidate.status === 'Matriculado'}
            onChange={(e) => {
              setNota2(e.target.value);
              setHasUnsavedChanges(true);
            }}
            placeholder="0-20"
            className="w-14 text-center text-xs bg-slate-50 border border-slate-200 rounded px-1 py-1 font-bold focus:outline-none"
          />
        </div>

        {typeof candidate.media === 'number' && !isNaN(candidate.media) && (
          <div className="text-center bg-slate-100 px-2 py-1 rounded">
            <span className="text-[8px] font-bold text-slate-400 block uppercase">Média</span>
            <span className="text-[10px] font-black text-slate-800">{candidate.media.toFixed(2)}</span>
          </div>
        )}

        {candidate.status !== 'Matriculado' && (
          <button
            type="button"
            onClick={handleApply}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all ${
              hasUnsavedChanges 
                ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Gravar Provas
          </button>
        )}
      </div>
    </div>
  );
}
