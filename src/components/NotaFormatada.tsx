import React from 'react';

interface NotaFormatadaProps {
  valor: number | null | string;
  escala: 10 | 20;
}

export const NotaFormatada: React.FC<NotaFormatadaProps> = ({ valor, escala }) => {
  // Tratamento de campos nulos, vazios ou traços de omissão
  if (valor === null || valor === undefined || valor === '' || valor === '-') {
    return <span className="text-slate-400 font-medium">-</span>;
  }

  const notaNumerica = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;

  if (isNaN(notaNumerica)) {
    return <span className="text-slate-500 font-medium">{valor}</span>;
  }

  // Definição estrita das cores com base na escala
  let isPositive = false;
  if (escala === 10) {
    isPositive = notaNumerica >= 5.0;
  } else if (escala === 20) {
    isPositive = notaNumerica >= 10.0;
  }

  return (
    <span 
      className={`font-bold ${isPositive ? 'text-blue-600' : 'text-red-600'}`}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      {notaNumerica.toFixed(1)}
    </span>
  );
};

export default NotaFormatada;
