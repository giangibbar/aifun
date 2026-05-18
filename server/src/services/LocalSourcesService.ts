/**
 * LocalSourcesService — Auto-discovers local event sources based on city.
 * Covers Italian local news networks (Today, 24, Primocanale, etc.)
 */

// Map of cities to their local news event pages
const CITY_SOURCES: Record<string, Array<{ name: string; url: string }>> = {
  genova: [
    { name: "GenovaToday Eventi", url: "https://www.genovatoday.it/eventi/" },
    { name: "Genova24 Eventi", url: "https://www.genova24.it/eventi/" },
    { name: "Primocanale Eventi", url: "https://www.primocanale.it/eventi/" },
    { name: "Il Secolo XIX Eventi", url: "https://www.ilsecoloxix.it/genova/eventi/" },
  ],
  milano: [
    { name: "MilanoToday Eventi", url: "https://www.milanotoday.it/eventi/" },
    { name: "Milano24 Eventi", url: "https://www.milano24ore.it/eventi/" },
    { name: "Vivimilano", url: "https://vivimilano.corriere.it/eventi/" },
  ],
  roma: [
    { name: "RomaToday Eventi", url: "https://www.romatoday.it/eventi/" },
    { name: "Roma24", url: "https://www.roma24ore.it/eventi/" },
  ],
  torino: [
    { name: "TorinoToday Eventi", url: "https://www.torinotoday.it/eventi/" },
    { name: "Torino24", url: "https://www.torino24ore.it/eventi/" },
  ],
  firenze: [
    { name: "FirenzeToday Eventi", url: "https://www.firenzetoday.it/eventi/" },
  ],
  bologna: [
    { name: "BolognaToday Eventi", url: "https://www.bolognatoday.it/eventi/" },
  ],
  napoli: [
    { name: "NapoliToday Eventi", url: "https://www.napolitoday.it/eventi/" },
  ],
  palermo: [
    { name: "PalermoToday Eventi", url: "https://www.palermotoday.it/eventi/" },
  ],
  bari: [
    { name: "BariToday Eventi", url: "https://www.baritoday.it/eventi/" },
  ],
  venezia: [
    { name: "VeneziaToday Eventi", url: "https://www.veneziatoday.it/eventi/" },
  ],
  padova: [
    { name: "PadovaToday Eventi", url: "https://www.padovaoggi.it/eventi/" },
  ],
  verona: [
    { name: "VeronaToday Eventi", url: "https://www.veronasera.it/eventi/" },
  ],
  catania: [
    { name: "CataniaToday Eventi", url: "https://www.cataniatoday.it/eventi/" },
  ],
  trieste: [
    { name: "TriesteToday Eventi", url: "https://www.triesteprima.it/eventi/" },
  ],
  brescia: [
    { name: "BresciaToday Eventi", url: "https://www.bresciatoday.it/eventi/" },
  ],
  perugia: [
    { name: "PerugiaToday Eventi", url: "https://www.perugiatoday.it/eventi/" },
  ],
};

// Fallback: try [city]today.it/eventi/ pattern
function getGenericTodayUrl(city: string): { name: string; url: string } | null {
  const slug = city.toLowerCase().replace(/\s+/g, "");
  return { name: `${city}Today Eventi`, url: `https://www.${slug}today.it/eventi/` };
}

export function getLocalSources(city: string): Array<{ name: string; url: string }> {
  const key = city.toLowerCase().trim();
  
  // Exact match
  if (CITY_SOURCES[key]) return CITY_SOURCES[key];
  
  // Partial match
  for (const [k, sources] of Object.entries(CITY_SOURCES)) {
    if (key.includes(k) || k.includes(key)) return sources;
  }
  
  // Fallback: try generic Today pattern
  const generic = getGenericTodayUrl(city);
  return generic ? [generic] : [];
}

export function getAllSupportedCities(): string[] {
  return Object.keys(CITY_SOURCES);
}
