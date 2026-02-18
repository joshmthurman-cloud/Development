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

## 6. Backend not accessible from browser — localhost binding

**Issue:** NestJS `app.listen(port)` defaults to `127.0.0.1`, so it only accepts connections from the server itself. Browser on Windows couldn't reach it.

**Fix:** Changed `main.ts` to `app.listen(port, '0.0.0.0')` to bind to all interfaces. Access from Windows via SSH tunnel: `ssh -L 8901:localhost:8901 josh@10.200.0.235`, then browse `http://localhost:8901/api/v1/health`.

**Note:** All other apps on this server (TPN Builder, CEDP, DEJ) also bind to `0.0.0.0` on the `10.200.0.235` private network.

---

## 8. Future: Startup script (.sh) for server

**Note:** Create a single startup script (`.sh` on the server, not `.bat`) at `~/Development/schema/` that automates all startup steps without terminal dependency:
- Start Docker containers, wait for healthy
- Start backend (NestJS) in background, verify health endpoint responds
- Start frontend (Next.js) in background on port 8095
- Health checks at each step before proceeding
- Should run detached so closing the SSH session doesn't kill the apps (use `nohup` or `pm2`)
- Include a matching `stop.sh` to tear everything down

---

## 7. Future: Admin dashboard page

**Note:** Need to create an admin page with a dashboard showing available pages/endpoints (like health). The health status should be a small, simple dashboard — just the single metric, nothing crazy.

---

## 3. `docker-compose.yml` obsolete `version` attribute

**Issue:** Docker Compose v2 warns that `version: "3.9"` is obsolete and will be ignored.

**Fix:** Remove the `version: "3.9"` line from `docker-compose.yml`. Cosmetic only — not blocking.
