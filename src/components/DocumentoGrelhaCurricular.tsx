import React from 'react';

export interface CurriculumSpecialty {
  id: string;
  nome: string;
  ativa: boolean;
  classes: {
    "10": { geral: string[]; educacional: string[] };
    "11": { geral: string[]; educacional: string[] };
    "12": { geral: string[]; educacional: string[] };
    "13"?: { estagio: string[]; geral: string[]; educacional: string[] };
  };
}

interface Props {
  especialidade: CurriculumSpecialty;
  nomeEscola?: string;
  subtitulo?: string;
  cargo1?: string;
  cargo2?: string;
}

const DocumentoGrelhaCurricular: React.FC<Props> = ({ 
  especialidade,
  nomeEscola = "Complexo Escolar Nº 1709 LNO, Watchi-Mona",
  subtitulo = "Documento de Referência do Plano de Estudos",
  cargo1 = "O Subdirector Pedagógico",
  cargo2 = "O Diretor Geral"
}) => {
  const { nome, classes } = especialidade;

  const renderDisciplinas = (lista: string[] | undefined) => {
    if (!lista || lista.length === 0) return <p className="text-xs text-slate-400 italic">Nenhuma disciplina configurada</p>;
    return (
      <ul className="list-disc list-inside text-xs text-slate-700 space-y-0.5">
        {lista.map((d, i) => <li key={i} className="font-medium">{d}</li>)}
      </ul>
    );
  };

  return (
    <div id="documento-grelha-curricular" className="p-8 bg-white border border-slate-200 shadow-lg rounded-2xl max-w-4xl mx-auto print:shadow-none print:border-none space-y-6">
      {/* Cabeçalho Formal */}
      <header className="text-center border-b-2 border-slate-900 pb-5">
        <h1 className="font-extrabold text-lg uppercase text-slate-900 tracking-wide">{nomeEscola}</h1>
        <h2 className="font-black text-indigo-950 text-base uppercase mt-1">GRELHA CURRICULAR - {nome}</h2>
        <p className="text-xs text-slate-500 mt-1 italic font-medium">{subtitulo}</p>
      </header>

      {/* Grid de Classes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[10, 11, 12, 13].map((ano) => {
          const classKey = String(ano) as "10" | "11" | "12" | "13";
          const classData = classes[classKey];
          
          if (ano === 13 && !especialidade.ativa) {
            return null; // Don't show 13 if inactive or not applicable
          }

          return (
            <section key={ano} className="border border-slate-200 p-4 rounded-xl bg-slate-50/60 shadow-2xs hover:shadow-xs transition-shadow">
              <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-200 pb-2 mb-3 uppercase flex items-center justify-between">
                <span>{ano}ª Classe</span>
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-150">
                  {ano === 13 ? 'Estágio' : 'Tronco Comum'}
                </span>
              </h3>
              
              <div className="space-y-3.5">
                {ano !== 13 ? (
                  <>
                    <div>
                      <h4 className="font-black text-[10px] text-blue-800 uppercase tracking-wider mb-1.5">Formação Geral</h4>
                      {renderDisciplinas(classData?.geral)}
                    </div>

                    <div>
                      <h4 className="font-black text-[10px] text-emerald-800 uppercase tracking-wider mb-1.5">Formação Educacional</h4>
                      {renderDisciplinas(classData?.educacional)}
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <h4 className="font-black text-[10px] text-indigo-800 uppercase tracking-wider mb-1">Componentes do Estágio Pedagógico</h4>
                      <div className="p-3 bg-indigo-50 border-l-4 border-indigo-600 rounded-r-lg">
                        <p className="text-xs font-bold text-indigo-950 uppercase">NEC - Notas de Estágio Curricular</p>
                        <p className="text-xs font-bold text-indigo-950 uppercase mt-1">PAP - Prova de Aptidão Profissional</p>
                      </div>
                    </div>
                    {classData?.geral && classData.geral.length > 0 && (
                      <div>
                        <h4 className="font-black text-[10px] text-blue-800 uppercase tracking-wider mb-1">Formação Geral</h4>
                        {renderDisciplinas(classData.geral)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Footer de Assinatura */}
      <footer className="mt-10 flex justify-between pt-8 border-t border-slate-100 font-sans">
        <div className="text-center w-52 space-y-8">
          <div className="border-t border-slate-400 pt-2 text-[11px] font-black text-slate-700">
            {cargo1}
          </div>
        </div>
        <div className="text-center w-52 space-y-8">
          <div className="border-t border-slate-400 pt-2 text-[11px] font-black text-slate-700">
            {cargo2}
          </div>
        </div>
      </footer>

      {/* Institutional Contact Footer */}
      <div className="mt-8 pt-3 border-t border-slate-300 text-center font-sans text-[9px] text-slate-600 space-y-0.5">
        <p className="font-bold text-slate-800 uppercase tracking-wider">{nomeEscola}</p>
        <div className="flex items-center justify-center gap-2 text-slate-600 flex-wrap text-[8.5px]">
          <span><strong className="text-slate-700">Contacto:</strong> +244 923 000 000</span>
          <span>•</span>
          <span><strong className="text-slate-700">Endereço:</strong> Cafunfo, Lunda Norte - Angola</span>
          <span>•</span>
          <span><strong className="text-slate-700">E-mail:</strong> contacto@escola.ao</span>
        </div>
      </div>
    </div>
  );
};

export default DocumentoGrelhaCurricular;
