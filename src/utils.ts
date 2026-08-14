/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, GradeRow, Staff } from './types';

/**
 * Generates a student ID following the format:
 * Initials of first and last name + Classe (number) + Turma (letter) + 2 random digits
 * Example: Abel Neto, 7ª Classe, Turma B -> AN7B85
 */
export function generateStudentId(name: string, className: string, sectionName: string, existingIds: string[] = []): string {
  const cleanName = name.trim().toUpperCase().replace(/\s+/g, ' ');
  const parts = cleanName.split(' ');
  let initials = 'AL';
  if (parts.length >= 2) {
    const firstInitial = parts[0].charAt(0);
    const lastInitial = parts[parts.length - 1].charAt(0);
    initials = `${firstInitial}${lastInitial}`;
  } else if (parts.length === 1 && parts[0].length > 0) {
    initials = `${parts[0].charAt(0)}${parts[0].charAt(0)}`;
  }

  const classNum = className.replace(/\D/g, '') || className;
  const sectionLetter = sectionName.toUpperCase();

  let candidate = '';
  let attempts = 0;
  while (attempts < 100) {
    const randDigits = Math.floor(10 + Math.random() * 90); // 2 random digits
    candidate = `${initials}${classNum}${sectionLetter}${randDigits}`;
    if (!existingIds.includes(candidate)) {
      return candidate;
    }
    attempts++;
  }
  return candidate;
}

/**
 * Generates a staff ID following the format:
 * Initials of first and last name + 1 random digit + Function initials + 2 random digits
 * Example: Francisco Gaspar, Director Geral -> FG2DG34
 */
export function generateStaffId(name: string, role: string, existingIds: string[] = []): string {
  const cleanName = name.trim().toUpperCase().replace(/\s+/g, ' ');
  const parts = cleanName.split(' ');
  let initials = 'AL';
  if (parts.length >= 2) {
    const firstInitial = parts[0].charAt(0);
    const lastInitial = parts[parts.length - 1].charAt(0);
    initials = `${firstInitial}${lastInitial}`;
  } else if (parts.length === 1 && parts[0].length > 0) {
    initials = `${parts[0].charAt(0)}${parts[0].charAt(0)}`;
  }

  const roleCodes: Record<string, string> = {
    DIRECTOR_GERAL: 'DG',
    SUB_DIRECTOR_PEDAGOGICO: 'SP',
    SUB_DIRECTOR_ADMINISTRATIVO: 'SA',
    CHEFE_SECRETARIA: 'SC',
    PROFESSOR: 'PR',
    COORDENADOR_TURNO: 'CT',
    COORDENADOR_DISCIPLINA: 'CD',
    COORDENADOR_PRATICAS_PEDAGOGICAS: 'CP',
    AUXILIAR_LIMPEZA: 'AL',
    SEGURANCA: 'SE',
    TECNICO_PEDAGOGICO: 'TP',
    TECNICO_ADMINISTRATIVO: 'TA'
  };

  const roleCode = roleCodes[role] || 'RH';

  let candidate = '';
  let attempts = 0;
  while (attempts < 100) {
    const randDigit1 = Math.floor(Math.random() * 10); // 1 random digit
    const randDigits2 = Math.floor(10 + Math.random() * 90); // 2 random digits
    candidate = `${initials}${randDigit1}${roleCode}${randDigits2}`;
    if (!existingIds.includes(candidate)) {
      return candidate;
    }
    attempts++;
  }
  return candidate;
}

/**
 * Sanitiza a lista de funcionários garantindo que cargos de chefia únicos
 * (DIRECTOR_GERAL, SUB_DIRECTOR_PEDAGOGICO, SUB_DIRECTOR_ADMINISTRATIVO, CHEFE_SECRETARIA)
 * existam apenas uma vez no sistema, eliminando duplicidades indesejadas.
 */
export function sanitizeStaffList(staffList: Staff[]): Staff[] {
  console.log('[DEBUG sanitizeStaffList] Entrada de dados:', {
    total: staffList?.length || 0,
    professores: (staffList || []).filter(s => s.role === 'PROFESSOR').map(p => ({
      id: p.id,
      name: p.name,
      subjectsCount: p.subjects?.length || 0,
      assignmentsCount: p.assignments?.length || 0,
      subjects: p.subjects,
      assignments: p.assignments
    }))
  });

  if (!Array.isArray(staffList)) return [];

  const exclusiveRoles = [
    'DIRECTOR_GERAL',
    'SUB_DIRECTOR_PEDAGOGICO',
    'SUB_DIRECTOR_ADMINISTRATIVO',
    'CHEFE_SECRETARIA'
  ];

  const assignedRoles = new Set<string>();

  const sanitized = staffList.map(staff => {
    let result = { ...staff };

    if (exclusiveRoles.includes(result.role)) {
      if (assignedRoles.has(result.role)) {
        // Cargo duplicado detectado! Converter duplicado para função técnica não-directiva
        result.role = 'TECNICO_ADMINISTRATIVO';
      } else {
        assignedRoles.add(result.role);
      }
    }

    // Garantir que dados de disciplinas de professores e coordenadores docentes nunca sumam
    if (result.role === 'PROFESSOR' || result.role?.includes('COORDENADOR') || (result.assignments && result.assignments.length > 0) || (result.subjects && result.subjects.length > 0)) {
      const hasAssignments = result.assignments && result.assignments.length > 0;
      const hasSubjects = result.subjects && result.subjects.length > 0;

      if (hasAssignments) {
        const assignmentSubjects = result.assignments!.map(a => a.subject) as any[];
        result.subjects = Array.from(new Set([...(result.subjects || []), ...assignmentSubjects]));
        
        const assignmentClasses = result.assignments!.map(a => a.class);
        result.classes = Array.from(new Set([...(result.classes || []), ...assignmentClasses]));

        const assignmentSections = result.assignments!.map(a => a.section);
        result.sections = Array.from(new Set([...(result.sections || []), ...assignmentSections]));
      }

      // Se possui disciplinas/turmas mas não possui assignments estruturados, reconstruir
      if ((!result.assignments || result.assignments.length === 0) && hasSubjects && result.classes && result.classes.length > 0 && result.sections && result.sections.length > 0) {
        const rebuilt: any[] = [];
        result.classes.forEach(c => {
          result.sections!.forEach(sec => {
            result.subjects!.forEach(sub => {
              rebuilt.push({ class: c, section: sec, subject: sub, specialty: result.specialty });
            });
          });
        });
        result.assignments = rebuilt;
      }
    }

    return result;
  });

  console.log('[DEBUG sanitizeStaffList] Saída higienizada:', {
    total: sanitized.length,
    professores: sanitized.filter(s => s.role === 'PROFESSOR').map(p => ({
      id: p.id,
      name: p.name,
      subjects: p.subjects,
      assignmentsCount: p.assignments?.length || 0
    }))
  });

  return sanitized;
}

/**
 * Checks if a given student matches the Professor's teaching assignments.
 * General staff see everything.
 */
export function isStudentVisibleForProfessor(
  student: Student,
  loggedInStaff: Staff | null,
  subject?: string
): boolean {
  if (!loggedInStaff) return true; // not logged in or admin
  if (loggedInStaff.role !== 'PROFESSOR') return true; // non-professors see all
  
  // If specific assignments tuple array exists, check exact tuple match
  if (loggedInStaff.assignments && loggedInStaff.assignments.length > 0) {
    return loggedInStaff.assignments.some(a => {
      const matchClass = a.class === student.class;
      const matchSection = a.section === student.section;
      const matchSubject = subject ? a.subject === subject : true;
      return matchClass && matchSection && matchSubject;
    });
  }

  const assignedClasses = loggedInStaff.classes || [];
  const assignedSections = loggedInStaff.sections || [];
  const assignedSubjects = loggedInStaff.subjects || [];
  
  const matchesClass = assignedClasses.length === 0 || assignedClasses.includes(student.class);
  const matchesSection = assignedSections.length === 0 || assignedSections.includes(student.section);
  const matchesSubject = !subject || assignedSubjects.length === 0 || assignedSubjects.includes(subject as any);
  
  return matchesClass && matchesSection && matchesSubject;
}

/**
 * Returns the list of classes allowed for a Professor based on their assigned ID.
 */
export function getProfessorAllowedClasses(loggedInStaff: Staff | null, defaultClasses: string[]): string[] {
  if (!loggedInStaff || loggedInStaff.role !== 'PROFESSOR') return defaultClasses;
  if (loggedInStaff.assignments && loggedInStaff.assignments.length > 0) {
    const fromAss = Array.from(new Set(loggedInStaff.assignments.map(a => a.class)));
    if (fromAss.length > 0) return fromAss;
  }
  if (loggedInStaff.classes && loggedInStaff.classes.length > 0) {
    return loggedInStaff.classes;
  }
  return defaultClasses;
}

/**
 * Returns the list of sections allowed for a Professor for a specific class.
 */
export function getProfessorAllowedSections(loggedInStaff: Staff | null, currentClass: string, defaultSections: string[]): string[] {
  if (!loggedInStaff || loggedInStaff.role !== 'PROFESSOR') return defaultSections;
  if (loggedInStaff.assignments && loggedInStaff.assignments.length > 0) {
    const fromAss = Array.from(new Set(loggedInStaff.assignments.filter(a => a.class === currentClass).map(a => a.section)));
    if (fromAss.length > 0) return fromAss;
  }
  if (loggedInStaff.sections && loggedInStaff.sections.length > 0) {
    return loggedInStaff.sections;
  }
  return defaultSections;
}

/**
 * Returns the list of subjects allowed for a Professor for a specific class and section.
 */
export function getProfessorAllowedSubjects(loggedInStaff: Staff | null, currentClass: string, currentSection: string, defaultSubjects: string[]): string[] {
  if (!loggedInStaff || loggedInStaff.role !== 'PROFESSOR') return defaultSubjects;
  if (loggedInStaff.assignments && loggedInStaff.assignments.length > 0) {
    const fromAss = Array.from(new Set(loggedInStaff.assignments.filter(a => a.class === currentClass && a.section === currentSection).map(a => a.subject)));
    if (fromAss.length > 0) return fromAss;
  }
  if (loggedInStaff.subjects && loggedInStaff.subjects.length > 0) {
    return loggedInStaff.subjects;
  }
  return defaultSubjects;
}

/**
 * Checks if a grade row can be modified by the logged-in staff
 */
export function canModifyGrade(
  studentClass: string,
  studentSection: string,
  subject: string,
  loggedInStaff: Staff | null
): boolean {
  if (!loggedInStaff) return false;
  
  // Directors and Administrators (Secretaries) have write access
  if (
    loggedInStaff.role === 'DIRECTOR_GERAL' ||
    loggedInStaff.role === 'SUB_DIRECTOR_PEDAGOGICO' ||
    loggedInStaff.role === 'SUB_DIRECTOR_ADMINISTRATIVO' ||
    loggedInStaff.role === 'CHEFE_SECRETARIA' ||
    loggedInStaff.role === 'TECNICO_PEDAGOGICO' ||
    loggedInStaff.role === 'TECNICO_ADMINISTRATIVO'
  ) {
    return true;
  }

  // Professor writes only to their classes, sections, and subjects
  if (loggedInStaff.role === 'PROFESSOR') {
    const classes = loggedInStaff.classes || [];
    const sections = loggedInStaff.sections || [];
    const subjects = loggedInStaff.subjects || [];
    
    return (
      classes.includes(studentClass) &&
      sections.includes(studentSection) &&
      subjects.includes(subject as any)
    );
  }

  return false;
}

/**
 * Matriz de Cargos e Permissões do SIGEP (Role-Based Access Control)
 * Segue estritamente a especificação académica v1.1.0.
 */
export const ROLES_MATRIX: Record<string, { access: string[]; chat: 'native' | 'conditional'; canInvite: boolean }> = {
  DIRECTOR_GERAL: { access: ['all', 'pautas', 'horarios', 'financeiro', 'rh', 'secretaria'], chat: 'native', canInvite: true },
  SUB_DIRECTOR_PEDAGOGICO: { access: ['pautas', 'horarios', 'secretaria'], chat: 'native', canInvite: true },
  SUB_DIRECTOR_ADMINISTRATIVO: { access: ['financeiro', 'rh'], chat: 'native', canInvite: true },
  CHEFE_SECRETARIA: { access: ['secretaria'], chat: 'conditional', canInvite: false },
  PROFESSOR: { access: ['pautas'], chat: 'conditional', canInvite: false },
  COORDENADOR_TURNO: { access: ['pautas'], chat: 'conditional', canInvite: false },
  COORDENADOR_DISCIPLINA: { access: ['pautas'], chat: 'conditional', canInvite: false },
  COORDENADOR_PRATICAS_PEDAGOGICAS: { access: ['pautas'], chat: 'conditional', canInvite: false },
  TECNICO_PEDAGOGICO: { access: ['pautas'], chat: 'conditional', canInvite: false },
  TECNICO_ADMINISTRATIVO: { access: ['financeiro', 'rh'], chat: 'conditional', canInvite: false }
};

/**
 * Middleware utility to check RBAC permissions on operations.
 * Prevents unauthorized writes or page updates.
 */
export function checkPermission(userRole: string, requiredAction: string): { status: number; error?: string } {
  const roleConfig = ROLES_MATRIX[userRole];
  if (!roleConfig) {
    return { status: 403, error: 'Acesso Negado: Perfil ou cargo não identificado no SIGEP.' };
  }

  if (roleConfig.access.includes('all')) {
    return { status: 200 };
  }

  if (roleConfig.access.includes(requiredAction)) {
    return { status: 200 };
  }

  return { status: 403, error: `Acesso Negado: Privilégios insuficientes para a ação "${requiredAction}".` };
}

/**
 * Retorna as 4 turmas oficiais (A, B, C, D) formatadas de acordo com o subsistema/modalidade e especialidade selecionados.
 * Garante limitação estrita e nomenclatura dinâmica em todo o sistema.
 */
export function getSectionsList(modality: string, specialty?: string): string[] {
  if (modality === 'ENSINO_PRIMARIO') {
    return ['A', 'B', 'C', 'D'];
  }
  
  const defaultSpec = modality === 'MAGISTERIO' ? 'MF' : 'CFB';
  const spec = (specialty || defaultSpec).toUpperCase();
  let prefix = '';
  if (modality === 'PUNIV') {
    if (spec === 'CFB') prefix = 'FB';
    else if (spec === 'CEJ') prefix = 'EJ';
    else if (spec === 'CS' || spec === 'CSH' || spec.includes('SOCIAIS')) prefix = 'CS';
    else if (spec === 'AV' || spec.includes('VISUAIS') || spec === 'L') prefix = 'L';
    else prefix = spec;
  } else if (modality === 'MAGISTERIO') {
    if (spec === 'MF' || spec.includes('MATEMÁTICA E FÍSICA') || spec.includes('MATEMATICA')) prefix = 'MF';
    else if (spec === 'GH' || spec === 'HG' || spec.includes('HISTÓRIA E GEOGRAFIA') || spec.includes('GEOGRAFIA')) prefix = 'HG';
    else if (spec === 'BQ' || spec.includes('BIOLOGIA E QUÍMICA') || spec.includes('BIOLOGIA')) prefix = 'BQ';
    else if (spec === 'LEMC' || spec === 'L.EMC' || spec.includes('PORTUGUÊS') || spec.includes('PORTUGUES')) prefix = 'L.EMC';
    else if (spec === 'EP' || spec.includes('PRIMÁRIO') || spec.includes('PRIMARIO')) prefix = 'EP';
    else if (spec === 'PE' || spec.includes('PRÉ-ESCOLAR') || spec.includes('PRE-ESCOLAR') || spec === 'PRE') prefix = 'PRE';
    else if (spec === 'ING_EMC' || spec.includes('INGLÊS') || spec.includes('INGLES') || spec === 'ING') prefix = 'ING';
    else if (spec === 'FRA_EMC' || spec.includes('FRANCÊS') || spec.includes('FRANCES') || spec === 'FRA') prefix = 'FRA';
    else if (spec === 'EVP' || spec.includes('VISUAL E PLÁSTICA') || spec.includes('PLASTICA')) prefix = 'EVP';
    else if (spec === 'EDF' || spec.includes('FÍSICA') || spec.includes('FISICA') || spec === 'ED.F' || spec === 'EF') prefix = 'EDF';
    else if (spec === 'EMC' || spec.includes('CÍVICA') || spec.includes('CIVICA')) prefix = 'EMC';
    else prefix = spec;
  } else {
    return ['A', 'B', 'C', 'D'];
  }
  
  return [`${prefix}-A`, `${prefix}-B`, `${prefix}-C`, `${prefix}-D`];
}

/**
 * Retorna a cor exata para a nota com base na classe do aluno (Conformidade MED).
 * - Para Alunos da 1.ª à 6.ª Classe: notas >= 5 em Azul puro (#0000FF), notas < 5 em Vermelho puro (#FF0000).
 * - Para Alunos da 7.ª à 13.ª Classe: notas >= 10 em Azul puro (#0000FF), notas < 10 em Vermelho puro (#FF0000).
 */
export function getGradeColor(value: number | null | undefined, className: string): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  const classNum = parseInt(className.replace(/\D/g, '')) || 1;
  const passScore = classNum >= 7 ? 10 : 5;
  return value >= passScore ? '#0000FF' : '#FF0000';
}

export { gerarCodigoPauta } from './utils/pautaLogic';

