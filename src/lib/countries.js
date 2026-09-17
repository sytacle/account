const REST_COUNTRIES_URL = import.meta.env.VITE_REST_COUNTRIES_URL || "https://restcountries.com/v3.1/all?fields=name,cca2";
const REST_COUNTRIES_API_KEY = import.meta.env.VITE_REST_COUNTRIES_API_KEY;

let countriesRequest;

export const fallbackCountries = [
  ["US", "United States"],
  ["GB", "United Kingdom"],
  ["CA", "Canada"],
  ["AU", "Australia"],
  ["PH", "Philippines"],
  ["JP", "Japan"],
];

function normalizeCountries(data) {
  const source = Array.isArray(data)
    ? data
    : Array.isArray(data?.data?.objects)
      ? data.data.objects
      : Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.data)
          ? data.data
          : [];

  return source
    .map((country) => {
      const code = country?.cca2 || country?.codes?.alpha_2 || country?.alpha2 || country?.code;
      const name = country?.name?.common || country?.names?.common || country?.name || country?.label;
      if (!code || !name) return null;
      return [String(code), String(name)];
    })
    .filter(Boolean)
    .sort((a, b) => a[1].localeCompare(b[1]));
}

export function getCountries() {
  if (!countriesRequest) {
    countriesRequest = fetch(REST_COUNTRIES_URL, {
      headers: REST_COUNTRIES_API_KEY ? { Authorization: `Bearer ${REST_COUNTRIES_API_KEY}` } : {},
    })
      .then((response) => {
        if (!response.ok) throw new Error("Countries unavailable");
        return response.json();
      })
      .then((data) => {
        const countries = normalizeCountries(data);
        if (!countries.length) throw new Error("Invalid countries response");
        return countries;
      })
      .catch((error) => {
        countriesRequest = undefined;
        throw error;
      });
  }
  return countriesRequest;
}
