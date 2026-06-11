#!/bin/sh
# Generate deploy/test/.env.test (gitignored) for the CRM_test deployment.
# The DB password is passed as an arg so it is never committed to the repo.
#
# Usage:  ./make-env.sh '<salesflow_app_db_password>'
set -e
cd "$(dirname "$0")"

if [ -f .env.test ]; then
  echo ".env.test already exists here — remove it first if you want to regenerate. Aborting."
  exit 1
fi

DBPASS="${1:?usage: ./make-env.sh '<salesflow_app_db_password>'}"

if command -v openssl >/dev/null 2>&1; then
  SECRET="$(openssl rand -base64 32)"
else
  SECRET="$(head -c 32 /dev/urandom | base64)"
fi

cat > .env.test <<EOF
NODE_ENV=production
DATABASE_URL=sqlserver://172.28.10.2\MFILES_SQL;database=SalesFlowCRM_test;user=salesflow_app;password=${DBPASS};encrypt=true;trustServerCertificate=true
NEXTAUTH_SECRET=${SECRET}
NEXTAUTH_URL=http://192.168.1.197:3001
LDAP_URL=ldap://172.28.10.1:389
LDAP_UPN_SUFFIX=shiluv.co.il
LDAP_NETBIOS=SHILUV
LDAP_BIND_MODE=upn
LDAP_TLS_REJECT_UNAUTHORIZED=true
LDAP_AUTO_PROVISION=false
EOF

echo ".env.test created in $(pwd)"
echo "Adjust NEXTAUTH_URL if testers reach the app via a different address."
