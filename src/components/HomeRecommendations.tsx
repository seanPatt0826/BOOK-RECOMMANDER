import { getHomeRecommendations } from "@/lib/recommendations";
import RecommendationCard from "@/components/RecommendationCard";

export default async function HomeRecommendations() {
  const recs = await getHomeRecommendations();
  if (recs.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xl font-semibold">Recommended for you</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recs.map((rec, i) => (
          <RecommendationCard key={`${rec.type}-${rec.title}-${i}`} rec={rec} />
        ))}
      </div>
    </section>
  );
}
