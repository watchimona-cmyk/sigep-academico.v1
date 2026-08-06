import { Student, GradeRow, SchoolSettings } from '../types';

export interface ArchiveYearRecord {
  academicYear: string;
  students: Student[];
  grades: GradeRow[];
  timestamp: string;
  schoolSettings?: Partial<SchoolSettings>;
}

export const ARCHIVE_STORAGE_KEY = 'sigep_archive_years_v1';

export function getArchivedYears(currentStudents?: Student[], currentGrades?: GradeRow[]): ArchiveYearRecord[] {
  try {
    const raw = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao carregar anos lectivos arquivados:', e);
  }

  // Se não existir arquivo ainda, gera um registro inicial para 2024/2025 para fins de teste e consulta
  if (currentStudents && currentStudents.length > 0) {
    const seedArchive: ArchiveYearRecord = {
      academicYear: '2024/2025',
      students: currentStudents.map(s => ({ ...s, id: `${s.id}_2024` })),
      grades: (currentGrades || []).map(g => ({ ...g, studentId: `${g.studentId}_2024` })),
      timestamp: '10/07/2025, 14:30:00 (Encerramento do Ano)'
    };
    try {
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify([seedArchive]));
    } catch (e) {
      console.warn('Não foi possível gravar semente de arquivo de anos anteriores', e);
    }
    return [seedArchive];
  }

  return [];
}

export function saveArchivedYear(record: ArchiveYearRecord) {
  const current = getArchivedYears();
  const index = current.findIndex(r => r.academicYear === record.academicYear);
  if (index >= 0) {
    current[index] = record;
  } else {
    current.unshift(record);
  }
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Erro ao guardar ano lectivo arquivado:', e);
  }
}
