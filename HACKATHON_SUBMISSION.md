# 🚀 CramMaster AgentX - TiDB AgentX Hackathon Submission

## Project Overview

**CramMaster AgentX** is an intelligent study planner that leverages **multi-step agentic AI workflows** to transform any syllabus into a personalized, gamified learning experience. Built specifically for the TiDB AgentX Hackathon, it showcases advanced AI orchestration with TiDB Serverless vector storage and Groq API integration.

### 🎯 Demo Ready Features
- **One-Click Demo**: "Run Full Demo" button with preloaded DBMS syllabus
- **Real-time Workflow Visualization**: Animated step tracker showing AI progress
- **Export & Share**: PDF export, JSON download, social sharing capabilities
- **Interactive Quizzes**: AI-generated questions with instant feedback
- **Health Monitoring**: Connection validation and API status dashboard

## 🎯 Hackathon Requirements Met

### ✅ Multi-Step Agentic Workflow
Our agent executes **6 automated steps** in a single workflow:

1. **Ingest & Index Data** → Extract topics, generate embeddings, store in TiDB Serverless
2. **Chain LLM Calls** → Sequential Groq API processing for enhanced intelligence
3. **Vector + Full-Text Search** → Find similar content using TiDB vector search
4. **External API Integration** → Pomodoro timers, Slack/Discord notifications
5. **Demo Features Generation** → Live quiz generation, progress tracking
6. **Workflow Completion** → Comprehensive result compilation with logging

### ✅ TiDB Serverless Integration
- **Vector Embeddings**: Groq embeddings stored in TiDB with JSON arrays
- **Vector Search**: Cosine similarity search for semantic content matching
- **Full-Text Search**: Combined with vector search for comprehensive results
- **Structured Data**: Study sessions, quiz results, workflow logs, and progress tracking
- **SSL Support**: Secure connections with mysql2 driver

### ✅ LLM Chaining with Groq API
- **Cost-Effective Processing**: Groq API instead of OpenAI for budget efficiency
- **Sequential Intelligence**: Each step feeds enhanced data to the next
- **Topic Extraction** → **Quiz Generation** → **Study Hints** → **Plan Creation**
- **Fallback Data**: Built-in fallback responses for demo reliability

### ✅ External Tool Integration
- **Pomodoro Timer API**: Automated study session management
- **Slack/Discord Webhooks**: Study progress notifications
- **QR Code API**: Shareable study plan links
- **Social Media APIs**: Progress sharing functionality

## 🚀 Data Flow Architecture

```
Syllabus Input → Topic Extraction (Groq) → Vector Embeddings (Groq) 
     ↓
TiDB Storage ← Vector Index ← Similarity Search → Related Content
     ↓
LLM Chain: Prioritize → Generate Questions → Study Hints → External APIs
     ↓
Demo Features: Live Quizzes → Progress Tracking → Export → Sharing
     ↓
Workflow Completion: Logging → Health Checks → Result Compilation
```

## 🛠️ Technical Stack

### Backend
- **Node.js + Express**: API server with RESTful endpoints
- **TiDB Serverless**: Vector + relational database with SSL
- **Groq API**: Cost-effective LLM chaining and embeddings
- **MySQL2**: TiDB connection with SSL support
- **Axios**: External API integrations

### Frontend
- **Vanilla JavaScript**: Interactive UI with step visualizer
- **Dark/Neon CSS Theme**: Cyberpunk-inspired design with animations
- **Real-time Step Tracking**: Live workflow progress visualization
- **Responsive Design**: Mobile-friendly interface

### External Integrations
- **Slack/Discord**: Webhook notifications
- **Pomodoro APIs**: Timer management
- **QR Code Generation**: Shareable links
- **Social Media**: Progress sharing

## 📊 Database Schema

```sql
-- Topics with vector embeddings
CREATE TABLE study_topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    topic_name VARCHAR(500) NOT NULL,
    content TEXT,
    priority ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
    embedding JSON COMMENT 'Vector embedding as JSON array',
    metadata JSON COMMENT 'Additional topic metadata',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_priority (priority)
);

-- Study progress tracking
CREATE TABLE study_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255),
    topic_id INT,
    session_data JSON,
    progress FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES study_topics(id)
);

-- Quiz results and scoring
CREATE TABLE quiz_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255),
    topic_id INT,
    questions JSON,
    answers JSON,
    score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES study_topics(id)
);
```

## 🎮 Key Features

### 1. Intelligent Topic Extraction
- NLP-powered syllabus parsing
- Automatic priority assignment
- Focus area emphasis

### 2. Vector-Powered Search
- Semantic similarity matching
- Related content discovery
- Context-aware recommendations

### 3. Gamified Learning
- Real-time quiz generation
- Progress tracking with badges
- Pomodoro timer integration
- Social sharing capabilities

### 4. Multi-Format Support
- Text input and file upload
- JSON, PDF, CSV export
- Calendar integration
- Shareable links with QR codes

## 🔗 API Endpoints

### Core Workflow
- `POST /api/workflow/execute` - Execute full multi-step workflow
- `POST /api/ingest` - Ingest and index syllabus data
- `POST /api/search/vector` - Vector similarity search

### Real-Time Features
- `POST /api/quiz/generate` - Generate live quizzes
- `POST /api/progress/update` - Update user progress
- `GET /api/progress/:userId` - Get progress data

### External Integrations
- `POST /api/notifications/send` - Send notifications
- `POST /api/timer/create` - Create timer sessions
- `POST /api/share/create` - Create shareable links

### Export & Sharing
- `POST /api/export/:format` - Export in JSON/CSV/Calendar
- `GET /share/:shareId` - View shared study plans

## 🎯 Demo Scenarios

### Scenario 1: DBMS Study Plan
**Input**: Database Management Systems syllabus, 3 hours available
**Output**: 
- 8 prioritized topics with time allocation
- 24 practice questions (MCQ, True/False, Fill-in-blank)
- Vector search finds related database concepts
- Pomodoro sessions created automatically
- Progress shareable via QR code

### Scenario 2: Algorithms Preparation
**Input**: Data Structures & Algorithms content, focus on "Dynamic Programming"
**Output**:
- DP gets high priority allocation
- Coding-specific practice questions
- Related algorithm topics discovered via vector search
- Achievement badges for completion milestones

## 🏃‍♂️ Run Instructions

### Prerequisites
- Node.js 16+
- TiDB Serverless account (free tier available)
- Groq API key (free tier available)

### Setup
1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd CramMaster
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials:
   # GROQ_API_KEY=gsk_your_groq_api_key_here
   # TIDB_HOST=gateway01.us-west-2.prod.aws.tidbcloud.com
   # TIDB_USER=your_tidb_username
   # TIDB_PASSWORD=your_tidb_password
   # TIDB_DATABASE=crammaster_db
   ```

3. **Start the Application**
   ```bash
   # Start backend server
   cd backend

2. **Start Backend**
```bash
cd backend
npm start
```

3. **Open Frontend**
```bash
# Open index.html in browser or:
npx serve . -p 3000
```

4. **Run Demo**
- Visit `http://localhost:3000`
- Click **"🎬 Run Full Demo"** for instant demo with DBMS syllabus
- OR upload your own syllabus file
- Watch the 6-step workflow execute in real-time
- Test export features (PDF, JSON, Share)
- Interact with AI-generated quizzes

### Health Check
- Backend API: `http://localhost:3001/api/health`
- API docs: `http://localhost:3001/api/docs`

### Environment Setup
The `.env` file is pre-configured with demo credentials. For production use, update:
- `GROQ_API_KEY` - Your Groq API key
- `TIDB_*` - Your TiDB Serverless credentials

## 🎥 Demo Video Features

The demonstration video showcases:
1. **6-Step Workflow**: Complete AgentX pipeline with real-time visualization
2. **TiDB Vector Search**: Semantic similarity matching with JSON storage
3. **Groq API Integration**: Cost-effective LLM processing
4. **Live Demo Features**: Real-time quiz generation and progress tracking
5. **Dark/Neon UI**: Animated step visualizer with cyberpunk theme
6. **External Integrations**: Notifications, timers, and sharing features

## 🏅 Innovation Highlights

### 1. True Multi-Step Automation
Unlike simple RAG demos, CramMaster executes a complete workflow from raw syllabus to actionable study plan with zero manual intervention.

### 2. Vector-Enhanced Learning
Combines TiDB vector search with educational content to discover related concepts students might miss.

### 3. Real-World Utility
Solves actual student problems with gamification, time management, and progress tracking.

### 4. Scalable Architecture
Modular design supports adding new LLM providers, external APIs, and educational features.

## 📈 Business Impact

- **Students**: Transform chaotic study sessions into organized, gamified learning
- **Educators**: Gain insights into student progress and learning patterns
- **Institutions**: Scale personalized learning with AI automation

## 🔮 Future Enhancements

- **Multi-Language Support**: Expand beyond English syllabi
- **Advanced Analytics**: Learning pattern analysis with TiDB
- **Collaborative Features**: Group study sessions and competitions
- **Mobile App**: Native iOS/Android applications
- **LMS Integration**: Canvas, Blackboard, Moodle connectors

---

## 📞 Contact Information

**Team**: CramMaster AgentX Development Team
**Email**: hackathon-judge@pingcap.com
**Repository**: [GitHub Repository URL]
**Demo**: [Live Demo URL]

**TiDB Cloud Account**: [Your TiDB Cloud Email]

---

*Built with ❤️ for the TiDB AgentX Hackathon - Demonstrating the power of multi-step agentic AI workflows for real-world educational impact.*
