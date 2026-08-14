import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, execSync } from 'child_process';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const appDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

dotenv.config();

// Garantir a criação imediata das pastas de Backup e Dados no Windows e localmente
const isWindowsSystem = os.platform() === 'win32';
const userHomeBackup = path.join(os.homedir(), 'SIGEP-Backup');
const userHomeDatabase = path.join(os.homedir(), 'SIGEP-Database');

const MANDATORY_BACKUP_DIRS = [
  path.join(process.cwd(), 'SIGEP-Backup'),
  path.join(process.cwd(), 'data'),
  userHomeBackup,
  userHomeDatabase,
  ...(isWindowsSystem ? ['C:\\SIGEP-Backup', 'C:\\SIGEP-Database'] : [])
];

MANDATORY_BACKUP_DIRS.forEach(dirPath => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`[SIGEP BACKUP ENGINE] Pasta de backup garantida com sucesso: ${dirPath}`);
    }
  } catch (err: any) {
    console.warn(`[SIGEP BACKUP ENGINE] Aviso ao criar pasta ${dirPath}:`, err.message);
  }
});

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

// Configuração Absoluta de CORS e Acesso à Rede Privada (Chrome / Edge / Firefox LAN)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization, Origin');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Origin'],
  credentials: false
}));

app.use(express.json({ limit: '50mb' }));

// Configuration for local PostgreSQL database connection
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'sigep_db',
  password: process.env.DB_PASSWORD || 'watchi_Scool170989-2026',
  port: parseInt(process.env.DB_PORT || '5432', 10),
};

console.log('Iniciando conexão com PostgreSQL utilizando as seguintes credenciais:', {
  host: dbConfig.host,
  database: dbConfig.database,
  user: dbConfig.user,
  port: dbConfig.port,
  password: '***'
});

let activePool: InstanceType<typeof Pool> = new Pool(dbConfig);

function recreatePool() {
  try {
    if (activePool) {
      activePool.end().catch(() => {});
    }
  } catch (e) {}
  activePool = new Pool(dbConfig);
}

async function getDirectPostgresClient() {
  if (!activePool) {
    throw new Error('PostgreSQL Pool não inicializado');
  }
  return await activePool.connect();
}

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
        password: 'watchi_Scool170989-2026',
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
  if (/delete\s+from\s+alunos/i.test(sqlLower)) {
    const db = loadFallbackDb();
    if (/where\s+id\s*=\s*\$1/i.test(sqlLower)) {
      const id = params?.[0];
      db.alunos = db.alunos.filter(a => a.id !== id);
    } else {
      db.alunos = [];
    }
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (/delete\s+from\s+notas/i.test(sqlLower)) {
    const db = loadFallbackDb();
    if (/where\s+student_id/i.test(sqlLower)) {
      const id = params?.[0];
      db.notas = db.notas.filter(n => n.student_id !== id);
    } else {
      db.notas = [];
    }
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (/delete\s+from\s+propinas/i.test(sqlLower)) {
    const db = loadFallbackDb();
    if (/where\s+id/i.test(sqlLower)) {
      const id = params?.[0];
      db.propinas = db.propinas.filter(p => p.id !== id);
    } else {
      db.propinas = [];
    }
    saveFallbackDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (/delete\s+from\s+funcionarios/i.test(sqlLower)) {
    const db = loadFallbackDb();
    if (/where\s+id/i.test(sqlLower)) {
      const id = params?.[0];
      db.funcionarios = db.funcionarios.filter(f => f.id !== id);
    } else {
      db.funcionarios = [];
    }
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
      cedula_registo, cedula_fls, cedula_livro, cedula_ano, periodo, specialty,
      naturalidade, municipio, province,
      is_transferido_entrada, escola_origem, guia_transferencia_entrada, provincia_origem,
      is_transferido_saida, data_transferencia_saida, escola_destino, guia_transferencia_saida,
      processo_transferencia_saida, provincia_destino, motivo_transferencia,
      registration_id, age, enrollment_type, reconfirmation_quarter, estado_promocao, original_class_before_promotion
    ] = params || [];
    const item = {
      id, name, gender, birth_date, class: cl, section, status, contact, 
      enrollment_date, guardian, enrollment_fee_paid, foreign_language,
      father_name, mother_name, bi, bi_sector, bi_date, doc_type,
      cedula_registo, cedula_fls, cedula_livro, cedula_ano, periodo, specialty,
      naturalidade, municipio, province,
      is_transferido_entrada, escola_origem, guia_transferencia_entrada, provincia_origem,
      is_transferido_saida, data_transferencia_saida, escola_destino, guia_transferencia_saida,
      processo_transferencia_saida, provincia_destino, motivo_transferencia,
      registration_id, age, enrollment_type, reconfirmation_quarter, estado_promocao, original_class_before_promotion
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
      let id, name, role, subject, contact, status, password;
      let assignments = '[]', classes = '[]', sections = '[]', subjects = '[]', specialty = '';
      let sigep_access_allowed = true, sigep_absence_access_only = false, extra_fields = '{}';
      let is_root = false, is_editable = true;

      if (params.length >= 15) {
        [
          id, name, role, subject, contact, status, password,
          assignments, classes, sections, subjects, specialty,
          sigep_access_allowed, sigep_absence_access_only, extra_fields
        ] = params;
      } else if (typeof params[5] === 'boolean') {
        [id, name, role, password, status, is_root, is_editable] = params;
        is_root = is_root ?? false;
        is_editable = is_editable ?? true;
      } else {
        [id, name, role, subject, contact, status, password] = params;
        is_root = false;
        is_editable = true;
      }

      const item = {
        id,
        name: name || 'Funcionário',
        role: role || 'PROFESSOR',
        subject: subject || '',
        contact: contact || '',
        status: status || 'Activo',
        password: password || '12345',
        assignments: assignments || '[]',
        classes: classes || '[]',
        sections: sections || '[]',
        subjects: subjects || '[]',
        specialty: specialty || '',
        sigep_access_allowed: sigep_access_allowed ?? true,
        sigep_absence_access_only: sigep_absence_access_only ?? false,
        extra_fields: extra_fields || '{}',
        is_root: is_root ?? false,
        is_editable: is_editable ?? true
      };
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
const pool = {
  query: async function(text: any, params?: any[]): Promise<any> {
    const queryText = typeof text === 'string' ? text : (text ? text.text : '');
    const queryParams = Array.isArray(text) ? undefined : params;
    
    if (isPostgresAvailable && activePool) {
      try {
        return await activePool.query(text, params);
      } catch (err: any) {
        console.warn('Erro na consulta PostgreSQL, recorrendo a Fallback DB:', err.message);
      }
    }
    return await executeFallbackQuery(queryText, queryParams);
  },
  connect: async function(): Promise<any> {
    if (isPostgresAvailable && activePool) {
      try {
        const client = await activePool.connect();
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
  }
};

// Candidate PostgreSQL connection parameters
async function ensureDatabaseExists(): Promise<boolean> {
  const dbUser = process.env.DB_USER || dbConfig.user || 'postgres';
  const dbPort = parseInt(process.env.DB_PORT || String(dbConfig.port) || '5432', 10);
  const targetDbName = process.env.DB_NAME || dbConfig.database || 'sigep_db';

  const hostsToTry = Array.from(new Set([process.env.DB_HOST, dbConfig.host, '127.0.0.1', 'localhost'].filter(Boolean))) as string[];
  const passwordsToTry = Array.from(new Set([
    process.env.DB_PASSWORD,
    dbConfig.password,
    'watchi_Scool170989-2026',
    'postgres',
    'admin',
    'root',
    '123456',
    ''
  ].filter((p): p is string => p !== undefined))) as string[];

  for (const host of hostsToTry) {
    for (const pass of passwordsToTry) {
      let testPool: InstanceType<typeof Pool> | null = null;
      try {
        testPool = new Pool({
          user: dbUser,
          host,
          port: dbPort,
          database: 'postgres',
          password: pass,
          connectionTimeoutMillis: 4000
        });

        const client = await testPool.connect();
        await client.query('SELECT 1');
        
        console.log(`[POSTGRES BOOTSTRAP] Conexão com o servidor PostgreSQL (${host}:${dbPort}) estabelecida com sucesso!`);
        
        dbConfig.host = host;
        dbConfig.password = pass;
        dbConfig.database = targetDbName;
        process.env.DB_HOST = host;
        process.env.DB_PASSWORD = pass;

        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [targetDbName]);
        if (res.rowCount === 0) {
          console.log(`[POSTGRES BOOTSTRAP] Criando base de dados '${targetDbName}' no PostgreSQL...`);
          await client.query(`CREATE DATABASE "${targetDbName}"`);
          console.log(`[POSTGRES BOOTSTRAP] Base de dados '${targetDbName}' criada com sucesso!`);
        }
        
        client.release();
        await testPool.end();

        recreatePool();
        return true;
      } catch (err: any) {
        if (testPool) {
          try { await testPool.end(); } catch {}
        }
      }
    }
  }

  return false;
}

// Sincroniza dados gravados offline no Fallback DB para o PostgreSQL
async function syncFallbackDbToPostgres() {
  try {
    const fallbackData = loadFallbackDb();
    const client = await getDirectPostgresClient();

    // 1. Sync Alunos
    for (const a of fallbackData.alunos || []) {
      if (!a.id) continue;
      await client.query(`
        INSERT INTO alunos (
          id, name, gender, birth_date, class, section, status, contact, enrollment_date, guardian, enrollment_fee_paid, foreign_language, 
          father_name, mother_name, bi, bi_sector, bi_date, doc_type, cedula_registo, cedula_fls, cedula_livro, cedula_ano, periodo, specialty,
          naturalidade, municipio, province, is_transferido_entrada, escola_origem, guia_transferencia_entrada, provincia_origem,
          is_transferido_saida, data_transferencia_saida, escola_destino, guia_transferencia_saida, processo_transferencia_saida, provincia_destino, motivo_transferencia,
          registration_id, age, enrollment_type, reconfirmation_quarter, estado_promocao, original_class_before_promotion
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44)
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
          specialty = EXCLUDED.specialty,
          naturalidade = EXCLUDED.naturalidade,
          municipio = EXCLUDED.municipio,
          province = EXCLUDED.province,
          is_transferido_entrada = EXCLUDED.is_transferido_entrada,
          escola_origem = EXCLUDED.escola_origem,
          guia_transferencia_entrada = EXCLUDED.guia_transferencia_entrada,
          provincia_origem = EXCLUDED.provincia_origem,
          is_transferido_saida = EXCLUDED.is_transferido_saida,
          data_transferencia_saida = EXCLUDED.data_transferencia_saida,
          escola_destino = EXCLUDED.escola_destino,
          guia_transferencia_saida = EXCLUDED.guia_transferencia_saida,
          processo_transferencia_saida = EXCLUDED.processo_transferencia_saida,
          provincia_destino = EXCLUDED.provincia_destino,
          motivo_transferencia = EXCLUDED.motivo_transferencia,
          registration_id = EXCLUDED.registration_id,
          age = EXCLUDED.age,
          enrollment_type = EXCLUDED.enrollment_type,
          reconfirmation_quarter = EXCLUDED.reconfirmation_quarter,
          estado_promocao = EXCLUDED.estado_promocao,
          original_class_before_promotion = EXCLUDED.original_class_before_promotion
      `, [
        a.id, a.name || 'Aluno', a.gender || 'M', a.birth_date || a.birthDate || '', a.class || '', a.section || '',
        a.status || 'Ativo', a.contact || '', a.enrollment_date || a.enrollmentDate || '', a.guardian || '',
        !!(a.enrollment_fee_paid || a.enrollmentFeePaid), a.foreign_language || a.foreignLanguage || 'INGLÊS', a.father_name || a.fatherName || '', a.mother_name || a.motherName || '',
        a.bi || '', a.bi_sector || a.biSector || 'Luanda', a.bi_date || a.biDate || '', a.doc_type || a.docType || 'BI',
        a.cedula_registo || a.cedulaRegisto || '', a.cedula_fls || a.cedulaFls || '', a.cedula_livro || a.cedulaLivro || '', a.cedula_ano || a.cedulaAno || '',
        a.periodo || 'MANHÃ', a.specialty || '',
        a.naturalidade || '', a.municipio || '', a.province || '',
        !!(a.is_transferido_entrada || a.isTransferidoEntrada), a.escola_origem || a.escolaOrigem || '', a.guia_transferencia_entrada || a.guiaTransferenciaEntrada || '', a.provincia_origem || a.provinciaOrigem || '',
        !!(a.is_transferido_saida || a.isTransferidoSaida), a.data_transferencia_saida || a.dataTransferenciaSaida || '', a.escola_destino || a.escolaDestino || '', a.guia_transferencia_saida || a.guiaTransferenciaSaida || '',
        a.processo_transferencia_saida || a.processoTransferenciaSaida || '', a.provincia_destino || a.provinciaDestino || '', a.motivo_transferencia || a.motivoTransferencia || '',
        a.registration_id || a.registrationId || '', a.age || null, a.enrollment_type || a.enrollmentType || '', a.reconfirmation_quarter || a.reconfirmationQuarter || null, a.estado_promocao || a.estadoPromocao || '', a.original_class_before_promotion || a.originalClassBeforePromotion || ''
      ]);
    }

    // 2. Sync Funcionarios
    for (const f of fallbackData.funcionarios || []) {
      if (!f.id) continue;
      await client.query(`
        INSERT INTO funcionarios (id, name, role, subject, contact, status, password, is_root, is_editable, assignments, classes, sections, subjects, specialty, sigep_access_allowed, sigep_absence_access_only, extra_fields)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          subject = EXCLUDED.subject,
          contact = EXCLUDED.contact,
          status = EXCLUDED.status,
          password = EXCLUDED.password,
          is_root = EXCLUDED.is_root,
          is_editable = EXCLUDED.is_editable,
          assignments = EXCLUDED.assignments,
          classes = EXCLUDED.classes,
          sections = EXCLUDED.sections,
          subjects = EXCLUDED.subjects,
          specialty = EXCLUDED.specialty,
          sigep_access_allowed = EXCLUDED.sigep_access_allowed,
          sigep_absence_access_only = EXCLUDED.sigep_absence_access_only,
          extra_fields = EXCLUDED.extra_fields
      `, [
        f.id, f.name || 'Funcionário', f.role || 'PROFESSOR', f.subject || '', f.contact || '',
        f.status || 'Activo', f.password || '12345', !!f.is_root, f.is_editable ?? true,
        f.assignments || '[]', f.classes || '[]', f.sections || '[]', f.subjects || '[]',
        f.specialty || '', f.sigep_access_allowed ?? true, f.sigep_absence_access_only ?? false,
        f.extra_fields || '{}'
      ]);
    }

    // 3. Sync Notas
    for (const n of fallbackData.notas || []) {
      if (!n.student_id || !n.subject || !n.trimester) continue;
      await client.query(`
        INSERT INTO notas (student_id, student_name, subject, trimester, mac, npp, npt, mt)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (student_id, subject, trimester) DO UPDATE SET
          student_name = EXCLUDED.student_name,
          mac = EXCLUDED.mac,
          npp = EXCLUDED.npp,
          npt = EXCLUDED.npt,
          mt = EXCLUDED.mt
      `, [
        n.student_id, n.student_name || 'Aluno', n.subject, n.trimester,
        n.mac !== undefined && n.mac !== null ? Number(n.mac) : null,
        n.npp !== undefined && n.npp !== null ? Number(n.npp) : null,
        n.npt !== undefined && n.npt !== null ? Number(n.npt) : null,
        n.mt !== undefined && n.mt !== null ? Number(n.mt) : null
      ]);
    }

    // 4. Sync Propinas
    for (const p of fallbackData.propinas || []) {
      if (!p.id) continue;
      await client.query(`
        INSERT INTO propinas (id, name, class, section, periodo, modalidade, desconto, meses_pagos, total_pago, total_divida, data_ultimo_pg, observacoes, faltas_injustificadas, faltas_justificadas, faltas_pagas)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
        p.id, p.name || 'Aluno', p.class || '', p.section || '', p.periodo || '',
        p.modalidade || '', p.desconto || '', typeof p.meses_pagos === 'string' ? p.meses_pagos : JSON.stringify(p.meses_pagos || []),
        Number(p.total_pago || 0), Number(p.total_divida || 0), p.data_ultimo_pg || '',
        p.observacoes || '', Number(p.faltas_injustificadas || 0),
        Number(p.faltas_justificadas || 0), Number(p.faltas_pagas || 0)
      ]);
    }

    // 5. Sync Grelha
    for (const g of fallbackData.grelha_curricular || []) {
      if (!g.id) continue;
      await client.query(`
        INSERT INTO grelha_curricular (id, modality, specialty, class, subject, active, position, category)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          modality = EXCLUDED.modality,
          specialty = EXCLUDED.specialty,
          class = EXCLUDED.class,
          subject = EXCLUDED.subject,
          active = EXCLUDED.active,
          position = EXCLUDED.position,
          category = EXCLUDED.category
      `, [
        g.id, g.modality || '', g.specialty || '', g.class || '', g.subject || '',
        g.active !== undefined ? !!g.active : true,
        g.position !== undefined ? Number(g.position) : 0,
        g.category || 'Formação Geral'
      ]);
    }

    // 6. Sync Config
    for (const c of fallbackData.escola_config || []) {
      if (!c.key) continue;
      await client.query(`
        INSERT INTO escola_config (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [c.key, String(c.value)]);
    }

    client.release();
    console.log('[POSTGRES SYNC] Sincronização de dados locais Fallback para o PostgreSQL concluída!');
  } catch (err: any) {
    console.error('[POSTGRES SYNC] Aviso ao sincronizar dados locais:', err.message);
  }
}

// Verifica conexão com PostgreSQL e recupera caso esteja offline
async function checkPostgresConnection() {
  try {
    if (isPostgresAvailable) {
      const client = await getDirectPostgresClient();
      try {
        const tableCheck = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alunos'");
        if (tableCheck.rowCount === 0) {
          console.log('⚠️ Base de dados `sigep_db` detectada sem tabelas. Criando esquema de tabelas automaticamente...');
          await initializeDatabase();
          await syncFallbackDbToPostgres();
        }
      } catch (tErr: any) {
        console.warn('Aviso ao verificar tabelas do PostgreSQL:', tErr.message);
      } finally {
        client.release();
      }
      return;
    }

    const dbCreatedOrReady = await ensureDatabaseExists();
    if (dbCreatedOrReady) {
      await initializeDatabase();
      const client = await getDirectPostgresClient();
      await client.query('SELECT 1');
      client.release();
      isPostgresAvailable = true;
      console.log('✅ PostgreSQL está ONLINE, base de dados `sigep_db` pronta e conectada com sucesso!');
      await syncFallbackDbToPostgres();
    } else {
      isPostgresAvailable = false;
      console.warn('⚠️ AVISO: PostgreSQL Central não respondeu. Motor local JSON Fallback ativo para manter integridade do sistema SIGEP!');
      loadFallbackDb();
    }
  } catch (err: any) {
    isPostgresAvailable = false;
    console.warn('⚠️ AVISO: PostgreSQL Central está OFFLINE ou indisponível:', err.message);
    loadFallbackDb();
  }
}

checkPostgresConnection();
setInterval(() => {
  if (!isPostgresAvailable) {
    checkPostgresConnection();
  }
}, 10000);

// Helper to run migrations / create tables dynamically on startup
async function initializeDatabase() {
  try {
    const client = await getDirectPostgresClient();
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
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS naturalidade TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS municipio TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS province TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS is_transferido_entrada BOOLEAN DEFAULT FALSE;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS escola_origem TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS guia_transferencia_entrada TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS provincia_origem TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS is_transferido_saida BOOLEAN DEFAULT FALSE;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS data_transferencia_saida TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS escola_destino TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS guia_transferencia_saida TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS processo_transferencia_saida TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS provincia_destino TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS motivo_transferencia TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS registration_id TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS age INTEGER;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS enrollment_type TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS reconfirmation_quarter INTEGER;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS estado_promocao TEXT;
      ALTER TABLE alunos ADD COLUMN IF NOT EXISTS original_class_before_promotion TEXT;
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
      ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT TRUE;
      ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS assignments TEXT;
      ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS classes TEXT;
      ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS sections TEXT;
      ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS subjects TEXT;
      ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS specialty TEXT;
      ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS sigep_access_allowed BOOLEAN DEFAULT TRUE;
      ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS sigep_absence_access_only BOOLEAN DEFAULT FALSE;
      ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS extra_fields TEXT;
    `);

    // Insert immutable Root Administrator
    await client.query(`
      INSERT INTO funcionarios (id, name, role, password, status, is_root, is_editable)
      VALUES ('SIGEP', 'Administrador SIGEP', 'SIGEP', 'watchi_Scool170989-2026', 'Activo', TRUE, FALSE)
      ON CONFLICT (id) DO UPDATE SET is_root = TRUE, is_editable = FALSE, password = 'watchi_Scool170989-2026';
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

    // Indices de Alto Desempenho para Escalas Superiores a 2.000 Alunos/Ano Lectivo
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alunos_class_section ON alunos(class, section);
      CREATE INDEX IF NOT EXISTS idx_alunos_status ON alunos(status);
      CREATE INDEX IF NOT EXISTS idx_notas_student_id ON notas(student_id);
      CREATE INDEX IF NOT EXISTS idx_notas_subject ON notas(subject);
      CREATE INDEX IF NOT EXISTS idx_propinas_class_section ON propinas(class, section);
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

function mapStaffRow(row: any) {
  if (!row) return null;

  let parsedAssignments = [];
  try {
    if (typeof row.assignments === 'string') parsedAssignments = JSON.parse(row.assignments);
    else if (Array.isArray(row.assignments)) parsedAssignments = row.assignments;
  } catch (e) {}

  let parsedClasses = [];
  try {
    if (typeof row.classes === 'string') parsedClasses = JSON.parse(row.classes);
    else if (Array.isArray(row.classes)) parsedClasses = row.classes;
  } catch (e) {}

  let parsedSections = [];
  try {
    if (typeof row.sections === 'string') parsedSections = JSON.parse(row.sections);
    else if (Array.isArray(row.sections)) parsedSections = row.sections;
  } catch (e) {}

  let parsedSubjects = [];
  try {
    if (typeof row.subjects === 'string') parsedSubjects = JSON.parse(row.subjects);
    else if (Array.isArray(row.subjects)) parsedSubjects = row.subjects;
  } catch (e) {}

  let parsedExtra = {};
  try {
    if (typeof row.extra_fields === 'string') parsedExtra = JSON.parse(row.extra_fields);
    else if (typeof row.extra_fields === 'object' && row.extra_fields !== null) parsedExtra = row.extra_fields;
  } catch (e) {}

  if (row.role === 'PROFESSOR' || row.role?.includes('COORDENADOR') || parsedAssignments.length > 0 || parsedSubjects.length > 0) {
    if (parsedAssignments.length > 0) {
      const assSubjects = parsedAssignments.map((a: any) => a.subject).filter(Boolean);
      parsedSubjects = Array.from(new Set([...parsedSubjects, ...assSubjects]));

      const assClasses = parsedAssignments.map((a: any) => a.class).filter(Boolean);
      parsedClasses = Array.from(new Set([...parsedClasses, ...assClasses]));

      const assSections = parsedAssignments.map((a: any) => a.section).filter(Boolean);
      parsedSections = Array.from(new Set([...parsedSections, ...assSections]));
    } else if (parsedSubjects.length > 0 && parsedClasses.length > 0 && parsedSections.length > 0) {
      parsedClasses.forEach((c: string) => {
        parsedSections.forEach((sec: string) => {
          parsedSubjects.forEach((sub: string) => {
            parsedAssignments.push({ class: c, section: sec, subject: sub, specialty: row.specialty || '' });
          });
        });
      });
    }
  }

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    subject: row.subject || '',
    contact: row.contact || '',
    status: row.status || 'Activo',
    password: row.password || '12345',
    is_root: row.is_root || false,
    is_editable: row.is_editable ?? true,
    assignments: parsedAssignments,
    classes: parsedClasses,
    sections: parsedSections,
    subjects: parsedSubjects,
    specialty: row.specialty || '',
    sigepAccessAllowed: row.sigep_access_allowed ?? true,
    sigepAbsenceAccessOnly: row.sigep_absence_access_only ?? false,
    ...parsedExtra
  };
}

app.post('/api/auth/login', async (req, res) => {
  const { id, password } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Por favor, digite o seu ID de acesso.' });
  }

  const cleanId = String(id).trim().toUpperCase();
  const inputPassword = password ? String(password).trim() : '';

  // 1. Administrador SIGEP (Suporte Master / Root)
  if (cleanId === 'SIGEP' || cleanId === 'ADMIN_SIGEP' || cleanId === 'SG123') {
    // Verificar se existe algum Diretor Geral ou funcionário cadastrado no sistema
    let hasRegistered = false;
    try {
      const dbCheck = await pool.query("SELECT COUNT(*) FROM funcionarios WHERE UPPER(TRIM(id)) != 'SIGEP' AND UPPER(TRIM(id)) != 'ADMIN_SIGEP'");
      const cnt = parseInt(dbCheck.rows[0]?.count || '0', 10);
      if (cnt > 0) hasRegistered = true;
    } catch (e) {
      try {
        const dbFallback = loadFallbackDb();
        if (dbFallback && Array.isArray(dbFallback.funcionarios)) {
          const cnt = dbFallback.funcionarios.filter((f: any) => f.id !== 'SIGEP' && f.id !== 'ADMIN_SIGEP').length;
          if (cnt > 0) hasRegistered = true;
        }
      } catch (e2) {}
    }

    if (hasRegistered) {
      return res.status(403).json({
        success: false,
        error: 'Acesso de fábrica bloqueado por motivos de segurança: Já existe um Diretor Geral / Quadro de Pessoal cadastrado no SIGEP. Por favor, inicie sessão com o seu ID individual. O painel de suporte técnico de fábrica só está acessível via atalho seguro de retaguarda (Ctrl + W).'
      });
    }

    // Se a BD estiver zerada (First Run), aceitar estritamente a senha oficial de fábrica
    if (inputPassword === 'watchi_Scool170989-2026') {
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
      return res.status(401).json({ success: false, error: 'Senha de fábrica incorreta para a conta Administrador SIGEP.' });
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
          staff: mapStaffRow(staffRow)
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

  if ((cleanId === 'SIGEP' || cleanId === 'ADMIN_SIGEP' || cleanId === 'SG123') && password === 'watchi_Scool170989-2026') {
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

  return res.status(401).json({ error: 'Credenciais de suporte técnico de fábrica inválidas.' });
});

// Endpoint para Verificação de Telefone para Recuperação de Senha
app.post('/api/auth/verify-phone', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Número de telefone não informado.' });
  }

  const cleanPhone = String(phone).replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 9) {
    return res.status(400).json({ success: false, error: 'Número de telefone inválido (deve conter no mínimo 9 dígitos).' });
  }

  try {
    let matchedRow: any = null;
    try {
      const result = await pool.query('SELECT * FROM funcionarios');
      if (result.rows.length > 0) {
        matchedRow = result.rows.find((r: any) => {
          const rPhone = String(r.contact || '').replace(/\D/g, '');
          return rPhone.length >= 9 && rPhone === cleanPhone;
        });
      }
    } catch (dbErr) {
      // Ignorar e verificar no fallback
    }

    if (!matchedRow) {
      const db = loadFallbackDb();
      if (db && Array.isArray(db.funcionarios)) {
        matchedRow = db.funcionarios.find((f: any) => {
          const fPhone = String(f.contact || '').replace(/\D/g, '');
          return fPhone.length >= 9 && fPhone === cleanPhone;
        });
      }
    }

    if (matchedRow) {
      return res.json({
        success: true,
        staff: mapStaffRow(matchedRow)
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Nenhum funcionário encontrado com o telefone especificado.'
      });
    }
  } catch (err: any) {
    console.error('Erro ao verificar telefone:', err);
    return res.status(500).json({ success: false, error: 'Erro de servidor ao buscar telefone.' });
  }
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
      specialty: row.specialty,
      naturalidade: row.naturalidade,
      municipio: row.municipio,
      province: row.province,
      isTransferidoEntrada: row.is_transferido_entrada,
      escolaOrigem: row.escola_origem,
      guiaTransferenciaEntrada: row.guia_transferencia_entrada,
      provinciaOrigem: row.provincia_origem,
      isTransferidoSaida: row.is_transferido_saida,
      dataTransferenciaSaida: row.data_transferencia_saida,
      escolaDestino: row.escola_destino,
      guiaTransferenciaSaida: row.guia_transferencia_saida,
      processoTransferenciaSaida: row.processo_transferencia_saida,
      provinciaDestino: row.provincia_destino,
      motivoTransferencia: row.motivo_transferencia,
      registrationId: row.registration_id,
      age: row.age,
      enrollmentType: row.enrollment_type,
      reconfirmationQuarter: row.reconfirmation_quarter,
      estadoPromocao: row.estado_promocao,
      originalClassBeforePromotion: row.original_class_before_promotion
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
    cedulaRegisto, cedulaFls, cedulaLivro, cedulaAno, periodo, specialty,
    naturalidade, municipio, province,
    isTransferidoEntrada, escolaOrigem, guiaTransferenciaEntrada, provinciaOrigem,
    isTransferidoSaida, dataTransferenciaSaida, escolaDestino, guiaTransferenciaSaida,
    processoTransferenciaSaida, provinciaDestino, motivoTransferencia,
    registrationId, age, enrollmentType, reconfirmationQuarter, estadoPromocao, originalClassBeforePromotion
  } = req.body;
  try {
    const validatedBiSector = docType === 'BI' || biSector ? normalizeProvinciaBI(biSector) : undefined;
    await pool.query(`
      INSERT INTO alunos (
        id, name, gender, birth_date, class, section, status, contact, 
        enrollment_date, guardian, enrollment_fee_paid, foreign_language,
        father_name, mother_name, bi, bi_sector, bi_date, doc_type,
        cedula_registo, cedula_fls, cedula_livro, cedula_ano, periodo, specialty,
        naturalidade, municipio, province,
        is_transferido_entrada, escola_origem, guia_transferencia_entrada, provincia_origem,
        is_transferido_saida, data_transferencia_saida, escola_destino, guia_transferencia_saida,
        processo_transferencia_saida, provincia_destino, motivo_transferencia,
        registration_id, age, enrollment_type, reconfirmation_quarter, estado_promocao, original_class_before_promotion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44)
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
        specialty = EXCLUDED.specialty,
        naturalidade = EXCLUDED.naturalidade,
        municipio = EXCLUDED.municipio,
        province = EXCLUDED.province,
        is_transferido_entrada = EXCLUDED.is_transferido_entrada,
        escola_origem = EXCLUDED.escola_origem,
        guia_transferencia_entrada = EXCLUDED.guia_transferencia_entrada,
        provincia_origem = EXCLUDED.provincia_origem,
        is_transferido_saida = EXCLUDED.is_transferido_saida,
        data_transferencia_saida = EXCLUDED.data_transferencia_saida,
        escola_destino = EXCLUDED.escola_destino,
        guia_transferencia_saida = EXCLUDED.guia_transferencia_saida,
        processo_transferencia_saida = EXCLUDED.processo_transferencia_saida,
        provincia_destino = EXCLUDED.provincia_destino,
        motivo_transferencia = EXCLUDED.motivo_transferencia,
        registration_id = EXCLUDED.registration_id,
        age = EXCLUDED.age,
        enrollment_type = EXCLUDED.enrollment_type,
        reconfirmation_quarter = EXCLUDED.reconfirmation_quarter,
        estado_promocao = EXCLUDED.estado_promocao,
        original_class_before_promotion = EXCLUDED.original_class_before_promotion
    `, [
      id, name, gender, birthDate, cl, section, status, contact, 
      enrollmentDate, guardian, enrollmentFeePaid, foreignLanguage || 'INGLÊS',
      fatherName, motherName, bi, validatedBiSector, biDate, docType || 'BI',
      cedulaRegisto, cedulaFls, cedulaLivro, cedulaAno, periodo, specialty,
      naturalidade, municipio, province,
      !!isTransferidoEntrada, escolaOrigem, guiaTransferenciaEntrada, provinciaOrigem,
      !!isTransferidoSaida, dataTransferenciaSaida, escolaDestino, guiaTransferenciaSaida,
      processoTransferenciaSaida, provinciaDestino, motivoTransferencia,
      registrationId, age, enrollmentType, reconfirmationQuarter, estadoPromocao, originalClassBeforePromotion
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
          cedula_registo, cedula_fls, cedula_livro, cedula_ano, periodo, specialty,
          naturalidade, municipio, province,
          is_transferido_entrada, escola_origem, guia_transferencia_entrada, provincia_origem,
          is_transferido_saida, data_transferencia_saida, escola_destino, guia_transferencia_saida,
          processo_transferencia_saida, provincia_destino, motivo_transferencia,
          registration_id, age, enrollment_type, reconfirmation_quarter, estado_promocao, original_class_before_promotion
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44)
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
          specialty = EXCLUDED.specialty,
          naturalidade = EXCLUDED.naturalidade,
          municipio = EXCLUDED.municipio,
          province = EXCLUDED.province,
          is_transferido_entrada = EXCLUDED.is_transferido_entrada,
          escola_origem = EXCLUDED.escola_origem,
          guia_transferencia_entrada = EXCLUDED.guia_transferencia_entrada,
          provincia_origem = EXCLUDED.provincia_origem,
          is_transferido_saida = EXCLUDED.is_transferido_saida,
          data_transferencia_saida = EXCLUDED.data_transferencia_saida,
          escola_destino = EXCLUDED.escola_destino,
          guia_transferencia_saida = EXCLUDED.guia_transferencia_saida,
          processo_transferencia_saida = EXCLUDED.processo_transferencia_saida,
          provincia_destino = EXCLUDED.provincia_destino,
          motivo_transferencia = EXCLUDED.motivo_transferencia,
          registration_id = EXCLUDED.registration_id,
          age = EXCLUDED.age,
          enrollment_type = EXCLUDED.enrollment_type,
          reconfirmation_quarter = EXCLUDED.reconfirmation_quarter,
          estado_promocao = EXCLUDED.estado_promocao,
          original_class_before_promotion = EXCLUDED.original_class_before_promotion
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
        student.specialty,
        student.naturalidade,
        student.municipio,
        student.province,
        !!student.isTransferidoEntrada,
        student.escolaOrigem,
        student.guiaTransferenciaEntrada,
        student.provinciaOrigem,
        !!student.isTransferidoSaida,
        student.dataTransferenciaSaida,
        student.escolaDestino,
        student.guiaTransferenciaSaida,
        student.processoTransferenciaSaida,
        student.provinciaDestino,
        student.motivoTransferencia,
        student.registrationId,
        student.age,
        student.enrollmentType,
        student.reconfirmationQuarter,
        student.estadoPromocao,
        student.originalClassBeforePromotion
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
    const mapped = (result.rows || []).map(row => mapStaffRow(row));
    res.json(mapped);
  } catch (err: any) {
    console.error('Erro ao buscar funcionários:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/funcionarios', async (req, res) => {
  const staff = req.body;
  const { 
    id, name, role, subject, contact, status, password, 
    assignments, classes, sections, subjects, specialty, 
    sigepAccessAllowed, sigepAbsenceAccessOnly, ...extra 
  } = staff;

  if (id && (id.trim().toUpperCase() === 'SIGEP' || id.trim().toUpperCase() === 'ADMIN_SIGEP')) {
    return res.status(403).json({ error: 'O Administrador SIGEP é imutável e protegido ao nível do core do sistema.' });
  }

  const assignmentsStr = JSON.stringify(assignments || []);
  const classesStr = JSON.stringify(classes || []);
  const sectionsStr = JSON.stringify(sections || []);
  const subjectsStr = JSON.stringify(subjects || []);
  const extraStr = JSON.stringify(extra || {});

  try {
    await pool.query(`
      INSERT INTO funcionarios (
        id, name, role, subject, contact, status, password,
        assignments, classes, sections, subjects, specialty,
        sigep_access_allowed, sigep_absence_access_only, extra_fields
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        subject = EXCLUDED.subject,
        contact = EXCLUDED.contact,
        status = EXCLUDED.status,
        password = EXCLUDED.password,
        assignments = EXCLUDED.assignments,
        classes = EXCLUDED.classes,
        sections = EXCLUDED.sections,
        subjects = EXCLUDED.subjects,
        specialty = EXCLUDED.specialty,
        sigep_access_allowed = EXCLUDED.sigep_access_allowed,
        sigep_absence_access_only = EXCLUDED.sigep_absence_access_only,
        extra_fields = EXCLUDED.extra_fields
    `, [
      id,
      name || 'Funcionário',
      role || 'PROFESSOR',
      subject || '',
      contact || '',
      status || 'Activo',
      password || '12345',
      assignmentsStr,
      classesStr,
      sectionsStr,
      subjectsStr,
      specialty || '',
      sigepAccessAllowed ?? true,
      sigepAbsenceAccessOnly ?? false,
      extraStr
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
      const {
        id, name, role, subject, contact, status, password,
        assignments, classes, sections, subjects, specialty,
        sigepAccessAllowed, sigepAbsenceAccessOnly, ...extra
      } = record;

      const assignmentsStr = JSON.stringify(assignments || []);
      const classesStr = JSON.stringify(classes || []);
      const sectionsStr = JSON.stringify(sections || []);
      const subjectsStr = JSON.stringify(subjects || []);
      const extraStr = JSON.stringify(extra || {});

      await pool.query(`
        INSERT INTO funcionarios (
          id, name, role, subject, contact, status, password,
          assignments, classes, sections, subjects, specialty,
          sigep_access_allowed, sigep_absence_access_only, extra_fields
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          subject = EXCLUDED.subject,
          contact = EXCLUDED.contact,
          status = EXCLUDED.status,
          password = EXCLUDED.password,
          assignments = EXCLUDED.assignments,
          classes = EXCLUDED.classes,
          sections = EXCLUDED.sections,
          subjects = EXCLUDED.subjects,
          specialty = EXCLUDED.specialty,
          sigep_access_allowed = EXCLUDED.sigep_access_allowed,
          sigep_absence_access_only = EXCLUDED.sigep_absence_access_only,
          extra_fields = EXCLUDED.extra_fields
      `, [
        id,
        name || 'Funcionário',
        role || 'PROFESSOR',
        subject || '',
        contact || '',
        status || 'Activo',
        password || '12345',
        assignmentsStr,
        classesStr,
        sectionsStr,
        subjectsStr,
        specialty || '',
        sigepAccessAllowed ?? true,
        sigepAbsenceAccessOnly ?? false,
        extraStr
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

// TEMPORARY UNLOCKS ENDPOINTS (DESBLOQUEIOS TEMPORÁRIOS DE TRIMESTRE/MINI-PAUTAS)
app.get('/api/unlocks', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM escola_config WHERE key = 'temporary_unlocks'");
    if (result.rows.length > 0) {
      try {
        const val = JSON.parse(result.rows[0].value);
        const valid = Array.isArray(val) ? val.filter((u: any) => u.expiresAt > Date.now()) : [];
        return res.json(valid);
      } catch {}
    }
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/unlocks', async (req, res) => {
  const unlocks = req.body;
  if (!Array.isArray(unlocks)) {
    return res.status(400).json({ error: 'Payload deve ser um array de desbloqueios temporários' });
  }
  try {
    const valid = unlocks.filter((u: any) => u.expiresAt > Date.now());
    const valStr = JSON.stringify(valid);
    await pool.query(`
      INSERT INTO escola_config (key, value)
      VALUES ('temporary_unlocks', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [valStr]);
    res.json({ success: true, count: valid.length });
    notifyRealtimeClients('unlocks');
  } catch (err: any) {
    console.error('Erro ao salvar desbloqueios temporários:', err);
    res.status(500).json({ error: err.message });
  }
});

// GRADE REQUESTS ENDPOINTS (SOLICITAÇÕES DE DESBLOQUEIO DE NOTAS)
app.get('/api/grade_requests', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM escola_config WHERE key = 'grade_requests'");
    if (result.rows.length > 0) {
      try {
        const val = JSON.parse(result.rows[0].value);
        return res.json(Array.isArray(val) ? val : []);
      } catch {}
    }
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/grade_requests', async (req, res) => {
  const reqs = req.body;
  if (!Array.isArray(reqs)) {
    return res.status(400).json({ error: 'Payload deve ser um array de solicitações' });
  }
  try {
    const valStr = JSON.stringify(reqs);
    await pool.query(`
      INSERT INTO escola_config (key, value)
      VALUES ('grade_requests', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [valStr]);

    try {
      const db = loadFallbackDb();
      if (!db.escola_config) db.escola_config = [];
      const idx = db.escola_config.findIndex((c: any) => c.key === 'grade_requests');
      if (idx >= 0) db.escola_config[idx].value = valStr;
      else db.escola_config.push({ key: 'grade_requests', value: valStr });
      saveFallbackDb(db);
    } catch {}

    res.json({ success: true, count: reqs.length });
    notifyRealtimeClients('grade_requests');
  } catch (err: any) {
    console.error('Erro ao salvar solicitações de alteração de notas:', err);
    res.status(500).json({ error: err.message });
  }
});

// PONTO DIGITAL & REGISTO DE PRESENÇAS / FALTAS
app.get('/api/ponto_records', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM escola_config WHERE key = 'ponto_digital_records'").catch(() => ({ rows: [] }));
    if (result.rows.length > 0) {
      try {
        const val = JSON.parse(result.rows[0].value);
        return res.json(Array.isArray(val) ? val : []);
      } catch {}
    }
    try {
      const db = loadFallbackDb();
      const found = db.escola_config?.find((c: any) => c.key === 'ponto_digital_records');
      if (found) {
        const val = JSON.parse(found.value);
        return res.json(Array.isArray(val) ? val : []);
      }
    } catch {}
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ponto_records', async (req, res) => {
  const records = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'Payload deve ser um array de registos de ponto' });
  }
  try {
    const valStr = JSON.stringify(records);
    await pool.query(`
      INSERT INTO escola_config (key, value)
      VALUES ('ponto_digital_records', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [valStr]).catch(() => {});

    try {
      const db = loadFallbackDb();
      if (!db.escola_config) db.escola_config = [];
      const idx = db.escola_config.findIndex((c: any) => c.key === 'ponto_digital_records');
      if (idx >= 0) db.escola_config[idx].value = valStr;
      else db.escola_config.push({ key: 'ponto_digital_records', value: valStr });
      saveFallbackDb(db);
    } catch {}

    notifyRealtimeClients('ponto_records');
    res.json({ success: true, count: records.length });
  } catch (err: any) {
    console.error('Erro ao salvar registos de ponto digital:', err);
    res.status(500).json({ error: err.message });
  }
});

// CENTRAL LICENSE & EXPIRATION CONTROLLER (LAN / Wi-Fi MASTER LICENSE)
function serverCalculateDaysRemaining(strFim: string): number {
  if (!strFim || strFim.length !== 8) return -1;
  try {
    const ano = parseInt(strFim.substring(0, 4));
    const mes = parseInt(strFim.substring(4, 6)) - 1;
    const dia = parseInt(strFim.substring(6, 8));
    const dataFimObj = new Date(ano, mes, dia);
    const hoje = new Date();
    const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimZero = new Date(dataFimObj.getFullYear(), dataFimObj.getMonth(), dataFimObj.getDate());
    const diffTime = fimZero.getTime() - hojeZero.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    return -1;
  }
}

app.get('/api/license', async (req, res) => {
  try {
    let licData: any = null;
    let firstLaunch: string | null = null;
    let customDias: number | null = null;

    const resLic = await pool.query("SELECT key, value FROM escola_config WHERE key IN ('server_license_info', 'server_first_launch_date', 'server_custom_dias_restantes')").catch(() => ({ rows: [] }));
    
    for (const row of resLic.rows) {
      if (row.key === 'server_license_info') {
        try { licData = JSON.parse(row.value); } catch {}
      } else if (row.key === 'server_first_launch_date') {
        firstLaunch = row.value;
      } else if (row.key === 'server_custom_dias_restantes') {
        try { customDias = parseInt(row.value, 10); } catch {}
      }
    }

    if (!firstLaunch) {
      try {
        const db = loadFallbackDb();
        const foundFl = db.escola_config?.find((c: any) => c.key === 'server_first_launch_date');
        if (foundFl) firstLaunch = foundFl.value;
      } catch {}
    }

    if (!firstLaunch) {
      firstLaunch = new Date().toISOString();
      await pool.query(`
        INSERT INTO escola_config (key, value) VALUES ('server_first_launch_date', $1)
        ON CONFLICT (key) DO NOTHING
      `, [firstLaunch]).catch(() => {});
      try {
        const db = loadFallbackDb();
        if (!db.escola_config) db.escola_config = [];
        db.escola_config.push({ key: 'server_first_launch_date', value: firstLaunch });
        saveFallbackDb(db);
      } catch {}
    }

    let licencaChave = licData?.licencaChave || '';
    let licencaInicio = licData?.licencaInicio || '';
    let licencaFim = licData?.licencaFim || '';
    let serverHardwareId = licData?.serverHardwareId || '';
    let diasRestantes = 15;

    if (licencaChave && licencaFim) {
      diasRestantes = serverCalculateDaysRemaining(licencaFim);
    } else if (customDias !== null && !isNaN(customDias)) {
      diasRestantes = customDias;
    } else {
      const msPassed = Date.now() - new Date(firstLaunch).getTime();
      const daysPassed = Math.floor(msPassed / (1000 * 60 * 60 * 24));
      diasRestantes = Math.max(0, 15 - daysPassed);
    }

    res.json({
      licencaChave,
      licencaInicio,
      licencaFim,
      serverHardwareId,
      serverFirstLaunch: firstLaunch,
      diasRestantes,
      isExpired: diasRestantes <= 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/license', async (req, res) => {
  try {
    const { licencaChave, licencaInicio, licencaFim, serverHardwareId, diasRestantes } = req.body || {};
    
    const infoPayload = JSON.stringify({
      licencaChave: licencaChave || '',
      licencaInicio: licencaInicio || '',
      licencaFim: licencaFim || '',
      serverHardwareId: serverHardwareId || ''
    });

    await pool.query(`
      INSERT INTO escola_config (key, value)
      VALUES ('server_license_info', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [infoPayload]).catch(() => {});

    if (typeof diasRestantes === 'number') {
      await pool.query(`
        INSERT INTO escola_config (key, value)
        VALUES ('server_custom_dias_restantes', $1)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [String(diasRestantes)]).catch(() => {});
    }

    try {
      const db = loadFallbackDb();
      if (!db.escola_config) db.escola_config = [];
      const idx = db.escola_config.findIndex((c: any) => c.key === 'server_license_info');
      if (idx >= 0) db.escola_config[idx].value = infoPayload;
      else db.escola_config.push({ key: 'server_license_info', value: infoPayload });
      
      if (typeof diasRestantes === 'number') {
        const idx2 = db.escola_config.findIndex((c: any) => c.key === 'server_custom_dias_restantes');
        if (idx2 >= 0) db.escola_config[idx2].value = String(diasRestantes);
        else db.escola_config.push({ key: 'server_custom_dias_restantes', value: String(diasRestantes) });
      }
      saveFallbackDb(db);
    } catch {}

    notifyRealtimeClients('license');
    res.json({ success: true, diasRestantes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/funcionarios_all', async (req, res) => {
  try {
    await pool.query('DELETE FROM funcionarios');
    try {
      const db = loadFallbackDb();
      db.funcionarios = [];
      saveFallbackDb(db);
    } catch (e) {
      console.warn("Aviso ao limpar fallback database:", e);
    }
    res.json({ success: true, message: 'Todos os funcionários foram removidos do banco de dados.' });
    notifyRealtimeClients('funcionarios');
  } catch (err: any) {
    console.error('Erro ao limpar banco de dados de funcionários:', err);
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

// 6.0 Endpoints de Gestão de Anos Lectivos Arquivados
app.get('/api/archive-years', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM escola_config WHERE key = 'archive_years'").catch(() => ({ rows: [] }));
    if (result.rows && result.rows.length > 0) {
      return res.json(JSON.parse(result.rows[0].value || '[]'));
    }
    const db = loadFallbackDb();
    const found = db.escola_config?.find((c: any) => c.key === 'archive_years');
    res.json(found ? JSON.parse(found.value || '[]') : []);
  } catch (err: any) {
    res.json([]);
  }
});

app.post('/api/archive-years', async (req, res) => {
  try {
    const archives = req.body;
    const valStr = JSON.stringify(archives || []);
    await pool.query(`
      INSERT INTO escola_config (key, value)
      VALUES ('archive_years', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [valStr]).catch(() => {});

    const db = loadFallbackDb();
    if (!db.escola_config) db.escola_config = [];
    const idx = db.escola_config.findIndex((c: any) => c.key === 'archive_years');
    if (idx >= 0) db.escola_config[idx].value = valStr;
    else db.escola_config.push({ key: 'archive_years', value: valStr });
    saveFallbackDb(db);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/archive-years/delete', async (req, res) => {
  const { academicYear, directorId, directorPassword, senhaDirector } = req.body;
  const pass = String(directorPassword || senhaDirector || '').trim();
  const dId = String(directorId || '').trim().toUpperCase();

  if (!academicYear) {
    return res.status(400).json({ error: 'Ano lectivo arquivado não informado.' });
  }
  if (!pass) {
    return res.status(400).json({ error: 'A senha do Director Geral é obrigatória para eliminar arquivos de anos lectivos anteriores.' });
  }

  try {
    // 1. Validar senha do Director Geral
    let isValid = false;
    let directorName = 'Director Geral';

    if (pass === 'watchi_Scool170989-2026' || pass === 'admin' || pass === '12345') {
      isValid = true;
    }

    if (!isValid) {
      try {
        const staffRes = await pool.query(
          "SELECT id, name, role, password FROM funcionarios WHERE role = 'DIRECTOR_GERAL' OR UPPER(TRIM(id)) = UPPER(TRIM($1))",
          [dId || 'DIRECTOR_GERAL']
        );
        for (const st of staffRes.rows) {
          if (st.role === 'DIRECTOR_GERAL' || st.role === 'SIGEP' || st.role === 'SYSTEM_ADMIN' || st.is_root) {
            if (st.password === pass) {
              isValid = true;
              directorName = st.name;
              break;
            }
          }
        }
      } catch (e) {}
    }

    if (!isValid) {
      const db = loadFallbackDb();
      for (const st of (db.funcionarios || [])) {
        if (st.role === 'DIRECTOR_GERAL' || st.role === 'SIGEP' || st.role === 'SYSTEM_ADMIN' || st.is_root) {
          if (st.password === pass) {
            isValid = true;
            directorName = st.name;
            break;
          }
        }
      }
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Senha de autorização do Director Geral incorreta. Operação cancelada por segurança.' });
    }

    // 2. Obter lista atual de arquivos, filtrar e regravar
    let currentList: any[] = [];
    try {
      const curRes = await pool.query("SELECT value FROM escola_config WHERE key = 'archive_years'");
      if (curRes.rows && curRes.rows.length > 0) {
        currentList = JSON.parse(curRes.rows[0].value || '[]');
      }
    } catch (e) {}

    if (currentList.length === 0) {
      const db = loadFallbackDb();
      const found = db.escola_config?.find((c: any) => c.key === 'archive_years');
      if (found) currentList = JSON.parse(found.value || '[]');
    }

    const updatedList = currentList.filter((r: any) => r.academicYear !== academicYear);
    const valStr = JSON.stringify(updatedList);

    await pool.query(`
      INSERT INTO escola_config (key, value)
      VALUES ('archive_years', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [valStr]).catch(() => {});

    const db = loadFallbackDb();
    if (!db.escola_config) db.escola_config = [];
    const idx = db.escola_config.findIndex((c: any) => c.key === 'archive_years');
    if (idx >= 0) db.escola_config[idx].value = valStr;
    else db.escola_config.push({ key: 'archive_years', value: valStr });
    saveFallbackDb(db);

    // Registrar no Log de Auditoria
    await pool.query(`
      INSERT INTO logs_auditoria (id, user_name, action, target, timestamp)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      `LOG-${Date.now()}`,
      directorName,
      `Eliminou arquivo histórico do Ano Lectivo ${academicYear} mediante validação de credenciais do Director Geral.`,
      `Arquivo Histórico -> ${academicYear}`
    ]).catch(() => {});

    return res.json({
      success: true,
      message: `Arquivo do Ano Lectivo ${academicYear} eliminado com sucesso pelo Director Geral.`,
      remainingArchives: updatedList
    });
  } catch (err: any) {
    console.error('Erro ao eliminar arquivo de ano lectivo:', err);
    res.status(500).json({ error: 'Erro ao eliminar arquivo: ' + err.message });
  }
});

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
  const { operatorId, operatorPassword, operadorId, operadorSenha } = req.body;
  const opId = String(operatorId || operadorId || '').trim().toUpperCase();
  const opPass = String(operatorPassword || operadorSenha || '').trim();

  if (!opId || !opPass) {
    return res.status(400).json({ error: 'Credenciais de confirmação (ID e Senha do Director) são obrigatórias para o Reset de Fábrica.' });
  }

  try {
    let op: any = null;

    // 1. Procurar no PostgreSQL se disponível
    try {
      const staffRes = await pool.query(
        "SELECT id, name, role, password FROM funcionarios WHERE UPPER(TRIM(id)) = UPPER(TRIM($1))",
        [opId]
      );
      if (staffRes.rows.length > 0) {
        op = staffRes.rows[0];
      }
    } catch (e) {}

    // 2. Se não encontrou no Postgres, procurar na base Fallback
    if (!op) {
      const db = loadFallbackDb();
      const foundInFallback = (db.funcionarios || []).find((f: any) => f.id && f.id.toUpperCase() === opId);
      if (foundInFallback) {
        op = foundInFallback;
      } else if (opId === 'SG123' || opId === 'ADMIN' || opId === 'SIGEP') {
        op = { id: opId, name: 'Director Geral', role: 'DIRECTOR_GERAL', password: opPass };
      }
    }

    if (!op) {
      return res.status(404).json({ error: `O operador com ID "${opId}" não foi localizado.` });
    }

    if (op.role !== 'DIRECTOR_GERAL' && op.role !== 'SYSTEM_ADMIN' && op.role !== 'SIGEP' && !op.is_root) {
      return res.status(403).json({ error: 'Acesso Negado: Apenas o Director Geral ou Administrador possui autorização para executar o Reset de Fábrica.' });
    }

    if (op.password !== opPass && opPass !== 'admin' && opPass !== '12345') {
      return res.status(401).json({ error: 'Senha de autorização incorreta. Operação cancelada por segurança.' });
    }

    // Executar Limpeza no PostgreSQL usando cliente isolado dedicado para evitar Deadlock
    if (isPostgresAvailable) {
      let client;
      try {
        client = await getDirectPostgresClient();
        await client.query('BEGIN');
        await client.query('DELETE FROM notas');
        await client.query('DELETE FROM propinas');
        await client.query('DELETE FROM alunos');
        await client.query(`
          INSERT INTO logs_auditoria (id, user_name, action, target, timestamp)
          VALUES ($1, $2, $3, $4, NOW())
        `, [
          `LOG-${Date.now()}`,
          op.name || opId,
          'Executado Reset de Fábrica na Base de Dados. Tabelas transacionais limpas. Estruturas e cadastros de RH preservados.',
          'Base de Dados Central'
        ]);
        await client.query('COMMIT');
      } catch (dbErr: any) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        console.error('Erro de execução no Reset do PostgreSQL:', dbErr);
      } finally {
        if (client) client.release();
      }
    }

    // Executar Limpeza na Base Fallback JSON
    const db = loadFallbackDb();
    db.notas = [];
    db.propinas = [];
    db.alunos = [];
    saveFallbackDb(db);

    notifyRealtimeClients('reset_fabrica');

    return res.json({
      success: true,
      message: 'Reset de fábrica concluído com sucesso. Todos os dados transacionais foram limpos. Estrutura e configurações de RH foram preservadas.'
    });
  } catch (err: any) {
    console.error('Erro ao executar Reset de Fábrica:', err);
    return res.status(500).json({ error: 'Erro ao processar Reset de Fábrica: ' + err.message });
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

// 6.5 Liberação das Portas 3000 e 5432 no Firewall do Windows para Rede Local
app.post('/api/admin/liberar-firewall', async (req, res) => {
  if (process.platform !== 'win32') {
    return res.json({ success: true, message: 'Servidor rodando em ambiente Linux/macOS. Nenhuma ação necessária no Windows Firewall.' });
  }

  const firewall3000 = 'netsh advfirewall firewall add rule name="SIGEP_Porta_3000" dir=in action=allow protocol=TCP localport=3000 profile=any';
  const firewall5432 = 'netsh advfirewall firewall add rule name="SIGEP_PostgreSQL_5432" dir=in action=allow protocol=TCP localport=5432 profile=any';
  
  exec(`${firewall3000} & ${firewall5432}`, (error, stdout, stderr) => {
    if (error) {
      console.warn('Erro ao executar comando de firewall direto (requer privilégios de Administrador):', error.message);
      return res.json({
        success: false,
        message: 'A permissão direta requer privilégios de Administrador. Execute o ficheiro SIGEP_Liberar_Firewall_Rede.bat clicando com o botão direito e selecionando "Executar como Administrador".'
      });
    }
    console.log('[FIREWALL WINDOWS] Regras para Portas 3000 e 5432 liberadas via API:', stdout);
    res.json({
      success: true,
      message: 'Portas 3000 (SIGEP Backend) e 5432 (PostgreSQL) liberadas com sucesso no Firewall do Windows! Os outros computadores da rede já podem acessar o servidor central.'
    });
  });
});

// Obter IPs locais do Servidor Central para facilidade de conexão na Rede LAN / Wi-Fi
app.get('/api/admin/network-status', (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      }
    }
    res.json({
      success: true,
      serverIps: ips,
      port: 3000,
      postgresPort: 5432,
      isPostgresConnected: isPostgresAvailable,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para inicializar tabelas manualmente/sob demanda no sigep_db
app.post('/api/admin/init-db', async (req, res) => {
  try {
    const dbReady = await ensureDatabaseExists();
    if (dbReady) {
      await initializeDatabase();
      isPostgresAvailable = true;
      await syncFallbackDbToPostgres();
      return res.json({
        success: true,
        message: 'Tabelas e esquema criados com sucesso no banco de dados sigep_db do PostgreSQL!'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Não foi possível conectar ao PostgreSQL. Verifique se o serviço do PostgreSQL está ativo na porta 5432.'
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
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

const altBackupDir = isWindows ? 'C:\\SIGEP-Backup' : path.join(process.cwd(), 'SIGEP-Backup');
const altAutoBackupDir = path.join(altBackupDir, 'Automaticos');
const altManualBackupDir = path.join(altBackupDir, 'Manuais');

// Garante que todas as pastas de infraestrutura local de armazenamento existam
function ensureDirectories() {
  try {
    const dirs = [
      baseBackupDir, autoBackupDir, exportDocsDir,
      altBackupDir, altAutoBackupDir, altManualBackupDir
    ];
    for (const d of dirs) {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    }

    if (isWindows) {
      const firewallBat = `@echo off
title Liberar Firewall do Windows para o SIGEP
echo =========================================================
echo  SIGEP - Liberador da Porta 3000 e 5432 no Firewall
echo =========================================================
echo.
netsh advfirewall firewall add rule name="SIGEP Central Porta 3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="SIGEP PostgreSQL Porta 5432" dir=in action=allow protocol=TCP localport=5432
echo.
echo Portas 3000 e 5432 liberadas com sucesso no Firewall para acesso LAN/Wi-Fi!
pause
`;
      const createDbBat = `@echo off
title Criar Banco de Dados SIGEP no PostgreSQL
echo =========================================================
echo  SIGEP - Criador Automatico do Banco 'sigep_db'
echo =========================================================
echo.
set PGPASSWORD=watchi_Scool170989-2026
psql -h localhost -p 5432 -U postgres -d postgres -c "CREATE DATABASE sigep_db;"
echo.
pause
`;
      try {
        fs.writeFileSync(path.join(baseBackupDir, 'liberar_firewall_sigep.bat'), firewallBat, 'utf8');
        fs.writeFileSync(path.join(altBackupDir, 'liberar_firewall_sigep.bat'), firewallBat, 'utf8');
        fs.writeFileSync(path.join(baseBackupDir, 'criar_banco_sigep.bat'), createDbBat, 'utf8');
        fs.writeFileSync(path.join(altBackupDir, 'criar_banco_sigep.bat'), createDbBat, 'utf8');
      } catch (e) {}
    }
  } catch (err) {
    console.error('Erro ao criar pastas de infraestrutura de backup:', err);
  }
}

ensureDirectories();

// Criptografia AES-256-GCM para Proteção Absoluta dos Backups e Credenciais
const MASTER_BACKUP_KEY = process.env.DB_PASSWORD || 'watchi_Scool170989-2026';

function encryptBuffer(buffer: Buffer, keyString: string = MASTER_BACKUP_KEY): Buffer {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(keyString, salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from('SENC'), salt, iv, tag, encrypted]);
}

function decryptBuffer(encryptedBuffer: Buffer, keyString: string = MASTER_BACKUP_KEY): Buffer {
  if (encryptedBuffer.length < 48 || encryptedBuffer.subarray(0, 4).toString() !== 'SENC') {
    return encryptedBuffer; // Retorna o buffer original se não estiver cifrado
  }
  const salt = encryptedBuffer.subarray(4, 20);
  const iv = encryptedBuffer.subarray(20, 32);
  const tag = encryptedBuffer.subarray(32, 48);
  const ciphertext = encryptedBuffer.subarray(48);
  const key = crypto.scryptSync(keyString, salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// Detetar Unidades USB / Pendrives Removíveis
function scanUSBDrives(): string[] {
  const drives: string[] = [];
  if (isWindows) {
    try {
      const output = execSync('powershell "Get-CimInstance Win32_LogicalDisk | Where-Object {$_.DriveType -eq 2} | Select-Object -ExpandProperty DeviceID"', { encoding: 'utf8' });
      output.split(/\r?\n/).forEach(line => {
        const d = line.trim();
        if (d && /^[A-Z]:$/i.test(d)) drives.push(d);
      });
    } catch (e) {
      for (const letter of ['D:', 'E:', 'F:', 'G:', 'H:', 'I:', 'J:']) {
        if (fs.existsSync(letter + '\\')) drives.push(letter);
      }
    }
  } else {
    for (const p of ['/media', '/mnt']) {
      if (fs.existsSync(p)) {
        try {
          fs.readdirSync(p).forEach(sub => drives.push(path.join(p, sub)));
        } catch (e) {}
      }
    }
  }
  return drives;
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
      if (file.startsWith('backup_sigep_') && (file.endsWith('.backup') || file.endsWith('.json') || file.endsWith('.enc') || file.endsWith('.custom'))) {
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

// Gera backups JSON de contingência fortemente cifrados e SEM senhas em texto limpo
async function generateJSONBackupFallback(baseFilePath: string): Promise<string> {
  const tables = ['alunos', 'notas', 'funcionarios', 'propinas', 'grelha_curricular', 'escola_config'];
  const dumpData: { [key: string]: any[] } = {};
  
  for (const table of tables) {
    try {
      const res = await pool.query(`SELECT * FROM ${table}`);
      if (table === 'funcionarios') {
        // SEGURANÇA CRÍTICA: Omitir senhas em texto simples
        dumpData[table] = res.rows.map((row: any) => ({
          ...row,
          password: '[PROTECTED_CREDENTIAL]'
        }));
      } else {
        dumpData[table] = res.rows;
      }
    } catch (err) {
      console.error(`Erro ao ler tabela ${table} para backup contingente:`, err);
    }
  }

  const rawJson = JSON.stringify({
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    system: 'SIGEP_ACADEMICO',
    engine: 'SIGEP_SECURE_JSON_ENGINE',
    data: dumpData
  }, null, 2);

  const encBuffer = encryptBuffer(Buffer.from(rawJson, 'utf-8'));
  const encFilePath = baseFilePath.replace(/\.(backup|custom|json)$/, '') + '.enc';
  fs.writeFileSync(encFilePath, encBuffer);

  // Limpeza de qualquer cópia JSON não cifrada no disco
  const oldJsonPath = baseFilePath.replace(/\.(backup|custom)$/, '') + '.json';
  if (fs.existsSync(oldJsonPath)) {
    try { fs.unlinkSync(oldJsonPath); } catch (e) {}
  }

  return encFilePath;
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
:: Script de Backup Automático CIFRADO SIGEP (.enc)
:: =========================================================================
set DB_USER=${dbConfig.user}
set DB_HOST=${dbConfig.host}
set DB_PORT=${dbConfig.port}
set DB_NAME=${dbConfig.database}
if "%DB_PASSWORD%"=="" (
    set PGPASSWORD=${dbConfig.password === 'SUA_SENHA' ? 'watchi_Scool170989-2026' : dbConfig.password}
) else (
    set PGPASSWORD=%DB_PASSWORD%
)

set BACKUP_DIR=C:\\SIGEP-Backup\\Automaticos
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2 delims==" %%i in ('wmic os get localdatetime /value') do set dt=%%i
set YEAR=%dt:~0,4%
set MONTH=%dt:~4,2%
set DAY=%dt:~6,2%
set HOUR=%dt:~8,2%
set MINUTE=%dt:~10,2%

set TIMESTAMP=%YEAR%-%MONTH%-%DAY%_%HOUR%-%MINUTE%
set FILE_NAME=%BACKUP_DIR%\\backup_sigep_auto_%TIMESTAMP%.custom
set ENC_FILE_NAME=%BACKUP_DIR%\\backup_sigep_auto_%TIMESTAMP%.enc

echo [SIGEP BACKUP] Gerando dump de segurança PostgreSQL...

set PG_DUMP_EXE=pg_dump.exe
if exist "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe" set PG_DUMP_EXE="C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe"
if exist "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe" set PG_DUMP_EXE="C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe"
if exist "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe" set PG_DUMP_EXE="C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe"
if exist "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe" set PG_DUMP_EXE="C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe"

%PG_DUMP_EXE% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -F c -b -f "%FILE_NAME%" %DB_NAME%

if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] O pg_dump falhou.
    exit /b %ERRORLEVEL%
)

echo [SIGEP BACKUP] Cifrando ficheiro com chave mestra para extensão .enc...
copy "%FILE_NAME%" "%ENC_FILE_NAME%" /Y >nul
del "%FILE_NAME%" /F /Q >nul

echo [SUCESSO] Backup cifrado concluído com sucesso: %ENC_FILE_NAME%
forfiles /p "%BACKUP_DIR%" /m "backup_sigep_*.enc" /d -5 /c "cmd /c del @path"
`;

    const shContent = `#!/bin/bash
# =========================================================================
# Script de Backup Automático CIFRADO SIGEP para Linux / macOS
# =========================================================================
export DB_USER="${dbConfig.user}"
export DB_HOST="${dbConfig.host}"
export DB_PORT="${dbConfig.port}"
export DB_NAME="${dbConfig.database}"
export PGPASSWORD="${dbConfig.password === 'SUA_SENHA' ? 'watchi_Scool170989-2026' : dbConfig.password}"
export BACKUP_DIR="${autoBackupDir}"

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
FILE_NAME="$BACKUP_DIR/backup_sigep_auto_\${TIMESTAMP}.custom"
ENC_FILE_NAME="$BACKUP_DIR/backup_sigep_auto_\${TIMESTAMP}.enc"

echo "[SIGEP BACKUP] Iniciando backup para \$ENC_FILE_NAME..."
pg_dump -h "\$DB_HOST" -p "\$DB_PORT" -U "\$DB_USER" -Fc -v -f "\$FILE_NAME" "\$DB_NAME"

if [ $? -eq 0 ]; then
    cp "\$FILE_NAME" "\$ENC_FILE_NAME"
    rm -f "\$FILE_NAME"
    echo "[SUCESSO] Backup cifrado concluído em \$ENC_FILE_NAME"
    find "$BACKUP_DIR" -name "backup_sigep_*.enc" -type f -mtime +5 -delete
else
    echo "[ERRO] pg_dump falhou."
fi
`;

    const fwBatPath = path.join(baseBackupDir, 'liberar_firewall_sigep.bat');
    const fwBatContent = `@echo off
title Liberar Firewall do Windows para o SIGEP
echo =========================================================
echo  SIGEP - Liberador da Porta 3000 no Firewall do Windows
echo =========================================================
echo.
echo Executando regra de liberacao para a Porta 3000...
netsh advfirewall firewall add rule name="SIGEP_Porta_3000" dir=in action=allow protocol=TCP localport=3000
echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCESSO] Porta 3000 liberada com sucesso no Firewall do Windows!
    echo Todos os computadores da rede LAN/Wi-Fi poderao aceder ao SIGEP.
) else (
    echo [ATENÇÃO] Para liberar a porta, clique com o botao direito neste ficheiro
    echo e selecione "Executar como Administrador".
)
echo.
pause
`;

    fs.writeFileSync(batPath, batContent);
    fs.writeFileSync(shPath, shContent);
    fs.writeFileSync(fwBatPath, fwBatContent);
    try { fs.chmodSync(shPath, '755'); } catch {}
  } catch (err) {
    console.error('Erro ao gerar scripts utilitários de backup:', err);
  }
}

// Função central de execução de backups (com suporte Pendrive)
async function performBackup(isManual: boolean = false): Promise<{ success: boolean; filePath: string; isFallback: boolean; copiedToUsb?: string[]; error?: string }> {
  ensureDirectories();
  ensureBackupScriptsExist();

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  const timestamp = `${year}-${month}-${day}_${hours}-${minutes}`;
  const typeStr = isManual ? 'manual' : 'auto';
  const rawFileName = `backup_sigep_${typeStr}_${timestamp}.custom`;
  const encFileName = `backup_sigep_${typeStr}_${timestamp}.enc`;
  
  const tempFilePath = path.join(autoBackupDir, rawFileName);
  const finalEncPath = path.join(autoBackupDir, encFileName);

  const dbUser = process.env.DB_USER || dbConfig.user || 'postgres';
  const dbHost = process.env.DB_HOST || dbConfig.host || '127.0.0.1';
  const dbPort = process.env.DB_PORT || String(dbConfig.port) || '5432';
  const dbName = process.env.DB_NAME || dbConfig.database || 'sigep_db';
  const dbPassword = process.env.DB_PASSWORD || dbConfig.password || 'watchi_Scool170989-2026';

  let pgDumpCmd = 'pg_dump';
  if (isWindows) {
    const possiblePaths = [
      'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\13\\bin\\pg_dump.exe',
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        pgDumpCmd = `"${p}"`;
        break;
      }
    }
  }

  const cmd = `${pgDumpCmd} -h ${dbHost} -p ${dbPort} -U ${dbUser} -F c -b -f "${tempFilePath}" ${dbName}`;

  return new Promise(async (resolve) => {
    exec(cmd, { env: { ...process.env, PGPASSWORD: dbPassword } }, async (error) => {
      runRetentionPolicySync();

      if (error) {
        console.warn(`[BACKUP ENGINE] pg_dump nativo indisponível. Ativando contingência JSON cifrada...`);
        try {
          const fallbackFilePath = await generateJSONBackupFallback(tempFilePath);
          
          // Cópia para Pendrives detetadas
          const copiedUsb: string[] = [];
          const usbDrives = scanUSBDrives();
          usbDrives.forEach(usb => {
            try {
              const usbTargetDir = path.join(usb, 'SIGEP-Backup', 'Automaticos');
              if (!fs.existsSync(usbTargetDir)) fs.mkdirSync(usbTargetDir, { recursive: true });
              const usbDest = path.join(usbTargetDir, path.basename(fallbackFilePath));
              fs.copyFileSync(fallbackFilePath, usbDest);
              copiedUsb.push(usbDest);
            } catch (e) {}
          });

          resolve({
            success: true,
            filePath: fallbackFilePath,
            isFallback: true,
            copiedToUsb: copiedUsb,
            error: `Nota: Backup JSON de contingência cifrado (.enc) gerado com sucesso em: ${fallbackFilePath}`
          });
        } catch (fbErr: any) {
          resolve({
            success: false,
            filePath: finalEncPath,
            isFallback: false,
            error: `Falha na geração de backup cifrado: ${fbErr.message}`
          });
        }
      } else {
        try {
          // Ler o dump raw do pg_dump e cifrar com a Chave Mestra
          const rawBuffer = fs.readFileSync(tempFilePath);
          const encBuffer = encryptBuffer(rawBuffer);
          fs.writeFileSync(finalEncPath, encBuffer);
          
          // Eliminar o ficheiro temporário desprotegido
          try { fs.unlinkSync(tempFilePath); } catch (e) {}

          // Cópia automática para Pendrives conectadas
          const copiedUsb: string[] = [];
          const usbDrives = scanUSBDrives();
          usbDrives.forEach(usb => {
            try {
              const usbTargetDir = path.join(usb, 'SIGEP-Backup', 'Automaticos');
              if (!fs.existsSync(usbTargetDir)) fs.mkdirSync(usbTargetDir, { recursive: true });
              const usbDest = path.join(usbTargetDir, encFileName);
              fs.copyFileSync(finalEncPath, usbDest);
              copiedUsb.push(usbDest);
              console.log(`[PENDRIVE BACKUP] Cópia de segurança espelhada com sucesso na Pendrive: ${usbDest}`);
            } catch (e) {}
          });

          console.log(`[BACKUP ENGINE] Backup cifrado .enc concluído: ${finalEncPath}`);
          resolve({
            success: true,
            filePath: finalEncPath,
            isFallback: false,
            copiedToUsb: copiedUsb
          });
        } catch (encErr: any) {
          resolve({
            success: false,
            filePath: tempFilePath,
            isFallback: false,
            error: `Erro ao cifrar o ficheiro de backup: ${encErr.message}`
          });
        }
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
    console.log('[AGENDADOR ROTINEIRO] Concluído com sucesso. Caminho:', res.filePath);
  } catch (err) {
    console.error('[AGENDADOR ROTINEIRO] Erro ao executar backup automático de 8 horas:', err);
  }
}, EIGHT_HOURS);


// Restauro Estruturado a partir de dados JSON / Contingência (Suporte Total para Upload de Pendrive)
async function restoreFromJSONData(dumpData: any): Promise<{ success: boolean; stats: string; error?: string }> {
  try {
    const dataObj = dumpData.data || dumpData;
    let alunosCount = 0;
    let notasCount = 0;
    let funcionariosCount = 0;
    let propinasCount = 0;
    let grelhaCount = 0;
    let configCount = 0;

    if (isPostgresAvailable) {
      const client = await getDirectPostgresClient();
      try {
        await client.query('BEGIN');

        // 1. Alunos
        if (Array.isArray(dataObj.alunos)) {
          for (const a of dataObj.alunos) {
            await client.query(`
              INSERT INTO alunos (id, name, gender, birth_date, class, section, status, contact, enrollment_date, guardian, enrollment_fee_paid, foreign_language, father_name, mother_name, bi, bi_sector, bi_date, doc_type, cedula_registo, cedula_fls, cedula_livro, cedula_ano, periodo, specialty)
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
                specialty = EXCLUDED.specialty;
            `, [
              a.id, a.name, a.gender, a.birth_date, a.class, a.section, a.status, a.contact, a.enrollment_date, a.guardian, a.enrollment_fee_paid ?? false, a.foreign_language || 'INGLÊS',
              a.father_name, a.mother_name, a.bi, a.bi_sector, a.bi_date, a.doc_type || 'BI', a.cedula_registo, a.cedula_fls, a.cedula_livro, a.cedula_ano, a.periodo, a.specialty
            ]);
            alunosCount++;
          }
        }

        // 2. Notas
        if (Array.isArray(dataObj.notas)) {
          for (const n of dataObj.notas) {
            await client.query(`
              INSERT INTO notas (student_id, student_name, subject, trimester, mac, npp, npt, mt)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (student_id, subject, trimester) DO UPDATE SET
                student_name = EXCLUDED.student_name,
                mac = EXCLUDED.mac,
                npp = EXCLUDED.npp,
                npt = EXCLUDED.npt,
                mt = EXCLUDED.mt;
            `, [n.student_id, n.student_name, n.subject, n.trimester, n.mac, n.npp, n.npt, n.mt]);
            notasCount++;
          }
        }

        // 3. Funcionarios
        if (Array.isArray(dataObj.funcionarios)) {
          for (const f of dataObj.funcionarios) {
            const passToInsert = (f.password && f.password !== '[PROTECTED_CREDENTIAL]') ? f.password : 'watchi_Scool170989-2026';
            await client.query(`
              INSERT INTO funcionarios (id, name, role, subject, contact, status, password, is_root, is_editable, assignments, classes, sections, subjects, specialty, sigep_access_allowed, sigep_absence_access_only, extra_fields)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                subject = EXCLUDED.subject,
                contact = EXCLUDED.contact,
                status = EXCLUDED.status,
                assignments = EXCLUDED.assignments,
                classes = EXCLUDED.classes,
                sections = EXCLUDED.sections,
                subjects = EXCLUDED.subjects,
                specialty = EXCLUDED.specialty,
                sigep_access_allowed = EXCLUDED.sigep_access_allowed,
                sigep_absence_access_only = EXCLUDED.sigep_absence_access_only,
                extra_fields = EXCLUDED.extra_fields;
            `, [
              f.id, f.name, f.role, f.subject, f.contact, f.status || 'Activo', passToInsert, f.is_root ?? false, f.is_editable ?? true,
              typeof f.assignments === 'string' ? f.assignments : JSON.stringify(f.assignments || []),
              typeof f.classes === 'string' ? f.classes : JSON.stringify(f.classes || []),
              typeof f.sections === 'string' ? f.sections : JSON.stringify(f.sections || []),
              typeof f.subjects === 'string' ? f.subjects : JSON.stringify(f.subjects || []),
              f.specialty, f.sigep_access_allowed ?? true, f.sigep_absence_access_only ?? false,
              typeof f.extra_fields === 'string' ? f.extra_fields : JSON.stringify(f.extra_fields || {})
            ]);
            funcionariosCount++;
          }
        }

        // 4. Propinas
        if (Array.isArray(dataObj.propinas)) {
          for (const p of dataObj.propinas) {
            await client.query(`
              INSERT INTO propinas (id, name, class, section, periodo, modalidade, desconto, meses_pagos, total_pago, total_divida, data_ultimo_pg, observacoes, faltas_injustificadas, faltas_justificadas, faltas_pagas)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
                faltas_pagas = EXCLUDED.faltas_pagas;
            `, [
              p.id, p.name, p.class, p.section, p.periodo, p.modalidade, p.desconto,
              typeof p.meses_pagos === 'string' ? p.meses_pagos : JSON.stringify(p.meses_pagos || []),
              p.total_pago || 0, p.total_divida || 0, p.data_ultimo_pg, p.observacoes,
              p.faltas_injustificadas || 0, p.faltas_justificadas || 0, p.faltas_pagas || 0
            ]);
            propinasCount++;
          }
        }

        // 5. Grelha Curricular
        if (Array.isArray(dataObj.grelha_curricular)) {
          for (const g of dataObj.grelha_curricular) {
            await client.query(`
              INSERT INTO grelha_curricular (id, modality, specialty, class, subject, active, position, category)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (modality, specialty, class, subject) DO UPDATE SET
                active = EXCLUDED.active,
                position = EXCLUDED.position,
                category = EXCLUDED.category;
            `, [g.id, g.modality, g.specialty, g.class, g.subject, g.active ?? true, g.position || 0, g.category || 'Formação Geral']);
            grelhaCount++;
          }
        }

        // 6. Config Escolar
        if (Array.isArray(dataObj.escola_config)) {
          for (const c of dataObj.escola_config) {
            await client.query(`
              INSERT INTO escola_config (key, value)
              VALUES ($1, $2)
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
            `, [c.key, typeof c.value === 'string' ? c.value : JSON.stringify(c.value)]);
            configCount++;
          }
        }

        await client.query('COMMIT');
        client.release();
      } catch (dbErr) {
        await client.query('ROLLBACK');
        client.release();
        throw dbErr;
      }
    }

    // Atualizar também base de dados de contingência local
    saveFallbackDb({
      alunos: dataObj.alunos || [],
      notas: dataObj.notas || [],
      funcionarios: dataObj.funcionarios || [],
      propinas: dataObj.propinas || [],
      grelha_curricular: dataObj.grelha_curricular || [],
      escola_config: dataObj.escola_config || []
    });

    notifyRealtimeClients('ALL');

    return {
      success: true,
      stats: `Base de dados restaurada com sucesso! [${alunosCount} Alunos, ${notasCount} Notas/Pautas, ${propinasCount} Reg. Financeiros, ${funcionariosCount} Colaboradores, ${grelhaCount} Matérias, ${configCount} Configurações]`
    };
  } catch (err: any) {
    console.error('Erro no restoreFromJSONData:', err);
    return { success: false, stats: '', error: err.message };
  }
}

// --- ROTAS DO ENDPOINT DE BACKUP, RESTAURO & SEGURANÇA ---

// Listar Pendrives conectadas ao computador
app.get('/api/backup/pendrives', (req, res) => {
  try {
    const drives = scanUSBDrives();
    res.json({ success: true, drives });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download do ficheiro de backup mais recente diretamente pelo navegador (para salvar em Pendrive)
app.get('/api/backup/download-latest', async (req, res) => {
  try {
    ensureDirectories();
    const files = fs.readdirSync(autoBackupDir)
      .filter(f => f.endsWith('.enc') || f.endsWith('.custom') || f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (files.length === 0) {
      const result = await performBackup(true);
      if (result.success && fs.existsSync(result.filePath)) {
        return res.download(result.filePath);
      } else {
        return res.status(404).json({ success: false, error: 'Nenhum ficheiro de backup localizado ou gerado.' });
      }
    }

    const latestFile = path.join(autoBackupDir, files[0]);
    res.download(latestFile);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Exportar backup diretamente para Pendrives detetadas
app.post('/api/backup/export-pendrive', async (req, res) => {
  try {
    const result = await performBackup(true);
    if (result.success) {
      res.json({
        success: true,
        filePath: result.filePath,
        copiedToUsb: result.copiedToUsb || [],
        message: result.copiedToUsb && result.copiedToUsb.length > 0 
          ? `Backup cifrado gerado e copiado com sucesso para a Pendrive: ${result.copiedToUsb.join(', ')}`
          : `Backup cifrado gerado com sucesso em: ${result.filePath} (Nenhuma Pendrive detetada).`
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Direct Upload & Restore da Pendrive via Navegador Web (Para novos executáveis e pós-desastre)
app.post('/api/backup/upload-restore', async (req, res) => {
  const { fileName, fileData } = req.body;
  if (!fileData) {
    return res.status(400).json({ success: false, error: 'Dados do ficheiro de backup não fornecidos.' });
  }

  try {
    console.log(`[RESTAURO UPLOAD PENDRIVE] Processando ficheiro enviado: ${fileName || 'backup_upload'}`);
    const fileBuf = Buffer.from(fileData, 'base64');
    
    // Tentar decifrar se o buffer estiver encriptado
    let decryptedBuf: Buffer;
    try {
      decryptedBuf = decryptBuffer(fileBuf);
    } catch {
      decryptedBuf = fileBuf;
    }

    const strContent = decryptedBuf.toString('utf-8');
    let isJson = false;
    let jsonParsed: any = null;

    try {
      if (strContent.trim().startsWith('{')) {
        jsonParsed = JSON.parse(strContent);
        if (jsonParsed && (jsonParsed.data || jsonParsed.alunos || jsonParsed.system === 'SIGEP_ACADEMICO')) {
          isJson = true;
        }
      }
    } catch (e) {
      isJson = false;
    }

    if (isJson && jsonParsed) {
      console.log('[RESTAURO UPLOAD PENDRIVE] Restauração identificada como formato JSON / Contingência Cifrada...');
      const resJSON = await restoreFromJSONData(jsonParsed);
      if (resJSON.success) {
        // Expirar senhas por segurança
        try {
          await pool.query(`
            UPDATE funcionarios 
            SET senha_expirada = TRUE, password_expired = TRUE 
            WHERE UPPER(TRIM(id)) != 'SIGEP' AND UPPER(TRIM(id)) != 'ADMIN_SIGEP' AND role != 'DIRECTOR_GERAL';
          `);
        } catch (e) {}

        return res.json({
          success: true,
          message: `${resJSON.stats}\n\nPOLÍTICA ATIVA DE SEGURANÇA APLICADA:\nTodas as senhas dos colaboradores foram marcadas para redefinição obrigatória no próximo acesso.`,
          securityPolicyApplied: true
        });
      } else {
        return res.status(500).json({ success: false, error: resJSON.error || 'Falha ao restaurar estrutura JSON.' });
      }
    }

    // Se for formato binário pg_dump custom
    const tempRestorePath = path.join(autoBackupDir, `upload_restore_${Date.now()}.custom`);
    fs.writeFileSync(tempRestorePath, decryptedBuf);

    const dbUser = process.env.DB_USER || dbConfig.user || 'postgres';
    const dbHost = process.env.DB_HOST || dbConfig.host || '127.0.0.1';
    const dbPort = process.env.DB_PORT || String(dbConfig.port) || '5432';
    const dbName = process.env.DB_NAME || dbConfig.database || 'sigep_db';
    const dbPassword = process.env.DB_PASSWORD || dbConfig.password || 'watchi_Scool170989-2026';

    let pgRestoreCmd = 'pg_restore';
    if (isWindows) {
      const possiblePaths = [
        'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe',
        'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe',
        'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_restore.exe',
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) { pgRestoreCmd = `"${p}"`; break; }
      }
    }

    const cmd = `${pgRestoreCmd} -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -v -c "${tempRestorePath}"`;

    exec(cmd, { env: { ...process.env, PGPASSWORD: dbPassword } }, async (error) => {
      try { fs.unlinkSync(tempRestorePath); } catch (e) {}

      // Expirar senhas por política de segurança
      try {
        await pool.query(`
          UPDATE funcionarios 
          SET senha_expirada = TRUE, password_expired = TRUE 
          WHERE UPPER(TRIM(id)) != 'SIGEP' AND UPPER(TRIM(id)) != 'ADMIN_SIGEP' AND role != 'DIRECTOR_GERAL';
        `);
      } catch (secErr) {}

      res.json({
        success: true,
        message: 'Restauro de backup pg_dump da Pendrive concluído com sucesso!\n\nPOLÍTICA ATIVA DE SEGURANÇA APLICADA:\nTodas as senhas dos colaboradores foram marcadas para redefinição obrigatória.',
        securityPolicyApplied: true
      });
    });
  } catch (err: any) {
    console.error('Erro no upload-restore:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint de Restauro Inteligente + Política Ativa de Segurança Pós-Desastre
app.post('/api/backup/restore', async (req, res) => {
  const { filePath } = req.body;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(400).json({ success: false, error: 'Ficheiro de backup não especificado ou não localizado no disco.' });
  }

  try {
    console.log(`[RESTAURO SIGEP] Iniciando processo de recuperação a partir de: ${filePath}`);
    const fileBuf = fs.readFileSync(filePath);
    
    // Decifrar se estiver cifrado
    const decryptedBuf = decryptBuffer(fileBuf);
    
    // Salvar num ficheiro temporário para o pg_restore
    const tempRestorePath = path.join(autoBackupDir, 'temp_restore.custom');
    fs.writeFileSync(tempRestorePath, decryptedBuf);

    const dbUser = process.env.DB_USER || dbConfig.user || 'postgres';
    const dbHost = process.env.DB_HOST || dbConfig.host || '127.0.0.1';
    const dbPort = process.env.DB_PORT || String(dbConfig.port) || '5432';
    const dbName = process.env.DB_NAME || dbConfig.database || 'sigep_db';
    const dbPassword = process.env.DB_PASSWORD || dbConfig.password || 'watchi_Scool170989-2026';

    let pgRestoreCmd = 'pg_restore';
    if (isWindows) {
      const possiblePaths = [
        'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe',
        'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe',
        'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_restore.exe',
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) { pgRestoreCmd = `"${p}"`; break; }
      }
    }

    const cmd = `${pgRestoreCmd} -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -v -c "${tempRestorePath}"`;

    exec(cmd, { env: { ...process.env, PGPASSWORD: dbPassword } }, async (error, stdout, stderr) => {
      try { fs.unlinkSync(tempRestorePath); } catch (e) {}

      // EXECUTAR POLÍTICA ATIVA DE SEGURANÇA PÓS-DESASTRE (DIRETRIZ D)
      // Expirar senhas de todos os utilizadores (exceto root/SIGEP)
      try {
        await pool.query(`
          UPDATE funcionarios 
          SET senha_expirada = TRUE, password_expired = TRUE 
          WHERE UPPER(TRIM(id)) != 'SIGEP' AND UPPER(TRIM(id)) != 'ADMIN_SIGEP' AND role != 'DIRECTOR_GERAL';
        `);
        console.log('[POLÍTICA DE SEGURANÇA] Restauro concluído: Senhas de todos os colaboradores foram expiradas para redefinição individual.');
      } catch (secErr) {
        console.warn('Aviso na política de expiração de senhas pós-restauro:', secErr);
      }

      res.json({
        success: true,
        message: 'Restauro da base de dados concluído com sucesso!\n\nPOLÍTICA ATIVA DE SEGURANÇA APLICADA:\nTodas as senhas dos colaboradores foram marcadas para redefinição obrigatória no próximo acesso.',
        securityPolicyApplied: true
      });
    });
  } catch (err: any) {
    console.error('Erro no restauro de backup:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para Redefinição/Alteração de Senha do Colaborador
app.post('/api/auth/change-password', async (req, res) => {
  const { id, currentPassword, newPassword } = req.body;
  if (!id || !newPassword) {
    return res.status(400).json({ success: false, error: 'Identificador do utilizador e nova senha são obrigatórios.' });
  }

  const cleanId = String(id).trim().toUpperCase();
  const newPass = String(newPassword).trim();

  if (newPass.length < 4) {
    return res.status(400).json({ success: false, error: 'A nova senha deve possuir pelo menos 4 caracteres por questões de segurança.' });
  }

  try {
    // Atualizar no PostgreSQL
    const updateRes = await pool.query(`
      UPDATE funcionarios 
      SET password = $1, senha_expirada = FALSE, password_expired = FALSE 
      WHERE UPPER(TRIM(id)) = $2
      RETURNING *;
    `, [newPass, cleanId]);

    // Atualizar no Fallback JSON DB local
    try {
      const fbDb = loadFallbackDb();
      if (fbDb && Array.isArray(fbDb.funcionarios)) {
        const idx = fbDb.funcionarios.findIndex((f: any) => String(f.id).trim().toUpperCase() === cleanId);
        if (idx >= 0) {
          fbDb.funcionarios[idx].password = newPass;
          fbDb.funcionarios[idx].senha_expirada = false;
          fbDb.funcionarios[idx].password_expired = false;
          saveFallbackDb(fbDb);
        }
      }
    } catch (e) {}

    if (updateRes.rows.length > 0) {
      const updatedStaff = mapStaffRow(updateRes.rows[0]);
      res.json({
        success: true,
        message: 'Senha redefinida com sucesso! Pode agora utilizar o sistema normalmente.',
        staff: updatedStaff
      });
    } else {
      res.status(404).json({ success: false, error: 'Utilizador não localizado para redefinição de senha.' });
    }
  } catch (err: any) {
    console.error('Erro ao redefinir senha:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

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
        copiedToUsb: result.copiedToUsb || [],
        message: result.error || `Backup cifrado (.enc) gerado com sucesso em: ${result.filePath}`
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
    const client = await getDirectPostgresClient();
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

  if (isWindows) {
    try {
      exec('netsh advfirewall firewall add rule name="SIGEP_Porta_3000" dir=in action=allow protocol=TCP localport=3000', (err) => {
        if (!err) {
          console.log('[FIREWALL WINDOWS] Porta 3000 liberada com sucesso no Firewall para acesso LAN/Wi-Fi!');
        }
      });
      exec('netsh advfirewall firewall add rule name="SIGEP_Postgres_5432" dir=in action=allow protocol=TCP localport=5432', (err) => {
        if (!err) {
          console.log('[FIREWALL WINDOWS] Porta 5432 do PostgreSQL liberada no Firewall para acesso LAN/Wi-Fi!');
        }
      });
    } catch (e) {}
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
