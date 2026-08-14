/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  CheckCircle2, 
  Share2, 
  Download, 
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers
} from 'lucide-react';
import { Student, SchoolSettings, GradeRow, ModalityType } from '../types';
import TransferenciaGuiaBoletimDocument from './documents/TransferenciaGuiaBoletimDocument';

export interface TransferenciaEmissaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  schoolSettings: SchoolSettings;
  grades?: GradeRow[];
  activeModality?: ModalityType;
  initialGuiaNumero?: string;
  initialEscolaDestino?: string;
  initialProvinciaDestino?: string;
  initialMotivo?: string;
}

export const TransferenciaEmissaoModal: React.FC<TransferenciaEmissaoModalProps> = ({
  isOpen,
  onClose,
  student,
  schoolSettings,
  grades = [],
  activeModality = 'ENSINO_PRIMARIO',
  initialGuiaNumero,
  initialEscolaDestino,
  initialProvinciaDestino,
  initialMotivo
}) => {
  const [mode, setMode] = useState<'BOTH' | 'GUIA_ONLY' | 'BOLETIM_ONLY'>('BOTH');
  const [guiaNum, setGuiaNum] = useState(initialGuiaNumero || student?.guiaTransferenciaSaida || '');
  const [escolaDest, setEscolaDest] = useState(initialEscolaDestino || student?.escolaDestino || '');
  const [provDest, setProvDest] = useState(initialProvinciaDestino || student?.provinciaDestino || '');
  const [showConfigBar, setShowConfigBar] = useState(false);

  if (!isOpen || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Container Principal */}
      <div className="bg-slate-100 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-300 flex flex-col max-h-[96vh] print:max-h-none print:border-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Barra Superior de Controlo (Oculta na Impressão) */}
        <div className="bg-slate-900 text-white px-5 py-4 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm tracking-wide">
                  Emissão Oficial: Guia & Boletim de Transferência
                </h3>
                <span className="text-[10px] font-black uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Homologado
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Aluno: <span className="font-bold text-white uppercase">{student.name}</span> ({student.class}ª Classe - Turma {student.section})
              </p>
            </div>
          </div>

          {/* Modos de Visualização / Impressão */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700">
              <button
                type="button"
                onClick={() => setMode('BOTH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  mode === 'BOTH' 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Ambos (2 Pág.)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('GUIA_ONLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  mode === 'GUIA_ONLY' 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Guia de Saída
              </button>

              <button
                type="button"
                onClick={() => setMode('BOLETIM_ONLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  mode === 'BOLETIM_ONLY' 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Boletim de Notas
              </button>
            </div>

            {/* Botão de Impressão Direta */}
            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/20 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Documentos</span>
            </button>

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl border border-slate-700 cursor-pointer transition-colors"
              title="Fechar Janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informações Rápidas de Destino e Ajustes Rápidos (Oculto na Impressão) */}
        <div className="bg-slate-200/90 border-b border-slate-300 px-5 py-2.5 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1 font-semibold text-slate-800">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Escola Receptora:</span>
              <strong className="text-slate-950 uppercase">{escolaDest || student.escolaDestino || 'Não informada'}</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-slate-800">
              Província: <strong className="text-slate-950">{provDest || student.provinciaDestino || schoolSettings.province || 'Lunda Norte'}</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-slate-800">
              Guia: <strong className="text-rose-700 font-mono font-bold">{guiaNum || student.guiaTransferenciaSaida || 'Automático'}</strong>
            </span>
          </div>

          <div className="text-[11px] text-slate-500 italic">
            Formato: <strong>A4 Portrait Oficial</strong> com marca d'água e carimbo institucional
          </div>
        </div>

        {/* Área de Visualização com Scroll (Documentos A4) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-300/60 print:overflow-visible print:p-0 print:bg-white">
          <div className="max-w-[210mm] mx-auto print:m-0 print:max-w-none">
            <TransferenciaGuiaBoletimDocument
              student={student}
              schoolSettings={schoolSettings}
              grades={grades}
              activeModality={activeModality}
              guiaNumero={guiaNum || student.guiaTransferenciaSaida}
              escolaDestino={escolaDest || student.escolaDestino}
              provinciaDestino={provDest || student.provinciaDestino}
              mode={mode}
              onClose={onClose}
            />
          </div>
        </div>

        {/* Rodapé do Modal (Oculto na Impressão) */}
        <div className="bg-white border-t border-slate-300 px-5 py-3 rounded-b-2xl flex items-center justify-between shrink-0 print:hidden">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Processo em conformidade com o Regulamento Geral de Avaliação e Transferências do MED - Angola.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-650 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Fechar Visualização
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Gerar PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TransferenciaEmissaoModal;
