/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Student, GradeRow, getSubjectsForClass, getSubjectAbbreviation, getSubjectsForStudent, getStudentSpecialty, SubjectType, UserRole, Staff, SchoolSettings, getSpecialtyFromSection, getSpecialtyFullName, isEnglishSubject, isFrenchSubject } from '../types';
import { gerarCodigoPauta } from '../utils/pautaLogic';
import { Award, AlertTriangle, Edit2, Play, CheckCircle2, RefreshCw, FileText, Printer, Sparkles, Download, Trophy, Crown, TrendingUp, Settings } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import PautaHeader from './PautaHeader';
import { formatarNomePauta, calcularObservacaoPauta, TipoClasse, NotaDisciplina, AlunoPauta, obterCorObservacaoClass } from '../utils/pautaLogic';
import NotaFormatada from './NotaFormatada';
import { 
  calculateClassAverage, 
  calculateMA, 
  calculateMF, 
  getSavedFormulaWeights, 
  saveFormulaWeights,
  FormulaWeights 
} from '../utils/gradeCalculations';

interface PautaAnnualProps {
  students: Student[];
  grades: GradeRow[];
  currentClass: string;
  currentSection: string;
  isClosingPeriod: boolean;
  onUpdateGrade: (studentId: string, subject: string, trimester: 'I' | 'II' | 'III', value: number | null) => void;
  onPovoarAlunos: () => void;
  onConsolidarNotas: () => void;
  userRole?: UserRole;
  loggedInStaff?: Staff | null;
  schoolSettings?: SchoolSettings;
  activeModality?: 'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO';
  useNpp?: boolean;
  onToggleNpp?: (val: boolean) => void;
  foreignLanguageProp?: 'INGLÊS' | 'FRANCÊS';
}

export default function PautaAnnual({
  students,
  grades,
  currentClass,
  currentSection,
  isClosingPeriod,
  onUpdateGrade,
  onPovoarAlunos,
  onConsolidarNotas,
  userRole = 'SUB_DIRECTOR_PEDAGOGICO',
  loggedInStaff = null,
  schoolSettings,
  activeModality,
  useNpp,
  onToggleNpp,
  foreignLanguageProp
}: PautaAnnualProps) {
  // Povoado state
  const [povoadoAlunos, setPovoadoAlunos] = useState<Student[]>([]);
  const [lastCalculatedAt, setLastCalculatedAt] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ studentId: string; subject: string; trim: 'I' | 'II' | 'III' } | null>(null);
  const [editVal, setEditVal] = useState<string>('');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState<boolean>(false);

  const [selectedForeignLanguage, setSelectedForeignLanguage] = useState<'INGLÊS' | 'FRANCÊS'>(
    foreignLanguageProp || 'INGLÊS'
  );

  useEffect(() => {
    if (foreignLanguageProp) {
      setSelectedForeignLanguage(foreignLanguageProp);
    }
  }, [foreignLanguageProp]);

  // Active highlighted cell coordinates
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  // --- 13th Class Exclusive States and Persistent Storage ---
  const [grades13, setGrades13] = useState<{
    [studentId: string]: { avg10: number; avg11: number; avg12: number; pap: number; nec: number }
  }>(() => {
    const saved = localStorage.getItem('sigep_13_grades_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler notas da 13ª classe', e);
      }
    }
    return {};
  });

  const [weights, setWeights] = useState<FormulaWeights>(() => getSavedFormulaWeights());

  // Form states for manual input on selected student
  const [selectedStudentId13, setSelectedStudentId13] = useState<string>('');
  const [formAvg10, setFormAvg10] = useState<number>(10);
  const [formAvg11, setFormAvg11] = useState<number>(10);
  const [formAvg12, setFormAvg12] = useState<number>(10);
  const [formPap, setFormPap] = useState<number>(10);
  const [formNec, setFormNec] = useState<number>(10);

  // Save changes to grades13
  useEffect(() => {
    localStorage.setItem('sigep_13_grades_v2', JSON.stringify(grades13));
  }, [grades13]);

  // --- Exam Grades (6th, 9th, 12th) States and Persistent Storage ---
  const [examGrades, setExamGrades] = useState<{
    [studentId: string]: { [subject: string]: number }
  }>(() => {
    const saved = localStorage.getItem('sigep_exam_grades_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler notas de exame', e);
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('sigep_exam_grades_v2', JSON.stringify(examGrades));
  }, [examGrades]);

  const [selectedExamStudentId, setSelectedExamStudentId] = useState<string>('');
  const [selectedExamSubject, setSelectedExamSubject] = useState<string | ''>('');
  const [formExamGrade, setFormExamGrade] = useState<string>('');

  const handleSaveExamGrade = () => {
    if (!selectedExamStudentId || !selectedExamSubject) {
      setAlertMsg('Por favor, selecione o estudante e a disciplina para lançar a nota de exame.');
      return;
    }

    const gradeVal = parseFloat(formExamGrade.trim().replace(',', '.'));
    const maxVal = currentClass === '6' ? 10 : 20;

    if (isNaN(gradeVal) || gradeVal < 0 || gradeVal > maxVal) {
      setAlertMsg(`Nota de exame inválida. Insira um valor numérico entre 0 e ${maxVal}.`);
      return;
    }

    setExamGrades(prev => {
      const studentExams = prev[selectedExamStudentId] || {};
      return {
        ...prev,
        [selectedExamStudentId]: {
          ...studentExams,
          [selectedExamSubject]: gradeVal
        }
      };
    });

    setAlertMsg(`✓ Nota de exame da disciplina ${selectedExamSubject} gravada com sucesso para o estudante ${selectedExamStudentId}!`);
  };

  // Getter for 13th class grades reading directly from student history in 'grades' array when available
  const getStudent13Grades = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    const saved = grades13[studentId];

    let calcAvg10: number | null = null;
    let calcAvg11: number | null = null;
    let calcAvg12: number | null = null;

    if (student) {
      const spec = getStudentSpecialty(student);
      const mod = activeModality || 'MAGISTERIO';

      const computeClassAvg = (targetClass: string) => {
        const classSubs = getSubjectsForClass(targetClass, mod, spec);
        if (!classSubs || classSubs.length === 0) return null;

        let sumMFD = 0;
        let countValid = 0;

        classSubs.forEach(sub => {
          const studentGrades = grades.filter(g => g.studentId === studentId && g.subject === sub);
          const mt1 = studentGrades.find(g => g.trimester === 'I')?.mt;
          const mt2 = studentGrades.find(g => g.trimester === 'II')?.mt;
          const mt3 = studentGrades.find(g => g.trimester === 'III')?.mt;

          if (mt1 !== undefined || mt2 !== undefined || mt3 !== undefined) {
            const subjectMfd = ((mt1 ?? 0) + (mt2 ?? 0) + (mt3 ?? 0)) / 3;
            sumMFD += subjectMfd;
            countValid++;
          }
        });

        if (countValid > 0) {
          return sumMFD / countValid;
        }
        return null;
      };

      calcAvg10 = computeClassAvg('10');
      calcAvg11 = computeClassAvg('11');
      calcAvg12 = computeClassAvg('12');
    }

    const avg10 = saved?.avg10 !== undefined ? saved.avg10 : (calcAvg10 !== null ? Math.round(calcAvg10) : 0);
    const avg11 = saved?.avg11 !== undefined ? saved.avg11 : (calcAvg11 !== null ? Math.round(calcAvg11) : 0);
    const avg12 = saved?.avg12 !== undefined ? saved.avg12 : (calcAvg12 !== null ? Math.round(calcAvg12) : 0);

    const papGradeInDb = grades.find(g => (g.studentId === studentId || (student && g.studentId === student.id)) && (String(g.subject) === 'PAP' || String(g.subject) === 'Trabalho de Conclusão'));
    const necGradeInDb = grades.find(g => (g.studentId === studentId || (student && g.studentId === student.id)) && (String(g.subject) === 'NEC' || String(g.subject) === 'Estágio' || String(g.subject) === 'Prática Pedagógica'));

    const papFromDb = papGradeInDb?.mt ?? papGradeInDb?.mac ?? papGradeInDb?.npt;
    const necFromDb = necGradeInDb?.mt ?? necGradeInDb?.mac ?? necGradeInDb?.npt;

    const pap = (saved?.pap !== undefined && saved?.pap !== 0)
      ? saved.pap
      : ((papFromDb !== undefined && papFromDb !== null && papFromDb !== 0) ? Math.round(papFromDb) : (saved?.pap !== undefined ? saved.pap : 0));

    const nec = (saved?.nec !== undefined && saved?.nec !== 0)
      ? saved.nec
      : ((necFromDb !== undefined && necFromDb !== null && necFromDb !== 0) ? Math.round(necFromDb) : (saved?.nec !== undefined ? saved.nec : 0));

    return { avg10, avg11, avg12, pap, nec, isCalculated10: calcAvg10 !== null, isCalculated11: calcAvg11 !== null, isCalculated12: calcAvg12 !== null };
  };

  // Sync manual input form with selected student
  useEffect(() => {
    if (selectedStudentId13) {
      const sGrades = getStudent13Grades(selectedStudentId13);
      setFormAvg10(sGrades.avg10);
      setFormAvg11(sGrades.avg11);
      setFormAvg12(sGrades.avg12);
      setFormPap(sGrades.pap);
      setFormNec(sGrades.nec);
    }
  }, [selectedStudentId13]);

  const handleSaveStudent13Grades = () => {
    if (!selectedStudentId13) {
      setAlertMsg('Por favor, selecione um estudante para lançar as notas.');
      return;
    }

    const updatedObj = {
      avg10: formAvg10,
      avg11: formAvg11,
      avg12: formAvg12,
      pap: formPap,
      nec: formNec
    };

    setGrades13(prev => {
      const newGrades = {
        ...prev,
        [selectedStudentId13]: updatedObj
      };
      try {
        localStorage.setItem('sigep_13_grades_v2', JSON.stringify(newGrades));
      } catch (e) {}
      return newGrades;
    });

    if (onUpdateGrade) {
      ['I', 'II', 'III'].forEach(t => {
        onUpdateGrade(selectedStudentId13, 'PAP', t as 'I' | 'II' | 'III', formPap);
        onUpdateGrade(selectedStudentId13, 'NEC', t as 'I' | 'II' | 'III', formNec);
      });
    }

    try {
      const st = students.find(s => s.id === selectedStudentId13);
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sigep_pauta_exame_13') || key === 'sigep_exam_rows_13')) {
          const val = localStorage.getItem(key);
          if (val) {
            const rows = JSON.parse(val) as any[];
            const updatedRows = rows.map((r: any) => {
              if (r.id === selectedStudentId13 || (st && r.name && r.name.toLowerCase() === st.name.toLowerCase())) {
                const ma = Number(((formAvg10 + formAvg11 + formAvg12) / 3).toFixed(1));
                const mf = Math.round((ma * 0.4) + (formPap * 0.3) + (formNec * 0.3));
                return {
                  ...r,
                  m10: formAvg10,
                  m11: formAvg11,
                  m12: formAvg12,
                  pap: formPap,
                  nec: formNec,
                  ma,
                  mf,
                  status: mf >= 10 ? 'Apto' : 'Não Apto'
                };
              }
              return r;
            });
            localStorage.setItem(key, JSON.stringify(updatedRows));
          }
        }
      }
    } catch (err) {
      console.error("Error syncing 13th grade launch:", err);
    }

    setAlertMsg(`✓ Notas da 13ª Classe gravadas com sucesso para o estudante ${selectedStudentId13}!`);
  };

  const [grelhaVersion, setGrelhaVersion] = useState<number>(0);

  useEffect(() => {
    const handleGrelhaEvent = () => setGrelhaVersion(v => v + 1);
    window.addEventListener('sigep_grelha_updated', handleGrelhaEvent);
    window.addEventListener('sigep:data-updated', handleGrelhaEvent);
    window.addEventListener('storage', handleGrelhaEvent);
    return () => {
      window.removeEventListener('sigep_grelha_updated', handleGrelhaEvent);
      window.removeEventListener('sigep:data-updated', handleGrelhaEvent);
      window.removeEventListener('storage', handleGrelhaEvent);
    };
  }, []);

  const handleSaveFormulaWeights = (newWeights: FormulaWeights) => {
    setWeights(newWeights);
    saveFormulaWeights(newWeights);
    setAlertMsg('✓ Configuração das fórmulas e pesos atualizada com sucesso pelo Subdirector Pedagógico!');
  };


  // Find specialty of the current class/section
  const sectionStudents = students.filter(s => s.class === currentClass && s.section === currentSection);
  const activeSpecialty = sectionStudents.find(s => s.specialty)?.specialty || getSpecialtyFromSection(currentSection, activeModality);

  // Active subjects list
  const classSubjects = getSubjectsForClass(currentClass, activeModality, activeSpecialty);

  const numCls = parseInt(currentClass, 10) || 1;
  const isNotMagisterio = activeModality !== 'MAGISTERIO';
  const shouldFilterForeignLanguage = isNotMagisterio && (numCls >= 7 || activeModality === 'PUNIV');

  // Filter students belonging to Selected Class and Section and corresponding foreign language
  const targetStudents = students.filter((student) => {
    const matchesClassAndSection = student.class === currentClass && student.section === currentSection;
    if (!matchesClassAndSection) return false;
    if (shouldFilterForeignLanguage) {
      const studentLang = student.foreignLanguage || 'INGLÊS';
      return studentLang === selectedForeignLanguage;
    }
    return true;
  });

  const filteredClassSubjects = shouldFilterForeignLanguage 
    ? classSubjects.filter(sub => {
        if (isEnglishSubject(sub) && selectedForeignLanguage !== 'INGLÊS') return false;
        if (isFrenchSubject(sub) && selectedForeignLanguage !== 'FRANCÊS') return false;
        return true;
      })
    : classSubjects;

  const activeSubjects = loggedInStaff && loggedInStaff.role === 'PROFESSOR'
    ? filteredClassSubjects.filter(sub => (loggedInStaff.subjects || []).includes(sub as any))
    : filteredClassSubjects;

  useEffect(() => {
    if (activeSubjects.length > 0 && !selectedExamSubject) {
      setSelectedExamSubject(activeSubjects[0]);
    }
  }, [activeSubjects, selectedExamSubject]);

  // Sync povoadoAlunos when targetStudents or parameters change
  useEffect(() => {
    setPovoadoAlunos(targetStudents.slice(0, 75));
  }, [currentClass, currentSection, selectedForeignLanguage, students, activeModality]);

  // Level info
  const classeNum = parseInt(currentClass) || 1;
  const currentLevelNum = classeNum <= 4 ? 1 : classeNum <= 6 ? 2 : 3;

  // Trigger Action A (Povoar Alunos)
  const handlePovoar = () => {
    if (userRole === 'SECRETARIO') {
      setAlertMsg('Acesso Restrito: O Secretário não está autorizado a executar cálculos ou povoamento de pautas escolares.');
      return;
    }
    const limited = targetStudents.slice(0, 75);
    setPovoadoAlunos(limited);
    setAlertMsg(null);
    onPovoarAlunos();
  };

  // Trigger Action B (Consolidar Notas)
  const handleConsolidar = () => {
    if (userRole === 'SECRETARIO') {
      setAlertMsg('Acesso Restrito: O Secretário não está autorizado a consolidar notas.');
      return;
    }
    if (povoadoAlunos.length === 0) {
      setAlertMsg('Por favor, execute "Povoar Alunos" primeiro para mapear o painel nominal.');
      return;
    }
    setAlertMsg(null);
    const now = new Date();
    setLastCalculatedAt(now.toLocaleTimeString());
    onConsolidarNotas();
  };

  // Find grade from database
  const getGrade = (studentId: string, subject: string, trim: 'I' | 'II' | 'III'): number | null => {
    const record = grades.find(
      (g) => g.studentId === studentId && g.subject === subject && g.trimester === trim
    );
    return record ? record.mt : null;
  };

  // Render cell helper (Strictly Read-Only as per Security Guidelines)
  const renderMtCell = (student: Student, subject: string, trim: 'I' | 'II' | 'III', cellIdx: number, rowIdx: number) => {
    const val = getGrade(student.id, subject, trim);
    const escala = activeModality === 'ENSINO_PRIMARIO' ? 10 : 20;
    
    return (
      <td
        key={`${subject}-${trim}`}
        className="border border-slate-200 w-12 text-center px-[6px] text-xs font-mono font-medium"
      >
        <NotaFormatada valor={val} escala={escala} />
      </td>
    );
  };

  // Perform Calculations (Formula defined in user requirements)
  const calculateMetrics = (student: Student) => {
    if (currentClass === '13') {
      const s13 = getStudent13Grades(student.id);
      const avg10Int = Math.round(s13.avg10);
      const avg11Int = Math.round(s13.avg11);
      const avg12Int = Math.round(s13.avg12);
      
      const MA = Math.round((avg10Int + avg11Int + avg12Int) / 3);
      const papInt = Math.round(s13.pap);
      const necInt = Math.round(s13.nec);
      
      const exactMf = (weights.weightMA * MA + weights.weightPAP * papInt + weights.weightNEC * necInt) / 
                       (weights.weightMA + weights.weightPAP + weights.weightNEC);
      
      // Rounded MF
      let roundedMf = Math.round(exactMf);
      if (roundedMf > 20) roundedMf = 20;
      if (roundedMf < 0) roundedMf = 0;

      const status = roundedMf >= 10 ? 'APTO' : 'N/APTO';

      return {
        subjectsMfd: [],
        mfGlobal: roundedMf,
        status,
        totalGrades: 5,
        avg10: avg10Int,
        avg11: avg11Int,
        avg12: avg12Int,
        MA: MA,
        pap: papInt,
        nec: necInt
      };
    }

    const studentSubjectsList = getSubjectsForStudent(student, activeModality);

    let mfAcm = 0;
    let totalNotasTrimestraisLancadas = 0;
    const maxLimitValue = classeNum >= 7 ? 20 : 10;
    const isTransitaPassScore = classeNum >= 7 ? 10 : 5;
    const isExameClass = ['6', '9', '12'].includes(currentClass);

    let hasBlankField = false;
    let hasNegativeMf = false;

    const subjectsMfdAndGrades = activeSubjects.map((subject) => {
      const g1 = getGrade(student.id, subject, 'I');
      const g2 = getGrade(student.id, subject, 'II');
      const g3 = getGrade(student.id, subject, 'III');

      const mt1 = g1 ?? 0;
      const mt2 = g2 ?? 0;
      const mt3 = g3 ?? 0;

      const belongsToStudent = studentSubjectsList.includes(subject);

      if (belongsToStudent) {
        if (g1 !== null) totalNotasTrimestraisLancadas++;
        if (g2 !== null) totalNotasTrimestraisLancadas++;
        if (g3 !== null) totalNotasTrimestraisLancadas++;
      }

      // Scenario A & B: sum of all available MTs divided by 3
      const exactMfd = (mt1 + mt2 + mt3) / 3;
      
      // VBA Rounded implementation: mfd - Int(mfd) >= 0.5 -> round up, else down
      let roundedMfd = Math.floor(exactMfd);
      if (exactMfd - roundedMfd >= 0.5) {
        roundedMfd += 1;
      }
      if (roundedMfd > maxLimitValue) roundedMfd = maxLimitValue;

      // Se for classe de exame (6ª, 9ª ou 12ª), calcula a Média Final (MF) da disciplina considerando a Nota de Exame (NE)
      let finalMf: number | null = roundedMfd;
      let neVal: number | null = null;

      const isMfdBlank = g1 === null && g2 === null && g3 === null;

      if (isExameClass) {
        const studentExams = examGrades[student.id] || {};
        const ne = studentExams[subject];
        
        const isNeBlank = ne === undefined || ne === null || String(ne) === '';

        if (isMfdBlank || isNeBlank) {
          if (belongsToStudent) {
            hasBlankField = true;
          }
          finalMf = null; // MF remains empty
          neVal = isNeBlank ? null : Number(ne);
        } else {
          neVal = Number(ne);
          const exactMf = (0.6 * roundedMfd) + (0.4 * neVal);
          let calculatedMf = Math.round(exactMf);
          if (calculatedMf > maxLimitValue) calculatedMf = maxLimitValue;
          if (calculatedMf < 0) calculatedMf = 0;
          finalMf = calculatedMf;

          // For exam classes, passing mf is always >= 10 values as per "Nota 2"
          const passLimit = 10;
          if (belongsToStudent && finalMf < passLimit) {
            hasNegativeMf = true;
          }
        }
      } else {
        if (belongsToStudent && roundedMfd < isTransitaPassScore) {
          hasNegativeMf = true;
        }
      }

      if (finalMf !== null && belongsToStudent) {
        mfAcm += finalMf;
      }

      return { subject, mfd: isMfdBlank ? null as any : roundedMfd, ne: neVal, mf: finalMf };
    });

    const realSubjectCount = studentSubjectsList.length > 0 ? studentSubjectsList.length : activeSubjects.length;
    const exactMf = realSubjectCount > 0 ? mfAcm / realSubjectCount : 0;
    let mfGlobalInteira = Math.round(exactMf);

    let status = '';
    const totalNotasAlunoEsperadas = realSubjectCount * 3;
    const minNotasParaAtivo = Math.max(1, Math.ceil(totalNotasAlunoEsperadas * 0.3));

    if (student.status === 'Desistente' || student.isTransferidoSaida || (student.status as string) === 'TRANSFERIDO_SAIDA' || (isClosingPeriod && totalNotasTrimestraisLancadas < minNotasParaAtivo)) {
      mfGlobalInteira = 0;
      status = 'DESISTENTE';
    } else {
      // Montar a estrutura de AlunoPauta para validação de Observação unificada baseada nas disciplinas reais do aluno
      const studentDisciplinas: NotaDisciplina[] = studentSubjectsList.map((sub) => {
        const mfdObj = subjectsMfdAndGrades.find(s => s.subject === sub);
        const valMf = mfdObj?.mf ?? mfdObj?.mfd ?? null;
        const escala = activeModality === 'ENSINO_PRIMARIO' ? 10 : 20;
        
        // Um aluno reprova na disciplina se a média final for negativa
        const isNeg = valMf !== null && (escala === 10 ? valMf < 5.0 : valMf < 10.0);

        // Para fins de continuidade, capturamos as notas reais
        const g1 = getGrade(student.id, sub, 'I');
        const g2 = getGrade(student.id, sub, 'II');
        const g3 = getGrade(student.id, sub, 'III');
        
        return {
          idDisciplina: sub,
          mac: g1,
          npp: g2,
          npt: g3,
          mt: valMf,
          reprovadoNaDisciplina: isNeg
        };
      });

      const studentPauta: AlunoPauta = {
        id: student.id,
        nome: student.name,
        disciplinas: studentDisciplinas
      };

      const tipoClasse: TipoClasse = isExameClass ? 'EXAME' : 'CONTINUA';
      status = calcularObservacaoPauta(studentPauta, tipoClasse);
    }

    return {
      subjectsMfd: subjectsMfdAndGrades,
      mfGlobal: hasBlankField ? null as any : mfGlobalInteira,
      status,
      totalGrades: totalNotasTrimestraisLancadas
    };
  };

  // Find the best student by their highest grades in 80% of active subjects
  const bestStudentInfo = useMemo(() => {
    if (povoadoAlunos.length === 0) return null;
    
    // 80% of active subjects
    const numSubjectsFor80 = Math.max(1, Math.round(activeSubjects.length * 0.8));
    
    const candidates = povoadoAlunos.map(student => {
      const analytics = calculateMetrics(student);
      const mfdGrades = analytics.subjectsMfd.map(s => s.mfd);
      
      // Sort descending to get the highest grades
      const sortedGrades = [...mfdGrades].sort((a, b) => b - a);
      const top80Grades = sortedGrades.slice(0, numSubjectsFor80);
      const top80Sum = top80Grades.reduce((sum, val) => sum + val, 0);
      const top80Avg = top80Grades.length > 0 ? top80Sum / top80Grades.length : 0;
      
      return {
        student,
        analytics,
        top80Avg,
        top80Sum,
        mfdGrades,
        mfGlobal: analytics.mfGlobal
      };
    });
    
    // Sort candidates descending by top80Avg, then by mfGlobal
    candidates.sort((a, b) => {
      if (b.top80Avg !== a.top80Avg) {
        return b.top80Avg - a.top80Avg;
      }
      return b.mfGlobal - a.mfGlobal;
    });
    
    return candidates[0];
  }, [povoadoAlunos, activeSubjects, grades, isClosingPeriod]);

  // Compute the subject averages for the selected class/section
  const subjectAveragesData = useMemo(() => {
    if (povoadoAlunos.length === 0) return [];
    
    return activeSubjects.map(subject => {
      let totalMfd = 0;
      let count = 0;
      
      povoadoAlunos.forEach(student => {
        const analytics = calculateMetrics(student);
        const mfdObj = analytics.subjectsMfd.find(s => s.subject === subject);
        if (mfdObj) {
          totalMfd += mfdObj.mfd;
          count++;
        }
      });
      
      const average = count > 0 ? parseFloat((totalMfd / count).toFixed(1)) : 0;
      
      return {
        subject: subject.length > 12 ? subject.substring(0, 10) + '...' : subject,
        fullSubject: subject,
        'Média': average
      };
    });
  }, [povoadoAlunos, activeSubjects, grades, isClosingPeriod]);

  // Helper function to draw official headers
  const drawSchoolHeader = (docInstance: any, isLandscape: boolean, is13Class: boolean) => {
    const pageWidth = isLandscape ? 420 : 297;
    const midX = pageWidth / 2;

    // 1. Logo
    const logoUrl = schoolSettings?.logoType === 'PUBLIC' ? schoolSettings?.publicLogoUrl : schoolSettings?.privateLogoUrl;
    if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
      try {
        let format = 'PNG';
        if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) {
          format = 'JPEG';
        } else if (logoUrl.includes('image/gif')) {
          format = 'GIF';
        }
        docInstance.addImage(logoUrl, format, midX - 7, 6, 14, 14);
      } catch (err) {
        console.error('Error drawing school logo in PDF header:', err);
      }
    }

    // 2. Official Header Lines
    docInstance.setFont('Helvetica', 'bold');
    docInstance.setFontSize(10);
    docInstance.setTextColor(50, 50, 50);

    let currentY = 25;
    if (schoolSettings?.headerLine1Active !== false) {
      docInstance.text(schoolSettings?.headerLine1 || 'REPÚBLICA DE ANGOLA', midX, currentY, { align: 'center' });
      currentY += 4;
    }
    if (schoolSettings?.headerLine2Active !== false) {
      docInstance.text(schoolSettings?.headerLine2 || 'MINISTÉRIO DA EDUCAÇÃO', midX, currentY, { align: 'center' });
      currentY += 4;
    }
    if (schoolSettings?.headerLine3Active !== false) {
      docInstance.text(schoolSettings?.headerLine3 || `GOVERNO PROVINCIAL DE ${String(schoolSettings?.province || 'Lunda-Norte').toUpperCase()}`, midX, currentY, { align: 'center' });
      currentY += 4;
    }

    docInstance.setFont('Helvetica', 'normal');
    docInstance.setFontSize(9);
    if (schoolSettings?.headerLine4Active !== false) {
      docInstance.text(schoolSettings?.headerLine4 || `DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${String(schoolSettings?.municipality || 'MUNICIPIO').toUpperCase()}`, midX, currentY, { align: 'center' });
      currentY += 5;
    } else {
      currentY += 1;
    }

    // School name
    docInstance.setFont('Helvetica', 'bold');
    docInstance.setFontSize(13);
    docInstance.setTextColor(30, 41, 59);
    const schoolTitle = String(schoolSettings?.schoolName || 'Complexo Escolar Nº 1709 LNO').toUpperCase();
    if (currentClass === '12') {
      docInstance.text(`${schoolTitle}`, midX, currentY, { align: 'center' });
      currentY += 8;

      // Document Title underlined
      docInstance.setFontSize(14);
      docInstance.setFont('Helvetica', 'bold');
      const titleText = `PAUTA FINAL ${schoolSettings?.academicYear || '2025/2026'}`;
      docInstance.text(titleText, midX, currentY, { align: 'center' });
      const titleWidth = docInstance.getTextWidth(titleText);
      docInstance.setLineWidth(0.4);
      docInstance.setDrawColor(0, 0, 0);
      docInstance.line(midX - titleWidth/2, currentY + 1.2, midX + titleWidth/2, currentY + 1.2);
      currentY += 8;

      // Metadata line
      docInstance.setFont('Helvetica', 'bold');
      docInstance.setFontSize(10);
      docInstance.setTextColor(0, 0, 0);

      const activeSpecialty = getSpecialtyFromSection(currentSection, activeModality);
      const specialtyFullName = activeSpecialty ? getSpecialtyFullName(activeSpecialty) : 'ENSINO PRIMÁRIO';

      docInstance.text(`CLASSE: 12ª`, 15, currentY);
      docInstance.text(`TURMA: ${currentSection}`, 75, currentY);
      docInstance.text(`PERÍODO: REGULAR`, 125, currentY);
      docInstance.text(`ESPECIALIDADE: ${specialtyFullName.toUpperCase()}`, 180, currentY);
      docInstance.text(`SALA Nº_____`, pageWidth - 45, currentY);

      docInstance.setLineWidth(0.3);
      docInstance.setDrawColor(0, 0, 0);
      docInstance.line(15, currentY + 2.5, pageWidth - 15, currentY + 2.5);
    } else if (is13Class) {
      docInstance.text(`${schoolTitle}`, midX, currentY, { align: 'center' });
      currentY += 8;

      // Document Title
      docInstance.setFontSize(13);
      docInstance.setFont('Helvetica', 'bold');
      docInstance.text('PAUTA FINAL DO CURSO PEDAGÓGICO', midX, currentY, { align: 'center' });
      currentY += 8;

      // Metadata line
      docInstance.setFont('Helvetica', 'normal');
      docInstance.setFontSize(10);
      docInstance.setTextColor(0, 0, 0);

      const activeSpecialty = getSpecialtyFromSection(currentSection, activeModality);
      const specialtyFullName = activeSpecialty ? getSpecialtyFullName(activeSpecialty) : 'ENSINO PRIMÁRIO';

      docInstance.text(`Especialidade: ${specialtyFullName.toUpperCase()}`, 15, currentY);
      docInstance.text(`Turma: ${currentSection}`, midX - 60, currentY);
      docInstance.text(`Sala Nº_____`, midX - 30, currentY);
      docInstance.text(`Ano Lectivo: ${schoolSettings?.academicYear || '2025/2026'}`, midX + 10, currentY);
      docInstance.text(`Classe: 13ª`, midX + 60, currentY);
      docInstance.setFontSize(7.5);
      docInstance.text(`Cód: ${gerarCodigoPauta(schoolSettings?.academicYear || '2025/2026', '13')}`, pageWidth - 45, currentY + 3.5);
    } else {
      const schoolTitleY = currentY;
      docInstance.text(schoolTitle, midX, schoolTitleY, { align: 'center' });
      const titleY = schoolTitleY + 11;

      // Document Title
      docInstance.setFontSize(12);
      docInstance.setFont('Helvetica', 'bold');
      const activeSpecialty = getSpecialtyFromSection(currentSection, activeModality);
      const specialtyFullName = activeSpecialty ? getSpecialtyFullName(activeSpecialty) : 'ENSINO PRIMÁRIO';
      const specialtyText = activeSpecialty ? ` - ESPECIALIDADE: ${specialtyFullName.toUpperCase()}` : '';
      docInstance.text(`PAUTA FINAL${specialtyText}`, midX, titleY, { align: 'center' });

      // Metadata grid (positioned 6mm above table start)
      const metaY = 65;
      docInstance.setFont('Helvetica', 'normal');
      docInstance.setFontSize(9);
      docInstance.setTextColor(80, 80, 80);
      docInstance.text(`Classe: ${currentClass}ª`, 15, metaY);
      docInstance.setFontSize(7.5);
      docInstance.text(`Cód: ${gerarCodigoPauta(schoolSettings?.academicYear || '2025/2026', currentClass)}`, 15, metaY + 3.5);
      docInstance.text(`Turma: ${currentSection}`, midX - 60, metaY);
      docInstance.text(`Sala Nº_____`, midX - 30, metaY);
      docInstance.text(`Período: Regular`, midX + 15, metaY);
      docInstance.text(`Ano Lectivo: ${schoolSettings?.academicYear || '2025/2026'}`, midX + 60, metaY);
    }
  };

  // Official PDF 13th Class generator using native vectors (jsPDF autotable)
  const generateOfficialPDF13 = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a3'
    });

    const pageWidth = 297;
    const pageHeight = 420;

    const head13: any[] = [
      [
        { content: 'Nº', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: 'Nome Completo', rowSpan: 2, styles: { valign: 'middle', fontStyle: 'bold' } },
        { content: 'Médias por Classe', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', fillColor: [52, 73, 94], textColor: [255, 255, 255] } },
        { content: 'MA', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: 'PAP', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: 'NEC', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: 'MF', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: 'Observação', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } }
      ],
      [
        { content: '10ª', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: '11ª', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: '12ª', styles: { halign: 'center', fontStyle: 'bold' } }
      ]
    ];

    const body13 = povoadoAlunos.map((student, idx) => {
      const analytics = calculateMetrics(student);
      return [
        idx + 1,
        formatarNomePauta(student.name),
        analytics.avg10 !== null && analytics.avg10 !== undefined ? Math.round(analytics.avg10) : '-',
        analytics.avg11 !== null && analytics.avg11 !== undefined ? Math.round(analytics.avg11) : '-',
        analytics.avg12 !== null && analytics.avg12 !== undefined ? Math.round(analytics.avg12) : '-',
        analytics.MA !== null && analytics.MA !== undefined ? Math.round(analytics.MA) : '-',
        analytics.pap !== null && analytics.pap !== undefined ? Math.round(analytics.pap) : '-',
        analytics.nec !== null && analytics.nec !== undefined ? Math.round(analytics.nec) : '-',
        analytics.mfGlobal !== null && analytics.mfGlobal !== undefined ? Math.round(analytics.mfGlobal) : '-',
        analytics.status
      ];
    });

    autoTable(doc, {
      startY: 75,
      margin: { top: 75, bottom: 40, left: 15, right: 15 },
      head: head13,
      body: body13,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 1.8,
        font: 'Helvetica',
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        textColor: [0, 0, 0]
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.25,
        lineColor: [148, 163, 184],
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 105 },
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 16, halign: 'center' },
        7: { cellWidth: 16, halign: 'center' },
        8: { cellWidth: 16, halign: 'center' },
        9: { cellWidth: 38, halign: 'center' }
      },
      didDrawPage: (data) => {
        drawSchoolHeader(doc, false, true);
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const valueStr = data.cell.text[0];
          const value = parseFloat(valueStr);
          const colIdx = data.column.index;
          
          if (!isNaN(value) && colIdx >= 2 && colIdx <= 8) {
            // Scale 0 to 20 rules
            if (value >= 10 && value <= 20) {
              data.cell.styles.textColor = '#0000FF'; // AZUL PURO
              data.cell.styles.fontStyle = 'bold';
            } else if (value >= 0 && value < 10) {
              data.cell.styles.textColor = '#FF0000'; // VERMELHO PURO
              data.cell.styles.fontStyle = 'bold';
            }
          } else if (colIdx === 9) {
            // Status observacao formatting
            const statusUpper = String(valueStr).toUpperCase();
            if (statusUpper === 'APTO' || statusUpper === 'TRANSITA') {
              data.cell.styles.textColor = '#0000FF'; // AZUL PURO
              data.cell.styles.fontStyle = 'bold';
            } else if (
              statusUpper === 'N/APTO' || 
              statusUpper === 'NÃO APTO' || 
              statusUpper === 'N/TRANSITA' || 
              statusUpper === 'NÃO TRANSITA' || 
              statusUpper === 'REPROVADO' || 
              statusUpper === 'DESISTENTE'
            ) {
              data.cell.styles.textColor = '#FF0000'; // VERMELHO PURO
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    });

    // Add page numbers on all pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${p} de ${totalPages} • Emitido via SiGeP (Módulo Pauta Geral 13ª Classe)`, pageWidth - 15, pageHeight - 15, { align: 'right' });
    }

    doc.setPage(totalPages);
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY + 90 > pageHeight) {
      doc.addPage();
      const newTotalPages = doc.getNumberOfPages();
      doc.setPage(newTotalPages);
      finalY = 25;
    }

    // Calculate Statistics
    const stats = {
      mTotal: 0, mAptos: 0, mNAptos: 0,
      fTotal: 0, fAptos: 0, fNAptos: 0,
      tTotal: 0, tAptos: 0, tNAptos: 0
    };

    povoadoAlunos.forEach(student => {
      const analytics = calculateMetrics(student);
      const isApto = ['APTO', 'TRANSITA'].includes(analytics.status?.toUpperCase());
      const isM = student.gender?.toUpperCase().startsWith('M');
      
      if (isM) {
        stats.mTotal++;
        if (isApto) stats.mAptos++;
        else stats.mNAptos++;
      } else {
        stats.fTotal++;
        if (isApto) stats.fAptos++;
        else stats.fNAptos++;
      }
    });
    stats.tTotal = stats.mTotal + stats.fTotal;
    stats.tAptos = stats.mAptos + stats.fAptos;
    stats.tNAptos = stats.mNAptos + stats.fNAptos;

    // Draw statistical table using autoTable
    autoTable(doc, {
      startY: finalY,
      margin: { left: 88.5, right: 88.5 },
      head: [
        [
          { content: 'Informação Estatística', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fontSize: 10, fillColor: [255, 255, 255], textColor: [0, 0, 0] } }
        ],
        [
          { content: 'Género', styles: { halign: 'left', fontStyle: 'bold' } },
          { content: 'Total', styles: { halign: 'center', fontStyle: 'bold' } },
          { content: 'Aptos', styles: { halign: 'center', fontStyle: 'bold' } },
          { content: 'N/Aptos', styles: { halign: 'center', fontStyle: 'bold' } }
        ]
      ],
      body: [
        ['Masculino', stats.mTotal, stats.mAptos, stats.mNAptos],
        ['Feminino', stats.fTotal, stats.fAptos, stats.fNAptos],
        [
          { content: 'Total', styles: { fontStyle: 'bold', fillColor: [52, 73, 94], textColor: [255, 255, 255], halign: 'left' } },
          { content: String(stats.tTotal), styles: { fontStyle: 'bold', fillColor: [52, 73, 94], textColor: [255, 255, 255], halign: 'center' } },
          { content: String(stats.tAptos), styles: { fontStyle: 'bold', fillColor: [52, 73, 94], textColor: [255, 255, 255], halign: 'center' } },
          { content: String(stats.tNAptos), styles: { fontStyle: 'bold', fillColor: [52, 73, 94], textColor: [255, 255, 255], halign: 'center' } }
        ]
      ],
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2.2,
        font: 'Helvetica',
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        textColor: [0, 0, 0]
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.2,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' }
      }
    });

    finalY = (doc as any).lastAutoTable.finalY + 15;
    if (finalY + 35 > pageHeight) {
      doc.addPage();
      const newTotalPages = doc.getNumberOfPages();
      doc.setPage(newTotalPages);
      finalY = 25;
    }

    // Draw Signatures Block
    const sigY = finalY;
    const lineLength = 70;
    const sigStartX1 = 15;
    const sigStartX2 = 98.5;
    const sigStartX3 = 182;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    // O Coordenador de Curso
    doc.text('O Coordenador de Curso', sigStartX1 + (lineLength / 2), sigY, { align: 'center' });
    doc.line(sigStartX1, sigY + 20, sigStartX1 + lineLength, sigY + 20);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('( ___________________________ )', sigStartX1 + (lineLength / 2), sigY + 24, { align: 'center' });

    // O Subdirector Pedagógico
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(schoolSettings?.subdirectorRoleLabel || 'O Subdirector Pedagógico', sigStartX2 + (lineLength / 2), sigY, { align: 'center' });
    doc.line(sigStartX2, sigY + 20, sigStartX2 + lineLength, sigY + 20);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`( ${schoolSettings?.subdirectorName || 'Gaspar Da Fatima'} )`, sigStartX2 + (lineLength / 2), sigY + 24, { align: 'center' });
    doc.setFontSize(7.5);
    doc.text('________/__________/__________', sigStartX2 + (lineLength / 2), sigY + 29, { align: 'center' });

    // O Director da Escola
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(schoolSettings?.directorRoleLabel || 'O Director da Escola', sigStartX3 + (lineLength / 2), sigY, { align: 'center' });
    doc.line(sigStartX3, sigY + 20, sigStartX3 + lineLength, sigY + 20);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`( ${schoolSettings?.directorName || 'Manuel das Fisgas'} )`, sigStartX3 + (lineLength / 2), sigY + 24, { align: 'center' });
    doc.setFontSize(7.5);
    doc.text('________/__________/__________', sigStartX3 + (lineLength / 2), sigY + 29, { align: 'center' });

    const filename = `Pauta_Geral_Oficial_A3_${currentClass}a_Classe_Turma_${currentSection}_Ano2025_2026.pdf`;
    doc.save(filename);
  };

  // Official PDF Regular Classes generator using native landscape vectors (jsPDF autotable)
  const generateOfficialPDFRegular = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3'
    });

    const pageWidth = 420;
    const pageHeight = 297;
    const isExameClass = ['6', '9', '12'].includes(currentClass);
    const classeNum = parseInt(currentClass) || 0;

    // --- CÁLCULOS DINÂMICOS DE DIMENSÕES DA TABELA PARA CABER NO A3 DE FORMA VERTICALMENTE FIEL ---
    // Determina o número de colunas por disciplina. Nas classes de Exame (6ª, 9ª e 12ª) são 3 colunas (MFD, NE, MF), nas de Transição Contínua são 4 colunas (MT1, MT2, MT3, MFD)
    const colsPerSubject = isExameClass ? 3 : 4;
    const totalSubjectCols = activeSubjects.length * colsPerSubject;

    // Orçamento total disponível para a tabela inteira (A3 = 420mm de largura total)
    const targetTableWidth = 396; // mm

    // Largura ideal acumulada reservada exclusivamente para as notas das disciplinas
    const targetSubjectsWidth = 290; // mm

    // Largura de cada célula individual de nota
    let noteColWidth = targetSubjectsWidth / totalSubjectCols;

    // Salvaguardas físicas de largura de coluna para garantir excelente proporção e legibilidade
    if (noteColWidth > 9) noteColWidth = 9;
    if (noteColWidth < 3.2) noteColWidth = 3.2;

    const actualSubjectsWidth = totalSubjectCols * noteColWidth;

    // Dimensões das colunas de informações fixas
    const colWidthNo = 6;     // Nº de ordem
    const colWidthMat = 15;   // Matrícula
    const colWidthGen = 6;    // Gênero
    const colWidthMf = 8;     // MF Global no fim da pauta
    const colWidthObs = 20;   // Observação

    // Espaço que sobra para o Nome Completo do Aluno
    let colWidthName = targetTableWidth - (colWidthNo + colWidthMat + colWidthGen + actualSubjectsWidth + colWidthMf + colWidthObs);
    if (colWidthName < 38) {
      colWidthName = 38; // Mínimo de garantia para o nome do aluno
    }

    // Calcular largura final real ocupada pela tabela
    const finalTableWidth = colWidthNo + colWidthMat + colWidthName + colWidthGen + actualSubjectsWidth + colWidthMf + colWidthObs;

    // Centralização dinâmica perfeita na folha A3
    const leftMargin = (pageWidth - finalTableWidth) / 2;
    const rightMargin = leftMargin;

    // Escalonamento adaptativo inteligente do tamanho da fonte e paddings baseado no aperto das colunas
    let tableFontSize = 6.5;
    let tablePadding = 0.8;
    
    if (noteColWidth < 4.0) {
      tableFontSize = 4.2;
      tablePadding = 0.3;
    } else if (noteColWidth < 4.8) {
      tableFontSize = 4.8;
      tablePadding = 0.4;
    } else if (noteColWidth < 6.0) {
      tableFontSize = 5.5;
      tablePadding = 0.5;
    } else if (noteColWidth < 7.5) {
      tableFontSize = 6.0;
      tablePadding = 0.6;
    }

    let headRegular: any[] = [];
    let bodyRegular: any[] = [];
    let colStyles: any = {};
    let totalCols = 0;

    // Build dynamically sized multi-level headers
    const headRow1 = [
      { content: 'Nº', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: Math.max(tableFontSize, 5.5) } },
      { content: 'Matrícula', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: Math.max(tableFontSize, 5.5) } },
      { content: 'Nome Completo do Aluno', rowSpan: 2, styles: { valign: 'middle', fontSize: Math.max(tableFontSize, 5.5) } },
      { content: 'Gên', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: Math.max(tableFontSize, 5.5) } }
    ];

    activeSubjects.forEach(sub => {
      headRow1.push({
        content: getSubjectAbbreviation(sub),
        colSpan: isExameClass ? 3 : 4,
        styles: { halign: 'center', fontSize: Math.max(tableFontSize, 5.0) }
      } as any);
    });

    headRow1.push({ content: 'MF', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: Math.max(tableFontSize, 5.5) } } as any);
    headRow1.push({ content: 'Observação', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: Math.max(tableFontSize, 5.5) } } as any);

    const headRow2: any[] = [];
    activeSubjects.forEach(() => {
      if (isExameClass) {
        headRow2.push({ content: 'MFD', styles: { halign: 'center', fontSize: Math.max(tableFontSize - 0.2, 3.8) } });
        headRow2.push({ content: 'NE', styles: { halign: 'center', fontSize: Math.max(tableFontSize - 0.2, 3.8) } });
        headRow2.push({ content: 'MF', styles: { halign: 'center', fontSize: Math.max(tableFontSize - 0.2, 3.8) } });
      } else {
        headRow2.push({ content: 'MT1', styles: { halign: 'center', fontSize: Math.max(tableFontSize - 0.2, 3.8) } });
        headRow2.push({ content: 'MT2', styles: { halign: 'center', fontSize: Math.max(tableFontSize - 0.2, 3.8) } });
        headRow2.push({ content: 'MT3', styles: { halign: 'center', fontSize: Math.max(tableFontSize - 0.2, 3.8) } });
        headRow2.push({ content: 'MFD', styles: { halign: 'center', fontSize: Math.max(tableFontSize - 0.2, 3.8) } });
      }
    });

    headRegular = [headRow1, headRow2];

    bodyRegular = povoadoAlunos.map((student, localIdx) => {
      const analytics = calculateMetrics(student);
      const row: any[] = [
        localIdx + 1,
        student.id,
        formatarNomePauta(student.name),
        student.gender
      ];

      activeSubjects.forEach((sub) => {
        const mfdObj = analytics.subjectsMfd.find(s => s.subject === sub);
        const mfdVal = mfdObj && mfdObj.mfd !== null && mfdObj.mfd !== undefined ? Math.round(mfdObj.mfd) : null;
        const neVal = mfdObj && (mfdObj as any).ne !== null && (mfdObj as any).ne !== undefined ? Math.round((mfdObj as any).ne) : null;
        const mfVal = mfdObj && (mfdObj as any).mf !== null && (mfdObj as any).mf !== undefined ? Math.round((mfdObj as any).mf) : null;

        if (isExameClass) {
          row.push(mfdVal ?? '-');
          row.push(neVal ?? '-');
          row.push(mfVal ?? '-');
        } else {
          const mt1 = getGrade(student.id, sub, 'I');
          const mt2 = getGrade(student.id, sub, 'II');
          const mt3 = getGrade(student.id, sub, 'III');

          row.push(mt1 !== null && mt1 !== undefined ? Math.round(mt1) : '-');
          row.push(mt2 !== null && mt2 !== undefined ? Math.round(mt2) : '-');
          row.push(mt3 !== null && mt3 !== undefined ? Math.round(mt3) : '-');
          row.push(mfdVal ?? '-');
        }
      });

      row.push(analytics.mfGlobal !== null && analytics.mfGlobal !== undefined ? Math.round(analytics.mfGlobal) : '-');
      row.push(analytics.status);

      return row;
    });

    colStyles = {
      0: { cellWidth: colWidthNo, halign: 'center' }, 
      1: { cellWidth: colWidthMat, halign: 'center' }, 
      2: { cellWidth: colWidthName },                   
      3: { cellWidth: colWidthGen, halign: 'center' }  
    };

    totalCols = 4 + (activeSubjects.length * (isExameClass ? 3 : 4)) + 2;
    for (let i = 4; i < totalCols - 1; i++) {
      colStyles[i] = { cellWidth: noteColWidth, halign: 'center' };
    }
    colStyles[totalCols - 1] = { cellWidth: colWidthObs, halign: 'center' };

    autoTable(doc, {
      startY: 75,
      margin: { top: 75, bottom: 40, left: leftMargin, right: rightMargin },
      head: headRegular,
      body: bodyRegular,
      theme: 'grid',
      styles: {
        fontSize: tableFontSize, 
        cellPadding: tablePadding, 
        font: 'Helvetica',
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: 'bold',
        lineColor: [180, 180, 180],
        lineWidth: 0.25,
        fontSize: Math.max(tableFontSize - 0.2, 4.0),
        halign: 'center'
      },
      columnStyles: colStyles,
      didDrawPage: (data) => {
        drawSchoolHeader(doc, true, false);
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const valueStr = data.cell.text[0];
          const value = parseFloat(valueStr);
          const colIdx = data.column.index;
          const startScoreCol = 4;

          if (!isNaN(value) && colIdx >= startScoreCol && colIdx < totalCols - 1) {
            if (classeNum >= 1 && classeNum <= 6) {
              if (value >= 5 && value <= 10) {
                data.cell.styles.textColor = '#0000FF'; // AZUL PURO
                data.cell.styles.fontStyle = 'bold';
              } else if (value >= 0 && value < 5) {
                data.cell.styles.textColor = '#FF0000'; // VERMELHO PURO
                data.cell.styles.fontStyle = 'bold';
              }
            } else {
              if (value >= 10 && value <= 20) {
                data.cell.styles.textColor = '#0000FF'; // AZUL PURO
                data.cell.styles.fontStyle = 'bold';
              } else if (value >= 0 && value < 10) {
                data.cell.styles.textColor = '#FF0000'; // VERMELHO PURO
                data.cell.styles.fontStyle = 'bold';
              }
            }
          } else if (colIdx === totalCols - 1) {
            const obsUpper = String(valueStr).toUpperCase();
            if (obsUpper === 'TRANSITA' || obsUpper === 'APTO') {
              data.cell.styles.textColor = '#0000FF'; // AZUL PURO
              data.cell.styles.fontStyle = 'bold';
            } else if (
              obsUpper === 'NÃO TRANSITA' || 
              obsUpper === 'N/TRANSITA' || 
              obsUpper === 'REPROVADO' || 
              obsUpper === 'N/APTO' || 
              obsUpper === 'DESISTENTE' || 
              obsUpper === 'NÃO APTO'
            ) {
              data.cell.styles.textColor = '#FF0000'; // VERMELHO PURO
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    });

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const footerContactStr = `${schoolSettings?.schoolName || 'Complexo Escolar Nº 1709 LNO'}  |  Endereço: ${schoolSettings?.address || `${schoolSettings?.municipality || 'Cafunfo'}, ${schoolSettings?.province || 'Lunda-Norte'}`}  |  Tel: ${schoolSettings?.phone || '923 000 000'}  |  E-mail: ${schoolSettings?.email || 'geral@sigep.ao'}`;
      doc.text(footerContactStr, 15, pageHeight - 12, { align: 'left' });
      doc.text(`Página ${p} de ${totalPages} • Emitido via SiGeP (Módulo Pauta Geral A3 Landscape)`, pageWidth - 15, pageHeight - 12, { align: 'right' });
    }

    let finalY = (doc as any).lastAutoTable.finalY + 12;
    const requiredHeight = 65; // Same required height for all classes
    if (finalY + requiredHeight > pageHeight) {
      doc.addPage();
      const newTotalPages = doc.getNumberOfPages();
      doc.setPage(newTotalPages);
      finalY = 30;
    }

    const today = new Date();
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const dateText = `${schoolSettings?.municipality || 'Cafunfo'}, aos ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(dateText, 15, finalY, { align: 'left' });

    // Calculate Stats (Unconditional for all regular classes)
    let mascTotal = 0, mascAptos = 0, mascNAptos = 0;
    let femTotal = 0, femAptos = 0, femNAptos = 0;

    povoadoAlunos.forEach((student) => {
      const analytics = calculateMetrics(student);
      const isApto = ['APTO', 'TRANSITA'].includes(analytics.status?.toUpperCase());
      if (student.gender === 'M') {
        mascTotal++;
        if (isApto) mascAptos++;
        else mascNAptos++;
      } else {
        femTotal++;
        if (isApto) femAptos++;
        else femNAptos++;
      }
    });

    const tableStartX = 15;
    const bottomBlockY = finalY + 5;

    const statsBoxWidth = 84;

    // Draw Stats Table Frame
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(tableStartX, bottomBlockY, statsBoxWidth, 32, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Informação Estatística', tableStartX + (statsBoxWidth / 2), bottomBlockY + 5, { align: 'center' });
    doc.line(tableStartX, bottomBlockY + 7, tableStartX + statsBoxWidth, bottomBlockY + 7);

    const labelAprovados = isExameClass ? 'Aptos' : 'Transitas';
    const labelReprovados = isExameClass ? 'N/Aptos' : 'N/Transitas';

    const colGenX = tableStartX + 3;
    const colTotalX = tableStartX + 32;
    const colAprovX = tableStartX + 52;
    const colReprovX = tableStartX + 70;

    doc.setFontSize(7.5);
    doc.text('Género', colGenX, bottomBlockY + 12);
    doc.text('Total', colTotalX, bottomBlockY + 12, { align: 'center' });
    doc.text(labelAprovados, colAprovX, bottomBlockY + 12, { align: 'center' });
    doc.text(labelReprovados, colReprovX, bottomBlockY + 12, { align: 'center' });
    doc.line(tableStartX, bottomBlockY + 14, tableStartX + statsBoxWidth, bottomBlockY + 14);

    doc.setFont('Helvetica', 'normal');
    doc.text('Masculino', colGenX, bottomBlockY + 20);
    doc.text(String(mascTotal), colTotalX, bottomBlockY + 20, { align: 'center' });
    doc.text(String(mascAptos), colAprovX, bottomBlockY + 20, { align: 'center' });
    doc.text(String(mascNAptos), colReprovX, bottomBlockY + 20, { align: 'center' });

    doc.text('Feminino', colGenX, bottomBlockY + 26);
    doc.text(String(femTotal), colTotalX, bottomBlockY + 26, { align: 'center' });
    doc.text(String(femAptos), colAprovX, bottomBlockY + 26, { align: 'center' });
    doc.text(String(femNAptos), colReprovX, bottomBlockY + 26, { align: 'center' });

    // Draw Signatures Block side-by-side
    const lineLength = 65;
    const sigY = finalY + 15;

    if (currentClass === '12') {
      // Column 1: O Conselho de Notas (X = 110)
      const sigStartX1 = 110;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('O Conselho de Notas', sigStartX1 + (lineLength / 2), sigY, { align: 'center' });
      
      doc.line(sigStartX1, sigY + 12, sigStartX1 + lineLength, sigY + 12);
      doc.line(sigStartX1, sigY + 22, sigStartX1 + lineLength, sigY + 22);
      doc.line(sigStartX1, sigY + 32, sigStartX1 + lineLength, sigY + 32);

      // Column 2: O Subdirector Pedagógico (X = 210)
      const sigStartX2 = 210;
      doc.setFont('Helvetica', 'bold');
      doc.text(schoolSettings?.subdirectorRoleLabel || 'O Subdirector Pedagógico', sigStartX2 + (lineLength / 2), sigY, { align: 'center' });
      doc.line(sigStartX2, sigY + 20, sigStartX2 + lineLength, sigY + 20);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`( ${schoolSettings?.subdirectorName || 'Gaspar Da Fatima'} )`, sigStartX2 + (lineLength / 2), sigY + 24, { align: 'center' });
      doc.setFontSize(7.5);
      doc.text('________/__________/__________', sigStartX2 + (lineLength / 2), sigY + 29, { align: 'center' });

      // Column 3: O Director da Escola (X = 310)
      const sigStartX3 = 310;
      doc.setFont('Helvetica', 'bold');
      doc.text(schoolSettings?.directorRoleLabel || 'O Director da Escola', sigStartX3 + (lineLength / 2), sigY, { align: 'center' });
      doc.line(sigStartX3, sigY + 20, sigStartX3 + lineLength, sigY + 20);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`( ${schoolSettings?.directorName || 'Manuel das Fisgas'} )`, sigStartX3 + (lineLength / 2), sigY + 24, { align: 'center' });
      doc.setFontSize(7.5);
      doc.text('________/__________/__________', sigStartX3 + (lineLength / 2), sigY + 29, { align: 'center' });
    } else {
      // Column 1: O Conselho (X = 110)
      const sigStartX1 = 110;
      const coordinators = schoolSettings?.coordinators || [];
      const coord1 = coordinators[0] || 'Coordenador de Turno (Manhã)';
      const coord2 = coordinators[1] || 'Coordenador de Turno (Tarde)';
      const coord3 = coordinators[2] || 'Coordenador de Disciplina';

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('O Conselho', sigStartX1 + (lineLength / 2), sigY, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      
      doc.line(sigStartX1, sigY + 8, sigStartX1 + lineLength, sigY + 8);
      doc.text(coord1, sigStartX1 + (lineLength / 2), sigY + 12, { align: 'center' });

      doc.line(sigStartX1, sigY + 20, sigStartX1 + lineLength, sigY + 20);
      doc.text(coord2, sigStartX1 + (lineLength / 2), sigY + 24, { align: 'center' });

      doc.line(sigStartX1, sigY + 32, sigStartX1 + lineLength, sigY + 32);
      doc.text(coord3, sigStartX1 + (lineLength / 2), sigY + 36, { align: 'center' });

      // Column 2: O Subdirector Pedagógico (X = 210)
      const sigStartX2 = 210;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(schoolSettings?.subdirectorRoleLabel || 'O Subdirector Pedagógico', sigStartX2 + (lineLength / 2), sigY, { align: 'center' });
      doc.line(sigStartX2, sigY + 15, sigStartX2 + lineLength, sigY + 15);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(schoolSettings?.subdirectorName || 'Dr. Subdirector Pedagógico', sigStartX2 + (lineLength / 2), sigY + 20, { align: 'center' });
      doc.setFontSize(7.5);
      doc.text('________/__________/__________', sigStartX2 + (lineLength / 2), sigY + 25, { align: 'center' });

      // Column 3: O Director Geral (X = 310)
      const sigStartX3 = 310;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(schoolSettings?.directorRoleLabel || 'O Director Geral', sigStartX3 + (lineLength / 2), sigY, { align: 'center' });
      doc.line(sigStartX3, sigY + 15, sigStartX3 + lineLength, sigY + 15);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(schoolSettings?.directorName || 'Dr. Director Geral', sigStartX3 + (lineLength / 2), sigY + 20, { align: 'center' });
      doc.setFontSize(7.5);
      doc.text('________/__________/__________', sigStartX3 + (lineLength / 2), sigY + 25, { align: 'center' });

      doc.setFontSize(7.5);
      doc.setFont('Helvetica', 'italic');
      doc.setTextColor(160, 160, 160);
      doc.text('( Selo em uso / Carimbo de Autenticidade )', sigStartX3 + (lineLength / 2), sigY + 28, { align: 'center' });
    }

    const filename = `Pauta_Geral_Oficial_A3_${currentClass}a_Classe_Turma_${currentSection}_Ano2025_2026.pdf`;
    doc.save(filename);
  };

  // --- OFFICIAL PDF DOCUMENT GENERATOR ---
  const generateOfficialPDF = async () => {
    if (povoadoAlunos.length === 0) {
      setAlertMsg('Pauta Vazia: Execute o comando "Povoar Alunos" antes de gerar o documento PDF oficial.');
      return;
    }

    setIsPdfGenerating(true);
    setAlertMsg(null);

    try {
      if (currentClass === '13') {
        await generateOfficialPDF13();
      } else {
        await generateOfficialPDFRegular();
      }
      setAlertMsg('✓ Documento de Pauta Oficial A3 gerado com sucesso!');
    } catch (err) {
      console.error(err);
      setAlertMsg('Falha na geração do PDF: Erro ao estruturar o arquivo PDF.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  /* Bypassed legacy PDF code */
  const dummyBypassedPDF = async () => {
    if (false) {
      try {
      let doc: any = null;
        let midX: any = 0;
        let pageWidth: any = 0;
        let pageHeight: any = 0;

        // Borders removed

        // Logo
        const logoUrl = schoolSettings?.logoType === 'PUBLIC' ? schoolSettings?.publicLogoUrl : schoolSettings?.privateLogoUrl;
        if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
          try {
            let format = 'PNG';
            if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) {
              format = 'JPEG';
            }
            doc.addImage(logoUrl, format, midX - 7, 6, 14, 14);
          } catch (err) {
            console.error("Logo error", err);
          }
        }

        // Headers text
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        
        let currentHeaderY = 25;
        if (schoolSettings?.headerLine1Active !== false) {
          doc.text(schoolSettings?.headerLine1 || 'REPÚBLICA DE ANGOLA', midX, currentHeaderY, { align: 'center' });
          currentHeaderY += 4;
        }
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        if (schoolSettings?.headerLine2Active !== false) {
          doc.text(schoolSettings?.headerLine2 || 'MINISTÉRIO DA EDUCAÇÃO', midX, currentHeaderY, { align: 'center' });
          currentHeaderY += 4;
        }
        
        doc.setFont('Helvetica', 'bold');
        if (schoolSettings?.headerLine3Active !== false) {
          doc.text(schoolSettings?.headerLine3 || `GOVERNO PROVINCIAL DE ${String(schoolSettings?.province || 'Lunda-Norte').toUpperCase()}`, midX, currentHeaderY, { align: 'center' });
          currentHeaderY += 4;
        }
        
        doc.setFont('Helvetica', 'normal');
        if (schoolSettings?.headerLine4Active !== false) {
          doc.text(schoolSettings?.headerLine4 || `DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${String(schoolSettings?.municipality || 'MUNICIPIO').toUpperCase()}`, midX, currentHeaderY, { align: 'center' });
          currentHeaderY += 4;
        }

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.text((schoolSettings?.schoolName || 'COMPLEXO ESCOLAR WATCHIMONA').toUpperCase(), midX, currentHeaderY, { align: 'center' });
        currentHeaderY += 7;
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('PAUTA FINAL DO CURSO PEDAGÓGICO', midX, currentHeaderY, { align: 'center' });

        // Metadata Info
        doc.setFontSize(9);
        doc.setFont('Helvetica', 'bold');
        
        const metaY = 60;
        const activeSpecialty = getSpecialtyFromSection(currentSection, activeModality);
        const specialtyFullName = activeSpecialty ? getSpecialtyFullName(activeSpecialty) : 'ENSINO PRIMÁRIO';
        doc.text(`ESPECIALIDADE: ${specialtyFullName.toUpperCase()}`, 15, metaY);
        doc.text(`TURMA: ${currentSection}`, midX - 65, metaY);
        doc.text(`ANO LECTIVO: ${schoolSettings?.academicYear || '2025/2026'}`, midX - 15, metaY);
        doc.text(`CLASSE: 13ª`, midX + 35, metaY);
        doc.text(`SALA Nº_____`, pageWidth - 55, metaY);
        doc.setFontSize(8);
        doc.text(`Cód: ${gerarCodigoPauta(schoolSettings?.academicYear || '2025/2026', '13')}`, pageWidth - 55, metaY + 3.5);

        // Grid table parameters
        const tableStartX = 15;
        const tableStartY = 65;
        const tableWidth = 267;
        const rowHeight = 8;
        const headerHeight1 = 9;
        const headerHeight2 = 7;

        const numColWidth = 10;
        const nameColWidth = 87;
        const colWidthM10 = 17;
        const colWidthM11 = 17;
        const colWidthM12 = 17;
        const colWidthMA = 18;
        const colWidthPAP = 18;
        const colWidthNEC = 18;
        const colWidthMF = 18;
        const colWidthObs = 47;

        // Draw Headers background
        doc.setFillColor(241, 245, 249);
        doc.rect(tableStartX, tableStartY, tableWidth, headerHeight1 + headerHeight2, 'F');

        // Draw Outline
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.rect(tableStartX, tableStartY, tableWidth, headerHeight1 + headerHeight2);

        // Header Rows text
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('Nº', tableStartX + (numColWidth / 2), tableStartY + 10, { align: 'center' });
        doc.text('Nome Completo', tableStartX + numColWidth + 3, tableStartY + 10);

        // Vertical lines for first headers
        doc.line(tableStartX + numColWidth, tableStartY, tableStartX + numColWidth, tableStartY + headerHeight1 + headerHeight2);
        doc.line(tableStartX + numColWidth + nameColWidth, tableStartY, tableStartX + numColWidth + nameColWidth, tableStartY + headerHeight1 + headerHeight2);

        // Médias por Classe spanning header
        const mediasSpanWidth = colWidthM10 + colWidthM11 + colWidthM12;
        const mediasStartX = tableStartX + numColWidth + nameColWidth;
        doc.text('Médias por Classe', mediasStartX + (mediasSpanWidth / 2), tableStartY + 6, { align: 'center' });
        doc.line(mediasStartX, tableStartY + headerHeight1, mediasStartX + mediasSpanWidth, tableStartY + headerHeight1);

        // Column lines inside Médias por Classe
        doc.setFontSize(7.5);
        doc.text('10ª', mediasStartX + (colWidthM10 / 2), tableStartY + headerHeight1 + 5, { align: 'center' });
        doc.line(mediasStartX + colWidthM10, tableStartY + headerHeight1, mediasStartX + colWidthM10, tableStartY + headerHeight1 + headerHeight2);
        
        doc.text('11ª', mediasStartX + colWidthM10 + (colWidthM11 / 2), tableStartY + headerHeight1 + 5, { align: 'center' });
        doc.line(mediasStartX + colWidthM10 + colWidthM11, tableStartY + headerHeight1, mediasStartX + colWidthM10 + colWidthM11, tableStartY + headerHeight1 + headerHeight2);

        doc.text('12ª', mediasStartX + colWidthM10 + colWidthM11 + (colWidthM12 / 2), tableStartY + headerHeight1 + 5, { align: 'center' });
        doc.line(mediasStartX + mediasSpanWidth, tableStartY, mediasStartX + mediasSpanWidth, tableStartY + headerHeight1 + headerHeight2);

        // Other Columns headers
        const maX = mediasStartX + mediasSpanWidth;
        doc.setFontSize(8.5);
        doc.text('MA', maX + (colWidthMA / 2), tableStartY + 10, { align: 'center' });
        doc.line(maX, tableStartY, maX, tableStartY + headerHeight1 + headerHeight2);

        const papX = maX + colWidthMA;
        doc.text('PAP', papX + (colWidthPAP / 2), tableStartY + 10, { align: 'center' });
        doc.line(papX, tableStartY, papX, tableStartY + headerHeight1 + headerHeight2);

        const necX = papX + colWidthPAP;
        doc.text('NEC', necX + (colWidthNEC / 2), tableStartY + 10, { align: 'center' });
        doc.line(necX, tableStartY, necX, tableStartY + headerHeight1 + headerHeight2);

        const mfX = necX + colWidthNEC;
        doc.text('MF', mfX + (colWidthMF / 2), tableStartY + 10, { align: 'center' });
        doc.line(mfX, tableStartY, mfX, tableStartY + headerHeight1 + headerHeight2);

        const obsX = mfX + colWidthMF;
        doc.text('Observação', obsX + (colWidthObs / 2), tableStartY + 10, { align: 'center' });
        doc.line(obsX, tableStartY, obsX, tableStartY + headerHeight1 + headerHeight2);

        // Draw rows
        let currentY = tableStartY + headerHeight1 + headerHeight2;

        let mascTotal = 0, mascAptos = 0, mascNAptos = 0;
        let femTotal = 0, femAptos = 0, femNAptos = 0;

        povoadoAlunos.forEach((student, rIdx) => {
          const analytics = calculateMetrics(student);
          const isApto = ['APTO', 'TRANSITA'].includes(analytics.status?.toUpperCase());

          // Accumulate stats
          if (student.gender === 'M') {
            mascTotal++;
            if (isApto) mascAptos++;
            else mascNAptos++;
          } else {
            femTotal++;
            if (isApto) femAptos++;
            else femNAptos++;
          }

          if (rIdx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(tableStartX, currentY, tableWidth, rowHeight, 'F');
          }

          doc.rect(tableStartX, currentY, tableWidth, rowHeight); // cell border

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          // Nº
          doc.text(String(rIdx + 1), tableStartX + (numColWidth / 2), currentY + 5.5, { align: 'center' });
          doc.line(tableStartX + numColWidth, currentY, tableStartX + numColWidth, currentY + rowHeight);

          // Name
          doc.setFont('Helvetica', 'bold');
          doc.text(student.name, tableStartX + numColWidth + 3, currentY + 5.5);
          doc.line(tableStartX + numColWidth + nameColWidth, currentY, tableStartX + numColWidth + nameColWidth, currentY + rowHeight);

          // 10, 11, 12 Médias
          doc.setFont('Helvetica', 'normal');
          const rowMediasX = tableStartX + numColWidth + nameColWidth;
          doc.text((analytics.avg10 ?? 0).toFixed(1), rowMediasX + (colWidthM10 / 2), currentY + 5.5, { align: 'center' });
          doc.line(rowMediasX + colWidthM10, currentY, rowMediasX + colWidthM10, currentY + rowHeight);

          doc.text((analytics.avg11 ?? 0).toFixed(1), rowMediasX + colWidthM10 + (colWidthM11 / 2), currentY + 5.5, { align: 'center' });
          doc.line(rowMediasX + colWidthM10 + colWidthM11, currentY, rowMediasX + colWidthM10 + colWidthM11, currentY + rowHeight);

          doc.text((analytics.avg12 ?? 0).toFixed(1), rowMediasX + colWidthM10 + colWidthM11 + (colWidthM12 / 2), currentY + 5.5, { align: 'center' });
          doc.line(rowMediasX + mediasSpanWidth, currentY, rowMediasX + mediasSpanWidth, currentY + rowHeight);

          // MA
          doc.text((analytics.MA ?? 0).toFixed(1), maX + (colWidthMA / 2), currentY + 5.5, { align: 'center' });
          doc.line(maX + colWidthMA, currentY, maX + colWidthMA, currentY + rowHeight);

          // PAP
          doc.text((analytics.pap ?? 0).toFixed(1), papX + (colWidthPAP / 2), currentY + 5.5, { align: 'center' });
          doc.line(papX + colWidthPAP, currentY, papX + colWidthPAP, currentY + rowHeight);

          // NEC
          doc.text((analytics.nec ?? 0).toFixed(1), necX + (colWidthNEC / 2), currentY + 5.5, { align: 'center' });
          doc.line(necX + colWidthNEC, currentY, necX + colWidthNEC, currentY + rowHeight);

          // MF
          doc.setFont('Helvetica', 'bold');
          doc.text(String(analytics.mfGlobal ?? 0), mfX + (colWidthMF / 2), currentY + 5.5, { align: 'center' });
          doc.line(mfX + colWidthMF, currentY, mfX + colWidthMF, currentY + rowHeight);

          // Observação
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(isApto ? 16 : 225, isApto ? 115 : 29, isApto ? 41 : 72);
          doc.text(analytics.status, obsX + (colWidthObs / 2), currentY + 5.5, { align: 'center' });
          doc.setTextColor(0, 0, 0); // reset color

          currentY += rowHeight;
        });

        // Bottom stats block (Vertical coordinates for A3 portrait)
        const bottomBlockY = 325;
        const statsBoxWidth = 84;
        doc.setFillColor(255, 255, 255);
        doc.setLineWidth(0.4);
        doc.rect(tableStartX, bottomBlockY, statsBoxWidth, 32, 'FD');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Informação Estatística', tableStartX + (statsBoxWidth / 2), bottomBlockY + 5, { align: 'center' });
        doc.line(tableStartX, bottomBlockY + 7, tableStartX + statsBoxWidth, bottomBlockY + 7);

        const isExameClass = false;
        const labelAprovados = isExameClass ? 'Aptos' : 'Transitas';
        const labelReprovados = isExameClass ? 'N/Aptos' : 'N/Transitas';

        const colGenX = tableStartX + 3;
        const colTotalX = tableStartX + 32;
        const colAprovX = tableStartX + 52;
        const colReprovX = tableStartX + 70;

        doc.text('Gênero', colGenX, bottomBlockY + 12);
        doc.text('Total', colTotalX, bottomBlockY + 12, { align: 'center' });
        doc.text(labelAprovados, colAprovX, bottomBlockY + 12, { align: 'center' });
        doc.text(labelReprovados, colReprovX, bottomBlockY + 12, { align: 'center' });
        doc.line(tableStartX, bottomBlockY + 14, tableStartX + statsBoxWidth, bottomBlockY + 14);

        doc.setFont('Helvetica', 'normal');
        doc.text('Masculino', colGenX, bottomBlockY + 20);
        doc.text(String(mascTotal), colTotalX, bottomBlockY + 20, { align: 'center' });
        doc.text(String(mascAptos), colAprovX, bottomBlockY + 20, { align: 'center' });
        doc.text(String(mascNAptos), colReprovX, bottomBlockY + 20, { align: 'center' });

        doc.text('Feminino', colGenX, bottomBlockY + 26);
        doc.text(String(femTotal), colTotalX, bottomBlockY + 26, { align: 'center' });
        doc.text(String(femAptos), colAprovX, bottomBlockY + 26, { align: 'center' });
        doc.text(String(femNAptos), colReprovX, bottomBlockY + 26, { align: 'center' });

        // Signatures (A3 Portrait coordinates)
        const sigStartX = 30;
        const sigWidth = 70;
        const sigSpacing = 15;

        // O Subdirector Pedagógico
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(schoolSettings?.subdirectorRoleLabel || 'O Subdirector Pedagógico', sigStartX + (sigWidth / 2), bottomBlockY + 8, { align: 'center' });
        doc.line(sigStartX, bottomBlockY + 25, sigStartX + sigWidth, bottomBlockY + 25);
        doc.setFontSize(7.5);
        doc.text(schoolSettings?.subdirectorName || 'Dr. Subdirector Pedagógico', sigStartX + (sigWidth / 2), bottomBlockY + 30, { align: 'center' });
        doc.text('________/__________/__________', sigStartX + (sigWidth / 2), bottomBlockY + 35, { align: 'center' });

        // O Director da Escola
        const x2 = sigStartX + sigWidth + sigSpacing;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(schoolSettings?.directorRoleLabel || 'O Director da Escola', x2 + (sigWidth / 2), bottomBlockY + 8, { align: 'center' });
        doc.line(x2, bottomBlockY + 25, x2 + sigWidth, bottomBlockY + 25);
        doc.setFontSize(7.5);
        doc.text(schoolSettings?.directorName || 'Dr. Director da Escola', x2 + (sigWidth / 2), bottomBlockY + 30, { align: 'center' });
        doc.text('________/__________/__________', x2 + (sigWidth / 2), bottomBlockY + 35, { align: 'center' });

        // O Secretário
        const x3 = x2 + sigWidth + sigSpacing;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(schoolSettings?.secretaryRoleLabel || 'O Secretário', x3 + (sigWidth / 2), bottomBlockY + 8, { align: 'center' });
        doc.line(x3, bottomBlockY + 25, x3 + sigWidth, bottomBlockY + 25);
        doc.setFontSize(7.5);
        doc.text(schoolSettings?.secretaryName || 'Sr. Secretário', x3 + (sigWidth / 2), bottomBlockY + 30, { align: 'center' });
        doc.text('________/__________/__________', x3 + (sigWidth / 2), bottomBlockY + 35, { align: 'center' });

        // Footer stamp
        const today = new Date();
        doc.setFontSize(6.5);
        doc.setFont('Helvetica', 'normal');
        doc.text(`SIGEP - Emitido digitalmente em: ${today.toLocaleDateString('pt-AO')} | Hash Autenticidade: SH-13EX-${activeSpecialty}-${currentSection}`, midX, 408, { align: 'center' });

        // Save PDF
        const fileName = `Pauta_Final_13Cl_${activeSpecialty}_Turma_${currentSection}.pdf`;
        doc.save(fileName);

        setAlertMsg(`✓ Pauta Oficial da 13ª Classe descarregada com sucesso.`);
        setTimeout(() => setAlertMsg(null), 4000);
      } catch (err) {
        console.error(err);
        setAlertMsg('Erro ao exportar PDF da 13ª classe. Verifique os dados.');
      } finally {
        setIsPdfGenerating(false);
      }
      return;
    }

    try {
      await generateOfficialPDFRegular();
      return;
    } catch (error) {
      console.error(error);
      setAlertMsg('Falha na geração do PDF: Erro de compilação da biblioteca jsPDF.');
    } finally {
      setIsPdfGenerating(false);
    }

    // Obsolete regular code bypassed
    if (false) {
      try {
        const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      const studentsPerPage = 26; // Fitting elegantly with our A3 page height
      const totalStudents = povoadoAlunos.length;
      const totalPages = Math.ceil(totalStudents / studentsPerPage);

      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const today = new Date();
      const dateText = `${schoolSettings?.municipality || 'Cafunfo'}, aos ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (pageNum > 1) {
          doc.addPage();
        }

        // DRAW EMBELLISHED SCHOOL HEADER (VBA official translation scaled for A3)
        const logoUrl = schoolSettings?.logoType === 'PUBLIC' ? schoolSettings?.publicLogoUrl : schoolSettings?.privateLogoUrl;
        if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
          try {
            let format = 'PNG';
            if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) {
              format = 'JPEG';
            } else if (logoUrl.includes('image/gif')) {
              format = 'GIF';
            }
            doc.addImage(logoUrl, format, 203, 6, 14, 14);
          } catch (err) {
            console.error('Error adding school logo to PDF:', err);
          }
        }

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);

        let hY3 = 25;
        if (schoolSettings?.headerLine1Active !== false) {
          doc.text((schoolSettings?.headerLine1 || 'REPÚBLICA DE ANGOLA').toUpperCase(), 210, hY3, { align: 'center' });
          hY3 += 4;
        }
        if (schoolSettings?.headerLine2Active !== false) {
          doc.text((schoolSettings?.headerLine2 || 'MINISTÉRIO DA EDUCAÇÃO').toUpperCase(), 210, hY3, { align: 'center' });
          hY3 += 4;
        }
        if (schoolSettings?.headerLine3Active !== false) {
          const provincialGov = schoolSettings?.headerLine3 || `GOVERNO PROVINCIAL DE ${String(schoolSettings?.province || 'LUANDA').toUpperCase()}`;
          doc.text(provincialGov.toUpperCase(), 210, hY3, { align: 'center' });
          hY3 += 4;
        }
        if (schoolSettings?.headerLine4Active !== false) {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9);
          const municipalityText = schoolSettings?.headerLine4 || `DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${String(schoolSettings?.municipality || 'MUNICIPIO').toUpperCase()}`;
          doc.text(municipalityText.toUpperCase(), 210, hY3, { align: 'center' });
          hY3 += 4;
        }

        // Highlighted School Title
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(30, 41, 59); // Indigo-slate
        const schoolTitle = String(schoolSettings?.schoolName || 'Complexo Escolar Nº 1709 LNO').toUpperCase();
        const schoolTitleY = hY3 + 1;
        doc.text(schoolTitle, 210, schoolTitleY, { align: 'center' });

        // Subtitle Document Title (separated by 11mm from school title)
        doc.setFontSize(12);
        doc.setFont('Helvetica', 'bold');
        const specialtyText = activeSpecialty ? ` - ESPECIALIDADE: ${getSpecialtyFullName(activeSpecialty).toUpperCase()}` : '';
        const titleY = schoolTitleY + 11;
        doc.text(`PAUTA FINAL${specialtyText}`, 210, titleY, { align: 'center' });

        // TABLE MATRIX LAYOUT DRAWING (A3 grid)
        const startY = 71;
        const metaY = startY - 6; // 65mm (6mm vertically above the grade table)

        // Meta info columns
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        
        doc.text(`Classe: ${currentClass}ª`, 18, metaY);
        doc.setFontSize(7.5);
        doc.text(`Cód: ${gerarCodigoPauta(schoolSettings?.academicYear || '2025/2026', currentClass)}`, 18, metaY + 3.5);
        doc.text(`Turma: ${currentSection}`, 90, metaY);
        doc.text(`Sala Nº_____`, 130, metaY);
        doc.text(`Período: Regular`, 180, metaY);
        doc.text(`Ano Lectivo: ${schoolSettings?.academicYear || '2025/2026'}`, 235, metaY);
        const colNoX = 15;
        const colIdX = 25;
        const colNameX = 45;
        const colGenX = 115;
        const colSubjectsStartX = 125;
        
        // Dynamic subject width allocation on A3
        const isExameClass = ['6', '9', '12'].includes(currentClass);
        const numSubjects = activeSubjects.length;
        const totalSubjectsWidth = 215; // mm available for subjects on A3
        const singleSubWidth = totalSubjectsWidth / numSubjects;
        const numSubdivisions = isExameClass ? 3 : 4;
        const subColWidth = singleSubWidth / numSubdivisions;

        const colMfX = 340;
        const colStatusX = 355;

        // Draw Table Header border lines
        doc.setFillColor(241, 245, 249); // light grey slate
        doc.rect(colNoX, startY, 390, 14, 'F');
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.rect(colNoX, startY, 390, 14, 'D');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);
        
        doc.text('N', colNoX + 2.5, startY + 9);
        doc.text('Matrícula', colIdX + 4, startY + 9);
        doc.text('Nome Completo do Aluno', colNameX + 3, startY + 9);
        doc.text('Gên', colGenX + 1.5, startY + 9);

        // Write Subjects names and subdivisions
        activeSubjects.forEach((sub, idx) => {
          const x = colSubjectsStartX + (idx * singleSubWidth);
          doc.setFontSize(8);
          doc.text(getSubjectAbbreviation(sub), x + (singleSubWidth / 2), startY + 5, { align: 'center' });
          
          // Draw horizontal line separating subject name from trimestral divisions
          doc.line(x, startY + 7, x + singleSubWidth, startY + 7);
          
          doc.setFontSize(5.5);
          doc.setFont('Helvetica', 'bold');
          
          if (isExameClass) {
            doc.text('MFD', x + (0.5 * subColWidth), startY + 11, { align: 'center' });
            doc.text('NE', x + (1.5 * subColWidth), startY + 11, { align: 'center' });
            doc.text('MF', x + (2.5 * subColWidth), startY + 11, { align: 'center' });

            // Draw interior vertical subdivision divider lines (2 lines)
            doc.line(x + subColWidth, startY + 7, x + subColWidth, startY + 14);
            doc.line(x + (2 * subColWidth), startY + 7, x + (2 * subColWidth), startY + 14);
          } else {
            doc.text('MT1', x + (0.5 * subColWidth), startY + 11, { align: 'center' });
            doc.text('MT2', x + (1.5 * subColWidth), startY + 11, { align: 'center' });
            doc.text('MT3', x + (2.5 * subColWidth), startY + 11, { align: 'center' });
            doc.text('MFD', x + (3.5 * subColWidth), startY + 11, { align: 'center' });

            // Draw interior vertical subdivision divider lines (3 lines)
            doc.line(x + subColWidth, startY + 7, x + subColWidth, startY + 14);
            doc.line(x + (2 * subColWidth), startY + 7, x + (2 * subColWidth), startY + 14);
            doc.line(x + (3 * subColWidth), startY + 7, x + (3 * subColWidth), startY + 14);
          }
          
          // Vert line separating subjects
          doc.line(x, startY, x, startY + 14);
        });

        doc.setFontSize(8.5);
        doc.text('MF', colMfX + 6.5, startY + 8, { align: 'center' });
        doc.text('Observação', colStatusX + 25, startY + 9, { align: 'center' });

        // Vertical boundary column lines
        doc.line(colIdX, startY, colIdX, startY + 14);
        doc.line(colNameX, startY, colNameX, startY + 14);
        doc.line(colGenX, startY, colGenX, startY + 14);
        doc.line(colSubjectsStartX, startY, colSubjectsStartX, startY + 14);
        doc.line(colMfX, startY, colMfX, startY + 14);
        doc.line(colStatusX, startY, colStatusX, startY + 14);

        // RENDER STUDENT ROW ENTRIES
        const sliceStart = (pageNum - 1) * studentsPerPage;
        const sliceEnd = Math.min(sliceStart + studentsPerPage, totalStudents);
        const pageStudents = povoadoAlunos.slice(sliceStart, sliceEnd);

        let currentY = startY + 14;

        pageStudents.forEach((student, localIdx) => {
          const globalIdx = sliceStart + localIdx + 1;
          const analytics = calculateMetrics(student);

          // Alternating row background for pristine design
          if (localIdx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(colNoX, currentY, 390, 7, 'F');
          }

          // Border bottom row
          doc.setDrawColor(210, 210, 210);
          doc.rect(colNoX, currentY, 390, 7, 'D');

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(50, 50, 50);

          doc.text(String(globalIdx), colNoX + 2.5, currentY + 5);
          
          doc.setFont('Courier', 'bold');
          doc.text(student.id, colIdX + 2, currentY + 5);
          
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(15, 23, 42); // Dark indigo-slate
          doc.text(student.name.substring(0, 36), colNameX + 2, currentY + 5);
          
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
                    doc.text(student.gender, colGenX + 3, currentY + 5);

          // Render each subject's MTs/MFD or MFD/NE/MF depending on exam status
          activeSubjects.forEach((sub, subIdx) => {
            const x = colSubjectsStartX + (subIdx * singleSubWidth);
            
            const mfdObj = analytics.subjectsMfd.find(s => s.subject === sub);
            const mfdVal = mfdObj ? mfdObj.mfd : 0;
            const neVal = mfdObj ? mfdObj.ne : null;
            const mfVal = mfdObj ? mfdObj.mf : 0;
            
            const passScore = classeNum >= 7 ? 10 : 5;

            doc.setFontSize(6.5);

            const isMfdBlank = mfdVal === null || mfdVal === undefined || isNaN(mfdVal);
            const isMfBlank = mfVal === null || mfVal === undefined || isNaN(mfVal);

            if (isExameClass) {
              // MFD (Média Final Disciplinar)
              if (isMfdBlank) {
                doc.setTextColor(80, 80, 80);
                doc.setFont('Helvetica', 'normal');
                doc.text('-', x + (0.5 * subColWidth), currentY + 5, { align: 'center' });
              } else {
                if (mfdVal < passScore) {
                  doc.setTextColor(185, 28, 28);
                  doc.setFont('Helvetica', 'bold');
                } else {
                  doc.setTextColor(80, 80, 80);
                  doc.setFont('Helvetica', 'normal');
                }
                doc.text(String(mfdVal), x + (0.5 * subColWidth), currentY + 5, { align: 'center' });
              }

              // NE (Nota de Exame)
              if (neVal !== null && neVal < passScore) doc.setTextColor(185, 28, 28);
              else doc.setTextColor(80, 80, 80);
              doc.setFont('Helvetica', 'normal');
              doc.text(neVal !== null ? String(neVal) : '-', x + (1.5 * subColWidth), currentY + 5, { align: 'center' });

              // MF (Média Final)
              if (isMfBlank) {
                doc.setTextColor(80, 80, 80);
                doc.setFont('Helvetica', 'normal');
                doc.text('-', x + (2.5 * subColWidth), currentY + 5, { align: 'center' });
              } else {
                if (mfVal < passScore) {
                  doc.setTextColor(185, 28, 28);
                  doc.setFont('Helvetica', 'bold');
                } else {
                  doc.setTextColor(15, 23, 42);
                  doc.setFont('Helvetica', 'bold');
                }
                doc.text(String(mfVal), x + (2.5 * subColWidth), currentY + 5, { align: 'center' });
              }

              // Draw inner subdivision borders (2 vertical dividers)
              doc.setFont('Helvetica', 'normal');
              doc.setDrawColor(220, 220, 220);
              doc.line(x + subColWidth, currentY, x + subColWidth, currentY + 7);
              doc.line(x + (2 * subColWidth), currentY, x + (2 * subColWidth), currentY + 7);

            } else {
              const mt1 = getGrade(student.id, sub, 'I');
              const mt2 = getGrade(student.id, sub, 'II');
              const mt3 = getGrade(student.id, sub, 'III');

              // MT1
              if (mt1 !== null && mt1 < passScore) doc.setTextColor(185, 28, 28);
              else doc.setTextColor(80, 80, 80);
              doc.text(mt1 !== null ? String(mt1) : '-', x + (0.5 * subColWidth), currentY + 5, { align: 'center' });

              // MT2
              if (mt2 !== null && mt2 < passScore) doc.setTextColor(185, 28, 28);
              else doc.setTextColor(80, 80, 80);
              doc.text(mt2 !== null ? String(mt2) : '-', x + (1.5 * subColWidth), currentY + 5, { align: 'center' });

              // MT3
              if (mt3 !== null && mt3 < passScore) doc.setTextColor(185, 28, 28);
              else doc.setTextColor(80, 80, 80);
              doc.text(mt3 !== null ? String(mt3) : '-', x + (2.5 * subColWidth), currentY + 5, { align: 'center' });

              // MFD
              if (isMfdBlank) {
                doc.setTextColor(80, 80, 80);
                doc.setFont('Helvetica', 'normal');
                doc.text('-', x + (3.5 * subColWidth), currentY + 5, { align: 'center' });
              } else {
                if (mfdVal < passScore) {
                  doc.setTextColor(185, 28, 28);
                  doc.setFont('Helvetica', 'bold');
                } else {
                  doc.setTextColor(15, 23, 42);
                  doc.setFont('Helvetica', 'bold');
                }
                doc.text(String(mfdVal), x + (3.5 * subColWidth), currentY + 5, { align: 'center' });
              }
              
              // Draw inner subdivision borders (3 vertical dividers)
              doc.setFont('Helvetica', 'normal');
              doc.setDrawColor(220, 220, 220);
              doc.line(x + subColWidth, currentY, x + subColWidth, currentY + 7);
              doc.line(x + (2 * subColWidth), currentY, x + (2 * subColWidth), currentY + 7);
              doc.line(x + (3 * subColWidth), currentY, x + (3 * subColWidth), currentY + 7);
            }

            // Vertical line dividing subjects
            doc.setDrawColor(210, 210, 210);
            doc.line(x, currentY, x, currentY + 7);
          });

          // Overall Global score (MF)
          doc.setFont('Helvetica', 'bold');
          const finalScorePass = classeNum >= 7 ? 10 : 5;
          if (analytics.mfGlobal === null || analytics.mfGlobal === undefined || isNaN(analytics.mfGlobal)) {
            doc.setTextColor(80, 80, 80);
            doc.text('-', colMfX + 6.5, currentY + 5, { align: 'center' });
          } else {
            if (analytics.mfGlobal < finalScorePass) {
              doc.setTextColor(185, 28, 28);
            } else {
              doc.setTextColor(16, 185, 129); // emerald 500
            }
            doc.text(String(analytics.mfGlobal), colMfX + 6.5, currentY + 5, { align: 'center' });
          }

          // Render status pill/box
          const upperStatus = String(analytics.status).toUpperCase();
          if (upperStatus === 'TRANSITA') {
            doc.setTextColor(4, 120, 87); // Green 700
            doc.text('TRANSITA', colStatusX + 25, currentY + 5, { align: 'center' });
          } else if (upperStatus === 'N/TRANSITA' || upperStatus === 'NÃO TRANSITA') {
            doc.setTextColor(185, 28, 28); // Red 700
            doc.text('NÃO TRANSITA', colStatusX + 25, currentY + 5, { align: 'center' });
          } else if (upperStatus === 'APTO') {
            doc.setTextColor(4, 120, 87); // Green 700
            doc.text('APTO', colStatusX + 25, currentY + 5, { align: 'center' });
          } else if (upperStatus === 'N/APTO' || upperStatus === 'NÃO APTO') {
            doc.setTextColor(185, 28, 28); // Red 700
            doc.text('N/APTO', colStatusX + 25, currentY + 5, { align: 'center' });
          } else if (upperStatus === 'REPROVADO') {
            doc.setTextColor(185, 28, 28); // Red 700
            doc.text('REPROVADO', colStatusX + 25, currentY + 5, { align: 'center' });
          } else {
            doc.setTextColor(100, 116, 139); // Slate 500
            doc.text(upperStatus, colStatusX + 25, currentY + 5, { align: 'center' });
          }

          // Vertical boundary columns lines
          doc.setDrawColor(200, 200, 200);
          doc.line(colIdX, currentY, colIdX, currentY + 7);
          doc.line(colNameX, currentY, colNameX, currentY + 7);
          doc.line(colGenX, currentY, colGenX, currentY + 7);
          doc.line(colSubjectsStartX, currentY, colSubjectsStartX, currentY + 7);
          doc.line(colMfX, currentY, colMfX, currentY + 7);
          doc.line(colStatusX, currentY, colStatusX, currentY + 7);

          currentY += 7;
        });

        // Add page numbering on bottom right
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${pageNum} de ${totalPages} • Emitido via SiGeP (Módulo Pauta Geral Final A3)`, 405, 290, { align: 'right' });

        // School Email and Address info at the bottom-right of every page
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 100, 100);
        const contactLine = `${schoolSettings?.schoolName || 'Complexo Escolar Nº 1709 LNO'}  |  Endereço: ${schoolSettings?.address || `${schoolSettings?.municipality || 'Cafunfo'}, ${schoolSettings?.province || 'Lunda-Norte'}`}  |  Tel: ${schoolSettings?.phone || '923 000 000'}  |  E-mail: ${schoolSettings?.email || 'geral@sigep.ao'}`;
        doc.text(contactLine, 15, 283, { align: 'left' });

        // --- DRAW SIGNATURE PANELS (Only on the very last page, as officially requested!) ---
        if (pageNum === totalPages) {
          doc.setFontSize(10);
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          
          doc.text(dateText, 15, currentY + 12, { align: 'left' });

          const sigY = currentY + 22;
          const lineLength = 75;

          // Column 1: Os Coordenadores (Left position)
          const coordinators = schoolSettings?.coordinators || [];
          const coord1 = coordinators[0] || 'Coordenador de Turno (Manhã)';
          const coord2 = coordinators[1] || 'Coordenador de Turno (Tarde)';
          const coord3 = coordinators[2] || 'Coordenador de Disciplina';

          doc.text('O Conselho', 15 + (lineLength / 2), sigY, { align: 'center' });
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          
          doc.line(15, sigY + 8, 15 + lineLength, sigY + 8);
          doc.text(coord1, 15 + (lineLength / 2), sigY + 12, { align: 'center' });

          doc.line(15, sigY + 20, 15 + lineLength, sigY + 20);
          doc.text(coord2, 15 + (lineLength / 2), sigY + 24, { align: 'center' });

          doc.line(15, sigY + 32, 15 + lineLength, sigY + 32);
          doc.text(coord3, 15 + (lineLength / 2), sigY + 36, { align: 'center' });

          // Column 2: Subdirector Pedagógico (Middle position)
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(schoolSettings?.subdirectorRoleLabel || 'O Subdirector Pedagógico', 165 + (lineLength / 2), sigY, { align: 'center' });
          doc.line(165, sigY + 10, 165 + lineLength, sigY + 10);
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(schoolSettings?.subdirectorName || 'Dr. Subdirector Pedagógico', 165 + (lineLength / 2), sigY + 15, { align: 'center' });

          // Column 3: Director Geral (Right position)
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(schoolSettings?.directorRoleLabel || 'O Director Geral', 315 + (lineLength / 2), sigY, { align: 'center' });
          doc.line(315, sigY + 10, 315 + lineLength, sigY + 10);
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(schoolSettings?.directorName || 'Dr. Director Geral', 315 + (lineLength / 2), sigY + 15, { align: 'center' });

          // Seals / Carimbos Space under Director Geral
          doc.setFontSize(8);
          doc.setFont('Helvetica', 'italic');
          doc.setTextColor(160, 160, 160);
          doc.text('( Selo em uso / Carimbo de Autenticidade )', 315 + (lineLength / 2), sigY + 25, { align: 'center' });
        }
      }

      // Save document
      const filename = `Pauta_Geral_Oficial_A3_${currentClass}a_Classe_Turma_${currentSection}_Ano2025_2026.pdf`;
      doc.save(filename);
      setAlertMsg(`✓ Documento de Pauta Oficial A3 gerado com sucesso! Guardado como "${filename}".`);
    } catch (error) {
      console.error(error);
      setAlertMsg('Falha na geração do PDF: Erro de compilação da biblioteca jsPDF.');
    } finally {
      setIsPdfGenerating(false);
    }
  }
};

  return (
    <div id="pauta-anual-sheet" className="space-y-6">
      
      {alertMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-4 flex items-start gap-3 animate-slideDown shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed flex-1">
            <span className="font-bold underline">Aviso do Sistema:</span> {alertMsg}
          </div>
          <button 
            type="button"
            onClick={() => setAlertMsg(null)} 
            className="text-rose-600 hover:text-rose-800 font-extrabold text-xs px-2 py-1 bg-white hover:bg-rose-100 rounded border border-rose-200 transition-colors cursor-pointer"
          >
            OK
          </button>
        </div>
      )}
      
      {/* Control Actions Panel */}
      <div className="flex flex-col lg:flex-row justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4 animate-slideDown">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute"></span>
            <h2 className="text-lg font-heading font-semibold text-slate-800 flex items-center gap-1.5 ml-3">
              PAUTA GERAL - NÍVEL {currentLevelNum}
              <span className="text-xs font-normal text-slate-400 font-sans ml-2">
                ({currentClass}ª • Turma {currentSection} • Rendimento Geral Anual)
              </span>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 ml-3">
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-lg border border-blue-100 flex items-center gap-1.5 shadow-3xs uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              {activeModality === 'ENSINO_PRIMARIO' ? 'Subsistema: Ensino Primário' : `Especialidade: ${getSpecialtyFullName(activeSpecialty || 'GERAL')}`}
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Painel consolidado de notas anuais (MT1, MT2, MT3) para cálculo de Média Final de Disciplina (MFD) e Média Final (MF). Rendimento oficial com trancagem regulamentar e impressões assinadas.
          </p>

          {shouldFilterForeignLanguage && (
            <div className="flex items-center gap-1 bg-indigo-50/60 p-1 rounded-xl border border-indigo-100/50 max-w-xs mt-3 animate-fadeIn">
              <button
                onClick={() => setSelectedForeignLanguage('INGLÊS')}
                className={`flex-1 py-1 px-3 text-[10px] font-extrabold rounded-lg transition-all ${
                  selectedForeignLanguage === 'INGLÊS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-650 hover:bg-indigo-100/40 hover:text-indigo-800'
                }`}
              >
                🇺🇸 LÍNGUA INGLESA
              </button>
              <button
                onClick={() => setSelectedForeignLanguage('FRANCÊS')}
                className={`flex-1 py-1 px-3 text-[10px] font-extrabold rounded-lg transition-all ${
                  selectedForeignLanguage === 'FRANCÊS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-650 hover:bg-indigo-100/40 hover:text-indigo-800'
                }`}
              >
                🇫🇷 LÍNGUA FRANCESA
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={generateOfficialPDF}
            disabled={isPdfGenerating || povoadoAlunos.length === 0}
            className={`flex items-center gap-1.5 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all border shadow-sm cursor-pointer ${
              povoadoAlunos.length === 0
                ? 'bg-slate-50 text-slate-350 border-slate-200 cursor-not-allowed'
                : 'bg-rose-600 border-rose-700 text-white hover:bg-rose-750'
            }`}
          >
            {isPdfGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                A Gerar Pauta...
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5 text-rose-200" />
                Imprimir Pauta Final (PDF)
              </>
            )}
          </button>

          <button
            id="vba-button-povoar"
            onClick={handlePovoar}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all border border-slate-200 focus:ring-2 focus:ring-slate-200 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
            Povoar Alunos
          </button>

          <button
            id="vba-button-consolidar"
            onClick={handleConsolidar}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs focus:ring-2 focus:ring-blue-100 cursor-pointer animate-pulse-delayed"
          >
            <RefreshCw className="w-3.5 h-3.5 text-white animate-spin-delayed" />
            Consolidar Pauta Geral
          </button>
        </div>
      </div>

      {lastCalculatedAt && (
        <div className="bg-emerald-50 border border-emerald-200/60 p-4 rounded-xl flex items-center gap-3 text-emerald-800 animate-slideUp">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">✓ Executado com Sucesso:</span> A Pauta Geral da <strong>{currentClass}ª Classe - Turma {currentSection}</strong> foi calculada e consolidada de acordo com as fórmulas do sistema em <span className="font-mono font-bold font-heading">{lastCalculatedAt}</span>.
          </div>
        </div>
      )}

      {povoadoAlunos.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-12 text-center md:p-16 flex flex-col items-center justify-center space-y-3">
          <FileText className="w-10 h-10 text-blue-500" />
          <h3 className="text-base font-semibold text-slate-800 font-heading">Pauta Geral Não Inicializada</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Clique em <strong className="text-slate-600">Povoar Alunos</strong> para carregar o nominal do rendimento anual desta classe e turma focais.
          </p>
          <button
            onClick={handlePovoar}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Povoar Alunos Agora
          </button>
        </div>
      ) : (
        <>
          {/* Painel da 13ª Classe (Magistério) */}
          {currentClass === '13' && (
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-lg space-y-6 animate-slideDown noprint">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <Settings className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-100">
                    Painel de Lançamento de Notas de PAP, Exame e Médias da 13ª Classe (Magistério)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configure os pesos para cálculo das fórmulas e lance de forma manual e individual as notas de PAP, NEC e médias das classes anteriores.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Lado Esquerdo: Configuração de Fórmulas */}
                <div className="space-y-4 bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800/60">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <h4 className="font-extrabold text-[10.5px] uppercase tracking-wider text-indigo-300">
                      🛠️ Configuração de Pesos da Fórmula
                    </h4>
                    {userRole === 'SUB_DIRECTOR_PEDAGOGICO' ? (
                      <span className="text-[8px] bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded text-emerald-400 font-extrabold uppercase animate-pulse">Acesso Liberado</span>
                    ) : (
                      <span className="text-[8px] bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded text-amber-400 font-extrabold uppercase font-mono">Modo de Leitura</span>
                    )}
                  </div>
                  
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Fórmula Oficial do Magistério: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300 font-bold">MF = (3 × MA + PAP + NEC) / 5</code>
                    <br />
                    <span className="text-[9.5px] text-slate-400">
                      Onde <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-200">MA = (Média10ª + Média11ª + Média12ª) / 3</code>. Os campos abaixo permitem ajustar parametricamente os pesos (<code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-200">PesoMA=3, PesoPAP=1, PesoNEC=1</code> totalizando soma de pesos = 5).
                    </span>
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Peso MA (Média Anual)</label>
                      <input
                        type="number"
                        disabled={userRole !== 'SUB_DIRECTOR_PEDAGOGICO'}
                        value={weights.weightMA}
                        onChange={(e) => setWeights(prev => ({ ...prev, weightMA: Math.max(1, parseFloat(e.target.value) || 1) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 text-center text-xs font-mono font-bold text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Peso PAP (Proj. Prof.)</label>
                      <input
                        type="number"
                        disabled={userRole !== 'SUB_DIRECTOR_PEDAGOGICO'}
                        value={weights.weightPAP}
                        onChange={(e) => setWeights(prev => ({ ...prev, weightPAP: Math.max(1, parseFloat(e.target.value) || 1) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 text-center text-xs font-mono font-bold text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Peso NEC (Combinada)</label>
                      <input
                        type="number"
                        disabled={userRole !== 'SUB_DIRECTOR_PEDAGOGICO'}
                        value={weights.weightNEC}
                        onChange={(e) => setWeights(prev => ({ ...prev, weightNEC: Math.max(1, parseFloat(e.target.value) || 1) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 text-center text-xs font-mono font-bold text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {userRole === 'SUB_DIRECTOR_PEDAGOGICO' && (
                    <button
                      onClick={() => handleSaveFormulaWeights(weights)}
                      className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold text-[9.5px] py-2 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
                    >
                      Gravar Alterações de Pesos de Fórmulas
                    </button>
                  )}
                </div>

                {/* Lado Direito: Lançamento Manual de Notas */}
                <div className="space-y-4 bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800/60">
                  <h4 className="font-extrabold text-[10.5px] uppercase tracking-wider text-indigo-300 border-b border-slate-850 pb-2">
                    ✍️ Lançamento de Notas do Estudante da 13ª Classe
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[8.5px] font-black text-slate-400 uppercase mb-1">Selecione o Estudante para Avaliação</label>
                      <select
                        value={selectedStudentId13}
                        onChange={(e) => setSelectedStudentId13(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                      >
                        <option value="">-- Escolha um Aluno da Turma --</option>
                        {povoadoAlunos.map(student => (
                          <option key={student.id} value={student.id}>
                            {student.id} - {student.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedStudentId13 && (
                      <div className="space-y-3.5 animate-fadeIn">
                        <div className="grid grid-cols-5 gap-2">
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5" title="Média da 10ª Classe">Média 10ª</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="20"
                              value={formAvg10}
                              onChange={(e) => setFormAvg10(Math.min(20, Math.max(0, parseFloat(e.target.value) || 0)))}
                              className="w-full bg-slate-900 border border-slate-800 rounded-md py-1 px-1 text-center text-xs font-mono font-bold text-white focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5" title="Média da 11ª Classe">Média 11ª</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="20"
                              value={formAvg11}
                              onChange={(e) => setFormAvg11(Math.min(20, Math.max(0, parseFloat(e.target.value) || 0)))}
                              className="w-full bg-slate-900 border border-slate-800 rounded-md py-1 px-1 text-center text-xs font-mono font-bold text-white focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5" title="Média da 12ª Classe">Média 12ª</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="20"
                              value={formAvg12}
                              onChange={(e) => setFormAvg12(Math.min(20, Math.max(0, parseFloat(e.target.value) || 0)))}
                              className="w-full bg-slate-900 border border-slate-800 rounded-md py-1 px-1 text-center text-xs font-mono font-bold text-white focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-black text-indigo-300 uppercase mb-0.5" title="Prova de Aptidão Profissional">PAP</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="20"
                              value={formPap}
                              onChange={(e) => setFormPap(Math.min(20, Math.max(0, parseFloat(e.target.value) || 0)))}
                              className="w-full bg-slate-900 border border-slate-850 rounded-md py-1 px-1 text-center text-xs font-mono font-bold text-indigo-300 focus:outline-hidden focus:border-indigo-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-black text-indigo-300 uppercase mb-0.5" title="Nota de Exame Combinada">Exame Comb.</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="20"
                              value={formNec}
                              onChange={(e) => setFormNec(Math.min(20, Math.max(0, parseFloat(e.target.value) || 0)))}
                              className="w-full bg-slate-900 border border-slate-850 rounded-md py-1 px-1 text-center text-xs font-mono font-bold text-indigo-300 focus:outline-hidden focus:border-indigo-400"
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleSaveStudent13Grades}
                          className="w-full bg-emerald-600 hover:bg-emerald-555 text-white font-extrabold text-[9.5px] py-2 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
                        >
                          ✓ Gravar Notas de Provas da 13ª Classe
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Painel de Lançamento de Notas de Exame para 6ª, 9ª e 12ª Classes */}
          {['6', '9', '12'].includes(currentClass) && (
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-lg space-y-6 animate-slideDown noprint">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <Settings className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-100">
                    Painel de Lançamento de Notas de Exame ({currentClass}ª Classe)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Lance as Notas de Exame (NE) das disciplinas para processamento da Média Final (MF) da disciplina.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Lado Esquerdo: Info da Fórmula */}
                <div className="space-y-4 bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800/60">
                  <h4 className="font-extrabold text-[10.5px] uppercase tracking-wider text-indigo-300 border-b border-slate-850 pb-2">
                    ℹ️ Diretrizes Curriculares (Fórmula do Exame)
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    De acordo com as normas vigentes para a <strong className="text-white">{currentClass}ª Classe</strong>:
                  </p>
                  <ul className="list-disc pl-4 text-[10.5px] text-slate-300 space-y-1">
                    <li>Fórmula de Cálculo da Disciplina: <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-200">MF = (0.6 * MFD) + (0.4 * NE)</code></li>
                    {currentClass === '6' ? (
                      <li>Critério de Aprovação: Média Final Global de Disciplina <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300">MF ≥ 5</code> (Escala 0-10)</li>
                    ) : (
                      <li>Critério de Aprovação: Média Final Global de Disciplina <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300">MF ≥ 10</code> (Escala 0-20)</li>
                    )}
                    <li>Os alunos com aproveitamento no exame são considerados <span className="text-emerald-400 font-extrabold">Apto</span>, caso contrário são <span className="text-rose-400 font-extrabold">N/Apto</span>.</li>
                  </ul>
                </div>

                {/* Lado Direito: Lançamento Manual de Notas de Exame */}
                <div className="space-y-4 bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800/60">
                  <h4 className="font-extrabold text-[10.5px] uppercase tracking-wider text-indigo-300 border-b border-slate-850 pb-2">
                    ✍️ Lançamento de Notas de Exame (NE)
                  </h4>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[8.5px] font-black text-slate-400 uppercase mb-1">Estudante</label>
                        <select
                          value={selectedExamStudentId}
                          onChange={(e) => {
                            setSelectedExamStudentId(e.target.value);
                            // Pre-fill exam grade if already exists
                            const currentVal = examGrades[e.target.value]?.[selectedExamSubject] ?? '';
                            setFormExamGrade(currentVal !== '' ? String(currentVal) : '');
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                        >
                          <option value="">-- Escolha --</option>
                          {povoadoAlunos.map(student => (
                            <option key={student.id} value={student.id}>
                              {student.id} - {student.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8.5px] font-black text-slate-400 uppercase mb-1">Disciplina</label>
                        <select
                          value={selectedExamSubject}
                          onChange={(e) => {
                            setSelectedExamSubject(e.target.value as SubjectType);
                            if (selectedExamStudentId) {
                              const currentVal = examGrades[selectedExamStudentId]?.[e.target.value] ?? '';
                              setFormExamGrade(currentVal !== '' ? String(currentVal) : '');
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                        >
                          {activeSubjects.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {selectedExamStudentId && (
                      <div className="space-y-3.5 animate-fadeIn">
                        <div>
                          <label className="block text-[8.5px] font-black text-slate-400 uppercase mb-1">
                            Nota de Exame (NE) (Máx: {currentClass === '6' ? '10' : '20'})
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: 14.5"
                            value={formExamGrade}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
                              setFormExamGrade(cleaned);
                            }}
                            className="w-full bg-slate-900 border border-slate-850 rounded-lg py-2 px-3 text-xs font-mono font-bold text-indigo-300 focus:outline-hidden focus:border-indigo-400"
                          />
                        </div>

                        <button
                          onClick={handleSaveExamGrade}
                          className="w-full bg-emerald-600 hover:bg-emerald-555 text-white font-extrabold text-[9.5px] py-2.5 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
                        >
                          ✓ Gravar Nota de Exame
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visual Dashboard and Best Student Highlight */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slideUp">
            {/* Comparative Bar Chart Card */}
            <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-heading font-bold text-slate-800">
                    Rendimento por Disciplina (Médias Finais)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Média das Notas Finais de Disciplina (MFD) de todos os alunos da turma selecionada.
                </p>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subjectAveragesData}
                    margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="subject" 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, classeNum >= 7 ? 20 : 10]}
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-lg border border-slate-800 text-xs font-sans">
                              <p className="font-bold">{data.fullSubject}</p>
                              <p className="text-indigo-200 mt-1">
                                Média da Turma: <span className="font-mono font-extrabold">{data['Média']}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="Média" 
                      fill="#4f46e5" 
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Best Student Highlight Card */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 rounded-3xl p-6 shadow-2xs flex flex-col justify-between relative overflow-hidden">
              {/* Decorative Crown background */}
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none select-none">
                <Crown className="w-48 h-48 text-amber-600" />
              </div>

              <div className="space-y-4 relative z-10 w-full">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-100 text-amber-700 p-2 rounded-xl border border-amber-200 shadow-3xs">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-heading font-extrabold text-amber-900">
                      Estudante de Excelência
                    </h3>
                    <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">
                      Melhor Aproveitamento (Top 80% Disciplinas)
                    </p>
                  </div>
                </div>

                {bestStudentInfo ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-amber-800 font-medium font-mono mb-0.5">
                        Nome Completo do Aluno
                      </div>
                      <div className="text-base font-heading font-extrabold text-slate-800 tracking-tight leading-tight">
                        {bestStudentInfo.student.name}
                      </div>
                      <div className="flex gap-4 mt-1.5 text-xs text-slate-600 font-medium">
                        <div>
                          ID: <span className="font-mono font-bold text-slate-700">{bestStudentInfo.student.id}</span>
                        </div>
                        <div>
                          Gênero: <span className="font-bold text-slate-700">{bestStudentInfo.student.gender === 'M' ? 'Masculino' : 'Feminino'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-amber-200/40">
                      <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-amber-200/30">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">
                          Média Geral (MF)
                        </div>
                        <div className="text-xl font-heading font-extrabold text-indigo-600 mt-0.5">
                          {bestStudentInfo.mfGlobal}
                          <span className="text-xs font-normal text-slate-400 font-sans ml-1">
                            / {classeNum >= 7 ? '20' : '10'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-amber-200/30">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">
                          Média Top 80%
                        </div>
                        <div className="text-xl font-heading font-extrabold text-amber-600 mt-0.5">
                          {bestStudentInfo.top80Avg.toFixed(1)}
                          <span className="text-xs font-normal text-slate-400 font-sans ml-1">
                            / {classeNum >= 7 ? '20' : '10'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-amber-800 font-bold uppercase tracking-wider mb-2">
                        Principais Disciplinas (Melhores Notas)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {bestStudentInfo.analytics.subjectsMfd
                          .sort((a, b) => b.mfd - a.mfd)
                          .slice(0, 4)
                          .map(sm => (
                            <span 
                              key={sm.subject}
                              className="inline-flex items-center gap-1 bg-white border border-amber-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-3xs"
                            >
                              <span className="truncate max-w-[80px]">{getSubjectAbbreviation(sm.subject)}</span>
                              <span className="text-amber-600 font-mono font-extrabold">{sm.mfd}</span>
                            </span>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-amber-700">
                    Nenhum aluno cadastrado ou avaliado nesta turma.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xs">
            {/* Header Excel banner info */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex justify-between items-center text-xs font-semibold text-slate-500 noprint">
              <div className="flex gap-4 font-mono items-center">
                <div>Código Pauta: <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">{gerarCodigoPauta(schoolSettings?.academicYear || '2025/2026', currentClass)}</span></div>
                <div>Classe: <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 text-xs font-bold">{currentClass}ª</span></div>
                <div>Turma: <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 text-xs font-bold">{currentSection}</span></div>
                <div>Sala Nº <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 text-xs font-bold">_____</span></div>
                {currentClass === '13' && <div>Subsistema: <span className="bg-indigo-150 text-indigo-800 px-1.5 py-0.5 rounded text-[10px] font-bold font-sans">MAGISTÉRIO DE ANGOLA</span></div>}
              </div>
              <div className="text-slate-400">Pauta Consolidada Real: Linhas 12 a {11 + povoadoAlunos.length}</div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              {currentClass === '13' ? (
                /* --- TABELA EXCLUSIVA DO MAGISTÉRIO (13ª CLASSE) --- */
                <table className="min-w-[1000px] w-full text-left border-collapse border-spacing-0">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold uppercase border-b border-slate-200">
                      <th className="py-3 px-3 border border-slate-200 text-center" rowSpan={2} style={{ width: '5ch', minWidth: '5ch' }}>Nº</th>
                      <th className="py-3 px-5 border border-slate-200" rowSpan={2}>Nome Completo</th>
                      <th className="py-2 px-3 border border-slate-200 text-center bg-slate-200/60" colSpan={3}>Médias por Classe</th>
                      <th className="py-3 px-3 border border-slate-200 text-center" rowSpan={2} style={{ width: '8ch', minWidth: '8ch' }}>MA</th>
                      <th className="py-3 px-3 border border-slate-200 text-center" rowSpan={2} style={{ width: '8ch', minWidth: '8ch' }}>PAP</th>
                      <th className="py-3 px-3 border border-slate-200 text-center" rowSpan={2} style={{ width: '8ch', minWidth: '8ch' }}>NEC</th>
                      <th className="py-3 px-3 border border-slate-200 text-center font-black" rowSpan={2} style={{ width: '8ch', minWidth: '8ch' }}>MF</th>
                      <th className="py-3 border border-slate-200 text-center" rowSpan={2} style={{ width: '16ch', minWidth: '16ch' }}>Observação</th>
                    </tr>
                    <tr className="bg-slate-50 text-slate-600 text-[10px] font-bold uppercase border-b border-slate-200">
                      <th className="py-1.5 px-2 border border-slate-200 text-center" style={{ width: '8ch', minWidth: '8ch' }}>10ª</th>
                      <th className="py-1.5 px-2 border border-slate-200 text-center" style={{ width: '8ch', minWidth: '8ch' }}>11ª</th>
                      <th className="py-1.5 px-2 border border-slate-200 text-center" style={{ width: '8ch', minWidth: '8ch' }}>12ª</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs">
                    {povoadoAlunos.map((student, rowIdx) => {
                      const analytics = calculateMetrics(student);
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono text-[11px] text-slate-400">{rowIdx + 1}</td>
                          <td className="py-2.5 px-5 border border-slate-200 font-semibold text-slate-850 truncate">{formatarNomePauta(student.name)}</td>
                          <td className="py-2.5 px-2 border border-slate-200 text-center font-mono text-slate-700 bg-slate-50/20">{analytics.avg10}</td>
                          <td className="py-2.5 px-2 border border-slate-200 text-center font-mono text-slate-700 bg-slate-50/20">{analytics.avg11}</td>
                          <td className="py-2.5 px-2 border border-slate-200 text-center font-mono text-slate-700 bg-slate-50/20">{analytics.avg12}</td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono font-bold text-indigo-700 bg-indigo-50/10">{analytics.MA}</td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono font-bold text-blue-700 bg-blue-50/20">{analytics.pap}</td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono font-bold text-blue-700 bg-blue-50/20">{analytics.nec}</td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono font-black text-slate-900 bg-indigo-100">{analytics.mfGlobal}</td>
                          <td className="py-2.5 border border-slate-200 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-sm px-2.5 py-0.5 text-[9.5px] font-black border uppercase tracking-wider truncate ${obterCorObservacaoClass(analytics.status)}`}>
                              {analytics.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                /* --- TABELA ORIGINAL (PARA OUTRAS CLASSES) --- */
                <table className="min-w-[1414px] w-full text-left border-collapse border-spacing-0">
                  <thead>
                    {/* Level 1 Header: Subject Names */}
                    <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
                      <th className="py-2.5 px-3 border border-slate-200 text-center text-[10px]" rowSpan={2} style={{ width: '5ch', minWidth: '5ch' }}>Nº</th>
                      <th className="py-2.5 px-3 border border-slate-200 text-center text-[10px]" rowSpan={2} style={{ width: '10ch', minWidth: '10ch' }}>Matrícula</th>
                      <th className="py-2.5 px-4 border border-slate-200" rowSpan={2} style={{ width: '30ch', minWidth: '30ch', maxWidth: '30ch' }}>Nome do Aluno</th>
                      <th className="py-2.5 px-2 border border-slate-200 text-center text-[10px]" rowSpan={2} style={{ width: '5ch', minWidth: '5ch' }}>Gên</th>
                      
                      {activeSubjects.map((sub, idx) => {
                        const isExameClass = ['6', '9', '12'].includes(currentClass);
                        return (
                          <th key={sub} className="py-1 px-2 border border-slate-200 text-center bg-slate-50" colSpan={isExameClass ? 3 : 4}>
                            <span className="text-[10px] font-extrabold tracking-wider truncate block max-w-[130px] mx-auto text-slate-800">
                              {getSubjectAbbreviation(sub)}
                            </span>
                          </th>
                        );
                      })}
                      
                      <th className="py-2.5 px-[6px] border-r border-t border-slate-200 text-center bg-blue-50/50 text-[8px]" rowSpan={2} style={{ width: '10ch', minWidth: '10ch', fontSize: '70%' }}>MF</th>
                      <th className="py-2.5 border-r border-t border-slate-200 text-center bg-blue-50/50 w-24 max-w-[96px]" rowSpan={2} style={{ width: '96px', minWidth: '96px', maxWidth: '96px' }}>Observação</th>
                    </tr>

                    {/* Level 2 Header: Trimester Subdivisions */}
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                      {activeSubjects.map((sub) => {
                        const isExameClass = ['6', '9', '12'].includes(currentClass);
                        return (
                          <React.Fragment key={`${sub}-sub`}>
                            {!isExameClass && (
                              <>
                                <th className="py-1 border border-slate-200 text-center text-[8px] font-mono font-semibold w-12 px-[6px]" style={{ fontSize: '70%' }}>MT1</th>
                                <th className="py-1 border border-slate-200 text-center text-[8px] font-mono font-semibold w-12 px-[6px]" style={{ fontSize: '70%' }}>MT2</th>
                                <th className="py-1 border border-slate-200 text-center text-[8px] font-mono font-semibold w-12 px-[6px]" style={{ fontSize: '70%' }}>MT3</th>
                              </>
                            )}
                            <th className="py-1 border border-slate-200 text-center text-[8px] font-bold text-slate-800 bg-slate-100 w-12 px-[6px]" style={{ fontSize: '70%' }}>MFD</th>
                            {isExameClass && (
                              <>
                                <th className="py-1 border border-slate-200 text-center text-[8px] font-mono font-bold text-blue-700 bg-blue-50 w-12 px-[6px]" style={{ fontSize: '70%' }}>NE</th>
                                <th className="py-1 border border-slate-200 text-center text-[8px] font-black text-slate-900 bg-indigo-100/70 w-12 px-[6px]" style={{ fontSize: '70%' }}>MF</th>
                              </>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 text-sm">
                    {povoadoAlunos.map((student, rowIdx) => {
                      const analytics = calculateMetrics(student);
                      const isBestStudent = bestStudentInfo && bestStudentInfo.student.id === student.id;
                      const isExameClass = ['6', '9', '12'].includes(currentClass);

                      return (
                        <tr key={student.id} className={`hover:bg-slate-50/60 transition-colors ${
                          isBestStudent ? 'bg-amber-50/20' : ''
                        }`}>
                          <td className="py-2 px-3 border border-slate-200 text-center font-mono text-xs text-slate-400" style={{ width: '5ch', minWidth: '5ch' }}>{rowIdx + 1}</td>
                          <td className="py-2 px-3 border border-slate-200 text-center font-mono text-xs font-semibold text-slate-500" style={{ width: '10ch', minWidth: '10ch' }}>{student.id}</td>
                          <td className={`py-2 px-4 border border-slate-200 font-medium text-xs truncate max-w-[200px] ${
                            isBestStudent ? 'text-amber-900 font-extrabold bg-amber-50/50' : 'text-slate-800'
                          }`} style={{ width: '30ch', minWidth: '30ch', maxWidth: '30ch' }}>
                            <div className="flex items-center gap-1.5 truncate">
                              {isBestStudent && (
                                <span className="inline-flex text-amber-500 font-extrabold text-sm" title="Melhor Aluno(a) da Turma">
                                  👑
                                </span>
                              )}
                              <span className="truncate">{formatarNomePauta(student.name)}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 border border-slate-200 text-center font-mono text-xs text-slate-500" style={{ width: '5ch', minWidth: '5ch' }}>{student.gender}</td>

                           {/* Grades columns */}
                          {activeSubjects.map((subject, subIdx) => {
                            const mfdObj = analytics.subjectsMfd.find(s => s.subject === subject);
                            const mfdValue = mfdObj && mfdObj.mfd !== null && mfdObj.mfd !== undefined ? Math.round(mfdObj.mfd) : null;
                            const neValue = mfdObj && (mfdObj as any).ne !== null && (mfdObj as any).ne !== undefined ? Math.round((mfdObj as any).ne) : null;
                            const finalMfValue = mfdObj && (mfdObj as any).mf !== null && (mfdObj as any).mf !== undefined ? Math.round((mfdObj as any).mf) : (mfdValue !== null ? Math.round(mfdValue) : null);
                            const colSeed = subIdx * 4;
                            const individualPassScore = classeNum >= 7 ? 10 : 5;

                            return (
                              <React.Fragment key={`${student.id}-${subject}-grades`}>
                                {!isExameClass && (
                                  <>
                                    {renderMtCell(student, subject, 'I', colSeed, rowIdx)}
                                    {renderMtCell(student, subject, 'II', colSeed + 1, rowIdx)}
                                    {renderMtCell(student, subject, 'III', colSeed + 2, rowIdx)}
                                  </>
                                )}
                                
                                <td className="border border-slate-200 w-12 text-center px-[6px] text-xs font-mono font-bold bg-slate-100">
                                  <NotaFormatada valor={mfdValue} escala={activeModality === 'ENSINO_PRIMARIO' ? 10 : 20} />
                                </td>

                                {isExameClass && (
                                  <>
                                    <td className="border border-slate-200 w-12 text-center px-[6px] text-xs font-mono font-bold bg-blue-50/40">
                                      <NotaFormatada valor={neValue} escala={activeModality === 'ENSINO_PRIMARIO' ? 10 : 20} />
                                    </td>
                                    <td className="border border-slate-200 w-12 text-center px-[6px] text-xs font-mono font-black bg-indigo-50">
                                      <NotaFormatada valor={finalMfValue} escala={activeModality === 'ENSINO_PRIMARIO' ? 10 : 20} />
                                    </td>
                                  </>
                                )}
                              </React.Fragment>
                            );
                          })}

                          {/* Final metrics columns */}
                          <td className="border border-slate-200 text-center font-mono text-xs font-extrabold bg-blue-50/30 text-slate-800 px-[6px]" style={{ width: '10ch', minWidth: '10ch' }}>
                            <NotaFormatada valor={analytics.mfGlobal} escala={activeModality === 'ENSINO_PRIMARIO' ? 10 : 20} />
                          </td>

                          <td className="border-r border-slate-200 py-1 px-1 text-center bg-blue-50/20 w-24 max-w-[96px] truncate" style={{ width: '96px', minWidth: '96px', maxWidth: '96px' }}>
                            <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-extrabold border uppercase tracking-wider truncate ${obterCorObservacaoClass(analytics.status)}`}>
                              {analytics.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Informações de e-mail e endereço debaixo da pauta no canto inferior direito */}
            {currentClass !== '13' && (
              <div className="px-6 py-4 flex flex-col items-end border-t border-slate-100 bg-slate-50/30">
                <div className="text-right text-[11px] text-slate-500 font-sans leading-relaxed">
                  <p className="font-bold text-slate-700">{schoolSettings?.schoolName || 'Complexo Escolar Nº 1709 LNO'}</p>
                  <p>Endereço: <span className="font-semibold text-slate-600">{schoolSettings?.address || `${schoolSettings?.municipality || 'Cafunfo'}, ${schoolSettings?.province || 'Lunda-Norte'}`}</span></p>
                  <p>Contacto: <span className="font-semibold text-slate-600">{schoolSettings?.phone || '923 000 000'}</span></p>
                  <p>E-mail: <span className="font-semibold text-slate-600">{schoolSettings?.email || 'geral@sigep.ao'}</span></p>
                </div>
              </div>
            )}

            <div className="p-4 bg-slate-50 text-slate-400 text-xs flex justify-between items-center sm:px-6">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 bg-indigo-150 border border-indigo-400 rounded-sm"></span>
                <span className="font-semibold text-slate-500">Controlo de Integridade: Esta Pauta Geral Anual serve apenas para visualização e impressão. Quaisquer alterações de notas devem ser efetuadas exclusivamente nas Mini-Pautas.</span>
              </div>
              <div className="font-mono text-[10px]">SiGeP Pauta 1 Core</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
