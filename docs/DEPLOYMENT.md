# CafeManage - Setup & Deployment Guide

## Local Development Setup

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **PostgreSQL**: 13.x or higher
- **Git**: Latest version
- **Docker** (optional): For containerized development

### Step 1: Clone & Install

```bash
# Clone the repository
git clone <repository-url>
cd CafeManage

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Step 2: Database Setup

#### Option A: Local PostgreSQL

```bash
# Create database
createdb cafemanage

# Create user (if not exists)
createuser -P cafemanage_user
# Enter password when prompted

# Grant privileges
psql cafemanage
ALTER ROLE cafemanage_user WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE cafemanage TO cafemanage_user;
```

#### Option B: Using Docker

```bash
docker run --name postgres-cafemanage \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=cafemanage \
  -p 5432:5432 \
  -d postgres:16-alpine
```

### Step 3: Environment Configuration

#### Backend (.env)

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=cafemanage

# JWT
JWT_SECRET=your-secret-key-min-32-characters-long

# Myanmar Specific
DEFAULT_CURRENCY=MMK
DEFAULT_LANGUAGE=mm
TIMEZONE=Asia/Yangon

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:3000
```

#### Frontend (.env.local)

```bash
cd ../client
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000
EOF
```

### Step 4: Start Development Servers

**Terminal 1 - Backend**
```bash
cd server
npm run start:dev
```

Output should show:
```
[Nest] 12345  - 12/14/2024, 10:30:45 AM     LOG [NestFactory] Starting Nest application...
🚀 CafeManage Server running on http://localhost:3000
📚 API Documentation: http://localhost:3000/api/docs
```

**Terminal 2 - Frontend**
```bash
cd client
npm run dev
```

Output should show:
```
▲ Next.js 14.0.0
  - Local:         http://localhost:3001
```

### Step 5: Verify Installation

Visit these URLs:
- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health

---

## Docker Deployment

### Quick Start with Docker Compose

```bash
# From project root
docker-compose up -d
```

This will start:
- PostgreSQL (port 5432)
- NestJS API (port 3000)
- Next.js Frontend (port 3001)
- Nginx Proxy (port 80, 443)

### Environment File for Docker

Create `.env` file in project root:
```
# Database
DB_USERNAME=postgres
DB_PASSWORD=securepassword
DB_NAME=cafemanage

# JWT
JWT_SECRET=your-very-secure-secret-key-here

# Myanmar Config
DEFAULT_CURRENCY=MMK
DEFAULT_LANGUAGE=mm
```

### Build Custom Docker Images

```bash
# Backend
cd server
docker build -t cafemanage-api:1.0.0 .

# Frontend
cd ../client
docker build -t cafemanage-web:1.0.0 .

# Run with docker-compose
docker-compose up -d
```

### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Execute command in container
docker exec -it cafemanage-api npm run typeorm migration:generate

# Rebuild images
docker-compose build --no-cache
```

---

## Production Deployment

### Deploying to Cloud (AWS, GCP, Azure, DigitalOcean)

#### Using Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create apps
heroku create cafemanage-api
heroku create cafemanage-web

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0 --app cafemanage-api

# Set environment variables
heroku config:set JWT_SECRET=your-secret-key --app cafemanage-api
heroku config:set DEFAULT_CURRENCY=MMK --app cafemanage-api

# Deploy backend
cd server
git push heroku main

# Deploy frontend
cd ../client
git push heroku main
```

#### Using Docker to Container Registry

```bash
# Google Cloud
gcloud auth configure-docker
docker tag cafemanage-api:1.0.0 gcr.io/PROJECT_ID/cafemanage-api:1.0.0
docker push gcr.io/PROJECT_ID/cafemanage-api:1.0.0

# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag cafemanage-api:1.0.0 123456789.dkr.ecr.us-east-1.amazonaws.com/cafemanage-api:1.0.0
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/cafemanage-api:1.0.0
```

#### Using Kubernetes

```bash
# Create namespace
kubectl create namespace cafemanage

# Create secrets
kubectl create secret generic db-credentials \
  --from-literal=username=postgres \
  --from-literal=password=securepassword \
  -n cafemanage

# Apply deployments
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/web-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

### Database Migrations in Production

```bash
# Before deploying new version
cd server

# Generate migration from entities
npm run typeorm migration:generate -- src/migrations/MigrationName

# Run migrations
npm run typeorm migration:run

# Revert last migration if needed
npm run typeorm migration:revert
```

### Environment Variables for Production

```bash
NODE_ENV=production

# Database (use managed service)
DB_HOST=prod-postgres.example.com
DB_PORT=5432
DB_USERNAME=prod_user
DB_PASSWORD=strongpassword123!@#
DB_NAME=cafemanage_prod

# JWT
JWT_SECRET=very_long_random_string_minimum_32_characters

# Security
CORS_ORIGIN=https://cafemanage.com,https://app.cafemanage.com

# Features
ENABLE_OFFLINE_MODE=true
ENABLE_CLOUD_SYNC=true

# Third-party
KBZPAY_MERCHANT_ID=prod_merchant_id
WAVEPAY_MERCHANT_ID=prod_merchant_id
```

### SSL/TLS Certificate Setup

```bash
# Using Let's Encrypt with Certbot
sudo certbot certonly --standalone -d cafemanage.com -d api.cafemanage.com

# Update nginx.conf with certificate paths
ssl_certificate /etc/letsencrypt/live/cafemanage.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/cafemanage.com/privkey.pem;

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## Monitoring & Logging

### Application Logs

```bash
# View logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# View logs since last 30 minutes
docker-compose logs --since 30m
```

### Database Backup

```bash
# Backup PostgreSQL
pg_dump cafemanage > cafemanage_backup.sql

# Backup in Docker
docker exec cafemanage-db pg_dump -U postgres cafemanage > backup.sql

# Restore from backup
psql cafemanage < backup.sql
```

### Performance Monitoring

- Use tools like:
  - **New Relic**: APM monitoring
  - **Datadog**: Infrastructure monitoring
  - **CloudWatch** (AWS): Logs and metrics
  - **Stackdriver** (GCP): Application monitoring
  - **Application Insights** (Azure): APM

---

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql -h localhost -U postgres -d cafemanage

# Check if port is open
lsof -i :5432
```

### Port Already in Use

```bash
# Kill process using port
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3002 npm run start:dev
```

### Docker Issues

```bash
# Clean up Docker
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Remove volumes (WARNING: data loss)
docker-compose down -v
```

### API Not Responding

```bash
# Check health
curl http://localhost:3000/health

# Check logs
docker-compose logs backend

# Restart service
docker-compose restart backend
```

---

## Performance Optimization Tips

1. **Database**:
   - Add indexes on frequently queried columns
   - Use query result caching
   - Implement connection pooling

2. **API**:
   - Enable gzip compression
   - Use pagination for list endpoints
   - Implement request caching

3. **Frontend**:
   - Enable image optimization
   - Implement code splitting
   - Use CDN for static assets

4. **Infrastructure**:
   - Use load balancer
   - Implement auto-scaling
   - Use managed databases (RDS, Cloud SQL)

---

## Support & Escalation

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables: `docker exec <container> env`
3. Check database connectivity: `psql -h <host> -U <user> -d <db>`
4. Review GitHub issues
5. Contact support@cafemanage.com

---

For more information, see:
- [Architecture](./ARCHITECTURE.md)
- [Database Schema](./DATABASE.md)
- [API Documentation](./API.md)
