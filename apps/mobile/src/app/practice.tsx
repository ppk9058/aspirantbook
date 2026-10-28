import React from "react";
import { WebOnlyScreen } from "../components/primitives/WebOnlyScreen";

export default function CodingPracticeScreen() {
  return (
    <WebOnlyScreen
      title="Coding Practice"
      explanation="Interactive code editor, automated test cases, and real-time execution are exclusively available on our desktop web platform."
      webPath="/practice"
      testID="coding-practice-screen"
    />
  );
}
