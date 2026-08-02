import React from 'react';
import { ShieldCheck, ShieldAlert, Key } from 'lucide-react';

interface LicencaBannerProps {
  diasRestantes: number;
}

export default function LicencaBannerStatus({ diasRestantes }: LicencaBannerProps) {
  let texto = "";
  let corTexto = ""; 
  let Icone = ShieldCheck;

  // Lógica União de Estados e Estilos para Fundo Preto (Tradução VBA)
  if (diasRestantes > 30) {
    texto = `Licença ativa • ${diasRestantes} dias restantes`;
    corTexto = "text-[#7FFF00]"; // Verde Alface Luminoso
    Icone = ShieldCheck;
  } else if (diasRestantes >= 11 && diasRestantes <= 30) {
    texto = `Aviso: A licença expira em ${diasRestantes} dias`;
    corTexto = "text-[#FFA500]"; // Laranja Puro
    Icone = ShieldAlert;
  } else if (diasRestantes >= 1 && diasRestantes <= 10) {
    texto = `Atenção: A licença expira em ${diasRestantes} dias!`;
    corTexto = "text-[#FF4500]"; // Vermelho Coral
    Icone = ShieldAlert;
  } else if (diasRestantes === 0) {
    texto = "Urgente: A licença expira hoje!";
    corTexto = "text-[#FF4500] animate-pulse";
    Icone = Key;
  } else {
    texto = "Licença expirada! Contacte o fornecedor para renovação.";
    corTexto = "text-[#FF4500] font-extrabold animate-pulse";
    Icone = Key;
  }

  return (
    <div className="bg-slate-950 px-4 py-2 border border-slate-800 rounded-xl flex items-center gap-2 shadow-inner">
      <Icone className={`w-4 h-4 ${corTexto} shrink-0`} />
      <span className={`text-xs font-mono font-bold uppercase tracking-wide ${corTexto}`}>
        {texto}
      </span>
    </div>
  );
}
