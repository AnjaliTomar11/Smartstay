require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[SmartStay] Backend Server running on port ${PORT}`);
  console.log(`[SmartStay] Environment: ${process.env.NODE_ENV || 'development'}`);
});
