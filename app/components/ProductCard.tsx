"use client";
import { useState } from "react";

interface Variant {
  id: string;
  title: string;
  prices?: { amount: number; currency_code: string }[];
}

interface Product {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  variants?: Variant[];
}

interface Props {
  product: Product;
  onAddToCart: (variantId: string, quantity: number) => void;
  quantities: Record<string, number>;
  onQtyChange: (variantId: string, qty: number) => void;
}

export default function ProductCard({ product, onAddToCart, quantities, onQtyChange }: Props) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0]);
  const price = selectedVariant?.prices?.[0];
  const qty = quantities[selectedVariant?.id || ""] || 0;

  function inc() {
    const id = selectedVariant?.id;
    if (!id) return;
    onQtyChange(id, qty + 1);
  }

  function dec() {
    const id = selectedVariant?.id;
    if (!id) return;
    if (qty > 0) onQtyChange(id, qty - 1);
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden flex flex-col">
      {/* Image */}
      <div className="bg-gray-50 h-24 flex items-center justify-center overflow-hidden">
        {product.thumbnail
          ? <img src={product.thumbnail} alt={product.title} className="h-full w-full object-cover" />
          : <span className="text-4xl">🛍️</span>}
      </div>

      <div className="p-2 flex flex-col flex-1">
        {/* Title */}
        <p className="text-gray-800 font-semibold text-xs leading-tight line-clamp-2 mb-1">{product.title}</p>

        {/* Price */}
        <p className="text-[#00A650] font-extrabold text-sm mb-1">
          {price ? `₹${(price.amount / 100).toFixed(0)}` : "—"}
        </p>

        {/* Variant selector — only if >1 variant */}
        {(product.variants?.length || 0) > 1 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {product.variants?.slice(0, 4).map(v => (
              <button key={v.id}
                onClick={() => setSelectedVariant(v)}
                className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                  selectedVariant?.id === v.id
                    ? "bg-[#F47216] text-white border-[#F47216]"
                    : "border-gray-300 text-gray-500"
                }`}>
                {v.title}
              </button>
            ))}
          </div>
        )}

        {/* Add / Qty stepper */}
        <div className="mt-auto">
          {qty === 0 ? (
            <button
              onClick={() => { onQtyChange(selectedVariant?.id || "", 1); }}
              className="w-full bg-[#F47216] text-white text-xs font-bold py-1.5 rounded-lg hover:bg-[#00A650] transition-colors">
              + Add
            </button>
          ) : (
            <div className="flex items-center justify-between bg-[#F47216] rounded-lg overflow-hidden">
              <button onClick={dec} className="text-white font-extrabold text-lg px-3 py-1 hover:bg-black/10">−</button>
              <span className="text-white font-extrabold text-sm">{qty}</span>
              <button onClick={inc} className="text-white font-extrabold text-lg px-3 py-1 hover:bg-black/10">+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
