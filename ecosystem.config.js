// PM2 Ecosystem Config สำหรับ Production (VPS)
// ใช้งาน: pm2 start ecosystem.config.js

module.exports = {
    apps: [
        {
            name: "nunstock-backend",
            script: "dist/index.js",
            cwd: "/var/www/nunstock/backend",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "300M",
            env: {
                NODE_ENV: "production",
                PORT: 1100,
            },
        },
        {
            name: "nunstock-frontend",
            script: "npm",
            args: "start",
            cwd: "/var/www/nunstock/frontend",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "500M",
            env: {
                NODE_ENV: "production",
                PORT: 9090,
                NEXT_PUBLIC_API_URL: "http://localhost:1100",
            },
        },
    ],
};
