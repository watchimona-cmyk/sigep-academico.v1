import React, { createContext, useContext, useState, useEffect } from 'react';
import { SchoolSettings, ModalityType } from '../types';

// Definindo os tipos dos Subsistemas de Ensino Oficiais do Ministério da Educação de Angola (MED)
export type AngolanSubsystemType = 'PRIMARIO_I_CICLO' | 'SECUNDARIO_GERAL' | 'SECUNDARIO_PEDAGOGICO';

export interface CicloFormacao {
  id: string;
  nome: string;
  classes: string[];
}

export interface SubsystemMeta {
  id: AngolanSubsystemType;
  nomeOficial: string;
  abreviatura: string;
  classes: string[];
  ciclos: CicloFormacao[];
  especialidadesOficiais: string[];
  modalityMap: ModalityType;
  decretoPadrao: string;
  leiBaseRegulamentoPadrao: string;
}

// Matriz Oficial dos Subsistemas de Angola (Nomenclatura oficial e legal)
export const ANGOLAN_SUBSYSTEMS: Record<AngolanSubsystemType, SubsystemMeta> = {
  PRIMARIO_I_CICLO: {
    id: 'PRIMARIO_I_CICLO',
    nomeOficial: 'ENSINO PRIMÁRIO E Iº CICLO DO ENSINO SECUNDÁRIO',
    abreviatura: 'Ensino Primário & Iº Ciclo',
    classes: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    ciclos: [
      { id: 'CICLO1_PRIM', nome: 'Primeiro Ciclo de Formação (1ª à 4ª Classe)', classes: ['1', '2', '3', '4'] },
      { id: 'CICLO2_PRIM', nome: 'Segundo Ciclo de Formação (5ª e 6ª Classe)', classes: ['5', '6'] },
      { id: 'CICLO1_SEC', nome: 'I° Ciclo do Ensino Secundário (7ª à 9ª Classe)', classes: ['7', '8', '9'] }
    ],
    especialidadesOficiais: ['Ensino Geral Unificado'],
    modalityMap: 'ENSINO_PRIMARIO',
    decretoPadrao: 'Decreto Executivo nº 445/16 de 25 de Novembro',
    leiBaseRegulamentoPadrao: 'Artigo 109º da Lei de Bases do Sistema de Educação e Ensino (Lei nº 17/16, de 7 de Outubro)'
  },
  SECUNDARIO_GERAL: {
    id: 'SECUNDARIO_GERAL',
    nomeOficial: 'IIº CICLO DO ENSINO SECUNDÁRIO GERAL (LICEU)',
    abreviatura: 'Ensino Secundário Geral (PUNIV)',
    classes: ['10', '11', '12'],
    ciclos: [
      { id: 'SEC_UNIFICADO', nome: 'Ensino Secundário Geral Unificado (10ª à 12ª Classe)', classes: ['10', '11', '12'] }
    ],
    especialidadesOficiais: [
      'Ciências Físicas e Biológicas (CFB)',
      'Ciências Económico-Jurídicas (CEJ)',
      'Ciências Sociais e Humanas (CSH)'
    ],
    modalityMap: 'PUNIV',
    decretoPadrao: 'Regulamento Geral das Escolas do IIº Ciclo do Ensino Secundário Geral',
    leiBaseRegulamentoPadrao: 'disposto na alínea b) do Artigo 109º da LBEE 17/16, de 7 de Outubro'
  },
  SECUNDARIO_PEDAGOGICO: {
    id: 'SECUNDARIO_PEDAGOGICO',
    nomeOficial: 'IIº CICLO DO ENSINO SECUNDÁRIO PEDAGÓGICO (MAGISTÉRIO)',
    abreviatura: 'Ensino Secundário Pedagógico (Magistério)',
    classes: ['10', '11', '12', '13'],
    ciclos: [
      { id: 'FORMACAO_PROF', nome: 'Formação de Professores - Curso de Pedagogia (10ª à 13ª Classe)', classes: ['10', '11', '12', '13'] }
    ],
    especialidadesOficiais: [
      'Português e EMC',
      'Matemática e Física',
      'Biologia e Química',
      'História e Geografia',
      'Ensino Primário',
      'Inglês e EMC',
      'Francês e EMC',
      'Educação Visual e Plástica (EVP)',
      'Educação Física (Ed.F)',
      'Pré-Escolar'
    ],
    modalityMap: 'MAGISTERIO',
    decretoPadrao: 'Decreto Executivo de Criação e Estatuto Orgânico das Escolas de Formação de Professores',
    leiBaseRegulamentoPadrao: 'Estatuto das Escolas do IIº Ciclo do Ensino Secundário Técnico-Profissional e Pedagógico'
  }
};

interface SchoolSettingsContextType {
  schoolSettings: SchoolSettings;
  activeSubsystem: AngolanSubsystemType;
  subsystemInfo: SubsystemMeta;
  updateSubsystem: (subsystemId: AngolanSubsystemType) => void;
  updateSchoolSettings: (settings: SchoolSettings) => void;
  isClassAllowed: (className: string) => boolean;
  isSpecialtyAllowed: (specialtyName: string) => boolean;
  isModalityAllowed: (mod: ModalityType) => boolean;
  getAvailableClasses: () => string[];
  getAvailableSpecialties: () => string[];
}

const SchoolSettingsContext = createContext<SchoolSettingsContextType | undefined>(undefined);

export const SchoolSettingsProvider: React.FC<{
  children: React.ReactNode;
  initialSettings: SchoolSettings;
  onSaveSettings: (settings: SchoolSettings) => void;
}> = ({ children, initialSettings, onSaveSettings }) => {
  const [settings, setSettings] = useState<SchoolSettings>(initialSettings);

  // Sincronizar o estado local quando as configurações iniciais mudam no App.tsx
  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  // Detetar o subsistema oficial ativo. Por padrão, se não definido, inferir com base no activeComponents
  const getSubsystemFromSettings = (s: SchoolSettings): AngolanSubsystemType => {
    if (s.officialSubsystem) {
      return s.officialSubsystem;
    }
    // Inferir fallback amigável
    if (s.activeComponents?.MAGISTERIO) return 'SECUNDARIO_PEDAGOGICO';
    if (s.activeComponents?.PUNIV) return 'SECUNDARIO_GERAL';
    return 'PRIMARIO_I_CICLO';
  };

  const activeSubsystem = getSubsystemFromSettings(settings);
  const subsystemInfo = ANGOLAN_SUBSYSTEMS[activeSubsystem];

  // Atualização estanque do subsistema de ensino oficial
  const updateSubsystem = (subsystemId: AngolanSubsystemType) => {
    const meta = ANGOLAN_SUBSYSTEMS[subsystemId];
    
    // Comportamento Condicional Restrito:
    // O ecossistema adapta-se e oculta completamente as opções dos restantes subsistemas.
    // Ativamos apenas o componente mapeado para o subsistema escolhido e desativamos os restantes.
    const updatedComponents = {
      ENSINO_PRIMARIO: subsystemId === 'PRIMARIO_I_CICLO',
      PUNIV: subsystemId === 'SECUNDARIO_GERAL',
      MAGISTERIO: subsystemId === 'SECUNDARIO_PEDAGOGICO'
    };

    const updatedSettings: SchoolSettings = {
      ...settings,
      officialSubsystem: subsystemId,
      activeComponents: updatedComponents,
      // Adaptar legislação padrão se não houver customização manual profunda
      decretoExecutivo: meta.decretoPadrao,
      leiBaseRegulamento: meta.leiBaseRegulamentoPadrao
    };

    setSettings(updatedSettings);
    onSaveSettings(updatedSettings);

    // Ajustar modalidade do sistema no localStorage para garantir transição imediata do ecossistema
    localStorage.setItem('sigep_active_modality_v1', meta.modalityMap);
    // Disparar evento para forçar recarga no App.tsx se necessário
    window.dispatchEvent(new Event('storage'));
  };

  const updateSchoolSettings = (newSettings: SchoolSettings) => {
    setSettings(newSettings);
    onSaveSettings(newSettings);
  };

  // Helper filters para garantir conformidade e estanquicidade absoluta
  const isClassAllowed = (className: string) => {
    return subsystemInfo.classes.includes(className);
  };

  const isSpecialtyAllowed = (specialtyName: string) => {
    // Se for primário, apenas "Ensino Geral" ou similar é permitido.
    if (activeSubsystem === 'PRIMARIO_I_CICLO') return true;
    return subsystemInfo.especialidadesOficiais.includes(specialtyName) || 
           subsystemInfo.especialidadesOficiais.some(esp => specialtyName.toLowerCase().includes(esp.toLowerCase()));
  };

  const isModalityAllowed = (mod: ModalityType) => {
    return subsystemInfo.modalityMap === mod;
  };

  const getAvailableClasses = () => subsystemInfo.classes;
  const getAvailableSpecialties = () => subsystemInfo.especialidadesOficiais;

  return (
    <SchoolSettingsContext.Provider
      value={{
        schoolSettings: settings,
        activeSubsystem,
        subsystemInfo,
        updateSubsystem,
        updateSchoolSettings,
        isClassAllowed,
        isSpecialtyAllowed,
        isModalityAllowed,
        getAvailableClasses,
        getAvailableSpecialties
      }}
    >
      {children}
    </SchoolSettingsContext.Provider>
  );
};

export const useSchoolSettings = (): SchoolSettingsContextType => {
  const context = useContext(SchoolSettingsContext);
  if (context === undefined) {
    throw new Error('useSchoolSettings deve ser utilizado dentro de um SchoolSettingsProvider');
  }
  return context;
};
