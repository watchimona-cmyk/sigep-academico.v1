import React from 'react';

export const AngolaCoatOfArms: React.FC<{ className?: string }> = ({ className = "w-12 h-12 mx-auto" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 120 120" 
    className={className}
    aria-label="Brasão da República de Angola"
  >
    {/* Fundo do Sol Nascente */}
    <circle cx="60" cy="60" r="50" fill="#FFCC00" />
    <circle cx="60" cy="60" r="42" fill="#E60000" />
    <path d="M 15,65 Q 60,15 105,65 Z" fill="#FFCC00" opacity="0.8" />
    
    {/* Ramos e Roda Dentada */}
    <circle cx="60" cy="60" r="28" fill="none" stroke="#222222" strokeWidth="4" strokeDasharray="6,3" />
    
    {/* Livro Aberto */}
    <path d="M 40,72 Q 60,78 80,72 L 80,82 Q 60,88 40,82 Z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.5" />
    <line x1="60" y1="75" x2="60" y2="85" stroke="#1E293B" strokeWidth="1.5" />

    {/* Catana e Enxada Cruzadas */}
    <line x1="38" y1="38" x2="82" y2="78" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
    <path d="M 38,78 L 82,38" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />

    {/* Estrela Amarela de 5 Pontas */}
    <polygon points="60,20 63,29 72,29 65,35 67,44 60,39 53,44 55,35 48,29 57,29" fill="#FFCC00" stroke="#B45309" strokeWidth="0.5" />

    {/* Faixa Inferior Amarela */}
    <path d="M 20,88 Q 60,105 100,88 L 97,97 Q 60,114 23,97 Z" fill="#FFCC00" stroke="#B45309" strokeWidth="1" />
    <text x="60" y="96" fontStyle="normal" fontWeight="bold" fontSize="6.5" fill="#C2410C" textAnchor="middle" fontFamily="sans-serif">
      REPÚBLICA DE ANGOLA
    </text>
  </svg>
);
