import React, { useState } from 'react';
import { useSchoolSettings, ANGOLAN_SUBSYSTEMS, AngolanSubsystemType } from '../context/SchoolSettingsContext';
import { 
  Building, 
  Settings, 
  BookOpen, 
  CheckCircle, 
  AlertTriangle, 
  Layers, 
  GraduationCap, 
  Award,
  Info,
  Sliders,
  HelpCircle
} from 'lucide-react';

interface ConfiguracaoSubsistemaProps {
  userRole: string;
}

export const ConfiguracaoSubsistema: React.FC<ConfiguracaoSubsistemaProps> = ({ userRole }) => {
  const { 
    schoolSettings, 
    activeSubsystem, 
    updateSubsystem, 
    subsystemInfo 
  } = useSchoolSettings();

  const [selectedType, setSelectedType] = useState<AngolanSubsystemType>(activeSubsystem);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Apenas Administrador/Director Geral tem permissão legal de alteração
  const isAuthorized = userRole === 'SUB_DIRECTOR_PEDAGOGICO';

  const handleSubsystemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value as AngolanSubsystemType);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      alert("Acesso Negado: Apenas o Director Geral ou Administrador possui privilégios para redefinir o Subsistema Legal da instituição.");
      return;
    }

    if (selectedType === activeSubsystem) {
      setSuccessMessage("O subsistema já está configurado de forma estanque para esta opção.");
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmUpdate = () => {
    updateSubsystem(selectedType);
    setShowConfirmModal(false);
    setSuccessMessage(`Instituição reconfigurada com sucesso para: ${ANGOLAN_SUBSYSTEMS[selectedType].nomeOficial}`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const cancelUpdate = () => {
    setSelectedType(activeSubsystem);
    setShowConfirmModal(false);
  };

  const currentPreview = ANGOLAN_SUBSYSTEMS[selectedType];

  return (
    <div id="config-subsistema-container" className="space-y-6">
      
      {/* Mensagem de Feedback de Operação */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 flex items-center gap-3 text-xs font-black shadow-xs animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Bloco de Informação de Segurança / Regra de Diretor */}
      {!isAuthorized && (
        <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-xl p-4 flex items-start gap-3 text-xs shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold uppercase tracking-wider block mb-0.5">Segurança Institucional Recomenda</span>
            <p className="font-semibold text-slate-600 leading-normal">
              O seu utilizador atual está logado com perfil restrito. A alteração da tipologia oficial e dos blocos curriculares é uma competência legal exclusiva da Direção Geral do Complexo Escolar de acordo com as diretivas do Ministério da Educação (MED) de Angola.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Painel Esquerdo: Formulário de Seleção */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <span className="bg-indigo-100 text-indigo-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                Configuração Estrutural
              </span>
              <h3 className="text-sm font-black text-slate-850 uppercase tracking-wide mt-2">
                Tipologia da Escola
              </h3>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1">
                Defina a tipologia legal que rege a sua escola. O ecossistema adaptará de imediato todas as grelhas curriculares, matrículas e pautas.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">
                  Subsistema Oficial do MED
                </label>
                <select
                  value={selectedType}
                  onChange={handleSubsystemChange}
                  disabled={!isAuthorized}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-3 text-xs font-extrabold focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-inner"
                >
                  <option value="PRIMARIO_I_CICLO">
                    🏫 Ensino Primário e Iº Ciclo
                  </option>
                  <option value="SECUNDARIO_GERAL">
                    🎓 Ensino Secundário Geral (Liceu)
                  </option>
                  <option value="SECUNDARIO_PEDAGOGICO">
                    📚 Ensino Secundário Pedagógico (Magistério)
                  </option>
                </select>
              </div>

              {isAuthorized && (
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Aplicar Subsistema</span>
                </button>
              )}
            </form>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6 text-[10.5px] text-slate-450 leading-relaxed font-semibold">
            <span className="font-extrabold block text-slate-600 uppercase text-[9px] tracking-wider mb-0.5">Estanquicidade de Dados</span>
            As restantes classes e especialidades dos outros subsistemas serão imediatamente ocultadas do sistema para manter uma interface focada, sem misturar pautas e históricos de alunos.
          </div>
        </div>

        {/* Painel Direito: Pré-visualização da Estrutura Curricular e Escolar que será Ativada */}
        <div className="lg:col-span-2 bg-slate-50 rounded-2xl border border-slate-250/70 p-6 shadow-2xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Building className="w-5 h-5 text-indigo-650" />
              <div>
                <h4 className="text-xs font-black text-slate-850 uppercase tracking-wider">
                  Mapeamento Curricular Oficial Ativo no Bloco Selecionado
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Visualização em tempo real de classes, especialidades e regulação do Ministério.
                </p>
              </div>
            </div>

            {/* Descrição do Subsistema */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                {currentPreview.abreviatura}
              </span>
              <h5 className="text-xs font-black text-slate-900 leading-snug">
                {currentPreview.nomeOficial}
              </h5>
              <div className="text-[10.5px] text-slate-550 leading-relaxed font-semibold flex items-start gap-1.5 pt-1.5 border-t border-slate-100">
                <Info className="w-4 h-4 text-indigo-650 shrink-0" />
                <div>
                  <strong className="text-slate-800">Regulamentação Legal: </strong>
                  {currentPreview.leiBaseRegulamentoPadrao} • {currentPreview.decretoPadrao}
                </div>
              </div>
            </div>

            {/* Ciclos de Formação e Classes Correspondentes */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">
                Estrutura de Classes e Ciclos Letivos
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentPreview.ciclos.map((ciclo) => (
                  <div key={ciclo.id} className="bg-white border border-slate-200/70 rounded-xl p-3.5 space-y-2">
                    <span className="text-[10px] font-black text-indigo-650 uppercase tracking-wide flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{ciclo.nome}</span>
                    </span>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {ciclo.classes.map((classe) => (
                        <span 
                          key={classe} 
                          className="bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-extrabold px-2.5 py-1 rounded-md"
                        >
                          {classe === '13' ? '13ª Classe (Estágio)' : `${classe}ª Classe`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Especialidades do Subsistema Escolhido */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">
                Especialidades e Cursos Permitidos ({currentPreview.especialidadesOficiais.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentPreview.especialidadesOficiais.map((esp) => (
                  <span 
                    key={esp} 
                    className="bg-indigo-50 border border-indigo-150 text-indigo-900 text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-3xs"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-650" />
                    <span>{esp}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Rodapé informativo de impacto */}
          <div className="bg-indigo-50/60 border border-indigo-150 rounded-xl p-3 text-[10.5px] text-indigo-900 leading-normal font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-750 shrink-0" />
            <span>Este painel garante conformidade regulamentar integral com os Estatutos Escolares do MED de Angola.</span>
          </div>

        </div>

      </div>

      {/* MODAL DE CONFIRMAÇÃO DA ATUALIZAÇÃO ESTRUTURAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-250 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-scaleUp">
            
            <div className="flex items-center gap-3.5 text-amber-650 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Aviso de Reconfiguração Estrutural
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">Reajuste legal das permissões e pautas.</p>
              </div>
            </div>

            <div className="text-xs text-slate-650 leading-relaxed font-medium space-y-3">
              <p>
                Está prestes a mudar a tipologia estrutural da sua instituição escolar para o subsistema:
                <strong className="text-indigo-900 block mt-1 uppercase text-xs font-black bg-indigo-50 border border-indigo-150 p-2.5 rounded-lg">
                  {currentPreview.nomeOficial}
                </strong>
              </p>
              <p>
                Esta alteração reajustará de imediato TODO o ecossistema do SIGEP-Academic:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 font-semibold text-slate-700">
                <li>
                  <strong className="text-rose-600">Ocultação Completa:</strong> Serão imediatamente ocultadas do painel todas as classes, pautas, mini-pautas e pautas gerais pertencentes aos outros dois subsistemas de ensino.
                </li>
                <li>
                  <strong className="text-slate-900">Isolamento e Estanquicidade:</strong> Serão mantidas apenas as classes correspondentes ao bloco escolhido para manter o histórico, matrículas e turmas estanques e sem conflitos.
                </li>
                <li>
                  <strong className="text-slate-900">Legislação Oficial:</strong> O modelo legal de cabeçalho e decreto regulamentar será atualizado para o padrão do Ministério correspondente a este bloco de ensino.
                </li>
              </ul>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-slate-100 justify-end">
              <button
                type="button"
                onClick={confirmUpdate}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-750 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
              >
                Confirmar Reestruturação
              </button>
              <button
                type="button"
                onClick={cancelUpdate}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
