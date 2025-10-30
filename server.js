require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./database");
const countryRoutes = require("./routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Country Currency API",
    version: "1.0.0",
    endpoints: {
      refresh: "POST /countries/refresh",
      getAll: "GET /countries",
      getOne: "GET /countries/:name",
      delete: "DELETE /countries/:name",
      status: "GET /status",
      image: "GET /countries/image",
    },
  });
});

// Status endpoint
app.get("/status", async (req, res) => {
  try {
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as count FROM countries"
    );
    const [metadataResult] = await pool.query(
      "SELECT value FROM metadata WHERE key_name = 'last_refreshed_at'"
    );

    res.json({
      total_countries: countResult[0].count,
      last_refreshed_at: metadataResult[0]?.value || null,
    });
  } catch (error) {
    console.error("Error getting status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Country routes
app.use("/countries", countryRoutes);

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    const connection = await pool.getConnection();
    console.log("Database connected successfully");

    // Create tables if they don't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS countries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        capital VARCHAR(255) NULL,
        region VARCHAR(100) NULL,
        population BIGINT NOT NULL,
        currency_code VARCHAR(10) NULL,
        exchange_rate DECIMAL(20,6) NULL,
        estimated_gdp DECIMAL(30,2) NULL,
        flag_url TEXT NULL,
        last_refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_region (region),
        INDEX idx_currency (currency_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS metadata (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_name VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      INSERT IGNORE INTO metadata (key_name, value) 
      VALUES ('last_refreshed_at', NULL);
    `);

    connection.release();
    console.log("Database tables initialized");

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
