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

The test container runs the **same pre-built image as prod** (`ghcr.io/itayole/salesflow-crm`) — only the env differs. You build & push the image once from a build machine; the QNAP just pulls it.

## Files
- `docker-compose.CRM_test.yml` — the test service (pulls the image; no build on the QNAP)
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

### 2. Build & push the image (on a build machine with the repo)
Only needed when the app code changes — the QNAP itself never builds.
```sh
docker login ghcr.io                              # once, with a GitHub PAT (write:packages)
docker build -t ghcr.io/itayole/salesflow-crm:latest .
docker tag  ghcr.io/itayole/salesflow-crm:latest ghcr.io/itayole/salesflow-crm:<version>
docker push ghcr.io/itayole/salesflow-crm:latest
docker push ghcr.io/itayole/salesflow-crm:<version>
```

### 3. On the QNAP (only needs this `deploy/test/` folder)
```sh
# create .env.test (gitignored). Pass the salesflow_app DB password:
sh make-env.sh '<salesflow_app_db_password>'
#   …or: cp .env.test.example .env.test  and edit the password + NEXTAUTH_SECRET

docker compose -f docker-compose.CRM_test.yml pull
docker compose -f docker-compose.CRM_test.yml up -d
```

Testers then use **http://192.168.1.197:3001**.

---

## Managing it
```sh
docker compose -f docker-compose.CRM_test.yml logs -f   # watch logs
docker compose -f docker-compose.CRM_test.yml restart   # restart
docker compose -f docker-compose.CRM_test.yml down      # stop & remove
# after a new image is pushed, update the test env:
docker compose -f docker-compose.CRM_test.yml pull && docker compose -f docker-compose.CRM_test.yml up -d
```

**Refresh the test data from prod later:** re-run the `BACKUP`/`RESTORE` in step 1
(drop `SalesFlowCRM_test` first), then `restart` the container.

---

## Notes
- **`NEXTAUTH_URL` must match the address testers use** (`http://192.168.1.197:3001`).
  A mismatch causes login redirect loops. Edit `.env.test` and `down`/`up` to change it.
- `.env.test` holds secrets and is **gitignored** + excluded from the Docker image
  (`.dockerignore` ignores `deploy/`), so it never travels via git or into the image.
- The QNAP **pulls a pre-built image** (`ghcr.io/itayole/salesflow-crm`) — it needs
  only this `deploy/test/` folder, not the full repo. Confirm the image name/tag in
  the compose matches what you push. Test and prod share the same image.
- Login uses the same hybrid auth as prod (local password or AD); the DB copy
  carries over all users.
