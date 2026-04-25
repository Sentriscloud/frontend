# VPS Setup — Sentrix Wallet

## 1. Create project directory on VPS

```bash
ssh -i ~/.ssh/satya_vps sentriscloud@103.150.92.25 'mkdir -p /home/sentriscloud/projects/sentrix-wallet'
```

## 2. Copy docker-compose.yml to VPS

```bash
scp -i ~/.ssh/satya_vps docker-compose.yml sentriscloud@103.150.92.25:/home/sentriscloud/projects/sentrix-wallet/
```

## 3. Install Nginx + Certbot on VPS

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

## 4. Setup Nginx config

```bash
sudo cp nginx.conf /etc/nginx/sites-available/sentrix
sudo ln -s /etc/nginx/sites-available/sentrix /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Get SSL certificates

```bash
sudo certbot --nginx -d sentrix-wallet.sentriscloud.com -d sentrix-api.sentriscloud.com
```

## 6. Add GitHub Secrets

Go to: github.com/sentrix-labs/sentrix-wallet → Settings → Secrets → Actions

| Secret | Value |
|---|---|
| `VPS_HOST` | `103.150.92.25` |
| `VPS_USER` | `sentriscloud` |
| `VPS_SSH_KEY` | Contents of `satya_vps` private key |
