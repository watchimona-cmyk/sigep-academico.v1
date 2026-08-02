/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, GradeRow, SUBJECTS, Staff } from './types';

// Cleared for production environment. Only registered/real students will be added by the Director-Geral.
export const INITIAL_STUDENTS: Student[] = [];

// Helper to generate initial grades
export function generateInitialGrades(students: Student[]): GradeRow[] {
  const grades: GradeRow[] = [];
  
  students.forEach((student) => {
    SUBJECTS.forEach((subject) => {
      (['I', 'II', 'III'] as const).forEach((trimester) => {
        grades.push({
          studentId: student.id,
          studentName: student.name,
          subject,
          trimester,
          mac: null,
          npp: null,
          npt: null,
          mt: null
        });
      });
    });
  });

  return grades;
}

// Cleared for production. Only the root administrator account is left active for bootstrap.
export const INITIAL_STAFF: Staff[] = [
  {
    id: 'SIGEP',
    name: 'Administrador SIGEP',
    role: 'SIGEP',
    password: 'sigepwl',
    is_root: true,
    is_editable: false
  }
];
