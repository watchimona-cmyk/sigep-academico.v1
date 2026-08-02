/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Staff, StaffRole, SubjectType, getSubjectsForClass, carregarGrelhaCurricular, getSpecialtyFullName } from '../types';
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
  ChevronRight
} from 'lucide-react';
import { generateStaffId, getSectionsList } from '../utils';

interface RecursosHumanosProps {
  staffList: Staff[];
  onAddStaff: (newStaff: Staff, originalId?: string) => void;
  onDeleteStaff: (id: string) => void;
  onClearAllStaff?: () => void;
  userRole: string;
  canEdit?: boolean;
}

const ROLE_LABELS: Record<StaffRole, string> = {
  DIRECTOR_GERAL: 'Director Geral',
  SUB_DIRECTOR_PEDAGOGICO: 'Subdirector Pedagógico',
  SUB_DIRECTOR_ADMINISTRATIVO: 'Subdirector Administrativo',
  CHEFE_SECRETARIA: 'Chefe de Secretaria / Secretário(a)',
  COORDENADOR_TURNO: 'Coordenador de Turno',
  COORDENADOR_DISCIPLINA: 'Coordenador de Disciplina',
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
  COORDENADOR_TURNO: 'T',
  COORDENADOR_DISCIPLINA: 'O',
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
  TECNICO_PEDAGOGICO: ['Apoio Docente', 'Atendimento Pedagógico', 'Ocorrências'],
  TECNICO_ADMINISTRATIVO: ['Atendimento', 'Registros Gerais', 'Organização de Ficheiros'],
  PROFESSOR: ['Lançamento de Notas', 'Sumários'],
  AUXILIAR_LIMPEZA: ['Limpeza de Salas', 'Manutenção'],
  SEGURANCA: ['Controle de Portaria', 'Rondas'],
  SIGEP: ['Acesso Completo'],
  COORDENADOR_TURNO: ['Gerir Turnos', 'Organizar Horários'],
  COORDENADOR_DISCIPLINA: ['Coordenar Disciplinas', 'Apoio de Conteúdo']
};

export default function RecursosHumanos({
  staffList: rawStaffList,
  onAddStaff,
  onDeleteStaff,
  onClearAllStaff,
  userRole,
  canEdit = true
}: RecursosHumanosProps) {
  
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

  // Estados para Gestão de Cargos de Chefia em Cards e Painel Lateral
  const [selectedChefiaRole, setSelectedChefiaRole] = useState<StaffRole | null>(null);
  const [isChefiaFormEditing, setIsChefiaFormEditing] = useState(false);
  const [chefiaEditStaffId, setChefiaEditStaffId] = useState<string | null>(null);

  // Form Fields
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('PROFESSOR');
  const [newPassword, setNewPassword] = useState('12345');
  
  // Custom states for realistic Angola School HR fields
  const [newGabinete, setNewGabinete] = useState('');
  const [newDecretoNomeacao, setNewDecretoNomeacao] = useState('');
  const [newTipoCoordenacao, setNewTipoCoordenacao] = useState<'TURNO' | 'DISCIPLINA'>('TURNO');
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

  // Rótulos simples para subsistema de ensino conforme requisito
  const getModalityLabel = (mod: string) => {
    if (mod === 'PUNIV') return 'Liceu';
    if (mod === 'MAGISTERIO') return 'Magistério';
    return 'Ensino Primário';
  };

  // Subsistema / Modalidade activa no formulário (Prevalece a configuração do SIGEP)
  const [formModality, setFormModality] = useState<'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO'>(() => {
    try {
      const saved = localStorage.getItem('sigep_active_modality_v1');
      if (saved) return saved as any;
    } catch (err) {}
    return 'ENSINO_PRIMARIO';
  });

  // Especialidade / Ramo seleccionado no formulário
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(() => {
    if (formModality === 'PUNIV') return 'CFB';
    if (formModality === 'MAGISTERIO') return 'MF';
    return 'GERAL';
  });

  // Sincronizar com alteração de modalidade activa do SIGEP
  useEffect(() => {
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
  }, [formModality]);

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
        const subs = getSubjectsForClass(cl, formModality) as SubjectType[];
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
    
    // Popular campos adicionais de RH realista
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
    setNewGabinete('');
    setNewDecretoNomeacao('');
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
      setNewGabinete(staff.gabinete || '');
      setNewDecretoNomeacao(staff.decretoNomeacao || '');
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

    const candidateId = newId.trim().toUpperCase();
    if (!candidateId) {
      setFormError('O ID de Sessão de RH é obrigatório.');
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
      password: newPassword.trim() || '12345',
      gabinete: newGabinete.trim() || undefined,
      decretoNomeacao: newDecretoNomeacao.trim() || undefined
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
        setFormError(`O cargo de "${ROLE_LABELS[newRole as StaffRole]}" já se encontra preenchido por "${existingLeadership.name}". Não é permitido duplicar cargos directivos.`);
        return;
      }
    }

    const candidateId = newId.trim().toUpperCase();
    if (!candidateId) {
      setFormError('O ID de Sessão de RH é obrigatório.');
      return;
    }

    // ID de utilizador único
    const isIdTaken = staffList.some(s => s.id === candidateId && s.id !== editingStaffId);
    if (isIdTaken) {
      setFormError(`Erro: O ID de utilizador "${candidateId}" já se encontra atribuído a outro colaborador.`);
      return;
    }

    const isProf = newRole === 'PROFESSOR';
    if (isProf && selectedClasses.length === 0) {
      setFormError('Por favor seleccione pelo menos uma Classe de docência para o Professor.');
      return;
    }
    if (isProf && selectedSections.length === 0) {
      setFormError('Por favor seleccione pelo menos uma Turma para o Professor.');
      return;
    }
    if (isProf && selectedSubjects.length === 0) {
      setFormError('Por favor seleccione pelo menos uma Disciplina curricular para o Professor.');
      return;
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
      classes: isProf ? selectedClasses : undefined,
      sections: isProf ? selectedSections : undefined,
      subjects: isProf ? selectedSubjects : undefined,
      specialty: isProf ? selectedSpecialty : undefined,
      password: finalPassword,
      
      // Passar novos campos detalhados de RH para a escola angolana
      gabinete: ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA'].includes(newRole) ? newGabinete.trim() : undefined,
      decretoNomeacao: ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA'].includes(newRole) ? newDecretoNomeacao.trim() : undefined,
      tipoCoordenacao: ['COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA'].includes(newRole) ? newTipoCoordenacao : undefined,
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
    
    // Limpar campos adicionais de RH
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

  // Excluir Colaborador de RH
  const handleExcluirColaborador = (id: string, name: string) => {
    if (!canEdit) {
      window.alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    // 1. Pop-up de Confirmação Obrigatória
    const confirmar = window.confirm(`ATENÇÃO: Deseja realmente APAGAR permanentemente o funcionário "${name}" (ID: ${id}) de Recursos Humanos? Esta acção removerá a sua credencial e impedirá o seu acesso ao sistema de imediato.`);
    if (!confirmar) return;

    onDeleteStaff(id);

    // 2. Pop-up de Sucesso Obrigatório
    window.alert(`O registo de "${name}" foi eliminado permanentemente de Recursos Humanos.`);
  };

  // Filtragem e categorização fina da listagem com base na Aba de RH selecionada
  const getFilteredStaff = () => {
    return staffList.filter(s => {
      // Ocultar de forma absoluta o Administrador SIGEP (Root) de listagens, relatórios de RH e tabelas de gestão comum
      if (s.id === 'SIGEP' || s.id === 'ADMIN_SIGEP' || s.role === 'SIGEP' || s.is_root) {
        return false;
      }

      // 1. Filtro de pesquisa rápida
      const searchClean = searchTerm.toLowerCase();
      const matchSearch = s.name.toLowerCase().includes(searchClean) ||
                          s.id.toLowerCase().includes(searchClean) ||
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
      
      {/* 1. CABEÇALHO */}
      {!isAdding ? (
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
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1">
              <input
                id="search-rh-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar funcionário por Nome, ID de Utilizador ou Cargo..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-450 focus:outline-hidden focus:border-indigo-500 focus:bg-white font-semibold transition-all shadow-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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
                    return ['COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA'].includes(role);
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
            {['COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA'].includes(newRole) && (
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
                ) : (
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
                  <span>Atribuições Curriculares (Classes, Turmas e Disciplinas)</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal normal-case">
                  Navegue entre especialidades e classes para acumular as turmas e disciplinas lecionadas.
                </span>
              </div>

              {/* 1. Subsistema Activo & Seleção de Especialidade (Ramo) */}
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-4 shadow-3xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Subsistema / Modalidade (Prevalece a configuração activa do SIGEP) */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      1.1 Subsistema de Ensino Activo *
                    </label>
                    <div className="p-2.5 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs font-black text-indigo-950 flex items-center justify-between shadow-3xs">
                      <span>{getModalityLabel(formModality)}</span>
                      <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-100 uppercase tracking-wider font-bold">
                        Configuração SIGEP
                      </span>
                    </div>
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
                        onChange={(e) => {
                          setSelectedSpecialty(e.target.value);
                          // Não limpa selectedSections ou selectedSubjects, preservando o acumulado!
                        }}
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
                        onChange={(e) => {
                          setSelectedSpecialty(e.target.value);
                          // Não limpa selectedSections ou selectedSubjects, preservando o acumulado!
                        }}
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

              {/* Resumo em tempo real do acumulado validado */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-150 rounded-xl space-y-2 text-xs">
                <div className="font-extrabold text-indigo-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Resumo das Atribuições Acumuladas até ao momento:</span>
                  </span>
                  {(selectedClasses.length > 0 || selectedSections.length > 0 || selectedSubjects.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClasses([]);
                        setSelectedSections([]);
                        setSelectedSubjects([]);
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Limpar seleções
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                  <div className="bg-white p-2 rounded-lg border border-indigo-100">
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Classes ({selectedClasses.length}):</span>
                    <span className="text-slate-900 font-extrabold">
                      {selectedClasses.length > 0 ? selectedClasses.map(c => `${c}ª`).join(', ') : 'Nenhuma classe'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-indigo-100">
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Turmas ({selectedSections.length}):</span>
                    <span className="text-emerald-700 font-extrabold">
                      {selectedSections.length > 0 ? selectedSections.join(', ') : 'Nenhuma turma'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-indigo-100">
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Disciplinas ({selectedSubjects.length}):</span>
                    <span className="text-indigo-900 font-extrabold">
                      {selectedSubjects.length > 0 ? selectedSubjects.join(', ') : 'Nenhuma disciplina'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Classes e Turmas Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 2. Classes Selection */}
                <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs">
                  <span className="block text-xs font-extrabold text-slate-700">2. Seleccione a(s) Classe(s) Lecionada(s)</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {classesList.map(cls => {
                      const isActive = selectedClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => handleClassToggle(cls)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-indigo-600 text-white shadow-xs' 
                              : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cls}ª Classe
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Sections Selection Adaptadas à Especialidade */}
                <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-extrabold text-slate-700">3. Seleccione a(s) Turma(s) Atribuída(s)</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-mono">
                      {selectedSpecialty ? `Especialidade: ${selectedSpecialty}` : 'Turmas Gerais'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    *As turmas adaptam-se dinamicamente ao ramo / especialidade selecionado.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {sectionsList.map(sec => {
                      const isActive = selectedSections.includes(sec);
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => handleSectionToggle(sec)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-emerald-600 text-white shadow-xs' 
                              : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {sec}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* 4. Disciplinas do Professor */}
              <div className="space-y-2.5 pt-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-extrabold text-slate-700">
                    4. Seleccione as Disciplinas Atribuídas (Filtradas para a Classe e Especialidade)
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 font-mono">
                    {availableSubjects.length} Disciplina(s)
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  *As opções abaixo mudam automaticamente conforme a matriz curricular oficial de {getSpecialtyFullName(selectedSpecialty)}.
                </p>

                {availableSubjects.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
                    {availableSubjects.map(subj => {
                      const isActive = selectedSubjects.includes(subj);
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => handleSubjectToggle(subj)}
                          className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-900 font-bold'
                              : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? 'bg-indigo-600' : 'bg-slate-300'}`}></span>
                          <span className="truncate">{subj}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800">
                    Nenhuma disciplina disponível para os filtros atuais. Por favor escolha pelo menos uma Classe acima.
                  </div>
                )}
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
                                    {titular.password || '12345'}
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
                                        <RefreshCw className="w-3.5 h-3.5" />
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
                                  <div>Senha: <span className="text-slate-800 font-mono font-bold">{t.password || '12345'}</span></div>
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
                              {staff.password || '12345'}
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
                                    <RefreshCw className="w-3.5 h-3.5" />
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
                                {titular.password || '12345'}
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
                                    <RefreshCw className="w-3.5 h-3.5" />
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
                              <div>Senha: <span className="text-slate-800 font-mono font-bold">{t.password || '12345'}</span></div>
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

    </div>
  );
}
