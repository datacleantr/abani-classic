import "dotenv/config";
import { eq } from "drizzle-orm";

import { db, pool } from "../src/db";
import { adminUsers } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

/**
 * Üretim ortamında ilk yöneticiyi oluşturur veya parolasını sıfırlar.
 * Kullanım:
 *   npx tsx scripts/create-admin.ts "Ad Soyad" email@firma.com "GucluParola!" super_admin
 */
async function main() {
  const [name, email, password, role = "super_admin"] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.error('Kullanım: npx tsx scripts/create-admin.ts "Ad Soyad" email parola [rol]');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Parola en az 12 karakter olmalı.");
    process.exit(1);
  }

  const normalized = email.trim().toLowerCase();
  const existing = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, normalized))
    .limit(1);

  if (existing[0]) {
    await db
      .update(adminUsers)
      .set({ name, passwordHash: hashPassword(password), role, isActive: true })
      .where(eq(adminUsers.id, existing[0].id));
    console.log(`Güncellendi: ${normalized} (${role})`);
  } else {
    await db.insert(adminUsers).values({
      name,
      email: normalized,
      passwordHash: hashPassword(password),
      role,
    });
    console.log(`Oluşturuldu: ${normalized} (${role})`);
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
