/**
 * Groq LLM Integration
 * CramMaster AgentX - TiDB AgentX Hackathon
 * Using LLaMA 3.1 models via Groq API
 */

import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

class GroqLLM {
    constructor() {
        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY || 'your-groq-api-key-here'
        });
        
        this.models = {
            fast: 'llama-3.1-8b-instant',      // Fast responses
            balanced: 'llama-3.1-70b-versatile', // Balanced quality/speed
            quality: 'llama-3.1-405b-reasoning'  // Highest quality
        };
        
        this.fallbackData = {
            topics: [
                { topic: 'Introduction and Overview', difficulty: 'Beginner', keywords: ['basics', 'fundamentals'] },
                { topic: 'Core Concepts', difficulty: 'Intermediate', keywords: ['theory', 'principles'] },
                { topic: 'Advanced Topics', difficulty: 'Advanced', keywords: ['complex', 'specialized'] },
                { topic: 'Practice and Review', difficulty: 'Beginner', keywords: ['exercises', 'review'] }
            ],
            quizzes: [
                {
                    type: 'MCQ',
                    question: 'What is the most important aspect of studying this topic?',
                    options: ['Understanding fundamentals', 'Memorizing details', 'Speed reading', 'Taking notes'],
                    answer: 'Understanding fundamentals',
                    explanation: 'Building a strong foundation is crucial for learning.'
                }
            ]
        };
    }

    async makeRequest(messages, model = 'balanced', maxTokens = 1000) {
        try {
            const response = await this.groq.chat.completions.create({
                messages,
                model: this.models[model],
                max_tokens: maxTokens,
                temperature: 0.7,
                top_p: 0.9,
                stream: false
            });

            return response.choices[0]?.message?.content || '';
        } catch (error) {
            console.error(`❌ Groq API error (${model}):`, error.message);
            
            // Try fallback to faster model
            if (model !== 'fast') {
                console.log('🔄 Retrying with faster model...');
                return await this.makeRequest(messages, 'fast', maxTokens);
            }
            
            throw error;
        }
    }

    /**
     * Extract topics from syllabus content
     */
    async extractTopics(syllabusContent, focusAreas = '') {
        try {
            const prompt = `
Extract key study topics from this syllabus content. Return ONLY a valid JSON array.

Syllabus Content:
${syllabusContent}

Focus Areas (if any): ${focusAreas}

Return format (JSON array only, no other text):
[
    {
        "topic": "Topic Name",
        "content": "Brief description of what this topic covers",
        "difficulty": "Beginner|Intermediate|Advanced",
        "keywords": ["keyword1", "keyword2", "keyword3"],
        "estimated_time": "30 mins"
    }
]

Requirements:
- Extract 4-8 main topics maximum
- Prioritize topics mentioned in focus areas
- Include realistic time estimates
- Use clear, student-friendly topic names
`;

            const messages = [
                { role: 'system', content: 'You are an expert educational content analyzer. Return only valid JSON.' },
                { role: 'user', content: prompt }
            ];

            const response = await this.makeRequest(messages, 'balanced', 1500);
            
            // Clean and parse JSON response
            const cleanedResponse = this.cleanJsonResponse(response);
            const topics = JSON.parse(cleanedResponse);
            
            // Validate and enhance topics
            return this.validateTopics(topics);
            
        } catch (error) {
            console.error('❌ Topic extraction failed:', error.message);
            console.log('🔄 Using fallback topic data...');
            return this.fallbackData.topics;
        }
    }

    /**
     * Generate quiz questions for a topic
     */
    async generateQuiz(topic, questionCount = 3) {
        try {
            const prompt = `
Generate ${questionCount} practice questions for the topic: "${topic}"

Create exactly:
1. One Multiple Choice Question (4 options)
2. One True/False question
3. One Fill-in-the-blank question

Return ONLY valid JSON array:
[
    {
        "type": "MCQ",
        "question": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "answer": "Correct option text",
        "explanation": "Why this is correct",
        "points": 10
    },
    {
        "type": "True-False",
        "question": "Statement to evaluate as true or false.",
        "options": ["True", "False"],
        "answer": "True",
        "explanation": "Explanation of the answer",
        "points": 5
    },
    {
        "type": "Fill-in-the-Blank",
        "question": "Complete this sentence: The main concept of ${topic} is _______.",
        "options": [],
        "answer": "Expected answer",
        "explanation": "Why this answer is correct",
        "points": 8
    }
]
`;

            const messages = [
                { role: 'system', content: 'You are an expert quiz creator. Generate educational questions. Return only valid JSON.' },
                { role: 'user', content: prompt }
            ];

            const response = await this.makeRequest(messages, 'balanced', 1200);
            
            const cleanedResponse = this.cleanJsonResponse(response);
            const questions = JSON.parse(cleanedResponse);
            
            return this.validateQuiz(questions);
            
        } catch (error) {
            console.error('❌ Quiz generation failed:', error.message);
            console.log('🔄 Using fallback quiz data...');
            return this.generateFallbackQuiz(topic);
        }
    }

    /**
     * Generate study hints and mnemonics
     */
    async generateHints(topic, difficulty = 'Medium') {
        try {
            const prompt = `
Generate study hints and memory aids for: "${topic}"
Difficulty level: ${difficulty}

Return ONLY valid JSON:
{
    "memory_techniques": [
        "Mnemonic device or memory trick",
        "Visual association technique",
        "Acronym or word association"
    ],
    "study_tips": [
        "Practical study advice",
        "Common mistake to avoid",
        "Connection to real-world application"
    ],
    "quick_facts": [
        "Key fact #1",
        "Key fact #2", 
        "Key fact #3"
    ],
    "motivation": "Encouraging message about mastering this topic"
}
`;

            const messages = [
                { role: 'system', content: 'You are a study coach expert. Create helpful learning aids. Return only valid JSON.' },
                { role: 'user', content: prompt }
            ];

            const response = await this.makeRequest(messages, 'fast', 800);
            
            const cleanedResponse = this.cleanJsonResponse(response);
            return JSON.parse(cleanedResponse);
            
        } catch (error) {
            console.error('❌ Hints generation failed:', error.message);
            return this.generateFallbackHints(topic);
        }
    }

    /**
     * Generate embeddings using Groq (if available) or simple text processing
     */
    async generateEmbedding(text) {
        try {
            // Note: Groq doesn't have embedding models, so we'll create a simple hash-based embedding
            // In production, you might want to use a dedicated embedding service
            return this.createSimpleEmbedding(text);
        } catch (error) {
            console.error('❌ Embedding generation failed:', error.message);
            return this.createSimpleEmbedding(text);
        }
    }

    /**
     * Create simple text-based embedding (768 dimensions)
     */
    createSimpleEmbedding(text) {
        const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
        const embedding = new Array(768).fill(0);
        
        // Simple hash-based embedding
        words.forEach((word, index) => {
            for (let i = 0; i < word.length; i++) {
                const charCode = word.charCodeAt(i);
                const pos = (charCode + i + index) % 768;
                embedding[pos] += Math.sin(charCode * 0.1) * 0.1;
            }
        });
        
        // Normalize
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
            for (let i = 0; i < embedding.length; i++) {
                embedding[i] /= norm;
            }
        }
        
        return embedding;
    }

    /**
     * Clean JSON response from LLM
     */
    cleanJsonResponse(response) {
        // Remove markdown code blocks
        let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        // Remove any text before first [ or {
        const jsonStart = Math.min(
            cleaned.indexOf('[') >= 0 ? cleaned.indexOf('[') : Infinity,
            cleaned.indexOf('{') >= 0 ? cleaned.indexOf('{') : Infinity
        );
        
        if (jsonStart !== Infinity) {
            cleaned = cleaned.substring(jsonStart);
        }
        
        // Remove any text after last ] or }
        const jsonEnd = Math.max(
            cleaned.lastIndexOf(']'),
            cleaned.lastIndexOf('}')
        );
        
        if (jsonEnd >= 0) {
            cleaned = cleaned.substring(0, jsonEnd + 1);
        }
        
        return cleaned.trim();
    }

    /**
     * Validate and enhance extracted topics
     */
    validateTopics(topics) {
        if (!Array.isArray(topics) || topics.length === 0) {
            return this.fallbackData.topics;
        }
        
        return topics.map(topic => ({
            topic: topic.topic || 'Unknown Topic',
            content: topic.content || 'Content description not available',
            difficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(topic.difficulty) 
                ? topic.difficulty : 'Intermediate',
            keywords: Array.isArray(topic.keywords) ? topic.keywords : ['study', 'learn'],
            estimated_time: topic.estimated_time || '30 mins'
        })).slice(0, 8); // Limit to 8 topics
    }

    /**
     * Validate quiz questions
     */
    validateQuiz(questions) {
        if (!Array.isArray(questions) || questions.length === 0) {
            return this.fallbackData.quizzes;
        }
        
        return questions.map(q => ({
            type: q.type || 'MCQ',
            question: q.question || 'Sample question?',
            options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B'],
            answer: q.answer || q.options?.[0] || 'Answer not available',
            explanation: q.explanation || 'Explanation not available',
            points: typeof q.points === 'number' ? q.points : 10
        }));
    }

    /**
     * Generate fallback quiz for a topic
     */
    generateFallbackQuiz(topic) {
        return [
            {
                type: 'MCQ',
                question: `What is the most important concept in ${topic}?`,
                options: [
                    'Understanding the fundamentals',
                    'Memorizing all details',
                    'Speed reading through content',
                    'Skipping difficult parts'
                ],
                answer: 'Understanding the fundamentals',
                explanation: 'Building a strong foundation is crucial for mastering any topic.',
                points: 10
            },
            {
                type: 'True-False',
                question: `${topic} requires both theoretical knowledge and practical application.`,
                options: ['True', 'False'],
                answer: 'True',
                explanation: 'Most subjects benefit from combining theory with practice.',
                points: 5
            },
            {
                type: 'Fill-in-the-Blank',
                question: `The key to mastering ${topic} is consistent _______.`,
                options: [],
                answer: 'practice',
                explanation: 'Regular practice helps reinforce learning and build expertise.',
                points: 8
            }
        ];
    }

    /**
     * Generate fallback hints
     */
    generateFallbackHints(topic) {
        return {
            memory_techniques: [
                `Create visual associations for ${topic} concepts`,
                `Use the acronym method to remember key points`,
                `Connect new information to what you already know`
            ],
            study_tips: [
                `Break ${topic} into smaller, manageable chunks`,
                `Practice active recall instead of passive reading`,
                `Teach the concept to someone else to test understanding`
            ],
            quick_facts: [
                `${topic} is fundamental to understanding the subject`,
                `Regular review helps with long-term retention`,
                `Practical application reinforces theoretical knowledge`
            ],
            motivation: `Mastering ${topic} will give you a strong foundation for advanced concepts!`
        };
    }

    /**
     * Health check for Groq API
     */
    async healthCheck() {
        try {
            const response = await this.makeRequest([
                { role: 'user', content: 'Respond with just "OK" if you are working.' }
            ], 'fast', 10);
            
            return {
                status: 'healthy',
                model: this.models.fast,
                response: response.trim(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Export singleton instance
const groqLLM = new GroqLLM();

export default groqLLM;
export { GroqLLM };
