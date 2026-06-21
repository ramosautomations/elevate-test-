#!/bin/bash
# Setup script to restore authdb and run migrations
# Run this after Docker containers are started

set -e

echo "========================================"
echo "Elevate Database Setup"
echo "========================================"
echo ""

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Check if database is accessible
docker exec elevate-db pg_isready -U elevate || {
    echo "❌ Database not ready. Make sure containers are running:"
    echo "   docker compose ps"
    exit 1
}

echo "✓ Database is ready"
echo ""

# Restore the existing authdb backup
echo "Step 1: Restoring existing authdb..."
cat authdb-backup.sql | docker exec -i elevate-db psql -U elevate -d elevate

if [ $? -eq 0 ]; then
    echo "✓ Existing database restored"
else
    echo "❌ Failed to restore database"
    exit 1
fi

echo ""

# Run migrations to add new tables
echo "Step 2: Running migrations (adding employees and form_submissions tables)..."
cat 001_migration.sql | docker exec -i elevate-db psql -U elevate -d elevate

if [ $? -eq 0 ]; then
    echo "✓ Migrations completed"
else
    echo "❌ Migrations failed"
    exit 1
fi

echo ""
echo "========================================"
echo "Database Setup Complete!"
echo "========================================"
echo ""
echo "Tables created:"
echo "  ✓ users (existing, updated with role field)"
echo "  ✓ companies (existing)"
echo "  ✓ audit_log (existing)"
echo "  ✓ employees (new)"
echo "  ✓ form_submissions (new)"
echo ""
echo "You can verify with:"
echo "  docker exec elevate-db psql -U elevate -d elevate -c '\\dt'"
echo ""
