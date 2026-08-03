/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SchoolSettings } from '../../types';
import { notaParaExtenso, formatBirthDateExtended } from './CertificadoDocument';

export function toTitleCaseName(str: string): string {
  if (!str) return '';
  const lowercaseWords = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'del', 'la']);
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, idx) => {
      if (idx > 0 && lowercaseWords.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function getDocTypeDetails(
  docType: 'BI' | 'CEDULA' | 'PASSAPORTE' | string | undefined,
  gender: 'M' | 'F',
  docNum: string,
  sector: string
) {
  const portador = gender === 'F' ? 'portadora' : 'portador';
  const numText = docNum || '_______________________';
  
  let cleanSector = (sector || '').trim();
  cleanSector = cleanSector.replace(/^(arquivo\s+de\s+identifica[çc]ã[oo]\s+de\s+|sector\s+de\s+identifica[çc]ã[oo]\s+de\s+|conservat[óo]ria\s+de\s+|arquivo\s+de\s+)/i, '').trim();
  if (!cleanSector) cleanSector = '_______________________';

  const type = (docType || 'BI').toUpperCase();

  if (type === 'CEDULA') {
    return {
      typeLabel: 'Cédula de Registo Pessoal',
      docPhrase: `${portador} da Cédula de Registo Pessoal n.º ${numText}`,
      issuerPhrase: `passada pela Conservatória / Registo Civil de ${cleanSector}`
    };
  } else if (type === 'PASSAPORTE') {
    return {
      typeLabel: 'Passaporte',
      docPhrase: `${portador} do Passaporte n.º ${numText}`,
      issuerPhrase: `passado pelo Serviço de Migração e Estrangeiros de ${cleanSector}`
    };
  } else {
    return {
      typeLabel: 'B.I.',
      docPhrase: `${portador} do B.I. n.º ${numText}`,
      issuerPhrase: `passado pelo Arquivo de Identificação de ${cleanSector}`
    };
  }
}

export interface DeclaracaoDocumentProps {
  subsistema: 'PRIMARIO' | 'PUNIV' | 'MAGISTERIO' | 'HUB';
  docType?: 'BI' | 'CEDULA' | 'PASSAPORTE' | string;
  studentName: string;
  gender: 'M' | 'F';
  fatherName: string;
  motherName: string;
  birthDate: string;
  naturalidade: string;
  municipio: string;
  provincia: string;
  biNumber: string;
  biSector: string;
  biDate: string;
  schoolSettings: SchoolSettings;
  decretoCriacao: string;
  anoLectivo: string;
  selectedClass: string;
  selectedTurma: string;
  selectedNoAluno: string;
  selectedSpecialty: string;
  livroRegisto: string;
  folhaRegisto: string;
  currentDay: number;
  currentMonth: string;
  currentYear: number;
  logoUrl?: string;

  // Grades for Declaration
  activeDeclSubjects: string[];
  decGrades: Record<string, number | ''>;
}

/**
 * Component for Rendering Official Declarations (Declarações)
 * Specialized templates for:
 * - 1ª, 2ª, 3ª, 4ª e 5ª Classe (Ensino Primário)
 * - 7ª e 8ª Classe (Iº Ciclo Ensino Secundário Geral)
 * - 10ª e 11ª Classe (IIº Ciclo Liceu / PUNIV)
 * - 10ª, 11ª e 12ª Classe (IIº Ciclo Secundário Pedagógico / Magistério)
 * 
 * Rules:
 * - Director's Name MUST be in Bold Black (Negrito Preto)
 * - Student's Name MUST be in Bold Red (Negrito Vermelho)
 * - BI / Cédula Number MUST be in Bold Black (Negrito Preto)
 * - All names must use Title Case (Iniciais Maiúsculas e restante minúsculas)
 * - 1ª a 5ª Classe signed exclusively by Director
 */
export const DeclaracaoDocument: React.FC<DeclaracaoDocumentProps> = ({
  subsistema,
  docType,
  studentName,
  gender,
  fatherName,
  motherName,
  birthDate,
  naturalidade,
  municipio,
  provincia,
  biNumber,
  biSector,
  biDate,
  schoolSettings,
  decretoCriacao,
  anoLectivo,
  selectedClass,
  selectedTurma,
  selectedNoAluno,
  selectedSpecialty,
  livroRegisto,
  folhaRegisto,
  currentDay,
  currentMonth,
  currentYear,
  logoUrl,
  activeDeclSubjects,
  decGrades
}) => {
  const directorName = schoolSettings.directorName || 'Director(a) da Escola';
  const directorRole = schoolSettings.directorRoleLabel || 'Director(a)';
  const schoolName = schoolSettings.schoolName || 'Complexo Escolar';
  const schoolMunicipality = schoolSettings.municipality || 'Cafunfo';
  const schoolProvince = schoolSettings.province || 'Lunda Norte';

  const numClass = parseInt(selectedClass, 10);
  
  // Categorize level based on subsystem and selected class
  const isPrimary = (subsistema === 'PRIMARIO' && numClass <= 5) || numClass <= 5;
  const isCiclo1 = (subsistema === 'PRIMARIO' && (numClass === 7 || numClass === 8)) || numClass === 7 || numClass === 8;

  let subHeaderTitle = 'ENSINO PRIMÁRIO';

  if (isPrimary) {
    subHeaderTitle = 'ENSINO PRIMÁRIO';
  } else if (isCiclo1) {
    subHeaderTitle = 'Iº CICLO DO ENSINO SECUNDÁRIO GERAL';
  } else {
    subHeaderTitle = (schoolSettings.schoolName || schoolName || 'COMPLEXO ESCOLAR').toUpperCase();
  }

  const formattedDirectorName = toTitleCaseName(directorName);
  const formattedStudentName = toTitleCaseName(studentName);
  const formattedFatherName = toTitleCaseName(fatherName);
  const formattedMotherName = toTitleCaseName(motherName);

  const docDetails = getDocTypeDetails(docType, gender, biNumber, biSector);

  return (
    <div className="bg-white border border-slate-300 shadow-md rounded-lg p-6 font-serif text-[12px] text-slate-850 space-y-4 max-h-[750px] overflow-y-auto leading-relaxed select-none relative">
      
      {/* Official Header */}
      <div className="text-center space-y-0.5 border-b border-double border-slate-300 pb-3">
        {logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('http')) ? (
          <img
            src={logoUrl}
            alt="Logo da Escola"
            className="mx-auto w-10 h-10 rounded-full object-cover border border-slate-300 mb-1"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-10 h-10 border-2 border-slate-300 rounded-full mx-auto flex items-center justify-center font-bold text-[10px] text-slate-500 bg-slate-50 mb-1">
            🇦🇴
          </div>
        )}
        <h3 className="font-bold text-slate-950 tracking-wide uppercase text-[10px]">República de Angola</h3>
        <h4 className="font-bold text-slate-900 tracking-wide uppercase text-[10px]">Ministério da Educação</h4>
        <p className="text-[11px] uppercase tracking-wide text-indigo-700 font-extrabold mt-1">
          {subHeaderTitle}
        </p>
        <h1 className="text-sm font-black text-slate-950 tracking-wider mt-2 uppercase">
          DECLARAÇÃO DE HABILITAÇÕES
        </h1>
      </div>

      {/* Body Content */}
      <div className="space-y-4 font-serif text-[12px] leading-relaxed text-justify">

        <p className="text-justify font-serif text-slate-900 leading-relaxed text-[12px]">
          {/* Director's Name: Bold Black */}
          <span className="font-bold text-slate-950">{formattedDirectorName}</span>, {directorRole} do{' '}
          <span className="font-bold text-slate-950">{schoolName}</span>, em{' '}
          <span className="font-bold text-slate-950">{schoolMunicipality}</span>,{' '}
          <span className="font-bold text-slate-950">{schoolProvince}</span>, criado sob o{' '}
          <span className="italic font-bold text-slate-950">{decretoCriacao || schoolSettings.decretoExecutivo || schoolSettings.despachoCriacao || 'Decreto Executivo nº 445/16 de 25 de Novembro'}</span>, declara que,{' '}
          {/* Student's Name: Bold Red */}
          <span className="font-bold text-red-600">{formattedStudentName || '[Nome do Aluno]'}</span>, {gender === 'F' ? 'filha' : 'filho'} de{' '}
          <span className="text-slate-900">{formattedFatherName || '[Nome do Pai]'}</span> e de{' '}
          <span className="text-slate-900">{formattedMotherName || '[Nome da Mãe]'}</span>, {gender === 'F' ? 'nascida' : 'nascido'} aos{' '}
          <span className="text-slate-900">{formatBirthDateExtended(birthDate)}</span>, Natural de{' '}
          <span className="text-slate-900">{naturalidade || '[Naturalidade]'}</span>, Município de{' '}
          <span className="text-slate-900">{municipio || '[Município]'}</span>, Província de{' '}
          <span className="text-slate-900">{provincia || '[Província]'}</span>, <span className="font-bold text-slate-950">{docDetails.docPhrase}</span>, <span className="text-slate-900">{docDetails.issuerPhrase}</span>. Frequentou no Ano Lectivo de{' '}
          <span className="font-mono text-slate-900">{anoLectivo}</span>, a{' '}
          <span className="text-slate-950">{selectedClass}ª Classe</span>, turma{' '}
          <span className="text-slate-950">{selectedTurma}</span>, sob nº{' '}
          <span className="text-slate-950">{selectedNoAluno}</span>, tendo obtido o resultado final{' '}
          <span className="text-emerald-700 uppercase font-semibold">APTO (A)</span>, com as seguintes classificações:
        </p>

        {/* Grades Table Grid */}
        <div className="my-3">
          <table className="w-full border-collapse border border-slate-400 text-[11px] font-sans">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-900 border-b border-slate-400 uppercase text-[10px]">
                <th className="p-2 border-r border-slate-400 text-left">Disciplina</th>
                <th className="p-2 border-r border-slate-400 text-center w-32">Classificação</th>
                <th className="p-2 text-center w-48">Por Extenso</th>
              </tr>
            </thead>
            <tbody>
              {activeDeclSubjects.map((subj, idx) => {
                const val = decGrades[subj] !== undefined ? decGrades[subj] : '';
                const numVal = Number(val);
                const passingThreshold = numClass <= 6 ? 5 : 10;
                const isPos = val !== '' && !isNaN(numVal) && numVal >= passingThreshold;
                const isNeg = val !== '' && !isNaN(numVal) && numVal < passingThreshold;
                const gradeColorClass = isPos ? 'text-blue-600 font-extrabold' : isNeg ? 'text-red-600 font-extrabold' : 'text-slate-600 font-bold';

                return (
                  <tr key={subj} className={idx % 2 === 0 ? 'bg-white border-b border-slate-300' : 'bg-slate-50/60 border-b border-slate-300'}>
                    <td className="p-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-300">{subj}</td>
                    <td className={`p-1.5 text-center border-r border-slate-300 ${gradeColorClass}`}>
                      {val !== '' ? `${val}` : '--'}
                    </td>
                    <td className={`p-1.5 text-center font-medium ${isPos ? 'text-blue-800' : isNeg ? 'text-red-800' : 'text-slate-800'}`}>
                      {val !== '' ? `${notaParaExtenso(numVal)} Valores` : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legal statement & Register Book */}
        <div className="text-[12px] pt-1 font-serif text-slate-900 space-y-2">
          <p className="text-justify leading-relaxed">
            Por ser verdade, e me ter sido solicitado, mandei passar a presente <span className="font-bold uppercase">DECLARAÇÃO</span> que vai por mim assinada e autenticada com Carimbo a óleo em uso nesta Instituição.
          </p>
          <p className="text-center mt-3 font-semibold text-[12px]">
            <span className="text-slate-950">{schoolName} do {schoolMunicipality}</span>, aos{' '}
            <span className="text-slate-950">{currentDay} de {currentMonth} de {currentYear}</span>.
          </p>
        </div>

        {/* Signatures */}
        {numClass <= 5 || subsistema === 'MAGISTERIO' ? (
          <div className="text-center pt-6 text-[9px] font-sans max-w-xs mx-auto">
            <p className="font-bold uppercase text-slate-950">{String(directorRole).toUpperCase()}</p>
            <div className="border-b border-slate-400 w-36 mx-auto mt-6"></div>
            <p className="font-bold text-slate-950 mt-1">{formattedDirectorName}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-center pt-6 text-[8.5px] font-sans">
            <div>
              <p className="font-bold uppercase text-slate-950">O SUBDIRECTOR PEDAGÓGICO</p>
              <div className="border-b border-slate-400 w-28 mx-auto mt-6"></div>
              <p className="text-slate-600 mt-1 font-medium">{toTitleCaseName(schoolSettings.subdirectorName || 'Dr. Subdirector Pedagógico')}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-950">{String(directorRole).toUpperCase()}</p>
              <div className="border-b border-slate-400 w-28 mx-auto mt-6"></div>
              <p className="font-bold text-slate-950 mt-1">{formattedDirectorName}</p>
            </div>
          </div>
        )}

        {/* Institutional Contact Footer */}
        <div className="mt-8 pt-3 border-t border-slate-300 text-center font-sans text-[9px] text-slate-600 space-y-0.5">
          <p className="font-bold text-slate-800 uppercase tracking-wider">{schoolName}</p>
          <div className="flex items-center justify-center gap-2 text-slate-600 flex-wrap text-[8.5px]">
            <span><strong className="text-slate-700">Contacto:</strong> {schoolSettings.phone || '+244 923 000 000'}</span>
            <span>•</span>
            <span><strong className="text-slate-700">Endereço:</strong> {schoolSettings.address || `${schoolMunicipality}, ${schoolProvince}`}</span>
            <span>•</span>
            <span><strong className="text-slate-700">E-mail:</strong> {schoolSettings.email || 'contacto@escola.ao'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

