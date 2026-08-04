import { jsPDF } from 'jspdf';
import { SchoolSettings } from '../types';

export type ComprovativoType = 'CANDIDATURA' | 'MATRICULA' | 'RECONFIRMACAO';

export function downloadComprovativoPDF(
  data: any,
  type: ComprovativoType = 'MATRICULA',
  schoolSettings?: SchoolSettings | any
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const schoolNameStr = schoolSettings?.schoolName || 'S.I.G.E.P. - ESCOLA MODELO';
  const schoolMottoStr = schoolSettings?.schoolSlogan || 'Sistema Integrado de Gestão Escolar Profissional';
  const provinceStr = String(schoolSettings?.province || 'LUANDA').toUpperCase();
  const municipalityStr = String(schoolSettings?.municipality || 'MUNICÍPIO').toUpperCase();

  // 1. Draw elegant double outer frame
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 277);
  doc.setLineWidth(0.2);
  doc.rect(11.5, 11.5, 187, 274);

  // 2. Institutional Top Header with School Insignia / Logo
  const logoUrl = schoolSettings?.logoType === 'PUBLIC' ? schoolSettings?.publicLogoUrl : schoolSettings?.privateLogoUrl;
  let emblemAdded = false;
  let currentY = 14;

  if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http'))) {
    try {
      let format = 'PNG';
      if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) format = 'JPEG';
      else if (logoUrl.includes('image/gif')) format = 'GIF';
      doc.addImage(logoUrl, format, 97.5, currentY, 15, 15);
      emblemAdded = true;
      currentY += 18;
    } catch (err) {
      console.error("Erro ao adicionar logotipo ao comprovativo:", err);
    }
  }

  if (!emblemAdded) {
    // Geometric insignia emblem fallback
    doc.setDrawColor(79, 70, 229);
    doc.setFillColor(238, 242, 255);
    doc.circle(105, currentY + 6, 6, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(79, 70, 229);
    doc.text("SIGEP", 105, currentY + 7.5, { align: 'center' });
    currentY += 16;
  }

  // Institutional Text Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text("REPÚBLICA DE ANGOLA", 105, currentY, { align: 'center' });
  currentY += 4;
  doc.text("MINISTÉRIO DA EDUCAÇÃO", 105, currentY, { align: 'center' });
  currentY += 4;
  doc.text(`GOVERNO PROVINCIAL DE ${provinceStr}`, 105, currentY, { align: 'center' });
  currentY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${municipalityStr}`, 105, currentY, { align: 'center' });
  currentY += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(schoolNameStr.toUpperCase(), 105, currentY, { align: 'center' });
  currentY += 4;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`"${schoolMottoStr}"`, 105, currentY, { align: 'center' });
  currentY += 4;

  // Decorative Accent Line
  doc.setDrawColor(79, 70, 229); // Indigo-600
  doc.setLineWidth(0.8);
  doc.line(25, currentY, 185, currentY);
  currentY += 8;

  // 3. Document Titles & Subtitle Badge
  let docTitle = "COMPROVATIVO DE MATRÍCULA";
  let docBadge = "REGISTO DE MATRÍCULA EFETUADO COM SUCESSO NO SISTEMA CENTRAL";
  let idBoxHeader = "CÓDIGO DE IDENTIFICAÇÃO ÚNICO (ID DO ALUNO)";
  let badgeColor = [16, 124, 65]; // Emerald green
  let titleColor = [79, 70, 229]; // Indigo

  if (type === 'CANDIDATURA') {
    docTitle = "COMPROVATIVO DE CANDIDATURA / INSCRIÇÃO";
    docBadge = "REGISTO DE CANDIDATURA SUBMETIDO COM SUCESSO NO SISTEMA CENTRAL";
    idBoxHeader = "CÓDIGO ÚNICO DE CANDIDATURA (ID DO CANDIDATO)";
    badgeColor = [217, 119, 6]; // Amber
    titleColor = [217, 119, 6];
  } else if (type === 'RECONFIRMACAO') {
    docTitle = "COMPROVATIVO DE RECONFIRMAÇÃO DE MATRÍCULA";
    docBadge = "RECONFIRMAÇÃO DE MATRÍCULA E PROMOÇÃO LETIVA EFETUADA COM SUCESSO";
    idBoxHeader = "CÓDIGO DE IDENTIFICAÇÃO ÚNICO (ID DO ALUNO)";
    badgeColor = [37, 99, 235]; // Blue
    titleColor = [37, 99, 235];
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
  doc.text(docTitle, 105, currentY, { align: 'center' });
  currentY += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.text(docBadge, 105, currentY, { align: 'center' });
  currentY += 6;

  // 4. Highlighted ID Box
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.4);
  doc.roundedRect(40, currentY, 130, 18, 3, 3, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(idBoxHeader, 105, currentY + 5, { align: 'center' });

  doc.setFont("courier", "bold");
  doc.setFontSize(15);
  doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
  const displayId = data.id || data.candId || '—';
  doc.text(displayId, 105, currentY + 13, { align: 'center' });

  currentY += 24;

  // 5. Information Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text("I. DADOS DE IDENTIFICAÇÃO & CADASTRO", 20, currentY);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(20, currentY + 2, 190, currentY + 2);
  currentY += 9;

  const drawField = (label: string, value: string, x: number, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(label.toUpperCase(), x, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(value || "—", x, y + 4.5);
  };

  // Field 1: Name & Gender
  const studentName = data.name || data.candName || '—';
  const genderCode = data.gender || data.candGender || 'M';
  drawField("Nome Completo", studentName, 20, currentY);
  drawField("Género", genderCode === 'M' ? 'Masculino (M)' : 'Feminino (F)', 140, currentY);
  currentY += 13;

  // Field 2: Document, Birth Date & Status
  const rawDocType = data.docType || data.candDocType || (data.cedulaRegisto ? 'CEDULA' : 'BI');
  let docTypeLabel = 'B.I.';
  if (rawDocType === 'CEDULA' || rawDocType === 'CÉDULA') docTypeLabel = 'Cédula / Registo';
  else if (rawDocType === 'PASSAPORTE') docTypeLabel = 'Passaporte';
  else if (rawDocType === 'BI' || rawDocType === 'B.I.') docTypeLabel = 'B.I.';

  const docNum = data.docNumber || data.bi || data.cedulaRegisto || data.candDocNumber || data.doc_number || '—';
  const birthVal = data.birthDate || data.candBirthDate || data.birth_date || '—';

  drawField("Tipo e Nº de Documento", `${docTypeLabel}: ${docNum}`, 20, currentY);
  drawField("Data de Nascimento", birthVal, 95, currentY);

  if (type === 'CANDIDATURA') {
    drawField("Estado da Candidatura", data.status || 'Pendente / Inscrição Registrada', 145, currentY);
  } else if (type === 'RECONFIRMACAO') {
    drawField("Estado de Promoção", 'Promovido (Reconfirmado)', 145, currentY);
  } else {
    drawField("Estado Escolar", 'Matriculado (Ativo)', 145, currentY);
  }
  currentY += 13;

  // Field 3: Classes & Sections
  if (type === 'CANDIDATURA') {
    const cls = data.selectedClass || data.class || data.targetClass || '—';
    drawField("Classe Pretendida", `${cls}ª Classe`, 20, currentY);
    drawField("Turma", "A Atribuir Pós-Seleção", 110, currentY);
  } else if (type === 'RECONFIRMACAO') {
    const oldCls = data.originalClassBeforePromotion || data.oldClass || '—';
    const newCls = data.newClass || data.class || '—';
    const sec = data.newSection || data.section || '—';
    drawField("Classe Transitada / Promovida", `${oldCls}ª Cl. ➔ ${newCls}ª Classe`, 20, currentY);
    drawField("Turma Atribuída", `Turma ${sec}`, 120, currentY);
  } else {
    const cls = data.class || '—';
    const sec = data.section || '—';
    drawField("Classe de Ingresso", `${cls}ª Classe`, 20, currentY);
    drawField("Turma Atribuída", `Turma ${sec}`, 110, currentY);
  }
  currentY += 13;

  // Field 4: Period & Specialty
  const periodVal = data.periodo || data.newPeriod || data.candPeriod || 'Regular';
  drawField("Período / Turno", periodVal, 20, currentY);

  const spec = data.specialty || data.candSpecialty;
  if (spec && spec !== 'NENHUMA' && spec !== '') {
    drawField("Curso / Especialidade", spec, 110, currentY);
  }
  currentY += 15;

  // Filiação Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("II. DADOS DE FILIAÇÃO & CONTACTO", 20, currentY);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(20, currentY + 2, 190, currentY + 2);
  currentY += 9;

  drawField("Nome do Pai", data.fatherName || data.candFatherName || "—", 20, currentY);
  currentY += 13;

  drawField("Nome da Mãe", data.motherName || data.candMotherName || "—", 20, currentY);
  currentY += 13;

  drawField("Contacto Telefónico", data.contact || data.candContact || "—", 20, currentY);
  const regDate = data.enrollmentDate || data.candidacyDate || data.reconfDate || new Date().toLocaleDateString('pt-AO');
  drawField("Data de Registo", regDate, 110, currentY);
  currentY += 22;

  // 6. Signature Area
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("A Secretaria Escolar", 105, currentY, { align: 'center' });

  doc.setDrawColor(148, 163, 184); // Slate-400
  doc.setLineWidth(0.4);
  doc.line(65, currentY + 7, 145, currentY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("(Assinatura e carimbo em conformidade)", 105, currentY + 11.5, { align: 'center' });

  currentY += 22;

  // 7. Security Footer Box
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(20, currentY, 170, 18, 2, 2, 'FD');

  let docKindLabel = "matrícula";
  if (type === 'CANDIDATURA') docKindLabel = "candidatura/inscrição";
  if (type === 'RECONFIRMACAO') docKindLabel = "reconfirmação de matrícula";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Este documento é um comprovativo eletrónico de ${docKindLabel} oficial e autêntico emitido pelo sistema SIGEP.`, 25, currentY + 5);
  doc.text("A sua validação pode ser efetuada no portal oficial introduzindo o ID único do estudante/candidato.", 25, currentY + 9);
  doc.text(`Chave Digital de Autenticidade: SIGEP_TOKEN_${type}_${displayId}_AO_VALIDATED`, 25, currentY + 13);

  // 8. Institutional Contact Footer
  const phoneStr = schoolSettings?.phone || '+244 923 000 000';
  const addressStr = schoolSettings?.address || `${municipalityStr}, ${provinceStr}`;
  const emailStr = schoolSettings?.email || 'contacto@escola.ao';

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(15, 280, 195, 280);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Contacto: ${phoneStr}  |  Endereço: ${addressStr}  |  E-mail: ${emailStr}`, 105, 284, { align: 'center' });

  // Save PDF
  const filenameType = type.toLowerCase();
  doc.save(`comprovativo_${filenameType}_${displayId}.pdf`);
}
