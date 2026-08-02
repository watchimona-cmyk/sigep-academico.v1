import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { formatarNomeProprio } from '../utils/pautaLogic';
import { downloadComprovativoPDF, ComprovativoType } from '../utils/comprovativoGenerator';
import { Student, GradeRow, SubjectType, getSubjectsForStudent, getSubjectAbbreviation } from '../types';
import { PROVINCIAS_E_MUNICIPIOS as LOCALIDADES_ANGOLA } from '../constants/dpa';
import BiSectorSelect from './BiSectorSelect';
import { 
  GraduationCap, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  BookOpen, 
  ArrowLeft, 
  LogOut, 
  Info, 
  Award,
  ChevronRight,
  TrendingUp,
  XCircle,
  FileText,
  Calendar,
  MapPin,
  Phone,
  Users,
  Download
} from 'lucide-react';

interface PortalAlunoProps {
  students: Student[];
  grades: GradeRow[];
  onClose: () => void;
  schoolSettings: {
    schoolName: string;
    onlineCandidaturesEnabled?: boolean;
    activeComponents?: {
      ENSINO_PRIMARIO: boolean;
      PUNIV: boolean;
      MAGISTERIO: boolean;
    };
  };
}

const MESES_ANGOLA = [
  "Setembro", "Outubro", "Novembro", "Dezembro",
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho"
];

// Helper to determine if a school month is overdue/late (due on 10th of following month)
function isMonthOverdue(monthIndex: number, currentDate: Date = new Date()): boolean {
  const currentYear = currentDate.getFullYear();
  // Set=8, Oct=9, Nov=10, Dec=11, Jan=0, Feb=1, Mar=2, Apr=3, May=4, Jun=5, Jul=6
  const calendarMonths = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6];
  const targetMonth = calendarMonths[monthIndex];
  
  let targetYear = currentYear;
  const currentMonth = currentDate.getMonth(); // 0-11
  
  if (targetMonth >= 8 && currentMonth <= 6) {
    targetYear = currentYear - 1;
  }
  if (targetMonth <= 6 && currentMonth >= 8) {
    targetYear = currentYear + 1;
  }

  let dueMonth = targetMonth + 1;
  let dueYear = targetYear;
  if (dueMonth > 11) {
    dueMonth = 0;
    dueYear += 1;
  }

  const dueDate = new Date(dueYear, dueMonth, 10, 23, 59, 59);
  return currentDate > dueDate;
}

export default function PortalAluno({ students, grades, onClose, schoolSettings }: PortalAlunoProps) {
  const schoolName = schoolSettings.schoolName;
  const onlineCandidaturesEnabled = schoolSettings.onlineCandidaturesEnabled !== false;

  const [studentId, setStudentId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Candidatura/Inscrição States
  const [isCandidaturaMode, setIsCandidaturaMode] = useState(false);
  const [candName, setCandName] = useState('');
  const [candGender, setCandGender] = useState<'M' | 'F' | ''>('');
  const [candBirthDate, setCandBirthDate] = useState('');
  const [candDocType, setCandDocType] = useState<'BI' | 'CEDULA'>('BI');
  const [candDocNumber, setCandDocNumber] = useState('');
  const [candBiIssuerSector, setCandBiIssuerSector] = useState('');
  const [candBiIssueDate, setCandBiIssueDate] = useState('');
  const [candProvince, setCandProvince] = useState('');
  const [candNaturalidade, setCandNaturalidade] = useState('');
  const [candContact, setCandContact] = useState('');
  const [candFatherName, setCandFatherName] = useState('');
  const [candMotherName, setCandMotherName] = useState('');
  const [candPeriod, setCandPeriod] = useState<'Matinal' | 'Vespertino' | 'Noturno' | ''>('');
  const [candSubsystem, setCandSubsystem] = useState<'ENSINO_PRIMARIO' | 'LICEU' | 'MAGISTERIO'>('ENSINO_PRIMARIO');
  const [candClass, setCandClass] = useState('1'); // Classe pretendida
  const [candHasCert, setCandHasCert] = useState<boolean>(false);
  const [candSpecialty, setCandSpecialty] = useState('NENHUMA'); // Curso/Especialidade
  const [candLanguage, setCandLanguage] = useState<'INGLÊS' | 'FRANCÊS'>('INGLÊS');
  const [candAverage, setCandAverage] = useState(''); // Média certificado
  const [candSuccessMsg, setCandSuccessMsg] = useState('');
  const [candErrorMsg, setCandErrorMsg] = useState('');
  
  // Active logged-in student
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  
  // Financial restriction details
  const [isFinanciallyLocked, setIsFinanciallyLocked] = useState(false);
  const [overdueMonths, setOverdueMonths] = useState<string[]>([]);

  // Selected subject for performance breakdown
  const [selectedSubject, setSelectedSubject] = useState<SubjectType | null>(null);

  const handleDownloadComprovativo = (data: any, type: ComprovativoType = 'MATRICULA') => {
    downloadComprovativoPDF(data, type, { schoolName });
  };

  // Authentication: Frictionless Nº de Processo login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsFinanciallyLocked(false);
    setOverdueMonths([]);

    const cleanId = studentId.trim().toUpperCase();
    if (!cleanId) {
      setErrorMsg('Por favor, introduza o seu Nº de Processo, B.I. ou Nº de Guia de Transferência (GE / GS).');
      return;
    }

    // Match student by ID, B.I., Guia de Entrada (GE) or Guia de Saída (GS)
    const matchedStudent = students.find(s => 
      s.id.toUpperCase() === cleanId ||
      (s.biNumber && s.biNumber.toUpperCase() === cleanId) ||
      (s.guiaTransferenciaEntrada && s.guiaTransferenciaEntrada.toUpperCase() === cleanId) ||
      (s.guiaTransferenciaSaida && s.guiaTransferenciaSaida.toUpperCase() === cleanId)
    );

    if (!matchedStudent) {
      setErrorMsg(`Nº "${cleanId}" não foi localizado no cadastro escolar. Verifique o número com a Secretaria.`);
      return;
    }

    // Trava Financeira Primária (Primary Financial Lock)
    // Load student's financial records from localStorage
    const savedFinance = localStorage.getItem('sigep_propinas_v1');
    const financeRecords = savedFinance ? JSON.parse(savedFinance) : [];
    const studentFinance = financeRecords.find((f: any) => 
      f.id.toUpperCase() === matchedStudent.id.toUpperCase() ||
      (matchedStudent.guiaTransferenciaEntrada && f.id.toUpperCase() === matchedStudent.guiaTransferenciaEntrada.toUpperCase()) ||
      (matchedStudent.guiaTransferenciaSaida && f.id.toUpperCase() === matchedStudent.guiaTransferenciaSaida.toUpperCase())
    );

    if (studentFinance) {
      const unpaidOverdue: string[] = [];
      studentFinance.mesesPagos.forEach((pago: boolean, idx: number) => {
        if (!pago && isMonthOverdue(idx)) {
          unpaidOverdue.push(MESES_ANGOLA[idx]);
        }
      });

      if (unpaidOverdue.length > 0) {
        setOverdueMonths(unpaidOverdue);
        setIsFinanciallyLocked(true);
        setActiveStudent(matchedStudent); // Set temporarily to show student details in the lock screen
        return;
      }
    }

    // If regularized, allow session
    setActiveStudent(matchedStudent);
    // Auto-select first subject if available
    const studentSubjects = getSubjectsForStudent(matchedStudent);
    if (studentSubjects.length > 0) {
      setSelectedSubject(studentSubjects[0] as SubjectType);
    }
  };

  const handleLogout = () => {
    setActiveStudent(null);
    setStudentId('');
    setErrorMsg('');
    setIsFinanciallyLocked(false);
    setOverdueMonths([]);
    setSelectedSubject(null);
  };

  const handleCandidaturaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCandErrorMsg('');
    setCandSuccessMsg('');

    if (!candName.trim()) {
      setCandErrorMsg('Por favor, preencha o Nome Completo do candidato.');
      return;
    }
    if (!candGender) {
      setCandErrorMsg('Por favor, selecione o Género do candidato.');
      return;
    }
    if (!candBirthDate) {
      setCandErrorMsg('Por favor, preencha a Data de Nascimento.');
      return;
    }
    if (!candDocNumber.trim()) {
      setCandErrorMsg('Por favor, introduza o número do documento (B.I. / Cédula).');
      return;
    }
    if (candDocType === 'BI') {
      if (!candBiIssuerSector) {
        setCandErrorMsg('Por favor, selecione o Sector de Emissão do B.I.');
        return;
      }
      if (!candBiIssueDate) {
        setCandErrorMsg('Por favor, insira a Data de Emissão do B.I.');
        return;
      }
    }
    if (!candProvince) {
      setCandErrorMsg('Por favor, selecione a Província de origem.');
      return;
    }
    if (!candNaturalidade.trim()) {
      setCandErrorMsg('Por favor, selecione ou introduza a Naturalidade (Município).');
      return;
    }
    if (!candContact.trim()) {
      setCandErrorMsg('Por favor, preencha o Contacto Telefónico.');
      return;
    }
    if (!candFatherName.trim()) {
      setCandErrorMsg('Por favor, preencha o Nome do Pai.');
      return;
    }
    if (!candMotherName.trim()) {
      setCandErrorMsg('Por favor, preencha o Nome da Mãe.');
      return;
    }
    if (!candPeriod) {
      setCandErrorMsg('Por favor, selecione o Período pretendido.');
      return;
    }

    const numClass = parseInt(candClass, 10);
    // Para 10ª classe em diante, exige certificado de 9ª classe >= 12 valores
    if (numClass >= 10) {
      if (!candHasCert) {
        setCandErrorMsg('O candidato deve obrigatoriamente possuir o certificado da 9.ª classe.');
        return;
      }
      const avg = parseFloat(candAverage);
      if (isNaN(avg) || avg < 12) {
        setCandErrorMsg('A média do certificado deve ser igual ou superior a 12 valores.');
        return;
      }
      if (candSpecialty === 'NENHUMA') {
        setCandErrorMsg('Por favor, selecione a Especialidade / Curso pretendido.');
        return;
      }
    }

    // Carregar candidatos existentes
    const savedCandidates = localStorage.getItem('sigep_candidates_v1');
    const existingCandidates = savedCandidates ? JSON.parse(savedCandidates) : [];

    // Verificar se já existe candidato com o mesmo número de documento
    const duplicate = existingCandidates.find((c: any) => c.docNumber.trim().toUpperCase() === candDocNumber.trim().toUpperCase());
    if (duplicate) {
      setCandErrorMsg(`Já existe uma candidatura registrada com o número de documento "${candDocNumber}".`);
      return;
    }

    // Gerar ID de Candidato (ex: CAND-XXXXXX)
    const candId = `CAND-${Math.floor(100000 + Math.random() * 900000)}`;

    const newCandidate = {
      id: candId,
      name: formatarNomeProprio(candName),
      gender: candGender as 'M' | 'F',
      docType: candDocType,
      docNumber: candDocNumber.trim().toUpperCase(),
      biIssuerSector: candBiIssuerSector,
      biIssueDate: candBiIssueDate,
      province: candProvince,
      naturalidade: candNaturalidade.trim(),
      contact: candContact.trim(),
      fatherName: formatarNomeProprio(candFatherName),
      motherName: formatarNomeProprio(candMotherName),
      periodo: candPeriod,
      subsystem: candSubsystem,
      hasCertificate9Class: numClass >= 10 ? candHasCert : false,
      certificateAverage: numClass >= 10 ? parseFloat(candAverage) : 10,
      specialty: numClass < 10 || candSpecialty === 'NENHUMA' ? '' : candSpecialty,
      foreignLanguage: candLanguage,
      selectedClass: candClass,
      status: numClass <= 9 ? 'Aprovado' : 'Pendente' // Admissão automática para primário e I Ciclo
    };

    const updatedCandidates = [...existingCandidates, newCandidate];
    localStorage.setItem('sigep_candidates_v1', JSON.stringify(updatedCandidates));

    setCandSuccessMsg(`Candidatura submetida com absoluto sucesso! O seu Código de Candidatura é: ${candId}. Guarde este código para consulta ou para que a secretaria proceda à sua matrícula.`);
    
    // Limpar campos
    setCandName('');
    setCandGender('');
    setCandBirthDate('');
    setCandDocNumber('');
    setCandBiIssuerSector('');
    setCandBiIssueDate('');
    setCandProvince('');
    setCandNaturalidade('');
    setCandContact('');
    setCandFatherName('');
    setCandMotherName('');
    setCandPeriod('');
    setCandHasCert(false);
    setCandAverage('');
    setCandSpecialty('NENHUMA');
    setCandClass('1');
    setCandSubsystem('ENSINO_PRIMARIO');
  };

  // If financially locked, display the "Aviso de Regularização"
  if (isFinanciallyLocked && activeStudent) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 select-none font-sans" id="portal-aluno-locked-screen">
        <div className="max-w-xl w-full bg-slate-900 border border-rose-500/30 rounded-2xl overflow-hidden shadow-2xl animate-fadeIn" id="portal-aluno-locked-card">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-950 to-slate-900 p-6 flex items-center gap-4 border-b border-rose-500/20">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/30 shrink-0">
              <AlertTriangle className="w-6 h-6 text-rose-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-white font-extrabold text-base uppercase tracking-wide">Aviso de Regularização</h2>
              <p className="text-[11px] text-rose-400 font-mono font-bold">MÓDULO FINANCEIRO • BLOQUEIO AUTOMÁTICO</p>
            </div>
          </div>

          {/* Student details and debt */}
          <div className="p-6 space-y-5">
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-mono">Estudante Identificado</div>
              <div className="text-sm font-extrabold text-white">{activeStudent.name}</div>
              <div className="flex gap-4 text-xs font-semibold text-slate-400">
                <span>Nº Processo: <strong className="text-slate-200 font-mono">{activeStudent.id}</strong></span>
                <span>Classe / Turma: <strong className="text-slate-200">{activeStudent.class}ª - Turma {activeStudent.section}</strong></span>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                Estimado encarregado de educação e aluno, informamos que o acesso às notas de avaliação encontra-se suspenso preventivamente devido a propinas pendentes de liquidação:
              </p>

              <div className="bg-rose-500/5 rounded-xl border border-rose-500/10 p-4 space-y-2">
                <div className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  Meses em Atraso Detectados ({overdueMonths.length})
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {overdueMonths.map((m, i) => (
                    <span key={i} className="px-2.5 py-1 text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-indigo-950/40 rounded-xl border border-indigo-500/10 p-4 text-xs text-indigo-200 leading-relaxed font-medium">
              * Para reaver o acesso ao histórico académico e pautas individuais, dirija-se à <strong>Secretaria Geral</strong> da instituição para proceder à devida regularização financeira. Uma vez emitido o recibo, o seu acesso ao portal será restabelecido instantaneamente.
            </div>
          </div>

          {/* Footer Back Button */}
          <div className="p-5 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono font-bold">{schoolName}</span>
            <button
              id="portal-aluno-locked-back"
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Login</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // Auth Screen if not logged in
  if (!activeStudent) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none" id="portal-aluno-auth-screen">
        
        {/* Ambient light rays */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className={`w-full ${isCandidaturaMode ? 'max-w-3xl' : 'max-w-md'} space-y-6 relative z-10 transition-all duration-300`} id="portal-aluno-auth-container">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-slate-900 border border-slate-800 rounded-3xl mx-auto items-center justify-center shadow-2xl">
              <GraduationCap className="w-16 h-16 text-indigo-400" />
            </div>
            
            <div className="space-y-1.5">
              <h1 className="text-white font-black text-xl tracking-tight leading-none uppercase">
                {isCandidaturaMode ? 'Candidatura Online' : 'Portal do Aluno'}
              </h1>
              <p className="text-indigo-400 text-xs font-mono font-extrabold uppercase tracking-widest">
                {isCandidaturaMode ? 'Inscrição de Nível 1' : 'Consulta de Notas e Desempenho'}
              </p>
              <p className="text-slate-400 text-xs font-semibold max-w-xs mx-auto pt-1 leading-normal">
                {schoolName}
              </p>
            </div>
          </div>

          {/* Candidatura Form */}
          {isCandidaturaMode ? (
            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-5 animate-fadeIn">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-200">Pré-Inscrição Sem ID</h2>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  Preencha cuidadosamente os seus dados de candidatura. Os requisitos de admissão do SIGEP serão aplicados automaticamente.
                </p>
              </div>

              {candErrorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{candErrorMsg}</span>
                </div>
              )}

              {candSuccessMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-4 rounded-xl flex items-start gap-2.5">
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold uppercase tracking-wide">Sucesso!</p>
                    <p className="leading-relaxed font-semibold">{candSuccessMsg}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleCandidaturaSubmit} className="space-y-6">
                
                {/* Secção I: Dados Pessoais & Identificação */}
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 space-y-4">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    I. Dados Pessoais & Identificação
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nome Completo */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Nome Completo do Candidato
                      </label>
                      <input
                        type="text"
                        required
                        value={candName}
                        onChange={(e) => setCandName(e.target.value)}
                        onBlur={() => setCandName(formatarNomeProprio(candName))}
                        autoCapitalize="words"
                        placeholder="Ex: Watchi Mona António"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                      />
                      <p className="mt-1 text-[10px] text-slate-400">
                        Nota: Insira o nome respeitando a norma ortográfica. O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                      </p>
                    </div>

                    {/* Género */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Género
                      </label>
                      <select
                        required
                        value={candGender}
                        onChange={(e) => setCandGender(e.target.value as 'M' | 'F' | '')}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                      >
                        <option value="">Selecione...</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                      </select>
                    </div>

                    {/* Data de Nascimento */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Data de Nascimento
                      </label>
                      <input
                        type="date"
                        required
                        value={candBirthDate}
                        onChange={(e) => setCandBirthDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                      />
                    </div>

                    {/* Tipo de Documento */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Tipo de Identificação
                      </label>
                      <select
                        value={candDocType}
                        onChange={(e) => setCandDocType(e.target.value as 'BI' | 'CEDULA')}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                      >
                        <option value="BI">Bilhete de Identidade (B.I.)</option>
                        <option value="CEDULA">Cédula de Registro</option>
                      </select>
                    </div>

                    {/* Número do Documento */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Número do Documento (B.I. / Cédula)
                      </label>
                      <input
                        type="text"
                        required
                        value={candDocNumber}
                        onChange={(e) => setCandDocNumber(e.target.value)}
                        placeholder="Ex: 00539121LA045"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold uppercase"
                      />
                    </div>

                    {/* Sector de Emissão do B.I. */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Sector de Emissão do B.I. *
                      </label>
                      <BiSectorSelect
                        required={candDocType === 'BI'}
                        value={candBiIssuerSector}
                        onChange={setCandBiIssuerSector}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold cursor-pointer"
                      />
                    </div>

                    {/* Data de Emissão do B.I. */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Data de Emissão do B.I.
                      </label>
                      <input
                        type="date"
                        required={candDocType === 'BI'}
                        value={candBiIssueDate}
                        onChange={(e) => setCandBiIssueDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Secção II: Origem & Contacto */}
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 space-y-4">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    II. Origem & Contacto
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Província */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Província de Origem
                      </label>
                      <select
                        required
                        value={candProvince}
                        onChange={(e) => {
                          setCandProvince(e.target.value);
                          setCandNaturalidade(''); // Reset naturalidade when changing province
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                      >
                        <option value="">Selecione...</option>
                        {Object.keys(LOCALIDADES_ANGOLA).map((prov) => (
                          <option key={prov} value={prov}>{prov}</option>
                        ))}
                      </select>
                    </div>

                    {/* Naturalidade (Município) */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Naturalidade (Município)
                      </label>
                      <select
                        required
                        value={candNaturalidade}
                        onChange={(e) => setCandNaturalidade(e.target.value)}
                        disabled={!candProvince}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold disabled:opacity-50"
                      >
                        <option value="">Selecione...</option>
                        {candProvince && LOCALIDADES_ANGOLA[candProvince]?.map((mun) => (
                          <option key={mun} value={mun}>{mun}</option>
                        ))}
                      </select>
                    </div>

                    {/* Contacto */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Contacto Telefónico
                      </label>
                      <input
                        type="tel"
                        required
                        value={candContact}
                        onChange={(e) => setCandContact(e.target.value)}
                        placeholder="Ex: 923456789"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Secção III: Filiação */}
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 space-y-4">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    III. Filiação
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nome do Pai */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Nome Completo do Pai
                      </label>
                      <input
                        type="text"
                        required
                        value={candFatherName}
                        onChange={(e) => setCandFatherName(e.target.value)}
                        onBlur={() => setCandFatherName(formatarNomeProprio(candFatherName))}
                        autoCapitalize="words"
                        placeholder="Ex: António Manuel"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                      />
                      <p className="mt-1 text-[10px] text-slate-400">
                        Nota: Insira o nome respeitando a norma ortográfica. O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                      </p>
                    </div>

                    {/* Nome da Mãe */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Nome Completo da Mãe
                      </label>
                      <input
                        type="text"
                        required
                        value={candMotherName}
                        onChange={(e) => setCandMotherName(e.target.value)}
                        onBlur={() => setCandMotherName(formatarNomeProprio(candMotherName))}
                        autoCapitalize="words"
                        placeholder="Ex: Maria Watchi"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                      />
                      <p className="mt-1 text-[10px] text-slate-400">
                        Nota: Insira o nome respeitando a norma ortográfica. O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Secção IV: Opções Académicas & Requisitos */}
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 space-y-4">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                    IV. Opções Académicas & Requisitos
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1º Subsistema de Ensino */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Subsistema de Ensino *
                      </label>
                      <select
                        required
                        value={candSubsystem}
                        onChange={(e) => {
                          const val = e.target.value as 'ENSINO_PRIMARIO' | 'LICEU' | 'MAGISTERIO';
                          setCandSubsystem(val);
                          if (val === 'ENSINO_PRIMARIO') {
                            setCandClass('1');
                            setCandSpecialty('NENHUMA');
                          } else if (val === 'LICEU') {
                            setCandClass('10');
                            setCandSpecialty('CFB');
                          } else if (val === 'MAGISTERIO') {
                            setCandClass('10');
                            setCandSpecialty('EP');
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                      >
                        <option value="ENSINO_PRIMARIO">Ensino Primário</option>
                        <option value="LICEU">Liceu</option>
                        <option value="MAGISTERIO">Magistério</option>
                      </select>
                    </div>

                    {/* Classe Pretendida (condicionada ao Subsistema) */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Classe Pretendida *
                      </label>
                      <select
                        required
                        value={candClass}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCandClass(val);
                          if (parseInt(val, 10) < 10) {
                            setCandSpecialty('NENHUMA');
                            setCandHasCert(false);
                            setCandAverage('');
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-bold font-mono"
                      >
                        {candSubsystem === 'ENSINO_PRIMARIO' && (
                          <>
                            <option value="1">1ª</option>
                            <option value="2">2ª</option>
                            <option value="3">3ª</option>
                            <option value="4">4ª</option>
                            <option value="5">5ª</option>
                            <option value="6">6ª</option>
                            <option value="7">7ª</option>
                            <option value="8">8ª</option>
                            <option value="9">9ª</option>
                          </>
                        )}
                        {candSubsystem === 'LICEU' && (
                          <>
                            <option value="10">10ª</option>
                            <option value="11">11ª</option>
                            <option value="12">12ª</option>
                          </>
                        )}
                        {candSubsystem === 'MAGISTERIO' && (
                          <>
                            <option value="10">10ª</option>
                            <option value="11">11ª</option>
                            <option value="12">12ª</option>
                            <option value="13">13ª</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* 2º Especialidade / Curso (Condicionada ao subsistema - 100% oculta para Ensino Primário) */}
                    {candSubsystem !== 'ENSINO_PRIMARIO' && (
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                          Especialidade / Curso Desejado *
                        </label>
                        <select
                          required
                          value={candSpecialty}
                          onChange={(e) => setCandSpecialty(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                        >
                          <option value="">Selecione o Curso...</option>
                          {candSubsystem === 'LICEU' && (
                            <>
                              <option value="CFB">Ciências Físicas e Biológicas (CFB)</option>
                              <option value="CEJ">Ciências Económicas e Jurídicas (CEJ)</option>
                              <option value="CS">Ciências Sociais (CS)</option>
                              <option value="AV">Artes Visuais (AV)</option>
                            </>
                          )}
                          {candSubsystem === 'MAGISTERIO' && (
                            <>
                              <option value="EP">Ensino Primário (EP)</option>
                              <option value="PE">Pré-Escolar / Ed. Infância (PE)</option>
                              <option value="LEMC">Língua Portuguesa e EMC (LEMC)</option>
                              <option value="ING_EMC">Inglês e EMC (ING_EMC)</option>
                              <option value="FRA_EMC">Francês e EMC (FRA_EMC)</option>
                              <option value="MF">Matemática e Física (MF)</option>
                              <option value="BQ">Biologia e Química (BQ)</option>
                              <option value="GH">Geografia e História (GH)</option>
                              <option value="EVP">Educação Visual e Plástica (EVP)</option>
                              <option value="EDF">Educação Física (EDF)</option>
                            </>
                          )}
                        </select>
                      </div>
                    )}

                    {/* 3º Período Letivo (3 opções padronizadas) */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Período Letivo Pretendido *
                      </label>
                      <select
                        required
                        value={candPeriod}
                        onChange={(e) => setCandPeriod(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                      >
                        <option value="">Selecione o Período Letivo...</option>
                        <option value="Matinal">Matinal</option>
                        <option value="Vespertino">Vespertino</option>
                        <option value="Noturno">Noturno</option>
                      </select>
                    </div>

                    {/* Opção de Língua Estrangeira (Inglês/Francês) */}
                    {/* Condicional: Visível apenas no Liceu, ou no Ensino Primário da 7ª à 9ª Classe */}
                    {((candSubsystem === 'ENSINO_PRIMARIO' && parseInt(candClass, 10) >= 7) || candSubsystem === 'LICEU') && (
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                          Opção de Língua Estrangeira *
                        </label>
                        <select
                          required
                          value={candLanguage}
                          onChange={(e) => setCandLanguage(e.target.value as 'INGLÊS' | 'FRANCÊS')}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                        >
                          <option value="INGLÊS">Inglês</option>
                          <option value="FRANCÊS">Francês</option>
                        </select>
                      </div>
                    )}

                    {/* Certificado Checkbox & Média para classes de nível secundário (>= 10) */}
                    {parseInt(candClass, 10) >= 10 && (
                      <div className="sm:col-span-2 bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={candHasCert}
                            onChange={(e) => setCandHasCert(e.target.checked)}
                            className="mt-1 accent-indigo-500 h-4 w-4 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <span className="block text-xs font-bold text-slate-200">Possuo Certificado de 9.ª Classe</span>
                            <span className="block text-[10px] text-slate-400">Exigência regulamentar obrigatória para admissão ao II Ciclo Secundário.</span>
                          </div>
                        </label>

                        {candHasCert && (
                          <div className="pt-3 border-t border-slate-800/60 animate-fadeIn">
                            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                              Média de Conclusão da 9.ª Classe (valores de 12 a 20) *
                            </label>
                            <input
                              type="number"
                              min="12"
                              max="20"
                              step="0.1"
                              required
                              value={candAverage}
                              onChange={(e) => setCandAverage(e.target.value)}
                              placeholder="Ex: 14.5"
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                            />
                            <p className="text-[9px] text-amber-500 font-bold mt-1.5">Nota: O valor regulamentar mínimo exigido pelo MED é de 12 valores.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/15 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Submeter Candidatura</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Back to Login option */}
              <div className="pt-4 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsCandidaturaMode(false);
                    setCandErrorMsg('');
                    setCandSuccessMsg('');
                  }}
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-bold font-mono uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar ao Login do Aluno</span>
                </button>
              </div>
            </div>
          ) : (
            /* Login Form */
            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-200">Acesso Simplificado</h2>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  Introduza o seu <b>Nº de Processo</b>, <b>B.I.</b> ou <b>Nº de Guia de Transferência (GE / GS)</b> para aceder ao seu histórico académico.
                </p>
              </div>

              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                    Nº de Processo, B.I. ou Nº de Guia (GE / GS)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => {
                        setStudentId(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="Ex: GE-2026-80101, GS-2026-90412, 12540 ou BI"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                    />
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-4" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Aceder ao Portal</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>

              {/* Botão de Candidatura Online no Rodapé se habilitado pelo Diretor */}
              {onlineCandidaturesEnabled ? (
                <div className="pt-4 border-t border-slate-800 text-center space-y-2">
                  <p className="text-[11px] text-slate-400 font-semibold">Não possui um Nº de Processo escolar?</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCandidaturaMode(true);
                      setCandErrorMsg('');
                      setCandSuccessMsg('');
                    }}
                    className="w-full bg-slate-800/80 hover:bg-slate-700 text-slate-250 hover:text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all border border-slate-700/60 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Inscrição / Candidatura Online</span>
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-800/40 text-center">
                  <p className="text-[10px] font-bold text-rose-400/80 uppercase font-mono tracking-wider">
                    ⚠️ Candidaturas Online Temporariamente Encerradas
                  </p>
                </div>
              )}

              {/* Descarregar Comprovativo por ID */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <p className="text-[11px] text-slate-400 font-semibold text-center">Precisa do seu comprovativo de matrícula?</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="input-comprovativo-id"
                    placeholder="Introduza o ID do Aluno"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const idInput = document.getElementById('input-comprovativo-id') as HTMLInputElement;
                      const val = idInput ? idInput.value.trim().toUpperCase() : '';
                      if (!val) {
                        alert('Por favor, introduza o ID do Aluno ou do Candidato para descarregar.');
                        return;
                      }
                      const matchedStudent = students.find(s => s.id.trim().toUpperCase() === val);
                      let matchedCand: any = null;
                      try {
                        const saved = localStorage.getItem('sigep_candidates_v1');
                        if (saved) {
                          const parsed = JSON.parse(saved);
                          if (Array.isArray(parsed)) {
                            matchedCand = parsed.find((c: any) => c.id && c.id.trim().toUpperCase() === val);
                          }
                        }
                      } catch (e) {}

                      if (matchedStudent) {
                        const compType = (matchedStudent.estadoPromocao === 'Aguardando Próximo Ano Letivo' || matchedStudent.originalClassBeforePromotion) ? 'RECONFIRMACAO' : 'MATRICULA';
                        downloadComprovativoPDF(matchedStudent, compType, { schoolName });
                      } else if (matchedCand) {
                        downloadComprovativoPDF(matchedCand, 'CANDIDATURA', { schoolName });
                      } else {
                        alert(`Estudante ou Candidato com o ID "${val}" não foi localizado no cadastro central.`);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs uppercase transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descarregar PDF</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Return button */}
          <div className="text-center">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs font-bold font-mono uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Menu Principal</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // Active dashboard view if student successfully authenticated and is financially OK
  const studentSubjects = getSubjectsForStudent(activeStudent);
  
  // Calculate grades for the selected subject
  const getGradesForSubject = (subject: SubjectType) => {
    const trimesters = ['I', 'II', 'III'] as const;
    return trimesters.map(t => {
      const row = grades.find(g => g.studentId === activeStudent.id && g.subject === subject && g.trimester === t);
      return {
        trimester: t,
        mac: row?.mac ?? null,
        npt: row?.npt ?? null,
        mt: row?.mt ?? null
      };
    });
  };

  const selectedGrades = selectedSubject ? getGradesForSubject(selectedSubject) : [];

  // Calculate annual/final media if trimester averages are available
  const calculateFinalMedia = () => {
    if (!selectedGrades || selectedGrades.length === 0) return null;
    let sum = 0;
    let count = 0;
    selectedGrades.forEach(g => {
      if (g.mt !== null) {
        sum += g.mt;
        count++;
      }
    });
    return count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
  };

  const finalMedia = calculateFinalMedia();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans select-none" id="portal-aluno-dashboard">
      
      {/* Top Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center border border-indigo-500/20 shrink-0">
            <GraduationCap className="w-5.5 h-5.5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-sm uppercase tracking-wider leading-none">Portal do Aluno</h1>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mt-1 block">SIGEP - Academic v1.1.0</span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="text-right hidden md:block">
            <div className="text-xs font-bold text-white">{activeStudent.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">Processo: <strong className="text-indigo-400">{activeStudent.id}</strong></div>
          </div>

          <button
            id="portal-aluno-logout-btn"
            onClick={handleLogout}
            className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700/60"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Portal</span>
          </button>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Student Info & Subject List (Col-span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Card: Student Info */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-full bg-slate-850 flex items-center justify-center border border-slate-700">
                <User className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider font-mono">Estudante Ativo</h3>
                <h4 className="text-sm font-extrabold text-white leading-tight">{activeStudent.name}</h4>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono font-bold">
              <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                <span className="block text-[9px] text-slate-500 uppercase">Processo</span>
                <span className="text-slate-200">{activeStudent.id}</span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                <span className="block text-[9px] text-slate-500 uppercase">Género</span>
                <span className="text-slate-200">{activeStudent.gender === 'M' ? 'Masculino' : 'Feminino'}</span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850 col-span-2">
                <span className="block text-[9px] text-slate-500 uppercase">Classe e Turma</span>
                <span className="text-slate-200">{activeStudent.class}ª • Turma {activeStudent.section}</span>
              </div>
              {activeStudent.specialty && (
                <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850 col-span-2">
                  <span className="block text-[9px] text-slate-500 uppercase">Especialidade</span>
                  <span className="text-indigo-300 font-semibold">{activeStudent.specialty}</span>
                </div>
              )}
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Situação Financeira: Regularizada</span>
            </div>
          </div>

          {/* Card: Interactive Subject Selector */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 flex-1 shadow-xl flex flex-col">
            <div>
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Disciplinas Matriculadas ({studentSubjects.length})
              </h3>
              <p className="text-[10px] text-slate-500 leading-normal mt-1">
                Selecione uma disciplina abaixo para inspecionar as notas trimestrais.
              </p>
            </div>

            {/* Scrolling list */}
            <div className="space-y-1.5 overflow-y-auto max-h-[350px] pr-1 flex-1">
              {studentSubjects.map((sub, idx) => {
                const isSelected = selectedSubject === sub;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedSubject(sub as SubjectType)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                        : 'bg-slate-950/40 text-slate-300 hover:bg-slate-850 border border-slate-850'
                    }`}
                  >
                    <span className="truncate pr-2">{getSubjectAbbreviation(sub)}</span>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'translate-x-0.5 text-white' : 'text-slate-500'}`} />
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Side: Interactive Performance Panel (Col-span 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {selectedSubject ? (
            <div className="space-y-6 flex flex-col h-full">
              
              {/* Display card of Selected Subject */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xl">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono font-black text-indigo-400 uppercase tracking-widest">Disciplina em Consulta</div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">{selectedSubject}</h2>
                </div>

                {/* MF Badge */}
                {finalMedia !== null && (
                  <div className="bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-3 self-start sm:self-center">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <Award className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider font-mono">Média Final (MF)</span>
                      <span className={`text-sm font-black font-mono ${finalMedia >= 10 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {finalMedia} {finalMedia >= 10 ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid of the 3 Trimesters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {selectedGrades.map((g, i) => {
                  const hasGrades = g.mac !== null || g.npt !== null || g.mt !== null;
                  
                  return (
                    <div 
                      key={i} 
                      className={`bg-slate-900 rounded-2xl border transition-all p-5 shadow-xl flex flex-col justify-between ${
                        hasGrades 
                          ? 'border-slate-800 hover:border-slate-700/80' 
                          : 'border-slate-850 opacity-60'
                      }`}
                    >
                      <div className="border-b border-slate-850 pb-3 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-400 font-mono uppercase tracking-wider">Trimestre {g.trimester}</span>
                        {g.mt !== null ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-mono ${g.mt >= 10 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {g.mt >= 10 ? 'Positiva' : 'Negativa'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">Sem Média</span>
                        )}
                      </div>

                      {/* Grades Display */}
                      <div className="py-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-semibold">Média Avaliação Contínua (MAC)</span>
                          <span className={`text-sm font-black font-mono ${g.mac !== null ? (g.mac >= 10 ? 'text-slate-200' : 'text-rose-400') : 'text-slate-600'}`}>
                            {g.mac !== null ? g.mac : '—'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-semibold">Nota Prova Trimestral (NPP/NPT)</span>
                          <span className={`text-sm font-black font-mono ${g.npt !== null ? (g.npt >= 10 ? 'text-slate-200' : 'text-rose-400') : 'text-slate-600'}`}>
                            {g.npt !== null ? g.npt : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Trimester Media footer */}
                      <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-850 flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-500 font-mono font-black uppercase">Média Trimestral (MT)</span>
                        <span className={`text-sm font-black font-mono ${g.mt !== null ? (g.mt >= 10 ? 'text-emerald-400' : 'text-rose-500') : 'text-slate-500'}`}>
                          {g.mt !== null ? g.mt : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Read Only compliance and system details */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-4 shadow-xl flex-1 justify-center flex-col">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-200">Sobre os dados apresentados</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                      O seu boletim de notas é gerado em tempo real de forma segura a partir do Computador Central da instituição. Qualquer dúvida em relação aos dados lançados, por favor contacte a Direção Pedagógica.
                    </p>
                  </div>
                </div>
                
                {/* Visual feedback of read-only security */}
                <div className="mt-4 w-full bg-slate-950/60 rounded-xl p-3.5 border border-slate-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-[10px] text-indigo-300 font-mono font-extrabold uppercase">Canal de Comunicação Seguro LAN</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono font-bold">ACESSO EXCLUSIVO DE LEITURA (READ-ONLY)</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-xl h-full">
              <TrendingUp className="w-12 h-12 text-slate-600 animate-bounce" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-200">Nenhuma disciplina selecionada</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Por favor, escolha uma das disciplinas na lista à esquerda para inspecionar o seu desempenho detalhado.
                </p>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-850 px-6 py-4 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 font-medium">
        <span>SIGEP - Academic Engine • v1.1.0 Estável</span>
        <span className="font-mono mt-1 sm:mt-0">© {new Date().getFullYear()} Luis Adelino António • Todos os Direitos Reservados</span>
      </footer>

    </div>
  );
}
