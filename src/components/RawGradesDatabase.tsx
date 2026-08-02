/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GradeRow, SubjectType, SUBJECTS, UserRole, Staff, carregarGrelhaCurricular, ModalityType } from '../types';
import { Database, Search, Filter, Calendar, BookOpen, Layers, Globe } from 'lucide-react';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import { getSectionsList } from '../utils';

interface RawGradesDatabaseProps {
  grades: GradeRow[];
  students: any[];
  onAddGrade: (newGrade: GradeRow) => void;
  onUpdateValue: (studentId: string, subject: SubjectType, trimester: 'I' | 'II' | 'III', field: 'mac' | 'npt' | 'mt', value: number | null) => void;
  userRole?: UserRole;
  loggedInStaff?: Staff | null;
  schoolSettings?: any;
  activeModality?: ModalityType;
}

export default function RawGradesDatabase({
  grades,
  students,
  onAddGrade,
  onUpdateValue,
  userRole = 'SUB_DIRECTOR_PEDAGOGICO',
  loggedInStaff = null,
  schoolSettings,
  activeModality
}: RawGradesDatabaseProps) {
  const { activeSubsystem, subsystemInfo } = useSchoolSettings();
  const selectedModality = activeModality || subsystemInfo.modalityMap;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedTrimester, setSelectedTrimester] = useState<string>('All');
  const [selectedPartition, setSelectedPartition] = useState<'MINI_PAUTA1_BANCODADOS' | 'MINI_PAUTA2_BANCODADOS' | 'MINI_PAUTA3_BANCODADOS'>('MINI_PAUTA1_BANCODADOS');

  // New filters for previous years and structures
  const [selectedYear, setSelectedYear] = useState<string>('CURRENT');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');

  // Detetar se há alguma tentativa de forçar via rota/URL ou se o subsistema ativo não está habilitado nas configurações
  const isRouteOrConfigMismatch = React.useMemo(() => {
    // 1. Verificar se a modalidade mapeada está desativada nas configurações
    if (schoolSettings?.activeComponents && schoolSettings.activeComponents[subsystemInfo.modalityMap] === false) {
      return true;
    }
    
    // 2. Verificar se o utilizador tentou forçar outra modalidade via query string ou hash na URL (ex: ?modality=PUNIV ou #puniv quando o ativo é PRIMARIO)
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlModality = searchParams.get('modality') || searchParams.get('subsistema') || window.location.hash.replace('#', '');
      
      if (urlModality) {
        const normalizedUrlMod = urlModality.toUpperCase();
        const normalizedActiveMod = subsystemInfo.modalityMap.toUpperCase();
        
        // Se a modalidade na URL não for compatível com o subsistema ativo, é um mismatch
        if (normalizedUrlMod !== normalizedActiveMod && 
            (normalizedUrlMod.includes('PRIM') || normalizedUrlMod.includes('PUNIV') || normalizedUrlMod.includes('MAGIST') || normalizedUrlMod.includes('LICEU') || normalizedUrlMod.includes('TEC'))) {
          return true;
        }
      }
    }
    
    return false;
  }, [schoolSettings, subsystemInfo]);

  // Retrieve archived school years from localStorage
  const archivesJson = localStorage.getItem('sigep_archive_years_v1');
  let archives: any[] = [];
  if (archivesJson) {
    try {
      archives = JSON.parse(archivesJson);
    } catch (e) {
      console.warn("Erro ao carregar arquivos de anos lectivos anteriores:", e);
    }
  }

  const isCurrentYear = selectedYear === 'CURRENT';
  const displayStudents = isCurrentYear 
    ? students 
    : (archives.find((a: any) => a.academicYear === selectedYear)?.students || []);
  const displayGrades = isCurrentYear 
    ? grades 
    : (archives.find((a: any) => a.academicYear === selectedYear)?.grades || []);

  // Define subjects belonging strictly to the currently selected modality (and selectedClass / selectedSpecialty if applicable)
  const modalitySubjects = React.useMemo(() => {
    try {
      const grelha = carregarGrelhaCurricular();
      let filtered = grelha.filter(item => item.active !== false && item.modality === selectedModality);
      
      if (selectedClass !== 'All') {
        filtered = filtered.filter(item => item.class === selectedClass);
      }
      
      if (selectedModality !== 'ENSINO_PRIMARIO' && selectedSpecialty !== 'All') {
        filtered = filtered.filter(item => item.specialty === selectedSpecialty);
      }

      const list = Array.from(new Set(filtered.map(item => item.subject))).sort();
      
      if (list.length === 0) {
        if (selectedModality === 'ENSINO_PRIMARIO') {
          return ['L. PORTUGUESA', 'MATEMATICA', 'EST. MEIO', 'ED. MUSICAL', 'ED. FISICA', 'CIENCIAS INTEGRADAS', 'HISTORIA', 'GEOGRAFIA', 'L. ESTRANGEIRA', 'CIDADANIA'];
        } else if (selectedModality === 'PUNIV') {
          return ['L. PORTUGUESA', 'MATEMATICA', 'ED. FISICA', 'FILOSOFIA', 'BIOLOGIA', 'FISICA', 'QUIMICA', 'HISTORIA', 'GEOGRAFIA', 'INFORMATICA', 'L. INGLESA', 'L. FRANCESA', 'EMPREENDEDORISMO', 'ED. MORAL CIVICA'];
        } else {
          return ['L. PORTUGUESA', 'MATEMATICA', 'ED. FISICA', 'PEDAGOGIA', 'DIDACTICA GERAL', 'PSICOLOGIA', 'METODOLOGIA DE L. PORTUGUESA', 'METODOLOGIA DE MATEMATICA', 'METODOLOGIA DE CIENCIAS', 'PRATICA PEDAGOGICA', 'NEC', 'PAP', 'EMPREENDEDORISMO', 'FILOSOFIA', 'SOCIOLOGIA', 'INFORMATICA'];
        }
      }
      
      // Ensure that if we have Magistério and the specialties that require L. PORTUGUESA, etc., they are included
      if (selectedModality === 'MAGISTERIO' && selectedSpecialty !== 'All' && ['EP', 'PE', 'EMC', 'ING_EMC', 'FRA_EMC', 'LEMC'].includes(selectedSpecialty.toUpperCase())) {
        if (!list.includes('L. PORTUGUESA' as any)) list.push('L. PORTUGUESA' as any);
        if (!list.includes('L. INGLESA' as any)) list.push('L. INGLESA' as any);
        if (!list.includes('L. FRANCESA' as any)) list.push('L. FRANCESA' as any);
      }

      return list;
    } catch (e) {
      console.error(e);
      return SUBJECTS;
    }
  }, [selectedModality, selectedClass, selectedSpecialty]);

  // Sync state if selectedSubject doesn't exist in modalitySubjects
  React.useEffect(() => {
    if (selectedSubject !== 'All' && !modalitySubjects.includes(selectedSubject as any)) {
      setSelectedSubject('All');
    }
  }, [modalitySubjects, selectedSubject]);

  // Synchronize partition with class selection
  React.useEffect(() => {
    if (selectedClass !== 'All' && selectedModality === 'ENSINO_PRIMARIO') {
      const clsNum = parseInt(selectedClass, 10);
      if (clsNum >= 1 && clsNum <= 4) {
        setSelectedPartition('MINI_PAUTA1_BANCODADOS');
      } else if (clsNum === 5 || clsNum === 6) {
        setSelectedPartition('MINI_PAUTA2_BANCODADOS');
      } else if (clsNum >= 7 && clsNum <= 9) {
        setSelectedPartition('MINI_PAUTA3_BANCODADOS');
      }
    }
  }, [selectedClass, selectedModality]);

  // Extract unique filters dynamically based on active students of this subsystem
  const activeStudentsFiltered = React.useMemo(() => {
    return displayStudents.filter((student: any) => subsystemInfo.classes.includes(student.class));
  }, [displayStudents, subsystemInfo]);

  const classesList = subsystemInfo.classes;

  const specialtiesList = React.useMemo(() => {
    if (selectedModality === 'PUNIV') {
      return ['CFB', 'CEJ', 'CS', 'AV'];
    }
    if (selectedModality === 'MAGISTERIO') {
      return ['MF', 'GH', 'BQ', 'EP'];
    }
    return [];
  }, [selectedModality]);

  const sectionsList = React.useMemo(() => {
    if (selectedModality === 'ENSINO_PRIMARIO') {
      return ['A', 'B', 'C', 'D'];
    }
    if (selectedSpecialty !== 'All') {
      return getSectionsList(selectedModality, selectedSpecialty);
    }
    // If selectedSpecialty is 'All', list the 4 turmas of all specialties of the active modality to avoid leak
    const specs = selectedModality === 'PUNIV' ? ['CFB', 'CEJ', 'CS', 'AV'] : ['MF', 'GH', 'BQ', 'EP'];
    const list: string[] = [];
    specs.forEach(spec => {
      list.push(...getSectionsList(selectedModality, spec));
    });
    return list;
  }, [selectedModality, selectedSpecialty]);

  // Synchronize section selection with the available sections list
  React.useEffect(() => {
    if (selectedSection !== 'All' && !sectionsList.includes(selectedSection)) {
      setSelectedSection('All');
    }
  }, [sectionsList, selectedSection]);

  const filteredGrades = displayGrades.filter(row => {
    // 1. Find the student for this grade row
    const student = displayStudents.find(s => s.id === row.studentId);
    if (!student) return false;

    // ISOLAMENTO REATIVO RIGOROSO (REQUISITO 2)
    // Fica estritamente proibido exibir dados misturados de outros subsistemas na base de dados.
    if (!subsystemInfo.classes.includes(student.class)) {
      return false;
    }

    // 2. Filter by partition (database level based on modality)
    const classNum = parseInt(student.class, 10) || 1;
    if (selectedModality === 'ENSINO_PRIMARIO') {
      if (classNum >= 10) return false;
      
      if (selectedPartition === 'MINI_PAUTA1_BANCODADOS') {
        if (classNum > 4) return false;
      } else if (selectedPartition === 'MINI_PAUTA2_BANCODADOS') {
        if (classNum !== 5 && classNum !== 6) return false;
      } else if (selectedPartition === 'MINI_PAUTA3_BANCODADOS') {
        if (classNum < 7 || classNum > 9) return false;
      }
    } else if (selectedModality === 'PUNIV') {
      if (classNum < 10 || classNum > 12) return false;
      if (student.specialty && ['EP', 'EI', 'PE'].includes(student.specialty)) {
        return false;
      }
    } else if (selectedModality === 'MAGISTERIO') {
      if (classNum < 10 || classNum > 13) return false;
      if (student.specialty && ['CFB', 'CEJ', 'CS', 'AV'].includes(student.specialty)) {
        return false;
      }
    }

    // 3. Filter by Class (Classe)
    if (selectedClass !== 'All' && student.class !== selectedClass) {
      return false;
    }

    // 4. Filter by Section (Turma)
    if (selectedSection !== 'All' && student.section !== selectedSection) {
      return false;
    }

    // 5. Filter by Specialty (Especialidade) - only for PUNIV & Magistério
    if (selectedModality !== 'ENSINO_PRIMARIO' && selectedSpecialty !== 'All') {
      if (student.specialty !== selectedSpecialty) return false;
    }

    // 5b. Filter strictly by subjects belonging to the current modality
    if (!modalitySubjects.includes(row.subject)) {
      return false;
    }

    // 6. Filter by Foreign Language (Língua Estrangeira) - only for Primário 7ª a 9ª Class
    if (selectedModality === 'ENSINO_PRIMARIO' && classNum >= 7 && classNum <= 9 && selectedLanguage !== 'All') {
      const studentLang = student.foreignLanguage || 'INGLÊS';
      if (studentLang !== selectedLanguage) return false;
    }

    // 7. If professor is logged in, only show grades of students and subjects they teach
    if (loggedInStaff && loggedInStaff.role === 'PROFESSOR') {
      const assignedSubjects = loggedInStaff.subjects || [];
      if (!assignedSubjects.includes(row.subject)) {
        return false;
      }
      
      const assignedClasses = loggedInStaff.classes || [];
      const assignedSections = loggedInStaff.sections || [];
      if (!assignedClasses.includes(student.class) || !assignedSections.includes(student.section)) {
        return false;
      }
    }

    // 8. General search and basic filters
    const matchesSearch = row.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          row.studentId.includes(searchTerm);
    const matchesSubject = selectedSubject === 'All' || row.subject === selectedSubject;
    const matchesTrimester = selectedTrimester === 'All' || row.trimester === selectedTrimester;
    return matchesSearch && matchesSubject && matchesTrimester;
  });

  if (isRouteOrConfigMismatch) {
    return (
      <div id="grades-database-empty-state" className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white border border-slate-100 rounded-2xl shadow-2xs text-center animate-fadeIn">
        <div className="p-4 bg-rose-50 rounded-full text-rose-500 mb-4 animate-bounce">
          <Database className="w-12 h-12" />
        </div>
        <h3 className="text-lg font-heading font-bold text-slate-850 mb-2">Incompatibilidade de Subsistema</h3>
        <p className="text-sm text-slate-500 max-w-md leading-relaxed">
          Nenhum registo histórico encontrado para o subsistema ativo nas configurações da instituição.
        </p>
        <div className="mt-6 text-xs text-slate-400 font-mono">
          Contexto Institucional Solicitado: {subsystemInfo.nomeOficial}
        </div>
      </div>
    );
  }

  return (
    <div id="grades-database-view" className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-heading font-semibold text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            Base de Dados de Classificações Históricas
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Visualização completa de dados académicos por ano lectivo anterior, classe, turma, especialidade e língua estrangeira.
          </p>
        </div>
      </div>

      {/* Primary Row: Year Selector & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
        {/* Year Selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Ano Lectivo
          </label>
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedClass('All');
              setSelectedSection('All');
              setSelectedSpecialty('All');
              setSelectedLanguage('All');
            }}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="CURRENT">{schoolSettings?.academicYear || '2025/2026'}</option>
            {archives.map((archive: any) => (
              <option key={archive.academicYear} value={archive.academicYear}>
                Ano Arquivado: {archive.academicYear} (Histórico)
              </option>
            ))}
          </select>
        </div>

        {/* Class Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Classe
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="All">Todas as Classes</option>
            {classesList.map(cls => (
              <option key={cls} value={cls}>{cls}ª Classe</option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-500" /> Turma
          </label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="All">Todas as Turmas</option>
            {sectionsList.map(sec => (
              <option key={sec} value={sec}>Turma {sec}</option>
            ))}
          </select>
        </div>

        {/* Specialty Filter (Liceu/Magistério) */}
        {selectedModality !== 'ENSINO_PRIMARIO' ? (
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Especialidade
            </label>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">Cursos e Especialidades de {subsystemInfo.abreviatura}</option>
              {specialtiesList.map(spec => (
                <option key={spec} value={spec}>Formação em {spec}</option>
              ))}
            </select>
          </div>
        ) : (
          /* Foreign Language Filter (only 7ª a 9ª classe) */
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-indigo-500" /> Língua Estrangeira (7ª-9ª)
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">Línguas Estrangeiras (7ª-9ª Classe)</option>
              <option value="INGLÊS">Opção Inglês (L.Estr.)</option>
              <option value="FRANCÊS">Opção Francês (L.Estr.)</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Database Modality Selector */}
      <div className="space-y-3">
        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Subsistema / Modalidade de Ensino (Congelado ao Subsistema Ativo)</label>
        <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 gap-1.5 max-w-2xl">
          {schoolSettings?.activeComponents?.ENSINO_PRIMARIO !== false && (
            <button
              type="button"
              disabled={selectedModality !== 'ENSINO_PRIMARIO'}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                selectedModality === 'ENSINO_PRIMARIO'
                  ? 'bg-indigo-600 text-white shadow-md cursor-default font-bold'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
              }`}
            >
              🏫 Ensino Primário (1ª - 9ª) {selectedModality !== 'ENSINO_PRIMARIO' && '🔒'}
            </button>
          )}
          {schoolSettings?.activeComponents?.PUNIV !== false && (
            <button
              type="button"
              disabled={selectedModality !== 'PUNIV'}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                selectedModality === 'PUNIV'
                  ? 'bg-indigo-600 text-white shadow-md cursor-default font-bold'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
              }`}
            >
              🎓 PUNIV (10ª - 12ª) {selectedModality !== 'PUNIV' && '🔒'}
            </button>
          )}
          {schoolSettings?.activeComponents?.MAGISTERIO !== false && (
            <button
              type="button"
              disabled={selectedModality !== 'MAGISTERIO'}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                selectedModality === 'MAGISTERIO'
                  ? 'bg-indigo-600 text-white shadow-md cursor-default font-bold'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
              }`}
            >
              📜 Magistério (10ª - 13ª) {selectedModality !== 'MAGISTERIO' && '🔒'}
            </button>
          )}
        </div>
      </div>

      {/* Sub-partitions for Ensino Primário */}
      {selectedModality === 'ENSINO_PRIMARIO' && (
        <div className="space-y-2 animate-fadeIn">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Sub-Divisões do Ensino Primário</label>
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200/40 max-w-fit gap-1">
            <button
              type="button"
              onClick={() => {
                setSelectedPartition('MINI_PAUTA1_BANCODADOS');
                setSelectedSubject('All');
              }}
              className={`px-3.5 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedPartition === 'MINI_PAUTA1_BANCODADOS'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/10'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-3 h-3" />
              <span>MINI_PAUTA1_BANCODADOS (1ª - 4ª Classe)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPartition('MINI_PAUTA2_BANCODADOS');
                setSelectedSubject('All');
              }}
              className={`px-3.5 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedPartition === 'MINI_PAUTA2_BANCODADOS'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/10'
                  : 'text-slate-500 hover:text-slate-850'
              }`}
            >
              <Database className="w-3 h-3" />
              <span>MINI_PAUTA2_BANCODADOS (5ª - 6ª Classe)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPartition('MINI_PAUTA3_BANCODADOS');
                setSelectedSubject('All');
              }}
              className={`px-3.5 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedPartition === 'MINI_PAUTA3_BANCODADOS'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/10'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-3 h-3" />
              <span>MINI_PAUTA3_BANCODADOS (7ª - 9ª Classe)</span>
            </button>
          </div>
        </div>
      )}

      {/* Secondary Search & Subject Row */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Pesquisar por ID Aluno ou Nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-700 font-medium"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:border-indigo-500 cursor-pointer font-semibold"
          >
            <option value="All">
              {loggedInStaff && loggedInStaff.role === 'PROFESSOR' ? 'Minhas Disciplinas' : 'Todas as Disciplinas'}
            </option>
            {(loggedInStaff && loggedInStaff.role === 'PROFESSOR' 
              ? (loggedInStaff.subjects || []).filter(subj => modalitySubjects.includes(subj)) 
              : modalitySubjects
            ).map(subj => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </select>

          <select
            value={selectedTrimester}
            onChange={(e) => setSelectedTrimester(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:border-indigo-500 cursor-pointer font-semibold"
          >
            <option value="All">Todos os Trimestres</option>
            <option value="I">Iº Trimestre</option>
            <option value="II">IIº Trimestre</option>
            <option value="III">IIIº Trimestre</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto custom-scrollbar max-h-[500px]">
          <table className="w-full text-left border-collapse table-fixed md:table-auto">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-100">
              <tr className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                <th className="py-3.5 px-6 w-24">ID Aluno</th>
                <th className="py-3.5 px-6 w-60">Aluno</th>
                <th className="py-3.5 px-6 w-24 text-center">Classe</th>
                <th className="py-3.5 px-6 w-20 text-center">Turma</th>
                {selectedModality !== 'ENSINO_PRIMARIO' && <th className="py-3.5 px-6 w-28 text-center">Especialidade</th>}
                <th className="py-3.5 px-6 w-52">Disciplina</th>
                <th className="py-3.5 px-6 w-28 text-center">Trimestre</th>
                <th className="py-3.5 px-6 w-24 text-center">MAc</th>
                <th className="py-3.5 px-6 w-24 text-center">NPT</th>
                <th className="py-3.5 px-6 w-24 text-center">Média TM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredGrades.length > 0 ? (
                filteredGrades.map((row, idx) => {
                  const student = displayStudents.find(s => s.id === row.studentId);
                  const isUpperGrade = student ? parseInt(student.class) >= 7 : false;
                  const passScore = isUpperGrade ? 10 : 5;

                  return (
                    <tr key={`${row.studentId}-${row.subject}-${row.trimester}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-6 font-mono font-semibold text-slate-500">{row.studentId}</td>
                      <td className="py-3 px-6 font-medium text-slate-800">{row.studentName}</td>
                      <td className="py-3 px-6 text-center font-bold text-slate-600">{student?.class ? `${student.class}ª` : '--'}</td>
                      <td className="py-3 px-6 text-center font-bold text-slate-600">{student?.section || '--'}</td>
                      {selectedModality !== 'ENSINO_PRIMARIO' && (
                        <td className="py-3 px-6 text-center text-xs font-semibold text-indigo-600 bg-indigo-50/20 rounded-md">
                          {student?.specialty || 'Geral'}
                        </td>
                      )}
                      <td className="py-3 px-6 text-slate-650 font-semibold">{row.subject}</td>
                      <td className="py-3 px-6 text-center">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs font-bold font-mono">
                          {row.trimester}
                        </span>
                      </td>
                      
                      {/* MAc cell */}
                      <td className="py-2 px-4 text-center text-xs">
                        <div className="text-sm font-semibold text-slate-800 font-mono">
                          {row.mac === null ? (
                            <span className="text-slate-300">--</span>
                          ) : (
                            <span>{row.mac}</span>
                          )}
                        </div>
                      </td>

                      {/* NPT cell */}
                      <td className="py-2 px-4 text-center text-xs">
                        <div className="text-sm font-semibold text-slate-800 font-mono">
                          {row.npt === null ? (
                            <span className="text-slate-300">--</span>
                          ) : (
                            <span>{row.npt}</span>
                          )}
                        </div>
                      </td>

                      {/* MT cell */}
                      <td className="py-2 px-4 text-center">
                        <div className="text-sm font-bold text-slate-800 font-mono">
                          {row.mt === null ? (
                            <span className="text-slate-300">--</span>
                          ) : (
                            <span className={row.mt >= passScore ? 'text-emerald-600' : 'text-rose-600'}>
                              {row.mt}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={selectedModality !== 'ENSINO_PRIMARIO' ? 10 : 9} className="text-center py-10 text-slate-400 text-sm font-bold">
                    Nenhum registo de nota encontrado para esta busca ou filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50/40 px-6 py-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
          <span>{filteredGrades.length} registos correspondentes na base de dados</span>
          <span className="font-mono text-emerald-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Consulta de Dados de Lançamentos Históricos Segura
          </span>
        </div>
      </div>
    </div>
  );
}
