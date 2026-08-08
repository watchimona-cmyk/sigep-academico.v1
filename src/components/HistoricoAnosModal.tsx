import React, { useState, useEffect, useMemo } from 'react';
import { 
  Archive, 
  Calendar, 
  ChevronRight, 
  X, 
  FileSpreadsheet, 
  Award, 
  Users, 
  Layers, 
  CheckCircle2, 
  FileText,
  Clock,
  Printer,
  Sparkles,
  Info,
  TrendingUp,
  UserCheck,
  UserX,
  UserMinus
} from 'lucide-react';
import { Student, GradeRow, SchoolSettings, Staff, UserRole, getSubjectsForClass } from '../types';
import { getArchivedYears, ArchiveYearRecord } from '../utils/archiveUtils';
import PautaTrimester from './PautaTrimester';
import PautaAnnual from './PautaAnnual';
import { getSectionsList } from '../utils';
import { getTipoClasse, calcularObservacaoPauta, NotaDisciplina, AlunoPauta } from '../utils/pautaLogic';

const SPECIALTY_NAMES: Record<string, string> = {
  // PUNIV
  'CFB': 'Ciências Físicas e Biológicas (CFB)',
  'CEJ': 'Ciências Económico-Jurídicas (CEJ)',
  'CS': 'Ciências Sociais / Humanas (CS)',
  'AV': 'Artes Visuais (AV)',
  // MAGISTÉRIO
  'EP': 'Ensino Primário (EP)',
  'PE': 'Pré-Escolar (PE)',
  'MF': 'Matemática e Física (MF)',
  'BQ': 'Biologia e Química (BQ)',
  'GH': 'História e Geografia (GH)',
  'LEMC': 'Português e EMC (LEMC)',
  'ING_EMC': 'Inglês e EMC (ING_EMC)',
  'FRA_EMC': 'Francês e EMC (FRA_EMC)',
  'EVP': 'Educação Visual e Plástica (EVP)',
  'EDF': 'Educação Física (EDF)',
  'EMC': 'Educação Moral e Cívica (EMC)',
  'EI': 'Educação de Infância (EI)'
};

interface HistoricoAnosModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudents: Student[];
  currentGrades: GradeRow[];
  schoolSettings: SchoolSettings;
  userRole: UserRole;
  staffList?: Staff[];
  loggedInStaff?: Staff | null;
  onSelectYearForDocuments?: (year: string) => void;
}

export default function HistoricoAnosModal({
  isOpen,
  onClose,
  currentStudents,
  currentGrades,
  schoolSettings,
  userRole,
  staffList = [],
  loggedInStaff = null,
  onSelectYearForDocuments
}: HistoricoAnosModalProps) {
  const [archivedList, setArchivedList] = useState<ArchiveYearRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(schoolSettings.academicYear || '2025/2026');
  
  // Controls for viewing pautas
  const activeSubsystem = useMemo<'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO'>(() => {
    if (schoolSettings?.officialSubsystem) {
      if (schoolSettings.officialSubsystem === 'PRIMARIO_I_CICLO') return 'ENSINO_PRIMARIO';
      if (schoolSettings.officialSubsystem === 'SECUNDARIO_GERAL') return 'PUNIV';
      if (schoolSettings.officialSubsystem === 'SECUNDARIO_PEDAGOGICO') return 'MAGISTERIO';
    }
    if (schoolSettings?.activeComponents) {
      if (schoolSettings.activeComponents.ENSINO_PRIMARIO && !schoolSettings.activeComponents.PUNIV && !schoolSettings.activeComponents.MAGISTERIO) return 'ENSINO_PRIMARIO';
      if (schoolSettings.activeComponents.PUNIV && !schoolSettings.activeComponents.ENSINO_PRIMARIO && !schoolSettings.activeComponents.MAGISTERIO) return 'PUNIV';
      if (schoolSettings.activeComponents.MAGISTERIO && !schoolSettings.activeComponents.ENSINO_PRIMARIO && !schoolSettings.activeComponents.PUNIV) return 'MAGISTERIO';
    }
    try {
      const saved = localStorage.getItem('sigep_active_modality_v1');
      if (saved === 'ENSINO_PRIMARIO' || saved === 'PUNIV' || saved === 'MAGISTERIO') {
        return saved as any;
      }
    } catch (e) {}
    return 'ENSINO_PRIMARIO';
  }, [schoolSettings]);

  const availableModalities = useMemo(() => {
    if (schoolSettings?.activeComponents) {
      const list: ('ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO')[] = [];
      if (schoolSettings.activeComponents.ENSINO_PRIMARIO) list.push('ENSINO_PRIMARIO');
      if (schoolSettings.activeComponents.PUNIV) list.push('PUNIV');
      if (schoolSettings.activeComponents.MAGISTERIO) list.push('MAGISTERIO');
      if (list.length > 0) return list;
    }
    return [activeSubsystem];
  }, [schoolSettings, activeSubsystem]);

  const [activeModality, setActiveModality] = useState<'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO'>(activeSubsystem);
  const [currentSpecialty, setCurrentSpecialty] = useState<string>('CFB');
  const [currentClass, setCurrentClass] = useState<string>('6');
  const [currentSection, setCurrentSection] = useState<string>('A');
  const [pautaType, setPautaType] = useState<'TRIMESTRAL' | 'ANUAL'>('ANUAL');

  // Keep activeModality synchronized with activeSubsystem if settings change
  useEffect(() => {
    setActiveModality(activeSubsystem);
  }, [activeSubsystem]);

  // Load archived years when modal opens
  useEffect(() => {
    if (isOpen) {
      const archives = getArchivedYears(currentStudents, currentGrades);
      setArchivedList(archives);
      if (archives.length > 0 && !selectedYear) {
        setSelectedYear(archives[0].academicYear);
      }
    }
  }, [isOpen, currentStudents, currentGrades]);

  // Available academic years (Current active year + all archived years)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYearStr = schoolSettings.academicYear || '2025/2026';
    yearsSet.add(currentYearStr);

    archivedList.forEach(a => yearsSet.add(a.academicYear));

    return Array.from(yearsSet);
  }, [schoolSettings.academicYear, archivedList]);

  // Retrieve students and grades for the chosen academic year
  const { yearStudents, yearGrades, yearTimestamp, isCurrentYear } = useMemo(() => {
    const activeYearStr = schoolSettings.academicYear || '2025/2026';
    if (selectedYear === activeYearStr) {
      return {
        yearStudents: currentStudents,
        yearGrades: currentGrades,
        yearTimestamp: 'Ano Lectivo Ativo (Em Curso)',
        isCurrentYear: true
      };
    }

    const match = archivedList.find(a => a.academicYear === selectedYear);
    if (match) {
      return {
        yearStudents: match.students || [],
        yearGrades: match.grades || [],
        yearTimestamp: match.timestamp || 'Ano Encerrado',
        isCurrentYear: false
      };
    }

    return {
      yearStudents: currentStudents,
      yearGrades: currentGrades,
      yearTimestamp: 'Dados Gerais',
      isCurrentYear: false
    };
  }, [selectedYear, schoolSettings.academicYear, currentStudents, currentGrades, archivedList]);

  // For historical years, compute available options dynamically based on archived students
  const availableHistoricalOptions = useMemo(() => {
    if (isCurrentYear || !yearStudents || yearStudents.length === 0) {
      return null;
    }

    const modalitiesSet = new Set<'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO'>();
    const modalitySpecialtiesMap: Record<string, Set<string>> = {
      'ENSINO_PRIMARIO': new Set(['GERAL']),
      'PUNIV': new Set(),
      'MAGISTERIO': new Set()
    };
    const specialtyClassesMap: Record<string, Set<string>> = {};
    const classSectionsMap: Record<string, Set<string>> = {};

    yearStudents.forEach(st => {
      const cls = String(st.class || '').trim();
      const sec = String(st.section || (st as any).turma || 'A').trim();
      const spec = String(st.specialty || '').trim();

      // Determine modality
      let mod: 'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO' = 'ENSINO_PRIMARIO';
      if (['EP', 'PE', 'MF', 'BQ', 'GH', 'LEMC', 'ING_EMC', 'FRA_EMC', 'EVP', 'EDF', 'EMC', 'EI'].includes(spec) || cls === '13') {
        mod = 'MAGISTERIO';
      } else if (['CFB', 'CEJ', 'CS', 'AV'].includes(spec) || ['10', '11', '12'].includes(cls)) {
        mod = 'PUNIV';
      } else {
        mod = 'ENSINO_PRIMARIO';
      }

      modalitiesSet.add(mod);

      if (spec && spec !== 'NENHUMA' && spec !== 'GERAL') {
        modalitySpecialtiesMap[mod].add(spec);
      }

      const specKey = `${mod}_${spec || 'GERAL'}`;
      if (!specialtyClassesMap[specKey]) {
        specialtyClassesMap[specKey] = new Set();
      }
      if (cls) {
        specialtyClassesMap[specKey].add(cls);
      }

      const classKey = `${mod}_${spec || 'GERAL'}_${cls}`;
      if (!classSectionsMap[classKey]) {
        classSectionsMap[classKey] = new Set();
      }
      if (sec) {
        classSectionsMap[classKey].add(sec);
      }
    });

    return {
      modalities: Array.from(modalitiesSet),
      modalitySpecialtiesMap,
      specialtyClassesMap,
      classSectionsMap
    };
  }, [isCurrentYear, yearStudents]);

  // Ensure active state selections exist in historical options
  useEffect(() => {
    if (!isCurrentYear && availableHistoricalOptions) {
      // 1. Validate Modality
      let validMod = activeModality;
      if (availableHistoricalOptions.modalities.length > 0 && !availableHistoricalOptions.modalities.includes(activeModality)) {
        validMod = availableHistoricalOptions.modalities[0];
        setActiveModality(validMod);
      }

      // 2. Validate Specialty
      let validSpec = currentSpecialty;
      if (validMod !== 'ENSINO_PRIMARIO') {
        const availSpecs = Array.from(availableHistoricalOptions.modalitySpecialtiesMap[validMod] || []);
        if (availSpecs.length > 0 && !availSpecs.includes(currentSpecialty)) {
          validSpec = availSpecs[0];
          setCurrentSpecialty(validSpec);
        }
      } else {
        validSpec = 'GERAL';
      }

      // 3. Validate Class
      const specKey = `${validMod}_${validMod === 'ENSINO_PRIMARIO' ? 'GERAL' : validSpec}`;
      const availClasses = Array.from(availableHistoricalOptions.specialtyClassesMap[specKey] || []);
      let validClass = currentClass;
      if (availClasses.length > 0 && !availClasses.includes(currentClass)) {
        validClass = availClasses[0];
        setCurrentClass(validClass);
      }

      // 4. Validate Section
      const classKey = `${validMod}_${validMod === 'ENSINO_PRIMARIO' ? 'GERAL' : validSpec}_${validClass}`;
      const availSections = Array.from(availableHistoricalOptions.classSectionsMap[classKey] || []);
      if (availSections.length > 0 && !availSections.includes(currentSection)) {
        setCurrentSection(availSections[0]);
      }
    }
  }, [isCurrentYear, availableHistoricalOptions, selectedYear]);

  // Dynamic Yield Summary Statistics (Aprovados, Reprovados, Desistentes, Género)
  const classSummary = useMemo(() => {
    const matchingStudents = yearStudents.filter(st => {
      const stCls = String(st.class || '').trim();
      const stSec = String(st.section || (st as any).turma || '').trim();
      const stSpec = String(st.specialty || '').trim();

      if (stCls !== String(currentClass).trim()) return false;
      if (stSec !== String(currentSection).trim()) return false;

      if (activeModality !== 'ENSINO_PRIMARIO') {
        if (stSpec && stSpec !== 'NENHUMA' && stSpec !== 'GERAL') {
          if (stSpec !== currentSpecialty) return false;
        }
      }
      return true;
    });

    let totalM = 0;
    let totalF = 0;

    let aprovados = 0;
    let aprovadosM = 0;
    let aprovadosF = 0;

    let reprovados = 0;
    let reprovadosM = 0;
    let reprovadosF = 0;

    let desistentes = 0;
    let desistentesM = 0;
    let desistentesF = 0;

    const subjects = getSubjectsForClass(currentClass, activeModality, currentSpecialty);
    const tipoClasse = getTipoClasse(currentClass);

    matchingStudents.forEach(st => {
      const isFemale = (st.gender === 'F');

      if (isFemale) totalF++;
      else totalM++;

      // Explicit dropout check
      const isExplicitDesistente = st.status === 'Desistente' || (st.status as string) === 'Inativo' || st.isTransferidoSaida;

      if (isExplicitDesistente) {
        desistentes++;
        if (isFemale) desistentesF++;
        else desistentesM++;
        return;
      }

      // Compute grade rows for student
      const studentGrades = yearGrades.filter(g => g.studentId === st.id || g.studentId === st.registrationId || (st.studentId && g.studentId === st.studentId));

      const disciplinasList: NotaDisciplina[] = subjects.map(sub => {
        const row1 = studentGrades.find(g => g.subject === sub && g.trimester === 'I');
        const row2 = studentGrades.find(g => g.subject === sub && g.trimester === 'II');
        const row3 = studentGrades.find(g => g.subject === sub && g.trimester === 'III');

        const mac1 = row1?.mac ?? null;
        const mac2 = row2?.mac ?? null;
        const mac3 = row3?.mac ?? null;

        const npt1 = row1?.npt ?? null;
        const npt2 = row2?.npt ?? null;
        const npt3 = row3?.npt ?? null;

        const mt1 = row1?.mt ?? null;
        const mt2 = row2?.mt ?? null;
        const mt3 = row3?.mt ?? null;

        const validMts = [mt1, mt2, mt3].filter((val): val is number => val !== null && val !== undefined);
        const mtFinal = validMts.length > 0 
          ? validMts.reduce((a, b) => a + b, 0) / validMts.length 
          : null;

        const isFailed = mtFinal !== null && (
          (currentClass === '1' || currentClass === '2') ? mtFinal < 5 : mtFinal < 10
        );

        return {
          idDisciplina: sub,
          mac: mac3 ?? mac2 ?? mac1,
          npp: undefined,
          npt: npt3 ?? npt2 ?? npt1,
          mt: mtFinal,
          reprovadoNaDisciplina: isFailed
        };
      });

      const alunoPauta: AlunoPauta = {
        id: st.id,
        nome: st.name,
        disciplinas: disciplinasList
      };

      const obs = calcularObservacaoPauta(alunoPauta, tipoClasse);

      if (obs === 'Desistente') {
        desistentes++;
        if (isFemale) desistentesF++;
        else desistentesM++;
      } else if (obs === 'Transita' || obs === 'Apto') {
        aprovados++;
        if (isFemale) aprovadosF++;
        else aprovadosM++;
      } else {
        reprovados++;
        if (isFemale) reprovadosF++;
        else reprovadosM++;
      }
    });

    const total = matchingStudents.length;

    return {
      total,
      totalM,
      totalF,
      aprovados,
      aprovadosM,
      aprovadosF,
      reprovados,
      reprovadosM,
      reprovadosF,
      desistentes,
      desistentesM,
      desistentesF,
      pctAprovados: total > 0 ? Math.round((aprovados / total) * 100) : 0,
      pctReprovados: total > 0 ? Math.round((reprovados / total) * 100) : 0,
      pctDesistentes: total > 0 ? Math.round((desistentes / total) * 100) : 0
    };
  }, [yearStudents, yearGrades, currentClass, currentSection, activeModality, currentSpecialty]);

  // Adjust default class and specialty based on active modality
  useEffect(() => {
    if (activeModality === 'ENSINO_PRIMARIO') {
      if (!['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(currentClass)) {
        setCurrentClass('6');
      }
    } else if (activeModality === 'PUNIV') {
      if (!['10', '11', '12'].includes(currentClass)) {
        setCurrentClass('12');
      }
      if (!['CFB', 'CEJ', 'CS', 'AV'].includes(currentSpecialty)) {
        setCurrentSpecialty('CFB');
      }
    } else if (activeModality === 'MAGISTERIO') {
      if (!['10', '11', '12', '13'].includes(currentClass)) {
        setCurrentClass('13');
      }
      if (!['EP', 'PE', 'MF', 'BQ', 'GH', 'LEMC', 'ING_EMC', 'FRA_EMC', 'EVP', 'EDF', 'EMC'].includes(currentSpecialty)) {
        setCurrentSpecialty('EP');
      }
    }
  }, [activeModality]);

  // For historical years, force Pauta Geral Anual (no mini/trimestral pautas)
  useEffect(() => {
    if (!isCurrentYear) {
      setPautaType('ANUAL');
    }
  }, [isCurrentYear, selectedYear]);

  if (!isOpen) return null;

  const handleUseInDocuments = () => {
    if (onSelectYearForDocuments) {
      onSelectYearForDocuments(selectedYear);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/30 rounded-xl text-indigo-300">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Histórico e Consulta de Anos Lectivos Anteriores
              </h2>
              <p className="text-xs text-indigo-200/80">
                Consulte as pautas gerais e finais arquivadas de qualquer ano lectivo concluído.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
            title="Fechar Janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Year & Navigation Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
          {/* Academic Year Picker */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Ano Lectivo:
            </span>

            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl p-1 shadow-2xs">
              {availableYears.map((yr) => {
                const isSelected = yr === selectedYear;
                const isCurrent = yr === (schoolSettings.academicYear || '2025/2026');
                return (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{yr}</span>
                    {isCurrent && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        isSelected ? 'bg-indigo-700 text-white' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        Atual
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats Badge & Documents Action */}
          <div className="flex items-center gap-3">
            <div className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-3xs">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                <strong>{yearStudents.length}</strong> alunos, <strong>{yearGrades.length}</strong> registros de notas
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] text-slate-500">{yearTimestamp}</span>
            </div>

            {onSelectYearForDocuments && (
              <button
                onClick={handleUseInDocuments}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                title="Usar este Ano Lectivo na emissão de Declarações e Certificados"
              >
                <FileText className="w-4 h-4" />
                <span>Usar no Emissor de Documentos</span>
              </button>
            )}
          </div>
        </div>

        {/* Pauta Controls Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          
          {/* Subsystem & Class Selection */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Subsistema */}
            {(() => {
              const activeModList = (!isCurrentYear && availableHistoricalOptions?.modalities)
                ? availableHistoricalOptions.modalities
                : availableModalities;

              if (activeModList.length <= 1) {
                return (
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-xl text-xs font-extrabold font-mono">
                    <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>SUBSISTEMA: {
                      activeModality === 'ENSINO_PRIMARIO' ? 'ENSINO PRIMÁRIO' :
                      activeModality === 'PUNIV' ? 'PUNIV / II CICLO (LICEU)' : 'MAGISTÉRIO / TÉCNICO'
                    }</span>
                  </div>
                );
              }

              return (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {activeModList.includes('ENSINO_PRIMARIO') && (
                    <button
                      onClick={() => setActiveModality('ENSINO_PRIMARIO')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeModality === 'ENSINO_PRIMARIO' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Ensino Primário
                    </button>
                  )}
                  {activeModList.includes('PUNIV') && (
                    <button
                      onClick={() => setActiveModality('PUNIV')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeModality === 'PUNIV' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      PUNIV / II Ciclo
                    </button>
                  )}
                  {activeModList.includes('MAGISTERIO') && (
                    <button
                      onClick={() => setActiveModality('MAGISTERIO')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeModality === 'MAGISTERIO' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Magistério
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Especialidade / Curso (PUNIV ou Magistério) */}
            {activeModality !== 'ENSINO_PRIMARIO' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Curso:</span>
                <select
                  value={currentSpecialty}
                  onChange={(e) => setCurrentSpecialty(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  {(() => {
                    if (!isCurrentYear && availableHistoricalOptions) {
                      const availSpecs = Array.from(availableHistoricalOptions.modalitySpecialtiesMap[activeModality] || []);
                      if (availSpecs.length > 0) {
                        return availSpecs.map(sp => (
                          <option key={sp} value={sp}>
                            {SPECIALTY_NAMES[sp] || sp}
                          </option>
                        ));
                      }
                    }

                    if (activeModality === 'PUNIV') {
                      return (
                        <>
                          <option value="CFB">Ciências Físicas e Biológicas (CFB)</option>
                          <option value="CEJ">Ciências Económico-Jurídicas (CEJ)</option>
                          <option value="CS">Ciências Sociais / Humanas (CS)</option>
                          <option value="AV">Artes Visuais (AV)</option>
                        </>
                      );
                    }

                    return (
                      <>
                        <option value="EP">Ensino Primário (EP)</option>
                        <option value="PE">Pré-Escolar (PE)</option>
                        <option value="MF">Matemática e Física (MF)</option>
                        <option value="BQ">Biologia e Química (BQ)</option>
                        <option value="GH">História e Geografia (GH)</option>
                        <option value="LEMC">Português e EMC (LEMC)</option>
                        <option value="ING_EMC">Inglês e EMC (ING_EMC)</option>
                        <option value="FRA_EMC">Francês e EMC (FRA_EMC)</option>
                        <option value="EVP">Educação Visual e Plástica (EVP)</option>
                        <option value="EDF">Educação Física (EDF)</option>
                        <option value="EMC">Educação Moral e Cívica (EMC)</option>
                      </>
                    );
                  })()}
                </select>
              </div>
            )}

            {/* Classe */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Classe:</span>
              <select
                value={currentClass}
                onChange={(e) => setCurrentClass(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                {(() => {
                  if (!isCurrentYear && availableHistoricalOptions) {
                    const specKey = `${activeModality}_${activeModality === 'ENSINO_PRIMARIO' ? 'GERAL' : currentSpecialty}`;
                    const availClasses = Array.from(availableHistoricalOptions.specialtyClassesMap[specKey] || []);
                    if (availClasses.length > 0) {
                      return availClasses.sort((a, b) => parseInt(a) - parseInt(b)).map(c => (
                        <option key={c} value={c}>{c}ª Classe</option>
                      ));
                    }
                  }

                  if (activeModality === 'ENSINO_PRIMARIO') {
                    return ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(c => <option key={c} value={c}>{c}ª Classe</option>);
                  }
                  if (activeModality === 'PUNIV') {
                    return ['10', '11', '12'].map(c => <option key={c} value={c}>{c}ª Classe</option>);
                  }
                  return ['10', '11', '12', '13'].map(c => <option key={c} value={c}>{c}ª Classe</option>);
                })()}
              </select>
            </div>

            {/* Turma */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Turma:</span>
              <select
                value={currentSection}
                onChange={(e) => setCurrentSection(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                {(() => {
                  if (!isCurrentYear && availableHistoricalOptions) {
                    const classKey = `${activeModality}_${activeModality === 'ENSINO_PRIMARIO' ? 'GERAL' : currentSpecialty}_${currentClass}`;
                    const availSections = Array.from(availableHistoricalOptions.classSectionsMap[classKey] || []);
                    if (availSections.length > 0) {
                      return availSections.map(s => (
                        <option key={s} value={s}>Turma {s}</option>
                      ));
                    }
                  }

                  return getSectionsList(activeModality, currentSpecialty).map(s => (
                    <option key={s} value={s}>Turma {s}</option>
                  ));
                })()}
              </select>
            </div>
          </div>

          {/* Type of Pauta Toggle */}
          <div className="flex items-center gap-2">
            {!isCurrentYear ? (
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-extrabold font-mono shadow-2xs">
                <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>PAUTA GERAL ANUAL (PAUTA FINAL)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-indigo-50 p-1 rounded-xl border border-indigo-200">
                <button
                  onClick={() => setPautaType('TRIMESTRAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pautaType === 'TRIMESTRAL' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-800 hover:bg-indigo-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Pauta Trimestral</span>
                </button>

                <button
                  onClick={() => setPautaType('ANUAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pautaType === 'ANUAL' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-800 hover:bg-indigo-100'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Pauta Geral Anual</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Dynamic Yield & Gender Statistics Banner */}
        <div className="bg-slate-900 text-white border-b border-slate-800 px-6 py-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Title & Selection Badge */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                    Estatística da Turma Selecionada
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">
                    {selectedYear}
                  </span>
                </div>
                <span className="text-xs font-extrabold text-white font-mono">
                  {currentClass}ª Classe • Turma {currentSection} {activeModality !== 'ENSINO_PRIMARIO' && `• ${SPECIALTY_NAMES[currentSpecialty] || currentSpecialty}`}
                </span>
              </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 font-mono">
              
              {/* Total Alunos */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 flex flex-col justify-between shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Total Alunos</span>
                  <Users className="w-3 h-3 text-slate-400" />
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-base font-black text-white">{classSummary.total}</span>
                  <span className="text-[10px] font-bold text-slate-300 bg-slate-700/60 px-1.5 py-0.5 rounded">
                    {classSummary.totalM}M • {classSummary.totalF}F
                  </span>
                </div>
              </div>

              {/* Aprovados */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-3 py-1.5 flex flex-col justify-between shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-300 font-extrabold uppercase flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-emerald-400" />
                    Aprovados
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-1.5 py-0.2 rounded">
                    {classSummary.pctAprovados}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-base font-black text-emerald-300">{classSummary.aprovados}</span>
                  <span className="text-[10px] font-bold text-emerald-300/80 bg-emerald-900/60 px-1.5 py-0.5 rounded">
                    {classSummary.aprovadosM}M • {classSummary.aprovadosF}F
                  </span>
                </div>
              </div>

              {/* Reprovados */}
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-1.5 flex flex-col justify-between shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-rose-300 font-extrabold uppercase flex items-center gap-1">
                    <UserX className="w-3 h-3 text-rose-400" />
                    Reprovados
                  </span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 font-extrabold px-1.5 py-0.2 rounded">
                    {classSummary.pctReprovados}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-base font-black text-rose-300">{classSummary.reprovados}</span>
                  <span className="text-[10px] font-bold text-rose-300/80 bg-rose-900/60 px-1.5 py-0.5 rounded">
                    {classSummary.reprovadosM}M • {classSummary.reprovadosF}F
                  </span>
                </div>
              </div>

              {/* Desistentes */}
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl px-3 py-1.5 flex flex-col justify-between shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-300 font-extrabold uppercase flex items-center gap-1">
                    <UserMinus className="w-3 h-3 text-amber-400" />
                    Desistentes
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-1.5 py-0.2 rounded">
                    {classSummary.pctDesistentes}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-base font-black text-amber-300">{classSummary.desistentes}</span>
                  <span className="text-[10px] font-bold text-amber-300/80 bg-amber-900/60 px-1.5 py-0.5 rounded">
                    {classSummary.desistentesM}M • {classSummary.desistentesF}F
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Read-Only Banner Warning */}
        {!isCurrentYear && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs font-bold text-amber-900 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Modo de Consulta Histórica ({selectedYear}): Os dados apresentados abaixo correspondem ao arquivo definitivo deste ano lectivo.</span>
            </div>
            <span className="bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">Apenas Leitura</span>
          </div>
        )}

        {/* Pauta Viewport (Scrollable) */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100">
          {pautaType === 'TRIMESTRAL' ? (
            <PautaTrimester
              students={yearStudents}
              grades={yearGrades}
              staffList={staffList}
              currentClass={currentClass}
              currentSection={currentSection}
              onUpdateGradeFields={() => {}}
              onPovoarAlunos={() => {}}
              onConsolidarNotas={() => {}}
              userRole={userRole}
              loggedInStaff={loggedInStaff}
              schoolSettings={{ ...schoolSettings, academicYear: selectedYear }}
              activeModality={activeModality}
            />
          ) : (
            <PautaAnnual
              students={yearStudents}
              grades={yearGrades}
              currentClass={currentClass}
              currentSection={currentSection}
              isClosingPeriod={false}
              onUpdateGrade={() => {}}
              onPovoarAlunos={() => {}}
              onConsolidarNotas={() => {}}
              userRole={userRole}
              loggedInStaff={loggedInStaff}
              schoolSettings={{ ...schoolSettings, academicYear: selectedYear }}
              activeModality={activeModality}
            />
          )}
        </div>

      </div>
    </div>
  );
}
