#!/bin/bash

# Production start script for Render deployment
echo "🚀 Starting QzonMe production server..."

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "❌ ERROR: SESSION_SECRET environment variable is not set"
    exit 1
fi

# Set NODE_ENV to production if not already set
export NODE_ENV=${NODE_ENV:-production}

echo "✅ Environment: $NODE_ENV"
echo "✅ Database URL: ${DATABASE_URL:0:30}..." # Only show first 30 chars for security

# Start the server
echo "🔧 Starting server..."
exec node dist/index.js
