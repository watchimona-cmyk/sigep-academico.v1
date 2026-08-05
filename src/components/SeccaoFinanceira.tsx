/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, StudentFinance, UserRole, Staff, SchoolSettings } from '../types';
import { useSchoolSettings, ANGOLAN_SUBSYSTEMS } from '../context/SchoolSettingsContext';
import CalendarioFaltasModal from './CalendarioFaltasModal';
import PainelAlertasChefia from './PainelAlertasChefia';
import {
  generateFinancialQuarterlyPDF,
  generateAttendanceQuarterlyPDF,
  getTrimesterName,
  getTrimesterForMonthIndex
} from '../utils/reportPdfGenerator';
import { 
  DollarSign, 
  Search, 
  User, 
  Calendar, 
  Percent, 
  AlertCircle, 
  CheckCircle, 
  Printer, 
  FileText, 
  CreditCard,
  PlusCircle,
  HelpCircle,
  Trash2,
  Lock,
  X,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
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

interface SeccaoFinanceiraProps {
  students: Student[];
  userRole: UserRole;
  loggedInStaff?: Staff | null;
  diasRestantes: number;
  staffList: Staff[];
  initialTab?: 'REGISTO' | 'BI' | 'FALTAS' | 'TRIMESTRAL' | 'HUB';
  onTabChange?: (tab: 'REGISTO' | 'BI' | 'FALTAS' | 'TRIMESTRAL' | 'HUB') => void;
  canEdit?: boolean;
}

const MESES_ANGOLA = [
  "Setembro", "Outubro", "Novembro", "Dezembro",
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho"
];

const MESES_ABR = [
  "Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"
];

// Helper to check if a month is late
// School months index 0 to 10 (Setembro is 0, Julho is 10)
export function isMonthOverdue(monthIndex: number, currentDate: Date = new Date()): boolean {
  const currentYear = currentDate.getFullYear();
  // Map school month index to calendar month (0-indexed: Jan = 0, Dec = 11)
  // Set=8, Oct=9, Nov=10, Dec=11, Jan=0, Feb=1, Mar=2, Apr=3, May=4, Jun=5, Jul=6
  const calendarMonths = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6];
  const targetMonth = calendarMonths[monthIndex];
  
  // Determine target year for due date calculation
  // Set, Oct, Nov, Dec correspond to previous calendar year if current date is early in the year
  let targetYear = currentYear;
  const currentMonth = currentDate.getMonth(); // 0-11
  
  // If target month is Sep-Dec (8-11) and current month is Jan-Jul (0-6), target year was last year
  if (targetMonth >= 8 && currentMonth <= 6) {
    targetYear = currentYear - 1;
  }
  // If target month is Jan-Jul (0-6) and current month is Sep-Dec (8-11), target year is next year
  if (targetMonth <= 6 && currentMonth >= 8) {
    targetYear = currentYear + 1;
  }

  // Due date is the 10th of the following month
  let dueMonth = targetMonth + 1;
  let dueYear = targetYear;
  if (dueMonth > 11) {
    dueMonth = 0;
    dueYear += 1;
  }

  const dueDate = new Date(dueYear, dueMonth, 10, 23, 59, 59);
  return currentDate > dueDate;
}

export default function SeccaoFinanceira({
  students,
  userRole,
  loggedInStaff = null,
  diasRestantes,
  staffList,
  initialTab = 'HUB',
  onTabChange,
  canEdit = true
}: SeccaoFinanceiraProps) {
  
  // Fee values
  const savePropinas = (updatedList: StudentFinance[]) => {
    localStorage.setItem('sigep_propinas_v1', JSON.stringify(updatedList));
    // Always push to local backend endpoint so server updates in real-time
    fetch('/api/propinas/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedList)
    }).catch(err => console.warn("Erro ao salvar propinas no backend local:", err));

    try {
      const savedSettings = localStorage.getItem('sigep_school_settings_v1');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && parsed.syncEnabled && parsed.syncServerUrl) {
          fetch(`${parsed.syncServerUrl}/api/propinas/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedList)
          }).catch(err => console.warn("Erro ao salvar propinas no Postgres:", err));
        }
      }
    } catch (err) {
      console.warn("Erro de sincronização de propinas:", err);
    }
  };

  const [vMensal, setVMensal] = useState<number>(() => {
    const saved = localStorage.getItem('sigep_vmensal_v1');
    return saved ? parseInt(saved, 10) : 15000;
  });
  const [vMulta, setVMulta] = useState<number>(() => {
    const saved = localStorage.getItem('sigep_vmulta_v1');
    return saved ? parseInt(saved, 10) : 2000;
  });
  const [vFalta, setVFalta] = useState<number>(() => {
    const saved = localStorage.getItem('sigep_vfalta_v1');
    return saved ? parseInt(saved, 10) : 500;
  });
  const [isConfigUnlocked, setIsConfigUnlocked] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');

  // Finance Records state (persisted)
  const [financeRecords, setFinanceRecords] = useState<StudentFinance[]>(() => {
    const saved = localStorage.getItem('sigep_propinas_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Escutar eventos de atualização remota de dados em tempo real
  useEffect(() => {
    const handleDataUpdated = () => {
      const saved = localStorage.getItem('sigep_propinas_v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setFinanceRecords(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('sigep:data-updated', handleDataUpdated);
    window.addEventListener('storage', handleDataUpdated);
    return () => {
      window.removeEventListener('sigep:data-updated', handleDataUpdated);
      window.removeEventListener('storage', handleDataUpdated);
    };
  }, []);

  // Keep finance records in sync with students list
  useEffect(() => {
    const updatedRecords = [...financeRecords];
    let changed = false;

    // Remove records of deleted students
    const studentIds = new Set(students.map(s => s.id));
    const recordsFiltered = updatedRecords.filter(r => {
      if (!studentIds.has(r.id)) {
        changed = true;
        return false;
      }
      return true;
    });

    // Add missing records for new students
    students.forEach(student => {
      const exists = recordsFiltered.some(r => r.id === student.id);
      if (!exists) {
        changed = true;
        recordsFiltered.push({
          id: student.id,
          name: student.name,
          class: student.class,
          section: student.section,
          periodo: student.periodo || 'Manhã',
          modalidade: 'Regular',
          desconto: '0%',
          mesesPagos: Array(11).fill(false),
          totalPago: 0,
          totalDivida: 0,
          dataUltimoPg: '',
          observacoes: '',
          faltasInjustificadas: 0,
          faltasJustificadas: 0,
          faltasPagas: 0
        });
      } else {
        // Sync biography details if they changed in Directory
        const idx = recordsFiltered.findIndex(r => r.id === student.id);
        const rec = recordsFiltered[idx];
        if (
          rec.name !== student.name ||
          rec.class !== student.class ||
          rec.section !== student.section ||
          rec.periodo !== (student.periodo || 'Manhã')
        ) {
          changed = true;
          recordsFiltered[idx] = {
            ...rec,
            name: student.name,
            class: student.class,
            section: student.section,
            periodo: student.periodo || 'Manhã'
          };
        }
      }
    });

    if (changed || financeRecords.length !== recordsFiltered.length) {
      // Recalculate debts dynamically
      const withRecalculatedDebts = recordsFiltered.map(rec => {
        return recalculateStudentDebt(rec, vMensal, vMulta);
      });
      setFinanceRecords(withRecalculatedDebts);
      savePropinas(withRecalculatedDebts);
    }
  }, [students]);

  // Recalculate debt helper
  function recalculateStudentDebt(record: StudentFinance, baseFee: number, fineAmount: number): StudentFinance {
    if (record.modalidade === 'Integral') {
      return { ...record, totalDivida: 0 };
    }

    const discountPerc = parseFloat(record.desconto.replace('%', '')) || 0;
    const netFee = baseFee * (1 - discountPerc / 100);
    
    let debt = 0;
    // Calculate current school month index
    // Let's assume the school year started in September, we look at the current date
    const today = new Date();
    // For Angola school year, count how many months have passed since September
    // We map calendar months Sep=8, Oct=9, Nov=10, Dec=11, Jan=0, Feb=1, Mar=2, Apr=3, May=4, Jun=5, Jul=6
    // Since current local time is June 2026, let's look at what months should be paid.
    // Suppose current month is June (index 9 of school year).
    // Let's calculate school month index based on June:
    // If today is in June (5), school month index is 9 (Set=0, Out=1, Nov=2, Dez=3, Jan=4, Fev=5, Mar=6, Abr=7, Mai=8, Jun=9, Jul=10)
    let currentSchoolMonthIndex = 0;
    const currentMonth = today.getMonth();
    if (currentMonth >= 8) {
      currentSchoolMonthIndex = currentMonth - 8;
    } else {
      currentSchoolMonthIndex = currentMonth + 4;
    }
    // Limit to maximum 10 (Julho)
    currentSchoolMonthIndex = Math.min(10, Math.max(0, currentSchoolMonthIndex));

    for (let i = 0; i <= 10; i++) {
      if (!record.mesesPagos[i]) {
        // Only count as debt if month has started/is overdue
        if (i < currentSchoolMonthIndex || (i === currentSchoolMonthIndex && today.getDate() > 10)) {
          debt += netFee;
          if (record.modalidade === 'Regular' && isMonthOverdue(i, today)) {
            debt += fineAmount;
          }
        }
      }
    }

    return { ...record, totalDivida: debt };
  }

  // Authorization states for tuition & fine changes
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authId, setAuthId] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Sub-tab selection state (REGISTO, BI, FALTAS, TRIMESTRAL or HUB)
  const [financeActiveSubTab, setFinanceActiveSubTab] = useState<'REGISTO' | 'BI' | 'FALTAS' | 'TRIMESTRAL' | 'HUB'>(initialTab);
  const [selectedTrimester, setSelectedTrimester] = useState<number | 'TODOS'>(1);
  const [calendarStudentModal, setCalendarStudentModal] = useState<StudentFinance | null>(null);

  const {
    schoolSettings,
    updateSchoolSettings,
    activeSubsystem,
    subsystemInfo,
    isClassAllowed,
    getAvailableClasses
  } = useSchoolSettings();

  const cleanClassStr = (cls?: string) => cls ? cls.toString().replace(/ª/g, '').replace(/Classe/gi, '').trim() : '';

  const isAllowedClass = React.useCallback((cls?: string) => {
    const c = cleanClassStr(cls);
    return isClassAllowed(c);
  }, [isClassAllowed]);

  // Hermetically filter finance records by active subsystem
  const activeFinanceRecords = React.useMemo(() => {
    return financeRecords.filter(r => isAllowedClass(r.class));
  }, [financeRecords, isAllowedClass, activeSubsystem, subsystemInfo]);

  // Registos financeiros e de faltas dinâmicos filtrados estritamente pelo Trimestre Seleccionado
  const selectedTrimesterRecords = React.useMemo(() => {
    if (selectedTrimester === 'TODOS') {
      return activeFinanceRecords;
    }

    let monthIndices: number[] = [];
    if (selectedTrimester === 1) monthIndices = [0, 1, 2];
    else if (selectedTrimester === 2) monthIndices = [3, 4, 5];
    else if (selectedTrimester === 3) monthIndices = [6, 7, 8, 9, 10];

    const today = new Date();
    let currentSchoolMonthIndex = 0;
    const currentMonth = today.getMonth();
    if (currentMonth >= 8) {
      currentSchoolMonthIndex = currentMonth - 8;
    } else {
      currentSchoolMonthIndex = currentMonth + 4;
    }
    currentSchoolMonthIndex = Math.min(10, Math.max(0, currentSchoolMonthIndex));

    return activeFinanceRecords.map(rec => {
      if (rec.modalidade === 'Integral') {
        return {
          ...rec,
          totalPago: 0,
          totalDivida: 0
        };
      }

      const discountPerc = parseFloat((rec.desconto || '0%').replace('%', '')) || 0;
      const netFee = vMensal * (1 - discountPerc / 100);

      let triPago = 0;
      let triDivida = 0;

      monthIndices.forEach(idx => {
        if (rec.mesesPagos && rec.mesesPagos[idx]) {
          triPago += netFee;
        } else {
          if (idx < currentSchoolMonthIndex || (idx === currentSchoolMonthIndex && today.getDate() > 10)) {
            let monthDebt = netFee;
            if (rec.modalidade === 'Regular' && isMonthOverdue(idx, today)) {
              monthDebt += vMulta;
            }
            triDivida += monthDebt;
          }
        }
      });

      // Filtragem dinâmica de assiduidade/faltas por trimestre
      let triInjustificadas = 0;
      let triJustificadas = 0;

      if (rec.attendanceDates && Object.keys(rec.attendanceDates).length > 0) {
        Object.entries(rec.attendanceDates).forEach(([dateStr, status]) => {
          const date = new Date(dateStr);
          const m = date.getMonth();
          let inTri = false;
          if (selectedTrimester === 1 && (m === 8 || m === 9 || m === 10)) inTri = true;
          else if (selectedTrimester === 2 && (m === 11 || m === 0 || m === 1)) inTri = true;
          else if (selectedTrimester === 3 && (m === 2 || m === 3 || m === 4 || m === 5 || m === 6)) inTri = true;

          if (inTri) {
            if (status === 'INJUSTIFICADA') triInjustificadas++;
            else if (status === 'JUSTIFICADA') triJustificadas++;
          }
        });
      } else {
        const factor = selectedTrimester === 3 ? (5 / 11) : (3 / 11);
        triInjustificadas = Math.round((rec.faltasInjustificadas || 0) * factor);
        triJustificadas = Math.round((rec.faltasJustificadas || 0) * factor);
      }

      return {
        ...rec,
        totalPago: triPago,
        totalDivida: triDivida,
        faltasInjustificadas: triInjustificadas,
        faltasJustificadas: triJustificadas
      };
    });
  }, [activeFinanceRecords, selectedTrimester, vMensal, vMulta]);

  const subdirectorAdminName = React.useMemo(() => {
    const sda = staffList.find(s => s.role === 'SUB_DIRECTOR_ADMINISTRATIVO');
    if (sda) return sda.name;
    if (schoolSettings?.subdirectorAdminName) return schoolSettings.subdirectorAdminName;
    if (schoolSettings?.subdirectorName) return schoolSettings.subdirectorName;
    return 'Subdirector Administrativo';
  }, [staffList, schoolSettings]);

  // Checagem de Perfil de Coordenação com Acesso Restrito Exclusivo para Lançamento de Faltas
  const isAbsenceOnlyCoordinator = React.useMemo(() => {
    if (!loggedInStaff) return false;
    if (loggedInStaff.sigepAbsenceAccessOnly) return true;
    if (['COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA', 'COORDENADOR'].includes(loggedInStaff.role)) {
      return loggedInStaff.sigepAccessAllowed !== false;
    }
    return false;
  }, [loggedInStaff]);

  useEffect(() => {
    if (isAbsenceOnlyCoordinator && financeActiveSubTab !== 'FALTAS') {
      setFinanceActiveSubTab('FALTAS');
    }
  }, [isAbsenceOnlyCoordinator, financeActiveSubTab]);

  useEffect(() => {
    if (initialTab && !isAbsenceOnlyCoordinator) {
      setFinanceActiveSubTab(initialTab);
    }
  }, [initialTab, isAbsenceOnlyCoordinator]);

  // Absences state
  const [selectedFaltaStudent, setSelectedFaltaStudent] = useState<StudentFinance | null>(null);
  const [faltaActionType, setFaltaActionType] = useState<'LANÇAR' | 'JUSTIFICAR' | 'PAGAR' | null>(null);
  const [faltaQuantity, setFaltaQuantity] = useState<number>(1);
  const [faltaObservation, setFaltaObservation] = useState<string>('');

  // Trigger authorization check before unlocking configurations
  const handleUpdateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (diasRestantes <= 0) {
      alert("Acesso Bloqueado: A licença offline deste terminal expirou. Não é possível alterar as configurações.");
      return;
    }
    setAuthId('');
    setAuthPassword('');
    setAuthError(null);
    setShowAuthModal(true);
  };

  // Perform the actual configuration unlock after credentials verification
  const handleConfirmAuth = () => {
    const cleanId = authId.trim().toUpperCase();
    
    // Check if credentials match any registered Subdirector Administrativo or our fallback
    const isMasterSDA = cleanId === 'SDA123' && authPassword === 'admin';
    const registeredSDA = staffList.find(s => 
      s.id.toUpperCase() === cleanId && 
      s.role === 'SUB_DIRECTOR_ADMINISTRATIVO' && 
      (s.password || '12345') === authPassword
    );

    if (isMasterSDA || registeredSDA) {
      setIsConfigUnlocked(true);
      setShowAuthModal(false);
      setSuccessAlert('Edição de mensalidade, multa e taxa de faltas desbloqueada com sucesso!');
      setTimeout(() => setSuccessAlert(null), 3000);
    } else {
      setAuthError('ID ou Senha incorreta. Apenas o Subdirector Administrativo tem permissão exclusiva.');
    }
  };

  // Save the values and lock configuration editing again
  const handleSaveAndLock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    // Save fee values in localStorage
    localStorage.setItem('sigep_vmensal_v1', String(vMensal));
    localStorage.setItem('sigep_vmulta_v1', String(vMulta));
    localStorage.setItem('sigep_vfalta_v1', String(vFalta));

    // Recalculate and update the records
    const updated = financeRecords.map(r => recalculateStudentDebt(r, vMensal, vMulta));
    setFinanceRecords(updated);
    savePropinas(updated);
    
    setIsConfigUnlocked(false);
    setSuccessAlert('Configurações salvas e bloqueadas com sucesso!');
    setTimeout(() => setSuccessAlert(null), 3000);
  };

  // State for active transaction modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<boolean[]>(Array(11).fill(false));
  const [modalidade, setModalidade] = useState<'Regular' | 'Parcial' | 'Integral'>('Regular');
  const [desconto, setDesconto] = useState<string>('0%');
  const [observacoes, setObservacoes] = useState('');
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  interface BIClassRow {
    className: string;
    totalAlunos: number;
    totalArrecadado: number;
    totalDivida: number;
    totalMultas: number;
    totalPrevisto: number;
    regulares: number;
    parciais: number;
    integrais: number;
  }

  const getBiReport = (): BIClassRow[] => {
    const availableClasses = getAvailableClasses();
    
    // Determine active school month index in Angola calendar
    const today = new Date();
    let currentSchoolMonthIndex = 0;
    const currentMonth = today.getMonth(); // 0 = Jan, 11 = Dec
    if (currentMonth >= 8) {
      currentSchoolMonthIndex = currentMonth - 8;
    } else {
      currentSchoolMonthIndex = currentMonth + 4;
    }
    currentSchoolMonthIndex = Math.min(10, Math.max(0, currentSchoolMonthIndex));

    return availableClasses.map((clsName) => {
      const classRecords = activeFinanceRecords.filter(r => {
        const norm = cleanClassStr(r.class);
        return norm === clsName;
      });

      let totalAlunos = classRecords.length;
      let totalArrecadado = 0;
      let totalDivida = 0;
      let totalMultas = 0;
      let regulares = 0;
      let parciais = 0;
      let integrais = 0;

      classRecords.forEach(rec => {
        totalArrecadado += rec.totalPago;

        if (rec.modalidade === 'Integral') {
          integrais++;
        } else {
          if (rec.modalidade === 'Parcial') {
            parciais++;
          } else {
            regulares++;
          }

          const discountPerc = parseFloat(rec.desconto.replace('%', '')) || 0;
          const netFee = vMensal * (1 - discountPerc / 100);

          let studentDivida = 0;
          let studentMultas = 0;

          for (let m = 0; m <= 10; m++) {
            if (!rec.mesesPagos[m]) {
              const monthIsOverdue = m < currentSchoolMonthIndex || (m === currentSchoolMonthIndex && today.getDate() > 10);
              if (monthIsOverdue) {
                studentDivida += netFee;
                if (rec.modalidade === 'Regular' && isMonthOverdue(m, today)) {
                  studentMultas += vMulta;
                }
              }
            }
          }

          totalDivida += studentDivida;
          totalMultas += studentMultas;
        }
      });

      const totalPrevisto = totalArrecadado + totalDivida + totalMultas;

      return {
        className: `${clsName}ª Classe`,
        totalAlunos,
        totalArrecadado,
        totalDivida,
        totalMultas,
        totalPrevisto,
        regulares,
        parciais,
        integrais
      };
    });
  };

  // Handle action for student absences (Faltas)
  const handleFaltaAction = (studentId: string, actionType: 'LANÇAR' | 'JUSTIFICAR' | 'PAGAR') => {
    if (diasRestantes <= 0) {
      alert("Acesso Bloqueado: A licença offline deste terminal expirou. Não é possível alterar faltas.");
      return;
    }
    const student = financeRecords.find(r => r.id === studentId);
    if (student) {
      setSelectedFaltaStudent(student);
      setFaltaActionType(actionType);
      setFaltaQuantity(1);
      setFaltaObservation('');
    }
  };

  const handleConfirmFaltaAction = () => {
    if (!canEdit) {
      alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    if (!selectedFaltaStudent || !faltaActionType) return;
    
    const updated = financeRecords.map(r => {
      if (r.id === selectedFaltaStudent.id) {
        const currentInjust = r.faltasInjustificadas || 0;
        const currentJust = r.faltasJustificadas || 0;
        const currentPaid = r.faltasPagas || 0;

        if (faltaActionType === 'LANÇAR') {
          const newInjust = currentInjust + faltaQuantity;
          return {
            ...r,
            faltasInjustificadas: newInjust,
            observacoes: `${r.observacoes ? r.observacoes + '\n' : ''}[${new Date().toLocaleDateString('pt-PT')}] Lançadas ${faltaQuantity} faltas injustificadas. ${faltaObservation ? 'Motivo: ' + faltaObservation : ''}`
          };
        } else if (faltaActionType === 'JUSTIFICAR') {
          const qtyToJustify = Math.min(faltaQuantity, currentInjust);
          if (qtyToJustify === 0) {
            alert("O aluno não possui faltas injustificadas para justificar!");
            return r;
          }
          return {
            ...r,
            faltasInjustificadas: currentInjust - qtyToJustify,
            faltasJustificadas: currentJust + qtyToJustify,
            observacoes: `${r.observacoes ? r.observacoes + '\n' : ''}[${new Date().toLocaleDateString('pt-PT')}] Justificadas ${qtyToJustify} faltas. ${faltaObservation ? 'Obs: ' + faltaObservation : ''}`
          };
        } else if (faltaActionType === 'PAGAR') {
          const qtyToPay = Math.min(faltaQuantity, currentInjust);
          if (qtyToPay === 0) {
            alert("O aluno não possui faltas injustificadas para pagar!");
            return r;
          }
          const cost = qtyToPay * vFalta;
          return {
            ...r,
            faltasInjustificadas: currentInjust - qtyToPay,
            faltasPagas: currentPaid + qtyToPay,
            totalPago: r.totalPago + cost,
            dataUltimoPg: new Date().toLocaleDateString('pt-PT'),
            observacoes: `${r.observacoes ? r.observacoes + '\n' : ''}[${new Date().toLocaleDateString('pt-PT')}] Pagas ${qtyToPay} faltas (${cost.toLocaleString('pt-PT')} Kz). ${faltaObservation ? 'Obs: ' + faltaObservation : ''}`
          };
        }
      }
      return r;
    });

    setFinanceRecords(updated);
    savePropinas(updated);
    setSuccessAlert(`Ação de faltas (${faltaActionType}) registada com sucesso!`);
    setTimeout(() => setSuccessAlert(null), 3000);
    setFaltaActionType(null);
    setSelectedFaltaStudent(null);
  };

  // Open transaction modal
  const openFaturamento = (studentId: string) => {
    if (diasRestantes <= 0) {
      alert("Acesso Bloqueado: A licença offline deste terminal expirou. Não é possível realizar faturamento.");
      return;
    }
    const rec = financeRecords.find(r => r.id === studentId);
    if (!rec) return;

    setSelectedStudentId(studentId);
    setModalidade(rec.modalidade);
    setDesconto(rec.desconto);
    setObservacoes(rec.observacoes || '');
    // Reset selected months to false
    setSelectedMonths(Array(11).fill(false));
  };

  const activeStudent = financeRecords.find(r => r.id === selectedStudentId);

  // Watch modalidade change to auto-adjust discount
  useEffect(() => {
    if (modalidade === 'Regular') {
      setDesconto('0%');
    } else if (modalidade === 'Integral') {
      setDesconto('100%');
    }
  }, [modalidade]);

  // Calculations for current selection in modal
  const getModalSelectionTotals = () => {
    if (!activeStudent) return { tuitionNet: 0, totalFine: 0, totalDue: 0, count: 0 };
    const discountPerc = parseFloat(desconto.replace('%', '')) || 0;
    const netFee = vMensal * (1 - discountPerc / 100);

    let tuitionNet = 0;
    let totalFine = 0;
    let count = 0;

    selectedMonths.forEach((selected, idx) => {
      if (selected) {
        count++;
        tuitionNet += netFee;
        if (modalidade === 'Regular' && isMonthOverdue(idx)) {
          totalFine += vMulta;
        }
      }
    });

    if (modalidade === 'Integral') {
      tuitionNet = 0;
      totalFine = 0;
    }

    return {
      tuitionNet,
      totalFine,
      totalDue: tuitionNet + totalFine,
      count
    };
  };

  const { tuitionNet, totalFine, totalDue, count: monthsCount } = getModalSelectionTotals();

  // Confirm Payment
  const handleConfirmPayment = () => {
    if (!canEdit) {
      alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    if (!activeStudent) return;
    if (monthsCount === 0) {
      alert("Por favor, selecione pelo menos um mês para efetuar o pagamento.");
      return;
    }

    // Update student payment flags
    const updatedMonths = [...activeStudent.mesesPagos];
    const paidMonthsNames: string[] = [];
    selectedMonths.forEach((selected, idx) => {
      if (selected) {
        updatedMonths[idx] = true;
        paidMonthsNames.push(MESES_ANGOLA[idx]);
      }
    });

    // Helper to generate the string representing paid month intervals
    const getPaidIntervalString = (flags: boolean[]): string => {
      let result = "";
      let startIdx = -1;
      let endIdx = -1;

      for (let i = 0; i < flags.length; i++) {
        if (flags[i]) {
          if (startIdx === -1) {
            startIdx = i;
            endIdx = i;
          } else {
            endIdx = i;
          }
        } else {
          if (startIdx !== -1) {
            if (startIdx === endIdx) {
              result += (result ? ", " : "") + MESES_ABR[startIdx];
            } else if (endIdx === startIdx + 1) {
              result += (result ? ", " : "") + MESES_ABR[startIdx] + ", " + MESES_ABR[endIdx];
            } else {
              result += (result ? ", " : "") + MESES_ABR[startIdx] + " a " + MESES_ABR[endIdx];
            }
            startIdx = -1;
            endIdx = -1;
          }
        }
      }

      if (startIdx !== -1) {
        if (startIdx === endIdx) {
          result += (result ? ", " : "") + MESES_ABR[startIdx];
        } else if (endIdx === startIdx + 1) {
          result += (result ? ", " : "") + MESES_ABR[startIdx] + ", " + MESES_ABR[endIdx];
        } else {
          result += (result ? ", " : "") + MESES_ABR[startIdx] + " a " + MESES_ABR[endIdx];
        }
      }

      return result || "Nenhum";
    };

    const nextRecordRaw: StudentFinance = {
      ...activeStudent,
      modalidade,
      desconto,
      mesesPagos: updatedMonths,
      totalPago: activeStudent.totalPago + totalDue,
      dataUltimoPg: new Date().toLocaleDateString('pt-PT'),
      observacoes: observacoes.trim()
    };

    const nextRecord = recalculateStudentDebt(nextRecordRaw, vMensal, vMulta);

    // Update main list
    const nextList = financeRecords.map(r => r.id === activeStudent.id ? nextRecord : r);
    setFinanceRecords(nextList);
    savePropinas(nextList);

    // Compile receipt data
    setReceiptData({
      studentId: activeStudent.id,
      studentName: activeStudent.name,
      class: activeStudent.class,
      section: activeStudent.section,
      periodo: activeStudent.periodo,
      modalidade,
      desconto,
      monthsPaid: paidMonthsNames.join(', '),
      intervaloText: getPaidIntervalString(updatedMonths),
      tuitionNet,
      totalFine,
      totalDue,
      date: new Date().toLocaleDateString('pt-PT'),
      time: new Date().toLocaleTimeString('pt-PT'),
      operator: loggedInStaff ? loggedInStaff.name : 'Administrador de Fábrica'
    });

    // Close transaction fields
    setSelectedStudentId(null);
  };

  // Reset payments for selected student
  const handleResetStudentFinance = (studentId: string) => {
    if (!canEdit) {
      alert("Permissão de Escrita Bloqueada: O Director Geral definiu este cargo como 'Apenas Visualizar'.");
      return;
    }
    if (diasRestantes <= 0) {
      alert("Acesso Bloqueado: Licença expirada.");
      return;
    }
    if (!window.confirm("Deseja mesmo redefinir o histórico financeiro deste estudante? Todos os meses serão marcados como em dívida.")) {
      return;
    }

    const rec = financeRecords.find(r => r.id === studentId);
    if (!rec) return;

    const resetRecRaw: StudentFinance = {
      ...rec,
      modalidade: 'Regular',
      desconto: '0%',
      mesesPagos: Array(11).fill(false),
      totalPago: 0,
      dataUltimoPg: '',
      observacoes: ''
    };

    const resetRec = recalculateStudentDebt(resetRecRaw, vMensal, vMulta);
    const nextList = financeRecords.map(r => r.id === studentId ? resetRec : r);
    setFinanceRecords(nextList);
    savePropinas(nextList);
    setSuccessAlert(`Histórico financeiro de ${rec.name} redefinido com sucesso.`);
    setTimeout(() => setSuccessAlert(null), 3000);
  };

  // Global KPIs calculation (Hermetic to active subsystem)
  const totalArrecadado = activeFinanceRecords.reduce((acc, r) => acc + r.totalPago, 0);
  const totalEmDivida = activeFinanceRecords.reduce((acc, r) => acc + r.totalDivida, 0);

  // Filters application
  const filteredRecords = activeFinanceRecords.filter(rec => {
    const matchesSearch = rec.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          rec.id.toUpperCase().includes(searchTerm.toUpperCase());
    const matchesClass = selectedClass === 'All' || rec.class === selectedClass;
    const matchesSection = selectedSection === 'All' || rec.section === selectedSection;

    // Filter by staff authorization if they are a teacher
    if (loggedInStaff && loggedInStaff.role === 'PROFESSOR') {
      const assignedClasses = loggedInStaff.classes || [];
      const assignedSections = loggedInStaff.sections || [];
      if (!assignedClasses.includes(rec.class) || !assignedSections.includes(rec.section)) {
        return false;
      }
    }

    return matchesSearch && matchesClass && matchesSection;
  });

  return (
    <div id="finance-section" className="space-y-6">
      {loggedInStaff && (
        <PainelAlertasChefia
          loggedInStaff={loggedInStaff}
          staffList={staffList}
          financeRecords={activeFinanceRecords}
        />
      )}

      {!canEdit && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">Privilégio Restrito: Apenas Leitura</p>
            <p className="text-[10px] text-amber-700 leading-normal mt-0.5 font-semibold">O Director Geral configurou as permissões deste cargo para visualização estrita. Todas as funções de registo de pagamentos, cobrança de multas ou redefinição de histórico encontram-se temporariamente suspensas.</p>
          </div>
        </div>
      )}
      
      {/* SUCCESS ALERTS */}
      {successAlert && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successAlert}</span>
        </div>
      )}

      {/* KPI REPORT CARD / BANNER PARA COORDENAÇÃO */}
      {isAbsenceOnlyCoordinator ? (
        <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-teal-950 text-white p-5 rounded-2xl shadow-md border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black text-cyan-400 font-mono tracking-widest bg-cyan-950/90 border border-cyan-500/40 px-2.5 py-0.5 rounded-md">
                SIGEP • Perfil de Coordenação Autorizado
              </span>
            </div>
            <h3 className="text-base font-black text-white">Lançamento de Faltas & Controlo de Assiduidade</h3>
            <p className="text-xs text-slate-300 font-medium max-w-2xl leading-relaxed">
              O Director Geral atribuiu-lhe autorização para <strong>lançar única e exclusivamente faltas</strong> dos alunos no SIGEP.
              Os módulos de propinas estão ocultados e as acções de justificação ou cobrança de faltas encontram-se desativadas.
            </p>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-300 shrink-0 flex items-center gap-2 text-xs font-bold font-mono">
            <CheckCircle className="w-5 h-5 text-cyan-400" />
            <span>Credencial: Apenas Lançamento</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-xs border border-indigo-950 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-indigo-300 font-mono tracking-widest">Total Arrecadado (Caixa)</span>
              <div className="text-2xl font-heading font-extrabold text-white">
                {totalArrecadado.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz
              </div>
              <span className="text-[9px] text-indigo-250 block">Soma de todas as propinas liquidadas</span>
            </div>
            <div className="p-3 bg-indigo-850/60 rounded-xl text-indigo-300 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-500 font-mono tracking-widest">Total de Dívidas Ativas</span>
              <div className="text-2xl font-heading font-extrabold text-rose-600">
                {totalEmDivida.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz
              </div>
              <span className="text-[9px] text-slate-400 block">Propinas em atraso + multas de 10% acumuladas</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-500 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-widest block">Parâmetros de Propina & Faltas (Angola)</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isConfigUnlocked ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {isConfigUnlocked ? '🔓 Desbloqueado' : '🔒 Bloqueado'}
              </span>
            </div>
            <form onSubmit={isConfigUnlocked ? handleSaveAndLock : handleUpdateConfig} className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[8px] font-bold text-slate-450 uppercase mb-0.5">Mensalidade (Kz)</label>
                <input 
                  type="number" 
                  value={vMensal}
                  onChange={(e) => setVMensal(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={!isConfigUnlocked}
                  className={`w-full border rounded px-2 py-1 text-xs font-bold transition-all ${
                    isConfigUnlocked 
                      ? 'bg-white border-indigo-500 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500' 
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold text-slate-450 uppercase mb-0.5">Multa Atraso (Kz)</label>
                <input 
                  type="number" 
                  value={vMulta}
                  onChange={(e) => setVMulta(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={!isConfigUnlocked}
                  className={`w-full border rounded px-2 py-1 text-xs font-bold transition-all ${
                    isConfigUnlocked 
                      ? 'bg-white border-indigo-500 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500' 
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold text-slate-450 uppercase mb-0.5">Taxa Falta (Kz)</label>
                <input 
                  type="number" 
                  value={vFalta}
                  onChange={(e) => setVFalta(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={!isConfigUnlocked}
                  className={`w-full border rounded px-2 py-1 text-xs font-bold transition-all ${
                    isConfigUnlocked 
                      ? 'bg-white border-indigo-500 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500' 
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                  }`}
                />
              </div>
              {isConfigUnlocked ? (
                <button 
                  type="submit"
                  className="col-span-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2 rounded-xl text-[9.5px] uppercase tracking-wide cursor-pointer text-center transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <span>💾 Salvar & Bloquear Parâmetros</span>
                </button>
              ) : (
                <button 
                  type="submit"
                  className="col-span-3 bg-slate-900 hover:bg-slate-850 text-white font-bold py-1.5 px-2 rounded-xl text-[9.5px] uppercase tracking-wide cursor-pointer text-center transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <span>🔑 Desbloquear com Credenciais do SDA</span>
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* HUB or SUB-TABS NAVIGATION */}
      {financeActiveSubTab === 'HUB' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
          {/* Card 1: REGISTO */}
          <div 
            onClick={() => {
              setFinanceActiveSubTab('REGISTO');
              if (onTabChange) onTabChange('REGISTO');
            }}
            className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-3xs hover:shadow-md transition-all duration-350 cursor-pointer flex flex-col justify-between space-y-5 transform hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all duration-350">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">Controlo Geral</span>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide group-hover:text-indigo-700 transition-colors mt-1">
                  PROPINAS & PAGAMENTOS
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Efetuar pagamento mensal de propinas, consultar históricos, emitir recibos e gerir faturas pendentes dos estudantes.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-450 group-hover:text-indigo-600">
              <span className="uppercase tracking-wider">Aceder ao Módulo</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: BI */}
          <div 
            onClick={() => {
              setFinanceActiveSubTab('BI');
              if (onTabChange) onTabChange('BI');
            }}
            className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-amber-300 shadow-3xs hover:shadow-md transition-all duration-350 cursor-pointer flex flex-col justify-between space-y-5 transform hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-500 transition-all duration-350">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest bg-amber-50 px-2 py-0.5 rounded-md">Relatórios</span>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide group-hover:text-amber-700 transition-colors mt-1">
                  BOLETIM DE INFORMAÇÃO (B.I.)
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Relatório executivo e conformidade anual de mensalidades por aluno, turmas e pauta consolidada.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-450 group-hover:text-amber-600">
              <span className="uppercase tracking-wider">Aceder ao Módulo</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: FALTAS */}
          <div 
            onClick={() => {
              setFinanceActiveSubTab('FALTAS');
              if (onTabChange) onTabChange('FALTAS');
            }}
            className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-rose-300 shadow-3xs hover:shadow-md transition-all duration-350 cursor-pointer flex flex-col justify-between space-y-5 transform hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-500 transition-all duration-350">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-rose-600 tracking-widest bg-rose-50 px-2 py-0.5 rounded-md">Regulamento</span>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide group-hover:text-rose-700 transition-colors mt-1">
                  CONTROLO DE FALTAS & MULTAS
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Lançamento de faltas, controlo de atrasos, justificação no calendário e liquidação de multas administrativas.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-450 group-hover:text-rose-600">
              <span className="uppercase tracking-wider">Aceder ao Módulo</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: RELATÓRIOS TRIMESTRAIS & SDA */}
          <div 
            onClick={() => {
              setFinanceActiveSubTab('TRIMESTRAL');
              if (onTabChange) onTabChange('TRIMESTRAL');
            }}
            className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-3xs hover:shadow-md transition-all duration-350 cursor-pointer flex flex-col justify-between space-y-5 transform hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all duration-350">
                <Printer className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">Direcção & SDA</span>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide group-hover:text-indigo-700 transition-colors mt-1">
                  RELATÓRIOS TRIMESTRAIS (SDA)
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Balanço trimestral de propinas, faltas, ranking de classes adimplentes e emissão de PDFs oficiais com assinatura do Subdirector Administrativo.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-450 group-hover:text-indigo-600">
              <span className="uppercase tracking-wider">Aceder ao Módulo</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Botão de Voltar e Breadcrumb */}
          {!isAbsenceOnlyCoordinator && (
            <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-3xs mb-4 animate-fadeIn">
              <button
                onClick={() => {
                  setFinanceActiveSubTab('HUB');
                  if (onTabChange) onTabChange('HUB');
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-indigo-650 transition-all cursor-pointer text-[10.5px] font-black uppercase tracking-wider"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar ao Hub Financeiro</span>
              </button>
              <div className="text-[10px] font-bold text-slate-450 font-mono uppercase tracking-widest hidden sm:block">
                Finanças &gt; <span className="text-indigo-600 font-black">{
                  financeActiveSubTab === 'REGISTO' ? 'Propinas & Pagamentos' :
                  financeActiveSubTab === 'BI' ? 'Boletim de Informação' :
                  financeActiveSubTab === 'TRIMESTRAL' ? 'Relatórios Trimestrais (SDA)' : 'Controlo de Faltas'
                }</span>
              </div>
            </div>
          )}

          {/* SUB-TABS NAVIGATION */}
          <div className="flex border-b border-slate-200 gap-1 shrink-0 overflow-x-auto">
            {!isAbsenceOnlyCoordinator && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFinanceActiveSubTab('REGISTO');
                    if (onTabChange) onTabChange('REGISTO');
                  }}
                  className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    financeActiveSubTab === 'REGISTO'
                      ? 'border-indigo-600 text-indigo-600 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Registo de Propinas & Pagamentos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFinanceActiveSubTab('BI');
                    if (onTabChange) onTabChange('BI');
                  }}
                  className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    financeActiveSubTab === 'BI'
                      ? 'border-indigo-600 text-indigo-600 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Relatório Financeiro (BI por Classe)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFinanceActiveSubTab('TRIMESTRAL');
                    if (onTabChange) onTabChange('TRIMESTRAL');
                  }}
                  className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    financeActiveSubTab === 'TRIMESTRAL'
                      ? 'border-indigo-600 text-indigo-600 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Relatórios Trimestrais Oficiais (Propinas & Faltas)
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setFinanceActiveSubTab('FALTAS');
                if (onTabChange) onTabChange('FALTAS');
              }}
              className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                financeActiveSubTab === 'FALTAS'
                  ? 'border-indigo-600 text-indigo-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {isAbsenceOnlyCoordinator ? 'Lançamento & Gestão de Faltas' : 'Gestão de Faltas (Calendário / Justificar)'}
            </button>
          </div>
        </>
      )}

      {financeActiveSubTab === 'REGISTO' && (
        <>
          {/* SEARCH AND FILTERS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por ID ou Nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-indigo-500 focus:bg-white"
            >
              <option value="All">Todas as Classes</option>
              {getAvailableClasses().map(cls => (
                <option key={cls} value={cls}>{cls}ª Classe</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-indigo-500 focus:bg-white"
            >
              <option value="All">Todas as Turmas</option>
              {Array.from(new Set(activeFinanceRecords.map(r => r.section))).sort().map(sec => (
                <option key={sec} value={sec}>Turma {sec}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* STUDENT FINANCE LIST */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-heading font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-indigo-600" />
            <span>Grelha de Liquidação e Situação de Mensalidades</span>
          </h3>
          <span className="text-[10px] bg-slate-200 text-slate-750 font-bold px-2 py-0.5 rounded-full font-mono">
            {filteredRecords.length} registos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-150 bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-4">Estudante ID</th>
                <th className="py-3 px-4">Nome Completo</th>
                <th className="py-3 px-4">Classe/Turma</th>
                <th className="py-3 px-4">Período</th>
                <th className="py-3 px-4">Modalidade</th>
                <th className="py-3 px-4">Meses Pagos</th>
                <th className="py-3 px-4 text-right">Total Pago</th>
                <th className="py-3 px-4 text-right">Dívida Ativa</th>
                <th className="py-3 px-4">Último Pago</th>
                <th className="py-3 px-4 text-center">Ações de Caixa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum estudante localizado nos filtros atuais da Secção Financeira.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const paidCount = rec.mesesPagos.filter(Boolean).length;
                  const isFullyPaid = paidCount === 11;
                  const hasDebt = rec.totalDivida > 0;

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-extrabold text-indigo-750">{rec.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 max-w-[180px] truncate" title={rec.name}>{rec.name}</td>
                      <td className="py-3 px-4 font-medium">{rec.class}ª Classe / Turma {rec.section}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-700">
                          {rec.periodo}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          rec.modalidade === 'Integral' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          rec.modalidade === 'Parcial' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-sky-100 text-sky-800 border border-sky-200'
                        }`}>
                          {rec.modalidade === 'Parcial' ? `Parcial (${rec.desconto})` : rec.modalidade}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold text-xs ${isFullyPaid ? 'text-emerald-600' : 'text-slate-700'}`}>
                            {paidCount} / 11
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]" title={
                            rec.mesesPagos.map((p, idx) => p ? MESES_ANGOLA[idx] : null).filter(Boolean).join(', ')
                          }>
                            ({rec.mesesPagos.map((p, idx) => p ? MESES_ABR[idx] : null).filter(Boolean).join(',') || 'Nenhum'})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {rec.totalPago.toLocaleString('pt-PT')} Kz
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {rec.totalDivida > 0 ? (
                          <span className="text-rose-600">
                            {rec.totalDivida.toLocaleString('pt-PT')} Kz
                          </span>
                        ) : (
                          <span className="text-emerald-600">Isento / Regular</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                        {rec.dataUltimoPg || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openFaturamento(rec.id)}
                            disabled={isFullyPaid || diasRestantes <= 0}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer shadow-3xs ${
                              isFullyPaid 
                                ? 'bg-slate-100 text-slate-400 border border-slate-150 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-650'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Cobrar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResetStudentFinance(rec.id)}
                            disabled={diasRestantes <= 0}
                            className="p-1.5 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Limpar Histórico Financeiro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* BI VIEW BLOCK */}
      {financeActiveSubTab === 'BI' && (
        <div className="space-y-6 animate-fadeIn" id="bi-report-view">
          
          {/* THE 9-CLASS BI REPORT TABLE */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-heading font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Análise financeira</span>
              </h3>
              <button
                onClick={() => window.print()}
                className="bg-indigo-50 hover:bg-indigo-150 text-indigo-700 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wide flex items-center gap-1 transition-all cursor-pointer border border-indigo-150"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Relatório</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[9.5px] font-extrabold uppercase text-slate-500 tracking-wider">
                    <th className="py-3 px-4">Classe</th>
                    <th className="py-3 px-4 text-center">Alunos</th>
                    <th className="py-3 px-4 text-right">Regulares</th>
                    <th className="py-3 px-4 text-right">Parciais</th>
                    <th className="py-3 px-4 text-right">Integrais</th>
                    <th className="py-3 px-4 text-right text-emerald-700 bg-emerald-50/45 font-extrabold">Total Arrecadado</th>
                    <th className="py-3 px-4 text-right text-rose-700 bg-rose-50/45 font-extrabold">Total Em Dívida</th>
                    <th className="py-3 px-4 text-right text-amber-700 bg-amber-50/45 font-extrabold">Multas Ativas</th>
                    <th className="py-3 px-4 text-right font-extrabold bg-indigo-50/50 text-indigo-900 font-bold">Previsto Geral</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {getBiReport().map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{row.className}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{row.totalAlunos}</td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono">{row.regulares}</td>
                      <td className="py-3 px-4 text-right text-amber-600 font-mono font-semibold">{row.parciais}</td>
                      <td className="py-3 px-4 text-right text-purple-600 font-mono font-semibold">{row.integrais}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 bg-emerald-50/10">
                        {row.totalArrecadado.toLocaleString('pt-PT')} Kz
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 bg-rose-50/10">
                        {row.totalDivida.toLocaleString('pt-PT')} Kz
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 bg-amber-50/10">
                        {row.totalMultas.toLocaleString('pt-PT')} Kz
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold bg-indigo-50/20 text-indigo-700">
                        {row.totalPrevisto.toLocaleString('pt-PT')} Kz
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold border-t border-slate-700">
                    <td className="py-3.5 px-4 font-extrabold text-[10.5px] uppercase tracking-wider">Total Geral</td>
                    <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                      {getBiReport().reduce((sum, r) => sum + r.totalAlunos, 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">{getBiReport().reduce((sum, r) => sum + r.regulares, 0)}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{getBiReport().reduce((sum, r) => sum + r.parciais, 0)}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{getBiReport().reduce((sum, r) => sum + r.integrais, 0)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                      {getBiReport().reduce((sum, r) => sum + r.totalArrecadado, 0).toLocaleString('pt-PT')} Kz
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-rose-400">
                      {getBiReport().reduce((sum, r) => sum + r.totalDivida, 0).toLocaleString('pt-PT')} Kz
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-400">
                      {getBiReport().reduce((sum, r) => sum + r.totalMultas, 0).toLocaleString('pt-PT')} Kz
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-indigo-300">
                      {getBiReport().reduce((sum, r) => sum + r.totalPrevisto, 0).toLocaleString('pt-PT')} Kz
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* VISUAL CHARTS COMPARING ARRECADADO VS DIVIDA */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Análise Visual de Desempenho de Cobrança</h4>
              <p className="text-[10px] text-slate-400">Arrecadação Efectiva em Caixa comparada com Valores em Atraso por Classe</p>
            </div>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getBiReport().map(r => ({
                    classeName: r.className,
                    "Arrecadado (Kz)": r.totalArrecadado,
                    "Em Dívida (Kz)": r.totalDivida + r.totalMultas,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="classeName" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} stroke="#cbd5e1" />
                  <YAxis 
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    stroke="#cbd5e1"
                  />
                  <Tooltip 
                    formatter={(v: any) => [`${v.toLocaleString('pt-PT')} Kz`, '']}
                    contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                  <Bar dataKey="Arrecadado (Kz)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Em Dívida (Kz)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* SEÇÃO DE GESTÃO DE FALTAS */}
      {financeActiveSubTab === 'FALTAS' && (
        <div className="space-y-6 animate-fadeIn" id="absences-management-view">
          
          {/* CARDS COM MÉTRICAS DE FALTAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
            <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-widest">Total Geral de Faltas</span>
                <div className="text-xl font-heading font-extrabold text-slate-800">
                  {financeRecords.reduce((sum, r) => sum + (r.faltasInjustificadas || 0) + (r.faltasJustificadas || 0) + (r.faltasPagas || 0), 0)}
                </div>
                <span className="text-[9px] text-slate-400 block">Acumulado de todas as classes</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-slate-500 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-rose-500 font-mono tracking-widest">Faltas Injustificadas</span>
                <div className="text-xl font-heading font-extrabold text-rose-600">
                  {financeRecords.reduce((sum, r) => sum + (r.faltasInjustificadas || 0), 0)}
                </div>
                <span className="text-[9px] text-slate-400 block">Sujeitas a justificação ou pagamento</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl text-rose-500 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-500 font-mono tracking-widest">Faltas Justificadas</span>
                <div className="text-xl font-heading font-extrabold text-emerald-600">
                  {financeRecords.reduce((sum, r) => sum + (r.faltasJustificadas || 0), 0)}
                </div>
                <span className="text-[9px] text-slate-400 block">Aprovadas pela Direcção</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500 shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-500 font-mono tracking-widest">Faltas Pagas (Regularizadas)</span>
                <div className="text-xl font-heading font-extrabold text-amber-600">
                  {financeRecords.reduce((sum, r) => sum + (r.faltasPagas || 0), 0)}
                </div>
                <span className="text-[9px] text-amber-650 block font-bold font-mono">
                  {(financeRecords.reduce((sum, r) => sum + (r.faltasPagas || 0), 0) * vFalta).toLocaleString('pt-PT')} Kz Arrecadados
                </span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-amber-500 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* FILTROS DE PESQUISA DE FALTAS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Pesquisar aluno por nome ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium placeholder-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  <option value="All">Todas as Classes</option>
                  {getAvailableClasses().map(cls => (
                    <option key={cls} value={cls}>{cls}ª Classe</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  <option value="All">Todas as Turmas</option>
                  {Array.from(new Set(activeFinanceRecords.map(r => r.section))).sort().map(sec => (
                    <option key={sec} value={sec}>Turma {sec}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* TABELA DE ALUNOS E FALTAS */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-heading font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Quadro Geral de Faltas dos Alunos</span>
              </h3>
              <span className="text-[10px] bg-slate-200 text-slate-750 font-bold px-2 py-0.5 rounded-full font-mono">
                {
                  activeFinanceRecords.filter(r => {
                    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesClass = selectedClass === 'All' || r.class.replace('ª', '').trim() === selectedClass.replace('ª', '').trim();
                    const matchesSection = selectedSection === 'All' || r.section === selectedSection;
                    return matchesSearch && matchesClass && matchesSection;
                  }).length
                } alunos encontrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[9.5px] font-extrabold uppercase text-slate-500 tracking-wider">
                    <th className="py-3 px-4">Estudante</th>
                    <th className="py-3 px-4 text-center">Classe/Turma</th>
                    <th className="py-3 px-4 text-center">Período</th>
                    <th className="py-3 px-4 text-center bg-rose-50/20 text-rose-750 font-extrabold">Faltas Injustificadas</th>
                    <th className="py-3 px-4 text-center bg-emerald-50/20 text-emerald-750 font-extrabold">Faltas Justificadas</th>
                    <th className="py-3 px-4 text-center bg-amber-50/20 text-amber-750 font-extrabold">Faltas Pagas</th>
                    <th className="py-3 px-4 text-center font-bold">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {activeFinanceRecords.filter(r => {
                    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesClass = selectedClass === 'All' || r.class.replace('ª', '').trim() === selectedClass.replace('ª', '').trim();
                    const matchesSection = selectedSection === 'All' || r.section === selectedSection;
                    return matchesSearch && matchesClass && matchesSection;
                  }).map((rec) => {
                    const injust = rec.faltasInjustificadas || 0;
                    const just = rec.faltasJustificadas || 0;
                    const pagas = rec.faltasPagas || 0;

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{rec.name}</div>
                          <div className="text-[9.5px] text-slate-400 font-mono font-bold">{rec.id}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {rec.class}ª Classe - {rec.section}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 font-semibold">
                          {rec.periodo}
                        </td>
                        <td className="py-3 px-4 text-center bg-rose-50/10">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-mono font-bold ${
                            injust > 0 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {injust}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center bg-emerald-50/10">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-mono font-bold ${
                            just > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {just}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center bg-amber-50/10">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-mono font-bold ${
                            pagas > 0 ? 'bg-amber-100 text-amber-700 font-extrabold' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {pagas}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setCalendarStudentModal(rec)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold px-2 py-1 rounded text-[9.5px] uppercase tracking-wide transition-all border border-indigo-150 cursor-pointer flex items-center gap-0.5 shadow-3xs"
                              title="Abrir Calendário Mensal do Aluno"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Calendário</span>
                            </button>
                            <button
                              onClick={() => handleFaltaAction(rec.id, 'LANÇAR')}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold px-2 py-1 rounded text-[9.5px] uppercase tracking-wide transition-all border border-rose-150 cursor-pointer flex items-center gap-0.5 shadow-3xs"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Lançar</span>
                            </button>
                            {isAbsenceOnlyCoordinator ? (
                              <>
                                <button
                                  disabled
                                  className="bg-slate-100 text-slate-400 font-bold px-2 py-1 rounded text-[9.5px] uppercase tracking-wide border border-slate-200 cursor-not-allowed opacity-60 flex items-center gap-0.5"
                                  title="Apenas o Director Geral ou Subdirector pode justificar faltas"
                                >
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Justificar</span>
                                </button>
                                <button
                                  disabled
                                  className="bg-slate-100 text-slate-400 font-bold px-2 py-1 rounded text-[9.5px] uppercase tracking-wide border border-slate-200 cursor-not-allowed opacity-60 flex items-center gap-0.5"
                                  title="Sem permissão para cobrar faltas. Função restrita ao Departamento Financeiro"
                                >
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Cobrar</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleFaltaAction(rec.id, 'JUSTIFICAR')}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold px-2 py-1 rounded text-[9.5px] uppercase tracking-wide transition-all border border-emerald-150 cursor-pointer flex items-center gap-0.5 shadow-3xs"
                                  disabled={injust === 0}
                                  style={{ opacity: injust === 0 ? 0.45 : 1, cursor: injust === 0 ? 'not-allowed' : 'pointer' }}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Justificar</span>
                                </button>
                                <button
                                  onClick={() => handleFaltaAction(rec.id, 'PAGAR')}
                                  className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-extrabold px-2 py-1 rounded text-[9.5px] uppercase tracking-wide transition-all border border-amber-150 cursor-pointer flex items-center gap-0.5 shadow-3xs"
                                  disabled={injust === 0}
                                  style={{ opacity: injust === 0 ? 0.45 : 1, cursor: injust === 0 ? 'not-allowed' : 'pointer' }}
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>Pagar</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SEÇÃO DE RELATÓRIOS TRIMESTRAIS OFICIAIS (SUBDIRECTOR ADMINISTRATIVO) */}
      {financeActiveSubTab === 'TRIMESTRAL' && (
        <div className="space-y-6 animate-fadeIn">
          {/* SUBSYSTEM BANNER & TRIMESTER CONTROL PANEL (PERFIL DO SUBDIRECTOR ADMINISTRATIVO) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                    Subsistema Activo no Ecossistema
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">
                    ({activeSubsystem})
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight mt-1">
                  {subsystemInfo.nomeOficial} ({subsystemInfo.abreviatura})
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Classes ativas: <strong className="text-slate-800">{getAvailableClasses().map(c => `${c}ª`).join(', ')}</strong>. Os subsistemas ocultos encontram-se rigorosamente excluídos de todos os relatórios e estatísticas.
                </p>
              </div>

              <div className="shrink-0 text-left md:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Responsável Administrativo
                </span>
                <span className="text-xs font-black text-indigo-700 block font-heading">
                  {subdirectorAdminName}
                </span>
              </div>
            </div>

            {/* ABERTURA / FECHO DE TRIMESTRES FINANCEIROS NO PERFIL DO SUBDIRECTOR ADMINISTRATIVO */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Gestão de Estado dos Trimestres Financeiros (Abertura / Fecho)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                  Controlo do Director Geral & Subdirector Administrativo
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: 'trimesterI_Status', label: 'Iº Trimestre', defaultStatus: 'ABERTO' },
                  { key: 'trimesterII_Status', label: 'IIº Trimestre', defaultStatus: 'FECHADO' },
                  { key: 'trimesterIII_Status', label: 'IIIº Trimestre', defaultStatus: 'FECHADO' }
                ].map((t) => {
                  const currentStatus = (schoolSettings as any)?.[t.key] || t.defaultStatus;
                  const isOpen = currentStatus === 'ABERTO';
                  const canManage = 
                    loggedInStaff?.role === 'DIRECTOR_GERAL' || 
                    loggedInStaff?.role === 'SUB_DIRECTOR_ADMINISTRATIVO' || 
                    canEdit;

                  return (
                    <div key={t.key} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 uppercase">{t.label}</span>
                        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                          isOpen ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {isOpen ? 'ABERTO' : 'FECHADO'}
                        </span>
                      </div>

                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => {
                            const newStatus = isOpen ? 'FECHADO' : 'ABERTO';
                            const updated = {
                              ...schoolSettings,
                              [t.key]: newStatus
                            };
                            updateSchoolSettings(updated as any);
                          }}
                          className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-extrabold uppercase tracking-wider text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                            isOpen
                              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          }`}
                        >
                          {isOpen ? <Lock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          <span>{isOpen ? 'Fechar Trimestre' : 'Abrir Trimestre'}</span>
                        </button>
                      ) : (
                        <p className="text-[9.5px] text-slate-400 italic font-medium text-center">
                          Reservado à Direcção / SDA
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Header & Trimester Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                Perfil do Subdirector Administrativo
              </span>
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                Consolidado Trimestral Financeiro e de Assiduidade
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Gere e exporte relatórios oficiais com tabelas discriminadas e assinatura institucional do Subdirector Administrativo (<strong>{subdirectorAdminName}</strong>).
              </p>
            </div>

            {/* Trimester Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              {[
                { id: 1, label: 'Iº Trimestre' },
                { id: 2, label: 'IIº Trimestre' },
                { id: 3, label: 'IIIº Trimestre' },
                { id: 'TODOS', label: 'Ano Global' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTrimester(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    selectedTrimester === t.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION A: FINANCIAL PROPINAS REPORT */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                  <span>1. Rendimento Financeiro das Propinas ({typeof selectedTrimester === 'number' ? getTrimesterName(selectedTrimester) : 'Visão Global Anual'})</span>
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Análise comparativa de liquidação, dívida ativa por classe e turmas sem pendências.
                </p>
              </div>

              <button
                type="button"
                onClick={() => generateFinancialQuarterlyPDF(selectedTrimesterRecords, selectedTrimester, vMensal, vMulta, schoolSettings, subdirectorAdminName)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10 shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Descarregar PDF Oficial de Propinas</span>
              </button>
            </div>

            {/* Ranking of Classes Table */}
            <div className="space-y-3">
              <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Ranking das Classes com Maior Arrecadação de Propinas
              </h5>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                      <th className="py-2.5 px-4 text-center">Posição</th>
                      <th className="py-2.5 px-4">Classe</th>
                      <th className="py-2.5 px-4 text-center">Total Alunos</th>
                      <th className="py-2.5 px-4 text-right">Total Arrecadado</th>
                      <th className="py-2.5 px-4 text-right">Dívida Pendente</th>
                      <th className="py-2.5 px-4 text-center">Taxa de Adimplência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(() => {
                      const classesList = getAvailableClasses();
                      const summaries = classesList.map(cls => {
                        const clsRecords = selectedTrimesterRecords.filter(r => r.class && cleanClassStr(r.class) === cls);
                        let arrec = 0;
                        let div = 0;
                        clsRecords.forEach(r => { arrec += r.totalPago; div += r.totalDivida; });
                        const prev = arrec + div;
                        const taxa = prev > 0 ? (arrec / prev) * 100 : 100;
                        return { className: `${cls}ª Classe`, totalAlunos: clsRecords.length, arrec, div, taxa: Math.round(taxa * 10) / 10 };
                      }).filter(c => c.totalAlunos > 0);

                      summaries.sort((a, b) => b.arrec - a.arrec);

                      if (summaries.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-slate-400 font-medium italic">
                              Nenhuma turma cadastrada com alunos no sistema para este subsistema.
                            </td>
                          </tr>
                        );
                      }

                      return summaries.map((c, idx) => (
                        <tr key={c.className} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-4 text-center font-extrabold font-mono text-indigo-700">
                            #{idx + 1}º
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">{c.className}</td>
                          <td className="py-2.5 px-4 text-center font-mono">{c.totalAlunos}</td>
                          <td className="py-2.5 px-4 text-right font-extrabold text-emerald-600 font-mono">
                            {c.arrec.toLocaleString('pt-PT')} Kz
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-rose-600 font-mono">
                            {c.div.toLocaleString('pt-PT')} Kz
                          </td>
                          <td className="py-2.5 px-4 text-center font-black font-mono">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                              c.taxa >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {c.taxa}%
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Turmas com e sem divida */}
            <div className="space-y-3 pt-2">
              <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Classificação de Turmas Sem Dívida (100% Adimplentes) vs Com Pendências
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 border border-emerald-200 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs uppercase">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Turmas 100% Sem Dívida (Adimplentes)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(() => {
                      const turmaMap = new Map<string, number>();
                      selectedTrimesterRecords.forEach(r => {
                        const key = `${r.class}ª Cl. - Turma ${r.section}`;
                        turmaMap.set(key, (turmaMap.get(key) || 0) + r.totalDivida);
                      });
                      const cleanTurmas = Array.from(turmaMap.entries()).filter(([_, div]) => div === 0);
                      if (cleanTurmas.length === 0) {
                        return <span className="text-xs text-slate-400 italic">Nenhuma turma 100% livre de dívidas no momento.</span>;
                      }
                      return cleanTurmas.map(([tName]) => (
                        <span key={tName} className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-lg border border-emerald-300">
                          {tName}
                        </span>
                      ));
                    })()}
                  </div>
                </div>

                <div className="bg-rose-50/50 border border-rose-200 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs uppercase">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Turmas Com Dívida Pendente</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(() => {
                      const turmaMap = new Map<string, number>();
                      selectedTrimesterRecords.forEach(r => {
                        const key = `${r.class}ª Cl. - Turma ${r.section}`;
                        turmaMap.set(key, (turmaMap.get(key) || 0) + r.totalDivida);
                      });
                      const debtTurmas = Array.from(turmaMap.entries()).filter(([_, div]) => div > 0);
                      return debtTurmas.map(([tName, div]) => (
                        <span key={tName} className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-lg border border-rose-300 flex items-center gap-1">
                          <span>{tName}</span>
                          <span className="font-mono text-rose-950 font-bold">({div.toLocaleString('pt-PT')} Kz)</span>
                        </span>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B: ATTENDANCE & ABSENCES REPORT */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <span>2. Assiduidade & Relatório de Faltas Escolares ({typeof selectedTrimester === 'number' ? getTrimesterName(selectedTrimester) : 'Visão Global Anual'})</span>
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Estatísticas de faltas justificadas, não justificadas e lista de alunos sob acompanhamento pedagógico.
                </p>
              </div>

              <button
                type="button"
                onClick={() => generateAttendanceQuarterlyPDF(selectedTrimesterRecords, selectedTrimester, schoolSettings, subdirectorAdminName)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-rose-600/10 shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Descarregar PDF Oficial de Faltas</span>
              </button>
            </div>

            {/* Metric boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-xl text-center">
                <span className="text-[10px] font-black uppercase text-rose-500 font-mono tracking-widest block">Total Faltas Injustificadas</span>
                <span className="text-2xl font-black text-rose-700 font-mono">
                  {selectedTrimesterRecords.reduce((sum, r) => sum + (r.faltasInjustificadas || 0), 0)}
                </span>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl text-center">
                <span className="text-[10px] font-black uppercase text-emerald-600 font-mono tracking-widest block">Total Faltas Justificadas</span>
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {selectedTrimesterRecords.reduce((sum, r) => sum + (r.faltasJustificadas || 0), 0)}
                </span>
              </div>

              <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl text-center">
                <span className="text-[10px] font-black uppercase text-amber-600 font-mono tracking-widest block">Alunos em Nível Crítico (≥10 Faltas)</span>
                <span className="text-2xl font-black text-amber-800 font-mono">
                  {selectedTrimesterRecords.filter(r => (r.faltasInjustificadas || 0) >= 10).length}
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TRANSACIONAL MODAL: COBRANÇA DE PROPINA */}
      {selectedStudentId && activeStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-850 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-indigo-400 font-mono tracking-wider">Lançamento de Propina (Caixa)</span>
                <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{activeStudent.name} ({activeStudent.id})</span>
                </h3>
              </div>
              <span className="text-[10px] bg-slate-850 text-indigo-350 border border-slate-800 px-2.5 py-1 rounded-full font-bold">
                Período: {activeStudent.periodo}
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              
              {/* Row 1: Modalidade and Bolsa */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Modalidade de Pagamento
                  </label>
                  <select
                    value={modalidade}
                    onChange={(e) => setModalidade(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Regular">Regular (Normal)</option>
                    <option value="Parcial">Bolsa Parcial (Desconto)</option>
                    <option value="Integral">Bolsa Integral (Isento)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Percentagem Desconto / Bolsa
                  </label>
                  <select
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    disabled={modalidade !== 'Parcial'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {modalidade === 'Regular' ? (
                      <option value="0%">0% (Regular)</option>
                    ) : modalidade === 'Integral' ? (
                      <option value="100%">100% (Integral)</option>
                    ) : (
                      ["5%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%", "60%", "70%", "100%"].map(pct => (
                        <option key={pct} value={pct}>{pct}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Row 2: Select Months (Angola Calendar) */}
              <div className="space-y-1.5">
                <label className="block text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Selecione os Meses para Liquidar
                </label>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto">
                  {MESES_ANGOLA.map((monthName, idx) => {
                    const alreadyPaid = activeStudent.mesesPagos[idx];
                    const isLate = isMonthOverdue(idx) && modalidade === 'Regular';

                    return (
                      <label 
                        key={idx} 
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          alreadyPaid 
                            ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60 cursor-not-allowed'
                            : selectedMonths[idx]
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold'
                            : 'bg-white hover:bg-slate-100/50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={alreadyPaid}
                          checked={alreadyPaid || selectedMonths[idx]}
                          onChange={() => {
                            const next = [...selectedMonths];
                            next[idx] = !next[idx];
                            setSelectedMonths(next);
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="min-w-0">
                          <span className="block font-medium truncate">{monthName}</span>
                          {isLate && !alreadyPaid && (
                            <span className="block text-[8px] font-extrabold text-rose-500 uppercase leading-none mt-0.5">
                              +2.000,00 Kz Multa
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: Observações */}
              <div>
                <label className="block text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Observações de Caixa
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Introduza notas administrativas de registo do caixa..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Row 4: Real-time Live Calculations Pane */}
              <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-850 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Meses selecionados:</span>
                  <span className="font-bold text-slate-200">{monthsCount} / 11</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Propina Líquida:</span>
                  <span className="font-bold text-slate-200">{tuitionNet.toLocaleString('pt-PT')} Kz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Multas acumuladas:</span>
                  <span className="font-bold text-rose-450">{totalFine.toLocaleString('pt-PT')} Kz</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 text-xs font-bold text-indigo-400">
                  <span>TOTAL A PAGAR:</span>
                  <span className="text-yellow-400 text-sm">{totalDue.toLocaleString('pt-PT')} Kz</span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-150 px-5 py-3 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-750 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wide cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="bg-indigo-650 hover:bg-indigo-750 bg-indigo-600 text-white font-bold px-5 py-2 rounded-xl text-xs uppercase tracking-wide flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirmar Pagamento</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT / LOG POPUP */}
      {receiptData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md my-auto max-h-[95vh] shadow-xl overflow-hidden flex flex-col">
            
            <div className="bg-indigo-900 text-white px-5 py-4 flex items-center justify-between border-b border-indigo-950 shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-300" />
                <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider">Recibo de Propina - SiGeP</h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="text-indigo-200 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Printable Wrapper */}
            <div id="printable-receipt-card" className="p-6 space-y-6 bg-white text-slate-950 text-xs font-mono select-all overflow-y-auto flex-1">
              
              <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
                <span className="block font-bold text-sm uppercase tracking-tight">SISTEMA INTEGRADO DE GESTÃO PEDAGÓGICA</span>
                <span className="block text-[9.5px] text-slate-500">COPIADORA OFFLINE • Angola</span>
                <span className="block text-[9.5px] font-bold mt-1 uppercase text-slate-600">REGISTO DE ENTRADA FINANCEIRA</span>
              </div>

              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Recibo No:</span>
                  <span className="font-bold">RCP-{Math.floor(Math.random() * 90000) + 10000}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data/Hora:</span>
                  <span>{receiptData.date} - {receiptData.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estudante ID:</span>
                  <span className="font-bold text-indigo-900">{receiptData.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nome:</span>
                  <span className="font-bold text-right truncate max-w-[200px]">{receiptData.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Classe/Turma:</span>
                  <span>{receiptData.class}ª Classe - T.{receiptData.section} ({receiptData.periodo})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Modalidade:</span>
                  <span>{receiptData.modalidade} ({receiptData.desconto})</span>
                </div>
              </div>

              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-4">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Descrição</span>
                  <span>Montante</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Meses: {receiptData.intervaloText}</span>
                  <span>{receiptData.tuitionNet.toLocaleString('pt-PT')} Kz</span>
                </div>
                {receiptData.totalFine > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Multas por Atraso:</span>
                    <span>+{receiptData.totalFine.toLocaleString('pt-PT')} Kz</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="font-bold text-indigo-950">TOTAL PAGO:</span>
                <span className="font-extrabold text-sm text-indigo-900">{receiptData.totalDue.toLocaleString('pt-PT')} Kz</span>
              </div>

              <div className="text-center pt-2 space-y-4">
                <span className="block text-[8px] text-slate-450 uppercase leading-snug">
                  Assinatura do Caixa / Validação Digital<br />
                  {receiptData.operator}
                </span>
                <div className="border-t border-dashed border-slate-200 w-32 mx-auto pt-1"></div>
              </div>

            </div>

            {/* Receipt Footer Actions */}
            <div className="bg-slate-50 border-t border-slate-150 px-5 py-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wide flex items-center gap-1.5 cursor-pointer shadow-3xs"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Recibo</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wide cursor-pointer"
              >
                Concluir
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE AUTORIZAÇÃO DO SUBDIRECTOR ADMINISTRATIVO */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="sda-auth-modal">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-indigo-700">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Lock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-850">Autorização Requerida</h4>
                <p className="text-[10px] text-slate-500">Apenas o Subdirector Administrativo pode autorizar esta alteração.</p>
              </div>
            </div>

            {authError && (
              <div className="bg-rose-50 border border-rose-150 text-rose-850 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 leading-snug">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">ID do Subdirector Administrativo</label>
                <input
                  type="text"
                  placeholder="Ex: SDA-2025"
                  value={authId}
                  onChange={(e) => setAuthId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-850 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Senha de Acesso</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-850 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="text-[9.5px] text-slate-500 bg-slate-50 p-2.5 rounded-lg leading-relaxed">
              <strong>Nota Provisória:</strong> Se não tiver cadastrado um subdirector administrativo no RH, utilize as credenciais padrão de demonstração:<br />
              ID: <span className="font-mono font-bold text-indigo-650">SDA123</span> | Senha: <span className="font-mono font-bold text-indigo-650">admin</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAuth}
                className="w-full bg-indigo-650 hover:bg-indigo-750 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Autorizar & Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GESTÃO DE FALTA (LANÇAR, JUSTIFICAR OU PAGAR) */}
      {selectedFaltaStudent && faltaActionType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="falta-action-modal">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between ${
              faltaActionType === 'LANÇAR' ? 'bg-rose-50 text-rose-800' :
              faltaActionType === 'JUSTIFICAR' ? 'bg-emerald-50 text-emerald-800' :
              'bg-amber-50 text-amber-800'
            }`}>
              <div className="flex items-center gap-2">
                {faltaActionType === 'LANÇAR' && <AlertCircle className="w-5 h-5 text-rose-600 animate-pulse" />}
                {faltaActionType === 'JUSTIFICAR' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                {faltaActionType === 'PAGAR' && <DollarSign className="w-5 h-5 text-amber-600" />}
                <h3 className="font-heading font-extrabold text-xs uppercase tracking-wider">
                  {faltaActionType === 'LANÇAR' && 'Lançar Falta Injustificada'}
                  {faltaActionType === 'JUSTIFICAR' && 'Justificar Faltas'}
                  {faltaActionType === 'PAGAR' && 'Efectuar Pagamento de Faltas'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFaltaActionType(null);
                  setSelectedFaltaStudent(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold font-mono"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              
              {/* Informações Aluno */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs text-slate-700 space-y-1">
                <div>Aluno: <strong className="text-slate-900 font-extrabold">{selectedFaltaStudent.name}</strong></div>
                <div className="flex justify-between font-mono font-bold text-[10px] text-slate-500">
                  <span>ID: {selectedFaltaStudent.id}</span>
                  <span>Classe/Turma: {selectedFaltaStudent.class}ª Classe - {selectedFaltaStudent.section}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                  <div className="p-1 bg-rose-50 rounded border border-rose-100 text-rose-700">
                    <div>Injustificadas</div>
                    <div className="text-sm font-extrabold">{selectedFaltaStudent.faltasInjustificadas || 0}</div>
                  </div>
                  <div className="p-1 bg-emerald-50 rounded border border-emerald-100 text-emerald-700">
                    <div>Justificadas</div>
                    <div className="text-sm font-extrabold">{selectedFaltaStudent.faltasJustificadas || 0}</div>
                  </div>
                  <div className="p-1 bg-amber-50 rounded border border-amber-100 text-amber-700">
                    <div>Pagas</div>
                    <div className="text-sm font-extrabold">{selectedFaltaStudent.faltasPagas || 0}</div>
                  </div>
                </div>
              </div>

              {/* Quantidade a Lançar / Justificar / Pagar */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  {faltaActionType === 'LANÇAR' && 'Quantidade de Faltas a Lançar'}
                  {faltaActionType === 'JUSTIFICAR' && 'Quantidade de Faltas a Justificar'}
                  {faltaActionType === 'PAGAR' && 'Quantidade de Faltas a Pagar'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={faltaActionType === 'LANÇAR' ? undefined : (selectedFaltaStudent.faltasInjustificadas || 0)}
                  value={faltaQuantity}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    if (faltaActionType !== 'LANÇAR') {
                      setFaltaQuantity(Math.min(val, selectedFaltaStudent.faltasInjustificadas || 0));
                    } else {
                      setFaltaQuantity(val);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-850 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
                {faltaActionType !== 'LANÇAR' && (
                  <span className="text-[9.5px] text-slate-450 mt-1 block">
                    Máximo disponível: {selectedFaltaStudent.faltasInjustificadas || 0} faltas injustificadas.
                  </span>
                )}
              </div>

              {/* Observação / Motivo */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Observações / Justificativo / Detalhes
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    faltaActionType === 'LANÇAR' ? 'Ex: Falta na prova trimestral ou ausência injustificada' :
                    faltaActionType === 'JUSTIFICAR' ? 'Ex: Apresentou atestado médico' :
                    'Ex: Pagamento efectuado via depósito bancário'
                  }
                  value={faltaObservation}
                  onChange={(e) => setFaltaObservation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-850 focus:bg-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Se for pagar, mostra custo total */}
              {faltaActionType === 'PAGAR' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900 animate-fadeIn">
                  <div className="space-y-0.5">
                    <span className="block font-bold">Resumo Financeiro:</span>
                    <span className="block text-[10px] text-amber-700">Custo unitário: {vFalta.toLocaleString('pt-PT')} Kz por falta</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase font-bold text-amber-700 font-mono tracking-wider">Total a Pagar</span>
                    <span className="block text-sm font-extrabold text-amber-950 font-mono">
                      {(faltaQuantity * vFalta).toLocaleString('pt-PT')} Kz
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-150 px-5 py-3.5 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFaltaActionType(null);
                  setSelectedFaltaStudent(null);
                }}
                className="bg-white hover:bg-slate-100 text-slate-600 font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wide border border-slate-200 cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmFaltaAction}
                className={`text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wide cursor-pointer transition-colors shadow-3xs ${
                  faltaActionType === 'LANÇAR' ? 'bg-rose-600 hover:bg-rose-750' :
                  faltaActionType === 'JUSTIFICAR' ? 'bg-emerald-600 hover:bg-emerald-750' :
                  'bg-amber-600 hover:bg-amber-750'
                }`}
              >
                Confirmar Registo
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DO CALENDÁRIO MENSAL DE FALTAS */}
      {calendarStudentModal && (
        <CalendarioFaltasModal
          student={calendarStudentModal}
          onClose={() => setCalendarStudentModal(null)}
          canEdit={canEdit}
          allowJustify={!isAbsenceOnlyCoordinator}
          onSave={(updatedStudent) => {
            const updatedList = financeRecords.map(r => r.id === updatedStudent.id ? updatedStudent : r);
            setFinanceRecords(updatedList);
            savePropinas(updatedList);
            setCalendarStudentModal(null);
            setSuccessAlert(`Assiduidade e lançamentos no calendário de ${updatedStudent.name} foram atualizados com sucesso!`);
            setTimeout(() => setSuccessAlert(null), 3000);
          }}
        />
      )}

    </div>
  );
}
