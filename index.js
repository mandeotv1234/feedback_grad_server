const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database table if not exists
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255),
        student_id VARCHAR(50),
        ui_layout INT,
        ui_editor INT,
        ui_testcase INT,
        ui_submission INT,
        psych_autosave VARCHAR(50),
        psych_network_issues TEXT,
        psych_proctoring TEXT,
        wishlist_features JSONB,
        wishlist_custom_feature TEXT,
        wishlist_fairness TEXT,
        wishlist_message TEXT,
        nps_score INT,
        adoption_willingness VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

initDb();

// Routes
app.post('/api/feedback', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      fullName,
      studentId,
      uiLayout,
      uiEditor,
      uiTestcase,
      uiSubmission,
      psychAutosave,
      psychNetworkIssues,
      psychProctoring,
      wishlistFeatures,
      wishlistCustomFeature,
      wishlistFairness,
      wishlistMessage,
      npsScore,
      adoptionWillingness
    } = req.body;

    const query = `
      INSERT INTO feedback (
        full_name, student_id, ui_layout, ui_editor, ui_testcase, ui_submission,
        psych_autosave, psych_network_issues, psych_proctoring,
        wishlist_features, wishlist_custom_feature, wishlist_fairness, wishlist_message,
        nps_score, adoption_willingness
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;
    `;

    const values = [
      fullName, studentId, uiLayout, uiEditor, uiTestcase, uiSubmission,
      psychAutosave, psychNetworkIssues, psychProctoring,
      JSON.stringify(wishlistFeatures), wishlistCustomFeature, wishlistFairness, wishlistMessage,
      npsScore, adoptionWillingness
    ];

    const result = await client.query(query, values);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

app.get('/api/feedback/all', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
