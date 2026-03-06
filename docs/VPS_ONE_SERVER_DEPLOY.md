# Rangoon F&B - One VPS Deploy (Simple)

This deploy uses only one server with Docker:
- `frontend` (Next.js)
- `backend` (NestJS)
- `postgres`
- `nginx` (single public entry)

## 1) Prepare VPS

Install Docker and Compose plugin:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

## 2) Upload project

```bash
git clone https://github.com/cthuhtetaung/rangoon.git
cd rangoon
```

## 3) Create env file

```bash
cp .env.vps.example .env.vps
nano .env.vps
```

Set real values:
- `DB_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGIN` (your domain or VPS public IP)

## 4) Run

```bash
docker compose --env-file .env.vps -f docker-compose.vps.yml up -d --build
```

## 5) Check

```bash
docker compose --env-file .env.vps -f docker-compose.vps.yml ps
curl http://127.0.0.1/api/health
```

Open from browser:
- `http://YOUR_SERVER_DOMAIN_OR_IP/login`

## 6) Admin login

- User: `admin`
- Password: `Outsider061484`

## Useful commands

```bash
# Logs
docker compose --env-file .env.vps -f docker-compose.vps.yml logs -f

# Restart
docker compose --env-file .env.vps -f docker-compose.vps.yml restart

# Stop
docker compose --env-file .env.vps -f docker-compose.vps.yml down
```
