const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

// 支持通过环境变量切换数据库文件（测试隔离用），默认仍为项目内 elder-eval.db
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'elder-eval.db');
const db = new DatabaseSync(DB_PATH);

// SQLite 默认关闭外键约束，需每个连接手动开启
db.exec('PRAGMA foreign_keys = ON');

// 统一的查询封装：路由层沿用 await run/get/all 的写法（Node >= 22.5 内置 node:sqlite，无需原生编译）
function run(sql, params = []) {
  const result = db.prepare(sql).run(...params);
  return {
    lastID: Number(result.lastInsertRowid),
    changes: Number(result.changes)
  };
}

function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

// 建表：按开发手册统一 snake_case 命名、BIGINT 主键、BOOLEAN 布尔、软删除字段
function createTables() {
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS elders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    gender TEXT,
    age INTEGER,
    id_card TEXT,
    address TEXT,
    phone TEXT,
    children_phone TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    elder_id INTEGER NOT NULL,
    scores TEXT NOT NULL,
    dimension_levels TEXT NOT NULL,
    computed_level INTEGER NOT NULL,
    manual_level INTEGER NOT NULL,
    corrected BOOLEAN NOT NULL DEFAULT 0,
    correction_note TEXT,
    assessor TEXT,
    assessor_id INTEGER,
    date TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    FOREIGN KEY (elder_id) REFERENCES elders(id),
    FOREIGN KEY (assessor_id) REFERENCES users(id)
  )`);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_elders_created_at ON elders(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_assessments_elder_id ON assessments(elder_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at)`);
}

async function init() {
  createTables();

  // 启动时自动生成管理员账号 admin / admin123（仅在不存在时创建）
  const admin = get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10);
    const now = Date.now();
    run(
      'INSERT INTO users (username, password, name, role, created_at, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['admin', hash, '系统管理员', 'admin', now, now, 0]
    );
    console.log('已初始化管理员账号 admin / admin123');
  }
}

module.exports = { db, run, get, all, createTables, init };
