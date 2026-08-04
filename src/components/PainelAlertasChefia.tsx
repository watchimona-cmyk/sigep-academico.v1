import React, { useState } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  Users, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Search, 
  BellRing, 
  ShieldAlert, 
  Clock, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  UserCheck,
  CalendarCheck
} from 'lucide-react';
import { Staff, StudentFinance } from '../types';
import { generateRelatorioAlunosCriticosPdf } from '../utils/reportPdfGenerator';

interface PainelAlertasChefiaProps {
  loggedInStaff: Staff;
  staffList?: Staff[];
  financeRecords: StudentFinance[];
  schoolSettings?: any;
  onNavigateToFinance?: () => void;
  onNavigateToStudent360?: (studentId: string) => void;
}

export default function PainelAlertasChefia({
  loggedInStaff,
  staffList = [],
  financeRecords = [],
  schoolSettings,
  onNavigateToFinance,
  onNavigateToStudent360
}: PainelAlertasChefiaProps) {
  const role = loggedInStaff?.role;
  const isLeadership = ['DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO'].includes(role);

  if (!isLeadership) return null;

  // Selected trimester view mode (1, 2, or 3)
  const currentAcademicTrimester = schoolSettings?.trimesterIII_Status === 'ABERTO' ? 3 : schoolSettings?.trimesterII_Status === 'ABERTO' ? 2 : 1;
  const [activeTrimesterTab, setActiveTrimesterTab] = useState<number>(currentAcademicTrimester);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingSentSuccess, setMeetingSentSuccess] = useState(false);

  // Month Names mapping
  const monthNames = [
    'Setembro', 'Outubro', 'Novembro', 'Dezembro', 'Janeiro', 
    'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho'
  ];

  // Helper to check critical student status
  const getStudentCriticalInfo = (student: StudentFinance) => {
    const totalDivida = student.totalDivida || 0;
    const faltasInjustificadas = student.faltasInjustificadas || 0;
    
    // Check unpaid months in 1st Trimestre (indices 0, 1, 2)
    const unpaidTrim1 = [0, 1, 2].filter(idx => student.mesesPagos && !student.mesesPagos[idx]).map(idx => monthNames[idx]);
    // Check unpaid months in 2nd Trimestre (indices 3, 4, 5)
    const unpaidTrim2 = [3, 4, 5].filter(idx => student.mesesPagos && !student.mesesPagos[idx]).map(idx => monthNames[idx]);
    // Check unpaid months in 3rd Trimestre (indices 6, 7, 8, 9, 10)
    const unpaidTrim3 = [6, 7, 8, 9, 10].filter(idx => student.mesesPagos && !student.mesesPagos[idx]).map(idx => monthNames[idx]);

    const isPending = totalDivida > 0 || faltasInjustificadas > 0;
    const isCriticalForExams = (totalDivida > 0) || (faltasInjustificadas >= 3);

    return {
      totalDivida,
      faltasInjustificadas,
      unpaidTrim1,
      unpaidTrim2,
      unpaidTrim3,
      isPending,
      isCriticalForExams
    };
  };

  // Filter students with pendencies
  const criticalStudents = financeRecords.map(s => ({
    student: s,
    info: getStudentCriticalInfo(s)
  })).filter(item => item.info.isPending);

  // Se não existirem alunos críticos com pendências, o aviso entra em repouso e não é exibido
  if (criticalStudents.length === 0) return null;

  // Filtered by search & class
  const filteredCritical = criticalStudents.filter(item => {
    const matchesSearch = item.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.student.class || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.student.section || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClassFilter === 'ALL' || item.student.class?.toString().replace('ª', '').trim() === selectedClassFilter;
    return matchesSearch && matchesClass;
  });

  // Unique Classes list
  const availableClasses = Array.from(new Set(financeRecords.map(s => s.class?.toString().replace('ª', '').trim()))).filter(Boolean).sort();

  // Total summary metrics
  const totalCriticalCount = criticalStudents.length;
  const totalAccumulatedDebt = criticalStudents.reduce((acc, curr) => acc + curr.info.totalDivida, 0);
  const totalUnexcusedAbsences = criticalStudents.reduce((acc, curr) => acc + curr.info.faltasInjustificadas, 0);

  // Staff names for report PDF
  const directorGeral = staffList.find(s => s.role === 'DIRECTOR_GERAL')?.name || schoolSettings?.directorName || 'Director Geral';
  const subdirectorPedagogico = staffList.find(s => s.role === 'SUB_DIRECTOR_PEDAGOGICO')?.name || schoolSettings?.subdirectorName || 'Subdirector Pedagógico';
  const subdirectorAdmin = staffList.find(s => s.role === 'SUB_DIRECTOR_ADMINISTRATIVO')?.name || 'Subdirector Administrativo';

  const handleExportPdf = () => {
    generateRelatorioAlunosCriticosPdf(
      financeRecords,
      schoolSettings,
      activeTrimesterTab,
      subdirectorAdmin,
      subdirectorPedagogico,
      directorGeral
    );
  };

  const handleTriggerMeeting = () => {
    setMeetingSentSuccess(true);
    setTimeout(() => {
      setMeetingSentSuccess(false);
      setShowMeetingModal(false);
    }, 2500);
  };

  return (
    <div className="w-full space-y-4 my-4">
      {/* HEADER CARD DA CHEFIA */}
      <div className={`p-5 rounded-2xl border transition-all shadow-sm ${
        activeTrimesterTab === 3 
          ? 'bg-gradient-to-r from-red-950 via-slate-900 to-rose-950 border-red-800/60 text-white' 
          : 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 border-amber-800/60 text-white'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-sm ${
                activeTrimesterTab === 3 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : 'bg-amber-500 text-slate-950 font-bold'
              }`}>
                <ShieldAlert className="w-3.5 h-3.5" />
                {activeTrimesterTab === 3 ? 'FASE FINAL - PROVAS DE EXAME' : `TRANSIÇÃO DE TRIMESTRE (${activeTrimesterTab}º TRIMESTRE)`}
              </span>

              <span className="bg-white/10 backdrop-blur-md text-white/90 text-xs px-2.5 py-0.5 rounded-full font-mono font-medium">
                Cargo: {role === 'DIRECTOR_GERAL' ? 'Director Geral' : role === 'SUB_DIRECTOR_PEDAGOGICO' ? 'Subdirector Pedagógico' : 'Subdirector Administrativo'}
              </span>
            </div>

            <h2 className="text-xl lg:text-2xl font-black tracking-tight flex items-center gap-2">
              {role === 'DIRECTOR_GERAL' && "📢 Convocatória Urgente: Reunião da Direção sobre Alunos Críticos"}
              {role === 'SUB_DIRECTOR_PEDAGOGICO' && "⚠️ Condicionamento Pedagógico & Provas Finais / Exames"}
              {role === 'SUB_DIRECTOR_ADMINISTRATIVO' && "🚨 Aviso Crítico de Transição: Cobranças & Regularização de Faltas"}
            </h2>

            <p className="text-xs lg:text-sm text-slate-300 max-w-4xl leading-relaxed">
              {role === 'DIRECTOR_GERAL' && (
                "Solicita-se ao Director Geral que convoque uma reunião urgente com os seus colaboradores (Subdirector Pedagógico, Subdirector Administrativo e Secretaria) para analisar o Histórico Geral dos estudantes com dívidas de propinas e faltas acumuladas antes da realização das provas finais."
              )}
              {role === 'SUB_DIRECTOR_PEDAGOGICO' && (
                "Atenção: Os estudantes com faltas injustificadas acumuladas e mensalidades pendentes dos trimestres anteriores NÃO ESTÃO EM CONDIÇÕES de realizar as provas finais/exames, podendo ficar condicionados quanto à sua aprovação escolar."
              )}
              {role === 'SUB_DIRECTOR_ADMINISTRATIVO' && (
                "Os estudantes que transitaram de trimestre sem regularizar propinas anteriores ou faltas têm seus históricos financeiros e de assiduidade bloqueados até à liquidação total dos valores devedores."
              )}
            </p>
          </div>

          {/* QUICK CONTROLS & TRIMESTER TOGGLE */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl flex items-center gap-1">
              {[1, 2, 3].map(tNum => (
                <button
                  key={tNum}
                  onClick={() => setActiveTrimesterTab(tNum)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTrimesterTab === tNum
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tNum}º Trimestre
                </button>
              ))}
            </div>

            <button
              onClick={handleExportPdf}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Relatório (PDF)
            </button>

            {role === 'DIRECTOR_GERAL' && (
              <button
                onClick={() => setShowMeetingModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <BellRing className="w-3.5 h-3.5" />
                Convocar Reunião
              </button>
            )}
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-500/20 text-red-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Estudantes Críticos</p>
              <p className="text-lg font-black font-mono">{totalCriticalCount} <span className="text-xs font-normal text-slate-300">alunos</span></p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-300">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Dívida Acumulada</p>
              <p className="text-lg font-black font-mono">{totalAccumulatedDebt.toLocaleString('pt-PT')} <span className="text-xs font-normal text-slate-300">Kz</span></p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Faltas Injustificadas Totais</p>
              <p className="text-lg font-black font-mono">{totalUnexcusedAbsences} <span className="text-xs font-normal text-slate-300">faltas</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por estudante, classe ou turma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-500">Filtrar por Classe:</span>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-700"
          >
            <option value="ALL">Todas as Classes</option>
            {availableClasses.map(cls => (
              <option key={cls} value={cls}>{cls}ª Classe</option>
            ))}
          </select>
        </div>
      </div>

      {/* HISTÓRICO GERAL DE ALUNOS CRÍTICOS (LISTA & TABELA) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-600" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Histórico Detalhado dos Estudantes Críticos ({filteredCritical.length})
            </h3>
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            Exibindo pendências acumuladas do 1º ao {activeTrimesterTab}º Trimestre
          </span>
        </div>

        {filteredCritical.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-800">Nenhum estudante crítico encontrado</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Todos os estudantes cadastrados nesta seleção possuem as suas propinas e assiduidades regularizadas.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCritical.map(({ student, info }) => {
              const isExpanded = expandedStudentId === student.id;

              return (
                <div key={student.id} className="p-4 hover:bg-slate-50/80 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900">{student.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                          {student.class}ª Class. | Turma {student.section}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                          Turno: {student.periodo || 'Manhã'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap text-xs font-semibold">
                        {info.totalDivida > 0 ? (
                          <span className="text-red-600 flex items-center gap-1 font-mono font-extrabold bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            <XCircle className="w-3.5 h-3.5" /> Dívida: {info.totalDivida.toLocaleString('pt-PT')} Kz
                          </span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Propinas em Dia
                          </span>
                        )}

                        {info.faltasInjustificadas > 0 ? (
                          <span className="text-rose-700 flex items-center gap-1 font-mono font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                            <Clock className="w-3.5 h-3.5" /> Faltas Injustificadas: {info.faltasInjustificadas}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">Sem faltas injustificadas</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isExpanded ? 'Ocultar Histórico' : 'Ver Histórico Completo'}
                      </button>

                      {onNavigateToFinance && (role === 'SUB_DIRECTOR_ADMINISTRATIVO' || role === 'DIRECTOR_GERAL') && (
                        <button
                          onClick={onNavigateToFinance}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-xs"
                        >
                          Regularizar <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* EXPANDABLE STUDENT DETAILED HISTORY */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50/90 rounded-xl p-3.5 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* PROPINA BREAKDOWN */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                          <p className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            Histórico de Pagamento de Propinas
                          </p>
                          <p className="text-slate-600">
                            <strong>Status:</strong> {info.totalDivida > 0 ? `Inadimplente (${info.totalDivida.toLocaleString('pt-PT')} Kz em dívida)` : 'Adimplente'}
                          </p>

                          <div>
                            <span className="font-semibold text-slate-700">Meses não liquidados no 1º Trimestre:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {info.unpaidTrim1.length > 0 ? info.unpaidTrim1.map(m => (
                                <span key={m} className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">{m}</span>
                              )) : <span className="text-emerald-600 font-bold text-[10px]">Todos pagos (1º Trim.)</span>}
                            </div>
                          </div>

                          <div>
                            <span className="font-semibold text-slate-700">Meses não liquidados no 2º Trimestre:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {info.unpaidTrim2.length > 0 ? info.unpaidTrim2.map(m => (
                                <span key={m} className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">{m}</span>
                              )) : <span className="text-emerald-600 font-bold text-[10px]">Todos pagos (2º Trim.)</span>}
                            </div>
                          </div>

                          <div>
                            <span className="font-semibold text-slate-700">Meses não liquidados no 3º Trimestre:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {info.unpaidTrim3.length > 0 ? info.unpaidTrim3.map(m => (
                                <span key={m} className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">{m}</span>
                              )) : <span className="text-emerald-600 font-bold text-[10px]">Todos pagos (3º Trim.)</span>}
                            </div>
                          </div>
                        </div>

                        {/* ABSENCES BREAKDOWN */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                          <p className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-rose-500" />
                            Histórico de Assiduidade e Faltas
                          </p>
                          <div className="space-y-1 text-slate-600">
                            <p><strong>Faltas Injustificadas:</strong> <span className="font-bold text-red-600">{info.faltasInjustificadas}</span></p>
                            <p><strong>Faltas Justificadas:</strong> <span className="font-bold text-emerald-600">{student.faltasJustificadas || 0}</span></p>
                            <p><strong>Condição para Exames:</strong> {info.isCriticalForExams ? (
                              <span className="text-red-700 font-black bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                CONDICIONADO DE PROVAS FINAIS
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                EM CONDIÇÕES REGULARES
                              </span>
                            )}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CONVOCAÇÃO DE REUNIÃO DE DIREÇÃO */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Convocar Reunião Urgente de Direção</h3>
                <p className="text-xs text-slate-500">Notificação oficial aos Subdirectores e Chefia de Secretaria</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Ao confirmar esta convocatória, uma mensagem de alta prioridade será transmitida ao <strong>Subdirector Pedagógico</strong>, <strong>Subdirector Administrativo</strong> e <strong>Chefe de Secretaria</strong> com o Relatório Geral de Alunos Críticos para a tomada de decisão antes das provas finais.
            </p>

            {meetingSentSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Convocatória de reunião enviada com sucesso aos colaboradores!
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowMeetingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTriggerMeeting}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md"
                >
                  Confirmar e Enviar Convocatória
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
