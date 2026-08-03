/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SchoolSettings, getLeiBaseForCertificate } from '../../types';
import { toTitleCaseName, getDocTypeDetails } from './DeclaracaoDocument';

export function formatSiglaOnly(subjName: string): string {
  if (!subjName) return '';
  let s = subjName.trim();
  if (s.includes('(')) {
    const parts = s.split('(');
    const prefix = parts[0].trim();
    if (prefix.length > 0) {
      s = prefix;
    } else {
      s = parts[1].replace(/\)/g, '').trim();
    }
  }
  return s;
}

export function notaParaExtenso(nota: number): string {
  const porExtenso: Record<number, string> = {
    0: 'Zero',
    1: 'Um',
    2: 'Dois',
    3: 'Três',
    4: 'Quatro',
    5: 'Cinco',
    6: 'Seis',
    7: 'Sete',
    8: 'Oito',
    9: 'Nove',
    10: 'Dez',
    11: 'Onze',
    12: 'Doze',
    13: 'Treze',
    14: 'Catorze',
    15: 'Quinze',
    16: 'Dezasseis',
    17: 'Dezassete',
    18: 'Dezoito',
    19: 'Dezanove',
    20: 'Vinte'
  };
  return porExtenso[Math.round(nota)] || String(nota);
}

export function formatBirthDateExtended(dateStr: string): string {
  if (!dateStr) return '_____';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mName = meses[monthIdx] || parts[1];
  return `${day} de ${mName} de ${year}`;
}

export interface CertificadoDocumentProps {
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
  selectedTurma?: string;
  selectedNoAluno?: string;
  selectedNivel?: 'TODOS' | 'I' | 'II' | 'III';
  selectedSpecialty: string;
  leiBaseText?: string;
  livroRegisto: string;
  folhaRegisto: string;
  currentDay: number;
  currentMonth: string;
  currentYear: number;
  logoUrl?: string;
  
  // Grade tables & averages
  subjectsForCertificado?: Array<{
    name: string;
    cycles: { I: boolean; II: boolean; III: boolean };
  }>;
  certGrades?: Record<string, Record<'I' | 'II' | 'III', number | ''>>;
  certComputedAverages?: {
    rows: Record<string, { media: number | null; extenso: string }>;
    globalAverage: number | null;
  };
  singleCycleAverage?: { media: number | null; extenso: string };
  
  punivSubjs?: { geral: string[]; especifica: string[]; opcao: string[] };
  punivGrades?: Record<string, Record<'10' | '11' | '12', string | number>>;
  calcPunivSubjectAverage?: (sub: string) => number | null;
  
  magisterioSubjs?: { geralCientifica: string[]; pedagogica: string[]; metodologias: string[] };
  magisterioGrades?: Record<string, Record<'10' | '11' | '12' | '13', string | number>>;
  calcMagisterioSubjectAverage?: (sub: string) => number | null;
  calcMagisterioClassAverage?: (cls: '10' | '11' | '12') => number | null;
  
  mediaFinalCurso?: string;
  notaEstagio?: number | string;
  notaPAP?: number | string;
}

/**
 * Component for Rendering Official Certificates (Certificados)
 * Supports:
 * - 6ª Classe (Fim de Ciclo Ensino Primário)
 * - 9ª Classe (Fim de Iº Ciclo Ensino Secundário Geral)
 * - 12ª Classe (Fim de IIº Ciclo Liceu / PUNIV)
 * - 13ª Classe (Fim de IIº Ciclo Secundário Pedagógico / Magistério)
 * 
 * Rules:
 * - Director's Name MUST be in Bold Black (Negrito Preto)
 * - Student's Name MUST be in Bold Red (Negrito Vermelho)
 */
export const CertificadoDocument: React.FC<CertificadoDocumentProps> = ({
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
  selectedTurma = '___',
  selectedNoAluno = '____',
  selectedNivel = 'TODOS',
  selectedSpecialty,
  leiBaseText,
  livroRegisto,
  folhaRegisto,
  currentDay,
  currentMonth,
  currentYear,
  logoUrl,
  
  subjectsForCertificado = [],
  certGrades = {},
  certComputedAverages = { rows: {}, globalAverage: null },
  singleCycleAverage = { media: null, extenso: '-' },
  
  punivSubjs,
  punivGrades = {},
  calcPunivSubjectAverage = () => null,
  
  magisterioSubjs,
  magisterioGrades = {},
  calcMagisterioSubjectAverage = () => null,
  calcMagisterioClassAverage = () => null,
  
  mediaFinalCurso = '',
  notaEstagio = '',
  notaPAP = ''
}) => {
  const directorName = schoolSettings.directorName || 'Director(a) da Escola';
  const directorRole = schoolSettings.directorRoleLabel || 'Director(a)';
  const schoolName = schoolSettings.schoolName || 'Complexo Escolar';
  const schoolMunicipality = schoolSettings.municipality || 'Município';
  const schoolProvince = schoolSettings.province || 'Província';

  const is9thGrade = selectedClass === '9';

  const directorTitle = toTitleCaseName(directorName);
  const studentTitle = toTitleCaseName(studentName);
  const fatherTitle = toTitleCaseName(fatherName);
  const motherTitle = toTitleCaseName(motherName);

  const docDetails = getDocTypeDetails(docType, gender, biNumber, biSector);

  return (
    <div className="bg-white border border-slate-300 shadow-md rounded-lg p-6 font-serif text-[10px] text-slate-850 space-y-4 max-h-[750px] overflow-y-auto leading-relaxed select-none relative">
      
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
        <h3 className="font-bold text-slate-950 tracking-wide uppercase text-[8.5px]">República de Angola</h3>
        <h4 className="font-bold text-slate-900 tracking-wide uppercase text-[8.5px]">Ministério da Educação</h4>
        <p className="text-[8px] uppercase tracking-wide text-indigo-700 font-extrabold">
          {subsistema === 'PRIMARIO'
            ? (is9thGrade ? 'Iº Ciclo do Ensino Secundário Geral' : 'Ensino Primário')
            : subsistema === 'PUNIV' 
              ? 'IIº Ciclo do Ensino Secundário Geral (LICEU)' 
              : 'IIº Ciclo Secundário Pedagógico (MAGISTÉRIO)'
          }
        </p>
        <h1 className="text-xs font-black text-slate-950 tracking-wider mt-1.5 uppercase">
          {is9thGrade ? 'CERTIFICADO DE HABILITAÇÕES LITERÁRIAS (9ª CLASSE)' : 'CERTIFICADO'}
        </h1>
      </div>

      {/* Body Content */}
      <div className="space-y-3 font-serif text-[10px] leading-relaxed text-justify">

        {/* 1. ENSINO PRIMÁRIO OU 9ª CLASSE (6ª ou 9ª Classe) */}
        {subsistema === 'PRIMARIO' && (
          <div>
            <p className="text-justify font-serif text-slate-900 leading-relaxed">
              {/* Director's Name: Bold Black */}
              <span className="font-bold text-slate-950">{directorTitle}</span>, {directorRole} do{' '}
              <span className="font-bold text-slate-950">{schoolName}</span>, em{' '}
              <span className="font-bold text-slate-950">{schoolMunicipality}</span>,{' '}
              <span className="font-bold text-slate-950">{schoolProvince}</span>, criado sob o{' '}
              <span className="italic font-bold text-slate-950">{decretoCriacao}</span>, certifica que,{' '}
              {/* Student's Name: Bold Red */}
              <span className="font-bold text-red-600 underline">{studentTitle || '________________________'}</span>,{' '}
              {gender === 'F' ? 'filha' : 'filho'} de <span className="font-bold text-slate-900">{fatherTitle || '________________________'}</span> e de <span className="font-bold text-slate-900">{motherTitle || '________________________'}</span>, {gender === 'F' ? 'nascida' : 'nascido'} aos <span className="font-bold text-slate-900">{formatBirthDateExtended(birthDate)}</span>, natural de <span className="font-bold text-slate-900">{naturalidade || '________________________'}</span> Município de <span className="font-bold text-slate-900">{municipio || '________________________'}</span> Província de <span className="font-bold text-slate-900">{provincia || '________________________'}</span>, {docType === 'CEDULA' ? 'portador(a) da Cédula de Registo Pessoal n.º' : docType === 'PASSAPORTE' ? 'portador(a) do Passaporte n.º' : `${gender === 'F' ? 'portadora' : 'portador'} do B.I. n.º`} <span className="font-bold text-slate-950">{biNumber || '________________________'}</span>, <span className="font-bold text-slate-900">{docDetails.issuerPhrase}</span> aos <span className="font-bold text-slate-900">{biDate ? formatBirthDateExtended(biDate) : '________________________'}</span>. Concluiu no ano lectivo <span className="font-bold font-mono text-slate-900">{anoLectivo}</span> na turma <span className="font-bold text-slate-900">{selectedTurma || '___'}</span> sob o nº <span className="font-bold text-slate-900">{selectedNoAluno || '____'}</span> o <span className="font-bold text-slate-950">
                {is9thGrade 
                  ? 'ENSINO GERAL'
                  : selectedNivel === 'I' ? 'I CICLO DO ENSINO PRIMÁRIO' : selectedNivel === 'II' ? 'II CICLO DO ENSINO PRIMÁRIO' : selectedNivel === 'III' ? 'III CICLO DO ENSINO PRIMÁRIO' : 'ENSINO PRIMÁRIO'
                }
              </span>, conforme o {leiBaseText || getLeiBaseForCertificate(schoolSettings, subsistema, is9thGrade ? '9' : selectedClass)}, com a Média Final de{' '}
              <span className="font-bold text-red-600 underline">
                {selectedNivel === 'TODOS' 
                  ? (certComputedAverages.globalAverage !== null ? certComputedAverages.globalAverage : '___') 
                  : (singleCycleAverage.media !== null ? singleCycleAverage.media : '___')
                }
              </span> valores obtidos nas seguintes classificações por ciclo de aprendizagem:
            </p>

            {/* Table of Grades */}
            {subjectsForCertificado.length > 0 && (
              <table className="w-full text-left border-collapse border border-slate-300 mt-2 text-[8px] font-serif">
                <thead>
                  <tr className="bg-slate-50 font-bold border-b border-slate-300 text-center">
                    <th rowSpan={2} className="border border-slate-300 p-1 text-left">Disciplinas</th>
                    {(selectedNivel === 'TODOS' || selectedNivel === 'I') && <th rowSpan={is9thGrade ? 2 : 1} className="border border-slate-300 p-1">{is9thGrade ? '7ª Classe' : 'I Ciclo'}</th>}
                    {(selectedNivel === 'TODOS' || selectedNivel === 'II') && <th rowSpan={is9thGrade ? 2 : 1} className="border border-slate-300 p-1">{is9thGrade ? '8ª Classe' : 'II Ciclo'}</th>}
                    {(selectedNivel === 'TODOS' || selectedNivel === 'III') && <th rowSpan={is9thGrade ? 2 : 1} className="border border-slate-300 p-1">{is9thGrade ? '9ª Classe' : 'III Ciclo'}</th>}
                    <th rowSpan={2} className="border border-slate-300 p-1 bg-slate-50">Média Final</th>
                    <th rowSpan={2} className="border border-slate-300 p-1 bg-slate-50">Média por Extenso</th>
                  </tr>
                  {selectedNivel === 'TODOS' && !is9thGrade && (
                    <tr className="bg-slate-50 font-bold border-b border-slate-300 text-center text-[7.5px]">
                      <th className="border border-slate-300 p-0.5">2ª Classe</th>
                      <th className="border border-slate-300 p-0.5">4ª Classe</th>
                      <th className="border border-slate-300 p-0.5">6ª Classe</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {subjectsForCertificado.map(subj => {
                    const v = certGrades[subj.name] || { I: '', II: '', III: '' };
                    const r = certComputedAverages.rows[subj.name];

                    const renderVal = (val: string | number) => {
                      if (val === '' || val === null || val === undefined) return '--';
                      const num = Number(val);
                      if (isNaN(num)) return val;
                      const passingThreshold = subsistema === 'PRIMARIO' ? 5 : 10;
                      return num >= passingThreshold ? <span className="text-blue-600 font-bold">{val}</span> : <span className="text-red-600 font-bold">{val}</span>;
                    };

                    return (
                      <tr key={subj.name} className="hover:bg-slate-50 border-b border-slate-200">
                        <td className="border border-slate-300 p-1 font-bold text-slate-900">{subj.name}</td>
                        {(selectedNivel === 'TODOS' || selectedNivel === 'I') && (
                          <td className={`border border-slate-300 p-1 text-center ${!subj.cycles.I ? 'bg-slate-200' : ''}`}>
                            {subj.cycles.I ? renderVal(v.I) : ''}
                          </td>
                        )}
                        {(selectedNivel === 'TODOS' || selectedNivel === 'II') && (
                          <td className={`border border-slate-300 p-1 text-center ${!subj.cycles.II ? 'bg-slate-200' : ''}`}>
                            {subj.cycles.II ? renderVal(v.II) : ''}
                          </td>
                        )}
                        {(selectedNivel === 'TODOS' || selectedNivel === 'III') && (
                          <td className={`border border-slate-300 p-1 text-center ${!subj.cycles.III ? 'bg-slate-200' : ''}`}>
                            {subj.cycles.III ? renderVal(v.III) : ''}
                          </td>
                        )}
                        <td className="border border-slate-300 p-1 text-center font-bold">
                          {r && r.media !== null ? renderVal(r.media) : '--'}
                        </td>
                        <td className="border border-slate-300 p-1 text-center font-medium text-[7.5px]">
                          {r && r.extenso ? r.extenso : '--'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <p className="text-justify font-serif text-slate-900 mt-2">
              Para efeitos legais lhe é passado o presente <span className="font-bold uppercase">CERTIFICADO</span>, que consta no livro de registo nº <span className="font-bold text-red-600 underline">{livroRegisto || '_______'}</span>, folha <span className="font-bold text-red-600 underline">{folhaRegisto || '_______'}</span> assinado por mim e autenticado com carimbo a óleo em uso neste estabelecimento de ensino.
            </p>
          </div>
        )}

        {/* 2. LICEU / PUNIV (12ª CLASSE) */}
        {subsistema === 'PUNIV' && (
          <div>
            <p className="text-justify font-serif text-slate-900">
              {/* Director: Bold Black */}
              <span className="font-bold text-slate-950">{directorTitle}</span>, {directorRole} do{' '}
              <span className="font-bold text-slate-950">{schoolName}</span>, em{' '}
              <span className="font-bold text-slate-950">{schoolMunicipality}</span>,{' '}
              <span className="font-bold text-slate-950">{schoolProvince}</span>, criado sob o{' '}
              <span className="italic font-bold text-slate-950">{decretoCriacao}</span>, certifica que{' '}
              {/* Student: Bold Red */}
              <span className="font-bold text-red-600 underline">{studentTitle || '[Nome Completo do Aluno]'}</span>, filho(a) de <span className="font-bold text-slate-900">{fatherTitle || '[Nome do Pai]'}</span> e de <span className="font-bold text-slate-900">{motherTitle || '[Nome da Mãe]'}</span>, nascido(a) aos <span className="font-bold text-slate-900">{formatBirthDateExtended(birthDate)}</span>, natural de <span className="font-bold text-slate-900">{naturalidade || '[Localidade]'}</span> Município de <span className="font-bold text-slate-900">{municipio || '[Município]'}</span> Província de <span className="font-bold text-slate-900">{provincia || '[Província]'}</span>, {docType === 'CEDULA' ? 'portador(a) da Cédula de Registo Pessoal n.º' : docType === 'PASSAPORTE' ? 'portador(a) do Passaporte n.º' : `${gender === 'F' ? 'portadora' : 'portador'} do B.I. n.º`} <span className="font-bold text-slate-950">{biNumber || '________________________'}</span>, <span className="font-bold text-slate-900">{docDetails.issuerPhrase}</span> aos <span className="font-bold text-slate-900">{biDate ? formatBirthDateExtended(biDate) : '____'}</span>. Concluiu o IIº Ciclo Geral (Liceu - 12ª Classe) na especialidade de <span className="font-bold text-slate-950">{selectedSpecialty}</span>, no ano lectivo <span className="font-bold font-mono text-slate-900">{anoLectivo}</span>.
            </p>

            <p className="mt-2 font-semibold text-slate-900 text-justify">
              Obteve as seguintes classificações finais do Tronco Comum e das Áreas de Ciências do Liceu:
            </p>

            {/* PUNIV Grade Table */}
            {punivSubjs && (
              <table className="w-full text-left border-collapse border border-slate-300 mt-2 text-[8px]">
                <thead>
                  <tr className="bg-slate-100 font-bold">
                    <th className="border border-slate-300 p-1">Disciplinas Curriculares</th>
                    <th className="border border-slate-300 p-1 text-center">10ª Classe</th>
                    <th className="border border-slate-300 p-1 text-center">11ª Classe</th>
                    <th className="border border-slate-300 p-1 text-center">12ª Classe</th>
                    <th className="border border-slate-300 p-1 text-center bg-indigo-50">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const renderSec = (secLabel: string, itemsList: string[]) => (
                      <React.Fragment key={secLabel}>
                        <tr className="bg-slate-100 font-bold text-slate-800 text-[8px]">
                          <td colSpan={5} className="border border-slate-300 p-1 font-bold uppercase tracking-wider">
                            {secLabel}
                          </td>
                        </tr>
                        {itemsList.map(sub => {
                          const v = punivGrades[sub] || { '10': '', '11': '', '12': '' };
                          const r = calcPunivSubjectAverage(sub);
                          const renderGrade = (val: string | number) => {
                            if (val === '' || val === null || val === undefined) return '--';
                            const num = Number(val);
                            if (isNaN(num)) return val;
                            return num >= 10 ? <span className="text-blue-600 font-bold">{val}</span> : <span className="text-red-600 font-bold">{val}</span>;
                          };
                          return (
                            <tr key={sub} className="hover:bg-slate-50">
                              <td className="border border-slate-300 p-1 font-semibold">{sub}</td>
                              <td className="border border-slate-300 p-1 text-center">
                                {renderGrade(v['10'])}
                              </td>
                              <td className="border border-slate-300 p-1 text-center">
                                {renderGrade(v['11'])}
                              </td>
                              <td className="border border-slate-300 p-1 text-center">
                                {renderGrade(v['12'])}
                              </td>
                              <td className="border border-slate-300 p-1 text-center bg-indigo-50/20 font-black">
                                {r !== null ? renderGrade(r) : '--'}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                    return (
                      <>
                        {renderSec('Formação Geral', punivSubjs.geral)}
                        {renderSec('Formação Específica', punivSubjs.especifica)}
                        {renderSec('Opção', punivSubjs.opcao)}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            )}

            <div className="mt-3 p-2 bg-slate-50 border border-slate-300 rounded text-[8.5px] text-slate-900 font-bold flex justify-between">
              <span>• Média Geral de Curso Calculada (10ª a 12ª):</span>
              <span className="text-red-600 font-black px-1">
                {mediaFinalCurso ? `${mediaFinalCurso} Valores` : '_____'}
              </span>
            </div>

            <div className="text-[9px] pt-3">
              <p className="text-justify font-serif text-slate-900">
                Para efeitos legais consta no livro de registo nº <span className="text-red-600 font-bold underline">{livroRegisto || '___'}</span>, folha <span className="text-red-600 font-bold underline">{folhaRegisto || '___'}</span> assinado e autenticado com carimbo a óleo.
              </p>
            </div>
          </div>
        )}

        {/* 3. MAGISTÉRIO PEDAGÓGICO (13ª CLASSE) */}
        {subsistema === 'MAGISTERIO' && (
          <div>
            <p className="text-[12px] leading-relaxed text-justify text-slate-900 font-serif">
              {/* Director: Bold Black */}
              <span className="font-bold text-slate-950">{directorTitle}</span>, {directorRole} do{' '}
              <span className="font-bold text-slate-950">{schoolName}</span>, criado sob o{' '}
              <span className="font-medium italic text-slate-950">{decretoCriacao}</span>, CERTIFICA que,{' '}
              {/* Student: Bold Red */}
              <span className="text-red-600 font-bold">{studentTitle || '[Nome Completo do Aluno]'}</span>, {gender === 'F' ? 'filha' : 'filho'} de <span className="text-slate-900">{fatherTitle || '[Nome do Pai]'}</span> e de <span className="text-slate-900">{motherTitle || '[Nome da Mãe]'}</span>, natural de <span className="text-slate-900">{toTitleCaseName(naturalidade) || '[Naturalidade]'}</span>, Município de <span className="text-slate-900">{toTitleCaseName(municipio) || '[Município]'}</span>, Província de <span className="text-slate-900">{toTitleCaseName(provincia) || '[Província]'}</span>, {gender === 'F' ? 'nascida' : 'nascido'} aos <span className="text-slate-900">{formatBirthDateExtended(birthDate)}</span>. {docType === 'CEDULA' ? 'Portador(a) da Cédula de Registo Pessoal n.º ' : docType === 'PASSAPORTE' ? 'Portador(a) do Passaporte n.º ' : `${gender === 'F' ? 'Portadora' : 'Portador'} do B.I. n.º `}<span className="font-bold text-slate-950">{biNumber || '________________________'}</span>, <span className="text-slate-900">{docDetails.issuerPhrase}</span>{biDate ? `, aos ${formatBirthDateExtended(biDate)}` : ''}. Concluiu no Ano Lectivo <span className="font-bold font-mono text-slate-900">{anoLectivo}</span> o curso de II CICLO DO ENSINO SECUNDÁRIO PEDAGÓGICO, na Especialidade de <span className="text-red-600 font-bold uppercase">{selectedSpecialty === 'EP' ? 'ENSINO PRIMÁRIO' : selectedSpecialty === 'PE' ? 'PRÉ-ESCOLAR' : selectedSpecialty === 'MF' ? 'MATEMÁTICA E FÍSICA' : selectedSpecialty === 'BQ' ? 'BIOLOGIA E QUÍMICA' : selectedSpecialty === 'GH' ? 'GEOGRAFIA E HISTÓRIA' : 'ENSINO PRIMÁRIO'}</span>, conforme o {leiBaseText || getLeiBaseForCertificate(schoolSettings, 'MAGISTERIO', '13')}, com o resultado final de apto(a) com uma Média geral de <span className="text-red-600 font-bold">{mediaFinalCurso ? `${mediaFinalCurso} Valores` : '_____ Valores'}</span> obtida nas seguintes classificações:
            </p>

            {/* Magisterio Table */}
            {magisterioSubjs && (
              <table className="w-full border-collapse border border-slate-300 text-[7.8px] font-serif mt-2">
                <thead>
                  <tr className="text-center font-bold uppercase bg-slate-100 text-slate-900">
                    <th className="w-[35%] py-1 border border-slate-300">Disciplinas</th>
                    <th className="w-8 border border-slate-300">10ª Cl.</th>
                    <th className="w-8 border border-slate-300">11ª Cl.</th>
                    <th className="w-8 border border-slate-300">12ª Cl.</th>
                    <th className="w-8 border border-slate-300">13ª Cl.</th>
                    <th className="w-10 border border-slate-300">Média Final</th>
                    <th className="w-[20%] border border-slate-300">Média por Extenso</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Formação Geral */}
                  <tr className="font-bold bg-slate-100 uppercase border border-slate-300 text-[8px] text-slate-800">
                    <td colSpan={7} className="p-1">Formação Geral</td>
                  </tr>
                  {magisterioSubjs.geralCientifica.map(sub => {
                    const v = magisterioGrades[sub] || { '10': '', '11': '', '12': '', '13': '' };
                    const r = calcMagisterioSubjectAverage(sub);
                    const renderMagVal = (val: string | number) => {
                      if (val === '' || val === null || val === undefined) return '--';
                      const num = Number(val);
                      if (isNaN(num)) return val;
                      return num >= 10 ? <span className="text-blue-600 font-bold">{val}</span> : <span className="text-red-600 font-bold">{val}</span>;
                    };
                    return (
                      <tr key={sub} className="border border-slate-300 hover:bg-slate-50">
                        <td className="p-1 font-semibold">{formatSiglaOnly(sub)}</td>
                        <td className="text-center border-l border-slate-300 font-mono font-bold">{renderMagVal(v['10'])}</td>
                        <td className="text-center border-l border-slate-300 font-mono font-bold">{renderMagVal(v['11'])}</td>
                        <td className="text-center border-l border-slate-300 font-mono font-bold">{renderMagVal(v['12'])}</td>
                        <td className="text-center border-l border-slate-300 bg-slate-100 text-slate-400 font-mono">///</td>
                        <td className="text-center border-l border-slate-300 font-mono font-black">{r ? renderMagVal(r) : '--'}</td>
                        <td className="text-center border-l border-slate-300 italic text-[7.5px]">{r ? notaParaExtenso(r) : '--'}</td>
                      </tr>
                    );
                  })}

                  {/* Formação Educacional */}
                  <tr className="font-bold bg-slate-100 uppercase border border-slate-300 text-[8px] text-slate-800">
                    <td colSpan={7} className="p-1">Formação Educacional</td>
                  </tr>
                  {[...magisterioSubjs.pedagogica, ...magisterioSubjs.metodologias].map(sub => {
                    const v = magisterioGrades[sub] || { '10': '', '11': '', '12': '', '13': '' };
                    const r = calcMagisterioSubjectAverage(sub);
                    const renderMagVal = (val: string | number) => {
                      if (val === '' || val === null || val === undefined) return '--';
                      const num = Number(val);
                      if (isNaN(num)) return val;
                      return num >= 10 ? <span className="text-blue-600 font-bold">{val}</span> : <span className="text-red-600 font-bold">{val}</span>;
                    };
                    return (
                      <tr key={sub} className="border border-slate-300 hover:bg-slate-50">
                        <td className="p-1 font-semibold">{formatSiglaOnly(sub)}</td>
                        <td className="text-center border-l border-slate-300 font-mono font-bold">{renderMagVal(v['10'])}</td>
                        <td className="text-center border-l border-slate-300 font-mono font-bold">{renderMagVal(v['11'])}</td>
                        <td className="text-center border-l border-slate-300 font-mono font-bold">{renderMagVal(v['12'])}</td>
                        <td className="text-center border-l border-slate-300 bg-slate-100 text-slate-400 font-mono">///</td>
                        <td className="text-center border-l border-slate-300 font-mono font-black">{r ? renderMagVal(r) : '--'}</td>
                        <td className="text-center border-l border-slate-300 italic text-[7.5px]">{r ? notaParaExtenso(r) : '--'}</td>
                      </tr>
                    );
                  })}

                  {/* Estágio */}
                  <tr className="font-bold bg-slate-100 uppercase border border-slate-300 text-[8px] text-slate-800">
                    <td colSpan={7} className="p-1">Estágio Ped. Supervisionado</td>
                  </tr>
                  <tr className="border border-slate-300">
                    <td className="p-1 font-semibold">NEC (Núcleo de Estágio Curricular)</td>
                    <td colSpan={3} className="bg-slate-100 text-center font-mono text-slate-400">///</td>
                    <td className="text-center border-l border-slate-300 font-mono font-bold text-red-600">{notaEstagio || '--'}</td>
                    <td className="text-center border-l border-slate-300 font-mono font-black text-red-700">{notaEstagio || '--'}</td>
                    <td className="text-center border-l border-slate-300 italic text-[7.5px]">{notaEstagio ? notaParaExtenso(Number(notaEstagio)) : '--'}</td>
                  </tr>
                  <tr className="border border-slate-300">
                    <td className="p-1 font-semibold">PAP (Projecto de Aptidão Profissional)</td>
                    <td colSpan={3} className="bg-slate-100 text-center font-mono text-slate-400">///</td>
                    <td className="text-center border-l border-slate-300 font-mono font-bold text-red-600">{notaPAP || '--'}</td>
                    <td className="text-center border-l border-slate-300 font-mono font-black text-red-700">{notaPAP || '--'}</td>
                    <td className="text-center border-l border-slate-300 italic text-[7.5px]">{notaPAP ? notaParaExtenso(Number(notaPAP)) : '--'}</td>
                  </tr>

                  {/* Média Anual */}
                  <tr className="font-bold uppercase border border-slate-300 bg-slate-50">
                    <td className="p-1">Média Anual (MA)</td>
                    <td className="text-center font-mono text-slate-800">{calcMagisterioClassAverage('10') || '--'}</td>
                    <td className="text-center font-mono text-slate-800">{calcMagisterioClassAverage('11') || '--'}</td>
                    <td className="text-center font-mono text-slate-800">{calcMagisterioClassAverage('12') || '--'}</td>
                    <td colSpan={3} className="bg-slate-100"></td>
                  </tr>

                  {/* Média Final do Curso */}
                  <tr className="font-bold uppercase border border-slate-300 bg-slate-100">
                    <td className="p-1 italic">Média Final do Curso (MFC)</td>
                    <td colSpan={4} className="bg-slate-100"></td>
                    <td className="text-center font-mono font-black text-red-700">{mediaFinalCurso || '--'}</td>
                    <td className="text-center italic text-[7.5px]">{mediaFinalCurso ? notaParaExtenso(Number(mediaFinalCurso)).toUpperCase() : '--'}</td>
                  </tr>
                </tbody>
              </table>
            )}

            <div className="text-[9.5px] pt-2 italic text-justify leading-tight font-serif text-slate-900">
              Para efeitos legais lhe é passado o presente <span className="font-bold uppercase text-slate-950">CERTIFICADO</span>, que consta no livro de registo n.º <span className="text-red-600 font-bold">{livroRegisto || '_______'}</span> folha n.º <span className="text-red-600 font-bold">{folhaRegisto || '_______'}</span>, assinado por mim e autenticado com carimbo a óleo/selo branco em uso neste estabelecimento de ensino.
            </div>
            <p className="text-center mt-2 font-bold text-slate-950 text-[9.5px] font-serif">
              {schoolName} do {schoolMunicipality}, aos <span className="text-red-600">{currentDay}</span> de <span className="text-red-600">{currentMonth}</span> de <span className="text-red-600">{currentYear}</span>.
            </p>
          </div>
        )}

        {/* Date line */}
        {subsistema !== 'MAGISTERIO' && (
          <p className="text-center mt-2 font-semibold text-slate-900 text-[9px]">
            <span className="font-bold text-slate-950">{schoolName} do {schoolMunicipality}</span>, aos{' '}
            <span className="font-bold text-slate-950">{currentDay} de {currentMonth} de {currentYear}</span>.
          </p>
        )}

        {/* Official Signatures Section */}
        {subsistema === 'MAGISTERIO' ? (
          <div className="mt-4 border-t border-slate-200 pt-3 font-serif">
            <div className="grid grid-cols-2 gap-10 text-center px-4">
              <div className="flex flex-col items-center">
                <p className="text-[9.5px] font-bold mb-10 uppercase tracking-wide text-slate-950">Conferido por</p>
                <div className="border-t border-slate-900 w-full pt-1"></div>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[9.5px] font-bold uppercase mb-10 tracking-wide text-slate-950">{directorRole}</p>
                <div className="border-t border-slate-900 w-full pt-1 mb-1"></div>
                {/* Director's Name: Bold Black */}
                <p className="font-bold uppercase text-[9.5px] tracking-widest italic text-slate-950">
                  ( {directorName} )
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-center pt-6 text-[8.5px] font-sans">
            <div>
              <p className="font-bold uppercase text-slate-950">CONFERIDO POR</p>
              <div className="border-b border-slate-400 w-28 mx-auto mt-6"></div>
              <p className="text-slate-600 mt-1 font-medium">{schoolSettings.subdirectorName || 'O Subdirector Pedagógico'}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-950">{String(directorRole).toUpperCase()}</p>
              <div className="border-b border-slate-400 w-28 mx-auto mt-6"></div>
              {/* Director's Name: Bold Black */}
              <p className="font-bold text-slate-950 mt-1">{directorName}</p>
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
