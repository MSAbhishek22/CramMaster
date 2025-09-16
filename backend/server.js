/**
 * CramMaster AgentX API Server
 * TiDB AgentX Hackathon - Multi-Step Agentic AI Workflow
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import CramMasterAgentX from './tidb-agent.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../')));

// File upload configuration
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['text/plain', 'application/pdf', 'application/msword'];
        cb(null, allowedTypes.includes(file.mimetype));
    }
});

// Enhanced logging
const log = (level, message, data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    console.log(logEntry);
    if (data) {
        console.log('Data:', JSON.stringify(data, null, 2));
    }
};

// Initialize CramMaster AgentX
const agentConfig = {
    tidb: {
        host: process.env.TIDB_HOST || 'gateway01.us-west-2.prod.aws.tidbcloud.com',
        port: process.env.TIDB_PORT || 4000,
        user: process.env.TIDB_USER || 'your_username',
        password: process.env.TIDB_PASSWORD || 'your_password',
        database: process.env.TIDB_DATABASE || 'crammaster'
    },
    groq: {
        apiKey: process.env.GROQ_API_KEY || 'your_groq_key'
    },
    slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL
    },
    discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL
    },
    pomodoro: {
        apiUrl: process.env.POMODORO_API_URL || 'https://api.pomofocus.io'
    }
};

// ==================== API ENDPOINTS ====================

/**
 * POST /api/workflow/execute
 * Main endpoint - Execute full multi-step agentic workflow
 */
app.post('/api/workflow/execute', async (req, res) => {
    try {
        const { syllabusContent, studyHours, focusTopics, userPreferences, userId } = req.body;
        
        if (!syllabusContent || !studyHours) {
            return res.status(400).json({
                error: 'Missing required fields: syllabusContent and studyHours'
            });
        }

        log('info', `Starting workflow for user: ${userId || 'anonymous'}`, { studyHours, focusTopics });
        
        const agent = new CramMasterAgentX(agentConfig);
        const result = await agent.executeFullWorkflow(
            syllabusContent,
            studyHours,
            focusTopics || '',
            userPreferences || {}
        );

        res.json({
            success: true,
            data: result,
            workflow_id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        log('error', 'Workflow execution failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * POST /api/ingest
 * Step 1: Ingest and index syllabus data
 */
app.post('/api/ingest', async (req, res) => {
    try {
        const { syllabusContent, userId } = req.body;
        
        const agent = new CramMasterAgentX(agentConfig);
        const result = await agent.ingestAndIndex(syllabusContent, userId || 'demo-user');
        
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/search/vector
 * Step 3: Vector similarity search
 */
app.post('/api/search/vector', async (req, res) => {
    try {
        const { query, limit } = req.body;
        
        const agent = new CramMasterAgentX(agentConfig);
        await agent.connectToTiDB();
        
        const results = await agent.searchSimilarContent(query, limit || 5);
        
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/quiz/generate
 * Real-time quiz generation for specific topics
 */
app.post('/api/quiz/generate', async (req, res) => {
    try {
        const { topic, questionCount, difficulty } = req.body;
        
        const agent = new CramMasterAgentX(agentConfig);
        
        // Generate questions using LLM
        const prompt = `
        Generate ${questionCount || 3} practice questions for the topic: ${topic}
        Difficulty level: ${difficulty || 'Medium'}
        
        Include:
        - 1 MCQ with 4 options
        - 1 True/False question
        - 1 Fill-in-the-blank question
        
        Return JSON array format:
        [
            {
                "type": "MCQ|True-False|Fill-in-the-Blank",
                "question": "",
                "options": ["opt1", "opt2", "opt3", "opt4"],
                "answer": "",
                "explanation": "",
                "points": 10
            }
        ]
        `;

        const response = await agent.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7
        });

        const questions = JSON.parse(response.choices[0].message.content);
        
        res.json({
            success: true,
            data: {
                topic,
                questions,
                generated_at: new Date().toISOString(),
                quiz_id: `quiz_${Date.now()}`
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/progress/update
 * Update user progress tracking
 */
app.post('/api/progress/update', async (req, res) => {
    try {
        const { userId, topicId, progress, sessionData } = req.body;
        
        const agent = new CramMasterAgentX(agentConfig);
        await agent.connectToTiDB();
        
        await agent.connection.execute(`
            INSERT INTO study_sessions (user_id, topic_id, session_data, progress)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                session_data = VALUES(session_data),
                progress = VALUES(progress)
        `, [userId, topicId, JSON.stringify(sessionData), progress]);
        
        res.json({ success: true, message: 'Progress updated' });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/progress/:userId
 * Get user progress
 */
app.get('/api/progress/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const agent = new CramMasterAgentX(agentConfig);
        await agent.connectToTiDB();
        
        const [sessions] = await agent.connection.execute(`
            SELECT ss.*, st.topic_name, st.priority
            FROM study_sessions ss
            JOIN study_topics st ON ss.topic_id = st.id
            WHERE ss.user_id = ?
            ORDER BY ss.created_at DESC
        `, [userId]);
        
        const totalProgress = sessions.length > 0 
            ? sessions.reduce((sum, s) => sum + s.progress, 0) / sessions.length 
            : 0;
        
        res.json({
            success: true,
            data: {
                sessions,
                total_progress: totalProgress,
                topics_studied: sessions.length,
                last_activity: sessions[0]?.created_at
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/notifications/send
 * Send notifications via external APIs
 */
app.post('/api/notifications/send', async (req, res) => {
    try {
        const { message, channels, userId } = req.body;
        
        const results = {};
        
        if (channels.includes('slack') && agentConfig.slack.webhookUrl) {
            const slackResponse = await fetch(agentConfig.slack.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `🎓 CramMaster: ${message}`,
                    username: 'CramMaster Bot'
                })
            });
            results.slack = slackResponse.ok;
        }
        
        if (channels.includes('discord') && agentConfig.discord.webhookUrl) {
            const discordResponse = await fetch(agentConfig.discord.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `🎓 **CramMaster Notification**\n${message}`,
                    username: 'CramMaster Bot'
                })
            });
            results.discord = discordResponse.ok;
        }
        
        res.json({ success: true, data: results });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/timer/create
 * Create Pomodoro timer session
 */
app.post('/api/timer/create', async (req, res) => {
    try {
        const { topics, userId } = req.body;
        
        const timerSessions = topics.map((topic, index) => ({
            id: `session_${index}`,
            topic: topic.topic,
            duration: parseInt(topic.time_allocation) * 60, // Convert to seconds
            breaks: Math.floor(parseInt(topic.time_allocation) / 25),
            status: 'pending'
        }));
        
        const sessionId = `timer_${Date.now()}_${userId}`;
        
        // Store timer session (in production, use Redis or database)
        global.timerSessions = global.timerSessions || {};
        global.timerSessions[sessionId] = {
            sessions: timerSessions,
            created_at: new Date().toISOString(),
            user_id: userId
        };
        
        res.json({
            success: true,
            data: {
                session_id: sessionId,
                sessions: timerSessions,
                total_duration: timerSessions.reduce((sum, s) => sum + s.duration, 0)
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/timer/:sessionId
 * Get timer session status
 */
app.get('/api/timer/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = global.timerSessions?.[sessionId];
        
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }
        
        res.json({ success: true, data: session });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/export/:format
 * Export study plan in various formats
 */
app.post('/api/export/:format', async (req, res) => {
    try {
        const { format } = req.params;
        const { studyPlan, userId } = req.body;
        
        let exportData;
        let contentType;
        let filename;
        
        switch (format) {
            case 'json':
                exportData = JSON.stringify(studyPlan, null, 2);
                contentType = 'application/json';
                filename = `study-plan-${Date.now()}.json`;
                break;
                
            case 'csv':
                const csvRows = [
                    ['Topic', 'Priority', 'Time Allocation', 'Key Points'],
                    ...studyPlan.study_plan.map(topic => [
                        topic.topic,
                        topic.priority,
                        topic.time_allocation,
                        topic.key_points.join('; ')
                    ])
                ];
                exportData = csvRows.map(row => row.join(',')).join('\n');
                contentType = 'text/csv';
                filename = `study-plan-${Date.now()}.csv`;
                break;
                
            case 'calendar':
                // Generate ICS calendar format
                const events = studyPlan.study_plan.map((topic, index) => {
                    const startDate = new Date();
                    startDate.setHours(9 + index, 0, 0, 0); // Start at 9 AM, each topic 1 hour apart
                    const endDate = new Date(startDate.getTime() + parseInt(topic.time_allocation) * 60000);
                    
                    return [
                        'BEGIN:VEVENT',
                        `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                        `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                        `SUMMARY:Study: ${topic.topic}`,
                        `DESCRIPTION:Priority: ${topic.priority}\\nKey Points: ${topic.key_points.join(', ')}`,
                        'END:VEVENT'
                    ].join('\n');
                });
                
                exportData = [
                    'BEGIN:VCALENDAR',
                    'VERSION:2.0',
                    'PRODID:-//CramMaster//Study Plan//EN',
                    ...events,
                    'END:VCALENDAR'
                ].join('\n');
                contentType = 'text/calendar';
                filename = `study-plan-${Date.now()}.ics`;
                break;
                
            default:
                return res.status(400).json({ success: false, error: 'Unsupported format' });
        }
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(exportData);
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/share/create
 * Create shareable study plan link
 */
app.post('/api/share/create', async (req, res) => {
    try {
        const { studyPlan, userId, privacy } = req.body;
        
        const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store shareable data (in production, use database)
        global.sharedPlans = global.sharedPlans || {};
        global.sharedPlans[shareId] = {
            study_plan: studyPlan,
            user_id: userId,
            privacy: privacy || 'public',
            created_at: new Date().toISOString(),
            views: 0
        };
        
        const shareUrl = `${req.protocol}://${req.get('host')}/share/${shareId}`;
        
        res.json({
            success: true,
            data: {
                share_id: shareId,
                share_url: shareUrl,
                qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`,
                social_text: `🚀 Check out my AI-generated study plan! ${studyPlan.study_plan.length} topics to master with CramMaster AgentX.`
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /share/:shareId
 * View shared study plan
 */
app.get('/share/:shareId', (req, res) => {
    try {
        const { shareId } = req.params;
        const sharedPlan = global.sharedPlans?.[shareId];
        
        if (!sharedPlan) {
            return res.status(404).send('Study plan not found or expired.');
        }
        
        // Increment view count
        sharedPlan.views++;
        
        // Render shared plan page
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Shared Study Plan - CramMaster AgentX</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; }
                .header { text-align: center; margin-bottom: 30px; }
                .topic { background: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 15px; border-left: 4px solid #667eea; }
                .priority-high { border-left-color: #ff6b6b; }
                .priority-medium { border-left-color: #ffd93d; }
                .priority-low { border-left-color: #4ecdc4; }
                .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: bold; }
                .badge-high { background: #ff6b6b; color: white; }
                .badge-medium { background: #ffd93d; color: #333; }
                .badge-low { background: #4ecdc4; color: white; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎓 CramMaster AgentX Study Plan</h1>
                    <p>AI-Generated Multi-Step Study Roadmap</p>
                    <p><small>Views: ${sharedPlan.views} | Created: ${new Date(sharedPlan.created_at).toLocaleDateString()}</small></p>
                </div>
                
                ${sharedPlan.study_plan.study_plan.map(topic => `
                    <div class="topic priority-${topic.priority.toLowerCase()}">
                        <h3>${topic.topic} <span class="badge badge-${topic.priority.toLowerCase()}">${topic.priority}</span></h3>
                        <p><strong>Time Allocation:</strong> ${topic.time_allocation}</p>
                        <p><strong>Key Points:</strong></p>
                        <ul>
                            ${topic.key_points.map(point => `<li>${point}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
                
                <div style="text-align: center; margin-top: 30px;">
                    <p><strong>Generated by CramMaster AgentX</strong></p>
                    <p>Multi-Step Agentic AI for TiDB AgentX Hackathon</p>
                </div>
            </div>
        </body>
        </html>
        `;
        
        res.send(html);
        
    } catch (error) {
        res.status(500).send('Error loading shared plan.');
    }
});

/**
 * File upload endpoint
 */
app.post('/api/upload', upload.single('syllabus'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        
        // In production, process the file content here
        res.json({
            success: true,
            data: {
                filename: req.file.originalname,
                size: req.file.size,
                path: req.file.path,
                message: 'File uploaded successfully. Process with /api/workflow/execute'
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        service: 'CramMaster AgentX API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * API documentation endpoint
 */
app.get('/api/docs', (req, res) => {
    const docs = {
        title: 'CramMaster AgentX API Documentation',
        description: 'Multi-Step Agentic AI Workflow for TiDB AgentX Hackathon',
        endpoints: {
            'POST /api/workflow/execute': 'Execute full multi-step workflow',
            'POST /api/ingest': 'Ingest and index syllabus data',
            'POST /api/search/vector': 'Vector similarity search',
            'POST /api/quiz/generate': 'Generate real-time quizzes',
            'POST /api/progress/update': 'Update user progress',
            'GET /api/progress/:userId': 'Get user progress',
            'POST /api/notifications/send': 'Send notifications',
            'POST /api/timer/create': 'Create timer session',
            'POST /api/export/:format': 'Export study plan',
            'POST /api/share/create': 'Create shareable link',
            'POST /api/upload': 'Upload syllabus file'
        },
        workflow_steps: [
            '1. Ingest & Index Data (TiDB Vector Storage)',
            '2. Chain LLM Calls (Summarize → Generate → Gamify)',
            '3. Vector + Full-Text Search',
            '4. External API Integration',
            '5. Real-Time Demo Features'
        ]
    };
    
    res.json(docs);
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        available_endpoints: '/api/docs'
    });
});

// Health check endpoint with TiDB and Groq validation
app.get('/api/health', async (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {},
        version: '1.0.0'
    };

    try {
        // Test TiDB connection
        const agent = new CramMasterAgentX(agentConfig);
        await agent.testConnections();
        healthStatus.services.tidb = { status: 'connected', message: 'TiDB connection successful' };
        healthStatus.services.groq = { status: 'configured', message: 'Groq API key configured' };
        
        log('info', 'Health check passed - all services operational');
        res.json(healthStatus);
    } catch (error) {
        healthStatus.status = 'unhealthy';
        healthStatus.services.tidb = { status: 'error', message: error.message };
        log('error', 'Health check failed', { error: error.message });
        res.status(503).json(healthStatus);
    }
});

// Start server
app.listen(PORT, async () => {
    log('info', `CramMaster AgentX API Server starting on port ${PORT}`);
    console.log(`🚀 CramMaster AgentX API Server running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🎯 Multi-Step Agentic AI Workflow Ready!`);
    
    // Test initial connections
    try {
        const agent = new CramMasterAgentX(agentConfig);
        await agent.testConnections();
        log('info', 'Initial connection tests passed - TiDB and Groq ready');
    } catch (error) {
        log('error', 'Initial connection test failed', { error: error.message });
        console.warn('⚠️  Warning: Some services may not be available');
    }
});

export default app;
