const axios = require('axios');
const prisma = require('../prismaClient');
require('dotenv').config();

exports.fetchAndUpdateMatches = async () => {
  try {
      // Fetch the latest match data from the API
      const response = await axios.get('https://cricbuzz-cricket.p.rapidapi.com/series/v1/7607', {
          headers: {
              'X-RapidAPI-Key': process.env.X_RAPIDAPI_KEY,
              'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com'
          }
      });

      console.log(JSON.stringify(response.data, null, 2)); // For debugging

      const matches = response.data.matchDetails.flatMap(detail => {
          return detail.matchDetailsMap && detail.matchDetailsMap.match ? detail.matchDetailsMap.match.map(match => {
            let winner = 'unknown';

            // Only determine a winner if the match was completed
            if (match.matchInfo.state === 'complete') {
                const status = match.matchInfo.status.toLowerCase();

                if (status.includes('won by')) {
                    const winningTeamFullName = match.matchInfo.status.split(' won by')[0].trim();

                    if (winningTeamFullName.toLowerCase() === match.matchInfo.team1.teamName.toLowerCase()) {
                        winner = match.matchInfo.team1.teamSName;
                    } else if (winningTeamFullName.toLowerCase() === match.matchInfo.team2.teamName.toLowerCase()) {
                        winner = match.matchInfo.team2.teamSName;
                    }
                      else {
                        winner = "unknown"
                    }
                }
            }

              return {
                  id: match.matchInfo.matchId, // Use matchId as the unique identifier
                  date: new Date(parseInt(match.matchInfo.startDate)),
                  team1: match.matchInfo.team1.teamSName,
                  team2: match.matchInfo.team2.teamSName,
                  matchDescription: match.matchInfo.matchDesc,
                  location: `${match.matchInfo.venueInfo.ground}, ${match.matchInfo.venueInfo.city}`,
                  matchType: match.matchInfo.matchFormat,
                  seriesName: match.matchInfo.seriesName,
                  state: match.matchInfo.state,
                  status: match.matchInfo.status,
                  winner: winner
              };
          }) : [];
      }).filter(match => match);

      console.log('Matches array:', matches); // Debugging step

      for (const match of matches) {
          // Upsert the match record to prevent duplication
          await prisma.match.upsert({
              where: {
                  id: match.id // Use matchId to identify unique matches
              },
              update: {
                  date: match.date,
                  team1: match.team1,
                  team2: match.team2,
                  matchDescription: match.matchDescription,
                  location: match.location,
                  matchType: match.matchType,
                  seriesName: match.seriesName,
                  state: match.state,
                  status: match.status,
                  winner: match.winner
              },
              create: match
          });

          // Update user scores if the match is complete
          if (match.state === 'complete') {
              await updateUserScores(match.id, match.winner);
          }
      }

      console.log('Matches stored/updated successfully.');
  } catch (error) {
      console.error('Error fetching or storing matches:', error.message);
      if (error.response) {
          console.error('Error details:', error.response.status, error.response.data);
      }
  }
};
  
  // Function to update user scores based on match results
  const updateUserScores = async (matchId, winner) => {
    try {
        console.log(`Updating scores for matchId: ${matchId} with winner: ${winner}`);

        const matchBetmates = await prisma.matchBetmate.findMany({
            where: { matchId }
        });

        if (matchBetmates.length === 0) {
            console.log(`No betmates found for matchId: ${matchId}`);
            return;
        }

        const processedPairs = new Set();

        for (const betmate of matchBetmates) {
            const userId = betmate.userId;
            const betmateId = betmate.betmateId;

            // Ensure the user-betmate pair is processed only once for this match
            if (processedPairs.has(`${userId}-${betmateId}`) || processedPairs.has(`${betmateId}-${userId}`)) {
                console.log(`Scores already updated for user-betmate pair: ${userId}-${betmateId}, skipping...`);
                continue;
            }

            console.log(`Processing betmate: ${betmate.id} - userChoice: ${betmate.userChoice}, betmateChoice: ${betmate.betmateChoice}`);

            let points = 0;
            let userStatus = "lost";
            let betmateStatus = "won";

            if (betmate.userChoice === winner) {
              points = 10;
              userStatus = "won";
              betmateStatus = "lost";
              console.log(`User ${betmate.userId} wins, awarding ${points} points.`);
            } else if (betmate.betmateChoice === winner) {
              points = -10;
              userStatus = "lost";
              betmateStatus = "won";
              console.log(`User ${betmate.userId} loses, subtracting ${Math.abs(points)} points.`);
            }
            else{
              points = 0;
              userStatus = "unknown"
              betmateStatus = "unknown"
            }

            // Update the MatchBetmate record with points and status for the user
            await prisma.matchBetmate.update({
              where: { id: betmate.id },
              data: {
                userScore: {
                  increment: points,
                },
                status: userStatus,
              },
            });

            // Update the MatchBetmate record with the inverse status for the betmate
            const betmateRecord = await prisma.matchBetmate.findFirst({
              where: {
                userId: betmate.betmateId,
                matchId: betmate.matchId,
                betmateId: betmate.userId
              }
            });

            if (betmateRecord) {
              await prisma.matchBetmate.update({
                where: { id: betmateRecord.id },
                data: {
                  userScore: {
                    increment: -points,
                  },
                  status: betmateStatus,
                },
              });
            }

            // Mark this user-betmate pair as processed for this match
            processedPairs.add(`${userId}-${betmateId}`);
            processedPairs.add(`${betmateId}-${userId}`);

            console.log(`Updated scores for betmate: ${betmate.id}`);
        }
    } catch (error) {
        console.error('Error updating user scores:', error.message);
    }
};
  
  // Get upcoming matches
  exports.matches = async (req, res) => {
    try {
      const matches = await prisma.match.findMany({
        where: { 
          seriesName: "Indian Premier League 2024"
        }, 
        orderBy: { date: 'asc' }
      });
      res.json(matches);
    } catch (error) {
      console.error('Error retrieving matches:', error);
      res.status(500).json({ message: "Failed to retrieve matches", error: error.message });
    }
  };
  
  // Get match by ID
  exports.getMatchById = async (req, res) => {
    const matchId = parseInt(req.params.id, 10);
  
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId }
      });
  
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
  
      res.json(match);
    } catch (error) {
      console.error('Error retrieving match:', error);
      res.status(500).json({ message: "Failed to retrieve match", error: error.message });
    }
  };
