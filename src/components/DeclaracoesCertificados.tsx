/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Student, SchoolSettings, UserRole, Staff, GradeRow, ModalityType, SEED_GRELHA_CURRICULAR, carregarGrelhaCurricular, getLeiBaseForCertificate } from '../types';
import { gerarCodigoPauta } from '../utils/pautaLogic';
import BiSectorSelect from './BiSectorSelect';
import { CertificadoDocument } from './documents/CertificadoDocument';
import { DeclaracaoDocument, toTitleCaseName, getDocTypeDetails } from './documents/DeclaracaoDocument';
import { jsPDF } from 'jspdf';
import { 
  FileText, 
  Award, 
  Search, 
  Printer, 
  User, 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  FileCheck,
  PlusCircle,
  Hash,
  MapPin,
  HelpCircle,
  FileDown,
  ArrowLeft,
  ChevronRight,
  GraduationCap
} from 'lucide-react';

interface DeclaracoesCertificadosProps {
  students: Student[];
  grades: GradeRow[];
  schoolSettings: SchoolSettings;
  userRole: UserRole;
  loggedInStaff?: Staff | null;
  activeModality?: ModalityType;
  initialTab?: 'PRIMARIO' | 'PUNIV' | 'MAGISTERIO' | 'HUB';
  onTabChange?: (tab: 'PRIMARIO' | 'PUNIV' | 'MAGISTERIO' | 'HUB') => void;
}

// Convert grades (1 to 20) into Portuguese words
function notaParaExtenso(nota: number): string {
  const porExtenso: Record<number, string> = {
    0: 'Zero',
    1: 'Um',
    2: 'Dois',
    3: 'Três',
    4: 'Quatro',
    5: 'Cinco',
    6: 'Seis',
    7: 'Sete',
    8: 'Oito',
    9: 'Nove',
    10: 'Dez',
    11: 'Onze',
    12: 'Doze',
    13: 'Treze',
    14: 'Catorze',
    15: 'Quinze',
    16: 'Dezasseis',
    17: 'Dezassete',
    18: 'Dezoito',
    19: 'Dezanove',
    20: 'Vinte'
  };
  return porExtenso[Math.round(nota)] || String(nota);
}

// Rich Text horizontal wrapping helper for jsPDF with full justification (Ctrl+J)
export function renderRichText(
  doc: any,
  segments: { text: string; bold?: boolean; color?: number[] }[],
  startX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number
): number {
  interface RichToken {
    text: string;
    isSpace: boolean;
    bold?: boolean;
    color?: number[];
    width: number;
  }

  // 1. Convert all segments into tokens (words and spaces)
  const allTokens: RichToken[] = [];

  segments.forEach(seg => {
    doc.setFont('times', seg.bold ? 'bold' : 'normal');
    const rawTokens = seg.text.split(/(\s+)/);
    rawTokens.forEach(t => {
      if (t === '') return;
      const isSpace = /^\s+$/.test(t);
      const width = doc.getTextWidth(t);
      allTokens.push({
        text: t,
        isSpace,
        bold: seg.bold,
        color: seg.color,
        width
      });
    });
  });

  // 2. Wrap tokens into lines
  const lines: RichToken[][] = [];
  let currentLine: RichToken[] = [];
  let currentLineWidth = 0;

  allTokens.forEach(token => {
    if (token.isSpace && currentLine.length === 0) return; // Skip leading spaces

    if (!token.isSpace && currentLineWidth + token.width > maxWidth && currentLine.length > 0) {
      while (currentLine.length > 0 && currentLine[currentLine.length - 1].isSpace) {
        currentLine.pop();
      }
      lines.push(currentLine);
      currentLine = [token];
      currentLineWidth = token.width;
    } else {
      currentLine.push(token);
      currentLineWidth += token.width;
    }
  });

  if (currentLine.length > 0) {
    while (currentLine.length > 0 && currentLine[currentLine.length - 1].isSpace) {
      currentLine.pop();
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
  }

  // 3. Render lines with horizontal justification
  let currentY = startY;

  lines.forEach((line, lineIndex) => {
    const isLastLine = lineIndex === lines.length - 1;

    const wordTokens = line.filter(t => !t.isSpace);
    const spaceTokens = line.filter(t => t.isSpace);

    const wordsWidth = wordTokens.reduce((sum, t) => sum + t.width, 0);
    const spaceCount = spaceTokens.length;

    const extraSpace = maxWidth - wordsWidth;
    const shouldJustify = !isLastLine && spaceCount > 0 && extraSpace > 0 && extraSpace < maxWidth * 0.45;

    let gapWidth = 0;
    if (shouldJustify) {
      gapWidth = extraSpace / spaceCount;
    }

    let x = startX;

    line.forEach(t => {
      if (t.isSpace) {
        x += shouldJustify ? gapWidth : t.width;
      } else {
        doc.setFont('times', t.bold ? 'bold' : 'normal');
        if (t.color) {
          doc.setTextColor(t.color[0], t.color[1], t.color[2]);
        } else {
          doc.setTextColor(0, 0, 0);
        }
        doc.text(t.text, x, currentY);
        x += t.width;
      }
    });

    currentY += lineHeight;
  });

  return currentY;
}


// Helper subjects and db names translation maps
export function getDbSubjectName(subj: string): string {
  const map: Record<string, string> = {
    'Língua Portuguesa': 'L. PORTUGUESA',
    'Língua Estrangeira (Inglês)': 'L. INGLESA',
    'Língua Estrangeira (Francês)': 'L. FRANCESA',
    'Língua Inglesa': 'L. INGLESA',
    'Língua Francesa': 'L. FRANCESA',
    'Língua de Angola': 'L. ANGOLA',
    'Língua Estrangeira': 'L. ESTRANGEIRA',
    'Estudo do Meio': 'EST. MEIO',
    'Educação Musical': 'ED. MUSICAL',
    'E.M.P.': 'E.M.P.',
    'Educação Física': 'ED. FISICA',
    'Educação Física e Artística': 'ED. FISICA E ARTISTICA',
    'Ciências da Natureza': 'CIENCIAS DA NATUREZA',
    'Ciências Integradas': 'CIENCIAS INTEGRADAS',
    'Educação Moral e Cívica': 'ED. MORAL CIVICA',
    'Educação Visual': 'ED. VISUAL',
    'Educação Visual e Plástica': 'ED. VISUAL PLASTICA',
    'Educação Laboral': 'ED. LABORAL',
    'Empreendedorismo': 'EMPREENDEDORISMO',
    'Introdução à Filosofia': 'FILOSOFIA',
    'Informática': 'INFORMATICA',
    'Matemática': 'MATEMATICA',
    'Física': 'FISICA',
    'Química': 'QUIMICA',
    'Biologia': 'BIOLOGIA',
    'História': 'HISTORIA',
    'Geografia': 'GEOGRAFIA',
    'Introdução ao Direito': 'INTROD. AO DIREITO',
    'Economia': 'ECONOMIA',
    'Sociologia': 'SOCIOLOGIA',
    'Psicologia': 'PSICOLOGIA',
    'Literatura Portuguesa': 'LITERATURA PORTUGUESA',
    'Geometria Descritiva': 'GEOMETRIA DESCRITIVA',
    'História da Arte': 'HISTORIA DA ARTE',
    'Desenho': 'DESENHO',
    'Pedagogia': 'PEDAGOGIA',
    'Didáctica Geral': 'DIDACTICA GERAL',
    'Prática Pedagógica': 'PRATICA PEDAGOGICA',
    'Sociologia da Educação': 'SOCIOLOGIA DA EDUCACAO',
    'Estatística Aplicada': 'ESTATISTICA APLICADA',
    'Metodologia de Ensino Primário': 'METODOLOGIA_ENSINO_PRIMARIO',
    'Metodologia de Língua Portuguesa': 'METODOLOGIA DE L. PORTUGUESA',
    'Metodologia de Matemática': 'METODOLOGIA DE MATEMATICA',
    'Metodologia de Ciências': 'METODOLOGIA DE CIENCIAS',
    'Metodologia de Geografia': 'METODOLOGIA_GEOGRAFIA',
    'Metodologia de História': 'METODOLOGIA_HISTORIA',
    'Metodologia de Biologia': 'METODOLOGIA_BIOLOGIA',
    'Metodologia de Química': 'METODOLOGIA_QUIMICA',
    'Higiene e Saúde Escolar': 'H_S_ESCOLAR',
    'ASEAGE': 'ASEAGE',
    'MEM': 'MEM',
    'MEF': 'MEF',
    'TEDC': 'TEDC',
    'PDA / NEE': 'PDA_NEE',
    'FPSD': 'FPSD',
    'Ética': 'ETICA',
    'Literatura': 'LITERATURA',
    'Expressões': 'EXPRESSOES'
  };
  return map[subj] || subj.toUpperCase();
}

export function isSameSubject(s1: string, s2: string): boolean {
  if (!s1 || !s2) return false;
  if (s1 === s2) return true;

  const db1 = getDbSubjectName(s1);
  const db2 = getDbSubjectName(s2);
  if (db1 === db2) return true;

  const pretty1 = getPrettySubjectName(s1);
  const pretty2 = getPrettySubjectName(s2);
  if (pretty1 === pretty2) return true;

  const norm = (s: string) => (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const n1 = norm(s1);
  const n2 = norm(s2);

  if (n1 === n2) return true;
  if (norm(db1) === norm(db2)) return true;
  if (norm(pretty1) === norm(pretty2)) return true;

  const synonymGroups: string[][] = [
    ['L. PORTUGUESA', 'LÍNGUA PORTUGUESA', 'LINGUA PORTUGUESA', 'PORTUGUES', 'PORTUGUÊS', 'LP'],
    ['L. INGLESA', 'LÍNGUA INGLESA', 'LINGUA INGLESA', 'INGLES', 'INGLÊS', 'ING'],
    ['L. FRANCESA', 'LÍNGUA FRANCESA', 'LINGUA FRANCESA', 'FRANCES', 'FRANCÊS', 'FRA'],
    ['L. ANGOLA', 'LÍNGUA DE ANGOLA', 'LINGUA DE ANGOLA', 'LÍNGUA ANGOLANA', 'LA'],
    ['EST. MEIO', 'ESTUDO DO MEIO', 'ESTUDO MEIO', 'EM'],
    ['CIENCIAS DA NATUREZA', 'C. NATUREZA', 'CIENCIAS NATUREZA', 'CIÊNCIAS DA NATUREZA', 'CN'],
    ['CIENCIAS INTEGRADAS', 'C. INTEGRADAS', 'CIENCIAS INTEGRADAS', 'CIÊNCIAS INTEGRADAS', 'CI'],
    ['ED. MORAL CIVICA', 'ED. MORAL E CIVICA', 'EDUCAÇÃO MORAL E CÍVICA', 'EDUCACAO MORAL E CIVICA', 'EMC'],
    ['ED. VISUAL PLASTICA', 'ED. VISUAL E PLASTICA', 'EDUCAÇÃO VISUAL E PLÁSTICA', 'EDUCACAO VISUAL E PLASTICA', 'EVP'],
    ['ED. VISUAL', 'EDUCAÇÃO VISUAL', 'EDUCACAO VISUAL', 'EV'],
    ['ED. MUSICAL', 'EDUCAÇÃO MUSICAL', 'EDUCACAO MUSICAL', 'EMUS'],
    ['ED. LABORAL', 'EDUCAÇÃO LABORAL', 'EDUCACAO LABORAL', 'EL'],
    ['ED. FISICA', 'EDUCAÇÃO FÍSICA', 'EDUCACAO FISICA', 'ED. FÍSICA', 'ED FISICA', 'EF'],
    ['EMPREENDEDORISMO', 'EMP'],
    ['FILOSOFIA', 'INTRODUÇÃO À FILOSOFIA', 'INTRODUCAO A FILOSOFIA', 'FIL'],
    ['INTROD. AO DIREITO', 'INTRODUÇÃO AO DIREITO', 'INTRODUCAO AO DIREITO', 'DIREITO', 'DIR'],
    ['METODOLOGIA_ENSINO_PRIMARIO', 'METODOLOGIA DE ENSINO PRIMÁRIO', 'METODOLOGIA DE ENSINO PRIMARIO', 'MEP'],
    ['METODOLOGIA DE L. PORTUGUESA', 'METODOLOGIA DE LÍNGUA PORTUGUESA', 'MELP'],
    ['METODOLOGIA DE MATEMATICA', 'METODOLOGIA DE MATEMÁTICA', 'MEM'],
    ['METODOLOGIA DE CIENCIAS', 'METODOLOGIA DE CIÊNCIAS', 'MEC', 'MEMCN'],
    ['METODOLOGIA_GEOGRAFIA', 'METODOLOGIA DE GEOGRAFIA', 'MEG'],
    ['METODOLOGIA_HISTORIA', 'METODOLOGIA DE HISTÓRIA', 'MEH'],
    ['METODOLOGIA_BIOLOGIA', 'METODOLOGIA DE BIOLOGIA', 'MEB'],
    ['METODOLOGIA_QUIMICA', 'METODOLOGIA DE QUÍMICA', 'MEQ'],
    ['H_S_ESCOLAR', 'HIGIENE E SAÚDE ESCOLAR', 'HIGIENE E SAUDE ESCOLAR', 'HSE'],
    ['PDA_NEE', 'PDA / NEE', 'PDA', 'NEE'],
    ['NEC', 'ESTAGIO', 'ESTÁGIO', 'ESTÁGIO PEDAGÓGICO', 'PRÁTICA E ESTÁGIO'],
    ['PAP', 'TRABALHO DE FIM DE CURSO', 'TFC']
  ];

  for (const group of synonymGroups) {
    const normGroup = group.map(norm);
    if (normGroup.includes(n1) && normGroup.includes(n2)) return true;
  }

  return false;
}

export function getPunivSubjects(spec: string) {
  const grid = carregarGrelhaCurricular();
  const items = grid.filter(item => 
    item.modality === 'PUNIV' && 
    item.specialty === spec &&
    item.active !== false
  );

  const subjectCodes: string[] = Array.from(new Set(items.map(item => String(item.subject))));

  if (subjectCodes.length === 0) {
    const geral = [
      'Língua Portuguesa',
      'Língua Estrangeira (Inglês)',
      'Educação Física',
      'Introdução à Filosofia',
      'Informática'
    ];
    let especifica: string[] = [];
    if (spec === 'CFB') especifica = ['Matemática', 'Física', 'Química', 'Biologia'];
    else if (spec === 'CEJ') especifica = ['Matemática', 'História', 'Geografia', 'Introdução ao Direito', 'Economia'];
    else if (spec === 'CS') especifica = ['História', 'Geografia', 'Sociologia', 'Psicologia', 'Literatura Portuguesa'];
    else if (spec === 'AV') especifica = ['Geometria Descritiva', 'História da Arte', 'Desenho'];
    else especifica = ['Matemática', 'Física', 'Química', 'Biologia'];

    const opcao = ['Empreendedorismo'];
    return { geral, especifica, opcao };
  }

  const geralCodes: string[] = [];
  const opcaoCodes: string[] = [];
  const especificaCodes: string[] = [];

  const geralFilter = ['L. PORTUGUESA', 'L. INGLESA', 'L. FRANCESA', 'L. ESTRANGEIRA', 'ED. FISICA', 'FILOSOFIA', 'INFORMATICA'];
  const opcaoFilter = ['EMPREENDEDORISMO'];

  subjectCodes.forEach(code => {
    const uCode = code.toUpperCase();
    if (geralFilter.includes(uCode)) {
      geralCodes.push(code);
    } else if (opcaoFilter.includes(uCode)) {
      opcaoCodes.push(code);
    } else {
      especificaCodes.push(code);
    }
  });

  return {
    geral: geralCodes.map(code => getPrettySubjectName(code)),
    especifica: especificaCodes.map(code => getPrettySubjectName(code)),
    opcao: opcaoCodes.map(code => getPrettySubjectName(code))
  };
}

export function getPrettySubjectName(subCode: string): string {
  const map: Record<string, string> = {
    'L. PORTUGUESA': 'Língua Portuguesa',
    'MATEMATICA': 'Matemática',
    'EST. MEIO': 'Estudo do Meio',
    'ED. MUSICAL': 'Educação Musical',
    'E.M.P.': 'E.M.P.',
    'ED. FISICA': 'Educação Física',
    'L. ANGOLA': 'Língua de Angola',
    'L. ESTRANGEIRA': 'Língua Estrangeira',
    'CIDADANIA': 'Cidadania',
    'CIENCIAS INTEGRADAS': 'Ciências Integradas',
    'ED. FISICA E ARTISTICA': 'Educação Física e Artística',
    'HISTORIA': 'História',
    'GEOGRAFIA': 'Geografia',
    'BIOLOGIA': 'Biologia',
    'FISICA': 'Física',
    'QUIMICA': 'Química',
    'ED. VISUAL': 'Educação Visual',
    'L. INGLESA': 'Língua Inglesa',
    'L. FRANCESA': 'Língua Francesa',
    'ED. MORAL CIVICA': 'Educação Moral e Cívica',
    'ED. LABORAL': 'Educação Laboral',
    'EMPREENDEDORISMO': 'Empreendedorismo',
    'FILOSOFIA': 'Filosofia',
    'SOCIOLOGIA': 'Sociologia',
    'INFORMATICA': 'Informática',
    'LITERATURA PORTUGUESA': 'Literatura Portuguesa',
    'INTROD. AO DIREITO': 'Introdução ao Direito',
    'GEOMETRIA DESCRITIVA': 'Geometria Descritiva',
    'PEDAGOGIA': 'Pedagogia',
    'DIDACTICA GERAL': 'Didáctica Geral',
    'PSICOLOGIA': 'Psicologia',
    'METODOLOGIA DE L. PORTUGUESA': 'Metodologia de Língua Portuguesa',
    'METODOLOGIA DE MATEMATICA': 'Metodologia de Matemática',
    'METODOLOGIA DE CIENCIAS': 'Metodologia de Ciências',
    'PRATICA PEDAGOGICA': 'Prática Pedagógica',
    'SOCIOLOGIA DA EDUCACAO': 'Sociologia da Educação',
    'ESTATISTICA APLICADA': 'Estatística Aplicada',
    'ECONOMIA': 'Economia',
    'HISTORIA DA ARTE': 'História da Arte',
    'DESENHO': 'Desenho',
    'MEM': 'MEM',
    'MEF': 'MEF',
    'TEDC': 'TEDC',
    'H_S_ESCOLAR': 'Higiene e Saúde Escolar',
    'ASEAGE': 'ASEAGE',
    'METODOLOGIA_GEOGRAFIA': 'Metodologia de Geografia',
    'METODOLOGIA_HISTORIA': 'Metodologia de História',
    'METODOLOGIA_BIOLOGIA': 'Metodologia de Biologia',
    'METODOLOGIA_QUIMICA': 'Metodologia de Química',
    'METODOLOGIA_ENSINO_PRIMARIO': 'Metodologia de Ensino Primário',
    'CIENCIAS DA NATUREZA': 'Ciências da Natureza',
    'ED. VISUAL PLASTICA': 'Educação Visual e Plástica',
    'PDA_NEE': 'PDA / NEE',
    'FPSD': 'FPSD',
    'ETICA': 'Ética',
    'LITERATURA': 'Literatura',
    'MEEMC': 'MEEMC',
    'MELP': 'MELP',
    'MEQ': 'MEQ',
    'MEB': 'MEB',
    'MEH': 'MEH',
    'MEG': 'MEG',
    'EXPRESSOES': 'Expressões',
    'MEMCN': 'MEMCN',
    'NEC': 'NEC',
    'PAP': 'PAP',
    'PDA': 'PDA',
    'NEE': 'NEE',
    'MEE': 'MEE'
  };
  return map[subCode] || subCode;
}

export function formatSiglaOnly(subjName: string): string {
  if (!subjName) return '';
  let s = subjName.trim();
  if (s.includes('(')) {
    const parts = s.split('(');
    const prefix = parts[0].trim();
    if (prefix.length > 0) {
      s = prefix;
    } else {
      s = parts[1].replace(/\)/g, '').trim();
    }
  }
  return s;
}

export function getMagisterioSubjects(spec: string, cls?: string) {
  const grid = carregarGrelhaCurricular();
  let items = grid.filter(item => 
    item.modality === 'MAGISTERIO' && 
    item.specialty === spec &&
    item.active !== false
  );

  if (cls && cls !== 'TODOS') {
    items = items.filter(item => item.class === cls);
  } else {
    items = items.filter(item => item.class !== '13');
  }

  if (items.length === 0) {
    items = SEED_GRELHA_CURRICULAR.filter(item => item.modality === 'MAGISTERIO' && item.specialty === spec);
    if (cls && cls !== 'TODOS') items = items.filter(item => item.class === cls);
    else items = items.filter(item => item.class !== '13');
  }

  const subjectCodes: string[] = Array.from(new Set(items.map(item => String(item.subject))));

  const geralCientificaCodes = subjectCodes.filter(code => {
    const codeUpper = code.toUpperCase();
    return [
      'L. PORTUGUESA', 'L. INGLESA', 'L. FRANCESA', 'MATEMATICA', 'FISICA', 
      'BIOLOGIA', 'QUIMICA', 'HISTORIA', 'GEOGRAFIA', 'INFORMATICA', 
      'EMPREENDEDORISMO', 'FILOSOFIA', 'ED. FISICA', 'L. ESTRANGEIRA'
    ].includes(codeUpper);
  });

  const educacionalCodes = subjectCodes.filter(code => !geralCientificaCodes.includes(code));

  const pedagogicaCodes = educacionalCodes.filter(code => {
    const codeUpper = code.toUpperCase();
    return [
      'PEDAGOGIA', 'PSICOLOGIA', 'DIDACTICA GERAL', 'PRATICA PEDAGOGICA', 
      'SOCIOLOGIA DA EDUCACAO', 'H_S_ESCOLAR', 'ASEAGE', 'FPSD', 
      'ETICA', 'LITERATURA'
    ].includes(codeUpper);
  });

  const metodologiasCodes = educacionalCodes.filter(code => !pedagogicaCodes.includes(code));

  return {
    geralCientifica: geralCientificaCodes.map(code => getPrettySubjectName(code)),
    pedagogica: pedagogicaCodes.map(code => getPrettySubjectName(code)),
    metodologias: metodologiasCodes.map(code => getPrettySubjectName(code))
  };
}

// Map months to Portuguese words
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function DeclaracoesCertificados({
  students,
  grades,
  schoolSettings,
  userRole,
  loggedInStaff,
  activeModality,
  initialTab = 'HUB',
  onTabChange
}: DeclaracoesCertificadosProps) {
  const [activeTab, setActiveTab] = useState<'CERTIFICADO' | 'DECLARACAO'>('CERTIFICADO');
  const [subsistema, setSubsistema] = useState<'PRIMARIO' | 'PUNIV' | 'MAGISTERIO' | 'HUB'>(initialTab);

  const isPrimarioActive = schoolSettings?.activeComponents?.ENSINO_PRIMARIO !== false;
  const isPunivActive = schoolSettings?.activeComponents?.PUNIV !== false;
  const isMagisterioActive = schoolSettings?.activeComponents?.MAGISTERIO !== false;
  const activeCount = (isPrimarioActive ? 1 : 0) + (isPunivActive ? 1 : 0) + (isMagisterioActive ? 1 : 0);

  // Auto fallback if current subsystem is deactivated
  React.useEffect(() => {
    if (subsistema === 'PRIMARIO' && !isPrimarioActive) {
      if (isPunivActive) setSubsistema('PUNIV');
      else if (isMagisterioActive) setSubsistema('MAGISTERIO');
      else setSubsistema('HUB');
    } else if (subsistema === 'PUNIV' && !isPunivActive) {
      if (isPrimarioActive) setSubsistema('PRIMARIO');
      else if (isMagisterioActive) setSubsistema('MAGISTERIO');
      else setSubsistema('HUB');
    } else if (subsistema === 'MAGISTERIO' && !isMagisterioActive) {
      if (isPrimarioActive) setSubsistema('PRIMARIO');
      else if (isPunivActive) setSubsistema('PUNIV');
      else setSubsistema('HUB');
    }
  }, [subsistema, isPrimarioActive, isPunivActive, isMagisterioActive]);

  React.useEffect(() => {
    if (initialTab) {
      setSubsistema(initialTab);
    }
  }, [initialTab]);

  const [selectedSpecialty, setSelectedSpecialty] = useState<'CFB' | 'CEJ' | 'CS' | 'AV' | 'MF' | 'EP' | 'BQ' | 'LEMC' | 'GH' | 'ING_EMC' | 'FRA_EMC' | 'EVP' | 'EDF' | 'EMC' | 'PE'>('CFB');
  const [punivGrades, setPunivGrades] = useState<Record<string, Record<'10' | '11' | '12', string>>>({});
  const [magisterioGrades, setMagisterioGrades] = useState<Record<string, Record<'10' | '11' | '12' | '13', string>>>({});
  const [notaEstagio, setNotaEstagio] = useState<string>('');
  const [notaPAP, setNotaPAP] = useState<string>('');
  const [mediaFinalCurso, setMediaFinalCurso] = useState<string>('');

  const [selectedNivel, setSelectedNivel] = useState<'I' | 'II' | 'III' | 'TODOS'>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Computed options of available classes depending on activeTab and selected subsistema
  const classOptions = useMemo(() => {
    if (activeTab === 'CERTIFICADO') {
      if (subsistema === 'PRIMARIO') {
        return [
          { value: '6', label: '6ª Classe (Fim do Ensino Primário)' },
          { value: '9', label: '9ª Classe (Fim do I Ciclo do Ensino Secundário Geral)' }
        ];
      }
      if (subsistema === 'PUNIV') {
        return [{ value: '12', label: '12ª Classe (Fim do PUNIV)' }];
      }
      if (subsistema === 'MAGISTERIO') {
        return [{ value: '13', label: '13ª Classe (Fim do Magistério)' }];
      }
    } else { // DECLARACAO
      if (subsistema === 'PRIMARIO') {
        return [
          { value: '1', label: '1ª Classe' },
          { value: '2', label: '2ª Classe' },
          { value: '3', label: '3ª Classe' },
          { value: '4', label: '4ª Classe' },
          { value: '5', label: '5ª Classe' },
          { value: '7', label: '7ª Classe' },
          { value: '8', label: '8ª Classe' }
        ];
      }
      if (subsistema === 'PUNIV') {
        return [
          { value: '10', label: '10ª Classe' },
          { value: '11', label: '11ª Classe' }
        ];
      }
      if (subsistema === 'MAGISTERIO') {
        return [
          { value: '10', label: '10ª Classe' },
          { value: '11', label: '11ª Classe' },
          { value: '12', label: '12ª Classe' }
        ];
      }
    }
    return [];
  }, [activeTab, subsistema]);

  const { currentDay, currentMonth, currentYear } = useMemo(() => {
    const d = new Date();
    return {
      currentDay: d.getDate(),
      currentMonth: MESES[d.getMonth()],
      currentYear: d.getFullYear()
    };
  }, []);

  // Manual fields
  const [studentName, setStudentName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [naturalidade, setNaturalidade] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [provincia, setProvincia] = useState('');
  const [biNumber, setBiNumber] = useState('');
  const [biSector, setBiSector] = useState('');
  const [biDate, setBiDate] = useState('');
  const [docTypeSelected, setDocTypeSelected] = useState<'BI' | 'CEDULA' | 'PASSAPORTE'>('BI');
  
  // School parameters
  const [anoLectivo, setAnoLectivo] = useState('2025/2026');
  const [livroRegisto, setLivroRegisto] = useState('');
  const [folhaRegisto, setFolhaRegisto] = useState('');
  const [decretoCriacao, setDecretoCriacao] = useState(schoolSettings.decretoExecutivo || schoolSettings.despachoCriacao || 'Decreto Executivo nº 445/16 de 25 de Novembro');
  const [selectedClass, setSelectedClass] = useState('6');
  const [leiBaseText, setLeiBaseText] = useState(() => getLeiBaseForCertificate(schoolSettings, subsistema, '6'));
  const [selectedTurma, setSelectedTurma] = useState('A');
  const [selectedNoAluno, setSelectedNoAluno] = useState('1');

  // Synchronize school settings & class selection for Lei de Base
  React.useEffect(() => {
    const currentDecree = schoolSettings.decretoExecutivo || schoolSettings.despachoCriacao;
    if (currentDecree) {
      setDecretoCriacao(currentDecree);
    }
    const currentLei = getLeiBaseForCertificate(schoolSettings, subsistema, selectedClass);
    setLeiBaseText(currentLei);
  }, [schoolSettings, subsistema, selectedClass]);

  // Synchronize class selection when options change (switching tabs or subsystems)
  React.useEffect(() => {
    if (classOptions.length > 0) {
      if (!classOptions.some(opt => opt.value === selectedClass)) {
        setSelectedClass(classOptions[0].value);
      }
    }
  }, [classOptions, selectedClass]);

  // Grades for Certificado Ensino Primário
  const [certGrades, setCertGrades] = useState<Record<string, Record<'I' | 'II' | 'III', number | ''>>>({
    'Língua Portuguesa': { I: '', II: '', III: '' },
    'Matemática': { I: '', II: '', III: '' },
    'Estudo do Meio': { I: '', II: '', III: '' }, // III is shaded
    'História': { I: '', II: '', III: '' }, // I, II are shaded
    'Geografia': { I: '', II: '', III: '' }, // I, II are shaded
    'Educação Moral e Cívica': { I: '', II: '', III: '' }, // I, II are shaded
    'Ciência da Natureza': { I: '', II: '', III: '' }, // I, II are shaded
    'Educação. Manual e Plástica': { I: '', II: '', III: '' },
    'Educação Musical': { I: '', II: '', III: '' },
    'Educação Física': { I: '', II: '', III: '' },
    'Língua de Origem Africana': { I: '', II: '', III: '' } // I, II are shaded
  });

  // Grades for Declaração de Habilitações (Primary)
  const [decGrades, setDecGrades] = useState<Record<string, number | ''>>({
    'Língua Portuguesa': '',
    'Matemática': '',
    'Estudo do Meio': '',
    'Educação. Manual e Plástica': '',
    'Educação Musical': '',
    'Educação Física': ''
  });



  const calcPunivSubjectAverage = (sub: string) => {
    const g = punivGrades[sub] || { '10': '', '11': '', '12': '' };
    const show11 = activeTab === 'CERTIFICADO' || parseInt(selectedClass, 10) >= 11;
    const show12 = activeTab === 'CERTIFICADO' || parseInt(selectedClass, 10) >= 12;
    const cols: ('10' | '11' | '12')[] = ['10'];
    if (show11) cols.push('11');
    if (show12) cols.push('12');

    const vals = cols.map(c => parseFloat(g[c])).filter(v => !isNaN(v));
    if (vals.length === 0) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round(sum / vals.length);
  };

  const calcMagisterioSubjectAverage = (sub: string) => {
    const g = magisterioGrades[sub] || { '10': '', '11': '', '12': '', '13': '' };
    const show11 = activeTab === 'CERTIFICADO' || parseInt(selectedClass, 10) >= 11;
    const show12 = activeTab === 'CERTIFICADO' || parseInt(selectedClass, 10) >= 12;
    const show13 = activeTab === 'CERTIFICADO' || parseInt(selectedClass, 10) >= 13;
    const cols: ('10' | '11' | '12' | '13')[] = ['10'];
    if (show11) cols.push('11');
    if (show12) cols.push('12');
    if (show13) cols.push('13');

    const vals = cols.map(c => parseFloat(g[c])).filter(v => !isNaN(v));
    if (vals.length === 0) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round(sum / vals.length);
  };

  const calcMagisterioClassAverage = (cls: '10' | '11' | '12') => {
    const magSubjs = getMagisterioSubjects(selectedSpecialty);
    const flat = [...magSubjs.geralCientifica, ...magSubjs.pedagogica, ...magSubjs.metodologias];
    let sum = 0;
    let count = 0;
    flat.forEach(sub => {
      const vals = magisterioGrades[sub] || { '10': '', '11': '', '12': '', '13': '' };
      const v = parseFloat(vals[cls]);
      if (!isNaN(v)) {
        sum += v;
        count++;
      }
    });
    return count > 0 ? Math.round(sum / count) : null;
  };

  const computeMediaGeralFromTable = React.useCallback(() => {
    const magSubjs = getMagisterioSubjects(selectedSpecialty);
    const flat = [...magSubjs.geralCientifica, ...magSubjs.pedagogica, ...magSubjs.metodologias];
    let sum = 0;
    let count = 0;

    flat.forEach(sub => {
      const avg = calcMagisterioSubjectAverage(sub);
      if (avg !== null && !isNaN(avg)) {
        sum += avg;
        count++;
      }
    });

    if (notaEstagio !== '' && notaEstagio !== null && !isNaN(Number(notaEstagio))) {
      sum += Number(notaEstagio);
      count++;
    }

    if (notaPAP !== '' && notaPAP !== null && !isNaN(Number(notaPAP))) {
      sum += Number(notaPAP);
      count++;
    }

    if (count === 0) return '';
    return String(Math.round(sum / count));
  }, [selectedSpecialty, magisterioGrades, notaEstagio, notaPAP]);

  React.useEffect(() => {
    if (subsistema === 'MAGISTERIO' && activeTab === 'CERTIFICADO') {
      const computed = computeMediaGeralFromTable();
      if (computed) {
        setMediaFinalCurso(computed);
      }
    }
  }, [computeMediaGeralFromTable, subsistema, activeTab]);


  const handlePunivGradeChange = (sub: string, cls: '10' | '11' | '12', val: string) => {
    setPunivGrades(prev => ({
      ...prev,
      [sub]: {
        ...(prev[sub] || { '10': '', '11': '', '12': '' }),
        [cls]: val
      }
    }));
  };

  const handleMagGradeChange = (sub: string, cls: '10' | '11' | '12' | '13', val: string) => {
    setMagisterioGrades(prev => ({
      ...prev,
      [sub]: {
        ...(prev[sub] || { '10': '', '11': '', '12': '', '13': '' }),
        [cls]: val
      }
    }));
  };

  // Map of subjects depending on selected class for Declaracao
  const getSubjectsForDeclClass = (cls: string, modality: string = subsistema, spec: string = selectedSpecialty) => {
    const grid = carregarGrelhaCurricular();
    const modKey = modality === 'PUNIV' ? 'PUNIV' : modality === 'MAGISTERIO' ? 'MAGISTERIO' : 'ENSINO_PRIMARIO';
    
    let items = grid.filter(item => 
      item.modality === modKey && 
      item.class === cls &&
      item.active !== false &&
      (modKey === 'ENSINO_PRIMARIO' || item.specialty === spec)
    );

    if (items.length > 0) {
      const codes = Array.from(new Set(items.map(i => i.subject)));
      return codes.map(c => getPrettySubjectName(c));
    }

    const num = parseInt(cls, 10);
    if (num >= 1 && num <= 4) {
      return ['Língua Portuguesa', 'Língua de Angola', 'Matemática', 'Estudo do Meio', 'E.M.P.', 'Educação Musical', 'Educação Física'];
    } else if (num >= 5 && num <= 6) {
      return ['Língua Portuguesa', 'Língua de Angola', 'Matemática', 'Ciências da Natureza', 'História', 'Geografia', 'Educação Moral e Cívica', 'Educação Visual e Plástica', 'Educação Musical', 'Educação Física'];
    } else if (num >= 7 && num <= 9) {
      return ['Língua Portuguesa', 'Língua Inglesa', 'Língua Francesa', 'Matemática', 'Biologia', 'Física', 'Química', 'Geografia', 'História', 'Educação Física', 'Educação Moral e Cívica', 'Educação Visual', 'Educação Laboral', 'Empreendedorismo'];
    }
    return ['Língua Portuguesa', 'Matemática', 'Estudo do Meio', 'Educação. Manual e Plástica', 'Educação Musical', 'Educação Física'];
  };

  const activeDeclSubjects = useMemo(() => {
    return getSubjectsForDeclClass(selectedClass, subsistema, selectedSpecialty);
  }, [selectedClass, subsistema, selectedSpecialty]);

  const calcPrimarioDeclAverage = useMemo(() => {
    const vals = activeDeclSubjects
      .map(s => decGrades[s])
      .filter((v): v is number => v !== '' && v !== undefined && v !== null && !isNaN(Number(v)))
      .map(Number);
    if (vals.length === 0) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round(sum / vals.length);
  }, [activeDeclSubjects, decGrades]);

  // Dynamic Subjects for Primário (1ª to 6ª) or 9ª Classe Certificate from Curriculum Grid
  const subjectsForCertificado = useMemo(() => {
    const grid = carregarGrelhaCurricular();
    const is9th = selectedClass === '9';

    if (is9th) {
      const items9th = grid.filter(i => 
        (i.modality === 'ENSINO_PRIMARIO' || (i.modality as string) === 'SECUNDARIO_GERAL' || (i.modality as string) === 'ESG') && 
        (i.class === '7' || i.class === '8' || i.class === '9') && 
        i.active !== false
      );

      if (items9th.length === 0) {
        return [
          { name: 'Língua Portuguesa', cycles: { I: true, II: true, III: true } },
          { name: 'Língua Inglesa', cycles: { I: true, II: true, III: true } },
          { name: 'Língua Francesa', cycles: { I: true, II: true, III: true } },
          { name: 'Matemática', cycles: { I: true, II: true, III: true } },
          { name: 'Biologia', cycles: { I: true, II: true, III: true } },
          { name: 'Física', cycles: { I: true, II: true, III: true } },
          { name: 'Química', cycles: { I: true, II: true, III: true } },
          { name: 'Geografia', cycles: { I: true, II: true, III: true } },
          { name: 'História', cycles: { I: true, II: true, III: true } },
          { name: 'Educação Física', cycles: { I: true, II: true, III: true } },
          { name: 'Educação Moral e Cívica', cycles: { I: true, II: true, III: true } },
          { name: 'Educação Visual', cycles: { I: true, II: true, III: true } },
          { name: 'Educação Laboral', cycles: { I: true, II: true, III: true } },
          { name: 'Empreendedorismo', cycles: { I: true, II: true, III: true } }
        ];
      }

      const map = new Map<string, { I: boolean; II: boolean; III: boolean }>();
      items9th.forEach(item => {
        const pretty = getPrettySubjectName(item.subject);
        if (!map.has(pretty)) {
          map.set(pretty, { I: false, II: false, III: false });
        }
        const cycles = map.get(pretty)!;
        const clsNum = parseInt(item.class, 10);
        if (clsNum === 7) cycles.I = true;
        if (clsNum === 8) cycles.II = true;
        if (clsNum === 9) cycles.III = true;
      });

      return Array.from(map.entries()).map(([name, cycles]) => ({ name, cycles }));
    }

    // Strictly filter for Ensino Primário (Classes 1 to 6). Do NOT include 7ª a 9ª classe!
    const primarioItems = grid.filter(i => 
      i.modality === 'ENSINO_PRIMARIO' && 
      parseInt(i.class, 10) >= 1 && 
      parseInt(i.class, 10) <= 6 && 
      i.active !== false
    );

    if (primarioItems.length === 0) {
      return [
        { name: 'Língua Portuguesa', cycles: { I: true, II: true, III: true } },
        { name: 'Matemática', cycles: { I: true, II: true, III: true } },
        { name: 'Estudo do Meio', cycles: { I: true, II: true, III: false } },
        { name: 'História', cycles: { I: false, II: false, III: true } },
        { name: 'Geografia', cycles: { I: false, II: false, III: true } },
        { name: 'Educação Moral e Cívica', cycles: { I: false, II: false, III: true } },
        { name: 'Ciência da Natureza', cycles: { I: false, II: false, III: true } },
        { name: 'Educação. Manual e Plástica', cycles: { I: true, II: true, III: true } },
        { name: 'Educação Musical', cycles: { I: true, II: true, III: true } },
        { name: 'Educação Física', cycles: { I: true, II: true, III: true } },
        { name: 'Língua de Origem Africana', cycles: { I: false, II: false, III: true } }
      ];
    }

    const map = new Map<string, { I: boolean; II: boolean; III: boolean }>();

    primarioItems.forEach(item => {
      const pretty = getPrettySubjectName(item.subject);
      if (!map.has(pretty)) {
        map.set(pretty, { I: false, II: false, III: false });
      }
      const cycles = map.get(pretty)!;
      const clsNum = parseInt(item.class, 10);
      if (clsNum === 1 || clsNum === 2) cycles.I = true;
      if (clsNum === 3 || clsNum === 4) cycles.II = true;
      if (clsNum === 5 || clsNum === 6) cycles.III = true;
    });

    return Array.from(map.entries()).map(([name, cycles]) => ({ name, cycles }));
  }, [selectedClass]);

  // Centralized Grade Population Logic for Selected Student
  const populateGradesForStudent = React.useCallback((
    student: Student,
    targetClass: string,
    targetSubsistema: string,
    targetSpecialty: string
  ) => {
    const targetName = (student.name || '').trim().toLowerCase();
    const targetBI = (student.bi || '').trim().toLowerCase();
    
    const studentIdsByClass: Record<string, string[]> = {};
    const allAssociatedIds = new Set<string>([student.id]);

    students.forEach(s => {
      const sName = (s.name || '').trim().toLowerCase();
      const sBI = (s.bi || '').trim().toLowerCase();
      const isMatch = s.id === student.id || (targetBI && sBI && sBI === targetBI) || (targetName && sName === targetName);
      if (isMatch) {
        allAssociatedIds.add(s.id);
        const rawCls = String(s.class || '').trim();
        const numCls = rawCls.replace(/\D/g, ''); // e.g. "10ª" -> "10"
        
        const clsKeys = [rawCls, numCls, `${numCls}ª`, `${numCls}ª Classe`, `${numCls}º`].filter(Boolean);
        clsKeys.forEach(k => {
          if (!studentIdsByClass[k]) studentIdsByClass[k] = [];
          if (!studentIdsByClass[k].includes(s.id)) studentIdsByClass[k].push(s.id);
        });
      }
    });

    const getGradeForSubjectAndClass = (targetSubj: string, clsStr: string): number | '' => {
      const classIds = studentIdsByClass[clsStr] || [];
      const searchIds = classIds.length > 0 ? classIds : Array.from(allAssociatedIds);

      const matchingGrades = grades.filter(g => 
        searchIds.includes(g.studentId) && isSameSubject(g.subject, targetSubj)
      );

      if (matchingGrades.length === 0) return '';

      // Helper to extract/calculate MT for each trimester
      const getMT = (trim: 'I' | 'II' | 'III'): number | null => {
        const row = matchingGrades.find(g => g.trimester === trim);
        if (!row) return null;
        if (row.mt !== null && row.mt !== undefined && !isNaN(Number(row.mt))) return Number(row.mt);
        if (row.mac !== null && row.mac !== undefined && !isNaN(Number(row.mac))) {
          const p = row.npt ?? row.npp;
          if (p !== null && p !== undefined && !isNaN(Number(p))) {
            return (Number(row.mac) + Number(p)) / 2;
          }
        }
        return null;
      };

      const g1 = getMT('I');
      const g2 = getMT('II');
      const g3 = getMT('III');

      if (g1 === null && g2 === null && g3 === null) return '';

      const mt1 = g1 ?? 0;
      const mt2 = g2 ?? 0;
      const mt3 = g3 ?? 0;

      // Calculate MFD (Média Final da Disciplina) = (MT1 + MT2 + MT3) / 3
      const exactMfd = (mt1 + mt2 + mt3) / 3;

      let roundedMfd = Math.floor(exactMfd);
      if (exactMfd - roundedMfd >= 0.5) {
        roundedMfd += 1;
      }

      return roundedMfd;
    };

    // 1. Populate Certificado Grades (1ª to 6ª Classe OR 7ª to 9ª Classe)
    const updatedCert: Record<string, Record<'I' | 'II' | 'III', number | ''>> = {};
    const is9th = targetClass === '9';

    subjectsForCertificado.forEach(subj => {
      const key = subj.name;
      const dbSubjName = getDbSubjectName(key);

      let iGrade: number | '' = '';
      let iiGrade: number | '' = '';
      let iiiGrade: number | '' = '';

      if (is9th) {
        // 7ª Classe, 8ª Classe, 9ª Classe
        iGrade = getGradeForSubjectAndClass(dbSubjName, '7');
        iiGrade = getGradeForSubjectAndClass(dbSubjName, '8');
        iiiGrade = getGradeForSubjectAndClass(dbSubjName, '9');
      } else {
        // 2ª Classe (or 1ª), 4ª Classe (or 3ª), 6ª Classe (or 5ª)
        iGrade = getGradeForSubjectAndClass(dbSubjName, '2') || getGradeForSubjectAndClass(dbSubjName, '1');
        iiGrade = getGradeForSubjectAndClass(dbSubjName, '4') || getGradeForSubjectAndClass(dbSubjName, '3');
        iiiGrade = getGradeForSubjectAndClass(dbSubjName, '6') || getGradeForSubjectAndClass(dbSubjName, '5');
      }

      updatedCert[key] = {
        I: iGrade,
        II: iiGrade,
        III: iiiGrade
      };
    });
    setCertGrades(updatedCert);

    // 2. Populate Declaração Grades for targetClass
    const updatedDec: Record<string, number | ''> = {};
    const declSubjects = getSubjectsForDeclClass(targetClass, targetSubsistema, targetSpecialty);
    declSubjects.forEach(subj => {
      const dbSubjName = getDbSubjectName(subj);
      const val = getGradeForSubjectAndClass(dbSubjName, targetClass);
      updatedDec[subj] = val;
    });
    setDecGrades(updatedDec);

    // 3. Populate High School PUNIV Grades
    const punivSubjs = getPunivSubjects(targetSpecialty);
    const allPunivSubjs = [...punivSubjs.geral, ...punivSubjs.especifica, ...punivSubjs.opcao];
    const initialPunivGrades: Record<string, Record<'10' | '11' | '12', string>> = {};
    allPunivSubjs.forEach(sub => {
      const dbSub = getDbSubjectName(sub);
      const g10 = getGradeForSubjectAndClass(dbSub, '10');
      const g11 = getGradeForSubjectAndClass(dbSub, '11');
      const g12 = getGradeForSubjectAndClass(dbSub, '12');

      initialPunivGrades[sub] = {
        '10': g10 !== '' ? String(g10) : '',
        '11': g11 !== '' ? String(g11) : '',
        '12': g12 !== '' ? String(g12) : ''
      };
    });
    setPunivGrades(initialPunivGrades);

    // 4. Populate Magistério Grades
    const magSubjs = getMagisterioSubjects(targetSpecialty);
    const allMagSubjs = [...magSubjs.geralCientifica, ...magSubjs.pedagogica, ...magSubjs.metodologias];
    const initialMagGrades: Record<string, Record<'10' | '11' | '12' | '13', string>> = {};
    allMagSubjs.forEach(sub => {
      const dbSub = getDbSubjectName(sub);
      const g10 = getGradeForSubjectAndClass(dbSub, '10');
      const g11 = getGradeForSubjectAndClass(dbSub, '11');
      const g12 = getGradeForSubjectAndClass(dbSub, '12');
      const g13 = getGradeForSubjectAndClass(dbSub, '13');

      initialMagGrades[sub] = {
        '10': g10 !== '' ? String(g10) : '',
        '11': g11 !== '' ? String(g11) : '',
        '12': g12 !== '' ? String(g12) : '',
        '13': g13 !== '' ? String(g13) : ''
      };
    });
    setMagisterioGrades(initialMagGrades);

    // 5. Try to find Estágio/PAP if student in 13ª classe (look up directly from 13ª Class Pauta & system grades)
    let estagioVal = '';
    let papVal = '';
    let mfVal = '';

    const necGrade = grades.find(g => allAssociatedIds.has(g.studentId) && (
      isSameSubject(g.subject, 'NEC') || 
      isSameSubject(g.subject, 'Estágio') || 
      isSameSubject(g.subject, 'Prática Pedagógica')
    ));
    const papGrade = grades.find(g => allAssociatedIds.has(g.studentId) && (
      isSameSubject(g.subject, 'PAP') || 
      isSameSubject(g.subject, 'Trabalho de Conclusão')
    ));
    
    if (necGrade) {
      if (necGrade.mt !== null && necGrade.mt !== undefined) estagioVal = String(Math.round(necGrade.mt));
      else if (necGrade.mac !== null && necGrade.npt !== null) estagioVal = String(Math.round((necGrade.mac + necGrade.npt) / 2));
      else if (necGrade.mac !== null && necGrade.mac !== undefined) estagioVal = String(Math.round(necGrade.mac));
      else if (necGrade.npt !== null && necGrade.npt !== undefined) estagioVal = String(Math.round(necGrade.npt));
    }
    if (papGrade) {
      if (papGrade.mt !== null && papGrade.mt !== undefined) papVal = String(Math.round(papGrade.mt));
      else if (papGrade.mac !== null && papGrade.npt !== null) papVal = String(Math.round((papGrade.mac + papGrade.npt) / 2));
      else if (papGrade.mac !== null && papGrade.mac !== undefined) papVal = String(Math.round(papGrade.mac));
      else if (papGrade.npt !== null && papGrade.npt !== undefined) papVal = String(Math.round(papGrade.npt));
    }

    // Check sigep_13_grades_v2 (from PautaAnnual 13ª classe)
    try {
      const saved13Grades = localStorage.getItem('sigep_13_grades_v2');
      if (saved13Grades) {
        const parsed13 = JSON.parse(saved13Grades);
        const s13Obj = parsed13[student.id];
        if (s13Obj) {
          if (!estagioVal && s13Obj.nec !== undefined && s13Obj.nec !== 0) estagioVal = String(s13Obj.nec);
          if (!papVal && s13Obj.pap !== undefined && s13Obj.pap !== 0) papVal = String(s13Obj.pap);
        }
      }
    } catch (e) {}

    // Check sigep_pauta_exame_13_* & sigep_exam_rows_13
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sigep_pauta_exame_13') || key === 'sigep_exam_rows_13')) {
          const val = localStorage.getItem(key);
          if (val) {
            const rows13 = JSON.parse(val) as any[];
            const matchedRow = rows13.find(r => r.id === student.id || (r.name && r.name.toLowerCase() === student.name.toLowerCase()));
            if (matchedRow) {
              if (!estagioVal && matchedRow.nec !== undefined && matchedRow.nec !== 0) estagioVal = String(matchedRow.nec);
              if (!papVal && matchedRow.pap !== undefined && matchedRow.pap !== 0) papVal = String(matchedRow.pap);
              if (!mfVal && matchedRow.mf !== undefined && matchedRow.mf !== 0) mfVal = String(matchedRow.mf);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error looking up 13th grade data in DeclaracoesCertificados:", err);
    }

    // Compute mediaFinalCurso if not set
    if (!mfVal && estagioVal && papVal) {
      const pVal = parseFloat(papVal) || 0;
      const eVal = parseFloat(estagioVal) || 0;
      let sumCls = 0, countCls = 0;

      ['10', '11', '12'].forEach(cKey => {
        let sum = 0, count = 0;
        Object.values(initialMagGrades).forEach(subGrades => {
          const v = parseFloat(subGrades[cKey as '10' | '11' | '12']);
          if (!isNaN(v)) {
            sum += v;
            count++;
          }
        });
        if (count > 0) {
          sumCls += (sum / count);
          countCls++;
        }
      });

      if (countCls > 0) {
        const ma = sumCls / countCls;
        const computedMf = (ma * 0.4) + (pVal * 0.3) + (eVal * 0.3);
        mfVal = String(Math.round(computedMf));
      } else {
        mfVal = String(Math.round((pVal + eVal) / 2));
      }
    }

    setNotaEstagio(estagioVal || '');
    setNotaPAP(papVal || '');
    setMediaFinalCurso(mfVal || '');
  }, [students, grades, subjectsForCertificado]);

  // Handle student search filtering
  const filteredStudents = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return students.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.id.toLowerCase().includes(q) ||
      (s.bi && s.bi.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [students, searchQuery]);

  // Auto-select student when searchQuery matches student ID or BI directly
  React.useEffect(() => {
    if (!searchQuery) return;
    const q = searchQuery.trim().toLowerCase();
    const exactMatch = students.find(s => 
      s.id.toLowerCase() === q || 
      (s.bi && s.bi.toLowerCase() === q)
    );
    if (exactMatch && (!selectedStudent || selectedStudent.id !== exactMatch.id)) {
      handleSelectStudent(exactMatch);
    }
  }, [searchQuery, students, selectedStudent]);

  // Autopopulate fields when a student is selected
  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setStudentName(student.name || '');
    setGender(student.gender || 'M');
    setFatherName(student.fatherName || '');
    setMotherName(student.motherName || '');
    setBirthDate(student.birthDate || '');
    setNaturalidade(student.naturalidade || '');
    setMunicipio(student.municipio || student.naturalidade || schoolSettings.municipality || '');
    setProvincia(student.province || schoolSettings.province || '');
    const resolvedDocType = (student.docType || (student.cedulaRegisto && !student.bi ? 'CEDULA' : 'BI')) as 'BI' | 'CEDULA' | 'PASSAPORTE';
    setDocTypeSelected(resolvedDocType);
    const resolvedDocNum = resolvedDocType === 'CEDULA' ? (student.cedulaRegisto || student.bi || '') : (student.bi || student.cedulaRegisto || '');
    setBiNumber(resolvedDocNum);
    setBiSector(student.biSector || '');
    setBiDate(student.biDate || '');
    setSelectedClass(student.class);
    setSelectedTurma(student.section);
    setSearchQuery('');

    // Auto-calculate student position for Folha / Pauta
    const sameClassStudents = students.filter(s => s.class === student.class && s.section === student.section);
    const posIndex = sameClassStudents.findIndex(s => s.id === student.id);
    const posNum = posIndex >= 0 ? posIndex + 1 : 1;
    setFolhaRegisto(String(posNum).padStart(3, '0'));

    if (!livroRegisto || livroRegisto === '14') {
      const pautaCode = gerarCodigoPauta(anoLectivo, student.class);
      setLivroRegisto(pautaCode);
    }

    // Auto-select corresponding level/cycle, subsystem, and document type (Certificado vs Declaração) based on class
    const clsNum = parseInt(student.class, 10);
    let targetSub = subsistema;
    let targetSpec = selectedSpecialty;

    if (clsNum >= 1 && clsNum <= 2) {
      setSelectedNivel('I');
      targetSub = 'PRIMARIO';
      setSubsistema('PRIMARIO');
      setActiveTab('DECLARACAO');
    } else if (clsNum >= 3 && clsNum <= 4) {
      setSelectedNivel('II');
      targetSub = 'PRIMARIO';
      setSubsistema('PRIMARIO');
      setActiveTab('DECLARACAO');
    } else if (clsNum === 5 || clsNum === 7 || clsNum === 8) {
      setSelectedNivel('III');
      targetSub = 'PRIMARIO';
      setSubsistema('PRIMARIO');
      setActiveTab('DECLARACAO');
    } else if (clsNum === 6 || clsNum === 9) {
      setSelectedNivel('TODOS');
      targetSub = 'PRIMARIO';
      setSubsistema('PRIMARIO');
      setActiveTab('CERTIFICADO');
    } else {
      setSelectedNivel('TODOS');
      // High school: determine if PUNIV or MAGISTERIO
      const sec = (student.section || '').toUpperCase();
      const spec = student.specialty || (
        sec.startsWith('CB') || sec.startsWith('FM') ? 'CFB' :
        sec.startsWith('CSE') || sec.startsWith('CEJ') ? 'CEJ' :
        sec.startsWith('CS') || sec.startsWith('HUM') ? 'CS' :
        sec.startsWith('LA') || sec.startsWith('AV') ? 'AV' :
        sec.startsWith('MF') ? 'MF' :
        sec.startsWith('EP') ? 'EP' :
        sec.startsWith('BQ') ? 'BQ' :
        sec.startsWith('ING') ? 'ING_EMC' :
        sec.startsWith('FRA') ? 'FRA_EMC' :
        sec.startsWith('EVP') ? 'EVP' :
        sec.startsWith('EDF') || sec.startsWith('EF') ? 'EDF' :
        sec.startsWith('EMC') || sec.startsWith('MOR') ? 'EMC' :
        sec.startsWith('LE') || sec.startsWith('MC') ? 'LEMC' :
        sec.startsWith('GH') || sec.startsWith('HIS') ? 'GH' :
        sec.startsWith('PE') ? 'PE' : 'CFB'
      );
      
      targetSpec = spec as any;
      setSelectedSpecialty(targetSpec);
      
      const isMag = ['MF', 'EP', 'BQ', 'LEMC', 'GH', 'PE', 'ING_EMC', 'FRA_EMC', 'EVP', 'EDF', 'EMC'].includes(targetSpec);
      targetSub = isMag ? 'MAGISTERIO' : 'PUNIV';
      setSubsistema(targetSub as any);

      if (clsNum === 10 || clsNum === 11) {
        setActiveTab('DECLARACAO');
      } else if (clsNum === 12) {
        setActiveTab(isMag ? 'DECLARACAO' : 'CERTIFICADO');
      } else if (clsNum === 13) {
        setActiveTab('CERTIFICADO');
      }
    }

    // Populate all grade tables immediately
    populateGradesForStudent(student, student.class, targetSub, targetSpec);
  };

  // Re-run grade population whenever selected student, class, subsystem or specialty changes
  React.useEffect(() => {
    if (selectedStudent) {
      populateGradesForStudent(selectedStudent, selectedClass, subsistema, selectedSpecialty);
    }
  }, [selectedStudent, selectedClass, subsistema, selectedSpecialty, populateGradesForStudent]);

  const handleClearSelectedStudent = () => {
    setSelectedStudent(null);
    setStudentName('');
    setFatherName('');
    setMotherName('');
    setBirthDate('');
    setNaturalidade('');
    setBiNumber('');
    setBiSector('');
    setBiDate('');
  };

  // Convert birth date string (YYYY-MM-DD or standard) to words/formal Portuguese format
  const formatBirthDateExtended = (dateStr: string) => {
    if (!dateStr) return '_____/_____/_____';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return `${day} de ${MESES[month]} de ${year}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const getBirthDayMonthYear = (dateStr: string) => {
    if (!dateStr) return { day: '____', month: '__________', year: '_______' };
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return {
          day: String(parseInt(parts[2], 10)),
          month: MESES[parseInt(parts[1], 10) - 1],
          year: parts[0]
        };
      }
    } catch (e) {}
    return { day: '____', month: '__________', year: '_______' };
  };

  const handleCertGradeChange = (subj: string, cycle: 'I' | 'II' | 'III', val: string) => {
    const classNum = parseInt(selectedClass, 10) || 1;
    const maxVal = classNum >= 7 ? 20 : 10;
    const numVal = val === '' ? '' : Math.min(maxVal, Math.max(0, parseInt(val, 10) || 0));
    setCertGrades(prev => ({
      ...prev,
      [subj]: {
        ...prev[subj],
        [cycle]: numVal
      }
    }));
  };

  const handleDecGradeChange = (subj: string, val: string) => {
    const classNum = parseInt(selectedClass, 10) || 1;
    const maxVal = classNum >= 7 ? 20 : 10;
    const numVal = val === '' ? '' : Math.min(maxVal, Math.max(0, parseInt(val, 10) || 0));
    setDecGrades(prev => ({
      ...prev,
      [subj]: numVal
    }));
  };

  // Compute final averages for Certificado
  const certComputedAverages = useMemo(() => {
    const results: Record<string, { media: number | null; extenso: string }> = {};
    let sumTotal = 0;
    let countTotal = 0;

    subjectsForCertificado.forEach(subj => {
      const vals: number[] = [];
      const gradesObj = certGrades[subj.name] || { I: '', II: '', III: '' };
      
      if (selectedNivel === 'TODOS') {
        if (subj.cycles.I && gradesObj.I !== '') vals.push(Number(gradesObj.I));
        if (subj.cycles.II && gradesObj.II !== '') vals.push(Number(gradesObj.II));
        if (subj.cycles.III && gradesObj.III !== '') vals.push(Number(gradesObj.III));
      } else {
        const cycleKey = selectedNivel;
        if (subj.cycles[cycleKey] && gradesObj[cycleKey] !== '') {
          vals.push(Number(gradesObj[cycleKey]));
        }
      }

      if (vals.length > 0) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const rounded = Math.round(avg);
        results[subj.name] = {
          media: rounded,
          extenso: notaParaExtenso(rounded)
        };
        sumTotal += rounded;
        countTotal++;
      } else {
        results[subj.name] = {
          media: null,
          extenso: '-----'
        };
      }
    });

    const globalAvg = countTotal > 0 ? Math.round(sumTotal / countTotal) : null;

    return {
      rows: results,
      globalAverage: globalAvg,
      globalAverageExtenso: globalAvg !== null ? notaParaExtenso(globalAvg) : '-----'
    };
  }, [certGrades, selectedNivel]);

  // Compute average of selected single cycle
  const singleCycleAverage = useMemo(() => {
    let sum = 0;
    let count = 0;
    let cyclesToRender: ('I' | 'II' | 'III')[] = [];
    if (selectedNivel === 'I') cyclesToRender = ['I'];
    else if (selectedNivel === 'II') cyclesToRender = ['II'];
    else if (selectedNivel === 'III') cyclesToRender = ['III'];
    else cyclesToRender = ['I', 'II', 'III'];

    const cycleKey = cyclesToRender[0];
    subjectsForCertificado.forEach(subj => {
      const gradesObj = certGrades[subj.name];
      if (subj.cycles[cycleKey] && gradesObj && gradesObj[cycleKey] !== '') {
        sum += Number(gradesObj[cycleKey]);
        count++;
      }
    });
    const avg = count > 0 ? Math.round(sum / count) : null;
    return {
      media: avg,
      extenso: avg !== null ? notaParaExtenso(avg) : '____'
    };
  }, [certGrades, selectedNivel]);

  // Compute overall average for Declaracao
  const decComputedAverage = useMemo(() => {
    let sum = 0;
    let count = 0;
    activeDeclSubjects.forEach(subj => {
      const val = decGrades[subj];
      if (val !== undefined && val !== '') {
        sum += Number(val);
        count++;
      }
    });
    const avg = count > 0 ? Math.round(sum / count) : 0;
    return {
      average: avg,
      extenso: notaParaExtenso(avg)
    };
  }, [decGrades, activeDeclSubjects]);

  // Audit function to verify student history before document emission (Non-blocking)
  const auditCertificadoData = (): boolean => {
    return true;
  };

  // Active logo URL based on school settings
  const logoUrl = schoolSettings.logoType === 'PUBLIC' ? schoolSettings.publicLogoUrl : schoolSettings.privateLogoUrl;

  // Print PDF: CERTIFICADO DO MAGISTÉRIO (13ª CLASSE)
  const generateMagisterioCertificadoPDF = () => {
    if (!auditCertificadoData()) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const dInfo = getBirthDayMonthYear(birthDate);
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = MESES[today.getMonth()];
    const currentYear = today.getFullYear();

    // 1. Double border (high-fidelity classic pedagogical certificate)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(8, 8, 194, 281);
    doc.setLineWidth(0.2);
    doc.rect(9.5, 9.5, 191, 278);

    // 2. Header
    const emblemY = 14;
    let logoAdded = false;
    
    // Add Wikimedia Coat of Arms of Angola for high authenticity!
    const coatOfArmsUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Coat_of_arms_of_Angola.svg/150px-Coat_of_arms_of_Angola.svg.png';
    const activeLogoUrl = logoUrl || coatOfArmsUrl;

    if (activeLogoUrl && (activeLogoUrl.startsWith('data:') || activeLogoUrl.startsWith('http'))) {
      try {
        let format = 'PNG';
        if (activeLogoUrl.includes('image/jpeg') || activeLogoUrl.includes('image/jpg')) {
          format = 'JPEG';
        }
        doc.addImage(activeLogoUrl, format, 98, emblemY, 14, 14);
        logoAdded = true;
      } catch (err) {
        console.error('Error adding logo:', err);
      }
    }

    if (!logoAdded) {
      // Fallback geometric coat of arms representation
      doc.setDrawColor(185, 28, 28);
      doc.setLineWidth(0.5);
      doc.circle(105, emblemY + 7, 7, 'D');
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('REPÚBLICA DE ANGOLA', 105, emblemY + 19, { align: 'center' });
    doc.setFontSize(8);
    doc.text('MINISTÉRIO DA EDUCAÇÃO', 105, emblemY + 23, { align: 'center' });
    doc.text('ENSINO SECUNDÁRIO PEDAGÓGICO', 105, emblemY + 27, { align: 'center' });

    // Certificate title in bold dark
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('CERTIFICADO', 105, emblemY + 34, { align: 'center' });

    // 3. Body text
    const directorTitle = schoolSettings.directorRoleLabel || 'Director';
    const directorNameText = schoolSettings.directorName || 'Manuel das Fisgas';
    const schoolNameText = schoolSettings.schoolName || 'Complexo Escolar';
    const student = studentName || 'NOME DO ALUNO';
    const father = fatherName || 'Nome do Pai';
    const mother = motherName || 'Nome da Mãe';
    const nat = naturalidade || 'Cafunfo';
    const mun = municipio || 'Cuango';
    const prov = provincia || 'Lunda Norte';
    const bi = biNumber || '005580255LN078';
    const biSec = biSector || 'Identificação';
    
    const biDayInfo = getBirthDayMonthYear(biDate);
    const biDayText = biDayInfo.day;
    const biMonthText = biDayInfo.month;
    const biYearText = biDayInfo.year;

    const spec = selectedSpecialty === 'EP' ? 'ENSINO PRIMÁRIO' :
                 selectedSpecialty === 'PE' ? 'PRÉ-ESCOLAR' :
                 selectedSpecialty === 'MF' ? 'MATEMÁTICA E FÍSICA' :
                 selectedSpecialty === 'BQ' ? 'BIOLOGIA E QUÍMICA' :
                 selectedSpecialty === 'GH' ? 'GEOGRAFIA E HISTÓRIA' : 'ENSINO PRIMÁRIO';
                 
    const mediaFinal = mediaFinalCurso || '____';

    const docDetails = getDocTypeDetails(docTypeSelected, gender, bi, biSec);
    const dateIssuedPart = biDate ? `, aos ${biDayText} de ${biMonthText} de ${biYearText}` : '';

    const pronomeFilho = gender === 'F' ? 'filha' : 'filho';
    const pronomeNascido = gender === 'F' ? 'nascida' : 'nascido';
    const pronomePortador = gender === 'F' ? 'portadora' : 'portador';

    const formattedDocPhrase = docDetails.docPhrase ? (docDetails.docPhrase.charAt(0).toUpperCase() + docDetails.docPhrase.slice(1)) : '';
    const formattedStudent = toTitleCaseName(student) || student;
    const formattedFather = toTitleCaseName(father) || father;
    const formattedMother = toTitleCaseName(mother) || mother;
    const formattedNat = toTitleCaseName(nat) || nat;
    const formattedMun = toTitleCaseName(mun) || mun;
    const formattedProv = toTitleCaseName(prov) || prov;

    let docPhrasePrefix = `${pronomePortador} do B.I. n.º `;
    if (docTypeSelected === 'CEDULA') {
      docPhrasePrefix = `${pronomePortador} da Cédula de Registo Pessoal n.º `;
    } else if (docTypeSelected === 'PASSAPORTE') {
      docPhrasePrefix = `${pronomePortador} do Passaporte n.º `;
    }

    const currentLeiBase = leiBaseText || getLeiBaseForCertificate(schoolSettings, 'MAGISTERIO', '13');

    const segments = [
      { text: directorNameText, bold: true, color: [0, 0, 0] },
      { text: `, ${directorTitle} do ${schoolNameText}, criado sob o ${decretoCriacao}, CERTIFICA que, ` },
      { text: formattedStudent, bold: true, color: [220, 38, 38] },
      { text: `, ${pronomeFilho} de ${formattedFather} e de ${formattedMother}, natural de ${formattedNat}, Município de ${formattedMun}, Província de ${formattedProv}, ${pronomeNascido} aos ${dInfo.day} de ${dInfo.month} de ${dInfo.year}. ${docPhrasePrefix}` },
      { text: `${bi || '_______________________'}`, bold: true, color: [0, 0, 0] },
      { text: `, ${docDetails.issuerPhrase}${dateIssuedPart}. Concluiu no Ano Lectivo ${anoLectivo} o curso de II CICLO DO ENSINO SECUNDÁRIO PEDAGÓGICO, na Especialidade de ` },
      { text: spec.toUpperCase(), bold: true, color: [220, 38, 38] },
      { text: `, conforme o ${currentLeiBase}, com o resultado final de apto(a) com uma Média geral de ` },
      { text: `${mediaFinal} Valores`, bold: true, color: [220, 38, 38] },
      { text: ` obtida nas seguintes classificações:` }
    ];

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    const bodyY = emblemY + 40;
    const endBodyY = renderRichText(doc, segments, 15, bodyY, 180, 5.8);

    // 4. Draw grades table
    const magSubjs = getMagisterioSubjects(selectedSpecialty);
    const activeGeral = magSubjs.geralCientifica;
    const activeEducacional = [...magSubjs.pedagogica, ...magSubjs.metodologias];
    
    // We calculate total rows to set dynamic row height (ensuring no blank space!)
    const totalRows = 1 + 1 + activeGeral.length + 1 + activeEducacional.length + 1 + 2 + 1 + 1; 
    const tableStartY = endBodyY + 4;
    const maxTableEndY = 236; 
    const tableHeight = maxTableEndY - tableStartY;
    const rowHeight = Math.min(6.2, tableHeight / totalRows);

    let currentY = tableStartY;

    // Draw Table Header
    doc.setFillColor(243, 244, 246);
    doc.rect(15, currentY, 180, rowHeight, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    doc.text('Disciplinas', 17, currentY + (rowHeight/2) + 1);
    doc.text('10ª Cl.', 78, currentY + (rowHeight/2) + 1, { align: 'center' });
    doc.text('11ª Cl.', 93, currentY + (rowHeight/2) + 1, { align: 'center' });
    doc.text('12ª Cl.', 108, currentY + (rowHeight/2) + 1, { align: 'center' });
    doc.text('13ª Cl.', 123, currentY + (rowHeight/2) + 1, { align: 'center' });
    doc.text('Média Final', 142, currentY + (rowHeight/2) + 1, { align: 'center' });
    doc.text('Média por Extenso', 172, currentY + (rowHeight/2) + 1, { align: 'center' });

    // Lines
    doc.line(71, currentY, 71, currentY + rowHeight);
    doc.line(86, currentY, 86, currentY + rowHeight);
    doc.line(101, currentY, 101, currentY + rowHeight);
    doc.line(116, currentY, 116, currentY + rowHeight);
    doc.line(131, currentY, 131, currentY + rowHeight);
    doc.line(152, currentY, 152, currentY + rowHeight);

    currentY += rowHeight;

    // Helper to render table section header
    const renderSectionHeader = (label: string) => {
      doc.setFillColor(243, 244, 246);
      doc.rect(15, currentY, 180, rowHeight, 'FD');
      doc.setFont('times', 'bold');
      doc.setFontSize(7.5);
      doc.text(label.toUpperCase(), 17, currentY + (rowHeight/2) + 1);
      currentY += rowHeight;
    };

    // Helper to render subject row
    const renderSubjectRow = (subjName: string, isEstagio: boolean = false) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(15, currentY, 180, rowHeight, 'FD');
      doc.setFont('times', 'normal');
      doc.setFontSize(7);

      doc.text(formatSiglaOnly(subjName), 17, currentY + (rowHeight/2) + 1);

      const vals = magisterioGrades[subjName] || { '10': '', '11': '', '12': '', '13': '' };

      if (isEstagio) {
        // Estágio: shade 10ª, 11ª, 12ª
        doc.setFillColor(243, 244, 246);
        doc.rect(71, currentY, 45, rowHeight, 'F');
        doc.rect(15, currentY, 180, rowHeight, 'D'); // redraw border

        const estGrade = subjName === 'NEC' ? notaEstagio : notaPAP;
        doc.setFont('times', 'bold');
        doc.text(estGrade ? String(estGrade) : '--', 123, currentY + (rowHeight/2) + 1, { align: 'center' });
        doc.text(estGrade ? String(estGrade) : '--', 142, currentY + (rowHeight/2) + 1, { align: 'center' });
        doc.text(estGrade ? notaParaExtenso(Number(estGrade)) : '--', 172, currentY + (rowHeight/2) + 1, { align: 'center' });
      } else {
        // Academic: shade 13ª
        doc.setFillColor(243, 244, 246);
        doc.rect(116, currentY, 15, rowHeight, 'F');
        doc.rect(15, currentY, 180, rowHeight, 'D'); // redraw border

        doc.setFont('times', 'normal');
        doc.text(vals['10'] ? String(vals['10']) : '--', 78, currentY + (rowHeight/2) + 1, { align: 'center' });
        doc.text(vals['11'] ? String(vals['11']) : '--', 93, currentY + (rowHeight/2) + 1, { align: 'center' });
        doc.text(vals['12'] ? String(vals['12']) : '--', 108, currentY + (rowHeight/2) + 1, { align: 'center' });

        const avg = calcMagisterioSubjectAverage(subjName);
        if (avg !== null) {
          doc.setFont('times', 'bold');
          doc.text(String(avg), 142, currentY + (rowHeight/2) + 1, { align: 'center' });
          doc.setFont('times', 'normal');
          doc.text(notaParaExtenso(avg), 172, currentY + (rowHeight/2) + 1, { align: 'center' });
        } else {
          doc.text('--', 142, currentY + (rowHeight/2) + 1, { align: 'center' });
          doc.text('--', 172, currentY + (rowHeight/2) + 1, { align: 'center' });
        }
      }

      // Re-draw grid lines
      doc.line(71, currentY, 71, currentY + rowHeight);
      doc.line(86, currentY, 86, currentY + rowHeight);
      doc.line(101, currentY, 101, currentY + rowHeight);
      doc.line(116, currentY, 116, currentY + rowHeight);
      doc.line(131, currentY, 131, currentY + rowHeight);
      doc.line(152, currentY, 152, currentY + rowHeight);

      currentY += rowHeight;
    };

    // Render Formação Geral
    renderSectionHeader('Formação Geral');
    activeGeral.forEach(sub => renderSubjectRow(sub));

    // Render Formação Educacional
    renderSectionHeader('Formação Educacional');
    activeEducacional.forEach(sub => renderSubjectRow(sub));

    // Render Estágio
    renderSectionHeader('Estágio Ped. Supervisionado');
    renderSubjectRow('NEC', true);
    renderSubjectRow('PAP', true);

    // Média Anual (MA) row
    doc.setFillColor(255, 255, 255);
    doc.rect(15, currentY, 180, rowHeight, 'FD');
    doc.setFont('times', 'bold');
    doc.text('Média Anual (MA)', 17, currentY + (rowHeight/2) + 1);

    const ma10 = calcMagisterioClassAverage('10');
    const ma11 = calcMagisterioClassAverage('11');
    const ma12 = calcMagisterioClassAverage('12');

    if (ma10) doc.text(String(ma10), 78, currentY + (rowHeight/2) + 1, { align: 'center' });
    if (ma11) doc.text(String(ma11), 93, currentY + (rowHeight/2) + 1, { align: 'center' });
    if (ma12) doc.text(String(ma12), 108, currentY + (rowHeight/2) + 1, { align: 'center' });

    // shade the rest of MA row
    doc.setFillColor(243, 244, 246);
    doc.rect(116, currentY, 79, rowHeight, 'F');
    doc.rect(15, currentY, 180, rowHeight, 'D'); // border

    doc.line(71, currentY, 71, currentY + rowHeight);
    doc.line(86, currentY, 86, currentY + rowHeight);
    doc.line(101, currentY, 101, currentY + rowHeight);
    doc.line(116, currentY, 116, currentY + rowHeight);
    doc.line(131, currentY, 131, currentY + rowHeight);
    doc.line(152, currentY, 152, currentY + rowHeight);

    currentY += rowHeight;

    // Média Final do Curso (MFC) row
    doc.setFillColor(255, 255, 255);
    doc.rect(15, currentY, 180, rowHeight, 'FD');
    doc.setFont('times', 'bolditalic');
    doc.text('Média Final do Curso (MFC)', 17, currentY + (rowHeight/2) + 1);

    // shade cols 10,11,12,13
    doc.setFillColor(243, 244, 246);
    doc.rect(71, currentY, 60, rowHeight, 'F');
    doc.rect(15, currentY, 180, rowHeight, 'D'); // border

    doc.setFont('times', 'bold');
    if (mediaFinal) {
      doc.text(String(mediaFinal), 142, currentY + (rowHeight/2) + 1, { align: 'center' });
      doc.text(notaParaExtenso(Number(mediaFinal)).toUpperCase(), 172, currentY + (rowHeight/2) + 1, { align: 'center' });
    }

    doc.line(71, currentY, 71, currentY + rowHeight);
    doc.line(86, currentY, 86, currentY + rowHeight);
    doc.line(101, currentY, 101, currentY + rowHeight);
    doc.line(116, currentY, 116, currentY + rowHeight);
    doc.line(131, currentY, 131, currentY + rowHeight);
    doc.line(152, currentY, 152, currentY + rowHeight);

    // 5. Legal disclaimer at bottom of table
    const footerY = currentY + rowHeight + 4;
    doc.setFont('times', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);

    const schoolNameText1774 = schoolSettings.schoolName || 'Magistério';
    const schoolMunText1774 = schoolSettings.municipality || 'Cuango';
    const legalText = `Para efeitos legais lhe é passado o presente CERTIFICADO, que consta no livro de registo n.º ${livroRegisto || '_______'} folha n.º ${folhaRegisto || '_______'}, assinado por mim e autenticado com carimbo a óleo/selo branco em uso neste estabelecimento de ensino.`;
    doc.text(legalText, 15, footerY, { align: 'justify', maxWidth: 178 });

    doc.setFont('times', 'bold');
    doc.text(`${schoolNameText1774} do ${schoolMunText1774}, aos ${currentDay} de ${currentMonth} de ${currentYear}.`, 105, footerY + 8, { align: 'center' });

    // 6. Signatures (Single Director signature line as requested!)
    const sigY = footerY + 16;
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text('Conferido por', 50, sigY, { align: 'center' });
    doc.text(String(schoolSettings.directorRoleLabel || 'O Director').toUpperCase(), 150, sigY, { align: 'center' });

    doc.line(20, sigY + 10, 80, sigY + 10);
    doc.line(115, sigY + 10, 185, sigY + 10);

    doc.setFont('times', 'bolditalic');
    doc.text(`( ${directorNameText.toUpperCase()} )`, 150, sigY + 14, { align: 'center' });

    // Institutional Contact Footer
    const schoolPhone = schoolSettings.phone || '+244 923 000 000';
    const schoolAddr = schoolSettings.address || `${schoolSettings.municipality || 'Cafunfo'}, ${schoolSettings.province || 'Lunda Norte'}`;
    const schoolMail = schoolSettings.email || 'contacto@escola.ao';

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(15, 280, 195, 280);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Contacto: ${schoolPhone}  |  Endereço: ${schoolAddr}  |  E-mail: ${schoolMail}`, 105, 284, { align: 'center' });

    doc.save(`Certificado_Pedagogico_Magisterio_${(studentName || 'Aluno').replace(/\s+/g, '_')}.pdf`);
  };


  // Print PDF: CERTIFICADO DO LICEU (12ª CLASSE)
  const generatePunivCertificadoPDF = () => {
    if (!auditCertificadoData()) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const dInfo = getBirthDayMonthYear(birthDate);
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = MESES[today.getMonth()];
    const currentYear = today.getFullYear();

    // 1. Decorative border and header
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(8, 8, 194, 281);

    const emblemY = 15;
    let logoAdded = false;
    if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
      try {
        let format = 'PNG';
        if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) format = 'JPEG';
        doc.addImage(logoUrl, format, 95, emblemY, 20, 20);
        logoAdded = true;
      } catch (err) {}
    }
    if (!logoAdded) {
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.5);
      doc.circle(105, emblemY + 10, 8, 'D');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6);
      doc.text('REPÚBLICA DE ANGOLA', 105, emblemY + 9, { align: 'center' });
      doc.text('MINISTÉRIO DA EDUCAÇÃO', 105, emblemY + 11.5, { align: 'center' });
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('REPÚBLICA DE ANGOLA', 105, emblemY + 24, { align: 'center' });
    doc.text('MINISTÉRIO DA EDUCAÇÃO', 105, emblemY + 28, { align: 'center' });
    doc.setFontSize(8);
    doc.text('IIº CICLO DO ENSINO SECUNDÁRIO GERAL (LICEUS)', 105, emblemY + 32, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CERTIFICA', 105, emblemY + 39, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);

    const pronomeA = gender === 'F' ? 'a' : 'o';
    const pronomeFilho = gender === 'F' ? 'filha' : 'filho';
    const pronomeNascido = gender === 'F' ? 'nascida' : 'nascido';
    const pronomePortador = gender === 'F' ? 'portadora' : 'portador';

    const directorNameText = schoolSettings.directorName || 'Muleleno Arline T. Samuncuanha Carlos';
    const schoolNameText = schoolSettings.schoolName || 'Complexo Escolar Nº 1514 Luz do Amanhã';
    const locationText = `${schoolSettings.municipality || 'Cafunfo'}, ${schoolSettings.province || 'Lunda Norte'}`;

    const specLabel = selectedSpecialty === 'CFB' ? 'Ciências Físicas e Biológicas' :
                      selectedSpecialty === 'CEJ' ? 'Ciências Económico-Jurídicas' :
                      selectedSpecialty === 'CS' ? 'Ciências Sociais' :
                      selectedSpecialty === 'AV' ? 'Artes Visuais' : 'Ensino Geral';

    const docDetails = getDocTypeDetails(docTypeSelected, gender, biNumber, biSector);
    const dateIssuedPart = biDate ? `, aos ${biDate.split('-')[2]} de ${MESES[parseInt(biDate.split('-')[1], 10) - 1]} de ${biDate.split('-')[0]}` : '';

    const studentTitle = toTitleCaseName(studentName) || '_________________________________';
    const fatherTitle = toTitleCaseName(fatherName) || '_______________________';
    const motherTitle = toTitleCaseName(motherName) || '_______________________';

    doc.setFontSize(8.5);

    let docPhrasePrefix = `${pronomePortador} do B.I. n.º `;
    if (docTypeSelected === 'CEDULA') {
      docPhrasePrefix = `${pronomePortador} da Cédula de Registo Pessoal n.º `;
    } else if (docTypeSelected === 'PASSAPORTE') {
      docPhrasePrefix = `${pronomePortador} do Passaporte n.º `;
    }

    const segments1 = [
      { text: directorNameText, bold: true, color: [0, 0, 0] },
      { text: `, Directora do ${schoolNameText}, em ${locationText}, criado sob o ${decretoCriacao}, certifica que ` },
      { text: studentTitle, bold: true, color: [220, 38, 38] },
      { text: `, ${pronomeFilho} de ${fatherTitle} e de ${motherTitle}, ${pronomeNascido} ${pronomeA}os ${dInfo.day} de ${dInfo.month} de ${dInfo.year}, natural de ${naturalidade || '_______________'} Município de ${municipio || '_______________'} Província de ${provincia || '_______________'}, ${docPhrasePrefix}` },
      { text: `${biNumber || '_______________________'}`, bold: true, color: [0, 0, 0] },
      { text: `, ${docDetails.issuerPhrase}${dateIssuedPart}.` }
    ];

    const endP1Y = renderRichText(doc, segments1, 15, emblemY + 45, 178, 4.5);

    const segments2 = [
      { text: `Concluiu com aproveitamento na área de ` },
      { text: specLabel.toUpperCase(), bold: true, color: [220, 38, 38] },
      { text: ` o IIº Ciclo do Ensino Secundário Geral (Liceu - 12ª Classe), no Ano Lectivo ${anoLectivo}, conforme o ${leiBaseText || getLeiBaseForCertificate(schoolSettings, 'PUNIV', '12')}, obtendo as seguintes classificações por disciplina:` }
    ];

    const endP2Y = renderRichText(doc, segments2, 15, endP1Y + 3, 178, 4.5);

    // Draw grades table
    const tableStartY = Math.max(emblemY + 92, endP2Y + 4);
    doc.setDrawColor(120, 120, 120);
    doc.setFillColor(245, 247, 250);
    doc.rect(15, tableStartY, 180, 8, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Disciplinas Curriculares', 18, tableStartY + 5);
    doc.text('10ª Cl.', 105, tableStartY + 5, { align: 'center' });
    doc.text('11ª Cl.', 125, tableStartY + 5, { align: 'center' });
    doc.text('12ª Cl.', 145, tableStartY + 5, { align: 'center' });
    doc.text('Média Final', 172, tableStartY + 5, { align: 'center' });

    doc.line(95, tableStartY, 95, tableStartY + 8);
    doc.line(115, tableStartY, 115, tableStartY + 8);
    doc.line(135, tableStartY, 135, tableStartY + 8);
    doc.line(155, tableStartY, 155, tableStartY + 8);

    const punivSubjs = getPunivSubjects(selectedSpecialty);
    const sections = [
      { name: 'Formação Geral', items: punivSubjs.geral },
      { name: 'Formação Específica', items: punivSubjs.especifica },
      { name: 'Opção', items: punivSubjs.opcao }
    ];

    let rowY = tableStartY + 8;
    sections.forEach((sec) => {
      // Draw section header row
      doc.setFillColor(235, 237, 240);
      doc.setDrawColor(200, 200, 200);
      doc.rect(15, rowY, 180, 6, 'FD');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(50, 50, 50);
      doc.text(sec.name.toUpperCase(), 18, rowY + 4.2);
      
      rowY += 6;

      // Draw subjects
      sec.items.forEach((sub) => {
        doc.setFillColor(255, 255, 255);
        doc.rect(15, rowY, 180, 6, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(15, rowY, 180, 6, 'D');

        doc.line(95, rowY, 95, rowY + 6);
        doc.line(115, rowY, 115, rowY + 6);
        doc.line(135, rowY, 135, rowY + 6);
        doc.line(155, rowY, 155, rowY + 6);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text(sub, 18, rowY + 4.2);

        doc.setFont('Helvetica', 'normal');
        const vals = punivGrades[sub] || { '10': '', '11': '', '12': '' };
        doc.text(vals['10'] ? String(vals['10']) : '--', 105, rowY + 4.2, { align: 'center' });
        doc.text(vals['11'] ? String(vals['11']) : '--', 125, rowY + 4.2, { align: 'center' });
        doc.text(vals['12'] ? String(vals['12']) : '--', 145, rowY + 4.2, { align: 'center' });

        const avg = calcPunivSubjectAverage(sub);
        if (avg !== null) {
          doc.setFont('Helvetica', 'bold');
          doc.text(`${avg} Val`, 172, rowY + 4.2, { align: 'center' });
        } else {
          doc.text('--', 172, rowY + 4.2, { align: 'center' });
        }

        rowY += 6;
      });
    });

    rowY += 5;
    doc.setDrawColor(120, 120, 120);
    doc.setFillColor(245, 247, 250);
    doc.rect(15, rowY, 180, 10, 'FD');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('MÉDIA GERAL DE CURSO (10ª à 12ª CLASSE):', 18, rowY + 6.5);
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text(mediaFinalCurso ? `${mediaFinalCurso} Valores` : '_____ Valores', 110, rowY + 6.5);
    
    doc.setTextColor(30, 41, 59);
    rowY += 16;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    const legalText = 
      `O presente certificado consta devidamente registrado no Livro de Registro nº ${livroRegisto || '_______'}, folha ${folhaRegisto || '_______'} ` +
      `assinado e autenticado com o carimbo a óleo em uso nesta instituição de ensino secundário.`;

    doc.text(legalText, 15, rowY, { align: 'justify', maxWidth: 178 });

    const schoolName1994 = schoolSettings.schoolName || (subsistema === 'MAGISTERIO' ? 'Magistério' : 'Complexo Escolar');
    const schoolMun1994 = schoolSettings.municipality || 'Cuango';
    const dateLocationStr = `${schoolName1994} do ${schoolMun1994}, aos ${currentDay} de ${currentMonth} de ${currentYear}.`;
    doc.setFont('Helvetica', 'bold');
    doc.text(dateLocationStr, 105, rowY + 10, { align: 'center' });

    const sigY = rowY + 20;
    doc.setFont('Helvetica', 'bold');
    doc.text('CONFERIDO POR', 50, sigY, { align: 'center' });
    doc.text('A DIRECTORA DA ESCOLA', 150, sigY, { align: 'center' });

    doc.line(20, sigY + 10, 80, sigY + 10);
    doc.line(115, sigY + 10, 185, sigY + 10);

    doc.setFont('Helvetica', 'normal');
    doc.text(directorNameText, 150, sigY + 14, { align: 'center' });

    // Institutional Contact Footer
    const schoolPhone = schoolSettings.phone || '+244 923 000 000';
    const schoolAddr = schoolSettings.address || `${schoolSettings.municipality || 'Cafunfo'}, ${schoolSettings.province || 'Lunda Norte'}`;
    const schoolMail = schoolSettings.email || 'contacto@escola.ao';

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(15, 280, 195, 280);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Contacto: ${schoolPhone}  |  Endereço: ${schoolAddr}  |  E-mail: ${schoolMail}`, 105, 284, { align: 'center' });

    doc.save(`Certificado_Liceu_${(studentName || 'Aluno').replace(/\s+/g, '_')}.pdf`);
  };

  // Print PDF: CERTIFICADO DE ESTUDOS
  const generateCertificadoPDF = () => {
    if (!auditCertificadoData()) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const dInfo = getBirthDayMonthYear(birthDate);
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = MESES[today.getMonth()];
    const currentYear = today.getFullYear();

    // 1. Decorative border and header
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(8, 8, 194, 281); // border

    // Header logo or emblem
    const emblemY = 15;
    let logoAdded = false;

    if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
      try {
        let format = 'PNG';
        if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) {
          format = 'JPEG';
        } else if (logoUrl.includes('image/gif')) {
          format = 'GIF';
        }
        doc.addImage(logoUrl, format, 95, emblemY, 20, 20);
        logoAdded = true;
      } catch (err) {
        console.error('Error adding school logo to PDF:', err);
      }
    }

    if (!logoAdded) {
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.5);
      doc.circle(105, emblemY + 12, 10, 'D');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6);
      doc.text('REPÚBLICA DE ANGOLA', 105, emblemY + 11.5, { align: 'center' });
      doc.text('MINISTÉRIO DA EDUCAÇÃO', 105, emblemY + 14.5, { align: 'center' });
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('REPÚBLICA DE ANGOLA', 105, emblemY + 28, { align: 'center' });
    doc.text('MINISTÉRIO DA EDUCAÇÃO', 105, emblemY + 33, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    
    const is9thGrade = selectedClass === '9';
    const cycleSubTitle = is9thGrade
      ? 'ENSINO GERAL'
      : selectedNivel === 'I' ? 'ENSINO PRIMÁRIO - I CICLO' : selectedNivel === 'II' ? 'ENSINO PRIMÁRIO - II CICLO' : selectedNivel === 'III' ? 'ENSINO PRIMÁRIO - III CICLO' : 'ENSINO PRIMÁRIO';
    doc.text(cycleSubTitle, 105, emblemY + 40, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(is9thGrade ? 'CERTIFICADO DE HABILITAÇÕES' : 'CERTIFICADO', 105, emblemY + 48, { align: 'center' });

    // Certificate textual body
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    const pronomeFilho = gender === 'F' ? 'filha' : 'filho';
    const pronomeNascido = gender === 'F' ? 'nascida' : 'nascido';
    const pronomePortador = gender === 'F' ? 'portadora' : 'portador';

    const directorNameText = schoolSettings.directorName || 'Jorge Paulino';
    const directorRoleText = schoolSettings.directorRoleLabel || (gender === 'F' ? 'Directora' : 'Director');
    const schoolNameText = schoolSettings.schoolName || 'MAGISTÉRIO Nº 1407 LNO-CUANGO/LUNDA';
    const locationText = `${schoolSettings.municipality || 'Cafunfo'}, ${schoolSettings.province || 'Lunda'}`;

    // Calculate dynamic average and textual representation based on selectedNivel
    let isSingleCycle = selectedNivel !== 'TODOS';
    let cyclesToRender: ('I' | 'II' | 'III')[] = [];
    if (selectedNivel === 'I') cyclesToRender = ['I'];
    else if (selectedNivel === 'II') cyclesToRender = ['II'];
    else if (selectedNivel === 'III') cyclesToRender = ['III'];
    else cyclesToRender = ['I', 'II', 'III'];

    const mediaToShow = isSingleCycle 
      ? (singleCycleAverage.media !== null ? singleCycleAverage.media : '______') 
      : (certComputedAverages.globalAverage !== null ? certComputedAverages.globalAverage : '______');

    const biFormattedDate = biDate ? `${biDate.split('-')[2]} de ${MESES[parseInt(biDate.split('-')[1], 10) - 1]} de ${biDate.split('-')[0]}` : '________________________';

    const docDetails = getDocTypeDetails(docTypeSelected, gender, biNumber, biSector);
    const dateIssuedPart = biDate ? `, aos ${biFormattedDate}` : '';

    const studentTitle = toTitleCaseName(studentName) || '_________________________________';
    const fatherTitle = toTitleCaseName(fatherName) || '_______________________';
    const motherTitle = toTitleCaseName(motherName) || '_______________________';

    doc.setFontSize(8.5);

    let docPhrasePrefix = `${pronomePortador} do B.I. n.º `;
    if (docTypeSelected === 'CEDULA') {
      docPhrasePrefix = `${pronomePortador} da Cédula de Registo Pessoal n.º `;
    } else if (docTypeSelected === 'PASSAPORTE') {
      docPhrasePrefix = `${pronomePortador} do Passaporte n.º `;
    }

    const currentLeiBase = leiBaseText || getLeiBaseForCertificate(schoolSettings, 'PRIMARIO', is9thGrade ? '9' : selectedClass);

    const cycleText = is9thGrade 
      ? 'ENSINO GERAL'
      : selectedNivel === 'I' ? 'I CICLO DO ENSINO PRIMÁRIO' : selectedNivel === 'II' ? 'II CICLO DO ENSINO PRIMÁRIO' : selectedNivel === 'III' ? 'III CICLO DO ENSINO PRIMÁRIO' : 'ENSINO PRIMÁRIO';

    const segments = [
      { text: directorNameText, bold: true, color: [0, 0, 0] },
      { text: `, ${directorRoleText} do ${schoolNameText}, em ${locationText}, criado sob o ${decretoCriacao}, certifica que, ` },
      { text: studentTitle, bold: true, color: [220, 38, 38] },
      { text: `, ${pronomeFilho} de ${fatherTitle} e de ${motherTitle}, ${pronomeNascido} aos ${dInfo.day} de ${dInfo.month} de ${dInfo.year}, natural de ${naturalidade || '_______________'} Município de ${municipio || '_______________'} Província de ${provincia || '_______________'}, ${docPhrasePrefix}` },
      { text: `${biNumber || '_______________________'}`, bold: true, color: [0, 0, 0] },
      { text: `, ${docDetails.issuerPhrase}${dateIssuedPart}. Concluiu no ano lectivo ${anoLectivo} na turma ${selectedTurma || '___'} sob o nº ${selectedNoAluno || '____'} o ` },
      { text: cycleText, bold: true, color: [0, 0, 0] },
      { text: `, conforme o ${currentLeiBase}, com a Média Final de ` },
      { text: `${mediaToShow} valores`, bold: true, color: [220, 38, 38] },
      { text: ` obtidos nas seguintes classificações por ciclo de aprendizagem:` }
    ];

    const endP2Y = renderRichText(doc, segments, 15, emblemY + 54, 175, 4.8);

    // Draw grades table
    const tableStartY = endP2Y + 4;
    
    // Draw columns headers
    doc.setDrawColor(120, 120, 120);
    doc.setFillColor(248, 250, 252); // light grey header bg
    doc.rect(15, tableStartY, 180, 10, 'FD');

    if (isSingleCycle) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Disciplinas', 18, tableStartY + 6);
      
      if (is9thGrade) {
        const classTitle = selectedNivel === 'I' ? '7ª Classe' : selectedNivel === 'II' ? '8ª Classe' : '9ª Classe';
        doc.text(classTitle, 115, tableStartY + 6, { align: 'center' });
      } else {
        const cycleTitle = selectedNivel === 'I' ? 'I Ciclo' : selectedNivel === 'II' ? 'II Ciclo' : 'III Ciclo';
        const classTitle = selectedNivel === 'I' ? '2ª Classe' : selectedNivel === 'II' ? '4ª Classe' : '6ª Classe';
        
        doc.text(cycleTitle, 115, tableStartY + 4, { align: 'center' });
        doc.text(classTitle, 115, tableStartY + 8, { align: 'center' });
      }
      
      doc.text('Média Final', 150, tableStartY + 6, { align: 'center' });
      doc.text('Média por Extenso', 180, tableStartY + 6, { align: 'center' });

      doc.line(95, tableStartY, 95, tableStartY + 10);
      doc.line(135, tableStartY, 135, tableStartY + 10);
      doc.line(165, tableStartY, 165, tableStartY + 10);
    } else {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Disciplinas', 18, tableStartY + 6);

      if (is9thGrade) {
        doc.text('7ª Classe', 76.5, tableStartY + 6, { align: 'center' });
        doc.text('8ª Classe', 100, tableStartY + 6, { align: 'center' });
        doc.text('9ª Classe', 125, tableStartY + 6, { align: 'center' });
      } else {
        doc.text('I Ciclo', 76.5, tableStartY + 4, { align: 'center' });
        doc.text('2ª Classe', 76.5, tableStartY + 8, { align: 'center' });
        
        doc.text('II Ciclo', 100, tableStartY + 4, { align: 'center' });
        doc.text('4ª Classe', 100, tableStartY + 8, { align: 'center' });

        doc.text('III Ciclo', 125, tableStartY + 4, { align: 'center' });
        doc.text('6ª Classe', 125, tableStartY + 8, { align: 'center' });
      }

      doc.text('Média Final', 152, tableStartY + 6, { align: 'center' });
      doc.text('Média por Extenso', 180.5, tableStartY + 6, { align: 'center' });

      doc.line(65, tableStartY, 65, tableStartY + 10);
      doc.line(88, tableStartY, 88, tableStartY + 10);
      doc.line(112, tableStartY, 112, tableStartY + 10);
      doc.line(138, tableStartY, 138, tableStartY + 10);
      doc.line(166, tableStartY, 166, tableStartY + 10);

      if (!is9thGrade) {
        doc.line(65, tableStartY + 5, 138, tableStartY + 5);
      }
    }

    let rowY = tableStartY + 10;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);

    subjectsForCertificado.forEach(subj => {
      const vals = certGrades[subj.name] || { I: '', II: '', III: '' };
      
      doc.rect(15, rowY, 180, 6.5);

      if (isSingleCycle) {
        const cycleKey = cyclesToRender[0];
        const hasCycle = subj.cycles[cycleKey];
        
        if (!hasCycle) {
          doc.setFillColor(220, 224, 230);
          doc.rect(95, rowY, 40, 6.5, 'F');
        }

        doc.rect(15, rowY, 180, 6.5, 'D');
        doc.line(95, rowY, 95, rowY + 6.5);
        doc.line(135, rowY, 135, rowY + 6.5);
        doc.line(165, rowY, 165, rowY + 6.5);

        doc.setFont('Helvetica', 'bold');
        doc.text(subj.name, 18, rowY + 4.5);
        doc.setFont('Helvetica', 'normal');

        const cycleVal = vals[cycleKey];
        if (hasCycle && cycleVal !== '') {
          doc.text(String(cycleVal), 115, rowY + 4.5, { align: 'center' });
          doc.setFont('Helvetica', 'bold');
          doc.text(String(cycleVal), 150, rowY + 4.5, { align: 'center' });
          doc.text(notaParaExtenso(Number(cycleVal)), 180, rowY + 4.5, { align: 'center' });
          doc.setFont('Helvetica', 'normal');
        } else {
          doc.text('--', 115, rowY + 4.5, { align: 'center' });
          doc.text('--', 150, rowY + 4.5, { align: 'center' });
          doc.text('--', 180, rowY + 4.5, { align: 'center' });
        }
      } else {
        if (!subj.cycles.I) {
          doc.setFillColor(220, 224, 230);
          doc.rect(65, rowY, 23, 6.5, 'F');
        }
        if (!subj.cycles.II) {
          doc.setFillColor(220, 224, 230);
          doc.rect(88, rowY, 24, 6.5, 'F');
        }
        if (!subj.cycles.III) {
          doc.setFillColor(220, 224, 230);
          doc.rect(112, rowY, 26, 6.5, 'F');
        }

        doc.rect(15, rowY, 180, 6.5, 'D');

        doc.line(65, rowY, 65, rowY + 6.5);
        doc.line(88, rowY, 88, rowY + 6.5);
        doc.line(112, rowY, 112, rowY + 6.5);
        doc.line(138, rowY, 138, rowY + 6.5);
        doc.line(166, rowY, 166, rowY + 6.5);

        doc.setFont('Helvetica', 'bold');
        doc.text(subj.name, 18, rowY + 4.5);
        doc.setFont('Helvetica', 'normal');

        if (subj.cycles.I) doc.text(vals.I !== '' ? String(vals.I) : '--', 76.5, rowY + 4.5, { align: 'center' });
        if (subj.cycles.II) doc.text(vals.II !== '' ? String(vals.II) : '--', 100, rowY + 4.5, { align: 'center' });
        if (subj.cycles.III) doc.text(vals.III !== '' ? String(vals.III) : '--', 125, rowY + 4.5, { align: 'center' });

        const avgInfo = certComputedAverages.rows[subj.name];
        if (avgInfo && avgInfo.media !== null) {
          doc.setFont('Helvetica', 'bold');
          doc.text(String(avgInfo.media), 152, rowY + 4.5, { align: 'center' });
          doc.text(avgInfo.extenso, 180.5, rowY + 4.5, { align: 'center' });
          doc.setFont('Helvetica', 'normal');
        } else {
          doc.text('--', 152, rowY + 4.5, { align: 'center' });
          doc.text('--', 180.5, rowY + 4.5, { align: 'center' });
        }
      }

      rowY += 6.5;
    });

    // Legal text
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    const legalText = 
      `Para efeitos legais lhe é passado o presente CERTIFICADO, que consta no livro de registo ` +
      `nº ${livroRegisto || '_______'}, folha ${folhaRegisto || '_______'} assinado por mim e autenticado com carimbo a óleo em uso neste estabelecimento de ensino.`;

    const splitLegal = doc.splitTextToSize(legalText, 175);
    doc.text(legalText, 15, rowY + 6, { align: 'justify', maxWidth: 175 });

    const dateY = rowY + 6 + (splitLegal.length * 4.8) + 3;
    const schoolName2294 = schoolSettings.schoolName || (subsistema === 'MAGISTERIO' ? 'Magistério' : 'Complexo Escolar');
    const schoolMun2294 = schoolSettings.municipality || 'Cuango';
    doc.setFont('Helvetica', 'bold');
    doc.text(`${schoolName2294} do ${schoolMun2294}, aos ${currentDay} de ${currentMonth} de ${currentYear}.`, 105, dateY, { align: 'center' });

    // Signatures section
    const sigY = dateY + 16;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CONFERIDO POR', 50, sigY, { align: 'center' });
    const directorRoleUpper = String(schoolSettings.directorRoleLabel || (gender === 'F' ? 'A DIRECTORA DA ESCOLA' : 'O DIRECTOR DA ESCOLA')).toUpperCase();
    doc.text(directorRoleUpper, 150, sigY, { align: 'center' });

    doc.line(20, sigY + 12, 80, sigY + 12);
    doc.line(115, sigY + 12, 185, sigY + 12);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(directorNameText, 150, sigY + 17, { align: 'center' });

    // Institutional Contact Footer
    const schoolPhone = schoolSettings.phone || '+244 923 000 000';
    const schoolAddr = schoolSettings.address || `${schoolSettings.municipality || 'Cafunfo'}, ${schoolSettings.province || 'Lunda Norte'}`;
    const schoolMail = schoolSettings.email || 'contacto@escola.ao';

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(15, 280, 195, 280);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Contacto: ${schoolPhone}  |  Endereço: ${schoolAddr}  |  E-mail: ${schoolMail}`, 105, 284, { align: 'center' });

    doc.save(`Certificado_Primario_${(studentName || 'Aluno').replace(/\s+/g, '_')}.pdf`);
  };

  // Print PDF: DECLARAÇÃO DE HABILITAÇÕES
  const generateDeclaracaoPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const dInfo = getBirthDayMonthYear(birthDate);
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = MESES[today.getMonth()];
    const currentYear = today.getFullYear();

    // 1. Decorative border and header
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(8, 8, 194, 281);

    // Header logo or emblem
    const emblemY = 15;
    let logoAdded = false;

    if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
      try {
        let format = 'PNG';
        if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) {
          format = 'JPEG';
        } else if (logoUrl.includes('image/gif')) {
          format = 'GIF';
        }
        doc.addImage(logoUrl, format, 95, emblemY, 20, 20);
        logoAdded = true;
      } catch (err) {
        console.error('Error adding school logo to PDF:', err);
      }
    }

    if (!logoAdded) {
      // Fallback: Draw an elegant geometric graphic representing the insignia of Angola
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.5);
      doc.circle(105, emblemY + 12, 10, 'D');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6);
      doc.text('REPÚBLICA DE ANGOLA', 105, emblemY + 11.5, { align: 'center' });
      doc.text('MINISTÉRIO DA EDUCAÇÃO', 105, emblemY + 14.5, { align: 'center' });
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('REPÚBLICA DE ANGOLA', 105, emblemY + 28, { align: 'center' });
    doc.text('MINISTÉRIO DA EDUCAÇÃO', 105, emblemY + 33, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);

    const numClass = parseInt(selectedClass, 10);
    const isPrimaryClass = (subsistema === 'PRIMARIO' && numClass <= 5) || numClass <= 5;
    const isCiclo1Class = (subsistema === 'PRIMARIO' && (numClass === 7 || numClass === 8)) || numClass === 7 || numClass === 8;

    let subHeaderLevel = 'ENSINO PRIMÁRIO';

    if (isPrimaryClass) {
      subHeaderLevel = 'ENSINO PRIMÁRIO';
    } else if (isCiclo1Class) {
      subHeaderLevel = 'Iº CICLO DO ENSINO SECUNDÁRIO GERAL';
    } else {
      subHeaderLevel = (schoolSettings.schoolName || 'COMPLEXO ESCOLAR').toUpperCase();
    }

    doc.text(subHeaderLevel, 105, emblemY + 38, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('DECLARAÇÃO DE HABILITAÇÕES', 105, emblemY + 46, { align: 'center' });

    // Declaration body
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);

    const pronomeA = gender === 'F' ? 'a' : 'o';
    const pronomeFilho = gender === 'F' ? 'filha' : 'filho';
    const pronomeNascido = gender === 'F' ? 'nascida' : 'nascido';
    const pronomePortador = gender === 'F' ? 'portadora' : 'portador';

    const directorNameText = schoolSettings.directorName || 'Muleleno Arline T. Samuncuanha Carlos';
    const directorRoleText = schoolSettings.directorRoleLabel || (gender === 'F' ? 'Directora' : 'Director');
    const schoolNameText = schoolSettings.schoolName || 'Complexo Escolar Nº 1514 Luz do Amanhã';

    const directorTitle = toTitleCaseName(directorNameText);
    const studentTitle = toTitleCaseName(studentName);
    const fatherTitle = toTitleCaseName(fatherName);
    const motherTitle = toTitleCaseName(motherName);

    const docDetails = getDocTypeDetails(docTypeSelected, gender, biNumber, biSector);
    const locationText = `${schoolSettings.municipality || 'Cafunfo'}, ${schoolSettings.province || 'Lunda Norte'}`;
    const decretoText = decretoCriacao || schoolSettings.decretoExecutivo || schoolSettings.despachoCriacao || 'Decreto Executivo nº 445/16 de 25 de Novembro';

    const segments = [
      { text: directorTitle, bold: true, color: [0, 0, 0] },
      { text: `, ${directorRoleText} do `, bold: false, color: [0, 0, 0] },
      { text: schoolNameText, bold: false, color: [0, 0, 0] },
      { text: `, em ${locationText}, criado sob o `, bold: false, color: [0, 0, 0] },
      { text: decretoText, bold: true, color: [0, 0, 0] },
      { text: `, declara que, `, bold: false, color: [0, 0, 0] },
      { text: studentTitle || '_________________________________', bold: true, color: [220, 38, 38] },
      { text: `, ${pronomeFilho} de `, bold: false, color: [0, 0, 0] },
      { text: fatherTitle || '_______________________', bold: false, color: [0, 0, 0] },
      { text: ` e de `, bold: false, color: [0, 0, 0] },
      { text: motherTitle || '_______________________', bold: false, color: [0, 0, 0] },
      { text: `, ${pronomeNascido} aos `, bold: false, color: [0, 0, 0] },
      { text: `${dInfo.day} de ${dInfo.month} de ${dInfo.year}`, bold: false, color: [0, 0, 0] },
      { text: `, Natural de `, bold: false, color: [0, 0, 0] },
      { text: naturalidade || '_______________', bold: false, color: [0, 0, 0] },
      { text: `, Município de `, bold: false, color: [0, 0, 0] },
      { text: municipio || '_______________', bold: false, color: [0, 0, 0] },
      { text: `, Província de `, bold: false, color: [0, 0, 0] },
      { text: provincia || '_______________', bold: false, color: [0, 0, 0] },
      { text: `, ${docDetails.docPhrase}, ${docDetails.issuerPhrase}. Frequentou no Ano Lectivo de `, bold: false, color: [0, 0, 0] },
      { text: anoLectivo, bold: false, color: [0, 0, 0] },
      { text: `, a `, bold: false, color: [0, 0, 0] },
      { text: `${selectedClass}ª Classe`, bold: false, color: [0, 0, 0] },
      { text: `, turma `, bold: false, color: [0, 0, 0] },
      { text: selectedTurma, bold: false, color: [0, 0, 0] },
      { text: `, sob nº `, bold: false, color: [0, 0, 0] },
      { text: selectedNoAluno, bold: false, color: [0, 0, 0] },
      { text: `, tendo obtido o resultado final `, bold: false, color: [0, 0, 0] },
      { text: `APTO (A)`, bold: false, color: [0, 0, 0] },
      { text: `, com as seguintes classificações:`, bold: false, color: [0, 0, 0] }
    ];

    let bodyY = renderRichText(doc, segments, 15, emblemY + 54, 175, 5.5);
    bodyY += 6;

    // Draw Subjects & Grades Table Grid
    let tableY = bodyY;
    const rowHeight = 7;
    const tableX = 15;
    const tableWidth = 175;

    // Header row
    doc.setFillColor(240, 242, 245);
    doc.rect(tableX, tableY, tableWidth, rowHeight, 'FD');
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.rect(tableX, tableY, tableWidth, rowHeight, 'D');

    // Vertical header divider lines
    doc.line(100, tableY, 100, tableY + rowHeight); // Disciplina | Classificação
    doc.line(135, tableY, 135, tableY + rowHeight); // Classificação | Por Extenso

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('DISCIPLINA', 18, tableY + 4.8);
    doc.text('CLASSIFICAÇÃO', 117.5, tableY + 4.8, { align: 'center' });
    doc.text('POR EXTENSO', 162.5, tableY + 4.8, { align: 'center' });

    tableY += rowHeight;

    // Data rows
    activeDeclSubjects.forEach((subj, idx) => {
      const val = decGrades[subj];
      const valText = val !== undefined && val !== '' ? String(val) : '--';
      const extText = val !== undefined && val !== '' ? `${notaParaExtenso(Number(val))} Valores` : '--';
      const numVal = Number(val);
      const passingThreshold = numClass <= 6 ? 5 : 10;
      const isPos = val !== undefined && val !== '' && !isNaN(numVal) && numVal >= passingThreshold;
      const isNeg = val !== undefined && val !== '' && !isNaN(numVal) && numVal < passingThreshold;

      // Alternating row fill
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(tableX, tableY, tableWidth, rowHeight, 'F');
      }

      // Row outer border
      doc.setDrawColor(180, 180, 180);
      doc.rect(tableX, tableY, tableWidth, rowHeight, 'D');

      // Vertical dividers
      doc.line(100, tableY, 100, tableY + rowHeight);
      doc.line(135, tableY, 135, tableY + rowHeight);

      // Subject Name
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(subj, 18, tableY + 4.8);

      // Grade Number (Blue if >= 10, Red if < 10)
      doc.setFont('Helvetica', 'bold');
      if (isPos) {
        doc.setTextColor(25, 118, 210); // BLUE
      } else if (isNeg) {
        doc.setTextColor(220, 38, 38); // RED
      } else {
        doc.setTextColor(100, 116, 139);
      }
      doc.text(valText, 117.5, tableY + 4.8, { align: 'center' });

      // Extenso
      doc.setFont('Helvetica', 'normal');
      if (isPos) {
        doc.setTextColor(25, 118, 210);
      } else if (isNeg) {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(30, 41, 59);
      }
      doc.text(extText, 162.5, tableY + 4.8, { align: 'center' });

      tableY += rowHeight;
    });

    // Legal footer
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);

    const footerText = `Por ser verdade, e me ter sido solicitado, mandei passar a presente DECLARAÇÃO que vai por mim assinada e autenticada com Carimbo a óleo em uso nesta Instituição.`;
    const splitFooter = doc.splitTextToSize(footerText, 175);
    let footY = tableY + 8;
    doc.text(splitFooter, 15, footY, { align: 'justify', maxWidth: 175 });

    footY += (splitFooter.length * 5.8) + 4;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    const schoolName2550 = schoolSettings.schoolName || (subsistema === 'MAGISTERIO' ? 'Magistério' : 'Complexo Escolar');
    const schoolMun2550 = schoolSettings.municipality || 'Cuango';
    doc.text(`${schoolName2550} do ${schoolMun2550}, aos ${currentDay} de ${currentMonth} de ${currentYear}.`, 105, footY, { align: 'center' });

    // Signatures
    const sigY = footY + 20;

    if (numClass <= 5 || subsistema === 'MAGISTERIO') {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(String(directorRoleText).toUpperCase(), 105, sigY, { align: 'center' });
      doc.line(65, sigY + 12, 145, sigY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(directorTitle, 105, sigY + 17, { align: 'center' });
    } else {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('O SUBDIRECTOR PEDAGÓGICO', 50, sigY, { align: 'center' });
      doc.text(String(directorRoleText).toUpperCase(), 150, sigY, { align: 'center' });

      doc.line(20, sigY + 12, 80, sigY + 12);
      doc.line(115, sigY + 12, 185, sigY + 12);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(toTitleCaseName(schoolSettings.subdirectorName || 'Dr. Subdirector Pedagógico'), 50, sigY + 17, { align: 'center' });
      doc.text(directorTitle, 150, sigY + 17, { align: 'center' });
    }

    // Institutional Contact Footer
    const schoolPhone = schoolSettings.phone || '+244 923 000 000';
    const schoolAddr = schoolSettings.address || `${schoolSettings.municipality || 'Cafunfo'}, ${schoolSettings.province || 'Lunda Norte'}`;
    const schoolMail = schoolSettings.email || 'contacto@escola.ao';

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(15, 280, 195, 280);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Contacto: ${schoolPhone}  |  Endereço: ${schoolAddr}  |  E-mail: ${schoolMail}`, 105, 284, { align: 'center' });

    doc.save(`Declaracao_Habilitacoes_${(studentName || 'Aluno').replace(/\s+/g, '_')}.pdf`);
  };

  if (subsistema === 'HUB') {
    return (
      <div id="docs-certificados-panel" className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-2xl border border-indigo-800 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-heading font-extrabold tracking-tight flex items-center gap-2 text-indigo-100">
                <Award className="w-6 h-6 text-[#7FFF00]" />
                <span>Emissão de Declarações e Certificados</span>
              </h1>
              <p className="text-xs text-indigo-300">
                Emita e imprima documentos oficiais em papel A4 (Conforme os moldes e padrões curriculares nacionais de Angola).
              </p>
            </div>
            <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-indigo-500/20">
              <button
                type="button"
                onClick={() => setActiveTab('CERTIFICADO')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'CERTIFICADO'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Certificado</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('DECLARACAO')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'DECLARACAO'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Declaração</span>
              </button>
            </div>
          </div>
        </div>

        <div className={`grid gap-6 animate-fadeIn ${
          activeCount === 1 
            ? 'grid-cols-1 max-w-md mx-auto' 
            : activeCount === 2 
            ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto' 
            : 'grid-cols-1 md:grid-cols-3'
        }`}>
          {/* Card 1: Ensino Primário */}
          {isPrimarioActive && (
            <div 
              onClick={() => {
                setSubsistema('PRIMARIO');
                if (onTabChange) onTabChange('PRIMARIO');
              }}
              className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-3xs hover:shadow-md transition-all duration-350 cursor-pointer flex flex-col justify-between space-y-5 transform hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all duration-350">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">Ensino Geral</span>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide group-hover:text-indigo-700 transition-colors mt-1">
                    ENSINO PRIMÁRIO / I CICLO
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Emissão de Certificados oficiais (6ª e 9ª Classe) e Declarações de Habilitações com notas detalhadas.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-450 group-hover:text-indigo-600">
                <span className="uppercase tracking-wider">Aceder à Emissão</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )}

          {/* Card 2: PUNIV */}
          {isPunivActive && (
            <div 
              onClick={() => {
                setSubsistema('PUNIV');
                if (onTabChange) onTabChange('PUNIV');
              }}
              className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-amber-300 shadow-3xs hover:shadow-md transition-all duration-350 cursor-pointer flex flex-col justify-between space-y-5 transform hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-500 transition-all duration-350">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest bg-amber-50 px-2 py-0.5 rounded-md">Ensino Secundário</span>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide group-hover:text-amber-700 transition-colors mt-1">
                    LICEU (PUNIV)
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Emissão de Certificados da 12ª Classe e Declarações de frequência/fim de curso para o Liceu Geral.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-450 group-hover:text-amber-600">
                <span className="uppercase tracking-wider">Aceder à Emissão</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )}

          {/* Card 3: Magistério */}
          {isMagisterioActive && (
            <div 
              onClick={() => {
                setSubsistema('MAGISTERIO');
                if (onTabChange) onTabChange('MAGISTERIO');
              }}
              className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-cyan-300 shadow-3xs hover:shadow-md transition-all duration-350 cursor-pointer flex flex-col justify-between space-y-5 transform hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center border border-cyan-100 group-hover:bg-cyan-600 group-hover:text-white group-hover:border-cyan-500 transition-all duration-350">
                  <Award className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-cyan-600 tracking-widest bg-cyan-50 px-2 py-0.5 rounded-md">Formação Pedagógica</span>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide group-hover:text-cyan-700 transition-colors mt-1">
                    MAGISTÉRIO PEDAGÓGICO
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Emissão de Certificados da 13ª Classe (Fim de Curso) e Declarações para alunos de formação de professores.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-450 group-hover:text-cyan-600">
                <span className="uppercase tracking-wider">Aceder à Emissão</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )}

          {activeCount === 0 && (
            <div className="col-span-full p-8 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
              <p className="text-sm font-bold text-amber-800">Nenhum subsistema está activo no momento.</p>
              <p className="text-xs text-amber-600">Aceda às Definições Gerais para activar os subsistemas de ensino pretendidos.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="docs-certificados-panel" className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-2xl border border-indigo-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-heading font-extrabold tracking-tight flex items-center gap-2 text-indigo-100">
              <Award className="w-6 h-6 text-[#7FFF00]" />
              <span>Emissão de Declarações e Certificados</span>
            </h1>
            <p className="text-xs text-indigo-300">
              Emita e imprima documentos oficiais em papel A4 (Conforme os moldes e padrões curriculares nacionais de Angola).
            </p>
          </div>
          <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-indigo-500/20">
            <button
              type="button"
              onClick={() => setActiveTab('CERTIFICADO')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'CERTIFICADO'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Certificado</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DECLARACAO')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'DECLARACAO'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Declaração</span>
            </button>
          </div>
        </div>
      </div>
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-3xs mb-4 animate-fadeIn">
            <button
              onClick={() => {
                setSubsistema('HUB');
                if (onTabChange) onTabChange('HUB');
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-indigo-650 transition-all cursor-pointer text-[10.5px] font-black uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Hub de Documentos</span>
            </button>
            <div className="text-[10px] font-bold text-slate-450 font-mono uppercase tracking-widest hidden sm:block">
              Documentos &gt; <span className="text-indigo-600 font-black">{
                subsistema === 'PRIMARIO' ? 'Ensino Primário' :
                subsistema === 'PUNIV' ? 'Liceu (PUNIV)' : 'Magistério'
              }</span>
            </div>
          </div>

          {/* Subsistema de Ensino Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Subsistema de Ensino</span>
                <div className="flex flex-wrap gap-2">
                  {(schoolSettings?.activeComponents?.ENSINO_PRIMARIO !== false) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSubsistema('PRIMARIO');
                        if (onTabChange) onTabChange('PRIMARIO');
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        subsistema === 'PRIMARIO'
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🎒 Ensino Primário / Geral
                    </button>
                  )}
                  {(schoolSettings?.activeComponents?.PUNIV !== false) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSubsistema('PUNIV');
                        if (onTabChange) onTabChange('PUNIV');
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        subsistema === 'PUNIV'
                          ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🎓 PUNIV
                      <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">Desenvolvimento</span>
                    </button>
                  )}
                  {(schoolSettings?.activeComponents?.MAGISTERIO !== false) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSubsistema('MAGISTERIO');
                        if (onTabChange) onTabChange('MAGISTERIO');
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        subsistema === 'MAGISTERIO'
                          ? 'bg-cyan-50 border-cyan-200 text-cyan-700 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      👩‍🏫 Magistério
                      <span className="bg-cyan-100 text-cyan-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">Desenvolvimento</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-center">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Documento Ativo</span>
                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg inline-block self-start">
                  {activeTab === 'CERTIFICADO' ? '📜 CERTIFICADO DE ESTUDOS' : '📄 DECLARAÇÃO DE HABILITAÇÕES'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Form controls */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Student Search & Auto-Fill */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Search className="w-4 h-4 text-indigo-600" />
                    <span>Localizar Aluno no Sistema</span>
                  </div>
                  {selectedStudent && (
                    <button
                      type="button"
                      onClick={handleClearSelectedStudent}
                      className="text-[10px] text-rose-500 font-bold hover:underline"
                    >
                      Limpar Seleção
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquisar por Nome Completo, Nº Processo ou BI..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

                  {filteredStudents.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-slate-100">
                  {filteredStudents.map(student => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleSelectStudent(student)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Classe: {student.class}ª | Processo: {student.id} {student.bi ? `| BI: ${student.bi}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                        Selecionar
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedStudent ? (
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-xs">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-850 truncate">Aluno Selecionado: {selectedStudent.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Os dados biográficos e notas foram pré-carregados automaticamente.</p>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">
                Pode preencher todos os dados manualmente abaixo ou selecionar um aluno cadastrado para autopreenchimento rápido.
              </p>
            )}
          </div>

          {/* Form Fields: Biographical and School Parameters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-indigo-600" />
              <span>Dados Biográficos do Aluno</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Nome Completo do Aluno</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Nome do Aluno"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Sexo / Gênero</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 font-bold text-slate-800"
                >
                  <option value="M">Masculino (M)</option>
                  <option value="F">Feminino (F)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Nome do Pai</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Filho de"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Nome da Mãe</label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="e de"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Naturalidade (Local)</label>
                <input
                  type="text"
                  value={naturalidade}
                  onChange={(e) => setNaturalidade(e.target.value)}
                  placeholder="Cafunfo"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Município</label>
                <input
                  type="text"
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  placeholder="Cuango"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Província</label>
                <input
                  type="text"
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  placeholder="Lunda Norte"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Tipo de Documento</label>
                <select
                  value={docTypeSelected}
                  onChange={(e) => setDocTypeSelected(e.target.value as 'BI' | 'CEDULA' | 'PASSAPORTE')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-800 cursor-pointer font-semibold"
                >
                  <option value="BI">Bilhete de Identidade (B.I.)</option>
                  <option value="CEDULA">Cédula de Registo Pessoal</option>
                  <option value="PASSAPORTE">Passaporte</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">
                  {docTypeSelected === 'CEDULA' ? 'Nº da Cédula' : docTypeSelected === 'PASSAPORTE' ? 'Nº do Passaporte' : 'Nº do B.I.'}
                </label>
                <input
                  type="text"
                  value={biNumber}
                  onChange={(e) => setBiNumber(e.target.value.toUpperCase())}
                  maxLength={16}
                  placeholder={docTypeSelected === 'CEDULA' ? '005580255LN078' : '005580255LN078'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Sector / Local de Emissão</label>
                <BiSectorSelect
                  required={false}
                  value={biSector}
                  onChange={setBiSector}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-800 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">
                  Data Emissão {docTypeSelected === 'CEDULA' ? 'Cédula' : docTypeSelected === 'PASSAPORTE' ? 'Passaporte' : 'B.I.'}
                </label>
                <input
                  type="date"
                  value={biDate}
                  onChange={(e) => setBiDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 font-mono text-slate-800"
                />
              </div>
            </div>

            <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pt-2 pb-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Configurações Escolares & Documentais</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Ano Lectivo</label>
                <input
                  type="text"
                  value={anoLectivo}
                  onChange={(e) => setAnoLectivo(e.target.value)}
                  placeholder="2025/2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Livro de Registo Nº</label>
                <input
                  type="text"
                  value={livroRegisto}
                  onChange={(e) => setLivroRegisto(e.target.value)}
                  placeholder="14"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Folha do Livro Nº</label>
                <input
                  type="text"
                  value={folhaRegisto}
                  onChange={(e) => setFolhaRegisto(e.target.value)}
                  placeholder="234"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Decreto de Criação</label>
                <input
                  type="text"
                  value={decretoCriacao}
                  onChange={(e) => setDecretoCriacao(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Enquadramento Legal (LBSEE)</label>
                <input
                  type="text"
                  value={leiBaseText}
                  onChange={(e) => setLeiBaseText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-800 font-medium"
                />
              </div>

              {subsistema === 'PRIMARIO' && activeTab === 'CERTIFICADO' && selectedClass === '6' && (
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Nível de Ensino / Ciclo</label>
                  <select
                    value={selectedNivel}
                    onChange={(e) => setSelectedNivel(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 font-bold text-slate-800"
                  >
                    <option value="TODOS">Ensino Primário Completo (Geral)</option>
                    <option value="I">I Nível (1ª e 2ª Classes - I Ciclo)</option>
                    <option value="II">II Nível (3ª e 4ª Classes - II Ciclo)</option>
                    <option value="III">III Nível (5ª e 6ª Classes - III Ciclo)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Classe</label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedClass(val);
                    const clsNum = parseInt(val, 10);
                    if (clsNum >= 1 && clsNum <= 2) {
                      setSelectedNivel('I');
                    } else if (clsNum >= 3 && clsNum <= 4) {
                      setSelectedNivel('II');
                    } else if (clsNum >= 5 && clsNum <= 6) {
                      setSelectedNivel('III');
                    } else {
                      setSelectedNivel('TODOS');
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 font-bold text-slate-800"
                >
                  {classOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Turma</label>
                <input
                  type="text"
                  value={selectedTurma}
                  onChange={(e) => setSelectedTurma(e.target.value.toUpperCase())}
                  placeholder="A"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Nº Aluno</label>
                <input
                  type="number"
                  value={selectedNoAluno}
                  onChange={(e) => setSelectedNoAluno(e.target.value)}
                  placeholder="1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

               {subsistema === 'PUNIV' ? (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">
                    Especialidade do Ensino Médio Geral (PUNIV)
                  </label>
                  <select
                    id="especialidade-puniv"
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-bold text-slate-800 text-xs"
                  >
                    <option value="CFB">Ciências Físicas e Biológicas (CFB)</option>
                    <option value="CEJ">Ciências Económico-Jurídicas (CEJ)</option>
                    <option value="CS">Ciências Sociais / Humanas (CS)</option>
                    <option value="AV">Artes Visuais (AV)</option>
                  </select>
                </div>

                <div className="overflow-x-auto border border-slate-150 rounded-xl">
                  {(() => {
                    const punivSubjs = getPunivSubjects(selectedSpecialty);
                    const show11 = activeTab === 'CERTIFICADO' || parseInt(selectedClass, 10) >= 11;
                    const show12 = activeTab === 'CERTIFICADO' || parseInt(selectedClass, 10) >= 12;
                    const colSpanCount = 2 + (show11 ? 1 : 0) + (show12 ? 1 : 0);

                    const sections = [
                      { label: 'Formação Geral', items: punivSubjs.geral },
                      { label: 'Formação Específica', items: punivSubjs.especifica },
                      { label: 'Opção', items: punivSubjs.opcao }
                    ];

                    return (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-extrabold border-b border-slate-150">
                          <tr>
                            <th className="py-2.5 px-4 font-bold text-slate-600">Disciplinas</th>
                            <th className="py-2.5 px-4 text-center font-bold text-slate-600">10ª Classe</th>
                            {show11 && <th className="py-2.5 px-4 text-center font-bold text-slate-600">11ª Classe</th>}
                            {show12 && <th className="py-2.5 px-4 text-center font-bold text-slate-600">12ª Classe</th>}
                            <th className="py-2.5 px-4 text-center bg-indigo-50/50 text-indigo-900 font-extrabold border-l border-slate-150">
                              Média Final
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {sections.flatMap(sec => [
                            <tr key={`sec-header-${sec.label}`} className="bg-slate-50/60 font-semibold">
                              <td colSpan={colSpanCount} className="py-2 px-4 text-[9px] font-extrabold text-slate-500 tracking-wider uppercase">
                                {sec.label}
                              </td>
                            </tr>,
                            ...sec.items.map(sub => {
                              const vals = punivGrades[sub] || { '10': '', '11': '', '12': '' };
                              const avg = calcPunivSubjectAverage(sub);
                              return (
                                <tr key={sub} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-4 font-bold text-slate-700">{sub}</td>
                                  <td className="py-2 px-4 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      max={20}
                                      placeholder="-"
                                      value={vals['10'] || ''}
                                      onChange={(e) => handlePunivGradeChange(sub, '10', e.target.value)}
                                      className="w-16 text-center bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                                    />
                                  </td>
                                  {show11 && (
                                    <td className="py-2 px-4 text-center">
                                      <input
                                        type="number"
                                        min={0}
                                        max={20}
                                        placeholder="-"
                                        value={vals['11'] || ''}
                                        onChange={(e) => handlePunivGradeChange(sub, '11', e.target.value)}
                                        className="w-16 text-center bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                                      />
                                    </td>
                                  )}
                                  {show12 && (
                                    <td className="py-2 px-4 text-center">
                                      <input
                                        type="number"
                                        min={0}
                                        max={20}
                                        placeholder="-"
                                        value={vals['12'] || ''}
                                        onChange={(e) => handlePunivGradeChange(sub, '12', e.target.value)}
                                        className="w-16 text-center bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                                      />
                                    </td>
                                  )}
                                  <td className="py-2 px-4 text-center bg-indigo-50/30 text-indigo-950 font-bold border-l border-slate-150">
                                    {avg !== null ? `${avg} (${notaParaExtenso(avg)})` : '-'}
                                  </td>
                                </tr>
                              );
                            })
                          ])}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            ) : subsistema === 'MAGISTERIO' ? (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">
                    Especialidade de Formação Pedagógica (Magistério)
                  </label>
                  <select
                    id="especialidade-magisterio"
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-bold text-slate-800 text-xs"
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

                <div className="overflow-x-auto border border-slate-150 rounded-xl">
                  {(() => {
                    const magSubjs = getMagisterioSubjects(selectedSpecialty);
                    const showMag11 = activeTab === 'CERTIFICADO' || parseInt(selectedClass, 10) >= 11;
                    const showMag12 = activeTab === 'CERTIFICADO' || parseInt(selectedClass, 10) >= 12;
                    const showMag13 = activeTab === 'CERTIFICADO' || parseInt(selectedClass, 10) >= 13;
                    const magColSpanCount = 2 + (showMag11 ? 1 : 0) + (showMag12 ? 1 : 0) + (showMag13 ? 1 : 0);

                    const sections = [
                      { label: 'Formação Geral', items: magSubjs.geralCientifica },
                      { label: 'Formação Educacional', items: magSubjs.pedagogica },
                      { label: 'Estágio Ped. Supervisionado', items: magSubjs.metodologias }
                    ];

                    return (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-extrabold border-b border-slate-150">
                          <tr>
                            <th className="py-2.5 px-4 font-bold text-slate-600">Disciplinas</th>
                            <th className="py-2.5 px-4 text-center font-bold text-slate-600">10ª Classe</th>
                            {showMag11 && <th className="py-2.5 px-4 text-center font-bold text-slate-600">11ª Classe</th>}
                            {showMag12 && <th className="py-2.5 px-4 text-center font-bold text-slate-600">12ª Classe</th>}
                            {showMag13 && <th className="py-2.5 px-4 text-center font-bold text-slate-600">13ª Classe</th>}
                            <th className="py-2.5 px-4 text-center bg-indigo-50/50 text-indigo-900 font-extrabold border-l border-slate-150">
                              Média Final
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {sections.flatMap(sec => [
                            <tr key={`sec-header-${sec.label}`} className="bg-slate-50/60 font-semibold">
                              <td colSpan={magColSpanCount} className="py-2 px-4 text-[9px] font-extrabold text-slate-500 tracking-wider uppercase">
                                {sec.label}
                              </td>
                            </tr>,
                            ...sec.items.map(sub => {
                              const vals = magisterioGrades[sub] || { '10': '', '11': '', '12': '', '13': '' };
                              const avg = calcMagisterioSubjectAverage(sub);
                              return (
                                <tr key={sub} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-4 font-bold text-slate-700">{sub}</td>
                                  <td className="py-2 px-4 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      max={20}
                                      placeholder="-"
                                      value={vals['10'] || ''}
                                      onChange={(e) => handleMagGradeChange(sub, '10', e.target.value)}
                                      className="w-14 text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-1 font-bold text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                                    />
                                  </td>
                                  {showMag11 && (
                                    <td className="py-2 px-4 text-center">
                                      <input
                                        type="number"
                                        min={0}
                                        max={20}
                                        placeholder="-"
                                        value={vals['11'] || ''}
                                        onChange={(e) => handleMagGradeChange(sub, '11', e.target.value)}
                                        className="w-14 text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-1 font-bold text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                                      />
                                    </td>
                                  )}
                                  {showMag12 && (
                                    <td className="py-2 px-4 text-center">
                                      <input
                                        type="number"
                                        min={0}
                                        max={20}
                                        placeholder="-"
                                        value={vals['12'] || ''}
                                        onChange={(e) => handleMagGradeChange(sub, '12', e.target.value)}
                                        className="w-14 text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-1 font-bold text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                                      />
                                    </td>
                                  )}
                                  {showMag13 && (
                                    <td className="py-2 px-4 text-center">
                                      <input
                                        type="number"
                                        min={0}
                                        max={20}
                                        placeholder="-"
                                        value={vals['13'] || ''}
                                        onChange={(e) => handleMagGradeChange(sub, '13', e.target.value)}
                                        className="w-14 text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-1 font-bold text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                                      />
                                    </td>
                                  )}
                                  <td className="py-2 px-4 text-center bg-indigo-50/30 text-indigo-950 font-bold border-l border-slate-150">
                                    {avg !== null ? `${avg} (${notaParaExtenso(avg)})` : '-'}
                                  </td>
                                </tr>
                              );
                            })
                          ])}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>

                {activeTab === 'CERTIFICADO' && (
                  <div className="bg-slate-50/60 border border-slate-150 rounded-xl p-4 mt-4 space-y-4">
                    <h3 className="font-bold text-slate-850 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-150 pb-2">
                      📁 Classificações Complementares Obrigatórias (13ª Classe)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">
                          Estágio Pedagógico <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={20}
                          placeholder="Ex: 15"
                          value={notaEstagio}
                          onChange={(e) => setNotaEstagio(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-bold text-slate-800 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">
                          Prova Aptidão Prof. (PAP) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={20}
                          placeholder="Ex: 16"
                          value={notaPAP}
                          onChange={(e) => setNotaPAP(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-bold text-slate-800 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">
                          Média Geral do Curso <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={20}
                          placeholder="Ex: 14"
                          value={mediaFinalCurso}
                          onChange={(e) => setMediaFinalCurso(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-bold text-slate-800 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'CERTIFICADO' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-100 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-extrabold">
                    <tr>
                      <th className="py-2 px-3">Disciplinas</th>
                      {(selectedNivel === 'TODOS' || selectedNivel === 'I') && <th className="py-2 px-3 text-center">I Ciclo (2ª Cl.)</th>}
                      {(selectedNivel === 'TODOS' || selectedNivel === 'II') && <th className="py-2 px-3 text-center">II Ciclo (4ª Cl.)</th>}
                      {(selectedNivel === 'TODOS' || selectedNivel === 'III') && <th className="py-2 px-3 text-center">III Ciclo (6ª Cl.)</th>}
                      <th className="py-2 px-3 text-center bg-indigo-50 text-indigo-900 font-extrabold">Média Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjectsForCertificado.map(subj => {
                      const vals = certGrades[subj.name] || { I: '', II: '', III: '' };
                      const calculated = certComputedAverages.rows[subj.name];

                      return (
                        <tr key={subj.name} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-750">{subj.name}</td>
                          
                          {/* Cycle I */}
                          {(selectedNivel === 'TODOS' || selectedNivel === 'I') && (
                            <td className="py-1 px-3 text-center">
                              {subj.cycles.I ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={10}
                                  placeholder="-"
                                  value={vals.I}
                                  onChange={(e) => handleCertGradeChange(subj.name, 'I', e.target.value)}
                                  className="w-12 text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                                />
                              ) : (
                                <span className="text-slate-300 font-medium italic text-[10px]">Shaded</span>
                              )}
                            </td>
                          )}

                          {/* Cycle II */}
                          {(selectedNivel === 'TODOS' || selectedNivel === 'II') && (
                            <td className="py-1 px-3 text-center">
                              {subj.cycles.II ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={10}
                                  placeholder="-"
                                  value={vals.II}
                                  onChange={(e) => handleCertGradeChange(subj.name, 'II', e.target.value)}
                                  className="w-12 text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                                />
                              ) : (
                                <span className="text-slate-300 font-medium italic text-[10px]">Shaded</span>
                              )}
                            </td>
                          )}

                          {/* Cycle III */}
                          {(selectedNivel === 'TODOS' || selectedNivel === 'III') && (
                            <td className="py-1 px-3 text-center">
                              {subj.cycles.III ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={10}
                                  placeholder="-"
                                  value={vals.III}
                                  onChange={(e) => handleCertGradeChange(subj.name, 'III', e.target.value)}
                                  className="w-12 text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                                />
                              ) : (
                                <span className="text-slate-300 font-medium italic text-[10px]">Shaded</span>
                              )}
                            </td>
                          )}

                          <td className="py-1 px-3 text-center bg-indigo-50/40 text-indigo-950 font-bold">
                            {calculated && calculated.media !== null ? (
                              <span>{calculated.media} <span className="text-[10px] text-slate-450 font-normal">({calculated.extenso})</span></span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              // Declaracao inputs
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-100 rounded-xl p-3">
                  <div>
                    <span className="text-xs font-bold text-indigo-950 block">
                      Grelha Curricular da {selectedClass}ª Classe ({subsistema === 'PRIMARIO' ? 'Ensino Primário' : subsistema})
                    </span>
                    <span className="text-[10px] text-indigo-600 font-medium">
                      Filtragem automática de disciplinas e cálculo em tempo real da Média Geral.
                    </span>
                  </div>
                  {calcPrimarioDeclAverage !== null && (
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Média Geral</span>
                      <span className="text-xs font-black text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-3xs inline-block">
                        {calcPrimarioDeclAverage} ({notaParaExtenso(calcPrimarioDeclAverage)})
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {activeDeclSubjects.map(subj => {
                    const val = decGrades[subj] !== undefined ? decGrades[subj] : '';
                    const maxScale = parseInt(selectedClass, 10) >= 7 ? 20 : 10;
                    return (
                      <div key={subj} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 hover:border-indigo-200 transition-colors">
                        <span className="font-bold text-slate-700 truncate pr-2">{subj}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={maxScale}
                            placeholder="-"
                            value={val}
                            onChange={(e) => handleDecGradeChange(subj, e.target.value)}
                            className="w-14 text-center bg-white border border-slate-200 rounded-lg px-2 py-1 font-extrabold text-slate-800 focus:outline-none focus:border-indigo-500"
                          />
                          {val !== '' && (
                            <span className="text-[10px] text-slate-400 font-mono font-semibold">
                              ({notaParaExtenso(Number(val))})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        {/* Right side live interactive layout preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-100 rounded-2xl border border-slate-200 p-5 shadow-inner space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1">
                <FileDown className="w-4 h-4 text-indigo-600" />
                <span>Visualização Oficial do Papel</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  try {
                    if (activeTab === 'CERTIFICADO') {
                      if (subsistema === 'PRIMARIO') generateCertificadoPDF();
                      else if (subsistema === 'MAGISTERIO') generateMagisterioCertificadoPDF();
                      else generatePunivCertificadoPDF();
                    } else {
                      generateDeclaracaoPDF();
                    }
                  } catch (err) {
                    console.error("Erro ao gerar PDF:", err);
                    alert("Ocorreu um erro ao gerar o documento PDF. Por favor verifique os dados preenchidos.");
                  }
                }}
                className="font-black py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md bg-emerald-600 hover:bg-emerald-700 text-white transform hover:scale-105"
              >
                <Printer className="w-4 h-4" />
                <span>Exportar PDF</span>
              </button>
            </div>

            {/* Document modular subcomponents */}
            {activeTab === 'CERTIFICADO' ? (
              <CertificadoDocument
                subsistema={subsistema}
                docType={docTypeSelected}
                studentName={studentName}
                gender={gender}
                fatherName={fatherName}
                motherName={motherName}
                birthDate={birthDate}
                naturalidade={naturalidade}
                municipio={municipio}
                provincia={provincia}
                biNumber={biNumber}
                biSector={biSector}
                biDate={biDate}
                schoolSettings={schoolSettings}
                decretoCriacao={decretoCriacao}
                anoLectivo={anoLectivo}
                selectedClass={selectedClass}
                selectedTurma={selectedTurma}
                selectedNoAluno={selectedNoAluno}
                selectedNivel={selectedNivel}
                selectedSpecialty={selectedSpecialty}
                leiBaseText={leiBaseText}
                livroRegisto={livroRegisto}
                folhaRegisto={folhaRegisto}
                currentDay={currentDay}
                currentMonth={currentMonth}
                currentYear={currentYear}
                logoUrl={logoUrl}
                subjectsForCertificado={subjectsForCertificado}
                certGrades={certGrades}
                certComputedAverages={certComputedAverages}
                singleCycleAverage={singleCycleAverage}
                punivSubjs={getPunivSubjects(selectedSpecialty)}
                punivGrades={punivGrades}
                calcPunivSubjectAverage={calcPunivSubjectAverage}
                magisterioSubjs={getMagisterioSubjects(selectedSpecialty)}
                magisterioGrades={magisterioGrades}
                calcMagisterioSubjectAverage={calcMagisterioSubjectAverage}
                calcMagisterioClassAverage={calcMagisterioClassAverage}
                mediaFinalCurso={mediaFinalCurso}
                notaEstagio={notaEstagio}
                notaPAP={notaPAP}
              />
            ) : (
              <DeclaracaoDocument
                subsistema={subsistema}
                docType={docTypeSelected}
                studentName={studentName}
                gender={gender}
                fatherName={fatherName}
                motherName={motherName}
                birthDate={birthDate}
                naturalidade={naturalidade}
                municipio={municipio}
                provincia={provincia}
                biNumber={biNumber}
                biSector={biSector}
                biDate={biDate}
                schoolSettings={schoolSettings}
                decretoCriacao={decretoCriacao}
                anoLectivo={anoLectivo}
                selectedClass={selectedClass}
                selectedTurma={selectedTurma}
                selectedNoAluno={selectedNoAluno}
                selectedSpecialty={selectedSpecialty}
                livroRegisto={livroRegisto}
                folhaRegisto={folhaRegisto}
                currentDay={currentDay}
                currentMonth={currentMonth}
                currentYear={currentYear}
                logoUrl={logoUrl}
                activeDeclSubjects={activeDeclSubjects}
                decGrades={decGrades}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
