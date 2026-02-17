# NeuroLearn - AI-Powered Accessible Learning Platform

An advanced educational platform featuring AI-powered course content generation, real-time transcription, sign language support, and accessibility-first design.

## 🚀 New Feature: AI Course Content Generation

### What It Does
Automatically generates structured course outlines from video lectures using AI-powered transcript analysis.

### How It Works
1. Upload a video lecture
2. System transcribes using AssemblyAI
3. AI analyzes educational keywords and topics
4. Generates hierarchical course modules with lessons
5. Displays in Course Content sidebar with duration estimates

### Key Features
- ✨ **Automatic Generation**: Triggers after video transcription
- 🧠 **Intelligent Analysis**: Detects 50+ educational keywords
- 📚 **Structured Output**: Creates 3-6 modules with 2-5 lessons each
- ⚡ **Fast**: < 1 second generation time
- 🛡️ **Reliable**: Fallback structure if AI fails
- 🎨 **Visual Indicators**: Sparkles icon for AI-generated content

### Example Output
```
1. Introduction & Foundations
   - Course Overview (6m)
   - Core Concepts (10m)
   - Historical Context (8m)

2. The CPU & Processing
   - ALU & Registers (12m)
   - Instruction Cycles (14m)
   - Control Unit (10m)

3. Memory Systems
   - Memory Hierarchy (11m)
   - Cache Organization (13m)
   - Virtual Memory (15m)
```

## 📋 Features

### Core Features
- 🎓 **Course Management**: Create and organize educational content
- 🎥 **Video Player**: Advanced player with accessibility features
- 🗣️ **Text-to-Speech**: AWS Polly integration for audio narration
- 📝 **Real-time Transcription**: AssemblyAI-powered video transcription
- 🤖 **AI Course Generation**: Intelligent course outline creation
- ♿ **Sign Language AI**: Visual communication support
- 👥 **Community Forum**: Discussion boards with real-time updates
- 🔔 **Push Notifications**: Firebase Cloud Messaging
- 📊 **Admin Dashboard**: User management and analytics

### Accessibility Features
- High contrast themes (dark/light mode)
- Dyslexic-friendly fonts
- Keyboard navigation
- Screen reader support
- Subtitle support
- Adjustable playback speed
- Sign language interpretation

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI**: React, Tailwind CSS, shadcn/ui
- **Animation**: Framer Motion
- **State**: React Context API

### Backend & Services
- **Authentication**: Firebase Authentication
- **Database**: Cloud Firestore
- **Storage**: AWS S3
- **Transcription**: AssemblyAI
- **Text-to-Speech**: AWS Polly
- **AI Analysis**: Custom NLP + AssemblyAI

### AI & ML
- **Course Generation**: Intelligent keyword analysis
- **Transcription**: AssemblyAI API
- **Sign Language**: TensorFlow.js integration
- **Topic Detection**: Custom algorithm (50+ educational keywords)

## 📦 Installation

### Prerequisites
- Node.js 18+ and pnpm
- Firebase project
- AWS account (S3, Polly)
- AssemblyAI API key

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd praks-project-2.0
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Configure environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project

# Firebase Admin
FIREBASE_PROJECT_ID=your_project
FIREBASE_CLIENT_EMAIL=your_email
FIREBASE_PRIVATE_KEY="your_key"

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=your_bucket

# AssemblyAI (REQUIRED for AI course generation)
ASSEMBLYAI_API_KEY=your_api_key

# OpenAI (optional)
OPENAI_API_KEY=your_key
```

4. **Run development server**
```bash
pnpm dev
```

5. **Open in browser**
```
http://localhost:3000
```

## 🎯 Usage

### For Students
1. Browse courses from the dashboard
2. Watch video lectures with AI-generated outlines
3. Enable accessibility features as needed
4. Participate in community discussions
5. Track your learning progress

### For Teachers
1. Create courses and upload video content
2. AI automatically generates course structure
3. Manage student enrollments
4. Monitor course analytics
5. Moderate community discussions

### For Admins
1. Access admin panel at `/admin`
2. Manage users and content
3. View system health metrics
4. Configure notifications
5. Review transcription jobs

## 📚 Documentation

- [AI Course Generation Guide](docs/ai-course-generation.md)
- [Demo Guide for Presentations](docs/demo-guide-ai-course-generation.md)
- [S3 Setup](docs/s3-setup.md)

## 🗂️ Project Structure

```
praks-project-2.0/
├── app/
│   ├── (auth)/              # Authentication pages
│   ├── admin/               # Admin dashboard
│   ├── api/                 # API routes
│   │   ├── content/         # Content management
│   │   │   └── generate-modules/  # AI course generation
│   │   ├── transcribe/      # Video transcription
│   │   └── speech/          # Text-to-speech
│   ├── courses/             # Course pages
│   ├── dashboard/           # User dashboard
│   └── community/           # Community forum
├── components/
│   ├── learning/            # Learning components
│   │   └── course-player.tsx  # Video player + AI integration
│   ├── auth/                # Auth components
│   ├── ui/                  # UI components (shadcn)
│   └── layout/              # Layout components
├── lib/
│   ├── firebase.ts          # Firebase config
│   ├── aws-services.ts      # AWS integrations
│   └── aws-clients.ts       # AWS clients
├── docs/                    # Documentation
└── public/                  # Static assets
```

## 🔑 Key API Routes

### AI Course Generation
- **POST** `/api/content/generate-modules`
  - Generates course outline from transcript
  - Returns structured modules with lessons
  - Includes duration estimates

### Transcription
- **POST** `/api/transcribe/start`
  - Starts video transcription job
  - Supports AssemblyAI and OpenAI Whisper
  - Returns job ID for status polling

### Text-to-Speech
- **POST** `/api/speech/synthesize`
  - Converts text to speech using AWS Polly
  - Multiple voice options
  - Returns audio stream

## 🎨 UI Components

### Course Player
- Video playback with controls
- Real-time transcript display
- AI-generated course outline sidebar
- Text-to-speech integration
- Sign language AI panel
- Accessibility settings

### Admin Dashboard
- User management
- Content moderation
- System health metrics
- Notification management
- Transcription job monitoring

## 🧪 Testing

### Run Tests
```bash
# Run all tests
pnpm test

# Run specific test
pnpm test course-player
```

### Test AI Generation
```bash
# Test API endpoint
curl -X POST http://localhost:3000/api/content/generate-modules \
  -H "Content-Type: application/json" \
  -d '{"transcriptText":"Introduction to CPU architecture and memory systems...","courseTitle":"Computer Architecture"}'
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Manual Deployment
```bash
# Build production bundle
pnpm build

# Start production server
pnpm start
```

## 🔒 Security

- Firebase Authentication for user management
- Server-side API key protection
- S3 signed URLs for secure content access
- Role-based access control (student/teacher/admin)
- Environment variable protection

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is for educational purposes.

## 🙏 Acknowledgments

- AssemblyAI for transcription and AI capabilities
- AWS for cloud services (S3, Polly)
- Firebase for authentication and database
- shadcn/ui for beautiful components
- Next.js team for the amazing framework

## 📞 Support

For questions or issues:
- Check [documentation](docs/)
- Review [demo guide](docs/demo-guide-ai-course-generation.md)
- Contact project maintainer

---

**Built with ❤️ for accessible education**
