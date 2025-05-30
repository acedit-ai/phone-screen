#!/bin/bash

# Database Setup Script for Phone Rate Limiting
# This script automates the setup of PostgreSQL database on Fly.io

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="phone-screen-db"
DEFAULT_REGION="syd"

echo -e "${BLUE}🚀 Phone Screen Database Setup${NC}"
echo "=================================="

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo -e "${RED}❌ Fly CLI is not installed. Please install it first:${NC}"
    echo "curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is logged in
if ! fly auth whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Fly.io. Please run:${NC}"
    echo "fly auth login"
    exit 1
fi

# Get app name from fly.toml or ask user
if [ -f "fly.toml" ]; then
    APP_NAME=$(grep "^app = " fly.toml | sed 's/app = "\(.*\)"/\1/')
    echo -e "${GREEN}📱 Found app name in fly.toml: ${APP_NAME}${NC}"
else
    echo -e "${YELLOW}⚠️  No fly.toml found. Please enter your app name:${NC}"
    read -p "App name: " APP_NAME
fi

if [ -z "$APP_NAME" ]; then
    echo -e "${RED}❌ App name is required${NC}"
    exit 1
fi

# Get app region
echo -e "${BLUE}🌍 Getting app region...${NC}"
REGION=$(fly status --app "$APP_NAME" | grep "Region" | awk '{print $2}' | head -1)

if [ -z "$REGION" ]; then
    echo -e "${YELLOW}⚠️  Could not detect region. Using default: ${DEFAULT_REGION}${NC}"
    REGION=$DEFAULT_REGION
else
    echo -e "${GREEN}📍 Detected region: ${REGION}${NC}"
fi

# Check if database already exists
echo -e "${BLUE}🔍 Checking if database already exists...${NC}"
if fly postgres db list --app "$DB_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Database ${DB_NAME} already exists${NC}"
    read -p "Do you want to continue and attach it to your app? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}ℹ️  Skipping database creation${NC}"
        SKIP_CREATE=true
    fi
fi

# Create database if it doesn't exist
if [ "$SKIP_CREATE" != "true" ]; then
    echo -e "${BLUE}📊 Creating PostgreSQL database...${NC}"
    fly postgres create --name "$DB_NAME" --region "$REGION"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database created successfully${NC}"
    else
        echo -e "${RED}❌ Failed to create database${NC}"
        exit 1
    fi
fi

# Attach database to app
echo -e "${BLUE}🔗 Attaching database to app...${NC}"
fly postgres attach --app "$APP_NAME" "$DB_NAME"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database attached successfully${NC}"
else
    echo -e "${RED}❌ Failed to attach database${NC}"
    exit 1
fi

# Set encryption key if not already set
echo -e "${BLUE}🔐 Setting up encryption key...${NC}"
if ! fly secrets list --app "$APP_NAME" | grep -q "PHONE_ENCRYPTION_KEY"; then
    # Generate a random encryption key
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    fly secrets set PHONE_ENCRYPTION_KEY="$ENCRYPTION_KEY" --app "$APP_NAME"
    echo -e "${GREEN}✅ Encryption key set${NC}"
else
    echo -e "${YELLOW}ℹ️  Encryption key already exists${NC}"
fi

# Deploy app to initialize database
echo -e "${BLUE}🚀 Deploying app to initialize database...${NC}"
fly deploy --app "$APP_NAME"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ App deployed successfully${NC}"
else
    echo -e "${RED}❌ Failed to deploy app${NC}"
    exit 1
fi

# Wait a moment for the app to start
echo -e "${BLUE}⏳ Waiting for app to start...${NC}"
sleep 10

# Check if database was initialized
echo -e "${BLUE}🔍 Checking database initialization...${NC}"
if fly logs --app "$APP_NAME" | grep -q "Phone rate limiting database initialized successfully"; then
    echo -e "${GREEN}✅ Database initialized successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Database initialization not confirmed in logs${NC}"
    echo -e "${BLUE}ℹ️  You can check manually with: fly logs --app $APP_NAME${NC}"
fi

# Show final status
echo ""
echo -e "${GREEN}🎉 Database setup complete!${NC}"
echo "=================================="
echo -e "${BLUE}📊 Database name:${NC} $DB_NAME"
echo -e "${BLUE}📱 App name:${NC} $APP_NAME"
echo -e "${BLUE}🌍 Region:${NC} $REGION"
echo ""
echo -e "${BLUE}🔍 Next steps:${NC}"
echo "1. Check app status: fly status --app $APP_NAME"
echo "2. View logs: fly logs --app $APP_NAME"
echo "3. Check database: fly postgres connect --app $DB_NAME"
echo "4. Monitor metrics: curl https://$APP_NAME.fly.dev/health"
echo ""
echo -e "${GREEN}✅ Phone rate limiting is now persistent across deployments!${NC}" 