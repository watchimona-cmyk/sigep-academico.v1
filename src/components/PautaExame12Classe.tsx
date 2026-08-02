import React, { useMemo, useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Student, GradeRow, SchoolSettings, getSubjectsForClass } from '../types';
import { formatarNomePauta, gerarCodigoPauta } from '../utils/pautaLogic';
import { 
  Printer, 
  Award, 
  BookOpen, 
  Download, 
  UserPlus, 
  Trash2, 
  RotateCcw, 
  Info,
  CheckCircle,
  XCircle,
  FileDown,
  Layers
} from 'lucide-react';
import { CurriculumSpecialty } from './DocumentoGrelhaCurricular';

interface PautaExame12ClasseProps {
  students?: Student[];
  grades?: GradeRow[];
  schoolSettings: SchoolSettings;
}

interface StudentExamRow {
  id: string;
  name: string;
  gender: 'M' | 'F';
  grades: {
    [disciplineId: string]: {
      mfd: number;
      ne: number;
    }
  };
}

interface StudentExamRow13 {
  id: string;
  name: string;
  gender: 'M' | 'F';
  m10: number;
  m11: number;
  m12: number;
  pap: number;
  nec: number;
}

// Initial fallback specialties list matching our curriculum config
const DEFAULT_PRESETS: CurriculumSpecialty[] = [
  {
    id: "ensino_primario",
    nome: "Ensino Primário",
    ativa: true,
    classes: {
      "10": { "geral": ["Língua Portuguesa", "Língua Inglesa","Matemática","Física", "Biologia", "Química", "História", "Geografia", "Informática", "Empreendedorismo"], "educacional": ["PDA", "NEE", "Expressões"] },
      "11": { "geral": ["Língua Portuguesa", "Língua Inglesa","Língua Francesa", "Matemática", "Empreendedorismo", "Filosofia"], "educacional": ["PDA", "NEE", "TEDC", "MELP", "MEMCN", "Expressões", "PSEP"] },
      "12": { "geral": ["Língua Portuguesa", "Língua Inglesa", "Língua Francesa", "Matemática", "Empreendedorismo"], "educacional": ["ASEAGE", "HSE", "MEF", "MEM", "MEH", "Expressões", "MEG", "FPSD", "PSEP"] },
      "13": { "estagio": ["NEC", "PAP"], "geral": [], "educacional": [] }
    }
  },
  {
    id: "Pré-Escolar",
    nome: "Pré-Escolar",
    ativa: true,
    classes: {
      "10": { "geral": ["Língua Portuguesa", "Língua Inglesa", "Língua Francesa", "Matemática", "Física", "Biologia", "Química", "História", "Geografia", "Informática", "Empreendedorismo", "Filosofia"], "educacional": ["PDA","NEE", "Expressões"] },
      "11": { "geral": ["Língua Portuguesa", "Língua Inglesa", "Matemática", "Empreendedorismo", "Filosofia"], "educacional": ["PDA", "NEE", "TEDC", "MELP", "MEMCN", "Expressões", "PSEP"] },
      "12": { "geral": ["Língua Portuguesa", "Língua Inglesa", "Língua Francesa", "Matemática", "Empreendedorismo"], "educacional": ["ASEAGE", "HSE", "MEF", "MEM", "MEH", "Expressões", "MEG", "FPSD", "PSEP"] },
      "13": { "estagio": ["NEC", "PAP"], "geral": [], "educacional": [] }
    }
  },
  {
    id: "matematica_fisica",
    nome: "Matemática e Física (Mat-Fisica)",
    ativa: true,
    classes: {
      "10": { "geral": ["Língua Portuguesa", "Língua Inglesa", "Informática", "Ed. Física", "Empreendedorismo"], "educacional": ["PDA", "NEE", "Matemática", "Física"] },
      "11": { "geral": ["Língua Portuguesa", "Ed. Física", "Empreendedorismo"], "educacional": ["ASEAGE", "Matemática", "Física", "TEDC", "FPSD", "MEM", "MEF", "PSEP"] },
      "12": { "geral": ["Filosofia", "Ed. Física", "Empreendedorismo"], "educacional": ["HSE", "Matemática", "Física", "MEM", "MEF", "PSEP"] },
      "13": { "estagio": ["NEC", "PAP"], "geral": [], "educacional": [] }
    }
  },
  {
    id: "biologia_quimica",
    nome: "Biologia e Química (Bio-Química)",
    ativa: true,
    classes: {
      "10": { "geral": ["Língua Portuguesa", "Língua Inglesa", "Informática", "Matemática", "Ed. Física", "Empreendedorismo"], "educacional": ["PDA","NEE", "Química", "Biologia"] },
      "11": { "geral": ["Língua Portuguesa", "Ed. Física", "Empreendedorismo"], "educacional": ["ASEAGE", "TEDC", "FPSD", "Química", "Biologia", "MEQ", "MEB", "PSEP"] },
      "12": { "geral": ["Filosofia", "Ed. Física", "Empreendedorismo"], "educacional": ["HSE", "Química", "Biologia", "MEQ", "MEB", "PSEP"] },
      "13": { "estagio": ["NEC", "PAP"], "geral": [], "educacional": [] }
    }
  },
  {
    id: "historia_geografia",
    nome: "História e Geografia (Geo-História)",
    ativa: true,
    classes: {
      "10": { "geral": ["Língua Portuguesa", "Língua Inglesa", "Informática", "Empreendedorismo", "Ed. Física", "Matemática"], "educacional": ["PDA","NEE", "História", "Geografia"] },
      "11": { "geral": ["Língua Portuguesa", "Empreendedorismo", "Ed. Física"], "educacional": ["ASEAGE", "TEDC", "FPSD", "História", "Geografia", "MEH", "MEG", "PSEP"] },
      "12": { "geral": ["Filosofia", "Empreendedorismo","Ed. Física"], "educacional": ["HSE", "História", "Geografia", "MEH", "MEG", "PSEP"] },
      "13": { "estagio": ["NEC", "PAP"], "geral": [], "educacional": [] }
    }
  },
  {
    id: "portugues_emc",
    nome: "Português e EMC",
    ativa: true,
    classes: {
      "10": { "geral": ["Língua Francesa", "Língua Inglesa", "Matemática", "Informática", "História", "Empreendedorismo", "Ed. Física"], "educacional": ["PDA", "NEE", "FPSD", "Literatura", "Língua Portuguesa"] },
      "11": { "geral": ["Língua Francesa", "Língua Inglesa", "Empreendedorismo", "Ed. Física"], "educacional": ["ASEAGE", "TEDC", "FPSD", "Literatura", "Língua Portuguesa", "MEEMC", "MELP", "PSEP"] },
      "12": { "geral": ["Filosofia", "Empreendedorismo", "Ed. Física"], "educacional": ["HSE", "FPSD", "Ética", "Língua Portuguesa", "MEEMC", "MELP", "PSEP"] },
      "13": { "estagio": ["NEC", "PAP"], "geral": [], "educacional": [] }
    }
  },
  {
    id: "ingles_emc",
    nome: "Inglês e EMC",
    ativa: true,
    classes: {
      "10": { "geral": ["Língua Portuguesa", "Língua Inglesa", "Informática", "Ed. Física", "Empreendedorismo"], "educacional": ["PDA/NEE", "Língua Inglesa", "EMC", "Didáctica"] },
      "11": { "geral": ["Língua Portuguesa", "Ed. Física", "Empreendedorismo"], "educacional": ["ASEAGE", "Língua Inglesa", "EMC", "TEDC", "FPSD", "MEI", "PSEP"] },
      "12": { "geral": ["Filosofia", "Ed. Física", "Empreendedorismo"], "educacional": ["HSE", "Língua Inglesa", "EMC", "MEI", "PSEP"] },
      "13": { "estagio": ["NEC", "PAP"], "geral": [], "educacional": [] }
    }
  },
  {
    id: "frances_emc",
    nome: "Francês e EMC",
    ativa: true,
    classes: {
      "10": { "geral": ["Língua Portuguesa", "Língua Francesa", "Informática", "Ed. Física", "Empreendedorismo"], "educacional": ["PDA/NEE", "Língua Francesa", "EMC", "Didáctica"] },
      "11": { "geral": ["Língua Portuguesa", "Ed. Física", "Empreendedorismo"], "educacional": ["ASEAGE", "Língua Francesa", "EMC", "TEDC", "FPSD", "MEF", "PSEP"] },
      "12": { "geral": ["Filosofia", "Ed. Física", "Empreendedorismo"], "educacional": ["HSE", "Língua Francesa", "EMC", "MEF", "PSEP"] },
      "13": { "estagio": ["NEC", "PAP"], "geral": [], "educacional": [] }
    }
  },
  {
    id: "ed_visual_plastica",
    nome: "Educação Visual e Plástica (EVP)",
    ativa: true,
    classes: {
      "10": { "geral": ["Língua Portuguesa", "Matemática", "Informática", "Ed. Física", "Empreendedorismo"], "educacional": ["PDA/NEE", "Desenho", "Geometria Descritiva", "Didáctica"] },
      "11": { "geral": ["Língua Portuguesa", "Ed. Física", "Empreendedorismo"], "educacional": ["ASEAGE", "Expressão Plástica", "Prática Pedagógica", "TEDC", "FPSD", "PSEP"] },
      "12": { "geral": ["Filosofia", "Ed. Física", "Empreendedorismo"], "educacional": ["HSE", "Didáctica das Expressões", "Estágio Pedagógico", "PSEP"] },
      "13": { "estagio": ["NEC", "PAP"], "geral": [], "educacional": [] }
    }
  },
  {
    id: "educacao_fisica",
    nome: "Educação Física (Ed.F)",
    ativa: true,
    classes: {
      "10": { "geral": ["Língua Portuguesa", "Língua Inglesa", "Matemática", "Informática", "Empreendedorismo"], "educacional": ["PDA/NEE", "Anatomia", "Didáctica de Educação Física"] },
      "11": { "geral": ["Língua Portuguesa", "Ed. Física", "Empreendedorismo"], "educacional": ["ASEAGE", "Fisiologia do Esporte", "Prática Pedagógica", "TEDC", "FPSD", "PSEP"] },
      "12": { "geral": ["Filosofia", "Ed. Física", "Empreendedorismo"], "educacional": ["HSE", "Treino Desportivo", "Estágio Pedagógico", "PSEP"] },
      "13": { "estagio": ["NEC", "PAP"], "geral": [], "educacional": [] }
    }
  },
  {
    id: "educacao_moral_civica",
    nome: "Educação Moral e Cívica (EMC)",
    ativa: true,
    classes: {
      "10": { "geral": ["Língua Portuguesa", "Língua Inglesa", "Matemática", "Informática", "Empreendedorismo"], "educacional": ["PDA/NEE", "Ética", "Didáctica de EMC"] },
      "11": { "geral": ["Língua Portuguesa", "Ed. Física", "Empreendedorismo"], "educacional": ["ASEAGE", "Educação para a Cidadania", "Prática Pedagógica", "TEDC", "FPSD", "PSEP"] },
      "12": { "geral": ["Filosofia", "Ed. Física", "Empreendedorismo"], "educacional": ["HSE", "Direitos Humanos", "Estágio Pedagógico", "PSEP"] },
      "13": { "estagio": ["NEC", "PAP"], "geral": [], "educacional": [] }
    }
  }
];

export default function PautaExame12Classe({ 
  students = [], 
  grades = [], 
  schoolSettings 
}: PautaExame12ClasseProps) {
  
  // Tab control: '12' for 12ª Classe, '13' for 13ª Classe
  const [selectedClassTab, setSelectedClassTab] = useState<'12' | '13'>('12');

  // Load dynamically configured curriculum specialties from local storage
  const [specialties, setSpecialties] = useState<CurriculumSpecialty[]>(() => {
    const saved = localStorage.getItem('sigep_curriculo_especialidades_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error(err);
      }
    }
    return DEFAULT_PRESETS;
  });

  // Filter Active specialties for dropdown selection (Toggle Dynamic rule)
  const activeSpecialties = useMemo(() => {
    return specialties.filter(esp => esp.ativa);
  }, [specialties]);

  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>(() => {
    return activeSpecialties.length > 0 ? activeSpecialties[0].id : DEFAULT_PRESETS[0].id;
  });

  // Keep selection synchronized with active ones
  useEffect(() => {
    if (activeSpecialties.length > 0 && !activeSpecialties.some(s => s.id === selectedSpecialtyId)) {
      setSelectedSpecialtyId(activeSpecialties[0].id);
    }
  }, [activeSpecialties, selectedSpecialtyId]);

  const [turma, setTurma] = useState<string>('A');
  const [periodo, setPeriodo] = useState<string>('Manhã');
  const [sala, setSala] = useState<string>('4');
  const [pautaNo, setPautaNo] = useState<string>('12/26');
  const [folhaNo, setFolhaNo] = useState<string>('1');

  // Current active specialty configuration
  const currentSpecialty = useMemo(() => {
    return specialties.find(s => s.id === selectedSpecialtyId) || DEFAULT_PRESETS[0];
  }, [specialties, selectedSpecialtyId]);

  // Dynamically extract general & educational disciplines of the 12ª Classe
  const currentDisciplines12 = useMemo(() => {
    const specMap: { [key: string]: string } = {
      'ensino_primario': 'EP',
      'biologia_quimica': 'BQ',
      'historia_geografia': 'GH',
      'portugues_emc': 'LEMC',
      'ingles_emc': 'ING_EMC',
      'frances_emc': 'FRA_EMC',
      'ed_visual_plastica': 'EVP',
      'educacao_fisica': 'EDF',
      'educacao_moral_civica': 'EMC',
      'matematica_fisica': 'MF'
    };
    const mappedSpec = specMap[selectedSpecialtyId] || 'EP';
    const officialSubjects = getSubjectsForClass('12', 'MAGISTERIO', mappedSpec);
    if (officialSubjects && officialSubjects.length > 0) {
      return officialSubjects.map((name, i) => ({ id: `SUB_${i}`, name }));
    }

    const class12Data = currentSpecialty.classes["12"];
    const list: { id: string; name: string }[] = [];
    
    if (class12Data) {
      (class12Data.geral || []).forEach((name, i) => {
        list.push({ id: `G_${i}`, name });
      });
      (class12Data.educacional || []).forEach((name, i) => {
        list.push({ id: `E_${i}`, name });
      });
    }

    if (list.length === 0) {
      // Emergency fallback if none set
      return [
        { id: 'LP', name: 'Língua Portuguesa' },
        { id: 'MAT', name: 'Matemática' },
        { id: 'FIL', name: 'Filosofia' }
      ];
    }
    return list;
  }, [currentSpecialty, selectedSpecialtyId]);

  // --- 12ª CLASSE STATES & PROCEDURES ---
  const [examRows12, setExamRows12] = useState<StudentExamRow[]>([]);

  const generateDefaultStudents12 = (specialtyId: string, disciplinesList: { id: string; name: string }[]): StudentExamRow[] => {
    const list = [
      { name: 'António Domingos Miguel', gender: 'M' as const },
      { name: 'Beatriz Fernando Sacatula', gender: 'F' as const },
      { name: 'Carlos Mateus Lunda', gender: 'M' as const },
      { name: 'Delfina José Samuncuanha', gender: 'F' as const },
      { name: 'Eduardo Neto Gaspar', gender: 'M' as const },
      { name: 'Fátima Bernardo Muatxi', gender: 'F' as const },
      { name: 'Gaspar da Silva Cassange', gender: 'M' as const },
      { name: 'Helena Francisco Muacanhica', gender: 'F' as const },
      { name: 'Isabel de Oliveira Muatxissengue', gender: 'F' as const },
      { name: 'João Miguel Cambulo', gender: 'M' as const }
    ];

    return list.map((stud, idx) => {
      const gradesObj: { [key: string]: { mfd: number; ne: number } } = {};
      disciplinesList.forEach((disc) => {
        const seed1 = (idx * 3 + disc.name.charCodeAt(0)) % 11 + 9; // 9 to 19
        const seed2 = (idx * 2 + disc.name.charCodeAt(1 || 0)) % 11 + 8; // 8 to 18
        gradesObj[disc.id] = {
          mfd: Number(seed1.toFixed(1)),
          ne: Number(seed2.toFixed(1))
        };
      });
      return {
        id: `STD-12-${idx + 1}`,
        name: stud.name,
        gender: stud.gender,
        grades: gradesObj
      };
    });
  };

  // Sync 12th Class Rows
  useEffect(() => {
    const storageKey = `sigep_pauta_exame_12_${selectedSpecialtyId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setExamRows12(JSON.parse(saved));
      } catch (err) {
        setExamRows12(generateDefaultStudents12(selectedSpecialtyId, currentDisciplines12));
      }
    } else {
      setExamRows12(generateDefaultStudents12(selectedSpecialtyId, currentDisciplines12));
    }
  }, [selectedSpecialtyId, currentDisciplines12]);

  const saveToLocalStorage12 = (updatedRows: StudentExamRow[]) => {
    const storageKey = `sigep_pauta_exame_12_${selectedSpecialtyId}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedRows));
    setExamRows12(updatedRows);
  };

  const handleCellChange12 = (studentId: string, disciplineId: string, field: 'mfd' | 'ne', val: string) => {
    const num = parseFloat(val) || 0;
    const clamped = Math.min(20, Math.max(0, num));
    
    const updated = examRows12.map(row => {
      if (row.id === studentId) {
        const studentGrades = { ...row.grades };
        const currentField = studentGrades[disciplineId] || { mfd: 10, ne: 10 };
        studentGrades[disciplineId] = {
          ...currentField,
          [field]: clamped
        };
        return { ...row, grades: studentGrades };
      }
      return row;
    });
    saveToLocalStorage12(updated);
  };


  // --- 13ª CLASSE STATES & PROCEDURES (Estágio Pedagógico) ---
  const [examRows13, setExamRows13] = useState<StudentExamRow13[]>([]);

  const generateDefaultStudents13 = (): StudentExamRow13[] => {
    const list = [
      { name: 'António Domingos Miguel', gender: 'M' as const },
      { name: 'Beatriz Fernando Sacatula', gender: 'F' as const },
      { name: 'Carlos Mateus Lunda', gender: 'M' as const },
      { name: 'Delfina José Samuncuanha', gender: 'F' as const },
      { name: 'Eduardo Neto Gaspar', gender: 'M' as const },
      { name: 'Fátima Bernardo Muatxi', gender: 'F' as const },
      { name: 'Gaspar da Silva Cassange', gender: 'M' as const },
      { name: 'Helena Francisco Muacanhica', gender: 'F' as const },
      { name: 'Isabel de Oliveira Muatxissengue', gender: 'F' as const },
      { name: 'João Miguel Cambulo', gender: 'M' as const }
    ];

    return list.map((stud, idx) => {
      const m10 = Number(((idx * 2 + 12) % 6 + 11.5).toFixed(1)); // 11.5 to 16.5
      const m11 = Number(((idx * 3 + 11) % 6 + 11.0).toFixed(1)); // 11.0 to 16.0
      const m12 = Number(((idx * 1 + 13) % 6 + 12.0).toFixed(1)); // 12.0 to 17.0
      const pap = Number(((idx * 2 + 14) % 6 + 12.5).toFixed(1)); // 12.5 to 17.5
      const nec = Number(((idx * 3 + 12) % 6 + 13.0).toFixed(1)); // 13.0 to 18.0
      return {
        id: `STD-13-${idx + 1}`,
        name: stud.name,
        gender: stud.gender,
        m10,
        m11,
        m12,
        pap,
        nec
      };
    });
  };

  // Sync 13th Class Rows
  useEffect(() => {
    const storageKey = `sigep_pauta_exame_13_${selectedSpecialtyId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setExamRows13(JSON.parse(saved));
      } catch (err) {
        setExamRows13(generateDefaultStudents13());
      }
    } else {
      setExamRows13(generateDefaultStudents13());
    }
  }, [selectedSpecialtyId]);

  const saveToLocalStorage13 = (updatedRows: StudentExamRow13[]) => {
    const storageKey = `sigep_pauta_exame_13_${selectedSpecialtyId}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedRows));
    setExamRows13(updatedRows);
  };

  const handleCellChange13 = (studentId: string, field: 'm10' | 'm11' | 'm12' | 'pap' | 'nec', val: string) => {
    const num = parseFloat(val) || 0;
    const clamped = Math.min(20, Math.max(0, num));
    
    const updated = examRows13.map(row => {
      if (row.id === studentId) {
        return {
          ...row,
          [field]: clamped
        };
      }
      return row;
    });
    saveToLocalStorage13(updated);
  };


  // --- CALCULATION LOGIC FOR EXPORT & PREVIEW ---
  const calculatedData12 = useMemo(() => {
    return examRows12.map(row => {
      const disciplineResults: { [discId: string]: { mfd: number; ne: number; mf: number } } = {};
      let negativesCount = 0;

      currentDisciplines12.forEach(d => {
        const studentGradeObj = row.grades[d.id] || { mfd: 10, ne: 10 };
        const mf = Math.round((studentGradeObj.mfd * 0.6) + (studentGradeObj.ne * 0.4));
        disciplineResults[d.id] = {
          mfd: studentGradeObj.mfd,
          ne: studentGradeObj.ne,
          mf
        };
        if (mf < 10) {
          negativesCount++;
        }
      });

      const isMagisterio = !selectedSpecialtyId.startsWith('puniv') && !selectedSpecialtyId.startsWith('liceu');
      const status = negativesCount === 0 
        ? (isMagisterio ? 'Transita' : 'Apto') 
        : (isMagisterio ? 'N/Transita' : 'N/Apto');

      return {
        ...row,
        disciplineResults,
        negativesCount,
        status
      };
    });
  }, [examRows12, currentDisciplines12]);

  const calculatedData13 = useMemo(() => {
    let saved13Map: Record<string, any> = {};
    try {
      const s = localStorage.getItem('sigep_13_grades_v2');
      if (s) saved13Map = JSON.parse(s);
    } catch (e) {}

    return examRows13.map(row => {
      const dbPap = grades?.find(g => (g.studentId === row.id || g.studentName === row.name) && (String(g.subject) === 'PAP' || String(g.subject) === 'Trabalho de Conclusão'));
      const dbNec = grades?.find(g => (g.studentId === row.id || g.studentName === row.name) && (String(g.subject) === 'NEC' || String(g.subject) === 'Estágio' || String(g.subject) === 'Prática Pedagógica'));

      const papValInDb = dbPap?.mt ?? dbPap?.mac ?? dbPap?.npt;
      const necValInDb = dbNec?.mt ?? dbNec?.mac ?? dbNec?.npt;

      const s13Saved = saved13Map[row.id];

      const pap = (papValInDb !== undefined && papValInDb !== null)
        ? Math.round(papValInDb)
        : (s13Saved?.pap !== undefined && s13Saved.pap !== 0 ? s13Saved.pap : row.pap);

      const nec = (necValInDb !== undefined && necValInDb !== null)
        ? Math.round(necValInDb)
        : (s13Saved?.nec !== undefined && s13Saved.nec !== 0 ? s13Saved.nec : row.nec);

      const ma = Number(((row.m10 + row.m11 + row.m12) / 3).toFixed(1));
      // Formula de aproveitamento pedagógico: MF = (MA * 0.4) + (PAP * 0.3) + (NEC * 0.3)
      const mf = Math.round((ma * 0.4) + (pap * 0.3) + (nec * 0.3));
      const status: 'Apto' | 'Não Apto' = mf >= 10 ? 'Apto' : 'Não Apto';

      return {
        ...row,
        pap,
        nec,
        ma,
        mf,
        status
      };
    });
  }, [examRows13, grades]);

  // Statistical Summaries
  const stats12 = useMemo(() => {
    let mascTotal = 0, mascAptos = 0, mascNAptos = 0;
    let femTotal = 0, femAptos = 0, femNAptos = 0;

    calculatedData12.forEach(row => {
      const isApproved = row.status === 'Apto' || row.status === 'Transita';
      if (row.gender === 'M') {
        mascTotal++;
        if (isApproved) mascAptos++;
        else mascNAptos++;
      } else {
        femTotal++;
        if (isApproved) femAptos++;
        else femNAptos++;
      }
    });

    return {
      masculino: { total: mascTotal, aptos: mascAptos, nAptos: mascNAptos },
      feminino: { total: femTotal, aptos: femAptos, nAptos: femNAptos },
      total: { total: mascTotal + femTotal, aptos: mascAptos + femAptos, nAptos: mascNAptos + femNAptos }
    };
  }, [calculatedData12]);

  const stats13 = useMemo(() => {
    let mascTotal = 0, mascAptos = 0, mascNAptos = 0;
    let femTotal = 0, femAptos = 0, femNAptos = 0;

    calculatedData13.forEach(row => {
      if (row.gender === 'M') {
        mascTotal++;
        if (row.status === 'Apto') mascAptos++;
        else mascNAptos++;
      } else {
        femTotal++;
        if (row.status === 'Apto') femAptos++;
        else femNAptos++;
      }
    });

    return {
      masculino: { total: mascTotal, aptos: mascAptos, nAptos: mascNAptos },
      feminino: { total: femTotal, aptos: femAptos, nAptos: femNAptos },
      total: { total: mascTotal + femTotal, aptos: mascAptos + femAptos, nAptos: mascNAptos + femNAptos }
    };
  }, [calculatedData13]);


  // Add Student Handlers
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentGender, setNewStudentGender] = useState<'M' | 'F'>('M');
  const [isPdfGenerating, setIsPdfGenerating] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleGravarNotas = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSuccessMsg("Nota gravada com sucesso");
      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    }, 1000);
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    if (selectedClassTab === '12') {
      const newId = `STD-12-${Date.now()}`;
      const gradesObj: { [key: string]: { mfd: number; ne: number } } = {};
      currentDisciplines12.forEach(d => {
        gradesObj[d.id] = { mfd: 10, ne: 10 };
      });

      const newRow: StudentExamRow = {
        id: newId,
        name: newStudentName.trim(),
        gender: newStudentGender,
        grades: gradesObj
      };
      saveToLocalStorage12([...examRows12, newRow]);
    } else {
      const newRow: StudentExamRow13 = {
        id: `STD-13-${Date.now()}`,
        name: newStudentName.trim(),
        gender: newStudentGender,
        m10: 12,
        m11: 12,
        m12: 12,
        pap: 12,
        nec: 12
      };
      saveToLocalStorage13([...examRows13, newRow]);
    }

    setNewStudentName('');
    setSuccessMsg(`Aluno(a) "${newStudentName.trim()}" adicionado com sucesso.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDeleteStudent = (id: string, name: string) => {
    if (window.confirm(`Deseja realmente remover o(a) aluno(a) "${name}"?`)) {
      if (selectedClassTab === '12') {
        saveToLocalStorage12(examRows12.filter(r => r.id !== id));
      } else {
        saveToLocalStorage13(examRows13.filter(r => r.id !== id));
      }
    }
  };

  const handleReset = () => {
    if (window.confirm("Deseja realmente redefinir as notas de exame para o padrão inicial?")) {
      if (selectedClassTab === '12') {
        saveToLocalStorage12(generateDefaultStudents12(selectedSpecialtyId, currentDisciplines12));
      } else {
        saveToLocalStorage13(generateDefaultStudents13());
      }
      setSuccessMsg("Pauta restaurada para as notas padrão.");
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };


  // --- PDF EXPORT LOGIC FOR 12ª CLASSE (LANDSCAPE A3) & 13ª CLASSE (PORTRAIT A3) ---
  const handleExportPDF = () => {
    setIsPdfGenerating(true);
    setSuccessMsg(null);

    try {
      const today = new Date();
      const dateString = `${today.getDate()} de ${
        ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][today.getMonth()]
      } de ${today.getFullYear()}`;

      // Dynamically select layout structure: 12 is Landscape, 13 is Portrait
      const is12 = selectedClassTab === '12';
      const orientation = is12 ? 'landscape' : 'portrait';
      
      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a3'
      });

      // Bounds
      // Landscape A3 is 420mm x 297mm
      // Portrait A3 is 297mm x 420mm
      const pageWidth = is12 ? 420 : 297;
      const pageHeight = is12 ? 297 : 420;
      const midX = pageWidth / 2;

      // Borders removed

      // Logo
      const logoUrl = schoolSettings.logoType === 'PUBLIC' ? schoolSettings.publicLogoUrl : schoolSettings.privateLogoUrl;
      if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
        try {
          let format = 'PNG';
          if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) {
            format = 'JPEG';
          }
          doc.addImage(logoUrl, format, midX - 8, 10, 16, 16);
        } catch (err) {
          console.error("Logo error", err);
        }
      }

      // Headers text
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('REPÚBLICA DE ANGOLA', midX, 31, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('MINISTÉRIO DA EDUCAÇÃO', midX, 35, { align: 'center' });
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text((schoolSettings.schoolName || 'COMPLEXO ESCOLAR WATCHIMONA').toUpperCase(), midX, 40, { align: 'center' });
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      const docTitleStr = is12 ? `PAUTA FINAL DE EXAME - ${currentSpecialty.nome.toUpperCase()}` : `PAUTA FINAL DO CURSO PEDAGÓGICO`;
      doc.text(docTitleStr, midX, 47, { align: 'center' });

      // Metadata Info
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      
      const metaY = 57;
      doc.text(`ESPECIALIDADE: ${currentSpecialty.nome.toUpperCase()}`, 15, metaY);
      doc.text(`TURMA: ${turma}`, midX - 65, metaY);
      doc.text(`ANO LECTIVO: ${schoolSettings.academicYear || '2025/2026'}`, midX - 15, metaY);
      doc.text(`CLASSE: ${selectedClassTab}ª`, midX + 35, metaY);
      doc.text(`SALA Nº_____`, pageWidth - 55, metaY);
      doc.setFontSize(8);
      doc.text(`Cód: ${gerarCodigoPauta(schoolSettings.academicYear || '2025/2026', selectedClassTab)}`, pageWidth - 55, metaY + 3.5);

      // --- DRAW GRID TABLES ---
      if (is12) {
        // Landscape A3 Table for 12th Class
        const tableStartX = 10;
        const tableStartY = 65;
        const tableWidth = 400; // 420 - 20
        const rowHeight = 7.5;
        const headerHeight1 = 8;
        const headerHeight2 = 6;
        
        const numColWidth = 7;
        const nameColWidth = 55;
        const obsColWidth = 20;

        const disciplinesCount = currentDisciplines12.length;
        const remainingWidth = tableWidth - numColWidth - nameColWidth - obsColWidth;
        const disciplineColWidth = remainingWidth / disciplinesCount;

        // Draw Headers background
        doc.setFillColor(241, 245, 249);
        doc.rect(tableStartX, tableStartY, tableWidth, headerHeight1 + headerHeight2, 'F');

        // Draw Table Outline
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.rect(tableStartX, tableStartY, tableWidth, headerHeight1 + headerHeight2);

        // Header Texts
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Nº', tableStartX + (numColWidth / 2), tableStartY + 9, { align: 'center' });
        doc.text('Nome Completo', tableStartX + numColWidth + 3, tableStartY + 9);

        // Lines for static columns
        doc.line(tableStartX + numColWidth, tableStartY, tableStartX + numColWidth, tableStartY + headerHeight1 + headerHeight2);
        doc.line(tableStartX + numColWidth + nameColWidth, tableStartY, tableStartX + numColWidth + nameColWidth, tableStartY + headerHeight1 + headerHeight2);

        // Draw each discipline header block
        currentDisciplines12.forEach((d, dIdx) => {
          const discX = tableStartX + numColWidth + nameColWidth + (dIdx * disciplineColWidth);
          
          // Header text
          doc.setFontSize(5.5);
          doc.text(d.name.substring(0, 18).toUpperCase(), discX + (disciplineColWidth / 2), tableStartY + 5, { align: 'center' });

          // line separating disciplines
          doc.line(discX, tableStartY, discX, tableStartY + headerHeight1 + headerHeight2);

          // Subheaders MFD, NE, MF lines
          const subW = disciplineColWidth / 3;
          doc.setFontSize(4.5);
          doc.text('MFD', discX + (subW / 2), tableStartY + headerHeight1 + 4, { align: 'center' });
          doc.text('NE', discX + subW + (subW / 2), tableStartY + headerHeight1 + 4, { align: 'center' });
          doc.text('MF', discX + (subW * 2) + (subW / 2), tableStartY + headerHeight1 + 4, { align: 'center' });

          doc.line(discX + subW, tableStartY + headerHeight1, discX + subW, tableStartY + headerHeight1 + headerHeight2);
          doc.line(discX + (subW * 2), tableStartY + headerHeight1, discX + (subW * 2), tableStartY + headerHeight1 + headerHeight2);
        });

        // Horizontal line separating top header & subheaders
        doc.line(tableStartX + numColWidth + nameColWidth, tableStartY + headerHeight1, tableStartX + tableWidth - obsColWidth, tableStartY + headerHeight1);

        // Obs header
        doc.setFontSize(7.5);
        doc.text('OBSERVAÇÃO', tableStartX + tableWidth - (obsColWidth / 2), tableStartY + 9, { align: 'center' });
        doc.line(tableStartX + tableWidth - obsColWidth, tableStartY, tableStartX + tableWidth - obsColWidth, tableStartY + headerHeight1 + headerHeight2);

        // Table Rows
        let currentY = tableStartY + headerHeight1 + headerHeight2;
        calculatedData12.forEach((row, rIdx) => {
          // Row background alternating
          if (rIdx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(tableStartX, currentY, tableWidth, rowHeight, 'F');
          }

          doc.rect(tableStartX, currentY, tableWidth, rowHeight); // cell box outline

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(7.5);
          // Number
          doc.text(String(rIdx + 1), tableStartX + (numColWidth / 2), currentY + 5, { align: 'center' });
          doc.line(tableStartX + numColWidth, currentY, tableStartX + numColWidth, currentY + rowHeight);

          // Student Name
          doc.setFont('Helvetica', 'bold');
          doc.text(row.name, tableStartX + numColWidth + 2.5, currentY + 5);
          doc.line(tableStartX + numColWidth + nameColWidth, currentY, tableStartX + numColWidth + nameColWidth, currentY + rowHeight);

          // Grades
          currentDisciplines12.forEach((d, dIdx) => {
            const discX = tableStartX + numColWidth + nameColWidth + (dIdx * disciplineColWidth);
            const subW = disciplineColWidth / 3;
            const gradesObj = row.disciplineResults[d.id] || { mfd: 10, ne: 10, mf: 10 };

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(String(Math.round(gradesObj.mfd)), discX + (subW / 2), currentY + 5, { align: 'center' });
            doc.text(String(gradesObj.ne.toFixed(1)), discX + subW + (subW / 2), currentY + 5, { align: 'center' });
            
            // MF bold
            doc.setFont('Helvetica', 'bold');
            doc.text(String(Math.round(gradesObj.mf)), discX + (subW * 2) + (subW / 2), currentY + 5, { align: 'center' });

            doc.line(discX, currentY, discX, currentY + rowHeight);
            doc.line(discX + subW, currentY, discX + subW, currentY + rowHeight);
            doc.line(discX + (subW * 2), currentY, discX + (subW * 2), currentY + rowHeight);
          });

          // Line before OBS
          doc.line(tableStartX + tableWidth - obsColWidth, currentY, tableStartX + tableWidth - obsColWidth, currentY + rowHeight);

          // Obs Text
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(row.status === 'Apto' ? 16 : 225, row.status === 'Apto' ? 115 : 29, row.status === 'Apto' ? 41 : 72);
          doc.text(row.status.toUpperCase(), tableStartX + tableWidth - (obsColWidth / 2), currentY + 5, { align: 'center' });
          doc.setTextColor(0, 0, 0); // reset color

          currentY += rowHeight;
        });

        // Bottom stats block (Landscape positions)
        const bottomBlockY = 165;
        const statsBoxWidth = 80;
        doc.setFillColor(255, 255, 255);
        doc.setLineWidth(0.4);
        doc.rect(tableStartX, bottomBlockY, statsBoxWidth, 28, 'FD');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('Informação Estatística', tableStartX + (statsBoxWidth / 2), bottomBlockY + 4, { align: 'center' });
        doc.line(tableStartX, bottomBlockY + 6, tableStartX + statsBoxWidth, bottomBlockY + 6);

        const colGenX = tableStartX + 2;
        const colInscX = tableStartX + 28;
        const colAptosX = tableStartX + 48;
        const colNAptosX = tableStartX + 66;

        doc.text('Gênero', colGenX, bottomBlockY + 11);
        doc.text('Inscritos', colInscX, bottomBlockY + 11, { align: 'center' });
        doc.text('Aptos', colAptosX, bottomBlockY + 11, { align: 'center' });
        doc.text('N/Aptos', colNAptosX, bottomBlockY + 11, { align: 'center' });
        doc.line(tableStartX, bottomBlockY + 13, tableStartX + statsBoxWidth, bottomBlockY + 13);

        doc.setFont('Helvetica', 'normal');
        doc.text('Masc.', colGenX, bottomBlockY + 18);
        doc.text(String(stats12.masculino.total), colInscX, bottomBlockY + 18, { align: 'center' });
        doc.text(String(stats12.masculino.aptos), colAptosX, bottomBlockY + 18, { align: 'center' });
        doc.text(String(stats12.masculino.nAptos), colNAptosX, bottomBlockY + 18, { align: 'center' });

        doc.text('Fem.', colGenX, bottomBlockY + 23);
        doc.text(String(stats12.feminino.total), colInscX, bottomBlockY + 23, { align: 'center' });
        doc.text(String(stats12.feminino.aptos), colAptosX, bottomBlockY + 23, { align: 'center' });
        doc.text(String(stats12.feminino.nAptos), colNAptosX, bottomBlockY + 23, { align: 'center' });

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(`${schoolSettings.municipality || 'Cafunfo'}, aos ${dateString}.`, tableStartX, bottomBlockY - 4, { align: 'left' });

        // Signatures (Landscape coordinates)
        const sigStartX = 140;
        const sigWidth = 70;
        const sigSpacing = 18;

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        // O Conselho de Notas
        doc.text('O Conselho de Notas', sigStartX + (sigWidth / 2), bottomBlockY + 6, { align: 'center' });
        doc.line(sigStartX, bottomBlockY + 22, sigStartX + sigWidth, bottomBlockY + 22);
        doc.setFontSize(7.5);
        doc.text('Assinatura Colectiva', sigStartX + (sigWidth / 2), bottomBlockY + 26, { align: 'center' });

        // O Subdirector Pedagógico
        const x2 = sigStartX + sigWidth + sigSpacing;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(schoolSettings.subdirectorRoleLabel || 'O Subdirector Pedagógico', x2 + (sigWidth / 2), bottomBlockY + 6, { align: 'center' });
        doc.line(x2, bottomBlockY + 22, x2 + sigWidth, bottomBlockY + 22);
        doc.setFontSize(7.5);
        doc.text(schoolSettings.subdirectorName || 'Dr. Subdirector Pedagógico', x2 + (sigWidth / 2), bottomBlockY + 26, { align: 'center' });
        doc.text('________/__________/__________', x2 + (sigWidth / 2), bottomBlockY + 31, { align: 'center' });

        // O Director da Escola
        const x3 = x2 + sigWidth + sigSpacing;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(schoolSettings.directorRoleLabel || 'O Director da Escola', x3 + (sigWidth / 2), bottomBlockY + 6, { align: 'center' });
        doc.line(x3, bottomBlockY + 22, x3 + sigWidth, bottomBlockY + 22);
        doc.setFontSize(7.5);
        doc.text(schoolSettings.directorName || 'Dr. Director Geral', x3 + (sigWidth / 2), bottomBlockY + 26, { align: 'center' });
        doc.text('________/__________/__________', x3 + (sigWidth / 2), bottomBlockY + 31, { align: 'center' });

        // Footer info stamp
        doc.setFontSize(6.5);
        doc.setFont('Helvetica', 'normal');
        doc.text(`SIGEP - Emitido digitalmente em: ${today.toLocaleDateString('pt-AO')} | Hash Autenticidade: SH-12EX-${selectedSpecialtyId}-${pautaNo.replace('/', '-')}`, midX, 280, { align: 'center' });

      } else {
        // Portrait A3 Table for 13th Class (Internship)
        // Conforms exactly to the provided PDF screenshot layout!
        const tableStartX = 15;
        const tableStartY = 65;
        const tableWidth = 267; // 297 - 30
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
        calculatedData13.forEach((row, rIdx) => {
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
          doc.text(row.name, tableStartX + numColWidth + 3, currentY + 5.5);
          doc.line(tableStartX + numColWidth + nameColWidth, currentY, tableStartX + numColWidth + nameColWidth, currentY + rowHeight);

          // 10, 11, 12 Médias
          doc.setFont('Helvetica', 'normal');
          const rowMediasX = tableStartX + numColWidth + nameColWidth;
          doc.text(row.m10.toFixed(1), rowMediasX + (colWidthM10 / 2), currentY + 5.5, { align: 'center' });
          doc.line(rowMediasX + colWidthM10, currentY, rowMediasX + colWidthM10, currentY + rowHeight);

          doc.text(row.m11.toFixed(1), rowMediasX + colWidthM10 + (colWidthM11 / 2), currentY + 5.5, { align: 'center' });
          doc.line(rowMediasX + colWidthM10 + colWidthM11, currentY, rowMediasX + colWidthM10 + colWidthM11, currentY + rowHeight);

          doc.text(row.m12.toFixed(1), rowMediasX + colWidthM10 + colWidthM11 + (colWidthM12 / 2), currentY + 5.5, { align: 'center' });
          doc.line(rowMediasX + mediasSpanWidth, currentY, rowMediasX + mediasSpanWidth, currentY + rowHeight);

          // MA
          doc.text(row.ma.toFixed(1), maX + (colWidthMA / 2), currentY + 5.5, { align: 'center' });
          doc.line(maX + colWidthMA, currentY, maX + colWidthMA, currentY + rowHeight);

          // PAP
          doc.text(row.pap.toFixed(1), papX + (colWidthPAP / 2), currentY + 5.5, { align: 'center' });
          doc.line(papX + colWidthPAP, currentY, papX + colWidthPAP, currentY + rowHeight);

          // NEC
          doc.text(row.nec.toFixed(1), necX + (colWidthNEC / 2), currentY + 5.5, { align: 'center' });
          doc.line(necX + colWidthNEC, currentY, necX + colWidthNEC, currentY + rowHeight);

          // MF
          doc.setFont('Helvetica', 'bold');
          doc.text(Math.round(row.mf).toString(), mfX + (colWidthMF / 2), currentY + 5.5, { align: 'center' });
          doc.line(mfX + colWidthMF, currentY, mfX + colWidthMF, currentY + rowHeight);

          // Observação
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(row.status === 'Apto' ? 16 : 225, row.status === 'Apto' ? 115 : 29, row.status === 'Apto' ? 41 : 72);
          doc.text(row.status.toUpperCase(), obsX + (colWidthObs / 2), currentY + 5.5, { align: 'center' });
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

        const colGenX = tableStartX + 3;
        const colTotalX = tableStartX + 32;
        const colAprovX = tableStartX + 52;
        const colReprovX = tableStartX + 70;

        doc.text('Gênero', colGenX, bottomBlockY + 12);
        doc.text('Total', colTotalX, bottomBlockY + 12, { align: 'center' });
        doc.text('Aptos', colAprovX, bottomBlockY + 12, { align: 'center' });
        doc.text('N/Aptos', colReprovX, bottomBlockY + 12, { align: 'center' });
        doc.line(tableStartX, bottomBlockY + 14, tableStartX + statsBoxWidth, bottomBlockY + 14);

        doc.setFont('Helvetica', 'normal');
        doc.text('Masculino', colGenX, bottomBlockY + 20);
        doc.text(String(stats13.masculino.total), colTotalX, bottomBlockY + 20, { align: 'center' });
        doc.text(String(stats13.masculino.aptos), colAprovX, bottomBlockY + 20, { align: 'center' });
        doc.text(String(stats13.masculino.nAptos), colReprovX, bottomBlockY + 20, { align: 'center' });

        doc.text('Feminino', colGenX, bottomBlockY + 26);
        doc.text(String(stats13.feminino.total), colTotalX, bottomBlockY + 26, { align: 'center' });
        doc.text(String(stats13.feminino.aptos), colAprovX, bottomBlockY + 26, { align: 'center' });
        doc.text(String(stats13.feminino.nAptos), colReprovX, bottomBlockY + 26, { align: 'center' });

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(`${schoolSettings.municipality || 'Cafunfo'}, aos ${dateString}.`, tableStartX, bottomBlockY - 4, { align: 'left' });

        // Signatures (A3 Portrait coordinates)
        const sigStartX = 98;
        const sigWidth = 53;
        const sigSpacing = 10;

        // O Coordenador de Especialidade
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('O Coordenador de Especialidade', sigStartX + (sigWidth / 2), bottomBlockY + 8, { align: 'center' });
        doc.line(sigStartX, bottomBlockY + 25, sigStartX + sigWidth, bottomBlockY + 25);
        doc.setFontSize(7.5);
        doc.text('________/__________/__________', sigStartX + (sigWidth / 2), bottomBlockY + 35, { align: 'center' });

        // O Subdirector Pedagógico
        const x2 = sigStartX + sigWidth + sigSpacing;
        doc.text(schoolSettings.subdirectorRoleLabel || 'O Subdirector Pedagógico', x2 + (sigWidth / 2), bottomBlockY + 8, { align: 'center' });
        doc.line(x2, bottomBlockY + 25, x2 + sigWidth, bottomBlockY + 25);
        doc.setFontSize(7.5);
        doc.text(schoolSettings.subdirectorName || 'Dr. Subdirector Pedagógico', x2 + (sigWidth / 2), bottomBlockY + 30, { align: 'center' });
        doc.text('________/__________/__________', x2 + (sigWidth / 2), bottomBlockY + 35, { align: 'center' });

        // O director da Escola
        const x3 = x2 + sigWidth + sigSpacing;
        doc.setFontSize(8.5);
        doc.text(schoolSettings.directorRoleLabel || 'O director da Escola', x3 + (sigWidth / 2), bottomBlockY + 8, { align: 'center' });
        doc.line(x3, bottomBlockY + 25, x3 + sigWidth, bottomBlockY + 25);
        doc.setFontSize(7.5);
        doc.text(schoolSettings.directorName || 'Dr. Director Geral', x3 + (sigWidth / 2), bottomBlockY + 30, { align: 'center' });
        doc.text('________/__________/__________', x3 + (sigWidth / 2), bottomBlockY + 35, { align: 'center' });

        // Footer stamps
        doc.setFontSize(6.5);
        doc.setFont('Helvetica', 'normal');
        doc.text(`SIGEP - Emitido digitalmente em: ${today.toLocaleDateString('pt-AO')} | Hash Autenticidade: SH-13EX-${selectedSpecialtyId}-${pautaNo.replace('/', '-')}`, midX, 408, { align: 'center' });
      }

      // Save PDF
      const fileName = `Pauta_Final_${selectedClassTab}Cl_${selectedSpecialtyId}_Turma_${turma}.pdf`;
      doc.save(fileName);

      setSuccessMsg(`Pauta Oficial da ${selectedClassTab}ª Classe descarregada com sucesso.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (error) {
      console.error(error);
      alert('Erro ao exportar PDF. Por favor verifique os dados.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="pauta-exame-container">
      
      {/* Tab Selection for Classes */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 max-w-md shadow-2xs noprint">
        <button
          onClick={() => setSelectedClassTab('12')}
          className={`flex-1 py-3.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedClassTab === '12' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500 animate-pulse" />
          12ª Classe (Horizontal A3)
        </button>
        <button
          onClick={() => setSelectedClassTab('13')}
          className={`flex-1 py-3.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedClassTab === '13' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-indigo-600 animate-pulse" />
          13ª Classe (Vertical A3)
        </button>
      </div>

      {/* Alert or Success Message */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 shadow-xs font-sans text-xs sm:text-sm animate-pulse noprint">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Interactive Control Panel - Hidden on Print */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/60 shadow-xs noprint space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Gestão de Pautas Finais de Exame ({selectedClassTab}ª Classe)
            </h3>
            {selectedClassTab === '12' ? (
              <p className="text-[11px] text-slate-500 font-medium">
                Pauta Geral de Exame (12ª). Altere as notas <span className="font-bold">MFD</span> e <span className="font-bold">NE</span> directamente na grelha horizontal. Exporta em <span className="font-bold text-indigo-600">Horizontal A3</span>.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 font-medium">
                Pauta de Estágio Pedagógico (13ª). Altere as notas das classes (<span className="font-bold">10ª</span>, <span className="font-bold">11ª</span>, <span className="font-bold">12ª</span>) e do estágio (<span className="font-bold">PAP</span>, <span className="font-bold">NEC</span>) na matriz. Exporta em <span className="font-bold text-indigo-600">Vertical A3</span>.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleReset}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 transition-all"
              title="Restaurar notas originais"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Restaurar Padrão
            </button>
            <button
              onClick={handleGravarNotas}
              disabled={isSaving}
              className={`text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-md shrink-0 ${
                isSaving 
                  ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse' 
                  : 'bg-indigo-600 hover:bg-indigo-750'
              }`}
            >
              <CheckCircle className="w-4 h-4 text-white" />
              {isSaving ? 'A Gravar...' : 'Gravar Notas de Exame'}
            </button>
            <button
              onClick={() => window.print()}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Imprimir Pauta
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isPdfGenerating}
              className="bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              <FileDown className="w-4 h-4 text-emerald-400" />
              {isPdfGenerating ? 'A Gerar PDF...' : 'Descarregar PDF Oficial'}
            </button>
          </div>
        </div>

        {/* Configurations Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3.5">
          {/* Specialty */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Especialidade da Escola</label>
            <select
              value={selectedSpecialtyId}
              onChange={(e) => setSelectedSpecialtyId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white font-semibold text-slate-800"
            >
              {activeSpecialties.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>

          {/* Turma */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Turma</label>
            <input
              type="text"
              value={turma}
              onChange={(e) => setTurma(e.target.value.toUpperCase())}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white font-bold text-center"
            />
          </div>

          {/* Período */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Período</label>
            <input
              type="text"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white font-bold text-center"
            />
          </div>

          {/* Pauta No */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Pauta Nº</label>
            <input
              type="text"
              value={pautaNo}
              onChange={(e) => setPautaNo(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white font-bold text-center"
            />
          </div>
        </div>

        {/* Info stamp */}
        <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex gap-3 text-xs text-indigo-900 font-medium">
          <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Conformidade e Formatos A3 Oficiais:</p>
            <p>
              Em conformidade com a legislação do MED, a pauta da <span className="font-bold">12ª Classe é horizontal (A3 Landscape)</span> para acolher todas as disciplinas curriculares. A pauta da <span className="font-bold">13ª Classe é vertical (A3 Portrait)</span> para focar nas médias finais e componentes de estágio. Use o descarregador para obter os arquivos PDF prontos para impressão física.
            </p>
          </div>
        </div>

        {/* Add Student Form */}
        <form onSubmit={handleAddStudent} className="p-4 bg-slate-50/60 border border-slate-250/50 rounded-xl flex flex-col sm:flex-row items-end gap-3.5">
          <div className="grow space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase">Novo Aluno para esta Turma da {selectedClassTab}ª Classe</label>
            <input
              type="text"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="Digite o nome completo do aluno..."
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
            />
          </div>
          <div className="w-full sm:w-32 space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase">Género</label>
            <select
              value={newStudentGender}
              onChange={(e) => setNewStudentGender(e.target.value as 'M' | 'F')}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-bold"
            >
              <option value="M">Masculino (M)</option>
              <option value="F">Feminino (F)</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            Adicionar
          </button>
        </form>
      </div>

      {/* MATRIX PAUTA CONTAINER */}
      {selectedClassTab === '12' ? (
        // 12ª CLASSE HORIZONTAL MATRIX
        <div className="bg-white border border-slate-250 shadow-xl rounded-2xl overflow-hidden" id="pauta-12-sheet-print">
          <div className="p-8 sm:p-10 border-b border-slate-200 space-y-3 text-center">
            {(() => {
              const logo = schoolSettings.logoType === 'PUBLIC' ? schoolSettings.publicLogoUrl || '🇦🇴' : schoolSettings.privateLogoUrl || '🎓';
              if (logo.startsWith('data:') || logo.startsWith('http')) {
                return (
                  <img
                    src={logo}
                    alt="Escola Logo"
                    className="mx-auto w-14 h-14 rounded-full object-cover border-2 border-indigo-600 mb-2 shadow-px"
                    referrerPolicy="no-referrer"
                  />
                );
              }
              return (
                <div className="mx-auto w-14 h-14 border-2 border-indigo-600 bg-indigo-50 rounded-full flex items-center justify-center font-bold text-indigo-700 text-base mb-2">
                  {logo}
                </div>
              );
            })()}

            <h1 className="font-extrabold text-sm uppercase tracking-widest text-slate-900">República de Angola</h1>
            <h2 className="font-bold text-xs uppercase text-slate-650">Ministério da Educação</h2>
            <h3 className="font-black text-lg uppercase text-indigo-950">{schoolSettings.schoolName || 'COMPLEXO ESCOLAR Nº 1709 LNO, WATCHI-MONA'}</h3>

            <div className="pt-2">
              <span className="text-[10px] font-black tracking-widest uppercase text-white bg-slate-900 px-8 py-2 rounded-full border border-slate-950">
                PAUTA FINAL DE EXAME - 12ª CLASSE - {currentSpecialty.nome.toUpperCase()} - {schoolSettings.academicYear || '2025/2026'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-6 text-[11px] font-bold text-slate-700 uppercase border-y border-slate-100 py-3 mt-4 text-left md:text-center px-4">
              <div>CLASSE: <span className="text-slate-950 font-black">12ª</span></div>
              <div>TURMA: <span className="text-indigo-700 font-black">{turma}</span></div>
              <div>PERÍODO: <span className="text-indigo-700 font-black">{periodo}</span></div>
              <div>SALA Nº: <span className="text-slate-950 font-black">_____</span></div>
              <div className="text-left md:text-center">ESPECIALIDADE: <span className="text-indigo-700 font-black">{currentSpecialty.nome}</span></div>
              <div className="text-right">PAUTA Nº: <span className="text-slate-950 font-black">{pautaNo}</span></div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-b border-slate-300 text-left text-xs min-w-[1200px]" id="matrix-pauta-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 text-slate-900 text-center font-bold">
                  <th className="border-r border-slate-300 p-2.5 text-slate-800 text-[10px]" rowSpan={2} style={{ width: '5ch', minWidth: '5ch' }}>Nº</th>
                  <th className="border-r border-slate-300 p-2.5 text-slate-800 text-left text-[10px] truncate max-w-[200px]" rowSpan={2} style={{ width: '30ch', minWidth: '30ch', maxWidth: '30ch' }}>Nome Completo</th>
                  
                  {currentDisciplines12.map(d => (
                    <th key={d.id} className="border-r border-slate-300 p-2 bg-slate-100/80 text-[9px] uppercase tracking-wider min-w-[75px]" colSpan={3}>
                      {d.name}
                    </th>
                  ))}
                  
                  <th className="p-2 text-slate-800 text-[10px] w-24 max-w-[96px] truncate" rowSpan={2} style={{ width: '96px', minWidth: '96px', maxWidth: '96px' }}>OBSERVAÇÃO</th>
                  <th className="p-2 w-12 noprint" rowSpan={2}></th>
                </tr>

                <tr className="bg-slate-50/50 text-[8px] font-black text-slate-500 uppercase tracking-wider text-center border-b border-slate-300">
                  {currentDisciplines12.map(d => (
                    <React.Fragment key={`sub-${d.id}`}>
                      <th className="border-r border-slate-300 py-1.5 px-[6px] bg-slate-50 w-12 text-center" title="Média de Frequência do Aluno" style={{ fontSize: '70%' }}>MFD</th>
                      <th className="border-r border-slate-300 py-1.5 px-[6px] bg-slate-50 w-12 text-center" title="Nota de Exame de Escola" style={{ fontSize: '70%' }}>NE</th>
                      <th className="border-r border-slate-300 py-1.5 px-[6px] bg-indigo-50/50 text-indigo-900 font-bold w-12 text-center" style={{ fontSize: '70%' }}>MF</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {calculatedData12.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors text-center text-slate-900 font-medium">
                    <td className="border-r border-slate-300 p-2.5 font-bold text-[11px] text-slate-500">
                      {index + 1}
                    </td>

                    <td className="border-r border-slate-300 p-2.5 text-left font-bold text-slate-950 text-[11px] truncate max-w-[200px]">
                      <span className="flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full ${row.gender === 'F' ? 'bg-pink-400' : 'bg-sky-400'}`}></span>
                        <span className="truncate">{formatarNomePauta(row.name)}</span>
                      </span>
                    </td>

                    {currentDisciplines12.map(d => {
                      const resultObj = row.disciplineResults[d.id] || { mfd: 10, ne: 10, mf: 10 };
                      return (
                        <React.Fragment key={`cell-${row.id}-${d.id}`}>
                          <td className="border-r border-slate-200 py-1 px-[6px] bg-white w-12 text-center">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="20"
                              value={resultObj.mfd}
                              onChange={(e) => handleCellChange12(row.id, d.id, 'mfd', e.target.value)}
                              className="w-full text-center bg-transparent border-none font-bold text-[11px] text-slate-800 focus:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded p-0.5"
                            />
                          </td>

                          <td className="border-r border-slate-200 py-1 px-[6px] bg-white w-12 text-center">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="20"
                              value={resultObj.ne}
                              onChange={(e) => handleCellChange12(row.id, d.id, 'ne', e.target.value)}
                              className="w-full text-center bg-transparent border-none font-bold text-[11px] text-slate-800 focus:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded p-0.5"
                            />
                          </td>

                          <td className={`border-r border-slate-300 py-1 px-[6px] text-center font-extrabold text-[11px] w-12 bg-indigo-50/10 ${
                            resultObj.mf < 10 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-900 bg-indigo-50/10'
                          }`}>
                            {Math.round(resultObj.mf)}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    <td className="p-1 text-center border-l border-slate-300 w-24 max-w-[96px] truncate" style={{ width: '96px', minWidth: '96px', maxWidth: '96px' }}>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border truncate ${
                        ['Apto', 'Transita'].includes(row.status)
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {['Apto', 'Transita'].includes(row.status) ? (
                          <>
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{row.status.toUpperCase()}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                            <span className="truncate">{row.status.toUpperCase()}</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="p-2 text-center noprint">
                      <button
                        onClick={() => handleDeleteStudent(row.id, row.name)}
                        className="text-slate-300 hover:text-rose-600 hover:bg-rose-50/80 p-1 rounded-md transition-colors cursor-pointer"
                        title="Excluir Aluno"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {calculatedData12.length === 0 && (
                  <tr>
                    <td colSpan={2 + currentDisciplines12.length * 3 + 2} className="p-12 text-center text-slate-400 font-bold italic bg-slate-50">
                      Não existem alunos matriculados nesta turma da 12ª classe. Adicione no painel superior.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-8 bg-slate-50/50 border-t border-slate-200 flex flex-col lg:flex-row gap-8 justify-between items-start">
            <div className="w-full lg:w-80 space-y-2.5">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                Informação Estatística
              </h4>
              <div className="overflow-hidden border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs bg-white">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold text-[10px] border-b border-slate-200">
                      <th className="p-2 border-r border-slate-200">Gênero</th>
                      <th className="p-2 text-center border-r border-slate-200">Total</th>
                      <th className="p-2 text-center border-r border-slate-200 text-emerald-800 bg-emerald-50/50">Aptos</th>
                      <th className="p-2 text-center text-rose-850 bg-rose-50/50">N/Aptos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px] font-bold">
                    <tr>
                      <td className="p-2 font-sans text-slate-650 border-r border-slate-200">Masculino</td>
                      <td className="p-2 text-center border-r border-slate-200">{stats12.masculino.total}</td>
                      <td className="p-2 text-center border-r border-slate-200 text-emerald-700">{stats12.masculino.aptos}</td>
                      <td className="p-2 text-center text-rose-600">{stats12.masculino.nAptos}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-sans text-slate-650 border-r border-slate-200">Feminino</td>
                      <td className="p-2 text-center border-r border-slate-200">{stats12.feminino.total}</td>
                      <td className="p-2 text-center border-r border-slate-200 text-emerald-700">{stats12.feminino.aptos}</td>
                      <td className="p-2 text-center text-rose-600">{stats12.feminino.nAptos}</td>
                    </tr>
                    <tr className="bg-slate-50 font-black border-t border-slate-200">
                      <td className="p-2 font-sans text-slate-800 border-r border-slate-200">Total</td>
                      <td className="p-2 text-center border-r border-slate-200 text-slate-900">{stats12.total.total}</td>
                      <td className="p-2 text-center border-r border-slate-200 text-emerald-800">{stats12.total.aptos}</td>
                      <td className="p-2 text-center text-rose-800">{stats12.total.nAptos}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="w-full lg:grow space-y-4 pt-2">
              <div className="text-left font-bold text-slate-800 text-xs">
                {schoolSettings.municipality || 'Cafunfo'}, aos {new Date().getDate()} de {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][new Date().getMonth()]} de {new Date().getFullYear()}.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-6 font-sans">
                  <p className="text-[10px] uppercase text-slate-500 font-extrabold tracking-wider">O Conselho de Notas</p>
                  <div className="border-t border-slate-950 pt-2.5 max-w-[200px] mx-auto space-y-1">
                    <p className="text-[10px] font-black text-slate-400 italic">Assinatura Colectiva</p>
                    <p className="text-[10px] text-slate-400 font-mono">________/__________/__________</p>
                  </div>
                </div>

                <div className="text-center space-y-6 font-sans">
                  <p className="text-[10px] uppercase text-slate-500 font-extrabold tracking-wider">{schoolSettings.subdirectorRoleLabel || 'O Subdirector Pedagógico'}</p>
                  <div className="border-t border-slate-950 pt-2.5 max-w-[200px] mx-auto space-y-1">
                    <p className="text-[11px] font-black text-slate-950">{schoolSettings.subdirectorName || 'Dr. Subdirector Pedagógico'}</p>
                    <p className="text-[10px] text-slate-400 font-mono">________/__________/__________</p>
                  </div>
                </div>

                <div className="text-center space-y-6 font-sans">
                  <p className="text-[10px] uppercase text-slate-500 font-extrabold tracking-wider">{schoolSettings.directorRoleLabel || 'O Director da Escola'}</p>
                  <div className="border-t border-slate-950 pt-2.5 max-w-[200px] mx-auto space-y-1">
                    <p className="text-[11px] font-black text-slate-950">{schoolSettings.directorName || 'Dr. Director Geral'}</p>
                    <p className="text-[10px] text-slate-400 font-mono">________/__________/__________</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // 13ª CLASSE VERTICAL MATRIX (Estágio Pedagógico)
        // Designed EXACTLY to match the user's PDF screenshot!
        <div className="bg-white border border-slate-250 shadow-xl rounded-2xl overflow-hidden max-w-5xl mx-auto" id="pauta-13-sheet-print">
          <div className="p-8 sm:p-10 border-b border-slate-200 space-y-3 text-center">
            {(() => {
              const logo = schoolSettings.logoType === 'PUBLIC' ? schoolSettings.publicLogoUrl || '🇦🇴' : schoolSettings.privateLogoUrl || '🎓';
              if (logo.startsWith('data:') || logo.startsWith('http')) {
                return (
                  <img
                    src={logo}
                    alt="Escola Logo"
                    className="mx-auto w-14 h-14 rounded-full object-cover border-2 border-indigo-600 mb-2 shadow-px"
                    referrerPolicy="no-referrer"
                  />
                );
              }
              return (
                <div className="mx-auto w-14 h-14 border-2 border-indigo-600 bg-indigo-50 rounded-full flex items-center justify-center font-bold text-indigo-700 text-base mb-2">
                  {logo}
                </div>
              );
            })()}

            <h1 className="font-extrabold text-xs uppercase tracking-widest text-slate-950">República de Angola</h1>
            <h2 className="font-bold text-[10px] uppercase text-slate-600">Ministério da Educação</h2>
            <h3 className="font-black text-base uppercase text-indigo-950">{schoolSettings.schoolName || 'COMPLEXO ESCOLAR Nº 1709 LNO, WATCHI-MONA'}</h3>

            <div className="pt-2">
              <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase">PAUTA FINAL DO CURSO PEDAGOGICO</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-6 text-[11px] font-bold text-slate-700 uppercase border-y border-slate-100 py-2.5 mt-4 text-left">
              <div>Especialidade: <span className="text-indigo-900 font-black">{currentSpecialty.nome}</span></div>
              <div>Turma: <span className="text-indigo-900 font-black">{turma}</span></div>
              <div>Sala Nº: <span className="text-slate-950 font-black">_____</span></div>
              <div>Ano Lectivo: <span className="text-indigo-900 font-black">{schoolSettings.academicYear || '2025/2026'}</span></div>
              <div className="text-right">
                <div>Classe: <span className="text-slate-950 font-black">13ª</span></div>
                <div className="text-[10px] text-indigo-800 font-extrabold normal-case tracking-normal">Cód. Pauta: {gerarCodigoPauta(schoolSettings.academicYear || '2025/2026', '13')}</div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-b border-slate-300 text-left text-xs min-w-[700px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-900 text-center font-bold">
                  <th className="border-r border-slate-300 p-2" rowSpan={2} style={{ width: '5ch', minWidth: '5ch' }}>Nº</th>
                  <th className="border-r border-slate-300 p-2 text-left truncate max-w-[200px]" rowSpan={2} style={{ width: '30ch', minWidth: '30ch', maxWidth: '30ch' }}>Nome Completo</th>
                  <th className="border-r border-slate-300 p-1.5" colSpan={3}>Médias por Classe</th>
                  <th className="border-r border-slate-300 py-2 px-[6px]" rowSpan={2} style={{ width: '10ch', minWidth: '10ch', fontSize: '70%' }}>MA</th>
                  <th className="border-r border-slate-300 py-2 px-[6px]" rowSpan={2} style={{ width: '10ch', minWidth: '10ch', fontSize: '70%' }}>PAP</th>
                  <th className="border-r border-slate-300 py-2 px-[6px]" rowSpan={2} style={{ width: '10ch', minWidth: '10ch', fontSize: '70%' }}>NEC</th>
                  <th className="border-r border-slate-300 py-2 px-[6px]" rowSpan={2} style={{ width: '10ch', minWidth: '10ch', fontSize: '70%' }}>MF</th>
                  <th className="p-2 w-24 max-w-[96px] truncate" rowSpan={2} style={{ width: '96px', minWidth: '96px', maxWidth: '96px' }}>Observação</th>
                  <th className="p-2 w-10 noprint" rowSpan={2}></th>
                </tr>
                <tr className="bg-slate-50 text-[9px] font-bold text-slate-650 text-center border-b border-slate-300">
                  <th className="border-r border-slate-300 py-1 px-[6px] bg-slate-50" style={{ width: '10ch', minWidth: '10ch', fontSize: '70%' }}>10ª</th>
                  <th className="border-r border-slate-300 py-1 px-[6px] bg-slate-50" style={{ width: '10ch', minWidth: '10ch', fontSize: '70%' }}>11ª</th>
                  <th className="border-r border-slate-300 py-1 px-[6px] bg-slate-50" style={{ width: '10ch', minWidth: '10ch', fontSize: '70%' }}>13</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {calculatedData13.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 text-center font-medium">
                    <td className="border-r border-slate-300 p-2 font-bold text-slate-500" style={{ width: '5ch', minWidth: '5ch' }}>{idx + 1}</td>
                    <td className="border-r border-slate-300 p-2 text-left font-bold text-slate-950 truncate max-w-[200px]" style={{ width: '30ch', minWidth: '30ch', maxWidth: '30ch' }}>
                      <span className="flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full ${row.gender === 'F' ? 'bg-pink-400' : 'bg-sky-400'}`}></span>
                        <span className="truncate">{formatarNomePauta(row.name)}</span>
                      </span>
                    </td>
                    {/* 10ª */}
                    <td className="border-r border-slate-200 py-1 px-[6px] bg-white" style={{ width: '10ch', minWidth: '10ch' }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        value={row.m10}
                        onChange={(e) => handleCellChange13(row.id, 'm10', e.target.value)}
                        className="w-full text-center bg-transparent border-none font-bold focus:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded p-0.5"
                      />
                    </td>
                    {/* 11ª */}
                    <td className="border-r border-slate-200 py-1 px-[6px] bg-white" style={{ width: '10ch', minWidth: '10ch' }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        value={row.m11}
                        onChange={(e) => handleCellChange13(row.id, 'm11', e.target.value)}
                        className="w-full text-center bg-transparent border-none font-bold focus:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded p-0.5"
                      />
                    </td>
                    {/* 12ª */}
                    <td className="border-r border-slate-300 py-1 px-[6px] bg-white" style={{ width: '10ch', minWidth: '10ch' }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        value={row.m12}
                        onChange={(e) => handleCellChange13(row.id, 'm12', e.target.value)}
                        className="w-full text-center bg-transparent border-none font-bold focus:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded p-0.5"
                      />
                    </td>
                    {/* MA calculated */}
                    <td className="border-r border-slate-300 py-1 px-[6px] font-bold bg-slate-50/55" style={{ width: '10ch', minWidth: '10ch' }}>{row.ma.toFixed(1)}</td>
                    {/* PAP */}
                    <td className="border-r border-slate-250 py-1 px-[6px] bg-white" style={{ width: '10ch', minWidth: '10ch' }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        value={row.pap}
                        onChange={(e) => handleCellChange13(row.id, 'pap', e.target.value)}
                        className="w-full text-center bg-transparent border-none font-bold focus:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded p-0.5 text-indigo-700"
                      />
                    </td>
                    {/* NEC */}
                    <td className="border-r border-slate-300 py-1 px-[6px] bg-white" style={{ width: '10ch', minWidth: '10ch' }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        value={row.nec}
                        onChange={(e) => handleCellChange13(row.id, 'nec', e.target.value)}
                        className="w-full text-center bg-transparent border-none font-bold focus:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded p-0.5 text-indigo-700"
                      />
                    </td>
                    {/* MF calculated */}
                    <td className="border-r border-slate-300 py-1 px-[6px] font-black bg-indigo-50/30 text-slate-900" style={{ width: '10ch', minWidth: '10ch' }}>{Math.round(row.mf)}</td>
                    {/* Status */}
                    <td className="p-1 border-r border-slate-300 text-center w-24 max-w-[96px] truncate" style={{ width: '96px', minWidth: '96px', maxWidth: '96px' }}>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-full text-[9px] font-extrabold uppercase border truncate ${
                        row.status === 'Apto' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        <span className="truncate">{row.status === 'Apto' ? 'APTO' : 'N/APTO'}</span>
                      </span>
                    </td>
                    {/* Delete */}
                    <td className="p-2 noprint">
                      <button
                        onClick={() => handleDeleteStudent(row.id, row.name)}
                        className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-8 bg-slate-50/50 border-t border-slate-200 flex flex-col md:flex-row gap-8 justify-between items-start">
            {/* Stats block */}
            <div className="w-full md:w-80">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Informação Estatística</h4>
              <table className="w-full text-left text-xs bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-200 text-slate-700">
                    <th className="p-2 border-r border-slate-200">Gênero</th>
                    <th className="p-2 text-center border-r border-slate-200">Total</th>
                    <th className="p-2 text-center border-r border-slate-200 text-emerald-850 bg-emerald-50/40">Aptos</th>
                    <th className="p-2 text-center text-rose-850 bg-rose-50/40">N/Aptos</th>
                  </tr>
                </thead>
                <tbody className="font-mono font-bold divide-y divide-slate-100">
                  <tr>
                    <td className="p-2 font-sans text-slate-650 border-r border-slate-200">Masculino</td>
                    <td className="p-2 text-center border-r border-slate-200">{stats13.masculino.total}</td>
                    <td className="p-2 text-center border-r border-slate-200 text-emerald-700">{stats13.masculino.aptos}</td>
                    <td className="p-2 text-center text-rose-600">{stats13.masculino.nAptos}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans text-slate-650 border-r border-slate-200">Feminino</td>
                    <td className="p-2 text-center border-r border-slate-200">{stats13.feminino.total}</td>
                    <td className="p-2 text-center border-r border-slate-200 text-emerald-700">{stats13.feminino.aptos}</td>
                    <td className="p-2 text-center text-rose-600">{stats13.feminino.nAptos}</td>
                  </tr>
                  <tr className="bg-slate-50 font-black border-t border-slate-200">
                    <td className="p-2 font-sans text-slate-800 border-r border-slate-200">Total</td>
                    <td className="p-2 text-center border-r border-slate-200 text-slate-900">{stats13.total.total}</td>
                    <td className="p-2 text-center border-r border-slate-200 text-emerald-800">{stats13.total.aptos}</td>
                    <td className="p-2 text-center text-rose-800">{stats13.total.nAptos}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures block */}
            <div className="w-full md:grow space-y-4 pt-4">
              <div className="text-left font-bold text-slate-800 text-xs">
                {schoolSettings.municipality || 'Cafunfo'}, aos {new Date().getDate()} de {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][new Date().getMonth()]} de {new Date().getFullYear()}.
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center space-y-6">
                  <p className="text-[10px] uppercase text-slate-400 font-extrabold">O Coordenador de Especialidade</p>
                  <div className="border-t border-slate-950 pt-2 space-y-1">
                    <p className="font-black text-slate-400 text-[10px] italic">Assinatura</p>
                    <p className="text-[10px] text-slate-400 font-mono">________/__________/__________</p>
                  </div>
                </div>
                <div className="text-center space-y-6">
                  <p className="text-[10px] uppercase text-slate-400 font-extrabold">{schoolSettings.subdirectorRoleLabel || 'O Subdirector Pedagógico'}</p>
                  <div className="border-t border-slate-950 pt-2 space-y-1">
                    <p className="font-black text-slate-950 text-[11px]">{schoolSettings.subdirectorName || 'Dr. Subdirector Pedagógico'}</p>
                    <p className="text-[10px] text-slate-400 font-mono">________/__________/__________</p>
                  </div>
                </div>
                <div className="text-center space-y-6">
                  <p className="text-[10px] uppercase text-slate-400 font-extrabold">{schoolSettings.directorRoleLabel || 'O director da Escola'}</p>
                  <div className="border-t border-slate-950 pt-2 space-y-1">
                    <p className="font-black text-slate-950 text-[11px]">{schoolSettings.directorName || 'Dr. Director Geral'}</p>
                    <p className="text-[10px] text-slate-400 font-mono">________/__________/__________</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
