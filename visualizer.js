// Poker Game Visualizer - Real-time Game Display
class PokerVisualizer {
    constructor() {
        this.gameData = null;
        this.players = [];
        this.currentGame = null;
        this.gameStartTime = null;
        this.gameTimer = null;
        this.firebaseInitialized = false;
        this.updateInterval = null;
        
        this.initialize();
    }
    
    async initialize() {
        console.log('Initializing Poker Visualizer...');
        
        // Initialize Firebase
        await this.initializeFirebase();
        
        // Start real-time updates
        this.startRealTimeUpdates();
        
        // Start game timer
        this.startGameTimer();
        
        // Initial UI update
        this.updateUI();
        
        console.log('Poker Visualizer initialized successfully');
    }
    
    async initializeFirebase() {
        try {
            if (typeof initializeFirebase === 'function') {
                this.firebaseInitialized = initializeFirebase();
                console.log('Firebase initialization result:', this.firebaseInitialized);
                
                if (this.firebaseInitialized) {
                    this.updateConnectionStatus('online');
                    this.startGlobalGameListener();
                } else {
                    this.updateConnectionStatus('offline');
                }
            } else {
                console.error('Firebase functions not loaded');
                this.updateConnectionStatus('offline');
            }
        } catch (error) {
            console.error('Error during Firebase initialization:', error);
            this.updateConnectionStatus('offline');
        }
    }
    
    updateConnectionStatus(status) {
        const statusIndicator = document.getElementById('statusIndicator');
        const connectionOverlay = document.getElementById('connectionOverlay');
        
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${status}`;
            const statusText = statusIndicator.querySelector('.status-text');
            if (statusText) {
                switch (status) {
                    case 'online':
                        statusText.textContent = 'Онлайн';
                        if (connectionOverlay) connectionOverlay.classList.add('hidden');
                        break;
                    case 'offline':
                        statusText.textContent = 'Офлайн';
                        if (connectionOverlay) connectionOverlay.classList.remove('hidden');
                        break;
                    case 'syncing':
                        statusText.textContent = 'Синхронизация...';
                        break;
                }
            }
        }
    }
    
    startGlobalGameListener() {
        if (typeof GlobalGameSession !== 'undefined' && GlobalGameSession.startListening) {
            GlobalGameSession.startListening((gameData) => {
                if (gameData) {
                    console.log('Game updated from Firebase:', gameData);
                    this.updateGameData(gameData);
                } else {
                    console.log('No active game in Firebase');
                    this.clearGameData();
                }
            });
        }
    }
    
    updateGameData(gameData) {
        try {
            // Keep previous round to detect transitions
            const prevRound = this.currentGame ? (this.currentGame.currentRound || 0) : 0;
            const prevPhase = this.currentGame ? (this.currentGame.currentPhase || this.currentGame.currentRoundData?.phase || '') : '';

            // Extract game data
            if (gameData.currentGame) {
                this.currentGame = gameData.currentGame;
                this.players = gameData.players || [];
            } else {
                this.currentGame = gameData;
                this.players = gameData.players || [];
            }

            // Set game start time if not set
            if (!this.gameStartTime && this.currentGame.startTime) {
                this.gameStartTime = new Date(this.currentGame.startTime);
            }

            // Detect announcements
            this.maybeShowBiddingComplete(prevPhase);
            this.maybeShowNextRound(prevRound);

            // Update UI
            this.updateUI();
            
            // Preload player images
            this.preloadPlayerImages();

            console.log('Game data updated successfully');
        } catch (error) {
            console.error('Error updating game data:', error);
        }
    }
    
    clearGameData() {
        this.currentGame = null;
        this.players = [];
        this.gameStartTime = null;
        this.updateUI();
    }
    
    startRealTimeUpdates() {
        // Update UI every second for real-time feel
        this.updateInterval = setInterval(() => {
            this.updateUI();
        }, 1000);
    }
    
    startGameTimer() {
        this.gameTimer = setInterval(() => {
            this.updateGameTime();
        }, 1000);
    }
    
    updateGameTime() {
        const gameTimeElement = document.getElementById('gameTime');
        if (gameTimeElement && this.gameStartTime) {
            const now = new Date();
            const elapsed = Math.floor((now - this.gameStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            gameTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    updateUI() {
        this.updateHeader();
        this.updatePlayersGrid();
        this.updateStats();
        this.updateDeltaChanges();
    }
    
    updateHeader() {
        // Update round number
        const roundElement = document.getElementById('currentRound');
        if (roundElement && this.currentGame) {
            roundElement.textContent = this.currentGame.currentRound || '-';
        }
        
        // Update cards per hand
        const cardsElement = document.getElementById('cardsPerHand');
        if (cardsElement && this.currentGame) {
            cardsElement.textContent = this.currentGame.cardsPerHand || '-';
        }
        
        // Update current stage
        const stageElement = document.getElementById('currentStage');
        if (stageElement && this.currentGame) {
            const stageInfo = this.getStageInfo();
            stageElement.textContent = `${stageInfo.stage} (${stageInfo.stageRound}/${stageInfo.totalStageRounds})`;
        }
    }
    
    updatePlayersGrid() {
        const playersGrid = document.getElementById('playersGrid');
        if (!playersGrid) return;
        
        playersGrid.innerHTML = '';
        
        if (!this.players || this.players.length === 0) {
            playersGrid.innerHTML = '<div class="no-players">Нет активных игроков</div>';
            return;
        }
        
        this.players.forEach(player => {
            const playerCard = this.createPlayerCard(player);
            playersGrid.appendChild(playerCard);
        });
    }
    
    createPlayerCard(player) {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        
        // Add dealer class if this player is the dealer
        if (this.currentGame && this.getCurrentDealer() === player) {
            playerCard.classList.add('dealer');
        }
        
        // Add blind bidding class if this player is bidding blind
        if (this.currentGame && this.isPlayerBlindBidding(player)) {
            playerCard.classList.add('blind-bidding');
        }
        
        const bid = this.getPlayerBid(player) || 0;
        const tricks = this.getPlayerTricks(player) || 0;
        const score = this.getPlayerScore(player) || 0;
        
        // Get player image if available
        const playerImage = this.getPlayerImage(player);
        
        playerCard.innerHTML = `
            ${this.currentGame && this.getCurrentDealer() === player ? '<div class="dealer-label">Раздающий</div>' : ''}
            <div class="player-name">${player}</div>
            <div class="player-avatar ${this.currentGame && this.getCurrentDealer() === player ? 'dealer' : ''} ${this.currentGame && this.isPlayerBlindBidding(player) ? 'blind-bidding' : ''}">
                ${playerImage ? `<img src="${playerImage}" alt="${player}" class="player-avatar-img">` : ''}
            </div>
            <div class="player-stats">
                <div class="stat-item">
                    <div class="stat-label">Ставка</div>
                    <div class="stat-value bid">${bid}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Взятки</div>
                    <div class="stat-value tricks">${tricks}</div>
                </div>
            </div>
            <div class="player-score">
                <div class="score-label">Очки</div>
                <div class="score-value ${score >= 0 ? 'positive' : 'negative'}">${score >= 0 ? '+' : ''}${score}</div>
            </div>
        `;
        
        return playerCard;
    }
    
    updateStats() {
        // Update bid validation
        this.updateBidValidation();
        
        // Update current dealer
        const dealerElement = document.getElementById('currentDealer');
        if (dealerElement) {
            dealerElement.textContent = this.getCurrentDealer() || '-';
        }
    }
    
    updateBidValidation() {
        if (!this.currentGame || !this.players) return;
        
        const totalPossibleTricks = this.currentGame.cardsPerHand || 0;
        const totalBiddingCap = this.players.length * totalPossibleTricks;
        const individualBidCap = totalPossibleTricks;
        
        let totalBids = 0;
        let hasInvalidIndividualBid = false;
        
        // Calculate total bids and check individual caps
        this.players.forEach(player => {
            const bid = this.getPlayerBid(player) || 0;
            totalBids += bid;
            
            // Check individual bid cap
            if (bid > individualBidCap) {
                hasInvalidIndividualBid = true;
            }
        });
        
        // Calculate validation number: total bids - possible tricks
        let validationNumber = totalBids - totalPossibleTricks;
        let validationLabel = '';
        let validationClass = '';
        
        // Determine validation state based on the same logic as counter website
        if (hasInvalidIndividualBid || totalBids > totalBiddingCap) {
            // Invalid bids (exceed limits)
            validationNumber = 0;
            validationLabel = 'недопустимо';
            validationClass = 'invalid';
        } else if (totalBids === totalPossibleTricks) {
            // Bids equal to possible tricks (not allowed)
            validationNumber = 0;
            validationLabel = 'недопустимо';
            validationClass = 'invalid';
        } else if (validationNumber < 0) {
            // Negative numbers: "кроме X" (except X)
            const absNumber = Math.abs(validationNumber);
            if (absNumber === 1) {
                validationLabel = 'кроме одной';
            } else if (absNumber === 2) {
                validationLabel = 'кроме двух';
            } else if (absNumber === 3) {
                validationLabel = 'кроме трех';
            } else {
                validationLabel = `кроме ${absNumber}`;
            }
            validationClass = 'special';
        } else if (validationNumber === 0) {
            // Zero means invalid
            validationLabel = 'недопустимо';
            validationClass = 'invalid';
        } else {
            // Positive numbers: "любая" (any)
            validationLabel = 'любая';
            validationClass = 'valid';
        }
        
        // Update validation number display
        const validationNumberElement = document.getElementById('validationNumber');
        const validationLabelElement = document.getElementById('validationLabel');
        
        if (validationNumberElement) {
            validationNumberElement.textContent = validationNumber;
            validationNumberElement.className = `validation-number ${validationClass}`;
        }
        
        if (validationLabelElement) {
            validationLabelElement.textContent = validationLabel;
        }
        
        // Update card appearance based on validation
        const bidValidationCard = document.getElementById('bidValidationCard');
        if (bidValidationCard) {
            if (validationClass === 'valid') {
                bidValidationCard.style.borderColor = 'rgba(81, 207, 102, 0.3)';
                bidValidationCard.style.boxShadow = '0 0 20px rgba(81, 207, 102, 0.1)';
            } else if (validationClass === 'special') {
                bidValidationCard.style.borderColor = 'rgba(252, 196, 25, 0.3)';
                bidValidationCard.style.boxShadow = '0 0 20px rgba(252, 196, 25, 0.1)';
            } else {
                bidValidationCard.style.borderColor = 'rgba(255, 107, 107, 0.3)';
                bidValidationCard.style.boxShadow = '0 0 20px rgba(255, 107, 107, 0.1)';
            }
        }
    }

    // Announcements
    areAllBidsPlaced() {
        if (!this.currentGame || !this.players || !this.currentGame.currentRoundData) return false;
        if (!Array.isArray(this.currentGame.currentRoundData.results)) return false;
        const results = this.currentGame.currentRoundData.results;
        return this.players.every(p => {
            const r = results.find(x => x.player === p);
            return r && (r.bid !== undefined && r.bid !== null);
        });
    }

    maybeShowBiddingComplete(prevPhase) {
        const currPhase = this.currentGame?.currentPhase || this.currentGame?.currentRoundData?.phase || '';
        const becameTricks = prevPhase !== 'tricks' && currPhase === 'tricks';
        if (!becameTricks) return;
        if (!this.areAllBidsPlaced()) return;

        const overlay = document.getElementById('biddingCompleteOverlay');
        if (!overlay) return;

        // Populate summary
        const totalBids = this.calculateTotalBids();
        const totalPossibleTricks = this.currentGame.cardsPerHand || 0;
        const summary = document.getElementById('biddingSummary');
        if (summary) {
            summary.innerHTML = `
                <h3>Сводка ставок</h3>
                <div class="bidding-stats">
                    <div class="bidding-stat">
                        <div class="value">${totalBids}</div>
                        <div class="label">Общие ставки</div>
                    </div>
                    <div class="bidding-stat">
                        <div class="value">${totalPossibleTricks}</div>
                        <div class="label">Возможные взятки</div>
                    </div>
                </div>
                ${this.renderBiddingMode(totalBids, totalPossibleTricks)}
            `;
        }

        // Show
        overlay.classList.add('show');
        setTimeout(() => overlay.classList.add('animate'), 100);
        setTimeout(() => {
            overlay.classList.remove('animate');
            setTimeout(() => overlay.classList.remove('show'), 400);
        }, 5000);
    }

    maybeShowNextRound(prevRound) {
        const currRound = this.currentGame?.currentRound || 0;
        if (!prevRound || currRound <= prevRound) return;

        const overlay = document.getElementById('nextRoundOverlay');
        if (!overlay) return;

        // Build round summary for the round that just finished
        const completedRoundNumber = prevRound;
        const stageInfo = this.getStageInfoForRound(completedRoundNumber);
        const roundSummary = document.getElementById('roundSummary');
        if (roundSummary) {
            roundSummary.innerHTML = `
                <h3>Раунд ${completedRoundNumber} завершен</h3>
                <div class="round-info">
                    <div class="round-info-item">
                        <div class="value">${this.currentGame.cardsPerHand || '-'}</div>
                        <div class="label">Карт в руке</div>
                    </div>
                    <div class="round-info-item">
                        <div class="value">${stageInfo.stage}</div>
                        <div class="label">Этап</div>
                    </div>
                    <div class="round-info-item">
                        <div class="value">${stageInfo.stageRound}/${stageInfo.totalStageRounds}</div>
                        <div class="label">Этап раунд</div>
                    </div>
                </div>
                <div class="dealer-info">
                    <span class="label">Раздающий</span>
                    <span class="dealer-name">${this.getCurrentDealer() || '-'}</span>
                </div>
            `;
        }

        // Score changes for last completed round (use last entry in roundResults if present)
        const lastRound = this.getLastCompletedRound();
        const scoreChanges = document.getElementById('scoreChanges');
        if (scoreChanges && lastRound?.results) {
            scoreChanges.innerHTML = `
                <h3>Изменения очков</h3>
                <div class="score-changes-grid">
                    ${lastRound.results.map(r => `
                        <div class="score-change-item">
                            <div class="score-change-player">${r.player}</div>
                            <div class="score-change-details">
                                <div class="score-change-bid">Заказ: ${r.bid}</div>
                                <div class="score-change-tricks">Взятки: ${r.tricks}</div>
                            </div>
                            <div class="score-change-points ${r.points >= 0 ? 'positive' : 'negative'}">${r.points >= 0 ? '+' : ''}${r.points}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        const subtitle = document.getElementById('nextRoundSubtitle');
        if (subtitle) subtitle.textContent = `Раунд ${currRound} начинается...`;

        overlay.classList.add('show');
        setTimeout(() => overlay.classList.add('animate'), 100);
        setTimeout(() => {
            overlay.classList.remove('animate');
            setTimeout(() => overlay.classList.remove('show'), 400);
        }, 8000);
    }

    renderBiddingMode(totalBids, totalPossibleTricks) {
        if (totalBids === totalPossibleTricks) {
            return `<div class="bidding-mode equal">Недопустимо (равно возможным взяткам)</div>`;
        }
        if (totalBids > totalPossibleTricks) {
            return `<div class="bidding-mode under">Играем на недобор</div>`;
        }
        return `<div class="bidding-mode over">Играем на перебор</div>`;
    }
    
    updateDeltaChanges() {
        const scoresGrid = document.getElementById('scoresGrid');
        if (!scoresGrid) return;
        
        scoresGrid.innerHTML = '';
        
        if (!this.players || this.players.length === 0) {
            scoresGrid.innerHTML = '<div class="no-scores">Нет данных об изменениях</div>';
            return;
        }
        
        // Get the last completed round
        const lastRound = this.getLastCompletedRound();
        
        if (!lastRound) {
            scoresGrid.innerHTML = '<div class="no-scores">Нет завершенных раундов</div>';
            return;
        }
        
        // Keep players in the same order as displayed above
        this.players.forEach(player => {
            const deltaItem = document.createElement('div');
            deltaItem.className = 'score-item';
            
            const deltaChange = this.getPlayerDeltaChange(player, lastRound) || 0;
            const deltaClass = deltaChange >= 0 ? 'positive' : 'negative';
            
            deltaItem.innerHTML = `
                <div class="score-player">${player}</div>
                <div class="delta-details">
                    <div class="delta-bid">Заказ: ${this.getPlayerBidFromRound(player, lastRound) || 0}</div>
                    <div class="delta-tricks">Взятки: ${this.getPlayerTricksFromRound(player, lastRound) || 0}</div>
                </div>
                <div class="score-value ${deltaClass}">${deltaChange >= 0 ? '+' : ''}${deltaChange}</div>
            `;
            
            scoresGrid.appendChild(deltaItem);
        });
    }
    
    // Helper methods for delta changes
    getLastCompletedRound() {
        if (!this.currentGame || !this.currentGame.roundResults || this.currentGame.roundResults.length === 0) {
            return null;
        }
        return this.currentGame.roundResults[this.currentGame.roundResults.length - 1];
    }
    
    getPlayerDeltaChange(player, roundResult) {
        if (!roundResult || !roundResult.results) return 0;
        
        const playerResult = roundResult.results.find(r => r.player === player);
        return playerResult ? playerResult.points : 0;
    }
    
    getPlayerBidFromRound(player, roundResult) {
        if (!roundResult || !roundResult.results) return 0;
        
        const playerResult = roundResult.results.find(r => r.player === player);
        return playerResult ? playerResult.bid : 0;
    }
    
    getPlayerTricksFromRound(player, roundResult) {
        if (!roundResult || !roundResult.results) return 0;
        
        const playerResult = roundResult.results.find(r => r.player === player);
        return playerResult ? playerResult.tricks : 0;
    }
    
    isPlayerBlindBidding(player) {
        if (!this.currentGame || !this.currentGame.blindBiddingPlayers) return false;
        return this.currentGame.blindBiddingPlayers.includes(player);
    }
    
    // Helper methods
    getPlayerBid(player) {
        if (!this.currentGame || !this.currentGame.currentRoundData) return 0;
        
        const playerResult = this.currentGame.currentRoundData.results?.find(r => r.player === player);
        return playerResult ? playerResult.bid : 0;
    }
    
    getPlayerTricks(player) {
        if (!this.currentGame || !this.currentGame.currentRoundData) return 0;
        
        const playerResult = this.currentGame.currentRoundData.results?.find(r => r.player === player);
        return playerResult ? playerResult.tricks : 0;
    }
    
    getPlayerScore(player) {
        if (!this.currentGame || !this.currentGame.scores) return 0;
        return this.currentGame.scores[player] || 0;
    }
    
    calculateTotalBids() {
        if (!this.players || !this.currentGame) return 0;
        
        return this.players.reduce((total, player) => {
            return total + (this.getPlayerBid(player) || 0);
        }, 0);
    }
    
    calculateTotalTricks() {
        if (!this.players || !this.currentGame) return 0;
        
        return this.players.reduce((total, player) => {
            return total + (this.getPlayerTricks(player) || 0);
        }, 0);
    }
    
    getCurrentDealer() {
        if (!this.currentGame || !this.players || this.players.length === 0) return null;
        
        const dealerIndex = this.currentGame.currentDealer || 0;
        return this.players[dealerIndex] || null;
    }
    
    getStageInfo() {
        if (!this.currentGame) return { stage: 1, stageRound: 1, totalStageRounds: 4 };
        
        const roundNumber = this.currentGame.currentRound || 1;
        const playerCount = this.players.length;
        
        // Simplified stage calculation
        if (roundNumber <= 4) {
            return { stage: 1, stageRound: roundNumber, totalStageRounds: 4 };
        } else if (roundNumber <= 11) {
            return { stage: 2, stageRound: roundNumber - 4, totalStageRounds: 7 };
        } else if (roundNumber <= 15) {
            return { stage: 3, stageRound: roundNumber - 11, totalStageRounds: 4 };
        } else if (roundNumber <= 22) {
            return { stage: 4, stageRound: roundNumber - 15, totalStageRounds: 7 };
        } else if (roundNumber <= 26) {
            return { stage: 5, stageRound: roundNumber - 22, totalStageRounds: 4 };
        } else {
            return { stage: 6, stageRound: roundNumber - 26, totalStageRounds: 4 };
        }
    }
    
    getStageInfoForRound(roundNumber) {
        if (!this.players) return { stage: 1, stageRound: 1, totalStageRounds: 4 };
        
        const playerCount = this.players.length;
        
        // Simplified stage calculation for history
        if (roundNumber <= 4) {
            return { stage: 1, stageRound: roundNumber, totalStageRounds: 4 };
        } else if (roundNumber <= 11) {
            return { stage: 2, stageRound: roundNumber - 4, totalStageRounds: 7 };
        } else if (roundNumber <= 15) {
            return { stage: 3, stageRound: roundNumber - 11, totalStageRounds: 4 };
        } else if (roundNumber <= 22) {
            return { stage: 4, stageRound: roundNumber - 15, totalStageRounds: 7 };
        } else if (roundNumber <= 26) {
            return { stage: 5, stageRound: roundNumber - 22, totalStageRounds: 4 };
        } else {
            return { stage: 6, stageRound: roundNumber - 26, totalStageRounds: 4 };
        }
    }
    
    // Cleanup method
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        if (typeof GlobalGameSession !== 'undefined' && GlobalGameSession.stopListening) {
            GlobalGameSession.stopListening();
        }
    }
    
    // Player image management
    playerImages = new Map();
    
    async getPlayerImage(playerName) {
        // Check if we already have the image cached
        if (this.playerImages.has(playerName)) {
            return this.playerImages.get(playerName);
        }
        
        // Try to fetch player data from Firebase
        try {
            if (typeof PlayerDatabase !== 'undefined' && PlayerDatabase.getPlayer) {
                const playerData = await PlayerDatabase.getPlayer(playerName);
                if (playerData && playerData.imageUrl) {
                    // Cache the image URL
                    this.playerImages.set(playerName, playerData.imageUrl);
                    return playerData.imageUrl;
                }
            }
        } catch (error) {
            console.warn(`Failed to fetch image for player ${playerName}:`, error);
        }
        
        // Cache null to avoid repeated failed requests
        this.playerImages.set(playerName, null);
        return null;
    }
    
    // Preload images for all current players
    async preloadPlayerImages() {
        if (!this.players || this.players.length === 0) return;
        
        const imagePromises = this.players.map(player => this.getPlayerImage(player));
        await Promise.allSettled(imagePromises);
    }
}

// Initialize the visualizer when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.pokerVisualizer = new PokerVisualizer();
});

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (window.pokerVisualizer) {
        window.pokerVisualizer.destroy();
    }
});
