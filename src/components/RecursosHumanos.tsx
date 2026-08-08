/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Staff, StaffRole, SubjectType, ModalityType, SchoolSettings, getSubjectsForClass, carregarGrelhaCurricular, getSpecialtyFullName } from '../types';
import { formatarNomeProprio } from '../utils/pautaLogic';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Search, 
  ShieldCheck, 
  BookOpen, 
  Sparkles,
  RefreshCw,
  Edit,
  Sliders,
  ChevronDown,
  Lock,
  CheckCircle,
  AlertTriangle,
  Award,
  Layers,
  GraduationCap,
  X,
  Plus,
  Briefcase,
  User,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Printer,
  Download,
  FileText,
  Filter,
  Calendar,
  Building,
  CheckSquare,
  Key,
  ShieldAlert,
  Phone,
  Eye,
  LayoutGrid
} from 'lucide-react';
import { generateStaffId, getSectionsList } from '../utils';

interface RecursosHumanosProps {
  staffList: Staff[];
  onAddStaff: (newStaff: Staff, originalId?: string) => void;
  onDeleteStaff: (id: string) => void;
  onClearAllStaff?: () => void;
  userRole: string;
  canEdit?: boolean;
  loggedInStaff?: Staff | null;
  activeModality?: ModalityType;
  schoolSettings?: SchoolSettings;
}

const ROLE_LABELS: Record<StaffRole, string> = {
  DIRECTOR_GERAL: 'Director Geral',
  SUB_DIRECTOR_PEDAGOGICO: 'Subdirector Pedagógico',
  SUB_DIRECTOR_ADMINISTRATIVO: 'Subdirector Administrativo',
  CHEFE_SECRETARIA: 'Chefe de Secretaria / Secretário(a)',
  COORDENADOR: 'Coordenador',
  COORDENADOR_TURNO: 'Coordenador de Turno',
  COORDENADOR_DISCIPLINA: 'Coordenador de Disciplina',
  COORDENADOR_PRATICAS_PEDAGOGICAS: 'Coordenador de Práticas Pedagógicas',
  PROFESSOR: 'Professor de Disciplina',
  AUXILIAR_LIMPEZA: 'Auxiliar de Limpeza',
  SEGURANCA: 'Segurança / Vigilante',
  TECNICO_PEDAGOGICO: 'Técnico Pedagógico',
  TECNICO_ADMINISTRATIVO: 'Técnico Administrativo',
  SIGEP: 'Administrador SIGEP'
};

const ROLE_INITIALS: Record<StaffRole, string> = {
  DIRECTOR_GERAL: 'D',
  SUB_DIRECTOR_PEDAGOGICO: 'Q', 
  SUB_DIRECTOR_ADMINISTRATIVO: 'A',
  CHEFE_SECRETARIA: 'C',
  COORDENADOR: 'C',
  COORDENADOR_TURNO: 'T',
  COORDENADOR_DISCIPLINA: 'O',
  COORDENADOR_PRATICAS_PEDAGOGICAS: 'P',
  PROFESSOR: 'P',
  AUXILIAR_LIMPEZA: 'L',
  SEGURANCA: 'G',
  TECNICO_PEDAGOGICO: 'E',
  TECNICO_ADMINISTRATIVO: 'M',
  SIGEP: 'S'
};

type AbaRHType = 'CHEFIA' | 'COORDENACAO' | 'PROFESSORES' | 'LIMPEZA' | 'SEGURANCA' | 'TODOS';

const CATEGORY_LABELS: Record<AbaRHType, string> = {
  CHEFIA: 'Cargos de Chefia',
  COORDENACAO: 'Coordenação',
  PROFESSORES: 'Docentes / Professores',
  LIMPEZA: 'Auxiliares de Limpeza',
  SEGURANCA: 'Seguranças / Vigilantes',
  TODOS: 'Geral',
};

const CHEFIA_SCOPES: Record<StaffRole, string[]> = {
  DIRECTOR_GERAL: ['Acesso Total SIGEP', 'Gestão Escolar', 'Atribuição de Cargos'],
  SUB_DIRECTOR_PEDAGOGICO: ['Gestão de Docentes', 'Validação de Pautas', 'Acompanhamento Pedagógico'],
  SUB_DIRECTOR_ADMINISTRATIVO: ['Escalas de Serviço', 'Recursos Patrimoniais', 'Controle Financeiro'],
  CHEFE_SECRETARIA: ['Matrículas & Pautas', 'Certificados', 'Secretaria Escolar'],
  COORDENADOR: ['Gestão da Coordenação', 'Lançamento de Faltas', 'Finanças'],
  TECNICO_PEDAGOGICO: ['Apoio Docente', 'Atendimento Pedagógico', 'Ocorrências'],
  TECNICO_ADMINISTRATIVO: ['Atendimento', 'Registros Gerais', 'Organização de Ficheiros'],
  PROFESSOR: ['Lançamento de Notas', 'Sumários'],
  AUXILIAR_LIMPEZA: ['Limpeza de Salas', 'Manutenção'],
  SEGURANCA: ['Controle de Portaria', 'Rondas'],
  SIGEP: ['Acesso Completo'],
  COORDENADOR_TURNO: ['Gerir Turnos', 'Organizar Horários'],
  COORDENADOR_DISCIPLINA: ['Coordenar Disciplinas', 'Apoio de Conteúdo'],
  COORDENADOR_PRATICAS_PEDAGOGICAS: ['Estágio Docente', 'Supervisão de Práticas', 'Acompanhamento Pedagógico']
};

export default function RecursosHumanos({
  staffList: rawStaffList,
  onAddStaff,
  onDeleteStaff,
  onClearAllStaff,
  userRole,
  canEdit = true,
  loggedInStaff,
  activeModality,
  schoolSettings
}: RecursosHumanosProps) {
  
  // Regra de Privacidade: Apenas o próprio membro (ou Administrador Master SIGEP) pode visualizar a sua senha.
  // Para outros membros dentro do RH, a senha é exibida mascarada (••••••••).
  const renderPrivatePassword = (targetStaffId: string, rawPassword?: string) => {
    const isSelf = loggedInStaff && (
      loggedInStaff.id === targetStaffId || 
      loggedInStaff.id === 'SIGEP' || 
      loggedInStaff.is_root || 
      userRole === 'SIGEP'
    );

    if (isSelf) {
      return rawPassword || '12345';
    }
    return '••••••••';
  };

  // Ocultar Administrador SIGEP de todos os utilizadores comuns absolutamente
  const staffList = rawStaffList.filter(s => {
    if (userRole !== 'SIGEP' && (s.id === 'SIGEP' || s.id === 'ADMIN_SIGEP' || s.role === 'SIGEP' || s.is_root)) {
      return false;
    }
    return true;
  });

  const [activeTabRH, setActiveTabRH] = useState<AbaRHType>('TODOS');
  const [cargoSelecionado, setCargoSelecionado] = useState<AbaRHType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState('');
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Double confirmation state for destructive clear action
  const [showDoubleConfirm, setShowDoubleConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');

  // Scroll Tab Bar references and scroll states
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftArrow(scrollLeft > 2);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 2);
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 240;
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      // Pequeno delay para atualizar setas
      setTimeout(checkScroll, 300);
    }
  };

  useEffect(() => {
    const el = tabsRef.current;
    if (el) {
      checkScroll();
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      const timeout = setTimeout(checkScroll, 150);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
        clearTimeout(timeout);
      };
    }
  }, [activeTabRH, isAdding]);

  // Navegação Principal de RH por CARDS
  type RhViewMode = 'DASHBOARD' | 'MAPA_EFETIVIDADE' | 'ATRIBUICOES' | 'FUNCIONARIOS' | 'CHEFIA' | 'SEGURANCA';
  const [rhViewMode, setRhViewMode] = useState<RhViewMode>('DASHBOARD');

  // Estados do Mapa de Efetividade
  const [efetividadeMes, setEfetividadeMes] = useState<string>('Janeiro');
  const [efetividadeAno, setEfetividadeAno] = useState<string>('2025/2026');
  const [efetividadeFiltroCargo, setEfetividadeFiltroCargo] = useState<string>('TODOS');

  // Modal de Edição Rápida de Dados de Efetividade de um Colaborador
  const [efetividadeModalStaff, setEfetividadeModalStaff] = useState<Staff | null>(null);
  const [efetividadeCategoria, setEfetividadeCategoria] = useState('');
  const [efetividadeTempoServico, setEfetividadeTempoServico] = useState('');
  const [efetividadeDataNasc, setEfetividadeDataNasc] = useState('');
  const [efetividadeSeguroSocial, setEfetividadeSeguroSocial] = useState('');
  const [efetividadeHabilitacoes, setEfetividadeHabilitacoes] = useState('');
  const [efetividadeGenero, setEfetividadeGenero] = useState<'M' | 'F'>('M');
  const [efetividadeEspecialidade, setEfetividadeEspecialidade] = useState('');
  const [efetividadeUnidadeOrganica, setEfetividadeUnidadeOrganica] = useState('');
  const [efetividadeNumAgente, setEfetividadeNumAgente] = useState('');

  // Estados para Gestão de Cargos de Chefia em Cards e Painel Lateral
  const [selectedChefiaRole, setSelectedChefiaRole] = useState<StaffRole | null>(null);
  const [isChefiaFormEditing, setIsChefiaFormEditing] = useState(false);
  const [chefiaEditStaffId, setChefiaEditStaffId] = useState<string | null>(null);

  // Form Fields
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('PROFESSOR');
  const [newPassword, setNewPassword] = useState('12345');
  const [newContact, setNewContact] = useState('');
  
  // Custom states for realistic Angola School HR fields & Effectiveness Map
  const [newIsEfetivo, setNewIsEfetivo] = useState<boolean>(true);
  const [filtroVinculo, setFiltroVinculo] = useState<'TODOS' | 'EFETIVO' | 'NAO_EFETIVO'>('TODOS');
  const [newCategoria, setNewCategoria] = useState('');
  const [newTempoServico, setNewTempoServico] = useState('');
  const [newDataNascimento, setNewDataNascimento] = useState('');
  const [newNumSeguroSocial, setNewNumSeguroSocial] = useState('');
  const [newHabilitacoesLiterarias, setNewHabilitacoesLiterarias] = useState('Licenciatura');
  const [newGenero, setNewGenero] = useState<'M' | 'F' | 'Masculino' | 'Feminino'>('M');
  const [newUnidadeOrganica, setNewUnidadeOrganica] = useState('');
  const [newNumAgente, setNewNumAgente] = useState('');

  const [newGabinete, setNewGabinete] = useState('');
  const [newDecretoNomeacao, setNewDecretoNomeacao] = useState('');
  const [newTipoCoordenacao, setNewTipoCoordenacao] = useState<'TURNO' | 'DISCIPLINA' | 'PRATICAS_PEDAGOGICAS'>('TURNO');
  const [newDisciplinaCoordenada, setNewDisciplinaCoordenada] = useState<SubjectType>('L. PORTUGUESA');
  const [newTurnoCoordenado, setNewTurnoCoordenado] = useState('Manhã');
  const [newCategoriaPedagogica, setNewCategoriaPedagogica] = useState('Licenciado');
  const [newAreaAtribuicao, setNewAreaAtribuicao] = useState('Pavilhão A');
  const [newPostoGuarita, setNewPostoGuarita] = useState('Guarita Principal');
  const [newTipoEscalaVigilante, setNewTipoEscalaVigilante] = useState('12h/24h');
  const [newIdColeteVigilante, setNewIdColeteVigilante] = useState('');
  
  // Custom states for professor assignment
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectType[]>([]);
  const [accumulatedAssignments, setAccumulatedAssignments] = useState<{ class: string; section: string; subject: string; specialty?: string }[]>([]);
  
  // Custom states for assignment wizard / modal
  const [wizardClass, setWizardClass] = useState<string>('');
  const [wizardSubject, setWizardSubject] = useState<string>('');
  const [wizardSection, setWizardSection] = useState<string>('');
  const [isAssignmentWizardOpen, setIsAssignmentWizardOpen] = useState<boolean>(false);

  // States for Assistente de Edição de Atribuição Curricular Existente
  const [editingAssignmentIndex, setEditingAssignmentIndex] = useState<number | null>(null);
  const [editAssClass, setEditAssClass] = useState<string>('');
  const [editAssSection, setEditAssSection] = useState<string>('');
  const [editAssSubject, setEditAssSubject] = useState<string>('');

  // Estados para Modal de Autorização do Director para Eliminação na Lixeira de RH
  const [deletingStaff, setDeletingStaff] = useState<{ id: string; name: string; role: StaffRole } | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [directorPasswordInput, setDirectorPasswordInput] = useState<string>('');
  const [deleteModalError, setDeleteModalError] = useState<string>('');

  // Rótulos simples para subsistema de ensino conforme requisito
  const getModalityLabel = (mod: string) => {
    if (mod === 'PUNIV') return 'Liceu';
    if (mod === 'MAGISTERIO') return 'Magistério';
    return 'Ensino Primário';
  };

  // Determinar subsistemas activos e ocultar subsistemas desactivados/ocultos conforme a configuração do SIGEP
  const availableModalities = React.useMemo(() => {
    const list: { value: 'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO'; label: string }[] = [];
    const activeComp = schoolSettings?.activeComponents;

    if (!activeComp) {
      list.push({ value: 'ENSINO_PRIMARIO', label: 'Ensino Primário (1ª à 6ª/9ª Classe)' });
      list.push({ value: 'PUNIV', label: 'PUNIV / II Ciclo do Ensino Secundário Geral' });
      list.push({ value: 'MAGISTERIO', label: 'Magistério / II Ciclo do Ensino Secundário Pedagógico' });
    } else {
      if (activeComp.ENSINO_PRIMARIO !== false) {
        list.push({ value: 'ENSINO_PRIMARIO', label: 'Ensino Primário (1ª à 6ª/9ª Classe)' });
      }
      if (activeComp.PUNIV !== false) {
        list.push({ value: 'PUNIV', label: 'PUNIV / II Ciclo do Ensino Secundário Geral' });
      }
      if (activeComp.MAGISTERIO !== false) {
        list.push({ value: 'MAGISTERIO', label: 'Magistério / II Ciclo do Ensino Secundário Pedagógico' });
      }
    }

    if (list.length === 0) {
      list.push({ value: 'ENSINO_PRIMARIO', label: 'Ensino Primário' });
    }

    return list;
  }, [schoolSettings?.activeComponents]);

  // Subsistema / Modalidade activa no formulário (Prevalece a configuração do SIGEP)
  const [formModality, setFormModality] = useState<'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO'>(() => {
    if (activeModality) return activeModality;
    try {
      const saved = localStorage.getItem('sigep_active_modality_v1');
      if (saved && ['ENSINO_PRIMARIO', 'PUNIV', 'MAGISTERIO'].includes(saved)) return saved as any;
    } catch (err) {}
    return availableModalities[0]?.value || 'ENSINO_PRIMARIO';
  });

  // Garantir que a modalidade activa pertença aos subsistemas visíveis
  useEffect(() => {
    if (activeModality && availableModalities.some(m => m.value === activeModality)) {
      setFormModality(activeModality);
    } else if (!availableModalities.some(m => m.value === formModality)) {
      if (availableModalities[0]) {
        setFormModality(availableModalities[0].value);
      }
    }
  }, [availableModalities, activeModality]);

  // Especialidade / Ramo seleccionado no formulário
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(() => {
    if (formModality === 'PUNIV') return 'CFB';
    if (formModality === 'MAGISTERIO') return 'MF';
    return 'GERAL';
  });

  // Sincronizar com alteração de modalidade activa do SIGEP
  useEffect(() => {
    if (activeModality) {
      setFormModality(activeModality);
      return;
    }
    const checkModality = () => {
      try {
        const saved = localStorage.getItem('sigep_active_modality_v1');
        if (saved && saved !== formModality) {
          setFormModality(saved as any);
        }
      } catch (err) {}
    };
    checkModality();
    window.addEventListener('storage', checkModality);
    return () => window.removeEventListener('storage', checkModality);
  }, [formModality, activeModality]);

  // Ajustar especialidade por omissão ao alterar o subsistema
  useEffect(() => {
    if (formModality === 'ENSINO_PRIMARIO') {
      setSelectedSpecialty('GERAL');
    } else if (formModality === 'PUNIV') {
      if (!['CFB', 'CEJ', 'CS', 'AV'].includes(selectedSpecialty)) {
        setSelectedSpecialty('CFB');
      }
    } else if (formModality === 'MAGISTERIO') {
      if (!['MF', 'GH', 'BQ', 'LEMC', 'EP', 'PE', 'ING_EMC', 'FRA_EMC', 'EVP', 'EDF'].includes(selectedSpecialty)) {
        setSelectedSpecialty('MF');
      }
    }
  }, [formModality]);

  const classesList = formModality === 'ENSINO_PRIMARIO'
    ? ['1', '2', '3', '4', '5', '6', '7', '8', '9']
    : formModality === 'PUNIV'
    ? ['10', '11', '12']
    : ['10', '11', '12', '13'];

  // Turmas adaptadas dinamicamente ao subsistema e à especialidade selecionada
  const sectionsList = getSectionsList(formModality, selectedSpecialty);

  // Determinar quais disciplinas exibir baseado no subsistema, classe(s) e especialidade seleccionadas
  const getDynamicSubjects = (): SubjectType[] => {
    const grelha = carregarGrelhaCurricular();
    const classesToGather = selectedClasses.length > 0 ? selectedClasses : classesList;
    const set = new Set<SubjectType>();

    classesToGather.forEach(cl => {
      const filtered = grelha.filter(item => {
        const matchMod = !item.modality || item.modality === formModality;
        const matchCl = item.class === cl;
        const matchSpec = formModality === 'ENSINO_PRIMARIO'
          || !item.specialty
          || item.specialty.toUpperCase() === selectedSpecialty.toUpperCase()
          || selectedSpecialty.toUpperCase() === 'GERAL';
        return matchMod && matchCl && matchSpec;
      });
      filtered.forEach(item => set.add(item.subject as SubjectType));
    });

    // Fallback para getSubjectsForClass se a grelha não tiver itens
    if (set.size === 0) {
      classesToGather.forEach(cl => {
        const subs = getSubjectsForClass(cl, formModality, selectedSpecialty) as SubjectType[];
        subs.forEach(s => set.add(s));
      });
    }

    return Array.from(set);
  };

  const availableSubjects = getDynamicSubjects();

  // Autofill Staff ID quando nome ou papel muda
  useEffect(() => {
    if (isAdding && !editingStaffId) {
      handleAutofillId();
    }
  }, [newName, newRole, isAdding, editingStaffId]);

  // Se o utilizador mudar de aba de RH, o papel inicial padrão muda ao abrir o formulário
  useEffect(() => {
    if (!editingStaffId) {
      if (activeTabRH === 'CHEFIA') {
        setNewRole('DIRECTOR_GERAL');
      } else if (activeTabRH === 'COORDENACAO') {
        setNewRole('COORDENADOR_TURNO');
      } else if (activeTabRH === 'PROFESSORES') {
        setNewRole('PROFESSOR');
      } else if (activeTabRH === 'LIMPEZA') {
        setNewRole('AUXILIAR_LIMPEZA');
      } else if (activeTabRH === 'SEGURANCA') {
        setNewRole('SEGURANCA');
      } else {
        setNewRole('PROFESSOR');
      }
    }
  }, [activeTabRH, editingStaffId]);

  const handleAutofillId = () => {
    if (editingStaffId) return;
    const generatedId = generateStaffId(newName || 'Novo Membro', newRole, staffList.map(s => s.id));
    setNewId(generatedId);
    setFormError('');
  };

  const handleClassToggle = (cls: string) => {
    setSelectedClasses(prev => 
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  const handleSectionToggle = (sec: string) => {
    setSelectedSections(prev => 
      prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
    );
  };

  const handleSubjectToggle = (subj: SubjectType) => {
    setSelectedSubjects(prev =>
      prev.includes(subj) ? prev.filter(s => s !== subj) : [...prev, subj]
    );
  };

  const startEditingStaff = (staff: Staff) => {
    setEditingStaffId(staff.id);
    setIsAdding(true);
    setFormError('');
    
    // Popular campos
    setNewId(staff.id);
    setNewName(staff.name);
    setNewRole(staff.role);
    setSelectedClasses(staff.classes || []);
    setSelectedSections(staff.sections || []);
    setSelectedSubjects(staff.subjects || []);
    if (staff.specialty) {
      setSelectedSpecialty(staff.specialty);
    }
    setNewPassword(staff.password || '12345');
    setNewContact(staff.contact || '');

    // Popular Atribuições Acumuladas sem descartar disciplinas directas
    if (staff.assignments && staff.assignments.length > 0) {
      setAccumulatedAssignments(staff.assignments);
      const assClasses = Array.from(new Set(staff.assignments.map(a => a.class)));
      const assSections = Array.from(new Set(staff.assignments.map(a => a.section)));
      const assSubjects = Array.from(new Set(staff.assignments.map(a => a.subject))) as SubjectType[];

      setSelectedClasses(Array.from(new Set([...(staff.classes || []), ...assClasses])));
      setSelectedSections(Array.from(new Set([...(staff.sections || []), ...assSections])));
      setSelectedSubjects(Array.from(new Set([...(staff.subjects || []), ...assSubjects])));
    } else {
      const rebuilt: { class: string; section: string; subject: string; specialty?: string }[] = [];
      (staff.classes || []).forEach(c => {
        (staff.sections || []).forEach(sec => {
          (staff.subjects || []).forEach(sub => {
            rebuilt.push({ class: c, section: sec, subject: sub, specialty: staff.specialty });
          });
        });
      });
      setAccumulatedAssignments(rebuilt);
      if (rebuilt.length > 0) {
        setSelectedClasses(Array.from(new Set([...(staff.classes || []), ...rebuilt.map(a => a.class)])));
        setSelectedSections(Array.from(new Set([...(staff.sections || []), ...rebuilt.map(a => a.section)])));
        setSelectedSubjects(Array.from(new Set([...(staff.subjects || []), ...(rebuilt.map(a => a.subject) as SubjectType[])])));
      }
    }
    
    // Popular campos adicionais de RH realista e Mapa de Efetividade
    setNewIsEfetivo(staff.isEfetivo ?? Boolean(staff.numAgente?.trim()));
    setNewNumAgente(staff.numAgente || '');
    setNewCategoria(staff.categoria || '');
    setNewTempoServico(staff.tempoServico || '');
    setNewDataNascimento(staff.dataNascimento || '');
    setNewNumSeguroSocial(staff.numSeguroSocial || '');
    setNewHabilitacoesLiterarias(staff.habilitacoesLiterarias || 'Licenciatura');
    setNewGenero((staff.genero === 'F' || staff.genero === 'Feminino') ? 'F' : 'M');
    setNewUnidadeOrganica(staff.unidadeOrganica || staff.gabinete || '');

    setNewGabinete(staff.gabinete || '');
    setNewDecretoNomeacao(staff.decretoNomeacao || '');
    setNewTipoCoordenacao(staff.tipoCoordenacao || 'TURNO');
    setNewDisciplinaCoordenada(staff.disciplinaCoordenada || 'L. PORTUGUESA');
    setNewTurnoCoordenado(staff.turnoCoordenado || 'Manhã');
    setNewCategoriaPedagogica(staff.categoriaPedagogica || 'Licenciado');
    setNewAreaAtribuicao(staff.areaAtribuicao || 'Pavilhão A');
    setNewPostoGuarita(staff.postoGuarita || 'Guarita Principal');
    setNewTipoEscalaVigilante(staff.tipoEscalaVigilante || '12h/24h');
    setNewIdColeteVigilante(staff.idColeteVigilante || '');
  };

  const clearChefiaFields = () => {
    setNewName('');
    setNewId('');
    setNewPassword('12345');
    setNewContact('');
    setNewGabinete('');
    setNewDecretoNomeacao('');
    setNewIsEfetivo(true);
    setNewNumAgente('');
    setNewCategoria('');
    setNewTempoServico('');
    setNewDataNascimento('');
    setNewNumSeguroSocial('');
    setNewHabilitacoesLiterarias('Licenciatura');
    setNewGenero('M');
    setNewUnidadeOrganica('');
    setFormError('');
  };

  const startChefiaAction = (role: StaffRole, staff?: Staff) => {
    setSelectedChefiaRole(role);
    setFormError('');
    if (staff) {
      // Editar ou ver existente
      setChefiaEditStaffId(staff.id);
      setIsChefiaFormEditing(false); // inicia visualizando os detalhes
      setNewName(staff.name);
      setNewId(staff.id);
      setNewPassword(staff.password || '12345');
      setNewContact(staff.contact || '');
      setNewGabinete(staff.gabinete || '');
      setNewDecretoNomeacao(staff.decretoNomeacao || '');
      setNewIsEfetivo(staff.isEfetivo ?? Boolean(staff.numAgente?.trim()));
      setNewNumAgente(staff.numAgente || '');
      setNewCategoria(staff.categoria || '');
      setNewTempoServico(staff.tempoServico || '');
      setNewDataNascimento(staff.dataNascimento || '');
      setNewNumSeguroSocial(staff.numSeguroSocial || '');
      setNewHabilitacoesLiterarias(staff.habilitacoesLiterarias || 'Licenciatura');
      setNewGenero((staff.genero === 'F' || staff.genero === 'Feminino') ? 'F' : 'M');
      setNewUnidadeOrganica(staff.unidadeOrganica || staff.gabinete || '');
    } else {
      // Nomear novo
      setChefiaEditStaffId(null);
      setIsChefiaFormEditing(true); // inicia direto no formulário de cadastro
      clearChefiaFields();
      // Gerar ID de sessão prévio
      const generatedId = generateStaffId('Novo Membro', role, staffList.map(s => s.id));
      setNewId(generatedId);
    }
  };

  const handleChefiaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      window.alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    if (!newName.trim()) {
      setFormError('O Nome Completo do funcionário é obrigatório.');
      return;
    }
    const trimmedName = formatarNomeProprio(newName);

    // Impedir nomes duplicados (excluindo o actual em edição)
    const existsByName = staffList.some(s => s.name.trim().toLowerCase() === trimmedName.toLowerCase() && s.id !== chefiaEditStaffId);
    if (existsByName) {
      setFormError(`O funcionário "${trimmedName}" já está cadastrado no sistema.`);
      return;
    }

    // Impedir cargos de chefia duplicados
    const leadershipRoles = ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA'];
    if (selectedChefiaRole && leadershipRoles.includes(selectedChefiaRole)) {
      const existingLeadership = staffList.find(s => s.role === selectedChefiaRole && s.id !== chefiaEditStaffId);
      if (existingLeadership) {
        const errMsg = `Bloqueio de Cargo Único: O cargo de chefia de "${ROLE_LABELS[selectedChefiaRole as StaffRole]}" já se encontra preenchido por "${existingLeadership.name}" (ID: ${existingLeadership.id}). Não é permitido atribuir o mesmo cargo de chefia a mais de um colaborador.`;
        setFormError(errMsg);
        window.alert(errMsg);
        return;
      }
    }

    const candidateId = newId.trim().toUpperCase();
    if (!candidateId) {
      setFormError('O ID de Sessão de RH é obrigatório.');
      return;
    }

    const cleanPhone = newContact.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setFormError('O Número de Telefone / Contacto do funcionário é obrigatório para efeitos de validação e segurança (mínimo 9 dígitos).');
      return;
    }

    if (newIsEfetivo && (!newNumAgente || !newNumAgente.trim())) {
      setFormError('O Nº de Agente do Estado é obrigatório para funcionários efetivos.');
      return;
    }

    const isIdTaken = staffList.some(s => s.id === candidateId && s.id !== chefiaEditStaffId);
    if (isIdTaken) {
      setFormError(`Erro: O ID de utilizador "${candidateId}" já se encontra atribuído.`);
      return;
    }

    const labelAcao = chefiaEditStaffId ? 'actualizar o registo' : 'cadastrar este novo funcionário';
    const confirmar = window.confirm(`Deseja realmente confirmar a acção de ${labelAcao} para este cargo de chefia?`);
    if (!confirmar) return;

    onAddStaff({
      id: candidateId,
      name: trimmedName,
      role: selectedChefiaRole!,
      contact: newContact.trim(),
      password: newPassword.trim() || '12345',
      gabinete: newGabinete.trim() || undefined,
      decretoNomeacao: newDecretoNomeacao.trim() || undefined,
      isEfetivo: newIsEfetivo,
      numAgente: newIsEfetivo ? newNumAgente.trim() : undefined,
      categoria: newCategoria.trim() || undefined,
      tempoServico: newTempoServico.trim() || undefined,
      dataNascimento: newDataNascimento.trim() || undefined,
      numSeguroSocial: newNumSeguroSocial.trim() || undefined,
      habilitacoesLiterarias: newHabilitacoesLiterarias.trim() || undefined,
      genero: newGenero,
      unidadeOrganica: newUnidadeOrganica.trim() || newGabinete.trim() || undefined
    }, chefiaEditStaffId || undefined);

    window.alert(`Funcionário de Chefia gravado com sucesso! ID: ${candidateId}`);
    
    // Resetar estados e fechar o painel lateral
    setSelectedChefiaRole(null);
    setIsChefiaFormEditing(false);
    setChefiaEditStaffId(null);
    clearChefiaFields();
  };

  // Submissão do Formulário de RH com Pop-ups de Confirmação
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      window.alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    if (!newName.trim()) {
      setFormError('O Nome Completo do funcionário é obrigatório.');
      return;
    }

    const trimmedName = formatarNomeProprio(newName);
    
    // Impedir nomes duplicados (excluindo o actual em edição)
    const existsByName = staffList.some(s => s.name.trim().toLowerCase() === trimmedName.toLowerCase() && s.id !== editingStaffId);
    if (existsByName) {
      setFormError(`O funcionário "${trimmedName}" já está cadastrado no sistema. Não é permitido criar múltiplos IDs de RH para a mesma pessoa.`);
      return;
    }

    // Impedir cargos de chefia duplicados se forem cargos únicos de directoria
    const leadershipRoles = ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA'];
    if (leadershipRoles.includes(newRole)) {
      const existingLeadership = staffList.find(s => s.role === newRole && s.id !== editingStaffId);
      if (existingLeadership) {
        const msg = `Bloqueio de Cargo Único: O cargo de chefia de "${ROLE_LABELS[newRole as StaffRole]}" já se encontra preenchido por "${existingLeadership.name}" (ID: ${existingLeadership.id}). Não é permitido atribuir o mesmo cargo de chefia a mais de um colaborador.`;
        setFormError(msg);
        window.alert(msg);
        return;
      }
    }

    // Impedir duplicidades em Coordenações de Disciplina ou Turno
    if (newRole === 'COORDENADOR_DISCIPLINA' && newTipoCoordenacao === 'DISCIPLINA') {
      const conflictCoord = staffList.find(s => s.role === 'COORDENADOR_DISCIPLINA' && s.disciplinaCoordenada === newDisciplinaCoordenada && s.id !== editingStaffId);
      if (conflictCoord) {
        const msg = `Conflito de Coordenação: A disciplina "${newDisciplinaCoordenada}" já tem como Coordenador o funcionário "${conflictCoord.name}" (ID: ${conflictCoord.id}). Não é permitido atribuir a mesma coordenação de disciplina a mais de uma pessoa.`;
        setFormError(msg);
        window.alert(msg);
        return;
      }
    }

    if (newRole === 'COORDENADOR_TURNO' && newTipoCoordenacao === 'TURNO') {
      const conflictTurno = staffList.find(s => s.role === 'COORDENADOR_TURNO' && s.turnoCoordenado === newTurnoCoordenado && s.id !== editingStaffId);
      if (conflictTurno) {
        const msg = `Conflito de Coordenação: O turno "${newTurnoCoordenado}" já tem como Coordenador o funcionário "${conflictTurno.name}" (ID: ${conflictTurno.id}). Não é permitido atribuir a mesma coordenação de turno a mais de uma pessoa.`;
        setFormError(msg);
        window.alert(msg);
        return;
      }
    }

    const candidateId = newId.trim().toUpperCase();
    if (!candidateId) {
      setFormError('O ID de Sessão de RH é obrigatório.');
      return;
    }

    const cleanPhone = newContact.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setFormError('O Número de Telefone / Contacto do funcionário é obrigatório para efeitos de validação e segurança de acesso (mínimo 9 dígitos).');
      return;
    }

    if (newIsEfetivo && (!newNumAgente || !newNumAgente.trim())) {
      setFormError('O Nº de Agente do Estado é obrigatório para funcionários efetivos.');
      return;
    }

    // ID de utilizador único
    const isIdTaken = staffList.some(s => s.id === candidateId && s.id !== editingStaffId);
    if (isIdTaken) {
      setFormError(`Erro: O ID de utilizador "${candidateId}" já se encontra atribuído a outro colaborador.`);
      return;
    }

    const isProf = newRole === 'PROFESSOR';
    if (isProf) {
      const finalAssignments = accumulatedAssignments.length > 0 ? accumulatedAssignments : [];
      if (finalAssignments.length === 0 && (selectedClasses.length === 0 || selectedSections.length === 0 || selectedSubjects.length === 0)) {
        setFormError('Por favor adicione pelo menos uma Atribuição Curricular (Classe + Turma + Disciplina) para o Professor.');
        return;
      }

      // Validação de Conflitos de Docência (Conflict Check)
      for (const ass of finalAssignments) {
        const conflictProf = staffList.find(s => {
          if (s.id === editingStaffId || s.id === candidateId || s.role !== 'PROFESSOR') return false;
          
          const sAss = s.assignments || [];
          if (sAss.length > 0) {
            return sAss.some(a => a.class === ass.class && a.section === ass.section && a.subject === ass.subject);
          }
          return (s.classes || []).includes(ass.class) && (s.sections || []).includes(ass.section) && (s.subjects || []).includes(ass.subject as any);
        });

        if (conflictProf) {
          const errMsg = `Conflito: A Disciplina "${ass.subject}" na ${ass.class}ª Classe Turma ${ass.section} já está atribuída ao Professor ${conflictProf.name} (ID: ${conflictProf.id}).`;
          setFormError(errMsg);
          window.alert(errMsg);
          return;
        }
      }
    }

    // 1. Pop-up de Confirmação Obrigatória
    const labelAcao = editingStaffId ? 'actualizar o registo' : 'cadastrar este novo funcionário';
    const confirmar = window.confirm(`Deseja realmente confirmar a acção de ${labelAcao} no banco de dados de Recursos Humanos?`);
    if (!confirmar) return;

    const finalPassword = newPassword.trim() || '12345';

    onAddStaff({
      id: candidateId,
      name: trimmedName,
      role: newRole,
      contact: newContact.trim(),
      classes: isProf ? Array.from(new Set([...selectedClasses, ...accumulatedAssignments.map(a => a.class)])) : undefined,
      sections: isProf ? Array.from(new Set([...selectedSections, ...accumulatedAssignments.map(a => a.section)])) : undefined,
      subjects: isProf ? Array.from(new Set([...selectedSubjects, ...(accumulatedAssignments.map(a => a.subject) as SubjectType[])])) : undefined,
      assignments: isProf ? (accumulatedAssignments.length > 0 ? accumulatedAssignments : (() => {
        if (selectedClasses.length > 0 && selectedSections.length > 0 && selectedSubjects.length > 0) {
          const rebuilt: { class: string; section: string; subject: string; specialty?: string }[] = [];
          selectedClasses.forEach(c => {
            selectedSections.forEach(sec => {
              selectedSubjects.forEach(sub => {
                rebuilt.push({ class: c, section: sec, subject: sub, specialty: selectedSpecialty });
              });
            });
          });
          return rebuilt;
        }
        return undefined;
      })()) : undefined,
      specialty: isProf ? selectedSpecialty : undefined,
      password: finalPassword,
      
      // Passar novos campos detalhados de RH para a escola angolana & Mapa de Efetividade
      isEfetivo: newIsEfetivo,
      categoria: newCategoria.trim() || undefined,
      tempoServico: newTempoServico.trim() || undefined,
      dataNascimento: newDataNascimento.trim() || undefined,
      numSeguroSocial: newNumSeguroSocial.trim() || undefined,
      habilitacoesLiterarias: newHabilitacoesLiterarias.trim() || undefined,
      genero: newGenero,
      unidadeOrganica: newUnidadeOrganica.trim() || undefined,
      numAgente: newIsEfetivo ? (newNumAgente.trim() || undefined) : undefined,

      gabinete: ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA'].includes(newRole) ? newGabinete.trim() : undefined,
      decretoNomeacao: ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA'].includes(newRole) ? newDecretoNomeacao.trim() : undefined,
      tipoCoordenacao: ['COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA', 'COORDENADOR_PRATICAS_PEDAGOGICAS', 'COORDENADOR'].includes(newRole) ? newTipoCoordenacao : undefined,
      disciplinaCoordenada: newRole === 'COORDENADOR_DISCIPLINA' ? newDisciplinaCoordenada : undefined,
      turnoCoordenado: (newRole === 'COORDENADOR_TURNO' || newRole === 'AUXILIAR_LIMPEZA') ? newTurnoCoordenado : undefined,
      categoriaPedagogica: newRole === 'PROFESSOR' ? newCategoriaPedagogica.trim() : undefined,
      areaAtribuicao: newRole === 'AUXILIAR_LIMPEZA' ? newAreaAtribuicao.trim() : undefined,
      postoGuarita: newRole === 'SEGURANCA' ? newPostoGuarita.trim() : undefined,
      tipoEscalaVigilante: newRole === 'SEGURANCA' ? newTipoEscalaVigilante.trim() : undefined,
      idColeteVigilante: newRole === 'SEGURANCA' ? newIdColeteVigilante.trim() : undefined
    }, editingStaffId || undefined);

    // 2. Pop-up de Sucesso Obrigatório
    window.alert(`Funcionário de Recursos Humanos gravado com sucesso! ID gerado para Início de Sessão: ${candidateId}`);

    // Resetar campos do formulário
    setEditingStaffId(null);
    setNewId('');
    setNewName('');
    setNewRole('PROFESSOR');
    setNewPassword('12345');
    setSelectedClasses([]);
    setSelectedSections([]);
    setSelectedSubjects([]);
    
    // Limpar campos adicionais de RH & Mapa de Efetividade
    setNewCategoria('');
    setNewTempoServico('');
    setNewDataNascimento('');
    setNewNumSeguroSocial('');
    setNewHabilitacoesLiterarias('Licenciatura');
    setNewGenero('M');
    setNewUnidadeOrganica('');
    setNewNumAgente('');
    setNewGabinete('');
    setNewDecretoNomeacao('');
    setNewTipoCoordenacao('TURNO');
    setNewDisciplinaCoordenada('L. PORTUGUESA');
    setNewTurnoCoordenado('Manhã');
    setNewCategoriaPedagogica('Licenciado');
    setNewAreaAtribuicao('Pavilhão A');
    setNewPostoGuarita('Guarita Principal');
    setNewTipoEscalaVigilante('12h/24h');
    setNewIdColeteVigilante('');
    
    setFormError('');
    setIsAdding(false);
  };

  // Excluir Colaborador de RH (Abre Modal de Autorização do Director com Registo de Motivo)
  const handleExcluirColaborador = (id: string, name: string) => {
    if (!canEdit) {
      window.alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    const staffObj = staffList.find(s => s.id === id);
    setDeletingStaff({
      id,
      name,
      role: staffObj?.role || 'PROFESSOR'
    });
    setDeleteReason('');
    setDirectorPasswordInput('');
    setDeleteModalError('');
  };

  // Modal Rápido do Mapa de Efetividade
  const openEfetividadeQuickModal = (staff: Staff) => {
    setEfetividadeModalStaff(staff);
    setEfetividadeCategoria(staff.categoria || staff.categoriaPedagogica || '');
    setEfetividadeTempoServico(staff.tempoServico || '');
    setEfetividadeDataNasc(staff.dataNascimento || '');
    setEfetividadeSeguroSocial(staff.numSeguroSocial || '');
    setEfetividadeHabilitacoes(staff.habilitacoesLiterarias || staff.categoriaPedagogica || 'Licenciatura');
    setEfetividadeGenero(staff.genero === 'F' || staff.genero === 'Feminino' ? 'F' : 'M');
    setEfetividadeEspecialidade(staff.specialty || '');
    setEfetividadeUnidadeOrganica(staff.unidadeOrganica || staff.gabinete || staff.areaAtribuicao || staff.postoGuarita || 'Direcção Escolar');
    setEfetividadeNumAgente(staff.numAgente || '');
  };

  const handleSaveEfetividadeQuickModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!efetividadeModalStaff) return;

    const updatedStaff: Staff = {
      ...efetividadeModalStaff,
      categoria: efetividadeCategoria.trim() || undefined,
      tempoServico: efetividadeTempoServico.trim() || undefined,
      dataNascimento: efetividadeDataNasc.trim() || undefined,
      numSeguroSocial: efetividadeSeguroSocial.trim() || undefined,
      habilitacoesLiterarias: efetividadeHabilitacoes.trim() || undefined,
      genero: efetividadeGenero,
      specialty: efetividadeEspecialidade.trim() || efetividadeModalStaff.specialty,
      unidadeOrganica: efetividadeUnidadeOrganica.trim() || undefined,
      numAgente: efetividadeNumAgente.trim() || undefined
    };

    onAddStaff(updatedStaff, efetividadeModalStaff.id);
    setEfetividadeModalStaff(null);
  };

  // Impressão e Exportação do Mapa de Efetividade
  const handlePrintMapaEfetividade = () => {
    window.print();
  };

  const handleExportCSVMapaEfetividade = () => {
    const headers = [
      'Nº', 'ID', 'Nome Completo', 'Cargo / Função', 'Categoria', 'Tempo de Serviço',
      'Data de Nascimento', 'Nº Seguro Social', 'Habilitações Literárias', 'Género',
      'Especialidade', 'Unidade Orgânica', 'Nº de Agente', 'Contacto'
    ];

    const rows = filteredStaffForEfetividade.map((s, idx) => [
      idx + 1,
      s.id,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${(ROLE_LABELS[s.role] || s.role).replace(/"/g, '""')}"`,
      `"${(s.categoria || s.categoriaPedagogica || '—').replace(/"/g, '""')}"`,
      `"${(s.tempoServico || '—').replace(/"/g, '""')}"`,
      `"${(s.dataNascimento || '—').replace(/"/g, '""')}"`,
      `"${(s.numSeguroSocial || '—').replace(/"/g, '""')}"`,
      `"${(s.habilitacoesLiterarias || s.categoriaPedagogica || '—').replace(/"/g, '""')}"`,
      s.genero === 'F' || s.genero === 'Feminino' ? 'F' : 'M',
      `"${(s.specialty || '—').replace(/"/g, '""')}"`,
      `"${(s.unidadeOrganica || s.gabinete || s.areaAtribuicao || '—').replace(/"/g, '""')}"`,
      `"${(s.numAgente || '—').replace(/"/g, '""')}"`,
      `"${(s.contact || '—').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Mapa_de_Efetividade_${efetividadeMes}_${efetividadeAno.replace('/', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtragem Específica para o Mapa de Efetividade
  const getFilteredStaffForEfetividade = () => {
    return staffList.filter(s => {
      if (s.id === 'SIGEP' || s.id === 'ADMIN_SIGEP' || s.role === 'SIGEP' || s.is_root) {
        return false;
      }
      // O MAPA DE EFETIVIDADE INCLUI TODOS OS FUNCIONÁRIOS EFETIVOS (isEfetivo !== false OU COM Nº DE AGENTE)
      const isEfetivoStaff = s.isEfetivo !== false || Boolean(s.numAgente && s.numAgente.trim());
      if (!isEfetivoStaff) {
        return false;
      }
      if (efetividadeFiltroCargo === 'DOCENTES') {
        return s.role === 'PROFESSOR';
      }
      if (efetividadeFiltroCargo === 'LIMPEZA') {
        return s.role === 'AUXILIAR_LIMPEZA';
      }
      if (efetividadeFiltroCargo === 'SEGURANCA') {
        return s.role === 'SEGURANCA';
      }
      if (efetividadeFiltroCargo === 'CHEFIA') {
        return ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'TECNICO_PEDAGOGICO', 'TECNICO_ADMINISTRATIVO'].includes(s.role);
      }
      return true;
    });
  };

  const filteredStaffForEfetividade = getFilteredStaffForEfetividade();

  // Filtragem e categorização fina da listagem com base na Aba de RH selecionada
  const getFilteredStaff = () => {
    return staffList.filter(s => {
      // Ocultar de forma absoluta o Administrador SIGEP (Root) de listagens, relatórios de RH e tabelas de gestão comum
      if (s.id === 'SIGEP' || s.id === 'ADMIN_SIGEP' || s.role === 'SIGEP' || s.is_root) {
        return false;
      }

      // 1. Filtro de Vínculo (Efetivo vs Não Efetivo)
      if (filtroVinculo === 'EFETIVO') {
        if (!s.numAgente || !s.numAgente.trim()) return false;
      } else if (filtroVinculo === 'NAO_EFETIVO') {
        if (s.numAgente && s.numAgente.trim()) return false;
      }

      // 2. Filtro de pesquisa rápida
      const searchClean = searchTerm.toLowerCase();
      const matchSearch = s.name.toLowerCase().includes(searchClean) ||
                          s.id.toLowerCase().includes(searchClean) ||
                          (s.numAgente || '').toLowerCase().includes(searchClean) ||
                          ROLE_LABELS[s.role].toLowerCase().includes(searchClean);
      if (!matchSearch) return false;

      // 2. Filtro estrito de categoria de RH
      if (activeTabRH === 'CHEFIA') {
        return ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'TECNICO_PEDAGOGICO', 'TECNICO_ADMINISTRATIVO'].includes(s.role);
      }
      if (activeTabRH === 'COORDENACAO') {
        return ['COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA'].includes(s.role);
      }
      if (activeTabRH === 'PROFESSORES') {
        return s.role === 'PROFESSOR';
      }
      if (activeTabRH === 'LIMPEZA') {
        return s.role === 'AUXILIAR_LIMPEZA';
      }
      if (activeTabRH === 'SEGURANCA') {
        return s.role === 'SEGURANCA';
      }
      return true; // TODOS
    });
  };

  const filteredStaff = getFilteredStaff();

  return (
    <div className="space-y-6">
      {!canEdit && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">Privilégio Restrito: Apenas Leitura</p>
            <p className="text-[10px] text-amber-700 leading-normal mt-0.5 font-semibold">O Director Geral configurou as permissões deste cargo para visualização estrita. Todas as funções de cadastro, actualização, edição ou eliminação de colaboradores encontram-se temporariamente suspensas.</p>
          </div>
        </div>
      )}

      {/* BARRA DE NAVEGAÇÃO SUPERIOR DO RH (CARDS & SELEÇÃO DE MÓDULOS) */}
      {!isAdding && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-4 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight uppercase text-white">
                  RECURSOS HUMANOS (RH) — PAINEL OPERACIONAL
                </h1>
                <p className="text-[11px] text-slate-400 font-mono">
                  Ecossistema SIGEP • Gestão de Quadro Pessoal, Mapa de Efetividade e Atribuições
                </p>
              </div>
            </div>

            {/* Seletor Rápido de Cards / Módulos */}
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => { setRhViewMode('DASHBOARD'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  rhViewMode === 'DASHBOARD'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Menu de Cards</span>
              </button>

              <button
                type="button"
                onClick={() => { setRhViewMode('MAPA_EFETIVIDADE'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  rhViewMode === 'MAPA_EFETIVIDADE'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mapa de Efetividade</span>
              </button>

              <button
                type="button"
                onClick={() => { setRhViewMode('ATRIBUICOES'); setActiveTabRH('PROFESSORES'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  rhViewMode === 'ATRIBUICOES'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                <span>Atribuições Docentes</span>
              </button>

              <button
                type="button"
                onClick={() => { setRhViewMode('FUNCIONARIOS'); setActiveTabRH('TODOS'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  rhViewMode === 'FUNCIONARIOS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Quadro Global</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD EM CARDS PRINCIPAIS */}
      {rhViewMode === 'DASHBOARD' && !isAdding && (
        <div className="space-y-6 no-print">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
            <h2 className="text-lg font-black uppercase tracking-tight text-white mb-1">
              Módulos & Atribuições de Recursos Humanos
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Acesse aos cartões operacionais para emitir o Mapa de Efetividade oficial da escola, distribuir cargas horárias para professores, gerir os quadros globais de segurança e limpeza, ou configurar a estrutura orgânica da instituição.
            </p>
          </div>

          {/* Matriz de Cards Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* CARD 1: MAPA DE EFETIVIDADE */}
            <div 
              onClick={() => setRhViewMode('MAPA_EFETIVIDADE')}
              className="group bg-white hover:bg-emerald-50/30 border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black font-mono bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Documento Oficial
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">
                    Mapa de Efetividade
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                    Emissão do relatório mensal de efetividade da escola com cabeçalho oficial dinâmico das Configurações da Escola, privilégio de Impressão A4/A3 e Exportação PDF/CSV.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                <span>{staffList.length} Colaboradores Registados</span>
                <span className="group-hover:translate-x-1 transition-transform">Abrir Mapa →</span>
              </div>
            </div>

            {/* CARD 2: ATRIBUIÇÃO DE DISCIPLINAS PARA PROFESSORES */}
            <div 
              onClick={() => { setRhViewMode('ATRIBUICOES'); setActiveTabRH('PROFESSORES'); }}
              className="group bg-white hover:bg-sky-50/30 border border-slate-200 hover:border-sky-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-bl-full pointer-events-none group-hover:bg-sky-500/10 transition-colors" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-sky-50 border border-sky-200 text-sky-600 rounded-xl group-hover:scale-105 transition-transform">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black font-mono bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Corpo Docente
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-sky-700 transition-colors">
                    Atribuições de Disciplinas
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                    Distribuição curricular de turmas, disciplinas, cargas horárias e especialidades leccionadas pelo corpo docente de professores da instituição.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-700">
                <span>{staffList.filter(s => s.role === 'PROFESSOR').length} Docentes Ativos</span>
                <span className="group-hover:translate-x-1 transition-transform">Gerir Atribuições →</span>
              </div>
            </div>

            {/* CARD 3: FUNCIONÁRIOS GLOBAIS DA INSTITUIÇÃO */}
            <div 
              onClick={() => { setRhViewMode('FUNCIONARIOS'); setActiveTabRH('TODOS'); }}
              className="group bg-white hover:bg-amber-50/30 border border-slate-200 hover:border-amber-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black font-mono bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Quadro Unificado
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-amber-700 transition-colors">
                    Funcionários Globais
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                    Cadastro unificado de todo o pessoal da instituição: Direcção, Docentes, Seguranças/Vigilantes, Auxiliares de Limpeza e Técnicos Administrativos.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
                <span>{staffList.filter(s => s.role === 'SEGURANCA' || s.role === 'AUXILIAR_LIMPEZA').length} Pessoal de Apoio/Segurança</span>
                <span className="group-hover:translate-x-1 transition-transform">Ver Quadro Global →</span>
              </div>
            </div>

            {/* CARD 4: CARGOS DE CHEFIA & DIRECÇÃO */}
            <div 
              onClick={() => { setRhViewMode('CHEFIA'); setActiveTabRH('CHEFIA'); }}
              className="group bg-white hover:bg-violet-50/30 border border-slate-200 hover:border-violet-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-bl-full pointer-events-none group-hover:bg-violet-500/10 transition-colors" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-violet-50 border border-violet-200 text-violet-600 rounded-xl group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black font-mono bg-violet-100 text-violet-800 px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Direcção & Chefia
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-violet-700 transition-colors">
                    Organograma de Chefias
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                    Quadro de distribuição dos cargos univalentes e colectivos de chefia da instituição escolar (Director Geral, Subdirectores, Secretários).
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-violet-700">
                <span>{staffList.filter(s => ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA'].includes(s.role)).length} Chefias Nomeadas</span>
                <span className="group-hover:translate-x-1 transition-transform">Ver Organograma →</span>
              </div>
            </div>

            {/* CARD 5: CREDENCIAIS & PERMISSÕES */}
            <div 
              onClick={() => { setRhViewMode('SEGURANCA'); setActiveTabRH('TODOS'); }}
              className="group bg-white hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl group-hover:scale-105 transition-transform">
                    <Key className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black font-mono bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Segurança
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-700 transition-colors">
                    Credenciais & Permissões
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                    Atribuição e consulta de palavras-passe de utilizador, privilégios delegados pelo Director Geral e acessos ao sistema SIGEP.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
                <span>{staffList.length} Contas de Acesso</span>
                <span className="group-hover:translate-x-1 transition-transform">Gerir Acessos →</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VISTA: MAPA DE EFETIVIDADE */}
      {rhViewMode === 'MAPA_EFETIVIDADE' && !isAdding && (
        <div className="space-y-6">
          {/* Painel de Controlo do Mapa de Efetividade (Ações & Filtros) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 no-print">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Mapa de Efetividade da Instituição
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Relatório mensal oficial para controle de presença e quadros funcionais.
                  </p>
                </div>
              </div>

              {/* Botões de Ação: Imprimir & Exportar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintMapaEfetividade}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Mapa (A4/A3)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSVMapaEfetividade}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar CSV / Excel</span>
                </button>
              </div>
            </div>

            {/* Controlos de Parâmetros: Mês, Ano e Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Mês de Referência
                </label>
                <select
                  value={efetividadeMes}
                  onChange={(e) => setEfetividadeMes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                >
                  {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Ano Letivo
                </label>
                <input
                  type="text"
                  value={efetividadeAno}
                  onChange={(e) => setEfetividadeAno(e.target.value)}
                  placeholder="Ex: 2025/2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Filtrar Categoria / Função
                </label>
                <select
                  value={efetividadeFiltroCargo}
                  onChange={(e) => setEfetividadeFiltroCargo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                >
                  <option value="TODOS">Todos os Funcionários ({staffList.length})</option>
                  <option value="DOCENTES">Apenas Docentes / Professores</option>
                  <option value="CHEFIA">Apenas Direcção & Chefia</option>
                  <option value="LIMPEZA">Apenas Auxiliares de Limpeza</option>
                  <option value="SEGURANCA">Apenas Seguranças / Vigilantes</option>
                </select>
              </div>
            </div>
          </div>

          {/* MAPA IMPRESSÍVEL (FOLHA IMPRESSA OFICIAL) */}
          <div className="bg-white p-6 border border-slate-300 rounded-2xl shadow-xs printable-mapa-area space-y-6">
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                .printable-mapa-area, .printable-mapa-area * {
                  visibility: visible !important;
                }
                .printable-mapa-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 8px !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: white !important;
                }
                .no-print {
                  display: none !important;
                }
                @page {
                  size: A4 landscape;
                  margin: 6mm;
                }
              }
            `}</style>

            {/* CABEÇALHO OFICIAL DINÂMICO DE CONFIGURAÇÕES DA ESCOLA */}
            <div className="text-center space-y-1 pb-3 border-b border-slate-300">
              <div className="flex justify-center items-center mb-1">
                {schoolSettings?.logoType === 'PRIVATE' && schoolSettings?.privateLogoUrl ? (
                  <img src={schoolSettings.privateLogoUrl} alt="Logótipo" className="h-14 w-auto object-contain" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-bold text-base mb-0.5">
                    🇦🇴
                  </div>
                )}
              </div>

              <p className="text-[11px] font-black tracking-widest text-slate-800 uppercase font-serif">
                REPÚBLICA DE ANGOLA
              </p>
              <p className="text-[10px] font-bold tracking-wider text-slate-700 uppercase font-serif">
                GOVERNO PROVINCIAL DE {schoolSettings?.province?.toUpperCase() || 'LUANDA'}
              </p>
              <p className="text-[10px] font-bold tracking-wider text-slate-700 uppercase font-serif">
                DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE {schoolSettings?.municipality?.toUpperCase() || 'CAZENGA'}
              </p>
              <p className="text-xs font-black tracking-wide text-slate-900 uppercase font-serif pt-1">
                {schoolSettings?.schoolName || 'INSTITUIÇÃO DE ENSINO PÚBLICO'}
              </p>

              {/* TÍTULO OFICIAL EXACTO DO MAPA DE EFETIVIDADE */}
              <div className="pt-3 pb-1">
                <h2 className="text-xs sm:text-sm md:text-base font-serif font-bold text-slate-900 inline-block px-4">
                  Mapa de efetividade referente ao Mês de <span className="underline font-extrabold px-1">{efetividadeMes}</span> {efetividadeAno}
                </h2>
              </div>
            </div>

            {/* TABELA DE EFETIVIDADE COM BORDAS PRETAS DE ALTA PRECISÃO */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-900 text-[10px] font-serif">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold text-center border-b border-slate-900">
                    <th className="border border-slate-900 px-1.5 py-1.5 w-7">Nº</th>
                    <th className="border border-slate-900 px-1.5 py-1.5">ID</th>
                    <th className="border border-slate-900 px-2 py-1.5 text-left">Nome Completo</th>
                    <th className="border border-slate-900 px-1.5 py-1.5">Cargo / Função</th>
                    <th className="border border-slate-900 px-1.5 py-1.5">Categoria</th>
                    <th className="border border-slate-900 px-1.5 py-1.5">Tempo de Serviço</th>
                    <th className="border border-slate-900 px-1.5 py-1.5">Data de Nascimento</th>
                    <th className="border border-slate-900 px-1.5 py-1.5">Nº de Seguro Social</th>
                    <th className="border border-slate-900 px-1.5 py-1.5">Habilitações Literárias</th>
                    <th className="border border-slate-900 px-1 py-1.5">Género</th>
                    <th className="border border-slate-900 px-1.5 py-1.5">Especialidade</th>
                    <th className="border border-slate-900 px-1.5 py-1.5">Unidade Orgânica</th>
                    <th className="border border-slate-900 px-1.5 py-1.5">Nº de Agente</th>
                    <th className="border border-slate-900 px-1.5 py-1.5">Contacto</th>
                    <th className="border border-slate-900 px-1.5 py-1.5 no-print">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaffForEfetividade.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="border border-slate-900 px-4 py-8 text-center text-slate-500 italic">
                        Nenhum colaborador encontrado para o filtro selecionado no Mapa de Efetividade.
                      </td>
                    </tr>
                  ) : (
                    filteredStaffForEfetividade.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors border-b border-slate-900">
                        <td className="border border-slate-900 px-1.5 py-1.5 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-900 px-1.5 py-1.5 text-center font-mono font-bold text-slate-900">{s.id}</td>
                        <td className="border border-slate-900 px-2 py-1.5 font-bold text-slate-900">{formatarNomeProprio(s.name)}</td>
                        <td className="border border-slate-900 px-1.5 py-1.5 text-center font-medium">{ROLE_LABELS[s.role] || s.role}</td>
                        <td className="border border-slate-900 px-1.5 py-1.5 text-center">{s.categoria || s.categoriaPedagogica || '—'}</td>
                        <td className="border border-slate-900 px-1.5 py-1.5 text-center">{s.tempoServico || '—'}</td>
                        <td className="border border-slate-900 px-1.5 py-1.5 text-center font-mono">{s.dataNascimento || '—'}</td>
                        <td className="border border-slate-900 px-1.5 py-1.5 text-center font-mono">{s.numSeguroSocial || '—'}</td>
                        <td className="border border-slate-900 px-1.5 py-1.5 text-center">{s.habilitacoesLiterarias || s.categoriaPedagogica || '—'}</td>
                        <td className="border border-slate-900 px-1 py-1.5 text-center font-bold">{s.genero === 'F' || s.genero === 'Feminino' ? 'F' : 'M'}</td>
                        <td className="border border-slate-900 px-1.5 py-1.5 text-center">{s.specialty || '—'}</td>
                        <td className="border border-slate-900 px-1.5 py-1.5 text-center">{s.unidadeOrganica || s.gabinete || s.areaAtribuicao || '—'}</td>
                        <td className="border border-slate-900 px-1.5 py-1.5 text-center font-mono">{s.numAgente || '—'}</td>
                        <td className="border border-slate-900 px-1.5 py-1.5 text-center font-mono">{s.contact || '—'}</td>
                        <td className="border border-slate-900 px-1.5 py-1.5 text-center no-print">
                          <button
                            type="button"
                            onClick={() => openEfetividadeQuickModal(s)}
                            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold cursor-pointer"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* RODAPÉ OFICIAL DE ASSINATURA */}
            <div className="pt-10 pb-4 text-center space-y-1">
              <p className="text-xs font-serif font-bold text-slate-900">O Director</p>
              <div className="pt-8">
                <div className="w-64 mx-auto border-b border-slate-900"></div>
                <p className="text-xs font-serif italic text-slate-800 pt-1">
                  ({schoolSettings?.directorName || staffList.find(s => s.role === 'DIRECTOR_GERAL')?.name || 'Nome do Assinante'})
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. CABEÇALHO */}
      {!isAdding && rhViewMode !== 'DASHBOARD' && rhViewMode !== 'MAPA_EFETIVIDADE' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          {/* Topo Horizontal */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 gap-4">
            <div className="flex items-center gap-2.5 text-indigo-650 shrink-0">
              <Users className="w-6 h-6 text-indigo-600" />
              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                RECURSOS HUMANOS (RH)
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-bold tracking-wide md:text-right">
              Cadastre, controle e filtre as fichas funcionais dos colaboradores escolares por departamento ou área de competência.
            </p>
          </div>

          {/* Linha de Pesquisa e Ações */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="relative flex-1 w-full">
              <input
                id="search-rh-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por Nome, ID, Nº de Agente ou Cargo..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-450 focus:outline-hidden focus:border-indigo-500 focus:bg-white font-semibold transition-all shadow-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>

            {/* Filtro por Tipo de Vínculo */}
            <div className="shrink-0 w-full sm:w-auto">
              <select
                value={filtroVinculo}
                onChange={(e) => setFiltroVinculo(e.target.value as any)}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer shadow-xs"
              >
                <option value="TODOS">Todos os Vínculos</option>
                <option value="EFETIVO">Efetivos (Com Nº Agente)</option>
                <option value="NAO_EFETIVO">Não Efetivos (Contratados)</option>
              </select>
            </div>

            {/* Botão Alinhado à Direita: Limpar RH */}
            {userRole !== 'PROFESSOR' ? (
              onClearAllStaff && staffList.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDoubleConfirm(true);
                    setClearConfirmText('');
                  }}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-sm"
                  title="Apagar todos os funcionários do cadastro de RH"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Limpar RH</span>
                </button>
              )
            ) : (
              <div className="text-[11px] font-bold text-slate-400 bg-slate-50 border px-3 py-2 rounded-lg shrink-0">
                🔒 Acesso Restrito de Leitura
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Subpainel de Formulário Header com Seta "Voltar ao Menu de RH" no Topo */
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulseOnce">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingStaffId(null);
                setNewId('');
                setNewName('');
                setNewPassword('12345');
                setSelectedClasses([]);
                setSelectedSections([]);
                setSelectedSubjects([]);
                setFormError('');
              }}
              className="group flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-600 group-hover:-translate-x-0.5 transition-transform" />
              <span>Voltar ao Menu de RH</span>
            </button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Gestão de RH</p>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                {editingStaffId ? 'Actualizar Ficha Funcional' : 'Novo Cadastro de Colaborador'}
              </h2>
            </div>
          </div>
          <div className="text-[11px] font-black text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>Formulário de Cadastro Protegido</span>
          </div>
        </div>
      )}

      {/* 2. ABAS DE FILTRAGEM (Mostradas apenas na Listagem) */}
      {!isAdding && (
        <div className="space-y-4">
          <div className="relative group/tabs flex items-center bg-slate-100 border border-slate-250 p-1 rounded-2xl">
            <style>{`
              .no-scrollbar::-webkit-scrollbar {
                display: none;
              }
              .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            
            {/* Seta Esquerda */}
            {showLeftArrow && (
              <button
                type="button"
                onClick={() => scrollTabs('left')}
                className="absolute left-2 z-10 p-1.5 bg-white/95 backdrop-blur-xs border border-slate-250 text-slate-700 rounded-lg hover:bg-slate-50 transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center animate-pulseOnce"
              >
                <ChevronLeft className="w-3.5 h-3.5 font-bold text-slate-600" />
              </button>
            )}

            {/* Abas Container */}
            <div 
              ref={tabsRef}
              onScroll={checkScroll}
              className="no-scrollbar flex overflow-x-auto gap-1 w-full py-0.5 px-1 scroll-smooth"
            >
              <button
                type="button"
                onClick={() => { setActiveTabRH('TODOS'); setIsAdding(false); setCargoSelecionado('TODOS'); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 ${
                  activeTabRH === 'TODOS' && !isAdding 
                    ? 'bg-white text-indigo-700 shadow-sm font-extrabold border border-slate-200/50 scale-[1.01]' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <Users className={`w-4 h-4 ${activeTabRH === 'TODOS' && !isAdding ? 'text-indigo-600' : 'text-slate-450'}`} />
                <span>Todos os Membros</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTabRH('CHEFIA'); setIsAdding(false); setCargoSelecionado('CHEFIA'); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 ${
                  activeTabRH === 'CHEFIA' && !isAdding 
                    ? 'bg-white text-indigo-700 shadow-sm font-extrabold border border-slate-200/50 scale-[1.01]' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 ${activeTabRH === 'CHEFIA' && !isAdding ? 'text-amber-500' : 'text-slate-450'}`} />
                <span>Cargos de Chefia</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTabRH('COORDENACAO'); setIsAdding(false); setCargoSelecionado('COORDENACAO'); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 ${
                  activeTabRH === 'COORDENACAO' && !isAdding 
                    ? 'bg-white text-indigo-700 shadow-sm font-extrabold border border-slate-200/50 scale-[1.01]' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <Award className={`w-4 h-4 ${activeTabRH === 'COORDENACAO' && !isAdding ? 'text-teal-500' : 'text-slate-450'}`} />
                <span>Coordenação</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTabRH('PROFESSORES'); setIsAdding(false); setCargoSelecionado('PROFESSORES'); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 ${
                  activeTabRH === 'PROFESSORES' && !isAdding 
                    ? 'bg-white text-indigo-700 shadow-sm font-extrabold border border-slate-200/50 scale-[1.01]' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <BookOpen className={`w-4 h-4 ${activeTabRH === 'PROFESSORES' && !isAdding ? 'text-indigo-500' : 'text-slate-450'}`} />
                <span>Docentes / Professores</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTabRH('LIMPEZA'); setIsAdding(false); setCargoSelecionado('LIMPEZA'); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 ${
                  activeTabRH === 'LIMPEZA' && !isAdding 
                    ? 'bg-white text-indigo-700 shadow-sm font-extrabold border border-slate-200/50 scale-[1.01]' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${activeTabRH === 'LIMPEZA' && !isAdding ? 'text-emerald-500' : 'text-slate-450'}`} />
                <span>Auxiliares de Limpeza</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTabRH('SEGURANCA'); setIsAdding(false); setCargoSelecionado('SEGURANCA'); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 ${
                  activeTabRH === 'SEGURANCA' && !isAdding 
                    ? 'bg-white text-indigo-700 shadow-sm font-extrabold border border-slate-200/50 scale-[1.01]' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <Sliders className={`w-4 h-4 ${activeTabRH === 'SEGURANCA' && !isAdding ? 'text-rose-500' : 'text-slate-450'}`} />
                <span>Seguranças / Vigilantes</span>
              </button>
            </div>

            {/* Seta Direita */}
            {showRightArrow && (
              <button
                type="button"
                onClick={() => scrollTabs('right')}
                className="absolute right-2 z-10 p-1.5 bg-white/95 backdrop-blur-xs border border-slate-250 text-slate-700 rounded-lg hover:bg-slate-50 transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center animate-pulseOnce"
              >
                <ChevronRight className="w-3.5 h-3.5 font-bold text-slate-600" />
              </button>
            )}
          </div>

          {/* Botão Condicional "Cadastrar Novo Funcionário" Contextualizado por Categoria */}
          {cargoSelecionado && userRole !== 'PROFESSOR' && (
            <div className="flex justify-end animate-fadeIn">
              <button
                id="btn-toggle-add-staff"
                onClick={() => {
                  setIsAdding(true);
                  setEditingStaffId(null);
                  setNewId('');
                  setNewName('');
                  setNewPassword('12345');
                  setSelectedClasses([]);
                  setSelectedSections([]);
                  setSelectedSubjects([]);
                  setFormError('');
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:scale-[1.01] active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Cadastrar Novo Funcionário ({CATEGORY_LABELS[cargoSelecionado]})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. FORMULÁRIO DE CADASTRO / EDIÇÃO */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-md space-y-6 animate-pulseOnce">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>{editingStaffId ? 'Actualizar Ficha Funcional de Colaborador' : 'Inserir Nova Ficha de Funcionário de RH'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">O sistema extrairá as iniciais e gerará um ID único conforme o cargo.</p>
          </div>

          {formError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            
            {/* Field 1: Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Nome Completo do Funcionário *</label>
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
              <p className="mt-1 text-[10px] text-slate-500">
                Nota: Insira o nome respeitando a norma ortográfica. O sistema irá ajustar automaticamente as iniciais para maiúsculas.
              </p>
            </div>

            {/* Field 2: Funçao */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Função ou Cargo Desempenhado *</label>
              <select
                value={newRole}
                onChange={(e) => {
                  setNewRole(e.target.value as StaffRole);
                  setNewId(''); // reset ID because position changed
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer"
              >
                {/* Se estiver em uma aba específica, filtrar as opções de cargo mostradas para ficar super focado */}
                {Object.entries(ROLE_LABELS).filter(([role]) => {
                  if (activeTabRH === 'CHEFIA') {
                    return ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'TECNICO_PEDAGOGICO', 'TECNICO_ADMINISTRATIVO'].includes(role);
                  }
                  if (activeTabRH === 'COORDENACAO') {
                    return ['COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA', 'COORDENADOR_PRATICAS_PEDAGOGICAS', 'COORDENADOR'].includes(role);
                  }
                  if (activeTabRH === 'PROFESSORES') {
                    return role === 'PROFESSOR';
                  }
                  if (activeTabRH === 'LIMPEZA') {
                    return role === 'AUXILIAR_LIMPEZA';
                  }
                  if (activeTabRH === 'SEGURANCA') {
                    return role === 'SEGURANCA';
                  }
                  return true;
                }).map(([role, label]) => (
                  <option key={role} value={role}>{label}</option>
                ))}
              </select>
            </div>

            {/* Field 3: Generated ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                <span>Nº ID de Início de Sessão *</span>
                <span className="text-[10px] text-slate-400 italic">Editável</span>
              </label>
              <input
                type="text"
                required
                value={newId}
                onChange={(e) => setNewId(e.target.value.trim().toUpperCase())}
                placeholder="Ex: MAP674"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono font-extrabold focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              />
            </div>

            {/* Field 4: Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                <span>Senha d'Acesso *</span>
                <span className="text-[10px] text-slate-400 italic">Padrão: 12345</span>
              </label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ex: 12345"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono font-extrabold focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              />
            </div>

            {/* Field 5: Contacto Telefónico */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                <span>Contacto Telefónico *</span>
                <span className="text-[10px] text-amber-600 font-bold">Obrigatório para Segurança</span>
              </label>
              <input
                type="tel"
                required
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                placeholder="Ex: 923 456 789"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono font-bold focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Utilizado para verificação e recuperação de senha no ecrã de login.
              </p>
            </div>

            {/* Secção de Vínculo & Dados para Mapa de Efetividade */}
            <div className="col-span-1 md:col-span-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 my-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2.5 gap-1">
                <span className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <span>Vínculo Institucional & Dados do Mapa de Efetividade (RH)</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  Apenas funcionários com Nº de Agente figurarão no Mapa de Efetividade
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Vínculo Efetivo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">É Funcionário Efetivo? *</label>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setNewIsEfetivo(true)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-black cursor-pointer transition-all ${
                        newIsEfetivo 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>Sim (Efetivo)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewIsEfetivo(false);
                        setNewNumAgente('');
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-black cursor-pointer transition-all ${
                        !newIsEfetivo 
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>Não (Contratado)</span>
                    </button>
                  </div>
                </div>

                {/* Nº de Agente */}
                {newIsEfetivo ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex justify-between items-center">
                      <span>Nº de Agente do Estado *</span>
                      <span className="text-[10px] text-emerald-700 font-black uppercase">Obrigatório</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newNumAgente}
                      onChange={(e) => setNewNumAgente(e.target.value)}
                      placeholder="Ex: 849204"
                      className="w-full bg-emerald-50/30 border border-emerald-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-black focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Nº de Agente do Estado</label>
                    <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 font-medium italic text-center">
                      Não aplicável (Não Efetivo)
                    </div>
                  </div>
                )}

                {/* Categoria Profissional */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Categoria Profissional</label>
                  <input
                    type="text"
                    value={newCategoria}
                    onChange={(e) => setNewCategoria(e.target.value)}
                    placeholder="Ex: Prof. do Ensino Primário e Secundário"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* Tempo de Serviço */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tempo de Serviço</label>
                  <input
                    type="text"
                    value={newTempoServico}
                    onChange={(e) => setNewTempoServico(e.target.value)}
                    placeholder="Ex: 8 Anos"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* Data de Nascimento */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Data de Nascimento</label>
                  <input
                    type="date"
                    value={newDataNascimento}
                    onChange={(e) => setNewDataNascimento(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* Nº de Seguro Social */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nº de Seguro Social / INSS</label>
                  <input
                    type="text"
                    value={newNumSeguroSocial}
                    onChange={(e) => setNewNumSeguroSocial(e.target.value)}
                    placeholder="Ex: 00928374"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono font-semibold focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* Habilitações Literárias */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Habilitações Literárias</label>
                  <select
                    value={newHabilitacoesLiterarias}
                    onChange={(e) => setNewHabilitacoesLiterarias(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-bold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Licenciatura">Licenciatura</option>
                    <option value="Bacharelato">Bacharelato</option>
                    <option value="Mestrado">Mestrado</option>
                    <option value="Doutoramento">Doutoramento</option>
                    <option value="Técnico Médio">Técnico Médio</option>
                    <option value="Ensino Secundário">Ensino Secundário</option>
                  </select>
                </div>

                {/* Género */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Género</label>
                  <select
                    value={newGenero}
                    onChange={(e) => setNewGenero(e.target.value as 'M' | 'F')}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-bold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="M">Masculino (M)</option>
                    <option value="F">Feminino (F)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Campos Específicos para Cargos de Chefia */}
            {['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'TECNICO_PEDAGOGICO', 'TECNICO_ADMINISTRATIVO'].includes(newRole) && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-755 mb-1.5 text-amber-600">Gabinete de Trabalho</label>
                  <input
                    type="text"
                    value={newGabinete}
                    onChange={(e) => setNewGabinete(e.target.value)}
                    placeholder="Ex: Gabinete de Direcção"
                    className="w-full bg-amber-50/20 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-755 mb-1.5 text-amber-600">Decreto ou Despacho de Nomeação</label>
                  <input
                    type="text"
                    value={newDecretoNomeacao}
                    onChange={(e) => setNewDecretoNomeacao(e.target.value)}
                    placeholder="Ex: Despacho Nº 105/MED-2025"
                    className="w-full bg-amber-50/20 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </>
            )}

            {/* Campos Específicos para Coordenação */}
            {['COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA', 'COORDENADOR_PRATICAS_PEDAGOGICAS', 'COORDENADOR'].includes(newRole) && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-755 mb-1.5 text-teal-600">Tipo de Coordenação *</label>
                  <select
                    value={newTipoCoordenacao}
                    onChange={(e) => setNewTipoCoordenacao(e.target.value as any)}
                    className="w-full bg-teal-50/20 border border-teal-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-teal-500 focus:bg-white cursor-pointer"
                  >
                    <option value="TURNO">Coordenação de Turno</option>
                    <option value="DISCIPLINA">Coordenação de Disciplina</option>
                    <option value="PRATICAS_PEDAGOGICAS">Coordenação de Práticas Pedagógicas</option>
                  </select>
                </div>

                {newTipoCoordenacao === 'TURNO' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-755 mb-1.5 text-teal-600">Turno Sob Responsabilidade *</label>
                    <select
                      value={newTurnoCoordenado}
                      onChange={(e) => setNewTurnoCoordenado(e.target.value)}
                      className="w-full bg-teal-50/20 border border-teal-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-teal-500 focus:bg-white cursor-pointer"
                    >
                      <option value="Manhã">Manhã (P. Período)</option>
                      <option value="Tarde">Tarde (S. Período)</option>
                      <option value="Noite">Noite (T. Período)</option>
                    </select>
                  </div>
                ) : newTipoCoordenacao === 'DISCIPLINA' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-755 mb-1.5 text-teal-600">Disciplina Curricular Coordenada *</label>
                    <select
                      value={newDisciplinaCoordenada}
                      onChange={(e) => setNewDisciplinaCoordenada(e.target.value as any)}
                      className="w-full bg-teal-50/20 border border-teal-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-teal-500 focus:bg-white cursor-pointer"
                    >
                      {availableSubjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-755 mb-1.5 text-teal-600">Âmbito de Supervisão Pedagógica / Estágios *</label>
                    <input
                      type="text"
                      value={newAreaAtribuicao || 'Supervisão de Práticas Pedagógicas e Estágios Docentes'}
                      onChange={(e) => setNewAreaAtribuicao(e.target.value)}
                      placeholder="Ex: Supervisão de Práticas Pedagógicas do Liceu / Magistério"
                      className="w-full bg-teal-50/20 border border-teal-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-teal-500 focus:bg-white font-medium"
                    />
                  </div>
                )}
              </>
            )}

            {/* Campos Específicos para Professores */}
            {newRole === 'PROFESSOR' && (
              <div>
                <label className="block text-xs font-bold text-slate-755 mb-1.5 text-indigo-600">Habilitações Literárias *</label>
                <select
                  value={newCategoriaPedagogica}
                  onChange={(e) => setNewCategoriaPedagogica(e.target.value)}
                  className="w-full bg-indigo-50/20 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer font-bold"
                >
                  <option value="Técnico Médio">Técnico Médio</option>
                  <option value="Licenciado">Licenciado</option>
                  <option value="Mestre">Mestre</option>
                </select>
              </div>
            )}

            {/* Campos Específicos para Auxiliar de Limpeza */}
            {newRole === 'AUXILIAR_LIMPEZA' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-755 mb-1.5 text-emerald-600">Área ou Pavilhão de Atribuição *</label>
                  <input
                    type="text"
                    required
                    value={newAreaAtribuicao}
                    onChange={(e) => setNewAreaAtribuicao(e.target.value)}
                    placeholder="Ex: Pavilhão B (Salas 12-24)"
                    className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-755 mb-1.5 text-emerald-600">Turno de Trabalho *</label>
                  <select
                    value={newTurnoCoordenado}
                    onChange={(e) => setNewTurnoCoordenado(e.target.value)}
                    className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:bg-white cursor-pointer"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>
              </>
            )}

            {/* Campos Específicos para Segurança / Vigilante */}
            {newRole === 'SEGURANCA' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-755 mb-1.5 text-rose-600">Posto de Guarita principal</label>
                  <input
                    type="text"
                    required
                    value={newPostoGuarita}
                    onChange={(e) => setNewPostoGuarita(e.target.value)}
                    placeholder="Ex: Guarita Principal / Portão"
                    className="w-full bg-rose-50/20 border border-rose-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-rose-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-755 mb-1.5 text-rose-600">Escala / Turno de Trabalho *</label>
                  <select
                    value={newTipoEscalaVigilante}
                    onChange={(e) => setNewTipoEscalaVigilante(e.target.value)}
                    className="w-full bg-rose-50/20 border border-rose-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-rose-500 focus:bg-white cursor-pointer"
                  >
                    <option value="12h/24h">Escala 12h / 24h</option>
                    <option value="24h/48h">Escala 24h / 48h</option>
                    <option value="Diurno">Fixo Diurno</option>
                    <option value="Nocturno">Fixo Nocturno</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-755 mb-1.5 text-rose-600">ID de Colete / Credencial de Vigilância</label>
                  <input
                    type="text"
                    value={newIdColeteVigilante}
                    onChange={(e) => setNewIdColeteVigilante(e.target.value)}
                    placeholder="Ex: COLETE-92"
                    className="w-full bg-rose-50/20 border border-rose-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-rose-500 focus:bg-white"
                  />
                </div>
              </>
            )}

          </div>

          {/* Atribuições para Professor */}
          {newRole === 'PROFESSOR' && (
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-6 animate-slideRight">
              
              <div className="text-xs font-black text-slate-800 uppercase flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Atribuição Curricular Inteligente (Classe + Turma + Disciplina)</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal normal-case">
                  Acumule múltiplas disciplinas e turmas com verificação automática de duplicidade e conflitos.
                </span>
              </div>

              {/* 1. Subsistema Activo & Seleção de Especialidade (Ramo) */}
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-4 shadow-3xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Subsistema / Modalidade */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      1.1 Subsistema de Ensino Activo *
                    </label>
                    {availableModalities.length === 1 ? (
                      <div className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs font-black text-indigo-950 flex items-center justify-between shadow-3xs">
                        <span>{availableModalities[0].label}</span>
                        <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-100 uppercase tracking-wider font-bold">
                          Subsistema Activo no SIGEP
                        </span>
                      </div>
                    ) : (
                      <select
                        value={formModality}
                        onChange={(e) => {
                          const newMod = e.target.value as ModalityType;
                          setFormModality(newMod);
                          setWizardClass('');
                          setWizardSubject('');
                          setWizardSection('');
                        }}
                        className="w-full bg-indigo-50/60 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-indigo-950 focus:outline-hidden focus:border-indigo-500 cursor-pointer shadow-3xs"
                      >
                        {availableModalities.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Especialidade / Ramo */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      1.2 Especialidade / Ramo de Formação *
                    </label>
                    {formModality === 'ENSINO_PRIMARIO' ? (
                      <div className="p-2.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 border border-slate-200">
                        Ensino Geral Unificado (GERAL)
                      </div>
                    ) : formModality === 'PUNIV' ? (
                      <select
                        value={selectedSpecialty}
                        onChange={(e) => setSelectedSpecialty(e.target.value)}
                        className="w-full bg-indigo-50/40 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-indigo-950 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="CFB">CFB - Ciências Físicas e Biológicas</option>
                        <option value="CEJ">CEJ - Ciências Económico-Jurídicas</option>
                        <option value="CS">CS - Ciências Sociais e Humanas</option>
                        <option value="AV">AV - Artes Visuais</option>
                      </select>
                    ) : (
                      <select
                        value={selectedSpecialty}
                        onChange={(e) => setSelectedSpecialty(e.target.value)}
                        className="w-full bg-indigo-50/40 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-indigo-950 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="MF">MF - Matemática e Física</option>
                        <option value="GH">GH - História e Geografia</option>
                        <option value="BQ">BQ - Biologia e Química</option>
                        <option value="LEMC">LEMC - Língua Portuguesa e EMC</option>
                        <option value="EP">EP - Ensino Primário</option>
                        <option value="PE">PE - Educação Pré-Escolar</option>
                        <option value="ING_EMC">ING_EMC - Inglês e EMC</option>
                        <option value="FRA_EMC">FRA_EMC - Francês e EMC</option>
                        <option value="EVP">EVP - Educação Visual e Plástica</option>
                        <option value="EDF">EDF - Educação Física</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* LISTA DE ATRIBUIÇÕES ACUMULADAS */}
              <div className="bg-white rounded-xl border border-indigo-100 p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black uppercase text-slate-800">
                      Atribuições Acumuladas deste Docente ({accumulatedAssignments.length})
                    </span>
                  </div>
                  {accumulatedAssignments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAccumulatedAssignments([]);
                        setSelectedClasses([]);
                        setSelectedSections([]);
                        setSelectedSubjects([]);
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Esvaziar Lista
                    </button>
                  )}
                </div>

                {accumulatedAssignments.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-1">
                    <p className="text-xs font-bold text-slate-600">Nenhuma atribuição acumulada para este professor.</p>
                    <p className="text-[10px] text-slate-400">Utilize o seletor em passos abaixo para adicionar combinações de Classe, Turma e Disciplina.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-600 font-extrabold border-b border-slate-200 text-[10px] uppercase">
                          <th className="p-2.5">Classe</th>
                          <th className="p-2.5">Turma</th>
                          <th className="p-2.5">Disciplina</th>
                          <th className="p-2.5">Especialidade</th>
                          <th className="p-2.5 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {accumulatedAssignments.map((ass, idx) => (
                          <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="p-2.5 font-black text-indigo-900">{ass.class}ª Classe</td>
                            <td className="p-2.5 font-bold text-emerald-700">Turma {ass.section}</td>
                            <td className="p-2.5 font-extrabold text-slate-800">{ass.subject}</td>
                            <td className="p-2.5 font-semibold text-slate-500">{ass.specialty || selectedSpecialty || 'GERAL'}</td>
                            <td className="p-2.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAssignmentIndex(idx);
                                    setEditAssClass(ass.class);
                                    setEditAssSection(ass.section);
                                    setEditAssSubject(ass.subject);
                                  }}
                                  className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar esta atribuição (Mudar Classe, Turma ou Disciplina)"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = accumulatedAssignments.filter((_, i) => i !== idx);
                                    setAccumulatedAssignments(updated);
                                    setSelectedClasses(Array.from(new Set(updated.map(a => a.class))));
                                    setSelectedSections(Array.from(new Set(updated.map(a => a.section))));
                                    setSelectedSubjects(Array.from(new Set(updated.map(a => a.subject))) as SubjectType[]);
                                  }}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remover Atribuição"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* PAINEL SELETOR EM PASSOS PARA ADICIONAR NOVA ATRIBUIÇÃO */}
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-indigo-950 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <span>Adicionar Nova Atribuição Curricular (Passo a Passo)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Passo 1: Classe */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                      Passo 1: Selecionar Classe *
                    </label>
                    <select
                      value={wizardClass}
                      onChange={(e) => {
                        setWizardClass(e.target.value);
                        setWizardSubject('');
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800 focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Selecione a Classe --</option>
                      {classesList.map(c => (
                        <option key={c} value={c}>{c}ª Classe</option>
                      ))}
                    </select>
                  </div>

                  {/* Passo 2: Disciplina */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                      Passo 2: Selecionar Disciplina *
                    </label>
                    <select
                      value={wizardSubject}
                      onChange={(e) => setWizardSubject(e.target.value)}
                      disabled={!wizardClass}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800 focus:border-indigo-500 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="">-- Selecione a Disciplina --</option>
                      {(wizardClass ? getSubjectsForClass(wizardClass, formModality, selectedSpecialty) : []).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Passo 3: Turma */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                      Passo 3: Selecionar Turma *
                    </label>
                    <select
                      value={wizardSection}
                      onChange={(e) => setWizardSection(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800 focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Selecione a Turma --</option>
                      {sectionsList.map(sec => (
                        <option key={sec} value={sec}>Turma {sec}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Passo 4: Botão Adicionar */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!wizardClass || !wizardSubject || !wizardSection) {
                        alert('Por favor selecione a Classe, a Disciplina e a Turma para adicionar.');
                        return;
                      }

                      // 1. Verificar duplicidade no próprio professor
                      const exists = accumulatedAssignments.some(
                        a => a.class === wizardClass && a.section === wizardSection && a.subject === wizardSubject
                      );
                      if (exists) {
                        alert(`Atribuição Duplicada: A disciplina "${wizardSubject}" na ${wizardClass}ª Classe, Turma ${wizardSection} já consta da lista deste professor.`);
                        return;
                      }

                      // 2. Verificar se outro professor já tem essa disciplina na mesma classe e turma
                      const conflictProf = staffList.find(s => {
                        if (s.id === editingStaffId || s.role !== 'PROFESSOR') return false;
                        const sAss = s.assignments || [];
                        if (sAss.length > 0) {
                          return sAss.some(a => a.class === wizardClass && a.section === wizardSection && a.subject === wizardSubject);
                        }
                        return (s.classes || []).includes(wizardClass) && (s.sections || []).includes(wizardSection) && (s.subjects || []).includes(wizardSubject as any);
                      });

                      if (conflictProf) {
                        alert(`Conflito Bloqueado: A disciplina "${wizardSubject}" na ${wizardClass}ª Classe, Turma ${wizardSection} já se encontra atribuída ao Professor ${conflictProf.name} (ID: ${conflictProf.id}). O sistema não permite a atribuição da mesma disciplina na mesma turma a múltiplos professores.`);
                        return;
                      }

                      const updated = [
                        ...accumulatedAssignments,
                        { class: wizardClass, section: wizardSection, subject: wizardSubject, specialty: selectedSpecialty }
                      ];

                      setAccumulatedAssignments(updated);
                      setSelectedClasses(Array.from(new Set(updated.map(a => a.class))));
                      setSelectedSections(Array.from(new Set(updated.map(a => a.section))));
                      setSelectedSubjects(Array.from(new Set(updated.map(a => a.subject))) as SubjectType[]);

                      // Limpar seletores do wizard para permitira rápida adição sequencial
                      setWizardSubject('');
                    }}
                    disabled={!wizardClass || !wizardSubject || !wizardSection}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar à Lista de Atribuições</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ASSISTENTE DE EDIÇÃO DE ATRIBUIÇÃO CURRICULAR EXISTENTE */}
          {editingAssignmentIndex !== null && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
                <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase">Assistente de Edição de Atribuição</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Ajuste a Classe, Turma ou Disciplina com validação em tempo real</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingAssignmentIndex(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Seleção de Classe */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">1. Classe Curricular *</label>
                    <select
                      value={editAssClass}
                      onChange={(e) => {
                        const newC = e.target.value;
                        setEditAssClass(newC);
                        const subs = getSubjectsForClass(newC, formModality, selectedSpecialty);
                        if (!subs.includes(editAssSubject as any)) {
                          setEditAssSubject(subs[0] || '');
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:border-indigo-500 cursor-pointer"
                    >
                      {classesList.map(c => (
                        <option key={c} value={c}>{c}ª Classe</option>
                      ))}
                    </select>
                  </div>

                  {/* Seleção de Disciplina */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">2. Disciplina *</label>
                    <select
                      value={editAssSubject}
                      onChange={(e) => setEditAssSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:border-indigo-500 cursor-pointer"
                    >
                      {(editAssClass ? getSubjectsForClass(editAssClass, formModality, selectedSpecialty) : []).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Seleção de Turma */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">3. Turma *</label>
                    <select
                      value={editAssSection}
                      onChange={(e) => setEditAssSection(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:border-indigo-500 cursor-pointer"
                    >
                      {sectionsList.map(sec => (
                        <option key={sec} value={sec}>Turma {sec}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Botões de Ação do Assistente */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 font-bold">
                  <button
                    type="button"
                    onClick={() => setEditingAssignmentIndex(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editAssClass || !editAssSection || !editAssSubject) {
                        alert('Por favor preencha todos os campos da atribuição.');
                        return;
                      }

                      // 1. Validar se o próprio professor já possui esta atribuição em outra linha
                      const isDuplicateSelf = accumulatedAssignments.some((a, i) =>
                        i !== editingAssignmentIndex && a.class === editAssClass && a.section === editAssSection && a.subject === editAssSubject
                      );
                      if (isDuplicateSelf) {
                        alert(`Atribuição Duplicada: O professor já possui a disciplina "${editAssSubject}" atribuída na ${editAssClass}ª Classe, Turma ${editAssSection}.`);
                        return;
                      }

                      // 2. Validar se outro professor já leciona esta disciplina na mesma classe e turma
                      const conflictProf = staffList.find(s => {
                        if (s.id === editingStaffId || s.role !== 'PROFESSOR') return false;
                        const sAss = s.assignments || [];
                        if (sAss.length > 0) {
                          return sAss.some(a => a.class === editAssClass && a.section === editAssSection && a.subject === editAssSubject);
                        }
                        return (s.classes || []).includes(editAssClass) && (s.sections || []).includes(editAssSection) && (s.subjects || []).includes(editAssSubject as any);
                      });

                      if (conflictProf) {
                        alert(`Conflito Bloqueado: A disciplina "${editAssSubject}" na ${editAssClass}ª Classe, Turma ${editAssSection} já se encontra atribuída ao Professor ${conflictProf.name} (ID: ${conflictProf.id}). O sistema não permite atribuição duplicada para a mesma turma.`);
                        return;
                      }

                      // Atualizar atribuição no estado
                      const updated = accumulatedAssignments.map((a, i) => {
                        if (i === editingAssignmentIndex) {
                          return { class: editAssClass, section: editAssSection, subject: editAssSubject, specialty: selectedSpecialty };
                        }
                        return a;
                      });

                      setAccumulatedAssignments(updated);
                      setSelectedClasses(Array.from(new Set(updated.map(a => a.class))));
                      setSelectedSections(Array.from(new Set(updated.map(a => a.section))));
                      setSelectedSubjects(Array.from(new Set(updated.map(a => a.subject))) as SubjectType[]);

                      setEditingAssignmentIndex(null);
                      alert(`Atribuição alterada com sucesso para ${editAssClass}ª Classe, Turma ${editAssSection} - ${editAssSubject}!`);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs transition-colors"
                  >
                    Guardar Alteração
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 font-bold">
            <button
              type="button"
              onClick={() => {
                setNewName('');
                setNewPassword('12345');
                setSelectedClasses([]);
                setSelectedSections([]);
                setSelectedSubjects([]);
                setFormError('');
              }}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-250 text-amber-700 rounded-xl text-xs cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Limpar Ficha</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingStaffId(null);
                setNewId('');
                setNewName('');
                setNewPassword('12345');
                setSelectedClasses([]);
                setSelectedSections([]);
                setSelectedSubjects([]);
                setFormError('');
              }}
              className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs transition-all shadow-sm cursor-pointer font-extrabold tracking-wide"
            >
              Cadastrar
            </button>
          </div>

        </form>
      )}

      {/* 4. LISTAGEM GERAL DE RECURSOS HUMANOS (ESTILO PAUTA OU CARDS DE CHEFIA) */}
      {!isAdding && (
        <div className="space-y-4 animate-pulseOnce">
          
          {activeTabRH === 'CHEFIA' ? (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    {selectedChefiaRole ? `Gestão de Chefia: ${ROLE_LABELS[selectedChefiaRole]}` : 'Visualização por Departamentos de Chefia'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                    {selectedChefiaRole ? 'Nomeie, consulte e edite os colaboradores de chefia deste departamento.' : 'Clique em qualquer cargo para gerir ou nomear o colaborador responsável.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedChefiaRole && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChefiaRole(null);
                        setIsChefiaFormEditing(false);
                        setChefiaEditStaffId(null);
                        clearChefiaFields();
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center gap-2 shadow-3xs cursor-pointer"
                    >
                      <span>Voltar aos Cargos</span>
                    </button>
                  )}
                  <div className="text-[11px] font-black text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-3xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    <span>Ambiente Seguro DRH</span>
                  </div>
                </div>
              </div>

              {selectedChefiaRole ? (
                /* PAINEL DE GESTÃO DE CHEFIA INTEGRADO DIRETAMENTE NA SECÇÃO */
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-pulseOnce">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 uppercase tracking-widest">
                        {['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA'].includes(selectedChefiaRole) ? 'Cargo Univalente' : 'Cargo Colectivo'}
                      </span>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-1">
                        {ROLE_LABELS[selectedChefiaRole]}
                      </h2>
                    </div>
                  </div>

                  {formError && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* CONTEÚDO PRINCIPAL: Univalente */}
                  {['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA'].includes(selectedChefiaRole) ? (
                    (() => {
                      const titular = staffList.find(s => s.role === selectedChefiaRole);
                      const isPreenchido = !!titular;

                      if (isPreenchido && !isChefiaFormEditing) {
                        // Detalhes do titular existente
                        return (
                          <div className="space-y-5">
                            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                              <div className="flex items-center gap-3.5 border-b border-slate-200 pb-4">
                                <div className="w-11 h-11 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-black text-sm text-indigo-700 shadow-2xs uppercase">
                                  {titular.name.charAt(0)}
                                </div>
                                <div className="truncate">
                                  <h3 className="text-xs font-black text-slate-800 truncate">{titular.name}</h3>
                                  <p className="text-[10px] text-slate-500 font-bold mt-1">ID de Sessão: <span className="font-mono text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">{titular.id}</span></p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Senha de Acesso</span>
                                  <span className="font-mono text-slate-700 bg-white px-2 py-1.5 rounded-lg border border-slate-200 block text-center font-bold">
                                    {renderPrivatePassword(titular.id, titular.password)}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Gabinete</span>
                                  <span className="text-slate-700 bg-white px-2 py-1.5 rounded-lg border border-slate-200 block text-center truncate" title={titular.gabinete || 'Não registado'}>
                                    {titular.gabinete || 'Não registado'}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1 pt-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Decreto ou Despacho de Nomeação</span>
                                <span className="text-xs text-slate-700 bg-white px-3 py-2.5 rounded-lg border border-slate-200 block font-bold leading-relaxed">
                                  {titular.decretoNomeacao || 'Sem diploma / despacho associado no sistema'}
                                </span>
                              </div>
                            </div>

                            {userRole !== 'PROFESSOR' && (
                              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsChefiaFormEditing(true);
                                    setChefiaEditStaffId(titular.id);
                                    setNewName(titular.name);
                                    setNewId(titular.id);
                                    setNewPassword(titular.password || '12345');
                                    setNewGabinete(titular.gabinete || '');
                                    setNewDecretoNomeacao(titular.decretoNomeacao || '');
                                  }}
                                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                  <span>Editar Informações do Titular</span>
                                </button>
                                
                                {titular.role !== 'DIRECTOR_GERAL' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleExcluirColaborador(titular.id, titular.name);
                                      setSelectedChefiaRole(null);
                                    }}
                                    className="py-3 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Dispensar Registo</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        // Formulário de Cadastro / Edição Univalente
                        return (
                          <form onSubmit={handleChefiaSubmit} className="space-y-4">
                            <div className="space-y-3.5 bg-slate-50 border border-slate-200 p-4.5 rounded-2xl">
                              <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-2">
                                <Sparkles className="w-4 h-4 text-indigo-600" />
                                <span>{chefiaEditStaffId ? 'Editar Cadastro de Chefia' : 'Nomear Titular para o Cargo'}</span>
                              </h3>

                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo *</label>
                                <input
                                  type="text"
                                  required
                                  value={newName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setNewName(val);
                                    if (!chefiaEditStaffId) {
                                      setNewId(generateStaffId(val || 'Novo', selectedChefiaRole, staffList.map(s => s.id)));
                                    }
                                  }}
                                  onBlur={() => {
                                    const formatted = formatarNomeProprio(newName);
                                    setNewName(formatted);
                                    if (!chefiaEditStaffId) {
                                      setNewId(generateStaffId(formatted || 'Novo', selectedChefiaRole, staffList.map(s => s.id)));
                                    }
                                  }}
                                  autoCapitalize="words"
                                  placeholder="Ex: Manuel António Chilombo"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                                />
                                <p className="mt-1 text-[10px] text-slate-500">
                                  Nota: Insira o nome respeitando a norma ortográfica. O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">ID de Sessão *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newId}
                                    disabled={!!chefiaEditStaffId}
                                    onChange={(e) => setNewId(e.target.value.trim().toUpperCase())}
                                    placeholder="ID de Sessão"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-extrabold text-indigo-650 focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Senha de Acesso *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Padrão: 12345"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Gabinete de Trabalho</label>
                                <input
                                  type="text"
                                  value={newGabinete}
                                  onChange={(e) => setNewGabinete(e.target.value)}
                                  placeholder="Ex: Gabinete de Direcção"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Decreto ou Despacho de Nomeação</label>
                                <input
                                  type="text"
                                  value={newDecretoNomeacao}
                                  onChange={(e) => setNewDecretoNomeacao(e.target.value)}
                                  placeholder="Ex: Despacho Nº 105/MED-2025"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                                />
                              </div>

                              {/* Vínculo & Efetividade */}
                              <div className="space-y-3 pt-2 border-t border-slate-200">
                                <label className="block text-xs font-black uppercase text-slate-800">
                                  Vínculo Institucional & Efetividade
                                </label>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Funcionário Efetivo? *</label>
                                    <select
                                      value={newIsEfetivo ? 'SIM' : 'NAO'}
                                      onChange={(e) => {
                                        const isEf = e.target.value === 'SIM';
                                        setNewIsEfetivo(isEf);
                                        if (!isEf) setNewNumAgente('');
                                      }}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                                    >
                                      <option value="SIM">Sim (Efetivo)</option>
                                      <option value="NAO">Não (Contratado)</option>
                                    </select>
                                  </div>

                                  {newIsEfetivo ? (
                                    <div>
                                      <label className="block text-[11px] font-bold text-emerald-800 mb-1">Nº de Agente *</label>
                                      <input
                                        type="text"
                                        required
                                        value={newNumAgente}
                                        onChange={(e) => setNewNumAgente(e.target.value)}
                                        placeholder="Ex: 849204"
                                        className="w-full bg-emerald-50/30 border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Nº de Agente</label>
                                      <div className="py-1.5 px-2 bg-slate-100 border border-slate-200 rounded-xl text-[10px] text-slate-400 font-semibold italic text-center">
                                        Não aplicável
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Contacto Telefónico *</label>
                                    <input
                                      type="tel"
                                      required
                                      value={newContact}
                                      onChange={(e) => setNewContact(e.target.value)}
                                      placeholder="Ex: 923 456 789"
                                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Categoria Profissional</label>
                                    <input
                                      type="text"
                                      value={newCategoria}
                                      onChange={(e) => setNewCategoria(e.target.value)}
                                      placeholder="Ex: Quadro Superior"
                                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2.5 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (chefiaEditStaffId) {
                                    setIsChefiaFormEditing(false);
                                  } else {
                                    setSelectedChefiaRole(null);
                                  }
                                }}
                                className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                              >
                                Gravar Titular
                              </button>
                            </div>
                          </form>
                        );
                      }
                    })()
                  ) : (
                    /* CONTEÚDO PRINCIPAL: Multivalente (Técnicos) */
                    (() => {
                      const titulares = staffList.filter(s => s.role === selectedChefiaRole);

                      if (isChefiaFormEditing) {
                        // Formulário de Cadastro / Edição para Técnicos
                        return (
                          <form onSubmit={handleChefiaSubmit} className="space-y-4">
                            <div className="space-y-3.5 bg-slate-50 border border-slate-200 p-4.5 rounded-2xl">
                              <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-2">
                                <Sparkles className="w-4 h-4 text-indigo-600" />
                                <span>{chefiaEditStaffId ? 'Editar Cadastro de Técnico' : 'Adicionar Novo Técnico'}</span>
                              </h3>

                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo do Técnico *</label>
                                <input
                                  type="text"
                                  required
                                  value={newName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setNewName(val);
                                    if (!chefiaEditStaffId) {
                                      setNewId(generateStaffId(val || 'Tecnico', selectedChefiaRole, staffList.map(s => s.id)));
                                    }
                                  }}
                                  onBlur={() => {
                                    const formatted = formatarNomeProprio(newName);
                                    setNewName(formatted);
                                    if (!chefiaEditStaffId) {
                                      setNewId(generateStaffId(formatted || 'Tecnico', selectedChefiaRole, staffList.map(s => s.id)));
                                    }
                                  }}
                                  autoCapitalize="words"
                                  placeholder="Ex: Maria Domingos Cabral"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                                />
                                <p className="mt-1 text-[10px] text-slate-500">
                                  Nota: Insira o nome respeitando a norma ortográfica. O sistema irá ajustar automaticamente as iniciais para maiúsculas.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">ID de Sessão *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newId}
                                    disabled={!!chefiaEditStaffId}
                                    onChange={(e) => setNewId(e.target.value.trim().toUpperCase())}
                                    placeholder="ID de Sessão"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-extrabold text-indigo-650 focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Senha de Acesso *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Padrão: 12345"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Contacto Telefónico *</label>
                                <input
                                  type="tel"
                                  required
                                  value={newContact}
                                  onChange={(e) => setNewContact(e.target.value)}
                                  placeholder="Ex: 923 456 789"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Gabinete / Departamento</label>
                                <input
                                  type="text"
                                  value={newGabinete}
                                  onChange={(e) => setNewGabinete(e.target.value)}
                                  placeholder="Ex: Secretaria Pedagógica / Balcão A"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Decreto ou Despacho de Nomeação</label>
                                <input
                                  type="text"
                                  value={newDecretoNomeacao}
                                  onChange={(e) => setNewDecretoNomeacao(e.target.value)}
                                  placeholder="Ex: Contrato de Trabalho Nº 45/2026"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                                />
                              </div>

                              {/* Vínculo & Efetividade */}
                              <div className="space-y-3 pt-2 border-t border-slate-200">
                                <label className="block text-xs font-black uppercase text-slate-800">
                                  Vínculo Institucional & Efetividade
                                </label>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Funcionário Efetivo? *</label>
                                    <select
                                      value={newIsEfetivo ? 'SIM' : 'NAO'}
                                      onChange={(e) => {
                                        const isEf = e.target.value === 'SIM';
                                        setNewIsEfetivo(isEf);
                                        if (!isEf) setNewNumAgente('');
                                      }}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                                    >
                                      <option value="SIM">Sim (Efetivo)</option>
                                      <option value="NAO">Não (Contratado)</option>
                                    </select>
                                  </div>

                                  {newIsEfetivo ? (
                                    <div>
                                      <label className="block text-[11px] font-bold text-emerald-800 mb-1">Nº de Agente *</label>
                                      <input
                                        type="text"
                                        required
                                        value={newNumAgente}
                                        onChange={(e) => setNewNumAgente(e.target.value)}
                                        placeholder="Ex: 849204"
                                        className="w-full bg-emerald-50/30 border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Nº de Agente</label>
                                      <div className="py-1.5 px-2 bg-slate-100 border border-slate-200 rounded-xl text-[10px] text-slate-400 font-semibold italic text-center">
                                        Não aplicável
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2.5 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsChefiaFormEditing(false);
                                  setChefiaEditStaffId(null);
                                  clearChefiaFields();
                                }}
                                className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                              >
                                Voltar à Lista
                              </button>
                              <button
                                type="submit"
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                              >
                                Gravar Registo
                              </button>
                            </div>
                          </form>
                        );
                      }

                      // Listagem dos técnicos existentes
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                              Colaboradores Cadastrados ({titulares.length})
                            </span>
                            {userRole !== 'PROFESSOR' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsChefiaFormEditing(true);
                                  setChefiaEditStaffId(null);
                                  clearChefiaFields();
                                  const generatedId = generateStaffId('Tecnico', selectedChefiaRole, staffList.map(s => s.id));
                                  setNewId(generatedId);
                                }}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Adicionar Novo Técnico</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1">
                            {titulares.map((t) => (
                              <div key={t.id} className="p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl space-y-2.5 transition-all">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2.5 max-w-[80%]">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                                      {t.name.charAt(0)}
                                    </div>
                                    <div className="truncate">
                                      <h4 className="text-xs font-black text-slate-800 truncate leading-none">{t.name}</h4>
                                      <p className="text-[10px] text-slate-500 font-mono font-bold mt-1">ID: {t.id}</p>
                                    </div>
                                  </div>

                                  {userRole !== 'PROFESSOR' && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setIsChefiaFormEditing(true);
                                          setChefiaEditStaffId(t.id);
                                          setNewName(t.name);
                                          setNewId(t.id);
                                          setNewPassword(t.password || '12345');
                                          setNewGabinete(t.gabinete || '');
                                          setNewDecretoNomeacao(t.decretoNomeacao || '');
                                        }}
                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                        title="Editar registo"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleExcluirColaborador(t.id, t.name);
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                        title="Excluir registo"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 border-t border-slate-200/50 pt-2">
                                  <div>Gabinete: <span className="text-slate-800 font-bold">{t.gabinete || 'Não definido'}</span></div>
                                  <div>Senha: <span className="text-slate-800 font-mono font-bold">{renderPrivatePassword(t.id, t.password)}</span></div>
                                </div>
                                {t.decretoNomeacao && (
                                  <div className="text-[10px] font-bold text-slate-500 truncate">
                                    Nomeação: <span className="text-slate-700 font-medium">{t.decretoNomeacao}</span>
                                  </div>
                                )}
                              </div>
                            ))}

                            {titulares.length === 0 && (
                              <div className="text-center py-8 text-slate-400 font-bold italic bg-slate-50/50 border border-dashed rounded-xl col-span-2">
                                Nenhum técnico cadastrado nesta área escolar.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}

                  <div className="border-t border-slate-150 pt-4 text-center">
                    <p className="text-[10px] text-slate-400 font-bold tracking-wide">
                      SIGEP Academic • Direcção de Recursos Humanos
                    </p>
                  </div>
                </div>
              ) : (
                /* GRID DE CARDS DE CHEFIA REESTRUTURADO */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { role: 'DIRECTOR_GERAL' as StaffRole, label: 'Director Geral', desc: 'Direcção máxima executiva, institucional e pedagógica do estabelecimento de ensino.', isUnivalente: true, iconColor: 'text-amber-600', bgColor: 'bg-amber-50' },
                    { role: 'SUB_DIRECTOR_PEDAGOGICO' as StaffRole, label: 'Subdirector Pedagógico', desc: 'Supervisão das actividades letivas, exames, coordenação pedagógica e corpo docente.', isUnivalente: true, iconColor: 'text-indigo-600', bgColor: 'bg-indigo-50' },
                    { role: 'SUB_DIRECTOR_ADMINISTRATIVO' as StaffRole, label: 'Subdirector Administrativo', desc: 'Gestão patrimonial, financeira, recursos não docentes e planeamento escolar.', isUnivalente: true, iconColor: 'text-emerald-600', bgColor: 'bg-emerald-50' },
                    { role: 'CHEFE_SECRETARIA' as StaffRole, label: 'Chefe de Secretaria / Secretário(a)', desc: 'Gestão de matrículas, arquivos confidenciais, emissão de certificados e pautas.', isUnivalente: true, iconColor: 'text-violet-600', bgColor: 'bg-violet-50' },
                    { role: 'TECNICO_PEDAGOGICO' as StaffRole, label: 'Técnico Pedagógico', desc: 'Apoio técnico à coordenação pedagógica, acompanhamento de alunos e apoio docente.', isUnivalente: false, iconColor: 'text-sky-600', bgColor: 'bg-sky-50' },
                    { role: 'TECNICO_ADMINISTRATIVO' as StaffRole, label: 'Técnico Administrativo', desc: 'Operadores de secretaria, tesouraria, contabilidade escolar e atendimento ao público.', isUnivalente: false, iconColor: 'text-teal-600', bgColor: 'bg-teal-50' }
                  ].map((c) => {
                    const titulares = staffList.filter(s => s.role === c.role);
                    const isPreenchido = titulares.length > 0;
                    const titular = titulares[0]; // para univalentes

                    return (
                      <div 
                        key={c.role}
                        onClick={() => startChefiaAction(c.role, c.isUnivalente && isPreenchido ? titular : undefined)}
                        className={`group relative rounded-2xl border transition-all duration-300 p-5 cursor-pointer flex flex-col justify-between hover:shadow-md ${
                          isPreenchido 
                            ? 'bg-white border-slate-200 hover:border-indigo-400 shadow-2xs'
                            : 'bg-slate-50/60 border-dashed border-2 border-slate-250 hover:border-indigo-400 hover:bg-slate-50/90'
                        }`}
                      >
                        {/* Conteúdo Superior */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-wider uppercase ${
                                isPreenchido 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isPreenchido ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                {c.isUnivalente 
                                  ? isPreenchido ? 'Nomeado' : 'Cargo Vago'
                                  : isPreenchido ? `${titulares.length} Activo(s)` : 'Sem Registo'
                                }
                              </span>
                              <h3 className="text-xs font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight mt-1 font-sans">
                                {c.label}
                              </h3>
                            </div>
                            
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-3xs group-hover:scale-105 transition-all duration-300 ${c.bgColor} ${c.iconColor}`}>
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-450 font-semibold leading-relaxed line-clamp-2">
                            {c.desc}
                          </p>

                          {/* Permissões Atribuídas (Scope) do Card */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Atribuições (Scope)</span>
                            <div className="flex flex-wrap gap-1">
                              {CHEFIA_SCOPES[c.role]?.map((scope, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-[9px] font-bold">
                                  {scope}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Titular e Acções Rápidas */}
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                          {/* Titular Actual / Representantes */}
                          <div className="flex items-center justify-between min-h-[32px]">
                            {c.isUnivalente ? (
                              isPreenchido ? (
                                <div className="flex items-center gap-2 max-w-[75%]">
                                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-extrabold text-xs text-slate-600 uppercase shrink-0">
                                    {titular.name.charAt(0)}
                                  </div>
                                  <div className="truncate">
                                    <p className="text-[11px] font-extrabold text-slate-800 truncate leading-none">{titular.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">{titular.id}</p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-bold italic">Sem titular associado</span>
                              )
                            ) : (
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {titulares.slice(0, 3).map((t) => (
                                  <div key={t.id} className="w-6 h-6 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-[9px] font-black text-indigo-600 shadow-3xs" title={t.name}>
                                    {t.name.charAt(0)}
                                  </div>
                                ))}
                                {titulares.length > 3 && (
                                  <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-500 shadow-3xs">
                                    +{titulares.length - 3}
                                  </div>
                                )}
                                {titulares.length === 0 && (
                                  <span className="text-[11px] text-slate-400 font-bold italic">Nenhum técnico registado</span>
                                )}
                              </div>
                            )}

                            {!isPreenchido && (
                              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform duration-300 flex items-center gap-0.5">
                                <span>Gerir</span>
                                <span>→</span>
                              </span>
                            )}
                          </div>

                          {/* Botões de Acção Rápidos Contextuais */}
                          {userRole !== 'PROFESSOR' ? (
                            <div className="flex items-center gap-1.5 pt-1">
                              {c.isUnivalente ? (
                                isPreenchido ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startChefiaAction(c.role, titular);
                                        setIsChefiaFormEditing(false);
                                      }}
                                      className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-extrabold transition-all border border-indigo-200 cursor-pointer text-center shadow-3xs"
                                    >
                                      Ver Ficha
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startChefiaAction(c.role, titular);
                                        setIsChefiaFormEditing(true);
                                      }}
                                      className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-extrabold transition-all border border-slate-200 cursor-pointer text-center shadow-3xs"
                                    >
                                      Editar
                                    </button>
                                    {c.role !== 'DIRECTOR_GERAL' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleExcluirColaborador(titular.id, titular.name);
                                        }}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all border border-rose-200 cursor-pointer shadow-3xs"
                                        title="Dispensar titular do cargo"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startChefiaAction(c.role);
                                    }}
                                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer text-center shadow-3xs"
                                  >
                                    Nomear Titular
                                  </button>
                                )
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startChefiaAction(c.role);
                                      setIsChefiaFormEditing(false);
                                    }}
                                    className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-extrabold transition-all border border-indigo-200 cursor-pointer text-center shadow-3xs"
                                  >
                                    Ver Lista ({titulares.length})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startChefiaAction(c.role);
                                      setIsChefiaFormEditing(true);
                                    }}
                                    className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-extrabold transition-all border border-emerald-250 cursor-pointer text-center shadow-3xs"
                                  >
                                    Adicionar Novo
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] font-bold text-slate-400 italic text-center bg-slate-50 py-1.5 rounded-lg border border-slate-100">
                              🔒 Acesso Restrito de Leitura
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider text-[9px] border-b border-slate-200">
                        <th className="p-3.5 w-[50px]">Nº</th>
                        <th className="p-3.5 w-[110px]">ID Utilizador</th>
                        <th className="p-3.5">Nome Completo do Funcionário</th>
                        <th className="p-3.5 w-[180px]">Função / Cargo de RH</th>
                        <th className="p-3.5 w-[120px] text-center">Senha</th>
                        <th className="p-3.5 w-[200px]">Atribuições / Scope</th>
                        {userRole !== 'PROFESSOR' && <th className="p-3.5 text-right w-[100px]">Acções</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-medium">
                      {filteredStaff.map((staff, index) => {
                        const isProf = staff.role === 'PROFESSOR';
                        const listClasses = staff.classes || [];
                        const listSubjects = staff.subjects || [];

                        return (
                          <tr key={staff.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="p-3.5 text-slate-400 font-bold font-mono">{index + 1}</td>
                            <td className="p-3.5 font-bold font-mono text-indigo-650 text-[10px] bg-slate-50/30">
                              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md border border-slate-300">
                                {staff.id}
                              </span>
                            </td>
                            <td className="p-3.5 font-extrabold text-[12px] text-slate-900">{staff.name}</td>
                            <td className="p-3.5 font-bold text-slate-700">
                              <span className={`px-2.5 py-1 rounded-lg text-[9.5px] border ${
                                ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA'].includes(staff.role)
                                  ? 'bg-amber-50 text-amber-800 border-amber-200 font-black'
                                  : isProf 
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-250'
                              }`}>
                                {ROLE_LABELS[staff.role]}
                              </span>
                            </td>
                            <td className="p-3.5 text-center font-mono font-bold text-slate-400 text-[10px]">
                              {renderPrivatePassword(staff.id, staff.password)}
                            </td>
                            <td className="p-3.5 text-[10px] text-slate-500 max-w-[200px]">
                              {isProf ? (
                                <div className="space-y-0.5">
                                  {staff.specialty && <div><strong>Especialidade:</strong> {staff.specialty}</div>}
                                  <div><strong>Classes:</strong> {listClasses.join(', ')}ª Cl</div>
                                  <div><strong>Turmas:</strong> {staff.sections?.join(', ')}</div>
                                  <div><strong>Matérias:</strong> {listSubjects.join(', ')}</div>
                                </div>
                              ) : ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'TECNICO_PEDAGOGICO', 'TECNICO_ADMINISTRATIVO'].includes(staff.role) ? (
                                <div className="space-y-0.5 text-amber-800">
                                  {staff.gabinete && <div><strong>Gabinete:</strong> {staff.gabinete}</div>}
                                  {staff.decretoNomeacao && <div><strong>Decreto:</strong> {staff.decretoNomeacao}</div>}
                                  {!staff.gabinete && !staff.decretoNomeacao && <div className="italic text-slate-400">Sem despacho registado</div>}
                                </div>
                              ) : ['COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA'].includes(staff.role) ? (
                                <div className="space-y-0.5 text-teal-850">
                                  {staff.tipoCoordenacao === 'DISCIPLINA' ? (
                                    <div><strong>Matéria Coord.:</strong> {staff.disciplinaCoordenada || 'Não definida'}</div>
                                  ) : (
                                    <div><strong>Turno Coord.:</strong> {staff.turnoCoordenado || 'Não definido'}</div>
                                  )}
                                </div>
                              ) : staff.role === 'AUXILIAR_LIMPEZA' ? (
                                <div className="space-y-0.5 text-emerald-800">
                                  <div><strong>Pavilhão:</strong> {staff.areaAtribuicao || 'Não definido'}</div>
                                  <div><strong>Turno:</strong> {staff.turnoCoordenado || 'Não definido'}</div>
                                </div>
                              ) : staff.role === 'SEGURANCA' ? (
                                <div className="space-y-0.5 text-rose-800">
                                  <div><strong>Posto:</strong> {staff.postoGuarita || 'Não definido'}</div>
                                  <div><strong>Escala:</strong> {staff.tipoEscalaVigilante || 'Não definida'}</div>
                                  {staff.idColeteVigilante && <div><strong>Colete:</strong> {staff.idColeteVigilante}</div>}
                                </div>
                              ) : (
                                <span className="italic text-slate-400">Escopo Administrativo Geral</span>
                              )}
                            </td>
                            
                            {userRole !== 'PROFESSOR' && (
                              <td className="p-3.5 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => startEditingStaff(staff)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                    title="Editar dados funcionais"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  {staff.role !== 'DIRECTOR_GERAL' && (
                                    <button
                                      type="button"
                                      onClick={() => handleExcluirColaborador(staff.id, staff.name)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                      title="Eliminar Colaborador de RH"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {filteredStaff.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-400 font-bold italic bg-slate-50/25">
                            Nenhum funcionário encontrado nesta categoria de RH.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>
      )}

      {/* 5. PAINEL LATERAL DE GESTÃO DE CHEFIA (DRAWER FLUTUANTE) */}
      {selectedChefiaRole && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex justify-end animate-fadeIn">
          {/* Overlay clicável para fechar */}
          <div className="absolute inset-0" onClick={() => {
            setSelectedChefiaRole(null);
            setIsChefiaFormEditing(false);
            setChefiaEditStaffId(null);
            clearChefiaFields();
          }}></div>
          
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto z-[101] animate-slideLeft border-l border-slate-150">
            {/* Cabeçalho */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 uppercase tracking-widest">
                    {['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA'].includes(selectedChefiaRole) ? 'Cargo Univalente' : 'Cargo Colectivo'}
                  </span>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-1">
                    {ROLE_LABELS[selectedChefiaRole]}
                  </h2>
                </div>
                <button 
                  onClick={() => {
                    setSelectedChefiaRole(null);
                    setIsChefiaFormEditing(false);
                    setChefiaEditStaffId(null);
                    clearChefiaFields();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* CONTEÚDO PRINCIPAL: Univalente */}
              {['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA'].includes(selectedChefiaRole) ? (
                (() => {
                  const titular = staffList.find(s => s.role === selectedChefiaRole);
                  const isPreenchido = !!titular;

                  if (isPreenchido && !isChefiaFormEditing) {
                    // Detalhes do titular existente
                    return (
                      <div className="space-y-5">
                        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                          <div className="flex items-center gap-3.5 border-b border-slate-200 pb-4">
                            <div className="w-11 h-11 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-black text-sm text-indigo-700 shadow-2xs uppercase">
                              {titular.name.charAt(0)}
                            </div>
                            <div className="truncate">
                              <h3 className="text-xs font-black text-slate-800 truncate">{titular.name}</h3>
                              <p className="text-[10px] text-slate-500 font-bold mt-1">ID de Sessão: <span className="font-mono text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">{titular.id}</span></p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                            <div className="space-y-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Senha de Acesso</span>
                              <span className="font-mono text-slate-700 bg-white px-2 py-1.5 rounded-lg border border-slate-200 block text-center font-bold">
                                {renderPrivatePassword(titular.id, titular.password)}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Gabinete</span>
                              <span className="text-slate-700 bg-white px-2 py-1.5 rounded-lg border border-slate-200 block text-center truncate" title={titular.gabinete || 'Não registado'}>
                                {titular.gabinete || 'Não registado'}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1 pt-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Decreto ou Despacho de Nomeação</span>
                            <span className="text-xs text-slate-700 bg-white px-3 py-2.5 rounded-lg border border-slate-200 block font-bold leading-relaxed">
                              {titular.decretoNomeacao || 'Sem diploma / despacho associado no sistema'}
                            </span>
                          </div>
                        </div>

                        {userRole !== 'PROFESSOR' && (
                          <div className="space-y-2.5 pt-2">
                            <button
                              onClick={() => {
                                setIsChefiaFormEditing(true);
                                setChefiaEditStaffId(titular.id);
                                setNewName(titular.name);
                                setNewId(titular.id);
                                setNewPassword(titular.password || '12345');
                                setNewGabinete(titular.gabinete || '');
                                setNewDecretoNomeacao(titular.decretoNomeacao || '');
                              }}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Editar Informações do Titular</span>
                            </button>
                            
                            {titular.role !== 'DIRECTOR_GERAL' && (
                              <button
                                onClick={() => {
                                  handleExcluirColaborador(titular.id, titular.name);
                                  setSelectedChefiaRole(null);
                                }}
                                className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Dispensar e Excluir Registo</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Formulário de Cadastro / Edição Univalente
                    return (
                      <form onSubmit={handleChefiaSubmit} className="space-y-4">
                        <div className="space-y-3.5 bg-slate-50 border border-slate-200 p-4.5 rounded-2xl">
                          <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-2">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            <span>{chefiaEditStaffId ? 'Editar Cadastro de Chefia' : 'Nomear Titular para o Cargo'}</span>
                          </h3>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo *</label>
                            <input
                              type="text"
                              required
                              value={newName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewName(val);
                                if (!chefiaEditStaffId) {
                                  setNewId(generateStaffId(val || 'Novo', selectedChefiaRole, staffList.map(s => s.id)));
                                }
                              }}
                              placeholder="Ex: Manuel António Chilombo"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">ID de Sessão *</label>
                              <input
                                type="text"
                                required
                                value={newId}
                                disabled={!!chefiaEditStaffId}
                                onChange={(e) => setNewId(e.target.value.trim().toUpperCase())}
                                placeholder="ID de Sessão"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-extrabold text-indigo-650 focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Senha de Acesso *</label>
                              <input
                                type="text"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Padrão: 12345"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Gabinete de Trabalho</label>
                            <input
                              type="text"
                              value={newGabinete}
                              onChange={(e) => setNewGabinete(e.target.value)}
                              placeholder="Ex: Gabinete de Direcção"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Decreto ou Despacho de Nomeação</label>
                            <input
                              type="text"
                              value={newDecretoNomeacao}
                              onChange={(e) => setNewDecretoNomeacao(e.target.value)}
                              placeholder="Ex: Despacho Nº 105/MED-2025"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>

                          {/* Vínculo & Efetividade (Drawer Univalente) */}
                          <div className="space-y-3 pt-2 border-t border-slate-200">
                            <label className="block text-xs font-black uppercase text-slate-800">
                              Vínculo Institucional & Efetividade
                            </label>
                            
                            <div className="grid grid-cols-1 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Funcionário Efetivo? *</label>
                                <select
                                  value={newIsEfetivo ? 'SIM' : 'NAO'}
                                  onChange={(e) => {
                                    const isEf = e.target.value === 'SIM';
                                    setNewIsEfetivo(isEf);
                                    if (!isEf) setNewNumAgente('');
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
                                >
                                  <option value="SIM">Sim (Efetivo)</option>
                                  <option value="NAO">Não (Contratado)</option>
                                </select>
                              </div>

                              {newIsEfetivo ? (
                                <div>
                                  <label className="block text-[11px] font-bold text-emerald-800 mb-1">Nº de Agente *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newNumAgente}
                                    onChange={(e) => setNewNumAgente(e.target.value)}
                                    placeholder="Ex: 849204"
                                    className="w-full bg-emerald-50/30 border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Nº de Agente</label>
                                  <div className="py-1.5 px-2 bg-slate-100 border border-slate-200 rounded-xl text-[10px] text-slate-400 font-semibold italic text-center">
                                    Não aplicável
                                  </div>
                                </div>
                              )}

                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Contacto Telefónico *</label>
                                <input
                                  type="tel"
                                  required
                                  value={newContact}
                                  onChange={(e) => setNewContact(e.target.value)}
                                  placeholder="Ex: 923 456 789"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (chefiaEditStaffId) {
                                setIsChefiaFormEditing(false);
                              } else {
                                setSelectedChefiaRole(null);
                              }
                            }}
                            className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition-all"
                          >
                            Gravar Titular
                          </button>
                        </div>
                      </form>
                    );
                  }
                })()
              ) : (
                /* CONTEÚDO PRINCIPAL: Multivalente (Técnicos) */
                (() => {
                  const titulares = staffList.filter(s => s.role === selectedChefiaRole);
                  
                  if (isChefiaFormEditing) {
                    // Formulário de Cadastro / Edição para Técnicos
                    return (
                      <form onSubmit={handleChefiaSubmit} className="space-y-4">
                        <div className="space-y-3.5 bg-slate-50 border border-slate-200 p-4.5 rounded-2xl">
                          <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-2">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            <span>{chefiaEditStaffId ? 'Editar Cadastro de Técnico' : 'Adicionar Novo Técnico'}</span>
                          </h3>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo do Técnico *</label>
                            <input
                              type="text"
                              required
                              value={newName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewName(val);
                                if (!chefiaEditStaffId) {
                                  setNewId(generateStaffId(val || 'Tecnico', selectedChefiaRole, staffList.map(s => s.id)));
                                }
                              }}
                              placeholder="Ex: Maria Domingos Cabral"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">ID de Sessão *</label>
                              <input
                                type="text"
                                required
                                value={newId}
                                disabled={!!chefiaEditStaffId}
                                onChange={(e) => setNewId(e.target.value.trim().toUpperCase())}
                                placeholder="ID de Sessão"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-extrabold text-indigo-650 focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Senha de Acesso *</label>
                              <input
                                type="text"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Padrão: 12345"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Gabinete / Departamento</label>
                            <input
                              type="text"
                              value={newGabinete}
                              onChange={(e) => setNewGabinete(e.target.value)}
                              placeholder="Ex: Secretaria Pedagógica / Balcão A"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Decreto ou Despacho de Nomeação</label>
                            <input
                              type="text"
                              value={newDecretoNomeacao}
                              onChange={(e) => setNewDecretoNomeacao(e.target.value)}
                              placeholder="Ex: Contrato de Trabalho Nº 45/2026"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>

                          {/* Vínculo & Efetividade (Drawer Multivalente) */}
                          <div className="space-y-3 pt-2 border-t border-slate-200">
                            <label className="block text-xs font-black uppercase text-slate-800">
                              Vínculo Institucional & Efetividade
                            </label>
                            
                            <div className="grid grid-cols-1 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Funcionário Efetivo? *</label>
                                <select
                                  value={newIsEfetivo ? 'SIM' : 'NAO'}
                                  onChange={(e) => {
                                    const isEf = e.target.value === 'SIM';
                                    setNewIsEfetivo(isEf);
                                    if (!isEf) setNewNumAgente('');
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
                                >
                                  <option value="SIM">Sim (Efetivo)</option>
                                  <option value="NAO">Não (Contratado)</option>
                                </select>
                              </div>

                              {newIsEfetivo ? (
                                <div>
                                  <label className="block text-[11px] font-bold text-emerald-800 mb-1">Nº de Agente *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newNumAgente}
                                    onChange={(e) => setNewNumAgente(e.target.value)}
                                    placeholder="Ex: 849204"
                                    className="w-full bg-emerald-50/30 border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Nº de Agente</label>
                                  <div className="py-1.5 px-2 bg-slate-100 border border-slate-200 rounded-xl text-[10px] text-slate-400 font-semibold italic text-center">
                                    Não aplicável
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsChefiaFormEditing(false);
                              setChefiaEditStaffId(null);
                              clearChefiaFields();
                            }}
                            className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Voltar à Lista
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                          >
                            Gravar Registo
                          </button>
                        </div>
                      </form>
                    );
                  }

                  // Listagem dos técnicos existentes
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                          Colaboradores Cadastrados ({titulares.length})
                        </span>
                        {userRole !== 'PROFESSOR' && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsChefiaFormEditing(true);
                              setChefiaEditStaffId(null);
                              clearChefiaFields();
                              const generatedId = generateStaffId('Tecnico', selectedChefiaRole, staffList.map(s => s.id));
                              setNewId(generatedId);
                            }}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar Novo Técnico</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                        {titulares.map((t) => (
                          <div key={t.id} className="p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl space-y-2.5 transition-all">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5 max-w-[80%]">
                                <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                                  {t.name.charAt(0)}
                                </div>
                                <div className="truncate">
                                  <h4 className="text-xs font-black text-slate-800 truncate leading-none">{t.name}</h4>
                                  <p className="text-[10px] text-slate-500 font-mono font-bold mt-1">ID: {t.id}</p>
                                </div>
                              </div>
                              
                              {userRole !== 'PROFESSOR' && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsChefiaFormEditing(true);
                                      setChefiaEditStaffId(t.id);
                                      setNewName(t.name);
                                      setNewId(t.id);
                                      setNewPassword(t.password || '12345');
                                      setNewGabinete(t.gabinete || '');
                                      setNewDecretoNomeacao(t.decretoNomeacao || '');
                                    }}
                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                    title="Editar registo"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleExcluirColaborador(t.id, t.name);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                    title="Excluir registo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 border-t border-slate-200/50 pt-2">
                              <div>Gabinete: <span className="text-slate-800 font-bold">{t.gabinete || 'Não definido'}</span></div>
                              <div>Senha: <span className="text-slate-800 font-mono font-bold">{renderPrivatePassword(t.id, t.password)}</span></div>
                            </div>
                            {t.decretoNomeacao && (
                              <div className="text-[10px] font-bold text-slate-500 truncate">
                                Nomeação: <span className="text-slate-700 font-medium">{t.decretoNomeacao}</span>
                              </div>
                            )}
                          </div>
                        ))}

                        {titulares.length === 0 && (
                          <div className="text-center py-8 text-slate-400 font-bold italic bg-slate-50/50 border border-dashed rounded-xl">
                            Nenhum técnico cadastrado nesta área escolar.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Rodapé do Drawer */}
            <div className="border-t border-slate-150 pt-4 text-center mt-4">
              <p className="text-[10px] text-slate-400 font-bold tracking-wide">
                SIGEP Academic • Direcção de Recursos Humanos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DUPLA (AÇÃO DESTRUTIVA) */}
      {showDoubleConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-pulseOnce">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="bg-rose-50 p-2.5 rounded-full">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider">Confirmação Crítica</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Acção irreversível no SIGEP</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium">
              Tem a certeza de que deseja eliminar <span className="font-extrabold text-rose-650">TODOS os funcionários</span> cadastrados nos Recursos Humanos? Todos os acessos e dados históricos serão perdidos imediatamente.
            </p>
            
            <div className="space-y-3 mb-6">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide">
                Por favor, escreva <span className="text-rose-600 font-extrabold select-none">'APAGAR'</span> para confirmar:
              </label>
              <input
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="Escreva 'APAGAR' em maiúsculas"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-rose-500 font-black text-center uppercase tracking-widest focus:bg-white"
              />
            </div>
            
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDoubleConfirm(false);
                  setClearConfirmText('');
                }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={clearConfirmText !== 'APAGAR'}
                onClick={() => {
                  if (clearConfirmText === 'APAGAR') {
                    if (onClearAllStaff) onClearAllStaff();
                    setShowDoubleConfirm(false);
                    setClearConfirmText('');
                    window.alert("Banco de dados de Recursos Humanos foi completamente limpo.");
                  }
                }}
                className={`flex-1 px-4 py-2.5 text-white rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                  clearConfirmText === 'APAGAR' 
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-200' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Confirmar Limpeza
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Autorização do Director Geral para Eliminação de Funcionário */}
      {deletingStaff && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">Pedido de Eliminação de Colaborador</h3>
                <p className="text-[11px] text-slate-500">Requer Autorização Presencial/Digital do Director Geral</p>
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3 mb-4 text-xs space-y-1">
              <p className="font-extrabold text-rose-950">
                Funcionário: <span className="font-bold text-rose-800">{deletingStaff.name}</span>
              </p>
              <p className="text-[11px] text-rose-700">
                ID: <span className="font-mono font-bold">{deletingStaff.id}</span> | Cargo: <span className="font-semibold">{ROLE_LABELS[deletingStaff.role] || deletingStaff.role}</span>
              </p>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo da Eliminação *
                </label>
                <textarea
                  rows={2}
                  value={deleteReason}
                  onChange={(e) => {
                    setDeleteReason(e.target.value);
                    setDeleteModalError('');
                  }}
                  placeholder="Informe detalhadamente a razão da eliminação do colaborador..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Senha do Director Geral *</span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Validação Obrigatória</span>
                </label>
                <input
                  type="password"
                  value={directorPasswordInput}
                  onChange={(e) => {
                    setDirectorPasswordInput(e.target.value);
                    setDeleteModalError('');
                  }}
                  placeholder="Introduza a senha do perfil Diretor Geral"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              {deleteModalError && (
                <div className="p-2.5 bg-rose-100/80 border border-rose-300 text-rose-700 rounded-xl text-xs font-bold text-center">
                  {deleteModalError}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingStaff(null);
                  setDeleteReason('');
                  setDirectorPasswordInput('');
                  setDeleteModalError('');
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!deleteReason.trim()) {
                    setDeleteModalError('Por favor, informe o motivo da eliminação do colaborador.');
                    return;
                  }
                  const directorPass = staffList.find(s => s.role === 'DIRECTOR_GERAL')?.password || '12345';
                  if (directorPasswordInput !== directorPass) {
                    setDeleteModalError('Senha do Director Geral incorreta. Operação não autorizada.');
                    return;
                  }

                  onDeleteStaff(deletingStaff.id);
                  const removedName = deletingStaff.name;
                  setDeletingStaff(null);
                  setDeleteReason('');
                  setDirectorPasswordInput('');
                  setDeleteModalError('');
                  window.alert(`O registo de "${removedName}" foi eliminado permanentemente de Recursos Humanos após autorização do Director Geral.`);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-rose-200 flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Autorizar e Apagar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIÇÃO RÁPIDA DE DADOS DO MAPA DE EFETIVIDADE */}
      {efetividadeModalStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  Dados para Mapa de Efetividade — {efetividadeModalStaff.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEfetividadeModalStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEfetividadeQuickModal} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Categoria / Função
                  </label>
                  <input
                    type="text"
                    value={efetividadeCategoria}
                    onChange={(e) => setEfetividadeCategoria(e.target.value)}
                    placeholder="Ex: Professor Primário / Técnico Médio"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Tempo de Serviço
                  </label>
                  <input
                    type="text"
                    value={efetividadeTempoServico}
                    onChange={(e) => setEfetividadeTempoServico(e.target.value)}
                    placeholder="Ex: 8 Anos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="text"
                    value={efetividadeDataNasc}
                    onChange={(e) => setEfetividadeDataNasc(e.target.value)}
                    placeholder="Ex: 12/08/1988"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Nº de Seguro Social
                  </label>
                  <input
                    type="text"
                    value={efetividadeSeguroSocial}
                    onChange={(e) => setEfetividadeSeguroSocial(e.target.value)}
                    placeholder="Ex: 1004582910"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Habilitações Literárias
                  </label>
                  <input
                    type="text"
                    value={efetividadeHabilitacoes}
                    onChange={(e) => setEfetividadeHabilitacoes(e.target.value)}
                    placeholder="Ex: Licenciatura"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Género
                  </label>
                  <select
                    value={efetividadeGenero}
                    onChange={(e) => setEfetividadeGenero(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer font-bold"
                  >
                    <option value="M">Masculino (M)</option>
                    <option value="F">Feminino (F)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Especialidade
                  </label>
                  <input
                    type="text"
                    value={efetividadeEspecialidade}
                    onChange={(e) => setEfetividadeEspecialidade(e.target.value)}
                    placeholder="Ex: Língua Portuguesa"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Unidade Orgânica
                  </label>
                  <input
                    type="text"
                    value={efetividadeUnidadeOrganica}
                    onChange={(e) => setEfetividadeUnidadeOrganica(e.target.value)}
                    placeholder="Ex: Bloco Pedagógico A"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Nº de Agente
                  </label>
                  <input
                    type="text"
                    value={efetividadeNumAgente}
                    onChange={(e) => setEfetividadeNumAgente(e.target.value)}
                    placeholder="Ex: 34589210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEfetividadeModalStaff(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Gravar Dados do Mapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
