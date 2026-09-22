// 由身份证号推算年龄、性别

function calcAge(birthDate) {
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const m = now.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--
  return age
}

// 解析 18 位身份证号，返回 { age, gender, birthDate }；非法返回 null
export function parseIdCard(idCard) {
  if (!idCard) return null
  const s = String(idCard).trim().toUpperCase()
  const m = s.match(/^(\d{6})(\d{8})(\d{3})[0-9X]$/)
  if (!m) return null
  const year = +m[2].slice(0, 4)
  const month = +m[2].slice(4, 6)
  const day = +m[2].slice(6, 8)
  const birthDate = new Date(year, month - 1, day)
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return null
  }
  const genderCode = +s.charAt(16) // 第 17 位，奇数为男
  return {
    age: calcAge(birthDate),
    gender: genderCode % 2 === 1 ? '男' : '女',
    birthDate,
  }
}
