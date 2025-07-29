# QzonMe - Quiz Creation Platform

QzonMe is a full-stack web application for creating and sharing interactive quizzes. Built with React, Node.js, Express, and PostgreSQL.

## 🚀 Live Demo

- **Frontend**: [https://qzonme-frontend.onrender.com](https://qzonme-frontend.onrender.com)
- **API**: [https://qzonme-api.onrender.com](https://qzonme-api.onrender.com)
- **Health Check**: [https://qzonme-api.onrender.com/health](https://qzonme-api.onrender.com/health)

## 🏗️ Architecture

This is a monorepo containing:
- **Frontend**: React + TypeScript + Vite (Static Site)
- **Backend**: Node.js + Express + PostgreSQL (Web Service)
- **Database**: PostgreSQL (Managed Database)

## 📋 Features

- ✨ AI-powered quiz generation
- 📝 Manual quiz creation
- 🎯 Multiple choice questions with images
- 📊 Real-time leaderboards
- 🔗 Easy sharing via links
- 📱 Mobile-responsive design
- 🔒 Security-first architecture
- ⚡ Fast and lightweight

## 🚀 Deployment on Render

This project is configured for easy deployment on Render.com using their monorepo support.

### Prerequisites

1. GitHub repository with your code
2. Render.com account
3. Required API keys (see Environment Variables section)

### Deployment Steps

1. **Fork/Clone this repository** to your GitHub account

2. **Connect to Render**:
   - Go to [Render.com](https://render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select this repository

3. **Configure Services**:
   Render will automatically create:
   - PostgreSQL database (`qzonme-db`)
   - Backend API service (`qzonme-api`)
   - Frontend static site (`qzonme-frontend`)

4. **Set Environment Variables**:
   In the Render dashboard, add the following environment variables to your API service:
   
   ```
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   TOGETHER_API_KEY=your_together_api_key
   GEMINI_API_KEY=your_gemini_key
   SENDGRID_API_KEY=your_sendgrid_key
   GOOGLE_VISION_API_KEY=your_google_vision_key
   ```

5. **Deploy**:
   - Render will automatically build and deploy your services
   - The database will be provisioned and connected
   - Your app will be live at the provided URLs

### Service URLs

After deployment, you'll have:
- **Frontend**: `https://your-app-name-frontend.onrender.com`
- **API**: `https://your-app-name-api.onrender.com`
- **Health Check**: `https://your-app-name-api.onrender.com/health`

## 🛠️ Local Development

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- API keys for external services

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/emydandaniel/qzonme_render-monorepo-deployment.git
   cd PersonalQuizBuilder
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Set up the database**:
   ```bash
   npm run db:push
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

   This will start both the frontend and backend in development mode.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:client` - Build frontend only
- `npm run build:server` - Build backend only
- `npm start` - Start production server
- `npm run db:push` - Push database schema
- `npm run db:migrate` - Run database migrations

## 🔧 Project Structure

```
PersonalQuizBuilder/
├── client/                 # Frontend React app
│   ├── src/
│   ├── public/
│   └── index.html
├── server/                 # Backend Express app
│   ├── routes/
│   ├── middleware/
│   ├── db/
│   └── index.ts
├── shared/                 # Shared types and schemas
├── migrations/             # Database migrations
├── render.yaml            # Render deployment config
├── package.json           # Dependencies and scripts
└── README.md
```

## 🔒 Security Features

- Helmet.js for security headers
- CORS protection
- Rate limiting on all endpoints
- Input sanitization
- SQL injection prevention with Drizzle ORM
- Session-based authentication
- File upload size limits
- CSP (Content Security Policy)

## 🌐 API Endpoints

### Health & Status
- `GET /health` - Health check endpoint
- `GET /ping` - Simple ping endpoint

### User Management
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user details

### Quiz Management
- `POST /api/quizzes` - Create quiz
- `GET /api/quizzes/:id` - Get quiz details
- `DELETE /api/quizzes/:id` - Delete quiz

### Quiz Attempts
- `POST /api/quiz-attempts` - Submit quiz attempt
- `GET /api/quiz-attempts/:quizId` - Get quiz leaderboard

### Auto-Create (AI)
- `POST /api/auto-create` - Generate quiz with AI

## 📊 Monitoring & Health

The application includes several monitoring endpoints:

- **Health Check**: `/health` - Returns server status and uptime
- **Ping**: `/ping` - Simple connectivity test
- **Database Connection**: Automatic health checks in the backend

You can use these endpoints with uptime monitoring services like:
- UptimeRobot
- Pingdom
- StatusPage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Health Check endpoint](https://qzonme-api.onrender.com/health)
2. Review the Render service logs
3. Verify all environment variables are set correctly
4. Open an issue on GitHub

## 🔗 Links

- **Repository**: [https://github.com/emydandaniel/qzonme_render-monorepo-deployment](https://github.com/emydandaniel/qzonme_render-monorepo-deployment)
- **Live App**: [https://qzonme-frontend.onrender.com](https://qzonme-frontend.onrender.com)
- **API Docs**: [https://qzonme-api.onrender.com/health](https://qzonme-api.onrender.com/health)
