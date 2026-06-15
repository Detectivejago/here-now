import type { City } from "@/lib/types";

export type LocationPreset = {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  keywords: string[];
};

const locationPresetsBySlug: Record<string, LocationPreset[]> = {
  milano: [
    {
      label: "Duomo",
      address: "Duomo, Milano",
      latitude: 45.4641,
      longitude: 9.1919,
      keywords: ["centro", "duomo", "piazza"]
    },
    {
      label: "Brera",
      address: "Brera, Milano",
      latitude: 45.472,
      longitude: 9.187,
      keywords: ["arte", "brera", "centro"]
    },
    {
      label: "Navigli",
      address: "Navigli, Milano",
      latitude: 45.451,
      longitude: 9.174,
      keywords: ["navigli", "darsena", "drink"]
    },
    {
      label: "Porta Nuova",
      address: "Porta Nuova, Milano",
      latitude: 45.484,
      longitude: 9.191,
      keywords: ["porta nuova", "garibaldi", "isola"]
    },
    {
      label: "Porta Romana",
      address: "Porta Romana, Milano",
      latitude: 45.4528,
      longitude: 9.2028,
      keywords: ["porta romana", "romana"]
    },
    {
      label: "CityLife",
      address: "CityLife, Milano",
      latitude: 45.4781,
      longitude: 9.1557,
      keywords: ["citylife", "tre torri"]
    }
  ],
  parigi: [
    {
      label: "Le Marais",
      address: "Le Marais, Paris",
      latitude: 48.859,
      longitude: 2.362,
      keywords: ["marais", "arte", "centro"]
    },
    {
      label: "Montmartre",
      address: "Montmartre, Paris",
      latitude: 48.8867,
      longitude: 2.3431,
      keywords: ["montmartre", "sacre coeur"]
    },
    {
      label: "Saint-Germain",
      address: "Saint-Germain, Paris",
      latitude: 48.8543,
      longitude: 2.3332,
      keywords: ["saint germain", "rive gauche"]
    },
    {
      label: "Canal Saint-Martin",
      address: "Canal Saint-Martin, Paris",
      latitude: 48.8718,
      longitude: 2.3651,
      keywords: ["canal", "saint martin"]
    }
  ],
  amsterdam: [
    {
      label: "Jordaan",
      address: "Jordaan, Amsterdam",
      latitude: 52.37,
      longitude: 4.895,
      keywords: ["jordaan", "canali"]
    },
    {
      label: "De Pijp",
      address: "De Pijp, Amsterdam",
      latitude: 52.3547,
      longitude: 4.8977,
      keywords: ["de pijp", "mercato"]
    },
    {
      label: "Museumplein",
      address: "Museumplein, Amsterdam",
      latitude: 52.3584,
      longitude: 4.8811,
      keywords: ["museumplein", "museo"]
    },
    {
      label: "NDSM",
      address: "NDSM, Amsterdam",
      latitude: 52.401,
      longitude: 4.892,
      keywords: ["ndsm", "noord"]
    }
  ],
  "new-york": [
    {
      label: "Flatiron",
      address: "Flatiron, New York",
      latitude: 40.741,
      longitude: -73.989,
      keywords: ["flatiron", "manhattan"]
    },
    {
      label: "SoHo",
      address: "SoHo, New York",
      latitude: 40.7233,
      longitude: -74.003,
      keywords: ["soho", "gallery"]
    },
    {
      label: "Lower East Side",
      address: "Lower East Side, New York",
      latitude: 40.715,
      longitude: -73.9843,
      keywords: ["lower east side", "les"]
    },
    {
      label: "Williamsburg",
      address: "Williamsburg, Brooklyn",
      latitude: 40.7081,
      longitude: -73.9571,
      keywords: ["williamsburg", "brooklyn"]
    },
    {
      label: "Chelsea",
      address: "Chelsea, New York",
      latitude: 40.7465,
      longitude: -74.0014,
      keywords: ["chelsea", "gallerie"]
    }
  ]
};

export function getLocationPresets(city: City | undefined | null) {
  if (!city) {
    return [];
  }

  const cityCenter: LocationPreset = {
    label: city.name,
    address: `${city.name} centro`,
    latitude: city.latitude,
    longitude: city.longitude,
    keywords: [city.name.toLowerCase(), "centro"]
  };

  return [cityCenter, ...(locationPresetsBySlug[city.slug] ?? [])];
}

export function filterLocationPresets(presets: LocationPreset[], query: string) {
  const cleanQuery = query.trim().toLowerCase();

  if (!cleanQuery) {
    return presets.slice(0, 6);
  }

  return presets
    .filter((preset) => {
      const haystack = [preset.label, preset.address, ...preset.keywords].join(" ").toLowerCase();
      return haystack.includes(cleanQuery);
    })
    .slice(0, 6);
}
