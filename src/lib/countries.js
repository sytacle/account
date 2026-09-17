const REST_COUNTRIES_URL = import.meta.env.VITE_REST_COUNTRIES_URL || "https://api.restcountries.com/countries/v5?response_fields=names.common,codes.alpha_2&limit=300";
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
        if (!Array.isArray(data?.data?.objects)) throw new Error("Invalid countries response");
        return data.data.objects
          .filter((country) => country.codes?.alpha_2 && country.names?.common)
          .map((country) => [country.codes.alpha_2, country.names.common])
          .sort((a, b) => a[1].localeCompare(b[1]));
      })
      .catch((error) => {
        countriesRequest = undefined;
        throw error;
      });
  }
  return countriesRequest;
}
