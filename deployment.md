# TeamPulse Deployment Guide

This guide explains how to deploy TeamPulse to production using Vercel (frontend) and Render (backend).

## Prerequisites

- GitHub account with repository access
- Vercel account (free tier available)
- Render account (free tier available)
- Firebase project with Firestore enabled
- OpenAI API key (optional, for AI insights)

## Backend Deployment (Render)

### 1. Create a Render Account

1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account

### 2. Create a New Web Service

1. Click "New +" → "Web Service"
2. Connect your `TeamPulse` repository
3. Configure the service:
   - **Name**: `teampulse-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### 3. Set Environment Variables

In the Render dashboard, add these environment variables:

```
PORT=4000
NODE_ENV=production
CLIENT_URL=https://your-vercel-app.vercel.app
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
OPENAI_API_KEY=your-openai-api-key
```

### 4. Add Firebase Service Account

1. Download your Firebase service account JSON from Firebase Console
2. In Render, add a new environment variable:
   - **Key**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Paste the entire JSON content
3. Update `server/firebase.js` to read from environment variable if needed

### 5. Get Render API Credentials

For CI/CD deployment:

1. Go to Render Dashboard → Account Settings → API Keys
2. Create a new API key and save it
3. Note your Service ID from the service URL: `render.com/web/srv-XXXXXX`

## Frontend Deployment (Vercel)

### 1. Create a Vercel Account

1. Go to [vercel.com](https://vercel.com) and sign up
2. Connect your GitHub account

### 2. Import Project

1. Click "Add New..." → "Project"
2. Import your `TeamPulse` repository
3. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3. Set Environment Variables

In the Vercel project settings, add:

```
VITE_API_URL=https://your-render-app.onrender.com/api
VITE_WS_URL=wss://your-render-app.onrender.com
```

### 4. Get Vercel Credentials

For CI/CD deployment:

1. Go to Vercel Dashboard → Settings → Tokens
2. Create a new token and save it
3. Get your Organization ID and Project ID:
   ```bash
   vercel link
   cat .vercel/project.json
   ```

## GitHub Secrets Configuration

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### Render Secrets
- `RENDER_API_KEY`: Your Render API key
- `RENDER_SERVICE_ID`: Your Render service ID (srv-XXXXXX)

### Vercel Secrets
- `VERCEL_TOKEN`: Your Vercel token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

## Automatic Deployment

Once configured, the GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically:

1. Deploy the backend to Render when you push to `main`
2. Deploy the frontend to Vercel when you push to `main`

## Manual Deployment

### Backend (Render)
```bash
# Trigger deployment via Render API
curl -X POST \
  "https://api.render.com/v1/services/YOUR_SERVICE_ID/deploys" \
  -H "Authorization: Bearer YOUR_RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": false}'
```

### Frontend (Vercel)
```bash
cd client
vercel --prod
```

## Verifying Deployment

### Backend Health Check
```bash
curl https://your-render-app.onrender.com/health
# Should return: {"status":"ok"}
```

### Frontend
Open your Vercel URL in a browser and verify the dashboard loads.

## Monitoring

### Render
- View logs in Render Dashboard → Services → your-service → Logs
- Monitor metrics in the Metrics tab

### Vercel
- View deployment logs in Vercel Dashboard → Deployments
- Monitor performance in the Analytics tab

## Troubleshooting

### Backend Issues

**Problem**: Firebase connection fails
- **Solution**: Verify `FIREBASE_SERVICE_ACCOUNT` environment variable is set correctly
- Check Firebase project permissions

**Problem**: CORS errors
- **Solution**: Update `CLIENT_URL` environment variable with correct Vercel URL

### Frontend Issues

**Problem**: API calls fail
- **Solution**: Verify `VITE_API_URL` points to your Render backend URL
- Check that backend is running and accessible

**Problem**: WebSocket connection fails
- **Solution**: Verify `VITE_WS_URL` uses `wss://` protocol (not `ws://`)
- Check Render service supports WebSocket connections

### Common Issues

**Problem**: Environment variables not updating
- **Solution**: Redeploy the service after updating environment variables

**Problem**: Build fails
- **Solution**: Check build logs for specific errors
- Verify all dependencies are in `package.json`

## Cost Optimization

### Free Tier Limits

**Render Free Tier**:
- 750 hours/month
- Spins down after 15 minutes of inactivity
- First request after spin-down may be slow

**Vercel Free Tier**:
- 100 GB bandwidth/month
- Unlimited deployments

### Recommendations

1. Use free tiers for development/demo
2. Upgrade to paid plans for production traffic
3. Consider caching strategies to reduce API calls
4. Optimize bundle size to reduce bandwidth usage

## Security Best Practices

1. **Never commit secrets**: Always use environment variables
2. **Rotate API keys**: Regularly update Firebase and OpenAI keys
3. **Enable CORS**: Only allow requests from your frontend domain
4. **Use HTTPS**: Both Vercel and Render provide HTTPS by default
5. **Monitor logs**: Regularly check for suspicious activity

## Rollback

### Render
1. Go to Render Dashboard → Services → your-service
2. Click on "Deploys" tab
3. Click "Rollback" on a previous successful deployment

### Vercel
1. Go to Vercel Dashboard → Deployments
2. Find a previous successful deployment
3. Click "..." → "Promote to Production"

## Updates and Maintenance

1. **Dependencies**: Regularly update npm packages for security patches
2. **Monitoring**: Set up uptime monitoring (e.g., UptimeRobot)
3. **Backups**: Regularly backup Firebase data
4. **Testing**: Test deployments in staging before production

## Support

For issues:
1. Check deployment logs first
2. Review this guide
3. Check Render/Vercel documentation
4. Create an issue in the GitHub repository
