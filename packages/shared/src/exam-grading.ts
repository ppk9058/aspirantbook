export interface QuestionGradingInput {
  id: string;
  correctOption?: string | null;
  positiveMarks: number;
  negativeMarks: number;
}

export interface AnswerGradingInput {
  questionId: string;
  selectedOption?: string | null;
  isMarked?: boolean;
  timeSpentSecs?: number;
}

export interface GradedAnswerOutput {
  questionId: string;
  isCorrect: boolean;
  marksAwarded: number;
}

export interface PureGradingSummary {
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  markedCount: number;
  gradedAnswers: GradedAnswerOutput[];
}

/**
 * Pure calculation function that computes scores and counts for an exam attempt
 * without any database or I/O dependency.
 */
export function calculateExamScore(
  questions: QuestionGradingInput[],
  answers: AnswerGradingInput[]
): PureGradingSummary {
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  let totalScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let markedCount = 0;

  const gradedAnswers: GradedAnswerOutput[] = [];

  for (const ans of answers) {
    const question = questionMap.get(ans.questionId);
    if (!question) {
      gradedAnswers.push({
        questionId: ans.questionId,
        isCorrect: false,
        marksAwarded: 0,
      });
      continue;
    }

    if (ans.isMarked) {
      markedCount++;
    }

    if (!ans.selectedOption || ans.selectedOption.trim() === "") {
      skippedCount++;
      gradedAnswers.push({
        questionId: ans.questionId,
        isCorrect: false,
        marksAwarded: 0,
      });
    } else if (ans.selectedOption === question.correctOption) {
      correctCount++;
      const marks = question.positiveMarks;
      totalScore += marks;
      gradedAnswers.push({
        questionId: ans.questionId,
        isCorrect: true,
        marksAwarded: marks,
      });
    } else {
      wrongCount++;
      const marks = -Math.abs(question.negativeMarks);
      totalScore += marks;
      gradedAnswers.push({
        questionId: ans.questionId,
        isCorrect: false,
        marksAwarded: marks,
      });
    }
  }

  // Any questions that the user never submitted an answer row for are skipped
  for (const q of questions) {
    if (!answerMap.has(q.id)) {
      skippedCount++;
    }
  }

  // Round total score to 2 decimal places to avoid floating point precision artifacts
  totalScore = Math.round(totalScore * 100) / 100;

  return {
    totalScore,
    correctCount,
    wrongCount,
    skippedCount,
    markedCount,
    gradedAnswers,
  };
}
