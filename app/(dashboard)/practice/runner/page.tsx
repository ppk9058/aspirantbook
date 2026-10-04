import PracticeLayout from "@/components/practice/PracticeLayout"
import { CODING_PROBLEMS } from "@/lib/coding-practice-data"

export default async function PracticeRunnerPage({
    searchParams,
}: {
    searchParams?: Promise<{ id?: string }>
}) {
    const params = searchParams ? await searchParams : {}
    const problemId = params.id ? Number(params.id) : 711

    const foundProblem = CODING_PROBLEMS.find((p) => p.id === problemId) || CODING_PROBLEMS[0]

    const exerciseData = {
        exerciseId: `problem-${foundProblem.id}`,
        title: `${foundProblem.id}. ${foundProblem.title}`,
        description: foundProblem.description,
        starterCode: foundProblem.starterCode.python,
        language: "python",
        hints: foundProblem.hints,
    }

    return <PracticeLayout {...exerciseData} />
}
