// Firebase configuration for global game session sync
// Simple setup: one active game session shared across all devices

const firebaseConfig = {
    apiKey: "AIzaSyAZrQjfFTY-ird6uNj7AumSzk9w5dU_glY",
    authDomain: "poker-32fa8.firebaseapp.com",
    projectId: "poker-32fa8",
    storageBucket: "poker-32fa8.firebasestorage.app",
    messagingSenderId: "905113519119",
    appId: "1:905113519119:web:2f265339269655371c4f7a",
    measurementId: "G-RLLRNRSDGZ"
};

// Initialize Firebase
let db;
let storage;
let currentGameListener = null;

// Initialize Firebase when the page loads
function initializeFirebase() {
    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            storage = firebase.storage();
            console.log('Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            return false;
        }
    } else {
        console.error('Firebase SDK not loaded');
        return false;
    }
}

// Player Database Management
const PlayerDatabase = {
    // Add or update a player
    async savePlayer(playerName, playerData) {
        if (!db) {
            console.error('Firebase not initialized');
            return false;
        }
        
        try {
            const playerRef = db.collection('players').doc(playerName);
            await playerRef.set({
                ...playerData,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Player ${playerName} saved successfully`);
            return true;
        } catch (error) {
            console.error('Error saving player:', error);
            return false;
        }
    },
    
    // Get a player by name
    async getPlayer(playerName) {
        if (!db) {
            console.error('Firebase not initialized');
            return null;
        }
        
        try {
            const playerDoc = await db.collection('players').doc(playerName).get();
            if (playerDoc.exists) {
                return playerDoc.data();
            }
            return null;
        } catch (error) {
            console.error('Error getting player:', error);
            return null;
        }
    },
    
    // Get all players
    async getAllPlayers() {
        if (!db) {
            console.error('Firebase not initialized');
            return [];
        }
        
        try {
            const snapshot = await db.collection('players').get();
            const players = [];
            snapshot.forEach(doc => {
                players.push({
                    name: doc.id,
                    ...doc.data()
                });
            });
            return players;
        } catch (error) {
            console.error('Error getting all players:', error);
            return [];
        }
    },
    
    // Delete a player
    async deletePlayer(playerName) {
        if (!db) {
            console.error('Firebase not initialized');
            return false;
        }
        
        try {
            // Delete player image from storage if exists
            const player = await this.getPlayer(playerName);
            if (player && player.imageUrl) {
                await this.deletePlayerImage(player.imageUrl);
            }
            
            // Delete player document
            await db.collection('players').doc(playerName).delete();
            console.log(`Player ${playerName} deleted successfully`);
            return true;
        } catch (error) {
            console.error('Error deleting player:', error);
            return false;
        }
    }
};

// Image Storage Management
const ImageStorage = {
    // Upload player image
    async uploadPlayerImage(playerName, file) {
        if (!storage) {
            console.error('Firebase Storage not initialized');
            return null;
        }
        
        try {
            const fileExtension = file.name.split('.').pop();
            const fileName = `players/${playerName}_${Date.now()}.${fileExtension}`;
            const storageRef = storage.ref().child(fileName);
            
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            console.log(`Image uploaded for ${playerName}:`, downloadURL);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading image:', error);
            return null;
        }
    },
    
    // Delete player image
    async deletePlayerImage(imageUrl) {
        if (!storage || !imageUrl) {
            return false;
        }
        
        try {
            const imageRef = storage.refFromURL(imageUrl);
            await imageRef.delete();
            console.log('Player image deleted successfully');
            return true;
        } catch (error) {
            console.error('Error deleting player image:', error);
            return false;
        }
    }
};

// Global game session management
const GlobalGameSession = {
    // Save current game to global session
    async saveGame(gameData) {
        if (!db) {
            console.error('Firebase not initialized');
            return false;
        }
        
        try {
            // Always update the same document ID for global session
            const gameDoc = db.collection('globalSession').doc('currentGame');
            
            const gameToSave = {
                ...gameData,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                deviceId: generateDeviceId() // Track which device last updated
            };
            
            await gameDoc.set(gameToSave);
            console.log('Game saved to global session');
            return true;
        } catch (error) {
            console.error('Error saving game to global session:', error);
            return false;
        }
    },
    
    // Load current game from global session
    async loadGame() {
        if (!db) {
            console.error('Firebase not initialized');
            return null;
        }
        
        try {
            const gameDoc = await db.collection('globalSession').doc('currentGame').get();
            
            if (gameDoc.exists) {
                const gameData = gameDoc.data();
                
                // Convert Firestore timestamps to Date objects
                if (gameData.startTime && gameData.startTime.toDate) {
                    gameData.startTime = gameData.startTime.toDate();
                }
                if (gameData.endTime && gameData.endTime.toDate) {
                    gameData.endTime = gameData.endTime.toDate();
                }
                if (gameData.lastUpdated && gameData.lastUpdated.toDate) {
                    gameData.lastUpdated = gameData.lastUpdated.toDate();
                }
                
                console.log('Game loaded from global session');
                return gameData;
            } else {
                console.log('No active game in global session');
                return null;
            }
        } catch (error) {
            console.error('Error loading game from global session:', error);
            return null;
        }
    },
    
    // Listen for real-time updates to the global game
    startListening(callback) {
        if (!db) {
            console.error('Firebase not initialized');
            return false;
        }
        
        try {
            // Stop any existing listener
            if (currentGameListener) {
                currentGameListener();
            }
            
            // Listen for real-time updates
            currentGameListener = db.collection('globalSession').doc('currentGame')
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const gameData = doc.data();
                        
                        // Convert timestamps
                        if (gameData.startTime && gameData.startTime.toDate) {
                            gameData.startTime = gameData.startTime.toDate();
                        }
                        if (gameData.endTime && gameData.endTime.toDate) {
                            gameData.endTime = gameData.endTime.toDate();
                        }
                        if (gameData.lastUpdated && gameData.lastUpdated.toDate) {
                            gameData.lastUpdated = gameData.lastUpdated.toDate();
                        }
                        
                        console.log('Global game updated in real-time');
                        callback(gameData);
                    } else {
                        console.log('Global game session ended');
                        callback(null);
                    }
                }, (error) => {
                    console.error('Error listening to global game:', error);
                });
            
            return true;
        } catch (error) {
            console.error('Error starting global game listener:', error);
            return false;
        }
    },
    
    // Stop listening for updates
    stopListening() {
        if (currentGameListener) {
            currentGameListener();
            currentGameListener = null;
            console.log('Stopped listening to global game');
        }
    },
    
    // Clear the global session (when game ends)
    async clearSession() {
        if (!db) {
            console.error('Firebase not initialized');
            return false;
        }
        
        try {
            await db.collection('globalSession').doc('currentGame').delete();
            console.log('Global session cleared');
            return true;
        } catch (error) {
            console.error('Error clearing global session:', error);
            return false;
        }
    }
};

// Generate a simple device ID for tracking
function generateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

// Game History Database Management
const GameHistoryDB = {
    // Save a completed game to the database
    async saveGame(gameData) {
        if (!db) {
            console.error('Firebase not initialized');
            return null;
        }
        
        try {
            // Create a comprehensive game record
            const gameRecord = {
                // Basic game info
                winner: gameData.winner,
                scores: gameData.scores,
                startTime: gameData.startTime,
                endTime: gameData.endTime,
                duration: gameData.duration,
                
                // Game details
                players: gameData.players || Object.keys(gameData.scores || {}),
                totalRounds: gameData.rounds ? gameData.rounds.length : 0,
                roundResults: gameData.rounds || [],
                
                // Game settings
                deckSize: gameData.deckSize || 36,
                maxCards: gameData.maxCards,
                
                // Special flags
                prematureEnd: gameData.prematureEnd || false,
                endedAtRound: gameData.endedAtRound,
                
                // Metadata
                gameId: generateGameId(),
                deviceId: generateDeviceId(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                
                // Statistics
                stats: this.calculateGameStats(gameData)
            };
            
            // Add to games collection
            const docRef = await db.collection('gameHistory').add(gameRecord);
            console.log('Game saved to Firebase with ID:', docRef.id);
            
            // Update player statistics
            await this.updatePlayerStats(gameRecord);
            
            return docRef.id;
        } catch (error) {
            console.error('Error saving game to Firebase:', error);
            return null;
        }
    },
    
    // Load all games from the database
    async loadGames(limit = 50) {
        if (!db) {
            console.error('Firebase not initialized');
            return [];
        }
        
        try {
            const snapshot = await db.collection('gameHistory')
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();
            
            const games = [];
            snapshot.forEach(doc => {
                const gameData = doc.data();
                
                // Convert Firestore timestamps to Date objects
                if (gameData.startTime && gameData.startTime.toDate) {
                    gameData.startTime = gameData.startTime.toDate();
                }
                if (gameData.endTime && gameData.endTime.toDate) {
                    gameData.endTime = gameData.endTime.toDate();
                }
                if (gameData.createdAt && gameData.createdAt.toDate) {
                    gameData.createdAt = gameData.createdAt.toDate();
                }
                
                games.push({
                    id: doc.id,
                    ...gameData
                });
            });
            
            console.log(`Loaded ${games.length} games from Firebase`);
            return games;
        } catch (error) {
            console.error('Error loading games from Firebase:', error);
            return [];
        }
    },
    
    // Load a specific game by ID
    async loadGame(gameId) {
        if (!db) {
            console.error('Firebase not initialized');
            return null;
        }
        
        try {
            const doc = await db.collection('gameHistory').doc(gameId).get();
            
            if (doc.exists) {
                const gameData = doc.data();
                
                // Convert timestamps
                if (gameData.startTime && gameData.startTime.toDate) {
                    gameData.startTime = gameData.startTime.toDate();
                }
                if (gameData.endTime && gameData.endTime.toDate) {
                    gameData.endTime = gameData.endTime.toDate();
                }
                if (gameData.createdAt && gameData.createdAt.toDate) {
                    gameData.createdAt = gameData.createdAt.toDate();
                }
                
                return {
                    id: doc.id,
                    ...gameData
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error loading game:', error);
            return null;
        }
    },
    
    // Search games by various criteria
    async searchGames(criteria = {}) {
        if (!db) {
            console.error('Firebase not initialized');
            return [];
        }
        
        try {
            let query = db.collection('gameHistory');
            
            // Add filters based on criteria
            if (criteria.player) {
                query = query.where('players', 'array-contains', criteria.player);
            }
            
            if (criteria.winner) {
                query = query.where('winner', '==', criteria.winner);
            }
            
            if (criteria.prematureEnd !== undefined) {
                query = query.where('prematureEnd', '==', criteria.prematureEnd);
            }
            
            if (criteria.startDate) {
                query = query.where('startTime', '>=', criteria.startDate);
            }
            
            if (criteria.endDate) {
                query = query.where('startTime', '<=', criteria.endDate);
            }
            
            // Order by creation time (most recent first)
            query = query.orderBy('createdAt', 'desc');
            
            // Apply limit
            if (criteria.limit) {
                query = query.limit(criteria.limit);
            }
            
            const snapshot = await query.get();
            const games = [];
            
            snapshot.forEach(doc => {
                const gameData = doc.data();
                
                // Convert timestamps
                if (gameData.startTime && gameData.startTime.toDate) {
                    gameData.startTime = gameData.startTime.toDate();
                }
                if (gameData.endTime && gameData.endTime.toDate) {
                    gameData.endTime = gameData.endTime.toDate();
                }
                if (gameData.createdAt && gameData.createdAt.toDate) {
                    gameData.createdAt = gameData.createdAt.toDate();
                }
                
                games.push({
                    id: doc.id,
                    ...gameData
                });
            });
            
            return games;
        } catch (error) {
            console.error('Error searching games:', error);
            return [];
        }
    },
    
    // Get player statistics
    async getPlayerStats(playerName) {
        if (!db) {
            console.error('Firebase not initialized');
            return null;
        }
        
        try {
            const doc = await db.collection('playerStats').doc(playerName).get();
            
            if (doc.exists) {
                return doc.data();
            }
            
            return null;
        } catch (error) {
            console.error('Error getting player stats:', error);
            return null;
        }
    },
    
    // Update player statistics after a game
    async updatePlayerStats(gameRecord) {
        if (!db || !gameRecord.players) {
            return;
        }
        
        try {
            const batch = db.batch();
            
            for (const player of gameRecord.players) {
                const statsRef = db.collection('playerStats').doc(player);
                const playerScore = gameRecord.scores[player] || 0;
                const isWinner = gameRecord.winner === player || (gameRecord.winner === 'Tie' && playerScore === Math.max(...Object.values(gameRecord.scores)));
                
                // Update player statistics
                batch.set(statsRef, {
                    totalGames: firebase.firestore.FieldValue.increment(1),
                    totalWins: firebase.firestore.FieldValue.increment(isWinner ? 1 : 0),
                    totalScore: firebase.firestore.FieldValue.increment(playerScore),
                    totalRounds: firebase.firestore.FieldValue.increment(gameRecord.totalRounds),
                    prematureEndGames: firebase.firestore.FieldValue.increment(gameRecord.prematureEnd ? 1 : 0),
                    lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
                    bestScore: playerScore, // This will need special handling for actual max
                    averageScore: 0 // Will be calculated separately
                }, { merge: true });
            }
            
            await batch.commit();
            console.log('Player statistics updated');
        } catch (error) {
            console.error('Error updating player stats:', error);
        }
    },
    
    // Calculate comprehensive game statistics
    calculateGameStats(gameData) {
        const scores = Object.values(gameData.scores || {});
        const players = Object.keys(gameData.scores || {});
        
        return {
            playerCount: players.length,
            totalScore: scores.reduce((sum, score) => sum + score, 0),
            averageScore: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
            highestScore: Math.max(...scores, 0),
            lowestScore: Math.min(...scores, 0),
            scoreSpread: Math.max(...scores, 0) - Math.min(...scores, 0),
            roundsCompleted: gameData.rounds ? gameData.rounds.length : 0,
            completionRate: gameData.prematureEnd ? 
                (gameData.endedAtRound || 1) / (gameData.totalRounds || 1) : 1.0
        };
    },
    
    // Delete a game (admin function)
    async deleteGame(gameId) {
        if (!db) {
            console.error('Firebase not initialized');
            return false;
        }
        
        try {
            await db.collection('gameHistory').doc(gameId).delete();
            console.log('Game deleted from Firebase');
            return true;
        } catch (error) {
            console.error('Error deleting game:', error);
            return false;
        }
    }
};

// Generate unique game ID
function generateGameId() {
    return 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Export for use in main script
window.GlobalGameSession = GlobalGameSession;
window.initializeFirebase = initializeFirebase;
window.PlayerDatabase = PlayerDatabase;
window.ImageStorage = ImageStorage;
window.GameHistoryDB = GameHistoryDB;
