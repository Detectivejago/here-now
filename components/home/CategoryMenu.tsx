"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { Category, Locale } from "@/lib/types";

type CategoryMenuProps = {
  categories: Category[];
  locale: Locale;
  selectedCategoryId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (categoryId: string | null) => void;
};

function categoryName(category: Category, locale: Locale) {
  return locale === "it" ? category.name_it : category.name_en;
}

export default function CategoryMenu({
  categories,
  locale,
  selectedCategoryId,
  isOpen,
  onToggle,
  onSelect
}: CategoryMenuProps) {
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const label = selectedCategory
    ? categoryName(selectedCategory, locale)
    : locale === "it"
      ? "Filtra Categorie"
      : "Filter Categories";

  return (
    <div className="category-menu">
      {isOpen ? (
        <div className="category-list" role="menu" aria-label="Categorie eventi">
          <button
            className={`category-option ${selectedCategoryId === null ? "active" : ""}`}
            type="button"
            role="menuitem"
            onClick={() => onSelect(null)}
          >
            <span
              className="category-dot"
              style={{ "--category-color": "#173F72" } as React.CSSProperties}
            />
            {locale === "it" ? "Tutte le categorie" : "All categories"}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              className={`category-option ${
                selectedCategoryId === category.id ? "active" : ""
              }`}
              type="button"
              role="menuitem"
              onClick={() => onSelect(category.id)}
            >
              <span
                className="category-dot"
                style={{ "--category-color": category.color } as React.CSSProperties}
              />
              {categoryName(category, locale)}
            </button>
          ))}
        </div>
      ) : null}
      <button
        className="category-trigger"
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <SlidersHorizontal aria-hidden="true" size={24} />
        <span>{label}</span>
        <ChevronDown aria-hidden="true" size={28} />
      </button>
    </div>
  );
}
