export const TACTICAL_EXEMPLARS = `TACTICAL EXEMPLAR PATTERNS

These are original PerceptualLearning examples inspired by KSA structure. Do not copy them verbatim; use them as pattern guidance.

1. Context-anchored fluency
A student has a lunch account balance of -$4.75. The student adds $12.50 to the account. What is the new balance?
Answer key should show the rational number operation and final balance.

2. Direct equation or inequality in a practical setting
A school club has $35 to spend on notebooks. Each notebook costs $4. Write and solve an inequality to find the greatest number of notebooks the club can buy.
Answer key should identify the inequality, solution, and interpretation.

3. Proportional fluency
A recipe uses 3 cups of oats for 12 snack bars. How many cups of oats are needed for 20 snack bars?
Answer key should show proportional setup and unit rate or scale factor.`;

export const STRATEGIC_EXEMPLARS = `STRATEGIC EXEMPLAR PATTERNS

These are original PerceptualLearning examples inspired by KSA structure. Do not copy them verbatim; use them as pattern guidance.

1. Multi-step modeling with interpretation
A student council is comparing two companies for printing event shirts. One company charges a setup fee plus a cost per shirt. Another company has no setup fee but a higher cost per shirt. Ask students to determine which company is less expensive for a given number of shirts and explain when the better choice changes.

2. Percent reasoning in context
A store marks a jacket down by a percent and then applies sales tax. Ask students to determine the final cost or identify the error in a student's method. Distractors should reflect using the percent increase instead of decrease, applying tax to the original price, or subtracting the wrong amount.

3. Statistics and variability
Two classes collect data from the same type of activity. Ask which class has more consistent results and require students to use measures of center or variability to justify the decision.

4. Inequality modeling
A fundraiser has a goal and already collected part of the money. Students must write an inequality for the remaining amount based on repeated contributions, solve it, and interpret the least or greatest whole-number result.`;

export const MULTIPLE_CHOICE_EXEMPLARS = `MULTIPLE-CHOICE DESIGN EXEMPLARS

Use answer choices only when useful. If used, embed choices directly in question_text as A., B., C., D.

Distractor patterns:
- additive instead of multiplicative reasoning
- dividing in the wrong direction
- applying percent to the wrong base
- ignoring a starting fee or initial value
- sign error with negative numbers
- reversing an inequality symbol
- confusing range, mean, median, or variability

Original pattern:
A gym charges a one-time registration fee and a monthly cost. The question asks for the total cost after several months.
A correct choice uses fee + monthly cost times months.
Distractors should include fee times months, monthly cost plus months, and omitting the fee.`;

export const CONSTRUCTED_RESPONSE_EXEMPLARS = `CONSTRUCTED-RESPONSE DESIGN EXEMPLARS

Constructed-response questions should ask students to explain, justify, compare methods, identify an error, or interpret a solution.

Answer keys should include:
- Full understanding: correct setup, correct computation, and correct interpretation
- Partial understanding: correct setup with arithmetic error, or correct answer with weak explanation
- Common misconceptions: wrong operation, wrong percent base, additive reasoning for proportional relationship, sign or inequality reversal, misread graph/table

Original pattern:
A student claims two proportional relationships are the same because both tables increase by the same amount each row. Ask whether the student is correct and require evidence from the table. The answer key should distinguish additive change from constant ratio.`;

export const VISUAL_EXEMPLARS = `VISUAL EXEMPLAR PATTERNS

Use structured visual metadata only. Visuals should be mathematically necessary, not decorative.

Useful pairings:
- table: proportional relationships, function rules, cost comparisons, survey counts
- coordinate_plane: proportional graphs, slope-like rate reasoning, plotted data
- bar_graph: category comparisons, probability/relative frequency, survey results
- number_line: rational numbers, inequalities, distance from zero, solution intervals
- rectangle/triangle/circle: area, circumference, scale drawings, composite reasoning

If a question can be solved more clearly with a table, graph, number line, or diagram, include a visual object. If not, omit visual.`;

export const KSA_EXEMPLAR_PROMPT = `ORIGINAL KSA-STYLE EXEMPLAR SIGNALS

Use these as compact pattern guidance, not as text to copy:
- Tactical pattern: short context plus direct fluency, such as a lunch balance, club budget, recipe ratio, rational number operation, or direct inequality.
- Strategic pattern: realistic setup requiring students to model, compare, justify, interpret a table/graph, or identify an error before solving.
- Multiple-choice pattern: choices A-D should reflect common errors such as wrong percent base, omitted fixed fee, reversed inequality, sign error, or additive reasoning in a proportional situation.
- Constructed-response pattern: ask students to explain or justify; answer_key should include full understanding, partial understanding, and likely misconceptions.
- Visual pattern: use table, coordinate_plane, bar_graph, number_line, circle, rectangle, or triangle only when it supports reasoning.`;
