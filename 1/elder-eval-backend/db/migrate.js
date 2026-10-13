// 一次性数据迁移脚本：旧表结构（camelCase + 字符串前缀主键 + 物理删除）→ 新表结构（开发手册规范）
// 用法：node db/migrate.js
// 幂等：检测到已是新表结构时直接跳过。
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'elder-eval.db');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = OFF');

function tableColumns(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((r) => r.name);
}

// 旧表用 createdAt（camelCase），新表用 created_at（snake_case）
function isOldSchema() {
  const cols = tableColumns('users');
  return cols.includes('createdAt');
}

function mapGender(gender) {
  if (gender === '男') return 'MALE';
  if (gender === '女') return 'FEMALE';
  return gender || null;
}

async function migrate() {
  if (!isOldSchema()) {
    console.log('已是新表结构，无需迁移');
    return;
  }

  console.log('检测到旧表结构，开始迁移…');
  db.exec('BEGIN');
  try {
    // 1. 建新表（临时名，避免与旧表冲突）
    db.exec(`CREATE TABLE users_new (
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
    db.exec(`CREATE TABLE elders_new (
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
    db.exec(`CREATE TABLE assessments_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      elder_id INTEGER NOT NULL,
      scores TEXT NOT NULL,
      dimension_levels TEXT NOT NULL,
      computed_level INTEGER NOT NULL,
      manual_level INTEGER NOT NULL,
      corrected BOOLEAN NOT NULL DEFAULT 0,
      correction_note TEXT,
      qa TEXT,
      assessor TEXT,
      assessor_id INTEGER,
      date TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      is_deleted BOOLEAN NOT NULL DEFAULT 0,
      deleted_at DATETIME,
      FOREIGN KEY (elder_id) REFERENCES elders(id),
      FOREIGN KEY (assessor_id) REFERENCES users(id)
    )`);

    // 2. 复制 users：自增 id 顺次生成，updated_at 用 createdAt 补齐
    const userMap = {};
    const insertUser = db.prepare(
      'INSERT INTO users_new (username, password, name, role, created_at, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const u of db.prepare('SELECT * FROM users ORDER BY createdAt ASC').all()) {
      const r = insertUser.run(u.username, u.password, u.name, u.role, u.createdAt, u.createdAt, 0);
      userMap[u.id] = Number(r.lastInsertRowid);
    }

    // 3. 复制 elders：gender 文案转枚举码
    const elderMap = {};
    const insertElder = db.prepare(
      'INSERT INTO elders_new (name, gender, age, id_card, address, phone, children_phone, created_at, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const e of db.prepare('SELECT * FROM elders ORDER BY createdAt ASC').all()) {
      const r = insertElder.run(
        e.name, mapGender(e.gender), e.age, e.idCard, e.address, e.phone, e.childrenPhone, e.createdAt, e.updatedAt, 0
      );
      elderMap[e.id] = Number(r.lastInsertRowid);
    }

    // 4. 复制 assessments：elder_id/assessor_id 按映射改写；悬空的 assessor_id 置 NULL（姓名保留在 assessor）
    const insertAssess = db.prepare(
      'INSERT INTO assessments_new (elder_id, scores, dimension_levels, computed_level, manual_level, corrected, correction_note, qa, assessor, assessor_id, date, created_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const a of db.prepare('SELECT * FROM assessments ORDER BY createdAt ASC').all()) {
      const elderId = elderMap[a.elderId] ?? null;
      const assessorId = userMap[a.assessorId] ?? null;
      insertAssess.run(
        elderId, a.scores, a.dimensionLevels, a.computedLevel, a.manualLevel,
        a.corrected ? 1 : 0, a.correctionNote, a.qa ?? null, a.assessor, assessorId, a.date, a.createdAt, 0
      );
    }

    // 5. 删旧表、新表改名、建索引
    db.exec('DROP TABLE assessments');
    db.exec('DROP TABLE elders');
    db.exec('DROP TABLE users');
    db.exec('ALTER TABLE assessments_new RENAME TO assessments');
    db.exec('ALTER TABLE elders_new RENAME TO elders');
    db.exec('ALTER TABLE users_new RENAME TO users');
    db.exec('CREATE INDEX idx_elders_created_at ON elders(created_at)');
    db.exec('CREATE INDEX idx_assessments_elder_id ON assessments(elder_id)');
    db.exec('CREATE INDEX idx_assessments_created_at ON assessments(created_at)');

    db.exec('COMMIT');
    console.log('迁移完成：users/elders/assessments 已切换为规范表结构');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

migrate()
  .then(() => {
    db.close();
    console.log('数据库迁移脚本执行完毕');
  })
  .catch((e) => {
    console.error('迁移失败:', e);
    process.exit(1);
  });
