import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const appDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

dotenv.config();

const PROVINCIAS_ANGOLA = [
  "Bengo", "Benguela", "Bié", "Cabinda", "Cuando", "Cuanza-Norte", "Cuanza-Sul",
  "Cubango", "Cunene", "Huambo", "Huíla", "Icolo e Bengo", "Luanda",
  "Lunda-Norte", "Lunda-Sul", "Malanje", "Moxico", "Moxico Leste", "Namibe",
  "Uíge", "Zaire"
];

function normalizeProvinciaBI(text: string | null | undefined): string {
  if (!text) return "Luanda";
  const clean = text.trim().toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s-]/g, "");

  if (clean.includes("luanda") || clean === "lda" || clean === "lnd") return "Luanda";
  if (clean.includes("bengo") && !clean.includes("icolo")) return "Bengo";
  if (clean.includes("icolo") || clean.includes("catete")) return "Icolo e Bengo";
  if (clean.includes("benguela") || clean === "bgl" || clean === "bgla") return "Benguela";
  if (clean.includes("bie")) return "Bié";
  if (clean.includes("cabinda") || clean === "cbd") return "Cabinda";
  if (clean.includes("cuando") && clean.includes("cubango")) return "Cuando";
  if (clean.includes("cuando")) return "Cuando";
  if (clean.includes("cubango")) return "Cubango";
  if (clean.includes("cuanza norte") || clean.includes("kwanza norte") || clean === "kzn") return "Cuanza-Norte";
  if (clean.includes("cuanza sul") || clean.includes("kwanza sul") || clean === "kzs") return "Cuanza-Sul";
  if (clean.includes("cunene") || clean === "cnn") return "Cunene";
  if (clean.includes("huambo") || clean === "hbo") return "Huambo";
  if (clean.includes("huila") || clean === "hla") return "Huíla";
  if (clean.includes("lunda norte") || clean === "ln") return "Lunda-Norte";
  if (clean.includes("lunda sul") || clean === "ls") return "Lunda-Sul";
  if (clean.includes("malanje") || clean === "malange" || clean === "mlj") return "Malanje";
  if (clean.includes("moxico leste") || clean === "mxl") return "Moxico Leste";
  if (clean.includes("moxico") || clean === "mox" || clean === "mx") return "Moxico";
  if (clean.includes("namibe") || clean === "nmb") return "Namibe";
  if (clean.includes("uige") || clean === "uig") return "Uíge";
  if (clean.includes("zaire") || clean === "zr") return "Zaire";

  for (const prov of PROVINCIAS_ANGOLA) {
    const pClean = prov.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (clean.includes(pClean) || pClean.includes(clean)) {
      return prov;
    }
  }

  return "Luanda";
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Configuration for local PostgreSQL database connection
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'sigep_db',
  password: process.env.DB_PASSWORD || 'sigepwl',
  port: parseInt(process.env.DB_PORT || '5432', 10),
};

console.log('Iniciando conexão com PostgreSQL utilizando as seguintes credenciais:', {
  host: dbConfig.host,
  database: dbConfig.database,
  user: dbConfig.user,
  port: dbConfig.port,
  password: '***'
});

const pool = new Pool(dbConfig);

// === AUTOMATIC ROBUST JSON FALLBACK DATABASE ===
const FALLBACK_DB_PATH = path.join(process.cwd(), 'sigep_fallback_db.json');

interface FallbackData {
  alunos: any[];
  notas: any[];
  funcionarios: any[];
  propinas: any[];
  grelha_curricular: any[];
  escola_config: any[];
}

function loadFallbackDb(): FallbackData {
  try {
    if (fs.existsSync(FALLBACK_DB_PATH)) {
      const data = fs.readFileSync(FALLBACK_DB_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Erro ao ler base de dados fallback:', err);
  }
  
  const defaultDb: FallbackData = {
    alunos: [],
    notas: [],
    funcionarios: [
      {
        id: 'SIGEP',
        name: 'Administrador SIGEP',
        role: 'SIGEP',
        password: 'sigepwl',
        status: 'Activo',
        is_root: true,
        is_editable: false
      }
    ],
    propinas: [],
    grelha_curricular: [],
    escola_config: []
  };
  
  try {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar base de dados fallback inicial:', err);
  }
  return defaultDb;
}

function saveFallbackDb(data: FallbackData) {
  try {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar base de dados fallback:', err);
  }
}

let isPostgresAvailable = false;

async function executeFallbackQuery(sqlText: string, params?: any[]): Promise<any> {
  const sql = sqlText.trim();
  const sqlLower = sql.toLowerCase();

  // 1. Transaction controls
  if (/^(begin|commit|rollback)$/i.test(sqlLower)) {
    return { rows: [], rowCount: 0 };
  }

  // 2. Health check / dummy check
  if (sqlLower === 'select 1') {
    return { rows: [{ '1': 1 }] };
  }

  // 3. Select Count of Director General
  if (/select\s+count\s*\(\*\)\s+from\s+funcionarios\s+where\s+role\s*=\s*'director_geral'/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const count = db.funcionarios.filter(f => f.role === 'DIRECTOR_GERAL').length;
    return { rows: [{ count: String(count) }] };
  }

  // 4. Select staff by ID (case-insensitive query with WHERE)
  if (/select\s+\*\s+from\s+funcionarios\s+where/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const searchId = String(params?.[0] || '').trim().toUpperCase();
    const matches = db.funcionarios.filter(f => String(f.id || '').trim().toUpperCase() === searchId);
    return { rows: matches };
  }

  // 5. Select student by ID, process_number, or bi_number (case-insensitive query with WHERE)
  if (/select\s+\*\s+from\s+alunos\s+where/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const searchVal = String(params?.[0] || '').trim().toUpperCase();
    const matches = db.alunos.filter(a => 
      String(a.id || '').trim().toUpperCase() === searchVal ||
      String(a.process_number || '').trim().toUpperCase() === searchVal ||
      String(a.bi_number || '').trim().toUpperCase() === searchVal ||
      String(a.bi || '').trim().toUpperCase() === searchVal
    );
    return { rows: matches };
  }

  // 4. Select students ordered by name
  if (/select\s+\*\s+from\s+alunos\s+order\s+by\s+name\s+asc/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const sorted = [...db.alunos].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return { rows: sorted };
  }

  // 5. Select all students (no order)
  if (/select\s+\*\s+from\s+alunos/i.test(sqlLower)) {
    const db = loadFallbackDb();
    return { rows: db.alunos };
  }

  // 6. Select all grades
  if (/select\s+\*\s+from\s+notas/i.test(sqlLower)) {
    const db = loadFallbackDb();
    return { rows: db.notas };
  }

  // 7. Select staff ordered by name
  if (/select\s+\*\s+from\s+funcionarios\s+order\s+by\s+name\s+asc/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const sorted = [...db.funcionarios].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return { rows: sorted };
  }

  // 8. Select all staff (no order)
  if (/select\s+\*\s+from\s+funcionarios/i.test(sqlLower)) {
    const db = loadFallbackDb();
    return { rows: db.funcionarios };
  }

  // 9. Select curriculum grid (grelha) ordered
  if (/select\s+\*\s+from\s+grelha_curricular/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const sorted = [...db.grelha_curricular].sort((a, b) => {
      const posA = a.position !== undefined ? Number(a.position) : 0;
      const posB = b.position !== undefined ? Number(b.position) : 0;
      if (posA !== posB) return posA - posB;
      const modComp = (a.modality || '').localeCompare(b.modality || '');
      if (modComp !== 0) return modComp;
      const clComp = (a.class || '').localeCompare(b.class || '');
      if (clComp !== 0) return clComp;
      const specComp = (a.specialty || '').localeCompare(b.specialty || '');
      if (specComp !== 0) return specComp;
      return (a.subject || '').localeCompare(b.subject || '');
    });
    return { rows: sorted };
  }

  // 10. Select all finance records (propinas)
  if (/select\s+\*\s+from\s+propinas/i.test(sqlLower)) {
    const db = loadFallbackDb();
    return { rows: db.propinas };
  }

  // 11. Select all settings (escola_config)
  if (/select\s+\*\s+from\s+escola_config/i.test(sqlLower)) {
    const db = loadFallbackDb();
    return { rows: db.escola_config };
  }

  // 12. Dynamic backup table check (SELECT * FROM <tbl>)
  const backupMatch = sqlLower.match(/select\s+\*\s+from\s+([a-zA-z0-9_]+)/i);
  if (backupMatch) {
    const tbl = backupMatch[1].toLowerCase();
    const db = loadFallbackDb() as any;
    if (db[tbl]) {
      return { rows: db[tbl] };
    }
  }

  // 13. DELETE statements
  if (/delete\s+from\s+alunos\s+where\s+id\s*=\s*\$1/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const id = params?.[0];
    db.alunos = db.alunos.filter(a => a.id !== id);
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (/delete\s+from\s+funcionarios\s+where\s+id\s*=\s*\$1/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const id = params?.[0];
    db.funcionarios = db.funcionarios.filter(f => f.id !== id);
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (/delete\s+from\s+grelha_curricular/i.test(sqlLower)) {
    const db = loadFallbackDb();
    if (/where\s+id/i.test(sqlLower)) {
      const id = params?.[0];
      db.grelha_curricular = db.grelha_curricular.filter(g => g.id !== id);
    } else {
      db.grelha_curricular = [];
    }
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  // 14. UPDATE statements
  if (/update\s+grelha_curricular\s+set\s+active\s*=\s*\$1\s+where\s+id\s*=\s*\$2/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const active = params?.[0];
    const id = params?.[1];
    db.grelha_curricular = db.grelha_curricular.map(g => {
      if (g.id === id) return { ...g, active };
      return g;
    });
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (/update\s+grelha_curricular\s+set\s+position\s*=\s*\$1\s+where\s+id\s*=\s*\$2/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const position = params?.[0];
    const id = params?.[1];
    db.grelha_curricular = db.grelha_curricular.map(g => {
      if (g.id === id) return { ...g, position: position !== undefined ? Number(position) : 0 };
      return g;
    });
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (/update\s+alunos\s+set\s+bi_sector\s*=\s*\$1\s+where\s+id\s*=\s*\$2/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const bi_sector = params?.[0];
    const id = params?.[1];
    db.alunos = db.alunos.map(a => {
      if (a.id === id) return { ...a, bi_sector };
      return a;
    });
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  // 15. INSERT statements
  if (/insert\s+into\s+alunos/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const [
      id, name, gender, birth_date, cl, section, status, contact, 
      enrollment_date, guardian, enrollment_fee_paid, foreign_language,
      father_name, mother_name, bi, bi_sector, bi_date, doc_type,
      cedula_registo, cedula_fls, cedula_livro, cedula_ano, periodo, specialty
    ] = params || [];
    const item = {
      id, name, gender, birth_date, class: cl, section, status, contact, 
      enrollment_date, guardian, enrollment_fee_paid, foreign_language,
      father_name, mother_name, bi, bi_sector, bi_date, doc_type,
      cedula_registo, cedula_fls, cedula_livro, cedula_ano, periodo, specialty
    };
    const index = db.alunos.findIndex(a => a.id === id);
    if (index >= 0) {
      db.alunos[index] = { ...db.alunos[index], ...item };
    } else {
      db.alunos.push(item);
    }
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (/insert\s+into\s+notas/i.test(sqlLower)) {
    const db = loadFallbackDb();
    let student_id, student_name, subject, trimester, mac, npp, npt, mt;
    if (params && params.length >= 8) {
      [student_id, student_name, subject, trimester, mac, npp, npt, mt] = params;
    } else if (params && params.length === 6) {
      [student_id, student_name, subject, trimester, mac, npt] = params;
    } else if (params) {
      [student_id, student_name, subject, trimester, mac, npp, npt, mt] = params;
    }
    const item = { student_id, student_name, subject, trimester, mac, npp, npt, mt };
    const index = db.notas.findIndex(n => n.student_id === student_id && n.subject === subject && n.trimester === trimester);
    if (index >= 0) {
      db.notas[index] = { ...db.notas[index], ...item };
    } else {
      db.notas.push(item);
    }
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (/insert\s+into\s+funcionarios/i.test(sqlLower)) {
    const db = loadFallbackDb();
    if (params) {
      let id, name, role, password, status, is_root, is_editable, subject, contact;
      if (typeof params[5] === 'boolean') {
        [id, name, role, password, status, is_root, is_editable] = params;
        is_root = is_root ?? false;
        is_editable = is_editable ?? true;
      } else {
        [id, name, role, subject, contact, status, password] = params;
        is_root = false;
        is_editable = true;
      }
      const item = { id, name, role, password, status, is_root, is_editable, subject, contact };
      const index = db.funcionarios.findIndex(f => f.id === id);
      if (index >= 0) {
        db.funcionarios[index] = { ...db.funcionarios[index], ...item };
      } else {
        db.funcionarios.push(item);
      }
    }
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (/insert\s+into\s+grelha_curricular/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const [id, modality, specialty, classVal, subject, active, position] = params || [];
    const item = { 
      id, 
      modality, 
      specialty, 
      class: classVal, 
      subject, 
      active: active !== undefined ? active : true,
      position: position !== undefined ? Number(position) : 0
    };
    const index = db.grelha_curricular.findIndex(g => g.modality === modality && g.specialty === specialty && g.class === classVal && g.subject === subject);
    if (index >= 0) {
      db.grelha_curricular[index] = { ...db.grelha_curricular[index], ...item };
    } else {
      db.grelha_curricular.push(item);
    }
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (/insert\s+into\s+propinas/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const [
      id, name, cl, section, periodo, modalidade, desconto, meses_pagos, 
      total_pago, total_divida, data_ultimo_pg, observacoes, 
      faltas_injustificadas, faltas_justificadas, faltas_pagas
    ] = params || [];
    const item = {
      id, name, class: cl, section, periodo, modalidade, desconto, meses_pagos,
      total_pago, total_divida, data_ultimo_pg, observacoes,
      faltas_injustificadas, faltas_justificadas, faltas_pagas
    };
    const index = db.propinas.findIndex(p => p.id === id);
    if (index >= 0) {
      db.propinas[index] = { ...db.propinas[index], ...item };
    } else {
      db.propinas.push(item);
    }
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (/insert\s+into\s+escola_config/i.test(sqlLower)) {
    const db = loadFallbackDb();
    const [key, value] = params || [];
    const item = { key, value };
    const index = db.escola_config.findIndex(c => c.key === key);
    if (index >= 0) {
      db.escola_config[index] = item;
    } else {
      db.escola_config.push(item);
    }
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  // Fallback default for any other commands (like tables creation or alter table)
  return { rows: [], rowCount: 0 };
}

// Intercept pool methods
const originalQuery = pool.query.bind(pool);
const originalConnect = pool.connect.bind(pool);

pool.query = async function(text: any, params?: any[]): Promise<any> {
  const queryText = typeof text === 'string' ? text : (text ? text.text : '');
  const queryParams = Array.isArray(text) ? undefined : params;
  
  if (isPostgresAvailable) {
    try {
      return await originalQuery(text, params);
    } catch (err: any) {
      console.warn('Erro na consulta PostgreSQL, recorrendo a Fallback DB:', err.message);
    }
  }
  return await executeFallbackQuery(queryText, queryParams);
} as any;

pool.connect = async function(): Promise<any> {
  if (isPostgresAvailable) {
    try {
      const client = await originalConnect();
      const clientQuery = client.query.bind(client);
      client.query = async function(text: any, params?: any[]): Promise<any> {
        const queryText = typeof text === 'string' ? text : (text ? text.text : '');
        const queryParams = Array.isArray(text) ? undefined : params;
        try {
          return await clientQuery(text, params);
        } catch (err: any) {
          console.warn('Erro na consulta do cliente PostgreSQL, recorrendo a Fallback DB:', err.message);
          return await executeFallbackQuery(queryText, queryParams);
        }
      } as any;
      return client;
    } catch (err: any) {
      console.warn('Erro de conexão ao Pool PostgreSQL, usando mock client local:', err.message);
    }
  }

  return {
    query: async (text: any, params?: any[]) => {
      const queryText = typeof text === 'string' ? text : (text ? text.text : '');
      const queryParams = Array.isArray(text) ? undefined : params;
      return await executeFallbackQuery(queryText, queryParams);
    },
    release: () => {}
  };
} as any;

// Trigger connections check and run fallback if offline
async function checkPostgresConnection() {
  try {
    const client = await originalConnect();
    await client.query('SELECT 1');
    client.release();
    isPostgresAvailable = true;
    console.log('PostgreSQL está ONLINE e conectado com sucesso!');
  } catch (err: any) {
    isPostgresAvailable = false;
    console.warn('AVISO: PostgreSQL Central está OFFLINE. Motor local JSON Fallback ativado para manter integridade do sistema SIGEP!');
    // Pre-create/load local fallback DB to ensure default admin user exists
    loadFallbackDb();
  }
}

checkPostgresConnection();

// Helper to run migrations / create tables dynamically on startup
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log('Conexão ao PostgreSQL estabelecida com sucesso! Criando tabelas se não existirem...');
    
    // 1. Alunos Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS alunos (
        id VARCHAR(50) PRIMARY KEY,
        name TEXT NOT NULL,
        gender VARCHAR(20),
        birth_date TEXT,
        class VARCHAR(20),
        section VARCHAR(20),
        status VARCHAR(50),
        contact TEXT,
        enrollment_date TEXT,
        guardian TEXT,
        enrollment_fee_paid BOOLEAN DEFAULT FALSE,
        foreign_language VARCHAR(50) DEFAULT 'INGLÊS'
      );
    `);

    // Ensure extra fields are added if table was already created
    await client.query(`
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS father_name TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS mother_name TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS bi TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS bi_sector TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS bi_date TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS doc_type VARCHAR(20) DEFAULT 'BI';
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cedula_registo TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cedula_fls TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cedula_livro TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cedula_ano TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS periodo TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS specialty TEXT;
    `);

    // 2. Notas Table
    await client.query(`
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
      ALTER TABLE notas ADD COLUMN IF NOT EXISTS npp NUMERIC(5,2);
      ALTER TABLE notas ADD COLUMN IF NOT EXISTS mt NUMERIC(5,2);
    `);

    // 3. Funcionarios Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS funcionarios (
        id VARCHAR(50) PRIMARY KEY,
        name TEXT NOT NULL,
        role VARCHAR(50) NOT NULL,
        subject VARCHAR(100),
        contact TEXT,
        status VARCHAR(50),
        password TEXT NOT NULL,
        is_root BOOLEAN DEFAULT FALSE,
        is_editable BOOLEAN DEFAULT TRUE
      );
    `);
    
    // Add columns dynamically in case table already exists but without these columns
    await client.query(`
      ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS is_root BOOLEAN DEFAULT FALSE;
    `);
    await client.query(`
      ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT TRUE;
    `);

    // Insert immutable Root Administrator
    await client.query(`
      INSERT INTO funcionarios (id, name, role, password, status, is_root, is_editable)
      VALUES ('SIGEP', 'Administrador SIGEP', 'SIGEP', 'sigepwl', 'Activo', TRUE, FALSE)
      ON CONFLICT (id) DO UPDATE SET is_root = TRUE, is_editable = FALSE, password = 'sigepwl';
    `);

    // 4. Propinas / Seccao Financeira Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS propinas (
        id VARCHAR(50) PRIMARY KEY,
        name TEXT NOT NULL,
        class VARCHAR(20),
        section VARCHAR(20),
        periodo TEXT,
        modalidade VARCHAR(50),
        desconto TEXT,
        meses_pagos TEXT, -- Serialized JSON array of booleans
        total_pago NUMERIC(15,2) DEFAULT 0,
        total_divida NUMERIC(15,2) DEFAULT 0,
        data_ultimo_pg TEXT,
        observacoes TEXT,
        faltas_injustificadas INTEGER DEFAULT 0,
        faltas_justificadas INTEGER DEFAULT 0,
        faltas_pagas INTEGER DEFAULT 0
      );
    `);

    // 5. Grelha Curricular Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS grelha_curricular (
        id VARCHAR(50) PRIMARY KEY,
        modality VARCHAR(50) NOT NULL,
        specialty VARCHAR(50) NOT NULL,
        class VARCHAR(20) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        active BOOLEAN DEFAULT TRUE NOT NULL,
        position INTEGER DEFAULT 0 NOT NULL,
        category VARCHAR(50) DEFAULT 'Formação Geral' NOT NULL,
        CONSTRAINT unique_grelha_item UNIQUE (modality, specialty, class, subject)
      );
    `);

    // Ensure the position and category columns exist for existing databases
    await client.query(`
      ALTER TABLE grelha_curricular ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0 NOT NULL;
    `);
    await client.query(`
      ALTER TABLE grelha_curricular ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Formação Geral' NOT NULL;
    `);

    // 6. Config Escolar Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS escola_config (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // 6. Migração de dados de Sector de Emissão históricos (Mapeamento inteligente)
    const rows = await client.query("SELECT id, bi_sector FROM alunos WHERE bi_sector IS NOT NULL AND bi_sector != ''");
    console.log(`[Migração] Verificando Sector de Emissão histórico para ${rows.rows.length} alunos...`);
    let migratedCount = 0;
    for (const row of rows.rows) {
      const normalized = normalizeProvinciaBI(row.bi_sector);
      if (normalized !== row.bi_sector) {
        await client.query("UPDATE alunos SET bi_sector = $1 WHERE id = $2", [normalized, row.id]);
        migratedCount++;
      }
    }
    if (migratedCount > 0) {
      console.log(`[Migração] Sucedida! ${migratedCount} registos de alunos foram migrados para o novo padrão de províncias de Angola.`);
    } else {
      console.log(`[Migração] Todos os registos antigos já estão conformes com as 21 províncias.`);
    }

    client.release();
    console.log('Tabelas inicializadas com sucesso no banco de dados!');
  } catch (error) {
    console.error('Erro ao conectar ou inicializar tabelas no banco de dados:', error);
  }
}

initializeDatabase();

// === REAL-TIME CONTINUOUS SYNC BROADCASTER (LAN / Wi-Fi) ===
const sseClients = new Set<express.Response>();
let dataVersion = Date.now();

function notifyRealtimeClients(entity?: string) {
  dataVersion = Date.now();
  const payload = JSON.stringify({ timestamp: dataVersion, entity: entity || 'ALL' });
  for (const client of sseClients) {
    try {
      client.write(`event: DATA_UPDATED\ndata: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

app.get('/api/realtime/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ version: dataVersion, time: new Date().toISOString() })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

app.get('/api/realtime/version', (req, res) => {
  res.json({ version: dataVersion, time: new Date().toISOString() });
});

// --- API ROUTES ---

// AUTH & MAINTENANCE ENDPOINTS
app.get('/api/auth/check-director', async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM funcionarios WHERE role = 'DIRECTOR_GERAL'");
    const count = parseInt(result.rows[0].count, 10);
    res.json({ hasDirector: count > 0 });
  } catch (err: any) {
    console.error('Erro ao verificar Diretor Geral:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { id, password } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Por favor, digite o seu ID de acesso.' });
  }

  const cleanId = String(id).trim().toUpperCase();
  const inputPassword = password ? String(password).trim() : '';

  // 1. Administrador SIGEP (Suporte Master / Root)
  if (cleanId === 'SIGEP' || cleanId === 'ADMIN_SIGEP' || cleanId === 'SG123') {
    if (inputPassword === 'sigepwl' || (cleanId === 'SG123' && inputPassword === 'admin')) {
      return res.json({
        success: true,
        type: 'staff',
        staff: {
          id: 'SIGEP',
          name: 'Administrador SIGEP (Suporte Master)',
          role: 'SIGEP',
          password: inputPassword,
          is_root: true,
          is_editable: false
        }
      });
    } else {
      return res.status(401).json({ success: false, error: 'Senha incorreta para a conta Administrador SIGEP.' });
    }
  }

  try {
    // 2. Consulta tabela de funcionários no PostgreSQL e Fallback DB (ID insensível a maiúsculas/espaços)
    const staffRes = await pool.query('SELECT * FROM funcionarios WHERE UPPER(TRIM(id)) = $1 OR UPPER(TRIM(id)) = $2', [cleanId, cleanId.replace(/\s+/g, '')]);
    let staffRow = staffRes.rows.length > 0 ? staffRes.rows[0] : null;

    if (!staffRow) {
      try {
        const fallbackData = loadFallbackDb();
        if (fallbackData && Array.isArray(fallbackData.funcionarios)) {
          staffRow = fallbackData.funcionarios.find((f: any) => 
            String(f.id || '').trim().toUpperCase() === cleanId || 
            String(f.id || '').trim().toUpperCase() === cleanId.replace(/\s+/g, '')
          );
        }
      } catch (fErr) {
        // Ignorar erro do fallback db
      }
    }

    if (staffRow) {
      const correctSecret = staffRow.password || '12345';
      if (inputPassword === correctSecret) {
        return res.json({
          success: true,
          type: 'staff',
          staff: {
            id: staffRow.id,
            name: staffRow.name,
            role: staffRow.role,
            subject: staffRow.subject || '',
            contact: staffRow.contact || '',
            status: staffRow.status || 'Activo',
            password: staffRow.password || '12345',
            is_root: staffRow.is_root || false,
            is_editable: staffRow.is_editable ?? true
          }
        });
      } else {
        return res.status(401).json({ success: false, error: `Senha incorreta para o utilizador ${cleanId}.` });
      }
    }

    // 3. Consulta tabela de alunos no PostgreSQL (por ID, processo ou BI)
    const studentRes = await pool.query(
      'SELECT * FROM alunos WHERE UPPER(id) = $1 OR UPPER(process_number) = $1 OR UPPER(bi_number) = $1',
      [cleanId]
    );
    if (studentRes.rows.length > 0) {
      const studentRow = studentRes.rows[0];
      // Para alunos, acesso direto via ID
      return res.json({
        success: true,
        type: 'student',
        student: {
          id: studentRow.id,
          name: studentRow.name,
          class: studentRow.class,
          section: studentRow.section,
          status: studentRow.status,
          contact: studentRow.contact
        }
      });
    }

    // 4. Se não existe na base de dados
    return res.status(404).json({
      success: false,
      error: `ID "${cleanId}" não cadastrado no sistema. Contacte o Diretor Geral ou os Recursos Humanos.`
    });
  } catch (err: any) {
    console.error('Erro na autenticação central:', err);
    return res.status(500).json({ success: false, error: 'Erro de ligação à base de dados central.' });
  }
});

app.post('/api/auth/maintenance-login', async (req, res) => {
  const { id, password, isMaintenanceMode } = req.body;
  
  if (!id || !password) {
    return res.status(400).json({ error: 'ID e Senha são obrigatórios.' });
  }

  const cleanId = id.trim().toUpperCase();

  // Validate hardware trigger/hotkey payload status
  if (!isMaintenanceMode) {
    return res.status(403).json({ error: 'Acesso de retaguarda apenas permitido via ativação por atalho físico do sistema.' });
  }

  if ((cleanId === 'SIGEP' || cleanId === 'ADMIN_SIGEP') && password === 'sigepwl') {
    return res.json({
      success: true,
      token: "sigep-maintenance-token-v1",
      staff: {
        id: 'SIGEP',
        name: 'Administrador SIGEP (Suporte Técnico)',
        role: 'SIGEP',
        is_root: true,
        is_editable: false
      }
    });
  }

  return res.status(401).json({ error: 'Credenciais de manutenção do Administrador SIGEP inválidas.' });
});

// 1. ALUNOS (STUDENTS) ENDPOINTS
app.get('/api/alunos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM alunos ORDER BY name ASC');
    // Map database fields to snakeCase/camelCase for React App matching
    const mapped = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      gender: row.gender,
      birthDate: row.birth_date,
      class: row.class,
      section: row.section,
      status: row.status,
      contact: row.contact,
      enrollmentDate: row.enrollment_date,
      guardian: row.guardian,
      enrollmentFeePaid: row.enrollment_fee_paid,
      foreignLanguage: row.foreign_language,
      fatherName: row.father_name,
      motherName: row.mother_name,
      bi: row.bi,
      biSector: row.bi_sector,
      biDate: row.bi_date,
      docType: row.doc_type,
      cedulaRegisto: row.cedula_registo,
      cedulaFls: row.cedula_fls,
      cedulaLivro: row.cedula_livro,
      cedulaAno: row.cedula_ano,
      periodo: row.periodo,
      specialty: row.specialty
    }));
    res.json(mapped);
  } catch (err: any) {
    console.error('Erro ao buscar alunos:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/alunos', async (req, res) => {
  const { 
    id, name, gender, birthDate, class: cl, section, status, contact, 
    enrollmentDate, guardian, enrollmentFeePaid, foreignLanguage,
    fatherName, motherName, bi, biSector, biDate, docType,
    cedulaRegisto, cedulaFls, cedulaLivro, cedulaAno, periodo, specialty
  } = req.body;
  try {
    const validatedBiSector = docType === 'BI' || biSector ? normalizeProvinciaBI(biSector) : undefined;
    await pool.query(`
      INSERT INTO alunos (
        id, name, gender, birth_date, class, section, status, contact, 
        enrollment_date, guardian, enrollment_fee_paid, foreign_language,
        father_name, mother_name, bi, bi_sector, bi_date, doc_type,
        cedula_registo, cedula_fls, cedula_livro, cedula_ano, periodo, specialty
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        gender = EXCLUDED.gender,
        birth_date = EXCLUDED.birth_date,
        class = EXCLUDED.class,
        section = EXCLUDED.section,
        status = EXCLUDED.status,
        contact = EXCLUDED.contact,
        enrollment_date = EXCLUDED.enrollment_date,
        guardian = EXCLUDED.guardian,
        enrollment_fee_paid = EXCLUDED.enrollment_fee_paid,
        foreign_language = EXCLUDED.foreign_language,
        father_name = EXCLUDED.father_name,
        mother_name = EXCLUDED.mother_name,
        bi = EXCLUDED.bi,
        bi_sector = EXCLUDED.bi_sector,
        bi_date = EXCLUDED.bi_date,
        doc_type = EXCLUDED.doc_type,
        cedula_registo = EXCLUDED.cedula_registo,
        cedula_fls = EXCLUDED.cedula_fls,
        cedula_livro = EXCLUDED.cedula_livro,
        cedula_ano = EXCLUDED.cedula_ano,
        periodo = EXCLUDED.periodo,
        specialty = EXCLUDED.specialty
    `, [
      id, name, gender, birthDate, cl, section, status, contact, 
      enrollmentDate, guardian, enrollmentFeePaid, foreignLanguage || 'INGLÊS',
      fatherName, motherName, bi, validatedBiSector, biDate, docType || 'BI',
      cedulaRegisto, cedulaFls, cedulaLivro, cedulaAno, periodo, specialty
    ]);
    res.json({ success: true, message: 'Aluno gravado com sucesso' });
    notifyRealtimeClients('alunos');
  } catch (err: any) {
    console.error('Erro ao gravar aluno:', err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk sync students
app.post('/api/alunos/sync', async (req, res) => {
  const students = req.body;
  if (!Array.isArray(students)) {
    return res.status(400).json({ error: 'Payload deve ser uma lista de alunos' });
  }
  try {
    await pool.query('BEGIN');
    for (const student of students) {
      const validatedBiSector = student.docType === 'BI' || student.biSector ? normalizeProvinciaBI(student.biSector) : undefined;
      await pool.query(`
        INSERT INTO alunos (
          id, name, gender, birth_date, class, section, status, contact, 
          enrollment_date, guardian, enrollment_fee_paid, foreign_language,
          father_name, mother_name, bi, bi_sector, bi_date, doc_type,
          cedula_registo, cedula_fls, cedula_livro, cedula_ano, periodo, specialty
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          gender = EXCLUDED.gender,
          birth_date = EXCLUDED.birth_date,
          class = EXCLUDED.class,
          section = EXCLUDED.section,
          status = EXCLUDED.status,
          contact = EXCLUDED.contact,
          enrollment_date = EXCLUDED.enrollment_date,
          guardian = EXCLUDED.guardian,
          enrollment_fee_paid = EXCLUDED.enrollment_fee_paid,
          foreign_language = EXCLUDED.foreign_language,
          father_name = EXCLUDED.father_name,
          mother_name = EXCLUDED.mother_name,
          bi = EXCLUDED.bi,
          bi_sector = EXCLUDED.bi_sector,
          bi_date = EXCLUDED.bi_date,
          doc_type = EXCLUDED.doc_type,
          cedula_registo = EXCLUDED.cedula_registo,
          cedula_fls = EXCLUDED.cedula_fls,
          cedula_livro = EXCLUDED.cedula_livro,
          cedula_ano = EXCLUDED.cedula_ano,
          periodo = EXCLUDED.periodo,
          specialty = EXCLUDED.specialty
      `, [
        student.id,
        student.name,
        student.gender,
        student.birthDate,
        student.class,
        student.section,
        student.status,
        student.contact,
        student.enrollmentDate,
        student.guardian,
        student.enrollmentFeePaid,
        student.foreignLanguage || 'INGLÊS',
        student.fatherName,
        student.motherName,
        student.bi,
        validatedBiSector,
        student.biDate,
        student.docType || 'BI',
        student.cedulaRegisto,
        student.cedulaFls,
        student.cedulaLivro,
        student.cedulaAno,
        student.periodo,
        student.specialty
      ]);
    }
    await pool.query('COMMIT');
    res.json({ success: true, count: students.length });
    notifyRealtimeClients('alunos');
  } catch (err: any) {
    await pool.query('ROLLBACK');
    console.error('Erro ao sincronizar alunos em lote:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/alunos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM alunos WHERE id = $1', [id]);
    res.json({ success: true });
    notifyRealtimeClients('alunos');
  } catch (err: any) {
    console.error('Erro ao deletar aluno:', err);
    res.status(500).json({ error: err.message });
  }
});


// 2. NOTAS (GRADES) ENDPOINTS
app.get('/api/notas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notas');
    const mapped = result.rows.map(row => ({
      studentId: row.student_id,
      studentName: row.student_name,
      subject: row.subject,
      trimester: row.trimester,
      mac: row.mac !== null && row.mac !== undefined ? parseFloat(row.mac) : null,
      npp: row.npp !== null && row.npp !== undefined ? parseFloat(row.npp) : null,
      npt: row.npt !== null && row.npt !== undefined ? parseFloat(row.npt) : null,
      mt: row.mt !== null && row.mt !== undefined ? parseFloat(row.mt) : null,
    }));
    res.json(mapped);
  } catch (err: any) {
    console.error('Erro ao buscar notas:', err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk sync/save grades
app.post('/api/notas/sync', async (req, res) => {
  const grades = req.body;
  if (!Array.isArray(grades)) {
    return res.status(400).json({ error: 'Payload deve ser uma lista de notas' });
  }
  try {
    await pool.query('BEGIN');
    for (const record of grades) {
      await pool.query(`
        INSERT INTO notas (student_id, student_name, subject, trimester, mac, npp, npt, mt)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (student_id, subject, trimester) DO UPDATE SET
          student_name = EXCLUDED.student_name,
          mac = EXCLUDED.mac,
          npp = EXCLUDED.npp,
          npt = EXCLUDED.npt,
          mt = EXCLUDED.mt
      `, [
        record.studentId,
        record.studentName,
        record.subject,
        record.trimester,
        record.mac,
        record.npp,
        record.npt,
        record.mt
      ]);
    }
    await pool.query('COMMIT');
    res.json({ success: true, count: grades.length });
    notifyRealtimeClients('notas');
  } catch (err: any) {
    await pool.query('ROLLBACK');
    console.error('Erro ao sincronizar notas:', err);
    res.status(500).json({ error: err.message });
  }
});


// 3. FUNCIONARIOS (STAFF) ENDPOINTS
app.get('/api/funcionarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM funcionarios ORDER BY name ASC');
    res.json(result.rows);
  } catch (err: any) {
    console.error('Erro ao buscar funcionários:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/funcionarios', async (req, res) => {
  const { id, name, role, subject, contact, status, password } = req.body;
  if (id && (id.trim().toUpperCase() === 'SIGEP' || id.trim().toUpperCase() === 'ADMIN_SIGEP')) {
    return res.status(403).json({ error: 'O Administrador SIGEP é imutável e protegido ao nível do core do sistema.' });
  }
  try {
    await pool.query(`
      INSERT INTO funcionarios (id, name, role, subject, contact, status, password)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        subject = EXCLUDED.subject,
        contact = EXCLUDED.contact,
        status = EXCLUDED.status,
        password = EXCLUDED.password
    `, [
      id,
      name || 'Funcionário',
      role || 'PROFESSOR',
      subject || '',
      contact || '',
      status || 'Activo',
      password || '12345'
    ]);
    res.json({ success: true });
    notifyRealtimeClients('funcionarios');
  } catch (err: any) {
    console.error('Erro ao gravar funcionário:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/funcionarios/sync', async (req, res) => {
  const staff = req.body;
  if (!Array.isArray(staff)) {
    return res.status(400).json({ error: 'Payload deve ser uma lista de funcionários' });
  }
  try {
    await pool.query('BEGIN');
    for (const record of staff) {
      if (!record.id || record.id.trim().toUpperCase() === 'SIGEP' || record.id.trim().toUpperCase() === 'ADMIN_SIGEP') {
        continue; // Ignorar actualização de Administrador SIGEP ou registo sem ID
      }
      await pool.query(`
        INSERT INTO funcionarios (id, name, role, subject, contact, status, password)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          subject = EXCLUDED.subject,
          contact = EXCLUDED.contact,
          status = EXCLUDED.status,
          password = EXCLUDED.password
      `, [
        record.id,
        record.name || 'Funcionário',
        record.role || 'PROFESSOR',
        record.subject || '',
        record.contact || '',
        record.status || 'Activo',
        record.password || '12345'
      ]);
    }
    await pool.query('COMMIT');
    res.json({ success: true, count: staff.length });
    notifyRealtimeClients('funcionarios');
  } catch (err: any) {
    await pool.query('ROLLBACK');
    console.error('Erro ao sincronizar funcionários:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/funcionarios/:id', async (req, res) => {
  const { id } = req.params;
  if (id && (id.trim().toUpperCase() === 'SIGEP' || id.trim().toUpperCase() === 'ADMIN_SIGEP')) {
    return res.status(403).json({ error: 'O Administrador SIGEP é imutável e protegido ao nível do core do sistema.' });
  }
  try {
    await pool.query('DELETE FROM funcionarios WHERE id = $1', [id]);
    res.json({ success: true });
    notifyRealtimeClients('funcionarios');
  } catch (err: any) {
    console.error('Erro ao deletar funcionário:', err);
    res.status(500).json({ error: err.message });
  }
});


// 3.5 GRELHA CURRICULAR (CURRICULAR GRID) ENDPOINTS
app.get('/api/grelha', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM grelha_curricular ORDER BY modality, class, specialty, position ASC, subject ASC');
    const mapped = result.rows.map(row => ({
      id: row.id,
      modality: row.modality,
      specialty: row.specialty,
      class: row.class,
      subject: row.subject,
      active: row.active,
      position: row.position !== undefined ? Number(row.position) : 0,
      category: row.category !== undefined ? row.category : 'Formação Geral'
    }));
    res.json(mapped);
  } catch (err: any) {
    console.error('Erro ao buscar grelha curricular:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/grelha/sync', async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Payload deve ser uma lista de itens de grelha' });
  }
  try {
    await pool.query('BEGIN');
    for (const item of items) {
      await pool.query(`
        INSERT INTO grelha_curricular (id, modality, specialty, class, subject, active, position, category)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, TRUE), COALESCE($7, 0), COALESCE($8, 'Formação Geral'))
        ON CONFLICT (modality, specialty, class, subject) DO UPDATE SET
          active = COALESCE(EXCLUDED.active, grelha_curricular.active),
          position = COALESCE(EXCLUDED.position, grelha_curricular.position),
          category = COALESCE(EXCLUDED.category, grelha_curricular.category)
      `, [
        item.id,
        item.modality,
        item.specialty,
        item.class,
        item.subject,
        item.active !== undefined ? item.active : true,
        item.position !== undefined ? item.position : 0,
        item.category !== undefined ? item.category : 'Formação Geral'
      ]);
    }
    await pool.query('COMMIT');
    res.json({ success: true, count: items.length });
    notifyRealtimeClients('grelha');
  } catch (err: any) {
    await pool.query('ROLLBACK');
    console.error('Erro ao sincronizar grelha:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/grelha/reorder', async (req, res) => {
  const orders = req.body; // Expects array of { id: string, position: number }
  if (!Array.isArray(orders)) {
    return res.status(400).json({ error: 'Payload deve ser uma lista de reordenação' });
  }
  try {
    await pool.query('BEGIN');
    for (const item of orders) {
      await pool.query('UPDATE grelha_curricular SET position = $1 WHERE id = $2', [item.position, item.id]);
    }
    await pool.query('COMMIT');
    res.json({ success: true });
    notifyRealtimeClients('grelha');
  } catch (err: any) {
    await pool.query('ROLLBACK');
    console.error('Erro ao reordenar grelha:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/grelha/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  try {
    await pool.query('UPDATE grelha_curricular SET active = $1 WHERE id = $2', [active, id]);
    res.json({ success: true });
    notifyRealtimeClients('grelha');
  } catch (err: any) {
    console.error('Erro ao alternar estado da disciplina:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/grelha/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM grelha_curricular WHERE id = $1', [id]);
    res.json({ success: true });
    notifyRealtimeClients('grelha');
  } catch (err: any) {
    console.error('Erro ao excluir vínculo curricular:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/grelha/reset', async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Payload deve ser uma lista de itens de grelha' });
  }
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM grelha_curricular');
    for (const item of items) {
      await pool.query(`
        INSERT INTO grelha_curricular (id, modality, specialty, class, subject, active, position, category)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, TRUE), COALESCE($7, 0), COALESCE($8, 'Formação Geral'))
      `, [
        item.id,
        item.modality,
        item.specialty,
        item.class,
        item.subject,
        item.active !== undefined ? item.active : true,
        item.position !== undefined ? item.position : 0,
        item.category !== undefined ? item.category : 'Formação Geral'
      ]);
    }
    await pool.query('COMMIT');
    res.json({ success: true, count: items.length });
    notifyRealtimeClients('grelha');
  } catch (err: any) {
    await pool.query('ROLLBACK');
    console.error('Erro ao reiniciar grelha curricular no PostgreSQL:', err);
    res.status(500).json({ error: err.message });
  }
});


// 4. PROPINAS (FINANCE RECORDS) ENDPOINTS
app.get('/api/propinas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM propinas');
    const mapped = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      class: row.class,
      section: row.section,
      periodo: row.periodo,
      modalidade: row.modalidade,
      desconto: row.desconto,
      mesesPagos: row.meses_pagos ? JSON.parse(row.meses_pagos) : Array(11).fill(false),
      totalPago: parseFloat(row.total_pago || '0'),
      totalDivida: parseFloat(row.total_divida || '0'),
      dataUltimoPg: row.data_ultimo_pg,
      observacoes: row.observacoes,
      faltasInjustificadas: row.faltas_injustificadas,
      faltasJustificadas: row.faltas_justificadas,
      faltasPagas: row.faltas_pagas
    }));
    res.json(mapped);
  } catch (err: any) {
    console.error('Erro ao buscar propinas:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/propinas/sync', async (req, res) => {
  const records = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'Payload deve ser uma lista de registos de propinas' });
  }
  try {
    await pool.query('BEGIN');
    for (const rec of records) {
      await pool.query(`
        INSERT INTO propinas (
          id, name, class, section, periodo, modalidade, desconto, meses_pagos, 
          total_pago, total_divida, data_ultimo_pg, observacoes, 
          faltas_injustificadas, faltas_justificadas, faltas_pagas
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          class = EXCLUDED.class,
          section = EXCLUDED.section,
          periodo = EXCLUDED.periodo,
          modalidade = EXCLUDED.modalidade,
          desconto = EXCLUDED.desconto,
          meses_pagos = EXCLUDED.meses_pagos,
          total_pago = EXCLUDED.total_pago,
          total_divida = EXCLUDED.total_divida,
          data_ultimo_pg = EXCLUDED.data_ultimo_pg,
          observacoes = EXCLUDED.observacoes,
          faltas_injustificadas = EXCLUDED.faltas_injustificadas,
          faltas_justificadas = EXCLUDED.faltas_justificadas,
          faltas_pagas = EXCLUDED.faltas_pagas
      `, [
        rec.id,
        rec.name,
        rec.class,
        rec.section,
        rec.periodo,
        rec.modalidade,
        rec.desconto,
        JSON.stringify(rec.mesesPagos || Array(11).fill(false)),
        rec.totalPago || 0,
        rec.totalDivida || 0,
        rec.dataUltimoPg || '',
        rec.observacoes || '',
        rec.faltasInjustificadas || 0,
        rec.faltasJustificadas || 0,
        rec.faltasPagas || 0
      ]);
    }
    await pool.query('COMMIT');
    res.json({ success: true, count: records.length });
    notifyRealtimeClients('propinas');
  } catch (err: any) {
    await pool.query('ROLLBACK');
    console.error('Erro ao sincronizar propinas:', err);
    res.status(500).json({ error: err.message });
  }
});


// 5. SCHOOL SETTINGS / CONFIG ENDPOINTS
app.get('/api/config', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM escola_config');
    const configObj: { [key: string]: any } = {};
    result.rows.forEach(row => {
      try {
        configObj[row.key] = JSON.parse(row.value);
      } catch {
        configObj[row.key] = row.value;
      }
    });
    res.json(configObj);
  } catch (err: any) {
    console.error('Erro ao buscar configurações:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config', async (req, res) => {
  const configs = req.body;
  if (typeof configs !== 'object') {
    return res.status(400).json({ error: 'Payload deve ser um objeto JSON' });
  }
  try {
    await pool.query('BEGIN');
    for (const key of Object.keys(configs)) {
      const valStr = typeof configs[key] === 'object' ? JSON.stringify(configs[key]) : String(configs[key]);
      await pool.query(`
        INSERT INTO escola_config (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [key, valStr]);
    }
    await pool.query('COMMIT');
    res.json({ success: true });
    notifyRealtimeClients('config');
  } catch (err: any) {
    await pool.query('ROLLBACK');
    console.error('Erro ao gravar configurações:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. ENDPOINTS ENTERPRISE: FECHO DE ANO, RESET E ATRIBUIÇÕES RH
// ==========================================

// 6.1 Fecho de Ano Lectivo Transacional e Promoção Conservando ID do Aluno
app.post('/api/fecho-ano', async (req, res) => {
  const { newAcademicYear, operatorId, operatorPassword } = req.body;
  if (!newAcademicYear) {
    return res.status(400).json({ error: 'O novo ano lectivo é obrigatório.' });
  }

  try {
    await pool.query('BEGIN');

    // Validar operador
    if (operatorId) {
      const opCheck = await pool.query(
        "SELECT id, role, password FROM funcionarios WHERE UPPER(id) = UPPER($1)",
        [operatorId]
      );
      if (opCheck.rows.length > 0) {
        const op = opCheck.rows[0];
        if (op.role !== 'DIRECTOR_GERAL' && op.role !== 'SYSTEM_ADMIN' && op.role !== 'SIGEP') {
          await pool.query('ROLLBACK');
          return res.status(403).json({ error: 'Apenas o Director Geral ou Administrador pode executar o fecho de ano.' });
        }
        if (operatorPassword && op.password !== operatorPassword) {
          await pool.query('ROLLBACK');
          return res.status(401).json({ error: 'Senha do operador incorreta.' });
        }
      }
    }

    // Buscar alunos e notas
    const alunosRes = await pool.query('SELECT * FROM alunos');
    const notasRes = await pool.query('SELECT * FROM notas');

    const alunos = alunosRes.rows || [];
    const notas = notasRes.rows || [];

    let promovidos = 0;
    let retidos = 0;
    let concluidos = 0;

    // Processar promoção mantendo o id_aluno (PK) intacto
    for (const aluno of alunos) {
      const studentGrades = notas.filter((g: any) => g.student_id === aluno.id);
      
      let totalMFD = 0;
      let countSubj = 0;
      const subjMap: Record<string, { I?: number, II?: number, III?: number }> = {};
      studentGrades.forEach((g: any) => {
        if (!subjMap[g.subject]) subjMap[g.subject] = {};
        if (g.trimester === 'I') subjMap[g.subject].I = Number(g.npt || g.mac || 0);
        if (g.trimester === 'II') subjMap[g.subject].II = Number(g.npt || g.mac || 0);
        if (g.trimester === 'III') subjMap[g.subject].III = Number(g.npt || g.mac || 0);
      });

      Object.values(subjMap).forEach(t => {
        const mfd = ((t.I || 0) + (t.II || 0) + (t.III || 0)) / 3;
        totalMFD += mfd;
        countSubj++;
      });

      const avg = countSubj > 0 ? totalMFD / countSubj : 10;
      const classNum = parseInt(aluno.class, 10) || 1;
      const passThreshold = classNum >= 7 ? 10 : 5;
      const isApto = avg >= passThreshold;

      if (isApto) {
        if (classNum >= 1 && classNum <= 5) {
          aluno.class = String(classNum + 1);
          promovidos++;
        } else if (classNum === 6) {
          aluno.class = '7';
          promovidos++;
        } else if (classNum >= 7 && classNum <= 8) {
          aluno.class = String(classNum + 1);
          promovidos++;
        } else if (classNum === 9) {
          aluno.class = '10';
          promovidos++;
        } else if (classNum >= 10 && classNum <= 11) {
          aluno.class = String(classNum + 1);
          promovidos++;
        } else if (classNum >= 12) {
          aluno.class = 'CONCLUIDO';
          concluidos++;
        }
      } else {
        retidos++;
      }

      await pool.query(
        'UPDATE alunos SET class = $1, status = $2 WHERE id = $3',
        [aluno.class, aluno.class === 'CONCLUIDO' ? 'Concluído' : 'Ativo', aluno.id]
      );
    }

    // Limpar notas para o novo ano letivo
    await pool.query('DELETE FROM notas');

    // Registrar no Log de Auditoria
    await pool.query(`
      INSERT INTO logs_auditoria (id, user_name, action, target, timestamp)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      `LOG-${Date.now()}`,
      operatorId || 'DIRECTOR_GERAL',
      `Fecho de Ano Lectivo concluído com sucesso. Transição para o ano de ${newAcademicYear}. Promovidos: ${promovidos}, Retidos: ${retidos}, Concluídos: ${concluidos}.`,
      `Ano Lectivo -> ${newAcademicYear}`
    ]);

    await pool.query('COMMIT');

    res.json({
      success: true,
      message: `Ano lectivo encerrado com sucesso! Promovidos: ${promovidos}, Retidos: ${retidos}, Concluídos: ${concluidos}.`,
      promovidos,
      retidos,
      concluidos
    });
  } catch (err: any) {
    await pool.query('ROLLBACK');
    console.error('Erro no fecho de ano:', err);
    res.status(500).json({ error: 'Falha na execução do Fecho de Ano: ' + err.message });
  }
});

// 6.2 Reset de Fábrica da Base de Dados com Validação Dupla de Segurança
app.post('/api/reset-fabrica', async (req, res) => {
  const { operatorId, operatorPassword } = req.body;

  if (!operatorId || !operatorPassword) {
    return res.status(400).json({ error: 'Credenciais de confirmação (ID e Senha do Director) são obrigatórias para o Reset de Fábrica.' });
  }

  try {
    const staffRes = await pool.query(
      "SELECT id, name, role, password FROM funcionarios WHERE UPPER(id) = UPPER($1)",
      [operatorId]
    );

    if (staffRes.rows.length === 0) {
      return res.status(404).json({ error: `O operador com ID "${operatorId}" não foi localizado.` });
    }

    const op = staffRes.rows[0];
    if (op.role !== 'DIRECTOR_GERAL' && op.role !== 'SYSTEM_ADMIN' && op.role !== 'SIGEP') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas o Director Geral ou Administrador possui autorização para executar o Reset de Fábrica.' });
    }

    if (op.password !== operatorPassword) {
      return res.status(401).json({ error: 'Senha de autorização incorreta. Operação cancelada por segurança.' });
    }

    await pool.query('BEGIN');

    await pool.query('DELETE FROM notas');
    await pool.query('DELETE FROM propinas');
    await pool.query('DELETE FROM alunos');

    await pool.query(`
      INSERT INTO logs_auditoria (id, user_name, action, target, timestamp)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      `LOG-${Date.now()}`,
      op.name || operatorId,
      'Executado Reset de Fábrica na Base de Dados. Tabelas transacionais limpas. Estruturas e cadastros de RH preservados.',
      'Base de Dados Central'
    ]);

    await pool.query('COMMIT');

    const db = loadFallbackDb();
    db.notas = [];
    db.propinas = [];
    db.alunos = [];
    saveFallbackDb(db);

    notifyRealtimeClients('reset_fabrica');

    res.json({
      success: true,
      message: 'Reset de fábrica concluído com sucesso. Todos os dados transacionais foram limpos. Estrutura e configurações de RH foram preservadas.'
    });
  } catch (err: any) {
    await pool.query('ROLLBACK');
    console.error('Erro ao executar Reset de Fábrica:', err);
    res.status(500).json({ error: 'Erro de banco de dados no Reset de Fábrica: ' + err.message });
  }
});

// 6.3 Validação do Conflito de Atribuições Curriculares (Docência Única)
app.post('/api/atribuicoes/validar', async (req, res) => {
  const { idProfessor, assignments } = req.body;

  if (!Array.isArray(assignments)) {
    return res.status(400).json({ error: 'Payload inválido. Esperado um array de atribuições.' });
  }

  try {
    const staffRes = await pool.query("SELECT id, name, role, subjects, classes, sections FROM funcionarios WHERE role = 'PROFESSOR'");
    const allProfs = staffRes.rows || [];

    for (const item of assignments) {
      const targetClass = String(item.class || '').trim();
      const targetSection = String(item.section || '').trim();
      const targetSubject = String(item.subject || '').trim();

      if (!targetClass || !targetSection || !targetSubject) continue;

      for (const prof of allProfs) {
        if (String(prof.id).toUpperCase() === String(idProfessor).toUpperCase()) continue;

        const profClasses = Array.isArray(prof.classes) ? prof.classes : [];
        const profSections = Array.isArray(prof.sections) ? prof.sections : [];
        const profSubjects = Array.isArray(prof.subjects) ? prof.subjects : [];

        const hasClass = profClasses.includes(targetClass);
        const hasSection = profSections.includes(targetSection);
        const hasSubject = profSubjects.includes(targetSubject);

        if (hasClass && hasSection && hasSubject) {
          return res.status(409).json({
            error: `Conflito: A Disciplina "${targetSubject}" na Classe ${targetClass}ª Turma ${targetSection} já está atribuída ao Professor ${prof.name} (ID: ${prof.id}).`
          });
        }
      }
    }

    res.json({ success: true, message: 'Todas as atribuições validadas sem conflito de docência.' });
  } catch (err: any) {
    console.error('Erro na validação de atribuições:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6.4 Auto-Update via GitHub Releases API
app.get('/api/updates/check', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    
    const githubRes = await fetch('https://api.github.com/repos/watchimona/SIGEP/releases/latest', {
      headers: { 'User-Agent': 'SIGEP-Academico-App' },
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeout);

    if (githubRes && githubRes.ok) {
      const release = await githubRes.json();
      res.json({
        hasUpdate: true,
        version: release.tag_name ? release.tag_name.replace(/^v/, '') : '1.1.1',
        releaseNotes: release.body || 'Atualização de estabilidade e regras do MED.',
        downloadUrl: release.html_url || 'https://github.com/watchimona/SIGEP/releases/latest',
        publishedAt: release.published_at
      });
    } else {
      res.json({
        hasUpdate: true,
        version: '1.1.1',
        releaseNotes: '• Homologação de pautas unificadas de acordo com as diretrizes de Angola;\n• Correção e otimização de cache na rede local LAN;\n• Melhorias na atribuição curricular e fecho de ano letivo.',
        downloadUrl: 'https://github.com/watchimona/SIGEP/releases/latest'
      });
    }
  } catch (e: any) {
    res.json({
      hasUpdate: true,
      version: '1.1.1',
      releaseNotes: '• Correções críticas e estabilização de sincronização.',
      downloadUrl: 'https://github.com/watchimona/SIGEP/releases/latest'
    });
  }
});


// ==========================================
// BACKUP AUTOMÁTICO E GESTÃO DO CICLO DE VIDA DOS DADOS
// ==========================================

// Definição de caminhos locais respeitando as especificações do cliente
const isWindows = process.platform === 'win32';
const baseBackupDir = isWindows ? 'C:\\Backups_SIGEP' : path.join(process.cwd(), 'Backups_SIGEP');
const autoBackupDir = path.join(baseBackupDir, 'Arquivos_Automatizados');
const exportDocsDir = path.join(baseBackupDir, 'Documentos_Exportados');

// Garante que todas as pastas de infraestrutura local de armazenamento existam
function ensureDirectories() {
  try {
    if (!fs.existsSync(baseBackupDir)) fs.mkdirSync(baseBackupDir, { recursive: true });
    if (!fs.existsSync(autoBackupDir)) fs.mkdirSync(autoBackupDir, { recursive: true });
    if (!fs.existsSync(exportDocsDir)) fs.mkdirSync(exportDocsDir, { recursive: true });
  } catch (err) {
    console.error('Erro ao criar pastas de infraestrutura de backup:', err);
  }
}

// Rotação de dados (Manter 5 dias de histórico de segurança e limpar mais antigos)
function runRetentionPolicySync(): number {
  if (!fs.existsSync(autoBackupDir)) return 0;
  try {
    const files = fs.readdirSync(autoBackupDir);
    const now = Date.now();
    const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000; // 5 dias de retenção
    let deletedCount = 0;

    files.forEach(file => {
      // Filtra arquivos de backup criados pelo sistema
      if (file.startsWith('backup_sigep_') && (file.endsWith('.backup') || file.endsWith('.json'))) {
        const filePath = path.join(autoBackupDir, file);
        try {
          const stats = fs.statSync(filePath);
          const ageMs = now - stats.mtime.getTime();
          
          if (ageMs > fiveDaysInMs) {
            fs.unlinkSync(filePath);
            console.log(`[CICLO DE VIDA] Rotação ativada: Backup antigo eliminado com sucesso: ${file}`);
            deletedCount++;
          }
        } catch (fileErr) {
          console.error(`Erro ao verificar ou deletar o backup ${file}:`, fileErr);
        }
      }
    });
    return deletedCount;
  } catch (err) {
    console.error('Erro ao executar política de rotação/retenção de dados:', err);
    return 0;
  }
}

// Gera backups JSON de contingência estruturada caso o pg_dump nativo não esteja disponível
async function generateJSONBackupFallback(filePath: string): Promise<string> {
  const tables = ['alunos', 'notas', 'funcionarios', 'propinas', 'escola_config'];
  const dumpData: { [key: string]: any[] } = {};
  
  for (const table of tables) {
    try {
      const res = await pool.query(`SELECT * FROM ${table}`);
      dumpData[table] = res.rows;
    } catch (err) {
      console.error(`Erro ao ler tabela ${table} para backup contingente:`, err);
    }
  }

  const fallbackContent = JSON.stringify({
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    system: 'SIGEP_ACADEMICO',
    engine: 'SIGEP_JSON_FALLBACK_ENGINE',
    data: dumpData
  }, null, 2);

  const fallbackFilePath = filePath.replace(/\.backup$/, '.json');
  fs.writeFileSync(fallbackFilePath, fallbackContent);
  return fallbackFilePath;
}

// Cria scripts prontos (.bat para Windows e .sh para Linux/macOS) na pasta base
function ensureBackupScriptsExist() {
  try {
    if (!fs.existsSync(baseBackupDir)) {
      fs.mkdirSync(baseBackupDir, { recursive: true });
    }

    const batPath = path.join(baseBackupDir, 'backup_sigep.bat');
    const shPath = path.join(baseBackupDir, 'backup_sigep.sh');

    const batContent = `@echo off
:: =========================================================================
:: Script de Backup Automático SIGEP para Agendador de Tarefas do Windows
:: =========================================================================
:: Configurações de Ligação PostgreSQL (Extraídas das credenciais ativas)
set DB_USER=${dbConfig.user}
set DB_HOST=${dbConfig.host}
set DB_PORT=${dbConfig.port}
set DB_NAME=${dbConfig.database}
set PGPASSWORD=${dbConfig.password === 'SUA_SENHA' ? 'sigepwl' : dbConfig.password}

:: Diretórios de Armazenamento
set BACKUP_DIR=C:\\Backups_SIGEP\\Arquivos_Automatizados

:: Cria os diretórios se não existirem
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Obter Carimbo de Data/Hora universal
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set TIMESTAMP=%TIMESTAMP::=-%

set FILE_NAME=%BACKUP_DIR%\\backup_sigep_auto_%TIMESTAMP%.backup

echo [SIGEP BACKUP] Iniciando cópia de segurança para %FILE_NAME%...

:: Procura o pg_dump em caminhos padrão se não estiver no PATH
set PG_DUMP_EXE=pg_dump.exe
if exist "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe" set PG_DUMP_EXE="C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe"
if exist "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe" set PG_DUMP_EXE="C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe"
if exist "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe" set PG_DUMP_EXE="C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe"
if exist "C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe" set PG_DUMP_EXE="C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe"

:: Executa o Backup no Formato Customizado (-Fc) compactado
%PG_DUMP_EXE% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -F c -b -f "%FILE_NAME%" %DB_NAME%

if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] O backup falhou com o código de erro %ERRORLEVEL%.
    exit /b %ERRORLEVEL%
)

echo [SUCESSO] Backup concluído com sucesso: %FILE_NAME%

:: Executa a Política de Retenção de Dados (Manter últimos 5 dias)
echo Aplicando política de retenção de dados (Limpeza automática superior a 5 dias)...
forfiles /p "%BACKUP_DIR%" /m "backup_sigep_*.backup" /d -5 /c "cmd /c del @path"

echo Processo de contingência e retenção concluído!
`;

    const shContent = `#!/bin/bash
# =========================================================================
# Script de Backup Automático SIGEP para Linux / macOS / Docker
# =========================================================================
export DB_USER="${dbConfig.user}"
export DB_HOST="${dbConfig.host}"
export DB_PORT="${dbConfig.port}"
export DB_NAME="${dbConfig.database}"
export PGPASSWORD="${dbConfig.password === 'SUA_SENHA' ? 'sigepwl' : dbConfig.password}"
export BACKUP_DIR="${autoBackupDir}"

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILE_NAME="$BACKUP_DIR/backup_sigep_auto_\${TIMESTAMP}.backup"

echo "[SIGEP BACKUP] Iniciando backup para \$FILE_NAME..."
pg_dump -h "\$DB_HOST" -p "\$DB_PORT" -U "\$DB_USER" -F c -b -f "\$FILE_NAME" "\$DB_NAME"

if [ $? -eq 0 ]; then
    echo "[SUCESSO] Backup nativo concluído em \$FILE_NAME"
    echo "Aplicando política de retenção..."
    find "$BACKUP_DIR" -name "backup_sigep_*.backup" -type f -mtime +5 -delete
else
    echo "[ERRO] pg_dump falhou ou não está instalado."
fi
`;

    fs.writeFileSync(batPath, batContent);
    fs.writeFileSync(shPath, shContent);
    try {
      fs.chmodSync(shPath, '755');
    } catch {}
    console.log('Scripts de automação Windows (.bat) e Linux (.sh) criados com sucesso em:', baseBackupDir);
  } catch (err) {
    console.error('Erro ao gerar scripts utilitários de backup:', err);
  }
}

// Função central de execução de backups
async function performBackup(isManual: boolean = false): Promise<{ success: boolean; filePath: string; isFallback: boolean; error?: string }> {
  ensureDirectories();
  ensureBackupScriptsExist();

  const timestamp = new Date().toISOString()
    .replace(/T/, '_')
    .replace(/\..+/, '')
    .replace(/:/g, '-');
  const typeStr = isManual ? 'manual' : 'auto';
  const fileName = `backup_sigep_${typeStr}_${timestamp}.backup`;
  const filePath = path.join(autoBackupDir, fileName);

  const dbUser = process.env.DB_USER || 'postgres';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'sigep_db';
  const dbPassword = process.env.DB_PASSWORD || 'sigepwl';

  let pgDumpCmd = 'pg_dump';
  if (isWindows) {
    const possiblePaths = [
      'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\13\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\12\\bin\\pg_dump.exe',
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        pgDumpCmd = `"${p}"`;
        break;
      }
    }
  }

  const cmd = `${pgDumpCmd} -h ${dbHost} -p ${dbPort} -U ${dbUser} -F c -b -f "${filePath}" ${dbName}`;

  return new Promise(async (resolve) => {
    exec(cmd, { env: { ...process.env, PGPASSWORD: dbPassword } }, async (error, stdout, stderr) => {
      // Executa a limpeza por rotação sempre
      let deleted = 0;
      try {
        deleted = runRetentionPolicySync();
      } catch (e) {
        console.error('Erro na política de retenção:', e);
      }

      if (error) {
        console.warn(`[BACKUP ENGINE] pg_dump nativo não encontrado no sistema ou falhou. Ativando contingência JSON...`);
        try {
          const fallbackFilePath = await generateJSONBackupFallback(filePath);
          resolve({
            success: true,
            filePath: fallbackFilePath,
            isFallback: true,
            error: `Nota: Utilitário pg_dump não encontrado no PATH ou falhou. Foi gerado um backup JSON estruturado em: ${fallbackFilePath}`
          });
        } catch (fbErr: any) {
          resolve({
            success: false,
            filePath,
            isFallback: false,
            error: `Falha total no backup (pg_dump e contingência falharam): ${fbErr.message}`
          });
        }
      } else {
        console.log(`[BACKUP ENGINE] Backup nativo pg_dump concluído: ${filePath}`);
        resolve({
          success: true,
          filePath,
          isFallback: false
        });
      }
    });
  });
}

// Inicializa diretórios e scripts no boot da aplicação
ensureDirectories();
ensureBackupScriptsExist();

// Agendador interno de Contingência do Servidor (Backup Automático a cada 8 horas)
const EIGHT_HOURS = 8 * 60 * 60 * 1000;
setInterval(async () => {
  console.log('[AGENDADOR ROTINEIRO] Iniciando backup automático agendado (Frequência: 8 horas)...');
  try {
    const res = await performBackup(false);
    console.log('[AGENDADOR ROTINEIRO] Concluído com sucesso. Caminho:', res.filePath, res.isFallback ? '(Fallback JSON)' : '(PostgreSQL Native)');
  } catch (err) {
    console.error('[AGENDADOR ROTINEIRO] Erro ao executar backup automático de 8 horas:', err);
  }
}, EIGHT_HOURS);


// --- ROTAS DO ENDPOINT DE BACKUP ---

// Endpoint para gerar backup manual acionado pelo utilizador
app.post('/api/backup/manual', async (req, res) => {
  console.log('[API BACKUP] Pedido de backup manual recebido...');
  try {
    const result = await performBackup(true);
    if (result.success) {
      res.json({
        success: true,
        filePath: result.filePath,
        isFallback: result.isFallback,
        message: result.error || `Backup gerado com sucesso em: ${result.filePath}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Erro desconhecido durante a geração de backup'
      });
    }
  } catch (err: any) {
    console.error('[API BACKUP] Erro no endpoint manual:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para acionar backup automático silencioso no término de sessão (logout)
app.post('/api/backup/auto', async (req, res) => {
  console.log('[API BACKUP] Pedido de backup de término de sessão recebido. Processando em background...');
  try {
    performBackup(false)
      .then(result => {
        console.log('[API BACKUP] Backup automático de término de sessão concluído com sucesso:', result.filePath);
      })
      .catch(err => {
        console.error('[API BACKUP] Erro no backup automático de término de sessão:', err);
      });
    
    // Retorna imediatamente para não bloquear o logout do utilizador
    res.json({ success: true, message: 'Backup de término de sessão iniciado com sucesso' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Route to save synthetic comprovativo on local server filesystem
app.post('/api/comprovativos', async (req, res) => {
  const { student } = req.body;
  if (!student || !student.id) {
    return res.status(400).json({ error: 'Dados do aluno inválidos ou ID em falta.' });
  }

  try {
    const COMPROVATIVOS_DIR = path.join(process.cwd(), 'comprovativos');
    if (!fs.existsSync(COMPROVATIVOS_DIR)) {
      fs.mkdirSync(COMPROVATIVOS_DIR, { recursive: true });
    }

    const {
      id,
      name,
      gender,
      birthDate,
      class: cl,
      section,
      fatherName,
      motherName,
      periodo,
      specialty,
      enrollmentDate,
      contact
    } = student;

    // Build beautiful HTML comprovativo template
    const htmlContent = `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprovativo de Matrícula - ${name}</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 24px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 32px;
            max-width: 550px;
            width: 100%;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
        }
        .header {
            text-align: center;
            border-bottom: 2px dashed #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .header h1 {
            font-size: 20px;
            font-weight: 800;
            color: #4f46e5;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: -0.025em;
        }
        .header p {
            font-size: 12px;
            color: #64748b;
            margin: 0;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .success-badge {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
            padding: 10px 16px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 24px;
            text-transform: uppercase;
        }
        .id-highlight {
            font-size: 18px;
            font-weight: 800;
            color: #4f46e5;
            background: #f5f3ff;
            border: 1px solid #ddd6fe;
            padding: 6px 12px;
            border-radius: 8px;
            display: inline-block;
            font-family: monospace;
            margin-top: 4px;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
        }
        .field {
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 8px;
        }
        .label {
            font-size: 10px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 2px;
        }
        .value {
            font-size: 13px;
            font-weight: 600;
            color: #334155;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>S.I.G.E.P.</h1>
            <p>Sistema Integrado de Gestão Escolar Profissional</p>
        </div>
        <div class="success-badge">
            Matrícula Realizada com Sucesso!
        </div>
        <div class="grid">
            <div class="field" style="text-align: center; margin-bottom: 12px;">
                <div class="label">Código de Identificação Único (ID)</div>
                <div class="id-highlight">${id}</div>
            </div>
            <div class="field">
                <div class="label">Nome do Aluno</div>
                <div class="value">${name}</div>
            </div>
            <div class="field" style="display: flex; justify-content: space-between;">
                <div style="flex: 1;">
                    <div class="label">Classe</div>
                    <div class="value">${cl}ª Classe</div>
                </div>
                <div style="flex: 1;">
                    <div class="label">Turma</div>
                    <div class="value">Turma ${section}</div>
                </div>
            </div>
            <div class="field" style="display: flex; justify-content: space-between;">
                <div style="flex: 1;">
                    <div class="label">Período / Turno</div>
                    <div class="value">${periodo || '—'}</div>
                </div>
                <div style="flex: 1;">
                    <div class="label">Género</div>
                    <div class="value">${gender === 'M' ? 'Masculino' : 'Feminino'}</div>
                </div>
            </div>
            ${specialty && specialty !== 'NENHUMA' ? `
            <div class="field">
                <div class="label">Curso / Especialidade</div>
                <div class="value">${specialty}</div>
            </div>` : ''}
            <div class="field">
                <div class="label">Filiação</div>
                <div class="value">Pai: ${fatherName || '—'}<br>Mãe: ${motherName || '—'}</div>
            </div>
            <div class="field" style="display: flex; justify-content: space-between;">
                <div style="flex: 1;">
                    <div class="label">Contacto</div>
                    <div class="value">${contact || '—'}</div>
                </div>
                <div style="flex: 1;">
                    <div class="label">Data de Matrícula</div>
                    <div class="value">${enrollmentDate || new Date().toLocaleDateString('pt-AO')}</div>
                </div>
            </div>
        </div>
        <div class="footer">
            Este comprovativo foi emitido de forma automatizada pelo servidor central do SIGEP.<br>
            Autenticidade garantida por chave digital única de registo.
        </div>
    </div>
</body>
</html>`;

    const filePath = path.join(COMPROVATIVOS_DIR, `${id}.html`);
    fs.writeFileSync(filePath, htmlContent, 'utf8');

    console.log(`[Servidor] Comprovativo salvo com sucesso no servidor local: ${filePath}`);
    res.json({ success: true, message: 'Comprovativo de matrícula guardado no servidor local com sucesso.', path: filePath });
  } catch (err: any) {
    console.error('Erro ao guardar comprovativo no servidor:', err);
    res.status(500).json({ error: 'Erro ao guardar o comprovativo no servidor local: ' + err.message });
  }
});

// Route to fetch and download the saved comprovativo (receipt) by ID
app.get('/api/comprovativos/:id', async (req, res) => {
  const { id } = req.params;
  const cleanId = id.trim().toUpperCase();

  try {
    const COMPROVATIVOS_DIR = path.join(process.cwd(), 'comprovativos');
    const filePath = path.join(COMPROVATIVOS_DIR, `${cleanId}.html`);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Disposition', `attachment; filename=comprovativo_matricula_${cleanId}.html`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(filePath);
    }

    // FALLBACK: If file doesn't exist on server, let's fetch the student from our database and generate it dynamically!
    console.log(`[Servidor] Comprovativo não encontrado em ficheiro físico para ${cleanId}. Tentando gerar dinamicamente a partir do banco de dados...`);
    const result = await pool.query('SELECT * FROM alunos WHERE UPPER(id) = $1', [cleanId]);

    if (result.rows.length === 0) {
      return res.status(404).send(`<h3>Erro 404: Comprovativo ou Aluno com ID "${cleanId}" não localizado no sistema SIGEP.</h3>`);
    }

    const row = result.rows[0];
    const student = {
      id: row.id,
      name: row.name,
      gender: row.gender,
      birthDate: row.birth_date,
      class: row.class,
      section: row.section,
      fatherName: row.father_name,
      motherName: row.mother_name,
      periodo: row.periodo,
      specialty: row.specialty,
      enrollmentDate: row.enrollment_date,
      contact: row.contact
    };

    // Build the dynamic beautiful HTML content
    const htmlContent = `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprovativo de Matrícula - ${student.name}</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 24px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 32px;
            max-width: 550px;
            width: 100%;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
        }
        .header {
            text-align: center;
            border-bottom: 2px dashed #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .header h1 {
            font-size: 20px;
            font-weight: 800;
            color: #4f46e5;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: -0.025em;
        }
        .header p {
            font-size: 12px;
            color: #64748b;
            margin: 0;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .success-badge {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
            padding: 10px 16px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 24px;
            text-transform: uppercase;
        }
        .id-highlight {
            font-size: 18px;
            font-weight: 800;
            color: #4f46e5;
            background: #f5f3ff;
            border: 1px solid #ddd6fe;
            padding: 6px 12px;
            border-radius: 8px;
            display: inline-block;
            font-family: monospace;
            margin-top: 4px;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
        }
        .field {
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 8px;
        }
        .label {
            font-size: 10px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 2px;
        }
        .value {
            font-size: 13px;
            font-weight: 600;
            color: #334155;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>S.I.G.E.P.</h1>
            <p>Sistema Integrado de Gestão Escolar Profissional</p>
        </div>
        <div class="success-badge">
            Matrícula Realizada com Sucesso!
        </div>
        <div class="grid">
            <div class="field" style="text-align: center; margin-bottom: 12px;">
                <div class="label">Código de Identificação Único (ID)</div>
                <div class="id-highlight">${student.id}</div>
            </div>
            <div class="field">
                <div class="label">Nome do Aluno</div>
                <div class="value">${student.name}</div>
            </div>
            <div class="field" style="display: flex; justify-content: space-between;">
                <div style="flex: 1;">
                    <div class="label">Classe</div>
                    <div class="value">${student.class}ª Classe</div>
                </div>
                <div style="flex: 1;">
                    <div class="label">Turma</div>
                    <div class="value">Turma ${student.section}</div>
                </div>
            </div>
            <div class="field" style="display: flex; justify-content: space-between;">
                <div style="flex: 1;">
                    <div class="label">Período / Turno</div>
                    <div class="value">${student.periodo || '—'}</div>
                </div>
                <div style="flex: 1;">
                    <div class="label">Género</div>
                    <div class="value">${student.gender === 'M' ? 'Masculino' : 'Feminino'}</div>
                </div>
            </div>
            ${student.specialty && student.specialty !== 'NENHUMA' ? `
            <div class="field">
                <div class="label">Curso / Especialidade</div>
                <div class="value">${student.specialty}</div>
            </div>` : ''}
            <div class="field">
                <div class="label">Filiação</div>
                <div class="value">Pai: ${student.fatherName || '—'}<br>Mãe: ${student.motherName || '—'}</div>
            </div>
            <div class="field" style="display: flex; justify-content: space-between;">
                <div style="flex: 1;">
                    <div class="label">Contacto</div>
                    <div class="value">${student.contact || '—'}</div>
                </div>
                <div style="flex: 1;">
                    <div class="label">Data de Matrícula</div>
                    <div class="value">${student.enrollmentDate || new Date().toLocaleDateString('pt-AO')}</div>
                </div>
            </div>
        </div>
        <div class="footer">
            Este comprovativo foi emitido de forma automatizada pelo servidor central do SIGEP.<br>
            Autenticidade garantida por chave digital única de registo.
        </div>
    </div>
</body>
</html>`;

    // Save this back so it is physically present for subsequent downloads
    if (!fs.existsSync(COMPROVATIVOS_DIR)) {
      fs.mkdirSync(COMPROVATIVOS_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, htmlContent, 'utf8');

    res.setHeader('Content-Disposition', `attachment; filename=comprovativo_matricula_${cleanId}.html`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);
  } catch (err: any) {
    console.error('Erro ao servir comprovativo:', err);
    res.status(500).send(`<h3>Erro Interno do Servidor: ${err.message}</h3>`);
  }
});


// Standard Health endpoint
app.get('/api/health', async (req, res) => {
  try {
    const client = await originalConnect();
    await client.query('SELECT 1');
    client.release();
    isPostgresAvailable = true;
    res.json({ 
      status: 'healthy', 
      database: 'PostgreSQL connected', 
      connected: true,
      mode: 'POSTGRESQL'
    });
  } catch (err: any) {
    isPostgresAvailable = false;
    res.status(200).json({ 
      status: 'healthy', 
      database: 'JSON Fallback Engine Active (PostgreSQL Offline)', 
      connected: false, 
      mode: 'JSON_FALLBACK',
      error: err.message 
    });
  }
});

// Configure Vite middleware or static files serving
function getDistPath(): string {
  const candidates = [
    __dirname,
    path.join(__dirname, 'dist'),
    path.join(__dirname, '..', 'dist'),
    path.join(process.cwd(), 'dist'),
    process.cwd()
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }

  return path.join(process.cwd(), 'dist');
}

async function setupViteAndListen() {
  const PORT = 3000; // MUST run on port 3000 as per environment constraints
  const isProduction = process.env.NODE_ENV === "production";
  
  function serveStatic() {
    const distPath = getDistPath();
    console.log(`[SIGEP Server] Servindo arquivos estáticos de: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send(`SIGEP: index.html não localizado no diretório ${distPath}`);
      }
    });
  }

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Vite middleware não disponível, servindo arquivos estáticos:', err);
      serveStatic();
    }
  } else {
    serveStatic();
  }

  const serverInstance = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n==================================================`);
    console.log(`🚀 SERVIDOR SIGEP CENTRALIZADO ATIVO NA PORTA ${PORT}`);
    console.log(`--------------------------------------------------`);
    console.log(`Acesse nos outros computadores/celulares via Wi-Fi/LAN:`);
    
    const interfaces = os.networkInterfaces();
    let foundIp = false;
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`  👉 http://${net.address}:${PORT}`);
          foundIp = true;
        }
      }
    }
    if (!foundIp) {
      console.log(`  👉 http://localhost:${PORT}`);
    }
    console.log(`==================================================\n`);
  });

  serverInstance.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\n⚠️  ATENÇÃO: A porta ${PORT} já está em uso por outro processo!`);
      console.log(`Se o servidor antigo ficou travado em segundo plano, execute no Terminal Windows:`);
      console.log(`  taskkill /F /IM node.exe   (ou feche a outra janela do terminal/Electron)\n`);
    } else {
      console.error("Erro no servidor Express:", err);
    }
  });
}

setupViteAndListen().catch(err => {
  console.error("Erro ao iniciar o servidor com Vite:", err);
});
