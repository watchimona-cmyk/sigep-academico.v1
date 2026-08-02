import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Lock, Key, CheckCircle, RefreshCw, Sparkles, Terminal } from 'lucide-react';
import { obterOuCriarIdPC, validarLicencaOffline, gerarLicencaOffline, calcularDiasRestantes } from '../utils/licenca';

export default function SystemLockScreen() {
  const idPC = obterOuCriarIdPC();
  const [inputChave, setInputChave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados do Gerador de Suporte Técnico Embutido (Facilita teste em ambiente de desenvolvimento)
  const [showGenerator, setShowGenerator] = useState(false);
  const [genAnos, setGenAnos] = useState<number>(1);
  const [chaveGerada, setChaveGerada] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanChave = inputChave.trim().toUpperCase();
    if (!cleanChave) {
      setError("Por favor, introduza a chave de licença.");
      return;
    }

    const today = new Date();
    const formattedStart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    let detectedAnos: number | null = null;
    for (let a = 1; a <= 3; a++) {
      const dFim = new Date(today);
      dFim.setFullYear(today.getFullYear() + a);
      const testEnd = `${dFim.getFullYear()}${String(dFim.getMonth() + 1).padStart(2, '0')}${String(dFim.getDate()).padStart(2, '0')}`;
      
      const res = validarLicencaOffline(idPC, cleanChave, formattedStart, testEnd);
      if (res.isValid) {
        detectedAnos = a;
        break;
      }
    }

    if (detectedAnos === null) {
      setError("A chave introduzida é inválida para este ID de PC. Certifique-se de que a chave foi gerada especificamente para este computador.");
      return;
    }

    const dFimReal = new Date(today);
    dFimReal.setFullYear(today.getFullYear() + detectedAnos);
    const formattedEnd = `${dFimReal.getFullYear()}${String(dFimReal.getMonth() + 1).padStart(2, '0')}${String(dFimReal.getDate()).padStart(2, '0')}`;

    // Guardar nova licença
    localStorage.setItem('sigep_lic_chave_v1', cleanChave);
    localStorage.setItem('sigep_lic_inicio_v1', formattedStart);
    localStorage.setItem('sigep_lic_fim_v1', formattedEnd);
    localStorage.setItem('sigep_lic_id_pc_v1', idPC);
    localStorage.setItem('sigep_custom_dias_restantes', String(calcularDiasRestantes(formattedEnd)));

    setSuccess(`Licença de ${detectedAnos} Ano(s) ativada com absoluto sucesso para este computador! A desbloquear o sistema...`);
    setInputChave('');

    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const handleGenerateKey = () => {
    const today = new Date();
    const res = gerarLicencaOffline(idPC, genAnos, today);
    setChaveGerada(res.chave);
    setCopiado(false);
  };

  const handleCopyGenerated = () => {
    if (chaveGerada) {
      navigator.clipboard.writeText(chaveGerada);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 select-none font-sans text-slate-200" id="sigep-lock-container">
      
      {/* Luzes decorativas de fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-xl w-full text-center space-y-6 z-10" id="sigep-lock-content">
        
        {/* Ícone de bloqueio moderno com pulso orbital */}
        <div className="mx-auto w-20 h-20 bg-rose-950/45 text-rose-500 rounded-3xl flex items-center justify-center border border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.15)] animate-pulse" id="sigep-lock-shield-wrapper">
          <ShieldAlert className="w-10 h-10" id="sigep-lock-shield-icon" />
        </div>

        <div className="space-y-1.5" id="sigep-lock-title-block">
          <h1 className="text-lg font-black text-white uppercase tracking-wider flex items-center justify-center gap-2" id="sigep-lock-headline">
            <Lock className="w-5 h-5 text-rose-500" id="sigep-lock-icon" />
            Integridade do Software
          </h1>
          <h2 className="text-rose-500 font-mono text-xs tracking-widest font-bold" id="sigep-lock-subheadline">
            SISTEMA BLOQUEADO: DETECTADA CÓPIA DE HARDWARE
          </h2>
        </div>

        {/* Informações detalhadas do bloqueio */}
        <div className="bg-slate-900/80 border border-slate-800/85 p-5 rounded-2xl text-left space-y-4 shadow-xl" id="sigep-lock-details">
          <p className="text-slate-300 text-xs leading-relaxed" id="sigep-lock-paragraph">
            O SIGEP-Academic detectou que a instalação atual ou os dados da licença foram movidos para um novo computador. Para proteger a integridade do sistema, a licença anterior foi descartada e o acesso foi suspenso até à nova ativação.
          </p>

          <div className="bg-rose-950/40 border border-rose-500/20 p-3 rounded-xl flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-rose-200 font-medium leading-relaxed">
              As licenças do SIGEP-Academic são dinâmicas, renováveis e vinculadas criptograficamente ao ID de hardware exclusivo de cada computador.
            </p>
          </div>

          {/* Secção do ID do Computador */}
          <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between font-mono text-xs">
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-sans block">ID do PC Atual:</span>
              <span className="text-white font-black tracking-wider text-sm">{idPC}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(idPC);
                alert("ID do PC copiado com sucesso!");
              }}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-750 hover:bg-slate-850 hover:border-slate-650 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer"
            >
              Copiar ID
            </button>
          </div>

          {/* Form de Ativação Direta */}
          <form onSubmit={handleActivate} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">
                Introduzir Nova Chave de Ativação (SGP-XXXX-XXXX-XXXX):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputChave}
                  onChange={(e) => {
                    setInputChave(e.target.value);
                    setError(null);
                  }}
                  placeholder="SGP-XXXX-XXXX-XXXX"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 font-mono tracking-wider focus:outline-none"
                />
                <Key className="absolute right-3 top-3 w-4 h-4 text-slate-600" />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[11px] font-medium leading-relaxed">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[11px] font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Ativar e Desbloquear Sistema</span>
            </button>
          </form>
        </div>

        {/* Gerador de Suporte Técnico Oculto */}
        <div className="border border-slate-800/60 rounded-2xl overflow-hidden bg-slate-900/30">
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-1.5 font-mono">
              <Terminal className="w-3.5 h-3.5 text-indigo-500" />
              {showGenerator ? "Ocultar Consola de Suporte" : "Aceder à Consola de Suporte (Gerador de Licença)"}
            </span>
            <span>{showGenerator ? "▲" : "▼"}</span>
          </button>

          {showGenerator && (
            <div className="p-4 border-t border-slate-800/60 text-left space-y-4 bg-slate-950/80">
              <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                Ferramenta exclusiva de desenvolvimento/suporte para gerar chaves de licença válidas offline para o ID de hardware detetado.
              </p>

              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[9px] text-slate-500 uppercase tracking-widest font-mono block">Período de Validade:</label>
                  <select
                    value={genAnos}
                    onChange={(e) => setGenAnos(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="1">1 Ano (Renovável)</option>
                    <option value="2">2 Anos (Renovável)</option>
                    <option value="3">3 Anos (Renovável)</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerateKey}
                  className="px-4 py-2 bg-slate-900 border border-slate-750 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono"
                >
                  Gerar Chave
                </button>
              </div>

              {chaveGerada && (
                <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-mono">Chave de Licença Matemática:</span>
                    <span className="text-emerald-400 font-mono font-black text-sm tracking-wider">{chaveGerada}</span>
                  </div>
                  <button
                    onClick={handleCopyGenerated}
                    className="px-2.5 py-1 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer font-mono"
                  >
                    {copiado ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-[10px] text-slate-600 font-mono font-bold" id="sigep-lock-footer-code">
          CÓDIGO DO COMPUTADOR: {idPC}
          <br />
          SIGEP-Academic © Angola Curriculum Standards Integration
        </div>
      </div>

    </div>
  );
}
