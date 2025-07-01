# Deployment Guide - Diva Security ID Scanner

This guide will help you deploy the Diva Security ID Scanner application to various platforms.

## Quick Start - Local Development

### Prerequisites
- Node.js 14+ installed
- MongoDB installed and running
- Git installed

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/diva-security.git
cd diva-security

# Install backend dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start Backend Server

```bash
# Start MongoDB (if not running as service)
mongod

# In another terminal, start the backend
npm start

# Or for development with auto-restart
npm run dev
```

### 3. Start Frontend

```bash
# Using Python 3
python -m http.server 8000

# Or using Node.js
npx http-server -p 8000

# Or using PHP
php -S localhost:8000
```

### 4. Access Application

- Frontend: http://localhost:8000
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/api/health

## Production Deployment Options

### Option 1: Heroku (Recommended for Beginners)

#### Prerequisites
- Heroku account
- Heroku CLI installed

#### Deployment Steps

1. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

2. **Add MongoDB Add-on**
   ```bash
   heroku addons:create mongolab:sandbox
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set FRONTEND_URL=https://your-app-name.herokuapp.com
   ```

4. **Deploy Backend**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push heroku main
   ```

5. **Deploy Frontend to GitHub Pages**
   - Push frontend files to GitHub
   - Enable GitHub Pages in repository settings
   - Update API URL in frontend to point to Heroku

### Option 2: DigitalOcean App Platform

#### Prerequisites
- DigitalOcean account
- MongoDB database (can use DigitalOcean Managed MongoDB)

#### Deployment Steps

1. **Create App in DigitalOcean**
   - Go to DigitalOcean App Platform
   - Connect your GitHub repository
   - Select Node.js environment

2. **Configure Environment**
   ```yaml
   # .do/app.yaml
   name: diva-security-backend
   services:
   - name: backend
     source_dir: /
     github:
       repo: yourusername/diva-security
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: NODE_ENV
       value: production
     - key: MONGODB_URI
       value: ${MONGODB_URI}
   ```

3. **Deploy Frontend**
   - Use DigitalOcean App Platform for frontend too
   - Or deploy to GitHub Pages/Netlify

### Option 3: AWS (Advanced)

#### Prerequisites
- AWS account
- AWS CLI configured
- Docker installed

#### Deployment Steps

1. **Create ECS Cluster**
   ```bash
   aws ecs create-cluster --cluster-name diva-security
   ```

2. **Create Task Definition**
   ```json
   {
     "family": "diva-security",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "diva-backend",
         "image": "your-docker-image",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ]
       }
     ]
   }
   ```

3. **Deploy to S3 + CloudFront**
   ```bash
   # Build and upload frontend
   aws s3 sync ./frontend s3://your-bucket-name
   aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
   ```

### Option 4: Google Cloud Platform

#### Prerequisites
- Google Cloud account
- gcloud CLI installed

#### Deployment Steps

1. **Create App Engine App**
   ```bash
   gcloud app create --region=us-central1
   ```

2. **Deploy Backend**
   ```bash
   gcloud app deploy app.yaml
   ```

3. **Deploy Frontend**
   ```bash
   gcloud app deploy frontend.yaml
   ```

## Database Setup

### MongoDB Atlas (Recommended for Production)

1. **Create Atlas Cluster**
   - Go to MongoDB Atlas
   - Create new cluster
   - Choose cloud provider and region

2. **Configure Network Access**
   - Add your IP address or 0.0.0.0/0 for all IPs

3. **Create Database User**
   - Create username and password
   - Assign appropriate permissions

4. **Get Connection String**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/diva_security
   ```

5. **Update Environment Variables**
   ```bash
   export MONGODB_URI="your-connection-string"
   ```

### Local MongoDB

```bash
# Install MongoDB
# Ubuntu/Debian
sudo apt-get install mongodb

# macOS
brew install mongodb-community

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database
mongosh
use diva_security
db.createCollection('scans')
```

## Environment Configuration

### Production Environment Variables

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/diva_security

# Server
PORT=3000
NODE_ENV=production

# Frontend URL
FRONTEND_URL=https://your-domain.com

# Security
JWT_SECRET=your-super-secret-jwt-key-here
SESSION_SECRET=your-session-secret-key-here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## SSL/HTTPS Setup

### Using Let's Encrypt (Free)

1. **Install Certbot**
   ```bash
   sudo apt-get install certbot
   ```

2. **Generate Certificate**
   ```bash
   sudo certbot certonly --standalone -d your-domain.com
   ```

3. **Configure Nginx**
   ```nginx
   server {
       listen 443 ssl;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## Monitoring and Logging

### Application Monitoring

1. **PM2 (Process Manager)**
   ```bash
   npm install -g pm2
   pm2 start server.js --name diva-security
   pm2 startup
   pm2 save
   ```

2. **Log Management**
   ```bash
   # View logs
   pm2 logs diva-security
   
   # Monitor processes
   pm2 monit
   ```

### Database Monitoring

1. **MongoDB Atlas Monitoring**
   - Built-in monitoring dashboard
   - Performance insights
   - Alert configurations

2. **Custom Monitoring**
   ```javascript
   // Add to server.js
   const monitoring = require('@google-cloud/monitoring');
   const client = new monitoring.MetricServiceClient();
   ```

## Backup Strategy

### Database Backups

1. **MongoDB Atlas Backups**
   - Automatic daily backups
   - Point-in-time recovery
   - Cross-region replication

2. **Manual Backups**
   ```bash
   # Export data
   mongodump --uri="mongodb+srv://..." --out=./backup
   
   # Import data
   mongorestore --uri="mongodb+srv://..." ./backup
   ```

### Application Backups

1. **Code Repository**
   - Use Git for version control
   - Regular commits and tags
   - Branch protection rules

2. **Configuration Backups**
   ```bash
   # Backup environment files
   cp .env .env.backup
   
   # Backup database configuration
   mongodump --db=diva_security --out=./config-backup
   ```

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] Rate limiting configured
- [ ] Input validation implemented
- [ ] CORS properly configured
- [ ] Security headers set
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] Monitoring and alerting configured

## Troubleshooting

### Common Issues

1. **CORS Errors**
   ```javascript
   // Update CORS configuration in server.js
   app.use(cors({
     origin: ['https://your-domain.com', 'http://localhost:8000'],
     credentials: true
   }));
   ```

2. **Database Connection Issues**
   ```bash
   # Check MongoDB status
   sudo systemctl status mongod
   
   # Check connection string
   mongosh "your-connection-string"
   ```

3. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :3000
   
   # Kill process
   kill -9 PID
   ```

### Performance Optimization

1. **Database Indexes**
   ```javascript
   // Ensure indexes are created
   await db.collection('scans').createIndex({ "documentNumber": 1 });
   await db.collection('scans').createIndex({ "timestamp": -1 });
   ```

2. **Caching**
   ```javascript
   // Add Redis for caching
   const redis = require('redis');
   const client = redis.createClient();
   ```

3. **Load Balancing**
   ```nginx
   # Nginx load balancer configuration
   upstream diva_backend {
       server 127.0.0.1:3000;
       server 127.0.0.1:3001;
   }
   ```

## Support

For deployment issues:
1. Check the troubleshooting section
2. Review application logs
3. Verify environment configuration
4. Contact support with error details 