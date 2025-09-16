/**
 * TiDB Cloud Connection Helper
 * CramMaster AgentX - TiDB AgentX Hackathon
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

class TiDBConnection {
    constructor() {
        this.connection = null;
        this.config = {
            host: process.env.TIDB_HOST || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
            port: parseInt(process.env.TIDB_PORT) || 4000,
            user: process.env.TIDB_USER || '2hn9efKfuiHWSWD.root',
            password: process.env.TIDB_PASSWORD,
            database: process.env.TIDB_DATABASE || 'test',
            ssl: {
                rejectUnauthorized: true,
                minVersion: 'TLSv1.2'
            },
            connectTimeout: 60000,
            acquireTimeout: 60000,
            timeout: 60000,
            charset: 'utf8mb4'
        };
    }

    async connect() {
        try {
            if (this.connection) {
                // Test existing connection
                await this.connection.ping();
                return this.connection;
            }

            console.log('🔌 Connecting to TiDB Cloud...');
            this.connection = await mysql.createConnection(this.config);
            
            // Test connection
            await this.connection.ping();
            console.log('✅ TiDB Cloud connected successfully');
            
            // Initialize database schema
            await this.initializeSchema();
            
            return this.connection;
        } catch (error) {
            console.error('❌ TiDB Connection failed:', error.message);
            throw new Error(`TiDB connection failed: ${error.message}`);
        }
    }

    async initializeSchema() {
        try {
            console.log('🏗️ Initializing database schema...');
            
            // Create topics table with vector support
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS study_topics (
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
                    INDEX idx_priority (priority),
                    INDEX idx_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // Create study sessions table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS study_sessions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    topic_id INT,
                    session_data JSON,
                    progress DECIMAL(5,2) DEFAULT 0.00,
                    time_spent INT DEFAULT 0 COMMENT 'Time in minutes',
                    completed BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (topic_id) REFERENCES study_topics(id) ON DELETE CASCADE,
                    INDEX idx_user_id (user_id),
                    INDEX idx_progress (progress),
                    INDEX idx_completed (completed)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // Create quiz results table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS quiz_results (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    topic_id INT,
                    quiz_data JSON NOT NULL,
                    answers JSON NOT NULL,
                    score DECIMAL(5,2) DEFAULT 0.00,
                    total_questions INT DEFAULT 0,
                    correct_answers INT DEFAULT 0,
                    time_taken INT DEFAULT 0 COMMENT 'Time in seconds',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (topic_id) REFERENCES study_topics(id) ON DELETE CASCADE,
                    INDEX idx_user_id (user_id),
                    INDEX idx_score (score),
                    INDEX idx_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // Create workflow logs table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS workflow_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    workflow_id VARCHAR(255) NOT NULL,
                    step_name VARCHAR(100) NOT NULL,
                    step_status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
                    step_data JSON,
                    processing_time INT DEFAULT 0 COMMENT 'Time in milliseconds',
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_user_id (user_id),
                    INDEX idx_workflow_id (workflow_id),
                    INDEX idx_step_status (step_status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            console.log('✅ Database schema initialized successfully');
        } catch (error) {
            console.error('❌ Schema initialization failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
            console.log('🔌 TiDB connection closed');
        }
    }

    async query(sql, params = []) {
        try {
            const connection = await this.connect();
            const [rows] = await connection.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('❌ Query failed:', error.message);
            throw error;
        }
    }

    async transaction(callback) {
        const connection = await this.connect();
        await connection.beginTransaction();
        
        try {
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        }
    }

    // Vector similarity search helper
    async vectorSearch(queryEmbedding, limit = 5, userId = null) {
        try {
            let sql = `
                SELECT 
                    id,
                    topic_name,
                    content,
                    priority,
                    embedding,
                    metadata,
                    created_at
                FROM study_topics 
            `;
            
            let params = [];
            
            if (userId) {
                sql += ' WHERE user_id = ?';
                params.push(userId);
            }
            
            sql += ' ORDER BY created_at DESC LIMIT ?';
            params.push(limit);
            
            const results = await this.query(sql, params);
            
            // Calculate cosine similarity in JavaScript (since TiDB vector functions may vary)
            if (queryEmbedding && results.length > 0) {
                results.forEach(row => {
                    if (row.embedding) {
                        try {
                            const embedding = JSON.parse(row.embedding);
                            row.similarity = this.cosineSimilarity(queryEmbedding, embedding);
                        } catch (e) {
                            row.similarity = 0;
                        }
                    } else {
                        row.similarity = 0;
                    }
                });
                
                // Sort by similarity
                results.sort((a, b) => b.similarity - a.similarity);
            }
            
            return results;
        } catch (error) {
            console.error('❌ Vector search failed:', error.message);
            throw error;
        }
    }

    // Cosine similarity calculation
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        
        if (normA === 0 || normB === 0) return 0;
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // Health check
    async healthCheck() {
        try {
            const connection = await this.connect();
            const [result] = await connection.execute('SELECT 1 as health');
            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            return { 
                status: 'unhealthy', 
                error: error.message, 
                timestamp: new Date().toISOString() 
            };
        }
    }

    // Get connection stats
    async getStats() {
        try {
            const connection = await this.connect();
            
            const [topicsCount] = await connection.execute(
                'SELECT COUNT(*) as count FROM study_topics'
            );
            
            const [sessionsCount] = await connection.execute(
                'SELECT COUNT(*) as count FROM study_sessions'
            );
            
            const [quizzesCount] = await connection.execute(
                'SELECT COUNT(*) as count FROM quiz_results'
            );
            
            return {
                topics: topicsCount[0].count,
                sessions: sessionsCount[0].count,
                quizzes: quizzesCount[0].count,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Stats query failed:', error.message);
            return { error: error.message };
        }
    }
}

// Singleton instance
const tidbConnection = new TiDBConnection();

export default tidbConnection;
export { TiDBConnection };
