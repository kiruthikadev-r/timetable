require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 5131;

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Timetable API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
