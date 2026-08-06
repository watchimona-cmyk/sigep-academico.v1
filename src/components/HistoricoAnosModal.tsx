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
  Info
} from 'lucide-react';
import { Student, GradeRow, SchoolSettings, Staff, UserRole } from '../types';
import { getArchivedYears, ArchiveYearRecord } from '../utils/archiveUtils';
import PautaTrimester from './PautaTrimester';
import PautaAnnual from './PautaAnnual';
import { getSectionsList } from '../utils';

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
  const [activeModality, setActiveModality] = useState<'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO'>('ENSINO_PRIMARIO');
  const [currentClass, setCurrentClass] = useState<string>('6');
  const [currentSection, setCurrentSection] = useState<string>('A');
  const [pautaType, setPautaType] = useState<'TRIMESTRAL' | 'ANUAL'>('TRIMESTRAL');

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

  // Adjust default class based on active modality
  useEffect(() => {
    if (activeModality === 'ENSINO_PRIMARIO') {
      setCurrentClass('6');
    } else if (activeModality === 'PUNIV') {
      setCurrentClass('12');
    } else if (activeModality === 'MAGISTERIO') {
      setCurrentClass('13');
    }
  }, [activeModality]);

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
                Consulte as pautas trimestrais e anuais arquivadas de qualquer ano lectivo concluído.
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
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveModality('ENSINO_PRIMARIO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeModality === 'ENSINO_PRIMARIO' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ensino Primário
              </button>
              <button
                onClick={() => setActiveModality('PUNIV')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeModality === 'PUNIV' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                PUNIV / II Ciclo
              </button>
              <button
                onClick={() => setActiveModality('MAGISTERIO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeModality === 'MAGISTERIO' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Magistério
              </button>
            </div>

            {/* Classe */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Classe:</span>
              <select
                value={currentClass}
                onChange={(e) => setCurrentClass(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                {activeModality === 'ENSINO_PRIMARIO' && (
                  ['1', '2', '3', '4', '5', '6'].map(c => <option key={c} value={c}>{c}ª Classe</option>)
                )}
                {activeModality === 'PUNIV' && (
                  ['7', '8', '9', '10', '11', '12'].map(c => <option key={c} value={c}>{c}ª Classe</option>)
                )}
                {activeModality === 'MAGISTERIO' && (
                  ['10', '11', '12', '13'].map(c => <option key={c} value={c}>{c}ª Classe</option>)
                )}
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
                {getSectionsList(activeModality).map(s => (
                  <option key={s} value={s}>Turma {s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type of Pauta Toggle */}
          <div className="flex items-center gap-2">
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
