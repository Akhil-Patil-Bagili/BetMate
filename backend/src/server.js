require('dotenv').config();
const app = require('./app'); // Make sure the path to app.js is correct

// const cron = require('node-cron');
const matchController = require('./controllers/matchController');

// cron.schedule('0 0 * * *', () => {  // This runs at midnight every day
//     console.log('Fetching cricket matches...');
//     matchController.fetchMatches();
//   });

// Add this in your server.js for a one-time manual trigger
matchController.fetchMatches();

// const { deleteAllData } = require('./prismaClient');

// async function deleteData() {
//   try {
//     await deleteAllData();
//     console.log('All data deleted successfully.');
//   } catch (error) {
//     console.error('Error deleting data:', error);
//   }
// }

// deleteData();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
