# Schema Setup Journal

Running log of issues, fixes, and notes discovered during development.

---

## 1. `.env.example` not tracked by git

**Issue:** The `schema/backend/.gitignore` contains `.env` which also matched `.env.example`, preventing it from being committed. The file existed locally but was missing on the server after `git pull`.

**Fix:** Force-add the file: `git add -f schema/backend/.env.example`

---

## 2. Docker permission denied on Ubuntu

**Issue:** Running `docker compose up -d` failed with "permission denied while trying to connect to the Docker daemon socket."

**Fix:** Add user to the docker group and re-login:

```bash
sudo usermod -aG docker $USER
# Then logout and SSH back in
```

---

## 4. Prisma seed fails — `null` in compound unique upsert

**Issue:** `npx prisma db seed` crashed with `Argument parentId must not be null`. The `Category` model has `@@unique([businessId, name, parentId])` where `parentId` is nullable. Prisma doesn't support `null` values in compound unique `where` clauses for upserts (SQL treats `NULL != NULL`).

**Fix:** Changed `seed.ts` to use `findFirst` + `create` instead of `upsert` for top-level categories (where `parentId` is null).

---

## 5. NestJS `path-to-regexp` wildcard deprecation warning

**Issue:** On startup, NestJS warns: `Unsupported route path: "/api/v1/*"`. The latest `path-to-regexp` requires named parameters (e.g., `/api/v1/*path` instead of `/api/v1/*`).

**Fix:** Non-blocking — NestJS auto-converts it. Will need to update when upgrading NestJS. Cosmetic only.

---

## 3. `docker-compose.yml` obsolete `version` attribute

**Issue:** Docker Compose v2 warns that `version: "3.9"` is obsolete and will be ignored.

**Fix:** Remove the `version: "3.9"` line from `docker-compose.yml`. Cosmetic only — not blocking.
