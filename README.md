# TeamPulse

TeamPulse is a lightweight full-stack starter for real-time team collaboration that demonstrates how to combine a React frontend, an Express/Node.js backend, Firebase Firestore for realtime data + presence, WebSockets for broadcast updates, and AI-powered daily insights via OpenAI. The project includes data visualizations (Chart.js) for task completion and per-user productivity, and CI/CD workflows to deploy the backend to Render and the frontend to Vercel.

This repository is intended as a reference starter and prototype. It provides a working structure and examples you can extend into a production-ready service.

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Quickstart (Local)](#quickstart-local)
- [Environment Variables](#environment-variables)
- [Firebase Notes](#firebase-notes)
- [Frontend](#frontend)
- [Backend](#backend)
- [OpenAI Insights](#openai-insights)
- [Real-time Behavior](#real-time-behavior)
- [Deployment (Render + Vercel)](#deployment-render--vercel)
- [CI/CD](#cicd)
- [Security & Cost Considerations](#security--cost-considerations)
- [Next Steps & Enhancements](#next-steps--enhancements)
- [License](#license)

---

## About

TeamPulse helps teams visualize activity and task progress in real time. It includes:

- A React dashboard showing user presence and task progress.
- Charts for completion rates and productivity trends using Chart.js.
- An Express backend that persists data in Firestore.
- WebSocket broadcasts for immediate client updates.
- An optional OpenAI-powered insights generator that summarizes daily performance and produces actionable recommendations.

## Features

- **Team & Task Management**: Create and manage teams, tasks, and user activity.
- **Real-time Updates**: WebSocket broadcasts and Firestore snapshot listeners ensure immediate client updates.
- **Dashboard**: Displays per-user status (online/away/offline) and task progress with visual indicators.
- **Analytics Charts**: Visualizes completion rate and tasks-completed-per-user over time with color-coded performance thresholds.
- **AI Insights**: Daily automated or on-demand insights (summaries + workload balance suggestions) using OpenAI.
- **CI/CD**: Automated deployment to Render (backend) and Vercel (frontend).

## Tech Stack

### Frontend

- **React 18** - Modern UI library
- **Firebase Web SDK v9+** - Firestore snapshot listeners
- **Chart.js + react-chartjs-2** - Data visualization
- **CSS3** - Styling

### Backend

- **Node.js + Express** - REST API server
- **Firebase Admin SDK** - Firestore database
- **WebSocket (ws)** - Real-time broadcast server
- **OpenAI API** - AI-powered insights
- **dotenv** - Environment configuration

### DevOps

- **GitHub Actions** - CI/CD automation
- **Render** - Backend hosting
- **Vercel** - Frontend hosting
- **ESLint + Prettier** - Code quality

## Repository Layout

```
TeamPulse/
├── client/                  # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx      # User activity dashboard
│   │   │   ├── Dashboard.css
│   │   │   ├── TaskCharts.jsx     # Analytics charts
│   │   │   └── TaskCharts.css
│   │   ├── firebase.js            # Firebase client config
│   │   ├── App.js                 # Main app component
│   │   ├── App.css
│   │   ├── index.js               # Entry point
│   │   └── index.css
│   ├── package.json
│   └── .eslintrc.json
├── server/                  # Node.js backend
│   ├── routes/
│   │   ├── team.js               # Team CRUD routes
│   │   ├── task.js               # Task CRUD routes
│   │   ├── activity.js           # User activity routes
│   │   └── insights.js           # AI insights routes
│   ├── firebase.js               # Firebase admin initialization
│   ├── ws.js                     # WebSocket server
│   ├── insights.js               # OpenAI insights generator
│   ├── index.js                  # Express server entry
│   ├── package.json
│   ├── .env.example              # Environment template
│   ├── .eslintrc.json
│   └── firebaseServiceAccount.example.json
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD workflow
├── .gitignore
├── .prettierrc
└── README.md
```

## Quickstart (Local)

### Prerequisites

- **Node.js 16+** and npm
- **Firebase project** with Firestore enabled
- **OpenAI API key** (optional, for insights feature)

### 1. Clone the repository

```bash
git clone https://github.com/mustafa-sarwari/TeamPulse.git
cd TeamPulse
```

### 2. Setup Backend

```bash
cd server
npm install
```

#### Configure Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database
3. Generate a service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `server/firebaseServiceAccount.json` (gitignored)

#### Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
PORT=4000
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-3.5-turbo
```

#### Start the server

```bash
npm run dev
```

Server runs on `http://localhost:4000`

### 3. Setup Frontend

Open a new terminal:

```bash
cd client
npm install
```

#### Configure Firebase

Edit `client/src/firebase.js` and replace the placeholder config with your Firebase project config (from Firebase Console → Project Settings → General → Your apps → SDK setup and configuration).

#### Start the client

```bash
npm start
```

Client runs on `http://localhost:3000`

### 4. Test the Application

1. **Create a team**: `POST http://localhost:4000/api/teams` with JSON body:
   ```json
   { "name": "Engineering", "members": ["user1", "user2"] }
   ```

2. **Create tasks**: `POST http://localhost:4000/api/tasks` with JSON body:
   ```json
   { "title": "Build feature X", "assignedTo": "user1", "teamId": "team-id", "status": "pending" }
   ```

3. **Update user activity**: `POST http://localhost:4000/api/activities` with JSON body:
   ```json
   { "uid": "user1", "status": "online", "displayName": "John Doe" }
   ```

4. **Generate insights**: `POST http://localhost:4000/api/insights/daily` with JSON body:
   ```json
   { "date": "2025-11-04", "teamId": "team-id" }
   ```

5. **View dashboard**: Open `http://localhost:3000` to see the real-time dashboard and charts.

## Environment Variables

### Backend (server/.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 4000) | No |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase service account JSON | No* |
| `OPENAI_API_KEY` | OpenAI API key for insights | Yes (for insights) |
| `OPENAI_MODEL` | OpenAI model (default: gpt-3.5-turbo) | No |

*Either set `GOOGLE_APPLICATION_CREDENTIALS` or place `firebaseServiceAccount.json` in `server/`

### Frontend

Firebase configuration is set directly in `client/src/firebase.js`.

## Firebase Notes

### Firestore Collections

The application uses these Firestore collections:

- **teams**: Team documents with name, description, members
- **tasks**: Task documents with title, status, assignedTo, teamId, timestamps
- **userActivities**: User presence/activity with uid, status, lastActiveAt
- **insights**: AI-generated daily insights with date, summary, recommendations

### Security Rules

For production, configure Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Frontend

### Components

#### Dashboard (`client/src/components/Dashboard.jsx`)

- Displays user presence indicators (online/away/offline)
- Shows task progress per user with progress bars
- Real-time updates via Firestore `onSnapshot`
- Color-coded status indicators

#### TaskCharts (`client/src/components/TaskCharts.jsx`)

- **Completion Rate Chart**: Line chart showing daily task completion percentage
- **User Productivity Chart**: Stacked bar chart of tasks completed per user
- **Performance Thresholds**: Color-coded (green ≥80%, amber 50-79%, red <50%)
- Real-time data from Firestore

### Styling

- Responsive design with CSS Grid and Flexbox
- Gradient headers and card-based layouts
- Hover effects and smooth transitions

## Backend

### API Endpoints

#### Teams

- `POST /api/teams` - Create team
- `GET /api/teams` - List all teams
- `GET /api/teams/:id` - Get team by ID

#### Tasks

- `POST /api/tasks` - Create task
- `GET /api/tasks?teamId=X&assignedTo=Y` - List tasks (optional filters)
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

#### Activities

- `POST /api/activities` - Update user activity
- `GET /api/activities` - List all user activities
- `GET /api/activities/:uid` - Get user activity by UID

#### Insights

- `POST /api/insights/daily` - Generate daily insights
  - Body: `{ date: "YYYY-MM-DD", teamId: "optional", preview: boolean }`
- `GET /api/insights/daily?date=YYYY-MM-DD&teamId=X` - Fetch stored insights

### WebSocket

Connect to `ws://localhost:4000` to receive real-time events:

```javascript
const ws = new WebSocket('ws://localhost:4000');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data.type, data.payload);
};
```

Event types: `connection`, `team.created`, `task.created`, `task.updated`, `task.deleted`, `activity.updated`

## OpenAI Insights

The insights generator (`server/insights.js`) uses OpenAI to:

1. Aggregate task data for a given date
2. Calculate completion rates per user
3. Generate a natural language summary
4. Provide 3 prioritized recommendations (high/medium/low)

### Example Response

```json
{
  "id": "insight-123",
  "date": "2025-11-04",
  "summary": "Team completed 15 of 20 tasks (75% completion rate). Strong performance from user1 and user2, but user3 is falling behind.",
  "recommendations": [
    { "priority": "high", "text": "Redistribute tasks from user3 to available team members" },
    { "priority": "medium", "text": "Schedule check-in with user3 to identify blockers" },
    { "priority": "low", "text": "Consider adding task estimation to improve planning" }
  ],
  "data": { /* ... */ },
  "generatedAt": "2025-11-04T10:30:00Z"
}
```

## Real-time Behavior

TeamPulse uses two mechanisms for real-time updates:

1. **Firestore Snapshot Listeners** (client-side): React components subscribe to Firestore collections and automatically re-render when documents change.

2. **WebSocket Broadcasts** (server-side): When API routes modify data, they broadcast events to all connected WebSocket clients for immediate notifications.

This dual approach ensures reliable updates even if the client misses a WebSocket message.

## Deployment (Render + Vercel)

### Backend → Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment Variables**: Add `OPENAI_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS` (or upload service account JSON)
4. Deploy

### Frontend → Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. From `client/` directory: `vercel`
3. Follow prompts to link project
4. Configure Firebase config in `client/src/firebase.js` for production
5. Deploy: `vercel --prod`

Or use the [Vercel GitHub integration](https://vercel.com/docs/git) for automatic deployments.

## CI/CD

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically deploys on push to `main`.

### Required Secrets

Configure these in GitHub repository settings → Secrets and variables → Actions:

- `RENDER_API_KEY` - Render API key
- `RENDER_SERVICE_ID` - Render service ID
- `VERCEL_TOKEN` - Vercel personal access token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### Manual Deployment

Trigger manually via Actions tab → Deploy to Render and Vercel → Run workflow.

## Security & Cost Considerations

### Security

- **Never commit secrets**: Use `.env` files (gitignored) and environment variables
- **Firestore Rules**: Implement proper security rules in production
- **Authentication**: Add Firebase Auth to verify users before allowing API access
- **API Rate Limiting**: Implement rate limiting on Express routes
- **CORS**: Configure CORS to restrict origins in production

### Cost

- **Firebase**: Free tier includes 1GB storage, 10GB/month network, 50K reads/day
- **OpenAI**: Charged per token (~$0.002/1K tokens for GPT-3.5-turbo)
- **Render**: Free tier available, paid plans from $7/month
- **Vercel**: Free tier for personal projects, paid plans from $20/month

**Tip**: Cache OpenAI insights to avoid regenerating for the same date.

## Next Steps & Enhancements

### Recommended Production Improvements

1. **Authentication**: Add Firebase Auth for user sign-in/sign-up
2. **Input Validation**: Use Joi or express-validator to validate API inputs
3. **Error Handling**: Implement centralized error handling middleware
4. **Testing**: Add unit tests (Jest) and integration tests (Supertest)
5. **Rate Limiting**: Protect API endpoints with express-rate-limit
6. **Logging**: Add structured logging (Winston, Pino)
7. **Database Indexing**: Create Firestore indexes for query optimization
8. **Caching**: Implement Redis for caching insights and reducing DB reads
9. **Monitoring**: Add error tracking (Sentry) and performance monitoring
10. **Pagination**: Implement pagination for large task/user lists

### Feature Ideas

- User authentication and role-based access control
- Task comments and file attachments
- Notification system (email, Slack, push)
- Sprint planning and backlog management
- Time tracking and burndown charts
- Mobile app (React Native)
- Calendar integration
- Export reports to PDF/CSV

## License

MIT License - feel free to use this project as a starter for your own applications.

---

**Built with ❤️ using React, Node.js, Firebase, and OpenAI**
