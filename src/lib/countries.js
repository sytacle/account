const REST_COUNTRIES_BASE_URL =
  import.meta.env.VITE_REST_COUNTRIES_URL || "https://api.restcountries.com/countries/v5";
const REST_COUNTRIES_API_KEY = import.meta.env.VITE_REST_COUNTRIES_API_KEY;
const PAGE_LIMIT = 100; // max page size on the free plan (500 on paid)

let countriesRequest;

export const fallbackCountries = [
  ["US", "United States"],
  ["GB", "United Kingdom"],
  ["CA", "Canada"],
  ["AU", "Australia"],
  ["PH", "Philippines"],
  ["JP", "Japan"],
];

function normalizeCountries(objects) {
  return objects
    .map((country) => {
      const code = country?.codes?.alpha_2;
      const name = country?.names?.common;
      if (!code || !name) return null;
      return [String(code), String(name)];
    })
    .filter(Boolean)
    .sort((a, b) => a[1].localeCompare(b[1]));
}

async function fetchAllCountries() {
  if (!REST_COUNTRIES_API_KEY) {
    // v5 requires a key on every request (Bearer header, or ?api-key= as a fallback).
    throw new Error(
      "Missing VITE_REST_COUNTRIES_API_KEY: the REST Countries v5 API requires an API key."
    );
  }

  const objects = [];
  let offset = 0;

  while (true) {
    const url = new URL(REST_COUNTRIES_BASE_URL);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("offset", String(offset));
    // Trim the payload to just what the UI needs.
    url.searchParams.set("response_fields", "names.common,codes.alpha_2");

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${REST_COUNTRIES_API_KEY}` },
    });

    if (!response.ok) {
      let message = `Countries request failed (${response.status})`;
      try {
        const body = await response.json();
        if (body?.errors?.[0]?.message) message = body.errors[0].message;
      } catch {
        // ignore parse failure, use the generic message
      }
      throw new Error(message);
    }

    const body = await response.json();
    const page = body?.data?.objects;
    if (!Array.isArray(page)) throw new Error("Invalid countries response");

    objects.push(...page);

    const meta = body?.data?.meta;
    if (!meta?.more) break;
    offset += meta.count ?? PAGE_LIMIT;
  }

  return objects;
}

export function getCountries() {
  if (!countriesRequest) {
    countriesRequest = fetchAllCountries()
      .then((objects) => {
        const countries = normalizeCountries(objects);
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
