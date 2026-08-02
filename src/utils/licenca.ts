/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR CRIPTOGRÁFICO SIGEP v1.1 - OFFLINE
 */

// 1. Tradução Fiel do SimpleHash VBA (Hexadecimal)
export function simpleHash(txt: string): string {
  let h = 0;
  for (let i = 0; i < txt.length; i++) {
    h += txt.charCodeAt(i) * (i + 1);
  }
  return h.toString(16).toUpperCase();
}

// 2. Tradução Fiel do SimpleMix VBA
export function simpleMix(txt: string): number {
  let h = 0;
  for (let i = 0; i < txt.length; i++) {
    h = (h * 33) ^ txt.charCodeAt(i);
    h = h - Math.floor(h / 1000000) * 1000000;
  }
  return Math.abs(h);
}

// 3. Tradução Fiel do ToBase36 VBA (Garante 4 caracteres)
export function toBase36(n: number): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let num = Math.abs(n);
  let res = "";
  if (num === 0) return "0000";
  while (num > 0) {
    let r = num % 36;
    res = chars.charAt(r) + res;
    num = Math.floor(num / 36);
  }
  return ("0000" + res).slice(-4);
}

// 4. Função Gerar Licença (A sua ferramenta mestre de bolso)
export function gerarLicencaOffline(idPC: string, anos: number, dataInicioObj?: Date): { chave: string; strInicio: string; strFim: string } {
  const hoje = dataInicioObj || new Date();
  const dataFimObj = new Date(hoje);
  dataFimObj.setFullYear(hoje.getFullYear() + anos);

  const formatarYMD = (d: Date) => 
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  const strInicio = formatarYMD(hoje);
  const strFim = formatarYMD(dataFimObj);
  const salt = "SIGEP-SECURE-V2";

  const payload = `${idPC}|${strInicio}|${strFim}|${salt}`;
  const assinatura = simpleHash(payload);

  const b1 = toBase36(simpleMix(payload + assinatura));
  const b2 = toBase36(simpleMix(idPC + strInicio + anos));
  const b3 = toBase36(simpleMix(strFim + salt + assinatura));

  return {
    chave: `SGP-${b1}-${b2}-${b3}`,
    strInicio,
    strFim
  };
}

// 5. Função Validar Licença Offline
export function validarLicencaOffline(
  idPC: string,
  chave: string,
  strInicio: string,
  strFim: string
): { isValid: boolean; error?: string } {
  if (!chave || !chave.startsWith("SGP-")) {
    return { isValid: false, error: "Formato de chave inválido. Deve começar com SGP-" };
  }

  const cleanChave = chave.trim().toUpperCase();

  const partes = cleanChave.split("-");
  if (partes.length !== 4) {
    return { isValid: false, error: "A chave de licença deve conter 3 blocos (SGP-XXXX-XXXX-XXXX)" };
  }

  const [, b1, b2, b3] = partes;
  const salt = "SIGEP-SECURE-V2";

  // Reconstruir anos
  if (strInicio.length !== 8 || strFim.length !== 8) {
    return { isValid: false, error: "Datas de início/fim inválidas. Formato esperado: AAAAMMDD" };
  }

  const anoInicio = parseInt(strInicio.substring(0, 4));
  const anoFim = parseInt(strFim.substring(0, 4));
  const anos = anoFim - anoInicio;

  if (anos <= 0 || isNaN(anos)) {
    return { isValid: false, error: "O período da licença é inválido (anos <= 0)" };
  }

  const payload = `${idPC}|${strInicio}|${strFim}|${salt}`;
  const assinatura = simpleHash(payload);

  const calcB1 = toBase36(simpleMix(payload + assinatura));
  const calcB2 = toBase36(simpleMix(idPC + strInicio + anos));
  const calcB3 = toBase36(simpleMix(strFim + salt + assinatura));

  if (b1 !== calcB1 || b2 !== calcB2 || b3 !== calcB3) {
    return { isValid: false, error: "Chave de licença inválida para este ID PC ou datas fornecidas" };
  }

  return { isValid: true };
}

import { safeStorage } from './storage';

// 6. Função para obter ID PC estável
export function obterOuCriarIdPC(): string {
  const chave = 'sigep_id_pc_v2';
  let id = safeStorage.getItem(chave);
  const regex = /^SG-[0-9A-F]{8}$/;
  if (!id || !regex.test(id)) {
    const hex = Array.from({length: 8}, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
    id = `SG-${hex}`;
    safeStorage.setItem(chave, id);
  }
  return id;
}

// 7. Função para calcular dias restantes com base na data de fim YYYYMMDD
export function calcularDiasRestantes(strFim: string): number {
  if (!strFim || strFim.length !== 8) return -1;
  try {
    const ano = parseInt(strFim.substring(0, 4));
    const mes = parseInt(strFim.substring(4, 6)) - 1;
    const dia = parseInt(strFim.substring(6, 8));
    const dataFimObj = new Date(ano, mes, dia);
    
    const hoje = new Date();
    const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimZero = new Date(dataFimObj.getFullYear(), dataFimObj.getMonth(), dataFimObj.getDate());
    
    const diffTime = fimZero.getTime() - hojeZero.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (e) {
    return -1;
  }
}

// 8. Função para formatar uma string YYYYMMDD para DD/MM/AAAA
export function formatarDataLegivel(strYMD: string): string {
  if (!strYMD || strYMD.length !== 8) return "";
  const ano = strYMD.substring(0, 4);
  const mes = strYMD.substring(4, 6);
  const dia = strYMD.substring(6, 8);
  return `${dia}/${mes}/${ano}`;
}
