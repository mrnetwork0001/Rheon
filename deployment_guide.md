# 🌐 Rheon VPS & Vercel Deployment Guide

This guide details how to deploy the Rheon frontend on **Vercel** and the AI Sentry Node backend service on a fresh **VPS** using standard process isolation and SSL configuration (via a free `sslip.io` domain).

---

## 💻 Part 1: Sentry Node Backend Deployment on VPS

Follow these commands to configure your VPS from scratch.

### Step 1: Install Node.js (v20 LTS) & NPM
Run the following commands to install Node.js v20 cleanly on your fresh VPS:
```bash
# Update system package index
sudo apt update

# Add NodeSource official repository for Node v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and NPM
sudo apt install -y nodejs
```

Verify the installation:
```bash
node -v
npm -v
```

### Step 2: Install PM2 Process Manager
Install PM2 globally to run the Sentry daemon permanently in the background:
```bash
sudo npm install -g pm2
```

### Step 3: Clone & Install Dependencies
Clone your repository and install dependencies locally within the Sentry folder:
```bash
git clone https://github.com/mrnetwork0001/Rheon.git /var/www/rheon-sentry
cd /var/www/rheon-sentry/sentry
npm install
```

### Step 4: Compile TypeScript
Compile the Sentry Node source files:
```bash
npm run build
```

### Step 5: Configure Environment Variables
Create the Sentry configuration file:
```bash
nano .env
```
Paste the following parameters, replacing the private key placeholder with your hot wallet private key:
```env
SENTRY_PORT=4000
BOTCHAIN_RPC_URL=https://rpc.bohr.life
STREAMER_CONTRACT_ADDRESS=0x93dEa3e3Ab76cbD15FcB7703170Ed37391f42204
SENTRY_PRIVATE_KEY=<YOUR_SENTRY_PRIVATE_KEY>
TARGET_API_HEALTH_URL=https://status.openai.com/api/v2/status.json
```
*(Save and exit by pressing `CTRL+O`, `Enter`, then `CTRL+X`).*

### Step 6: Start Sentry Node under PM2
Start the service, freeze the process list, and configure it to auto-boot on VPS restarts:
```bash
pm2 start dist/monitor.js --name "rheon-sentry"
pm2 save
pm2 startup
```
*(Follow the command printed by the `pm2 startup` output if prompted).*

---

## 🔒 Part 2: Secure Nginx Reverse Proxy (SSL)

To allow the secure Vercel frontend (HTTPS) to fetch logs from your VPS (HTTP), we use a free wildcard domain resolver (`sslip.io`) that routes traffic directly to your VPS IP while supporting Let's Encrypt certificates.

### Step 1: Install Nginx & Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 2: Create a Site Configuration
Create a new site file:
```bash
sudo nano /etc/nginx/sites-available/rheon-sentry
```
Paste this server block (replace `<YOUR_VPS_IP>` by replacing all dots `.` with hyphens `-`. For example, `123.45.67.89` becomes `123-45-67-89`):
```nginx
server {
    listen 80;
    server_name <YOUR-VPS-IP-WITH-HYPHENS>.sslip.io;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # CORS configuration
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'X-Requested-With,Content-Type,Authorization' always;
    }
}
```

### Step 3: Enable Site Config
Symlink the config block and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/rheon-sentry /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

### Step 4: Issue a Free Let's Encrypt SSL Certificate
Run Certbot to fetch and install the certificate:
```bash
sudo certbot --nginx -d <YOUR-VPS-IP-WITH-HYPHENS>.sslip.io
```

Confirm that the service is running by visiting:
* `https://<YOUR-VPS-IP-WITH-HYPHENS>.sslip.io/status`
* `https://<YOUR-VPS-IP-WITH-HYPHENS>.sslip.io/logs`

---

## 🚀 Part 3: Connect Frontend on Vercel

1. Log in to your **Vercel Dashboard** and open your project settings.
2. Navigate to **Settings** $\rightarrow$ **Environment Variables**.
3. Configure the following environment variables:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_STREAMER_CONTRACT_ADDRESS` | `0x93dEa3e3Ab76cbD15FcB7703170Ed37391f42204` | Streamer contract address |
| `VITE_USDT_ADDRESS` | `0xa00D072A5A060f48Aa2aF79700a1FaA4140141c6` | USDT address |
| `VITE_BDEX_ROUTER_ADDRESS` | `0xD6425a02f0845B8D99e349C34D2E7A576E177345` | DEX Router address |
| `VITE_BOTCHAIN_RPC_URL` | `https://rpc.bohr.life` | RPC URL |
| `VITE_SENTRY_SERVER_URL` | `https://<YOUR-VPS-IP-WITH-HYPHENS>.sslip.io` | **Secure Sentry backend URL** |

4. Redeploy the project on Vercel. Your dashboard is now securely integrated with your live VPS watchdog!
