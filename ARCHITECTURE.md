# TeamPulse Architecture

## System Overview

TeamPulse is a full-stack real-time collaboration platform with the following architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
│                     http://localhost:3000                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Dashboard   │  │  TaskCharts  │  │  Firebase    │        │
│  │  Component   │  │  Component   │  │  Client SDK  │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│         │                 │                  │                 │
│         └─────────────────┴──────────────────┘                 │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                           │                                     │
│                    ┌──────▼──────┐                             │
│                    │   Express   │                             │
│                    │   Server    │                             │
│                    │  Port 4000  │                             │
│                    └──────┬──────┘                             │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                  │
│         │                 │                 │                  │
│    ┌────▼─────┐    ┌─────▼──────┐   ┌─────▼──────┐           │
│    │   REST   │    │ WebSocket  │   │  Firebase  │           │
│    │   API    │    │   Server   │   │   Admin    │           │
│    │  Routes  │    │    (ws)    │   │    SDK     │           │
│    └────┬─────┘    └─────┬──────┘   └─────┬──────┘           │
│         │                │                 │                  │
│    ┌────┴─────┬──────────┴──────┬──────────┴──────┐           │
│    │          │                 │                 │           │
│  ┌─▼──┐  ┌───▼───┐  ┌─────▼─────┐  ┌──────▼──────┐           │
│  │Team│  │ Task  │  │ Activity  │  │  Insights   │           │
│  │API │  │  API  │  │    API    │  │     API     │           │
│  └────┘  └───────┘  └───────────┘  └──────┬──────┘           │
│                                             │                  │
│                                      ┌──────▼──────┐           │
│                                      │   OpenAI    │           │
│                                      │     API     │           │
│                                      └─────────────┘           │
│                         SERVER                                 │
└────────────────────────────────┬───────────────────────────────┘
                                 │
                                 │
┌────────────────────────────────▼───────────────────────────────┐
│                    FIREBASE FIRESTORE                          │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────┐  │
│  │  teams   │  │  tasks   │  │userActivities│  │ insights │  │
│  │collection│  │collection│  │  collection  │  │collection│  │
│  └──────────┘  └──────────┘  └──────────────┘  └──────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Real-time Updates (Client → Firebase → Client)

```
Client Component
      │
      │ onSnapshot()
      ▼
Firebase Firestore
      │
      │ Real-time listener
      ▼
Client Component (auto-updates)
```

### 2. API Operations (Client → Server → Firebase)

```
Client
   │
   │ HTTP POST /api/tasks
   ▼
Express Server
   │
   │ Process request
   ▼
Firebase Admin SDK
   │
   │ Write to Firestore
   ▼
Firestore Database
   │
   │ Broadcast via WebSocket
   ▼
All Connected Clients (via ws)
```

### 3. AI Insights Generation

```
Client
   │
   │ POST /api/insights/daily
   ▼
Express Server
   │
   │ Aggregate task data
   ▼
Firestore Query
   │
   │ Fetch tasks & activities
   ▼
OpenAI API
   │
   │ Generate summary & recommendations
   ▼
Store in Firestore
   │
   │ Return to client
   ▼
Client displays insights
```

## Technology Stack

### Frontend
- **React 18**: Modern UI library with hooks
- **Firebase Web SDK v9+**: Client-side Firestore access
- **Chart.js**: Data visualization library
- **react-chartjs-2**: React wrapper for Chart.js
- **WebSocket**: Real-time event notifications

### Backend
- **Node.js 16+**: JavaScript runtime
- **Express 4**: Web framework
- **Firebase Admin SDK**: Server-side Firestore access
- **ws**: WebSocket library
- **OpenAI SDK**: AI-powered insights
- **dotenv**: Environment configuration
- **cors**: Cross-origin resource sharing

### Database
- **Firebase Firestore**: NoSQL document database
  - Real-time synchronization
  - Offline support
  - Scalable queries

### DevOps
- **GitHub Actions**: CI/CD automation
- **Render**: Backend hosting
- **Vercel**: Frontend hosting
- **ESLint**: Code linting
- **Prettier**: Code formatting

## Collections Schema

### teams
```javascript
{
  id: "auto-generated",
  name: "Engineering Team",
  description: "Frontend and backend developers",
  members: ["alice", "bob", "charlie"],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### tasks
```javascript
{
  id: "auto-generated",
  title: "Build user dashboard",
  description: "Create React components...",
  assignedTo: "alice",
  teamId: "team-id",
  status: "pending" | "completed",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  completedAt: Timestamp | null
}
```

### userActivities
```javascript
{
  id: "uid",  // Document ID is the user ID
  uid: "alice",
  displayName: "Alice Johnson",
  status: "online" | "away" | "offline",
  lastActiveAt: Timestamp,
  meta: {},
  updatedAt: Timestamp
}
```

### insights
```javascript
{
  id: "auto-generated",
  date: "2025-11-04",
  teamId: "team-id" | null,
  summary: "Team completed 15 of 20 tasks...",
  recommendations: [
    { priority: "high", text: "..." },
    { priority: "medium", text: "..." },
    { priority: "low", text: "..." }
  ],
  data: {
    totalTasks: 20,
    completedTasks: 15,
    completionRate: "75.0",
    userStats: [...]
  },
  generatedAt: Timestamp
}
```

## Communication Protocols

### REST API
- **Format**: JSON
- **Authentication**: None (add Firebase Auth in production)
- **CORS**: Enabled for all origins (restrict in production)
- **Error Handling**: Standard HTTP status codes

### WebSocket
- **Protocol**: ws://
- **Message Format**: JSON
- **Events**:
  - `connection`: Initial handshake
  - `team.created`: New team added
  - `task.created`: New task added
  - `task.updated`: Task modified
  - `task.deleted`: Task removed
  - `activity.updated`: User status changed

### Firestore Listeners
- **Type**: Real-time snapshot listeners
- **Triggers**: Automatic on document/collection changes
- **Offline**: Cached data available offline

## Security Model

### Current Implementation (Development)
- ⚠️ No authentication
- ⚠️ Open Firestore rules (test mode)
- ⚠️ CORS allows all origins
- ⚠️ No rate limiting
- ⚠️ No input validation

### Recommended for Production
```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Require authentication
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // User activities: users can only update their own
    match /userActivities/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Tasks: team members only
    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null 
        && (request.auth.uid == resource.data.assignedTo
            || request.auth.token.admin == true);
    }
  }
}
```

### Backend Security Additions
```javascript
// Add Firebase Auth verification middleware
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Apply to all routes
app.use('/api/*', verifyToken);
```

## Scalability Considerations

### Current Limitations
- Single Firestore database instance
- No caching layer
- No rate limiting
- Synchronous API operations

### Scaling Strategies

1. **Add Redis Caching**
   - Cache frequently accessed data (teams, user profiles)
   - Cache OpenAI insights to reduce API calls
   - Cache aggregations for charts

2. **Implement Pagination**
   - Use Firestore cursor-based pagination
   - Limit results per query (e.g., 50 items)
   - Load more on scroll/click

3. **Optimize Queries**
   - Create composite indexes for complex queries
   - Denormalize data when appropriate
   - Use subcollections for large datasets

4. **Background Jobs**
   - Use Cloud Functions for scheduled tasks
   - Generate insights asynchronously
   - Send notifications in batches

5. **Load Balancing**
   - Deploy multiple server instances on Render
   - Use a load balancer (e.g., Nginx, Cloudflare)
   - Distribute WebSocket connections

## Monitoring & Observability

### Recommended Tools

1. **Error Tracking**: Sentry, Rollbar
2. **Performance Monitoring**: New Relic, Datadog
3. **Logging**: Winston, Pino + LogDNA
4. **Analytics**: Google Analytics, Mixpanel
5. **Uptime Monitoring**: UptimeRobot, Pingdom

### Key Metrics to Track

- API response times
- WebSocket connection count
- Firestore read/write operations
- OpenAI API usage and cost
- Client-side errors
- Page load times
- User engagement metrics

## Deployment Architecture

### Production Setup

```
┌──────────────────────────────────────────────────────────┐
│                     GitHub Repository                    │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ Push to main
                     ▼
┌──────────────────────────────────────────────────────────┐
│                   GitHub Actions                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  1. Checkout code                                  │  │
│  │  2. Run tests (future)                             │  │
│  │  3. Build assets                                   │  │
│  │  4. Deploy to Render (backend)                     │  │
│  │  5. Deploy to Vercel (frontend)                    │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────┬──────────────────────┬─────────────────────┘
              │                      │
              ▼                      ▼
    ┌───────────────────┐  ┌────────────────────┐
    │   Render (Backend)│  │ Vercel (Frontend)  │
    │   teampluse.com   │  │ teampluse.app      │
    └─────────┬─────────┘  └────────┬───────────┘
              │                     │
              └──────────┬──────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Firebase Firestore  │
              │   + OpenAI API       │
              └──────────────────────┘
```

## Development Workflow

```
Feature Branch
    │
    │ git push
    ▼
Pull Request
    │
    │ Code Review
    ▼
Merge to main
    │
    │ Trigger CI/CD
    ▼
Automated Tests (future)
    │
    │ Pass
    ▼
Deploy to Production
    │
    ├─► Backend to Render
    └─► Frontend to Vercel
```

## Performance Optimization

### Client-Side
1. **Code Splitting**: Use React.lazy() for components
2. **Memoization**: Use React.memo() for expensive renders
3. **Debouncing**: Debounce real-time updates
4. **Virtual Scrolling**: For large lists
5. **Image Optimization**: Compress and lazy-load images

### Server-Side
1. **Connection Pooling**: Reuse Firestore connections
2. **Response Compression**: Use gzip middleware
3. **Caching**: Cache frequent queries
4. **Rate Limiting**: Prevent API abuse
5. **Async Operations**: Use async/await properly

## Cost Analysis

### Estimated Monthly Costs (1000 active users)

| Service | Usage | Cost |
|---------|-------|------|
| Firebase Firestore | 10M reads, 2M writes | ~$15 |
| Firebase Hosting | Included in free tier | $0 |
| OpenAI API | 100 insights/day @ 500 tokens | ~$3 |
| Render (Backend) | Starter plan | $7 |
| Vercel (Frontend) | Hobby plan | $0 |
| **Total** | | **~$25/month** |

### Cost Optimization Tips
1. Cache OpenAI insights (reuse for same date)
2. Use Firestore composite queries to reduce reads
3. Implement pagination to limit data transfer
4. Use CDN for static assets
5. Monitor and set budget alerts

---

*This architecture is designed for scalability and can grow from prototype to production with minimal changes.*
