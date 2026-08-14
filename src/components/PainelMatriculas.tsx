import React, { useState, useEffect } from 'react';
import { 
  User, 
  UserPlus, 
  ArrowRightLeft, 
  FileText, 
  Search, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Globe, 
  MapPin, 
  Phone, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw,
  PlusCircle,
  HelpCircle,
  FileSpreadsheet,
  Download,
  History,
  MoveRight,
  MoveLeft,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { Student, UserRole, Staff, ModalityType, getSpecialtyFullName, GradeRow } from '../types';
import { generateStudentId, getSectionsList } from '../utils';
import { formatarNomeProprio } from '../utils/pautaLogic';
import { downloadComprovativoPDF, ComprovativoType } from '../utils/comprovativoGenerator';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PROVINCIAS_E_MUNICIPIOS as LOCALIDADES_ANGOLA } from '../constants/dpa';
import BiSectorSelect from './BiSectorSelect';
import TransferenciaEmissaoModal from './TransferenciaEmissaoModal';

interface Candidate {
  id: string;
  name: string;
  gender: 'M' | 'F';
  docType: 'BI' | 'CEDULA';
  docNumber: string;
  biIssuerSector?: string;
  biIssueDate?: string;
  subsystem?: 'ENSINO_PRIMARIO' | 'LICEU' | 'MAGISTERIO';
  birthDate: string;
  province: string;
  naturalidade: string;
  contact: string;
  fatherName: string;
  motherName: string;
  periodo: 'Manhã' | 'Tarde' | 'Matinal' | 'Vespertino' | 'Noturno';
  hasCertificate9Class: boolean;
  certificateAverage: number;
  specialty: string;
  foreignLanguage: 'INGLÊS' | 'FRANCÊS';
  selectedClass: string;
  prova1?: number;
  prova2?: number;
  mediaProvas?: number;
  status: 'Pendente' | 'Apurado' | 'Aprovado' | 'Não Apurado' | 'Matriculado' | 'Excluído';
}

interface PainelMatriculasProps {
  students: Student[];
  onAddStudent: (newStudent: Student) => void;
  onDeleteStudent: (id: string) => void;
  classes: string[];
  sections: string[];
  userRole?: UserRole;
  loggedInStaff?: Staff | null;
  activeModality?: ModalityType;
  initialPrefilledCandidate?: any;
  onClearPrefilledCandidate?: () => void;
  defaultActiveAba?: AbaMatriculaType;
  schoolSettings?: any;
  canEdit?: boolean;
  grades?: GradeRow[];
}

type AbaMatriculaType = 'MENU' | 'REGULAR' | 'TRANSFERIDO_ENTRADA' | 'TRANSFERIDO_SAIDA' | 'LISTAGEM_GERAL' | 'GRELHA_PAUTA' | 'PROCESSO_ADMISSAO' | 'RECONFIRMACAO';

export default function PainelMatriculas({
  students,
  onAddStudent,
  onDeleteStudent,
  classes,
  sections,
  userRole = 'SUB_DIRECTOR_PEDAGOGICO',
  loggedInStaff = null,
  activeModality = 'ENSINO_PRIMARIO',
  initialPrefilledCandidate,
  onClearPrefilledCandidate,
  defaultActiveAba,
  schoolSettings,
  canEdit = true,
  grades = []
}: PainelMatriculasProps) {
  
  const [abaAtiva, setAbaAtiva] = useState<AbaMatriculaType>(defaultActiveAba || 'MENU'); // Iniciar no MENU por padrão de facilidade de uso
  const [comprovativoData, setComprovativoData] = useState<{ type: ComprovativoType; data: any } | null>(null);

  // Estado para Emissão Oficial de Guia e Boletim de Transferência (Saída)
  const [modalTransferenciaEmissao, setModalTransferenciaEmissao] = useState<{
    isOpen: boolean;
    student: Student | null;
    guiaNumero?: string;
    escolaDestino?: string;
    provinciaDestino?: string;
    motivo?: string;
  }>({
    isOpen: false,
    student: null
  });

  useEffect(() => {
    if (defaultActiveAba) {
      setAbaAtiva(defaultActiveAba);
    }
  }, [defaultActiveAba]);
  
  // Admissões e Processo de Candidatura (Fases 1 a 4)
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    try {
      const saved = localStorage.getItem('sigep_candidates_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Salvar candidatos sempre que mudarem
  useEffect(() => {
    localStorage.setItem('sigep_candidates_v1', JSON.stringify(candidates));
  }, [candidates]);

  // Effect para lidar com dados pré-preenchidos do candidato da tela de Candidatura
  useEffect(() => {
    if (initialPrefilledCandidate) {
      setAbaAtiva('REGULAR');
      setNewName(initialPrefilledCandidate.name || '');
      setNewDocType(initialPrefilledCandidate.docType || 'BI');
      if (initialPrefilledCandidate.docType === 'BI') {
        setNewBi(initialPrefilledCandidate.docNumber || '');
        setNewCedulaRegisto('');
      } else {
        setNewCedulaRegisto(initialPrefilledCandidate.docNumber || '');
        setNewBi('');
      }
      // Mapeamento de Especialidade e todos os dados adicionais da candidatura
      setNewSpecialty(initialPrefilledCandidate.specialty || '');
      setNewClass(initialPrefilledCandidate.targetClass || initialPrefilledCandidate.selectedClass || '');
      setNewGender(initialPrefilledCandidate.gender || '');
      setNewFatherName(initialPrefilledCandidate.fatherName || '');
      setNewMotherName(initialPrefilledCandidate.motherName || '');
      setNewNaturalidade(initialPrefilledCandidate.naturalidade || '');
      setNewProvince(initialPrefilledCandidate.province || '');
      setNewContact(initialPrefilledCandidate.contact || '');
      setNewBiSector(initialPrefilledCandidate.biIssuerSector || '');
      setNewBiDate(initialPrefilledCandidate.biIssueDate || '');
      setNewForeignLanguage(initialPrefilledCandidate.foreignLanguage || 'INGLÊS');
      
      const candPeriod = initialPrefilledCandidate.periodo || '';
      let mappedPeriod: 'Manhã' | 'Tarde' | 'Noite' | '' = '';
      if (candPeriod === 'Manhã' || candPeriod === 'Matinal') {
        mappedPeriod = 'Manhã';
      } else if (candPeriod === 'Tarde' || candPeriod === 'Vespertino') {
        mappedPeriod = 'Tarde';
      } else if (candPeriod === 'Noturno' || candPeriod === 'Noite') {
        mappedPeriod = 'Noite';
      }
      setNewPeriod(mappedPeriod);

      const prefilledBirth = initialPrefilledCandidate.birthDate || (initialPrefilledCandidate as any).candBirthDate || (initialPrefilledCandidate as any).birth_date;
      if (prefilledBirth) {
        setNewBirthDate(prefilledBirth);
      }
      setFormStep(1);
      setFormError('');
      if (onClearPrefilledCandidate) {
        onClearPrefilledCandidate();
      }
    }
  }, [initialPrefilledCandidate]);

  // Fase 1: Form Candidato
  const [candName, setCandName] = useState('');
  const [candGender, setCandGender] = useState<'M' | 'F' | ''>('');
  const [candDocType, setCandDocType] = useState<'BI' | 'CEDULA'>('BI');
  const [candDocNumber, setCandDocNumber] = useState('');
  const [candBiIssuerSector, setCandBiIssuerSector] = useState('');
  const [candBiIssueDate, setCandBiIssueDate] = useState('');
  const [candSubsystem, setCandSubsystem] = useState<'ENSINO_PRIMARIO' | 'LICEU' | 'MAGISTERIO'>(() => {
    return activeModality === 'PUNIV' ? 'LICEU' : activeModality === 'MAGISTERIO' ? 'MAGISTERIO' : 'ENSINO_PRIMARIO';
  });

  // Sincronização automática do subsistema da candidatura com o subsistema ativo no menu/sistema
  useEffect(() => {
    const currentSub: 'ENSINO_PRIMARIO' | 'LICEU' | 'MAGISTERIO' = 
      activeModality === 'PUNIV' ? 'LICEU' : 
      activeModality === 'MAGISTERIO' ? 'MAGISTERIO' : 'ENSINO_PRIMARIO';
    setCandSubsystem(currentSub);
    if (currentSub === 'ENSINO_PRIMARIO') {
      setCandClass('1');
      setCandSpecialty('NENHUMA');
    } else if (currentSub === 'LICEU') {
      setCandClass('10');
      setCandSpecialty('CFB');
    } else if (currentSub === 'MAGISTERIO') {
      setCandClass('10');
      setCandSpecialty('EP');
    }
  }, [activeModality]);
  const [candBirthDate, setCandBirthDate] = useState('');
  const [candProvince, setCandProvince] = useState('');
  const [candNaturalidade, setCandNaturalidade] = useState('');
  const [candContact, setCandContact] = useState('');
  const [candFatherName, setCandFatherName] = useState('');
  const [candMotherName, setCandMotherName] = useState('');
  const [candPeriod, setCandPeriod] = useState<'Matinal' | 'Vespertino' | 'Noturno' | 'Manhã' | 'Tarde' | ''>('');
  const [candHasCert, setCandHasCert] = useState(false);
  const [candCertAvg, setCandCertAvg] = useState<number>(12);
  const [candSpecialty, setCandSpecialty] = useState('NENHUMA');
  const [candClass, setCandClass] = useState('1');
  const [candLang, setCandLang] = useState<'INGLÊS' | 'FRANCÊS'>('INGLÊS');
  const [candError, setCandError] = useState('');

  // Fase 5: Filtros do Painel de Resultados (sincronizado automaticamente com as configurações do sistema)
  const [resSubsystem, setResSubsystem] = useState<'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO'>(() => {
    return activeModality === 'PUNIV' ? 'PUNIV' : activeModality === 'MAGISTERIO' ? 'MAGISTERIO' : 'ENSINO_PRIMARIO';
  });

  useEffect(() => {
    const activeSub: 'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO' = 
      activeModality === 'PUNIV' ? 'PUNIV' : 
      activeModality === 'MAGISTERIO' ? 'MAGISTERIO' : 'ENSINO_PRIMARIO';
    setResSubsystem(activeSub);
    setResClass('All');
    setResSpecialty('All');
  }, [activeModality]);
  const [resClass, setResClass] = useState<string>('All');
  const [resSpecialty, setResSpecialty] = useState<string>('All');
  const [resSearchQuery, setResSearchQuery] = useState<string>('');

  const getSpecialtiesForModality = () => {
    if (activeModality === 'PUNIV') {
      return [
        { code: 'CFB', name: 'Ciências Físicas e Biológicas (CFB)' },
        { code: 'CEJ', name: 'Ciências Económico-Jurídicas (CEJ)' },
        { code: 'CS', name: 'Ciências Sociais (CS)' },
        { code: 'AV', name: 'Artes Visuais (AV)' }
      ];
    }
    if (activeModality === 'MAGISTERIO') {
      return [
        { code: 'EP', name: 'Ensino Primário (EP)' },
        { code: 'MF', name: 'Matemática e Física (MF)' },
        { code: 'PE', name: 'Pré-Escolar (PE)' },
        { code: 'BQ', name: 'Biologia e Química (BQ)' },
        { code: 'GH', name: 'História e Geografia (GH)' },
        { code: 'LEMC', name: 'Português e EMC (L.EMC)' },
        { code: 'ING_EMC', name: 'Inglês e EMC (ING_EMC)' },
        { code: 'FRA_EMC', name: 'Francês e EMC (FRA_EMC)' },
        { code: 'EVP', name: 'Educação Visual e Plástica (EVP)' },
        { code: 'EDF', name: 'Educação Física (EDF)' }
      ];
    }
    return [];
  };

  const showForeignLanguageSelector = () => {
    if (activeModality === 'MAGISTERIO') {
      return false;
    }
    if (activeModality === 'ENSINO_PRIMARIO') {
      const classNum = parseInt(candClass, 10);
      return classNum >= 7 && classNum <= 9;
    }
    if (activeModality === 'PUNIV') {
      const classNum = parseInt(candClass, 10);
      return classNum >= 10 && classNum <= 12;
    }
    return false;
  };

  const showForeignLanguageSelectorEnrollment = () => {
    if (activeModality === 'MAGISTERIO') {
      return false;
    }
    if (activeModality === 'ENSINO_PRIMARIO') {
      const classNum = parseInt(newClass, 10);
      return classNum >= 7 && classNum <= 9;
    }
    if (activeModality === 'PUNIV') {
      const classNum = parseInt(newClass, 10);
      return classNum >= 10 && classNum <= 12;
    }
    return false;
  };

  useEffect(() => {
    if (classes.length > 0 && !classes.includes(candClass)) {
      setCandClass(classes[0]);
    }
  }, [classes]);

  useEffect(() => {
    const specs = getSpecialtiesForModality();
    if (specs.length > 0) {
      if (!specs.some(s => s.code === candSpecialty)) {
        setCandSpecialty(specs[0].code);
      }
    } else {
      setCandSpecialty('');
    }
  }, [activeModality]);

  // Sub-fase / Aba ativa do processo de admissão (1, 2, 3, 4, 5)
  const [faseAdmissao, setFaseAdmissao] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Cálculo automático de vagas por especialidade de forma totalmente livre de intervenção humana (MED standard)
  const autoVagasPorEspecialidade = React.useMemo(() => {
    const specs = getSpecialtiesForModality();
    const result: { [key: string]: number } = {};
    specs.forEach(s => {
      const sectionsList = getSectionsList(activeModality, s.code);
      let totalVacancies = 0;
      sectionsList.forEach(sec => {
        // A classe de ingresso para o II ciclo (onde há especialidades) é a 10ª Classe
        const enrolledCount = students.filter(st => st.class === '10' && st.section === sec).length;
        const vacant = Math.max(0, 75 - enrolledCount);
        totalVacancies += vacant;
      });
      result[s.code] = totalVacancies;
    });
    // Garantir que todas as especialidades padrão tenham algum valor calculado para fallback
    const allSpecs = ['EP', 'PE', 'LEMC', 'ING_EMC', 'FRA_EMC', 'MF', 'BQ', 'CFB', 'CEJ', 'CS', 'AV', 'GH', 'EVP', 'EDF'];
    allSpecs.forEach(specCode => {
      if (result[specCode] === undefined) {
        const sectionsList = getSectionsList(activeModality, specCode);
        let totalVacancies = 0;
        sectionsList.forEach(sec => {
          const enrolledCount = students.filter(st => st.class === '10' && st.section === sec).length;
          const vacant = Math.max(0, 75 - enrolledCount);
          totalVacancies += vacant;
        });
        result[specCode] = totalVacancies;
      }
    });
    return result;
  }, [students, activeModality]);

  // Reconfirmação de Matrícula
  const [reconfSearch, setReconfSearch] = useState('');
  const [reconfStudentId, setReconfStudentId] = useState('');
  const [reconfNewClass, setReconfNewClass] = useState('');
  const [reconfNewSection, setReconfNewSection] = useState('');
  const [reconfNewPeriod, setReconfNewPeriod] = useState<'Manhã' | 'Tarde' | 'Noite' | ''>('');
  const [reconfError, setReconfError] = useState('');
  const [reconfSuccess, setReconfSuccess] = useState('');
  const [notificacao, setNotificacao] = useState<{ tipo: 'success' | 'error'; mensagem: string } | null>(null);

  // Estados para Grelha de Lançamento (Estilo Pauta)
  const [gridClass, setGridClass] = useState<string>('');
  const [gridSection, setGridSection] = useState<string>('');
  const [gridEditingId, setGridEditingId] = useState<string | null>(null);
  const [gridStudentData, setGridStudentData] = useState<Partial<Student>>({});

  useEffect(() => {
    if (classes.length > 0) {
      setGridClass(classes[0]);
    }
    if (sections.length > 0) {
      setGridSection(sections[0]);
    }
  }, [activeModality]);

  // Filtros da Listagem Geral
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [selectedAdmissao, setSelectedAdmissao] = useState<string>('All');
  const [selectedSituacao, setSelectedSituacao] = useState<string>('ATIVOS');

  // Form Step State para Matrícula Novo Aluno
  const [formStep, setFormStep] = useState(1);
  const [formError, setFormError] = useState('');
  const [linkingCandidateId, setLinkingCandidateId] = useState<string | null>(null);

  // Form Fields para Matrícula (usado para Novo e Transferência de Entrada)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'M' | 'F' | ''>('');
  const [newClass, setNewClass] = useState<string>('');
  const [newSection, setNewSection] = useState<string>('');
  const [newPeriod, setNewPeriod] = useState<'Manhã' | 'Tarde' | 'Noite' | ''>('');
  const [newSpecialty, setNewSpecialty] = useState<string>('');
  const [newFatherName, setNewFatherName] = useState('');
  const [newMotherName, setNewMotherName] = useState('');
  const [newDocType, setNewDocType] = useState<'BI' | 'CEDULA'>('BI');
  const [newBi, setNewBi] = useState('');
  const [newBiSector, setNewBiSector] = useState('');
  const [newBiDate, setNewBiDate] = useState('');
  const [newCedulaRegisto, setNewCedulaRegisto] = useState('');
  const [newCedulaFls, setNewCedulaFls] = useState('');
  const [newCedulaLivro, setNewCedulaLivro] = useState('');
  const [newCedulaAno, setNewCedulaAno] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [newNaturalidade, setNewNaturalidade] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newForeignLanguage, setNewForeignLanguage] = useState<'INGLÊS' | 'FRANCÊS'>('INGLÊS');

  // Campos Exclusivos para Entrada por Transferência
  const [transEscolaOrigem, setTransEscolaOrigem] = useState('');
  const [transGuiaEntrada, setTransGuiaEntrada] = useState('');
  const [transProvOrigem, setTransProvOrigem] = useState('');

  // Campos Exclusivos para Processar Saída por Transferência
  const [saidaAlunoId, setSaidaAlunoId] = useState('');
  const [saidaEscolaDestino, setSaidaEscolaDestino] = useState('');
  const [saidaGuiaSaida, setSaidaGuiaSaida] = useState('');
  const [saidaProcessoTransferencia, setSaidaProcessoTransferencia] = useState('');
  const [saidaProvDestino, setSaidaProvDestino] = useState('');
  const [saidaMotivo, setSaidaMotivo] = useState('');

  // Modality checks
  const isPUNIV = activeModality === 'PUNIV';
  const isMagisterio = activeModality === 'MAGISTERIO';

  const isNivel3 = (cls: string) => {
    const num = parseInt(cls, 10);
    return num >= 7;
  };

  // Reset forms on modality changes
  useEffect(() => {
    setSelectedClass('All');
    setSelectedSection('All');
    resetMatriculaForm();
    resetSaidaForm();
  }, [activeModality]);

  const generateAutomaticTransferNumbers = () => {
    const currentYear = new Date().getFullYear();
    let maxSeqSaida = 90411; // Base sequence to start from 90412
    let maxSeqEntrada = 80100; // Base sequence to start from 80101

    students.forEach(st => {
      if (st.guiaTransferenciaSaida) {
        const parts = st.guiaTransferenciaSaida.split('-');
        const lastPart = parts[parts.length - 1];
        const seq = parseInt(lastPart, 10);
        if (!isNaN(seq) && seq > maxSeqSaida) {
          maxSeqSaida = seq;
        }
      }
      if (st.guiaTransferenciaEntrada) {
        const parts = st.guiaTransferenciaEntrada.split('-');
        const lastPart = parts[parts.length - 1];
        const seq = parseInt(lastPart, 10);
        if (!isNaN(seq) && seq > maxSeqEntrada) {
          maxSeqEntrada = seq;
        }
      }
    });

    const nextSeqSaida = maxSeqSaida + 1;
    const nextGuiaSaida = `GS-${currentYear}-${nextSeqSaida}`;
    const nextProcesso = `PT-${currentYear}-${nextSeqSaida}`;

    const nextSeqEntrada = maxSeqEntrada + 1;
    const nextGuiaEntrada = `GE-${currentYear}-${nextSeqEntrada}`;

    return { nextGuiaSaida, nextProcesso, nextGuiaEntrada, nextGuia: nextGuiaSaida };
  };

  const resetMatriculaForm = () => {
    setEditingStudentId(null);
    setNewName('');
    setNewGender('');
    setNewClass(gridClass || (classesList[0] || ''));
    setNewSection(gridSection || (sectionsList[0] || ''));
    setNewPeriod('');
    setNewSpecialty('');
    setNewFatherName('');
    setNewMotherName('');
    setNewDocType('BI');
    setNewBi('');
    setNewBiSector('');
    setNewBiDate('');
    setNewCedulaRegisto('');
    setNewCedulaFls('');
    setNewCedulaLivro('');
    setNewCedulaAno('');
    setNewProvince('');
    setNewNaturalidade('');
    setNewBirthDate('');
    setNewContact('');
    setNewForeignLanguage('INGLÊS');
    setTransEscolaOrigem('');
    const { nextGuiaEntrada } = generateAutomaticTransferNumbers();
    setTransGuiaEntrada(nextGuiaEntrada);
    setTransProvOrigem('');
    setFormStep(1);
    setFormError('');
    setLinkingCandidateId(null);
  };

  const handleNewSpecialtyChange = (val: string) => {
    setNewSpecialty(val);
    const sections = getSectionsList(activeModality, val);
    if (sections.length > 0) {
      const currentLetter = newSection.split('-').pop() || 'A';
      const matched = sections.find(s => s.endsWith(`-${currentLetter}`) || s === currentLetter);
      if (matched) {
        setNewSection(matched);
      } else {
        setNewSection(sections[0]);
      }
    } else {
      setNewSection('');
    }
  };

  // Funções Auxiliares de Admissão de Candidatos
  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    if (!candName.trim()) {
      setCandError('Por favor, preencha o nome do candidato.');
      return;
    }
    if (!candGender) {
      setCandError('Por favor, selecione o género do candidato.');
      return;
    }
    if (!candBirthDate) {
      setCandError('Por favor, preencha a data de nascimento.');
      return;
    }
    if (!candDocNumber.trim()) {
      setCandError('Por favor, preencha o número do documento (B.I. / Cédula).');
      return;
    }

    if (candDocType === 'BI') {
      if (!candBiIssuerSector.trim()) {
        setCandError('Por favor, preencha o Sector de Emissão do B.I.');
        return;
      }
      if (!candBiIssueDate) {
        setCandError('Por favor, preencha a Data de Emissão do B.I.');
        return;
      }
    }

    if (!candProvince) {
      setCandError('Por favor, selecione a província de origem.');
      return;
    }
    if (!candNaturalidade.trim()) {
      setCandError('Por favor, preencha a naturalidade.');
      return;
    }
    if (!candContact.trim()) {
      setCandError('Por favor, preencha o contacto telefónico.');
      return;
    }
    if (!candFatherName.trim()) {
      setCandError('Por favor, preencha o nome do pai.');
      return;
    }
    if (!candMotherName.trim()) {
      setCandError('Por favor, preencha o nome da mãe.');
      return;
    }
    if (!candSubsystem) {
      setCandError('Por favor, selecione o Subsistema de Ensino.');
      return;
    }
    if (!candPeriod) {
      setCandError('Por favor, selecione o período pretendido.');
      return;
    }

    const numClass = parseInt(candClass, 10);
    // Para 10ª classe em diante, exige certificado de 9ª classe >= 12 valores
    if (numClass >= 10) {
      if (!candHasCert) {
        setCandError('O candidato deve obrigatoriamente possuir o certificado da 9.ª classe.');
        return;
      }
      if (candCertAvg < 12) {
        setCandError('A média do certificado deve ser igual ou superior a 12 valores.');
        return;
      }
    }

    if (candSubsystem === 'LICEU' && !candSpecialty) {
      setCandError('Por favor, selecione a Especialidade.');
      return;
    }
    if (candSubsystem === 'MAGISTERIO' && !candSpecialty) {
      setCandError('Por favor, selecione a Especialidade.');
      return;
    }

    const newCand: Candidate = {
      id: `CAND-${Date.now().toString().slice(-6)}`,
      name: formatarNomeProprio(candName),
      gender: candGender as 'M' | 'F',
      docType: candDocType,
      docNumber: candDocNumber.trim().toUpperCase(),
      biIssuerSector: candDocType === 'BI' ? candBiIssuerSector.trim() : undefined,
      biIssueDate: candDocType === 'BI' ? candBiIssueDate : undefined,
      subsystem: candSubsystem,
      birthDate: candBirthDate,
      province: candProvince,
      naturalidade: candNaturalidade.trim(),
      contact: candContact.trim(),
      fatherName: formatarNomeProprio(candFatherName),
      motherName: formatarNomeProprio(candMotherName),
      periodo: candPeriod as any,
      hasCertificate9Class: candHasCert,
      certificateAverage: candCertAvg,
      specialty: candSubsystem === 'ENSINO_PRIMARIO' ? '' : candSpecialty,
      foreignLanguage: candLang,
      selectedClass: candClass,
      status: 'Pendente'
    };

    // No Ensino Primário (1 a 6), isento de teste. Para 7ª, 8ª, 9ª classes, o apuramento é automático.
    if (numClass <= 9) {
      newCand.status = 'Aprovado'; // Apuramento/Aprovação automática
    }

    setCandidates(prev => [...prev, newCand]);
    setCandName('');
    setCandGender('');
    setCandDocNumber('');
    setCandBiIssuerSector('');
    setCandBiIssueDate('');
    setCandSubsystem(activeModality === 'PUNIV' ? 'LICEU' : activeModality === 'MAGISTERIO' ? 'MAGISTERIO' : 'ENSINO_PRIMARIO');
    setCandBirthDate('');
    setCandProvince('');
    setCandNaturalidade('');
    setCandContact('');
    setCandFatherName('');
    setCandMotherName('');
    setCandPeriod('');
    setCandHasCert(false);
    setCandCertAvg(12);
    setCandError('');
    setNotificacao({ tipo: 'success', mensagem: `Candidatura de ${newCand.name} gravada com sucesso!` });
    setComprovativoData({ type: 'CANDIDATURA', data: newCand });
  };

  const handleSaveGrades = (candId: string, p1: number, p2: number) => {
    setCandidates(prev => prev.map(c => {
      if (c.id === candId) {
        const media = Number(((p1 + p2) / 2).toFixed(1));
        const apurado = media >= 10 && media <= 20;
        return {
          ...c,
          prova1: p1,
          prova2: p2,
          mediaProvas: media,
          status: apurado ? 'Aprovado' : 'Não Apurado'
        };
      }
      return c;
    }));
  };

  const handleSelecaoAutomatica = () => {
    let updatedCandidates = [...candidates];
    // Listagem dinâmica das especialidades vigentes para a modalidade ativa
    const specs = getSpecialtiesForModality();
    const specialtiesList = specs.length > 0 ? specs.map(s => s.code) : ['EP', 'PE', 'LEMC', 'ING_EMC', 'FRA_EMC', 'MF', 'BQ'];
    
    specialtiesList.forEach(spec => {
      const specVagas = autoVagasPorEspecialidade[spec] !== undefined ? autoVagasPorEspecialidade[spec] : 30;
      const specCands = updatedCandidates.filter(c => c.specialty === spec && parseInt(c.selectedClass, 10) >= 10);
      
      specCands.sort((a, b) => {
        const scoreA = a.mediaProvas !== undefined ? a.mediaProvas : a.certificateAverage;
        const scoreB = b.mediaProvas !== undefined ? b.mediaProvas : b.certificateAverage;
        return scoreB - scoreA;
      });
      
      specCands.forEach((cand, index) => {
        const isWithinVagas = index < specVagas;
        const score = cand.mediaProvas !== undefined ? cand.mediaProvas : cand.certificateAverage;
        const isApprovedScore = score >= 10;
        
        const targetCand = updatedCandidates.find(c => c.id === cand.id);
        if (targetCand) {
          if (isWithinVagas && isApprovedScore) {
            targetCand.status = 'Aprovado';
          } else {
            targetCand.status = 'Não Apurado';
          }
        }
      });
    });
    
    setCandidates(updatedCandidates);
    setNotificacao({ tipo: 'success', mensagem: 'Processo de Seleção Automática executado com sucesso! Vagas calculadas automaticamente com base nas turmas e preenchidas por ordem de mérito decrescente.' });
  };

  const getClassifiedCandidates = (subsystem: 'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO', cls: string, spec: string) => {
    let filtered = candidates.filter(cand => {
      const cNum = parseInt(cand.selectedClass, 10);
      
      // Filtro de Classe
      if (cls !== 'All' && cand.selectedClass !== cls) {
        return false;
      }
      
      // Filtro de Especialidade
      if (spec !== 'All' && cand.specialty !== spec) {
        return false;
      }

      // Filtro de Subsistema
      if (subsystem === 'ENSINO_PRIMARIO') {
        return cNum >= 1 && cNum <= 9;
      } else if (subsystem === 'MAGISTERIO') {
        const magSpecs = ['PE', 'LEMC', 'ING_EMC', 'FRA_EMC', 'EVP', 'EDF'];
        return cNum >= 10 && (magSpecs.includes(cand.specialty) || activeModality === 'MAGISTERIO');
      } else if (subsystem === 'PUNIV') {
        const punSpecs = ['MF', 'BQ', 'CFB', 'CEJ', 'CS', 'AV', 'GH'];
        return cNum >= 10 && (punSpecs.includes(cand.specialty) || activeModality === 'PUNIV');
      }
      return true;
    });

    // Ordenar por nota decrescente
    filtered.sort((a, b) => {
      const scoreA = a.mediaProvas !== undefined ? a.mediaProvas : (a.certificateAverage || 0);
      const scoreB = b.mediaProvas !== undefined ? b.mediaProvas : (b.certificateAverage || 0);
      return scoreB - scoreA;
    });

    const counters: { [key: string]: number } = {};

    return filtered.map((cand) => {
      const score = cand.mediaProvas !== undefined ? cand.mediaProvas : cand.certificateAverage;
      const key = `${cand.selectedClass}-${cand.specialty || 'GERAL'}`;
      if (counters[key] === undefined) {
        counters[key] = 0;
      }

      let computedStatus: 'APROVADO' | 'REPROVADO' | 'EXCLUÍDO POR INSUFICIÊNCIA DE VAGAS' | 'PENDENTE' = 'PENDENTE';
      const isExento = parseInt(cand.selectedClass, 10) <= 6;
      const hasScore = cand.mediaProvas !== undefined || isExento || cand.certificateAverage !== undefined;

      if (!hasScore) {
        computedStatus = 'PENDENTE';
      } else {
        const currentScore = score !== undefined ? score : 12;
        if (currentScore < 10) {
          computedStatus = 'REPROVADO';
        } else {
          if (counters[key] < 75) {
            computedStatus = 'APROVADO';
            counters[key]++;
          } else {
            computedStatus = 'EXCLUÍDO POR INSUFICIÊNCIA DE VAGAS';
          }
        }
      }

      return {
        ...cand,
        computedStatus,
        score: score !== undefined ? score : (isExento ? 14 : undefined)
      };
    }).map((cand, index) => ({
      ...cand,
      posicao: index + 1
    }));
  };

  const exportResultadosPDF = (subsystem: 'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO', cls: string, spec: string) => {
    const list = getClassifiedCandidates(subsystem, cls, spec);
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const schoolName = schoolSettings?.schoolName || 'SIGEP - ACADEMIC';
    
    // 1. Insígnia da República / Logótipo no topo central
    const logoUrl = schoolSettings?.logoType === 'PUBLIC'
      ? (schoolSettings?.publicLogoUrl || schoolSettings?.privateLogoUrl)
      : (schoolSettings?.privateLogoUrl || schoolSettings?.publicLogoUrl);

    let currentY = 12;
    let emblemAdded = false;

    if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
      try {
        let format = 'PNG';
        if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) format = 'JPEG';
        else if (logoUrl.includes('image/gif')) format = 'GIF';
        doc.addImage(logoUrl, format, 97.5, currentY, 15, 15);
        emblemAdded = true;
        currentY += 18;
      } catch (err) {
        console.error("Erro ao adicionar insígnia ao PDF:", err);
      }
    }

    if (!emblemAdded) {
      doc.setDrawColor(220, 38, 38); // Red
      doc.setFillColor(254, 226, 226);
      doc.circle(105, currentY + 6, 6, 'FD');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(185, 28, 28);
      doc.text("ANGOLA", 105, currentY + 7.5, { align: 'center' });
      currentY += 16;
    }

    // 2. Cabeçalho Institucional (sem slogan e sem endereço no topo)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    doc.text("REPÚBLICA DE ANGOLA", 105, currentY, { align: 'center' });
    currentY += 4.5;

    doc.text("MINISTÉRIO DA EDUCAÇÃO", 105, currentY, { align: 'center' });
    currentY += 5.5;

    doc.setFontSize(11.5);
    doc.setTextColor(26, 54, 93); // Dark Blue
    doc.text(schoolName.toUpperCase(), 105, currentY, { align: 'center' });
    currentY += 5;

    // Linha divisória do cabeçalho
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(15, currentY, 195, currentY);
    currentY += 6;

    // 3. Título do Relatório com Nomes Simples
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    const subLabel = subsystem === 'ENSINO_PRIMARIO' ? 'Ensino Primário' : subsystem === 'PUNIV' ? 'Liceu' : 'Magistério';
    const clLabel = cls === 'All' || !cls ? 'Todas as Classes' : `${cls}ª Classe`;
    const fullSpecName = getSpecialtyFullName(spec);
    const specLabel = spec === 'All' || !spec
      ? 'Todas as Especialidades' 
      : (fullSpecName ? `${fullSpecName} (${spec})` : (spec === 'GERAL' ? 'Geral' : spec));

    doc.text("RESULTADO DE INSCRIÇÃO", 105, currentY, { align: 'center' });
    currentY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`Subsistema: ${subLabel} | Classe: ${clLabel} | Especialidade: ${specLabel}`, 105, currentY, { align: 'center' });
    currentY += 4.5;
    
    const dateStr = new Date().toLocaleDateString('pt-AO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em: ${dateStr}`, 105, currentY, { align: 'center' });
    currentY += 5;

    // 4. Preparar dados para autoTable
    const tableColumns = ["POSIÇÃO", "NOME COMPRETO", "GÉNERO", "NOTA DA PROVA / MÉDIA", "ESTADO DO PROCESSO"];
    const tableRows = list.map((cand) => {
      const scoreStr = cand.mediaProvas !== undefined 
        ? `${cand.mediaProvas.toFixed(1)} Val` 
        : (cand.certificateAverage ? `${cand.certificateAverage} Val (Certificado)` : '---');
      return [
        `#${cand.posicao}`,
        cand.name.toUpperCase(),
        cand.gender || '---',
        scoreStr,
        cand.computedStatus
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [tableColumns],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        font: "helvetica",
        textColor: [60, 60, 60]
      },
      headStyles: {
        fillColor: [26, 54, 93],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 40, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 50, fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.column.index === 4 && data.cell.section === 'body') {
          const status = data.cell.raw;
          if (status === 'APROVADO') {
            data.cell.styles.textColor = [0, 102, 204]; // Azul
          } else if (status === 'REPROVADO' || status === 'EXCLUÍDO POR INSUFICIÊNCIA DE VAGAS') {
            data.cell.styles.textColor = [204, 0, 0]; // Vermelho
          } else {
            data.cell.styles.textColor = [120, 120, 120]; // Cinzento
          }
        }
      },
      margin: { left: 15, right: 15 }
    });

    // 5. Elementos Debaixo da Grelha: Endereço Físico das Configurações e Assinatura do Director
    let finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : 200;
    if (finalY + 45 > 280) {
      doc.addPage();
      finalY = 30;
    }

    // Endereço Físico das Configurações do SIGEP
    const fullAddress = schoolSettings?.schoolAddress || (schoolSettings?.municipality 
      ? `${schoolSettings?.schoolName || ''}, ${schoolSettings?.municipality} - ${schoolSettings?.province}`
      : 'Endereço da Instituição');

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Endereço: ${fullAddress}`, 105, finalY, { align: 'center' });
    finalY += 14;

    // Assinatura Dinâmica do Director da Escola
    const directorRoleLabel = schoolSettings?.directorRoleLabel || 'O Director Geral';
    const directorName = schoolSettings?.directorName || 'Director Geral da Escola';

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(directorRoleLabel.toUpperCase(), 105, finalY, { align: 'center' });

    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.setLineWidth(0.4);
    doc.line(65, finalY + 6, 145, finalY + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`( ${directorName} )`, 105, finalY + 11, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("(Assinatura e carimbo em conformidade)", 105, finalY + 15, { align: 'center' });

    doc.save(`Resultado_Inscricao_${subsystem}_${cls}_${spec}.pdf`);
  };

  const handleDownloadComprovativo = (data: any, type: ComprovativoType = 'MATRICULA') => {
    downloadComprovativoPDF(data, type, schoolSettings);
  };

  const handleVincularCandidato = (cand: Candidate) => {
    setNewName(cand.name);
    setNewDocType(cand.docType);
    if (cand.docType === 'BI') {
      setNewBi(cand.docNumber);
      setNewCedulaRegisto('');
    } else {
      setNewCedulaRegisto(cand.docNumber);
      setNewBi('');
    }
    setNewSpecialty(cand.specialty || 'NENHUMA');
    setNewClass(cand.selectedClass || '1');
    setNewForeignLanguage(cand.foreignLanguage || 'INGLÊS');
    setNewGender(cand.gender || '');
    setNewBirthDate(cand.birthDate || (cand as any).candBirthDate || (cand as any).birth_date || '');
    setNewProvince(cand.province || '');
    setNewNaturalidade(cand.naturalidade || '');
    setNewContact(cand.contact || '');
    setNewFatherName(cand.fatherName || '');
    setNewMotherName(cand.motherName || '');
    setNewBiSector(cand.biIssuerSector || '');
    setNewBiDate(cand.biIssueDate || '');
    
    const candPeriod = cand.periodo || '';
    let mappedPeriod: 'Manhã' | 'Tarde' | 'Noite' | '' = '';
    if (candPeriod === 'Manhã' || candPeriod === 'Matinal') {
      mappedPeriod = 'Manhã';
    } else if (candPeriod === 'Tarde' || candPeriod === 'Vespertino') {
      mappedPeriod = 'Tarde';
    } else if (candPeriod === 'Noturno' || (candPeriod as string) === 'Noite') {
      mappedPeriod = 'Noite';
    }
    setNewPeriod(mappedPeriod);
    
    setLinkingCandidateId(cand.id);
    
    setAbaAtiva('REGULAR');
    setFormStep(1);
    setFormError('');
    setNotificacao({ tipo: 'success', mensagem: `Dados do candidato ${cand.name} vinculados! Todos os dados pessoais, de filiação, identificação e contacto foram herdados automaticamente. Complete o formulário para registar o aluno interno.` });
  };

  const handleReconfirmarMatriculaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    if (!reconfStudentId) {
      setReconfError('Por favor, selecione um estudante para reconfirmar a matrícula.');
      return;
    }
    if (!reconfNewClass) {
      setReconfError('Por favor, selecione a nova classe.');
      return;
    }
    if (!reconfNewSection) {
      setReconfError('Por favor, selecione a nova turma.');
      return;
    }
    if (!reconfNewPeriod) {
      setReconfError('Por favor, selecione o novo período letivo.');
      return;
    }

    const student = students.find(s => s.id === reconfStudentId);
    if (!student) {
      setReconfError('Estudante não encontrado.');
      return;
    }

    // Verificar se a turma de destino já possui 75 alunos cadastrados
    const studentsInTargetClass = students.filter(s => s.class === reconfNewClass && s.section === reconfNewSection && s.id !== reconfStudentId);
    if (studentsInTargetClass.length >= 75) {
      setReconfError(`Limite atingido! A ${reconfNewClass}ª Classe - Turma ${reconfNewSection} já possui o limite máximo de 75 alunos cadastrados.`);
      return;
    }

    const reconfReceiptData = {
      ...student,
      originalClassBeforePromotion: student.class,
      newClass: reconfNewClass,
      class: reconfNewClass,
      newSection: reconfNewSection,
      section: reconfNewSection,
      newPeriod: reconfNewPeriod,
      periodo: reconfNewPeriod,
      reconfDate: new Date().toLocaleDateString('pt-AO')
    };

    onAddStudent({
      ...student,
      originalClassBeforePromotion: student.class,
      class: reconfNewClass,
      section: reconfNewSection,
      periodo: reconfNewPeriod as any,
      estadoPromocao: 'Aguardando Próximo Ano Letivo'
    });

    setComprovativoData({ type: 'RECONFIRMACAO', data: reconfReceiptData });
    setReconfSuccess(`Matrícula reconfirmada com sucesso! Aluno ${student.name} promovido para a ${reconfNewClass}ª classe, mantendo o ID original ${student.id}. O estado do aluno foi atualizado para "Aguardando Próximo Ano Letivo".`);
    setReconfStudentId('');
    setReconfSearch('');
    setReconfError('');
  };

  const handleReverterPromocao = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const savedStaff = localStorage.getItem('sigep_staff_v1');
    let directorPass = '12345';
    try {
      if (savedStaff) {
        const parsed = JSON.parse(savedStaff);
        if (Array.isArray(parsed)) {
          const dir = parsed.find((s: any) => s.role === 'DIRECTOR_GERAL');
          if (dir && dir.password) directorPass = dir.password;
        }
      }
    } catch (e) {
      console.warn(e);
    }

    const typedPass = window.prompt('Atenção: Esta ação reverte o estado do aluno. Por favor, insira a senha do Diretor Geral para reverter esta promoção:');
    if (typedPass === null) return; // user cancelled

    if (typedPass.trim() !== directorPass.trim()) {
      alert('Senha incorreta! Apenas o Diretor Geral possui permissão para reverter esta promoção.');
      return;
    }

    onAddStudent({
      ...student,
      class: student.originalClassBeforePromotion || student.class,
      estadoPromocao: undefined,
      originalClassBeforePromotion: undefined
    });

    setReconfSuccess(`Promoção revertida com sucesso! O aluno ${student.name} voltou para a classe original (${student.originalClassBeforePromotion || student.class}ª Classe) e o seu nome voltou para a lista de candidatos.`);
    setReconfError('');
  };

  const resetSaidaForm = () => {
    setSaidaAlunoId('');
    setSaidaEscolaDestino('');
    const { nextGuiaSaida, nextProcesso } = generateAutomaticTransferNumbers();
    setSaidaGuiaSaida(nextGuiaSaida);
    setSaidaProcessoTransferencia(nextProcesso);
    setSaidaProvDestino('');
    setSaidaMotivo('');
  };

  const calculateAge = (dateString: string): number => {
    if (!dateString) return 0;
    const today = new Date();
    const birth = new Date(dateString);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  };

  // Handle Form Submission for Matricula (Regular ou Transferência)
  const handleMatriculaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }

    // 1. Validations
    if (!newName.trim()) {
      setFormStep(1);
      setFormError('Por favor, preencha o Nome Completo do Aluno.');
      return;
    }
    if (!newGender) {
      setFormStep(1);
      setFormError('Por favor, selecione o Género.');
      return;
    }
    if (!newClass) {
      setFormStep(1);
      setFormError('Por favor, selecione a Classe.');
      return;
    }
    if (!newSection) {
      setFormStep(1);
      setFormError('Por favor, selecione a Turma.');
      return;
    }
    if ((isPUNIV || isMagisterio) && !newSpecialty) {
      setFormStep(1);
      setFormError('Por favor, selecione a Especialidade.');
      return;
    }
    if (!newPeriod) {
      setFormStep(1);
      setFormError('Por favor, selecione o Período Letivo.');
      return;
    }

    // Document validation (optional)
    if (newDocType === 'BI' && newBi.trim()) {
      const biReg = /^[0-9]{9}[A-Za-z]{2}[0-9]{3}$/;
      if (!biReg.test(newBi.trim())) {
        setFormStep(1);
        setFormError('Formato de B.I. inválido. Deve possuir 14 caracteres (Ex: 005580255LN078).');
        return;
      }
    }

    if (!newFatherName.trim() || !newMotherName.trim()) {
      setFormStep(2);
      setFormError('Por favor, preencha a filiação completa (Pai e Mãe).');
      return;
    }

    if (!newContact.trim() || !newBirthDate || !newProvince || !newNaturalidade) {
      setFormStep(3);
      setFormError('Por favor, preencha os dados de residência, contacto e nascimento.');
      return;
    }

    // Se for entrada por transferência, validar campos adicionais
    if (abaAtiva === 'TRANSFERIDO_ENTRADA') {
      if (!transEscolaOrigem.trim()) {
        setFormStep(3);
        setFormError('Por favor, preencha o nome da Escola de Origem para a transferência.');
        return;
      }
      if (!transGuiaEntrada.trim()) {
        setFormStep(3);
        setFormError('Por favor, insira o número da Guia de Transferência.');
        return;
      }
      if (!transProvOrigem) {
        setFormStep(3);
        setFormError('Por favor, selecione a Província de Origem.');
        return;
      }
    }

    // Check limit of 75 students per class (excluding editing)
    const studentsInClass = students.filter(s => s.class === newClass && s.section === newSection && s.id !== editingStudentId);
    if (studentsInClass.length >= 75) {
      setFormStep(1);
      setFormError(`Limite atingido! A ${newClass}ª Classe - Turma ${newSection} já possui o limite máximo de 75 alunos cadastrados.`);
      return;
    }

    // 2. Confirmação Pop-up Obrigatória
    const acaoLabel = editingStudentId ? 'actualizar a matrícula' : (abaAtiva === 'TRANSFERIDO_ENTRADA' ? 'matricular este aluno via transferência' : 'matricular este novo aluno');
    const confirmacao = window.confirm(`Deseja realmente confirmar a acção de ${acaoLabel} no sistema SIGEP?`);
    if (!confirmacao) return;

    // Generate or use ID (Equivalência do ID ao Nº da Guia de Entrada para alunos transferidos)
    const candidateId = editingStudentId || (abaAtiva === 'TRANSFERIDO_ENTRADA' && transGuiaEntrada.trim() ? transGuiaEntrada.trim() : generateStudentId(newName, newClass, newSection, students.map(s => s.id)));

    // Save Student Object
    onAddStudent({
      id: candidateId,
      name: formatarNomeProprio(newName),
      gender: newGender as any,
      class: newClass,
      section: newSection,
      fatherName: formatarNomeProprio(newFatherName),
      motherName: formatarNomeProprio(newMotherName),
      docType: newDocType,
      bi: newDocType === 'BI' ? newBi.trim() : undefined,
      biSector: newDocType === 'BI' ? newBiSector.trim() : undefined,
      biDate: newDocType === 'BI' ? newBiDate : undefined,
      cedulaRegisto: newDocType === 'CEDULA' ? newCedulaRegisto.trim() : undefined,
      cedulaFls: newDocType === 'CEDULA' ? newCedulaFls.trim() : undefined,
      cedulaLivro: newDocType === 'CEDULA' ? newCedulaLivro.trim() : undefined,
      cedulaAno: newDocType === 'CEDULA' ? newCedulaAno.trim() : undefined,
      province: newProvince,
      naturalidade: newNaturalidade,
      birthDate: newBirthDate,
      contact: newContact.trim(),
      periodo: newPeriod as any,
      age: calculateAge(newBirthDate),
      foreignLanguage: isNivel3(newClass) ? newForeignLanguage : undefined,
      specialty: (isPUNIV || isMagisterio) ? newSpecialty as any : undefined,
      isTransferidoEntrada: abaAtiva === 'TRANSFERIDO_ENTRADA' ? true : (editingStudentId ? students.find(s => s.id === editingStudentId)?.isTransferidoEntrada : false),
      escolaOrigem: abaAtiva === 'TRANSFERIDO_ENTRADA' ? transEscolaOrigem.trim() : (editingStudentId ? students.find(s => s.id === editingStudentId)?.escolaOrigem : undefined),
      guiaTransferenciaEntrada: abaAtiva === 'TRANSFERIDO_ENTRADA' ? transGuiaEntrada.trim() : (editingStudentId ? students.find(s => s.id === editingStudentId)?.guiaTransferenciaEntrada : undefined),
      provinciaOrigem: abaAtiva === 'TRANSFERIDO_ENTRADA' ? transProvOrigem : (editingStudentId ? students.find(s => s.id === editingStudentId)?.provinciaOrigem : undefined)
    });

    // Atualizar estado de candidatos para "Matriculado" se houver correspondência de documento ou id vinculado
    const docNumToCheck = newDocType === 'BI' ? newBi.trim() : newCedulaRegisto.trim();
    if (linkingCandidateId || docNumToCheck) {
      setCandidates(prev => {
        const updated = prev.map(c => {
          if (linkingCandidateId && c.id === linkingCandidateId) {
            return { ...c, status: 'Matriculado' as const };
          }
          if (docNumToCheck && c.docNumber && c.docNumber.trim().toLowerCase() === docNumToCheck.toLowerCase()) {
            return { ...c, status: 'Matriculado' as const };
          }
          return c;
        });
        localStorage.setItem('sigep_candidates_v1', JSON.stringify(updated));
        return updated;
      });
      setLinkingCandidateId(null);
    }

    // 3. Sucesso Pop-up de Confirmação e Salvamento de Comprovativo no Servidor Central
    const studentReceiptData = {
      id: candidateId,
      name: formatarNomeProprio(newName),
      gender: newGender,
      docType: newDocType,
      bi: newDocType === 'BI' ? newBi.trim() : undefined,
      cedulaRegisto: newDocType === 'CEDULA' ? newCedulaRegisto.trim() : undefined,
      docNumber: newDocType === 'BI' ? newBi.trim() : newCedulaRegisto.trim(),
      birthDate: newBirthDate,
      class: newClass,
      section: newSection,
      fatherName: formatarNomeProprio(newFatherName),
      motherName: formatarNomeProprio(newMotherName),
      periodo: newPeriod,
      specialty: (isPUNIV || isMagisterio) ? newSpecialty : undefined,
      enrollmentDate: new Date().toLocaleDateString('pt-AO'),
      contact: newContact.trim()
    };

    // Salvar o comprovativo no computador local servidor central de forma transparente
    fetch('/api/comprovativos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ student: studentReceiptData })
    })
    .then(res => res.json())
    .then(data => {
      console.log('[SIGEP Central] Comprovativo salvo com sucesso no servidor:', data);
    })
    .catch(err => {
      console.error('[SIGEP Central] Erro ao salvar comprovativo no servidor:', err);
    });

    // Definir o estado para exibir o formulário sintético pós-matrícula com o ID destacado
    setComprovativoData({ type: 'MATRICULA', data: studentReceiptData });
    
    resetMatriculaForm();
    setFormStep(1);
    setAbaAtiva('REGULAR');
  };

  // Handle Saída por Transferência Submit
  const handleSaidaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }

    if (!saidaAlunoId) {
      setFormError('Por favor, selecione o Aluno que irá sair por transferência.');
      return;
    }
    if (!saidaEscolaDestino.trim()) {
      setFormError('Por favor, indique a Escola / Instituição de Destino.');
      return;
    }
    if (!saidaGuiaSaida.trim()) {
      setFormError('Por favor, preencha o número da Guia de Saída por Transferência.');
      return;
    }
    if (!saidaProvDestino) {
      setFormError('Por favor, indique a Província de Destino.');
      return;
    }
    if (!saidaMotivo.trim()) {
      setFormError('Por favor, indique o Motivo da transferência.');
      return;
    }

    // Verificar duplicidade de Guia ou Processo
    const duplicateGuia = students.some(st => st.guiaTransferenciaSaida === saidaGuiaSaida.trim() && st.id !== saidaAlunoId);
    if (duplicateGuia) {
      setFormError('Duplicidade detectada! Este Nº de Guia de Saída já existe no sistema.');
      return;
    }

    const aluno = students.find(s => s.id === saidaAlunoId);
    if (!aluno) return;

    // Confirmação Pop-up Obrigatória
    const confirmar = window.confirm(`Deseja realmente processar a SAÍDA POR TRANSFERÊNCIA do aluno "${aluno.name}" para a escola "${saidaEscolaDestino.trim()}"? Esta acção desactivará o aluno de pautas activas.`);
    if (!confirmar) return;

    // Atualizar aluno marcando isTransferidoSaida e dados relacionados
    const updatedAluno: Student = {
      ...aluno,
      isTransferidoSaida: true,
      dataTransferenciaSaida: new Date().toLocaleDateString('pt-AO'),
      escolaDestino: saidaEscolaDestino.trim(),
      guiaTransferenciaSaida: saidaGuiaSaida.trim(),
      processoTransferenciaSaida: saidaProcessoTransferencia.trim(),
      provinciaDestino: saidaProvDestino,
      motivoTransferencia: saidaMotivo.trim()
    };

    onAddStudent(updatedAluno);

    // Emissão Automática: Abrir o modal com Guia de Transferência e Boletim de Notas
    setModalTransferenciaEmissao({
      isOpen: true,
      student: updatedAluno,
      guiaNumero: saidaGuiaSaida.trim(),
      escolaDestino: saidaEscolaDestino.trim(),
      provinciaDestino: saidaProvDestino,
      motivo: saidaMotivo.trim()
    });

    resetSaidaForm();
    setAbaAtiva('LISTAGEM_GERAL');
  };

  // Processar Exclusão de Aluno
  const handleExcluirAluno = (id: string, name: string) => {
    if (!canEdit) {
      alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    const confirmar = window.confirm(`ATENÇÃO: Deseja realmente APAGAR permanentemente a matrícula do aluno "${name}" (ID: ${id})? Esta acção removerá também todo o histórico de notas e diários pedagógicos do aluno. Esta acção é IRREVERSÍVEL.`);
    if (!confirmar) return;

    onDeleteStudent(id);

    // Sucesso Pop-up de Confirmação
    window.alert(`Matrícula do aluno "${name}" eliminada com sucesso do sistema SIGEP.`);
  };

  const handleEditarAluno = (aluno: Student) => {
    setEditingStudentId(aluno.id);
    setNewName(aluno.name);
    setNewGender(aluno.gender || '');
    setNewClass(aluno.class);
    setNewSection(aluno.section);
    setNewPeriod(aluno.periodo || '');
    setNewSpecialty(aluno.specialty || '');
    setNewFatherName(aluno.fatherName || '');
    setNewMotherName(aluno.motherName || '');
    setNewDocType(aluno.docType || 'BI');
    setNewBi(aluno.bi || '');
    setNewBiSector(aluno.biSector || '');
    setNewBiDate(aluno.biDate || '');
    setNewCedulaRegisto(aluno.cedulaRegisto || '');
    setNewCedulaFls(aluno.cedulaFls || '');
    setNewCedulaLivro(aluno.cedulaLivro || '');
    setNewCedulaAno(aluno.cedulaAno || '');
    setNewProvince(aluno.province || '');
    setNewNaturalidade(aluno.naturalidade || '');
    setNewBirthDate(aluno.birthDate || '');
    setNewContact(aluno.contact || '');
    setNewForeignLanguage(aluno.foreignLanguage || 'INGLÊS');
    
    if (aluno.isTransferidoEntrada) {
      setAbaAtiva('TRANSFERIDO_ENTRADA');
      setTransEscolaOrigem(aluno.escolaOrigem || '');
      setTransGuiaEntrada(aluno.guiaTransferenciaEntrada || '');
      setTransProvOrigem(aluno.provinciaOrigem || '');
    } else {
      setAbaAtiva('REGULAR');
    }
    setFormStep(1);
    setFormError('');
  };

  // Filter students based on role scope and input filters
  const getFilteredStudents = () => {
    return students.filter(student => {
      // 1. Role boundaries for teachers (cannot view students out of scope)
      if (loggedInStaff && loggedInStaff.role === 'PROFESSOR') {
        const assignedClasses = loggedInStaff.classes || [];
        const assignedSections = loggedInStaff.sections || [];
        if (!assignedClasses.includes(student.class) || !assignedSections.includes(student.section)) {
          return false;
        }
      }

      // 2. Modality Filter
      const matchModality = (() => {
        const clsNum = parseInt(student.class, 10);
        if (activeModality === 'ENSINO_PRIMARIO') {
          return clsNum >= 1 && clsNum <= 9;
        } else if (activeModality === 'PUNIV') {
          return (clsNum >= 10 && clsNum <= 12) && (!student.specialty || ['CFB', 'CEJ', 'CS', 'AV'].includes(student.specialty));
        } else {
          return (clsNum >= 10 && clsNum <= 13) && (!student.specialty || ['MF', 'EP', 'BQ', 'LEMC', 'GH', 'PE'].includes(student.specialty));
        }
      })();
      if (!matchModality) return false;

      // 3. Other Filters
      const matchSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.id.toUpperCase().includes(searchTerm.toUpperCase());
      const matchClass = selectedClass === 'All' || student.class === selectedClass;
      const matchSection = selectedSection === 'All' || student.section === selectedSection;

      // Admissão Filter
      const matchAdmissao = (() => {
        if (selectedAdmissao === 'All') return true;
        if (selectedAdmissao === 'REGULAR') return !student.isTransferidoEntrada;
        if (selectedAdmissao === 'TRANSFERIDO') return !!student.isTransferidoEntrada;
        return true;
      })();

      // Situação Filter
      const matchSituacao = (() => {
        if (selectedSituacao === 'All') return true;
        if (selectedSituacao === 'ATIVOS') return !student.isTransferidoSaida;
        if (selectedSituacao === 'SAIDA') return !!student.isTransferidoSaida;
        return true;
      })();

      return matchSearch && matchClass && matchSection && matchAdmissao && matchSituacao;
    });
  };

  const filteredStudents = getFilteredStudents();

  // Filter options based on active component classes
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

  const menuItems = [
    {
      id: 'GRELHA_PAUTA' as AbaMatriculaType,
      title: 'GRELHA DE MATRÍCULAS (MODO PAUTA)',
      desc: 'Visualização rápida e lançamento direto de dados de matrícula.',
      icon: FileSpreadsheet,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400 group-hover:text-emerald-300',
      borderColor: 'border-slate-800 hover:border-emerald-500/40',
      glowColor: 'hover:shadow-emerald-500/5',
      onClick: () => { setAbaAtiva('GRELHA_PAUTA'); resetMatriculaForm(); }
    },
    {
      id: 'LISTAGEM_GERAL' as AbaMatriculaType,
      title: 'LISTAGEM & HISTÓRICO',
      desc: 'Consulte o histórico de matrículas e fichas individuais.',
      icon: History,
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-400 group-hover:text-indigo-300',
      borderColor: 'border-slate-800 hover:border-indigo-500/40',
      glowColor: 'hover:shadow-indigo-500/5',
      onClick: () => { setAbaAtiva('LISTAGEM_GERAL'); resetMatriculaForm(); }
    },
    {
      id: 'REGULAR' as AbaMatriculaType,
      title: 'MATRICULAR NOVO ALUNO',
      desc: 'Formulário oficial para nova inscrição regular.',
      icon: UserPlus,
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-400 group-hover:text-sky-300',
      borderColor: 'border-slate-800 hover:border-sky-500/40',
      glowColor: 'hover:shadow-sky-500/5',
      onClick: () => { setAbaAtiva('REGULAR'); resetMatriculaForm(); },
      hideIfProfessor: true
    },
    {
      id: 'TRANSFERIDO_ENTRADA' as AbaMatriculaType,
      title: 'ENTRADA POR TRANSFERÊNCIA',
      desc: 'Integre alunos vindos de outras escolas oficiais.',
      icon: MoveRight,
      iconBg: 'bg-teal-500/10',
      iconColor: 'text-teal-400 group-hover:text-teal-300',
      borderColor: 'border-slate-800 hover:border-teal-500/40',
      glowColor: 'hover:shadow-teal-500/5',
      onClick: () => { setAbaAtiva('TRANSFERIDO_ENTRADA'); resetMatriculaForm(); },
      hideIfProfessor: true
    },
    {
      id: 'TRANSFERIDO_SAIDA' as AbaMatriculaType,
      title: 'SAÍDA POR TRANSFERÊNCIA',
      desc: 'Emita guias e registe saída de alunos transferidos.',
      icon: MoveLeft,
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-400 group-hover:text-rose-300',
      borderColor: 'border-slate-800 hover:border-rose-500/40',
      glowColor: 'hover:shadow-rose-500/5',
      onClick: () => { setAbaAtiva('TRANSFERIDO_SAIDA'); resetSaidaForm(); setFormError(''); },
      hideIfProfessor: true
    },
    {
      id: 'PROCESSO_ADMISSAO' as AbaMatriculaType,
      title: 'CANDIDATURAS',
      desc: 'Administre fases de inscrição, exames e admissão.',
      icon: FileText,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400 group-hover:text-amber-300',
      borderColor: 'border-amber-500/30 hover:border-amber-500/60',
      glowColor: 'hover:shadow-amber-500/10',
      isOrangeSpecial: true,
      onClick: () => { setAbaAtiva('PROCESSO_ADMISSAO'); },
      hideIfProfessor: true
    },
    {
      id: 'RECONFIRMACAO' as AbaMatriculaType,
      title: 'RECONFIRMAÇÃO DE MATRÍCULA',
      desc: 'Atualize e valide a matrícula para o novo ano letivo.',
      icon: RefreshCw,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400 group-hover:text-purple-300',
      borderColor: 'border-slate-800 hover:border-purple-500/40',
      glowColor: 'hover:shadow-purple-500/5',
      onClick: () => { setAbaAtiva('RECONFIRMACAO'); setReconfSuccess(''); setReconfError(''); },
      hideIfProfessor: true
    }
  ];

  const activeItem = menuItems.find(item => item.id === abaAtiva);

  return (
    <div className="space-y-6">
      {comprovativoData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto select-none">
          <div className="bg-white rounded-3xl border border-slate-100 p-8 max-w-lg w-full shadow-2xl space-y-6 animate-fadeIn relative text-slate-800">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                comprovativoData.type === 'CANDIDATURA' 
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600'
                  : comprovativoData.type === 'RECONFIRMACAO'
                  ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'
              }`}>
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-slate-900 font-extrabold text-base uppercase tracking-tight">
                {comprovativoData.type === 'CANDIDATURA' && 'Candidatura Registrada com Sucesso!'}
                {comprovativoData.type === 'MATRICULA' && 'Matrícula Realizada com Sucesso!'}
                {comprovativoData.type === 'RECONFIRMACAO' && 'Reconfirmação de Matrícula Realizada!'}
              </h2>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider font-mono">
                SIGEP • {
                  comprovativoData.type === 'CANDIDATURA' ? 'Comprovativo de Candidatura / Inscrição' :
                  comprovativoData.type === 'RECONFIRMACAO' ? 'Comprovativo de Reconfirmação de Matrícula' :
                  'Comprovativo de Cadastro Escolar'
                }
              </p>
            </div>

            {/* Unique ID Highlight */}
            <div className={`text-center p-4 rounded-2xl border ${
              comprovativoData.type === 'CANDIDATURA' ? 'bg-amber-50/60 border-amber-100 text-amber-800' :
              comprovativoData.type === 'RECONFIRMACAO' ? 'bg-blue-50/60 border-blue-100 text-blue-800' :
              'bg-indigo-50/60 border-indigo-100 text-indigo-800'
            }`}>
              <span className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">
                {comprovativoData.type === 'CANDIDATURA' ? 'Código Único de Candidatura (ID)' : 'Código de Identificação Único (ID)'}
              </span>
              <span className="text-xl sm:text-2xl font-black tracking-tight font-mono leading-none block mt-1" style={{ fontSize: '18px' }}>
                {comprovativoData.data.id || comprovativoData.data.candId || '—'}
              </span>
            </div>

            {/* Details Grid */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="border-b border-slate-100 pb-2">
                <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">
                  {comprovativoData.type === 'CANDIDATURA' ? 'Nome do Candidato' : 'Nome do Aluno'}
                </span>
                <span className="font-extrabold text-slate-800 uppercase">
                  {comprovativoData.data.name || comprovativoData.data.candName}
                </span>
              </div>

              {comprovativoData.type === 'CANDIDATURA' ? (
                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                  <div>
                    <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Classe Pretendida</span>
                    <span className="font-bold text-slate-700">{comprovativoData.data.selectedClass || comprovativoData.data.class}ª Classe</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Estado</span>
                    <span className="font-bold text-amber-700">{comprovativoData.data.status || 'Pendente'}</span>
                  </div>
                </div>
              ) : comprovativoData.type === 'RECONFIRMACAO' ? (
                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                  <div>
                    <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Nova Classe (Promovido)</span>
                    <span className="font-bold text-slate-700">{comprovativoData.data.newClass || comprovativoData.data.class}ª Classe</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Nova Turma</span>
                    <span className="font-bold text-slate-700">Turma {comprovativoData.data.newSection || comprovativoData.data.section}</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                  <div>
                    <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Classe de Ingresso</span>
                    <span className="font-bold text-slate-700">{comprovativoData.data.class}ª Classe</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Turma Atribuída</span>
                    <span className="font-bold text-slate-700">Turma {comprovativoData.data.section}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                <div>
                  <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Período / Turno</span>
                  <span className="font-bold text-slate-700">{comprovativoData.data.periodo || comprovativoData.data.newPeriod || comprovativoData.data.candPeriod || '—'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Género</span>
                  <span className="font-bold text-slate-700">{(comprovativoData.data.gender || comprovativoData.data.candGender) === 'M' ? 'Masculino' : 'Feminino'}</span>
                </div>
              </div>

              {(comprovativoData.data.specialty || comprovativoData.data.candSpecialty) && (
                <div className="border-b border-slate-100 pb-2">
                  <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Curso / Especialidade</span>
                  <span className="font-bold text-slate-700">{comprovativoData.data.specialty || comprovativoData.data.candSpecialty}</span>
                </div>
              )}

              <div className="border-b border-slate-100 pb-2">
                <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Filiação</span>
                <span className="block font-semibold text-slate-600">Pai: {comprovativoData.data.fatherName || comprovativoData.data.candFatherName || '—'}</span>
                <span className="block font-semibold text-slate-600">Mãe: {comprovativoData.data.motherName || comprovativoData.data.candMotherName || '—'}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                <div>
                  <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Contacto</span>
                  <span className="font-bold text-slate-700 font-mono">{comprovativoData.data.contact || comprovativoData.data.candContact || '—'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Data de Registo</span>
                  <span className="font-bold text-slate-700 font-mono">{comprovativoData.data.enrollmentDate || comprovativoData.data.reconfDate || new Date().toLocaleDateString('pt-AO')}</span>
                </div>
              </div>
            </div>

            {/* Server storage message */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-700 font-medium leading-relaxed">
              * O comprovativo oficial foi registado no sistema SIGEP Central. O estudante/candidato pode descarregá-lo a qualquer momento. Clique abaixo para descarregar o PDF oficial.
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  downloadComprovativoPDF(comprovativoData.data, comprovativoData.type, schoolSettings);
                  setComprovativoData(null);
                }}
                className={`flex-1 text-white font-extrabold text-xs uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg align-middle text-center ${
                  comprovativoData.type === 'CANDIDATURA' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/10' :
                  comprovativoData.type === 'RECONFIRMACAO' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/10' :
                  'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
                }`}
              >
                <Download className="w-4 h-4 inline-block" />
                <span className="align-middle inline-block ml-1">Descarregar PDF</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setComprovativoData(null);
                }}
                className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer border border-slate-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {!canEdit && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">Privilégio Restrito: Apenas Leitura</p>
            <p className="text-[10px] text-amber-700 leading-normal mt-0.5 font-semibold">O Director Geral configurou as permissões deste cargo para visualização estrita. Todas as funções de nova matrícula, reconfirmação, transferência ou eliminação de alunos encontram-se temporariamente suspensas.</p>
          </div>
        </div>
      )}
      
      {/* 1. ESTRUTURA DE NAVEGAÇÃO SUPERIOR (BREADCRUMB) */}
      <div id="sigep-matriculas-breadcrumb" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 mb-4">
        <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
          <span className="hover:text-slate-600 transition-colors">Área Académica</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className={`${abaAtiva === 'MENU' ? 'text-indigo-600' : 'text-slate-400'} hover:text-slate-600 transition-colors`}>Matrículas & Movimentações</span>
          {abaAtiva !== 'MENU' && activeItem && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-indigo-600 font-extrabold">{activeItem.title}</span>
            </>
          )}
        </div>

        {abaAtiva !== 'MENU' && (
          <button
            id="btn-breadcrumb-voltar"
            type="button"
            onClick={() => setAbaAtiva('MENU')}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-black tracking-wider text-indigo-650 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/40 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Painel de Matrículas</span>
          </button>
        )}
      </div>

      {/* 2. INTERFACE PRINCIPAL (ESTADO INICIAL - LISTA DE CARDS) */}
      {abaAtiva === 'MENU' ? (
        <div id="painel-principal-cards" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch animate-fadeIn">
          {/* Lado Esquerdo: Título e Descrição */}
          <div id="painel-central-info" className="lg:col-span-4 flex">
            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-8 flex flex-col justify-between w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
              
              <div className="space-y-5 relative z-10">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-450">
                  <User className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase leading-snug">
                    Painel Central de Matrículas & Movimentações
                  </h2>
                  <div className="h-1 w-12 bg-indigo-500 rounded-full"></div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  Seja bem-vindo ao módulo de gestão centralizada de fluxo discente. Execute matrículas regulares, registe saídas oficiais, administre transferências entre instituições e acompanhe as fases do processo de candidatura de novos alunos.
                </p>
              </div>

              <div id="painel-central-ciclo-status" className="border-t border-slate-800/80 pt-6 mt-8 relative z-10">
                <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-2">Ciclo de Ensino Ativo</span>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/15 text-indigo-300 text-xs font-black">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                  {activeModality === 'ENSINO_PRIMARIO' ? 'Ensino Primário (1ª à 9ª Classe)' : activeModality === 'PUNIV' ? 'PUNIV / Secundário Geral' : 'Magistério / Formação Pedagógica'}
                </div>
              </div>
            </div>
          </div>

          {/* Lado Direito: Grid de Cards */}
          <div id="painel-grid-opcoes" className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menuItems.map((item) => {
                if (item.hideIfProfessor && userRole === 'PROFESSOR') return null;
                const Icon = item.icon;
                
                return (
                  <button
                    key={item.id}
                    id={`menu-card-${item.id.toLowerCase()}`}
                    type="button"
                    onClick={item.onClick}
                    className={`group text-left p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between h-[165px] ${
                      item.isOrangeSpecial
                        ? 'bg-gradient-to-br from-slate-900 to-amber-950/20 border-amber-500/30 hover:border-amber-500/70 shadow-lg shadow-amber-500/5'
                        : 'bg-slate-900 border-slate-800 hover:border-indigo-500/60 hover:bg-slate-850/80 shadow-lg shadow-slate-950/20'
                    } ${item.glowColor}`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className={`w-11 h-11 ${item.iconBg} rounded-xl flex items-center justify-center ${item.iconColor} group-hover:scale-110 transition-transform duration-300 border border-white/5`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                    </div>
                    
                    <div className="space-y-1.5 mt-4">
                      <h4 className={`text-xs font-black tracking-wider uppercase ${item.isOrangeSpecial ? 'text-amber-400' : 'text-slate-100'}`}>
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* 3. PAINEL DO SUBMENU ATIVO (ESTADO DE VISUALIZAÇÃO) */
        <div id="painel-submenu-ativo" className="space-y-6 animate-fadeIn">
          {/* Cabeçalho do Submenu Ativo */}
          <div id="submenu-ativo-header" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-450 shrink-0">
                {activeItem && React.createElement(activeItem.icon, { className: "w-6 h-6" })}
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight text-slate-100 uppercase">
                  {activeItem?.title}
                </h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  {activeItem?.desc}
                </p>
              </div>
            </div>

            <button
              id="btn-voltar-menu-principal"
              type="button"
              onClick={() => setAbaAtiva('MENU')}
              className="px-4 py-2 text-xs font-black tracking-wider text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          </div>

          {/* Container Escuro Reservado para renderizar o componente específico */}
          <div id="submenu-component-container" className="bg-slate-900 border border-slate-850 p-6 rounded-3xl shadow-2xl">

      {/* 2. FORMULÁRIO DE MATRÍCULA (REGULAR OU TRANSFERÊNCIA DE ENTRADA) */}
      {(abaAtiva === 'REGULAR' || abaAtiva === 'TRANSFERIDO_ENTRADA') && (
        <form onSubmit={handleMatriculaSubmit} className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-md space-y-6 animate-pulseOnce">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <span>
                  {editingStudentId ? 'Editar Cadastro de Aluno' : (abaAtiva === 'TRANSFERIDO_ENTRADA' ? 'Ficha de Matrícula: Entrada por Transferência' : 'Ficha de Nova Matrícula Regular')}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Preencha as secções da ficha. Os campos com asterisco (*) são obrigatórios segundo as diretrizes curriculares nacionais.
              </p>
            </div>

            {/* Stepper indicators */}
            <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              <span className={`px-2 py-0.5 rounded ${formStep === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>1. Identidade</span>
              <span>•</span>
              <span className={`px-2 py-0.5 rounded ${formStep === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>2. Filiação</span>
              <span>•</span>
              <span className={`px-2 py-0.5 rounded ${formStep === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>3. Escola</span>
            </div>
          </div>

          {formError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* PASSO 1: IDENTIFICAÇÃO DO ALUNO */}
          {formStep === 1 && (
            <div className="space-y-6 animate-slideRight">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-1">Secção 1: Identificação Civil do Aluno</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nome Completo do Aluno *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={() => setNewName(formatarNomeProprio(newName))}
                    autoCapitalize="words"
                    placeholder="Ex: Manuel António Chilombo"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Nota: Insira o nome respeitando a norma ortográfica. O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Gênero / Sexo *</label>
                  <select
                    value={newGender}
                    required
                    onChange={(e) => setNewGender(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer"
                  >
                    <option value="">Seleccione...</option>
                    <option value="M">Masculino (M)</option>
                    <option value="F">Feminino (F)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tipo de Identificação *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewDocType('BI')}
                      className={`py-2 rounded-xl text-xs font-bold border ${newDocType === 'BI' ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-black' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                    >
                      B.I. (Nacional)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDocType('CEDULA')}
                      className={`py-2 rounded-xl text-xs font-bold border ${newDocType === 'CEDULA' ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-black' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                    >
                      Cédula / Reg.
                    </button>
                  </div>
                </div>
              </div>

              {newDocType === 'BI' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nº do Bilhete de Identidade (B.I.) *</label>
                    <input
                      type="text"
                      value={newBi}
                      onChange={(e) => setNewBi(e.target.value.trim().toUpperCase())}
                      placeholder="Ex: 005580255LN078"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono font-bold focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Sector de Emissão do B.I. *</label>
                    <BiSectorSelect
                      value={newBiSector}
                      onChange={setNewBiSector}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Data de Emissão do B.I. *</label>
                    <input
                      type="date"
                      value={newBiDate}
                      onChange={(e) => setNewBiDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nº de Registo *</label>
                    <input
                      type="text"
                      value={newCedulaRegisto}
                      onChange={(e) => setNewCedulaRegisto(e.target.value)}
                      placeholder="Ex: 40552"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Folha (Fls) *</label>
                    <input
                      type="text"
                      value={newCedulaFls}
                      onChange={(e) => setNewCedulaFls(e.target.value)}
                      placeholder="Ex: 88"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Livro Nº *</label>
                    <input
                      type="text"
                      value={newCedulaLivro}
                      onChange={(e) => setNewCedulaLivro(e.target.value)}
                      placeholder="Ex: 12"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Ano de Emissão Cédula *</label>
                    <input
                      type="text"
                      value={newCedulaAno}
                      onChange={(e) => setNewCedulaAno(e.target.value)}
                      placeholder="Ex: 2018"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASSO 2: FILIAÇÃO, RESIDÊNCIA E CONTACTO */}
          {formStep === 2 && (
            <div className="space-y-6 animate-slideRight">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-1">Secção 2: Filiação, Residência e Contactos</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nome do Pai *</label>
                  <input
                    type="text"
                    required
                    value={newFatherName}
                    onChange={(e) => setNewFatherName(e.target.value)}
                    onBlur={() => setNewFatherName(formatarNomeProprio(newFatherName))}
                    autoCapitalize="words"
                    placeholder="Ex: António Manuel Chilombo"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Nota: Insira o nome respeitando a norma ortográfica. O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nome da Mãe *</label>
                  <input
                    type="text"
                    required
                    value={newMotherName}
                    onChange={(e) => setNewMotherName(e.target.value)}
                    onBlur={() => setNewMotherName(formatarNomeProprio(newMotherName))}
                    autoCapitalize="words"
                    placeholder="Ex: Maria Joana Calueio"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Nota: Insira o nome respeitando a norma ortográfica. O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Província de Angola *</label>
                  <select
                    value={newProvince}
                    required
                    onChange={(e) => {
                      setNewProvince(e.target.value);
                      setNewNaturalidade('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer"
                  >
                    <option value="">Seleccione...</option>
                    {Object.keys(LOCALIDADES_ANGOLA).map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Município / Naturalidade *</label>
                  <select
                    value={newNaturalidade}
                    required
                    disabled={!newProvince}
                    onChange={(e) => setNewNaturalidade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Seleccione...</option>
                    {newProvince && LOCALIDADES_ANGOLA[newProvince]?.map(mun => (
                      <option key={mun} value={mun}>{mun}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Data de Nascimento *</label>
                  <input
                    type="date"
                    required
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Contacto Telefónico *</label>
                  <input
                    type="tel"
                    required
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    placeholder="Ex: 923 456 789"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASSO 3: PARAMETRIZAÇÃO ESCOLAR E CURRICULAR */}
          {formStep === 3 && (
            <div className="space-y-6 animate-slideRight">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-1">Secção 3: Parametrizar Escolaridade e Grelha</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Classe Letiva *</label>
                  <select
                    value={newClass}
                    required
                    onChange={(e) => {
                      setNewClass(e.target.value);
                      setNewSection('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer"
                  >
                    <option value="">Seleccione...</option>
                    {classesList.map(c => (
                      <option key={c} value={c}>{c}ª Classe</option>
                    ))}
                  </select>
                </div>

                {/* Especialidade se for PUNIV ou Magistério */}
                {(isPUNIV || isMagisterio) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Especialidade *</label>
                    {isPUNIV ? (
                      <select
                        value={newSpecialty}
                        required
                        onChange={(e) => handleNewSpecialtyChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer"
                      >
                        <option value="">Seleccione...</option>
                        <option value="CFB">Ciências Físicas e Biológicas (CFB)</option>
                        <option value="CEJ">Ciências Económico-Jurídicas (CEJ)</option>
                        <option value="CS">Ciências Sociais / Humanas (CS)</option>
                        <option value="AV">Artes Visuais (AV)</option>
                      </select>
                    ) : (
                      <select
                        value={newSpecialty}
                        required
                        onChange={(e) => handleNewSpecialtyChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer"
                      >
                        <option value="">Seleccione...</option>
                        <option value="MF">Matemática e Física (Mat-Fisica)</option>
                        <option value="GH">História e Geografia (Geo-Historia)</option>
                        <option value="BQ">Biologia e Química (Bio-química)</option>
                        <option value="LEMC">Português e EMC (L.EMC)</option>
                        <option value="ING_EMC">Inglês e EMC</option>
                        <option value="FRA_EMC">Francês e EMC</option>
                        <option value="EVP">Educação Visual e Plástica (EVP)</option>
                        <option value="EDF">Educação Física (Ed.F)</option>
                        <option value="EMC">Educação Moral e Cívica (EMC)</option>
                        <option value="EP">Ensino Primário</option>
                        <option value="PE">Pré-Escolar</option>
                      </select>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Período / Turno *</label>
                  <select
                    value={newPeriod}
                    required
                    onChange={(e) => setNewPeriod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer"
                  >
                    <option value="">Seleccione...</option>
                    <option value="Manhã">Manhã (Regular)</option>
                    <option value="Tarde">Tarde (Regular)</option>
                    <option value="Noite">Noite (Pós-laboral)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Turma Escolar *</label>
                  <select
                    value={newSection}
                    required
                    disabled={!newClass}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Seleccione...</option>
                    {getSectionsList(activeModality, newSpecialty).map(s => {
                      const enrolledCount = students.filter(st => st.class === newClass && st.section === s && st.id !== editingStudentId).length;
                      const isFull = enrolledCount >= 75;
                      return (
                        <option key={s} value={s} disabled={isFull}>
                          Turma {s} {isFull ? ' - 🚫 SEM VAGAS (75/75)' : ` (${75 - enrolledCount} Vagas)`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Seletor de Língua Estrangeira independente com as regras exatas */}
                {showForeignLanguageSelectorEnrollment() && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Língua Estrangeira *</label>
                    <select
                      value={newForeignLanguage}
                      onChange={(e) => setNewForeignLanguage(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer"
                    >
                      <option value="INGLÊS">Inglês</option>
                      <option value="FRANCÊS">Francês</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Informação sobre limite de capacidade de 75 alunos por turma e vagas disponíveis */}
              {newClass && newSection && (() => {
                const totalInClass = students.filter(s => s.class === newClass && s.section === newSection && s.id !== editingStudentId).length;
                const vagasDisponiveis = 75 - totalInClass;
                const isFull = vagasDisponiveis <= 0;

                return (
                  <div className={`p-4.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isFull
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : totalInClass > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full inline-block ${isFull ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Estado de Ocupação da Turma: {newClass}ª Classe • Turma {newSection}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 font-bold">
                        Capacidade Máxima Estabelecida: <span className="text-slate-800 font-extrabold">75 Alunos</span> | Alunos Matriculados Correntes: <span className="text-indigo-600 font-extrabold">{totalInClass}</span>
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      {isFull ? (
                        <div className="bg-rose-200 text-rose-950 px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide inline-flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                          <span>🚫 Sem Vagas Disponíveis (75/75)</span>
                        </div>
                      ) : (
                        <div className="bg-emerald-200 text-emerald-950 px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide inline-flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>Vagas Disponíveis: {vagasDisponiveis} / 75</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Se for entrada por transferência, exigir dados adicionais detalhados */}
              {abaAtiva === 'TRANSFERIDO_ENTRADA' && (
                <div className="p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100/80 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-xs font-black text-indigo-950 uppercase tracking-wider">Dados Oficiais da Escola de Proveniência (Entrada por Transferência)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-indigo-950 mb-1.5">Escola de Origem (Angola) *</label>
                      <input
                        type="text"
                        required
                        value={transEscolaOrigem}
                        onChange={(e) => setTransEscolaOrigem(e.target.value)}
                        placeholder="Ex: Complexo Escolar Nº 4022"
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-indigo-950">Nº da Guia de Transferência (Entrada) *</label>
                        <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 uppercase tracking-wide">Atribuído Automático</span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={transGuiaEntrada}
                          onChange={(e) => setTransGuiaEntrada(e.target.value)}
                          placeholder="Ex: GE-2026-80101"
                          className="w-full bg-slate-50 border border-indigo-200 rounded-xl pl-3.5 pr-16 py-2.5 text-xs text-slate-800 font-mono font-bold focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const { nextGuiaEntrada } = generateAutomaticTransferNumbers();
                            setTransGuiaEntrada(nextGuiaEntrada);
                          }}
                          title="Gerar Novo Nº de Guia de Entrada Automático"
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Auto</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-indigo-950 mb-1.5">Província de Origem *</label>
                      <select
                        value={transProvOrigem}
                        required
                        onChange={(e) => setTransProvOrigem(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">Seleccione...</option>
                        {Object.keys(LOCALIDADES_ANGOLA).map(prov => (
                          <option key={prov} value={prov}>{prov}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTROLADORES DE PASSOS E SUBMISSÃO */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <div>
              {formStep > 1 ? (
                <button
                  type="button"
                  onClick={() => { setFormStep(formStep - 1); setFormError(''); }}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Passo Anterior</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const confirmacao = window.confirm("Deseja realmente limpar toda a ficha e cancelar a matrícula corrente?");
                    if (confirmacao) {
                      const wasLinking = !!linkingCandidateId;
                      resetMatriculaForm();
                      setLinkingCandidateId(null);
                      if (wasLinking) {
                        setAbaAtiva('PROCESSO_ADMISSAO');
                      } else {
                        setAbaAtiva('LISTAGEM_GERAL');
                      }
                    }
                  }}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar Matrícula
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const confirmar = window.confirm("Limpar todos os campos digitados na ficha?");
                  if (confirmar) {
                    resetMatriculaForm();
                  }
                }}
                className="px-3.5 py-2 hover:bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>

              {formStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    // Validations per step
                    if (formStep === 1) {
                      if (!newName.trim() || !newGender) {
                        setFormError('Por favor preencha todos os campos obrigatórios (*) deste passo (Nome e Género) antes de avançar.');
                        return;
                      }
                      // B.I. and Cédula are optional, allowing users to proceed without them.
                      if (newDocType === 'BI' && newBi.trim()) {
                        const biReg = /^[0-9]{9}[A-Za-z]{2}[0-9]{3}$/;
                        if (!biReg.test(newBi.trim())) {
                          setFormError('Se preenchido, o formato de B.I. deve ser válido (Ex: 005580255LN078).');
                          return;
                        }
                      }
                    }
                    if (formStep === 2) {
                      if (!newFatherName.trim() || !newMotherName.trim()) {
                        setFormError('Por favor preencha a filiação completa (Nome do Pai e da Mãe) antes de avançar.');
                        return;
                      }
                    }
                    setFormStep(formStep + 1);
                    setFormError('');
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <span>Avançar Passo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  Homologar Matrícula no SIGEP
                </button>
              )}
            </div>
          </div>

        </form>
      )}

      {/* 3. FORMULÁRIO DE PROCESSO DE SAÍDA POR TRANSFERÊNCIA */}
      {abaAtiva === 'TRANSFERIDO_SAIDA' && (
        <form onSubmit={handleSaidaSubmit} className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-md space-y-6 animate-pulseOnce">
          
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Globe className="w-5 h-5 text-rose-500" />
              <span>Processar Guia de Saída por Transferência</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Seleccione um aluno activo do sistema e registe as informações da escola de destino para emissão da Guia de Saída.
            </p>
          </div>

          {formError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Seletor de Aluno Ativo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Escolha o Aluno Activo *</label>
              <select
                value={saidaAlunoId}
                required
                onChange={(e) => setSaidaAlunoId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer"
              >
                <option value="">Seleccione o Aluno...</option>
                {students.filter(s => !s.isTransferidoSaida).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} - ID: {s.id} ({s.class}ª Cl - Turma {s.section})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Escola / Colégio de Destino (Escola Receptora) *</label>
              <input
                type="text"
                required
                value={saidaEscolaDestino}
                onChange={(e) => setSaidaEscolaDestino(e.target.value)}
                placeholder="Ex: Instituto Médio de Educação do Huambo"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Nº de Guia de Saída Homologada *</label>
                <span className="text-[9px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wide">Atribuído Automático</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={saidaGuiaSaida}
                  onChange={(e) => setSaidaGuiaSaida(e.target.value)}
                  placeholder="Ex: GS-2026-90412"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-16 py-2.5 text-xs text-slate-800 font-mono font-bold focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    const { nextGuiaSaida } = generateAutomaticTransferNumbers();
                    setSaidaGuiaSaida(nextGuiaSaida);
                  }}
                  title="Gerar Novo Nº de Guia de Saída Automático"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Auto</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Província de Destino *</label>
              <select
                value={saidaProvDestino}
                required
                onChange={(e) => setSaidaProvDestino(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer"
              >
                <option value="">Seleccione...</option>
                {Object.keys(LOCALIDADES_ANGOLA).map(prov => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Motivo Principal de Transferência *</label>
              <input
                type="text"
                required
                value={saidaMotivo}
                onChange={(e) => setSaidaMotivo(e.target.value)}
                placeholder="Ex: Mudança de residência dos encarregados"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                resetSaidaForm();
                setAbaAtiva('LISTAGEM_GERAL');
              }}
              className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar Processo
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-rose-600 hover:bg-rose-750 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-rose-600/10"
            >
              Homologar Guia de Saída (Transferência)
            </button>
          </div>

        </form>
      )}

      {/* 4. GRELHA DE MATRÍCULAS (MÓDULO DE LANÇAMENTO DIRETO ESTILO PAUTA/MINI PAUTA) */}
      {abaAtiva === 'GRELHA_PAUTA' && (
        <div className="space-y-5 animate-pulseOnce" id="painel-grelha-pauta">
          {/* Seletor de Classe/Turma e Botões de Lançamento */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Classe para Lançamento</label>
                  <select
                    value={gridClass || (classesList[0] || '1')}
                    onChange={(e) => {
                      setGridClass(e.target.value);
                      setGridEditingId(null);
                    }}
                    className="bg-white border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-black text-slate-700 cursor-pointer focus:border-indigo-500"
                  >
                    {classesList.map(c => (
                      <option key={c} value={c}>{c}ª Classe</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Turma / Secção</label>
                  <select
                    value={gridSection || (sectionsList[0] || 'A')}
                    onChange={(e) => {
                      setGridSection(e.target.value);
                      setGridEditingId(null);
                    }}
                    className="bg-white border border-slate-250 rounded-lg px-3 py-1.5 text-xs font-black text-slate-700 cursor-pointer focus:border-indigo-500"
                  >
                    {sectionsList.map(s => (
                      <option key={s} value={s}>Turma {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botões rápidos de ação de matrícula */}
              {userRole !== 'PROFESSOR' && (() => {
                const curCls = gridClass || (classesList[0] || '1');
                const curSec = gridSection || (sectionsList[0] || 'A');
                const totalInSelectedTurma = students.filter(s => s.class === curCls && s.section === curSec).length;
                const isTurmaFull = totalInSelectedTurma >= 75;

                return (
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={isTurmaFull}
                      onClick={() => {
                        if (isTurmaFull) return;
                        setNewClass(curCls);
                        setNewSection(curSec);
                        setAbaAtiva('REGULAR');
                        setFormStep(1);
                      }}
                      className={`text-[11px] font-extrabold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 border-0 shadow-md ${
                        isTurmaFull
                          ? 'bg-rose-100 border border-rose-200 text-rose-800 cursor-not-allowed shadow-none'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10 cursor-pointer'
                      }`}
                    >
                      {isTurmaFull ? <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-bounce" /> : <UserPlus className="w-3.5 h-3.5" />}
                      <span>{isTurmaFull ? 'Turma Sem Vagas (75/75)' : 'Matricular Aluno Regular'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isTurmaFull}
                      onClick={() => {
                        if (isTurmaFull) return;
                        setNewClass(curCls);
                        setNewSection(curSec);
                        setAbaAtiva('TRANSFERIDO_ENTRADA');
                        setFormStep(1);
                      }}
                      className={`text-[11px] font-extrabold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 border-0 shadow-md ${
                        isTurmaFull
                          ? 'bg-rose-100 border border-rose-200 text-rose-800 cursor-not-allowed shadow-none'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10 cursor-pointer'
                      }`}
                    >
                      {isTurmaFull ? <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-bounce" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                      <span>{isTurmaFull ? 'Turma Sem Vagas (75/75)' : 'Importar Aluno por Transferência'}</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Grelha de Alunos em Modo Pauta */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/60 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full inline-block animate-pulse"></span>
                  Grelha de Matrículas e Identidades: {(gridClass || classesList[0])}ª Classe • Turma {(gridSection || sectionsList[0])}
                </h3>
                <p className="text-[10px] text-slate-450 font-bold mt-0.5">
                  Lançamento simplificado, visualização rápida de encarregados, gênero e documentos no Banco de Dados Central.
                </p>
              </div>
              {(() => {
                const targetCls = gridClass || (classesList[0] || '1');
                const targetSec = gridSection || (sectionsList[0] || 'A');
                const numMatriculados = students.filter(s => s.class === targetCls && s.section === targetSec).length;
                const vagasRestantes = 75 - numMatriculados;

                return (
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-center">
                      <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wide">
                        Capacidade Máxima: 75 Vagas
                      </span>
                    </div>
                    <div className={`rounded-xl px-3 py-1.5 text-center border transition-all ${
                      vagasRestantes <= 0
                        ? 'bg-rose-100 border-rose-300 text-rose-800 font-black animate-pulse'
                        : numMatriculados > 0
                        ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                      <span className="text-[10px] font-black uppercase tracking-wide">
                        {vagasRestantes <= 0
                          ? '🚫 Turma Lotada (0 Vagas)'
                          : `Vagas Disponíveis: ${vagasRestantes} / 75`}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 font-extrabold uppercase tracking-wider text-[9px] border-b border-slate-200 select-none">
                    <th className="p-3.5 w-[50px] text-center">Nº</th>
                    <th className="p-3.5 w-[110px]">Cód. ID</th>
                    <th className="p-3.5 min-w-[200px]">Nome Completo</th>
                    <th className="p-3.5 w-[85px] text-center">Gênero</th>
                    <th className="p-3.5 w-[110px] text-center">Identificação</th>
                    <th className="p-3.5 w-[160px] text-center">Nº Documento</th>
                    <th className="p-3.5 w-[200px]">Filiação / Encarregados</th>
                    <th className="p-3.5 w-[120px] text-center">Contacto</th>
                    <th className="p-3.5 text-right w-[180px]">Operações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-medium">
                  {students
                    .filter(s => s.class === (gridClass || classesList[0]) && s.section === (gridSection || sectionsList[0]))
                    .map((student, index) => {
                      const isEditing = gridEditingId === student.id;
                      const isSaida = !!student.isTransferidoSaida;

                      return (
                        <tr key={student.id} className={`hover:bg-slate-50/30 transition-colors ${isSaida ? 'opacity-60 bg-rose-50/10' : ''}`}>
                          <td className="p-3.5 text-slate-400 font-bold font-mono text-center">{index + 1}</td>
                          <td className="p-3.5 text-slate-500 font-bold font-mono text-[10px]">{student.id}</td>
                          
                          {/* Nome */}
                          <td className="p-3">
                            {isEditing ? (
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  value={gridStudentData.name || ''}
                                  onChange={(e) => setGridStudentData(prev => ({ ...prev, name: e.target.value }))}
                                  onBlur={() => setGridStudentData(prev => ({ ...prev, name: formatarNomeProprio(prev.name || '') }))}
                                  autoCapitalize="words"
                                  placeholder="Nome Completo"
                                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                                />
                                <p className="text-[9px] text-slate-400">
                                  Nota: O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                                </p>
                              </div>
                            ) : (
                              <div>
                                <span className="font-extrabold text-[12px] text-slate-900">{student.name}</span>
                                {isSaida && (
                                  <p className="text-[9px] text-rose-500 mt-0.5 font-bold uppercase tracking-wider font-mono">
                                    ➔ Saída para: {student.escolaDestino} ({student.dataTransferenciaSaida})
                                  </p>
                                )}
                                {student.isTransferidoEntrada && (
                                  <p className="text-[9px] text-indigo-500 mt-0.5 font-bold uppercase tracking-wider font-mono">
                                    ➔ Entrada de: {student.escolaOrigem}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Gênero */}
                          <td className="p-3 text-center">
                            {isEditing ? (
                              <select
                                value={gridStudentData.gender || ''}
                                onChange={(e) => setGridStudentData(prev => ({ ...prev, gender: e.target.value as any }))}
                                className="bg-slate-50 border border-slate-250 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer"
                              >
                                <option value="M">M</option>
                                <option value="F">F</option>
                              </select>
                            ) : (
                              <span className="text-slate-500 font-extrabold font-mono text-xs">{student.gender}</span>
                            )}
                          </td>

                          {/* Tipo Documento */}
                          <td className="p-3 text-center">
                            {isEditing ? (
                              <select
                                value={gridStudentData.docType || 'BI'}
                                onChange={(e) => setGridStudentData(prev => ({ ...prev, docType: e.target.value as any }))}
                                className="bg-slate-50 border border-slate-250 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer"
                              >
                                <option value="BI">B.I. (Nac.)</option>
                                <option value="CEDULA">Cédula</option>
                              </select>
                            ) : (
                              <span className="text-slate-500 font-bold font-mono text-[10px]">{student.docType || 'BI'}</span>
                            )}
                          </td>

                          {/* Número Documento */}
                          <td className="p-3 text-center">
                            {isEditing ? (
                              <input
                                type="text"
                                value={gridStudentData.docType === 'BI' ? (gridStudentData.bi || '') : (gridStudentData.cedulaRegisto || '')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (gridStudentData.docType === 'BI') {
                                    setGridStudentData(prev => ({ ...prev, bi: val }));
                                  } else {
                                    setGridStudentData(prev => ({ ...prev, cedulaRegisto: val }));
                                  }
                                }}
                                className="w-full bg-slate-50 border border-slate-250 rounded-xl px-2.5 py-1.5 text-xs font-semibold font-mono text-slate-800 text-center"
                              />
                            ) : (
                              <span className="text-slate-700 font-bold font-mono text-[11px]">
                                {student.docType === 'CEDULA' ? student.cedulaRegisto : student.bi}
                              </span>
                            )}
                          </td>

                          {/* Filiação */}
                          <td className="p-3">
                            {isEditing ? (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  placeholder="Nome Completo do Pai"
                                  value={gridStudentData.fatherName || ''}
                                  onChange={(e) => setGridStudentData(prev => ({ ...prev, fatherName: e.target.value }))}
                                  onBlur={() => setGridStudentData(prev => ({ ...prev, fatherName: formatarNomeProprio(prev.fatherName || '') }))}
                                  autoCapitalize="words"
                                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-2.5 py-1 text-[10.5px] text-slate-800 focus:outline-hidden focus:bg-white"
                                />
                                <input
                                  type="text"
                                  placeholder="Nome Completo da Mãe"
                                  value={gridStudentData.motherName || ''}
                                  onChange={(e) => setGridStudentData(prev => ({ ...prev, motherName: e.target.value }))}
                                  onBlur={() => setGridStudentData(prev => ({ ...prev, motherName: formatarNomeProprio(prev.motherName || '') }))}
                                  autoCapitalize="words"
                                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-2.5 py-1 text-[10.5px] text-slate-800 focus:outline-hidden focus:bg-white"
                                />
                                <p className="text-[9px] text-slate-400 leading-tight">
                                  Nota: O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                                </p>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 space-y-0.5 leading-tight">
                                <p className="truncate" title={student.fatherName}><span className="font-extrabold text-[9px] text-slate-400 font-mono">PAI:</span> {student.fatherName || '---'}</p>
                                <p className="truncate" title={student.motherName}><span className="font-extrabold text-[9px] text-slate-400 font-mono">MÃE:</span> {student.motherName || '---'}</p>
                              </div>
                            )}
                          </td>

                          {/* Contacto */}
                          <td className="p-3 text-center">
                            {isEditing ? (
                              <input
                                type="text"
                                value={gridStudentData.contact || ''}
                                onChange={(e) => setGridStudentData(prev => ({ ...prev, contact: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-250 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 text-center focus:outline-hidden focus:bg-white"
                              />
                            ) : (
                              <span className="text-slate-600 font-bold font-mono text-[11px]">{student.contact || '---'}</span>
                            )}
                          </td>

                          {/* Operações */}
                          <td className="p-3.5 text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!gridStudentData.name?.trim()) {
                                      window.alert('Erro: O nome do aluno não pode ser deixado em branco.');
                                      return;
                                    }
                                    if (gridStudentData.docType === 'BI' && gridStudentData.bi) {
                                      const biReg = /^[0-9]{9}[A-Za-z]{2}[0-9]{3}$/;
                                      if (!biReg.test(gridStudentData.bi.trim())) {
                                        window.alert('Formato de B.I. inválido. Deve possuir 14 caracteres (Ex: 005580255LN078).');
                                        return;
                                      }
                                    }

                                    const confirmChange = window.confirm(`Deseja realmente gravar as alterações cadastrais do aluno "${student.name}" no Banco Central?`);
                                    if (!confirmChange) return;

                                    onAddStudent({
                                      ...student,
                                      ...gridStudentData,
                                      name: formatarNomeProprio(gridStudentData.name!),
                                      gender: gridStudentData.gender!,
                                      fatherName: gridStudentData.fatherName ? formatarNomeProprio(gridStudentData.fatherName) : undefined,
                                      motherName: gridStudentData.motherName ? formatarNomeProprio(gridStudentData.motherName) : undefined,
                                      contact: gridStudentData.contact?.trim()
                                    } as Student);

                                    setGridEditingId(null);
                                    window.alert('Dados cadastrais actualizados com absoluto sucesso!');
                                  }}
                                  className="bg-indigo-600 hover:bg-indigo-750 text-white text-[10.5px] font-extrabold px-2.5 py-1.5 rounded-xl cursor-pointer transition-all border-0 shadow-md shadow-indigo-600/10"
                                >
                                  Gravar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setGridEditingId(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10.5px] font-extrabold px-2.5 py-1.5 rounded-xl cursor-pointer transition-all border-0"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end items-center gap-1.5">
                                {userRole !== 'PROFESSOR' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGridEditingId(student.id);
                                        setGridStudentData({
                                          name: student.name,
                                          gender: student.gender,
                                          docType: student.docType || 'BI',
                                          bi: student.bi,
                                          cedulaRegisto: student.cedulaRegisto,
                                          fatherName: student.fatherName,
                                          motherName: student.motherName,
                                          contact: student.contact
                                        });
                                      }}
                                      className="text-[10px] font-extrabold text-indigo-650 hover:bg-indigo-50 hover:text-indigo-800 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer border border-indigo-100"
                                    >
                                      Editar
                                    </button>
                                    
                                    {!isSaida && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSaidaAlunoId(student.id);
                                          setAbaAtiva('TRANSFERIDO_SAIDA');
                                        }}
                                        className="text-[10px] font-extrabold text-rose-650 hover:bg-rose-50 hover:text-rose-800 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer border border-rose-100"
                                      >
                                        Transferir
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleExcluirAluno(student.id, student.name)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                      title="Excluir Matrícula"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  {students.filter(s => s.class === (gridClass || classesList[0]) && s.section === (gridSection || sectionsList[0])).length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-450 font-bold italic bg-slate-50/25">
                        Não existem alunos matriculados nesta classe e turma correspondentes ao filtro. Use as opções acima para criar uma nova matrícula nesta turma.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. LISTAGEM GERAL DE MATRÍCULAS E HISTÓRICO DE MOVIMENTAÇÕES (ESTILO PAUTA) */}
      {abaAtiva === 'LISTAGEM_GERAL' && (
        <div className="space-y-5 animate-pulseOnce">
          
          {/* Barra de Filtros e Pesquisa */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="max-w-md w-full relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar matrícula por Nome ou ID Aluno..."
                  className="w-full bg-white border border-slate-250 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 shrink-0">Filtrar Situação:</span>
                <div className="flex bg-white rounded-xl border border-slate-250 p-1">
                  <button
                    type="button"
                    onClick={() => setSelectedSituacao('ATIVOS')}
                    className={`px-3 py-1 text-[10.5px] font-bold rounded-lg cursor-pointer transition-all ${selectedSituacao === 'ATIVOS' ? 'bg-indigo-600 text-white font-black' : 'text-slate-600'}`}
                  >
                    Ativos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSituacao('SAIDA')}
                    className={`px-3 py-1 text-[10.5px] font-bold rounded-lg cursor-pointer transition-all ${selectedSituacao === 'SAIDA' ? 'bg-rose-600 text-white font-black' : 'text-slate-600'}`}
                  >
                    Transferidos (Saída)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSituacao('All')}
                    className={`px-3 py-1 text-[10.5px] font-bold rounded-lg cursor-pointer transition-all ${selectedSituacao === 'All' ? 'bg-slate-200 text-slate-800 font-black' : 'text-slate-600'}`}
                  >
                    Ver Todos
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Classe</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer focus:border-indigo-500"
                >
                  <option value="All">Todas as Classes</option>
                  {classesList.map(c => (
                    <option key={c} value={c}>{c}ª Classe</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Turma / Secção</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer focus:border-indigo-500"
                >
                  <option value="All">Todas as Turmas</option>
                  {sectionsList.map(s => (
                    <option key={s} value={s}>Turma {s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Tipo de Admissão</label>
                <select
                  value={selectedAdmissao}
                  onChange={(e) => setSelectedAdmissao(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer focus:border-indigo-500"
                >
                  <option value="All">Todos as Admissões</option>
                  <option value="REGULAR">Matrícula Regular</option>
                  <option value="TRANSFERIDO">Entrada por Transferência</option>
                </select>
              </div>
            </div>
          </div>

          {/* GRELHA DA LISTAGEM DE MATRÍCULAS */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider text-[9px] border-b border-slate-200">
                    <th className="p-3.5 w-[50px]">Nº</th>
                    <th className="p-3.5 w-[120px]">Código Aluno</th>
                    <th className="p-3.5">Nome Completo do Aluno</th>
                    <th className="p-3.5 w-[60px] text-center">Gên.</th>
                    <th className="p-3.5 w-[80px] text-center">Classe</th>
                    <th className="p-3.5 w-[80px] text-center">Turma</th>
                    <th className="p-3.5 w-[140px] text-center">Tipo Admissão</th>
                    <th className="p-3.5 w-[120px] text-center">Situação</th>
                    {userRole !== 'PROFESSOR' && <th className="p-3.5 text-right w-[100px]">Acções</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-medium">
                  {filteredStudents.map((student, index) => {
                    const isRegular = !student.isTransferidoEntrada;
                    const isSaida = !!student.isTransferidoSaida;

                    return (
                      <tr key={student.id} className={`hover:bg-slate-50/40 transition-colors ${isSaida ? 'opacity-60 bg-rose-50/10' : ''}`}>
                        <td className="p-3.5 text-slate-400 font-bold font-mono">{index + 1}</td>
                        <td className="p-3.5 text-slate-500 font-bold font-mono text-[10px]">{student.id}</td>
                        <td className="p-3.5 font-extrabold text-[12px]">
                          <div>
                            <span className="text-slate-900">{student.name}</span>
                            {isSaida && (
                              <p className="text-[9px] text-rose-500 mt-0.5 font-bold uppercase tracking-wider">
                                ➔ Transferido para: {student.escolaDestino} ({student.dataTransferenciaSaida})
                              </p>
                            )}
                            {student.isTransferidoEntrada && (
                              <p className="text-[9px] text-indigo-500 mt-0.5 font-bold uppercase tracking-wider">
                                ➔ Proveniente de: {student.escolaOrigem} ({student.provinciaOrigem})
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-center text-slate-500 font-bold font-mono">{student.gender || 'M'}</td>
                        <td className="p-3.5 text-center text-slate-700 font-black font-mono">{student.class}ª</td>
                        <td className="p-3.5 text-center text-slate-600 font-bold font-mono">{student.section}</td>
                        <td className="p-3 bg-slate-50/10 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wide border ${
                            isRegular 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-150' 
                              : 'bg-indigo-50 text-indigo-800 border-indigo-150'
                          }`}>
                            {isRegular ? 'REGULAR' : 'TRANSFERÊNCIA'}
                          </span>
                        </td>
                        <td className="p-3 bg-slate-50/10 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wide border ${
                            isSaida 
                              ? 'bg-rose-50 text-rose-800 border-rose-150' 
                              : 'bg-indigo-50 text-indigo-800 border-indigo-150'
                          }`}>
                            {isSaida ? 'SAÍDA (TRANS)' : 'MATRICULADO'}
                          </span>
                        </td>
                        
                        {userRole !== 'PROFESSOR' && (
                          <td className="p-3.5 text-right">
                            <div className="flex justify-end items-center gap-1.5">
                              {isSaida && (
                                <button
                                  type="button"
                                  onClick={() => setModalTransferenciaEmissao({
                                    isOpen: true,
                                    student: student,
                                    guiaNumero: student.guiaTransferenciaSaida,
                                    escolaDestino: student.escolaDestino,
                                    provinciaDestino: student.provinciaDestino,
                                    motivo: student.motivoTransferencia
                                  })}
                                  className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1"
                                  title="Emitir / Imprimir Guia & Boletim de Transferência"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleEditarAluno(student)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                title="Editar dados da matrícula"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExcluirAluno(student.id, student.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Eliminar Matrícula permanentemente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400 font-bold italic bg-slate-50/25">
                        Nenhum aluno registado nesta modalidade correspondente aos filtros. 
                        Aceda às guias acima para matricular ou importar alunos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 5. GESTÃO DO PROCESSO DE ADMISSÃO E CANDIDATURAS (4 Fases) */}
      {abaAtiva === 'PROCESSO_ADMISSAO' && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-md space-y-6 animate-pulseOnce">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-150 pb-4 gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-500" />
                Processo de Admissão & Candidaturas (SIGEP)
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                Gestão integrada do fluxo de admissão: Candidatura, Prova de Acesso, Seleção por Mérito e Vinculação Final.
              </p>
            </div>
            {/* Phase Selector */}
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1 self-start flex-wrap">
              {[1, 2, 3, 4, 5].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFaseAdmissao(f as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    faseAdmissao === f 
                      ? 'bg-amber-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                >
                  {f === 1 ? '1ª F. Candidatura' : f === 2 ? '2ª F. Provas' : f === 3 ? '3ª F. Seleção' : f === 4 ? '4ª F. Matrícula' : '5ª F. Resultados'}
                </button>
              ))}
            </div>
          </div>

          {/* Notificações do Processo de Admissão */}
          {notificacao && (
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              notificacao.tipo === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="text-xs font-black">{notificacao.mensagem}</span>
              </div>
              <button onClick={() => setNotificacao(null)} className="text-xs font-bold hover:underline cursor-pointer">Fechar</button>
            </div>
          )}

          {/* FASE 1: CANDIDATURA */}
          {faseAdmissao === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Form Cadastro */}
                <form onSubmit={handleAddCandidate} className="bg-slate-50/50 rounded-2xl border border-slate-200 p-5 space-y-4 lg:col-span-5">
                  <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-amber-500" />
                    Registrar Candidatura (Pré-Cadastro)
                  </h3>

                  {candError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{candError}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Secção 1: Identificação Civil */}
                    <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">I. Identificação & Dados Pessoais</h4>
                      
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Nome Completo *</label>
                        <input
                          type="text"
                          required
                          value={candName}
                          onChange={(e) => setCandName(e.target.value)}
                          onBlur={() => setCandName(formatarNomeProprio(candName))}
                          autoCapitalize="words"
                          placeholder="Nome Completo do Candidato"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                        />
                        <p className="mt-1 text-[10px] text-slate-400">
                          Nota: Insira o nome respeitando a norma ortográfica. O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Género *</label>
                          <select
                            required
                            value={candGender}
                            onChange={(e) => setCandGender(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white cursor-pointer"
                          >
                            <option value="">Seleccione...</option>
                            <option value="M">Masculino (M)</option>
                            <option value="F">Feminino (F)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Data de Nascimento *</label>
                          <input
                            type="date"
                            required
                            value={candBirthDate}
                            onChange={(e) => setCandBirthDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Tipo de Documento *</label>
                          <select
                            value={candDocType}
                            onChange={(e) => setCandDocType(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white cursor-pointer"
                          >
                            <option value="BI">B.I. (Angola)</option>
                            <option value="CEDULA">Cédula</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Nº Documento *</label>
                          <input
                            type="text"
                            required
                            value={candDocNumber}
                            onChange={(e) => setCandDocNumber(e.target.value)}
                            placeholder="Número do documento"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                          />
                        </div>
                      </div>

                      {candDocType === 'BI' && (
                        <div className="grid grid-cols-2 gap-2.5 bg-slate-50/50 p-2.5 rounded-lg border border-slate-150 animate-slideDown">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Sector de Emissão do B.I. *</label>
                            <BiSectorSelect
                              required
                              value={candBiIssuerSector}
                              onChange={setCandBiIssuerSector}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Data de Emissão do B.I. *</label>
                            <input
                              type="date"
                              required
                              value={candBiIssueDate}
                              onChange={(e) => setCandBiIssueDate(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Secção 2: Origem e Filiação */}
                    <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">II. Origem, Filiação & Contacto</h4>
                      
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Província de Origem *</label>
                          <select
                            required
                            value={candProvince}
                            onChange={(e) => {
                              setCandProvince(e.target.value);
                              setCandNaturalidade('');
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white cursor-pointer"
                          >
                            <option value="">Seleccione...</option>
                            {Object.keys(LOCALIDADES_ANGOLA).map(prov => (
                              <option key={prov} value={prov}>{prov}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Naturalidade *</label>
                          <select
                            required
                            value={candNaturalidade}
                            onChange={(e) => setCandNaturalidade(e.target.value)}
                            disabled={!candProvince}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white cursor-pointer disabled:opacity-50"
                          >
                            <option value="">Seleccione...</option>
                            {candProvince && LOCALIDADES_ANGOLA[candProvince]?.map(mun => (
                              <option key={mun} value={mun}>{mun}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Contacto Telefónico *</label>
                        <input
                          type="text"
                          required
                          value={candContact}
                          onChange={(e) => setCandContact(e.target.value)}
                          placeholder="Telemóvel do Encarregado / Candidato"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Nome do Pai *</label>
                          <input
                            type="text"
                            required
                            value={candFatherName}
                            onChange={(e) => setCandFatherName(e.target.value)}
                            onBlur={() => setCandFatherName(formatarNomeProprio(candFatherName))}
                            autoCapitalize="words"
                            placeholder="Filiação Paterna"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                          />
                          <p className="mt-1 text-[9px] text-slate-400">
                            Nota: O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                          </p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Nome da Mãe *</label>
                          <input
                            type="text"
                            required
                            value={candMotherName}
                            onChange={(e) => setCandMotherName(e.target.value)}
                            onBlur={() => setCandMotherName(formatarNomeProprio(candMotherName))}
                            autoCapitalize="words"
                            placeholder="Filiação Materna"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                          />
                          <p className="mt-1 text-[9px] text-slate-400">
                            Nota: O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Secção 3: Opção Académica */}
                    <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">III. Opção Académica Pretendida</h4>
                      
                      {/* 1º Subsistema de Ensino (Sempre Ativo conforme Menu/Configuração do Sistema) */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                          Subsistema de Ensino *
                        </label>
                        <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 flex items-center justify-between shadow-xs select-none">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0"></span>
                            <span className="font-extrabold uppercase">
                              {candSubsystem === 'ENSINO_PRIMARIO' && 'Ensino Primário'}
                              {candSubsystem === 'LICEU' && 'Liceu'}
                              {candSubsystem === 'MAGISTERIO' && 'Magistério'}
                            </span>
                          </div>
                          <span className="text-[9px] bg-slate-200/90 text-slate-600 px-2 py-0.5 rounded font-mono font-black uppercase tracking-wider shrink-0">
                            Ativo no Sistema
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Classe Pretendida (condicionada ao subsistema) */}
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Classe Pretendida *</label>
                          <select
                            required
                            value={candClass}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCandClass(val);
                              if (parseInt(val, 10) < 10) {
                                setCandSpecialty('NENHUMA');
                                setCandHasCert(false);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white cursor-pointer"
                          >
                            {candSubsystem === 'ENSINO_PRIMARIO' && (
                              <>
                                <option value="1">1ª Classe</option>
                                <option value="2">2ª Classe</option>
                                <option value="3">3ª Classe</option>
                                <option value="4">4ª Classe</option>
                                <option value="5">5ª Classe</option>
                                <option value="6">6ª Classe</option>
                                <option value="7">7ª Classe</option>
                                <option value="8">8ª Classe</option>
                                <option value="9">9ª Classe</option>
                              </>
                            )}
                            {candSubsystem === 'LICEU' && (
                              <>
                                <option value="10">10ª Classe</option>
                                <option value="11">11ª Classe</option>
                                <option value="12">12ª Classe</option>
                              </>
                            )}
                            {candSubsystem === 'MAGISTERIO' && (
                              <>
                                <option value="10">10ª Classe</option>
                                <option value="11">11ª Classe</option>
                                <option value="12">12ª Classe</option>
                                <option value="13">13ª Classe</option>
                              </>
                            )}
                          </select>
                        </div>

                        {/* 3º Período Letivo (Opções Padronizadas: Matinal, Vespertino, Noturno) */}
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Período Letivo *</label>
                          <select
                            required
                            value={candPeriod}
                            onChange={(e) => setCandPeriod(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white cursor-pointer"
                          >
                            <option value="">Seleccione...</option>
                            <option value="Matinal">Matinal</option>
                            <option value="Vespertino">Vespertino</option>
                            <option value="Noturno">Noturno</option>
                          </select>
                        </div>
                      </div>

                      {/* 2º Especialidade (Condicionada ao subsistema - 100% oculta para Ensino Primário) */}
                      {candSubsystem !== 'ENSINO_PRIMARIO' && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Especialidade / Curso *</label>
                          <select
                            required
                            value={candSpecialty}
                            onChange={(e) => setCandSpecialty(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white cursor-pointer"
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
                                <option value="LEMC">Língua Portuguesa e EMC (L.EMC)</option>
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

                      {/* Opção de Língua Estrangeira (Inglês/Francês) */}
                      {/* Lógica Condicional: Oculto no Primário 1ª-6ª e Magistério, Visível no Primário 7ª-9ª e Liceu */}
                      {((candSubsystem === 'ENSINO_PRIMARIO' && parseInt(candClass, 10) >= 7) || candSubsystem === 'LICEU') && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Opção de Língua Estrangeira *</label>
                          <select
                            required
                            value={candLang}
                            onChange={(e) => setCandLang(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white cursor-pointer"
                          >
                            <option value="INGLÊS">Inglês</option>
                            <option value="FRANCÊS">Francês</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Filtro de Segurança Regulamentar para Ingresso na 10ª Classe */}
                    {candClass === '10' && (
                      <div className="bg-amber-50/75 rounded-xl border border-amber-200 p-3.5 space-y-3">
                        <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-wider border-b border-amber-200 pb-1 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                          Requisitos de Ingresso na 10ª Classe
                        </h4>
                        
                        <label className="flex items-start gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            required
                            checked={candHasCert}
                            onChange={(e) => setCandHasCert(e.target.checked)}
                            className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 mt-0.5 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700 leading-tight">
                            Possui Certificado de Habilitações da 9.ª Classe? *
                          </span>
                        </label>
                        
                        <div>
                          <label className="block text-[10px] font-black text-amber-800 uppercase tracking-wide mb-1">Média do Certificado da 9.ª Classe *</label>
                          <input
                            type="number"
                            required
                            min="12"
                            max="20"
                            value={candCertAvg}
                            onChange={(e) => setCandCertAvg(Number(e.target.value))}
                            className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-black text-amber-700 focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                          />
                          <p className="text-[9px] text-amber-600 font-bold mt-1">Exigido valor mínimo regulamentar de 12 valores.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={candClass === '10' && !candHasCert}
                    className={`w-full text-white rounded-xl py-2.5 text-xs font-extrabold shadow-sm transition-all cursor-pointer ${
                      candClass === '10' && !candHasCert
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-700 hover:shadow-md'
                    }`}
                  >
                    {candClass === '10' && !candHasCert ? 'Bloqueado (Requer Certificado 9ª)' : 'Gravar Candidatura'}
                  </button>
                </form>

                {/* Listagem */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-700">Lista Geral de Candidatos Cadastrados ({candidates.length})</h4>
                      <p className="text-[10px] text-slate-500 font-bold font-sans">Candidatos isentos de teste (ensino primário e secundário de classes 7ª-9ª) ganham aprovação imediata.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Deseja limpar todos os candidatos cadastrados no histórico local do SIGEP?')) {
                          setCandidates([]);
                        }
                      }}
                      className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
                    >
                      Limpar Candidatos
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] border-b border-slate-200">
                          <th className="p-3">Nome</th>
                          <th className="p-3 text-center">Nº Doc</th>
                          <th className="p-3 text-center">Classe</th>
                          <th className="p-3 text-center">Especialidade</th>
                          <th className="p-3 text-center">Média Cert.</th>
                          <th className="p-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 font-medium">
                        {candidates.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-extrabold text-slate-800">{c.name}</td>
                            <td className="p-3 text-center font-mono font-bold text-slate-500">{c.docNumber} ({c.docType})</td>
                            <td className="p-3 text-center font-bold text-slate-700">{c.selectedClass}ª</td>
                            <td className="p-3 text-center font-black text-indigo-700">{c.specialty}</td>
                            <td className="p-3 text-center font-mono font-black text-amber-700">{c.certificateAverage} Val</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wide border ${
                                c.status === 'Aprovado' || c.status === 'Matriculado'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-250'
                                  : 'bg-amber-50 text-amber-800 border-amber-250'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {candidates.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400 font-bold italic bg-slate-50/25">
                              Nenhum candidato cadastrado. Utilize o formulário ao lado para registrar o primeiro candidato.
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

          {/* FASE 2: APLICAÇÃO DE TESTES */}
          {faseAdmissao === 2 && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="text-xs font-black text-slate-700">Lançamento de Notas de Prova (II Ciclo - Secundário)</h4>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">A direção da escola aplica 2 provas por especialidade. Candidatos com média das provas entre 10 e 20 valores são considerados apurados.</p>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] border-b border-slate-200">
                      <th className="p-3">Nome do Candidato</th>
                      <th className="p-3 text-center">Especialidade</th>
                      <th className="p-3 text-center">Média do Certificado</th>
                      <th className="p-3 text-center w-[120px]">Prova 1</th>
                      <th className="p-3 text-center w-[120px]">Prova 2</th>
                      <th className="p-3 text-center">Média Provas</th>
                      <th className="p-3 text-center">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium">
                    {candidates.filter(c => parseInt(c.selectedClass, 10) >= 10).map(c => {
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-extrabold text-slate-800">{c.name}</td>
                          <td className="p-3 text-center font-black text-indigo-700">{c.specialty}</td>
                          <td className="p-3 text-center font-mono text-slate-500">{c.certificateAverage} Val</td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={c.prova1 !== undefined ? c.prova1 : ''}
                              placeholder="0.0"
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                handleSaveGrades(c.id, val, c.prova2 || 0);
                              }}
                              className="w-16 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-center text-xs font-bold text-slate-800 focus:border-amber-500"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={c.prova2 !== undefined ? c.prova2 : ''}
                              placeholder="0.0"
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                handleSaveGrades(c.id, c.prova1 || 0, val);
                              }}
                              className="w-16 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-center text-xs font-bold text-slate-800 focus:border-amber-500"
                            />
                          </td>
                          <td className="p-3 text-center font-mono font-black text-amber-700 text-[13px]">
                            {c.mediaProvas !== undefined ? `${c.mediaProvas} Val` : '-'}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wide border ${
                              c.mediaProvas !== undefined && c.mediaProvas >= 10
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-250'
                                : 'bg-rose-50 text-rose-800 border-rose-250'
                            }`}>
                              {c.mediaProvas !== undefined && c.mediaProvas >= 10 ? 'APURADO' : 'EXCLUÍDO'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {candidates.filter(c => parseInt(c.selectedClass, 10) >= 10).length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400 font-bold italic bg-slate-50/25">
                          Nenhum candidato do II Ciclo para aplicação de teste cadastrado na 1ª Fase.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FASE 3: SELEÇÃO AUTOMÁTICA */}
          {faseAdmissao === 3 && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-700">Preenchimento de Vagas por Ordem Decrescente</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">Vagas calculadas de forma 100% automática com base na capacidade remanescente das turmas (75 alunos por turma). O sistema seleciona os candidatos por ordem de mérito.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelecaoAutomatica}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    Executar Seleção Automática de Vagas
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {getSpecialtiesForModality().map(s => {
                    const spec = s.code;
                    const vagasCount = autoVagasPorEspecialidade[spec] !== undefined ? autoVagasPorEspecialidade[spec] : 30;
                    return (
                      <div key={spec} className="bg-white border border-slate-200 rounded-2xl p-4 text-center space-y-1 shadow-2xs">
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider block">{spec}</span>
                        <div className="text-lg font-black text-slate-800 font-mono">
                          {vagasCount}
                        </div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Vagas</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabela de Vagas Preenchidas */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] border-b border-slate-200">
                      <th className="p-3">Posição</th>
                      <th className="p-3">Nome do Candidato</th>
                      <th className="p-3 text-center">Especialidade</th>
                      <th className="p-3 text-center">Nota da Prova / Média</th>
                      <th className="p-3 text-center">Média do Certificado</th>
                      <th className="p-3 text-center">Estado do Processo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium">
                    {candidates
                      .sort((a, b) => {
                        const scoreA = a.mediaProvas !== undefined ? a.mediaProvas : a.certificateAverage;
                        const scoreB = b.mediaProvas !== undefined ? b.mediaProvas : b.certificateAverage;
                        return scoreB - scoreA;
                      })
                      .map((c, idx) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                          <td className="p-3 font-extrabold text-slate-800">{c.name}</td>
                          <td className="p-3 text-center font-black text-indigo-700">{c.specialty}</td>
                          <td className="p-3 text-center font-mono font-black text-amber-700">{c.mediaProvas !== undefined ? `${c.mediaProvas} Val` : `${c.certificateAverage} Val (Certificado)`}</td>
                          <td className="p-3 text-center font-mono text-slate-400">{c.certificateAverage} Val</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wide border ${
                              c.status === 'Aprovado' || c.status === 'Matriculado'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-250'
                                : 'bg-rose-50 text-rose-800 border-rose-250'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {candidates.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 font-bold italic bg-slate-50/25">
                          Nenhum candidato cadastrado para efetuar seleção automática.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FASE 4: MATRÍCULA */}
          {faseAdmissao === 4 && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="text-xs font-black text-slate-700">Vinculação dos Candidatos Aprovados para Aluno Interno</h4>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">Clique no botão de vinculação para preencher automaticamente a Ficha de Matrícula Regular com as informações do candidato aprovado.</p>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] border-b border-slate-200">
                      <th className="p-3">Nome Completo do Candidato</th>
                      <th className="p-3 text-center">Nº Documento</th>
                      <th className="p-3 text-center">Especialidade</th>
                      <th className="p-3 text-center">Classe Selecionada</th>
                      <th className="p-3 text-center">Idioma</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium">
                    {candidates
                      .filter(c => c.status === 'Aprovado' || c.status === 'Matriculado')
                      .map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-extrabold text-slate-800">{c.name}</td>
                          <td className="p-3 text-center font-mono text-slate-500">{c.docNumber}</td>
                          <td className="p-3 text-center font-black text-indigo-700">{c.specialty}</td>
                          <td className="p-3 text-center font-bold text-slate-700">{c.selectedClass}ª Classe</td>
                          <td className="p-3 text-center font-bold text-slate-600">{c.foreignLanguage}</td>
                          <td className="p-3 text-right">
                            {c.status === 'Matriculado' ? (
                              <span className="text-emerald-600 font-black text-xs uppercase flex items-center justify-end gap-1">
                                <CheckCircle className="w-4 h-4" /> Matriculado Interno
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleVincularCandidato(c)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                <RefreshCw className="w-3 h-3 shrink-0" />
                                Vincular candidato a Aluno Interno
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    {candidates.filter(c => c.status === 'Aprovado' || c.status === 'Matriculado').length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 font-bold italic bg-slate-50/25">
                          Nenhum candidato com o estado "Aprovado" aguardando matrícula. Execute a 3ª Fase de Seleção Automática primeiro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FASE 5: RESULTADOS */}
          {faseAdmissao === 5 && (
            <div className="space-y-6">
              {/* Filtros de Resultados */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Painel de Publicação de Resultados & Concurso</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">Filtre por subsistema, classe e especialidade para visualizar e exportar a lista oficial de resultados.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportResultadosPDF(resSubsystem, resClass, resSpecialty)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Exportar Lista em PDF
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Subsistema */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Subsistema de Ensino</label>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 flex items-center justify-between">
                      <span>
                        {resSubsystem === 'PUNIV' ? 'Liceu' : resSubsystem === 'MAGISTERIO' ? 'Magistério' : 'Ensino Primário'}
                      </span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded uppercase">Activo</span>
                    </div>
                  </div>

                  {/* Classe */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Classe de Inscrição</label>
                    <select
                      value={resClass}
                      onChange={(e) => setResClass(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="All">Todas as Classes</option>
                      {resSubsystem === 'ENSINO_PRIMARIO' ? (
                        ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(c => (
                          <option key={c} value={c}>{c}ª Classe</option>
                        ))
                      ) : (
                        ['10', '11', '12', '13'].map(c => (
                          <option key={c} value={c}>{c}ª Classe</option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Especialidade */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Especialidade / Curso</label>
                    {resSubsystem === 'ENSINO_PRIMARIO' ? (
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 italic">
                        Geral / Não Aplicável
                      </div>
                    ) : (
                      <select
                        value={resSpecialty}
                        onChange={(e) => setResSpecialty(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="All">Todas as Especialidades</option>
                        {resSubsystem === 'PUNIV' && [
                          { code: 'CFB', name: 'Ciências Físicas e Biológicas (CFB)' },
                          { code: 'CEJ', name: 'Ciências Económico-Jurídicas (CEJ)' },
                          { code: 'CS', name: 'Ciências Sociais (CS)' },
                          { code: 'AV', name: 'Artes Visuais (AV)' }
                        ].map(s => (
                          <option key={s.code} value={s.code}>{s.name}</option>
                        ))}
                        {resSubsystem === 'MAGISTERIO' && [
                          { code: 'EP', name: 'Ensino Primário (EP)' },
                          { code: 'PE', name: 'Pré-Escolar / Ed. Infância (PE)' },
                          { code: 'LEMC', name: 'Língua Portuguesa e EMC (L.EMC)' },
                          { code: 'ING_EMC', name: 'Inglês e EMC (ING_EMC)' },
                          { code: 'FRA_EMC', name: 'Francês e EMC (FRA_EMC)' },
                          { code: 'MF', name: 'Matemática e Física (MF)' },
                          { code: 'BQ', name: 'Biologia e Química (BQ)' },
                          { code: 'GH', name: 'Geografia e História (GH)' },
                          { code: 'EVP', name: 'Educação Visual e Plástica (EVP)' },
                          { code: 'EDF', name: 'Educação Física (EDF)' }
                        ].map(s => (
                          <option key={s.code} value={s.code}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Pesquisar */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Pesquisar por Nome / BI</label>
                    <input
                      type="text"
                      placeholder="Pesquise aqui..."
                      value={resSearchQuery}
                      onChange={(e) => setResSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Tabela de Resultados por Ordem de Mérito */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] border-b border-slate-200">
                      <th className="p-3 text-center">Posição</th>
                      <th className="p-3">Nome Completo do Candidato</th>
                      <th className="p-3 text-center">Género</th>
                      <th className="p-3">Identificação e Origem</th>
                      <th className="p-3 text-center">Classe & Curso</th>
                      <th className="p-3 text-center">Nota / Média</th>
                      <th className="p-3 text-center">Estado do Concurso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium">
                    {getClassifiedCandidates(resSubsystem, resClass, resSpecialty)
                      .filter(c => {
                        if (!resSearchQuery) return true;
                        const query = resSearchQuery.toLowerCase();
                        return c.name.toLowerCase().includes(query) || c.docNumber.toLowerCase().includes(query);
                      })
                      .map((c, index) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-center">
                            <span className="font-mono font-black text-slate-500 bg-slate-100 rounded-md px-1.5 py-0.5 text-[10px]">
                              #{index + 1}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-extrabold text-slate-800 text-xs">{c.name}</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{c.docType}: {c.docNumber}</div>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-600">{c.gender || '---'}</td>
                          <td className="p-3 text-[10px] text-slate-500 space-y-0.5">
                            <div><span className="font-bold">Natural:</span> {c.naturalidade || '---'} ({c.province || '---'})</div>
                            <div><span className="font-bold">Filiação:</span> {c.fatherName || 'Pai'} / {c.motherName || 'Mãe'}</div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="font-bold text-slate-700">{c.selectedClass}ª Classe</div>
                            <div className="text-[9px] text-indigo-600 font-black tracking-wider uppercase">{c.specialty || 'GERAL'}</div>
                          </td>
                          <td className="p-3 text-center font-mono font-black">
                            <span className="text-amber-700">{c.score !== undefined ? `${c.score.toFixed(1)} Val` : '---'}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              c.computedStatus === 'APROVADO'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : c.computedStatus === 'REPROVADO'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : c.computedStatus === 'EXCLUÍDO POR INSUFICIÊNCIA DE VAGAS'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {c.computedStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {getClassifiedCandidates(resSubsystem, resClass, resSpecialty).length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400 font-bold italic bg-slate-50/25">
                          Nenhum candidato localizado com os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. RECONFIRMAÇÃO DE MATRÍCULA */}
      {abaAtiva === 'RECONFIRMACAO' && (
        <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-md space-y-6 animate-pulseOnce">
          {/* Header */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-500" />
              Processo de Reconfirmação de Matrícula (Promoção Letiva)
            </h2>
            <p className="text-xs text-slate-500 font-bold">
              Confirmar a permanência de alunos que transitaram para a classe posterior, mantendo integralmente o seu histórico académico associado ao ID original.
            </p>
          </div>

          {reconfError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulseOnce">
              <AlertTriangle className="w-5 h-5" />
              <span>{reconfError}</span>
            </div>
          )}

          {reconfSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl text-xs font-black flex items-center gap-2 animate-pulseOnce">
              <CheckCircle className="w-5 h-5" />
              <span>{reconfSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Buscador de Aluno */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-5 space-y-4 md:col-span-1">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">Pesquisar Aluno Transitado</h3>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nome do Aluno..."
                  value={reconfSearch}
                  onChange={(e) => setReconfSearch(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-lg pl-8 pr-3 py-2 text-xs font-semibold focus:border-blue-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {students
                  .filter(s => s.name.toLowerCase().includes(reconfSearch.toLowerCase()) && s.estadoPromocao !== 'Aguardando Próximo Ano Letivo')
                  .slice(0, 5)
                  .map(s => {
                    const isSelected = reconfStudentId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setReconfStudentId(s.id);
                          const currentVal = parseInt(s.class, 10);
                          const newVal = (currentVal + 1).toString();
                          setReconfNewClass(newVal);
                          setReconfNewSection(s.section || '');
                          setReconfNewPeriod(s.periodo || '');
                        }}
                        className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-extrabold">{s.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold mt-1">ID original: {s.id} • {s.class}ª Classe (Turma {s.section})</div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Formulário de Promoção Letiva */}
            <form onSubmit={handleReconfirmarMatriculaSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 md:col-span-2">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">Dados da Reconfirmação (Vincular Aluno a Classe Posterior)</h3>
              
              {reconfStudentId ? (
                (() => {
                  const student = students.find(s => s.id === reconfStudentId);
                  return (
                    <div className="space-y-4">
                      <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-xl space-y-1">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Aluno Selecionado</p>
                        <p className="text-sm font-extrabold text-indigo-950">{student?.name}</p>
                        <p className="text-xs text-slate-500 font-bold">Documento original: {student?.bi || student?.cedulaRegisto} • ID original: {student?.id}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Nova Classe de Destino</label>
                          <select
                            value={reconfNewClass}
                            onChange={(e) => setReconfNewClass(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-black text-slate-800"
                          >
                            {['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'].map(c => (
                              <option key={c} value={c}>{c}ª Classe</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Nova Turma de Destino</label>
                          <select
                            value={reconfNewSection}
                            onChange={(e) => setReconfNewSection(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
                          >
                            <option value="">Selecione...</option>
                            {getSectionsList(activeModality, student?.specialty).map(s => {
                              const enrolledCount = students.filter(st => st.class === reconfNewClass && st.section === s && st.id !== reconfStudentId).length;
                              const isFull = enrolledCount >= 75;
                              return (
                                <option key={s} value={s} disabled={isFull}>
                                  Turma {s} {isFull ? ' - 🚫 SEM VAGAS (75/75)' : ` (${75 - enrolledCount} Vagas)`}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Novo Período Letivo</label>
                          <select
                            value={reconfNewPeriod}
                            onChange={(e) => setReconfNewPeriod(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
                          >
                            <option value="">Selecione...</option>
                            <option value="Manhã">Manhã (Regular)</option>
                            <option value="Tarde">Tarde (Regular)</option>
                            <option value="Noite">Noite</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-wider mb-1">➔ Histórico Preservado</p>
                        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                          A reconfirmação de matrícula cria um vínculo automático promovendo o aluno no sistema SIGEP para a classe seguinte ({reconfNewClass}ª classe). O identificador institucional único do aluno (<strong className="font-mono text-slate-800">{student?.id}</strong>) é integralmente preservado para fins de auditoria e geração de relatórios de histórico escolar.
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer uppercase tracking-wide"
                      >
                        Vincular & Reconfirmar Matrícula do Aluno
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="p-12 text-center text-slate-400 font-bold italic bg-slate-50/20 border border-dashed border-slate-200 rounded-xl">
                  Selecione um aluno transitado no painel à esquerda para realizar a promoção.
                </div>
              )}
            </form>
          </div>

          {/* Alunos Promovidos (Aguardando Próximo Ano Letivo) */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Estudantes Promovidos (Ano Corrente)</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Alunos que já transitaram de classe e encontram-se no estado estanque de "Aguardando Próximo Ano Letivo".</p>
              </div>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                {students.filter(s => s.estadoPromocao === 'Aguardando Próximo Ano Letivo').length} Promovidos
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="pb-3">Nome do Estudante</th>
                    <th className="pb-3 text-center">ID Institucional</th>
                    <th className="pb-3 text-center">Classe Anterior</th>
                    <th className="pb-3 text-center">Classe Atual</th>
                    <th className="pb-3 text-center">Estado de Promoção</th>
                    <th className="pb-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-medium">
                  {students
                    .filter(s => s.estadoPromocao === 'Aguardando Próximo Ano Letivo')
                    .map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/40">
                        <td className="py-3 font-extrabold text-slate-800">{s.name}</td>
                        <td className="py-3 text-center font-mono text-slate-500">{s.id}</td>
                        <td className="py-3 text-center font-bold text-slate-600">{s.originalClassBeforePromotion || '?'}ª Classe</td>
                        <td className="py-3 text-center font-black text-indigo-700">{s.class}ª Classe</td>
                        <td className="py-3 text-center">
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Aguardando Próximo Ano Letivo
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleReverterPromocao(s.id)}
                            className="px-2.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Reverter Promoção
                          </button>
                        </td>
                      </tr>
                    ))}
                  {students.filter(s => s.estadoPromocao === 'Aguardando Próximo Ano Letivo').length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-bold italic">
                        Nenhum estudante promovido no ano letivo corrente. Os alunos promovidos aparecerão listados aqui para fins de auditoria e reversão.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
          </div>
        </div>
      )}

      {/* Modal de Emissão Oficial de Guia e Boletim de Transferência */}
      <TransferenciaEmissaoModal
        isOpen={modalTransferenciaEmissao.isOpen}
        onClose={() => setModalTransferenciaEmissao({ isOpen: false, student: null })}
        student={modalTransferenciaEmissao.student}
        schoolSettings={schoolSettings || {}}
        grades={grades}
        activeModality={activeModality}
        initialGuiaNumero={modalTransferenciaEmissao.guiaNumero}
        initialEscolaDestino={modalTransferenciaEmissao.escolaDestino}
        initialProvinciaDestino={modalTransferenciaEmissao.provinciaDestino}
        initialMotivo={modalTransferenciaEmissao.motivo}
      />

    </div>
  );
}
