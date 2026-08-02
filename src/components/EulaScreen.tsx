import React, { useState } from 'react';
import { FileText, ShieldCheck } from 'lucide-react';

interface EulaScreenProps {
  onAccept?: () => void;
  onDecline?: () => void;
  readOnly?: boolean;
  onClose?: () => void;
}

export default function EulaScreen({ onAccept, onDecline, readOnly = false, onClose }: EulaScreenProps) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className={`${readOnly ? '' : 'min-h-screen bg-slate-900'} flex items-center justify-center p-6`} id="sigep-eula-container">
      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-slate-200" id="sigep-eula-card">
        
        {/* Header */}
        <div className="bg-indigo-950 p-6 flex items-center justify-between text-white" id="sigep-eula-header">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-indigo-400" id="sigep-eula-icon" />
            <div>
              <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-wide" id="sigep-eula-title">Termos de Licença de Utilizador Final (EULA)</h1>
              <p className="text-xs text-indigo-200" id="sigep-eula-subtitle">SIGEP - Sistema de Gestão Escolar Profissional</p>
            </div>
          </div>
          {readOnly && onClose && (
            <button 
              id="close-eula-readonly"
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
            >
              <span className="text-xs font-bold font-mono">X</span>
            </button>
          )}
        </div>

        {/* EULA Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 text-xs sm:text-sm text-slate-700 space-y-4 font-medium border-b border-slate-200" id="sigep-eula-body">
          <p><strong>Software:</strong> SIGEP - Sistema de Gestão Escolar Profissional</p>
          <p><strong>Desenvolvedor e Proprietário:</strong> Luís Adelino António</p>
          <p><strong>Empresa:</strong> SIGEP-Group</p>
          <p><strong>Sede:</strong> Cafunfo, Lunda-Norte, República de Angola</p>
          <p><strong>Ano:</strong> 2026</p>
          
          <h3 className="font-bold text-slate-900 mt-4" id="sigep-eula-section-1">1. Concessão de Licença</h3>
          <p>
            Este software (SIGEP) é licenciado, não vendido. A presente licença concede à instituição de ensino o direito não exclusivo e intransferível de instalar e executar o software numa única rede local (Rede LAN), restrita à infraestrutura física da escola contratante, com um Computador Central (Servidor PostgreSQL) e terminais clientes devidamente autorizados.
          </p>
 
          <h3 className="font-bold text-slate-900 mt-4" id="sigep-eula-section-2">2. Restrições e Direitos Autorais</h3>
          <p>
            A titularidade, direitos autorais e propriedade intelectual de todo o código-fonte, interface, arquitetura de dados e algoritmos pertencem exclusivamente a Luís Adelino António e à sua empresa SIGEP-Group. É estritamente proibido:
          </p>
          <ul className="list-disc pl-5 space-y-1 font-semibold text-slate-650" id="sigep-eula-restrictions-list">
            <li>Copiar, distribuir, sublicenciar ou revender o software;</li>
            <li>Realizar engenharia reversa, descompilar, desmontar ou tentar aceder ao código-fonte;</li>
            <li>Burlar ou adulterar o motor de licenciamento offline e o identificador criptográfico do dispositivo;</li>
            <li>Instalar o software fora do ambiente escolar licenciado sem a renovação da chave de ativação oficial.</li>
          </ul>

          <h3 className="font-bold text-slate-900 mt-4" id="sigep-eula-section-3">3. Violação de Termos</h3>
          <p>
            O uso não autorizado, duplicação ou quebra dos protocolos de segurança constitui violação da legislação de Direitos de Autor vigente na República de Angola, sujeitando o infrator às sanções civis e criminais aplicáveis.
          </p>

          <h3 className="font-bold text-slate-900 mt-4" id="sigep-eula-section-12">12. Suporte Técnico e Contactos</h3>
          <p>
            12.2. O contacto para suporte é: <a href="mailto:suport.sigep@outlook.com" className="text-indigo-600 font-bold hover:underline">suport.sigep@outlook.com</a>. A equipa compromete-se a analisar todas as comunicações. Recomendamos que, ao contactar, o utilizador forneça o ID da licença, descrição do problema e capturas de ecrã.
          </p>
        </div>

        {/* Action Footer */}
        <div className="p-6 bg-white space-y-4 text-right" id="sigep-eula-footer">
          {readOnly ? (
            <div className="flex items-center justify-end" id="sigep-eula-actions">
              <button 
                id="sigep-eula-btn-close-readonly"
                onClick={onClose}
                className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md cursor-pointer transition-all"
              >
                <span>Fechar Consulta</span>
              </button>
            </div>
          ) : (
            <>
              <label className="flex items-start gap-3 cursor-pointer group text-left" id="sigep-eula-agree-label">
                <input 
                  id="sigep-eula-checkbox"
                  type="checkbox" 
                  className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                <span className="text-xs text-slate-600 font-semibold group-hover:text-slate-900 transition-colors">
                  Li, compreendi e aceito integralmente os Termos de Licença e Direitos Autorais descritos acima em nome da instituição.
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2" id="sigep-eula-actions">
                <button 
                  id="sigep-eula-btn-decline"
                  onClick={onDecline}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Recusar e Sair
                </button>
                <button 
                  id="sigep-eula-btn-accept"
                  disabled={!accepted}
                  onClick={onAccept}
                  className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-2 transition-all ${
                    accepted 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Aceitar e Continuar</span>
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
