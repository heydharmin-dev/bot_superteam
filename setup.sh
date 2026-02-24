#!/bin/bash
set -e

echo "========================================="
echo "  Superteam Bot - Server Setup Script"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Installing Node.js 20...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}Node.js already installed: $(node -v)${NC}"
fi

# Step 2: Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2...${NC}"
    sudo npm install -g pm2
else
    echo -e "${GREEN}PM2 already installed${NC}"
fi

# Step 3: Install serve if not present
if ! command -v serve &> /dev/null; then
    echo -e "${YELLOW}Installing serve...${NC}"
    sudo npm install -g serve
else
    echo -e "${GREEN}serve already installed${NC}"
fi

# Step 4: Clone repo if not present
INSTALL_DIR="$HOME/bot_superteam"
if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Cloning repository...${NC}"
    git clone https://github.com/heydharmin-dev/bot_superteam.git "$INSTALL_DIR"
else
    echo -e "${GREEN}Repository already cloned. Pulling latest...${NC}"
    cd "$INSTALL_DIR" && git pull origin main
fi

cd "$INSTALL_DIR"

# Step 5: Collect credentials
echo ""
echo "========================================="
echo "  Enter your credentials"
echo "========================================="
echo ""

# Bot token
read -p "Telegram Bot Token (from @BotFather): " BOT_TOKEN
if [ -z "$BOT_TOKEN" ]; then
    echo -e "${RED}Bot token is required!${NC}"
    exit 1
fi

# Supabase
read -p "Supabase URL (https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
read -p "Supabase Service Role Key: " SUPABASE_SERVICE_KEY

# Group IDs
read -p "Main Group ID (e.g. -1001234567890): " MAIN_GROUP_ID
read -p "Intro Channel ID (e.g. -1009876543210): " INTRO_CHANNEL_ID

# Enforcement mode
echo ""
echo "Enforcement mode:"
echo "  1) mute (restrict permissions until intro)"
echo "  2) auto_delete (delete messages and remind)"
read -p "Choose [1/2] (default: 1): " ENFORCEMENT_CHOICE
if [ "$ENFORCEMENT_CHOICE" = "2" ]; then
    ENFORCEMENT_MODE="auto_delete"
else
    ENFORCEMENT_MODE="mute"
fi

# Step 6: Create bot .env
echo -e "${YELLOW}Creating bot/.env...${NC}"
cat > "$INSTALL_DIR/bot/.env" << EOF
BOT_TOKEN=$BOT_TOKEN
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
MAIN_GROUP_ID=$MAIN_GROUP_ID
INTRO_CHANNEL_ID=$INTRO_CHANNEL_ID
ENFORCEMENT_MODE=$ENFORCEMENT_MODE
EOF

# Step 7: Create dashboard .env
echo -e "${YELLOW}Creating dashboard/.env...${NC}"
cat > "$INSTALL_DIR/dashboard/.env" << EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
EOF

# Step 8: Install bot dependencies
echo -e "${YELLOW}Installing bot dependencies...${NC}"
cd "$INSTALL_DIR/bot"
npm install

# Step 9: Install dashboard dependencies and build
echo -e "${YELLOW}Installing dashboard dependencies and building...${NC}"
cd "$INSTALL_DIR/dashboard"
npm install
npm run build

# Step 10: Stop existing processes if running
pm2 delete superteam-bot 2>/dev/null || true
pm2 delete superteam-dashboard 2>/dev/null || true

# Step 11: Start bot with PM2
echo -e "${YELLOW}Starting bot...${NC}"
cd "$INSTALL_DIR/bot"
pm2 start src/bot.js --name superteam-bot

# Step 12: Start dashboard with PM2
echo -e "${YELLOW}Starting dashboard...${NC}"
pm2 start "serve -s $INSTALL_DIR/dashboard/dist -l 3000" --name superteam-dashboard

# Step 13: Save PM2 config and setup startup
pm2 save
pm2 startup 2>/dev/null || echo -e "${YELLOW}Run the command above with sudo if shown${NC}"

# Done
echo ""
echo "========================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "========================================="
echo ""
echo -e "Bot status:      ${GREEN}Running${NC}"
echo -e "Dashboard:       ${GREEN}http://$(curl -s ifconfig.me):3000${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 logs superteam-bot        - View bot logs"
echo "  pm2 logs superteam-dashboard  - View dashboard logs"
echo "  pm2 restart superteam-bot     - Restart bot"
echo "  pm2 status                    - See all processes"
echo ""
echo -e "${YELLOW}IMPORTANT: Don't forget to:${NC}"
echo "  1. Run the SQL schema in Supabase SQL Editor (bot/supabase-schema.sql)"
echo "  2. Create an admin user in Supabase Auth > Users"
echo "  3. Open port 3000 in GCP firewall:"
echo "     gcloud compute firewall-rules create allow-dashboard --allow tcp:3000"
echo ""
