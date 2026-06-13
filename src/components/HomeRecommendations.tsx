import { getHomeRecommendations } from "@/lib/recommendations";
import RecommendationCard from "@/components/RecommendationCard";

export default async function HomeRecommendations() {
  const recs = await getHomeRecommendations();
  if (recs.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-5 w-1 rounded-full bg-accent" />
        <h2 className="text-2xl font-semibold">Recommended for you</h2>
      </div>
      {/* Horizontal scroll bar — drag/scroll through the picks. */}
      <div className="shelf-scroll flex gap-3 overflow-x-auto pb-3">
        {recs.map((rec, i) => (
          <div
            key={`${rec.type}-${rec.title}-${i}`}
            className="w-72 flex-shrink-0"
          >
            <RecommendationCard rec={rec} />
          </div>
        ))}
      </div>
    </section>
  );
}
