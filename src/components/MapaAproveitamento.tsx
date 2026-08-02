/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Student, GradeRow, SchoolSettings, Staff } from '../types';
import { 
  Printer, 
  Calendar, 
  TrendingUp, 
  Download, 
  Eye, 
  X, 
  Loader2, 
  FileSpreadsheet, 
  CheckCircle, 
  Award,
  Users
} from 'lucide-react';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface MapaAproveitamentoProps {
  students: Student[];
  grades: GradeRow[];
  settings?: SchoolSettings; // Optional override prop
}

const MapaAproveitamento: React.FC<MapaAproveitamentoProps> = ({ students, grades, settings: propSettings }) => {
  const { schoolSettings: contextSettings, subsystemInfo } = useSchoolSettings();
  const settings = propSettings || contextSettings;

  // 1. Tabela Estatística Reativa (Filtro por Trimestre com estado trimestreSelecionado)
  const [trimestreSelecionado, setTrimestreSelecionado] = useState<'I' | 'II' | 'III'>('I');
  
  // Estado de controle para a geração de PDF
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // 2. Classes Dinâmicas de acordo com o Subsistema activo do SIGEP
  const classes = useMemo(() => {
    return (subsystemInfo?.classes || ["10", "11", "12", "13"]).map(cls => `${cls}ª Classe`);
  }, [subsystemInfo]);

  // 3. Assinaturas Dinâmicas - Recursos Humanos do SIGEP (Fallback para SchoolSettings)
  const [staffList] = useState<Staff[]>(() => {
    try {
      const saved = localStorage.getItem('sigep_staff_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const directorName = useMemo(() => {
    const fromRH = staffList.find(s => s.role === 'DIRECTOR_GERAL');
    return fromRH?.name || settings?.directorName || 'Luís Watchimona';
  }, [staffList, settings]);

  const subdirectorName = useMemo(() => {
    const fromRH = staffList.find(s => s.role === 'SUB_DIRECTOR_PEDAGOGICO');
    return fromRH?.name || settings?.subdirectorName || 'Gaspar Da Fatima';
  }, [staffList, settings]);

  // Recuperação de Dados em Tempo Real (Fallbacks com LocalStorage)
  const currentStudents = useMemo(() => {
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

  const currentGrades = useMemo(() => {
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

  // Helper para correspondência flexível e estrita de Trimestre
  const isTrimesterMatch = (t1: any, t2: string) => {
    if (t1 === undefined || t1 === null) return false;
    const s1 = String(t1).trim().toUpperCase();
    const s2 = String(t2).trim().toUpperCase();
    if (s1 === s2) return true;
    if ((s1 === 'I' || s1 === '1' || s1 === '1º') && (s2 === 'I' || s2 === '1' || s2 === '1º')) return true;
    if ((s1 === 'II' || s1 === '2' || s1 === '2º') && (s2 === 'II' || s2 === '2' || s2 === '2º')) return true;
    if ((s1 === 'III' || s1 === '3' || s1 === '3º') && (s2 === 'III' || s2 === '3' || s2 === '3º')) return true;
    return false;
  };

  // Helper para identificar o trimestre de transferência ou desistência
  const getStudentEventTrimester = (student: Student, eventType: 'entrada' | 'saida' | 'desistencia', allGrades: GradeRow[]): 'I' | 'II' | 'III' => {
    const sAny = student as any;
    
    if (eventType === 'entrada') {
      if (sAny.trimestreEntrada) {
        const t = String(sAny.trimestreEntrada).toUpperCase();
        if (t.includes('III') || t.includes('3')) return 'III';
        if (t.includes('II') || t.includes('2')) return 'II';
        if (t.includes('I') || t.includes('1')) return 'I';
      }
      if (student.reconfirmationQuarter === 2) return 'II';
      if (student.reconfirmationQuarter === 3) return 'III';
      return 'I';
    }

    if (eventType === 'saida') {
      if (sAny.trimestreSaida) {
        const t = String(sAny.trimestreSaida).toUpperCase();
        if (t.includes('III') || t.includes('3')) return 'III';
        if (t.includes('II') || t.includes('2')) return 'II';
        if (t.includes('I') || t.includes('1')) return 'I';
      }
      if (student.dataTransferenciaSaida) {
        const d = String(student.dataTransferenciaSaida).toUpperCase();
        if (d.includes('III') || d.includes('3º') || d.includes('3ª')) return 'III';
        if (d.includes('II') || d.includes('2º') || d.includes('2ª')) return 'II';
        if (d.includes('I') || d.includes('1º') || d.includes('1ª')) return 'I';
      }
      if (student.reconfirmationQuarter === 2) return 'II';
      if (student.reconfirmationQuarter === 3) return 'III';
      if (student.reconfirmationQuarter === 1) return 'I';

      // Derivar via histórico de notas
      const studentGrades = allGrades.filter(g => g.studentId === student.id);
      const hasT1 = studentGrades.some(g => isTrimesterMatch(g.trimester, 'I') && g.mt !== null && g.mt !== undefined);
      const hasT2 = studentGrades.some(g => isTrimesterMatch(g.trimester, 'II') && g.mt !== null && g.mt !== undefined);
      if (hasT1 && hasT2) return 'III';
      if (hasT1) return 'II';
      return 'I';
    }

    // desistencia
    if (sAny.trimestreDesistencia) {
      const t = String(sAny.trimestreDesistencia).toUpperCase();
      if (t.includes('III') || t.includes('3')) return 'III';
      if (t.includes('II') || t.includes('2')) return 'II';
      if (t.includes('I') || t.includes('1')) return 'I';
    }
    if (student.reconfirmationQuarter === 2) return 'II';
    if (student.reconfirmationQuarter === 3) return 'III';
    if (student.reconfirmationQuarter === 1) return 'I';

    // Derivar via presença de notas por trimestre
    const studentGrades = allGrades.filter(g => g.studentId === student.id);
    const hasT1 = studentGrades.some(g => isTrimesterMatch(g.trimester, 'I') && g.mt !== null && g.mt !== undefined);
    const hasT2 = studentGrades.some(g => isTrimesterMatch(g.trimester, 'II') && g.mt !== null && g.mt !== undefined);
    const hasT3 = studentGrades.some(g => isTrimesterMatch(g.trimester, 'III') && g.mt !== null && g.mt !== undefined);

    if (hasT1 && hasT2 && !hasT3) return 'III';
    if (hasT1 && !hasT2 && !hasT3) return 'II';
    return 'I';
  };

  // Cálculo Dinâmico dos Dados Estatísticos filtrados por Trimestre Selecionado e Isolados por Subsistema
  const aproveitamentoData = useMemo(() => {
    let grandTotals = {
      turmas: 0,
      matriculadosMF: 0,
      matriculadosF: 0,
      aprovadosMF: 0,
      aprovadosF: 0,
      reprovadosMF: 0,
      reprovadosF: 0,
      entradaMF: 0,
      entradaF: 0,
      transferidosMF: 0,
      transferidosF: 0,
      saidaMF: 0,
      saidaF: 0,
      desistentesMF: 0,
      desistentesF: 0
    };

    const rows = classes.map(classeName => {
      const clsNum = classeName.split("ª")[0]; // "10", "11", "12", "13", "1", etc.
      
      // Filtrar alunos desta classe com correspondência robusta
      const classStudents = currentStudents.filter(s => {
        const sClean = String(s.class || '').replace(/\D/g, '');
        const targetClean = String(clsNum || '').replace(/\D/g, '');
        return sClean === targetClean || String(s.class || '').trim() === String(clsNum).trim();
      });
      const turmasList = Array.from(new Set(classStudents.map(s => s.section).filter(Boolean)));
      // Apenas turmas preenchidas com alunos activos são contabilizadas na estatística (DADO FIXO)
      const numTurmas = classStudents.length > 0 ? (turmasList.length || 1) : 0;

      // 1. Matriculados (DADO FIXO: não se altera conforme o trimestre)
      const matriculadosMF = classStudents.length;
      const matriculadosF = classStudents.filter(s => s.gender === 'F').length;

      // 2. Transferidos Entrada (Entradas) - DADO DINÂMICO CONFORME O TRIMESTRE
      const entradaStudents = classStudents.filter(s => {
        if (!s.isTransferidoEntrada) return false;
        const eventTri = getStudentEventTrimester(s, 'entrada', currentGrades);
        return isTrimesterMatch(eventTri, trimestreSelecionado);
      });
      const entradaMF = entradaStudents.length;
      const entradaF = entradaStudents.filter(s => s.gender === 'F').length;

      // 3. Transferidos Saída (Saídas) - DADO DINÂMICO CONFORME O TRIMESTRE
      const saidaStudents = classStudents.filter(s => {
        if (!s.isTransferidoSaida) return false;
        const eventTri = getStudentEventTrimester(s, 'saida', currentGrades);
        return isTrimesterMatch(eventTri, trimestreSelecionado);
      });
      const saidaMF = saidaStudents.length;
      const saidaF = saidaStudents.filter(s => s.gender === 'F').length;

      // 4. Desistentes - DADO DINÂMICO CONFORME O TRIMESTRE
      const desistenteStudents = classStudents.filter(s => {
        if (s.status !== 'Desistente' && s.status !== 'Inactivo') return false;
        const eventTri = getStudentEventTrimester(s, 'desistencia', currentGrades);
        return isTrimesterMatch(eventTri, trimestreSelecionado);
      });
      const desistentesMF = desistenteStudents.length;
      const desistentesF = desistenteStudents.filter(s => s.gender === 'F').length;

      // 5. Aprovados e Reprovados (Baseados nas pautas do Trimestre Selecionado) - DADO DINÂMICO CONFORME O TRIMESTRE
      let aprovadosMF = 0;
      let aprovadosF = 0;
      let reprovadosMF = 0;
      let reprovadosF = 0;

      classStudents.forEach(student => {
        // Se o aluno teve saída ou desistência em trimestre anterior, não é avaliado no trimestre posterior
        if (student.isTransferidoSaida) {
          const saidaTri = getStudentEventTrimester(student, 'saida', currentGrades);
          const triOrder = { 'I': 1, 'II': 2, 'III': 3 };
          if (triOrder[trimestreSelecionado] > triOrder[saidaTri]) return;
        }
        if (student.status === 'Desistente' || student.status === 'Inactivo') {
          const desistTri = getStudentEventTrimester(student, 'desistencia', currentGrades);
          const triOrder = { 'I': 1, 'II': 2, 'III': 3 };
          if (triOrder[trimestreSelecionado] > triOrder[desistTri]) return;
        }

        const studentGrades = currentGrades.filter(
          g => g.studentId === student.id && isTrimesterMatch(g.trimester, trimestreSelecionado)
        );
        if (studentGrades.length > 0) {
          // Média das notas lançadas especificamente no Trimestre Selecionado
          const validGrades = studentGrades.filter(g => g.mt !== null && g.mt !== undefined && !isNaN(Number(g.mt)));
          if (validGrades.length > 0) {
            const avg = validGrades.reduce((sum, current) => sum + Number(current.mt), 0) / validGrades.length;
            const classNum = parseInt(student.class, 10);
            const passMark = classNum >= 7 ? 10 : 5; // 7ª-13ª escala 20 (>=10), 1ª-6ª escala 10 (>=5)
            const isPass = avg >= passMark;
            if (isPass) {
              aprovadosMF++;
              if (student.gender === 'F') aprovadosF++;
            } else {
              reprovadosMF++;
              if (student.gender === 'F') reprovadosF++;
            }
          }
        }
      });

      // Transferidos Geral (Soma de Entrada + Saída)
      const transferidosMF = entradaMF + saidaMF;
      const transferidosF = entradaF + saidaF;

      // Acumular totais gerais
      grandTotals.turmas += numTurmas;
      grandTotals.matriculadosMF += matriculadosMF;
      grandTotals.matriculadosF += matriculadosF;
      grandTotals.aprovadosMF += aprovadosMF;
      grandTotals.aprovadosF += aprovadosF;
      grandTotals.reprovadosMF += reprovadosMF;
      grandTotals.reprovadosF += reprovadosF;
      grandTotals.entradaMF += entradaMF;
      grandTotals.entradaF += entradaF;
      grandTotals.transferidosMF += transferidosMF;
      grandTotals.transferidosF += transferidosF;
      grandTotals.saidaMF += saidaMF;
      grandTotals.saidaF += saidaF;
      grandTotals.desistentesMF += desistentesMF;
      grandTotals.desistentesF += desistentesF;

      return {
        classe: classeName,
        turmas: numTurmas,
        matriculadosMF,
        matriculadosF,
        aprovadosMF,
        aprovadosF,
        reprovadosMF,
        reprovadosF,
        entradaMF,
        entradaF,
        transferidosMF,
        transferidosF,
        saidaMF,
        saidaF,
        desistentesMF,
        desistentesF
      };
    });

    return { rows, totals: grandTotals };
  }, [currentStudents, currentGrades, trimestreSelecionado, classes]);

  // Função de Exportação Direta e Fiel para PDF (A4 - Paisagem)
  const exportToPDF = async () => {
    const element = document.getElementById('mapa-aproveitamento-live-preview');
    if (!element) {
      window.print();
      return;
    }
    
    setIsGeneratingPDF(true);
    try {
      const originalTransform = element.style.transform;
      element.style.transform = 'none';

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1600,
        width: Math.max(element.scrollWidth, 1200),
        onclone: (clonedDoc) => {
          const parseOklchToRgb = (str: string): string => {
            if (!str) return str;
            try {
              const match = str.match(/oklch\(\s*([\d.%]+)\s+([\d.%]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/i);
              if (!match) return 'rgba(0,0,0,0.1)';

              let l = parseFloat(match[1]);
              if (match[1].endsWith('%')) l = l / 100;
              let c = parseFloat(match[2]);
              if (match[2].endsWith('%')) c = (c / 100) * 0.4;
              let h = parseFloat(match[3]);
              let a = 1;
              if (match[4] !== undefined) {
                a = parseFloat(match[4]);
                if (match[4].endsWith('%')) a = a / 100;
              }

              const hRad = (h * Math.PI) / 180;
              const a_lab = c * Math.cos(hRad);
              const b_lab = c * Math.sin(hRad);

              const l_ = l + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
              const m_ = l - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
              const s_ = l - 0.0894841775 * a_lab - 1.2914855480 * b_lab;

              const l3 = l_ * l_ * l_;
              const m3 = m_ * m_ * m_;
              const s3 = s_ * s_ * s_;

              let rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
              let gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
              let bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

              const gamma = (x: number) => {
                x = Math.max(0, Math.min(1, x));
                return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
              };

              const r = Math.round(gamma(rLin) * 255);
              const g = Math.round(gamma(gLin) * 255);
              const b = Math.round(gamma(bLin) * 255);

              return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
            } catch {
              return 'rgba(0,0,0,0.1)';
            }
          };

          const parseOklabToRgb = (str: string): string => {
            if (!str) return str;
            try {
              const match = str.match(/oklab\(\s*([\d.%]+)\s+([-\d.%]+)\s+([-\d.%]+)(?:\s*\/\s*([\d.%]+))?\s*\)/i);
              if (!match) return 'rgba(0,0,0,0.1)';

              let l = parseFloat(match[1]);
              if (match[1].endsWith('%')) l = l / 100;
              let a_lab = parseFloat(match[2]);
              let b_lab = parseFloat(match[3]);
              let alpha = 1;
              if (match[4] !== undefined) {
                alpha = parseFloat(match[4]);
                if (match[4].endsWith('%')) alpha = alpha / 100;
              }

              const l_ = l + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
              const m_ = l - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
              const s_ = l - 0.0894841775 * a_lab - 1.2914855480 * b_lab;

              const l3 = l_ * l_ * l_;
              const m3 = m_ * m_ * m_;
              const s3 = s_ * s_ * s_;

              let rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
              let gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
              let bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

              const gamma = (x: number) => {
                x = Math.max(0, Math.min(1, x));
                return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
              };

              const r = Math.round(gamma(rLin) * 255);
              const g = Math.round(gamma(gLin) * 255);
              const b = Math.round(gamma(bLin) * 255);

              return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
            } catch {
              return 'rgba(0,0,0,0.1)';
            }
          };

          const sanitizeCssColors = (cssText: string): string => {
            if (!cssText) return cssText;
            let clean = cssText;
            if (clean.includes('oklch')) {
              clean = clean.replace(/oklch\([^)]+\)/gi, (m) => parseOklchToRgb(m));
            }
            if (clean.includes('oklab')) {
              clean = clean.replace(/oklab\([^)]+\)/gi, (m) => parseOklabToRgb(m));
            }
            if (/(?:color-mix|light-dark)/i.test(clean)) {
              clean = clean.replace(/(?:color-mix|light-dark)\([^)]+\)/gi, 'rgba(0,0,0,0.1)');
            }
            return clean;
          };

          // 1. Limpar e substituir cores não suportadas em todos os elementos <style>
          clonedDoc.querySelectorAll('style').forEach((s) => {
            if (s.innerHTML && /(oklch|oklab|color-mix|light-dark)/i.test(s.innerHTML)) {
              s.innerHTML = sanitizeCssColors(s.innerHTML);
            }
          });

          // 2. Sanitizar regras em styleSheets se acessíveis
          try {
            Array.from(clonedDoc.styleSheets).forEach((sheet) => {
              try {
                const rules = sheet.cssRules || sheet.rules;
                if (!rules) return;
                for (let i = rules.length - 1; i >= 0; i--) {
                  const rule = rules[i];
                  if (rule.cssText && /(oklch|oklab|color-mix|light-dark)/i.test(rule.cssText)) {
                    try {
                      const updatedText = sanitizeCssColors(rule.cssText);
                      sheet.deleteRule(i);
                      sheet.insertRule(updatedText, i);
                    } catch {
                      try { sheet.deleteRule(i); } catch {}
                    }
                  }
                }
              } catch {
                // Ignore cross-origin error
              }
            });
          } catch {
            // Ignore
          }

          // 3. Expandir contêiner alvo para capturar todas as colunas sem corte lateral
          const clonedTarget = clonedDoc.getElementById('mapa-aproveitamento-live-preview');
          if (clonedTarget) {
            clonedTarget.style.transform = 'none';
            clonedTarget.style.backgroundColor = '#ffffff';
            clonedTarget.style.width = '1200px';
            clonedTarget.style.maxWidth = 'none';
            clonedTarget.style.overflow = 'visible';

            clonedDoc.querySelectorAll('.overflow-x-auto, .overflow-hidden').forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.overflow = 'visible';
              htmlEl.style.maxWidth = 'none';
            });

            const computedWin = clonedDoc.defaultView || window;
            const allNodes = [clonedTarget, ...Array.from(clonedTarget.querySelectorAll('*'))] as HTMLElement[];

            allNodes.forEach((el) => {
              try {
                const computed = computedWin.getComputedStyle(el);
                const bg = computed.backgroundColor;
                const fg = computed.color;
                const bTop = computed.borderTopColor;
                const bBottom = computed.borderBottomColor;
                const bLeft = computed.borderLeftColor;
                const bRight = computed.borderRightColor;

                if (bg && /(oklch|oklab)/i.test(bg)) el.style.backgroundColor = sanitizeCssColors(bg);
                if (fg && /(oklch|oklab)/i.test(fg)) el.style.color = sanitizeCssColors(fg);
                if (bTop && /(oklch|oklab)/i.test(bTop)) el.style.borderTopColor = sanitizeCssColors(bTop);
                if (bBottom && /(oklch|oklab)/i.test(bBottom)) el.style.borderBottomColor = sanitizeCssColors(bBottom);
                if (bLeft && /(oklch|oklab)/i.test(bLeft)) el.style.borderLeftColor = sanitizeCssColors(bLeft);
                if (bRight && /(oklch|oklab)/i.test(bRight)) el.style.borderRightColor = sanitizeCssColors(bRight);

                if (el.tagName === 'TH' || el.tagName === 'TD') {
                  el.style.borderWidth = '1px';
                  el.style.borderStyle = 'solid';
                  el.style.verticalAlign = 'middle';
                  el.style.lineHeight = '1.2';
                  el.style.boxSizing = 'border-box';
                  if (!el.style.borderColor || /(oklch|oklab)/i.test(el.style.borderColor)) {
                    el.style.borderColor = '#cbd5e1';
                  }

                  const isLeftAligned = el.classList.contains('text-left') || el.style.textAlign === 'left';
                  if (isLeftAligned) {
                    el.style.textAlign = 'left';
                    el.style.paddingLeft = '8px';
                    el.style.paddingRight = '6px';
                    el.style.paddingTop = '6px';
                    el.style.paddingBottom = '6px';
                  } else {
                    el.style.textAlign = 'center';
                    el.style.paddingLeft = '4px';
                    el.style.paddingRight = '4px';
                    el.style.paddingTop = '6px';
                    el.style.paddingBottom = '6px';
                  }
                  if (el.textContent === 'MF' || el.textContent === 'F') {
                    el.style.fontSize = '9px';
                  }
                }
              } catch {
                // Ignorar
              }
            });

            // Ajuste estrito da tabela para garantir mesclagem e bordas limpas no PDF
            const tableElem = clonedTarget.querySelector('table');
            if (tableElem) {
              tableElem.style.borderCollapse = 'collapse';
              tableElem.style.width = '100%';
              tableElem.style.border = '1px solid #475569';
              
              const theadTrs = tableElem.querySelectorAll('thead tr');
              theadTrs.forEach((trNode) => {
                (trNode as HTMLElement).style.backgroundColor = 'transparent';
              });

              const allCells = tableElem.querySelectorAll('th, td');
              allCells.forEach((cellNode) => {
                const cell = cellNode as HTMLElement;
                cell.style.borderColor = '#475569';
                cell.style.borderStyle = 'solid';
                cell.style.borderWidth = '1px';
                cell.style.verticalAlign = 'middle';
                cell.style.boxSizing = 'border-box';
                if (cell.tagName === 'TH') {
                  cell.style.backgroundColor = '#f1f5f9';
                  cell.style.color = '#0f172a';
                  cell.style.fontWeight = 'bold';
                  cell.style.textAlign = 'center';
                }
              });
            }
          }
        }
      });

      element.style.transform = originalTransform;
      
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = 297;
      const pdfHeight = 210;
      const margin = 5;

      const printableWidth = pdfWidth - margin * 2;
      const printableHeight = pdfHeight - margin * 2;

      const canvasRatio = canvas.height / canvas.width;

      let renderWidth = printableWidth;
      let renderHeight = printableWidth * canvasRatio;

      if (renderHeight > printableHeight) {
        renderHeight = printableHeight;
        renderWidth = printableHeight / canvasRatio;
      }

      const xPos = (pdfWidth - renderWidth) / 2;
      const yPos = (pdfHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', xPos, yPos, renderWidth, renderHeight);
      pdf.save(`MAPA_APROVEITAMENTO_${trimestreSelecionado}_TRIMESTRE_${settings?.schoolName?.toUpperCase().replace(/[^A-Z0-9]/g, '_') || 'SIGEP'}.pdf`);
    } catch (error) {
      console.error('Erro na exportação para PDF, a abrir diálogo de impressão:', error);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Helper para data formatada por extenso (ex: "aos 30 de julho de 2026")
  const formattedExtensoDate = useMemo(() => {
    const now = new Date();
    const day = now.getDate();
    const monthNames = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    return `aos ${day} de ${month} de ${year}`;
  }, []);

  // Renderizador do Cabeçalho Institucional Oficial
  const renderHeader = () => {
    const insigniaUrl = settings?.logoType === 'PUBLIC' ? settings.publicLogoUrl || '🇦🇴' : settings.privateLogoUrl || '🎓';
    const hasImageInsignia = insigniaUrl.startsWith('data:') || insigniaUrl.startsWith('http');

    return (
      <div className="mb-8 font-sans">
        {/* Layout Flexbox de 3 Colunas com Separação Estrita e Alinhamento Centralizado do Visto */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 md:gap-10">
          {/* Assinatura / Visto do Director Geral (Centralizado na sua coluna) */}
          <div className="w-64 shrink-0 font-serif text-center space-y-1">
            <p className="font-extrabold uppercase text-slate-950 tracking-wider text-[11px] leading-tight">VISTO</p>
            <p className="font-bold uppercase text-slate-800 tracking-wider text-[10px] leading-tight">{settings?.directorRoleLabel || 'O DIRECTOR GERAL'}</p>
            <div className="pt-6 flex flex-col items-center">
              <div className="w-48 border-b-2 border-slate-950 mb-1.5"></div>
              <p className="font-black text-[11px] uppercase text-slate-950 tracking-wide">{directorName}</p>
            </div>
          </div>

          {/* Cabeçalho Centralizado com Distância Considerável do Visto */}
          <div className="flex-1 text-center space-y-1 font-sans px-4">
            {hasImageInsignia ? (
              <img
                src={insigniaUrl}
                alt="Insígnia da República"
                className="mx-auto w-14 h-14 rounded-full object-cover border-2 border-indigo-150 mb-2 shadow-xs"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="mx-auto w-14 h-14 border-2 border-indigo-200 bg-indigo-50/50 rounded-full flex items-center justify-center font-bold text-indigo-700 text-lg mb-2 shadow-inner">
                {insigniaUrl}
              </div>
            )}
            
            <h1 className="font-extrabold text-xl uppercase tracking-widest text-slate-900 leading-tight">República de Angola</h1>
            <h2 className="font-semibold text-xs uppercase tracking-wider text-slate-500">Ministério da Educação</h2>
            
            {/* Nome da Instituição Dinâmico */}
            <h2 className="font-black text-lg uppercase text-slate-900 tracking-tight mt-1 leading-snug">
              {settings?.schoolName || "COMPLEXO ESCOLAR Nº 1709 LNO, WATCHI-MONA"}
            </h2>
            
            {/* Localização Dinâmica (Município e Província) - Solto sem estilo de círculo/pílula */}
            <p className="text-xs font-bold uppercase tracking-widest text-slate-700 mt-1">
              {settings?.municipality && settings?.province 
                ? `${settings.municipality.toUpperCase()} - ${settings.province.toUpperCase()}`
                : "CUANGO - LUNDA NORTE"
              }
            </p>
          </div>

          {/* Coluna Espaçadora à direita para Manter Centralização Matemática Perfeita do Cabeçalho */}
          <div className="hidden md:block w-64 shrink-0"></div>
        </div>

        {/* Ano Letivo Dinâmico da Sessão Ativa - Solto sem retângulo/caixa */}
        <div className="text-center pt-5">
          <h3 className="uppercase font-extrabold text-xs text-slate-900 tracking-widest font-mono">
            MAPA DE APROVEITAMENTO DO {trimestreSelecionado}º TRIMESTRE - ANO LECTIVO {settings?.academicYear || '2025/2026'}
          </h3>
        </div>
      </div>
    );
  };

  // Renderizador da Tabela Estatística Reativa (Limpa, sem cores na grelha, cabeçalhos mesclados e 100% visíveis)
  const renderTable = () => {
    return (
      <div className="overflow-x-auto border border-slate-400 bg-white">
        <table className="w-full border-collapse text-xs text-center border border-slate-400" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            {/* Linha 1 */}
            <tr style={{ backgroundColor: 'transparent', color: '#0f172a', fontWeight: 'bold' }}>
              <th rowSpan={3} style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 'bold', verticalAlign: 'middle', textAlign: 'center', padding: '6px', width: '100px' }}>
                Classe
              </th>
              <th rowSpan={3} style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 'bold', verticalAlign: 'middle', textAlign: 'center', padding: '6px', width: '80px' }}>
                Nº Turmas
              </th>
              <th colSpan={2} rowSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 'bold', verticalAlign: 'middle', textAlign: 'center', padding: '6px' }}>
                Matriculados
              </th>
              <th colSpan={2} rowSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 'bold', verticalAlign: 'middle', textAlign: 'center', padding: '6px' }}>
                Aprovados
              </th>
              <th colSpan={2} rowSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 'bold', verticalAlign: 'middle', textAlign: 'center', padding: '6px' }}>
                Reprovados
              </th>
              <th colSpan={4} style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 'bold', verticalAlign: 'middle', textAlign: 'center', padding: '6px' }}>
                Movimento de Transferência
              </th>
              <th colSpan={2} rowSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 'bold', verticalAlign: 'middle', textAlign: 'center', padding: '6px' }}>
                Desistentes
              </th>
            </tr>

            {/* Linha 2 */}
            <tr style={{ backgroundColor: 'transparent', color: '#0f172a', fontWeight: 'bold' }}>
              <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 'bold', verticalAlign: 'middle', textAlign: 'center', padding: '6px' }}>
                Entradas
              </th>
              <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 'bold', verticalAlign: 'middle', textAlign: 'center', padding: '6px' }}>
                Saídas
              </th>
            </tr>

            {/* Linha 3 */}
            <tr style={{ backgroundColor: 'transparent', color: '#0f172a', fontWeight: 'bold' }}>
              {/* Matriculados */}
              <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px', textAlign: 'center', width: '35px', verticalAlign: 'middle' }}>MF</th>
              <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px', textAlign: 'center', width: '35px', verticalAlign: 'middle' }}>F</th>
              {/* Aprovados */}
              <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px', textAlign: 'center', width: '35px', verticalAlign: 'middle' }}>MF</th>
              <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px', textAlign: 'center', width: '35px', verticalAlign: 'middle' }}>F</th>
              {/* Reprovados */}
              <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px', textAlign: 'center', width: '35px', verticalAlign: 'middle' }}>MF</th>
              <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px', textAlign: 'center', width: '35px', verticalAlign: 'middle' }}>F</th>
              {/* Entradas */}
              <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px', textAlign: 'center', width: '35px', verticalAlign: 'middle' }}>MF</th>
              <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px', textAlign: 'center', width: '35px', verticalAlign: 'middle' }}>F</th>
              {/* Saídas */}
              <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px', textAlign: 'center', width: '35px', verticalAlign: 'middle' }}>MF</th>
              <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px', textAlign: 'center', width: '35px', verticalAlign: 'middle' }}>F</th>
              {/* Desistentes */}
              <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px', textAlign: 'center', width: '35px', verticalAlign: 'middle' }}>MF</th>
              <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px', textAlign: 'center', width: '35px', verticalAlign: 'middle' }}>F</th>
            </tr>
          </thead>
          <tbody className="font-mono text-slate-800">
            {aproveitamentoData.rows.map((row, index) => (
              <tr key={index}>
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'left', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#0f172a' }}>{row.classe}</td>
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', backgroundColor: '#ffffff', color: '#0f172a' }}>{row.turmas}</td>
                
                {/* Matriculados */}
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#0f172a' }}>{row.matriculadosMF || '-'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#be123c' }}>{row.matriculadosF || '-'}</td>
                
                {/* Aprovados */}
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#0f172a' }}>{row.aprovadosMF || '-'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#be123c' }}>{row.aprovadosF || '-'}</td>
                
                {/* Reprovados */}
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#0f172a' }}>{row.reprovadosMF || '-'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#be123c' }}>{row.reprovadosF || '-'}</td>
                
                {/* Entradas */}
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#0f172a' }}>{row.entradaMF || '-'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#be123c' }}>{row.entradaF || '-'}</td>
                
                {/* Saídas */}
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#0f172a' }}>{row.saidaMF || '-'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#be123c' }}>{row.saidaF || '-'}</td>
                
                {/* Desistentes */}
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', backgroundColor: '#ffffff', color: '#0f172a' }}>{row.desistentesMF || '-'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', backgroundColor: '#ffffff', color: '#be123c' }}>{row.desistentesF || '-'}</td>
              </tr>
            ))}

            {/* Total Geral */}
            <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold', color: '#0f172a' }}>
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'left', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#0f172a' }}>TOTAL GERAL</td>
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#0f172a' }}>{aproveitamentoData.totals.turmas}</td>
              
              {/* Matriculados Totais */}
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#0f172a' }}>{aproveitamentoData.totals.matriculadosMF}</td>
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#be123c' }}>{aproveitamentoData.totals.matriculadosF}</td>
              
              {/* Aprovados Totais */}
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#0f172a' }}>{aproveitamentoData.totals.aprovadosMF}</td>
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#be123c' }}>{aproveitamentoData.totals.aprovadosF}</td>
              
              {/* Reprovados Totais */}
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#0f172a' }}>{aproveitamentoData.totals.reprovadosMF}</td>
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#be123c' }}>{aproveitamentoData.totals.reprovadosF}</td>
              
              {/* Entradas Totais */}
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#0f172a' }}>{aproveitamentoData.totals.entradaMF}</td>
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#be123c' }}>{aproveitamentoData.totals.entradaF}</td>
              
              {/* Saídas Totais */}
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#0f172a' }}>{aproveitamentoData.totals.saidaMF}</td>
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#be123c' }}>{aproveitamentoData.totals.saidaF}</td>
              
              {/* Desistentes Totais */}
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#0f172a' }}>{aproveitamentoData.totals.desistentesMF}</td>
              <td style={{ border: '1px solid #475569', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#be123c' }}>{aproveitamentoData.totals.desistentesF}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Assinatura do Director Geral (Acima da tabela, lado superior esquerdo)
  const renderDirectorSignatureHeader = () => {
    return (
      <div className="flex justify-start mb-6 font-sans">
        <div className="text-left w-64 space-y-10">
          <p className="text-xs uppercase text-slate-500 font-bold tracking-wider">{settings?.directorRoleLabel || 'O Director Geral'}</p>
          <div className="border-t border-slate-900 pt-2">
            <p className="font-black text-sm text-slate-950">{directorName}</p>
          </div>
        </div>
      </div>
    );
  };

  // Assinatura do Subdirector Pedagógico (Abaixo da tabela, perfeitamente centrada ao meio)
  const renderSubdirectorSignatureFooter = () => {
    const municipalityName = settings?.municipality || "Cafunfo";

    return (
      <div className="mt-10 flex flex-col items-center gap-6 pt-6 border-t border-slate-200 font-sans">
        {/* Local e Data de Emissão ACIMA da Assinatura */}
        <div className="text-center text-xs font-semibold text-slate-800 tracking-wide">
          Direção da Escola em <span className="font-bold">{municipalityName}</span>, {formattedExtensoDate}
        </div>

        {/* Bloco de Assinatura do Subdirector Pedagógico */}
        <div className="text-center w-72 space-y-8">
          <p className="text-xs uppercase text-slate-600 font-extrabold tracking-wider">{settings?.subdirectorRoleLabel || 'SUBDIRECTOR PEDAGÓGICO'}</p>
          <div className="border-t-2 border-slate-950 pt-2">
            <p className="font-black text-sm text-slate-950 uppercase tracking-wide">{subdirectorName}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 sm:p-8 border border-slate-200 shadow-xl rounded-2xl max-w-6xl mx-auto space-y-6" id="mapa-aproveitamento-container">
      
      {/* Barra superior de controle */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Mapa de Aproveitamento Trimestral</h3>
            <p className="text-xs text-slate-500">Estatísticas reativas de rendimento académico de Angola.</p>
          </div>
        </div>

        {/* Abas superiores interativas de Trimestre */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mr-1.5">Trimestre:</span>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-2xs">
            {(['I', 'II', 'III'] as const).map((trim) => (
              <button
                key={trim}
                onClick={() => setTrimestreSelecionado(trim)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                  trimestreSelecionado === trim
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {trim}º Trimestre
              </button>
            ))}
          </div>
        </div>

        {/* Botões de Ação na barra superior */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToPDF}
            disabled={isGeneratingPDF}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white text-xs font-extrabold uppercase tracking-wider px-4 py-3 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-md shadow-emerald-200/50 hover:shadow-lg"
            id="btn-exportar-direto-pdf"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                A Gerar PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exportar PDF (A4)
              </>
            )}
          </button>

          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold uppercase tracking-wider px-4 py-3 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-md shadow-slate-200/50 hover:shadow-lg"
            id="btn-imprimir-direto"
          >
            <Printer className="w-4 h-4" />
            Imprimir (A4)
          </button>
        </div>
      </div>

      {/* Documento Principal Formatado em Folha Timbrada */}
      <div className="p-4 sm:p-6 bg-white text-slate-900 space-y-6" id="mapa-aproveitamento-live-preview">
        {renderHeader()}
        {renderTable()}
        {renderSubdirectorSignatureFooter()}

        {/* Rodapé Inferior com Texto de Sistema */}
        <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 italic text-center font-mono">
          * Dados dinâmicos extraídos do sistema acadômico em tempo real pelo SIGEP.
        </div>
      </div>
    </div>
  );
};

export default MapaAproveitamento;
