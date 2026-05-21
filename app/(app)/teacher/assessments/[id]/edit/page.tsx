"use client";

import { useParams } from "next/navigation";
import AssessmentBuilder from "../../AssessmentBuilder";

export default function EditAssessmentPage() {
  const params = useParams<{ id: string }>();

  return <AssessmentBuilder mode="edit" assessmentId={params.id} />;
}
