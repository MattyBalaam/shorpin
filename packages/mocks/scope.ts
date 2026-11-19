// Integration tests share one mock DB, each test seeding its own users as
// `{role}-{uuid}@test.com` (see integration-tests/helpers.ts). Queries that
// would otherwise return every user or waitlist entry are narrowed to the
// requester's uuid, so parallel tests can't see each other's data. Emails
// without a uuid (the dev seed) all share one scope.
const UUID_EMAIL = /-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@/;

function scopeOf(email: string): string | null {
  return UUID_EMAIL.exec(email)?.[1] ?? null;
}

export function inSameScope(email: string, requesterEmail: string): boolean {
  return scopeOf(email) === scopeOf(requesterEmail);
}
