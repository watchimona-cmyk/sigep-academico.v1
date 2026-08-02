/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calcula a média simples de um array de notas.
 */
export const calculateClassAverage = (grades: number[]): number => {
  if (grades.length === 0) return 0;
  const sum = grades.reduce((acc, curr) => acc + curr, 0);
  return sum / grades.length;
};

/**
 * Calcula a Média Anual (MA) baseada nas médias da 10ª, 11ª e 12ª classes.
 */
export const calculateMA = (avg10: number, avg11: number, avg12: number): number => {
  return (avg10 + avg11 + avg12) / 3;
};

/**
 * Calcula a Média Final (MF) baseada na MA, PAP e NEC usando pesos dinâmicos.
 * Fórmula padrão: (3 * MA + PAP + NEC) / 5
 */
export const calculateMF = (
  MA: number, 
  PAP: number, 
  NEC: number, 
  weightMA = 3, 
  weightPAP = 1, 
  weightNEC = 1
): number => {
  const totalWeight = weightMA + weightPAP + weightNEC;
  if (totalWeight === 0) return 0;
  return (weightMA * MA + weightPAP * PAP + weightNEC * NEC) / totalWeight;
};

/**
 * Retorna as configurações de pesos das fórmulas salvas localmente
 */
export interface FormulaWeights {
  weightMA: number;
  weightPAP: number;
  weightNEC: number;
}

export const getSavedFormulaWeights = (): FormulaWeights => {
  try {
    const saved = localStorage.getItem('sigep_formula_weights');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Erro ao ler pesos das fórmulas', e);
  }
  return {
    weightMA: 3,
    weightPAP: 1,
    weightNEC: 1
  };
};

export const saveFormulaWeights = (weights: FormulaWeights): void => {
  try {
    localStorage.setItem('sigep_formula_weights', JSON.stringify(weights));
  } catch (e) {
    console.error('Erro ao salvar pesos das fórmulas', e);
  }
};
