const axios = require("axios");
const { createCanvas } = require("canvas");
const fs = require("fs").promises;
const path = require("path");

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

// Format number with commas
function formatNumber(num) {
  if (num === null || num === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// Format timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return "Never";
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

// Generate summary image
async function generateImage(totalCountries, topCountries, lastRefreshed) {
  const cacheDir = path.join(__dirname, "../cache");
  const imagePath = path.join(cacheDir, "summary.png");

  // Create cache directory if it doesn't exist
  try {
    await fs.access(cacheDir);
  } catch {
    await fs.mkdir(cacheDir, { recursive: true });
  }

  // Create canvas
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#f0f4f8";
  ctx.fillRect(0, 0, width, height);

  // Header background
  ctx.fillStyle = "#1e40af";
  ctx.fillRect(0, 0, width, 100);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Country Data Summary", width / 2, 60);

  // Total countries box
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(50, 130, 700, 80);
  ctx.strokeStyle = "#1e40af";
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 130, 700, 80);

  ctx.fillStyle = "#1e40af";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Total Countries:", 70, 165);

  ctx.font = "bold 32px Arial";
  ctx.fillStyle = "#059669";
  ctx.fillText(totalCountries.toString(), 70, 200);

  // Top 5 countries section
  ctx.fillStyle = "#1e40af";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Top 5 Countries by Estimated GDP:", 50, 250);

  // List top countries
  let yPosition = 290;
  ctx.font = "18px Arial";
  ctx.fillStyle = "#374151";

  topCountries.forEach((country, index) => {
    const rank = `${index + 1}.`;
    const countryText = country.name;
    const gdpText = `$${formatNumber(country.estimated_gdp)}`;

    ctx.fillStyle = "#1e40af";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "left";
    ctx.fillText(rank, 70, yPosition);

    ctx.fillStyle = "#374151";
    ctx.font = "18px Arial";
    ctx.fillText(countryText, 110, yPosition);

    ctx.fillStyle = "#059669";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "right";
    ctx.fillText(gdpText, 730, yPosition);

    yPosition += 35;
  });

  // Last refresh timestamp
  ctx.fillStyle = "#6b7280";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  const refreshText = `Last Refreshed: ${formatTimestamp(lastRefreshed)}`;
  ctx.fillText(refreshText, width / 2, height - 30);

  // Border
  ctx.strokeStyle = "#1e40af";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, width, height);

  // Save to file
  const buffer = canvas.toBuffer("image/png");
  await fs.writeFile(imagePath, buffer);

  return imagePath;
}

// Check if image exists
async function imageExists() {
  const imagePath = path.join(__dirname, "../cache/summary.png");
  try {
    await fs.access(imagePath);
    return true;
  } catch {
    return false;
  }
}

// Get image path
function getImagePath() {
  return path.join(__dirname, "../cache/summary.png");
}

module.exports = {
  fetchCountriesAPI,
  fetchRatesAPI,
  getRandomMultiplier,
  generateImage,
  imageExists,
  getImagePath,
};

