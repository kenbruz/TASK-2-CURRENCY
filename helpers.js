const axios = require("axios");


// API URLs
const COUNTRIES_API_URL =
  "https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies";
const EXCHANGE_RATES_API_URL = "https://open.er-api.com/v6/latest/USD";

// Fetch countries from external API
async function fetchCountriesAPI() {
  try {
    const response = await axios.get(COUNTRIES_API_URL, { timeout: 10000 });
    return response.data;
  } catch (error) {
    throw new Error("Could not fetch data from RestCountries API");
  }
}

// Fetch exchange rates from external API
async function fetchRatesAPI() {
  try {
    const response = await axios.get(EXCHANGE_RATES_API_URL, { timeout: 10000 });
    return response.data.rates;
  } catch (error) {
    throw new Error("Could not fetch data from Exchange Rates API");
  }
}

// Generate random multiplier for GDP calculation
function getRandomMultiplier() {
  return Math.random() * (2000 - 1000) + 1000;
}


module.exports = {
  fetchCountriesAPI,
  fetchRatesAPI,
  getRandomMultiplier,
 
};

