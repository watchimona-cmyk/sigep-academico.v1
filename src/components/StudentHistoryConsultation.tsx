/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Student, GradeRow, Staff, SchoolSettings, SubjectType, SUBJECTS, getSubjectAbbreviation } from '../types';
import { 
  Search, 
  Lock, 
  BookOpen, 
  User, 
  GraduationCap, 
  Eye, 
  ShieldCheck, 
  FileText, 
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface StudentHistoryConsultationProps {
  students: Student[];
  grades: GradeRow[];
  loggedInStaff?: Staff | null;
  schoolSettings?: SchoolSettings;
}

export default function StudentHistoryConsultation({
  students = [],
  grades = [],
  loggedInStaff = null,
  schoolSettings
}: StudentHistoryConsultationProps) {

  // Authorized sections and subjects for the professor
  const authorizedSections = useMemo(() => {
    if (loggedInStaff?.sections && loggedInStaff.sections.length > 0) {
      return loggedInStaff.sections;
    }
    // Fallback: extract sections from students
    const set = new Set<string>();
    students.forEach(s => {
      if (s.section) set.add(s.section);
    });
    return Array.from(set).sort();
  }, [loggedInStaff, students]);

  const authorizedSubjects = useMemo(() => {
    if (loggedInStaff?.subjects && loggedInStaff.subjects.length > 0) {
      return loggedInStaff.subjects;
    }
    return SUBJECTS;
  }, [loggedInStaff]);

  // Active filters
  const [selectedSection, setSelectedSection] = useState<string>(authorizedSections[0] || 'ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Keep selectedSection synchronized if current selection is invalid
  React.useEffect(() => {
    if (authorizedSections.length > 0 && selectedSection !== 'ALL' && !authorizedSections.includes(selectedSection)) {
      setSelectedSection(authorizedSections[0]);
    }
  }, [authorizedSections]);

  // Students matching current section and search term
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSection = selectedSection === 'ALL' || s.section === selectedSection;
      const matchSearch = !searchTerm.trim() || 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.guiaTransferenciaEntrada && s.guiaTransferenciaEntrada.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.guiaTransferenciaSaida && s.guiaTransferenciaSaida.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSection && matchSearch;
    });
  }, [students, selectedSection, searchTerm]);

  // Set default student if none selected or selected is no longer in filtered list
  React.useEffect(() => {
    if (filteredStudents.length > 0) {
      const exists = filteredStudents.some(s => s.id === selectedStudentId);
      if (!exists) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    } else {
      setSelectedStudentId('');
    }
  }, [filteredStudents, selectedStudentId]);

  const activeStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // Get subjects to display for active student
  const displaySubjects = useMemo(() => {
    if (selectedSubject !== 'ALL') {
      return [selectedSubject as SubjectType];
    }
    return authorizedSubjects;
  }, [selectedSubject, authorizedSubjects]);

  // Helper to extract student grade for a given subject and trimester
  const getGradeFor = (studentId: string, subject: string, trimester: 'I' | 'II' | 'III') => {
    return grades.find(g => g.studentId === studentId && g.subject === subject && g.trimester === trimester);
  }, formatGrade = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return val.toFixed(1);
  };

  const calculateStudentAverages = (studentId: string, subject: string) => {
    const g1 = getGradeFor(studentId, subject, 'I');
    const g2 = getGradeFor(studentId, subject, 'II');
    const g3 = getGradeFor(studentId, subject, 'III');

    const mt1 = g1?.mt ?? (g1?.mac !== null && g1?.npt !== null && g1?.mac !== undefined && g1?.npt !== undefined ? (g1.mac + g1.npt) / 2 : null);
    const mt2 = g2?.mt ?? (g2?.mac !== null && g2?.npt !== null && g2?.mac !== undefined && g2?.npt !== undefined ? (g2.mac + g2.npt) / 2 : null);
    const mt3 = g3?.mt ?? (g3?.mac !== null && g3?.npt !== null && g3?.mac !== undefined && g3?.npt !== undefined ? (g3.mac + g3.npt) / 2 : null);

    const hasAny = mt1 !== null || mt2 !== null || mt3 !== null;
    const mdf = hasAny ? Math.round(((mt1 ?? 0) + (mt2 ?? 0) + (mt3 ?? 0)) / 3) : null;

    return { g1, g2, g3, mt1, mt2, mt3, mdf };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Header with Read-Only Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-650" />
            <h3 className="font-heading font-extrabold text-slate-900 text-sm sm:text-base">
              Consulta do Histórico Académico dos Alunos
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualização restrita a dados académicos e classificações de notas nas turmas e disciplinas autorizadas (sem acesso a dados biográficos).
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold shrink-0">
          <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>CONSULTA EM MODO LEITURA (SEM PERMISSÃO DE EDIÇÃO)</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
        {/* Filter 1: Turma Autorizada */}
        <div>
          <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Turma Autorizada:
          </label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-indigo-950 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {authorizedSections.length > 1 && <option value="ALL">Todas as Turmas Atribuídas</option>}
            {authorizedSections.map(sec => (
              <option key={sec} value={sec}>Turma {sec}</option>
            ))}
          </select>
        </div>

        {/* Filter 2: Disciplina Autorizada */}
        <div>
          <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Disciplina Autorizada:
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-indigo-950 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Todas as Disciplinas da Docência</option>
            {authorizedSubjects.map(subj => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </select>
        </div>

        {/* Filter 3: Search Student */}
        <div>
          <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Pesquisar Aluno (Nome / ID):
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome do aluno..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Student Selector and Record Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left List: Students in Turma */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 flex flex-col max-h-[420px]">
          <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-200 text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Alunos na Turma ({filteredStudents.length})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Clique para selecionar</span>
          </div>

          <div className="overflow-y-auto space-y-1 pr-1 flex-1">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Nenhum aluno encontrado para os filtros selecionados.
              </div>
            ) : (
              filteredStudents.map(s => {
                const isSelected = s.id === selectedStudentId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white font-bold shadow-xs' 
                        : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-150'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate font-semibold">{s.name}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'} font-mono`}>
                        ID: {s.id} | Turma: {s.section}
                      </div>
                    </div>
                    {isSelected && <Eye className="w-3.5 h-3.5 shrink-0 text-indigo-100" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Student Academic Details */}
        <div className="lg:col-span-2 space-y-4">
          {activeStudent ? (
            <div className="space-y-4">
              
              {/* Student Identification Banner */}
              <div className="bg-indigo-50/70 border border-indigo-150 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-3xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                    {activeStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{activeStudent.name}</h4>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 font-mono">
                      <span>ID: <strong>{activeStudent.id}</strong></span>
                      <span>•</span>
                      <span>Classe: <strong>{activeStudent.class}ª</strong></span>
                      <span>•</span>
                      <span>Turma: <strong>{activeStudent.section}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 font-mono">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-indigo-100/80 text-indigo-800 border border-indigo-200">
                    Dados Académicos Exclusivos
                  </span>
                </div>
              </div>

              {/* Read Only Grade History Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="bg-slate-900 text-slate-200 px-4 py-2.5 flex items-center justify-between text-xs font-bold font-mono">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>HISTÓRICO DE NOTAS TRIMESTRAIS (LEITURA)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {displaySubjects.length} Disciplina(s)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-extrabold uppercase text-[9.5px] tracking-wider font-mono">
                        <th className="py-2.5 px-3">Disciplina</th>
                        <th className="py-2.5 px-2 text-center border-l border-slate-200/80 bg-blue-50/30">I Trim (MT1)</th>
                        <th className="py-2.5 px-2 text-center border-l border-slate-200/80 bg-indigo-50/30">II Trim (MT2)</th>
                        <th className="py-2.5 px-2 text-center border-l border-slate-200/80 bg-purple-50/30">III Trim (MT3)</th>
                        <th className="py-2.5 px-2 text-center border-l border-slate-200/80 bg-emerald-50/50">Média Final (MDF)</th>
                        <th className="py-2.5 px-3 text-center border-l border-slate-200/80">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {displaySubjects.map(subj => {
                        const { g1, g2, g3, mt1, mt2, mt3, mdf } = calculateStudentAverages(activeStudent.id, subj);
                        const isPositive = mdf !== null && mdf >= 9.5;
                        const isNegative = mdf !== null && mdf < 9.5;

                        return (
                          <tr key={subj} className="hover:bg-slate-50/80 transition-colors">
                            {/* Disciplina */}
                            <td className="py-3 px-3 font-bold text-slate-800">
                              <div>{subj}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{getSubjectAbbreviation(subj)}</div>
                            </td>

                            {/* Trim I */}
                            <td className="py-2 px-2 text-center border-l border-slate-200/80 font-mono">
                              <div className="font-bold text-slate-800">{formatGrade(mt1)}</div>
                              <div className="text-[9px] text-slate-400">
                                MAC:{formatGrade(g1?.mac)} | NPT:{formatGrade(g1?.npt)}
                              </div>
                            </td>

                            {/* Trim II */}
                            <td className="py-2 px-2 text-center border-l border-slate-200/80 font-mono">
                              <div className="font-bold text-slate-800">{formatGrade(mt2)}</div>
                              <div className="text-[9px] text-slate-400">
                                MAC:{formatGrade(g2?.mac)} | NPT:{formatGrade(g2?.npt)}
                              </div>
                            </td>

                            {/* Trim III */}
                            <td className="py-2 px-2 text-center border-l border-slate-200/80 font-mono">
                              <div className="font-bold text-slate-800">{formatGrade(mt3)}</div>
                              <div className="text-[9px] text-slate-400">
                                MAC:{formatGrade(g3?.mac)} | NPT:{formatGrade(g3?.npt)}
                              </div>
                            </td>

                            {/* MDF */}
                            <td className="py-2 px-2 text-center border-l border-slate-200/80 font-mono bg-slate-50/50">
                              <span className={`font-black text-sm ${
                                isPositive ? 'text-blue-700' : isNegative ? 'text-rose-600' : 'text-slate-600'
                              }`}>
                                {formatGrade(mdf)}
                              </span>
                            </td>

                            {/* Situação */}
                            <td className="py-2 px-3 text-center border-l border-slate-200/80">
                              {mdf === null ? (
                                <span className="text-[10px] text-slate-400 italic">Em Curso</span>
                              ) : isPositive ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  <CheckCircle className="w-3 h-3 text-blue-600" />
                                  Positiva
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Negativa
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between font-mono">
                  <span>🔒 Protegido contra edições • Consulta Autorizada</span>
                  <span>MAC: Média Avaliação Contínua | NPT: Nota Prova Trimestral</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs space-y-2">
              <User className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">Nenhum aluno selecionado</p>
              <p>Selecione um aluno na lista ao lado para visualizar seu histórico de classificações.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
