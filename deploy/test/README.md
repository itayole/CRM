# CRM_test — test deployment (QNAP)

A throwaway test environment that runs **alongside production** on the QNAP
(`192.168.1.197`) as a separate container **`CRM_test`** on port **3001**,
pointed at a **copy** of the database (`SalesFlowCRM_test`). Testers can do
anything — including deletes — without touching production data.

| | Production | Test (this dir) |
|---|---|---|
| Container | `salesflow-crm` | `CRM_test` |
| Port | 3000 | 3001 |
| Database | `SalesFlowCRM` | `SalesFlowCRM_test` |
| URL | http://192.168.1.197:3000 | http://192.168.1.197:3001 |

## Files
- `docker-compose.CRM_test.yml` — the test service (build context = repo root `../..`)
- `.env.test.example` — env template (copy to `.env.test`, which is gitignored)
- `make-env.sh` — generates `.env.test` with a fresh secret
- `README.md` — this file

---

## One-time setup

### 1. Create the test database (on the SQL Server box, SSMS / sysadmin)
```sql
BACKUP DATABASE [SalesFlowCRM] TO DISK = N'D:\Backups\SalesFlowCRM.bak' WITH INIT, COMPRESSION, STATS = 5;

-- restore as a NEW db with its own files (use the existing data folder to avoid
-- permission errors; confirm logical names with RESTORE FILELISTONLY first):
RESTORE DATABASE [SalesFlowCRM_test]
FROM DISK = N'D:\Backups\SalesFlowCRM.bak'
WITH MOVE N'SalesFlowCRM'     TO N'<sql data folder>\SalesFlowCRM_test.mdf',
     MOVE N'SalesFlowCRM_log' TO N'<sql data folder>\SalesFlowCRM_test_log.ldf',
     RECOVERY, STATS = 5;

USE [SalesFlowCRM_test];
CREATE USER [salesflow_app] FOR LOGIN [salesflow_app];
ALTER ROLE db_owner ADD MEMBER [salesflow_app];
```

### 2. On the QNAP (in the repo checkout)
```sh
git fetch && git checkout feat/pre-test-improvements   # or the merged branch
cd deploy/test

# create .env.test (gitignored). Pass the salesflow_app DB password:
sh make-env.sh '<salesflow_app_db_password>'
#   …or: cp .env.test.example .env.test  and edit the password + NEXTAUTH_SECRET

# build & start (prod on :3000 is unaffected):
docker compose -f docker-compose.CRM_test.yml up -d --build
```

Testers then use **http://192.168.1.197:3001**.

---

## Managing it
```sh
docker compose -f docker-compose.CRM_test.yml logs -f      # watch logs
docker compose -f docker-compose.CRM_test.yml restart      # restart
docker compose -f docker-compose.CRM_test.yml down         # stop & remove
docker compose -f docker-compose.CRM_test.yml up -d --build # rebuild after code changes
```

**Refresh the test data from prod later:** re-run the `BACKUP`/`RESTORE` in step 1
(drop `SalesFlowCRM_test` first), then `restart` the container.

---

## Notes
- **`NEXTAUTH_URL` must match the address testers use** (`http://192.168.1.197:3001`).
  A mismatch causes login redirect loops. Edit `.env.test` and `down`/`up` to change it.
- `.env.test` holds secrets and is **gitignored** + excluded from the Docker image
  (`.dockerignore` ignores `deploy/`), so it never travels via git or into the image.
- This compose **builds from the repo** (like prod's `docker-compose.yml`), so the
  QNAP needs the full checkout. If you instead deploy prod from a pre-built
  `ghcr.io/itayole/...` image, switch the `build:` block to `image:` and pull.
- Login uses the same hybrid auth as prod (local password or AD); the DB copy
  carries over all users.
