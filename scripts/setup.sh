#!/bin/bash
# Bootstrap script for HouseFlow
#
# This script installs dependencies and starts the development server.
# It assumes that Node.js and npm are installed on the system.

set -e

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not installed. Please install Node.js and npm first." >&2
  exit 1
fi

echo "Installing dependencies…"
npm install

echo "Starting development server…"
npm run dev