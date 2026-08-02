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
 * Checks if a given student matches the Professor's teaching assignments.
 * General staff see everything.
 */
export function isStudentVisibleForProfessor(
  student: Student,
  loggedInStaff: Staff | null
): boolean {
  if (!loggedInStaff) return true; // not logged in or admin
  if (loggedInStaff.role !== 'PROFESSOR') return true; // non-professors see all
  
  const assignedClasses = loggedInStaff.classes || [];
  const assignedSections = loggedInStaff.sections || [];
  
  const matchesClass = assignedClasses.includes(student.class);
  const matchesSection = assignedSections.includes(student.section);
  
  return matchesClass && matchesSection;
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
    else if (spec === 'LEMC' || spec.includes('PORTUGUÊS')) prefix = 'PE';
    else if (spec === 'EP' || spec.includes('PRIMÁRIO') || spec.includes('PRIMARIO')) prefix = 'EP';
    else if (spec === 'PE' || spec.includes('PRÉ-ESCOLAR') || spec === 'PRE') prefix = 'PRE';
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

