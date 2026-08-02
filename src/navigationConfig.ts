/**
 * SIGEP Navigation Configuration File (Versão 29/06/2026)
 * Centralized file for managing sidebars, menus, submenus and authorization scopes.
 */

export interface MenuItemConfig {
  id: string;
  label: string;
  iconName: 'User' | 'Users' | 'CheckSquare' | 'FileSpreadsheet' | 'Award' | 'DollarSign' | 'TrendingUp' | 'Database' | 'Settings' | 'MessageSquare' | 'GraduationCap' | 'Printer';
  rolesAllowed?: string[]; // Empty/undefined means all roles can access
  targetTab?: string;
}

export const NAVIGATION_CONFIG: MenuItemConfig[] = [
  {
    id: 'HOME',
    label: 'HOME',
    iconName: 'TrendingUp',
    rolesAllowed: ['SIGEP', 'DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'TECNICO_PEDAGOGICO'],
    targetTab: 'HOME'
  },
  {
    id: 'AREA_ACADEMICA',
    label: 'ÁREA ACADÉMICA',
    iconName: 'GraduationCap',
    rolesAllowed: ['SIGEP', 'DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'TECNICO_PEDAGOGICO'],
    targetTab: 'AREA_ACADEMICA'
  },
  {
    id: 'RH',
    label: 'RH',
    iconName: 'Users',
    rolesAllowed: ['SIGEP', 'DIRECTOR_GERAL', 'SUB_DIRECTOR_ADMINISTRATIVO', 'TECNICO_ADMINISTRATIVO'],
    targetTab: 'RECURSOS_HUMANOS'
  },
  {
    id: 'MINI_PAUTAS',
    label: 'MINI PAUTAS',
    iconName: 'CheckSquare',
    rolesAllowed: ['SIGEP', 'DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'PROFESSOR', 'TECNICO_PEDAGOGICO'],
    targetTab: 'PAINEL_MINI_PAUTAS'
  },
  {
    id: 'PAUTAS',
    label: 'PAUTAS',
    iconName: 'FileSpreadsheet',
    rolesAllowed: ['SIGEP', 'DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'TECNICO_PEDAGOGICO'],
    targetTab: 'PAINEL_PAUTAS'
  },
  {
    id: 'RELACAO_NOMINAL_MENU',
    label: 'RELAÇÃO NOMINAL',
    iconName: 'Printer',
    rolesAllowed: ['SIGEP', 'DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'TECNICO_PEDAGOGICO'],
    targetTab: 'RELACAO_NOMINAL'
  },
  {
    id: 'DOCUMENTOS',
    label: 'DOCUMENTOS',
    iconName: 'Award',
    rolesAllowed: ['SIGEP', 'DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'TECNICO_PEDAGOGICO'],
    targetTab: 'DECLARACOES_CERTIFICADOS'
  },
  {
    id: 'FINANCAS',
    label: 'FINANÇAS',
    iconName: 'DollarSign',
    rolesAllowed: ['SIGEP', 'DIRECTOR_GERAL', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'TECNICO_ADMINISTRATIVO'],
    targetTab: 'FINANCEIRO'
  },
  {
    id: 'RELATORIO',
    label: 'RELATÓRIO',
    iconName: 'TrendingUp',
    rolesAllowed: ['SIGEP', 'DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO'],
    targetTab: 'RELATORIOS'
  },
  {
    id: 'BANCO_DE_DADOS',
    label: 'BANCO DE DADOS',
    iconName: 'Database',
    rolesAllowed: ['SIGEP', 'DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO'],
    targetTab: 'MINI_PAUTA1_BANCODADOS'
  },
  {
    id: 'COMUNICACAO',
    label: 'CHAT DO STAFF',
    iconName: 'MessageSquare',
    rolesAllowed: ['SIGEP', 'DIRECTOR_GERAL', 'SUB_DIRECTOR_PEDAGOGICO', 'SUB_DIRECTOR_ADMINISTRATIVO', 'CHEFE_SECRETARIA', 'TECNICO_PEDAGOGICO', 'TECNICO_ADMINISTRATIVO', 'PROFESSOR', 'COORDENADOR_TURNO', 'COORDENADOR_DISCIPLINA'],
    targetTab: 'COMUNICACAO'
  },
  {
    id: 'CONFIGURACOES',
    label: 'CONFIGURAÇÕES',
    iconName: 'Settings',
    rolesAllowed: ['SIGEP', 'DIRECTOR_GERAL'],
    targetTab: 'CABECALHO'
  }
];
