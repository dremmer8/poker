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
let currentGameListener = null;

// Initialize Firebase when the page loads
function initializeFirebase() {
    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
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

// Export for use in main script
window.GlobalGameSession = GlobalGameSession;
window.initializeFirebase = initializeFirebase;
