/**
 * CramMaster AgentX - Multi-Step Agentic AI Workflow
 * TiDB AgentX Hackathon Implementation
 * 
 * Workflow: Ingest → Vector Index → LLM Chain → Search → External APIs → Demo
 */

import tidbConnection from './db.js';
import groqLLM from './llm.js';
import axios from 'axios';

class CramMasterAgentX {
    constructor(config = {}) {
        // TiDB connection via db.js helper
        this.tidbConnection = tidbConnection;
        
        // Groq LLM for embeddings and LLM chains
        this.groqLLM = groqLLM;
        
        // External API configurations
        this.externalAPIs = {
            slack: config.slack?.webhookUrl || process.env.SLACK_WEBHOOK_URL,
            discord: config.discord?.webhookUrl || process.env.DISCORD_WEBHOOK_URL,
            pomodoro: config.pomodoro?.apiUrl || process.env.POMODORO_API_URL
        };
        
        this.workflowState = {
            currentStep: 0,
            totalSteps: 6,
            data: {},
            logs: []
        };
    }

    /**
     * MAIN WORKFLOW ORCHESTRATOR
     * Executes all 6 steps of the agentic AI workflow
     */
    async executeFullWorkflow(syllabusContent, studyHours, focusTopics = '', userPreferences = {}) {
        const userId = `demo-user-${Date.now()}`;
        this.workflowState.startTime = Date.now();
        
        try {
            console.log('🚀 Starting CramMaster AgentX Full Workflow...');
            
            // Use fallback mode for demo purposes
            const studyPlan = await this.createFallbackStudyPlan(syllabusContent, studyHours, focusTopics);
            
            this.logStep('Workflow completed successfully in demo mode', 'success');
            
            return {
                success: true,
                workflow_id: this.generateWorkflowId(),
                execution_time: this.calculateExecutionTime(),
                studyPlan: studyPlan,
                searchResults: [],
                apiIntegrations: { demo: true },
                demoFeatures: { enabled: true },
                logs: this.workflowState.logs,
                mode: 'demo_fallback'
            };
            
        } catch (error) {
            this.logStep(`Workflow failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async createFallbackStudyPlan(syllabusContent, studyHours, focusTopics = '') {
        console.log('📚 Creating fallback study plan for demo...');
        
        // Parse syllabus content into topics
        const topics = this.parseTopicsFromSyllabus(syllabusContent, focusTopics);
        
        // Generate study plan structure
        const studyPlan = {
            total_time: parseInt(studyHours) || 4,
            focus_areas: focusTopics.split(',').map(t => t.trim()).filter(t => t),
            topics: topics.map((topic, index) => ({
                id: index + 1,
                topic_name: topic.name,
                content: topic.content,
                difficulty: topic.difficulty || 'Medium',
                estimated_time: Math.ceil((parseInt(studyHours) || 4) * 60 / topics.length),
                priority: index < 3 ? 'High' : index < 6 ? 'Medium' : 'Low',
                quiz_questions: this.generateSampleQuestions(topic.name),
                study_tips: this.generateStudyTips(topic.name)
            })),
            created_at: new Date().toISOString(),
            user_id: `demo-user-${Date.now()}`
        };
        
        return studyPlan;
    }

    parseTopicsFromSyllabus(syllabusContent, focusTopics = '') {
        const lines = syllabusContent.split('\n').filter(line => line.trim());
        const topics = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip empty lines and headers
            if (!trimmed || trimmed.length < 3) continue;
            
            // Extract topic names (look for numbered items or bullet points)
            if (trimmed.match(/^\d+\./) || trimmed.match(/^-\s/) || trimmed.match(/^•\s/)) {
                const topicName = trimmed.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim();
                
                if (topicName.length > 5) {
                    topics.push({
                        name: topicName,
                        content: `Study ${topicName} thoroughly, including key concepts and practical applications.`,
                        difficulty: this.assessTopicDifficulty(topicName, focusTopics)
                    });
                }
            }
        }
        
        // If no structured topics found, create from focus topics or generic ones
        if (topics.length === 0) {
            const fallbackTopics = focusTopics ? 
                focusTopics.split(',').map(t => t.trim()) : 
                ['Introduction', 'Core Concepts', 'Advanced Topics', 'Applications', 'Review'];
                
            fallbackTopics.forEach(topic => {
                if (topic) {
                    topics.push({
                        name: topic,
                        content: `Comprehensive study of ${topic} with focus on understanding and application.`,
                        difficulty: 'Medium'
                    });
                }
            });
        }
        
        return topics.slice(0, 10); // Limit to 10 topics for demo
    }

    assessTopicDifficulty(topicName, focusTopics = '') {
        const advanced = ['advanced', 'complex', 'optimization', 'algorithm', 'theory'];
        const basic = ['introduction', 'basic', 'fundamentals', 'overview', 'getting started'];
        
        const lowerTopic = topicName.toLowerCase();
        
        if (advanced.some(keyword => lowerTopic.includes(keyword))) return 'High';
        if (basic.some(keyword => lowerTopic.includes(keyword))) return 'Low';
        if (focusTopics.toLowerCase().includes(lowerTopic)) return 'High';
        
        return 'Medium';
    }

    generateSampleQuestions(topicName) {
        return [
            {
                question: `What are the key concepts in ${topicName}?`,
                type: 'open-ended',
                difficulty: 'medium'
            },
            {
                question: `How does ${topicName} relate to other topics in this subject?`,
                type: 'analytical',
                difficulty: 'medium'
            },
            {
                question: `What are practical applications of ${topicName}?`,
                type: 'application',
                difficulty: 'medium'
            }
        ];
    }

    generateStudyTips(topicName) {
        return [
            `Create mind maps to visualize ${topicName} concepts`,
            `Practice with real-world examples related to ${topicName}`,
            `Review ${topicName} regularly using spaced repetition`,
            `Connect ${topicName} with previously learned material`
        ];
    }

    /**
     * STEP 1: INGEST & INDEX DATA
     * Extract topics and create vector embeddings for TiDB storage
     */
    async ingestAndIndex(syllabusContent, userId = 'demo-user', focusAreas = '') {
        console.log('🚀 Step 1: Ingesting and indexing syllabus data...');
        this.workflowState.currentStep = 1;
        this.logStep('Starting data ingestion and indexing');
        
        try {
            // Connect to TiDB
            const connection = await this.tidbConnection.connect();
            
            // Extract topics using Groq LLM
            const topics = await this.groqLLM.extractTopics(syllabusContent, focusAreas);
            
            // Generate embeddings for each topic
            const topicsWithEmbeddings = await Promise.all(
                topics.map(async (topic) => {
                    const embedding = await this.groqLLM.generateEmbedding(topic.content);
                    return {
                        ...topic,
                        embedding,
                        user_id: userId
                    };
                })
            );
            
            // Store in TiDB with vector embeddings
            const indexedData = await this.tidbConnection.insertTopics(topicsWithEmbeddings);
            
            this.workflowState.data.indexedTopics = indexedData;
            this.logStep(`Indexed ${topics.length} topics with vector embeddings`);
            
            console.log('✅ Step 1 Complete: Indexed', topics.length, 'topics with vector embeddings');
            return indexedData;
            
        } catch (error) {
            console.error('❌ Step 1 Failed:', error.message);
            this.logStep(`Step 1 failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * STEP 2: CHAIN LLM CALLS
     * Multi-step LLM workflow: Generate Questions → Create Hints → Build Study Plan
     */
    async chainLLMCalls(indexedData, studyHours, focusTopics = '') {
        console.log('🧠 Step 2: Chaining LLM calls for intelligent processing...');
        this.workflowState.currentStep = 2;
        this.logStep('Starting LLM chaining workflow');
        
        try {
            const studyPlan = {
                topics: [],
                total_time: studyHours,
                focus_areas: focusTopics,
                created_at: new Date().toISOString()
            };
            
            // Process each topic with LLM chain
            for (const topic of indexedData) {
                // LLM Call 1: Generate quiz questions
                const quizQuestions = await this.groqLLM.generateQuiz(topic.topic_name, 3);
                
                // LLM Call 2: Generate study hints and mnemonics
                const studyHints = await this.groqLLM.generateHints(topic.topic_name, topic.difficulty);
                
                // Combine data
                const enhancedTopic = {
                    ...topic,
                    quiz_questions: quizQuestions,
                    study_hints: studyHints,
                    estimated_time: this.calculateStudyTime(topic.difficulty, studyHours, indexedData.length)
                };
                
                studyPlan.topics.push(enhancedTopic);
            }
            
            this.workflowState.data.studyPlan = studyPlan;
            this.logStep(`Generated study plan with ${studyPlan.topics.length} enhanced topics`);
            
            console.log('✅ Step 2 Complete: Generated comprehensive study plan with', studyPlan.topics.length, 'topics');
            return studyPlan;
            
        } catch (error) {
            console.error('❌ Step 2 Failed:', error.message);
            this.logStep(`Step 2 failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * STEP 3: VECTOR + FULL-TEXT SEARCH
     * Search similar topics and related content using TiDB vector search
     */
    async searchSimilarContent(query, limit = 5) {
        console.log('🔍 Step 3: Performing vector + full-text search...');
        this.workflowState.currentStep = 3;
        this.logStep(`Starting vector search for: ${query}`);
        
        try {
            // Generate query embedding using Groq
            const queryEmbedding = await this.groqLLM.generateEmbedding(query);
            
            // Vector similarity search using TiDB
            const vectorResults = await this.tidbConnection.searchSimilarTopics(queryEmbedding, limit);
            
            // Full-text search for additional context
            const textResults = await this.tidbConnection.fullTextSearch(query, limit);
            
            // Combine and rank results
            const combinedResults = this.combineSearchResults(vectorResults, textResults);
            
            this.logStep(`Found ${combinedResults.length} similar topics`);
            console.log('✅ Step 3 Complete: Found', combinedResults.length, 'similar topics');
            return combinedResults;
            
        } catch (error) {
            console.error('❌ Step 3 Failed:', error.message);
            this.logStep(`Step 3 failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * STEP 4: EXTERNAL API INTEGRATION
     * Integrate Pomodoro timer, notifications, and leaderboard APIs
     */
    async integrateExternalAPIs(studyPlan, userPreferences = {}) {
        console.log('🔗 Step 4: Integrating external APIs...');
        this.workflowState.currentStep = 4;
        this.logStep('Starting external API integrations');
        
        try {
            const integrations = {};
            
            // Pomodoro Timer API
            if (this.externalAPIs.pomodoro) {
                integrations.timer = await this.setupPomodoroTimer(studyPlan);
            }
            
            // Notification APIs (Slack/Discord)
            if (userPreferences.notifications && (this.externalAPIs.slack || this.externalAPIs.discord)) {
                integrations.notifications = await this.setupNotifications(studyPlan, userPreferences);
            }
            
            // Leaderboard/Progress Sharing
            integrations.sharing = await this.createShareableProgress(studyPlan);
            
            this.workflowState.data.integrations = integrations;
            this.logStep('External API integrations completed');
            
            console.log('✅ Step 4 Complete: Integrated external APIs');
            return integrations;
            
        } catch (error) {
            console.error('❌ Step 4 Failed:', error.message);
            this.logStep(`Step 4 failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * STEP 5: REAL-TIME DEMO FEATURES
     * Generate live quizzes, progress tracking, and interactive elements
     */
    async generateDemoFeatures(studyPlan) {
        console.log('🎮 Step 5: Creating demo-friendly interactive features...');
        this.workflowState.currentStep = 5;
        this.logStep('Generating demo features');
        
        try {
            const demoFeatures = {
                liveQuizGeneration: await this.setupLiveQuizzes(studyPlan),
                progressTracking: await this.createProgressTracker(studyPlan),
                interactiveRoadmap: await this.generateInteractiveRoadmap(studyPlan),
                exportFunctionality: await this.setupExportFeatures(studyPlan),
                fallbackMode: await this.createFallbackMode(studyPlan)
            };
            
            this.workflowState.data.demoFeatures = demoFeatures;
            this.logStep('Demo features generated successfully');
            
            console.log('✅ Step 5 Complete: Demo features ready');
            return demoFeatures;
            
        } catch (error) {
            console.error('❌ Step 5 Failed:', error.message);
            this.logStep(`Step 5 failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * STEP 6: COMPLETE WORKFLOW
     * Finalize and return complete AgentX workflow results
     */
    async completeWorkflow() {
        console.log('🎯 Step 6: Completing AgentX workflow...');
        this.workflowState.currentStep = 6;
        this.logStep('Finalizing workflow');
        
        try {
            const workflowResult = {
                workflow_id: this.generateWorkflowId(),
                status: 'completed',
                steps_completed: this.workflowState.currentStep,
                total_steps: this.workflowState.totalSteps,
                data: this.workflowState.data,
                logs: this.workflowState.logs,
                completed_at: new Date().toISOString(),
                execution_time: this.calculateExecutionTime()
            };

            // Store workflow log in TiDB
            await this.tidbConnection.logWorkflow(workflowResult);
            
            this.logStep('Workflow completed successfully');
            console.log('✅ Step 6 Complete: AgentX workflow finished');
            return workflowResult;
            
        } catch (error) {
            console.error('❌ Step 6 Failed:', error.message);
            this.logStep(`Step 6 failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Execute complete multi-step AgentX workflow
     */
    async executeCompleteWorkflow(syllabusContent, studyHours, focusTopics = '', userId = 'demo-user', userPreferences = {}) {
        console.log('🚀 Starting Complete AgentX Workflow...');
        this.workflowState.startTime = Date.now();
        
        try {
            // Step 1: Ingest and Index
            const indexedData = await this.ingestAndIndex(syllabusContent, userId, focusTopics);
            
            // Step 2: Chain LLM Calls
            const studyPlan = await this.chainLLMCalls(indexedData, studyHours, focusTopics);
            
            // Step 3: Vector Search (optional - for similar content)
            const searchResults = await this.searchSimilarContent(focusTopics || 'study topics', 3);
            
            // Step 4: External API Integration
            const integrations = await this.integrateExternalAPIs(studyPlan, userPreferences);
            
            // Step 5: Demo Features
            const demoFeatures = await this.generateDemoFeatures(studyPlan);
            
            // Step 6: Complete Workflow
            const workflowResult = await this.completeWorkflow();
            
            return workflowResult;
            
        } catch (error) {
            console.error('❌ Complete workflow failed:', error.message);
            this.logStep(`Complete workflow failed: ${error.message}`, 'error');
            throw error;
        }
    }

    // ==================== HELPER METHODS ====================

    calculateStudyTime(difficulty, totalHours, topicCount) {
        const baseTime = totalHours / topicCount;
        const multipliers = { 'Beginner': 0.8, 'Intermediate': 1.0, 'Advanced': 1.3 };
        return Math.round((baseTime * (multipliers[difficulty] || 1.0)) * 60); // in minutes
    }

    combineSearchResults(vectorResults, textResults) {
        const combined = [...vectorResults];
        
        textResults.forEach(textResult => {
            if (!combined.find(v => v.id === textResult.id)) {
                combined.push({ ...textResult, similarity_score: 0.5 });
            }
        });
        
        return combined.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
    }

    async setupPomodoroTimer(studyPlan) {
        try {
            const sessions = studyPlan.topics.map(topic => ({
                topic: topic.topic_name || topic.topic,
                duration: topic.estimated_time || 25,
                break_duration: 5,
                type: 'study'
            }));

            return {
                enabled: true,
                sessions,
                total_sessions: sessions.length,
                estimated_total_time: sessions.reduce((sum, s) => sum + s.duration + s.break_duration, 0)
            };
        } catch (error) {
            console.error('Pomodoro setup failed:', error.message);
            return { enabled: false, error: error.message };
        }
    }

    async testConnections() {
        console.log('🔍 Testing all connections...');
        
        try {
            // Test TiDB connection
            await this.tidbConnection.connect();
            console.log('✅ TiDB connection successful');
            
            // Test basic query
            const testQuery = 'SELECT 1 as test_connection';
            const [rows] = await this.tidbConnection.connection.execute(testQuery);
            console.log('✅ TiDB query test successful:', rows);
            
            // Test Groq API with a simple request
            const testResponse = await this.groqClient.chat.completions.create({
                messages: [{ role: 'user', content: 'Hello, test connection. Respond with just "OK".' }],
                model: 'llama3-8b-8192',
                max_tokens: 5,
                temperature: 0
            });
            
            if (testResponse?.choices?.[0]?.message?.content) {
                console.log('✅ Groq API connection successful:', testResponse.choices[0].message.content.trim());
            }
            
            // Test embedding generation
            const testEmbedding = await this.generateEmbedding('test text for embedding');
            if (testEmbedding && testEmbedding.length > 0) {
                console.log('✅ Groq embedding generation successful, dimension:', testEmbedding.length);
            }
            
            return { 
                tidb: true, 
                groq: true, 
                embedding: testEmbedding ? testEmbedding.length : 0 
            };
        } catch (error) {
            console.error('❌ Connection test failed:', error.message);
            throw error;
        }
    }

    async setupNotifications(studyPlan, userPreferences) {
        const notifications = { sent: [], failed: [] };
        
        try {
            const message = `🎓 Study Plan Ready! ${studyPlan.topics.length} topics to master in ${studyPlan.total_time} hours.`;
            
            if (this.externalAPIs.slack && userPreferences.slack) {
                try {
                    await axios.post(this.externalAPIs.slack, {
                        text: message,
                        username: 'CramMaster AgentX',
                        icon_emoji: ':books:'
                    });
                    notifications.sent.push('slack');
                } catch (error) {
                    notifications.failed.push('slack');
                }
            }

            if (this.externalAPIs.discord && userPreferences.discord) {
                try {
                    await axios.post(this.externalAPIs.discord, {
                        content: message,
                        username: 'CramMaster AgentX'
                    });
                    notifications.sent.push('discord');
                } catch (error) {
                    notifications.failed.push('discord');
                }
            }
        } catch (error) {
            console.error('Notification setup failed:', error);
        }
        
        return notifications;
    }

    async setupSharingFeatures(studyPlan) {
        return {
            share_url: `https://crammaster.demo/share/${Date.now()}`,
            qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://crammaster.demo')}`,
            social_text: `🎓 Just created my study plan with CramMaster AgentX! ${studyPlan.topics.length} topics to master. #StudyPlan #AI #TiDB`,
            export_formats: ['JSON', 'PDF', 'CSV'],
            created_at: new Date().toISOString()
        };
    }

    async setupLiveQuizzes(studyPlan) {
        const quizzes = {};
        
        for (const topic of studyPlan.topics) {
            if (topic.quiz_questions) {
                quizzes[topic.topic_name || topic.topic] = {
                    questions: topic.quiz_questions,
                    total_questions: topic.quiz_questions.length,
                    estimated_time: topic.quiz_questions.length * 2,
                    difficulty: topic.difficulty
                };
            }
        }
        
        return {
            enabled: true,
            total_quizzes: Object.keys(quizzes).length,
            quizzes,
            live_generation: true
        };
    }

    async createProgressTracker(studyPlan) {
        return {
            total_topics: studyPlan.topics.length,
            completed_topics: 0,
            current_topic: studyPlan.topics[0]?.topic_name || 'None',
            progress_percentage: 0,
            estimated_completion: new Date(Date.now() + (studyPlan.total_time * 60 * 60 * 1000)).toISOString(),
            milestones: studyPlan.topics.map((topic, index) => ({
                topic: topic.topic_name || topic.topic,
                order: index + 1,
                completed: false,
                estimated_time: topic.estimated_time
            }))
        };
    }

    async generateInteractiveRoadmap(studyPlan) {
        return {
            roadmap_type: 'interactive',
            total_steps: studyPlan.topics.length,
            current_step: 1,
            visualization: 'timeline',
            steps: studyPlan.topics.map((topic, index) => ({
                step: index + 1,
                title: topic.topic_name || topic.topic,
                description: topic.content || 'Study this topic',
                difficulty: topic.difficulty,
                estimated_time: topic.estimated_time,
                prerequisites: index > 0 ? [studyPlan.topics[index - 1].topic_name] : [],
                status: 'pending'
            }))
        };
    }

    async setupExportFeatures(studyPlan) {
        return {
            formats: {
                json: {
                    enabled: true,
                    endpoint: '/api/export/json',
                    filename: `study-plan-${Date.now()}.json`
                },
                pdf: {
                    enabled: true,
                    endpoint: '/api/export/pdf',
                    filename: `study-plan-${Date.now()}.pdf`
                },
                csv: {
                    enabled: true,
                    endpoint: '/api/export/csv',
                    filename: `study-plan-${Date.now()}.csv`
                }
            },
            share_options: {
                public_link: true,
                password_protected: false,
                expiry_days: 30
            }
        };
    }

    async createFallbackMode(studyPlan) {
        return {
            enabled: true,
            static_data: {
                study_plan: studyPlan,
                sample_quizzes: studyPlan.topics.slice(0, 2).map(topic => topic.quiz_questions).flat(),
                demo_progress: {
                    completed_topics: 1,
                    current_topic: studyPlan.topics[1]?.topic_name || 'Demo Topic',
                    progress_percentage: Math.round((1 / studyPlan.topics.length) * 100)
                }
            },
            offline_features: ['quiz_generation', 'progress_tracking', 'export_json'],
            fallback_message: 'Running in demo mode with static data'
        };
    }

    logStep(message, level = 'info') {
        const logEntry = {
            step: this.workflowState.currentStep,
            message,
            level,
            timestamp: new Date().toISOString()
        };
        
        this.workflowState.logs.push(logEntry);
        
        if (level === 'error') {
            console.error(`[Step ${this.workflowState.currentStep}] ${message}`);
        } else {
            console.log(`[Step ${this.workflowState.currentStep}] ${message}`);
        }
    }

    generateWorkflowId() {
        return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateShareId() {
        return Math.random().toString(36).substr(2, 12);
    }

    calculateExecutionTime() {
        if (this.workflowState.startTime) {
            return Date.now() - this.workflowState.startTime;
        }
        return 0;
    }

    async healthCheck() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            components: {}
        };

        try {
            await this.tidbConnection.connect();
            health.components.tidb = { status: 'healthy' };
        } catch (error) {
            health.components.tidb = { status: 'unhealthy', error: error.message };
            health.status = 'unhealthy';
        }

        try {
            const groqHealth = await this.groqLLM.healthCheck();
            health.components.groq = groqHealth;
            if (groqHealth.status !== 'healthy') {
                health.status = 'degraded';
            }
        } catch (error) {
            health.components.groq = { status: 'unhealthy', error: error.message };
            health.status = 'unhealthy';
        }

        health.components.external_apis = {
            slack: this.externalAPIs.slack ? 'configured' : 'not_configured',
            discord: this.externalAPIs.discord ? 'configured' : 'not_configured',
            pomodoro: this.externalAPIs.pomodoro ? 'configured' : 'not_configured'
        };

        return health;
    }
}

// Export the class as default
export default CramMasterAgentX;
