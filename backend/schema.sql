-- CramMaster AgentX - Additional Tables Schema
-- Quiz Results and Study Sessions

-- Quiz Results Table
CREATE TABLE IF NOT EXISTS quiz_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    topic VARCHAR(500) NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    total_questions INT NOT NULL,
    answers JSON COMMENT 'Quiz answers and correctness',
    time_taken INT COMMENT 'Time taken in seconds',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_topic (topic),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Study Sessions Table
CREATE TABLE IF NOT EXISTS study_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    topic VARCHAR(500),
    duration INT NOT NULL COMMENT 'Duration in seconds',
    status ENUM('active', 'completed', 'paused', 'cancelled') DEFAULT 'active',
    session_type ENUM('pomodoro', 'custom', 'break') DEFAULT 'pomodoro',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_session_type (session_type),
    INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
