/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Student, UserRole, SchoolSettings, Staff, getStudentSpecialty } from '../types';
import { Printer, Search, Users, Eye, HelpCircle, FileText, CheckCircle2, Download } from 'lucide-react';
import { getSectionsList } from '../utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper para cálculo e exibição rigorosa da idade do aluno
export function getStudentAgeFormatted(student: any): string {
  if (typeof student?.age === 'number' && !isNaN(student.age) && student.age > 0) {
    return `${student.age}a`;
  }
  
  const rawDate = student?.birthDate || student?.birth_date;
  if (!rawDate) return '-';
  
  let birth: Date | null = null;
  if (typeof rawDate === 'string') {
    const cleanDate = rawDate.trim().split('T')[0];
    if (cleanDate.includes('-')) {
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        birth = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    } else if (cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      if (parts.length === 3) {
        birth = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
  } else if (rawDate instanceof Date) {
    birth = rawDate;
  }

  if (!birth || isNaN(birth.getTime())) return '-';

  const today = new Date();
  let calculatedAge = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    calculatedAge--;
  }

  return (calculatedAge >= 0 && calculatedAge < 120) ? `${calculatedAge}a` : '-';
}

interface RelacaoNominalProps {
  students: Student[];
  currentClass: string;
  currentSection: string;
  userRole?: UserRole;
  schoolSettings?: SchoolSettings;
  loggedInStaff?: Staff | null;
  staffList?: Staff[];
  activeModality: 'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO';
}

export default function RelacaoNominal({ 
  students, 
  currentClass, 
  currentSection,
  userRole = 'SUB_DIRECTOR_PEDAGOGICO',
  schoolSettings,
  loggedInStaff = null,
  staffList = [],
  activeModality = 'ENSINO_PRIMARIO'
}: RelacaoNominalProps) {
  // Map dynamic Magistério specialty names to official short codes
  const mapMagisterioNameToCode = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('matemática') || lower.includes('matematica')) return 'MF';
    if (lower.includes('história') || lower.includes('historia')) return 'GH';
    if (lower.includes('biologia')) return 'BQ';
    if (lower.includes('português') || lower.includes('portugues')) return 'LEMC';
    if (lower.includes('inglês') || lower.includes('ingles')) return 'ING_EMC';
    if (lower.includes('francês') || lower.includes('frances')) return 'FRA_EMC';
    if (lower.includes('visual') || lower.includes('plástica')) return 'EVP';
    if (lower.includes('física') || lower.includes('fisica')) return 'EDF';
    if (lower.includes('moral') || lower.includes('cívica')) return 'EMC';
    if (lower.includes('primário') || lower.includes('primario')) return 'EP';
    if (lower.includes('pré-escolar') || lower.includes('pre-escolar')) return 'PE';
    return name;
  };

  // Dynamic specialties loaded from Configurações / localStorage
  const punivSpecialties = useMemo(() => {
    try {
      const saved = localStorage.getItem('sigep_grelha_liceu_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(item => ({
            value: item.id.toUpperCase(),
            label: item.nome
          }));
        }
      }
    } catch (e) {
      console.error("Erro ao ler especialidades de PUNIV do localStorage:", e);
    }
    return [
      { value: 'CFB', label: 'Ciências Físicas e Biológicas (CFB)' },
      { value: 'CEJ', label: 'Ciências Económico-Jurídicas (CEJ)' },
      { value: 'CS', label: 'Ciências Sociais (CS)' },
      { value: 'AV', label: 'Artes Visuais (AV)' },
    ];
  }, []);

  const magisterioSpecialties = useMemo(() => {
    try {
      const saved = localStorage.getItem('sigep_magisterio_curriculo_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.especialidades) {
          return Object.keys(parsed.especialidades).map(key => ({
            value: mapMagisterioNameToCode(key),
            label: key
          }));
        }
      }
    } catch (e) {
      console.error("Erro ao ler especialidades do Magistério do localStorage:", e);
    }
    return [
      { value: 'MF', label: 'Matemática e Física (Mat-Fisica)' },
      { value: 'GH', label: 'História e Geografia (Geo-Historia)' },
      { value: 'BQ', label: 'Biologia e Química (Bio-química)' },
      { value: 'LEMC', label: 'Português e EMC' },
      { value: 'ING_EMC', label: 'Inglês e EMC' },
      { value: 'FRA_EMC', label: 'Francês e EMC' },
      { value: 'EVP', label: 'Educação Visual e Plástica (EVP)' },
      { value: 'EDF', label: 'Educação Física (Ed.F)' },
      { value: 'EMC', label: 'Educação Moral e Cívica (EMC)' },
      { value: 'EP', label: 'Ensino Primário' },
      { value: 'PE', label: 'Pré-Escolar' },
    ];
  }, []);

  // Local active filters to override or follow parent selections
  const [localSubsystem, setLocalSubsystem] = useState<string>(() => {
    if (activeModality === 'ENSINO_PRIMARIO') {
      const classNum = parseInt(currentClass, 10);
      if (classNum >= 7 && classNum <= 9) return 'I_CICLO';
      return 'ENSINO_PRIMARIO';
    }
    return activeModality;
  });
  const [localClass, setLocalClass] = useState<string>(currentClass);
  const [localSection, setLocalSection] = useState<string>(currentSection);
  const [localSpecialty, setLocalSpecialty] = useState<string>(() => {
    if (activeModality === 'PUNIV') return punivSpecialties[0]?.value || 'CFB';
    if (activeModality === 'MAGISTERIO') return magisterioSpecialties[0]?.value || 'MF';
    return 'CFB';
  });
  const [localLanguage, setLocalLanguage] = useState<string>('QUALQUER');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Custom metadata fields for standard Angolan print layouts
  const [classroom, setClassroom] = useState<string>('Sala 12');
  const [shift, setShift] = useState<string>('Manhã / Diurno');
  const [teacher, setTeacher] = useState<string>('Coordenador Indisponível');
  const [directorDocente, setDirectorDocente] = useState<string>('Dr. Adelino Ngola');

  // Load actual staff list from props or localStorage
  const actualStaffList = useMemo<Staff[]>(() => {
    if (staffList && staffList.length > 0) return staffList;
    try {
      const saved = localStorage.getItem('sigep_staff_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Erro ao carregar RH em RelacaoNominal:", e);
    }
    return [];
  }, [staffList]);

  // Find all coordinators registered in RH
  const rhCoordinators = useMemo(() => {
    return actualStaffList.filter(s => 
      s.role === 'COORDENADOR_TURNO' || 
      s.tipoCoordenacao === 'TURNO' || 
      s.role === 'COORDENADOR' ||
      (s.role as string) === 'COORDENADOR_DISCIPLINA'
    );
  }, [actualStaffList]);

  // Sync Shift Coordinator (teacher) with RH data
  React.useEffect(() => {
    if (rhCoordinators.length > 0) {
      // 1. If logged in user is a coordinator, auto-assign
      if (loggedInStaff && (loggedInStaff.role === 'COORDENADOR_TURNO' || loggedInStaff.role === 'COORDENADOR' || loggedInStaff.tipoCoordenacao === 'TURNO')) {
        setTeacher(loggedInStaff.name);
        return;
      }
      // 2. Try to match shift coordinator by shift name
      const shiftLower = shift.toLowerCase();
      const match = rhCoordinators.find(c => c.turnoCoordenado && shiftLower.includes(c.turnoCoordenado.toLowerCase())) || rhCoordinators[0];
      if (match) {
        setTeacher(match.name);
        return;
      }
    }
    // 3. Fallback if no coordinator exists in RH
    setTeacher('Coordenador Indisponível');
  }, [rhCoordinators, shift, loggedInStaff]);

  // Pre-initialize filters for professor role
  React.useEffect(() => {
    if (loggedInStaff && loggedInStaff.role === 'PROFESSOR') {
      const assignedClasses = loggedInStaff.classes || [];
      const assignedSections = loggedInStaff.sections || [];
      if (assignedClasses.length > 0 && !assignedClasses.includes(localClass)) {
        setLocalClass(assignedClasses[0]);
      }
      if (assignedSections.length > 0 && !assignedSections.includes(localSection)) {
        setLocalSection(assignedSections[0]);
      }
    }
  }, [loggedInStaff?.id]);

  // Sync with schoolSettings when it changes
  React.useEffect(() => {
    if (schoolSettings) {
      setDirectorDocente(schoolSettings.directorName);
    }
  }, [schoolSettings?.directorName]);

  // Active view model: 'work' (normal UI) vs 'print' (clean sheet layout)
  const [viewMode, setViewMode] = useState<'work' | 'print'>('work');

  // Sync state strictly with menu selection (activeModality and currentClass)
  React.useEffect(() => {
    setLocalClass(currentClass);
    if (activeModality === 'ENSINO_PRIMARIO') {
      const classNum = parseInt(currentClass, 10);
      if (classNum >= 7 && classNum <= 9) {
        setLocalSubsystem('I_CICLO');
      } else {
        setLocalSubsystem('ENSINO_PRIMARIO');
      }
    } else {
      setLocalSubsystem(activeModality);
    }
  }, [activeModality, currentClass]);

  React.useEffect(() => {
    setLocalSection(currentSection);
  }, [currentSection]);

  // Sync specialty default value when subsystem changes
  React.useEffect(() => {
    if (localSubsystem === 'PUNIV') {
      if (punivSpecialties.length > 0) {
        setLocalSpecialty(punivSpecialties[0].value);
      }
    } else if (localSubsystem === 'MAGISTERIO') {
      if (magisterioSpecialties.length > 0) {
        setLocalSpecialty(magisterioSpecialties[0].value);
      }
    }
  }, [localSubsystem, punivSpecialties, magisterioSpecialties]);

  const specialtyNames = useMemo(() => {
    const names: Record<string, string> = {};
    punivSpecialties.forEach(s => { names[s.value] = s.label; });
    magisterioSpecialties.forEach(s => { names[s.value] = s.label; });
    return names;
  }, [punivSpecialties, magisterioSpecialties]);

  // Derived filtered students
  const filteredStudents = useMemo(() => {
    return students
      .filter(s => {
        // Class check
        const matchesClass = s.class === localClass;
        
        // Section/Turma check
        const matchesSection = s.section === localSection;
        
        // Search query check
        const matchesSearch = searchQuery.trim() === '' || 
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.id.toLowerCase().includes(searchQuery.toLowerCase());
          
        // Specialty check (only for IIº Ciclo - PUNIV or Magistério)
        let matchesSpecialty = true;
        if (localSubsystem === 'PUNIV' || localSubsystem === 'MAGISTERIO') {
          const sSpec = getStudentSpecialty(s);
          matchesSpecialty = sSpec === localSpecialty;
        }

        // Foreign language check (for Iº Ciclo / PUNIV - 7ª, 8ª, 9ª classes, etc.)
        let matchesLanguage = true;
        if ((localSubsystem === 'I_CICLO' || localSubsystem === 'PUNIV' || parseInt(localClass, 10) >= 7) && localLanguage !== 'QUALQUER' && localSubsystem !== 'MAGISTERIO') {
          const sLang = s.foreignLanguage || 'INGLÊS';
          matchesLanguage = sLang === localLanguage;
        }

        return matchesClass && matchesSection && matchesSearch && matchesSpecialty && matchesLanguage;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, localClass, localSection, searchQuery, localSubsystem, localSpecialty, localLanguage]);

  const countM = filteredStudents.filter(s => s.gender === 'M').length;
  const countF = filteredStudents.filter(s => s.gender === 'F').length;

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const schoolName = schoolSettings?.schoolName || 'COMPLEXO ESCOLAR Nº 1709 LNO';
      const academicYear = schoolSettings?.academicYear || '2025/2026';
      const directorLabel = schoolSettings?.directorRoleLabel || 'Assessor Pedagógico / Director';

      // 1. School Logo / Insignia at the top center
      const logoUrl = schoolSettings?.logoType === 'PUBLIC' ? schoolSettings?.publicLogoUrl : schoolSettings?.privateLogoUrl;
      let emblemAdded = false;
      let currentY = 10;

      if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
        try {
          let format = 'PNG';
          if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) format = 'JPEG';
          else if (logoUrl.includes('image/gif')) format = 'GIF';
          doc.addImage(logoUrl, format, 97.5, currentY, 15, 15);
          emblemAdded = true;
          currentY += 18;
        } catch (err) {
          console.error("Erro ao adicionar logotipo ao PDF:", err);
        }
      }

      if (!emblemAdded) {
        // Geometric coat of arms / emblem fallback
        doc.setDrawColor(217, 119, 6);
        doc.setFillColor(254, 243, 199);
        doc.circle(105, currentY + 6, 6, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(180, 83, 9);
        doc.text("SIGEP", 105, currentY + 7.5, { align: 'center' });
        currentY += 15;
      }

      // Header lines
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);

      if (schoolSettings?.headerLine1Active !== false) {
        doc.text(schoolSettings?.headerLine1 || 'REPÚBLICA DE ANGOLA', 105, currentY, { align: 'center' });
        currentY += 4.5;
      }
      if (schoolSettings?.headerLine2Active !== false) {
        doc.setFontSize(8.5);
        doc.text(schoolSettings?.headerLine2 || 'MINISTÉRIO DA EDUCAÇÃO', 105, currentY, { align: 'center' });
        currentY += 4.5;
      }
      if (schoolSettings?.headerLine3Active !== false) {
        doc.setFontSize(8);
        doc.text(schoolSettings?.headerLine3 || `GOVERNO PROVINCIAL DE ${(schoolSettings?.province || 'LUNDA NORTE').toUpperCase()}`, 105, currentY, { align: 'center' });
        currentY += 4.5;
      }
      if (schoolSettings?.headerLine4Active !== false) {
        doc.setFontSize(8);
        doc.text(schoolSettings?.headerLine4 || `ADMINISTRAÇÃO MUNICIPAL DE ${(schoolSettings?.municipality || 'Cafunfo').toUpperCase()}`, 105, currentY, { align: 'center' });
        currentY += 4.5;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(20, 20, 20);
      doc.text(schoolName.toUpperCase(), 105, currentY + 1, { align: 'center' });
      currentY += 7;

      // Divider line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.4);
      doc.line(20, currentY, 190, currentY);
      currentY += 6;

      // Document Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("RELAÇÃO NOMINAL", 105, currentY, { align: 'center' });
      currentY += 5.5;

      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`${localClass}ª CLASSE • TURMA ${localSection}`, 105, currentY, { align: 'center' });
      currentY += 4.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Ano Lectivo: ${academicYear}`, 105, currentY, { align: 'center' });
      currentY += 6;

      // Subsystem & Details box info
      let subsysText = 'Ensino Primário';
      if (localSubsystem === 'I_CICLO' || localSubsystem === 'PUNIV') subsysText = 'Liceu';
      else if (localSubsystem === 'MAGISTERIO') subsysText = 'Magistério';

      const specText = (localSubsystem === 'PUNIV' || localSubsystem === 'MAGISTERIO')
        ? (specialtyNames[localSpecialty] || localSpecialty)
        : (localSubsystem === 'I_CICLO' && localLanguage !== 'QUALQUER' ? `Língua: ${localLanguage}` : 'Geral');

      // Summary Table / Metadata Box
      autoTable(doc, {
        startY: currentY,
        head: [["SUBSISTEMA", "ESPECIALIDADE / OPÇÃO", "SALA / TURNO", "COORDENADOR DE TURNO", "TOTAL ALUNOS"]],
        body: [[
          subsysText,
          specText,
          `${classroom} (${shift})`,
          teacher,
          `${filteredStudents.length} (${countM}M / ${countF}F)`
        ]],
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          font: "helvetica",
          textColor: [40, 40, 40],
          halign: 'center'
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
          fontStyle: 'bold',
          fontSize: 7,
          halign: 'center'
        },
        margin: { left: 15, right: 15 }
      });

      // Students Table
      const finalY = (doc as any).lastAutoTable.finalY + 4;

      const tableColumns = ["Nº", "Nº PROCESSUAL", "NOME COMPRETO DO ESTUDANTE", "GÊNERO", "IDADE"];
      const tableRows = filteredStudents.map((st, idx) => [
        `${idx + 1}`,
        st.id || st.studentId || st.registrationId || '-',
        st.name.toUpperCase(),
        st.gender || '-',
        getStudentAgeFormatted(st)
      ]);

      autoTable(doc, {
        startY: finalY,
        head: [tableColumns],
        body: tableRows.length > 0 ? tableRows : [["-", "-", "Nenhum aluno localizado para este critério", "-", "-"]],
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2.2,
          font: "helvetica",
          textColor: [30, 41, 59]
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
          1: { halign: 'center', cellWidth: 32, fontStyle: 'bold' },
          2: { halign: 'left' },
          3: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
          4: { halign: 'center', cellWidth: 18 }
        },
        margin: { left: 15, right: 15 }
      });

      // Signatures & Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      let sigY = (doc as any).lastAutoTable.finalY + 14;

      if (sigY > pageHeight - 38) {
        doc.addPage();
        sigY = 25;
      }

      // Single Signature: Director da Escola (Centered)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(directorLabel, 105, sigY, { align: 'center' });

      // Signature Line
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.4);
      doc.line(70, sigY + 7, 140, sigY + 7);

      // Name BELOW the signature line
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(directorDocente, 105, sigY + 12, { align: 'center' });

      // Footer note on all pages
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("Documento gerado automaticamente pelo Sistema Integrado de Gestão Escolar Profissional  (SiGeP)", 15, pageHeight - 8);
        doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-AO')} • Página ${p} de ${totalPages}`, 195 - 15, pageHeight - 8, { align: 'right' });
      }

      const fileName = `Relacao_Nominal_${localClass}aClasse_Turma_${localSection}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Erro ao gerar PDF da Relação Nominal:", err);
      alert("Ocorreu um erro ao gerar o PDF da Relação Nominal.");
    }
  };

  // Intercepta Ctrl+P (ou Cmd+P) no teclado para exportar em PDF
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleExportPDF();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [filteredStudents, localClass, localSection, teacher, directorDocente, schoolSettings, classroom, shift, localSubsystem, localSpecialty]);

  const handleSubsystemChange = (subsys: string) => {
    setLocalSubsystem(subsys);
    if (subsys === 'ENSINO_PRIMARIO') {
      setLocalClass('1');
    } else if (subsys === 'I_CICLO') {
      setLocalClass('7');
      setLocalLanguage('QUALQUER');
    } else if (subsys === 'PUNIV') {
      setLocalClass('10');
      if (punivSpecialties.length > 0) {
        setLocalSpecialty(punivSpecialties[0].value);
      }
    } else if (subsys === 'MAGISTERIO') {
      setLocalClass('10');
      if (magisterioSpecialties.length > 0) {
        setLocalSpecialty(magisterioSpecialties[0].value);
      }
    }
  };

  const getSubsystemClasses = () => {
    if (loggedInStaff && loggedInStaff.role === 'PROFESSOR') {
      return loggedInStaff.classes || [];
    }
    if (localSubsystem === 'ENSINO_PRIMARIO') return ['1', '2', '3', '4', '5', '6'];
    if (localSubsystem === 'I_CICLO') return ['7', '8', '9'];
    if (localSubsystem === 'PUNIV') return ['10', '11', '12'];
    if (localSubsystem === 'MAGISTERIO') return ['10', '11', '12', '13'];
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
  };

  const sectionsList = loggedInStaff && loggedInStaff.role === 'PROFESSOR'
    ? (loggedInStaff.sections || [])
    : (() => {
        const modality = (localSubsystem === 'ENSINO_PRIMARIO' || localSubsystem === 'I_CICLO')
          ? 'ENSINO_PRIMARIO'
          : (localSubsystem === 'PUNIV' ? 'PUNIV' : 'MAGISTERIO');
        return getSectionsList(modality, localSpecialty);
      })();

  React.useEffect(() => {
    if (sectionsList.length > 0 && !sectionsList.includes(localSection)) {
      setLocalSection(sectionsList[0]);
    }
  }, [sectionsList, localSection]);

  return (
    <div id="relacao-nominal-parent" className="space-y-6">
      
      {/* Informative Banner */}
      {viewMode === 'work' && (
        <div id="rn-info-banner" className="bg-indigo-50 border border-indigo-150 p-4 rounded-2xl flex items-start gap-3.5 shadow-2xs">
          <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-indigo-950 flex-1">
            <span className="font-bold uppercase tracking-wider block mb-0.5">Módulo de Impressão Oficial:</span>
            Esta é a secção de <strong>Relações Nominais Prontas</strong>. Escolha o curso, a especialidade (para o IIº Ciclo), a língua estrangeira (para o Iº Ciclo), a classe e a turma abaixo para carregar todos os registos matriculados. Pode preencher informações estéticas de rodapé e cabeçalho, acionar a <strong>Versão de Impressão</strong> para remover as grelhas administrativas, e utilizar o botão <strong>Exportar PDF</strong> (ou o atalho <code>Ctrl + P</code>) para exportar e imprimir a partir do navegador.
          </div>
        </div>
      )}

      {/* Control Actions & Filter panel */}
      {viewMode === 'work' && (
        <div id="rn-filter-panel" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm font-heading">Filtros de Geração da Relação Nominal</h3>
              <p className="text-xs text-slate-400 mt-0.5">Determine os critérios para carregar e preencher os alunos matriculados</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                id="btn-toggle-print-mode"
                type="button"
                onClick={() => setViewMode('print')}
                className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2 cursor-pointer shadow-px"
                title="Ver layout limpo para imprimir"
              >
                <Eye className="w-4 h-4" />
                <span>Visualizar Impressão</span>
              </button>
              
              <button
                id="btn-direct-hardware-print"
                type="button"
                onClick={handleExportPDF}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 border border-indigo-700 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Exportar PDF (Ctrl + P)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Subsistema Selector */}
            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-1.5 font-heading">SUBSISTEMA</label>
              <select
                value={localSubsystem}
                onChange={(e) => handleSubsystemChange(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-700"
              >
                {activeModality === 'ENSINO_PRIMARIO' && schoolSettings?.activeComponents?.ENSINO_PRIMARIO !== false && (
                  <>
                    <option value="ENSINO_PRIMARIO">Ensino Primário</option>
                    <option value="I_CICLO">Liceu</option>
                  </>
                )}
                {activeModality === 'PUNIV' && schoolSettings?.activeComponents?.PUNIV !== false && (
                  <option value="PUNIV">Liceu</option>
                )}
                {activeModality === 'MAGISTERIO' && schoolSettings?.activeComponents?.MAGISTERIO !== false && (
                  <option value="MAGISTERIO">Magistério</option>
                )}
              </select>
            </div>

            {/* Specialty Selector (only for IIº Ciclo) */}
            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-heading">
                Especialidade {(localSubsystem === 'PUNIV' || localSubsystem === 'MAGISTERIO') ? '✅' : '🚫 (IIº Ciclo)'}
              </label>
              <select
                value={localSpecialty}
                onChange={(e) => setLocalSpecialty(e.target.value)}
                disabled={localSubsystem !== 'PUNIV' && localSubsystem !== 'MAGISTERIO'}
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {localSubsystem === 'PUNIV' ? (
                  <>
                    {punivSpecialties.map(spec => (
                      <option key={spec.value} value={spec.value}>{spec.label}</option>
                    ))}
                  </>
                ) : localSubsystem === 'MAGISTERIO' ? (
                  <>
                    {magisterioSpecialties.map(spec => (
                      <option key={spec.value} value={spec.value}>{spec.label}</option>
                    ))}
                  </>
                ) : (
                  <option value="">Não Aplicável (Ensino Geral)</option>
                )}
              </select>
            </div>

            {/* Foreign Language Selector (only for Iº Ciclo 7ª-9ª) */}
            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-heading">
                Língua Estrangeira {localSubsystem === 'I_CICLO' ? '✅' : '🚫 (7ª a 9ª Classe)'}
              </label>
              <select
                value={localLanguage}
                onChange={(e) => setLocalLanguage(e.target.value)}
                disabled={localSubsystem !== 'I_CICLO'}
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="QUALQUER">Qualquer / Geral</option>
                <option value="INGLÊS">Língua Inglesa</option>
                <option value="FRANCÊS">Língua Francesa</option>
              </select>
            </div>

            {/* Class Selector */}
            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-heading">Classe de Ensino</label>
              <select
                id="rn-local-class-selector"
                value={localClass}
                onChange={(e) => setLocalClass(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-700"
              >
                {getSubsystemClasses().map(cl => (
                  <option key={cl} value={cl}>{cl}ª Classe</option>
                ))}
              </select>
            </div>

            {/* Section Selector */}
            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-heading">Turma</label>
              <select
                id="rn-local-section-selector"
                value={localSection}
                onChange={(e) => setLocalSection(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-700"
              >
                {sectionsList.map(sec => (
                  <option key={sec} value={sec}>Turma {sec}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick search */}
            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-heading font-sans">Pesquisa Rápida</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  id="rn-search-input"
                  type="text"
                  placeholder="Pesquisar por ID ou Nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs font-medium w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-colors placeholder:text-slate-400 text-slate-700"
                />
              </div>
            </div>

            {/* Summary counters */}
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-around">
              <div className="text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase">MASCULINOS</p>
                <p className="text-sm font-bold text-slate-700 mt-0.5">{countM}</p>
              </div>
              <div className="w-px h-6 bg-slate-200"></div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase">FEMININOS</p>
                <p className="text-sm font-bold text-slate-705 mt-0.5">{countF}</p>
              </div>
              <div className="w-px h-6 bg-slate-200"></div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase">TOTAL LISTA</p>
                <p className="text-xs font-bold text-indigo-600 mt-0.5">{filteredStudents.length} ALUNOS</p>
              </div>
            </div>
          </div>

          {/* Institutional configuration for printout headers */}
          <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-150 border-dashed space-y-3">
            <h4 className="font-semibold text-xs text-slate-700">Configuração de Metadados Oficiais para Impressão</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Período / Turno</label>
                <input
                  type="text"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium w-full focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Sala de Aulas</label>
                <input
                  type="text"
                  value={classroom}
                  onChange={(e) => setClassroom(e.target.value)}
                  className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium w-full focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Coordenador de Turno</label>
                <div className="relative">
                  <input
                    type="text"
                    list="rh-coordinators-list"
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                    placeholder="Coordenador Indisponível"
                    className={`bg-white border px-2.5 py-1.5 rounded-lg text-xs font-medium w-full focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 ${
                      teacher === 'Coordenador Indisponível' ? 'text-amber-600 font-semibold border-amber-300' : 'text-slate-800 border-slate-200'
                    }`}
                  />
                  <datalist id="rh-coordinators-list">
                    {rhCoordinators.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name} {c.turnoCoordenado ? `(${c.turnoCoordenado})` : ''}
                      </option>
                    ))}
                    <option value="Coordenador Indisponível">Coordenador Indisponível</option>
                  </datalist>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">{schoolSettings?.directorRoleLabel || 'Assessor Pedagógico / Director'}</label>
                <input
                  type="text"
                  value={directorDocente}
                  onChange={(e) => setDirectorDocente(e.target.value)}
                  className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium w-full focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating control bar when inside Print Preview Mode */}
      {viewMode === 'print' && (
        <div id="print-floating-menu" className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl border border-slate-850 animate-bounceOnce print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-450">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Modo de Visualização para Impressão Ativado</p>
              <p className="text-[10px] text-slate-400">Layout limpo conforme directrizes institucionais angolanas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('work')}
              className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold text-xs px-3.5 py-1.5 rounded-xl cursor-pointer transition-colors"
            >
              Voltar ao Menu
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Exportar PDF (Ctrl + P)</span>
            </button>
          </div>
        </div>
      )}

      {/* Relação Nominal Document Sheet Card */}
      <div 
        id="relacao-nominal-impressao-card" 
        className={`bg-white rounded-2xl border border-slate-200 p-8 shadow-xs md:p-12 transition-all mx-auto ${
          viewMode === 'print' ? 'max-w-4xl border-3 border-double border-slate-300 m-2 font-serif' : ''
        }`}
      >
        {/* Core Institutional Header Block */}
        <div className="text-center space-y-2 mb-8" id="formal-header-institutional">
          {schoolSettings && schoolSettings.logoType === 'PUBLIC' ? (
            (() => {
              const url = schoolSettings.publicLogoUrl || '🇦🇴';
              if (url.startsWith('data:') || url.startsWith('http')) {
                return (
                  <img
                    src={url}
                    alt="Logo da Escola"
                    className="mx-auto w-12 h-12 rounded-full object-cover border-2 border-amber-500 mb-3 shadow-px"
                    referrerPolicy="no-referrer"
                  />
                );
              }
              return (
                <div className="mx-auto w-12 h-12 border-2 border-amber-500 bg-amber-500/5 rounded-full flex items-center justify-center font-bold text-amber-650 text-xs mb-3">
                  {url}
                </div>
              );
            })()
          ) : (
            (() => {
              const url = schoolSettings?.privateLogoUrl || '🎓';
              if (url.startsWith('data:') || url.startsWith('http')) {
                return (
                  <img
                    src={url}
                    alt="Logo da Escola"
                    className="mx-auto w-12 h-12 rounded-full object-cover border-2 border-slate-200 mb-3 shadow-px"
                    referrerPolicy="no-referrer"
                  />
                );
              }
              return (
                <div className="mx-auto w-12 h-12 border-2 border-indigo-500 bg-indigo-50/10 rounded-full flex items-center justify-center text-lg mb-3 shadow-px">
                  {url}
                </div>
              );
            })()
          )}
          {schoolSettings?.headerLine1Active !== false && (
            <p className="text-slate-800 font-extrabold uppercase text-xs tracking-widest leading-none">
              {schoolSettings?.headerLine1 || 'REPÚBLICA DE ANGOLA'}
            </p>
          )}
          {schoolSettings?.headerLine2Active !== false && (
            <p className="text-slate-705 font-bold uppercase text-[10px] tracking-wider leading-none">
              {schoolSettings?.headerLine2 || 'MINISTÉRIO DA EDUCAÇÃO'}
            </p>
          )}
          {schoolSettings?.headerLine3Active !== false && (
            <p className="text-slate-700 font-bold uppercase text-[10px] tracking-wider leading-none">
              {schoolSettings?.headerLine3 || `GOVERNO PROVINCIAL DE ${(schoolSettings?.province || 'LUNDA NORTE').toUpperCase()}`}
            </p>
          )}
          {schoolSettings?.headerLine4Active !== false && (
            <p className="text-slate-600 text-[10px] uppercase font-semibold leading-none">
              {schoolSettings?.headerLine4 || `ADMINISTRAÇÃO MUNICIPAL DE ${(schoolSettings?.municipality || 'Cafunfo').toUpperCase()}`}
            </p>
          )}
          <h3 className="text-slate-905 font-black uppercase text-xs sm:text-sm tracking-wide mt-1 max-w-xl mx-auto leading-snug">
            {schoolSettings?.schoolName || 'COMPLEXO ESCOLAR Nº 1709 LNO'}
          </h3>
          <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">
            {schoolSettings?.municipality || 'Cafunfo'} • {schoolSettings?.province || 'Lunda Norte'}
          </p>
          
          <div className="w-32 h-0.5 bg-slate-300 mx-auto my-4"></div>
          
          <h2 className="text-slate-900 font-extrabold text-base tracking-normal uppercase py-1">
            RELAÇÃO NOMINAL
          </h2>
          <div className="space-y-1">
            <p className="text-indigo-950 font-bold text-xs uppercase bg-indigo-50/70 inline-block px-3.5 py-1 rounded-sm border border-indigo-100 shadow-3xs">
              {localClass}ª CLASSE • TURMA {localSection}
            </p>
          </div>
          
          <p className="text-slate-500 text-[11px] font-semibold">
            Ano Lectivo: <span className="text-indigo-650 font-extrabold">{schoolSettings?.academicYear || '2025/2026'}</span>
          </p>
        </div>

        {/* Custom Metadata Metadata panel in rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-2 border-slate-200 mt-6 text-xs text-slate-800 bg-slate-50/40">
          <div className="p-3 border-b md:border-b-0 md:border-r border-slate-200">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">SUBSISTEMA</span>
            <span className="font-bold text-slate-700">
              {localSubsystem === 'ENSINO_PRIMARIO' && 'Ensino Primário'}
              {localSubsystem === 'I_CICLO' && 'Liceu'}
              {localSubsystem === 'PUNIV' && 'Liceu'}
              {localSubsystem === 'MAGISTERIO' && 'Magistério'}
            </span>
          </div>
          <div className="p-3 border-b md:border-b-0 md:border-r border-slate-200">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">ESPECIALIDADE / OPÇÃO</span>
            <span className="font-bold text-slate-750">
              {localSubsystem === 'PUNIV' || localSubsystem === 'MAGISTERIO' ? (specialtyNames[localSpecialty] || localSpecialty) : (localSubsystem === 'I_CICLO' ? `L. Estrang: ${localLanguage === 'QUALQUER' ? 'Geral' : localLanguage}` : 'Geral')}
            </span>
          </div>
          <div className="p-3">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">TOTAL DE ALUNOS</span>
            <span className="font-extrabold text-indigo-700">{filteredStudents.length} inscritos</span>
          </div>
        </div>

        {/* Major lists content table */}
        <div className="overflow-x-auto mt-6 border-b border-slate-200">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 p-2.5 text-center text-[10px] font-extrabold font-serif text-slate-700 w-12 uppercase leading-snug">
                  Nº
                </th>
                <th className="border border-slate-200 p-2.5 text-slate-700 text-[10px] font-extrabold font-serif w-28 uppercase leading-snug">
                  Nº Processo
                </th>
                <th className="border border-slate-200 p-2.5 text-slate-700 text-[10px] font-extrabold font-serif uppercase leading-snug">
                  Nome Completo
                </th>
                <th className="border border-slate-200 p-2.5 text-center text-[10px] font-extrabold font-serif text-slate-700 w-16 uppercase leading-snug">
                  Gênero
                </th>
                <th className="border border-slate-200 p-2.5 text-center text-[10px] font-extrabold font-serif text-slate-700 w-16 uppercase leading-snug">
                  Idade
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="border border-slate-200 p-2.5 text-center text-xs font-bold font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-200 p-2.5 text-xs font-extrabold font-mono text-slate-600">
                      {student.id}
                    </td>
                    <td className="border border-slate-200 p-2.5 text-xs font-bold text-slate-900 uppercase">
                      {student.name}
                    </td>
                    <td className="border border-slate-200 p-2.5 text-center text-xs font-bold font-mono">
                      <span className={student.gender === 'F' ? 'bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-xs' : 'bg-slate-100 text-slate-750 px-1.5 py-0.5 rounded-xs'}>
                        {student.gender}
                      </span>
                    </td>
                    <td className="border border-slate-200 p-2.5 text-center text-xs font-bold font-mono text-slate-700">
                      {getStudentAgeFormatted(student)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="border border-slate-200 text-center py-10 text-slate-450 italic text-xs">
                    Nenhum aluno localizado para o critério {localClass}ª Classe - Turma {localSection}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Descriptive Summary Footer inside document sheet */}
        <div className="flex flex-col sm:flex-row justify-between text-[11px] font-sans font-medium text-slate-450 pt-5 mt-4 border-t border-slate-100 italic">
          <div>Documento gerado automaticamente pelo Sistema Integrado de Gestão Escolar Profissional  (SiGeP)</div>
          <div className="mt-1 sm:mt-0">Data de Emissão: {new Date().toLocaleDateString('pt-AO')}</div>
        </div>

        {/* Oficial Signature Block - Only Director da Escola */}
        <div className="mt-14 text-xs text-center font-serif text-slate-800">
          <div className="space-y-1.5 max-w-xs mx-auto">
            <p className="font-extrabold uppercase text-slate-800 tracking-wide">{schoolSettings?.directorRoleLabel || 'O Director da Escola'}</p>
            <div className="w-56 h-px border-b border-slate-400 mx-auto pt-8"></div>
            <p className="text-[11px] text-slate-600 font-bold uppercase">{directorDocente}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
