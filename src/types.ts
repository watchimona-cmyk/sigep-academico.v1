/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  id: string; // ID Aluno
  studentId?: string; // ID Alternativo
  registrationId?: string; // Nº de Matrícula
  name: string; // Nome Completo
  gender: 'M' | 'F'; // Sexo / Gênero
  class: string; // Classe (e.g. "1", "2")
  section: string; // Turma (e.g. "A", "B")
  fatherName?: string; // Nome do Pai
  motherName?: string; // Nome da Mãe
  bi?: string; // Bilhete de Identidade (BI)
  biNumber?: string; // Aliás de BI
  biSector?: string; // Sector de Emissão do BI
  biDate?: string; // Data de Emissão do BI
  docType?: 'BI' | 'CEDULA'; // Tipo de Identificação
  cedulaRegisto?: string; // Nº de Registo (Cédula)
  cedulaFls?: string; // Fls (Folha Cédula)
  cedulaLivro?: string; // Livro Cédula
  cedulaAno?: string; // Ano de Emissão Cédula
  province?: string; // Província
  municipio?: string; // Município
  naturalidade?: string; // Naturalidade / Localidade
  birthDate?: string; // Data de Nascimento
  contact?: string; // Contacto
  periodo?: 'Manhã' | 'Tarde' | 'Noite'; // Período
  age?: number; // Idade
  foreignLanguage?: 'INGLÊS' | 'FRANCÊS'; // Opção de Língua Estrangeira (Nível 3)
  specialty?: 'CFB' | 'CEJ' | 'CS' | 'AV' | 'EP' | 'EI' | 'PE' | 'MF' | 'BQ' | 'LEMC' | 'GH' | 'ING_EMC' | 'FRA_EMC' | 'EVP' | 'EDF' | 'EMC'; // Especialidade / Curso (PUNIV ou Magistério)
  isTransferidoEntrada?: boolean; // Se veio transferido de fora para o SIGEP
  escolaOrigem?: string; // Escola de proveniência
  guiaTransferenciaEntrada?: string; // Número da Guia de Entrada
  provinciaOrigem?: string; // Província de proveniência
  isTransferidoSaida?: boolean; // Se foi transferido para fora (saiu da escola)
  dataTransferenciaSaida?: string; // Data da transferência de saída
  escolaDestino?: string; // Escola de destino
  guiaTransferenciaSaida?: string; // Número da Guia de Saída
  processoTransferenciaSaida?: string; // Número do Processo de Transferência de Saída
  provinciaDestino?: string; // Província de destino
  motivoTransferencia?: string; // Motivo da transferência de saída
  status?: 'Pendente' | 'Ativo' | 'Desistente'; // Estado do aluno (Ciclo de Vida)
  enrollmentType?: 'Novo' | 'Interno'; // Tipo de ingresso
  reconfirmationQuarter?: 1 | 2 | 3; // Trimestre de reconfirmação
  estadoPromocao?: 'Aguardando Próximo Ano Letivo' | 'Candidato'; // Estado para fluxo de promoção académica
  originalClassBeforePromotion?: string; // Mantém a classe original para reversão
}

export type SubjectType = 
  | 'L. PORTUGUESA' 
  | 'MATEMATICA' 
  | 'EST. MEIO' 
  | 'ED. MUSICAL' 
  | 'E.M.P.' 
  | 'ED. FISICA'
  | 'L. ANGOLA'
  | 'L. ESTRANGEIRA'
  | 'CIDADANIA'
  | 'CIENCIAS INTEGRADAS'
  | 'ED. FISICA E ARTISTICA'
  | 'HISTORIA'
  | 'GEOGRAFIA'
  | 'BIOLOGIA'
  | 'FISICA'
  | 'QUIMICA'
  | 'ED. VISUAL'
  | 'L. INGLESA'
  | 'L. FRANCESA'
  | 'ED. MORAL CIVICA'
  | 'ED. LABORAL'
  | 'EMPREENDEDORISMO'
  | 'FILOSOFIA'
  | 'SOCIOLOGIA'
  | 'INFORMATICA'
  | 'LITERATURA PORTUGUESA'
  | 'INTROD. AO DIREITO'
  | 'GEOMETRIA DESCRITIVA'
  | 'PEDAGOGIA'
  | 'DIDACTICA GERAL'
  | 'PSICOLOGIA'
  | 'METODOLOGIA DE L. PORTUGUESA'
  | 'METODOLOGIA DE MATEMATICA'
  | 'METODOLOGIA DE CIENCIAS'
  | 'PRATICA PEDAGOGICA'
  | 'SOCIOLOGIA DA EDUCACAO'
  | 'ESTATISTICA APLICADA'
  | 'ECONOMIA'
  | 'HISTORIA DA ARTE'
  | 'DESENHO'
  | 'MEM'
  | 'MEF'
  | 'TEDC'
  | 'H_S_ESCOLAR'
  | 'ASEAGE'
  | 'METODOLOGIA_GEOGRAFIA'
  | 'METODOLOGIA_HISTORIA'
  | 'METODOLOGIA_BIOLOGIA'
  | 'METODOLOGIA_QUIMICA'
  | 'METODOLOGIA_ENSINO_PRIMARIO'
  | 'CIENCIAS DA NATUREZA'
  | 'ED. VISUAL PLASTICA'
  | 'PDA_NEE'
  | 'FPSD'
  | 'ETICA'
  | 'LITERATURA'
  | 'MEEMC'
  | 'MELP'
  | 'MEQ'
  | 'MEB'
  | 'MEH'
  | 'MEG'
  | 'EXPRESSOES'
  | 'MEMCN'
  | 'NEC'
  | 'PAP'
  | 'PDA'
  | 'NEE'
  | 'MEE';

export type ModalityType = 'ENSINO_PRIMARIO' | 'PUNIV' | 'MAGISTERIO';

export const SUBJECTS: SubjectType[] = [
  'L. PORTUGUESA',
  'MATEMATICA',
  'EST. MEIO',
  'ED. MUSICAL',
  'E.M.P.',
  'ED. FISICA',
  'L. ANGOLA',
  'L. ESTRANGEIRA',
  'CIDADANIA',
  'CIENCIAS INTEGRADAS',
  'ED. FISICA E ARTISTICA',
  'HISTORIA',
  'GEOGRAFIA',
  'BIOLOGIA',
  'FISICA',
  'QUIMICA',
  'ED. VISUAL',
  'L. INGLESA',
  'L. FRANCESA',
  'ED. MORAL CIVICA',
  'ED. LABORAL',
  'EMPREENDEDORISMO',
  'FILOSOFIA',
  'SOCIOLOGIA',
  'INFORMATICA',
  'LITERATURA PORTUGUESA',
  'INTROD. AO DIREITO',
  'GEOMETRIA DESCRITIVA',
  'PEDAGOGIA',
  'DIDACTICA GERAL',
  'PSICOLOGIA',
  'METODOLOGIA DE L. PORTUGUESA',
  'METODOLOGIA DE MATEMATICA',
  'METODOLOGIA DE CIENCIAS',
  'PRATICA PEDAGOGICA',
  'SOCIOLOGIA DA EDUCACAO',
  'ESTATISTICA APLICADA',
  'ECONOMIA',
  'HISTORIA DA ARTE',
  'DESENHO',
  'MEM',
  'MEF',
  'TEDC',
  'H_S_ESCOLAR',
  'ASEAGE',
  'METODOLOGIA_GEOGRAFIA',
  'METODOLOGIA_HISTORIA',
  'METODOLOGIA_BIOLOGIA',
  'METODOLOGIA_QUIMICA',
  'METODOLOGIA_ENSINO_PRIMARIO',
  'CIENCIAS DA NATUREZA',
  'ED. VISUAL PLASTICA',
  'PDA_NEE',
  'FPSD',
  'ETICA',
  'LITERATURA',
  'MEEMC',
  'MELP',
  'MEQ',
  'MEB',
  'MEH',
  'MEG',
  'EXPRESSOES',
  'MEMCN',
  'NEC',
  'PAP',
  'PDA',
  'NEE',
  'MEE'
];

export function getSubjectAbbreviation(sub: string): string {
  switch (sub) {
    case 'L. PORTUGUESA': return 'L.Port';
    case 'MATEMATICA': return 'Mat';
    case 'EST. MEIO': return 'Est. Meio';
    case 'ED. MUSICAL': return 'Ed.Musical';
    case 'E.M.P.': return 'E.M.P';
    case 'ED. FISICA': return 'Ed. Física';
    case 'L. ANGOLA': return 'L. Ang';
    case 'L. ESTRANGEIRA': return 'L. Estrang';
    case 'CIDADANIA': return 'C. Desenv';
    case 'CIENCIAS INTEGRADAS': return 'C.Integ';
    case 'ED. FISICA E ARTISTICA': return 'Ed. Fis/Art';
    case 'HISTORIA': return 'Hist';
    case 'GEOGRAFIA': return 'Geog.';
    case 'BIOLOGIA': return 'Biol.';
    case 'FISICA': return 'Física';
    case 'QUIMICA': return 'Quím';
    case 'ED. VISUAL': return 'E.V.P';
    case 'L. INGLESA': return 'L.Ing';
    case 'L. FRANCESA': return 'L.Franc.';
    case 'ED. MORAL CIVICA': return 'E.M.C';
    case 'ED. LABORAL': return 'Ed. Laboral';
    case 'EMPREENDEDORISMO': return 'Empreend';
    case 'FILOSOFIA': return 'Filosof';
    case 'SOCIOLOGIA': return 'Sociologia';
    case 'INFORMATICA': return 'Informat.';
    case 'LITERATURA PORTUGUESA': return 'Lit. Port.';
    case 'INTROD. AO DIREITO': return 'Intr. Direito';
    case 'GEOMETRIA DESCRITIVA': return 'Geom. Desc.';
    case 'PEDAGOGIA': return 'Pedagogia';
    case 'DIDACTICA GERAL': return 'Didática Geral';
    case 'PSICOLOGIA': return 'Psicologia';
    case 'METODOLOGIA DE L. PORTUGUESA': return 'Met. L. Port.';
    case 'METODOLOGIA DE MATEMATICA': return 'Met. Mat.';
    case 'METODOLOGIA DE CIENCIAS': return 'Met. Ciências';
    case 'PRATICA PEDAGOGICA': return 'PSEP';
    case 'SOCIOLOGIA DA EDUCACAO': return 'Soc. Ed.';
    case 'ESTATISTICA APLICADA': return 'Est. Aplicada';
    case 'ECONOMIA': return 'Economia';
    case 'HISTORIA DA ARTE': return 'Hist. Arte';
    case 'DESENHO': return 'Desenho';
    case 'MEM': return 'M.E.M.';
    case 'MEF': return 'M.E.F.';
    case 'TEDC': return 'T.E.D.C.';
    case 'H_S_ESCOLAR': return 'HSE';
    case 'ASEAGE': return 'A.S.E.A.G.E.';
    case 'METODOLOGIA_GEOGRAFIA': return 'Met. Geog.';
    case 'METODOLOGIA_HISTORIA': return 'Met. Hist.';
    case 'METODOLOGIA_BIOLOGIA': return 'Met. Biol.';
    case 'METODOLOGIA_QUIMICA': return 'Met. Quím.';
    case 'METODOLOGIA_ENSINO_PRIMARIO': return 'Met. Ens. Prim.';
    case 'CIENCIAS DA NATUREZA': return 'Ciên. Natureza';
    case 'ED. VISUAL PLASTICA': return 'Express';
    case 'PDA_NEE': return 'PDA/NEE';
    case 'FPSD': return 'FPSD';
    case 'ETICA': return 'Ética';
    case 'LITERATURA': return 'Literatura';
    case 'MEEMC': return 'MEEMC';
    case 'MELP': return 'MELP';
    case 'MEQ': return 'MEQ';
    case 'MEB': return 'MEB';
    case 'MEH': return 'MEH';
    case 'MEG': return 'MEG';
    case 'EXPRESSOES': return 'Expressões';
    case 'MEMCN': return 'MEMCN';
    case 'NEC': return 'NEC';
    case 'PAP': return 'PAP';
    case 'PDA': return 'PDA';
    case 'NEE': return 'NEE';
    case 'MEE': return 'M.E.E.';
    default: return sub;
  }
}

export interface GrelhaCurricularItem {
  id: string;
  modality: ModalityType;
  specialty: string; // Ex: 'CFB', 'CEJ', 'CS', 'AV', 'EP', 'EI', 'PE', 'MF', 'BQ', 'LEMC', 'GH'
  class: string;     // Ex: "1", "10", "11", "12", "13"
  subject: string;   // Was SubjectType, changed to string to allow free-text input
  active?: boolean;  // Active/Inactive state of the curriculum item
  position?: number; // Position order of the subject in the curriculum
  category?: string; // e.g., 'Formação Geral' | 'Formação Específica' | 'Formação Educacional'
}

export const SEED_GRELHA_CURRICULAR: GrelhaCurricularItem[] = [
  // Ensino Primário - Classes 1 a 4 (1º CICLO DE FORMAÇÃO)
  ...['1', '2', '3', '4'].flatMap((cl) => 
    (['L. PORTUGUESA', 'L. ANGOLA', 'MATEMATICA', 'EST. MEIO', 'E.M.P.', 'ED. MUSICAL', 'ED. FISICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_PRI_${cl}_${sIdx}`,
      modality: 'ENSINO_PRIMARIO' as ModalityType,
      specialty: 'GERAL',
      class: cl,
      subject: sub
    }))
  ),
  // Ensino Primário - Classes 5 a 6 (2º CICLO DE FORMAÇÃO)
  ...['5', '6'].flatMap((cl) => 
    (['L. PORTUGUESA', 'L. ANGOLA', 'MATEMATICA', 'CIENCIAS DA NATUREZA', 'HISTORIA', 'GEOGRAFIA', 'ED. MORAL CIVICA', 'ED. VISUAL PLASTICA', 'ED. MUSICAL', 'ED. FISICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_PRI_${cl}_${sIdx}`,
      modality: 'ENSINO_PRIMARIO' as ModalityType,
      specialty: 'GERAL',
      class: cl,
      subject: sub
    }))
  ),
  // Ensino Primário - Classes 7 a 9
  ...['7', '8', '9'].flatMap((cl) => 
    (['L. PORTUGUESA', 'L. INGLESA', 'L. FRANCESA', 'MATEMATICA', 'BIOLOGIA', 'FISICA', 'QUIMICA', 'GEOGRAFIA', 'HISTORIA', 'ED. FISICA', 'ED. MORAL CIVICA', 'ED. VISUAL', 'ED. LABORAL', 'EMPREENDEDORISMO'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_PRI_${cl}_${sIdx}`,
      modality: 'ENSINO_PRIMARIO' as ModalityType,
      specialty: 'GERAL',
      class: cl,
      subject: sub
    }))
  ),

  // PUNIV - Especialidade Ciências Físicas e Biológicas (CFB) - Classes 10 a 12
  ...['10', '11', '12'].flatMap((cl) =>
    (['L. PORTUGUESA', 'L. INGLESA', 'L. FRANCESA', 'MATEMATICA', 'FISICA', 'QUIMICA', 'BIOLOGIA', 'ED. FISICA', 'FILOSOFIA', 'INFORMATICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_PUN_CFB_${cl}_${sIdx}`,
      modality: 'PUNIV' as ModalityType,
      specialty: 'CFB',
      class: cl,
      subject: sub
    }))
  ),

  // PUNIV - Especialidade Ciências Económico-Jurídicas (CEJ) - Classes 10 a 12
  ...['10', '11', '12'].flatMap((cl) =>
    (['L. PORTUGUESA', 'L. INGLESA', 'L. FRANCESA', 'MATEMATICA', 'HISTORIA', 'GEOGRAFIA', 'INTROD. AO DIREITO', 'ECONOMIA', 'FILOSOFIA', 'INFORMATICA', 'ED. FISICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_PUN_CEJ_${cl}_${sIdx}`,
      modality: 'PUNIV' as ModalityType,
      specialty: 'CEJ',
      class: cl,
      subject: sub
    }))
  ),

  // PUNIV - Especialidade Ciências Sociais / Humanas (CS) - Classes 10 a 12
  ...['10', '11', '12'].flatMap((cl) =>
    (['L. PORTUGUESA', 'L. INGLESA', 'L. FRANCESA', 'HISTORIA', 'GEOGRAFIA', 'FILOSOFIA', 'SOCIOLOGIA', 'PSICOLOGIA', 'LITERATURA PORTUGUESA', 'INFORMATICA', 'ED. FISICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_PUN_CS_${cl}_${sIdx}`,
      modality: 'PUNIV' as ModalityType,
      specialty: 'CS',
      class: cl,
      subject: sub
    }))
  ),

  // PUNIV - Especialidade Artes Visuais (AV) - Classes 10 a 12
  ...['10', '11', '12'].flatMap((cl) =>
    (['L. PORTUGUESA', 'L. INGLESA', 'L. FRANCESA', 'GEOMETRIA DESCRITIVA', 'FILOSOFIA', 'INFORMATICA', 'ED. FISICA', 'HISTORIA DA ARTE', 'DESENHO'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_PUN_AV_${cl}_${sIdx}`,
      modality: 'PUNIV' as ModalityType,
      specialty: 'AV',
      class: cl,
      subject: sub
    }))
  ),

  // MAGISTÉRIO - Especialidade Matemática e Física (MF) - Classes 10 a 13
  ...['10'].flatMap((cl) =>
    (['L. PORTUGUESA', 'L. INGLESA', 'INFORMATICA', 'ED. FISICA', 'EMPREENDEDORISMO', 'PDA', 'NEE', 'MATEMATICA', 'FISICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_MF_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'MF',
      class: cl,
      subject: sub
    }))
  ),
  ...['11'].flatMap((cl) =>
    (['L. PORTUGUESA', 'ED. FISICA', 'EMPREENDEDORISMO', 'ASEAGE', 'MATEMATICA', 'FISICA', 'TEDC', 'FPSD', 'MEM', 'MEF', 'PRATICA PEDAGOGICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_MF_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'MF',
      class: cl,
      subject: sub
    }))
  ),
  ...['12'].flatMap((cl) =>
    (['FILOSOFIA', 'ED. FISICA', 'EMPREENDEDORISMO', 'H_S_ESCOLAR', 'MATEMATICA', 'FISICA', 'MEM', 'MEF', 'PRATICA PEDAGOGICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_MF_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'MF',
      class: cl,
      subject: sub
    }))
  ),
  ...['13'].flatMap((cl) =>
    (['NEC', 'PAP'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_MF_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'MF',
      class: cl,
      subject: sub
    }))
  ),

  // MAGISTÉRIO - Especialidade Ensino Primário (EP) - Classes 10 a 13
  ...['10'].flatMap((cl) =>
    (['L. PORTUGUESA', 'L. INGLESA', 'L. FRANCESA', 'MATEMATICA', 'FISICA', 'BIOLOGIA', 'QUIMICA', 'HISTORIA', 'GEOGRAFIA', 'INFORMATICA', 'EMPREENDEDORISMO', 'FILOSOFIA', 'PDA', 'NEE', 'EXPRESSOES', 'MEE'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_EP_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'EP',
      class: cl,
      subject: sub
    }))
  ),
  ...['11'].flatMap((cl) =>
    (['L. PORTUGUESA', 'L. FRANCESA', 'L. INGLESA', 'EMPREENDEDORISMO', 'TEDC', 'MELP', 'MEEMC', 'PRATICA PEDAGOGICA', 'ED. FISICA', 'ASEAGE', 'LITERATURA', 'FPSD'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_EP_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'EP',
      class: cl,
      subject: sub
    }))
  ),
  ...['12'].flatMap((cl) =>
    (['L. PORTUGUESA', 'L. INGLESA', 'L. FRANCESA', 'MATEMATICA', 'EMPREENDEDORISMO', 'ASEAGE', 'H_S_ESCOLAR', 'MEF', 'MEM', 'MEH', 'EXPRESSOES', 'MEE', 'MEG', 'FPSD', 'PRATICA PEDAGOGICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_EP_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'EP',
      class: cl,
      subject: sub
    }))
  ),
  ...['13'].flatMap((cl) =>
    (['NEC', 'PAP'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_EP_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'EP',
      class: cl,
      subject: sub
    }))
  ),

  // MAGISTÉRIO - Especialidade Biologia e Química (BQ) - Classes 10 a 13
  ...['10'].flatMap((cl) =>
    (['L. PORTUGUESA', 'L. INGLESA', 'INFORMATICA', 'MATEMATICA', 'ED. FISICA', 'EMPREENDEDORISMO', 'PDA', 'NEE', 'QUIMICA', 'BIOLOGIA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_BQ_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'BQ',
      class: cl,
      subject: sub
    }))
  ),
  ...['11'].flatMap((cl) =>
    (['L. PORTUGUESA', 'ED. FISICA', 'EMPREENDEDORISMO', 'ASEAGE', 'TEDC', 'FPSD', 'QUIMICA', 'BIOLOGIA', 'MEQ', 'MEB', 'PRATICA PEDAGOGICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_BQ_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'BQ',
      class: cl,
      subject: sub
    }))
  ),
  ...['12'].flatMap((cl) =>
    (['FILOSOFIA', 'ED. FISICA', 'EMPREENDEDORISMO', 'H_S_ESCOLAR', 'QUIMICA', 'BIOLOGIA', 'MEQ', 'MEB', 'PRATICA PEDAGOGICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_BQ_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'BQ',
      class: cl,
      subject: sub
    }))
  ),
  ...['13'].flatMap((cl) =>
    (['NEC', 'PAP'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_BQ_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'BQ',
      class: cl,
      subject: sub
    }))
  ),

  // MAGISTÉRIO - Especialidade Língua e EMC (LEMC) - Classes 10 a 13
  ...['10'].flatMap((cl) =>
    (['L. FRANCESA', 'L. INGLESA', 'FILOSOFIA', 'MATEMATICA', 'INFORMATICA', 'HISTORIA', 'EMPREENDEDORISMO', 'ED. FISICA', 'PDA', 'NEE', 'ASEAGE', 'H_S_ESCOLAR', 'TEDC', 'FPSD', 'ETICA', 'LITERATURA', 'L. PORTUGUESA', 'MEEMC', 'MELP', 'PRATICA PEDAGOGICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_LEMC_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'LEMC',
      class: cl,
      subject: sub
    }))
  ),
  ...['11'].flatMap((cl) =>
    (['L. PORTUGUESA', 'L. FRANCESA', 'L. INGLESA', 'EMPREENDEDORISMO', 'TEDC', 'MELP', 'MEEMC', 'PRATICA PEDAGOGICA', 'ED. FISICA', 'ASEAGE', 'LITERATURA', 'FPSD'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_LEMC_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'LEMC',
      class: cl,
      subject: sub
    }))
  ),
  ...['12'].flatMap((cl) =>
    (['FILOSOFIA', 'ED. FISICA', 'EMPREENDEDORISMO', 'H_S_ESCOLAR', 'FPSD', 'ETICA', 'L. PORTUGUESA', 'MEEMC', 'MELP', 'PRATICA PEDAGOGICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_LEMC_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'LEMC',
      class: cl,
      subject: sub
    }))
  ),
  ...['13'].flatMap((cl) =>
    (['NEC', 'PAP'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_LEMC_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'LEMC',
      class: cl,
      subject: sub
    }))
  ),

  // MAGISTÉRIO - Especialidade Geo-História (GH) - Classes 10 a 13
  ...['10'].flatMap((cl) =>
    (['L. PORTUGUESA', 'L. INGLESA', 'INFORMATICA', 'EMPREENDEDORISMO', 'ED. FISICA', 'MATEMATICA', 'PDA', 'NEE', 'HISTORIA', 'GEOGRAFIA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_GH_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'GH',
      class: cl,
      subject: sub
    }))
  ),
  ...['11'].flatMap((cl) =>
    (['L. PORTUGUESA', 'EMPREENDEDORISMO', 'ED. FISICA', 'ASEAGE', 'TEDC', 'FPSD', 'HISTORIA', 'GEOGRAFIA', 'MEH', 'MEG', 'PRATICA PEDAGOGICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_GH_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'GH',
      class: cl,
      subject: sub
    }))
  ),
  ...['12'].flatMap((cl) =>
    (['FILOSOFIA', 'EMPREENDEDORISMO', 'ED. FISICA', 'H_S_ESCOLAR', 'HISTORIA', 'GEOGRAFIA', 'MEH', 'MEG', 'PRATICA PEDAGOGICA'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_GH_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'GH',
      class: cl,
      subject: sub
    }))
  ),
  ...['13'].flatMap((cl) =>
    (['NEC', 'PAP'] as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_GH_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'GH',
      class: cl,
      subject: sub
    }))
  ),

  // Support additional specialties: Pré-Escolar (PE), Inglês e EMC (ING_EMC), Francês e EMC (FRA_EMC), EVP, EDF, EMC
  ...['10', '11', '12', '13'].flatMap((cl) => {
    // PE maps to EP
    const epSubs_10 = ['L. PORTUGUESA', 'L. INGLESA', 'L. FRANCESA', 'MATEMATICA', 'FISICA', 'BIOLOGIA', 'QUIMICA', 'HISTORIA', 'GEOGRAFIA', 'INFORMATICA', 'EMPREENDEDORISMO', 'FILOSOFIA', 'PDA', 'NEE', 'EXPRESSOES', 'MEE'];
    const epSubs_11 = ['L. PORTUGUESA', 'L. FRANCESA', 'L. INGLESA', 'EMPREENDEDORISMO', 'TEDC', 'MELP', 'MEEMC', 'PRATICA PEDAGOGICA', 'ED. FISICA', 'ASEAGE', 'LITERATURA', 'FPSD'];
    const epSubs_12 = ['L. PORTUGUESA', 'L. INGLESA', 'L. FRANCESA', 'MATEMATICA', 'EMPREENDEDORISMO', 'ASEAGE', 'H_S_ESCOLAR', 'MEF', 'MEM', 'MEH', 'EXPRESSOES', 'MEE', 'MEG', 'FPSD', 'PRATICA PEDAGOGICA'];
    const epSubs_13 = ['NEC', 'PAP'];
    const subs = cl === '10' ? epSubs_10 : cl === '11' ? epSubs_11 : cl === '12' ? epSubs_12 : epSubs_13;
    return (subs as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_PE_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'PE',
      class: cl,
      subject: sub
    }));
  }),

  ...['10', '11', '12', '13'].flatMap((cl) => {
    // ING_EMC & FRA_EMC & EMC map to LEMC
    const lemcSubs_10 = ['L. FRANCESA', 'L. INGLESA', 'FILOSOFIA', 'MATEMATICA', 'INFORMATICA', 'HISTORIA', 'EMPREENDEDORISMO', 'ED. FISICA', 'PDA', 'NEE', 'ASEAGE', 'H_S_ESCOLAR', 'TEDC', 'FPSD', 'ETICA', 'LITERATURA', 'L. PORTUGUESA', 'MEEMC', 'MELP', 'PRATICA PEDAGOGICA'];
    const lemcSubs_11 = ['L. PORTUGUESA', 'L. FRANCESA', 'L. INGLESA', 'EMPREENDEDORISMO', 'TEDC', 'MELP', 'MEEMC', 'PRATICA PEDAGOGICA', 'ED. FISICA', 'ASEAGE', 'LITERATURA', 'FPSD'];
    const lemcSubs_12 = ['FILOSOFIA', 'EMPREENDEDORISMO', 'ED. FISICA', 'H_S_ESCOLAR', 'FPSD', 'ETICA', 'L. PORTUGUESA', 'MEEMC', 'MELP', 'PRATICA PEDAGOGICA'];
    const lemcSubs_13 = ['NEC', 'PAP'];
    const subs = cl === '10' ? lemcSubs_10 : cl === '11' ? lemcSubs_11 : cl === '12' ? lemcSubs_12 : lemcSubs_13;
    return ['ING_EMC', 'FRA_EMC', 'EMC'].flatMap((spec) => 
      (subs as SubjectType[]).map((sub, sIdx) => ({
        id: `GC_MAG_${spec}_${cl}_${sIdx}`,
        modality: 'MAGISTERIO' as ModalityType,
        specialty: spec,
        class: cl,
        subject: sub
      }))
    );
  }),

  ...['10', '11', '12', '13'].flatMap((cl) => {
    // EVP maps to EP
    const epSubs_10 = ['L. PORTUGUESA', 'L. INGLESA', 'L. FRANCESA', 'MATEMATICA', 'FISICA', 'BIOLOGIA', 'QUIMICA', 'HISTORIA', 'GEOGRAFIA', 'INFORMATICA', 'EMPREENDEDORISMO', 'FILOSOFIA', 'PDA', 'NEE', 'EXPRESSOES', 'MEE'];
    const epSubs_11 = ['L. PORTUGUESA', 'L. FRANCESA', 'L. INGLESA', 'EMPREENDEDORISMO', 'TEDC', 'MELP', 'MEEMC', 'PRATICA PEDAGOGICA', 'ED. FISICA', 'ASEAGE', 'LITERATURA', 'FPSD'];
    const epSubs_12 = ['L. PORTUGUESA', 'L. INGLESA', 'L. FRANCESA', 'MATEMATICA', 'EMPREENDEDORISMO', 'ASEAGE', 'H_S_ESCOLAR', 'MEF', 'MEM', 'MEH', 'EXPRESSOES', 'MEE', 'MEG', 'FPSD', 'PRATICA PEDAGOGICA'];
    const epSubs_13 = ['NEC', 'PAP'];
    const subs = cl === '10' ? epSubs_10 : cl === '11' ? epSubs_11 : cl === '12' ? epSubs_12 : epSubs_13;
    return (subs as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_EVP_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'EVP',
      class: cl,
      subject: sub
    }));
  }),

  ...['10', '11', '12', '13'].flatMap((cl) => {
    // EDF maps to MF
    const mfSubs_10 = ['L. PORTUGUESA', 'L. INGLESA', 'INFORMATICA', 'ED. FISICA', 'EMPREENDEDORISMO', 'PDA', 'NEE', 'MATEMATICA', 'FISICA'];
    const mfSubs_11 = ['L. PORTUGUESA', 'ED. FISICA', 'EMPREENDEDORISMO', 'ASEAGE', 'MATEMATICA', 'FISICA', 'TEDC', 'FPSD', 'MEM', 'MEF', 'PRATICA PEDAGOGICA'];
    const mfSubs_12 = ['FILOSOFIA', 'ED. FISICA', 'EMPREENDEDORISMO', 'H_S_ESCOLAR', 'MATEMATICA', 'FISICA', 'MEM', 'MEF', 'PRATICA PEDAGOGICA'];
    const mfSubs_13 = ['NEC', 'PAP'];
    const subs = cl === '10' ? mfSubs_10 : cl === '11' ? mfSubs_11 : cl === '12' ? mfSubs_12 : mfSubs_13;
    return (subs as SubjectType[]).map((sub, sIdx) => ({
      id: `GC_MAG_EDF_${cl}_${sIdx}`,
      modality: 'MAGISTERIO' as ModalityType,
      specialty: 'EDF',
      class: cl,
      subject: sub
    }));
  })
];

export function salvarGrelhaCurricular(items: GrelhaCurricularItem[]): void {
  try {
    localStorage.setItem('sigep_grelha_curricular_pedagogia_v5_magisterio', JSON.stringify(items));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('sigep_grelha_updated'));
    window.dispatchEvent(new CustomEvent('sigep:data-updated'));
  } catch (err) {
    console.error("Erro ao salvar grelha curricular:", err);
  }
}

export function resetarGrelhaCurricular(): GrelhaCurricularItem[] {
  try {
    localStorage.removeItem('sigep_grelha_curricular_pedagogia_v5_magisterio');
    const seeded = carregarGrelhaCurricular();
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('sigep_grelha_updated'));
    window.dispatchEvent(new CustomEvent('sigep:data-updated'));
    return seeded;
  } catch (err) {
    return carregarGrelhaCurricular();
  }
}

export function carregarGrelhaCurricular(): GrelhaCurricularItem[] {
  try {
    const saved = localStorage.getItem('sigep_grelha_curricular_pedagogia_v5_magisterio');
    if (saved) {
      const parsed: GrelhaCurricularItem[] = JSON.parse(saved);
      if (parsed && parsed.length > 0) {
        return parsed.sort((a, b) => {
          const posA = a.position !== undefined ? Number(a.position) : 0;
          const posB = b.position !== undefined ? Number(b.position) : 0;
          if (posA !== posB) return posA - posB;
          
          const modComp = (a.modality || '').localeCompare(b.modality || '');
          if (modComp !== 0) return modComp;
          const clComp = (a.class || '').localeCompare(b.class || '');
          if (clComp !== 0) return clComp;
          const specComp = (a.specialty || '').localeCompare(b.specialty || '');
          if (specComp !== 0) return specComp;
          return (a.subject || '').localeCompare(b.subject || '');
        });
      }
    }
    const seeded = SEED_GRELHA_CURRICULAR.map((item, idx) => ({
      ...item,
      position: item.position !== undefined ? item.position : idx
    }));
    localStorage.setItem('sigep_grelha_curricular_pedagogia_v5_magisterio', JSON.stringify(seeded));
    return seeded;
  } catch (err) {
    return SEED_GRELHA_CURRICULAR;
  }
}

export function getSubjectsForClass(className: string, activeModality?: ModalityType, specialty?: string): string[] {
  let modality: ModalityType = activeModality || 'ENSINO_PRIMARIO';
  if (!activeModality) {
    try {
      const saved = localStorage.getItem('sigep_active_modality_v1');
      if (saved) {
        modality = saved as any;
      }
    } catch (err) {}
  }

  // Normalize class string: "10ª", "10", "10ª Classe" -> "10"
  const targetClassNorm = (className || '').replace(/ª|º|ªClasse|ºClasse|Classe|\s/g, '').trim();

  // Resolve default specialty if missing in secondary education
  let resolvedSpecialty = specialty;
  if (!resolvedSpecialty && (modality === 'MAGISTERIO' || modality === 'PUNIV')) {
    resolvedSpecialty = modality === 'MAGISTERIO' ? 'EP' : 'CFB';
  }

  const grelha = carregarGrelhaCurricular();

  const filtered = grelha.filter(item => {
    if (item.active === false) return false; // Ignore inactive items
    if (item.modality !== modality) return false;
    
    const itemClassNorm = (item.class || '').replace(/ª|º|ªClasse|ºClasse|Classe|\s/g, '').trim();
    if (itemClassNorm !== targetClassNorm) return false;

    if ((modality === 'PUNIV' || modality === 'MAGISTERIO') && resolvedSpecialty) {
      const itemSpec = (item.specialty || '').toUpperCase().trim();
      let resSpec = resolvedSpecialty.toUpperCase().trim();

      // Normalização padrão para LEMC / L.EMC
      if (['LEMC', 'L.EMC', 'L_EMC', 'PORTUGUES', 'PORTUGUÊS'].includes(resSpec)) {
        resSpec = 'LEMC';
      }
      let normItemSpec = itemSpec;
      if (['LEMC', 'L.EMC', 'L_EMC', 'PORTUGUES', 'PORTUGUÊS'].includes(normItemSpec)) {
        normItemSpec = 'LEMC';
      }

      // Normalização padrão para Pré-Escolar
      if (['PE', 'PRE', 'INFANCIA', 'INFÂNCIA'].includes(resSpec)) {
        resSpec = 'PE';
      }
      if (['PE', 'PRE', 'INFANCIA', 'INFÂNCIA'].includes(normItemSpec)) {
        normItemSpec = 'PE';
      }

      // Common/Geral subjects apply to all specialties
      if (!normItemSpec || normItemSpec === 'GERAL') return true;
      if (normItemSpec === resSpec) return true;

      return false;
    }
    return true;
  });

  // Extract unique subject names in the order defined in the curriculum matrix
  const result: string[] = [];
  filtered.forEach(item => {
    if (item.subject && !result.includes(item.subject)) {
      result.push(item.subject);
    }
  });

  return result;
}

export function getSpecialtyFromSection(section: string, modality?: string): 'CFB' | 'CEJ' | 'CS' | 'AV' | 'EP' | 'EI' | 'PE' | 'MF' | 'BQ' | 'LEMC' | 'GH' | 'ING_EMC' | 'FRA_EMC' | 'EVP' | 'EDF' | 'EMC' | undefined {
  if (modality === 'ENSINO_PRIMARIO') return undefined;
  const sec = (section || '').toUpperCase().trim();
  if (!sec) return undefined;

  if (sec.includes('LEMC') || sec.includes('L.EMC') || sec.includes('L_EMC') || sec.startsWith('LE') || sec.includes('PORT')) return 'LEMC';
  if (sec.includes('CFB') || sec.includes('CB') || sec.includes('FM') || sec.includes('FB')) return 'CFB';
  if (sec.includes('CEJ') || sec.includes('CSE') || sec.includes('EJ')) return 'CEJ';
  if (sec.includes('CS') || sec.includes('HUM')) return 'CS';
  if (sec.includes('AV') || sec.includes('LA')) return 'AV';
  if (sec.includes('MF')) return 'MF';
  if (sec.includes('BQ')) return 'BQ';
  if (sec.includes('GH') || sec.includes('HIS') || sec.includes('HG')) return 'GH';
  if (sec.includes('ING')) return 'ING_EMC';
  if (sec.includes('FRA')) return 'FRA_EMC';
  if (sec.includes('EVP')) return 'EVP';
  if (sec.includes('EDF') || sec.includes('EF')) return 'EDF';
  if (sec.includes('EMC')) return 'EMC';
  if (sec.includes('PRE') || sec.includes('INF')) return 'PE';
  if (sec.includes('EP') || sec.includes('PRI')) return 'EP';
  if (sec.includes('PE')) return 'LEMC'; // Suporte para turmas legadas onde PE indicava Português e EMC
  
  return undefined;
}

export function getSpecialtyFullName(spec: string): string {
  const mapping: { [key: string]: string } = {
    'CFB': 'Ciências Físicas e Biológicas (CFB)',
    'CEJ': 'Ciências Económico-Jurídicas (CEJ)',
    'CS': 'Ciências Sociais / Humanas (CS)',
    'AV': 'Artes Visuais (AV)',
    'MF': 'Matemática e Física',
    'EP': 'Ensino Primário',
    'BQ': 'Biologia e Química',
    'ING_EMC': 'Inglês e EMC',
    'FRA_EMC': 'Francês e EMC',
    'EVP': 'Educação Visual e Plástica',
    'EDF': 'Educação Física',
    'EMC': 'Educação Moral e Cívica',
    'LEMC': 'Português e EMC (L.EMC)',
    'L.EMC': 'Português e EMC (L.EMC)',
    'GH': 'História e Geografia',
    'PE': 'Pré-Escolar',
    'GERAL': 'Ensino Geral'
  };
  return mapping[spec.toUpperCase()] || spec;
}

export function getStudentSpecialty(student: Student, modality?: ModalityType): 'CFB' | 'CEJ' | 'CS' | 'AV' | 'EP' | 'EI' | 'PE' | 'MF' | 'BQ' | 'LEMC' | 'GH' | 'ING_EMC' | 'FRA_EMC' | 'EVP' | 'EDF' | 'EMC' {
  if (student.specialty) return student.specialty as any;
  const fromSec = getSpecialtyFromSection(student.section || '', modality);
  if (fromSec) return fromSec;
  if (modality === 'MAGISTERIO') return 'EP';
  if (modality === 'PUNIV') return 'CFB';
  return 'EP';
}

export function isEnglishSubject(sub: string): boolean {
  if (!sub) return false;
  const u = sub.toUpperCase().trim();
  return u === 'L. INGLESA' || u === 'LÍNGUA INGLESA' || u === 'INGLÊS' || u === 'INGLES' || u.includes('INGLÊS') || u.includes('INGLES');
}

export function isFrenchSubject(sub: string): boolean {
  if (!sub) return false;
  const u = sub.toUpperCase().trim();
  return u === 'L. FRANCESA' || u === 'LÍNGUA FRANCESA' || u === 'FRANCÊS' || u === 'FRANCES' || u.includes('FRANCÊS') || u.includes('FRANCES');
}

export function getSubjectsForStudent(student: Student, activeModality?: ModalityType, overrideSpecialty?: string): string[] {
  let modality: ModalityType = activeModality || 'ENSINO_PRIMARIO';
  if (!activeModality) {
    try {
      const saved = localStorage.getItem('sigep_active_modality_v1');
      if (saved) {
        modality = saved as any;
      }
    } catch (err) {}
  }

  const spec = overrideSpecialty || getStudentSpecialty(student, modality);
  let subjects = getSubjectsForClass(student.class, modality, spec);

  const lang = student.foreignLanguage || 'INGLÊS';
  const numCls = parseInt(student.class, 10);
  const isNotMagisterio = modality !== 'MAGISTERIO';

  if (isNotMagisterio && (numCls >= 7 || modality === 'PUNIV')) {
    subjects = subjects.filter(sub => {
      if (isEnglishSubject(sub) && lang !== 'INGLÊS') return false;
      if (isFrenchSubject(sub) && lang !== 'FRANCÊS') return false;
      return true;
    });
  }

  return subjects;
}

export interface GradeRow {
  studentId: string;
  studentName: string;
  subject: SubjectType;
  trimester: 'I' | 'II' | 'III';
  mac: number | null; // Média de Avaliação Contínua
  npt: number | null; // Nota de Prova Trimestral
  npp?: number | null; // Nota de Prova Parcial (NPP)
  mt: number | null;  // Média Trimestral (MT)
}

export interface ClassFilter {
  class: string;
  section: string;
}

export type ActiveSheet = 
  | 'PAINEL_PAUTAS'
  | 'PAINEL_MINI_PAUTAS'
  | 'PAUTA1' 
  | 'PAUTA1TM1' 
  | 'Cadastro_BaseDados' 
  | 'MINI_PAUTA1_BANCODADOS' 
  | 'RELACAO_NOMINAL' 
  | 'CABECALHO' 
  | 'UTILIZADOR'
  | 'RECURSOS_HUMANOS'
  | 'FINANCEIRO'
  | 'DECLARACOES_CERTIFICADOS'
  | 'RELATORIOS'
  | 'PAINEL_DIRECTOR_GERAL'
  | 'COMUNICACAO'
  | 'AREA_ACADEMICA'
  | 'ESTATISTICAS'
  | 'HOME';

export interface StudentFinance {
  id: string;
  name: string;
  class: string;
  section: string;
  periodo: string;
  modalidade: 'Regular' | 'Parcial' | 'Integral';
  desconto: string;
  mesesPagos: boolean[]; // 11 elements for: Setembro, Outubro, Novembro, Dezembro, Janeiro, Fevereiro, Março, Abril, Maio, Junho, Julho
  totalPago: number;
  totalDivida: number;
  dataUltimoPg: string;
  observacoes: string;
  faltasInjustificadas?: number;
  faltasJustificadas?: number;
  faltasPagas?: number;
  attendanceDates?: Record<string, 'NORMAL' | 'INJUSTIFICADA' | 'JUSTIFICADA'>;
}

export type UserRole = 
  | 'DIRECTOR_GERAL'
  | 'SUB_DIRECTOR_PEDAGOGICO'
  | 'SUB_DIRECTOR_ADMINISTRATIVO'
  | 'CHEFE_SECRETARIA'
  | 'COORDENADOR'
  | 'COORDENADOR_TURNO'
  | 'COORDENADOR_DISCIPLINA'
  | 'COORDENADOR_PRATICAS_PEDAGOGICAS'
  | 'SECRETARIO'
  | 'PROFESSOR'
  | 'SIGEP';

export type StaffRole = 
  | 'DIRECTOR_GERAL'
  | 'SUB_DIRECTOR_PEDAGOGICO'
  | 'SUB_DIRECTOR_ADMINISTRATIVO'
  | 'CHEFE_SECRETARIA'
  | 'COORDENADOR_TURNO'
  | 'COORDENADOR_DISCIPLINA'
  | 'COORDENADOR_PRATICAS_PEDAGOGICAS'
  | 'COORDENADOR'
  | 'PROFESSOR'
  | 'AUXILIAR_LIMPEZA'
  | 'SEGURANCA'
  | 'TECNICO_PEDAGOGICO'
  | 'TECNICO_ADMINISTRATIVO'
  | 'SIGEP';

export interface CurricularAssignment {
  class: string;
  section: string;
  subject: string;
  specialty?: string;
}

export interface Staff {
  id: string; // E.g. MAP674
  name: string;
  role: StaffRole;
  contact?: string; // Contacto telefónico para validação e recuperação de senha
  classes?: string[]; // assigned classes for teaching
  sections?: string[]; // assigned turmas/sections for teaching
  subjects?: SubjectType[]; // assigned subjects
  assignments?: CurricularAssignment[]; // Atribuições acumuladas detalhadas (Classe + Turma + Disciplina)
  specialty?: string; // assigned specialty/ramo
  specialtyMedio?: string; // Especialidade no Ensino Médio
  specialtySuperior?: string; // Especialidade no Ensino Superior
  password?: string; // password/senhas
  senha_expirada?: boolean; // Flag de expiração forçada de senha pós-restauro de segurança
  password_expired?: boolean; // Alias para compatibilidade
  is_root?: boolean; // flag de utilizador raiz do sistema
  is_editable?: boolean; // flag para imutabilidade do utilizador
  
  // Campos extra de RH profissional & Permissões do Director Geral
  categoria?: string; // Categoria profissional (Grau da Função Pública)
  tempoServico?: string; // Tempo de Serviço em Anos
  dataNascimento?: string; // Data de Nascimento (YYYY-MM-DD / DD/MM/AAAA)
  numSeguroSocial?: string; // Nº de Seguro Social (INSS)
  habilitacoesLiterarias?: string; // Habilitações Literárias Geral
  habilitacoesMedio?: string; // Habilitações Nível Médio (ex: Técnico Médio de Enfermagem)
  habilitacoesSuperior?: string; // Habilitações Nível Superior (ex: Licenciatura em Matemática)
  genero?: 'M' | 'F' | 'Masculino' | 'Feminino'; // Género
  unidadeOrganica?: string; // Unidade Orgânica (Escola)
  numAgente?: string; // Nº de Agente
  isEfetivo?: boolean; // Vínculo: Efetivo (true) ou Não Efetivo/Contratado (false)
  periodoTrabalho?: 'MATINAL' | 'VESPERTINO' | 'NOTURNO' | 'ADMINISTRATIVO'; // Turno / Período de Trabalho do Ponto
  periodo?: string; // Período de Trabalho (alias)
  faltasInjustificadas?: number; // Contagem de faltas injustificadas acumuladas

  gabinete?: string; // Chefias
  decretoNomeacao?: string; // Chefias
  tipoCoordenacao?: 'TURNO' | 'DISCIPLINA' | 'PRATICAS_PEDAGOGICAS'; // Coordenadores
  disciplinaCoordenada?: SubjectType; // Coordenadores
  turnoCoordenado?: string; // Coordenadores / Limpeza
  categoriaPedagogica?: string; // Professores
  areaAtribuicao?: string; // Limpeza
  postoGuarita?: string; // Segurança
  tipoEscalaVigilante?: string; // Segurança
  idColeteVigilante?: string; // Segurança

  // Permissões de Acesso ao SIGEP delegadas pelo Director Geral
  sigepAccessAllowed?: boolean; // Permissão de acesso ao SIGEP atribuída pelo Director Geral
  sigepAbsenceAccessOnly?: boolean; // Acesso restrito única e exclusivamente para lançamento de faltas
}

export interface PontoRecord {
  id: string; // ex: PONTO_MAP674_2026-08-08
  staffId: string;
  staffName: string;
  staffRole?: string;
  date: string; // YYYY-MM-DD
  timestamp?: string; // HH:mm:ss da assinatura
  status: 'PRESENTE' | 'FALTA_INJUSTIFICADA' | 'FALTA_INJUSTIFICADA_PENDENTE' | 'PRESENCA_JUSTIFICADA';
  periodoTrabalho?: 'MATINAL' | 'VESPERTINO' | 'NOTURNO' | 'ADMINISTRATIVO';
  
  // Workflow de esclarecimento de falta
  motivoEsclarecimentoSolicitado?: string; // Mensagem da Direção solicitando justificativa
  dataSolicitacaoEsclarecimento?: string;
  
  justificativaProfessor?: string; // Resposta do funcionário/professor
  dataJustificativa?: string;
  
  statusWorkflow?: 'PENDENTE_ASSINATURA' | 'PENDENTE_CONFIRMACAO' | 'AGUARDANDO_ESCLARECIMENTO' | 'JUSTIFICATIVA_ENVIADA' | 'CONFIRMADO' | 'ANULADO_JUSTIFICADO';
  decisaoDiretorObs?: string;
}

export interface SchoolSettings {
  subdirectorPedagogicoPontoEnabled?: boolean; // Delegar gestão de ponto ao Subdirector Pedagógico
  subdirectorAdminPontoEnabled?: boolean; // Delegar gestão de ponto ao Subdirector Administrativo
  schoolName: string;
  municipality: string;
  province: string;
  address: string;
  email: string;
  phone: string;
  directorName: string;
  subdirectorName: string;
  subdirectorAdminName?: string;
  coordinators: string[];
  secretaryName: string;
  logoType: 'PUBLIC' | 'PRIVATE';
  privateLogoUrl?: string;
  publicLogoUrl?: string;
  syncEnabled?: boolean;
  syncServerUrl?: string;
  academicYear?: string;
  activeComponents?: {
    ENSINO_PRIMARIO: boolean;
    PUNIV: boolean;
    MAGISTERIO: boolean;
  };
  officialSubsystem?: 'PRIMARIO_I_CICLO' | 'SECUNDARIO_GERAL' | 'SECUNDARIO_PEDAGOGICO';
  decretoExecutivo?: string;
  despachoCriacao?: string;
  leiBaseRegulamento?: string;
  leiBase6a?: string;
  leiBase6aActive?: boolean;
  leiBase9a?: string;
  leiBase9aActive?: boolean;
  leiBase12a?: string;
  leiBase12aActive?: boolean;
  leiBase13a?: string;
  leiBase13aActive?: boolean;
  headerLine1?: string;
  headerLine1Active?: boolean;
  headerLine2?: string;
  headerLine2Active?: boolean;
  headerLine3?: string;
  headerLine3Active?: boolean;
  headerLine4?: string;
  headerLine4Active?: boolean;
  directorRoleLabel?: string;
  subdirectorRoleLabel?: string;
  subdirectorAdminRoleLabel?: string;
  secretaryRoleLabel?: string;
  onlineCandidaturesEnabled?: boolean;
  allowTeacherGradeEntry?: boolean;
  trimesterI_Status?: 'ABERTO' | 'FECHADO';
  trimesterII_Status?: 'ABERTO' | 'FECHADO';
  trimesterIII_Status?: 'ABERTO' | 'FECHADO';
}

export function getLeiBaseForCertificate(
  settings?: SchoolSettings,
  subsistema?: string,
  selectedClass?: string
): string {
  if (!settings) {
    return 'disposto na alínea b) do Artigo 109º da LBEE 17/16, de 7 de Outubro';
  }

  // 1. If 6ª classe (Ensino Primário)
  if (selectedClass === '6' || (subsistema === 'PRIMARIO' && selectedClass !== '9')) {
    if (settings.leiBase6aActive !== false && settings.leiBase6a) {
      return settings.leiBase6a;
    }
  }

  // 2. If 9ª classe (Iº Ciclo do Ensino Geral)
  if (selectedClass === '9' || (subsistema === 'PRIMARIO' && selectedClass === '9')) {
    if (settings.leiBase9aActive !== false && settings.leiBase9a) {
      return settings.leiBase9a;
    }
  }

  // 3. If 12ª classe (PUNIV / Liceu)
  if (selectedClass === '12' || subsistema === 'PUNIV') {
    if (settings.leiBase12aActive !== false && settings.leiBase12a) {
      return settings.leiBase12a;
    }
  }

  // 4. If 13ª classe (MAGISTERIO / Pedagógico)
  if (selectedClass === '13' || subsistema === 'MAGISTERIO') {
    if (settings.leiBase13aActive !== false && settings.leiBase13a) {
      return settings.leiBase13a;
    }
  }

  return settings.leiBaseRegulamento || 'disposto na alínea b) do Artigo 109º da LBEE 17/16, de 7 de Outubro';
}


