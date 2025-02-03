import { useRouter } from "next/navigation";

export default function CityRestaurantsPage({params}: {params: {city: string}}) {
  return (
    <div>
      <h1>Restaurants in {params.city}</h1>
    </div>
  );
}