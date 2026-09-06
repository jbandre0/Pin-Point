import { notFound } from "next/navigation";
import CountryDetail from "@/components/CountryDetail";
import { getAllCountries, getCountry } from "@/lib/countries";

// Pre-render a route for every country that has a data file.
export function generateStaticParams() {
  return getAllCountries().map((c) => ({ id: c.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const country = getCountry(params.id);
  return { title: country ? `${country.name} · Pin Point` : "Pin Point" };
}

export default function CountryPage({ params }: { params: { id: string } }) {
  const country = getCountry(params.id);
  if (!country) notFound();
  return <CountryDetail country={country} />;
}
