/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TipoClasse = 'EXAME' | 'CONTINUA';

/**
 * Retorna se a classe é uma classe de Exame (6ª, 9ª e 12ª) ou de Transição Contínua (1ª a 5ª, 7ª, 8ª, 10ª e 11ª).
 */
export function isExameClass(currentClass: string): boolean {
  const sanitized = String(currentClass || '').trim();
  return ['6', '9', '12'].includes(sanitized);
}

/**
 * Retorna o TipoClasse ('EXAME' ou 'CONTINUA') de acordo com a classe.
 */
export function getTipoClasse(currentClass: string): TipoClasse {
  return isExameClass(currentClass) ? 'EXAME' : 'CONTINUA';
}

export interface NotaDisciplina {
  idDisciplina: string;
  mac: number | null;
  npp: number | null;
  npt: number | null;
  mt: number | null;
  reprovadoNaDisciplina: boolean; // Flag baseada no regulamento interno
}

export interface AlunoPauta {
  id: string;
  nome: string;
  disciplinas: NotaDisciplina[];
}

export function calcularObservacaoPauta(
  aluno: AlunoPauta, 
  tipoClasse: TipoClasse, 
  limiteDesistencia: number = 0.3
): 'Transita' | 'N/Transita' | 'Apto' | 'N/Apto' | 'Desistente' {
  let totalCampos = 0;
  let camposVazios = 0;

  // 1. Contabilizar total de campos de notas esperados (MAC, NPP, NPT, MT) e total de campos vazios
  for (const disc of aluno.disciplinas) {
    const campos = [disc.mac, disc.npp, disc.npt, disc.mt];
    totalCampos += campos.length;
    for (const val of campos) {
      if (val === null || val === undefined) {
        camposVazios++;
      }
    }
  }

  // 2. Critério de Desistência: Se o volume de campos vazios/nulos for >= limite (padrão 30%)
  if (totalCampos > 0) {
    const percentagemVazios = camposVazios / totalCampos;
    if (percentagemVazios >= limiteDesistencia) {
      return 'Desistente';
    }
  }

  // 3. Se tiver campos vazios mas for inferior ao limite de desistência, mantém a retenção
  let temCamposVazios = false;
  for (const disc of aluno.disciplinas) {
    if (disc.mac === null || disc.npp === null || disc.npt === null || disc.mt === null) {
      temCamposVazios = true;
      break;
    }
  }

  if (temCamposVazios) {
    return tipoClasse === 'CONTINUA' ? 'N/Transita' : 'N/Apto';
  }

  // 4. Caso contrário, avalia o desempenho normal
  const temReprovacao = aluno.disciplinas.some(disc => disc.reprovadoNaDisciplina);

  if (tipoClasse === 'CONTINUA') {
    return temReprovacao ? 'N/Transita' : 'Transita';
  } else {
    return temReprovacao ? 'N/Apto' : 'Apto';
  }
}

export function obterCorObservacaoClass(obs: string): string {
  const normalized = String(obs).trim().toUpperCase();
  if (normalized === 'TRANSITA' || normalized === 'APTO') {
    return 'text-[#0000FF] bg-blue-50 border-[#0000FF]/20 font-extrabold'; // Azul Puro
  }
  if (
    normalized === 'N/TRANSITA' || 
    normalized === 'N/APTO' || 
    normalized === 'DESISTENTE' || 
    normalized === 'REPROVADO' || 
    normalized === 'NÃO TRANSITA' || 
    normalized === 'NÃO APTO'
  ) {
    return 'text-[#FF0000] bg-red-50 border-[#FF0000]/20 font-extrabold'; // Vermelho Puro
  }
  return 'text-slate-600 bg-slate-50 border-slate-200';
}

export interface Disciplina {
  id: string;
  nome: string;
  mfd: number;
  ne: number;
}

export const calcularMF = (mfd: number, ne: number): number => {
  return Number(((mfd * 0.6) + (ne * 0.4)).toFixed(1));
};

export const verificarStatus = (notas: { mf: number }[]): 'Transita' | 'Não Transita' => {
  const negativas = notas.filter(n => n.mf < 10).length;
  // Regra: Transita se tiver no máximo 1 negativa
  return negativas <= 1 ? 'Transita' : 'Não Transita';
};

export const formatarNomePauta = (nome: string): string => {
  if (!nome) return '';
  const partes = nome.trim().split(/\s+/);
  if (partes.length >= 5) {
    const primeiro = partes[0];
    const ultimo = partes[partes.length - 1];
    const meioAbreviado = partes.slice(1, partes.length - 1).map(p => {
      if (!p) return '';
      return p[0].toUpperCase() + '.';
    }).filter(Boolean).join(' ');
    return `${primeiro} ${meioAbreviado} ${ultimo}`;
  } else if (partes.length === 4) {
    const primeiro = partes[0];
    const segundo = partes[1];
    const terceiroAbreviado = partes[2] ? partes[2][0].toUpperCase() + '.' : '';
    const ultimo = partes[3];
    return `${primeiro} ${segundo} ${terceiroAbreviado} ${ultimo}`;
  }
  return nome;
};

export function formatarNomeProprio(nome: string): string {
  if (!nome) return "";
  
  // Lista de partículas de ligação comuns que devem ficar em minúsculas
  const particulasLigacao = ["de", "da", "do", "dos", "das", "e"];
  
  return nome
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Remove espaços duplos
    .split(' ')
    .map((palavra, index) => {
      // Se for uma partícula de ligação e não for a primeira palavra, mantém minúscula
      if (particulasLigacao.includes(palavra) && index > 0) {
        return palavra;
      }
      // Caso contrário, capitaliza a primeira letra
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(' ');
}

export function formatarNomeDisciplina(nome: string): string {
  if (!nome) return "";
  const particulasLigacao = ["de", "da", "do", "dos", "das", "e"];
  
  return nome
    .trim()
    .replace(/\s+/g, ' ') // Remove espaços duplos
    .split(' ')
    .map((palavra, index) => {
      // 1. Check if it's a linking particle
      const palavraLower = palavra.toLowerCase();
      if (particulasLigacao.includes(palavraLower) && index > 0) {
        return palavraLower;
      }
      
      // 2. Check if it's a sigla (like NEE, PSEP)
      const uppercaseCount = (palavra.match(/[A-Z]/g) || []).length;
      const lowercaseCount = (palavra.match(/[a-z]/g) || []).length;
      
      if (
        (palavra === palavra.toUpperCase() && palavra.length >= 2) ||
        (uppercaseCount >= 2 && lowercaseCount > 0) ||
        palavra.includes('.') // like Ed.M. or L.
      ) {
        if (palavra.includes('.')) {
          return palavra.split('.')
            .map((sub, subIdx) => {
              if (!sub) return '';
              if (particulasLigacao.includes(sub.toLowerCase()) && subIdx > 0) return sub.toLowerCase();
              if (sub === sub.toUpperCase()) return sub;
              return sub.charAt(0).toUpperCase() + sub.slice(1);
            })
            .join('.');
        }
        return palavra;
      }
      
      // 3. Default: Capitalize the first letter, keep the rest as is or lowercase the rest
      return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Algoritmo de Extração e Concatenação do Código da Pauta
 * Extrai os dois últimos dígitos dos anos que compõem o intervalo do Ano Letivo (ex: "2025/2026" -> "25|26").
 * O código final é montado seguindo o prefixo fixo "A", colado aos dígitos do ano, seguido de um hífen e do número puro da classe.
 * Exemplo de Resultado Esperado: Ano Letivo "2025/2026" + "10ª Classe" -> "A25|26-10"
 */
export function gerarCodigoPauta(anoLectivo: string, classe: string): string {
  const safeAno = String(anoLectivo || '2025/2026').trim();
  const safeClasse = String(classe || '').trim();

  // Isolamento dos dois últimos dígitos dos anos do intervalo
  const partes = safeAno.split(/[\/\-]/).map(p => p.trim()).filter(Boolean);
  let digitosAno = '';

  if (partes.length >= 2) {
    const y1 = partes[0].slice(-2);
    const y2 = partes[1].slice(-2);
    digitosAno = `${y1}|${y2}`;
  } else if (partes.length === 1 && partes[0].length > 0) {
    digitosAno = partes[0].slice(-2);
  } else {
    digitosAno = '25|26';
  }

  // Extrair o número puro da classe (ex: "10ª Classe" -> "10", "1ª" -> "1")
  const matchNum = safeClasse.match(/\d+/);
  const numeroPuro = matchNum ? matchNum[0] : (safeClasse || '0');

  return `A${digitosAno}-${numeroPuro}`;
}




