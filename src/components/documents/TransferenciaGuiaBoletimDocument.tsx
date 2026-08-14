/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Student, SchoolSettings, GradeRow, getSubjectsForClass, ModalityType } from '../../types';
import { formatBirthDateExtended } from './CertificadoDocument';
import { toTitleCaseName, getDocTypeDetails } from './DeclaracaoDocument';

export interface TransferenciaGuiaBoletimProps {
  student: Student;
  schoolSettings: SchoolSettings;
  grades?: GradeRow[];
  activeModality?: ModalityType;
  guiaNumero?: string;
  boletimNumero?: string;
  anoLectivo?: string;
  dataEmissao?: string; // Formato YYYY-MM-DD ou DD/MM/YYYY
  escolaDestino?: string;
  provinciaDestino?: string;
  motivo?: string;
  mode?: 'BOTH' | 'GUIA_ONLY' | 'BOLETIM_ONLY';
  onClose?: () => void;
}

export const TransferenciaGuiaBoletimDocument: React.FC<TransferenciaGuiaBoletimProps> = ({
  student,
  schoolSettings,
  grades = [],
  activeModality = 'ENSINO_PRIMARIO',
  guiaNumero,
  boletimNumero,
  anoLectivo,
  dataEmissao,
  escolaDestino,
  provinciaDestino,
  motivo,
  mode = 'BOTH',
  onClose
}) => {
  const currentYear = new Date().getFullYear();
  const schoolName = (schoolSettings.schoolName || 'COMPLEXO ESCOLAR Nº18 A LUZ DO AMANHÃ').toUpperCase();
  const schoolMunicipality = (schoolSettings.municipality || 'Cafunfo').toUpperCase();
  const schoolProvince = schoolSettings.province || 'Lunda Norte';
  const directorName = schoolSettings.directorName || 'Manuel das Fisgas';
  const subdirectorName = schoolSettings.subdirectorName || 'Gaspar Da Fatima';
  const academicYear = anoLectivo || schoolSettings.academicYear || `${currentYear - 1}/${currentYear}`;

  // Formatação de Datas
  const today = new Date();
  const currentDay = today.getDate();
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const currentMonthName = meses[today.getMonth()];
  const currentYearNum = today.getFullYear();

  // Nomes em Title Case
  const formattedStudentName = toTitleCaseName(student.name || '');
  const formattedFatherName = toTitleCaseName(student.fatherName || '');
  const formattedMotherName = toTitleCaseName(student.motherName || '');
  const formattedDirectorName = toTitleCaseName(directorName);
  const formattedSubdirectorName = toTitleCaseName(subdirectorName);

  // Dados do Documento de Identificação
  const docType = (student.docType || (student.cedulaRegisto && !student.bi ? 'CEDULA' : 'BI')) as 'BI' | 'CEDULA' | 'PASSAPORTE';
  const rawDocNum = docType === 'CEDULA' ? (student.cedulaRegisto || student.bi || '') : (student.bi || student.cedulaRegisto || '');
  const docSector = student.biSector || schoolSettings.municipality || 'Cuango';
  const docDetails = getDocTypeDetails(docType, student.gender || 'M', rawDocNum, docSector);

  // Local de Emissão do Documento
  let issuerLocation = docSector;
  issuerLocation = issuerLocation.replace(/^(arquivo\s+de\s+identifica[çc]ã[oo]\s+de\s+|sector\s+de\s+identifica[çc]ã[oo]\s+de\s+|conservat[óo]ria\s+de\s+|arquivo\s+de\s+)/i, '').trim();
  if (!issuerLocation) issuerLocation = schoolSettings.municipality || 'Cuango';

  // Naturalidade e Município
  const naturalidade = student.naturalidade || student.municipio || schoolSettings.municipality || 'Cafunfo';
  const municipio = student.municipio || student.naturalidade || schoolSettings.municipality || 'Cuango';
  const provincia = student.province || schoolSettings.province || 'Lunda Norte';

  // Informações de Transferência
  const resolvedGuiaNum = guiaNumero || student.guiaTransferenciaSaida || `GS-${currentYear}-001`;
  const resolvedBoletimNum = boletimNumero || `${resolvedGuiaNum.replace(/[^0-9]/g, '').slice(-3) || '1'}/${currentYear}`;
  const targetSchool = (escolaDestino || student.escolaDestino || '______________________________').toUpperCase();
  const targetProvince = provinciaDestino || student.provinciaDestino || schoolProvince;

  // Disciplinas do Aluno
  const studentClass = (student.class || '1').replace(/[^0-9]/g, '') || '1';
  const studentSection = student.section || 'A';
  const studentPeriod = student.periodo || 'MANHÃ';
  const studentSpecialty = student.specialty || '';
  
  const subjectsList = getSubjectsForClass(studentClass, activeModality, studentSpecialty);

  // Mapear Notas dos Trimestres (Trimestre I e II conforme modelo do MED)
  const studentGradesMap: Record<string, {
    t1: { mac?: number | null; npp?: number | null; npt?: number | null; mt?: number | null };
    t2: { mac?: number | null; npp?: number | null; npt?: number | null; mt?: number | null };
    t3: { mac?: number | null; npp?: number | null; npt?: number | null; mt?: number | null };
  }> = {};

  // Inicializar todas as disciplinas
  for (const subj of subjectsList) {
    studentGradesMap[subj] = { t1: {}, t2: {}, t3: {} };
  }

  // Preencher com as notas reais da base de dados
  for (const g of grades) {
    if (g.studentId === student.id) {
      const subName = g.subject as string;
      if (!studentGradesMap[subName]) {
        studentGradesMap[subName] = { t1: {}, t2: {}, t3: {} };
      }
      if (g.trimester === 'I') {
        studentGradesMap[subName].t1 = { mac: g.mac, npp: g.npp, npt: g.npt, mt: g.mt };
      } else if (g.trimester === 'II') {
        studentGradesMap[subName].t2 = { mac: g.mac, npp: g.npp, npt: g.npt, mt: g.mt };
      } else if (g.trimester === 'III') {
        studentGradesMap[subName].t3 = { mac: g.mac, npp: g.npp, npt: g.npt, mt: g.mt };
      }
    }
  }

  // Formatador de valor numérico da nota
  const fmtGrade = (val?: number | null) => {
    if (val === undefined || val === null || val === ('' as any)) return '';
    const num = Number(val);
    if (isNaN(num)) return '';
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
  };

  return (
    <div className="transfer-document-container font-serif text-slate-900 bg-white leading-relaxed select-none">
      
      {/* ========================================================================= */}
      {/* PÁGINA 1: GUIA DE TRANSFERÊNCIA */}
      {/* ========================================================================= */}
      {(mode === 'BOTH' || mode === 'GUIA_ONLY') && (
        <div 
          className={`page-a4 bg-white relative p-10 md:p-14 border border-slate-350 shadow-md mx-auto max-w-[210mm] min-h-[297mm] flex flex-col justify-between ${
            mode === 'BOTH' ? 'page-break-after-always mb-8' : ''
          }`}
          style={{ boxSizing: 'border-box' }}
        >
          {/* Marca d'água no fundo (Watermark) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] overflow-hidden">
            <div className="text-center transform -rotate-45 select-none">
              <span className="text-6xl md:text-8xl font-black uppercase tracking-widest text-slate-950 block">
                {schoolName}
              </span>
              <span className="text-4xl md:text-5xl font-extrabold uppercase tracking-wider text-slate-900 block mt-4">
                {schoolMunicipality} - ANGOLA
              </span>
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            {/* Cabeçalho Oficial com Brasão de Angola */}
            <div className="text-center space-y-1">
              <div className="w-14 h-14 mx-auto mb-2 flex items-center justify-center">
                {schoolSettings.publicLogoUrl && (schoolSettings.publicLogoUrl.startsWith('http') || schoolSettings.publicLogoUrl.startsWith('data')) ? (
                  <img
                    src={schoolSettings.publicLogoUrl}
                    alt="Brasão da República de Angola"
                    className="w-14 h-14 object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-slate-400 flex items-center justify-center bg-slate-50 text-2xl shadow-xs">
                    🇦🇴
                  </div>
                )}
              </div>
              <h2 className="font-bold text-[13px] tracking-wider uppercase text-slate-950">REPÚBLICA DE ANGOLA</h2>
              <h3 className="font-bold text-[12px] tracking-wide uppercase text-slate-900">MINISTÉRIO DA EDUCAÇÃO</h3>
              <h4 className="font-extrabold text-[12px] tracking-wide uppercase text-slate-950">{schoolName}</h4>
              <h5 className="font-semibold text-[11px] tracking-wide uppercase text-slate-800">{schoolMunicipality}</h5>
            </div>

            {/* Título Oficial da Guia */}
            <div className="text-center py-2">
              <h1 className="text-base font-black uppercase tracking-wider text-slate-950 border-b-2 border-slate-900 inline-block pb-1">
                GUIA DE TRANSFERÊNCIA Nº {resolvedGuiaNum}
              </h1>
            </div>

            {/* Texto de Abertura e Identificação do Aluno */}
            <div className="text-justify text-[12px] md:text-[13px] leading-relaxed space-y-3 font-serif">
              <p>
                Conforme solicitado pelo Encarregado de Educação vai o (a) aluno (a) na{' '}
                <span className="font-bold underline">{studentClass}ª Classe</span> da turma{' '}
                <span className="font-bold underline">{studentSection}</span> do Ano Lectivo{' '}
                <span className="font-bold font-mono underline">{academicYear}</span>.
              </p>

              <p>
                De nome <span className="font-bold text-slate-950 uppercase">{formattedStudentName || '__________________________________________'}</span>, filho de{' '}
                <span className="font-bold text-slate-950">{formattedFatherName || '__________________________'}</span> e de{' '}
                <span className="font-bold text-slate-950">{formattedMotherName || '__________________________'}</span>, natural de{' '}
                <span className="font-bold text-slate-950">{naturalidade}</span>, Município de{' '}
                <span className="font-bold text-slate-950">{municipio}</span>, Província de{' '}
                <span className="font-bold text-slate-950">{provincia}</span>, nascido (a) aos{' '}
                <span className="font-bold text-slate-950">{formatBirthDateExtended(student.birthDate || '')}</span>. Portador do{' '}
                <span className="font-bold text-slate-950">{docType === 'CEDULA' ? 'Cédula Pessoal' : 'B.I.'} nº {rawDocNum || '___________________'}</span>, passado pelo arquivo de identificação de{' '}
                <span className="font-bold text-slate-950">{issuerLocation}</span>, aos{' '}
                <span className="font-bold text-slate-950">{student.biDate ? formatBirthDateExtended(student.biDate) : '____ de ______________ de ________'}</span>.
              </p>
            </div>

            {/* Secção: NOTA INFORMATIVA */}
            <div className="space-y-2 pt-2 text-[12px] md:text-[13px]">
              <h4 className="font-black text-center text-[12px] uppercase tracking-wider text-slate-950">
                NOTA INFORMATIVA
              </h4>
              <p className="text-justify font-serif">
                A ser transferido (a) para <span className="font-bold text-slate-950 underline">{targetSchool}</span> ({targetProvince}).
              </p>
              <p className="font-medium text-slate-900">
                Constam no seu processo individual os seguintes documentos:
              </p>
              <ol className="list-decimal list-inside pl-3 space-y-1 font-serif text-[12px]">
                <li>Cópia da cédula pessoal / B.I.;</li>
                <li>Termo de matrícula e frequência;</li>
                <li>Boletim de notas;</li>
                <li>Uma fotografia tipo passe.</li>
              </ol>
            </div>

            {/* Secção: INFORMAÇÕES */}
            <div className="space-y-2 pt-2 text-[12px] md:text-[13px]">
              <h4 className="font-black text-center text-[12px] uppercase tracking-wider text-slate-950">
                INFORMAÇÕES
              </h4>
              <p className="text-justify font-serif">
                O aluno em causa vai frequentar a <span className="font-bold underline">{studentClass}ª classe</span>.
              </p>
              <p className="text-justify font-serif">
                Por ser verdade e me ter sido solicitada, passou-se a presente guia de transferência que vai por mim assinada e autenticada com carimbo a óleo em uso nesta instituição.
              </p>
            </div>

            {/* Datação Oficial */}
            <div className="text-right pt-2 font-serif text-[12px] italic text-slate-900">
              ( “{schoolSettings.schoolName || 'Complexo Escolar'}” em “{schoolSettings.municipality || 'Cafunfo'}”, {currentDay} de {currentMonthName} de {currentYearNum} ).
            </div>
          </div>

          {/* Assinaturas Oficiais */}
          <div className="relative z-10 grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 mt-6 text-center text-[11px] md:text-[12px] font-serif">
            <div className="flex flex-col justify-end items-center">
              <p className="font-bold text-slate-950 mb-8">O Encarregado de Educação</p>
              <div className="w-48 md:w-56 border-b border-slate-900 mb-1"></div>
              <span className="text-[10px] text-slate-500 italic">(Assinatura legível)</span>
            </div>

            <div className="flex flex-col justify-end items-center">
              <p className="font-bold text-slate-950 mb-8">O Director da Escola</p>
              <div className="w-48 md:w-56 border-b border-slate-900 mb-1"></div>
              <p className="font-bold text-slate-950 uppercase text-[10.5px]">{formattedDirectorName}</p>
              <span className="text-[9.5px] text-slate-500 italic">(Director Geral)</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PÁGINA 2: BOLETIM DE NOTAS (TRANSFERÊNCIA DE SAÍDA) */}
      {/* ========================================================================= */}
      {(mode === 'BOTH' || mode === 'BOLETIM_ONLY') && (
        <div 
          className="page-a4 bg-white relative p-10 md:p-14 border border-slate-350 shadow-md mx-auto max-w-[210mm] min-h-[297mm] flex flex-col justify-between"
          style={{ boxSizing: 'border-box' }}
        >
          {/* Marca d'água no fundo (Watermark) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] overflow-hidden">
            <div className="text-center transform -rotate-45 select-none">
              <span className="text-6xl md:text-8xl font-black uppercase tracking-widest text-slate-950 block">
                {schoolName}
              </span>
              <span className="text-4xl md:text-5xl font-extrabold uppercase tracking-wider text-slate-900 block mt-4">
                {schoolMunicipality} - LUNDA NORTE
              </span>
            </div>
          </div>

          <div className="relative z-10 space-y-4">
            {/* Cabeçalho Oficial */}
            <div className="text-center space-y-1">
              <div className="w-14 h-14 mx-auto mb-2 flex items-center justify-center">
                {schoolSettings.publicLogoUrl && (schoolSettings.publicLogoUrl.startsWith('http') || schoolSettings.publicLogoUrl.startsWith('data')) ? (
                  <img
                    src={schoolSettings.publicLogoUrl}
                    alt="Brasão da República de Angola"
                    className="w-14 h-14 object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-slate-400 flex items-center justify-center bg-slate-50 text-2xl shadow-xs">
                    🇦🇴
                  </div>
                )}
              </div>
              <h2 className="font-bold text-[13px] tracking-wider uppercase text-slate-950">REPÚBLICA DE ANGOLA</h2>
              <h3 className="font-bold text-[12px] tracking-wide uppercase text-slate-900">MINISTÉRIO DA EDUCAÇÃO</h3>
              <h4 className="font-extrabold text-[12px] tracking-wide uppercase text-slate-950">{schoolName}</h4>
              <h5 className="font-semibold text-[11px] tracking-wide uppercase text-slate-800">{schoolMunicipality}</h5>
            </div>

            {/* Título do Boletim */}
            <div className="text-center py-1">
              <h1 className="text-base font-black uppercase tracking-wider text-slate-950 border-b-2 border-slate-900 inline-block pb-1">
                BOLETIM DE NOTA Nº {resolvedBoletimNum}
              </h1>
            </div>

            {/* Identificação do Aluno */}
            <div className="text-justify text-[11.5px] md:text-[12px] leading-relaxed font-serif space-y-2">
              <p>
                <span className="font-bold">Nome:</span> <span className="font-bold text-red-600 uppercase underline">{formattedStudentName}</span>, filho (a) de <span className="font-bold text-slate-950">{formattedFatherName || '__________________________'}</span> e de <span className="font-bold text-slate-950">{formattedMotherName || '__________________________'}</span>, Natural de <span className="font-bold text-slate-950">{naturalidade}</span>, Município de <span className="font-bold text-slate-950">{municipio}</span>, Província de <span className="font-bold text-slate-950">{provincia}</span>. Nascido (a) aos <span className="font-bold text-slate-950">{formatBirthDateExtended(student.birthDate || '')}</span>; portador de <span className="font-bold text-slate-950">{docType === 'CEDULA' ? 'Cédula Pessoal' : 'B.I.'} Nº {rawDocNum || '___________________'}</span> passado pelo Arquivo de Identificação de <span className="font-bold text-slate-950">{issuerLocation}</span>, aos <span className="font-bold text-slate-950">{student.biDate ? formatBirthDateExtended(student.biDate) : '____ de ______________ de ________'}</span>.
              </p>

              <p>
                Frequentou os seus estudos nesta escola, na turma: <span className="font-bold underline">{studentSection}</span> no período <span className="font-bold underline">{studentPeriod}</span> no ano Lectivo <span className="font-bold font-mono underline">{academicYear}</span>; conclui com êxito o I e II trimestre à <span className="font-bold underline">{studentClass}ª classe</span>, como consta na Mini-pauta arquivada nesta secretaria.
              </p>
            </div>

            {/* Título da Tabela de Classificações */}
            <div className="text-center pt-2">
              <h3 className="font-black text-[11px] md:text-[12px] uppercase tracking-wider text-slate-950">
                RESULTADO DO I E II TRIMESTRE DA {studentClass}ª CLASSE
              </h3>
            </div>

            {/* TABELA OFICIAL DE DISCIPLINAS E NOTAS (MAC, NPP, NPT) */}
            <div className="overflow-x-auto my-2">
              <table className="w-full border-collapse border-2 border-slate-800 text-[10px] md:text-[11px] font-sans">
                <thead>
                  <tr className="bg-slate-100 text-slate-950 font-bold border-b border-slate-800">
                    <th rowSpan={2} className="border border-slate-700 px-3 py-1.5 text-left uppercase w-[40%]">
                      DISCIPLINAS
                    </th>
                    <th colSpan={3} className="border border-slate-700 px-2 py-1 text-center uppercase bg-slate-50">
                      I TRIMESTRE
                    </th>
                    <th colSpan={3} className="border border-slate-700 px-2 py-1 text-center uppercase bg-slate-100">
                      II TRIMESTRE
                    </th>
                  </tr>
                  <tr className="bg-slate-150 text-slate-900 font-extrabold text-[9.5px] border-b-2 border-slate-800 text-center">
                    <th className="border border-slate-700 px-1 py-1 w-[10%]">MAC</th>
                    <th className="border border-slate-700 px-1 py-1 w-[10%]">NPP</th>
                    <th className="border border-slate-700 px-1 py-1 w-[10%]">NPT</th>
                    <th className="border border-slate-700 px-1 py-1 w-[10%]">MAC</th>
                    <th className="border border-slate-700 px-1 py-1 w-[10%]">NPP</th>
                    <th className="border border-slate-700 px-1 py-1 w-[10%]">NPT</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-slate-700 px-3 py-4 text-center text-slate-400 italic">
                        Nenhuma disciplina registada na matriz curricular da {studentClass}ª Classe.
                      </td>
                    </tr>
                  ) : (
                    subjectsList.map((subj, idx) => {
                      const g = studentGradesMap[subj] || { t1: {}, t2: {}, t3: {} };
                      return (
                        <tr 
                          key={subj} 
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                        >
                          <td className="border border-slate-700 px-2.5 py-1 text-left font-semibold text-slate-950 uppercase text-[10px]">
                            {subj}
                          </td>
                          {/* Trimestre I */}
                          <td className="border border-slate-700 px-1 py-1 text-center font-mono font-bold text-slate-900">
                            {fmtGrade(g.t1.mac)}
                          </td>
                          <td className="border border-slate-700 px-1 py-1 text-center font-mono font-bold text-slate-900">
                            {fmtGrade(g.t1.npp)}
                          </td>
                          <td className="border border-slate-700 px-1 py-1 text-center font-mono font-bold text-slate-900">
                            {fmtGrade(g.t1.npt)}
                          </td>
                          {/* Trimestre II */}
                          <td className="border border-slate-700 px-1 py-1 text-center font-mono font-bold text-slate-900">
                            {fmtGrade(g.t2.mac)}
                          </td>
                          <td className="border border-slate-700 px-1 py-1 text-center font-mono font-bold text-slate-900">
                            {fmtGrade(g.t2.npp)}
                          </td>
                          <td className="border border-slate-700 px-1 py-1 text-center font-mono font-bold text-slate-900">
                            {fmtGrade(g.t2.npt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Parágrafo de Fecho */}
            <div className="text-justify text-[11.5px] leading-relaxed font-serif pt-1">
              <p>
                Por ser verdade, e conforme solicitado pelo seu encarregado de Educação, mandei passar o presente Boletim que vai por mim assinado e autenticado com carimbo à óleo em uso nesta Direção Escolar.
              </p>
            </div>

            {/* Localidade e Data */}
            <div className="text-left font-serif text-[12px] pt-1 text-slate-950">
              {schoolSettings.municipality || 'Cafunfo'}, aos {currentDay} de {currentMonthName} de {currentYearNum}
            </div>
          </div>

          {/* Assinatura Oficial do Subdirector Pedagógico */}
          <div className="relative z-10 flex flex-col items-center justify-center pt-6 border-t border-slate-300 mt-4 text-center font-serif">
            <p className="font-bold text-slate-950 text-[12px] mb-8">O Subdiretor Pedagógico</p>
            <div className="w-64 border-b border-slate-900 mb-1"></div>
            <p className="font-bold text-slate-950 uppercase text-[11px]">{formattedSubdirectorName}</p>
            <span className="text-[9.5px] text-slate-500 italic">(Assinante Oficial)</span>
          </div>
        </div>
      )}

      {/* Estilos Exclusivos para Impressão A4 */}
      <style>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .transfer-document-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .page-a4 {
            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;
            margin: 0 auto !important;
            padding: 20mm 15mm !important;
            border: none !important;
            box-shadow: none !important;
          }
          .page-break-after-always {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TransferenciaGuiaBoletimDocument;
