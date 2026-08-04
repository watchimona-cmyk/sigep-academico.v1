/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StudentFinance } from '../types';
import { X, Calendar as CalendarIcon, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, Save, RotateCcw, Lock, Clock, ShieldCheck } from 'lucide-react';
import { getTrimesterForMonthIndex, getTrimesterName } from '../utils/reportPdfGenerator';

interface CalendarioFaltasModalProps {
  student: StudentFinance;
  onClose: () => void;
  onSave: (updatedStudent: StudentFinance) => void;
  canEdit?: boolean;
  allowJustify?: boolean;
}

const MESES_CONFIG = [
  { index: 0, name: 'Setembro', monthNumber: 9, year: 2025, days: 30 },
  { index: 1, name: 'Outubro', monthNumber: 10, year: 2025, days: 31 },
  { index: 2, name: 'Novembro', monthNumber: 11, year: 2025, days: 30 },
  { index: 3, name: 'Dezembro', monthNumber: 12, year: 2025, days: 31 },
  { index: 4, name: 'Janeiro', monthNumber: 1, year: 2026, days: 31 },
  { index: 5, name: 'Fevereiro', monthNumber: 2, year: 2026, days: 28 },
  { index: 6, name: 'Março', monthNumber: 3, year: 2026, days: 31 },
  { index: 7, name: 'Abril', monthNumber: 4, year: 2026, days: 30 },
  { index: 8, name: 'Maio', monthNumber: 5, year: 2026, days: 31 },
  { index: 9, name: 'Junho', monthNumber: 6, year: 2026, days: 30 },
  { index: 10, name: 'Julho', monthNumber: 7, year: 2026, days: 31 }
];

const DIAS_SEMANA_ABR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function CalendarioFaltasModal({
  student,
  onClose,
  onSave,
  canEdit = true,
  allowJustify = true
}: CalendarioFaltasModalProps) {
  // Obter índice do mês actual do ano lectivo
  const getCurrentAcademicMonthIndex = () => {
    const now = new Date();
    const m = now.getMonth() + 1; // 1-12
    const matchIdx = MESES_CONFIG.findIndex(mc => mc.monthNumber === m);
    return matchIdx >= 0 ? matchIdx : 0;
  };

  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(() => getCurrentAcademicMonthIndex());
  const [savedAttendanceDates, setSavedAttendanceDates] = useState<{ [dateStr: string]: 'NORMAL' | 'INJUSTIFICADA' | 'JUSTIFICADA' }>(() => {
    return student.attendanceDates ? { ...student.attendanceDates } : {};
  });
  const [attendanceMap, setAttendanceMap] = useState<{ [dateStr: string]: 'NORMAL' | 'INJUSTIFICADA' | 'JUSTIFICADA' }>(() => {
    return student.attendanceDates ? { ...student.attendanceDates } : {};
  });

  const [quickReason, setQuickReason] = useState<string>('');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string>('');
  const [warningNotice, setWarningNotice] = useState<string>('');
  const [isSavedLocked, setIsSavedLocked] = useState<boolean>(false);

  const currentMonthObj = MESES_CONFIG[selectedMonthIndex];
  const currentTrimester = getTrimesterForMonthIndex(selectedMonthIndex);

  // Helper to format date key YYYY-MM-DD
  const getDateKey = (year: number, monthNum: number, dayNum: number) => {
    const mStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
    const dStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    return `${year}-${mStr}-${dStr}`;
  };

  // Day click handler with protection against duplicate absence marking and accidental clicks after saving
  const handleDayClick = (dayNum: number) => {
    if (isSavedLocked) {
      setWarningNotice("Lançamento já gravado e bloqueado! Não é possível fazer novos cliques acidentais no calendário.");
      return;
    }
    if (!canEdit) return;

    const dateKey = getDateKey(currentMonthObj.year, currentMonthObj.monthNumber, dayNum);
    const savedStatus = savedAttendanceDates[dateKey];
    const currentStatus = attendanceMap[dateKey];

    // Se o registo for de Falta Justificada (Cadeado Verde da Secretaria)
    if (currentStatus === 'JUSTIFICADA' || savedStatus === 'JUSTIFICADA') {
      if (!allowJustify) {
        setWarningNotice("Falta Justificada pela Secretaria! Registada com CADEADO VERDE 🔒. Este registo está validado e bloqueado para alterações no perfil de Coordenação.");
        return;
      }
    }

    // Registo já gravado anteriormente no perfil de coordenação
    if (savedStatus === 'INJUSTIFICADA' || savedStatus === 'JUSTIFICADA') {
      if (!allowJustify) {
        setWarningNotice("Registo já gravado com CADEADO DE BLOQUEIO 🔒! No perfil de Coordenação não é possível apagar ou alterar faltas já registadas. A justificação é exclusiva da Secretaria.");
        return;
      } else {
        // Secretaria pode converter de INJUSTIFICADA -> JUSTIFICADA
        if (currentStatus === 'INJUSTIFICADA') {
          const updated = { ...attendanceMap, [dateKey]: 'JUSTIFICADA' as const };
          setAttendanceMap(updated);
          setWarningNotice('');
          return;
        }
        if (currentStatus === 'JUSTIFICADA') {
          setWarningNotice("Falta já justificada e gravada no sistema.");
          return;
        }
      }
    }

    // Lançamento em rascunho para a sessão atual
    const updated = { ...attendanceMap };
    if (!currentStatus) {
      updated[dateKey] = 'INJUSTIFICADA';
    } else if (currentStatus === 'INJUSTIFICADA') {
      if (allowJustify) {
        updated[dateKey] = 'JUSTIFICADA';
      } else {
        delete updated[dateKey]; // Permite desmarcar antes de salvar
      }
    } else {
      delete updated[dateKey];
    }

    setAttendanceMap(updated);
    setWarningNotice('');
  };

  // Direct toggle on click
  const setDayStatus = (dayNum: number, status: 'NORMAL' | 'INJUSTIFICADA' | 'JUSTIFICADA') => {
    if (!canEdit) return;
    const dateKey = getDateKey(currentMonthObj.year, currentMonthObj.monthNumber, dayNum);
    const currentStatus = attendanceMap[dateKey];

    if (!allowJustify) {
      if (currentStatus === 'INJUSTIFICADA' || currentStatus === 'JUSTIFICADA') {
        setWarningNotice("Registo já lançado! Não é possível alterar nem apagar faltas registadas no perfil de Coordenação.");
        return;
      }
      if (status === 'JUSTIFICADA') {
        setWarningNotice("Apenas a Secretaria tem autorização para justificar faltas.");
        return;
      }
    }

    const updated = { ...attendanceMap };
    if (status === 'NORMAL') {
      delete updated[dateKey];
    } else {
      updated[dateKey] = status;
    }
    setAttendanceMap(updated);
    setWarningNotice('');
  };

  // Compute total counts
  const totalInjustificadas = Object.values(attendanceMap).filter(v => v === 'INJUSTIFICADA').length;
  const totalJustificadas = Object.values(attendanceMap).filter(v => v === 'JUSTIFICADA').length;

  // Monthly counts for selected month
  const currentMonthInjust = Object.entries(attendanceMap).filter(([k, v]) => {
    return k.startsWith(`${currentMonthObj.year}-${currentMonthObj.monthNumber < 10 ? '0' + currentMonthObj.monthNumber : currentMonthObj.monthNumber}`) && v === 'INJUSTIFICADA';
  }).length;

  const currentMonthJust = Object.entries(attendanceMap).filter(([k, v]) => {
    return k.startsWith(`${currentMonthObj.year}-${currentMonthObj.monthNumber < 10 ? '0' + currentMonthObj.monthNumber : currentMonthObj.monthNumber}`) && v === 'JUSTIFICADA';
  }).length;

  // Compute first day of week for calendar grid offset
  const firstDayOfWeek = new Date(currentMonthObj.year, currentMonthObj.monthNumber - 1, 1).getDay();

  const handleSaveCalendar = () => {
    if (isSavedLocked) return;

    const newObservacoes = `${student.observacoes || ''}\n[${new Date().toLocaleDateString('pt-AO')}] Atualização no Calendário Mensal: ${totalInjustificadas} faltas injustificadas e ${totalJustificadas} justificadas. ${quickReason ? 'Motivo: ' + quickReason : ''}`.trim();

    const updatedStudent: StudentFinance = {
      ...student,
      attendanceDates: attendanceMap,
      faltasInjustificadas: totalInjustificadas,
      faltasJustificadas: totalJustificadas,
      observacoes: newObservacoes
    };

    setSavedAttendanceDates({ ...attendanceMap });
    setIsSavedLocked(true);
    onSave(updatedStudent);
    setSavedSuccessMsg('Lançamentos de assiduidade gravados e bloqueados com sucesso! Cliques acidentais estão desativados.');
    setTimeout(() => {
      setSavedSuccessMsg('');
      onClose();
    }, 1600);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto select-none animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 relative text-slate-800">
        
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-slate-900 font-extrabold text-base uppercase tracking-tight">
                Lançamento & Registo Mensal de Faltas
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Aluno: <strong className="text-indigo-700">{student.name}</strong> (ID: {student.id}) • {student.class}ª Classe - Turma {student.section}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Histórico Ativo por Mês - Visão de Assiduidade (Mês Actual e Anteriores) */}
        <div className="bg-slate-100/80 border border-slate-200/90 p-3.5 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
            <span className="flex items-center gap-1.5 uppercase text-[11px] font-black text-slate-600">
              <Clock className="w-4 h-4 text-indigo-600" /> Histórico de Assiduidade por Mês
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Clique num mês para visualizar os dias</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {MESES_CONFIG.map((mc, idx) => {
              const monthPrefix = `${mc.year}-${mc.monthNumber < 10 ? '0' + mc.monthNumber : mc.monthNumber}`;
              let injCount = 0;
              let justCount = 0;
              Object.entries(attendanceMap).forEach(([dateStr, st]) => {
                if (dateStr.startsWith(monthPrefix)) {
                  if (st === 'INJUSTIFICADA') injCount++;
                  if (st === 'JUSTIFICADA') justCount++;
                }
              });

              const isSelected = selectedMonthIndex === idx;
              const hasAbsences = injCount > 0 || justCount > 0;

              return (
                <button
                  key={mc.index}
                  type="button"
                  onClick={() => setSelectedMonthIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm scale-105'
                      : hasAbsences
                      ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{mc.name.substring(0, 3)}</span>
                  {injCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${isSelected ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'}`}>
                      {injCount}
                    </span>
                  )}
                  {justCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                      {justCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Month & Trimester Navigation */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedMonthIndex === 0}
              onClick={() => setSelectedMonthIndex(prev => Math.max(0, prev - 1))}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-slate-900 min-w-[140px] text-center uppercase tracking-wide">
              {currentMonthObj.name} {currentMonthObj.year}
            </span>
            <button
              type="button"
              disabled={selectedMonthIndex === MESES_CONFIG.length - 1}
              onClick={() => setSelectedMonthIndex(prev => Math.min(MESES_CONFIG.length - 1, prev + 1))}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Trimestre:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
              currentTrimester === 1 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
              currentTrimester === 2 ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              {getTrimesterName(currentTrimester)}
            </span>
          </div>
        </div>

        {/* Warning Notice Box */}
        {warningNotice && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3.5 rounded-2xl flex items-center justify-between font-bold shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{warningNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setWarningNotice('')}
              className="text-amber-800 hover:text-amber-950 font-black text-[11px] uppercase tracking-wider underline cursor-pointer shrink-0 ml-2"
            >
              Entendido
            </button>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="space-y-3">
          <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between flex-wrap gap-2">
            <span>Modo de Seleção: <strong className="text-slate-800">{allowJustify ? 'Livre ➔ Falta Injustificada ➔ Falta Justificada ➔ Limpar' : 'Livre ➔ Lançar Falta Injustificada'}</strong></span>
            {!allowJustify ? (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" />
                🔒 Coordenação: Faltas Lançadas (Cadeado Vermelho) | Faltas Justificadas pela Secretaria (Cadeado Verde)
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">* Dias marcados como 'Justificada' ficam salvos com cadeado verde.</span>
            )}
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-black text-[11px] text-slate-400 uppercase py-1 border-b border-slate-100">
            {DIAS_SEMANA_ABR.map(d => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty slots before day 1 */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-12 bg-slate-50/40 rounded-xl border border-transparent"></div>
            ))}

            {/* Actual month days */}
            {Array.from({ length: currentMonthObj.days }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = getDateKey(currentMonthObj.year, currentMonthObj.monthNumber, dayNum);
              const status = attendanceMap[dateKey];
              const isWeekend = (firstDayOfWeek + i) % 7 === 0 || (firstDayOfWeek + i) % 7 === 6;
              const isLockedForCoord = !allowJustify && (status === 'INJUSTIFICADA' || status === 'JUSTIFICADA');

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  onClick={() => handleDayClick(dayNum)}
                  title={
                    status === 'JUSTIFICADA' 
                      ? "Falta Justificada pela Secretaria (Cadeado Verde)" 
                      : status === 'INJUSTIFICADA' 
                      ? "Falta Injustificada Registada (Cadeado de Bloqueio)" 
                      : undefined
                  }
                  className={`h-12 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-between p-1 relative group ${
                    status === 'INJUSTIFICADA'
                      ? 'bg-rose-500 border-rose-600 text-white shadow-md shadow-rose-500/20 font-black'
                      : status === 'JUSTIFICADA'
                      ? 'bg-emerald-600 border-emerald-700 text-white shadow-md shadow-emerald-600/20 font-black'
                      : isWeekend
                      ? 'bg-slate-100/60 border-slate-200 text-slate-400 hover:bg-slate-200/60'
                      : 'bg-white border-slate-200 text-slate-800 hover:bg-indigo-50 hover:border-indigo-300 font-bold'
                  }`}
                >
                  <div className="w-full flex items-center justify-between px-0.5">
                    <span className="text-xs font-mono">{dayNum}</span>
                    {status === 'JUSTIFICADA' && (
                      <Lock className="w-3 h-3 text-emerald-200 fill-emerald-200/20" title="Justificada na Secretaria - Cadeado Verde" />
                    )}
                    {status === 'INJUSTIFICADA' && (
                      <Lock className="w-3 h-3 text-white/90" title="Falta Injustificada - Bloqueada" />
                    )}
                  </div>
                  
                  {status === 'INJUSTIFICADA' && (
                    <span className="text-[8px] uppercase tracking-tighter font-black bg-rose-800/80 text-white px-1 py-0.5 rounded flex items-center gap-0.5">
                      <Lock className="w-2 h-2 text-rose-200" /> Falta
                    </span>
                  )}
                  {status === 'JUSTIFICADA' && (
                    <span className="text-[8px] uppercase tracking-tighter font-black bg-emerald-800/80 text-emerald-100 px-1 py-0.5 rounded flex items-center gap-0.5">
                      <Lock className="w-2 h-2 text-emerald-300" /> Justif.
                    </span>
                  )}
                  {!status && !isWeekend && (
                    <span className="text-[8px] text-slate-300 group-hover:text-indigo-500">
                      Ok
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center">
            <span className="block text-[9px] font-mono font-black text-slate-400 uppercase">Faltas Injust. Mês</span>
            <span className="text-lg font-extrabold text-rose-600">{currentMonthInjust}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center">
            <span className="block text-[9px] font-mono font-black text-slate-400 uppercase">Faltas Justif. Mês</span>
            <span className="text-lg font-extrabold text-emerald-600">{currentMonthJust}</span>
          </div>

          <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl text-center">
            <span className="block text-[9px] font-mono font-black text-rose-500 uppercase">Acumulado Injust. (Ano)</span>
            <span className="text-lg font-extrabold text-rose-700">{totalInjustificadas}</span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-center">
            <span className="block text-[9px] font-mono font-black text-emerald-600 uppercase">Acumulado Justif. (Ano)</span>
            <span className="text-lg font-extrabold text-emerald-700">{totalJustificadas}</span>
          </div>
        </div>

        {/* Quick Observation Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Observação / Justificação do Lançamento (Opcional):
          </label>
          <input
            type="text"
            value={quickReason}
            onChange={(e) => setQuickReason(e.target.value)}
            placeholder="Ex: Apresentou atestado médico / Falta por indisposição de saúde"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
          />
        </div>

        {savedSuccessMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs p-3 rounded-xl flex items-center gap-2 font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{savedSuccessMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleSaveCalendar}
            disabled={!canEdit || isSavedLocked}
            className={`flex-1 font-extrabold text-xs uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
              isSavedLocked 
                ? 'bg-emerald-600 text-white cursor-not-allowed shadow-emerald-600/10' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-indigo-600/10'
            }`}
          >
            {isSavedLocked ? (
              <>
                <Lock className="w-4 h-4 text-emerald-200" />
                <span>🔒 Lançamento Gravado & Bloqueado</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Lançamentos do Calendário</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer border border-slate-200"
          >
            Sair
          </button>
        </div>

      </div>
    </div>
  );
}
