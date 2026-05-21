export type Standard = {
  id: string;
  code: string;
  description: string;
  cluster: string;
  grade_level: string;
  subject: string;
};

export function formatStandardLabel(
  standard: Pick<Standard, "code" | "description">
) {
  return `${standard.code} — ${standard.description}`;
}
