const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const passwordHash = await bcrypt.hash('demo1234', 12)

  // Create demo users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: { email: 'admin@demo.com', passwordHash, displayName: 'Admin User', role: 'admin', emailVerified: true }
  })

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@demo.com' },
    update: {},
    create: { email: 'teacher@demo.com', passwordHash, displayName: 'Ms Smith', role: 'teacher', emailVerified: true }
  })

  const student = await prisma.user.upsert({
    where: { email: 'student@demo.com' },
    update: {},
    create: { email: 'student@demo.com', passwordHash, displayName: 'Alex Johnson', role: 'student', emailVerified: true }
  })

  // Create demo dataset (Dota 2 hero stats)
  const heroData = [
    { name: 'Anti-Mage', primary_attr: 'agi', base_attack_min: 29, base_attack_max: 33, base_armor: 1, move_speed: 310, win_rate: 47.5 },
    { name: 'Axe', primary_attr: 'str', base_attack_min: 27, base_attack_max: 43, base_armor: 2, move_speed: 310, win_rate: 51.2 },
    { name: 'Bane', primary_attr: 'int', base_attack_min: 22, base_attack_max: 32, base_armor: 0, move_speed: 315, win_rate: 48.8 },
    { name: 'Crystal Maiden', primary_attr: 'int', base_attack_min: 21, base_attack_max: 27, base_armor: -1, move_speed: 280, win_rate: 49.1 },
    { name: 'Dragon Knight', primary_attr: 'str', base_attack_min: 31, base_attack_max: 39, base_armor: 3, move_speed: 310, win_rate: 50.7 },
    { name: 'Juggernaut', primary_attr: 'agi', base_attack_min: 29, base_attack_max: 33, base_armor: 5, move_speed: 305, win_rate: 48.3 },
    { name: 'Lion', primary_attr: 'int', base_attack_min: 20, base_attack_max: 28, base_armor: 1, move_speed: 290, win_rate: 52.1 },
    { name: 'Phantom Assassin', primary_attr: 'agi', base_attack_min: 29, base_attack_max: 37, base_armor: 3, move_speed: 305, win_rate: 46.9 },
    { name: 'Pudge', primary_attr: 'str', base_attack_min: 32, base_attack_max: 38, base_armor: 1, move_speed: 298, win_rate: 46.2 },
    { name: 'Snipers', primary_attr: 'agi', base_attack_min: 24, base_attack_max: 26, base_armor: 0, move_speed: 290, win_rate: 48.6 },
  ]

  const schema = [
    { name: 'name', type: 'string' }, { name: 'primary_attr', type: 'string' },
    { name: 'base_attack_min', type: 'number' }, { name: 'base_attack_max', type: 'number' },
    { name: 'base_armor', type: 'number' }, { name: 'move_speed', type: 'number' }, { name: 'win_rate', type: 'number' }
  ]

  // Dataset — skip if already exists
  let dataset = await prisma.dataset.findFirst({ where: { ownerId: teacher.id, title: 'Dota 2 Hero Stats (Demo)' } })
  if (!dataset) {
    dataset = await prisma.dataset.create({
      data: { ownerId: teacher.id, title: 'Dota 2 Hero Stats (Demo)', description: 'Base stats for popular Dota 2 heroes. Use for averages, ratios, and comparison lessons.', sourceType: 'csv_upload', schema, rowCount: heroData.length, refreshedAt: new Date() }
    })
    await prisma.datasetRow.createMany({ data: heroData.map((row, i) => ({ datasetId: dataset.id, row, rowIndex: i })) })
    console.log('Created demo dataset')
  } else {
    console.log('Demo dataset already exists — skipping')
  }

  // Classroom — upsert by joinCode
  const classroom = await prisma.classroom.upsert({
    where: { joinCode: 'DEMO01' },
    update: {},
    create: { teacherId: teacher.id, name: 'Year 10 Maths - Set 1', keyStage: 'KS4', description: 'Demo classroom for esports maths lessons', joinCode: 'DEMO01' }
  })

  // Add student to classroom — skip if already a member
  const alreadyMember = await prisma.classroomMember.findUnique({
    where: { classroomId_studentId: { classroomId: classroom.id, studentId: student.id } }
  })
  if (!alreadyMember) {
    await prisma.classroomMember.create({ data: { classroomId: classroom.id, studentId: student.id, status: 'active' } })
    console.log('Added student to classroom')
  }

  console.log('Seed complete!')
  console.log('Demo accounts: admin@demo.com | teacher@demo.com | student@demo.com (password: demo1234)')
}

main().catch(console.error).finally(() => prisma.$disconnect())
