import { notFound } from "next/navigation";
import RestaurantMenuView from "../_components/RestaurantMenuView";
import {
  findRestaurantByHandle,
  loadMenu,
} from "@/lib/food/pg-menu";

export const dynamic = "force-dynamic";

export default async function RestaurantBySlug({
  params,
  searchParams,
}: {
  params: { handle: string };
  searchParams: { page?: string; q?: string };
}) {
  const restaurant = await findRestaurantByHandle(params.handle);
  if (!restaurant) notFound();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const pageSize = 50;
  const { products, total } = await loadMenu(
    restaurant.id,
    page,
    pageSize,
    searchParams.q,
  );

  return (
    <RestaurantMenuView
      restaurant={restaurant}
      products={products}
      total={total}
      page={page}
      pageSize={pageSize}
      initialQuery={searchParams.q ?? ""}
      basePath={`/food/r/${params.handle}`}
    />
  );
}
