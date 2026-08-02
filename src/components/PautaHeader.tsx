/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SchoolSettings } from '../types';

interface PautaHeaderProps {
  schoolSettings?: SchoolSettings;
}

const PautaHeader: React.FC<PautaHeaderProps> = ({ schoolSettings }) => {
  return (
    <header className="flex flex-col items-center justify-center p-8 border-b-2 border-black mb-6 bg-white" id="pauta-header-magisterio">
      <div className="text-center space-y-1">
        {schoolSettings?.headerLine1Active !== false && (
          <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900">
            {schoolSettings?.headerLine1 || 'República de Angola'}
          </h1>
        )}
        {schoolSettings?.headerLine2Active !== false && (
          <h2 className="text-lg font-semibold uppercase text-slate-800">
            {schoolSettings?.headerLine2 || 'Ministério da Educação'}
          </h2>
        )}
        <h3 className="text-md font-medium uppercase text-slate-700">
          {schoolSettings?.schoolName || 'Complexo Escolar Watchimona'}
        </h3>
      </div>

      <div className="mt-8 text-center">
        <h1 className="text-3xl font-bold underline uppercase text-slate-950">
          Pauta Final
        </h1>
        <p className="text-sm mt-4 text-slate-600 font-medium">
          Informação Estatística (Formação de Professores)
        </p>
      </div>
    </header>
  );
};

export default PautaHeader;
