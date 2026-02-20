#!/bin/bash
# NunStock Dev Starter - รันทุกอย่างใน localhost

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚗 NunStock Dev Startup${NC}"
echo "================================"

# 1. เริ่ม PostgreSQL
echo -e "${YELLOW}📦 กำลังเริ่ม PostgreSQL...${NC}"
if [ "$(docker ps -q -f name=nunstock-db)" ]; then
  echo "  ✅ nunstock-db กำลังรันอยู่แล้ว"
else
  if [ "$(docker ps -aq -f name=nunstock-db)" ]; then
    docker start nunstock-db
    echo "  ✅ เริ่ม nunstock-db แล้ว"
  else
    docker run -d \
      --name nunstock-db \
      -e POSTGRES_DB=nunstock \
      -e POSTGRES_USER=nunstock \
      -e POSTGRES_PASSWORD=password123 \
      -p 5432:5432 \
      postgres:16-alpine
    echo "  ✅ สร้างและเริ่ม nunstock-db แล้ว"
    echo "  ⏳ รอ PostgreSQL พร้อม..."
    sleep 4
  fi
fi

# 2. Migrate + Seed (ถ้าเป็นครั้งแรก)
echo -e "${YELLOW}🗄️  กำลังตรวจสอบ Database...${NC}"
cd "$(dirname "$0")/backend"
npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init
npx prisma db seed 2>/dev/null || true
cd "$(dirname "$0")"

# 3. เริ่ม Backend + Frontend ด้วย concurrently หรือ 2 terminals
echo ""
echo -e "${GREEN}✅ พร้อมแล้ว! เปิดอีก 2 terminal แล้วรันคำสั่งต่อไป:${NC}"
echo ""
echo -e "  ${YELLOW}Terminal 2 (Backend):${NC}"
echo "    cd backend && npm run dev"
echo ""
echo -e "  ${YELLOW}Terminal 3 (Frontend):${NC}"
echo "    cd frontend && npm run dev -- --port 9090"
echo ""
echo -e "  ${BLUE}🌐 Frontend: http://localhost:9090${NC}"
echo -e "  ${BLUE}📡 Backend:  http://localhost:1100${NC}"
