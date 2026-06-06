/**
 * Reset (or create) the emailpass credentials for an admin user.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@digitalrohtak.com ADMIN_PASSWORD='NewStrongPass123!' \
 *     npx medusa exec ./src/scripts/reset-admin-password.ts
 *
 * What it does:
 *   1. Ensures a user row exists for ADMIN_EMAIL (creates one if missing).
 *   2. Registers/updates the emailpass credentials with ADMIN_PASSWORD using
 *      Medusa's auth module (properly hashed).
 *   3. Links the resulting auth_identity.app_metadata.user_id to the user so
 *      the admin /app login works.
 */
import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createUsersWorkflow } from "@medusajs/medusa/core-flows";

export default async function resetAdminPassword({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userService = container.resolve(Modules.USER);
  const authService = container.resolve(Modules.AUTH);

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    logger.error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running.");
    return;
  }

  // 1. user row
  let [user] = await userService.listUsers({ email });
  if (!user) {
    logger.info(`Creating user row for ${email}`);
    const { result } = await createUsersWorkflow(container).run({
      input: { users: [{ email }] },
    });
    user = result[0];
  }
  logger.info(`user: ${user.id}`);

  // 2. remove any stale provider_identity / auth_identity for this email
  const existing = await authService.listAuthIdentities({
    provider_identities: { entity_id: email, provider: "emailpass" },
  } as any);
  for (const id of existing) {
    logger.info(`removing stale auth_identity ${id.id}`);
    await authService.deleteAuthIdentities(id.id);
  }

  // 3. register fresh credentials via the auth provider
  const reg = await authService.register("emailpass", {
    body: { email, password },
  } as any);
  if (!reg.success || !reg.authIdentity) {
    logger.error(`register failed: ${reg.error || "unknown"}`);
    return;
  }

  // 4. link auth identity -> user
  await authService.updateAuthIdentities([
    {
      id: reg.authIdentity.id,
      app_metadata: { user_id: user.id },
    },
  ]);

  logger.info("──────────────────────────────────────────────");
  logger.info(`Email    : ${email}`);
  logger.info(`User ID  : ${user.id}`);
  logger.info(`Auth ID  : ${reg.authIdentity.id}`);
  logger.info("Password has been set. You can log in at /app now.");
  logger.info("──────────────────────────────────────────────");
}
