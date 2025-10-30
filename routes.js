const express = require("express");
const router = express.Router();
const pool = require("./database");
const {
  fetchCountriesAPI,
  fetchRatesAPI,
  getRandomMultiplier,
  generateImage,
  imageExists,
  getImagePath,
} = require("./helpers");

// POST /countries/refresh - Fetch and cache country data
router.post("/refresh", async (req, res) => {
  try {
    // Fetch data from both APIs
    const countries = await fetchCountriesAPI();
    const rates = await fetchRatesAPI();

    let inserted = 0;
    let updated = 0;

    // Process each country
    for (const country of countries) {
      let currencyCode = null;
      let exchangeRate = null;
      let estimatedGdp = null;

      // Get first currency if available
      if (country.currencies && country.currencies.length > 0) {
        currencyCode = country.currencies[0].code || null;

        // Get exchange rate
        if (currencyCode && rates[currencyCode]) {
          exchangeRate = rates[currencyCode];
          const multiplier = getRandomMultiplier();
          estimatedGdp = (country.population * multiplier) / exchangeRate;
        }
      }

      // Check if country exists
      const existing = await pool.query(
        "SELECT id FROM countries WHERE LOWER(name) = LOWER($1)",
        [country.name]
      );

      if (existing.rows.length > 0) {
        // Update existing country
        await pool.query(
          `UPDATE countries SET 
            capital = $1, region = $2, population = $3, 
            currency_code = $4, exchange_rate = $5, estimated_gdp = $6, 
            flag_url = $7, last_refreshed_at = CURRENT_TIMESTAMP
          WHERE LOWER(name) = LOWER($8)`,
          [
            country.capital || null,
            country.region || null,
            country.population,
            currencyCode,
            exchangeRate,
            estimatedGdp,
            country.flag || null,
            country.name,
          ]
        );
        updated++;
      } else {
        // Insert new country
        await pool.query(
          `INSERT INTO countries 
            (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
          [
            country.name,
            country.capital || null,
            country.region || null,
            country.population,
            currencyCode,
            exchangeRate,
            estimatedGdp,
            country.flag || null,
          ]
        );
        inserted++;
      }
    }

    // Update last refreshed timestamp
    const timestamp = new Date().toISOString();
    await pool.query(
      "UPDATE metadata SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key_name = $2",
      [timestamp, "last_refreshed_at"]
    );

    // Generate summary image
    const countResult = await pool.query(
      "SELECT COUNT(*) as count FROM countries"
    );
    const totalCountries = parseInt(countResult.rows[0].count);

    const topCountries = await pool.query(
      "SELECT name, estimated_gdp FROM countries WHERE estimated_gdp IS NOT NULL ORDER BY estimated_gdp DESC LIMIT 5"
    );

    await generateImage(totalCountries, topCountries.rows, timestamp);

    res.json({
      message: `Refreshed ${inserted + updated} countries`,
      inserted: inserted,
      updated: updated,
      timestamp: timestamp,
    });
  } catch (error) {
    console.error("Error refreshing countries:", error);
    res.status(503).json({
      error: "External data source unavailable",
      details: error.message,
    });
  }
});

// GET /countries - Get all countries with filters and sorting
router.get("/", async (req, res) => {
  try {
    const { region, currency, sort } = req.query;

    let query = "SELECT * FROM countries WHERE 1=1";
    const params = [];
    let paramCount = 1;

    // Add filters
    if (region) {
      query += ` AND region = $${paramCount}`;
      params.push(region);
      paramCount++;
    }

    if (currency) {
      query += ` AND currency_code = $${paramCount}`;
      params.push(currency);
      paramCount++;
    }

    // Add sorting
    if (sort === "gdp_desc") {
      query += " ORDER BY estimated_gdp DESC NULLS LAST";
    } else if (sort === "gdp_asc") {
      query += " ORDER BY estimated_gdp ASC NULLS LAST";
    } else if (sort === "population_desc") {
      query += " ORDER BY population DESC";
    } else if (sort === "population_asc") {
      query += " ORDER BY population ASC";
    } else if (sort === "name_asc") {
      query += " ORDER BY name ASC";
    } else if (sort === "name_desc") {
      query += " ORDER BY name DESC";
    } else {
      query += " ORDER BY id ASC";
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting countries:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /countries/image - Serve summary image
router.get("/image", async (req, res) => {
  try {
    const exists = await imageExists();
    if (!exists) {
      return res.status(404).json({ error: "Summary image not found" });
    }
    res.sendFile(getImagePath());
  } catch (error) {
    console.error("Error serving image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /countries/:name - Get single country
router.get("/:name", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM countries WHERE LOWER(name) = LOWER($1)",
      [req.params.name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Country not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error getting country:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /countries/:name - Delete country
router.delete("/:name", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM countries WHERE LOWER(name) = LOWER($1)",
      [req.params.name]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Country not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting country:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
