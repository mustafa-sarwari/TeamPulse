# TeamPulse Setup Guide

This guide will help you get TeamPulse up and running locally.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js 16+** installed ([download](https://nodejs.org/))
- A **Firebase account** and project ([create one](https://console.firebase.google.com/))
- An **OpenAI API key** for insights feature ([get one](https://platform.openai.com/api-keys))

## 🚀 Quick Start (5 minutes)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/mustafa-sarwari/TeamPulse.git
cd TeamPulse

# Install server dependencies
cd server
npm install

# Install client dependencies (in a new terminal)
cd ../client
npm install
```

### Step 2: Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" and follow the wizard
   - Enable Firestore Database (Start in test mode for development)

2. **Get Service Account Key** (for backend)
   - In Firebase Console, go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the file as `server/firebaseServiceAccount.json`

3. **Get Web App Config** (for frontend)
   - In Firebase Console, go to Project Settings → General
   - Scroll to "Your apps" and click the web icon `</>`
   - Copy the `firebaseConfig` object
   - Paste it into `client/src/firebase.js` (replace the placeholder)

### Step 3: Environment Variables

```bash
# In the server directory
cd server
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 4: Start the Application

Open two terminals:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
Server will start on `http://localhost:4000`

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```
Client will open automatically at `http://localhost:3000`

## 🧪 Testing the Application

### 1. Create a Team

```bash
curl -X POST http://localhost:4000/api/teams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering Team",
    "description": "Frontend and Backend developers",
    "members": ["alice", "bob", "charlie"]
  }'
```

### 2. Create Tasks

```bash
# Task 1
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build user dashboard",
    "description": "Create React components for user dashboard",
    "assignedTo": "alice",
    "status": "pending"
  }'

# Task 2
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Setup CI/CD pipeline",
    "assignedTo": "bob",
    "status": "completed"
  }'
```

### 3. Update User Activity

```bash
curl -X POST http://localhost:4000/api/activities \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "alice",
    "status": "online",
    "displayName": "Alice Johnson"
  }'

curl -X POST http://localhost:4000/api/activities \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "bob",
    "status": "away",
    "displayName": "Bob Smith"
  }'
```

### 4. Generate Daily Insights

```bash
curl -X POST http://localhost:4000/api/insights/daily \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-11-04"
  }'
```

### 5. View in Browser

Open `http://localhost:3000` to see:
- Real-time user activity dashboard
- Task completion charts
- Performance analytics

## 🔧 Project Structure

```
TeamPulse/
├── client/                    # React Frontend
│   ├── public/
│   │   └── index.html        # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx      # User activity dashboard
│   │   │   ├── Dashboard.css
│   │   │   ├── TaskCharts.jsx     # Analytics visualizations
│   │   │   └── TaskCharts.css
│   │   ├── firebase.js            # Firebase client config
│   │   ├── App.js                 # Main app component
│   │   ├── App.css
│   │   ├── index.js               # React entry point
│   │   └── index.css
│   └── package.json
│
├── server/                    # Express Backend
│   ├── routes/
│   │   ├── team.js               # Team CRUD operations
│   │   ├── task.js               # Task CRUD operations
│   │   ├── activity.js           # User activity tracking
│   │   └── insights.js           # AI insights endpoints
│   ├── firebase.js               # Firebase Admin setup
│   ├── ws.js                     # WebSocket server
│   ├── insights.js               # OpenAI insights logic
│   ├── index.js                  # Express server
│   └── package.json
│
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD automation
│
└── README.md                  # Full documentation
```

## 📡 API Reference

### Teams
- `POST /api/teams` - Create a new team
- `GET /api/teams` - Get all teams
- `GET /api/teams/:id` - Get specific team

### Tasks
- `POST /api/tasks` - Create a new task
- `GET /api/tasks` - Get all tasks (query: `?teamId=X&assignedTo=Y`)
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Activities
- `POST /api/activities` - Update user activity
- `GET /api/activities` - Get all user activities
- `GET /api/activities/:uid` - Get specific user activity

### Insights
- `POST /api/insights/daily` - Generate daily insights
- `GET /api/insights/daily` - Get stored insights (query: `?date=YYYY-MM-DD&teamId=X`)

### WebSocket
- Connect to `ws://localhost:4000` for real-time events
- Events: `connection`, `team.created`, `task.created`, `task.updated`, `activity.updated`

## 🎨 Features Overview

### Dashboard Component
- **Real-time User Presence**: Online/Away/Offline indicators
- **Task Progress**: Visual progress bars per user
- **Auto-updates**: Firestore snapshot listeners
- **Responsive Design**: Works on mobile and desktop

### Charts Component
- **Completion Rate Line Chart**: Daily task completion trends
- **User Productivity Bar Chart**: Tasks completed per user
- **Color-coded Performance**: 
  - 🟢 Green: ≥80% completion
  - 🟡 Amber: 50-79% completion
  - 🔴 Red: <50% completion

### AI Insights
- **Daily Performance Summary**: Natural language overview
- **Prioritized Recommendations**: High/Medium/Low priority actions
- **Workload Balance Analysis**: Identifies overloaded team members
- **Data-driven**: Based on actual task completion metrics

## 🔐 Security Best Practices

1. **Never commit secrets**
   - Use `.env` files (already in `.gitignore`)
   - Use environment variables in production

2. **Firestore Security Rules**
   ```javascript
   // For production, in Firebase Console
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. **Add Authentication**
   - Implement Firebase Auth for user sign-in
   - Verify tokens in backend middleware
   - Restrict API access to authenticated users

## 🚢 Deployment

### Backend → Render

1. Create account at [render.com](https://render.com)
2. New Web Service → Connect GitHub repo
3. Settings:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add environment variables
4. Deploy

### Frontend → Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. In `client/` directory: `vercel`
3. Link project and deploy
4. Or use [Vercel GitHub integration](https://vercel.com/docs/git)

### Automated CI/CD

The GitHub Actions workflow automatically deploys on push to `main`.

Required secrets (in GitHub repo settings):
- `RENDER_API_KEY`
- `RENDER_SERVICE_ID`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Or change PORT in server/.env
PORT=5000
```

### Firebase permission denied
- Check Firestore security rules in Firebase Console
- For development, use test mode rules
- Ensure `firebaseServiceAccount.json` is in `server/`

### OpenAI API errors
- Verify your API key in `server/.env`
- Check you have credits in your OpenAI account
- Ensure the model name is correct (default: `gpt-3.5-turbo`)

### Client can't connect to server
- Ensure both client and server are running
- Check CORS settings in `server/index.js`
- Verify Firebase config in `client/src/firebase.js`

## 📚 Learn More

- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Chart.js Documentation](https://www.chartjs.org/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 💡 Next Steps

1. **Add Authentication**: Implement Firebase Auth for user management
2. **Improve UI**: Add Material-UI or Chakra UI components
3. **Add Tests**: Write unit and integration tests
4. **Implement Notifications**: Add email/Slack notifications
5. **Mobile App**: Create React Native version
6. **Advanced Analytics**: Add more charts and metrics

## 🤝 Contributing

Feel free to fork, modify, and use this project as a starter for your own applications!

## 📄 License

MIT License - see LICENSE file for details.
