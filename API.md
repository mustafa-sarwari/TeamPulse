# TeamPulse API Documentation

Base URL (Development): `http://localhost:4000`
Base URL (Production): `https://your-render-app.onrender.com`

## Health Check

### GET /health

Check if the server is running.

**Response:**
```json
{
  "status": "ok"
}
```

---

## Teams

### GET /api/teams

Get all teams.

**Response:**
```json
{
  "teams": [
    {
      "id": "team-1",
      "name": "Engineering Team",
      "description": "Core development team",
      "members": ["alice", "bob", "charlie"],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /api/teams/:id

Get a specific team by ID.

**Parameters:**
- `id` (path): Team ID

**Response:**
```json
{
  "id": "team-1",
  "name": "Engineering Team",
  "description": "Core development team",
  "members": ["alice", "bob", "charlie"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/teams

Create a new team.

**Request Body:**
```json
{
  "name": "Design Team",
  "description": "Product design team",
  "members": ["alice", "bob"]
}
```

**Response:**
```json
{
  "id": "team-123",
  "name": "Design Team",
  "description": "Product design team",
  "members": ["alice", "bob"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Tasks

### GET /api/tasks

Get all tasks, optionally filtered by team.

**Query Parameters:**
- `teamId` (optional): Filter tasks by team ID

**Response:**
```json
{
  "tasks": [
    {
      "id": "task-1",
      "title": "Implement authentication",
      "description": "Add user login and registration",
      "status": "in-progress",
      "assignee": "alice",
      "teamId": "team-1",
      "priority": "high",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /api/tasks

Create a new task.

**Request Body:**
```json
{
  "title": "Design dashboard UI",
  "description": "Create wireframes and mockups",
  "assignee": "diana",
  "teamId": "team-1",
  "priority": "medium"
}
```

**Response:**
```json
{
  "id": "task-123",
  "title": "Design dashboard UI",
  "description": "Create wireframes and mockups",
  "status": "todo",
  "assignee": "diana",
  "teamId": "team-1",
  "priority": "medium",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Note:** Real-time update is broadcast via WebSocket: `{ type: 'task_created', task: {...} }`

### PUT /api/tasks/:id

Update a task.

**Parameters:**
- `id` (path): Task ID

**Request Body:**
```json
{
  "status": "completed",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "id": "task-123",
  "title": "Design dashboard UI",
  "description": "Updated description",
  "status": "completed",
  "assignee": "diana",
  "teamId": "team-1",
  "priority": "medium",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T01:00:00.000Z"
}
```

**Note:** Real-time update is broadcast via WebSocket: `{ type: 'task_updated', task: {...} }`

### DELETE /api/tasks/:id

Delete a task.

**Parameters:**
- `id` (path): Task ID

**Response:**
```json
{
  "success": true,
  "id": "task-123"
}
```

**Note:** Real-time update is broadcast via WebSocket: `{ type: 'task_deleted', taskId: '...' }`

---

## Activities

### GET /api/activities

Get recent team activities.

**Query Parameters:**
- `teamId` (optional): Filter activities by team ID
- `limit` (optional, default: 50): Maximum number of activities to return

**Response:**
```json
{
  "activities": [
    {
      "id": "activity-1",
      "userId": "alice",
      "userName": "Alice Johnson",
      "type": "status_change",
      "status": "online",
      "teamId": "team-1",
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "activity-2",
      "userId": "bob",
      "userName": "Bob Smith",
      "type": "task_completed",
      "taskId": "task-5",
      "taskTitle": "Fix login bug",
      "teamId": "team-1",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /api/activities/status

Get current status of all team members.

**Query Parameters:**
- `teamId` (optional): Filter by team ID

**Response:**
```json
{
  "statuses": [
    {
      "userId": "alice",
      "userName": "Alice Johnson",
      "status": "online",
      "lastActive": "2024-01-01T00:00:00.000Z"
    },
    {
      "userId": "bob",
      "userName": "Bob Smith",
      "status": "away",
      "lastActive": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /api/activities

Log a new activity.

**Request Body:**
```json
{
  "userId": "alice",
  "userName": "Alice Johnson",
  "type": "status_change",
  "status": "online",
  "teamId": "team-1"
}
```

**Activity Types:**
- `status_change`: User status changed (online/away/offline)
- `task_completed`: User completed a task
- `task_created`: User created a task

**Response:**
```json
{
  "id": "activity-123",
  "userId": "alice",
  "userName": "Alice Johnson",
  "type": "status_change",
  "status": "online",
  "teamId": "team-1",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Note:** Real-time update is broadcast via WebSocket: `{ type: 'activity_logged', activity: {...} }`

---

## Insights

### POST /api/insights

Generate AI-powered insights about team performance.

**Request Body:**
```json
{
  "teamId": "team-1"
}
```

**Response:**
```json
{
  "teamId": "team-1",
  "teamName": "Engineering Team",
  "stats": {
    "totalTasks": 10,
    "completedTasks": 7,
    "inProgressTasks": 2,
    "todoTasks": 1,
    "completionRate": 70,
    "tasksByMember": {
      "alice": { "total": 4, "completed": 3 },
      "bob": { "total": 3, "completed": 2 },
      "charlie": { "total": 3, "completed": 2 }
    },
    "activeUsersCount": 2,
    "totalMembers": 3,
    "activityTypes": {
      "task_completed": 5,
      "status_change": 3
    }
  },
  "insight": "Excellent progress! The team has completed 70% of tasks. Task distribution is well balanced across the team. Strong team engagement with 2 active members.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Notes:**
- If `OPENAI_API_KEY` is configured, uses OpenAI API for AI-generated insights
- Otherwise, provides rule-based fallback insights
- Analyzes task completion rates, workload balance, and team activity

---

## WebSocket Events

Connect to WebSocket at: `ws://localhost:4000` (dev) or `wss://your-app.onrender.com` (prod)

### Server → Client Events

#### welcome
Sent when client connects.
```json
{
  "type": "welcome",
  "message": "Connected to TeamPulse WebSocket server"
}
```

#### task_created
Sent when a new task is created.
```json
{
  "type": "task_created",
  "task": { /* task object */ }
}
```

#### task_updated
Sent when a task is updated.
```json
{
  "type": "task_updated",
  "task": { /* task object */ }
}
```

#### task_deleted
Sent when a task is deleted.
```json
{
  "type": "task_deleted",
  "taskId": "task-123"
}
```

#### activity_logged
Sent when a new activity is logged.
```json
{
  "type": "activity_logged",
  "activity": { /* activity object */ }
}
```

### Client → Server

Send JSON messages to the server:
```json
{
  "type": "ping",
  "data": {}
}
```

Server will acknowledge with:
```json
{
  "type": "ack",
  "message": "Message received",
  "data": { /* your data */ }
}
```

---

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**
```json
{
  "error": "Team name is required"
}
```

**404 Not Found:**
```json
{
  "error": "Team not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to fetch teams"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting for production use:
- Use `express-rate-limit` package
- Recommended: 100 requests per 15 minutes per IP

---

## CORS

CORS is enabled for the client URL specified in `CLIENT_URL` environment variable.

Default (development): `http://localhost:3000`

---

## Authentication

**Note:** This MVP does not include authentication. In production, consider adding:
- JWT-based authentication
- API key authentication
- OAuth integration
- Firebase Authentication

---

## Testing with cURL

### Get all teams
```bash
curl http://localhost:4000/api/teams
```

### Create a task
```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task",
    "teamId": "team-1",
    "assignee": "alice"
  }'
```

### Update task status
```bash
curl -X PUT http://localhost:4000/api/tasks/task-1 \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### Get team insights
```bash
curl -X POST http://localhost:4000/api/insights \
  -H "Content-Type: application/json" \
  -d '{"teamId": "team-1"}'
```
