"use client";

import { ChevronsUpDown } from "lucide-react";
import type { City } from "@/lib/types";

type CitySelectProps = {
  cities: City[];
  value: string;
  onChange: (cityId: string) => void;
};

export default function CitySelect({ cities, value, onChange }: CitySelectProps) {
  return (
    <label className="city-select-wrap" aria-label="Seleziona città">
      <select
        className="city-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </select>
      <ChevronsUpDown className="city-select-icon" aria-hidden="true" size={28} />
    </label>
  );
}
