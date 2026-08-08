import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  GraduationCap, 
  Layers, 
  Users, 
  ChevronLeft, 
  ArrowRight, 
  CheckCircle,
  Clock,
  Lock,
  Calendar,
  Award
} from 'lucide-react';
import { Student, GradeRow, SchoolSettings, Staff, UserRole } from '../types';
import PautaAnnual from './PautaAnnual';
import PautaTrimester from './PautaTrimester';
import { getSectionsList, getProfessorAllowedClasses, getProfessorAllowedSections } from '../utils';

interface PainelPautasProps {
  students: Student[];
  grades: GradeRow[];
  staffList: Staff[];
  activeModality: 'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO';
  setActiveModality: (m: 'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO') => void;
  currentClass: string;
  setCurrentClass: (c: string) => void;
  currentSection: string;
  setCurrentSection: (s: string) => void;
  isClosingPeriod: boolean;
  setIsClosingPeriod: (b: boolean) => void;
  handleUpdateGradeMT: any;
  handleUpdateGradeFields: any;
  handlePovoarAlunosSub: any;
  handleConsolidarNotasSub: any;
  userRole: UserRole;
  loggedInStaff: Staff | null;
  schoolSettings: SchoolSettings;
  useNpp: boolean;
  onToggleNpp: (val: boolean) => void;
}

export default function PainelPautas({
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
  handleUpdateGradeMT,
  handleUpdateGradeFields,
  handlePovoarAlunosSub,
  handleConsolidarNotasSub,
  userRole,
  loggedInStaff,
  schoolSettings,
  useNpp,
  onToggleNpp
}: PainelPautasProps) {
  
  // Local state for the centralized grade sheets selector panel
  const [isViewingPauta, setIsViewingPauta] = useState<boolean>(false);
  const [selectedPautaType, setSelectedPautaType] = useState<'TRIMESTRAL' | 'GERAL'>('TRIMESTRAL');
  const [localModality, setLocalModality] = useState<'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO'>(activeModality);
  
  // Specialties and Language options
  const [localSpecialty, setLocalSpecialty] = useState<string>('CFB');
  const [localLanguage, setLocalLanguage] = useState<'INGLÊS' | 'FRANCÊS' | 'NENHUMA'>('NENHUMA');

  const [localClass, setLocalClass] = useState<string>(currentClass);
  const [localSection, setLocalSection] = useState<string>(currentSection);

  // Set default specialty / language based on modality
  useEffect(() => {
    if (localModality === 'PUNIV') {
      setLocalSpecialty('CFB');
      setLocalLanguage('NENHUMA');
    } else if (localModality === 'MAGISTERIO') {
      setLocalSpecialty('EP');
      setLocalLanguage('NENHUMA');
    } else if (localModality === 'ENSINO_PRIMARIO') {
      setLocalSpecialty('GERAL');
      const classNum = parseInt(localClass, 10);
      if (classNum >= 7 && classNum <= 9) {
        setLocalLanguage('INGLÊS');
      } else {
        setLocalLanguage('NENHUMA');
      }
    }
  }, [localModality]);

  // Se a classe for a 13ª Classe, forçar o tipo de pauta para GERAL (visto que não existem médias trimestrais periódicas)
  useEffect(() => {
    if (localClass === '13') {
      setSelectedPautaType('GERAL');
    }
  }, [localClass]);

  // Available classes for selected modality
  const getClassesForSelection = () => {
    if (localModality === 'ENSINO_PRIMARIO') {
      if (localLanguage === 'NENHUMA') {
        return ['1', '2', '3', '4', '5', '6'];
      } else {
        return ['7', '8', '9'];
      }
    } else if (localModality === 'PUNIV') {
      return ['10', '11', '12'];
    } else { // MAGISTERIO
      return ['10', '11', '12', '13'];
    }
  };

  // Available sections for selected modality
  const getSectionsForSelection = () => {
    if (localModality === 'ENSINO_PRIMARIO') {
      return getSectionsList('ENSINO_PRIMARIO');
    }
    return getSectionsList(localModality, localSpecialty);
  };

  // Synchronize local options if local modality, specialty or language changes
  useEffect(() => {
    const classes = getClassesForSelection();
    const sections = getSectionsForSelection();
    
    // Fallbacks if current local class/section doesn't match new settings
    if (!classes.includes(localClass)) {
      setLocalClass(classes[0]);
    }
    if (!sections.includes(localSection)) {
      setLocalSection(sections[0]);
    }
  }, [localModality, localSpecialty, localLanguage]);

  // Handle staff restrictions
  const filteredClasses = loggedInStaff && loggedInStaff.role === 'PROFESSOR'
    ? getProfessorAllowedClasses(loggedInStaff, getClassesForSelection())
    : getClassesForSelection();

  const filteredSections = loggedInStaff && loggedInStaff.role === 'PROFESSOR'
    ? getProfessorAllowedSections(loggedInStaff, localClass, getSectionsForSelection())
    : getSectionsForSelection();

  // Apply selected parameters to App state and enter the sheet view
  const handleAccessPauta = () => {
    setActiveModality(localModality);
    setCurrentClass(localClass);
    setCurrentSection(localSection);
    setIsViewingPauta(true);
  };

  // Human readable labels
  const getModalityName = (mod: string) => {
    if (mod === 'ENSINO_PRIMARIO') return 'Ensino Primário';
    if (mod === 'PUNIV') return 'Ensino Geral (PUNIV)';
    return 'Magistério Docente (Pedagogia)';
  };

  return (
    <div id="central-pautas-panel" className="space-y-6">
      
      {/* 1. SELECTION PANEL (isViewingPauta === false) */}
      {!isViewingPauta ? (
        <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-6 md:p-8 space-y-8 shadow-xs">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-650">
                <FileSpreadsheet className="w-6 h-6" />
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  Painel Central de Pautas
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-bold tracking-wide">
                Seleccione as opções abaixo para aceder, lançar notas ou exportar pautas oficiais parametrizadas de acordo com as directrizes do MED.
              </p>
            </div>
            
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100/60 text-xs font-bold text-indigo-700">
              <Clock className="w-4 h-4 text-indigo-550 shrink-0" />
              <span>Ano Lectivo: {schoolSettings.academicYear}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Step 1: Tipo de Pauta */}
            <div className="bg-white rounded-xl border border-slate-200/70 p-5 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">1</span>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Tipo de Pauta</h2>
              </div>
              
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled={localClass === '13'}
                  onClick={() => setSelectedPautaType('TRIMESTRAL')}
                  className={`w-full p-4 rounded-xl border text-left transition-all relative flex flex-col gap-1 ${
                    localClass === '13'
                      ? 'border-slate-100 bg-slate-50/50 opacity-40 cursor-not-allowed'
                      : selectedPautaType === 'TRIMESTRAL'
                      ? 'border-indigo-600 bg-indigo-50/45 ring-1 ring-indigo-600 cursor-pointer'
                      : 'border-slate-200 hover:border-slate-350 bg-slate-50/30 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 tracking-wide">PAUTA TRIMESTRAL</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">Lançamento</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Para o controle e acompanhamento de avaliações periódicas do aluno (NPP, NPT, MAC) em cada um dos trimestres.
                  </p>
                  {selectedPautaType === 'TRIMESTRAL' && (
                    <div className="absolute right-3 bottom-3">
                      <CheckCircle className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPautaType('GERAL')}
                  className={`w-full p-4 rounded-xl border text-left transition-all relative flex flex-col gap-1 cursor-pointer ${
                    selectedPautaType === 'GERAL'
                      ? 'border-indigo-600 bg-indigo-50/45 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-350 bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 tracking-wide">PAUTA GERAL ANUAL</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold uppercase">Consolidação</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Para consolidação das médias finais de frequência (MT), classificação de exames (NE) e determinação de transição/retenção.
                  </p>
                  {selectedPautaType === 'GERAL' && (
                    <div className="absolute right-3 bottom-3">
                      <CheckCircle className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2: Ciclo de Ensino */}
            <div className="bg-white rounded-xl border border-slate-200/70 p-5 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">2</span>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Ciclo de Ensino</h2>
              </div>

              <div className="space-y-3 pt-2">
                {(['ENSINO_PRIMARIO', 'PUNIV', 'MAGISTERIO'] as const).filter(mod => {
                  return schoolSettings.activeComponents?.[mod] !== false;
                }).map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    disabled={loggedInStaff?.role === 'PROFESSOR'}
                    onClick={() => setLocalModality(mod)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all relative flex items-center gap-3 cursor-pointer ${
                      localModality === mod
                        ? 'border-indigo-600 bg-indigo-50/45 ring-1 ring-indigo-600'
                        : 'border-slate-200 hover:border-slate-350 bg-slate-50/30'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100/75 text-indigo-700 flex items-center justify-center shrink-0">
                      {mod === 'ENSINO_PRIMARIO' ? <Layers className="w-4 h-4" /> : 
                       mod === 'PUNIV' ? <GraduationCap className="w-4 h-4" /> : 
                       <Users className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
                        {mod === 'ENSINO_PRIMARIO' ? 'Ensino Primário' : mod === 'PUNIV' ? 'PUNIV' : 'Magistério'}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold">
                        {mod === 'ENSINO_PRIMARIO' ? '1ª à 9ª Classe' : mod === 'PUNIV' ? '10ª à 12ª Classe' : '10ª à 13ª Classe (Pedagogia)'}
                      </span>
                    </div>
                    {localModality === mod && (
                      <div className="absolute right-3">
                        <CheckCircle className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Parametros de Acesso */}
            <div className="bg-white rounded-xl border border-slate-200/70 p-5 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">3</span>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Especialidade &amp; Turma</h2>
              </div>

              <div className="space-y-4 pt-2">
                {/* A. ESPECIALIDADE OU OPÇÃO DE LÍNGUA */}
                {localModality === 'PUNIV' && (
                  <div className="flex flex-col space-y-1 animate-fadeIn">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Especialidade / Curso</label>
                    <select
                      value={localSpecialty}
                      onChange={(e) => setLocalSpecialty(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 p-2.5 rounded-lg font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-650 cursor-pointer"
                    >
                      <option value="CFB">Ciências Físicas e Biológicas (CFB)</option>
                      <option value="CEJ">Ciências Económico-Jurídicas (CEJ)</option>
                      <option value="CS">Ciências Sociais (CS)</option>
                      <option value="AV">Artes Visuais (AV)</option>
                    </select>
                  </div>
                )}

                {localModality === 'MAGISTERIO' && (
                  <div className="flex flex-col space-y-1 animate-fadeIn">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Especialidade / Curso</label>
                    <select
                      value={localSpecialty}
                      onChange={(e) => setLocalSpecialty(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 p-2.5 rounded-lg font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-650 cursor-pointer"
                    >
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
                )}

                {localModality === 'ENSINO_PRIMARIO' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Regime de Ensino</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setLocalLanguage('NENHUMA')}
                          className={`py-2 px-3 rounded-lg border text-center font-bold text-xs transition-all cursor-pointer ${
                            localLanguage === 'NENHUMA'
                              ? 'border-indigo-600 bg-indigo-50/40 text-indigo-750 font-extrabold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Ensino Geral <br/> <span className="text-[9px] font-medium text-slate-400">(1ª à 6ª Classe)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocalLanguage('INGLÊS')}
                          className={`py-2 px-3 rounded-lg border text-center font-bold text-xs transition-all cursor-pointer ${
                            localLanguage !== 'NENHUMA'
                              ? 'border-indigo-600 bg-indigo-50/40 text-indigo-750 font-extrabold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Língua Estrangeira <br/> <span className="text-[9px] font-medium text-slate-400">(7ª à 9ª Classe)</span>
                        </button>
                      </div>
                    </div>

                    {/* If Língua Estrangeira is chosen, show language sub-selection */}
                    {localLanguage !== 'NENHUMA' && (
                      <div className="flex flex-col space-y-1.5 p-3 rounded-xl bg-indigo-50/30 border border-indigo-100/60 animate-fadeIn">
                        <label className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider">Escolha a Língua Estrangeira</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setLocalLanguage('INGLÊS')}
                            className={`py-2 px-2 rounded-lg border text-center font-bold text-xs transition-all cursor-pointer ${
                              localLanguage === 'INGLÊS'
                                ? 'bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            🇺🇸 Inglês
                          </button>
                          <button
                            type="button"
                            onClick={() => setLocalLanguage('FRANCÊS')}
                            className={`py-2 px-2 rounded-lg border text-center font-bold text-xs transition-all cursor-pointer ${
                              localLanguage === 'FRANCÊS'
                                ? 'bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            🇫🇷 Francês
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* B. CLASSE */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Classe de Ensino</label>
                  <select
                    value={localClass}
                    onChange={(e) => setLocalClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 p-2.5 rounded-lg font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                  >
                    {filteredClasses.map((cl) => (
                      <option key={cl} value={cl}>
                        {cl}ª Classe
                      </option>
                    ))}
                  </select>
                </div>

                {/* C. TURMA */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Turma / Secção</label>
                  <select
                    value={localSection}
                    onChange={(e) => setLocalSection(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 p-2.5 rounded-lg font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                  >
                    {filteredSections.map((sec) => (
                      <option key={sec} value={sec}>
                        Turma {sec}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period of Closing switch */}
                {(loggedInStaff?.role === 'DIRECTOR_GERAL') && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Período de Fecho</span>
                    <span className="text-[9px] text-slate-400 font-medium">Bloquear pauta no final do período</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isClosingPeriod}
                      onChange={(e) => setIsClosingPeriod(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                )}
              </div>
            </div>

          </div>

          {/* Action Trigger Card */}
          <div className="flex justify-end pt-5 border-t border-slate-200/80">
            <button
              type="button"
              onClick={handleAccessPauta}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/45 hover:-translate-y-0.5 transition-all cursor-pointer duration-200 active:translate-y-0"
            >
              <span>Aceder à Pauta Seleccionada</span>
              <ArrowRight className="w-4.5 h-4.5 text-white" />
            </button>
          </div>
          
        </div>
      ) : (
        
        // 2. ACTIVE VIEW PANEL (isViewingPauta === true)
        <div className="space-y-4 animate-fadeIn">
          
          {/* Dashboard Control Breadcrumbs Header */}
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsViewingPauta(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/50 flex items-center justify-center"
                title="Voltar ao Painel Selector"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-black text-[#7FFF00] tracking-widest uppercase font-mono">
                  <span>Ano {schoolSettings.academicYear}</span>
                  <span>•</span>
                  <span>{getModalityName(activeModality)}</span>
                </div>
                
                <h1 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                  <span>Pauta {selectedPautaType === 'TRIMESTRAL' ? 'Trimestral' : 'Geral Anual'}</span>
                  <span className="text-slate-550">/</span>
                  <span className="text-indigo-400">{currentClass}ª Classe</span>
                  <span className="text-slate-550">/</span>
                  <span className="text-[#7FFF00]">Turma {currentSection}</span>
                </h1>
              </div>
            </div>

            {/* Quick Actions inside View */}
            <div className="flex items-center gap-3">
              {(loggedInStaff?.role === 'DIRECTOR_GERAL') && (
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-extrabold text-slate-400">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span className="uppercase">Fecho:</span>
                <span className={isClosingPeriod ? 'text-red-500' : 'text-emerald-500'}>
                  {isClosingPeriod ? 'ACTIVO' : 'INACTIVO'}
                </span>
                <input
                  type="checkbox"
                  checked={isClosingPeriod}
                  onChange={(e) => setIsClosingPeriod(e.target.checked)}
                  className="ml-1 cursor-pointer"
                />
              </div>
              )}

              <button
                type="button"
                onClick={() => setIsViewingPauta(false)}
                className="bg-white/10 hover:bg-white/15 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wide border border-white/10 transition-all cursor-pointer whitespace-nowrap"
              >
                Mudar de Pauta
              </button>
            </div>
          </div>

          {/* Mount the Specific Pauta Component */}
          <div className="bg-white rounded-2xl border border-slate-200/75 p-2 overflow-x-auto shadow-xs">
            {selectedPautaType === 'TRIMESTRAL' ? (
              <PautaTrimester
                students={students}
                grades={grades}
                staffList={staffList}
                currentClass={currentClass}
                currentSection={currentSection}
                onUpdateGradeFields={handleUpdateGradeFields}
                onPovoarAlunos={handlePovoarAlunosSub}
                onConsolidarNotas={handleConsolidarNotasSub}
                userRole={userRole}
                loggedInStaff={loggedInStaff}
                schoolSettings={schoolSettings}
                activeModality={activeModality}
                useNpp={useNpp}
                onToggleNpp={onToggleNpp}
                foreignLanguageProp={localLanguage !== 'NENHUMA' ? localLanguage : undefined}
              />
            ) : (
              <PautaAnnual
                students={students}
                grades={grades}
                currentClass={currentClass}
                currentSection={currentSection}
                isClosingPeriod={isClosingPeriod}
                onUpdateGrade={handleUpdateGradeMT}
                onPovoarAlunos={() => handlePovoarAlunosSub('PAUTA1')}
                onConsolidarNotas={() => handleConsolidarNotasSub('PAUTA1')}
                userRole={userRole}
                loggedInStaff={loggedInStaff}
                schoolSettings={schoolSettings}
                activeModality={activeModality}
                useNpp={useNpp}
                onToggleNpp={onToggleNpp}
                foreignLanguageProp={localLanguage !== 'NENHUMA' ? localLanguage : undefined}
              />
            )}
          </div>

        </div>
        
      )}
      
    </div>
  );
}
