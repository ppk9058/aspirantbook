export interface AssessmentQuestion {
    id: string
    type: "MULTIPLE_CHOICE" | "CODE_COMPLETION" | "FILL_BLANK" | "CODE_OUTPUT" | "TRUE_FALSE"
    question: string
    options: string[]
    correctAnswer: string // Index as string "0", "1", "2", "3"
    points: number
    order: number
    explanation: string
}

export const FIVE_STANDARD_QUESTIONS: AssessmentQuestion[] = [
    {
        id: "q1",
        type: "MULTIPLE_CHOICE",
        question: "Which of the following data structures in Python is IMMUTABLE (cannot be modified after creation)?",
        options: ["List", "Dictionary", "Tuple", "Set"],
        correctAnswer: "2", // Tuple
        points: 20,
        order: 1,
        explanation: "Tuples in Python are immutable sequences; once initialized, their elements cannot be altered, appended, or removed.",
    },
    {
        id: "q2",
        type: "MULTIPLE_CHOICE",
        question: "What is the average time complexity of searching for a key in a balanced Binary Search Tree (BST)?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        correctAnswer: "1", // O(log n)
        points: 20,
        order: 2,
        explanation: "Each comparison in a balanced BST divides the remaining candidate search space in half, resulting in O(log n) time.",
    },
    {
        id: "q3",
        type: "MULTIPLE_CHOICE",
        question: "In SQL, which clause is used to filter rows AFTER an aggregation or GROUP BY statement?",
        options: ["WHERE", "HAVING", "ORDER BY", "FILTER"],
        correctAnswer: "1", // HAVING
        points: 20,
        order: 3,
        explanation: "The HAVING clause applies filtering conditions to aggregated groups, whereas WHERE filters individual rows before grouping.",
    },
    {
        id: "q4",
        type: "MULTIPLE_CHOICE",
        question: "In Machine Learning, which technique helps prevent overfitting by penalizing excessively large feature weights?",
        options: ["L1 / L2 Regularization", "One-Hot Encoding", "Min-Max Normalization", "Gradient Clipping"],
        correctAnswer: "0", // L1 / L2 Regularization
        points: 20,
        order: 4,
        explanation: "Regularization (L1 Lasso and L2 Ridge) adds a penalty term directly to the loss function to constrain weight magnitude.",
    },
    {
        id: "q5",
        type: "MULTIPLE_CHOICE",
        question: "What will the following JavaScript expression evaluate to: typeof null?",
        options: ["'null'", "'undefined'", "'object'", "'boolean'"],
        correctAnswer: "2", // 'object'
        points: 20,
        order: 5,
        explanation: "In JavaScript, 'typeof null' evaluates to 'object'. This is a historical specification legacy dating back to the first JS engine.",
    },
]

export interface EvaluationResult {
    score: number
    passed: boolean
    totalPoints: number
    earnedPoints: number
    correctAnswers: number
    totalQuestions: number
    breakdown: Array<{
        questionId: string
        question: string
        options: string[]
        userAnswerIndex: string | null
        userAnswerText: string
        correctAnswerIndex: string
        correctAnswerText: string
        isCorrect: boolean
        explanation: string
    }>
}

export function evaluateAssessment(
    userAnswers: Record<string, string>,
    questions: AssessmentQuestion[] = FIVE_STANDARD_QUESTIONS,
    passingScore: number = 60
): EvaluationResult {
    let totalPoints = 0
    let earnedPoints = 0
    let correctAnswers = 0

    const breakdown = questions.map((q) => {
        totalPoints += q.points
        const userChoice = userAnswers[q.id] !== undefined ? String(userAnswers[q.id]).trim() : null
        const correctChoice = String(q.correctAnswer).trim()
        const isCorrect = userChoice !== null && userChoice === correctChoice

        if (isCorrect) {
            earnedPoints += q.points
            correctAnswers += 1
        }

        const userIndex = userChoice !== null ? parseInt(userChoice, 10) : -1
        const correctIndex = parseInt(correctChoice, 10)

        return {
            questionId: q.id,
            question: q.question,
            options: q.options,
            userAnswerIndex: userChoice,
            userAnswerText: userIndex >= 0 && q.options[userIndex] ? q.options[userIndex] : "Not Answered",
            correctAnswerIndex: correctChoice,
            correctAnswerText: q.options[correctIndex] || correctChoice,
            isCorrect,
            explanation: q.explanation,
        }
    })

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
    const passed = score >= passingScore

    return {
        score,
        passed,
        totalPoints,
        earnedPoints,
        correctAnswers,
        totalQuestions: questions.length,
        breakdown,
    }
}
