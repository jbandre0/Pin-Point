import Quiz from "@/components/Quiz";
import { getAllCountries } from "@/lib/countries";

export const metadata = { title: "Quiz · Pin Point" };

export default function QuizPage() {
  return <Quiz countries={getAllCountries()} />;
}
