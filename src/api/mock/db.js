// localStorage 数据层 + 种子数据

const KEYS = {
  users: 'shineng_users',
  elders: 'shineng_elders',
  assessments: 'shineng_assessments',
  sessions: 'shineng_sessions', // { [token]: userId }
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const db = {
  users: {
    all: () => read(KEYS.users, []),
    save: (list) => write(KEYS.users, list),
    byId: (id) => db.users.all().find((u) => u.id === id),
    byUsername: (username) => db.users.all().find((u) => u.username === username),
  },
  elders: {
    all: () => read(KEYS.elders, []),
    save: (list) => write(KEYS.elders, list),
    byId: (id) => db.elders.all().find((e) => e.id === id),
  },
  assessments: {
    all: () => read(KEYS.assessments, []),
    save: (list) => write(KEYS.assessments, list),
    byId: (id) => db.assessments.all().find((a) => a.id === id),
  },
  sessions: {
    all: () => read(KEYS.sessions, {}),
    save: (s) => write(KEYS.sessions, s),
  },
}

function seed() {
  if (db.users.all().length === 0) {
    db.users.save([
      {
        id: 'u_admin',
        username: 'admin',
        password: 'admin123',
        name: '系统管理员',
        role: 'admin',
        createdAt: Date.now(),
      },
      {
        id: 'u_staff',
        username: 'staff',
        password: 'staff123',
        name: '评估员小王',
        role: 'staff',
        createdAt: Date.now(),
      },
    ])
  }
  if (db.elders.all().length === 0) {
    db.elders.save([
      {
        id: 'e_demo1',
        name: '张大爷',
        gender: '男',
        age: 78,
        idCard: '110101194501012233',
        address: '北京市朝阳区望京街道',
        phone: '13800001111',
        childrenPhone: '13900002222',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ])
  }
}

seed()
