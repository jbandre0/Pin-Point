import Quiz from "@/components/Quiz";
import { getAllRecords } from "@/lib/countries";

export const metadata = { title: "Quiz · Pin Point" };

export default function QuizPage() {
  // Regions are first-class quiz targets, so feed every record.
  return <Quiz countries={getAllRecords()} />;
}
