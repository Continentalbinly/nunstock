# 🚗 NunStock - ระบบคลังอะไหล่ร้านซ่อมรถยนต์

ระบบจัดการคลังอะไหล่ร้านซ่อมรถยนต์ครบวงจร ภาษาไทย 100%

## Tech Stack
- **Frontend**: Next.js 15 + Tailwind CSS v4 + shadcn/ui (Port 9090)
- **Backend**: Hono.js 4 + Prisma 6 (Port 1100)
- **Database**: PostgreSQL 16
- **Barcode**: JsBarcode (CODE128)
- **Deploy**: Docker Compose + GitHub Actions

## ฟีเจอร์
- 📊 Dashboard สรุปสต็อก + แจ้งเตือนของใกล้หมด
- 📦 คลังอะไหล่ (ค้นหา, กรองตามประเภท)
- ➕ จัดการอะไหล่ (เพิ่ม/แก้ไข/ลบ)
- 🔍 เบิกอะไหล่ (สแกนบาร์โค้ด)
- 🖨️ สร้าง & พิมพ์บาร์โค้ด CODE128
- 🏥 เคลมอะไหล่กับประกัน
- 🔔 แจ้งเตือนลูกค้า (รองรับ LINE OA ในอนาคต)

## เริ่มต้น Development

### 1. ตั้งค่า Environment
```bash
# Root
cp .env.example .env

# Backend
cp backend/.env.example backend/.env
```

### 2. รัน PostgreSQL
```bash
docker compose up -d postgres
```

### 3. Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
# http://localhost:1100
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:9090
```

## Production Deploy (Docker)
```bash
cp .env.example .env
# แก้ DB_PASSWORD ใน .env

docker compose up -d --build
```

## GitHub Actions (Auto Deploy)
ตั้งค่า GitHub Secrets:
- `VPS_HOST` - IP ของ VPS
- `VPS_USER` - username (เช่น root, ubuntu)
- `VPS_SSH_KEY` - SSH Private Key
- `VPS_PORT` - SSH Port (ปกติ 22)

Push ไปที่ `main` จะ auto deploy ทันที!

## ประเภทอะไหล่ (8 ประเภท)
- 🔧 อะไหล่สิ้นเปลือง
- 🔩 อะไหล่ซ่อม
- 🚗 Body Part
- 💡 ระบบไฟ
- ❄️ ระบบแอร์
- 🔋 แบตเตอรี่และไฟฟ้า
- 🛞 ยางและล้อ
- 📦 อื่นๆ