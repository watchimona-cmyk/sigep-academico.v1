import React, { createContext, useContext, useMemo } from 'react';
import { useSchoolSettings, AngolanSubsystemType } from './SchoolSettingsContext';
import { Student, GradeRow, ModalityType, GrelhaCurricularItem } from '../types';

/**
 * Interface que define os dados e funções hermeticamente isolados por subsistema.
 * Evita vazamento de memória e interferência cruzada entre os subsistemas de ensino do MED.
 */
interface HermeticDataState {
  /** Subsistema ativo na sessão atual */
  activeSubsystemId: AngolanSubsystemType;
  /** Modalidade oficial associada (ENSINO_PRIMARIO, PUNIV, MAGISTERIO) */
  activeModality: ModalityType;
  /** Alunos filtrados estritamente na raiz para o subsistema ativo (Filtro Dinâmico) */
  filteredStudents: Student[];
  /** Notas filtradas estritamente na raiz para o subsistema ativo (Filtro Dinâmico) */
  filteredGrades: GradeRow[];
  /** Lógica hermética de cálculo de médias */
  calculator: {
    calculateTrimesterAverage: (mac: number | null, npp: number | null, npt: number | null) => number | null;
    calculateFinalAverage: (mt1: number | null, mt2: number | null, mt3: number | null) => number | null;
    validateCurricularProgress: (grades: GradeRow[], studentId: string) => { approved: boolean; reason: string };
  };
}

const HermeticSubsystemContext = createContext<HermeticDataState | undefined>(undefined);

// ==========================================
// 1. MOTORES DE CÁLCULO HERMÉTICOS (SEM VARIÁVEIS GLOBAIS PARTILHADAS)
// ==========================================

const PRIMARIO_CALCULATOR = {
  calculateTrimesterAverage: (mac: number | null, npp: number | null, npt: number | null): number | null => {
    // No ensino primário (1ª à 6ª classe), o NPP geralmente não existe ou é assimilado pelo MAC.
    // Fórmula oficial MED Ensino Primário: MT = (MAC + NPT) / 2
    if (mac === null && npt === null) return null;
    const a = mac ?? 0;
    const b = npt ?? 0;
    const count = (mac !== null ? 1 : 0) + (npt !== null ? 1 : 0);
    return count > 0 ? Math.round((a + b) / count) : null;
  },
  calculateFinalAverage: (mt1: number | null, mt2: number | null, mt3: number | null): number | null => {
    // MF = (MT1 + MT2 + MT3) / 3
    const values = [mt1, mt2, mt3].filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return Math.round(sum / values.length);
  },
  validateCurricularProgress: (grades: GradeRow[], studentId: string) => {
    const studentGrades = grades.filter(g => g.studentId === studentId);
    if (studentGrades.length === 0) return { approved: false, reason: "Sem histórico de notas lançadas" };
    
    // Agrupar e extrair médias finais por disciplina
    const mfs: number[] = [];
    const gradesBySubject: Record<string, GradeRow[]> = {};
    studentGrades.forEach(g => {
      if (!gradesBySubject[g.subject]) gradesBySubject[g.subject] = [];
      gradesBySubject[g.subject].push(g);
    });

    Object.values(gradesBySubject).forEach(subjGrades => {
      const t1 = subjGrades.find(g => g.trimester === 'I')?.mt;
      const t2 = subjGrades.find(g => g.trimester === 'II')?.mt;
      const t3 = subjGrades.find(g => g.trimester === 'III')?.mt;
      const values = [t1, t2, t3].filter((v): v is number => v !== null && v !== undefined);
      if (values.length > 0) {
        mfs.push(Math.round(values.reduce((a, b) => a + b, 0) / values.length));
      }
    });

    if (mfs.length === 0) return { approved: false, reason: "Médias finais não calculadas" };
    
    const mediaGeral = mfs.reduce((a, b) => a + b, 0) / mfs.length;
    return mediaGeral >= 5 
      ? { approved: true, reason: `Aprovado com Média Geral de ${mediaGeral.toFixed(1)}` }
      : { approved: false, reason: `Reprovado por Média Geral insuficiente (${mediaGeral.toFixed(1)})` };
  }
};

const PUNIV_CALCULATOR = {
  calculateTrimesterAverage: (mac: number | null, npp: number | null, npt: number | null): number | null => {
    if (mac === null && npp === null && npt === null) return null;
    const values = [mac, npp, npt].filter((v): v is number => v !== null);
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return values.length > 0 ? Math.round(sum / values.length) : null;
  },
  calculateFinalAverage: (mt1: number | null, mt2: number | null, mt3: number | null): number | null => {
    const values = [mt1, mt2, mt3].filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return Math.round(sum / values.length);
  },
  validateCurricularProgress: (grades: GradeRow[], studentId: string) => {
    const studentGrades = grades.filter(g => g.studentId === studentId);
    if (studentGrades.length === 0) return { approved: false, reason: "Sem histórico de notas" };
    
    // Agrupar e calcular médias finais por disciplina
    const deficiencias: string[] = [];
    const gradesBySubject: Record<string, GradeRow[]> = {};
    studentGrades.forEach(g => {
      if (!gradesBySubject[g.subject]) gradesBySubject[g.subject] = [];
      gradesBySubject[g.subject].push(g);
    });

    Object.entries(gradesBySubject).forEach(([subj, subjGrades]) => {
      const t1 = subjGrades.find(g => g.trimester === 'I')?.mt;
      const t2 = subjGrades.find(g => g.trimester === 'II')?.mt;
      const t3 = subjGrades.find(g => g.trimester === 'III')?.mt;
      const values = [t1, t2, t3].filter((v): v is number => v !== null && v !== undefined);
      if (values.length > 0) {
        const mf = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        if (mf < 10) {
          deficiencias.push(subj);
        }
      }
    });

    if (deficiencias.length > 2) {
      return { approved: false, reason: `Reprovado por excesso de deficiências (${deficiencias.length} disciplinas: ${deficiencias.join(', ')})` };
    }
    return { approved: true, reason: "Aprovado de acordo com o regulamento do Ensino Secundário Geral" };
  }
};

const MAGISTERIO_CALCULATOR = {
  calculateTrimesterAverage: (mac: number | null, npp: number | null, npt: number | null): number | null => {
    const cleanMac = mac ?? 0;
    const cleanNpp = npp ?? 0;
    const cleanNpt = npt ?? 0;
    
    if (mac === null && npp === null && npt === null) return null;
    
    if (npt === null) {
      const vals = [mac, npp].filter((v): v is number => v !== null);
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    }
    
    const dividend = (mac !== null ? 1 : 0) + (npp !== null ? 1 : 0) + 2;
    const score = cleanMac + cleanNpp + (2 * cleanNpt);
    return Math.round(score / dividend);
  },
  calculateFinalAverage: (mt1: number | null, mt2: number | null, mt3: number | null): number | null => {
    const values = [mt1, mt2, mt3].filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return Math.round(sum / values.length);
  },
  validateCurricularProgress: (grades: GradeRow[], studentId: string) => {
    const studentGrades = grades.filter(g => g.studentId === studentId);
    if (studentGrades.length === 0) return { approved: false, reason: "Sem histórico de notas" };
    
    // Agrupar e calcular médias finais por disciplina
    const deficiencias: string[] = [];
    const gradesBySubject: Record<string, GradeRow[]> = {};
    studentGrades.forEach(g => {
      if (!gradesBySubject[g.subject]) gradesBySubject[g.subject] = [];
      gradesBySubject[g.subject].push(g);
    });

    Object.entries(gradesBySubject).forEach(([subj, subjGrades]) => {
      const t1 = subjGrades.find(g => g.trimester === 'I')?.mt;
      const t2 = subjGrades.find(g => g.trimester === 'II')?.mt;
      const t3 = subjGrades.find(g => g.trimester === 'III')?.mt;
      const values = [t1, t2, t3].filter((v): v is number => v !== null && v !== undefined);
      if (values.length > 0) {
        const mf = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        if (mf < 10) {
          deficiencias.push(subj);
        }
      }
    });

    if (deficiencias.length > 1) {
      return { approved: false, reason: `Reprovado por ter mais de 1 deficiência no Magistério (${deficiencias.length} disciplinas: ${deficiencias.join(', ')})` };
    }
    
    return { approved: true, reason: "Aprovado no Subsistema Pedagógico de Formação de Professores" };
  }
};

// ==========================================
// 2. COMPONENTE PROVEDOR DO CONTEXTO HERMÉTICO
// ==========================================

export const HermeticSubsystemProvider: React.FC<{
  children: React.ReactNode;
  allStudents: Student[];
  allGrades: GradeRow[];
}> = ({ children, allStudents, allGrades }) => {
  const { activeSubsystem, subsystemInfo, schoolSettings } = useSchoolSettings();

  const activeModality = useMemo<ModalityType>(() => {
    return subsystemInfo.modalityMap;
  }, [subsystemInfo]);

  // FILTRO DINÂMICO NA RAIZ (Hermetic Data Layer)
  // Se o subsistema estiver inativo, não carregamos nem tentamos processar nada referente a ele.
  const filteredStudents = useMemo(() => {
    const allowedClasses = subsystemInfo.classes;
    // O ecossistema filtra hermeticamente na origem
    return allStudents.filter(student => {
      // Garante que o estudante pertence às classes permitidas pelo subsistema ativo
      return allowedClasses.includes(student.class);
    });
  }, [allStudents, subsystemInfo]);

  const filteredGrades = useMemo(() => {
    const studentIds = new Set(filteredStudents.map(s => s.id));
    // As notas são filtradas estritamente de acordo com os alunos permitidos
    return allGrades.filter(grade => studentIds.has(grade.studentId));
  }, [allGrades, filteredStudents]);

  // MOTOR DE CÁLCULO SELECIONADO NA ORIGEM
  const calculator = useMemo(() => {
    switch (activeSubsystem) {
      case 'PRIMARIO_I_CICLO':
        return PRIMARIO_CALCULATOR;
      case 'SECUNDARIO_GERAL':
        return PUNIV_CALCULATOR;
      case 'SECUNDARIO_PEDAGOGICO':
        return MAGISTERIO_CALCULATOR;
      default:
        return PUNIV_CALCULATOR;
    }
  }, [activeSubsystem]);

  const value = useMemo<HermeticDataState>(() => ({
    activeSubsystemId: activeSubsystem,
    activeModality,
    filteredStudents,
    filteredGrades,
    calculator
  }), [activeSubsystem, activeModality, filteredStudents, filteredGrades, calculator]);

  return (
    <HermeticSubsystemContext.Provider value={value}>
      {children}
    </HermeticSubsystemContext.Provider>
  );
};

// Hook de Acesso Estanque
export const useHermeticSubsystem = (): HermeticDataState => {
  const context = useContext(HermeticSubsystemContext);
  if (!context) {
    throw new Error('useHermeticSubsystem deve ser utilizado dentro de um HermeticSubsystemProvider');
  }
  return context;
};

// ==========================================
// 3. COMPONENTE GUARDIÃO DE SUBSISTEMA (DOM ISOLATOR)
// ==========================================

interface HermeticSubsystemGuardProps {
  /** Subsistema alvo exigido para renderização */
  modality: ModalityType;
  /** Componente alternativo ou placeholder de inatividade */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Componente Guardião de Árvore DOM.
 * Garante que se o subsistema estiver inativo, nenhum componente correspondente
 * é montado, evitando quebras de "undefined", loops de hooks e fugas de memória.
 */
export const HermeticSubsystemGuard: React.FC<HermeticSubsystemGuardProps> = ({
  modality,
  fallback = null,
  children
}) => {
  const { schoolSettings } = useSchoolSettings();

  // Mapeamento estrito de componentes ativos nas configurações da escola
  const isSubsystemActive = useMemo(() => {
    if (!schoolSettings?.activeComponents) return true;
    
    switch (modality) {
      case 'ENSINO_PRIMARIO':
        return schoolSettings.activeComponents.ENSINO_PRIMARIO !== false;
      case 'PUNIV':
        return schoolSettings.activeComponents.PUNIV !== false;
      case 'MAGISTERIO':
        return schoolSettings.activeComponents.MAGISTERIO !== false;
      default:
        return false;
    }
  }, [schoolSettings, modality]);

  if (!isSubsystemActive) {
    // Retorna nulo ou fallback estanque, evitando injeção na árvore de renderização do DOM
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
