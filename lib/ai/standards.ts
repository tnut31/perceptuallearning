import type { VisualType } from "./visualTypes";

export type AiStandardDefinition = {
  standard: string;
  domain: string;
  concepts: string[];
  preferredContexts: string[];
  preferredVisuals: VisualType[];
  vocabulary: string[];
  avoidContexts: string[];
};

export type AlignmentResult = {
  standard: string;
  isAligned: boolean;
  score: number;
  matchedTerms: string[];
  avoidedTermsFound: string[];
  warning?: string;
};

export const AI_STANDARD_DEFINITIONS: Record<string, AiStandardDefinition> = {
  "KY.7.G.1": {
    standard: "KY.7.G.1",
    domain: "Geometry",
    concepts: [
      "scale drawings",
      "scale factor",
      "geometric proportional reasoning",
      "actual vs model measurements",
    ],
    preferredContexts: [
      "maps",
      "blueprints",
      "floor plans",
      "models",
      "architectural drawings",
    ],
    preferredVisuals: ["rectangle", "table"],
    vocabulary: [
      "scale",
      "actual",
      "model",
      "dimensions",
      "proportional",
    ],
    avoidContexts: [
      "ticket sales",
      "savings accounts",
      "generic fundraising",
      "non-geometric proportional situations",
    ],
  },
  "KY.7.G.3": {
    standard: "KY.7.G.3",
    domain: "Geometry",
    concepts: [
      "two-dimensional slices",
      "three-dimensional figures",
      "plane sections",
      "cross sections",
      "geometric structure",
    ],
    preferredContexts: [
      "slicing solids",
      "packaging",
      "models of prisms",
      "models of pyramids",
      "classroom geometry displays",
    ],
    preferredVisuals: ["rectangle", "triangle"],
    vocabulary: [
      "slice",
      "cross section",
      "plane",
      "prism",
      "pyramid",
      "face",
    ],
    avoidContexts: [
      "ticket sales",
      "percent discount",
      "savings accounts",
      "linear equations without geometry",
    ],
  },
  "KY.7.EE.4.a": {
    standard: "KY.7.EE.4.a",
    domain: "Expressions and Equations",
    concepts: [
      "linear equations",
      "one-variable equations",
      "rational number coefficients",
      "contextual equation solving",
      "interpreting solutions",
    ],
    preferredContexts: [
      "budgets",
      "school supplies",
      "club fees",
      "measurement totals",
      "multi-step purchases",
    ],
    preferredVisuals: ["table"],
    vocabulary: ["equation", "solution", "variable", "coefficient", "total"],
    avoidContexts: [
      "scale drawings",
      "probability experiments",
      "circle area",
      "statistics variability",
    ],
  },
  "KY.7.EE.4.b": {
    standard: "KY.7.EE.4.b",
    domain: "Expressions and Equations",
    concepts: [
      "linear inequalities",
      "one-variable inequalities",
      "rational number coefficients",
      "solution sets",
      "interpreting inequality constraints",
    ],
    preferredContexts: [
      "spending limits",
      "minimum goals",
      "maximum capacities",
      "fundraising targets",
      "time constraints",
    ],
    preferredVisuals: ["number_line", "table"],
    vocabulary: [
      "inequality",
      "at least",
      "at most",
      "greater than",
      "less than",
      "solution set",
    ],
    avoidContexts: [
      "scale drawings",
      "random probability",
      "statistics variability",
      "area formulas only",
    ],
  },
  "KY.7.RP.2": {
    standard: "KY.7.RP.2",
    domain: "Ratios and Proportional Relationships",
    concepts: [
      "proportional relationships",
      "constant of proportionality",
      "unit rate",
      "tables graphs equations",
      "representing proportional relationships",
    ],
    preferredContexts: [
      "recipes",
      "unit pricing",
      "travel rates",
      "school store pricing",
      "earned money over time",
    ],
    preferredVisuals: ["table", "coordinate_plane"],
    vocabulary: [
      "proportional",
      "constant of proportionality",
      "unit rate",
      "rate",
      "origin",
    ],
    avoidContexts: [
      "scale drawings",
      "probability experiments",
      "box plots",
      "area formulas only",
    ],
  },
  "KY.7.SP.7": {
    standard: "KY.7.SP.7",
    domain: "Statistics and Probability",
    concepts: [
      "probability model",
      "uniform probability",
      "non-uniform probability",
      "experimental probability",
      "predicted frequency",
    ],
    preferredContexts: [
      "spinners",
      "number cubes",
      "bags of tiles",
      "classroom games",
      "simulation results",
    ],
    preferredVisuals: ["bar_graph", "table"],
    vocabulary: [
      "probability",
      "likely",
      "equally likely",
      "outcome",
      "event",
      "simulation",
    ],
    avoidContexts: [
      "scale drawings",
      "linear equations",
      "circle circumference",
      "generic shopping discounts",
    ],
  },
  "KY.7.SP.8": {
    standard: "KY.7.SP.8",
    domain: "Statistics and Probability",
    concepts: [
      "compound probability",
      "sample space",
      "tree diagram",
      "organized list",
      "probability of compound events",
    ],
    preferredContexts: [
      "two-step games",
      "menus",
      "outfit choices",
      "spinners and number cubes",
      "sampling with multiple events",
    ],
    preferredVisuals: ["table"],
    vocabulary: [
      "compound event",
      "sample space",
      "outcome",
      "organized list",
      "tree diagram",
      "probability",
    ],
    avoidContexts: [
      "scale drawings",
      "one-step equations",
      "unit rate only",
      "geometry measurement only",
    ],
  },
};

export function getStandardDefinition(standard: string) {
  return AI_STANDARD_DEFINITIONS[standard.trim()];
}

export function buildStandardAlignmentPrompt(standard: string) {
  const definition = getStandardDefinition(standard);
  if (!definition) {
    return `IMPORTANT STANDARD ALIGNMENT
This question MUST primarily assess ${standard}. Prioritize the standard over generic KSA-style context.`;
  }

  return `IMPORTANT STANDARD ALIGNMENT
This question MUST primarily assess ${definition.standard} (${definition.domain}).
Focus concepts: ${definition.concepts.join("; ")}.
Preferred contexts: ${definition.preferredContexts.join("; ")}.
Preferred visuals: ${definition.preferredVisuals.join("; ")}.
Use vocabulary: ${definition.vocabulary.join("; ")}.
Avoid unrelated contexts: ${definition.avoidContexts.join("; ")}.
Do not drift into another domain just because the context sounds KSA-like.`;
}

function includesTerm(text: string, term: string) {
  return text.includes(term.toLowerCase());
}

export function validateStandardAlignment(
  standard: string,
  questions: Array<{ question_text: string; answer_key: string }>
): AlignmentResult | null {
  const definition = getStandardDefinition(standard);
  if (!definition) return null;

  const text = questions
    .map((question) => `${question.question_text} ${question.answer_key}`)
    .join(" ")
    .toLowerCase();
  const alignedTerms = [
    ...definition.concepts,
    ...definition.preferredContexts,
    ...definition.vocabulary,
  ];
  const matchedTerms = Array.from(
    new Set(alignedTerms.filter((term) => includesTerm(text, term)))
  );
  const avoidedTermsFound = definition.avoidContexts.filter((term) =>
    includesTerm(text, term)
  );
  const score = matchedTerms.length - avoidedTermsFound.length * 2;
  const isAligned = matchedTerms.length >= 2 && avoidedTermsFound.length === 0;

  return {
    standard: definition.standard,
    isAligned,
    score,
    matchedTerms,
    avoidedTermsFound,
    ...(isAligned
      ? {}
      : {
          warning:
            "Generated questions may be weakly aligned to the requested standard. Review before use.",
        }),
  };
}
