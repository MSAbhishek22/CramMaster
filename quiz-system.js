// ===== GLOBAL QUIZ & HINTS SYSTEM =====
// Independent of UI class - always works

// Global quiz state
let currentQuiz = null;
let currentQuestionIndex = 0;
let quizScore = 0;
let userAnswers = [];

// API Configuration
const API_CONFIG = {
    baseUrl: 'http://localhost:3001/api',
    fallbackMode: true // Set to false when TiDB is ready
};

// Dynamic quiz generation system
let dynamicTopicsData = {};
let currentSyllabusContent = '';

// Question templates for different subjects
const QUESTION_TEMPLATES = {
    default: [
        {
            template: "What is {topic}?",
            type: "definition",
            options: [
                "{correct_definition}",
                "{wrong_option_1}",
                "{wrong_option_2}",
                "{wrong_option_3}"
            ]
        },
        {
            template: "Which of the following is a key characteristic of {topic}?",
            type: "characteristic",
            options: [
                "{key_characteristic}",
                "{unrelated_option_1}",
                "{unrelated_option_2}",
                "{unrelated_option_3}"
            ]
        },
        {
            template: "What is the main purpose of {topic}?",
            type: "purpose",
            options: [
                "{main_purpose}",
                "{wrong_purpose_1}",
                "{wrong_purpose_2}",
                "{wrong_purpose_3}"
            ]
        }
    ],
    database: [
        {
            template: "What does {acronym} stand for?",
            type: "acronym",
            options: [
                "{correct_expansion}",
                "{wrong_expansion_1}",
                "{wrong_expansion_2}",
                "{wrong_expansion_3}"
            ]
        },
        {
            template: "In {topic}, which statement is correct?",
            type: "concept",
            options: [
                "{correct_statement}",
                "{incorrect_statement_1}",
                "{incorrect_statement_2}",
                "{incorrect_statement_3}"
            ]
        }
    ],
    programming: [
        {
            template: "Which syntax is correct for {topic}?",
            type: "syntax",
            options: [
                "{correct_syntax}",
                "{wrong_syntax_1}",
                "{wrong_syntax_2}",
                "{wrong_syntax_3}"
            ]
        }
    ],
    science: [
        {
            template: "What is the formula for {topic}?",
            type: "formula",
            options: [
                "{correct_formula}",
                "{wrong_formula_1}",
                "{wrong_formula_2}",
                "{wrong_formula_3}"
            ]
        }
    ]
};

// Subject-specific question banks
const QUESTION_BANKS = {
    database: {
        "Database Management Systems": [
            {
                question: "What is a Database Management System (DBMS)?",
                options: [
                    "A collection of programs that manages database structure and access",
                    "A single program that stores data files",
                    "A hardware component for data storage",
                    "A network protocol for data transfer"
                ],
                correct: 0,
                explanation: "A DBMS is a collection of programs that enables users to create, maintain, and access databases efficiently."
            },
            {
                question: "Which of the following is NOT a function of DBMS?",
                options: [
                    "Data definition and manipulation",
                    "Data security and integrity",
                    "Hardware maintenance",
                    "Concurrent access control"
                ],
                correct: 2,
                explanation: "DBMS handles software-level database operations, not hardware maintenance."
            }
        ],
        "SQL": [
            {
                question: "Which SQL command is used to retrieve data?",
                options: ["SELECT", "INSERT", "UPDATE", "DELETE"],
                correct: 0,
                explanation: "SELECT is used to query and retrieve data from database tables."
            },
            {
                question: "What does the WHERE clause do in SQL?",
                options: [
                    "Filters rows based on specified conditions",
                    "Sorts the result set",
                    "Groups rows together",
                    "Joins multiple tables"
                ],
                correct: 0,
                explanation: "WHERE clause filters rows that meet specific conditions."
            }
        ],
        "Normalization": [
            {
                question: "What is the main goal of database normalization?",
                options: [
                    "Eliminate data redundancy and improve data integrity",
                    "Increase database size",
                    "Make queries more complex",
                    "Reduce database performance"
                ],
                correct: 0,
                explanation: "Normalization reduces redundancy and maintains data consistency."
            }
        ]
    },
    programming: {
        "Variables": [
            {
                question: "What is a variable in programming?",
                options: [
                    "A named storage location that holds data",
                    "A fixed value that cannot change",
                    "A type of loop structure",
                    "A function parameter"
                ],
                correct: 0,
                explanation: "Variables are containers that store data values that can be referenced and manipulated."
            }
        ],
        "Functions": [
            {
                question: "What is the purpose of functions in programming?",
                options: [
                    "To organize code into reusable blocks",
                    "To slow down program execution",
                    "To increase memory usage",
                    "To make code harder to read"
                ],
                correct: 0,
                explanation: "Functions help organize code, promote reusability, and improve maintainability."
            }
        ]
    },
    mathematics: {
        "Algebra": [
            {
                question: "What is the solution to 2x + 5 = 15?",
                options: ["x = 5", "x = 10", "x = 7.5", "x = 20"],
                correct: 0,
                explanation: "Solving: 2x + 5 = 15, so 2x = 10, therefore x = 5."
            }
        ],
        "Calculus": [
            {
                question: "What is the derivative of x²?",
                options: ["2x", "x", "x³", "2x²"],
                correct: 0,
                explanation: "Using the power rule: d/dx(x²) = 2x¹ = 2x."
            }
        ]
    },
    science: {
        "Physics": [
            {
                question: "What is Newton's First Law of Motion?",
                options: [
                    "An object at rest stays at rest unless acted upon by force",
                    "Force equals mass times acceleration",
                    "For every action there is an equal and opposite reaction",
                    "Energy cannot be created or destroyed"
                ],
                correct: 0,
                explanation: "Newton's First Law states that objects maintain their state of motion unless acted upon by an external force."
            }
        ],
        "Chemistry": [
            {
                question: "What is the chemical symbol for water?",
                options: ["H₂O", "CO₂", "NaCl", "O₂"],
                correct: 0,
                explanation: "Water consists of two hydrogen atoms and one oxygen atom: H₂O."
            }
        ]
    }
};

// Sample fallback data
const SAMPLE_DATA = {
    topics: {
        0: {
            name: "Introduction to Database Systems",
            questions: QUESTION_BANKS.database["Database Management Systems"] || [],
            hints: [
                "💡 Focus on understanding the core purpose of database systems",
                "🔍 Study the difference between data and information",
                "📚 Learn about database models: hierarchical, network, relational",
                "⚡ Practice identifying DBMS components and their functions",
                "🎯 Understand the advantages of using DBMS over file systems"
            ]
        }
    }
};

/**
 * Parse syllabus content to extract topics
 */
function parseSyllabusContent(syllabusText) {
    console.log('📝 Parsing syllabus content...');
    
    if (!syllabusText || syllabusText.trim().length === 0) {
        return [];
    }
    
    const topics = [];
    const lines = syllabusText.split('\n').filter(line => line.trim().length > 0);
    
    let currentTopic = null;
    let topicIndex = 0;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check if line is a main topic (numbered or starts with capital)
        if (/^\d+\./.test(trimmedLine) || /^[A-Z][^a-z]*$/.test(trimmedLine) || 
            /^[A-Z][a-zA-Z\s]+:?$/.test(trimmedLine)) {
            
            if (currentTopic) {
                topics.push(currentTopic);
            }
            
            currentTopic = {
                index: topicIndex++,
                name: trimmedLine.replace(/^\d+\.\s*/, '').replace(/:$/, ''),
                subtopics: [],
                keywords: []
            };
        }
        // Check if line is a subtopic (starts with -, •, or indented)
        else if (/^\s*[-•]/.test(trimmedLine) || /^\s{2,}/.test(line)) {
            if (currentTopic) {
                const subtopic = trimmedLine.replace(/^\s*[-•]\s*/, '');
                currentTopic.subtopics.push(subtopic);
                
                // Extract keywords from subtopic
                const keywords = subtopic.split(/[,;]/).map(k => k.trim()).filter(k => k.length > 0);
                currentTopic.keywords.push(...keywords);
            }
        }
        // If no current topic, treat as a topic
        else if (!currentTopic && trimmedLine.length > 0) {
            currentTopic = {
                index: topicIndex++,
                name: trimmedLine,
                subtopics: [],
                keywords: []
            };
        }
    }
    
    if (currentTopic) {
        topics.push(currentTopic);
    }
    
    console.log('✅ Parsed topics:', topics);
    return topics;
}

/**
 * Detect subject type from syllabus content
 */
function detectSubjectType(syllabusText) {
    const text = syllabusText.toLowerCase();
    
    if (text.includes('database') || text.includes('sql') || text.includes('dbms') || 
        text.includes('normalization') || text.includes('relational')) {
        return 'database';
    }
    
    if (text.includes('programming') || text.includes('code') || text.includes('function') || 
        text.includes('variable') || text.includes('algorithm')) {
        return 'programming';
    }
    
    if (text.includes('physics') || text.includes('chemistry') || text.includes('biology') || 
        text.includes('formula') || text.includes('equation')) {
        return 'science';
    }
    
    if (text.includes('algebra') || text.includes('calculus') || text.includes('geometry') || 
        text.includes('mathematics') || text.includes('equation')) {
        return 'mathematics';
    }
    
    return 'default';
}

/**
 * Generate questions for a topic using question banks and templates
 */
function generateQuestionsForTopic(topic, subjectType) {
    console.log(`🎯 Generating questions for: ${topic.name}`);
    
    const questions = [];
    const topicName = topic.name;
    const keywords = topic.keywords.length > 0 ? topic.keywords : [topicName];
    
    // Try to find questions in question banks first
    const questionBank = QUESTION_BANKS[subjectType] || {};
    
    // Look for exact matches in question bank
    for (const [bankTopic, bankQuestions] of Object.entries(questionBank)) {
        if (topicName.toLowerCase().includes(bankTopic.toLowerCase()) || 
            bankTopic.toLowerCase().includes(topicName.toLowerCase())) {
            questions.push(...bankQuestions);
            break;
        }
    }
    
    // If no questions found, generate using templates
    if (questions.length === 0) {
        const templates = QUESTION_TEMPLATES[subjectType] || QUESTION_TEMPLATES.default;
        
        // Generate 2-3 questions per topic
        for (let i = 0; i < Math.min(3, templates.length); i++) {
            const template = templates[i];
            const question = generateQuestionFromTemplate(template, topic, subjectType);
            if (question) {
                questions.push(question);
            }
        }
    }
    
    // Ensure we have at least some questions
    if (questions.length === 0) {
        questions.push({
            question: `What is the main concept of ${topicName}?`,
            options: [
                `${topicName} is a fundamental concept in this subject`,
                `${topicName} is not relevant to this topic`,
                `${topicName} is only used in advanced applications`,
                `${topicName} is outdated and no longer used`
            ],
            correct: 0,
            explanation: `${topicName} is an important topic that requires understanding of its core concepts and applications.`
        });
    }
    
    return questions.slice(0, 5); // Limit to 5 questions per topic
}

/**
 * Generate a question from a template
 */
function generateQuestionFromTemplate(template, topic, subjectType) {
    try {
        let question = template.template.replace('{topic}', topic.name);
        
        const options = [];
        const correctAnswer = `Understanding ${topic.name} involves studying its key concepts and applications`;
        
        // Generate options based on template type
        switch (template.type) {
            case 'definition':
                options.push(
                    `${topic.name} is a key concept in ${subjectType}`,
                    `${topic.name} is not related to this subject`,
                    `${topic.name} is only theoretical`,
                    `${topic.name} is outdated`
                );
                break;
                
            case 'characteristic':
                options.push(
                    `It is fundamental to understanding the subject`,
                    `It has no practical applications`,
                    `It is only used in research`,
                    `It is being phased out`
                );
                break;
                
            case 'purpose':
                options.push(
                    `To provide essential knowledge for the subject`,
                    `To make the subject more difficult`,
                    `To confuse students`,
                    `To fill curriculum requirements`
                );
                break;
                
            default:
                options.push(
                    correctAnswer,
                    `${topic.name} is not important`,
                    `${topic.name} is optional`,
                    `${topic.name} is deprecated`
                );
        }
        
        return {
            question: question,
            options: options,
            correct: 0,
            explanation: `${topic.name} is an important topic that requires thorough understanding.`
        };
    } catch (error) {
        console.warn('Failed to generate question from template:', error);
        return null;
    }
}

/**
 * Generate hints for a topic
 */
function generateHintsForTopic(topic, subjectType) {
    const hints = [
        `💡 Focus on understanding the core concepts of ${topic.name}`,
        `📚 Study the practical applications of ${topic.name}`,
        `🔍 Look for real-world examples related to ${topic.name}`,
        `⚡ Practice problems and exercises on ${topic.name}`,
        `🎯 Connect ${topic.name} with other related topics`
    ];
    
    // Add subject-specific hints
    if (topic.subtopics.length > 0) {
        hints.push(`📝 Pay attention to: ${topic.subtopics.slice(0, 3).join(', ')}`);
    }
    
    return hints;
}

/**
 * Update dynamic topics from current study plan
 */
function updateDynamicTopics() {
    console.log('🔄 Updating dynamic topics from study plan...');
    
    // Get syllabus content from textarea
    const syllabusTextarea = document.getElementById('syllabusText');
    if (syllabusTextarea && syllabusTextarea.value.trim()) {
        currentSyllabusContent = syllabusTextarea.value.trim();
        
        const parsedTopics = parseSyllabusContent(currentSyllabusContent);
        const subjectType = detectSubjectType(currentSyllabusContent);
        
        console.log(`📊 Detected subject type: ${subjectType}`);
        
        // Generate dynamic topics data
        dynamicTopicsData = {};
        
        parsedTopics.forEach((topic, index) => {
            const questions = generateQuestionsForTopic(topic, subjectType);
            const hints = generateHintsForTopic(topic, subjectType);
            
            dynamicTopicsData[index] = {
                name: topic.name,
                questions: questions,
                hints: hints,
                subtopics: topic.subtopics,
                keywords: topic.keywords
            };
        });
        
        console.log('✅ Dynamic topics generated:', Object.keys(dynamicTopicsData).length, 'topics');
    }
    
    // Also check if UI has current plan
    if (window.ui && window.ui.currentPlan && window.ui.currentPlan.studyPlan && window.ui.currentPlan.studyPlan.topics) {
        const studyPlanTopics = window.ui.currentPlan.studyPlan.topics;
        
        studyPlanTopics.forEach((topic, index) => {
            if (!dynamicTopicsData[index]) {
                const topicName = topic.topic_name || topic.topic || `Topic ${index + 1}`;
                const subjectType = detectSubjectType(topicName + ' ' + (topic.content || ''));
                
                const mockTopic = {
                    name: topicName,
                    subtopics: topic.subtopics || [],
                    keywords: topic.keywords || []
                };
                
                dynamicTopicsData[index] = {
                    name: topicName,
                    questions: generateQuestionsForTopic(mockTopic, subjectType),
                    hints: generateHintsForTopic(mockTopic, subjectType),
                    subtopics: topic.subtopics || [],
                    keywords: topic.keywords || []
                };
            }
        });
    }
}

/**
 * Fetch quiz data from API or fallback
 */
async function fetchQuizData(topicIndex) {
    console.log(`🔍 Fetching quiz data for topic ${topicIndex}`);
    
    // Update dynamic topics first
    updateDynamicTopics();
    
    if (API_CONFIG.fallbackMode) {
        // Try dynamic topics first
        let topicData = dynamicTopicsData[topicIndex];
        
        // Fall back to sample data if no dynamic data
        if (!topicData) {
            topicData = SAMPLE_DATA.topics[topicIndex];
        }
        
        if (!topicData) {
            throw new Error(`No quiz data found for topic ${topicIndex}`);
        }
        
        return {
            success: true,
            data: { 
                topicName: topicData.name, 
                questions: topicData.questions || [] 
            }
        };
    }
    
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/quiz/${topicIndex}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('⚠️ API failed, using fallback:', error.message);
        
        // Try dynamic topics first
        let topicData = dynamicTopicsData[topicIndex];
        
        // Fall back to sample data if no dynamic data
        if (!topicData) {
            topicData = SAMPLE_DATA.topics[topicIndex];
        }
        
        if (!topicData) {
            throw new Error(`No fallback data for topic ${topicIndex}`);
        }
        
        return {
            success: true,
            data: { 
                topicName: topicData.name, 
                questions: topicData.questions || [] 
            }
        };
    }
}

/**
 * Fetch hints data from API or fallback
 */
async function fetchHintsData(topicIndex) {
    console.log(`💡 Fetching hints for topic ${topicIndex}`);
    
    // Update dynamic topics first
    updateDynamicTopics();
    
    if (API_CONFIG.fallbackMode) {
        // Try dynamic topics first
        let topicData = dynamicTopicsData[topicIndex];
        
        // Fall back to sample data if no dynamic data
        if (!topicData) {
            topicData = SAMPLE_DATA.topics[topicIndex];
        }
        
        if (!topicData) {
            throw new Error(`No hints found for topic ${topicIndex}`);
        }
        
        return {
            success: true,
            data: { 
                topicName: topicData.name, 
                hints: topicData.hints || [] 
            }
        };
    }
    
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/hints/${topicIndex}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('⚠️ Hints API failed, using fallback:', error.message);
        
        // Try dynamic topics first
        let topicData = dynamicTopicsData[topicIndex];
        
        // Fall back to sample data if no dynamic data
        if (!topicData) {
            topicData = SAMPLE_DATA.topics[topicIndex];
        }
        
        if (!topicData) {
            throw new Error(`No fallback hints for topic ${topicIndex}`);
        }
        
        return {
            success: true,
            data: { 
                topicName: topicData.name, 
                hints: topicData.hints || [] 
            }
        };
    }
}

/**
 * Global startQuiz function - always available
 */
window.startQuiz = async function(topicIndex) {
    console.log(`🎯 Starting quiz for topic ${topicIndex}`);
    
    try {
        showLoadingState('Loading quiz questions...');
        const result = await fetchQuizData(topicIndex);
        
        if (!result.success || !result.data.questions.length) {
            throw new Error('No quiz questions available');
        }
        
        currentQuiz = {
            topicIndex,
            topicName: result.data.topicName,
            questions: result.data.questions,
            startTime: Date.now()
        };
        
        currentQuestionIndex = 0;
        quizScore = 0;
        userAnswers = [];
        
        hideLoadingState();
        renderQuiz();
        
    } catch (error) {
        console.error('❌ Quiz failed to start:', error);
        hideLoadingState();
        showErrorMessage('Failed to load quiz: ' + error.message);
    }
};

/**
 * Global showHints function - always available
 */
window.showHints = async function(topicIndex) {
    console.log(`💡 Showing hints for topic ${topicIndex}`);
    
    try {
        showLoadingState('Loading study hints...');
        const result = await fetchHintsData(topicIndex);
        
        if (!result.success || !result.data.hints.length) {
            throw new Error('No hints available');
        }
        
        hideLoadingState();
        renderHints(result.data);
        
    } catch (error) {
        console.error('❌ Hints failed to load:', error);
        hideLoadingState();
        showErrorMessage('Failed to load hints: ' + error.message);
    }
};

/**
 * Render the quiz modal
 */
function renderQuiz() {
    const existingModal = document.getElementById('quizModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'quizModal';
    modal.className = 'quiz-modal-overlay';
    modal.innerHTML = `
        <div class="quiz-modal-content">
            <div class="quiz-header">
                <h3>📝 ${currentQuiz.topicName}</h3>
                <button class="quiz-close-btn" onclick="closeQuiz()">&times;</button>
            </div>
            
            <div class="quiz-progress">
                <div class="progress-text">
                    Question <span id="currentQuestionNum">1</span> of ${currentQuiz.questions.length}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="quizProgressBar"></div>
                </div>
            </div>
            
            <div class="quiz-content" id="quizContent"></div>
            
            <div class="quiz-navigation">
                <button class="quiz-btn secondary" id="prevBtn" onclick="previousQuestion()" style="display: none;">← Previous</button>
                <button class="quiz-btn primary" id="nextBtn" onclick="nextQuestion()">Next →</button>
                <button class="quiz-btn success" id="submitBtn" onclick="submitQuiz()" style="display: none;">Submit Quiz</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    renderQuestion(0);
    setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * Render a specific question
 */
function renderQuestion(questionIndex) {
    const question = currentQuiz.questions[questionIndex];
    const content = document.getElementById('quizContent');
    
    content.innerHTML = `
        <div class="question-container">
            <div class="question-text">
                <span class="question-number">Q${questionIndex + 1}.</span>
                ${question.question}
            </div>
            
            <div class="options-container">
                ${question.options.map((option, index) => `
                    <label class="option-label">
                        <input type="radio" name="question_${questionIndex}" value="${index}" 
                               onchange="selectAnswer(${questionIndex}, ${index})">
                        <span class="option-text">${option}</span>
                        <span class="option-indicator"></span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;
    
    updateQuizProgress();
    updateNavigationButtons();
    
    if (userAnswers[questionIndex] !== undefined) {
        const radio = content.querySelector(`input[value="${userAnswers[questionIndex]}"]`);
        if (radio) radio.checked = true;
    }
}

/**
 * Handle answer selection
 */
function selectAnswer(questionIndex, answerIndex) {
    userAnswers[questionIndex] = answerIndex;
    updateNavigationButtons();
}

/**
 * Navigation functions
 */
function nextQuestion() {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion(currentQuestionIndex);
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion(currentQuestionIndex);
    }
}

/**
 * Update progress and navigation
 */
function updateQuizProgress() {
    const progressBar = document.getElementById('quizProgressBar');
    const questionNum = document.getElementById('currentQuestionNum');
    
    if (progressBar) {
        const progress = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    if (questionNum) {
        questionNum.textContent = currentQuestionIndex + 1;
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    if (prevBtn) prevBtn.style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
    
    if (currentQuestionIndex === currentQuiz.questions.length - 1) {
        if (nextBtn) nextBtn.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'inline-block';
    } else {
        if (nextBtn) {
            nextBtn.style.display = 'inline-block';
            nextBtn.disabled = userAnswers[currentQuestionIndex] === undefined;
        }
        if (submitBtn) submitBtn.style.display = 'none';
    }
}

/**
 * Submit quiz and show results
 */
function submitQuiz() {
    quizScore = 0;
    currentQuiz.questions.forEach((question, index) => {
        if (userAnswers[index] === question.correct) quizScore++;
    });
    
    const percentage = Math.round((quizScore / currentQuiz.questions.length) * 100);
    renderQuizResults(percentage);
}

/**
 * Render quiz results
 */
function renderQuizResults(percentage) {
    const content = document.getElementById('quizContent');
    const navigation = document.querySelector('.quiz-navigation');
    
    if (navigation) navigation.style.display = 'none';
    
    content.innerHTML = `
        <div class="quiz-results">
            <div class="results-header">
                <div class="score-circle ${percentage >= 70 ? 'good' : percentage >= 50 ? 'average' : 'poor'}">
                    <span class="score-number">${quizScore}</span>
                    <span class="score-total">/${currentQuiz.questions.length}</span>
                </div>
                <h4>${percentage >= 70 ? '🎉 Great Job!' : percentage >= 50 ? '👍 Good Effort!' : '📚 Keep Studying!'}</h4>
                <p class="score-percentage">${percentage}% Correct</p>
            </div>
            
            <div class="results-actions">
                <button class="quiz-btn primary" onclick="closeQuiz()">Close Quiz</button>
                <button class="quiz-btn secondary" onclick="retakeQuiz()">Retake Quiz</button>
            </div>
        </div>
    `;
    
    if (percentage >= 70 && typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
}

/**
 * Render hints modal
 */
function renderHints(hintsData) {
    const existingModal = document.getElementById('hintsModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'hintsModal';
    modal.className = 'hints-modal-overlay';
    modal.innerHTML = `
        <div class="hints-modal-content">
            <div class="hints-header">
                <h3>💡 Study Hints: ${hintsData.topicName}</h3>
                <button class="hints-close-btn" onclick="closeHints()">&times;</button>
            </div>
            
            <div class="hints-content">
                <div class="hints-list">
                    ${hintsData.hints.map((hint, index) => `
                        <div class="hint-item" style="animation-delay: ${index * 0.1}s">
                            <div class="hint-content">${hint}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="hints-actions">
                    <button class="hints-btn primary" onclick="closeHints()">Got It!</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * Utility functions
 */
function closeQuiz() {
    const modal = document.getElementById('quizModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
    currentQuiz = null;
    currentQuestionIndex = 0;
    quizScore = 0;
    userAnswers = [];
}

function retakeQuiz() {
    currentQuestionIndex = 0;
    quizScore = 0;
    userAnswers = [];
    currentQuiz.startTime = Date.now();
    renderQuestion(0);
    
    const navigation = document.querySelector('.quiz-navigation');
    if (navigation) navigation.style.display = 'flex';
}

function closeHints() {
    const modal = document.getElementById('hintsModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function showLoadingState(message = 'Loading...') {
    const existingLoader = document.getElementById('globalLoader');
    if (existingLoader) existingLoader.remove();
    
    const loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.className = 'global-loader';
    loader.innerHTML = `
        <div class="loader-content">
            <div class="loader-spinner"></div>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(loader);
    setTimeout(() => loader.classList.add('show'), 10);
}

function hideLoadingState() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.classList.remove('show');
        setTimeout(() => loader.remove(), 300);
    }
}

function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">⚠️</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// Make functions globally available
window.closeQuiz = closeQuiz;
window.retakeQuiz = retakeQuiz;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.selectAnswer = selectAnswer;
window.submitQuiz = submitQuiz;
window.closeHints = closeHints;

console.log('🎯 Quiz and Hints system loaded successfully!');
