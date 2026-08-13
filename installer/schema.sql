-- =========================================================================
-- SIGEP-Acadêmico - Schema de Inicialização de Banco de Dados PostgreSQL
-- Versão 1.1.0 Enterprise Zero-Config
-- =========================================================================

-- Criar extensão se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Alunos / Matrículas
CREATE TABLE IF NOT EXISTS alunos (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  class VARCHAR(20) NOT NULL,
  section VARCHAR(20) NOT NULL,
  gender VARCHAR(10),
  enrollment_date TEXT,
  father_name TEXT,
  mother_name TEXT,
  bi TEXT,
  bi_sector TEXT,
  bi_date TEXT,
  doc_type VARCHAR(20) DEFAULT 'BI',
  cedula_registo TEXT,
  cedula_fls TEXT,
  cedula_livro TEXT,
  cedula_ano TEXT,
  periodo TEXT,
  specialty TEXT,
  status VARCHAR(20) DEFAULT 'Ativo',
  contact TEXT,
  birth_date TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Lançamento de Notas / Pautas
CREATE TABLE IF NOT EXISTS notas (
  student_id VARCHAR(50) NOT NULL,
  student_name TEXT NOT NULL,
  subject VARCHAR(100) NOT NULL,
  trimester VARCHAR(10) NOT NULL,
  mac NUMERIC(5,2),
  npp NUMERIC(5,2),
  npt NUMERIC(5,2),
  mt NUMERIC(5,2),
  PRIMARY KEY (student_id, subject, trimester)
);

-- 3. Tabela de Funcionários e Recursos Humanos
CREATE TABLE IF NOT EXISTS funcionarios (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  role VARCHAR(50) NOT NULL,
  subject VARCHAR(100),
  contact TEXT,
  status VARCHAR(50) DEFAULT 'Activo',
  password TEXT NOT NULL,
  is_root BOOLEAN DEFAULT FALSE,
  is_editable BOOLEAN DEFAULT TRUE,
  senha_expirada BOOLEAN DEFAULT FALSE,
  password_expired BOOLEAN DEFAULT FALSE,
  assignments TEXT,
  classes TEXT,
  sections TEXT,
  subjects TEXT,
  specialty TEXT,
  sigep_access_allowed BOOLEAN DEFAULT TRUE,
  sigep_absence_access_only BOOLEAN DEFAULT FALSE,
  extra_fields TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Propinas e Gestão Financeira
CREATE TABLE IF NOT EXISTS propinas (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  class VARCHAR(20),
  section VARCHAR(20),
  periodo TEXT,
  modalidade VARCHAR(50),
  desconto TEXT,
  meses_pagos TEXT,
  historico_pagamentos TEXT,
  status VARCHAR(20) DEFAULT 'Regular',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de Configurações Institucionais da Escola
CREATE TABLE IF NOT EXISTS escola_config (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'MAIN',
  school_name TEXT,
  director_name TEXT,
  pedagogic_subdirector_name TEXT,
  administrative_subdirector_name TEXT,
  secretary_chief_name TEXT,
  school_year TEXT,
  province TEXT,
  municipality TEXT,
  district TEXT,
  logo_url TEXT,
  header_title TEXT,
  footer_text TEXT,
  periodos TEXT,
  turmas TEXT,
  specialties TEXT,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela de Ponto e Presença de Funcionários
CREATE TABLE IF NOT EXISTS ponto_presenca (
  id VARCHAR(50) PRIMARY KEY,
  staff_id VARCHAR(50) NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  status VARCHAR(50) NOT NULL,
  status_workflow VARCHAR(50),
  justification_reason TEXT,
  attachment_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir Administrador Raiz por Defeito (watchi_Scool170989-2026)
INSERT INTO funcionarios (id, name, role, password, status, is_root, is_editable, senha_expirada, password_expired)
VALUES ('SIGEP', 'Administrador SIGEP', 'SIGEP', 'watchi_Scool170989-2026', 'Activo', TRUE, FALSE, FALSE, FALSE)
ON CONFLICT (id) DO UPDATE SET 
  is_root = TRUE, 
  is_editable = FALSE, 
  password = 'watchi_Scool170989-2026';

-- Índices de Otimização
CREATE INDEX IF NOT EXISTS idx_alunos_class_section ON alunos(class, section);
CREATE INDEX IF NOT EXISTS idx_notas_student ON notas(student_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_role ON funcionarios(role);
CREATE INDEX IF NOT EXISTS idx_ponto_date ON ponto_presenca(date);
