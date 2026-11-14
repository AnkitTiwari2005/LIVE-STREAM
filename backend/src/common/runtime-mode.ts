/**
 * Unified Runtime Environment Mode Evaluator (N1)
 *
 * Prevents string-matching vulnerabilities where unset, "Production", or "prod"
 * unintentionally activates developer/test backdoors.
 *
 * Dev/test mode is ONLY enabled when NODE_ENV is explicitly 'development' or 'test'.
 * All other environments (unset, 'production', 'Production', 'staging', 'prod', etc.)
 * are treated as production-like (fail-closed security).
 */
export function isDevMode(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = (env.NODE_ENV || '').trim().toLowerCase();
  return v === 'development' || v === 'test';
}

export function isProductionLike(env: NodeJS.ProcessEnv = process.env): boolean {
  return !isDevMode(env);
}
