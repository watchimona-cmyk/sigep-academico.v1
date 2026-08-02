/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Student, SchoolSettings, Staff, GradeRow } from '../types';
import { 
  Download, 
  FileSpreadsheet, 
  Eye, 
  X, 
  Loader2, 
  Award,
  Users,
  Calendar,
  Layers,
  Printer
} from 'lucide-react';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import { AngolaCoatOfArms } from './AngolaCoatOfArms';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface EstatisticaFormativaProps {
  students: Student[];
  grades?: GradeRow[];
  settings?: SchoolSettings; // Optional override prop
}

const EstatisticaFormativa: React.FC<EstatisticaFormativaProps> = ({ 
  students, 
  grades = [], 
  settings: propSettings 
}) => {
  const { schoolSettings: contextSettings, activeSubsystem } = useSchoolSettings();
  const settings = propSettings || contextSettings;

  // Modos do Relatório: Dados Finais da Oferta Formativa (Oficial MED) ou Oferta Formativa Inicial (Vagas/Inscrições)
  const [reportTab, setReportTab] = useState<'DADOS_FINAIS' | 'OFERTA_INICIAL'>('DADOS_FINAIS');

  // A Oferta Formativa Inicial é EXCLUSIVA do Magistério (SECUNDARIO_PEDAGOGICO). Forçar Dados Finais para outros subsistemas.
  useEffect(() => {
    if (activeSubsystem !== 'SECUNDARIO_PEDAGOGICO' && reportTab === 'OFERTA_INICIAL') {
      setReportTab('DADOS_FINAIS');
    }
  }, [activeSubsystem, reportTab]);

  // Classe Seleccionada para a estatística
  const defaultClass = activeSubsystem === 'PRIMARIO_I_CICLO' ? '1' : '10';
  const [selectedClass, setSelectedClass] = useState<string>(defaultClass);

  // Estados para a geração de PDF
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Lista de RH para obter o nome do Diretor
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

  // Adaptação Dinâmica do Nome da 1ª Coluna e dos Itens ao Subsistema Ativo (MED Angola)
  const column1HeaderName = useMemo(() => {
    if (activeSubsystem === 'PRIMARIO_I_CICLO') {
      return 'Disciplinas';
    }
    return 'Especialidade';
  }, [activeSubsystem]);

  // Lista de itens/linhas adaptada ao subsistema
  const itemsList = useMemo(() => {
    if (activeSubsystem === 'PRIMARIO_I_CICLO') {
      return [
        { name: "Língua Portuguesa", code: "L. PORTUGUESA" },
        { name: "Matemática", code: "MATEMATICA" },
        { name: "Estudo do Meio", code: "EST. MEIO" },
        { name: "Ciências da Natureza", code: "CIENCIAS DA NATUREZA" },
        { name: "História", code: "HISTORIA" },
        { name: "Geografia", code: "GEOGRAFIA" },
        { name: "Educação Moral e Cívica", code: "ED. MORAL CIVICA" },
        { name: "Educação Visual e Plástica", code: "ED. VISUAL PLASTICA" },
        { name: "Educação Musical", code: "ED. MUSICAL" },
        { name: "Educação Física", code: "ED. FISICA" },
        { name: "Língua de Angola", code: "L. ANGOLA" },
        { name: "Língua Inglesa", code: "L. INGLESA" },
        { name: "Língua Francesa", code: "L. FRANCESA" }
      ];
    } else if (activeSubsystem === 'SECUNDARIO_GERAL') {
      return [
        { name: "Ciências Físicas e Biológicas", code: "CFB" },
        { name: "Ciências Económico-Jurídicas", code: "CEJ" },
        { name: "Ciências Sociais e Humanas", code: "CSH" },
        { name: "Artes Visuais", code: "AV" }
      ];
    } else { // SECUNDARIO_PEDAGOGICO / Magistério
      return [
        { name: "Matematica/Fisica", code: "MF" },
        { name: "História/Geografia", code: "GH" },
        { name: "Biologia/Química", code: "BQ" },
        { name: "Portugues/EMC", code: "LEMC" },
        { name: "Ingles/EMC", code: "ING_EMC" },
        { name: "Frances/EMC", code: "FRA_EMC" },
        { name: "Educação Visual e Plastica", code: "EVP" },
        { name: "Educação Fisica", code: "EDF" },
        { name: "Ed. Moral e Civica", code: "EMC" },
        { name: "Ensino Primário", code: "EP" },
        { name: "Ensino de Infacia", code: "PE" }
      ];
    }
  }, [activeSubsystem]);

  // Lista de Classes Válidas para Filtro
  const availableClasses = useMemo(() => {
    if (activeSubsystem === 'PRIMARIO_I_CICLO') {
      return ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    } else if (activeSubsystem === 'SECUNDARIO_GERAL') {
      return ['10', '11', '12'];
    } else {
      return ['10', '11', '12', '13'];
    }
  }, [activeSubsystem]);

  // Sincronizar classe seleccionada com o subsistema activo
  useEffect(() => {
    if (availableClasses.length > 0 && !availableClasses.includes(selectedClass)) {
      setSelectedClass(availableClasses[0]);
    }
  }, [activeSubsystem, availableClasses, selectedClass]);

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

  // Função centralizada para correspondência flexível e infalível de Especialidade / Curso
  const matchesSpecialty = (student: Student, itemCode: string, itemName: string): boolean => {
    const spec = (student.specialty || '').toUpperCase().trim();
    const code = itemCode.toUpperCase().trim();
    const name = itemName.toUpperCase().trim();

    // Correspondência direta por código ou nome completo
    if (spec && (spec === code || spec === name || spec.includes(code) || name.includes(spec))) {
      return true;
    }

    const cleanSpec = (spec || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Magistério / Secundário Pedagógico
    if (code === 'MF' && (cleanSpec.includes('MATEMATICA') || cleanSpec.includes('FISICA') || cleanSpec === 'MF')) return true;
    if (code === 'GH' && (cleanSpec.includes('HISTORIA') || cleanSpec.includes('GEOGRAFIA') || cleanSpec === 'GH')) return true;
    if (code === 'BQ' && (cleanSpec.includes('BIOLOGIA') || cleanSpec.includes('QUIMICA') || cleanSpec === 'BQ')) return true;
    if (code === 'LEMC' && (cleanSpec.includes('PORTUGUES') || cleanSpec.includes('LEMC') || cleanSpec.includes('PORTUGUESA'))) return true;
    if (code === 'ING_EMC' && (cleanSpec.includes('INGLES') || cleanSpec === 'ING_EMC')) return true;
    if (code === 'FRA_EMC' && (cleanSpec.includes('FRANCES') || cleanSpec === 'FRA_EMC')) return true;
    if (code === 'EVP' && (cleanSpec.includes('VISUAL') || cleanSpec.includes('PLASTICA') || cleanSpec === 'EVP')) return true;
    if (code === 'EDF' && (cleanSpec.includes('EDUCACAO FISICA') || cleanSpec.includes('ED. FISICA') || cleanSpec.includes('ED.FISICA') || cleanSpec === 'EDF')) return true;
    if (code === 'EMC' && (cleanSpec.includes('MORAL') || cleanSpec.includes('CIVICA') || cleanSpec === 'EMC')) return true;
    if (code === 'EP' && (cleanSpec.includes('PRIMARIO') || cleanSpec === 'EP')) return true;
    if (code === 'PE' && (cleanSpec.includes('INFANCIA') || cleanSpec.includes('PRE') || cleanSpec === 'PE' || cleanSpec === 'EI')) return true;

    // PUNIV / Secundário Geral
    if (code === 'CFB' && (cleanSpec.includes('FISICA') || cleanSpec.includes('BIOLOGICA') || cleanSpec === 'CFB')) return true;
    if (code === 'CEJ' && (cleanSpec.includes('ECONOMICO') || cleanSpec.includes('JURIDICA') || cleanSpec === 'CEJ')) return true;
    if ((code === 'CSH' || code === 'CS') && (cleanSpec.includes('SOCIAIS') || cleanSpec === 'CS' || cleanSpec === 'CSH')) return true;
    if (code === 'AV' && (cleanSpec.includes('ARTES') || cleanSpec.includes('VISUAIS') || cleanSpec === 'AV')) return true;

    // Fallback se aluno não tiver especialidade preenchida ou for "GERAL"
    if (!spec || spec === 'GERAL' || spec === 'ENSINO GERAL' || spec === 'N/A') {
      if (code === 'MF' || code === 'EP' || code === 'CFB') return true;
    }

    return false;
  };

  // Mapeamento de Médias/Aproveitamento dos Alunos por ID
  const studentGradesMap = useMemo(() => {
    const map = new Map<string, { average: number; passMark: number; approved: boolean }>();
    
    // Agrupar pautas por aluno
    const gradesByStudent = new Map<string, GradeRow[]>();
    currentGrades.forEach(g => {
      if (!gradesByStudent.has(g.studentId)) {
        gradesByStudent.set(g.studentId, []);
      }
      gradesByStudent.get(g.studentId)?.push(g);
    });

    currentStudents.forEach(s => {
      const sGrades = gradesByStudent.get(s.id) || [];
      if (sGrades.length > 0) {
        const sumMT = sGrades.reduce((acc, curr) => acc + (curr.mt || 0), 0);
        const avg = sumMT / sGrades.length;
        const passMark = parseInt(s.class, 10) >= 10 ? 10 : 5;
        map.set(s.id, {
          average: avg,
          passMark,
          approved: avg >= passMark
        });
      }
    });

    return map;
  }, [currentGrades, currentStudents]);

  // Métricas do Relatório "Dados Finais da Oferta Formativa" por Item/Curso/Disciplina
  const dadosFinaisStats = useMemo(() => {
    return itemsList.map(item => {
      // Filtrar alunos pertencentes à classe seleccionada e ao item
      const itemStudents = currentStudents.filter(s => {
        if (selectedClass) {
          const sClean = String(s.class || '').replace(/\D/g, '');
          const selClean = String(selectedClass || '').replace(/\D/g, '');
          if (sClean !== selClean && String(s.class || '').trim() !== String(selectedClass).trim()) {
            return false;
          }
        }

        if (activeSubsystem === 'PRIMARIO_I_CICLO') {
          return true;
        }

        return matchesSpecialty(s, item.code, item.name);
      });

      // 1. Matriculados
      const mat_MF = itemStudents.length;
      const mat_F = itemStudents.filter(s => s.gender === 'F').length;

      // 2. Vindos Transferidos (Entrada)
      const vindos_MF = itemStudents.filter(s => s.isTransferidoEntrada).length;
      const vindos_F = itemStudents.filter(s => s.isTransferidoEntrada && s.gender === 'F').length;

      // 3. Transferido p/ outras Escolas (Saída)
      const transOutras_MF = itemStudents.filter(s => s.isTransferidoSaida).length;
      const transOutras_F = itemStudents.filter(s => s.isTransferidoSaida && s.gender === 'F').length;

      // 4. Desistentes
      const desistentes_MF = itemStudents.filter(s => (s.status as string) === 'Desistente' || (s.status as string) === 'Inactivo').length;
      const desistentes_F = itemStudents.filter(s => ((s.status as string) === 'Desistente' || (s.status as string) === 'Inactivo') && s.gender === 'F').length;

      // 5. Nº Actual de Alunos (Ativos)
      const actual_MF = itemStudents.filter(s => !s.isTransferidoSaida && (s.status as string) !== 'Desistente' && (s.status as string) !== 'Inactivo').length;
      const actual_F = itemStudents.filter(s => !s.isTransferidoSaida && (s.status as string) !== 'Desistente' && (s.status as string) !== 'Inactivo' && s.gender === 'F').length;

      // 6. Reprovados & 7. Aprovados (baseado nas pautas e avaliações)
      let reprovados_MF = 0;
      let reprovados_F = 0;
      let aprovados_MF = 0;
      let aprovados_F = 0;

      itemStudents.forEach(s => {
        if (s.isTransferidoSaida || (s.status as string) === 'Desistente' || (s.status as string) === 'Inactivo') return;

        const gradeInfo = studentGradesMap.get(s.id);
        if (gradeInfo) {
          if (gradeInfo.approved) {
            aprovados_MF++;
            if (s.gender === 'F') aprovados_F++;
          } else {
            reprovados_MF++;
            if (s.gender === 'F') reprovados_F++;
          }
        } else {
          // Se não houver notas registadas ainda, conta como ativo com aproveitamento em curso (aprovado condicional)
          aprovados_MF++;
          if (s.gender === 'F') aprovados_F++;
        }
      });

      return {
        name: item.name,
        code: item.code,
        mat_MF, mat_F,
        vindos_MF, vindos_F,
        transOutras_MF, transOutras_F,
        desistentes_MF, desistentes_F,
        actual_MF, actual_F,
        reprovados_MF, reprovados_F,
        aprovados_MF, aprovados_F
      };
    });
  }, [itemsList, currentStudents, selectedClass, activeSubsystem, studentGradesMap]);

  // Totais Agregados para a Tabela de Dados Finais
  const dadosFinaisTotals = useMemo(() => {
    return dadosFinaisStats.reduce((acc, cur) => ({
      mat_MF: acc.mat_MF + cur.mat_MF,
      mat_F: acc.mat_F + cur.mat_F,
      vindos_MF: acc.vindos_MF + cur.vindos_MF,
      vindos_F: acc.vindos_F + cur.vindos_F,
      transOutras_MF: acc.transOutras_MF + cur.transOutras_MF,
      transOutras_F: acc.transOutras_F + cur.transOutras_F,
      desistentes_MF: acc.desistentes_MF + cur.desistentes_MF,
      desistentes_F: acc.desistentes_F + cur.desistentes_F,
      actual_MF: acc.actual_MF + cur.actual_MF,
      actual_F: acc.actual_F + cur.actual_F,
      reprovados_MF: acc.reprovados_MF + cur.reprovados_MF,
      reprovados_F: acc.reprovados_F + cur.reprovados_F,
      aprovados_MF: acc.aprovados_MF + cur.aprovados_MF,
      aprovados_F: acc.aprovados_F + cur.aprovados_F,
    }), {
      mat_MF: 0, mat_F: 0,
      vindos_MF: 0, vindos_F: 0,
      transOutras_MF: 0, transOutras_F: 0,
      desistentes_MF: 0, desistentes_F: 0,
      actual_MF: 0, actual_F: 0,
      reprovados_MF: 0, reprovados_F: 0,
      aprovados_MF: 0, aprovados_F: 0,
    });
  }, [dadosFinaisStats]);

  // Estatística da Oferta Formativa Inicial (Vagas/Inscrições)
  const statsOfertaInicial = useMemo(() => {
    return itemsList.map(row => {
      const alunosCurso = currentStudents.filter(s => {
        if (activeSubsystem === 'PRIMARIO_I_CICLO') return true;
        return matchesSpecialty(s, row.code, row.name);
      });

      const alunos10 = alunosCurso.filter(s => s.class === (activeSubsystem === 'PRIMARIO_I_CICLO' ? '1' : '10'));
      const alunos11 = alunosCurso.filter(s => s.class === (activeSubsystem === 'PRIMARIO_I_CICLO' ? '2' : '11'));
      const alunos12 = alunosCurso.filter(s => s.class === (activeSubsystem === 'PRIMARIO_I_CICLO' ? '3' : '12'));
      const alunos13 = alunosCurso.filter(s => s.class === '13');

      const mat1_MF = alunos10.filter(s => s.enrollmentType !== 'Interno' && !s.isTransferidoEntrada).length;
      const mat1_F = alunos10.filter(s => s.enrollmentType !== 'Interno' && !s.isTransferidoEntrada && s.gender === 'F').length;

      const rep10_MF = alunos10.filter(s => s.enrollmentType === 'Interno').length;
      const rep10_F = alunos10.filter(s => s.enrollmentType === 'Interno' && s.gender === 'F').length;

      const tot10_MF = mat1_MF + rep10_MF;
      const tot10_F = mat1_F + rep10_F;

      const tot11_MF = alunos11.length;
      const tot11_F = alunos11.filter(s => s.gender === 'F').length;

      const tot12_MF = alunos12.length;
      const tot12_F = alunos12.filter(s => s.gender === 'F').length;

      const tot13_MF = alunos13.length;
      const tot13_F = alunos13.filter(s => s.gender === 'F').length;

      const sectionsEntry = new Set(alunos10.map(s => s.section).filter(Boolean));
      const numTurmasEntry = alunos10.length > 0 ? (sectionsEntry.size || 1) : 0;
      const vagas = numTurmasEntry * 75;
      const inscritos = mat1_MF;

      return {
        name: row.name,
        vagas, inscritos,
        mat1_MF, mat1_F,
        rep10_MF, rep10_F,
        tot10_MF, tot10_F,
        tot11_MF, tot11_F,
        tot12_MF, tot12_F,
        tot13_MF, tot13_F
      };
    });
  }, [itemsList, currentStudents, activeSubsystem]);

  const totalsOfertaInicial = useMemo(() => {
    return statsOfertaInicial.reduce((acc, cur) => ({
      vagas: acc.vagas + cur.vagas,
      inscritos: acc.inscritos + cur.inscritos,
      mat1_MF: acc.mat1_MF + cur.mat1_MF,
      mat1_F: acc.mat1_F + cur.mat1_F,
      rep10_MF: acc.rep10_MF + cur.rep10_MF,
      rep10_F: acc.rep10_F + cur.rep10_F,
      tot10_MF: acc.tot10_MF + cur.tot10_MF,
      tot10_F: acc.tot10_F + cur.tot10_F,
      tot11_MF: acc.tot11_MF + cur.tot11_MF,
      tot11_F: acc.tot11_F + cur.tot11_F,
      tot12_MF: acc.tot12_MF + cur.tot12_MF,
      tot12_F: acc.tot12_F + cur.tot12_F,
      tot13_MF: acc.tot13_MF + cur.tot13_MF,
      tot13_F: acc.tot13_F + cur.tot13_F,
    }), {
      vagas: 0, inscritos: 0,
      mat1_MF: 0, mat1_F: 0,
      rep10_MF: 0, rep10_F: 0,
      tot10_MF: 0, tot10_F: 0,
      tot11_MF: 0, tot11_F: 0,
      tot12_MF: 0, tot12_F: 0,
      tot13_MF: 0, tot13_F: 0
    });
  }, [statsOfertaInicial]);

  // Função de Exportação Direta e Fiel para PDF (A4 - Paisagem)
  const exportToPDF = async () => {
    const element = document.getElementById('oferta-formativa-live-preview');
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
        width: Math.max(element.scrollWidth, 1250),
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

          // 1. Limpar e substituir oklch/oklab em todos os elementos <style>
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

          // 3. Expandir o contêiner clonado para capturar 100% das colunas sem cortes e sem bordas/molduras externas
          const clonedTarget = clonedDoc.getElementById('oferta-formativa-live-preview');
          if (clonedTarget) {
            clonedTarget.style.transform = 'none';
            clonedTarget.style.backgroundColor = '#ffffff';
            clonedTarget.style.width = '1250px';
            clonedTarget.style.maxWidth = 'none';
            clonedTarget.style.overflow = 'visible';
            clonedTarget.style.border = 'none';
            clonedTarget.style.boxShadow = 'none';
            clonedTarget.style.outline = 'none';

            if (clonedTarget.parentElement) {
              clonedTarget.parentElement.style.border = 'none';
              clonedTarget.parentElement.style.boxShadow = 'none';
            }

            clonedDoc.querySelectorAll('.overflow-x-auto, .overflow-hidden').forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.overflow = 'visible';
              htmlEl.style.maxWidth = 'none';
              htmlEl.style.border = 'none';
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

            const tableElem = clonedTarget.querySelector('table');
            if (tableElem) {
              const theadTrs = tableElem.querySelectorAll('thead tr');
              theadTrs.forEach((trNode) => {
                (trNode as HTMLElement).style.backgroundColor = 'transparent';
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
      const margin = 5; // 5mm de margem operacional

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
      pdf.save(`OFERTA_FORMATIVA_${reportTab}_${selectedClass ? selectedClass + 'CLASSE_' : ''}${settings?.schoolName?.toUpperCase().replace(/[^A-Z0-9]/g, '_') || 'SIGEP'}.pdf`);
    } catch (error) {
      console.error('Erro na exportação para PDF, a abrir diálogo de impressão:', error);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Formatação de Data por Extenso para o Rodapé Oficial
  const formattedDate = useMemo(() => {
    const today = new Date();
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}`;
  }, []);

  // Renderizador do Cabeçalho para Dados Finais
  const renderDadosFinaisHeader = () => {
    const insigniaUrl = settings?.logoType === 'PUBLIC' ? settings.publicLogoUrl || '🇦🇴' : settings.privateLogoUrl || '🎓';
    const hasImageInsignia = insigniaUrl.startsWith('data:') || insigniaUrl.startsWith('http');

    return (
      <div className="text-center mb-4 space-y-1 font-serif text-slate-950">
        {hasImageInsignia ? (
          <img
            src={insigniaUrl}
            alt="Insígnia da República"
            className="mx-auto w-12 h-12 rounded-full object-contain mb-1"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />
        ) : (
          <AngolaCoatOfArms className="w-12 h-12 mx-auto mb-1 object-contain" />
        )}
        <p className="uppercase font-extrabold text-[11px] leading-tight tracking-wider">República de Angola</p>
        <p className="uppercase font-bold text-[10px] leading-tight text-slate-700">Ministério da Educação</p>

        <h2 className="font-black text-sm uppercase text-slate-950 tracking-tight pt-1">
          {settings?.schoolName || "Complexo Escolar de Cafunfo"}
        </h2>

        {/* Título Principal Sem Sublinhado */}
        <div className="pt-2">
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 pb-1 inline-block">
            {`Dados Finais da Oferta Formativa do Ano Lectivo ${settings?.academicYear || '2025/2026'}`}
          </h3>
        </div>

        {/* Bloco de Metadados Oficial com Despacho de Criação */}
        <div className="text-[10.5px] font-serif text-slate-950 px-1 py-1 space-y-1 my-1 leading-relaxed">
          <div className="flex flex-wrap justify-between items-center font-bold gap-x-6 gap-y-1 text-left">
            <div>
              Instituição: <span className="font-normal uppercase">{settings?.schoolName || 'COMPLEXO ESCOLAR'}</span>
            </div>
            <div>Município de: <span className="font-normal">{settings?.municipality || 'Cafunfo'}</span></div>
            <div>Província de: <span className="font-normal">{settings?.province || 'Lunda Norte'}</span></div>
          </div>
          <div className="flex flex-wrap justify-between items-center font-bold gap-x-6 gap-y-1 text-left">
            <div>Matrícula referente ao ano lectivo: <span className="font-normal">{settings?.academicYear || '2025/2026'}</span></div>
            <div>Despacho de criação da Escola: <span className="font-normal">{settings?.decretoExecutivo || settings?.despachoCriacao || 'Decreto Executivo n.º 01/22'}</span></div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizador do Cabeçalho para Oferta Inicial (Planeamento e Estatística)
  const renderOfertaInicialHeader = () => {
    const insigniaUrl = settings?.logoType === 'PUBLIC' ? settings.publicLogoUrl || '🇦🇴' : settings.privateLogoUrl || '🎓';
    const hasImageInsignia = insigniaUrl.startsWith('data:') || insigniaUrl.startsWith('http');

    return (
      <div className="mb-4 space-y-2 font-serif text-slate-950">
        {/* Cabeçalho Governamental Centralizado */}
        <div className="text-center space-y-0.5">
          {hasImageInsignia ? (
            <img
              src={insigniaUrl}
              alt="Insígnia da República"
              className="mx-auto w-12 h-12 rounded-full object-contain mb-1"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
          ) : (
            <AngolaCoatOfArms className="w-12 h-12 mx-auto mb-1 object-contain" />
          )}
          <p className="uppercase font-extrabold text-[11px] leading-tight tracking-wider">REPÚBLICA DE ANGOLA</p>
          <p className="uppercase font-bold text-[10px] leading-tight text-slate-800">MINISTÉRIO DA EDUCAÇÃO</p>
          <p className="uppercase font-extrabold text-[10px] leading-tight tracking-wide text-slate-950">
            INSTITUTO NACIONAL DE FORMAÇÃO DE QUADROS DA EDUCAÇÃO
          </p>
        </div>

        {/* Título e Bloco de Metadados em Tempo Real (Fiel ao Modelo MED) */}
        <div className="pt-3 pb-1 text-left space-y-1">
          <h3 className="font-bold text-xs text-slate-950">
            Dados de Oferta Formativa Inicial
          </h3>

          <div className="text-[10px] font-serif text-slate-950 space-y-1 leading-relaxed">
            <div className="flex flex-wrap items-center font-bold gap-x-10 gap-y-1 text-left">
              <div>
                Instituição: <span className="font-normal uppercase">{settings?.schoolName || 'COMPLEXO ESCOLAR'}</span>
              </div>
              <div>Município de: <span className="font-normal">{settings?.municipality || 'Cafunfo'}</span></div>
              <div>Província de: <span className="font-normal">{settings?.province || 'Lunda Norte'}</span></div>
            </div>
            <div className="flex flex-wrap items-center font-bold gap-x-10 gap-y-1 text-left">
              <div>Matrícula referente ao ano lectivo: <span className="font-normal">{settings?.academicYear || '2025/2026'}</span></div>
              <div>Despacho de criação da Escola: <span className="font-normal">{settings?.decretoExecutivo || settings?.despachoCriacao || 'Decreto Executivo n.º 01/22'}</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizador da Tabela de "Dados Finais da Oferta Formativa" (Official MED Image Layout)
  const renderDadosFinaisTable = () => {
    return (
      <div className="space-y-1">
        <div className="text-center font-serif text-[10px] font-black uppercase text-slate-900 tracking-wide">
          Município de {settings?.municipality?.toUpperCase() || "Cafunfo"}, Província de {settings?.province?.toUpperCase() || "Lunda Norte"}
        </div>

        <div className="overflow-x-auto bg-white">
          <table className="w-full border-collapse font-serif text-slate-950 text-center text-[9px]">
            <thead>
              <tr style={{ backgroundColor: '#1e293b', color: '#ffffff', fontWeight: 'bold' }}>
                <th className="p-2 text-center align-middle" rowSpan={3} style={{ border: '1px solid #475569', backgroundColor: '#1e293b', color: '#ffffff', fontWeight: 'bold', width: '180px', minWidth: '160px' }}>
                  <span className="text-center font-bold text-white text-[10px] uppercase block w-full">{column1HeaderName || 'Especialidade'}</span>
                </th>
                <th className="p-1.5 tracking-wider" colSpan={14} style={{ border: '1px solid #475569', backgroundColor: '#1e293b', color: '#ffffff' }}>
                  {selectedClass ? `${selectedClass}ª Classe` : '........ª Classe'}
                </th>
              </tr>

              <tr style={{ backgroundColor: '#e2e8f0', color: '#0f172a', fontWeight: 'bold' }}>
                <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#e2e8f0', color: '#0f172a', padding: '4px' }}>Matriculados</th>
                <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#e2e8f0', color: '#0f172a', padding: '4px' }}>Vindos Transferidos</th>
                <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#e2e8f0', color: '#0f172a', padding: '4px' }}>Transferido p/outras Escolas</th>
                <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#e2e8f0', color: '#0f172a', padding: '4px' }}>Desistentes</th>
                <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#e2e8f0', color: '#0f172a', padding: '4px' }}>Nº Actual de Alunos</th>
                <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#e2e8f0', color: '#0f172a', padding: '4px' }}>Reprovados</th>
                <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#e2e8f0', color: '#0f172a', padding: '4px' }}>Aprovados</th>
              </tr>

              <tr style={{ backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 'bold' }}>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>MF</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>F</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>MF</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>F</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>MF</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>F</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>MF</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>F</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>MF</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>F</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>MF</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>F</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>MF</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', width: '30px' }}>F</th>
              </tr>
            </thead>
            <tbody>
              {dadosFinaisStats.map((row, index) => (
                <tr key={index}>
                  <td className="text-left font-bold" style={{ border: '1px solid #64748b', padding: '6px 8px', backgroundColor: '#ffffff', verticalAlign: 'middle', textAlign: 'left', lineHeight: '1.2' }}>{row.name.toUpperCase()}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{row.mat_MF || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{row.mat_F || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{row.vindos_MF || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{row.vindos_F || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{row.transOutras_MF || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{row.transOutras_F || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{row.desistentes_MF || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{row.desistentes_F || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2', fontWeight: 'bold' }}>{row.actual_MF || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2', fontWeight: 'bold' }}>{row.actual_F || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{row.reprovados_MF || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{row.reprovados_F || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2', fontWeight: 'semibold' }}>{row.aprovados_MF || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '6px 4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2', fontWeight: 'semibold' }}>{row.aprovados_F || ''}</td>
                </tr>
              ))}

              <tr style={{ backgroundColor: '#dbeafe', color: '#0f172a', fontWeight: 'bold' }}>
                <td className="text-left font-black uppercase" style={{ border: '1px solid #475569', padding: '6px 8px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'left', lineHeight: '1.2' }}>TOTAL</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{dadosFinaisTotals.mat_MF || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{dadosFinaisTotals.mat_F || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{dadosFinaisTotals.vindos_MF || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{dadosFinaisTotals.vindos_F || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{dadosFinaisTotals.transOutras_MF || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{dadosFinaisTotals.transOutras_F || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{dadosFinaisTotals.desistentes_MF || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{dadosFinaisTotals.desistentes_F || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2', fontWeight: 'bold' }}>{dadosFinaisTotals.actual_MF || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2', fontWeight: 'bold' }}>{dadosFinaisTotals.actual_F || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{dadosFinaisTotals.reprovados_MF || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2' }}>{dadosFinaisTotals.reprovados_F || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2', fontWeight: 'bold' }}>{dadosFinaisTotals.aprovados_MF || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '6px 4px', backgroundColor: '#dbeafe', verticalAlign: 'middle', textAlign: 'center', lineHeight: '1.2', fontWeight: 'bold' }}>{dadosFinaisTotals.aprovados_F || '0'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Renderizador da Tabela de "Oferta Formativa Inicial" (Modelo Oficial Fiel MED)
  const renderOfertaInicialTable = () => {
    return (
      <div className="space-y-2">
        <div className="overflow-x-auto bg-white">
          <table className="w-full border-collapse font-serif text-slate-950 text-center text-[9px]">
            <thead>
              {/* Linha 1: Títulos de Classes com Cores Fiéis do Modelo MED */}
              <tr>
                <th className="p-2 align-middle text-center" rowSpan={3} style={{ border: '1px solid #475569', backgroundColor: '#1e293b', color: '#ffffff', fontWeight: 'bold', width: '170px', minWidth: '150px' }}>
                  <span className="text-center font-bold text-white text-[10px] uppercase block w-full">Cursos</span>
                </th>
                <th className="p-1 text-[8px] align-middle text-center" rowSpan={3} style={{ border: '1px solid #475569', backgroundColor: '#1e293b', color: '#ffffff', fontWeight: 'bold', width: '90px', minWidth: '80px', maxWidth: '95px', lineHeight: '1.25', whiteSpace: 'normal' }}>
                  Nº de vagas oferecidas por Especialidade
                </th>
                <th className="p-1 text-[8px] align-middle text-center" rowSpan={3} style={{ border: '1px solid #475569', backgroundColor: '#1e293b', color: '#ffffff', fontWeight: 'bold', width: '80px', minWidth: '70px', maxWidth: '85px', lineHeight: '1.25', whiteSpace: 'normal' }}>
                  Nº de Alunos Inscritos
                </th>
                <th className="p-1.5 uppercase tracking-wider" colSpan={6} style={{ border: '1px solid #475569', backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 'bold' }}>10ª Classe</th>
                <th className="p-1.5 uppercase tracking-wider" colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#1d4ed8', color: '#ffffff', fontWeight: 'bold' }}>11ª Classe</th>
                <th className="p-1.5 uppercase tracking-wider" colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 'bold' }}>12ª Classe</th>
                <th className="p-1.5 uppercase tracking-wider" colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#000000', color: '#ffffff', fontWeight: 'bold' }}>13ª Classe</th>
              </tr>

              {/* Linha 2: Sub-indicadores de Alunos */}
              <tr>
                <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#334155', color: '#ffffff', padding: '4px' }}>Matriculados pela 1ª Vez</th>
                <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#334155', color: '#ffffff', padding: '4px' }}>Repetentes</th>
                <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#334155', color: '#ffffff', padding: '4px' }}>Total de Alunos Matriculados</th>
                
                <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#cbd5e1', color: '#0f172a', padding: '4px' }}>Novos e Repetentes</th>
                <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#cbd5e1', color: '#0f172a', padding: '4px' }}>Novos e Repetentes</th>
                <th colSpan={2} style={{ border: '1px solid #475569', backgroundColor: '#cbd5e1', color: '#0f172a', padding: '4px' }}>Novos e Repetentes</th>
              </tr>

              {/* Linha 3: Gênero MF / F */}
              <tr>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '3px', width: '28px' }}>MF</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '3px', width: '28px' }}>F</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '3px', width: '28px' }}>MF</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '3px', width: '28px' }}>F</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '3px', width: '28px' }}>MF</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '3px', width: '28px' }}>F</th>
                
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '3px', width: '28px' }}>MF</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '3px', width: '28px' }}>F</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '3px', width: '28px' }}>MF</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '3px', width: '28px' }}>F</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '3px', width: '28px' }}>MF</th>
                <th style={{ border: '1px solid #475569', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '3px', width: '28px' }}>F</th>
              </tr>
            </thead>
            <tbody>
              {statsOfertaInicial.map((curso, index) => (
                <tr key={index}>
                  <td className="text-left font-bold pl-2" style={{ border: '1px solid #64748b', padding: '4px 6px', backgroundColor: '#ffffff', width: '170px', minWidth: '150px' }}>{curso.name}</td>
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '90px', minWidth: '80px', maxWidth: '95px', textAlign: 'center' }}>{curso.vagas || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '80px', minWidth: '70px', maxWidth: '85px', textAlign: 'center' }}>{curso.inscritos || ''}</td>
                  
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '32px', textAlign: 'center' }}>{curso.mat1_MF || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '32px', textAlign: 'center' }}>{curso.mat1_F || ''}</td>
                  
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '32px', textAlign: 'center' }}>{curso.rep10_MF || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '32px', textAlign: 'center' }}>{curso.rep10_F || ''}</td>
                  
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '32px', textAlign: 'center', fontWeight: 'bold' }}>{curso.tot10_MF || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '32px', textAlign: 'center', fontWeight: 'bold' }}>{curso.tot10_F || ''}</td>
                  
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '32px', textAlign: 'center' }}>{curso.tot11_MF || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '32px', textAlign: 'center' }}>{curso.tot11_F || ''}</td>
                  
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '32px', textAlign: 'center' }}>{curso.tot12_MF || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '32px', textAlign: 'center' }}>{curso.tot12_F || ''}</td>
                  
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '32px', textAlign: 'center' }}>{curso.tot13_MF || ''}</td>
                  <td style={{ border: '1px solid #64748b', padding: '4px 2px', width: '32px', textAlign: 'center' }}>{curso.tot13_F || ''}</td>
                </tr>
              ))}

              {/* Linha do TOTAL */}
              <tr style={{ backgroundColor: '#dbeafe', color: '#0f172a', fontWeight: 'bold' }}>
                <td className="text-center uppercase font-black" style={{ border: '1px solid #475569', padding: '5px 6px', backgroundColor: '#dbeafe', width: '170px', minWidth: '150px' }}>TOTAL</td>
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '90px', minWidth: '80px', maxWidth: '95px', textAlign: 'center' }}>{totalsOfertaInicial.vagas || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '80px', minWidth: '70px', maxWidth: '85px', textAlign: 'center' }}>{totalsOfertaInicial.inscritos || '0'}</td>
                
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '32px', textAlign: 'center' }}>{totalsOfertaInicial.mat1_MF || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '32px', textAlign: 'center' }}>{totalsOfertaInicial.mat1_F || '0'}</td>
                
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '32px', textAlign: 'center' }}>{totalsOfertaInicial.rep10_MF || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '32px', textAlign: 'center' }}>{totalsOfertaInicial.rep10_F || '0'}</td>
                
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '32px', textAlign: 'center', fontWeight: 'black' }}>{totalsOfertaInicial.tot10_MF || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '32px', textAlign: 'center', fontWeight: 'black' }}>{totalsOfertaInicial.tot10_F || '0'}</td>
                
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '32px', textAlign: 'center' }}>{totalsOfertaInicial.tot11_MF || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '32px', textAlign: 'center' }}>{totalsOfertaInicial.tot11_F || '0'}</td>
                
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '32px', textAlign: 'center' }}>{totalsOfertaInicial.tot12_MF || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '32px', textAlign: 'center' }}>{totalsOfertaInicial.tot12_F || '0'}</td>
                
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '32px', textAlign: 'center' }}>{totalsOfertaInicial.tot13_MF || '0'}</td>
                <td style={{ border: '1px solid #475569', padding: '5px 2px', backgroundColor: '#dbeafe', width: '32px', textAlign: 'center' }}>{totalsOfertaInicial.tot13_F || '0'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Observações Oficiais de Rodapé do Modelo MED */}
        <div className="pt-2 text-[9.5px] font-serif text-slate-950 space-y-0.5 text-left">
          <p><strong>OBS: Numeros de vagas:</strong> disponibilicade da escola por especialidades antes de teste de selecção.</p>
          <p><strong>Alunos Inscritos:</strong> São todos alunos que se inscreveram para o teste de selecção.</p>
          <p><strong>Total de alunos matriculados:</strong> É a soma dos alunos novos e os repetentes</p>
        </div>
      </div>
    );
  };

  // Renderizador do Rodapé com Data Centralizada (Sem Sublinhado) e Assinatura do Diretor
  const renderOfficialFooter = () => {
    return (
      <div className="mt-5 pt-2 space-y-5 text-slate-950 font-serif text-[10px]">
        {/* Assinatura do Diretor Perfeitamente Centralizada */}
        <div className="flex justify-center text-center font-serif pt-2">
          <div className="min-w-[220px]">
            <p className="font-bold uppercase mb-7 text-[11px] text-slate-950">O Director</p>
            <div className="w-56 border-b border-black mx-auto mb-1"></div>
            <p className="font-black uppercase tracking-wider text-[11px] text-slate-950">{directorName}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 sm:p-8 border border-slate-200 shadow-xl rounded-2xl max-w-6xl mx-auto space-y-6" id="estatistica-formativa-container">
      
      {/* Barra Superior de Seleção de Abas & Filtro de Classe */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Relatório Estatístico da Oferta Formativa</h3>
            <p className="text-xs text-slate-500">Métricas consolidadas de aproveitamento e fluxo de estudantes em Angola.</p>
          </div>
        </div>

        {/* Seleção de Abas do Relatório - Oferta Inicial é EXCLUSIVA do Magistério */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setReportTab('DADOS_FINAIS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              reportTab === 'DADOS_FINAIS'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Dados Finais
          </button>
          {activeSubsystem === 'SECUNDARIO_PEDAGOGICO' && (
            <button
              onClick={() => setReportTab('OFERTA_INICIAL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                reportTab === 'OFERTA_INICIAL'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Oferta Inicial
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtro da Classe + Botões de Ação Reconfigurados */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
        
        {/* Filtro de Classe para Dados Finais */}
        {reportTab === 'DADOS_FINAIS' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase text-slate-600 tracking-wide font-sans">
              Classe Seleccionada:
            </span>
            <div className="flex flex-wrap gap-1">
              {availableClasses.map(cl => (
                <button
                  key={cl}
                  onClick={() => setSelectedClass(cl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    selectedClass === cl
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {cl}ª Classe
                </button>
              ))}
            </div>
          </div>
        ) : (
          <span className="text-xs font-bold text-slate-600 uppercase font-sans">
            Métricas de Vagas e Inscrições do Ano Lectivo {settings?.academicYear || '2025/2026'}
          </span>
        )}

        {/* Botões de Ação Reconfigurados */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToPDF}
            disabled={isGeneratingPDF}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white text-xs font-extrabold uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-md shadow-emerald-200/50"
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
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-md shadow-slate-200/50"
            id="btn-imprimir-direto"
          >
            <Printer className="w-4 h-4" />
            Imprimir (A4)
          </button>
        </div>
      </div>

      {/* Documento Principal Formatado em Folha Timbrada */}
      <div className="border border-slate-200 p-4 sm:p-6 rounded-xl bg-white text-slate-900 space-y-6 shadow-sm">
        <div id="oferta-formativa-live-preview" className="bg-white p-2 sm:p-4 space-y-6">
          {reportTab === 'DADOS_FINAIS' ? renderDadosFinaisHeader() : renderOfertaInicialHeader()}
          {reportTab === 'DADOS_FINAIS' ? renderDadosFinaisTable() : renderOfertaInicialTable()}
          {renderOfficialFooter()}
        </div>
      </div>
    </div>
  );
};

export default EstatisticaFormativa;
