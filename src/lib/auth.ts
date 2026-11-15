import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { adminUsers, customers, sessions } from "@/db/schema";
import { createSessionToken, hashPassword, verifyPassword } from "./password";

export const SESSION_COOKIE = "abani_session";
const SESSION_TTL_DAYS = 14;

export type AdminRole =
  | "super_admin"
  | "catalog_manager"
  | "inventory_manager"
  | "order_manager"
  | "content_editor"
  | "customer_support"
  | "analyst";

export type AdminIdentity = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

export type CustomerIdentity = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type SessionIdentity =
  | { type: "admin"; admin: AdminIdentity }
  | { type: "customer"; customer: CustomerIdentity }
  | null;

async function createSession(subjectType: "admin" | "customer", subjectId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, subjectType, subjectId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSessionIdentity(): Promise<SessionIdentity> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ session: sessions, admin: adminUsers })
    .from(sessions)
    .leftJoin(adminUsers, eq(adminUsers.id, sessions.subjectId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (row.session.subjectType === "admin" && row.admin) {
    return {
      type: "admin",
      admin: {
        id: row.admin.id,
        email: row.admin.email,
        name: row.admin.name,
        role: row.admin.role as AdminRole,
      },
    };
  }

  const customer = await db
    .select()
    .from(customers)
    .where(eq(customers.id, row.session.subjectId))
    .limit(1);

  if (row.session.subjectType === "customer" && customer[0]) {
    return {
      type: "customer",
      customer: {
        id: customer[0].id,
        email: customer[0].email,
        firstName: customer[0].firstName,
        lastName: customer[0].lastName,
      },
    };
  }

  return null;
}

export async function requireAdmin(): Promise<AdminIdentity> {
  const identity = await getSessionIdentity();
  if (!identity || identity.type !== "admin") {
    redirect("/admin/giris");
  }
  return identity.admin;
}

export function canManageCatalog(role: AdminRole) {
  return role === "super_admin" || role === "catalog_manager" || role === "content_editor";
}

export function canManageInventory(role: AdminRole) {
  return role === "super_admin" || role === "inventory_manager" || role === "catalog_manager";
}

export function canManageOrders(role: AdminRole) {
  return (
    role === "super_admin" ||
    role === "order_manager" ||
    role === "customer_support" ||
    role === "inventory_manager"
  );
}

export function canManageImports(role: AdminRole) {
  return role === "super_admin" || role === "catalog_manager";
}

export function canIssueRefund(role: AdminRole) {
  return role === "super_admin" || role === "order_manager";
}

export type ActionResult = { ok: boolean; message: string };

export async function loginAdmin(email: string, password: string): Promise<ActionResult> {
  const normalized = email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.email, normalized), eq(adminUsers.isActive, true)))
    .limit(1);
  const admin = rows[0];
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return { ok: false, message: "E-posta veya parola hatalı." };
  }
  await createSession("admin", admin.id);
  return { ok: true, message: "Hoş geldiniz." };
}

export async function loginCustomer(email: string, password: string): Promise<ActionResult> {
  const normalized = email.trim().toLowerCase();
  const rows = await db.select().from(customers).where(eq(customers.email, normalized)).limit(1);
  const customer = rows[0];
  if (!customer || !verifyPassword(password, customer.passwordHash)) {
    return { ok: false, message: "E-posta veya parola hatalı." };
  }
  await createSession("customer", customer.id);
  return { ok: true, message: "Hoş geldiniz." };
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  marketingConsent: boolean;
}): Promise<ActionResult> {
  const normalized = input.email.trim().toLowerCase();
  const existing = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.email, normalized))
    .limit(1);

  let customerId = existing[0]?.id;
  if (customerId) {
    return { ok: false, message: "Bu e-posta ile bir hesap zaten var. Giriş yapmayı deneyin." };
  }

  const [created] = await db
    .insert(customers)
    .values({
      email: normalized,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      passwordHash: hashPassword(input.password),
      marketingConsent: input.marketingConsent,
    })
    .returning();
  customerId = created.id;

  await createSession("customer", customerId);
  return { ok: true, message: "Hesabınız oluşturuldu." };
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  jar.delete(SESSION_COOKIE);
}
