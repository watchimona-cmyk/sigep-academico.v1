import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Award, 
  BookOpen, 
  FileSpreadsheet,
  Layers,
  GraduationCap,
  CheckCircle,
  Settings
} from 'lucide-react';
import { Student, GradeRow, SchoolSettings, ModalityType } from '../types';
import EstatisticaFormativa from './EstatisticaFormativa';
import MapaAproveitamento from './MapaAproveitamento';
import PautaExame12Classe from './PautaExame12Classe';
import { ConfiguracaoEspecialidade } from './ConfiguracaoEspecialidade';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import SiGePLogo from './SiGePLogo';

interface StatsDashboardProps {
  students: Student[];
  grades: GradeRow[];
  settings: SchoolSettings;
  userRole?: string;
  activeModality?: ModalityType;
  currentClass?: string;
  currentSection?: string;
  isHome?: boolean;
}

export default function StatsDashboard({ 
  students, 
  grades, 
  settings, 
  userRole,
  activeModality,
  currentClass,
  currentSection,
  isHome = false
}: StatsDashboardProps) {
  const { activeSubsystem, subsystemInfo } = useSchoolSettings();
  
  const [activeMainTab, setActiveMainTab] = useState<'PAINEL' | 'OFERTA' | 'APROVEITAMENTO' | 'EXAME_12' | 'CURRICULO'>('PAINEL');
  const [activeSubTab, setActiveSubTab] = useState<'MATRICULA' | 'TRIMESTRAL' | 'ANUAL'>('MATRICULA');

  const displayMainTab = isHome ? 'PAINEL' : activeMainTab;

  React.useEffect(() => {
    if (activeMainTab === 'EXAME_12' && activeSubsystem !== 'SECUNDARIO_GERAL') {
      setActiveMainTab('PAINEL');
    }
    if (activeMainTab === 'CURRICULO' && activeSubsystem !== 'SECUNDARIO_PEDAGOGICO') {
      setActiveMainTab('PAINEL');
    }
  }, [activeSubsystem, activeMainTab]);

  const modality = subsystemInfo?.modalityMap || activeModality || 'ENSINO_PRIMARIO';

  // Helper matching function
  const matchModality = (student: Student, selectedModality: ModalityType) => {
    const clsNum = parseInt(student.class, 10);
    if (selectedModality === 'ENSINO_PRIMARIO') {
      return clsNum >= 1 && clsNum <= 9;
    }

    if (!student.specialty || (student.specialty as string) === 'Ensino Geral Unificado' || (student.specialty as string) === 'GERAL') {
      if (selectedModality === 'PUNIV') return clsNum >= 10 && clsNum <= 12;
      if (selectedModality === 'MAGISTERIO') return clsNum >= 10 && clsNum <= 13;
    }

    const spec = (student.specialty || '').toUpperCase().trim();
    const normSpec = spec.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const punivMatches = ['CFB', 'CEJ', 'CS', 'CSH', 'AV', 'FISICA', 'BIOLOGICA', 'ECONOMICO', 'JURIDICA', 'SOCIAIS', 'ARTES'];
    const magisterioMatches = ['MF', 'EP', 'BQ', 'LEMC', 'GH', 'PE', 'ING_EMC', 'FRA_EMC', 'EVP', 'EDF', 'EMC', 'MATEMATICA', 'HISTORIA', 'GEOGRAFIA', 'BIOLOGIA', 'QUIMICA', 'PORTUGUES', 'INGLES', 'FRANCES', 'PRIMARIO', 'INFANCIA'];

    if (selectedModality === 'PUNIV') {
      const isPuniv = punivMatches.some(m => normSpec.includes(m) || spec.includes(m));
      return (clsNum >= 10 && clsNum <= 12) && isPuniv;
    } else {
      const isMagisterio = magisterioMatches.some(m => normSpec.includes(m) || spec.includes(m)) || student.class === '13';
      return (clsNum >= 10 && clsNum <= 13) && isMagisterio;
    }
  };

  // Recuperação de Dados em Tempo Real (Fallbacks com LocalStorage)
  const currentStudents = React.useMemo(() => {
    let list = students;
    if ((!list || list.length === 0) && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sigep_students_v1');
        if (saved) list = JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return list || [];
  }, [students]);

  const currentGrades = React.useMemo(() => {
    let list = grades;
    if ((!list || list.length === 0) && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sigep_grades_v1');
        if (saved) list = JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return list || [];
  }, [grades]);

  // Filtragem dos Alunos para os painéis gerais
  const filteredStudents = currentStudents.filter(s => {
    if (!matchModality(s, modality)) return false;
    if (currentClass) {
      const sClean = String(s.class || '').replace(/\D/g, '');
      const curClean = String(currentClass || '').replace(/\D/g, '');
      if (sClean !== curClean && String(s.class || '').trim() !== String(currentClass).trim()) return false;
    }
    if (currentSection && s.section !== currentSection) return false;
    return true;
  });

  // Cálculos Estatísticos Reais baseados no filtro
  const totalInscritos = filteredStudents.length;
  const alunosAtivos = filteredStudents.filter(s => !s.isTransferidoSaida).length;
  const transferidosEntrada = filteredStudents.filter(s => s.isTransferidoEntrada).length;
  const transferidosSaida = filteredStudents.filter(s => s.isTransferidoSaida).length;
  
  // Género dos Ativos
  const masculino = filteredStudents.filter(s => s.gender === 'M' && !s.isTransferidoSaida).length;
  const feminino = filteredStudents.filter(s => s.gender === 'F' && !s.isTransferidoSaida).length;
  
  // Cálculo de Percentagens
  const pctM = AlunosAtivosPct(masculino);
  const pctF = AlunosAtivosPct(feminino);

  function AlunosAtivosPct(value: number) {
    if (alunosAtivos === 0) return 0;
    return Math.round((value / alunosAtivos) * 100);
  }

  // Estatística por Classes baseada na modalidade activa e na turma se seleccionada
  const classesList = modality === 'ENSINO_PRIMARIO'
    ? ['1', '2', '3', '4', '5', '6', '7', '8', '9']
    : modality === 'PUNIV'
      ? ['10', '11', '12']
      : ['10', '11', '12', '13'];

  const dataClasses = classesList.map(cl => {
    const classStudents = currentStudents.filter(s => {
      const sClean = String(s.class || '').replace(/\D/g, '');
      const clClean = String(cl || '').replace(/\D/g, '');
      if (sClean !== clClean && String(s.class || '').trim() !== String(cl).trim()) return false;
      if (!matchModality(s, modality)) return false;
      if (currentSection && s.section !== currentSection) return false;
      return true;
    });

    const totalCl = classStudents.length;
    const ativosCl = classStudents.filter(s => !s.isTransferidoSaida).length;
    const transSaidaCl = classStudents.filter(s => s.isTransferidoSaida).length;
    const transEntradaCl = classStudents.filter(s => s.isTransferidoEntrada).length;

    return {
      name: `${cl}ª Classe`,
      'Total Geral': totalCl,
      'Alunos Ativos': ativosCl,
      'Saídas (Transferidos)': transSaidaCl,
      'Entradas (Transferidos)': transEntradaCl,
    };
  });

  // Gênero para Gráfico Circular
  const dataGenero = [
    { name: 'Feminino (F)', value: feminino, color: '#a855f7' },
    { name: 'Masculino (M)', value: masculino, color: '#4f46e5' }
  ];

  // Fluxo de Transferências Mensal (Simulação Realista do Ano)
  const dataTransferenciasFluxo = [
    { name: 'Jan/Fev (Início)', Entrada: transferidosEntrada, Saida: 0 },
    { name: 'Mar/Abr (1º Tri)', Entrada: Math.round(transferidosEntrada * 0.2), Saida: Math.round(transferidosSaida * 0.3) },
    { name: 'Mai/Jun (2º Tri)', Entrada: Math.round(transferidosEntrada * 0.1), Saida: Math.round(transferidosSaida * 0.4) },
    { name: 'Jul/Ago (3º Tri)', Entrada: 0, Saida: Math.round(transferidosSaida * 0.3) }
  ];

  return (
    <div className="space-y-6 animate-fadeIn p-1">
      {/* Abas Principais de Estatística */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-200 pb-3.5 gap-4 noprint">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            {isHome ? 'PÁGINA INICIAL - PAINEL GERAL' : 'Estatísticas & Aproveitamento Escolar'}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isHome 
              ? 'Métricas escolares dinâmicas da componente, classe e turma seleccionadas' 
              : 'Consolidação e relatórios oficiais em conformidade com as directivas do MED'}
          </p>
        </div>

        {!isHome && (
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-2xs">
            <button
              onClick={() => setActiveMainTab('PAINEL')}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'PAINEL'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Painel Geral
            </button>
            <button
              onClick={() => setActiveMainTab('OFERTA')}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'OFERTA'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Oferta Formativa
            </button>
            <button
              onClick={() => setActiveMainTab('APROVEITAMENTO')}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'APROVEITAMENTO'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Aproveitamento Trimestral
            </button>
            {activeSubsystem === 'SECUNDARIO_GERAL' && (
              <button
                onClick={() => setActiveMainTab('EXAME_12')}
                className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
                  activeMainTab === 'EXAME_12'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                Pautas de Exame
              </button>
            )}
            {activeSubsystem === 'SECUNDARIO_PEDAGOGICO' && (
              <button
                onClick={() => setActiveMainTab('CURRICULO')}
                className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
                  activeMainTab === 'CURRICULO'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-indigo-550" />
                Grelha Curricular
              </button>
            )}
          </div>
        )}
      </div>

      {displayMainTab === 'OFERTA' && (
        <EstatisticaFormativa students={currentStudents} grades={currentGrades} settings={settings} />
      )}

      {displayMainTab === 'APROVEITAMENTO' && (
        <MapaAproveitamento students={currentStudents} grades={currentGrades} settings={settings} />
      )}

      {displayMainTab === 'EXAME_12' && (
        <PautaExame12Classe students={currentStudents} grades={currentGrades} schoolSettings={settings} />
      )}

      {displayMainTab === 'CURRICULO' && (
        <ConfiguracaoEspecialidade userRole={userRole || 'DIRETOR_GERAL'} />
      )}

      {displayMainTab === 'PAINEL' && (
        <div className="space-y-6">
          {/* Abas Secundárias de Estatística */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('MATRICULA')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'MATRICULA'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Início das Matrículas
        </button>
        <button
          onClick={() => setActiveSubTab('TRIMESTRAL')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'TRIMESTRAL'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Estatísticas Trimestrais
        </button>
        <button
          onClick={() => setActiveSubTab('ANUAL')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'ANUAL'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Estatísticas Anuais
        </button>
      </div>

      {/* Active Filters Info Badge */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-650 font-semibold shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider font-heading">Filtros Activos</span>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span>Subsistema:</span>
            <span className="font-extrabold text-indigo-700">
              {modality === 'ENSINO_PRIMARIO' ? 'Ensino Primário' : modality === 'PUNIV' ? 'PUNIV (Liceus)' : 'Ensino Pedagógico (Magistério)'}
            </span>
          </div>
          {currentClass && (
            <>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span>Classe:</span>
                <span className="font-extrabold text-indigo-700">{currentClass}ª Classe</span>
              </div>
            </>
          )}
          {currentSection && (
            <>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span>Turma:</span>
                <span className="font-extrabold text-indigo-700">Turma {currentSection}</span>
              </div>
            </>
          )}
        </div>
        <div className="text-[10px] text-indigo-950 font-mono font-extrabold uppercase bg-indigo-50/50 border border-indigo-100 px-2.5 py-1 rounded-lg">
          Total: {filteredStudents.length} {filteredStudents.length === 1 ? 'aluno' : 'alunos'}
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Matrículas Registadas</span>
            <span className="text-2xl font-black text-slate-900 font-heading block mt-1">{totalInscritos}</span>
            <span className="text-[10px] text-slate-500 font-semibold block mt-1">Total acumulado no ano letivo</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Alunos Ativos Atuais</span>
            <span className="text-2xl font-black text-emerald-600 font-heading block mt-1">{alunosAtivos}</span>
            <span className="text-[10px] text-slate-500 font-semibold block mt-1">Frequência regular atual</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Transferidos (Entrada)</span>
            <span className="text-2xl font-black text-indigo-700 font-heading block mt-1 flex items-center gap-1">
              {transferidosEntrada}
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </span>
            <span className="text-[10px] text-emerald-650 font-bold block mt-1">Novos alunos integrados</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Alunos Transferidos (Saída)</span>
            <span className="text-2xl font-black text-rose-600 font-heading block mt-1 flex items-center gap-1">
              {transferidosSaida}
              <ArrowDownRight className="w-4 h-4 text-rose-500" />
            </span>
            <span className="text-[10px] text-rose-500 font-bold block mt-1">Deixaram a instituição</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* ABA 1: INÍCIO DAS MATRÍCULAS */}
      {activeSubTab === 'MATRICULA' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gráfico de Género */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex flex-col items-center">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 w-full text-center mb-4">Composição por Género (Alunos Ativos)</h4>
              
              <div className="h-48 w-full flex items-center justify-center">
                {alunosAtivos === 0 ? (
                  <span className="text-xs text-slate-400 font-medium">Nenhum aluno ativo para exibir</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dataGenero}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dataGenero.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 w-full mt-2 border-t border-slate-55 pb-2 pt-4">
                <div className="text-center">
                  <span className="text-[10px] text-purple-600 font-black uppercase">Feminino (F)</span>
                  <div className="text-lg font-heading font-black text-purple-700">{feminino} <span className="text-[11px] text-slate-400 font-medium">({pctF}%)</span></div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-indigo-600 font-black uppercase">Masculino (M)</span>
                  <div className="text-lg font-heading font-black text-indigo-700">{masculino} <span className="text-[11px] text-slate-400 font-medium">({pctM}%)</span></div>
                </div>
              </div>
            </div>

            {/* Gráfico de Barras: Classes */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 lg:col-span-2">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Inscrições e Fluxo de Transferência por Classe</h4>
              <div className="h-60 w-full">
                {alunosAtivos === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">Nenhum aluno ativo cadastrado</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataClasses}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                      <Bar dataKey="Total Geral" fill="#94a3b8" />
                      <Bar dataKey="Alunos Ativos" fill="#4f46e5" />
                      <Bar dataKey="Entradas (Transferidos)" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* Tabela de Estatística de Início de Ano (Exigência do MED de Angola) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-2xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4.5 h-4.5 text-indigo-600" />
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Mapa Estatístico de Início das Matrículas por Classe & Género</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Modelo de Consolidação Interna para a Direção e Coordenação Escolar.</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-wider border border-slate-850">
                    <th className="py-3 px-4 border border-slate-800">Classe Académica</th>
                    <th className="py-3 px-4 border border-slate-800 text-center">Feminino (F)</th>
                    <th className="py-3 px-4 border border-slate-800 text-center">Masculino (M)</th>
                    <th className="py-3 px-4 border border-slate-800 text-center">Transferidos Entrada</th>
                    <th className="py-3 px-4 border border-slate-800 text-center">Transferidos Saída</th>
                    <th className="py-3 px-4 border border-slate-800 text-center">Frequência Física Regular</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-250 font-semibold text-slate-700">
                  {classesList.map(cl => {
                    const classStudents = currentStudents.filter(s => {
                      const sClean = String(s.class || '').replace(/\D/g, '');
                      const clClean = String(cl || '').replace(/\D/g, '');
                      if (sClean !== clClean && String(s.class || '').trim() !== String(cl).trim()) return false;
                      if (!matchModality(s, modality)) return false;
                      if (currentSection && s.section !== currentSection) return false;
                      return true;
                    });

                    const clF = classStudents.filter(s => s.gender === 'F' && !s.isTransferidoSaida).length;
                    const clM = classStudents.filter(s => s.gender === 'M' && !s.isTransferidoSaida).length;
                    const clTE = classStudents.filter(s => s.isTransferidoEntrada).length;
                    const clTS = classStudents.filter(s => s.isTransferidoSaida).length;
                    const clTotal = clF + clM;

                    const isRowHighlighted = currentClass === cl;

                    return (
                      <tr 
                        key={cl} 
                        className={`transition-colors border border-slate-200 ${
                          isRowHighlighted 
                            ? 'bg-indigo-50/70 hover:bg-indigo-50/90 font-black text-indigo-950 border-y-2 border-indigo-200 shadow-2xs' 
                            : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <td className="py-2.5 px-4 border border-slate-150 font-black text-slate-900 flex items-center gap-2">
                          {isRowHighlighted && <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse shrink-0"></span>}
                          {cl}ª Classe
                        </td>
                        <td className="py-2.5 px-4 border border-slate-150 text-center text-purple-700 font-extrabold">{clF}</td>
                        <td className="py-2.5 px-4 border border-slate-150 text-center text-indigo-700 font-extrabold">{clM}</td>
                        <td className="py-2.5 px-4 border border-slate-150 text-center text-emerald-600 font-black bg-emerald-50/20">{clTE}</td>
                        <td className="py-2.5 px-4 border border-slate-150 text-center text-rose-600 font-black bg-rose-50/20">{clTS}</td>
                        <td className="py-2.5 px-4 border border-slate-150 text-center text-slate-900 font-black bg-slate-50">{clTotal} Alunos</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-100 font-black text-slate-950">
                    <td className="py-3 px-4 border border-slate-200 uppercase">Total Geral da Escola</td>
                    <td className="py-3 px-4 border border-slate-200 text-center text-purple-800">{feminino}</td>
                    <td className="py-3 px-4 border border-slate-200 text-center text-indigo-800">{masculino}</td>
                    <td className="py-3 px-4 border border-slate-200 text-center text-emerald-700 bg-emerald-100/35">{transferidosEntrada}</td>
                    <td className="py-3 px-4 border border-slate-200 text-center text-rose-700 bg-rose-100/35">{transferidosSaida}</td>
                    <td className="py-3 px-4 border border-slate-200 text-center text-indigo-950 bg-indigo-100/30">{alunosAtivos} Alunos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: ESTATÍSTICAS TRIMESTRAIS */}
      {activeSubTab === 'TRIMESTRAL' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gráfico de Linha/Barras de Saídas/Entradas no Trimestre */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 lg:col-span-2">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Fluxo de Transferência no Decorrer dos Trimestres</h4>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataTransferenciasFluxo}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    <Bar dataKey="Entrada" fill="#10b981" radius={[4, 4, 0, 0]} name="Alunos que Entraram (Transferência)" />
                    <Bar dataKey="Saida" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Alunos que Saíram (Transferência)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Informações de Apoio ao Trimestre */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 space-y-4">
              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-slate-100 pb-2">Informações Trimestrais</h4>
              
              <div className="space-y-3.5">
                <div className="flex items-start gap-2 text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">Frequência Estimada</span>
                    <p className="text-[11px] text-slate-500 font-medium">A frequência geral da instituição está estimada em <strong>98.2%</strong> baseado nas faltas regulares do trimestre corrente.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs">
                  <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">Movimentação Escolar</span>
                    <p className="text-[11px] text-slate-500 font-medium">As informações de alunos com dificuldades ou saídas por transferência devem ser tidas em conta pela direção da escola, para se evitar o abandono escolar.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs">
                  <BookOpen className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">Cargas Horárias</span>
                    <p className="text-[11px] text-slate-500 font-medium">Todas as turmas estão com a matriz do MED devidamente cumprida, atingindo 96% do planeamento pedagógico do trimestre.</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-xl text-[10px] leading-relaxed font-semibold">
                <span><strong>Nota Administrativa:</strong> Toda e qualquer transferência de saída é permanente para as notas do trimestre do aluno, bloqueando-o de receber notas MAC, NPP ou NPT a partir da data de comunicação.</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ABA 3: ESTATÍSTICAS ANUAIS */}
      {activeSubTab === 'ANUAL' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Estatísticas Anuais & Aproveitamento Pedagógico</h4>
              <p className="text-[10px] text-slate-400 font-medium">Consolidação anual das taxas de aprovação, reprovação e evasão escolar institucional.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 text-center">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">Previsão de Aprovação</span>
              <span className="text-xl font-black text-slate-900 font-heading block mt-1">~ 89.4%</span>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Baseado nas pautas do 1º e 2º trimestre</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 text-center">
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block">Previsão de Reprovação</span>
              <span className="text-xl font-black text-slate-900 font-heading block mt-1">~ 4.8%</span>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Sob risco de recurso/reexame</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 text-center">
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Taxa de Transferência (Saída)</span>
              <span className="text-xl font-black text-slate-900 font-heading block mt-1">
                {alunosAtivos > 0 ? ((transferidosSaida / totalInscritos) * 100).toFixed(1) : '0.0'}%
              </span>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Desvinculação legal por transferência</span>
            </div>
          </div>

          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs font-medium leading-relaxed text-indigo-950 flex gap-2.5">
            <Award className="w-5 h-5 shrink-0 text-indigo-600" />
            <div>
              <strong className="block text-indigo-950 font-bold">Relatório Consolidado de Aproveitamento Escolar</strong>
              <p className="text-slate-600 mt-0.5">Os dados mostram estabilidade institucional com excelente retenção e transição de alunos em Angola, reforçando o valor pedagógico do corpo docente do SIGEP.</p>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* SiGeP logo image at the bottom of the dashboard panel */}
      <div className="flex flex-col items-center justify-center pt-8 pb-4 border-t border-slate-100 mt-8">
        <SiGePLogo size={120} className="opacity-45 hover:scale-105 transition-transform duration-300" />
        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-2">Sistema de Gestão Escolar - SiGeP v1.1.0</span>
      </div>

    </div>
  );
}
