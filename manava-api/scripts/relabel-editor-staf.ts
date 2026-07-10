// Ganti label "Editor" -> "Staf" pada data free-text yang tersimpan di DB.
// Enum role & nama kolom internal tidak disentuh.
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Temukan tabel/kolom text yang memuat kata 'Editor' (case-sensitive, label)
  const cols = await prisma.$queryRaw<{ table_name: string; column_name: string }[]>(Prisma.sql`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type IN ('text', 'character varying')
  `)

  for (const { table_name, column_name } of cols) {
    const t = Prisma.raw(`"${table_name}"`)
    const c = Prisma.raw(`"${column_name}"`)
    const hits = await prisma.$queryRaw<{ n: bigint }[]>(
      Prisma.sql`SELECT count(*)::bigint AS n FROM ${t} WHERE ${c} LIKE '%Editor%'`
    )
    const n = Number(hits[0]?.n ?? 0)
    if (n === 0) continue
    // Jangan sentuh kolom enum-like role
    if (column_name === 'role') { console.log(`SKIP ${table_name}.${column_name} (${n} rows, role column)`); continue }
    const updated = await prisma.$executeRaw(
      Prisma.sql`UPDATE ${t} SET ${c} = replace(${c}, 'Editor', 'Staf') WHERE ${c} LIKE '%Editor%'`
    )
    console.log(`UPDATED ${table_name}.${column_name}: ${updated} rows (of ${n})`)
  }
  console.log('Done.')
}

main().finally(() => prisma.$disconnect())
