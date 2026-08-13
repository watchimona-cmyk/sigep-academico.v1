/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolSettings, StudentFinance } from '../types';

export interface FinancialClassSummary {
  className: string;
  totalAlunos: number;
  totalArrecadado: number;
  totalDivida: number;
  totalMultas: number;
  totalPrevisto: number;
  taxaAdimplencia: number;
  rank: number;
}

export interface TurmaDebtSummary {
  turmaLabel: string; // Ex: "10ª Classe - Turma A"
  className: string;
  section: string;
  totalAlunos: number;
  alunosDevedores: number;
  arrecadado: number;
  dividaPendente: number;
  semDivida: boolean;
}

export interface AttendanceClassSummary {
  turmaLabel: string;
  className: string;
  section: string;
  totalAlunos: number;
  faltasInjustificadas: number;
  faltasJustificadas: number;
  totalFaltas: number;
  alunosCriticos: number; // Alunos com > 10 faltas
}

export interface BIClassRowPDF {
  className: string;
  totalAlunos: number;
  regulares: number;
  parciais: number;
  integrais: number;
  totalArrecadado: number;
  totalDivida: number;
  totalMultas: number;
  totalPrevisto: number;
}

/**
 * Generates Official Financial BI Report PDF by Class
 */
export function generateBiPorClassePDF(
  biRows: BIClassRowPDF[],
  schoolSettings?: SchoolSettings,
  subdirectorAdminName?: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const schoolName = schoolSettings?.schoolName || 'INSTITUIÇÃO DE ENSINO PÚBLICO DE ANGOLA';
  const municipalityStr = schoolSettings?.municipality || 'CAZENGA';
  const provinceStr = schoolSettings?.province || 'LUANDA';
  const sdaName = subdirectorAdminName || schoolSettings?.subdirectorAdminName || schoolSettings?.subdirectorName || 'Subdirector Administrativo';

  let currentY = 10;

  // Header Official Republic of Angola with Insignia / Logo
  const logoUrl = schoolSettings?.logoType === 'PUBLIC' ? schoolSettings?.publicLogoUrl : (schoolSettings?.privateLogoUrl || schoolSettings?.publicLogoUrl);
  let emblemAdded = false;

  if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
    try {
      let format = 'PNG';
      if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) format = 'JPEG';
      else if (logoUrl.includes('image/gif')) format = 'GIF';
      doc.addImage(logoUrl, format, 141, currentY, 14, 14);
      emblemAdded = true;
      currentY += 16;
    } catch (err) {
      console.error("Erro ao adicionar logotipo ao PDF:", err);
    }
  }

  if (!emblemAdded) {
    doc.setDrawColor(217, 119, 6);
    doc.setFillColor(254, 243, 199);
    doc.circle(148, currentY + 5, 5, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(180, 83, 9);
    doc.text("SIGEP", 148, currentY + 6.5, { align: 'center' });
    currentY += 13;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(schoolSettings?.headerLine1 || "REPÚBLICA DE ANGOLA", 148, currentY, { align: 'center' });
  doc.text(schoolSettings?.headerLine2 || "MINISTÉRIO DA EDUCAÇÃO", 148, currentY + 4, { align: 'center' });
  doc.text(schoolSettings?.headerLine3 || `GOVERNO PROVINCIAL DE ${provinceStr.toUpperCase()}`, 148, currentY + 8, { align: 'center' });
  doc.text(schoolSettings?.headerLine4 || `DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${municipalityStr.toUpperCase()}`, 148, currentY + 12, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(schoolName.toUpperCase(), 148, currentY + 17, { align: 'center' });

  doc.setDrawColor(79, 70, 229); // Indigo line
  doc.setLineWidth(0.8);
  doc.line(15, currentY + 20, 282, currentY + 20);

  currentY += 26;

  // Report Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("RELATÓRIO FINANCEIRO — ANÁLISE BI POR CLASSE", 148, currentY, { align: 'center' });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Ano Letivo: ${schoolSettings?.academicYear || '2025/2026'}  |  Data de Emissão: ${new Date().toLocaleDateString('pt-AO')}`, 148, currentY + 5, { align: 'center' });

  currentY += 12;

  // Compute Totals
  const sumAlunos = biRows.reduce((sum, r) => sum + r.totalAlunos, 0);
  const sumRegulares = biRows.reduce((sum, r) => sum + r.regulares, 0);
  const sumParciais = biRows.reduce((sum, r) => sum + r.parciais, 0);
  const sumIntegrais = biRows.reduce((sum, r) => sum + r.integrais, 0);
  const sumArrecadado = biRows.reduce((sum, r) => sum + r.totalArrecadado, 0);
  const sumDivida = biRows.reduce((sum, r) => sum + r.totalDivida, 0);
  const sumMultas = biRows.reduce((sum, r) => sum + r.totalMultas, 0);
  const sumPrevisto = biRows.reduce((sum, r) => sum + r.totalPrevisto, 0);

  const tableData: (string | number)[][] = biRows.map(r => [
    r.className,
    r.totalAlunos.toString(),
    r.regulares.toString(),
    r.parciais.toString(),
    r.integrais.toString(),
    `${r.totalArrecadado.toLocaleString('pt-PT')} Kz`,
    `${r.totalDivida.toLocaleString('pt-PT')} Kz`,
    `${r.totalMultas.toLocaleString('pt-PT')} Kz`,
    `${r.totalPrevisto.toLocaleString('pt-PT')} Kz`
  ]);

  // Total row
  tableData.push([
    'TOTAL GERAL',
    sumAlunos.toString(),
    sumRegulares.toString(),
    sumParciais.toString(),
    sumIntegrais.toString(),
    `${sumArrecadado.toLocaleString('pt-PT')} Kz`,
    `${sumDivida.toLocaleString('pt-PT')} Kz`,
    `${sumMultas.toLocaleString('pt-PT')} Kz`,
    `${sumPrevisto.toLocaleString('pt-PT')} Kz`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Classe', 'Alunos', 'Regulares', 'Parciais', 'Integrais', 'Total Arrecadado', 'Total Em Dívida', 'Multas Ativas', 'Previsto Geral']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontSize: 8.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 22 },
      5: { halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87], cellWidth: 38 },
      6: { halign: 'right', fontStyle: 'bold', textColor: [190, 18, 60], cellWidth: 38 },
      7: { halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9], cellWidth: 32 },
      8: { halign: 'right', fontStyle: 'bold', textColor: [49, 46, 129], cellWidth: 38 }
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [243, 244, 246];
      }
    },
    margin: { left: 15, right: 15 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 18;

  if (currentY > 175) {
    doc.addPage();
    currentY = 25;
  }

  // Signatures
  const colWidth = 65;
  
  // Col 1: Director Geral
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(50, currentY, 50 + colWidth, currentY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("O Director Geral", 50 + colWidth / 2, currentY + 4, { align: 'center' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`( ${schoolSettings?.directorName || 'Direcção Geral'} )`, 50 + colWidth / 2, currentY + 8, { align: 'center' });

  // Col 2: Subdirector Administrativo
  doc.line(180, currentY, 180 + colWidth, currentY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("O Subdirector Administrativo", 180 + colWidth / 2, currentY + 4, { align: 'center' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`( ${sdaName} )`, 180 + colWidth / 2, currentY + 8, { align: 'center' });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Relatório BI Financeiro por Classe emitido pelo SIGEP em ${new Date().toLocaleDateString('pt-AO')} às ${new Date().toLocaleTimeString('pt-AO')}`, 148, 200, { align: 'center' });

  doc.save(`Relatorio_Financeiro_BI_Por_Classe_${new Date().toISOString().split('T')[0]}.pdf`);
}

export interface AttendanceClassSummary {
  turmaLabel: string;
  className: string;
  section: string;
  totalAlunos: number;
  faltasInjustificadas: number;
  faltasJustificadas: number;
  totalFaltas: number;
  alunosCriticos: number; // Alunos com > 10 faltas
}

const MESES_NOME = [
  "Setembro", "Outubro", "Novembro", "Dezembro",
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho"
];

// Map month index (0 to 10) to Trimester (1, 2, or 3)
export function getTrimesterForMonthIndex(mIdx: number): 1 | 2 | 3 {
  if (mIdx <= 2) return 1; // Set, Out, Nov -> Trimestre 1
  if (mIdx <= 5) return 2; // Dez, Jan, Fev -> Trimestre 2
  return 3; // Mar, Abr, Mai, Jun, Jul -> Trimestre 3
}

export function getTrimesterName(trim: number): string {
  if (trim === 1) return 'Iº Trimestre (Setembro - Novembro)';
  if (trim === 2) return 'IIº Trimestre (Dezembro - Fevereiro)';
  if (trim === 3) return 'IIIº Trimestre (Março - Julho)';
  return 'Ano Letivo Completo';
}

/**
 * Generates Official Financial Quarterly Report PDF with Subdirector Administrativo Signature
 */
export function generateFinancialQuarterlyPDF(
  records: StudentFinance[],
  trimester: number | 'TODOS',
  vMensal: number,
  vMulta: number,
  schoolSettings?: SchoolSettings,
  subdirectorAdminName?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const schoolName = schoolSettings?.schoolName || 'COMPLEXO ESCOLAR N.º 1709 LNO LUÍS WATCHIMONA';
  const municipalityStr = schoolSettings?.municipality || 'CAFUNFO / CUANGO';
  const provinceStr = schoolSettings?.province || 'LUNDA NORTE';
  const sdaName = subdirectorAdminName || schoolSettings?.subdirectorAdminName || schoolSettings?.subdirectorName || 'Subdirector Administrativo';

  // 1. Header Official Republic of Angola with Insignia / Logo
  const logoUrl = schoolSettings?.logoType === 'PUBLIC' ? schoolSettings?.publicLogoUrl : schoolSettings?.privateLogoUrl;
  let emblemAdded = false;
  let currentY = 10;

  if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
    try {
      let format = 'PNG';
      if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) format = 'JPEG';
      else if (logoUrl.includes('image/gif')) format = 'GIF';
      doc.addImage(logoUrl, format, 98, currentY, 14, 14);
      emblemAdded = true;
      currentY += 16;
    } catch (err) {
      console.error("Erro ao adicionar logotipo ao PDF:", err);
    }
  }

  if (!emblemAdded) {
    // Geometric Republic Coat of Arms / Emblem fallback
    doc.setDrawColor(217, 119, 6);
    doc.setFillColor(254, 243, 199);
    doc.circle(105, currentY + 5, 5, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(180, 83, 9);
    doc.text("SIGEP", 105, currentY + 6.5, { align: 'center' });
    currentY += 13;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("REPÚBLICA DE ANGOLA", 105, currentY, { align: 'center' });
  doc.text("MINISTÉRIO DA EDUCAÇÃO", 105, currentY + 4, { align: 'center' });
  doc.text(`GOVERNO PROVINCIAL DE ${provinceStr.toUpperCase()}`, 105, currentY + 8, { align: 'center' });
  doc.text(`DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${municipalityStr.toUpperCase()}`, 105, currentY + 12, { align: 'center' });
  
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(schoolName.toUpperCase(), 105, currentY + 17, { align: 'center' });

  doc.setDrawColor(79, 70, 229); // Indigo line
  doc.setLineWidth(0.8);
  doc.line(20, currentY + 20, 190, currentY + 20);

  currentY += 27;

  // 2. Report Title
  const trimesterTitle = typeof trimester === 'number' ? getTrimesterName(trimester) : 'Relatório Global Consolidado (Todos os Trimestres)';
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("RELATÓRIO FINANCEIRO TRIMESTRAL DE PROPINAS", 105, currentY, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Período de Referência: ${trimesterTitle}  |  Ano Letivo: ${schoolSettings?.academicYear || '2025/2026'}`, 105, currentY + 5, { align: 'center' });

  currentY += 12;

  // 3. Overall Financial Summary Calculations
  let totalArrecadadoGeral = 0;
  let totalDividaGeral = 0;

  records.forEach(r => {
    totalArrecadadoGeral += r.totalPago;
    totalDividaGeral += r.totalDivida;
  });

  const totalGeralPrevisto = totalArrecadadoGeral + totalDividaGeral;
  const taxaAdimplenciaGeral = totalGeralPrevisto > 0 ? ((totalArrecadadoGeral / totalGeralPrevisto) * 100).toFixed(1) : '100.0';

  // Render Metric Boxes in PDF
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, currentY, 170, 18, 2, 2, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  
  doc.text("TOTAL ARRECADADO", 25, currentY + 5);
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`${totalArrecadadoGeral.toLocaleString('pt-PT')} Kz`, 25, currentY + 12);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("DÍVIDA PENDENTE", 75, currentY + 5);
  doc.setFontSize(10);
  doc.setTextColor(225, 29, 72); // Rose
  doc.text(`${totalDividaGeral.toLocaleString('pt-PT')} Kz`, 75, currentY + 12);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("TAXA DE ADIMPLÊNCIA", 130, currentY + 5);
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229); // Indigo
  doc.text(`${taxaAdimplenciaGeral}%`, 130, currentY + 12);

  currentY += 24;

  // 4. Table 1: Ranking of Classes by Revenue (Apenas classes com alunos cadastrados)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("I. RENDIMENTO DE PROPINAS POR CLASSE (RANKING DE ARRECADAÇÃO)", 20, currentY);
  currentY += 3;

  const classesList = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"];
  const classSummaries: FinancialClassSummary[] = classesList.map(cls => {
    const clsRecords = records.filter(r => r.class && r.class.toString().replace('ª', '').trim() === cls);
    let totalArrec = 0;
    let totalDiv = 0;

    clsRecords.forEach(r => {
      totalArrec += r.totalPago;
      totalDiv += r.totalDivida;
    });

    const prev = totalArrec + totalDiv;
    const taxa = prev > 0 ? (totalArrec / prev) * 100 : 100;

    return {
      className: `${cls}ª Classe`,
      totalAlunos: clsRecords.length,
      totalArrecadado: totalArrec,
      totalDivida: totalDiv,
      totalMultas: 0,
      totalPrevisto: prev,
      taxaAdimplencia: Math.round(taxa * 10) / 10,
      rank: 0
    };
  }).filter(c => c.totalAlunos > 0); // EXCLUIR CLASSES VAZIAS!

  // Sort by highest revenue
  classSummaries.sort((a, b) => b.totalArrecadado - a.totalArrecadado);
  classSummaries.forEach((c, idx) => { c.rank = idx + 1; });

  const table1Data = classSummaries.length > 0 
    ? classSummaries.map(c => [
        `#${c.rank}º`,
        c.className,
        c.totalAlunos.toString(),
        `${c.totalArrecadado.toLocaleString('pt-PT')} Kz`,
        `${c.totalDivida.toLocaleString('pt-PT')} Kz`,
        `${c.taxaAdimplencia}%`
      ])
    : [['-', 'Nenhuma turma cadastrada com alunos', '0', '0 Kz', '0 Kz', '0%']];

  autoTable(doc, {
    startY: currentY,
    head: [['Posição', 'Classe', 'N.º Alunos', 'Total Arrecadado', 'Dívida Pendente', 'Adimplência']],
    body: table1Data,
    margin: { left: 20, right: 20 },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      1: { fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
      5: { halign: 'center', fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Check page height
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // 5. Table 2: Turmas com Dívida e Turmas Sem Dívida (Apenas turmas ativas com alunos)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("II. ESTADO DE DÍVIDA POR TURMAS (TURMAS ADIMPLENTES VS COM PENDÊNCIAS)", 20, currentY);
  currentY += 3;

  // Group by Turma
  const turmaMap = new Map<string, { className: string; section: string; totalAlunos: number; devedores: number; arrec: number; div: number }>();

  records.forEach(r => {
    if (!r.class || !r.section) return;
    const key = `${r.class}ª Cl. - Turma ${r.section}`;
    const curr = turmaMap.get(key) || { className: `${r.class}ª`, section: r.section, totalAlunos: 0, devedores: 0, arrec: 0, div: 0 };
    curr.totalAlunos++;
    curr.arrec += r.totalPago;
    curr.div += r.totalDivida;
    if (r.totalDivida > 0) curr.devedores++;
    turmaMap.set(key, curr);
  });

  const turmaList = Array.from(turmaMap.entries())
    .map(([label, data]) => ({
      label,
      ...data,
      semDivida: data.div === 0
    }))
    .filter(t => t.totalAlunos > 0); // EXCLUIR TURMAS VAZIAS!

  turmaList.sort((a, b) => (a.semDivida === b.semDivida ? a.label.localeCompare(b.label) : a.semDivida ? -1 : 1));

  const table2Data = turmaList.length > 0
    ? turmaList.map(t => [
        t.label,
        t.totalAlunos.toString(),
        t.devedores === 0 ? '0 (100% Adimplente)' : `${t.devedores} Aluno(s)`,
        `${t.arrec.toLocaleString('pt-PT')} Kz`,
        `${t.div.toLocaleString('pt-PT')} Kz`,
        t.semDivida ? 'SEM DÍVIDA' : 'COM DÍVIDA'
      ])
    : [['Nenhuma turma cadastrada com alunos', '0', '0', '0 Kz', '0 Kz', '-']];

  autoTable(doc, {
    startY: currentY,
    head: [['Turma / Classe', 'N.º Alunos', 'N.º Devedores', 'Total Arrecadado', 'Dívida Pendente', 'Estado da Turma']],
    body: table2Data,
    margin: { left: 20, right: 20 },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center', fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  if (currentY > 240) {
    doc.addPage();
    currentY = 25;
  }

  // 6. Subdirector Administrativo Signature Area (Nome abaixo da linha)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("O Subdirector Administrativo", 105, currentY, { align: 'center' });

  // Linha de assinatura ACIMA do nome
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(65, currentY + 15, 145, currentY + 15);

  // Nome do assinante ABAIXO da linha de assinatura
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`( ${sdaName} )`, 105, currentY + 19, { align: 'center' });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("(Assinatura e carimbo em conformidade)", 105, currentY + 23, { align: 'center' });

  // Footer
  doc.setFontSize(7);
  doc.text(`Documento gerado automaticamente pelo SIGEP Central em ${new Date().toLocaleDateString('pt-AO')} às ${new Date().toLocaleTimeString('pt-AO')}`, 105, 285, { align: 'center' });

  doc.save(`Relatorio_Financeiro_Propinas_${trimester}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Generates Official Attendance & Absences Quarterly Report PDF with Subdirector Administrativo Signature
 */
export function generateAttendanceQuarterlyPDF(
  records: StudentFinance[],
  trimester: number | 'TODOS',
  schoolSettings?: SchoolSettings,
  subdirectorAdminName?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const schoolName = schoolSettings?.schoolName || 'COMPLEXO ESCOLAR N.º 1709 LNO LUÍS WATCHIMONA';
  const municipalityStr = schoolSettings?.municipality || 'CAFUNFO / CUANGO';
  const provinceStr = schoolSettings?.province || 'LUNDA NORTE';
  const sdaName = subdirectorAdminName || schoolSettings?.subdirectorAdminName || schoolSettings?.subdirectorName || 'Subdirector Administrativo';

  // Header Official Republic of Angola with Insignia / Logo
  const logoUrl = schoolSettings?.logoType === 'PUBLIC' ? schoolSettings?.publicLogoUrl : schoolSettings?.privateLogoUrl;
  let emblemAdded = false;
  let currentY = 10;

  if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
    try {
      let format = 'PNG';
      if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) format = 'JPEG';
      else if (logoUrl.includes('image/gif')) format = 'GIF';
      doc.addImage(logoUrl, format, 98, currentY, 14, 14);
      emblemAdded = true;
      currentY += 16;
    } catch (err) {
      console.error("Erro ao adicionar logotipo ao PDF:", err);
    }
  }

  if (!emblemAdded) {
    // Geometric Republic Coat of Arms / Emblem fallback
    doc.setDrawColor(217, 119, 6);
    doc.setFillColor(254, 243, 199);
    doc.circle(105, currentY + 5, 5, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(180, 83, 9);
    doc.text("SIGEP", 105, currentY + 6.5, { align: 'center' });
    currentY += 13;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("REPÚBLICA DE ANGOLA", 105, currentY, { align: 'center' });
  doc.text("MINISTÉRIO DA EDUCAÇÃO", 105, currentY + 4, { align: 'center' });
  doc.text(`GOVERNO PROVINCIAL DE ${provinceStr.toUpperCase()}`, 105, currentY + 8, { align: 'center' });
  doc.text(`DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${municipalityStr.toUpperCase()}`, 105, currentY + 12, { align: 'center' });
  
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(schoolName.toUpperCase(), 105, currentY + 17, { align: 'center' });

  doc.setDrawColor(225, 29, 72); // Rose line for attendance/absences
  doc.setLineWidth(0.8);
  doc.line(20, currentY + 20, 190, currentY + 20);

  currentY += 27;

  // Title
  const trimesterTitle = typeof trimester === 'number' ? getTrimesterName(trimester) : 'Relatório Global Consolidado (Todos os Trimestres)';

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("RELATÓRIO DE ASSIDUIDADE & CONTROLO DE FALTAS", 105, currentY, { align: 'center' });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Período de Referência: ${trimesterTitle}  |  Ano Letivo: ${schoolSettings?.academicYear || '2025/2026'}`, 105, currentY + 5, { align: 'center' });

  currentY += 12;

  // Calculate totals
  let totalInjustificadas = 0;
  let totalJustificadas = 0;

  records.forEach(r => {
    const inj = r.faltasInjustificadas || 0;
    const just = r.faltasJustificadas || 0;
    totalInjustificadas += inj;
    totalJustificadas += just;
  });

  const totalFaltasGeral = totalInjustificadas + totalJustificadas;

  // Metric Boxes
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, currentY, 170, 18, 2, 2, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text("TOTAL DE FALTAS", 25, currentY + 5);
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`${totalFaltasGeral}`, 25, currentY + 12);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("FALTAS INJUSTIFICADAS", 75, currentY + 5);
  doc.setFontSize(10);
  doc.setTextColor(225, 29, 72); // Rose
  doc.text(`${totalInjustificadas}`, 75, currentY + 12);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("FALTAS JUSTIFICADAS", 130, currentY + 5);
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`${totalJustificadas}`, 130, currentY + 12);

  currentY += 24;

  // Table 1: Absences by Class and Turma (Apenas turmas com alunos)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("I. QUADRO DE ASSIDUIDADE POR CLASSE E TURMA", 20, currentY);
  currentY += 3;

  const turmaMap = new Map<string, { className: string; section: string; totalAlunos: number; injust: number; just: number; criticos: number }>();

  records.forEach(r => {
    if (!r.class || !r.section) return;
    const key = `${r.class}ª Cl. - Turma ${r.section}`;
    const curr = turmaMap.get(key) || { className: `${r.class}ª`, section: r.section, totalAlunos: 0, injust: 0, just: 0, criticos: 0 };
    curr.totalAlunos++;
    const inj = r.faltasInjustificadas || 0;
    const jst = r.faltasJustificadas || 0;
    curr.injust += inj;
    curr.just += jst;
    if (inj >= 10) curr.criticos++;
    turmaMap.set(key, curr);
  });

  const turmaList = Array.from(turmaMap.entries())
    .map(([label, data]) => ({ label, ...data }))
    .filter(t => t.totalAlunos > 0); // EXCLUIR TURMAS VAZIAS!

  const tableData = turmaList.length > 0
    ? turmaList.map(t => [
        t.label,
        t.totalAlunos.toString(),
        t.injust.toString(),
        t.just.toString(),
        (t.injust + t.just).toString(),
        t.criticos > 0 ? `${t.criticos} Aluno(s)` : '0 (Normal)'
      ])
    : [['Nenhuma turma cadastrada com alunos', '0', '0', '0', '0', '-']];

  autoTable(doc, {
    startY: currentY,
    head: [['Classe / Turma', 'N.º Alunos', 'Faltas Injustificadas', 'Faltas Justificadas', 'Total Faltas', 'Alunos Críticos (≥10)']],
    body: tableData,
    margin: { left: 20, right: 20 },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center', fontStyle: 'bold' },
      3: { halign: 'center' },
      4: { halign: 'center', fontStyle: 'bold' },
      5: { halign: 'center' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // Table 2: Top Critical Students List (if any)
  const criticalStudents = records.filter(r => (r.faltasInjustificadas || 0) >= 5);
  if (criticalStudents.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text("II. LISTAGEM DE ALUNOS COM ELEVADO NÚMERO DE FALTAS (RISCO PEDAGÓGICO)", 20, currentY);
    currentY += 3;

    criticalStudents.sort((a, b) => (b.faltasInjustificadas || 0) - (a.faltasInjustificadas || 0));

    const tableCritical = criticalStudents.slice(0, 15).map(s => [
      s.id,
      s.name,
      `${s.class}ª Cl. - ${s.section}`,
      (s.faltasInjustificadas || 0).toString(),
      (s.faltasJustificadas || 0).toString(),
      (s.faltasInjustificadas || 0) >= 10 ? 'CRÍTICO (Risco Reprovação)' : 'ALERTA'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['N.º Processo', 'Nome Completo do Aluno', 'Turma', 'Injustificadas', 'Justificadas', 'Situação Pedagógica']],
      body: tableCritical,
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center' },
        1: { fontStyle: 'bold' },
        2: { halign: 'center' },
        3: { halign: 'center', fontStyle: 'bold' },
        4: { halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  if (currentY > 240) {
    doc.addPage();
    currentY = 25;
  }

  // Signature Subdirector Admin (Nome abaixo da linha)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("O Subdirector Administrativo", 105, currentY, { align: 'center' });

  // Linha de assinatura ACIMA do nome
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(65, currentY + 15, 145, currentY + 15);

  // Nome do assinante ABAIXO da linha de assinatura
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`( ${sdaName} )`, 105, currentY + 19, { align: 'center' });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("(Assinatura e carimbo em conformidade)", 105, currentY + 23, { align: 'center' });

  // Footer
  doc.setFontSize(7);
  doc.text(`Documento gerado automaticamente pelo SIGEP Central em ${new Date().toLocaleDateString('pt-AO')} às ${new Date().toLocaleTimeString('pt-AO')}`, 105, 285, { align: 'center' });

  doc.save(`Relatorio_Faltas_Assiduidade_${trimester}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function generateRelatorioAlunosCriticosPdf(
  records: StudentFinance[],
  schoolSettings: any,
  trimester: number | string = 3,
  subdirectorAdminName: string = '',
  subdirectorPedagogicoName: string = '',
  directorGeralName: string = ''
) {
  const doc = new jsPDF();
  const schoolName = schoolSettings?.schoolName || 'COMPLEXO ESCOLAR SIGEP';
  const municipalityStr = schoolSettings?.municipality || 'LUNDA NORTE';
  const provinceStr = schoolSettings?.province || 'LUNDA NORTE';
  
  const dgName = directorGeralName || schoolSettings?.directorGeralName || schoolSettings?.directorName || 'Director Geral';
  const sdpName = subdirectorPedagogicoName || schoolSettings?.subdirectorPedagogicoName || schoolSettings?.subdirectorName || 'Subdirector Pedagógico';
  const sdaName = subdirectorAdminName || schoolSettings?.subdirectorAdminName || 'Subdirector Administrativo';

  // 1. Header Official Republic of Angola with Insignia / Logo
  const logoUrl = schoolSettings?.logoType === 'PUBLIC' ? schoolSettings?.publicLogoUrl : schoolSettings?.privateLogoUrl;
  let emblemAdded = false;
  let currentY = 10;

  if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
    try {
      let format = 'PNG';
      if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) format = 'JPEG';
      else if (logoUrl.includes('image/gif')) format = 'GIF';
      doc.addImage(logoUrl, format, 98, currentY, 14, 14);
      emblemAdded = true;
      currentY += 16;
    } catch (err) {
      console.error("Erro ao adicionar logotipo ao PDF:", err);
    }
  }

  if (!emblemAdded) {
    doc.setDrawColor(217, 119, 6);
    doc.setFillColor(254, 243, 199);
    doc.circle(105, currentY + 5, 5, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(180, 83, 9);
    doc.text("SIGEP", 105, currentY + 6.5, { align: 'center' });
    currentY += 13;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("REPÚBLICA DE ANGOLA", 105, currentY, { align: 'center' });
  doc.text("MINISTÉRIO DA EDUCAÇÃO", 105, currentY + 4, { align: 'center' });
  doc.text(`GOVERNO PROVINCIAL DE ${provinceStr.toUpperCase()}`, 105, currentY + 8, { align: 'center' });
  doc.text(`DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${municipalityStr.toUpperCase()}`, 105, currentY + 12, { align: 'center' });
  
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(schoolName.toUpperCase(), 105, currentY + 17, { align: 'center' });

  doc.setDrawColor(220, 38, 38); // Red warning line
  doc.setLineWidth(0.8);
  doc.line(20, currentY + 20, 190, currentY + 20);

  currentY += 27;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(185, 28, 28);
  doc.text("RELATÓRIO GERAL DE ALUNOS CRÍTICOS - CONVOCATÓRIA DA DIREÇÃO", 105, currentY, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fase: ${trimester}º Trimestre (Provas Finais / Exames)  |  Ano Letivo: ${schoolSettings?.academicYear || '2025/2026'}`, 105, currentY + 5, { align: 'center' });

  currentY += 12;

  // Filter critical students
  const criticalStudents = records.filter(r => (r.totalDivida > 0) || ((r.faltasInjustificadas || 0) > 0));

  let totalDebt = 0;
  let totalAbsences = 0;
  criticalStudents.forEach(r => {
    totalDebt += r.totalDivida;
    totalAbsences += (r.faltasInjustificadas || 0);
  });

  // Summary Metrics Box
  doc.setFillColor(254, 242, 242); // Light red
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(20, currentY, 170, 18, 2, 2, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27);

  doc.text("TOTAL ALUNOS CRÍTICOS", 25, currentY + 5);
  doc.setFontSize(10);
  doc.text(`${criticalStudents.length} Aluno(s)`, 25, currentY + 12);

  doc.text("TOTAL DÍVIDA ACUMULADA", 75, currentY + 5);
  doc.setFontSize(10);
  doc.text(`${totalDebt.toLocaleString('pt-PT')} Kz`, 75, currentY + 12);

  doc.text("FALTAS INJUSTIFICADAS", 135, currentY + 5);
  doc.setFontSize(10);
  doc.text(`${totalAbsences} Falta(s)`, 135, currentY + 12);

  currentY += 24;

  // Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("RELAÇÃO NOMINAL DOS ESTUDANTES EM RISCO DE CONDICIONAMENTO DE EXAMES", 20, currentY);
  currentY += 4;

  const tableData = criticalStudents.length > 0
    ? criticalStudents.map((st, idx) => {
        let cond = [];
        if (st.totalDivida > 0) cond.push(`Propina: ${st.totalDivida.toLocaleString('pt-PT')} Kz`);
        if ((st.faltasInjustificadas || 0) > 0) cond.push(`Faltas Inj.: ${st.faltasInjustificadas}`);
        
        return [
          `${idx + 1}`,
          st.name,
          `${st.class}ª Cl. - Turma ${st.section}`,
          `${st.totalDivida.toLocaleString('pt-PT')} Kz`,
          `${st.faltasInjustificadas || 0}`,
          cond.join(' | ') || 'Condicionado'
        ];
      })
    : [['-', 'Nenhum aluno com pendência crítica registrada', '-', '0 Kz', '0', 'Regularizado']];

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Nome Completo', 'Classe / Turma', 'Dívida Acumulada', 'Faltas Inj.', 'Condicionamento de Exames']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [185, 28, 28], textColor: 255, fontSize: 8.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 55 },
      2: { halign: 'center', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'center', cellWidth: 20 },
      5: { cellWidth: 40 }
    },
    margin: { left: 20, right: 20 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 18;

  if (currentY > 230) {
    doc.addPage();
    currentY = 30;
  }

  // Notice Text for Directors
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Este relatório foi emitido para efeitos de revisão urgente da Direção Geral antes do início das Provas Finais.", 105, currentY, { align: 'center' });

  currentY += 20;

  // 3 Signatures: Diretor Geral, Subdirector Pedagógico, Subdirector Administrativo
  const colWidth = 50;
  
  // Col 1: Diretor Geral
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(20, currentY, 20 + colWidth, currentY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("O Director Geral", 20 + colWidth / 2, currentY + 4, { align: 'center' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`( ${dgName} )`, 20 + colWidth / 2, currentY + 8, { align: 'center' });

  // Col 2: Subdirector Pedagógico
  doc.line(80, currentY, 80 + colWidth, currentY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Subdirector Pedagógico", 80 + colWidth / 2, currentY + 4, { align: 'center' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`( ${sdpName} )`, 80 + colWidth / 2, currentY + 8, { align: 'center' });

  // Col 3: Subdirector Administrativo
  doc.line(140, currentY, 140 + colWidth, currentY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Subdirector Admin.", 140 + colWidth / 2, currentY + 4, { align: 'center' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`( ${sdaName} )`, 140 + colWidth / 2, currentY + 8, { align: 'center' });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Documento de Convocatória Emitido pelo SIGEP Central em ${new Date().toLocaleDateString('pt-AO')} às ${new Date().toLocaleTimeString('pt-AO')}`, 105, 285, { align: 'center' });

  doc.save(`Convocatoria_Direcao_Alunos_Criticos_Exames_${new Date().toISOString().split('T')[0]}.pdf`);
}


