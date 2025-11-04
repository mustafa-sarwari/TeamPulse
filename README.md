# TeamPulse - Real-Time Team Productivity Dashboard 📊

A modern full-stack productivity dashboard for small teams, featuring real-time collaboration, live activity tracking, task management, and AI-powered insights.

## 🎯 Project Overview

TeamPulse is a real-time team productivity dashboard designed to help small teams track:
- Live team member activity (online/offline status)
- Task completion progress and analytics
- Visual productivity insights with interactive charts
- AI-generated summaries of team performance and workload balance

This project demonstrates production-ready full-stack development with real-time capabilities, perfect for showcasing technical skills in modern web development.

## ✨ Features

- **Real-Time Updates**: WebSocket-powered live status updates
- **Task Management**: Create, update, and track team tasks
- **Live Activity Monitoring**: See who's online and active
- **Data Visualization**: Interactive charts for productivity analytics
- **AI Insights**: OpenAI-powered team performance summaries
- **Modern UI**: Clean, responsive interface with Tailwind CSS
- **Firebase Integration**: Secure cloud database with Firestore

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js** - Interactive data visualizations
- **Axios** - HTTP client

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Firebase Firestore** - Cloud database
- **WebSocket (ws)** - Real-time bidirectional communication
- **OpenAI API** - AI-powered insights

### DevOps
- **GitHub Actions** - CI/CD automation
- **Vercel** - Frontend deployment
- **Render** - Backend deployment

## 📁 Project Structure

```
TeamPulse/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   ├── App.jsx        # Main app component
│   │   ├── main.jsx       # Application entry point
│   │   └── index.css      # Global styles
│   ├── index.html         # HTML template
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite configuration
│
├── server/                # Backend Node.js application
│   ├── routes/           # API route handlers
│   ├── config/           # Configuration files
│   ├── index.js          # Server entry point
│   ├── package.json      # Backend dependencies
│   └── .env.example      # Environment variables template
│
├── .github/
│   └── workflows/        # CI/CD workflows
│
├── .gitignore           # Git ignore rules
├── .eslintrc.json       # ESLint configuration
├── .prettierrc          # Prettier configuration
└── README.md            # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account (for Firestore)
- OpenAI API key (for AI insights)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mustafa-sarwari/TeamPulse.git
   cd TeamPulse
   ```

2. **Setup Backend**
   ```bash
   cd server
   npm install
   
   # Create .env file from example
   cp .env.example .env
   
   # Edit .env and add your credentials:
   # - Firebase configuration
   # - OpenAI API key
   # - Other environment variables
   ```

3. **Setup Frontend**
   ```bash
   cd ../client
   npm install
   ```

### Running Locally

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   # Server will run on http://localhost:4000
   ```

2. **Start the frontend (in a new terminal)**
   ```bash
   cd client
   npm run dev
   # Client will run on http://localhost:3000
   ```

3. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Download your service account key
4. Save it as `firebaseServiceAccount.json` in the `server/` directory
5. Update `.env` with your Firebase project details

### OpenAI API Setup

1. Get your API key from [OpenAI Platform](https://platform.openai.com/)
2. Add it to your `.env` file as `OPENAI_API_KEY`

## 📦 Deployment

Detailed deployment instructions are available in `deployment.md`.

### Quick Deploy Summary

**Frontend (Vercel)**
```bash
cd client
vercel --prod
```

**Backend (Render)**
- Connect your GitHub repository
- Set environment variables in Render dashboard
- Deploy from the `server` directory

## 🧪 Testing

```bash
# Run frontend linting
cd client
npm run lint

# Run backend linting
cd server
npm run lint
```

## 📝 API Endpoints

- `GET /health` - Health check
- `GET /api/teams` - Get all teams
- `POST /api/teams` - Create a new team
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create a new task
- `GET /api/activities` - Get team activities
- `POST /api/insights` - Generate AI insights

## 🔮 Future Improvements

- [ ] User authentication and authorization
- [ ] Team member roles and permissions
- [ ] Email notifications for task assignments
- [ ] Mobile app (React Native)
- [ ] Advanced analytics and reporting
- [ ] Integration with Slack/Teams
- [ ] Calendar integration
- [ ] Custom themes and branding
- [ ] Multi-language support
- [ ] Offline mode support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Mustafa Sarwari**
- GitHub: [@mustafa-sarwari](https://github.com/mustafa-sarwari)

## 🙏 Acknowledgments

- Built as a portfolio project to demonstrate full-stack development skills
- Inspired by modern productivity tools like Asana, Monday.com, and Linear
- Uses best practices from industry-leading startups
