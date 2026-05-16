"use client";
import { useState } from "react";

const GOOGLE_CATEGORIES = [
  { label: "— Select a Category —", value: "" },
  { label: "Apparel & Fashion", value: "fashion" },
  { label: "Apparel & Fashion > Men's Clothing", value: "mens" },
  { label: "Apparel & Fashion > Women's Clothing", value: "womens" },
  { label: "Apparel & Fashion > Footwear", value: "footwear" },
  { label: "Apparel & Fashion > Accessories", value: "accessories" },
  { label: "Arts & Entertainment", value: "arts" },
  { label: "Automotive", value: "automotive" },
  { label: "Automotive > Auto Parts", value: "auto_parts" },
  { label: "Beauty & Personal Care", value: "beauty" },
  { label: "Beauty & Personal Care > Skin Care", value: "skincare" },
  { label: "Beauty & Personal Care > Hair Care", value: "haircare" },
  { label: "Books & Stationery", value: "books" },
  { label: "Business & Industrial", value: "industrial" },
  { label: "Business & Industrial > Office Supplies", value: "office" },
  { label: "Computers & Electronics", value: "electronics" },
  { label: "Computers & Electronics > Mobile Phones", value: "phones" },
  { label: "Computers & Electronics > Computers", value: "computers" },
  { label: "Computers & Electronics > Audio", value: "audio" },
  { label: "Computers & Electronics > Cameras", value: "cameras" },
  { label: "Food & Grocery", value: "food" },
  { label: "Food & Grocery > Beverages", value: "beverages" },
  { label: "Food & Grocery > Organic", value: "organic" },
  { label: "Health & Fitness", value: "health" },
  { label: "Health & Fitness > Vitamins & Supplements", value: "supplements" },
  { label: "Health & Fitness > Medical Supplies", value: "medical" },
  { label: "Home & Garden", value: "home" },
  { label: "Home & Garden > Furniture", value: "furniture" },
  { label: "Home & Garden > Kitchen", value: "kitchen" },
  { label: "Home & Garden > Bedding", value: "bedding" },
  { label: "Home & Garden > Garden", value: "garden" },
  { label: "Jewelry & Watches", value: "jewelry" },
  { label: "Luggage & Bags", value: "luggage" },
  { label: "Media > Movies & TV", value: "movies" },
  { label: "Media > Video Games", value: "games" },
  { label: "Pet Supplies", value: "pets" },
  { label: "Religious & Ceremonial", value: "religious" },
  { label: "Sporting Goods", value: "sports" },
  { label: "Sporting Goods > Cricket", value: "cricket" },
  { label: "Sporting Goods > Fitness Equipment", value: "fitness" },
  { label: "Toys & Games", value: "toys" },
  { label: "Travel", value: "travel" },
];

const CATEGORY_KEYWORDS: Record<string, string> = {
  fashion: "shirt", mens: "shirt", womens: "dress", footwear: "shoes",
  accessories: "bag", arts: "art", automotive: "car", auto_parts: "tyre",
  beauty: "cream", skincare: "serum", haircare: "shampoo", books: "book",
  industrial: "machine", office: "pen", electronics: "phone", phones: "phone",
  computers: "laptop", audio: "headphone", cameras: "camera", food: "rice",
  beverages: "tea", organic: "organic", health: "vitamin", supplements: "protein",
  medical: "mask", home: "furniture", furniture: "sofa", kitchen: "pan",
  bedding: "pillow", garden: "plant", jewelry: "ring", luggage: "bag",
  movies: "movie", games: "game", pets: "dog", religious: "prayer",
  sports: "gym", cricket: "bat", fitness: "dumbbell", toys: "toy", travel: "travel",
};

export default function SearchBar() {
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  function handleCategoryChange(val: string) {
    setCategory(val);
    setQuery(CATEGORY_KEYWORDS[val] || "");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!category) { setError("Please select a category before searching."); return; }
    if (!query.trim()) { setError("Please enter a product name before searching."); return; }
    setError("");
    const params = new URLSearchParams({ q: query.trim(), cat: category });
    window.location.href = `https://shopping.digitalrohtak.online?${params.toString()}`;
  }

  return (
    <form
      onSubmit={handleSearch}
      className="bg-white rounded-2xl shadow-2xl p-4 flex flex-col sm:flex-row gap-3 w-full max-w-3xl mx-auto"
    >
      {/* Category dropdown */}
      <select
        value={category}
        onChange={(e) => { handleCategoryChange(e.target.value); setError(""); }}
        className={`flex-1 border-2 rounded-xl px-3 py-3 text-gray-700 font-semibold focus:outline-none bg-white text-sm ${
          error && !category ? "border-red-500 focus:border-red-500" : "border-[#F47216] focus:border-[#00A650]"
        }`}
      >
        {GOOGLE_CATEGORIES.map((cat) => (
          <option key={cat.value} value={cat.value}>
            {cat.label}
          </option>
        ))}
      </select>

      {/* Search input */}
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setError(""); }}
        placeholder="Search products..."
        className={`flex-1 border-2 rounded-xl px-4 py-3 text-gray-700 focus:outline-none text-sm ${
          error && !query.trim() ? "border-red-500 focus:border-red-500" : "border-[#00A650] focus:border-[#F47216]"
        }`}
      />

      <button
        type="submit"
        className="bg-[#00A650] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#F47216] transition-colors whitespace-nowrap"
      >
        🔍 Search
      </button>
      {error && (
        <div className="w-full bg-red-50 border border-red-300 text-red-600 text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2">
          ⚠️ {error}
        </div>
      )}
    </form>
  );
}
