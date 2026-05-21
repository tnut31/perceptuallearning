import { AI_PROVIDER } from "./provider";
import { callOllama } from "./ollama";
import { KSA_EXEMPLAR_PROMPT } from "./exemplars";
import { buildStandardAlignmentPrompt } from "./standards";
import {
  BASE_SYSTEM_PROMPT,
  KSA_ASSESSMENT_FRAMEWORK_PROMPT,
  MISCONCEPTION_PROMPT,
  MIXED_RIGOR_PROMPT,
  STRATEGIC_RIGOR_PROMPT,
  STANDARD_ALIGNMENT_PRIORITY_PROMPT,
  TACTICAL_RIGOR_PROMPT,
  VISUAL_SUPPORT_PROMPT,
} from "./systemPrompts";

type GenerateQuestionsParams = {
  standard: string;
  rigor: "tactical" | "strategic" | "mixed";
  topic: string;
  questionCount: number;
};

function getRigorPrompt(rigor: GenerateQuestionsParams["rigor"]) {
  if (rigor === "tactical") return TACTICAL_RIGOR_PROMPT;
  if (rigor === "strategic") return STRATEGIC_RIGOR_PROMPT;
  return MIXED_RIGOR_PROMPT;
}

export async function generateQuestions({
  standard,
  rigor,
  topic,
  questionCount,
}: GenerateQuestionsParams): Promise<string> {
  const rigorInstruction =
    rigor === "mixed"
      ? "Create a balanced mix of tactical and strategic questions. Each object must use either \"tactical\" or \"strategic\" for rigor_type."
      : `Create ${rigor} questions. Every object must use "${rigor}" for rigor_type.`;
  const topicInstruction = topic.trim()
    ? topic
    : "the selected standard, using teacher-ready 7th grade math contexts";
  const rigorPrompt = getRigorPrompt(rigor);
  const standardAlignmentPrompt = buildStandardAlignmentPrompt(standard);

  const prompt = `${BASE_SYSTEM_PROMPT}

${STANDARD_ALIGNMENT_PRIORITY_PROMPT}

${standardAlignmentPrompt}

${KSA_ASSESSMENT_FRAMEWORK_PROMPT}

${MISCONCEPTION_PROMPT}

${rigorPrompt}

${VISUAL_SUPPORT_PROMPT}

${KSA_EXEMPLAR_PROMPT}

TASK

Generate ${questionCount} 7th grade math questions.

Standard:
${standard}

Rigor:
${rigor}
${rigorInstruction}

Topic:
${topicInstruction}

Alignment requirement:
Every question must directly assess ${standard}. Use the standard metadata above as a constraint. Do not drift into a nearby skill unless it is necessary for the requested standard. The answer key should include the expected mathematical result and enough reasoning for a teacher to verify the item.

Strategic quality requirement:
If the requested rigor is strategic, each question must be scenario-based or reasoning-based. Do not return direct procedural-only prompts such as "Solve for x" unless they are embedded in a meaningful context that requires modeling, interpretation, or justification.

Context and wording requirement:
Use concise KSA-style wording. Prefer school, community, household, data, design, savings, shopping, measurement, or classroom contexts. Include enough information for reasoning, but avoid decorative story details.

Return ONLY valid JSON. Do not include markdown, explanations, or prose outside the JSON.

The JSON must be an array with exactly ${questionCount} objects in this structure:
[
  {
    "question_text": "A complete student-facing question.",
    "answer_key": "A concise correct answer with any necessary work or solution.",
    "rigor_type": "tactical",
    "visual": {
      "type": "table",
      "headers": ["Input", "Output"],
      "rows": [[1, 2], [2, 4]]
    }
  }
]

The "visual" property is optional. Include it only when the visual supports the mathematics.

For multiple-choice style items, include answer choices inside question_text using clear labels like A., B., C., and D. Make distractors plausible and tied to common misconceptions. Put the correct choice and explanation in answer_key.

For constructed-response style items, include the reasoning expectation in question_text and include scoring guidance, partial-credit markers, and common misconceptions in answer_key.

Vary item format across a set when appropriate: some items may be short answer, some may be multiple choice, and some may be constructed response. Keep every item compatible with question_text, answer_key, rigor_type, and optional visual.
`;

  if (AI_PROVIDER === "ollama") {
    return callOllama(prompt);
  }

  throw new Error("Unsupported AI provider");
}
