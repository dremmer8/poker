// Game state
let players = [];
let gameHistory = [];
let notificationsShown = false; // Track if notifications have been shown for current session
let currentGame = {
    startTime: null,
    endTime: null,
    winner: null,
    scores: {},
    currentRound: 1,
    maxCards: 9,
    cardsPerHand: 1,
    isSpecialGame: false,
    specialGameType: null,
    roundResults: [],
    currentRoundData: null, // Add this field
    gameStarted: false, // Track if game has started (first round completed)
    lockedPlayerCount: 0, // Lock player count after first round
    lockedDeckSize: 36, // Lock deck size after first round
    currentDealer: 0, // Index of current dealer (0 = first player)
    dealerRotation: true, // Whether dealer rotates after each round
    blindBiddingPlayers: [], // Track which players are bidding blind
    currentPhase: 'bidding' // Track current phase: 'bidding' or 'tricks'
};

// Transition screen state
let transitionTimer = null;
let transitionCountdown = 15;

// Screen management
let currentScreen = 'menu';

// Screen management functions
function showScreen(screenId) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenId;
    }
}

function showMenu() {
    showScreen('menuScreen');
}

function showGameSetup() {
    showScreen('setupScreen');
    // Auto-reset when starting new game
    resetCurrentGame(false); // false = don't show confirmation
    // Initialize setup screen with current values
    updatePlayerNames();
    updateRoundInfo();
}

function resetCurrentGame(showConfirmation = true) {
    if (showConfirmation) {
        if (!confirm('Сбросить текущую игру? Это действие нельзя отменить.')) {
            return;
        }
    }
    
    // Reset game state
    currentGame = {
        startTime: new Date(),
        endTime: null,
        winner: null,
        scores: {},
        currentRound: 1,
        maxCards: 9,
        cardsPerHand: 1,
        isSpecialGame: false,
        specialGameType: null,
        roundResults: [],
        currentRoundData: null, // Add this field
        gameStarted: false,
        lockedPlayerCount: 0,
        lockedDeckSize: 36,
        currentDealer: 0,
        dealerRotation: true,
        blindBiddingPlayers: [],
        currentPhase: 'bidding' // Track current phase: 'bidding' or 'tricks'
    };
    
    // Reset notifications flag for new game
    notificationsShown = false;
    
    // Reset player scores
    players.forEach(player => {
        currentGame.scores[player] = 0;
    });
    
    // Re-enable all controls
    const addPlayerBtn = document.querySelector('.add-player-btn');
    const removePlayerBtns = document.querySelectorAll('.remove-player');
    const deckSizeSelect = document.getElementById('deckSize');
    
    if (addPlayerBtn) addPlayerBtn.disabled = false;
    removePlayerBtns.forEach(btn => btn.disabled = false);
    if (deckSizeSelect) deckSizeSelect.disabled = false;
    
    // Clear saved game
    localStorage.removeItem(STORAGE_KEYS.CURRENT_GAME);
    
    // Update displays
    updateScoreboard();
    updateRoundInfo();
    updateGameStatus();
    updateBidValidation();
    updateSaveStatus();
    
    if (showConfirmation) {
        alert('Игра сброшена! Можете начать новую игру.');
    }
}

function showCountingScreen() {
    showScreen('countingScreen');
    
    // Ensure first round is properly initialized if game hasn't started yet
    if (!currentGame.gameStarted && currentGame.currentRound === 1) {
        // Initialize first round data if not already done
        if (!currentGame.currentRoundData) {
            currentGame.currentRoundData = {
                round: currentGame.currentRound,
                cardsPerHand: currentGame.cardsPerHand,
                specialGame: currentGame.isSpecialGame ? currentGame.specialGameType : null,
                results: []
            };
            
            // Initialize player results for first round
            players.forEach(player => {
                currentGame.currentRoundData.results.push({
                    player: player,
                    bid: 0,
                    tricks: 0,
                    points: 0
                });
            });
        }
    }
    
    // Update displays for counting screen
    updateScoreboard();
    updateRoundInfo();
    
    // Only show notifications if they haven't been shown yet for this session
    if (!notificationsShown) {
        updateGameStatus();
        updateSaveStatus();
        notificationsShown = true; // Mark notifications as shown
    } else {
        // Hide notifications if they were previously shown
        const gameStatus = document.getElementById('gameStatus');
        const saveStatus = document.getElementById('saveStatus');
        if (gameStatus) gameStatus.style.display = 'none';
        if (saveStatus) saveStatus.style.display = 'none';
    }
    
    // Update phase-specific displays
    updatePlayerGridsForPhase(currentGame.currentPhase);
    updateBidValidation();
    updateNextRoundButtonState();
    updateBidsCounter();
}

function showGameTable() {
    showScreen('tableScreen');
    updateScoresDisplay();
    updateRoundsHistory();
}

function showGameHistory() {
    showScreen('historyScreen');
    updateGameHistory();
}

function showCelebrationScreen() {
    showScreen('celebrationScreen');
    populateCelebrationScreen();
}

function showTransitionScreen() {
    showScreen('transitionScreen');
    populateTransitionScreen();
    startTransitionTimer();
}

function populateTransitionScreen() {
    // Update round number and cards per hand
    document.getElementById('transitionRoundNumber').textContent = currentGame.currentRound;
    document.getElementById('transitionCardsPerHand').textContent = currentGame.cardsPerHand;
    
    // Update dealer information
    const currentDealer = getCurrentDealer();
    document.getElementById('transitionDealer').textContent = currentDealer;
    
    // Update players and cards information
    populatePlayersCards();
    
    // Update previous round results if applicable
    populatePreviousRoundResults();
    
    // Update game stage information
    populateStageInfo();
}

function populatePlayersCards() {
    const playersCardsContainer = document.getElementById('transitionPlayersCards');
    playersCardsContainer.innerHTML = '';
    
    const playerOrder = getPlayerOrder();
    
    playerOrder.forEach((player, index) => {
        const playerCardItem = document.createElement('div');
        playerCardItem.className = 'player-card-item';
        
        // Add dealer class if this player is the dealer
        if (player === getCurrentDealer()) {
            playerCardItem.classList.add('dealer');
        }
        
        playerCardItem.innerHTML = `
            <div class="player-card-name">${player}</div>
            <div class="player-card-count">${currentGame.cardsPerHand} карт</div>
        `;
        
        playersCardsContainer.appendChild(playerCardItem);
    });
}

function populatePreviousRoundResults() {
    const previousRoundSection = document.getElementById('transitionPreviousRound');
    const previousResultsContainer = document.getElementById('transitionPreviousResults');
    
    // Check if there are previous round results
    if (currentGame.roundResults.length > 0) {
        const lastRound = currentGame.roundResults[currentGame.roundResults.length - 1];
        
        previousRoundSection.style.display = 'block';
        previousResultsContainer.innerHTML = '';
        
        lastRound.results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'previous-result-item';
            
            const pointsClass = result.points >= 0 ? 'positive' : 'negative';
            const pointsSign = result.points >= 0 ? '+' : '';
            
            resultItem.innerHTML = `
                <div class="previous-result-player">${result.player}</div>
                <div class="previous-result-details">
                    Заказ: ${result.bid} | Взятки: ${result.tricks}
                </div>
                <div class="previous-result-points ${pointsClass}">
                    ${pointsSign}${result.points}
                </div>
            `;
            
            previousResultsContainer.appendChild(resultItem);
        });
    } else {
        previousRoundSection.style.display = 'none';
    }
}

function populateStageInfo() {
    const stageInfoContainer = document.getElementById('transitionStageInfo');
    const stageInfo = getStageInfo();
    
    let stageDescription = '';
    switch (stageInfo.stage) {
        case 1:
            stageDescription = 'Первый этап - 1 карта';
            break;
        case 2:
            stageDescription = 'Второй этап - увеличение карт';
            break;
        case 3:
            stageDescription = 'Третий этап - максимальные карты';
            break;
        case 4:
            stageDescription = 'Четвертый этап - уменьшение карт';
            break;
        case 5:
            stageDescription = 'Пятый этап - 1 карта';
            break;
        case 6:
            stageDescription = 'Шестой этап - слепой (максимальные карты)';
            break;
        default:
            stageDescription = 'Неизвестный этап';
    }
    
    stageInfoContainer.innerHTML = `
        <div class="stage-info-content">
            Этап ${stageInfo.stage} (${stageInfo.stageRound}/${stageInfo.totalStageRounds})
        </div>
        <div class="stage-info-details">
            ${stageDescription}<br>
            Раунд ${stageInfo.stageRound} из ${stageInfo.totalStageRounds} в этом этапе
        </div>
    `;
}

function startTransitionTimer() {
    // Reset countdown
    transitionCountdown = 15;
    
    // Clear any existing timer
    if (transitionTimer) {
        clearInterval(transitionTimer);
    }
    
    // Update timer display
    updateTransitionTimer();
    
    // Start countdown
    transitionTimer = setInterval(() => {
        transitionCountdown--;
        updateTransitionTimer();
        
        if (transitionCountdown <= 0) {
            clearInterval(transitionTimer);
            startRoundFromTransition();
        }
    }, 1000);
}

function updateTransitionTimer() {
    const timerElement = document.getElementById('transitionTimer');
    if (timerElement) {
        timerElement.textContent = transitionCountdown;
    }
}

function startRoundFromTransition() {
    // Clear timer if it's still running
    if (transitionTimer) {
        clearInterval(transitionTimer);
        transitionTimer = null;
    }
    
    // Show counting screen
    showCountingScreen();
}

function populateCelebrationScreen() {
    // Populate winner card
    const winnerCard = document.getElementById('winnerCard');
    const finalScores = Object.values(currentGame.scores);
    const maxScore = Math.max(...finalScores);
    const winners = Object.keys(currentGame.scores).filter(player => currentGame.scores[player] === maxScore);
    
    if (winners.length === 1) {
        winnerCard.innerHTML = `
            <h2>🏆 Победитель!</h2>
            <div class="winner-name">${winners[0]}</div>
            <div class="winner-score">${maxScore} очков</div>
            <div class="winner-message">Поздравляем с победой!</div>
        `;
    } else {
        winnerCard.innerHTML = `
            <h2>🤝 Ничья!</h2>
            <div class="winner-name">${winners.join(' & ')}</div>
            <div class="winner-score">${maxScore} очков</div>
            <div class="winner-message">Отличная игра!</div>
        `;
    }
    
    // Populate final scores
    const finalScoresContainer = document.getElementById('finalScores');
    finalScoresContainer.innerHTML = '';
    
    // Sort players by score (highest first)
    const sortedPlayers = Object.entries(currentGame.scores)
        .sort(([,a], [,b]) => b - a);
    
    sortedPlayers.forEach(([player, score]) => {
        const scoreItem = document.createElement('div');
        scoreItem.className = `final-score-item ${score === maxScore ? 'winner' : ''}`;
        scoreItem.innerHTML = `
            <div class="player-name">${player}</div>
            <div class="player-score">${score}</div>
        `;
        finalScoresContainer.appendChild(scoreItem);
    });
    
    // Populate rounds summary
    const roundsSummary = document.getElementById('roundsSummary');
    roundsSummary.innerHTML = '';
    
    if (currentGame.roundResults.length === 0) {
        roundsSummary.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Данные раундов недоступны</p>';
        return;
    }
    
    currentGame.roundResults.forEach((roundResult, index) => {
        const roundItem = document.createElement('div');
        roundItem.className = `round-summary-item ${roundResult.specialGame ? 'special-game' : ''}`;
        
        const roundNumber = roundResult.round;
        const cardsPerHand = roundResult.cardsPerHand;
        const specialGame = roundResult.specialGame;
        
        let roundTitle = `Раунд ${roundNumber} (${cardsPerHand} карт)`;
        if (specialGame) {
            roundTitle += ` - ${SPECIAL_GAMES[specialGame]}`;
        }
        
        // Get stage info for this round
        const stageInfo = getStageInfoForRound(roundNumber);
        
        const resultsHtml = roundResult.results.map(result => {
            const pointsClass = result.points >= 0 ? 'positive' : 'negative';
            return `
                <div class="round-result-item">
                    <div class="round-result-player">${result.player}</div>
                    <div class="round-result-details">
                        Заказ: ${result.bid} | Взятки: ${result.tricks}
                    </div>
                    <div class="round-result-points ${pointsClass}">
                        ${result.points >= 0 ? '+' : ''}${result.points}
                    </div>
                </div>
            `;
        }).join('');
        
        roundItem.innerHTML = `
            <div class="round-summary-header">
                <div class="round-summary-title">${roundTitle}</div>
                <div class="round-summary-stage">Этап ${stageInfo.stage}</div>
            </div>
            <div class="round-summary-results">
                ${resultsHtml}
            </div>
        `;
        
        roundsSummary.appendChild(roundItem);
    });
}

function getStageInfoForRound(roundNumber) {
    const config = getRoundConfig();
    if (!config) return { stage: 1, stageRound: 1, totalStageRounds: 4 };
    
    let roundCount = 0;
    let stageStartRound = 1;
    
    for (let stage = 0; stage < config.stages.length; stage++) {
        const stageConfig = config.stages[stage];
        const stageEndRound = roundCount + stageConfig.rounds;
        
        if (roundNumber <= stageEndRound) {
            const stageRound = roundNumber - stageStartRound + 1;
            return {
                stage: stage + 1,
                stageRound: stageRound,
                totalStageRounds: stageConfig.rounds
            };
        }
        
        roundCount = stageEndRound;
        stageStartRound = roundCount + 1;
    }
    
    return { stage: 1, stageRound: 1, totalStageRounds: 4 };
}

function startNewGameFromCelebration() {
    // Reset for new game
    currentGame = {
        startTime: new Date(),
        endTime: null,
        winner: null,
        scores: {},
        currentRound: 1,
        maxCards: getMaxCardsForPlayerCount(players.length),
        cardsPerHand: getCardsPerHand(),
        isSpecialGame: false,
        specialGameType: null,
        roundResults: [],
        currentRoundData: null, // Add this field
        gameStarted: false,
        lockedPlayerCount: 0,
        lockedDeckSize: 36,
        currentDealer: 0,
        dealerRotation: true,
        blindBiddingPlayers: []
    };
    
    // Reset notifications flag for new game
    notificationsShown = false;
    
    players.forEach(player => {
        currentGame.scores[player] = 0;
    });
    
    // Re-enable player management controls
    const addPlayerBtn = document.querySelector('.add-player-btn');
    const removePlayerBtns = document.querySelectorAll('.remove-player');
    const deckSizeSelect = document.getElementById('deckSize');
    
    if (addPlayerBtn) addPlayerBtn.disabled = false;
    removePlayerBtns.forEach(btn => btn.disabled = false);
    if (deckSizeSelect) deckSizeSelect.disabled = false;
    
    // Show setup screen for new game
    showGameSetup();
    
    updateScoreboard();
    updateRoundInfo();
    updateGameHistory();
    updateGameStatus();
    updateBidValidation();
    updateSaveStatus();
    
    // Save new game state
    saveCurrentGame();
}

function loadSavedGame() {
    const savedGame = localStorage.getItem(STORAGE_KEYS.CURRENT_GAME);
    if (savedGame) {
        try {
            const gameState = JSON.parse(savedGame);
            
            // Restore game state
            currentGame = gameState.currentGame;
            players = gameState.players;
            currentDeckSize = gameState.currentDeckSize;
            
            // Reset notifications flag for loaded game
            notificationsShown = false;
            
            // Convert date strings back to Date objects
            if (currentGame.startTime) {
                currentGame.startTime = new Date(currentGame.startTime);
            }
            if (currentGame.endTime) {
                currentGame.endTime = new Date(currentGame.endTime);
            }
            
            // Restore UI state
            restoreUIState();
            
            // Show appropriate screen based on game state
            if (currentGame.gameStarted) {
                showCountingScreen();
                // No popup for loaded games - just continue silently
            } else {
                showGameSetup();
            }
        } catch (e) {
            console.error('Failed to load saved game:', e);
            alert('Ошибка загрузки сохраненной игры. Начните новую игру.');
            showGameSetup();
        }
    } else {
        alert('Сохраненной игры не найдено. Начните новую игру.');
        showGameSetup();
    }
}

function startGame() {
    // Validate that we have at least 2 players
    if (players.length < 2) {
        alert('Необходимо минимум 2 игрока для начала игр.');
        return;
    }
    
    // Initialize game state
    currentGame.startTime = new Date();
    currentGame.maxCards = getMaxCardsForPlayerCount(players.length);
    currentGame.cardsPerHand = getCardsPerHand();
    
    // Reset notifications flag for new game
    notificationsShown = false;
    
    // Set initial deck size
    const deckSizeSelect = document.getElementById('deckSize');
    currentDeckSize = parseInt(deckSizeSelect.value);
    
    // Initialize dealer (first player starts as dealer)
    currentGame.currentDealer = 0;
    currentGame.dealerRotation = true;
    
    // Initialize scores
    players.forEach(player => {
        currentGame.scores[player] = 0;
    });
    
    // Initialize first round data properly
    currentGame.currentRoundData = {
        round: currentGame.currentRound,
        cardsPerHand: currentGame.cardsPerHand,
        specialGame: currentGame.isSpecialGame ? currentGame.specialGameType : null,
        results: []
    };
    
    // Initialize player results for first round
    players.forEach(player => {
        currentGame.currentRoundData.results.push({
            player: player,
            bid: 0,
            tricks: 0,
            points: 0
        });
    });
    
    // Save initial game state
    saveCurrentGame();
    
    // Show transition screen instead of popup
    showTransitionScreen();
}

function updateScoresDisplay() {
    const scoresDisplay = document.getElementById('scoresDisplay');
    if (!scoresDisplay) return;
    
    scoresDisplay.innerHTML = '';
    
    // Sort players by score (highest first)
    const sortedPlayers = Object.entries(currentGame.scores)
        .sort(([,a], [,b]) => b - a);
    
    sortedPlayers.forEach(([player, score]) => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        scoreItem.innerHTML = `
            <div class="player-name">${player}</div>
            <div class="player-score">${score}</div>
        `;
        scoresDisplay.appendChild(scoreItem);
    });
}

function updateRoundsHistory() {
    const roundsHistory = document.getElementById('roundsHistory');
    if (!roundsHistory) return;
    
    roundsHistory.innerHTML = '';
    
    if (currentGame.roundResults.length === 0) {
        roundsHistory.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">История раундов пока пуста</p>';
        return;
    }
    
    // Calculate running totals for each player
    const runningTotals = {};
    players.forEach(player => {
        runningTotals[player] = 0;
    });
    
    currentGame.roundResults.forEach((roundResult, index) => {
        const roundItem = document.createElement('div');
        roundItem.className = 'round-item';
        
        const roundNumber = roundResult.round;
        const cardsPerHand = roundResult.cardsPerHand;
        const specialGame = roundResult.specialGame;
        
        let roundTitle = `Раунд ${roundNumber} (${cardsPerHand} карт)`;
        if (specialGame) {
            roundTitle += ` - ${SPECIAL_GAMES[specialGame]}`;
        }
        
        const resultsHtml = roundResult.results.map(result => {
            const pointsClass = result.points >= 0 ? 'positive' : 'negative';
            
            // Update running total for this player
            runningTotals[result.player] += result.points;
            
            // Check if player was blind bidding in this round
            const wasBlindBidding = result.blindBidding || false;
            const blindIndicator = wasBlindBidding ? ' <span style="color: #ff6b6b; font-weight: bold;">👁️</span>' : '';
            
            // Format running total with color
            const totalClass = runningTotals[result.player] >= 0 ? 'positive' : 'negative';
            const totalDisplay = runningTotals[result.player] >= 0 ? 
                `+${runningTotals[result.player]}` : 
                `${runningTotals[result.player]}`;
            
            return `
                <div class="round-result">
                    <strong>${result.player}${blindIndicator}</strong><br>
                    Заказ: ${result.bid}, Взятки: ${result.tricks}<br>
                    <span class="${pointsClass}">${result.points >= 0 ? '+' : ''}${result.points}</span><br>
                    <small style="color: #666;">Итого: <span class="${totalClass}">${totalDisplay}</span></small>
                </div>
            `;
        }).join('');
        
        roundItem.innerHTML = `
            <h4>${roundTitle}</h4>
            <div class="round-results">
                ${resultsHtml}
            </div>
        `;
        
        roundsHistory.appendChild(roundItem);
    });
}

// Round configuration based on player count and deck size
const ROUND_CONFIGS = {
    36: { // 36-card deck configurations
        2: {
            totalRounds: 42,
            stages: [
                { rounds: 2, cards: 1 },           // Stage 1: 2 rounds with 1 card
                { rounds: 17, cards: 'increment' }, // Stage 2: 17 rounds incrementing 2→18
                { rounds: 2, cards: 18 },          // Stage 3: 2 rounds with 18 cards
                { rounds: 17, cards: 'decrement' }, // Stage 4: 17 rounds decrementing 17→1
                { rounds: 2, cards: 1 },           // Stage 5: 2 rounds with 1 card
                { rounds: 2, cards: 18 }           // Stage 6: 2 rounds with 18 cards
            ]
        },
        3: {
            totalRounds: 32,
            stages: [
                { rounds: 3, cards: 1 },           // Stage 1: 3 rounds with 1 card
                { rounds: 9, cards: 'increment' }, // Stage 2: 9 rounds incrementing 2→10
                { rounds: 3, cards: 11 },          // Stage 3: 3 rounds with 11 cards
                { rounds: 9, cards: 'decrement' }, // Stage 4: 9 rounds decrementing 10→2
                { rounds: 3, cards: 1 },           // Stage 5: 3 rounds with 1 card
                { rounds: 3, cards: 11 }           // Stage 6: 3 rounds with 11 cards
            ]
        },
        4: {
            totalRounds: 30,
            stages: [
                { rounds: 4, cards: 1 },           // Stage 1: 4 rounds with 1 card
                { rounds: 7, cards: 'increment' }, // Stage 2: 7 rounds incrementing 2→8
                { rounds: 4, cards: 9 },           // Stage 3: 4 rounds with 9 cards
                { rounds: 7, cards: 'decrement' }, // Stage 4: 7 rounds decrementing 8→2
                { rounds: 4, cards: 1 },           // Stage 5: 4 rounds with 1 card
                { rounds: 4, cards: 9 }            // Stage 6: 4 rounds with 9 cards
            ]
        },
        5: {
            totalRounds: 30,
            stages: [
                { rounds: 5, cards: 1 },           // Stage 1: 5 rounds with 1 card
                { rounds: 5, cards: 'increment' }, // Stage 2: 5 rounds incrementing 2→6
                { rounds: 5, cards: 7 },           // Stage 3: 5 rounds with 7 cards
                { rounds: 5, cards: 'decrement' }, // Stage 4: 5 rounds decrementing 6→2
                { rounds: 5, cards: 1 },           // Stage 5: 5 rounds with 1 card
                { rounds: 5, cards: 7 }            // Stage 6: 5 rounds with 7 cards
            ]
        },
        6: {
            totalRounds: 32,
            stages: [
                { rounds: 6, cards: 1 },           // Stage 1: 6 rounds with 1 card
                { rounds: 4, cards: 'increment' }, // Stage 2: 4 rounds incrementing 2→5
                { rounds: 6, cards: 6 },           // Stage 3: 6 rounds with 6 cards
                { rounds: 4, cards: 'decrement' }, // Stage 4: 4 rounds decrementing 5→2
                { rounds: 6, cards: 1 },           // Stage 5: 6 rounds with 1 card
                { rounds: 6, cards: 6 }            // Stage 6: 6 rounds with 6 cards
            ]
        }
    },
    54: { // 54-card deck configurations (53 cards + 1 joker)
        2: {
            totalRounds: 56,
            stages: [
                { rounds: 2, cards: 1 },           // Stage 1: 2 rounds with 1 card
                { rounds: 24, cards: 'increment' }, // Stage 2: 24 rounds incrementing 2→25
                { rounds: 2, cards: 26 },          // Stage 3: 2 rounds with 26 cards
                { rounds: 24, cards: 'decrement' }, // Stage 4: 24 rounds decrementing 25→2
                { rounds: 2, cards: 1 },           // Stage 5: 2 rounds with 1 card
                { rounds: 2, cards: 26 }           // Stage 6: 2 rounds with 26 cards
            ]
        },
        3: {
            totalRounds: 42,
            stages: [
                { rounds: 3, cards: 1 },           // Stage 1: 3 rounds with 1 card
                { rounds: 15, cards: 'increment' }, // Stage 2: 15 rounds incrementing 2→16
                { rounds: 3, cards: 17 },          // Stage 3: 3 rounds with 17 cards
                { rounds: 15, cards: 'decrement' }, // Stage 4: 15 rounds decrementing 16→2
                { rounds: 3, cards: 1 },           // Stage 5: 3 rounds with 1 card
                { rounds: 3, cards: 17 }           // Stage 6: 3 rounds with 17 cards
            ]
        },
        4: {
            totalRounds: 38,
            stages: [
                { rounds: 4, cards: 1 },           // Stage 1: 4 rounds with 1 card
                { rounds: 11, cards: 'increment' }, // Stage 2: 11 rounds incrementing 2→12
                { rounds: 4, cards: 13 },          // Stage 3: 4 rounds with 13 cards
                { rounds: 11, cards: 'decrement' }, // Stage 4: 11 rounds decrementing 12→2
                { rounds: 4, cards: 1 },           // Stage 5: 4 rounds with 1 card
                { rounds: 4, cards: 13 }           // Stage 6: 4 rounds with 13 cards
            ]
        },
        5: {
            totalRounds: 36,
            stages: [
                { rounds: 5, cards: 1 },           // Stage 1: 5 rounds with 1 card
                { rounds: 8, cards: 'increment' }, // Stage 2: 8 rounds incrementing 2→9
                { rounds: 5, cards: 10 },          // Stage 3: 5 rounds with 10 cards
                { rounds: 8, cards: 'decrement' }, // Stage 4: 8 rounds decrementing 9→2
                { rounds: 5, cards: 1 },           // Stage 5: 5 rounds with 1 card
                { rounds: 5, cards: 10 }           // Stage 6: 5 rounds with 10 cards
            ]
        },
        6: {
            totalRounds: 36,
            stages: [
                { rounds: 6, cards: 1 },           // Stage 1: 6 rounds with 1 card
                { rounds: 6, cards: 'increment' }, // Stage 2: 6 rounds incrementing 2→7
                { rounds: 6, cards: 8 },           // Stage 3: 6 rounds with 8 cards
                { rounds: 6, cards: 'decrement' }, // Stage 4: 6 rounds decrementing 7→2
                { rounds: 6, cards: 1 },           // Stage 5: 6 rounds with 1 card
                { rounds: 6, cards: 8 }            // Stage 6: 6 rounds with 8 cards
            ]
        }
    }
};

// Special game types
const SPECIAL_GAMES = {
    'dark': 'Темная (Dark)',
    'golden': 'Золотая (Golden)',
    'miser': 'Мизер (Miser)',
    'noTrump': 'Бескозырка (No Trump)',
    'frontal': 'Лобовая (Frontal)'
};

// Current deck size (default to 36)
let currentDeckSize = 36;

// Persistence keys
const STORAGE_KEYS = {
    CURRENT_GAME: 'raspisnoyPokerCurrentGame',
    GAME_HISTORY: 'raspisnoyPokerGameHistory',
    PLAYERS: 'raspisnoyPokerPlayers',
    DECK_SIZE: 'raspisnoyPokerDeckSize'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadCustomStages();
    loadGameState();
    initializeGame();
    loadGameHistory();
    
    // Start with menu screen
    showMenu();
    
    // Check if there's a saved game and show appropriate screen
    const savedGame = localStorage.getItem(STORAGE_KEYS.CURRENT_GAME);
    if (savedGame) {
        try {
            const gameState = JSON.parse(savedGame);
            if (gameState.currentGame.gameStarted) {
                // If game is in progress, show counting screen
                showCountingScreen();
            }
        } catch (e) {
            console.error('Failed to parse saved game:', e);
        }
    }
});

function saveCurrentGame() {
    try {
        const gameState = {
            currentGame: currentGame,
            players: players,
            currentDeckSize: currentDeckSize,
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.CURRENT_GAME, JSON.stringify(gameState));
        console.log('Game state saved:', gameState);
    } catch (e) {
        console.error('Failed to save current game:', e);
    }
}

function loadGameState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_GAME);
        if (saved) {
            const gameState = JSON.parse(saved);
            
            // Restore game state
            currentGame = gameState.currentGame;
            players = gameState.players;
            currentDeckSize = gameState.currentDeckSize;
            
            // Ensure roundResults is properly initialized
            if (!currentGame.roundResults || !Array.isArray(currentGame.roundResults)) {
                currentGame.roundResults = [];
            }
            
            // Ensure currentRoundData is properly initialized
            if (!currentGame.currentRoundData) {
                currentGame.currentRoundData = null;
            }
            
            // Convert date strings back to Date objects
            if (currentGame.startTime) {
                currentGame.startTime = new Date(currentGame.startTime);
            }
            if (currentGame.endTime) {
                currentGame.endTime = new Date(currentGame.endTime);
            }
            
            console.log('Game state restored:', gameState);
            
            // Restore UI state
            restoreUIState();
            
            // No popup for restored games - just continue silently
        }
    } catch (e) {
        console.error('Failed to load game state:', e);
        // If loading fails, start fresh
        initializeFreshGame();
    }
}

function restoreUIState() {
    // Restore player inputs
    const playerInputs = document.querySelectorAll('.player-input input');
    players.forEach((player, index) => {
        if (playerInputs[index]) {
            playerInputs[index].value = player;
        }
    });
    
    // Restore deck size
    const deckSizeSelect = document.getElementById('deckSize');
    if (deckSizeSelect) {
        deckSizeSelect.value = currentDeckSize;
    }
    
    // Restore game settings
    const maxCardsInput = document.getElementById('maxCards');
    if (maxCardsInput) {
        maxCardsInput.value = currentGame.maxCards;
    }
    
    const currentRoundInput = document.getElementById('currentRound');
    if (currentRoundInput) {
        currentRoundInput.value = currentGame.currentRound;
    }
    
    // Recalculate cards per hand based on current round
    currentGame.cardsPerHand = getCardsPerHand();
    
    const cardsPerHandInput = document.getElementById('cardsPerHand');
    if (cardsPerHandInput) {
        cardsPerHandInput.value = currentGame.cardsPerHand;
    }
    
    // Restore game lock status
    if (currentGame.gameStarted) {
        const addPlayerBtn = document.querySelector('.add-player-btn');
        const removePlayerBtns = document.querySelectorAll('.remove-player');
        const deckSizeSelect = document.getElementById('deckSize');
        
        if (addPlayerBtn) addPlayerBtn.disabled = true;
        removePlayerBtns.forEach(btn => btn.disabled = true);
        if (deckSizeSelect) deckSizeSelect.disabled = true;
        
        // Show game status
        const gameStatus = document.getElementById('gameStatus');
        if (gameStatus) {
            gameStatus.style.display = 'block';
        }
    }
    
    // Update displays
    updateScoreboard();
    updateRoundInfo();
    updateGameStatus();
    updateBidValidation();
    updateSaveStatus();
}

function initializeFreshGame() {
    // Get initial players from HTML
    const playerInputs = document.querySelectorAll('.player-input input');
    players = Array.from(playerInputs).map(input => input.value);
    
    // Initialize scores
    players.forEach(player => {
        currentGame.scores[player] = 0;
    });
    
    currentGame.startTime = new Date();
    currentGame.maxCards = getMaxCardsForPlayerCount(players.length);
    currentGame.cardsPerHand = getCardsPerHand();
    
    // Set initial deck size
    const deckSizeSelect = document.getElementById('deckSize');
    currentDeckSize = parseInt(deckSizeSelect.value);
    
    // Ensure roundResults is initialized
    if (!currentGame.roundResults || !Array.isArray(currentGame.roundResults)) {
        currentGame.roundResults = [];
    }
    
    updateScoreboard();
    updateRoundInfo();
    updateGameStatus();
    updateBidValidation();
    updateSaveStatus();
}

function initializeGame() {
    // If no saved game state, initialize fresh
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_GAME)) {
        initializeFreshGame();
    }
    // Otherwise, the game state was already loaded in loadGameState()
}

function addPlayer() {
    // Check if game has started and player count is locked
    if (currentGame.gameStarted) {
        alert('Игра уже началась! Количество игроков заблокировано до конца игры или сброса.');
        return;
    }
    
    const playerInputs = document.querySelector('.player-inputs');
    const playerCount = playerInputs.children.length;
    const newPlayerId = `player${playerCount + 1}`;
    
    const newPlayerDiv = document.createElement('div');
    newPlayerDiv.className = 'player-input';
    newPlayerDiv.innerHTML = `
        <input type="text" id="${newPlayerId}" placeholder="Player ${playerCount + 1}" value="Player ${playerCount + 1}">
        <button class="remove-player" onclick="removePlayer(this)">×</button>
    `;
    
    playerInputs.appendChild(newPlayerDiv);
    
    // Add event listener to update player name
    const input = newPlayerDiv.querySelector('input');
    input.addEventListener('input', function() {
        updatePlayerNames();
        updateDeckPreparationTips();
    });
    
    updatePlayerNames();
}

function removePlayer(button) {
    // Check if game has started and player count is locked
    if (currentGame.gameStarted) {
        alert('Игра уже началась! Количество игроков заблокировано до конца игры или сброса.');
        return;
    }
    
    const playerInput = button.parentElement;
    const playerInputs = document.querySelector('.player-inputs');
    
    if (playerInputs.children.length > 3) {
        playerInput.remove();
        updatePlayerNames();
    }
}

function updatePlayerNames() {
    const playerInputs = document.querySelectorAll('.player-input input');
    players = Array.from(playerInputs).map(input => input.value);
    
    // Update scores for new players
    players.forEach(player => {
        if (!currentGame.scores.hasOwnProperty(player)) {
            currentGame.scores[player] = 0;
        }
    });
    
    // Remove scores for removed players
    Object.keys(currentGame.scores).forEach(player => {
        if (!players.includes(player)) {
            delete currentGame.scores[player];
        }
    });
    
    // Recalculate cards per hand based on new player count
    currentGame.cardsPerHand = getCardsPerHand();
    
    // Update max cards based on new player count and deck size
    const playerCount = players.length;
    const maxCards = getMaxCardsForPlayerCount(playerCount);
    currentGame.maxCards = maxCards;
    
    updateScoreboard();
    updateRoundInfo();
    updateDeckPreparationTips();
    
    // Save game state after player changes
    saveCurrentGame();
}

function updateRoundInfo() {
    const roundDisplay = document.getElementById('roundDisplay');
    const roundDisplay2 = document.getElementById('roundDisplay2');
    const cardsDisplay = document.getElementById('cardsDisplay');
    const cardsDisplay2 = document.getElementById('cardsDisplay2');
    const deckDisplay = document.getElementById('deckDisplay');
    const totalRoundsDisplay = document.getElementById('totalRoundsDisplay');
    
    if (roundDisplay) roundDisplay.textContent = currentGame.currentRound;
    if (roundDisplay2) roundDisplay2.textContent = currentGame.currentRound;
    if (cardsDisplay) cardsDisplay.textContent = currentGame.cardsPerHand;
    if (cardsDisplay2) cardsDisplay2.textContent = currentGame.cardsPerHand;
    if (deckDisplay) deckDisplay.textContent = currentDeckSize;
    if (totalRoundsDisplay) totalRoundsDisplay.textContent = calculateTotalRounds();
    
    // Add bidding regulation info
    const totalBiddingCap = players.length * currentGame.cardsPerHand;
    const individualBidCap = currentGame.cardsPerHand;
    
    // Update or create bidding regulation display
    let biddingRegulationDisplay = document.getElementById('biddingRegulationDisplay');
    const roundInfo = document.querySelector('.round-info');
    
    if (roundInfo) {
        if (!biddingRegulationDisplay) {
            biddingRegulationDisplay = document.createElement('span');
            biddingRegulationDisplay.id = 'biddingRegulationDisplay';
            biddingRegulationDisplay.style.cssText = 'color: #339af0; font-weight: bold; margin-left: 10px;';
            roundInfo.appendChild(biddingRegulationDisplay);
        }
        
        if (biddingRegulationDisplay) {
            biddingRegulationDisplay.textContent = `Ставки: макс. ${totalBiddingCap} всего, до ${individualBidCap} на игрока`;
            biddingRegulationDisplay.title = `Общая максимальная ставка: ${totalBiddingCap} (${players.length} игроков × ${currentGame.cardsPerHand} карт), Индивидуальная максимальная ставка: ${individualBidCap} (количество карт в руке)`;
        }
    }
    
    // Add dealer and player order info
    const currentDealer = getCurrentDealer();
    const playerOrder = getPlayerOrder();
    const firstPlayer = playerOrder[1]; // Player to the left of dealer (first to play)
    
    // Update or create dealer info display
    let dealerInfoDisplay = document.getElementById('dealerInfoDisplay');
    if (roundInfo) {
        if (!dealerInfoDisplay) {
            dealerInfoDisplay = document.createElement('div');
            dealerInfoDisplay.id = 'dealerInfoDisplay';
            dealerInfoDisplay.style.cssText = 'background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 10px; border-left: 4px solid #339af0;';
            roundInfo.appendChild(dealerInfoDisplay);
        }
    }
    
    if (dealerInfoDisplay && currentDealer && playerOrder.length > 0) {
        // Create player order visualization
        const playerOrderHtml = playerOrder.map((player, index) => {
            let playerClass = 'player-order-item';
            if (player === currentDealer) playerClass += ' dealer';
            if (index === 1) playerClass += ' first-player';
            
            return `<span class="${playerClass}">${player}</span>`;
        }).join('<span class="player-order-arrow">→</span>');
        
        dealerInfoDisplay.innerHTML = `
            <div class="dealer-info-title">
                <span>🎯</span>
                <span>Информация о раздающем</span>
            </div>
            <div class="dealer-info-item">
                <span class="dealer-info-label">Раздающий:</span>
                <span class="dealer-info-value">${currentDealer}</span>
            </div>
            <div class="dealer-info-item">
                <span class="dealer-info-label">Первый игрок:</span>
                <span class="dealer-info-value">${firstPlayer}</span>
            </div>
            <div class="dealer-info-item">
                <span class="dealer-info-label">Порядок игры:</span>
            </div>
            <div class="player-order-display">
                ${playerOrderHtml}
            </div>
        `;
        dealerInfoDisplay.style.display = 'block';
    } else if (dealerInfoDisplay) {
        dealerInfoDisplay.style.display = 'none';
    }
}

function updateScoreboard() {
    // Update minimalistic scoreboard
    updateMinimalScoreboard();
    
    // Update rules content
    updateRulesContent();
}

// Update rules content
function updateRulesContent() {
    const scoringRulesText = document.getElementById('scoringRulesText');
    if (scoringRulesText) {
        scoringRulesText.innerHTML = getScoringRulesText();
    }
    
    // Update round display elements
    const roundDisplay3 = document.getElementById('roundDisplay3');
    const cardsDisplay3 = document.getElementById('cardsDisplay3');
    const deckDisplay2 = document.getElementById('deckDisplay2');
    const totalRoundsDisplay2 = document.getElementById('totalRoundsDisplay2');
    
    if (roundDisplay3) roundDisplay3.textContent = currentGame.currentRound;
    if (cardsDisplay3) cardsDisplay3.textContent = getCardsPerHand();
    if (deckDisplay2) deckDisplay2.textContent = currentGame.lockedDeckSize;
    if (totalRoundsDisplay2) totalRoundsDisplay2.textContent = calculateTotalRounds();
    
    // Initial bid validation update
    updateBidValidation();
}

function addScore(player, points) {
    if (currentGame.scores[player] === undefined) {
        currentGame.scores[player] = 0;
    }
    currentGame.scores[player] += points;
    
    updateScoreboard();
    saveCurrentGame(); // Auto-save after score change
    showSaveIndicator();
}

function addCustomScore(player) {
    const input = document.getElementById(`custom-score-${player}`);
    const points = parseInt(input.value);
    
    if (!isNaN(points)) {
        addScore(player, points);
        input.value = '';
    }
}

function calculateRoundScores() {
    // Validate bids before calculating scores
    if (!validateBids()) {
        return false; // Stop if bids are invalid
    }
    
    // Use current round data if available, otherwise create new data
    let roundResults = [];
    
    if (currentGame.currentRoundData && currentGame.currentRoundData.results) {
        // Use existing current round data
        roundResults = [...currentGame.currentRoundData.results];
    } else {
        // Create new round data
        players.forEach(player => {
            const bid = getPlayerBid(player) || 0;
            const tricks = getPlayerTricks(player) || 0;
            roundResults.push({ player, bid, tricks, points: 0 });
        });
    }
    
    // Calculate points for each player
    roundResults.forEach(result => {
        let points = 0;
        
        // Check if player is blind bidding
        const isBlind = isBlindBidding(result.player);
        result.blindBidding = isBlind;
        
        if (currentGame.isSpecialGame) {
            // Special game scoring
            switch (currentGame.specialGameType) {
                case 'dark':
                    // Dark game - same as normal but blind
                    points = calculateNormalScore(result.bid, result.tricks);
                    break;
                case 'golden':
                    // Golden game - every trick is worth 10 points
                    points = result.tricks * 10;
                    break;
                case 'miser':
                    // Miser game - penalty for each trick
                    points = -result.tricks * 10;
                    break;
                case 'noTrump':
                    // No trump game - normal scoring
                    points = calculateNormalScore(result.bid, result.tricks);
                    break;
                case 'frontal':
                    // Frontal game - normal scoring but cards on forehead
                    points = calculateNormalScore(result.bid, result.tricks);
                    break;
                default:
                    points = calculateNormalScore(result.bid, result.tricks);
            }
        } else {
            // Normal game scoring
            points = calculateNormalScore(result.bid, result.tricks);
        }
        
        // Apply blind bidding multiplier (x2) if player is bidding blind
        if (isBlind) {
            points *= 2;
            console.log(`${result.player} is bidding blind - points multiplied by 2: ${points}`);
        }
        
        addScore(result.player, points);
        result.points = points;
        
        // Show penalty notification if applicable
        if (result.bid > 0 && result.tricks < result.bid) {
            let penalty = 0;
            const currentStage = getCurrentStage();
            
            if (currentStage === 1 || currentStage === 5 || currentStage === 6) {
                // First stage penalty rules (Stage 1, 5, 6)
                if (result.bid === 1 && result.tricks === 0) {
                    penalty = -30;
                } else {
                    // Fallback for other first stage combinations
                    penalty = -(result.bid - result.tricks) * 10;
                }
            } else {
                // Normal round penalty rules (Stage 2, 3, 4)
                penalty = -(result.bid - result.tricks) * 10;
            }
            // Penalty notification removed - information is now shown in transition screen
        }
    });
    
    // Add completed round to round history
    currentGame.roundResults.push({
        round: currentGame.currentRound,
        cardsPerHand: currentGame.cardsPerHand,
        specialGame: currentGame.isSpecialGame ? currentGame.specialGameType : null,
        results: roundResults
    });
    
    // Clear current round data
    currentGame.currentRoundData = null;
    
    // Clear blind bidding players for next round
    currentGame.blindBiddingPlayers = [];
    
    // Clear bid and trick inputs (with null checks for minimalistic interface)
    players.forEach(player => {
        const bidElement = document.getElementById(`bid_${player}`);
        const tricksElement = document.getElementById(`tricks_${player}`);
        
        // Clear new minimalistic interface elements if they exist
        if (bidElement) bidElement.textContent = '0';
        if (tricksElement) tricksElement.textContent = '0';
    });
    return true; // Indicate success
}

function calculateTotalRounds() {
    const config = getRoundConfig();
    return config ? config.totalRounds : 30; // fallback to 30 if no config
}

function getCurrentStage() {
    const config = getRoundConfig();
    if (!config) return 1; // fallback
    
    let roundCount = 0;
    for (let stage = 0; stage < config.stages.length; stage++) {
        roundCount += config.stages[stage].rounds;
        if (currentGame.currentRound <= roundCount) {
            return stage + 1;
        }
    }
    return config.stages.length;
}

function getCardsPerHand() {
    const playerCount = players.length;
    const config = getRoundConfig();
    if (!config) return 1; // fallback
    
    let roundCount = 0;
    let stageStartRound = 1;
    
    for (let stage = 0; stage < config.stages.length; stage++) {
        const stageConfig = config.stages[stage];
        const stageEndRound = roundCount + stageConfig.rounds;
        
        if (currentGame.currentRound <= stageEndRound) {
            const stageRound = currentGame.currentRound - stageStartRound + 1;
            
            if (stageConfig.cards === 1) {
                return 1;
            } else if (stageConfig.cards === 'increment') {
                return stageRound + 1; // Start from 2, so add 1
            } else if (stageConfig.cards === 'decrement') {
                const maxCards = getMaxCardsForPlayerCount(playerCount);
                return maxCards - stageRound + 1;
            } else {
                return stageConfig.cards; // Fixed number of cards
            }
        }
        
        roundCount = stageEndRound;
        stageStartRound = roundCount + 1;
    }
    
    return 1; // fallback
}

function getMaxCardsForPlayerCount(playerCount) {
    if (currentDeckSize === 54) {
        // 54-card deck (53 playable cards + 1 joker)
        switch (playerCount) {
            case 2: return 26;
            case 3: return 17;
            case 4: return 13;
            case 5: return 10;
            case 6: return 8;
            default: return 13;
        }
    } else {
        // 36-card deck (36 total cards including joker)
        switch (playerCount) {
            case 2: return 18;
            case 3: return 12;
            case 4: return 9;
            case 5: return 7;
            case 6: return 6;
            default: return 9;
        }
    }
}

function getStageInfo() {
    const config = getRoundConfig();
    if (!config) return { stage: 1, stageRound: 1, totalStageRounds: 4 };
    
    let roundCount = 0;
    let stageStartRound = 1;
    
    for (let stage = 0; stage < config.stages.length; stage++) {
        const stageConfig = config.stages[stage];
        const stageEndRound = roundCount + stageConfig.rounds;
        
        if (currentGame.currentRound <= stageEndRound) {
            const stageRound = currentGame.currentRound - stageStartRound + 1;
            return {
                stage: stage + 1,
                stageRound: stageRound,
                totalStageRounds: stageConfig.rounds,
                stageConfig: stageConfig
            };
        }
        
        roundCount = stageEndRound;
        stageStartRound = roundCount + 1;
    }
    
    return { stage: 1, stageRound: 1, totalStageRounds: 4 };
}

function getScoringRulesText() {
    const stageInfo = getStageInfo();
    const stage = stageInfo.stage;
    const stageRound = stageInfo.stageRound;
    const totalStageRounds = stageInfo.totalStageRounds;
    const playerCount = players.length;
    const maxCards = getMaxCardsForPlayerCount(playerCount);
    const totalBiddingCap = players.length * currentGame.cardsPerHand;
    const individualBidCap = currentGame.cardsPerHand;
    const totalPossibleTricks = currentGame.cardsPerHand;
    
    const biddingRules = ` | Ставки: макс. ${totalBiddingCap} всего (${players.length}×${currentGame.cardsPerHand}), до ${individualBidCap} на игрока, НЕ равно ${totalPossibleTricks}`;
    
    switch (stage) {
        case 1:
            return `Этап 1 (${stageRound}/${totalStageRounds}): Заказ 1, Взятка 1 = +30 | Заказ 1, Взятка 0 = -30 | Заказ 0, Взятка 0 = +15 | Заказ 0, Взятка 1 = +5${biddingRules}`;
        case 2:
            return `Этап 2 (${stageRound}/${totalStageRounds}): Заказ 1, Взятка 1 = +10 | Заказ 1, Взятка 0 = -10 | Заказ 0, Взятка 0 = +5 | Заказ 0, Взятка 1 = +1${biddingRules}`;
        case 3:
            return `Этап 3 (${stageRound}/${totalStageRounds}): Заказ 1, Взятка 1 = +10 | Заказ 1, Взятка 0 = -10 | Заказ 0, Взятка 0 = +5 | Заказ 0, Взятка 1 = +1${biddingRules}`;
        case 4:
            return `Этап 4 (${stageRound}/${totalStageRounds}): Заказ 1, Взятка 1 = +10 | Заказ 1, Взятка 0 = -10 | Заказ 0, Взятка 0 = +5 | Заказ 0, Взятка 1 = +1${biddingRules}`;
        case 5:
            return `Этап 5 (${stageRound}/${totalStageRounds}): Заказ 1, Взятка 1 = +30 | Заказ 1, Взятка 0 = -30 | Заказ 0, Взятка 0 = +15 | Заказ 0, Взятка 1 = +5${biddingRules}`;
        case 6:
            return `Этап 6 (${stageRound}/${totalStageRounds}): Слепой этап - Заказ 1, Взятка 1 = +30 | Заказ 1, Взятка 0 = -30 | Заказ 0, Взятка 0 = +15 | Заказ 0, Взятка 1 = +5${biddingRules}`;
        default:
            return `Правила: Точный заказ = +10 за взятку, Перебор = +1 за взятку, Недобор = -10 за недостающую взятку${biddingRules}`;
    }
}

function calculateNormalScore(bid, tricks) {
    const currentStage = getCurrentStage();
    
    let result = 0;
    
    // Stage 1 & 5: First stage rules (1 card rounds)
    if (currentStage === 1 || currentStage === 5) {
        if (bid === 1 && tricks === 1) {
            result = 30;
        } else if (bid === 1 && tricks === 0) {
            result = -30;
        } else if (bid === 0 && tricks === 0) {
            result = 15;
        } else if (bid === 0 && tricks === 1) {
            result = 5; // Fixed: Should be +5, not +15
        } else {
            result = 0;
        }
    }
    // Stage 6: Blind stage (max cards) - same as first stage rules
    else if (currentStage === 6) {
        if (bid === 1 && tricks === 1) {
            result = 30;
        } else if (bid === 1 && tricks === 0) {
            result = -30;
        } else if (bid === 0 && tricks === 0) {
            result = 15;
        } else if (bid === 0 && tricks === 1) {
            result = 5; // Fixed: Should be +5, not +15
        } else {
            result = 0;
        }
    }
    // Stages 2, 3, 4: Normal scoring rules
    else {
        if (bid === 0) {
            // Pass - 5 points if no tricks taken
            result = tricks === 0 ? 5 : 1;
        } else if (tricks === bid) {
            // Exact bid - 10 points per trick
            result = tricks * 10;
        } else if (tricks > bid) {
            // Overbid - 1 point per trick
            result = tricks;
        } else {
            // Underbid - penalty equal to the bid amount (bid was not fulfilled)
            result = -bid * 10;
        }
    }
    
    return result;
}

function nextRound() {
    // Validate tricks before proceeding
    if (!validateTricks()) {
        alert(`Невозможно перейти к следующему раунду!\n\nОбщее количество взяток должно быть равно ${currentGame.cardsPerHand} (количество карт в руке).\n\nПожалуйста, проверьте и исправьте количество взяток у всех игроков.`);
        return; // Don't progress to next round
    }
    
    // Calculate scores for current round
    const scoresCalculated = calculateRoundScores();
    
    // If scores weren't calculated due to invalid bids, stop here
    if (!scoresCalculated) {
        return; // Don't progress to next round
    }
    
    // If this is the first round, lock the game settings
    if (currentGame.currentRound === 1) {
        currentGame.gameStarted = true;
        currentGame.lockedPlayerCount = players.length;
        currentGame.lockedDeckSize = currentDeckSize;
        
        // Disable player management controls
        const addPlayerBtn = document.querySelector('.add-player-btn');
        const removePlayerBtns = document.querySelectorAll('.remove-player');
        const deckSizeSelect = document.getElementById('deckSize');
        
        if (addPlayerBtn) addPlayerBtn.disabled = true;
        removePlayerBtns.forEach(btn => btn.disabled = true);
        if (deckSizeSelect) deckSizeSelect.disabled = true;
        
        alert(`Игра заблокирована! Количество игроков (${currentGame.lockedPlayerCount}) и размер колоды (${currentDeckSize}) заблокированы до конца игры или сброса.`);
    }
    
    // Rotate dealer for next round
    if (currentGame.dealerRotation) {
        const previousDealer = getCurrentDealer();
        rotateDealer();
        const newDealer = getCurrentDealer();
        console.log(`Dealer rotated: ${previousDealer} → ${newDealer}`);
    }
    
    currentGame.currentRound++;
    
    // Update cards per hand based on round progression
    const totalRounds = calculateTotalRounds();
    console.log(`Total rounds in game: ${totalRounds}`);
    
    // Use the new getCardsPerHand function
    currentGame.cardsPerHand = getCardsPerHand();
    
    console.log(`Round ${currentGame.currentRound}: ${currentGame.cardsPerHand} cards per hand`);
    
    // Reset special game status
    currentGame.isSpecialGame = false;
    currentGame.specialGameType = null;
    
    updateRoundInfo();
    updateScoreboard();
    updateGameStatus(); // Update game status after each round
    saveCurrentGame(); // Auto-save after round progression
    showSaveIndicator();
    
    // Reset minimalistic interface inputs for new round
    resetMinimalisticInputs();
    
    // Check if game is finished
    if (currentGame.currentRound > totalRounds) {
        console.log('=== GAME FINISHED ===');
        console.log('Final scores:', currentGame.scores);
        
        // End the game
        currentGame.endTime = new Date();
        
        // Find the winner
        const finalScores = Object.values(currentGame.scores);
        const maxScore = Math.max(...finalScores);
        const winners = Object.keys(currentGame.scores).filter(player => currentGame.scores[player] === maxScore);
        
        currentGame.winner = winners.length === 1 ? winners[0] : 'Tie';
        
        // Save to history
        const gameResult = {
            winner: currentGame.winner,
            scores: { ...currentGame.scores },
            startTime: currentGame.startTime,
            endTime: currentGame.endTime,
            duration: Math.round((currentGame.endTime - currentGame.startTime) / 1000 / 60),
            rounds: currentGame.roundResults
        };
        gameHistory.unshift(gameResult);
        saveGameHistory();
        updateGameHistory();
        
        // Clear current game from storage since it's finished
        localStorage.removeItem(STORAGE_KEYS.CURRENT_GAME);
        
        // Show celebration screen
        showCelebrationScreen();
        
        return; // Don't show the round start alert
    }
    
    // Show transition screen instead of popup
    showTransitionScreen();
}

function toggleSpecialGame() {
    const gameType = prompt(`Выберите специальную игру:\n1. Темная (Dark)\n2. Золотая (Golden)\n3. Мизер (Miser)\n4. Бескозырка (No Trump)\n5. Лобовая (Frontal)\n\nВведите номер (1-5):`);
    
    if (gameType) {
        const gameTypes = ['dark', 'golden', 'miser', 'noTrump', 'frontal'];
        const selectedType = gameTypes[parseInt(gameType) - 1];
        
        if (selectedType) {
            currentGame.isSpecialGame = true;
            currentGame.specialGameType = selectedType;
            alert(`Специальная игра: ${SPECIAL_GAMES[selectedType]}`);
            
            // Save game state after special game selection
            saveCurrentGame();
        }
    }
}

function newGame() {
    if (confirm('Начать новую игру? Текущие очки будут сохранены в истории.')) {
        // Save current game if it has scores
        if (Object.values(currentGame.scores).some(score => score !== 0)) {
            const gameResult = {
                winner: null,
                scores: { ...currentGame.scores },
                startTime: currentGame.startTime,
                endTime: new Date(),
                duration: Math.round((new Date() - currentGame.startTime) / 1000 / 60),
                rounds: currentGame.roundResults
            };
            gameHistory.unshift(gameResult);
            saveGameHistory();
        }
        
        // Reset for new game
        currentGame = {
            startTime: new Date(),
            endTime: null,
            winner: null,
            scores: {},
            currentRound: 1,
            maxCards: getMaxCardsForPlayerCount(players.length),
            cardsPerHand: getCardsPerHand(), // Use new logic
            isSpecialGame: false,
            specialGameType: null,
            roundResults: [],
            currentRoundData: null, // Add this field
            gameStarted: false, // Reset game lock
            lockedPlayerCount: 0,
            lockedDeckSize: 36,
            currentDealer: 0,
            dealerRotation: true,
            blindBiddingPlayers: []
        };
        
        // Reset notifications flag for new game
        notificationsShown = false;
        
        players.forEach(player => {
            currentGame.scores[player] = 0;
        });
        
        // Re-enable player management controls
        const addPlayerBtn = document.querySelector('.add-player-btn');
        const removePlayerBtns = document.querySelectorAll('.remove-player');
        const deckSizeSelect = document.getElementById('deckSize');
        
        if (addPlayerBtn) addPlayerBtn.disabled = false;
        removePlayerBtns.forEach(btn => btn.disabled = false);
        if (deckSizeSelect) deckSizeSelect.disabled = false;
        
        // Show setup screen for new game
        showGameSetup();
        
        updateScoreboard();
        updateRoundInfo();
        updateGameHistory();
        updateGameStatus(); // Update game status
        updateBidValidation(); // Reset bid validation
        updateSaveStatus();
        
        // Save new game state
        saveCurrentGame();
    }
}

function resetGame() {
    if (confirm('Сбросить все очки и начать заново?')) {
        players.forEach(player => {
            currentGame.scores[player] = 0;
        });
        
        currentGame.startTime = new Date();
        currentGame.endTime = null;
        currentGame.winner = null;
        currentGame.currentRound = 1;
        currentGame.cardsPerHand = getCardsPerHand(); // Use new logic
        currentGame.isSpecialGame = false;
        currentGame.specialGameType = null;
        currentGame.roundResults = [];
        currentGame.currentRoundData = null; // Add this field
        currentGame.gameStarted = false; // Reset game lock
        currentGame.lockedPlayerCount = 0;
        currentGame.lockedDeckSize = 36;
        currentGame.blindBiddingPlayers = [];
        
        // Reset notifications flag for reset game
        notificationsShown = false;
        
        // Re-enable player management controls
        const addPlayerBtn = document.querySelector('.add-player-btn');
        const removePlayerBtns = document.querySelectorAll('.remove-player');
        const deckSizeSelect = document.getElementById('deckSize');
        
        if (addPlayerBtn) addPlayerBtn.disabled = false;
        removePlayerBtns.forEach(btn => btn.disabled = false);
        if (deckSizeSelect) deckSizeSelect.disabled = false;
        
        // Show setup screen for reset game
        showGameSetup();
        
        updateScoreboard();
        updateRoundInfo();
        updateGameStatus(); // Update game status
        updateBidValidation(); // Reset bid validation
        updateSaveStatus();
        
        // Save reset game state
        saveCurrentGame();
    }
}

function updateGameHistory() {
    const historyContainer = document.getElementById('gameHistory');
    historyContainer.innerHTML = '';
    
    gameHistory.forEach((game, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const duration = game.duration || 0;
        const rounds = game.rounds ? game.rounds.length : 0;
        
        historyItem.innerHTML = `
            <h3>Игра ${index + 1}</h3>
            <p>Длительность: ${duration} минут | Раундов: ${rounds}</p>
            <p>Очки: ${Object.entries(game.scores).map(([player, score]) => `${player}: ${score}`).join(', ')}</p>
            <p>Дата: ${game.startTime.toLocaleDateString()} ${game.startTime.toLocaleTimeString()}</p>
        `;
        
        historyContainer.appendChild(historyItem);
    });
}

function saveGameHistory() {
    try {
        localStorage.setItem('raspisnoyPokerGameHistory', JSON.stringify(gameHistory));
    } catch (e) {
        console.error('Failed to save game history:', e);
    }
}

function loadGameHistory() {
    try {
        const saved = localStorage.getItem('raspisnoyPokerGameHistory');
        if (saved) {
            gameHistory = JSON.parse(saved);
            // Convert date strings back to Date objects
            gameHistory.forEach(game => {
                game.startTime = new Date(game.startTime);
                game.endTime = new Date(game.endTime);
            });
            updateGameHistory();
        }
    } catch (e) {
        console.error('Failed to load game history:', e);
        gameHistory = [];
    }
}

function debugRoundConfiguration() {
    const playerCount = players.length;
    const config = getRoundConfig();
    const stageInfo = getStageInfo();
    const totalRounds = calculateTotalRounds();
    const maxCards = getMaxCardsForPlayerCount(playerCount);
    
    console.log('=== ROUND CONFIGURATION DEBUG ===');
    console.log(`Deck size: ${currentDeckSize} cards`);
    console.log(`Player count: ${playerCount}`);
    console.log(`Total rounds: ${totalRounds}`);
    console.log(`Current round: ${currentGame.currentRound}`);
    console.log(`Current stage: ${stageInfo.stage}`);
    console.log(`Stage round: ${stageInfo.stageRound}/${stageInfo.totalStageRounds}`);
    console.log(`Cards per hand: ${currentGame.cardsPerHand}`);
    console.log(`Max cards for ${playerCount} players: ${maxCards}`);
    
    if (config) {
        console.log('Stage configuration:');
        config.stages.forEach((stage, index) => {
            console.log(`  Stage ${index + 1}: ${stage.rounds} rounds, ${stage.cards} cards`);
        });
    }
    console.log('================================');
}

function changeDeckSize() {
    // Check if game has started and deck size is locked
    if (currentGame.gameStarted) {
        alert('Игра уже началась! Размер колоды заблокирован до конца игры или сброса.');
        // Reset the select to the locked value
        const deckSizeSelect = document.getElementById('deckSize');
        deckSizeSelect.value = currentGame.lockedDeckSize;
        return;
    }
    
    const deckSizeSelect = document.getElementById('deckSize');
    const newDeckSize = parseInt(deckSizeSelect.value);
    
    if (newDeckSize !== currentDeckSize) {
        currentDeckSize = newDeckSize;
        
        // Recalculate cards per hand based on new deck size
        currentGame.cardsPerHand = getCardsPerHand();
        
        // Update the max cards based on new deck size
        const playerCount = players.length;
        const maxCards = getMaxCardsForPlayerCount(playerCount);
        currentGame.maxCards = maxCards;
        
        console.log(`Deck size changed to ${currentDeckSize} cards`);
        console.log(`Max cards for ${playerCount} players: ${maxCards}`);
        
        updateScoreboard();
        updateRoundInfo();
        updateDeckPreparationTips();
        
        // Save game state after deck size change
        saveCurrentGame();
    }
}

function validateBids() {
    const totalPossibleTricks = currentGame.cardsPerHand; // Total tricks possible (same as cards per hand)
    const totalBiddingCap = players.length * currentGame.cardsPerHand; // Total bidding cap: players × cards
    const individualBidCap = currentGame.cardsPerHand; // Individual cap: cards in hand
    
    let totalBids = 0;
    const playerBids = {};
    let hasInvalidIndividualBid = false;
    let invalidPlayer = '';
    
    // Collect all bids and check individual caps
    players.forEach(player => {
        const bid = getPlayerBid(player) || 0;
        totalBids += bid;
        playerBids[player] = bid;
        
        // Check individual bid cap
        if (bid > individualBidCap) {
            hasInvalidIndividualBid = true;
            invalidPlayer = player;
        }
    });
    
    // Check total bidding cap
    if (totalBids > totalBiddingCap) {
        const errorMessage = `Недопустимые ставки!\n\nОбщая сумма ставок: ${totalBids}\nМаксимальная допустимая сумма: ${totalBiddingCap} (${players.length} игроков × ${currentGame.cardsPerHand} карт)\n\nТекущие ставки:\n${Object.entries(playerBids).map(([player, bid]) => `${player}: ${bid}`).join('\n')}\n\nУменьшите общую сумму ставок до ${totalBiddingCap} или меньше.`;
        alert(errorMessage);
        return false;
    }
    
    // Check that total bids is not equal to total possible tricks
    if (totalBids === totalPossibleTricks) {
        const errorMessage = `Недопустимые ставки!\n\nОбщая сумма ставок: ${totalBids}\nОбщая сумма НЕ может быть равна количеству возможных взяток: ${totalPossibleTricks}\n\nТекущие ставки:\n${Object.entries(playerBids).map(([player, bid]) => `${player}: ${bid}`).join('\n')}\n\nИзмените ставки так, чтобы общая сумма не была равна ${totalPossibleTricks}.`;
        alert(errorMessage);
        return false;
    }
    
    // Check individual bid cap
    if (hasInvalidIndividualBid) {
        const errorMessage = `Недопустимая ставка игрока!\n\n${invalidPlayer}: ${playerBids[invalidPlayer]}\nМаксимальная ставка на игрока: ${individualBidCap} (количество карт в руке)\n\nУменьшите ставку ${invalidPlayer} до ${individualBidCap} или меньше.`;
        alert(errorMessage);
        return false;
    }
    
    console.log(`Bid validation: ${totalPossibleTricks} possible tricks, ${totalBids} total bids, max total: ${totalBiddingCap}, max individual: ${individualBidCap}`);
    console.log('Player bids:', playerBids);
    
    return true;
}

function updateGameStatus() {
    const gameStatus = document.getElementById('gameStatus');
    const gameSetup = document.querySelector('.game-setup');
    
    if (currentGame.gameStarted) {
        if (gameStatus) {
            gameStatus.style.display = 'block';
            // Auto-hide game status after 8 seconds
            setTimeout(() => {
                if (gameStatus.style.display === 'block') {
                    gameStatus.style.display = 'none';
                }
            }, 8000);
        }
        if (gameSetup) gameSetup.classList.add('locked');
    } else {
        if (gameStatus) gameStatus.style.display = 'none';
        if (gameSetup) gameSetup.classList.remove('locked');
    }
}

function updateBidValidation() {
    const totalPossibleTricks = currentGame.cardsPerHand; // Total tricks possible (same as cards per hand)
    const totalBiddingCap = players.length * currentGame.cardsPerHand; // Total bidding cap: players × cards
    const individualBidCap = currentGame.cardsPerHand; // Individual cap: cards in hand
    
    let totalBids = 0;
    let hasInvalidIndividualBid = false;
    
    // Calculate total bids and check individual caps
    players.forEach(player => {
        const bid = getPlayerBid(player) || 0;
        totalBids += bid;
        
        // Check individual bid cap
        if (bid > individualBidCap) {
            hasInvalidIndividualBid = true;
        }
    });
    
    // Check if total bids exceed the cap
    const isTotalValid = totalBids <= totalBiddingCap;
    const isIndividualValid = !hasInvalidIndividualBid;
    const isNotEqualToPossibleTricks = totalBids !== totalPossibleTricks;
    const isValid = isTotalValid && isIndividualValid && isNotEqualToPossibleTricks;
    
    // Note: Visual feedback removed since bids are now displayed as plain text
    // Validation status is shown in the header instead
    
    // Update header to show bid validation status
    const header = document.querySelector('header p');
    if (header) {
        const existingStatus = header.querySelector('.bid-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        if (totalBids > 0) {
            const statusElement = document.createElement('span');
            statusElement.className = `bid-status ${isValid ? 'valid' : 'invalid'}`;
            
            // Create more detailed status message
            let statusText = ` | Ставки: ${totalBids}/${totalBiddingCap}`;
            if (totalBids === totalPossibleTricks) {
                statusText += ` (≠${totalPossibleTricks})`;
            }
            
            statusElement.textContent = statusText;
            statusElement.style.color = isValid ? '#51cf66' : '#ff6b6b';
            statusElement.style.fontWeight = 'bold';
            statusElement.style.marginLeft = '10px';
            
            let tooltipText = `Максимум: ${totalBiddingCap} (${players.length} игроков × ${currentGame.cardsPerHand} карт), Индивидуально: до ${individualBidCap}`;
            if (totalBids === totalPossibleTricks) {
                tooltipText += `, НЕ может быть равно ${totalPossibleTricks} (возможным взяткам)`;
            }
            statusElement.title = tooltipText;
            
            header.appendChild(statusElement);
        }
    }
    
    // Debug logging
    if (totalBids > 0) {
        console.log(`Real-time validation: ${totalPossibleTricks} possible tricks, ${totalBids} total bids, max total: ${totalBiddingCap}, max individual: ${individualBidCap}, not equal to tricks: ${isNotEqualToPossibleTricks}, valid: ${isValid}`);
    }
    
    // Update next round button state based on tricks validation
    updateNextRoundButtonState();
}

function showBiddingRegulationsHelp() {
    const totalBiddingCap = players.length * currentGame.cardsPerHand;
    const individualBidCap = currentGame.cardsPerHand;
    const totalPossibleTricks = currentGame.cardsPerHand;
    
    const helpMessage = `📋 Правила ставок (Bidding Regulations):

🎯 Общая максимальная ставка: ${totalBiddingCap}
   (${players.length} игроков × ${currentGame.cardsPerHand} карт)

👤 Индивидуальная максимальная ставка: ${individualBidCap}
   (количество карт в руке)

❌ Запрещено:
   • Общая сумма ставок равна ${totalPossibleTricks} (возможным взяткам)

✅ Допустимые ставки:
   • Каждый игрок может ставить от 0 до ${individualBidCap}
   • Общая сумма всех ставок не должна превышать ${totalBiddingCap}
   • Общая сумма ставок НЕ должна быть равна ${totalPossibleTricks}
   • Ставки должны быть целыми числами

❌ Недопустимые ставки:
   • Индивидуальная ставка больше ${individualBidCap}
   • Общая сумма ставок больше ${totalBiddingCap}
   • Общая сумма ставок равна ${totalPossibleTricks}

💡 Примеры для ${players.length} игроков с ${currentGame.cardsPerHand} картами:
   • Игрок 1: ${individualBidCap}, Игрок 2: 0, Игрок 3: 0 = ${individualBidCap} (✅)
   • Игрок 1: ${Math.floor(individualBidCap/2)}, Игрок 2: ${Math.ceil(individualBidCap/2)}, Игрок 3: 0 = ${individualBidCap} (✅)
   • Игрок 1: ${totalPossibleTricks}, Игрок 2: 0, Игрок 3: 0 = ${totalPossibleTricks} (❌ равно возможным взяткам)
   • Игрок 1: ${individualBidCap}, Игрок 2: ${individualBidCap}, Игрок 3: 0 = ${individualBidCap * 2} (❌ превышает лимит)`;
    
    alert(helpMessage);
}

function testBiddingRegulations() {
    console.log('=== TESTING BIDDING REGULATIONS ===');
    
    const totalBiddingCap = players.length * currentGame.cardsPerHand;
    const individualBidCap = currentGame.cardsPerHand;
    const totalPossibleTricks = currentGame.cardsPerHand;
    
    console.log(`Players: ${players.length}`);
    console.log(`Cards per hand: ${currentGame.cardsPerHand}`);
    console.log(`Total bidding cap: ${totalBiddingCap} (${players.length} × ${currentGame.cardsPerHand})`);
    console.log(`Individual bid cap: ${individualBidCap}`);
    console.log(`Total possible tricks: ${totalPossibleTricks}`);
    
    // Test scenarios
    const testScenarios = [
        {
            name: 'Valid - All players bid 0',
            bids: players.map(() => 0),
            expected: true
        },
        {
            name: 'Valid - One player bids max, others bid 0',
            bids: [individualBidCap, ...players.slice(1).map(() => 0)],
            expected: true
        },
        {
            name: 'Invalid - Total exceeds cap',
            bids: players.map(() => individualBidCap),
            expected: false
        },
        {
            name: 'Invalid - Individual bid exceeds cap',
            bids: [individualBidCap + 1, ...players.slice(1).map(() => 0)],
            expected: false
        },
        {
            name: 'Invalid - Total equals possible tricks',
            bids: [totalPossibleTricks, ...players.slice(1).map(() => 0)],
            expected: false
        },
        {
            name: 'Valid - Total less than possible tricks',
            bids: [totalPossibleTricks - 1, ...players.slice(1).map(() => 0)],
            expected: true
        },
        {
            name: 'Valid - Total more than possible tricks',
            bids: [totalPossibleTricks + 1, ...players.slice(1).map(() => 0)],
            expected: totalPossibleTricks + 1 <= totalBiddingCap
        }
    ];
    
    testScenarios.forEach(scenario => {
        console.log(`\nTesting: ${scenario.name}`);
        console.log(`Bids: ${scenario.bids.join(', ')}`);
        console.log(`Total: ${scenario.bids.reduce((a, b) => a + b, 0)}`);
        console.log(`Expected valid: ${scenario.expected}`);
        
        // Simulate the validation
        const totalBids = scenario.bids.reduce((a, b) => a + b, 0);
        const hasInvalidIndividualBid = scenario.bids.some(bid => bid > individualBidCap);
        const isTotalValid = totalBids <= totalBiddingCap;
        const isIndividualValid = !hasInvalidIndividualBid;
        const isNotEqualToPossibleTricks = totalBids !== totalPossibleTricks;
        const isValid = isTotalValid && isIndividualValid && isNotEqualToPossibleTricks;
        
        console.log(`Actual valid: ${isValid}`);
        console.log(`Result: ${isValid === scenario.expected ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    console.log('\n=== BIDDING REGULATIONS TEST COMPLETE ===');
}

// Event listeners for settings changes
document.getElementById('deckSize').addEventListener('change', function() {
    changeDeckSize();
    updateDeckPreparationTips();
});

// Add event listener for player changes
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for player input changes
    const playerInputs = document.querySelectorAll('.player-input input');
    playerInputs.forEach(input => {
        input.addEventListener('input', function() {
            updatePlayerNames();
            updateDeckPreparationTips();
        });
    });
    
    // Initial tip update (only if we're on the setup screen)
    if (document.getElementById('deckPreparationTip')) {
        updateDeckPreparationTips();
    }
});

// maxCards event listener removed - maxCards is now calculated automatically

// currentRound and cardsPerHand event listeners removed - these are now calculated automatically

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Space bar to add 10 points to first player (for quick scoring)
    if (e.code === 'Space' && players.length > 0) {
        e.preventDefault();
        addScore(players[0], 10);
    }
    
    // Enter to add custom score for first player
    if (e.code === 'Enter' && players.length > 0) {
        const input = document.getElementById(`custom-score-${players[0]}`);
        if (document.activeElement === input) {
            addCustomScore(players[0]);
        }
    }
    
    // R key for next round (without Ctrl)
    if (e.code === 'KeyR' && !e.ctrlKey) {
        e.preventDefault();
        nextRound();
    }
    
    // S key for special game (removed)
    // if (e.code === 'KeyS') {
    //     e.preventDefault();
    //     toggleSpecialGame();
    // }
    
    // R key for dealer rotation (removed)
    // if (e.code === 'KeyR' && e.ctrlKey) {
    //     e.preventDefault();
    //     toggleDealerRotation();
    // }
    
    // I key for dealer info (removed)
    // if (e.code === 'KeyI') {
    //     e.preventDefault();
    //     showDealerInfo();
    // }
    
    // Y key for dealer test
    if (e.code === 'KeyY' && e.ctrlKey) {
        e.preventDefault();
        testDealerRotation();
    }
    
    // T key for testing bidding regulations (without Ctrl)
    if (e.code === 'KeyT' && !e.ctrlKey) {
        e.preventDefault();
        testBiddingRegulations();
    }
    
    // D key for debugging game rules
    if (e.code === 'KeyD') {
        e.preventDefault();
        debugGameRules();
    }
    
    // V key for validating game configuration
    if (e.code === 'KeyV') {
        e.preventDefault();
        validateGameConfiguration();
    }
    
    // C key for debugging card counting
    if (e.code === 'KeyC') {
        e.preventDefault();
        debugCardCounting();
    }
});

// Auto-save scores periodically
setInterval(() => {
    if (Object.values(currentGame.scores).some(score => score !== 0)) {
        saveGameHistory();
    }
}, 30000); // Save every 30 seconds

function clearSavedGame() {
    if (confirm('Очистить сохраненную игру? Это действие нельзя отменить.')) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_GAME);
        alert('Сохраненная игра очищена. Страница будет перезагружена.');
        location.reload();
    }
}

function showSaveIndicator() {
    // Create or update save indicator
    let saveIndicator = document.getElementById('saveIndicator');
    if (!saveIndicator) {
        saveIndicator = document.createElement('div');
        saveIndicator.id = 'saveIndicator';
        saveIndicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #51cf66;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(saveIndicator);
    }
    
    saveIndicator.textContent = '💾 Игра сохранена';
    saveIndicator.style.opacity = '1';
    
    // Hide after 2 seconds
    setTimeout(() => {
        saveIndicator.style.opacity = '0';
    }, 2000);
    
    // Update persistent save status
    updateSaveStatus();
}

function updateSaveStatus() {
    const saveStatus = document.getElementById('saveStatus');
    if (saveStatus) {
        const hasSavedGame = localStorage.getItem(STORAGE_KEYS.CURRENT_GAME) !== null;
        if (hasSavedGame && currentGame.gameStarted) {
            saveStatus.style.display = 'block';
            saveStatus.textContent = `💾 Игра сохранена (Раунд ${currentGame.currentRound}) - можно закрыть страницу`;
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (saveStatus.style.display === 'block') {
                    saveStatus.style.display = 'none';
                }
            }, 5000);
        } else if (hasSavedGame) {
            saveStatus.style.display = 'block';
            saveStatus.textContent = '💾 Игра сохранена - можно закрыть страницу';
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (saveStatus.style.display === 'block') {
                    saveStatus.style.display = 'none';
                }
            }, 5000);
        } else {
            saveStatus.style.display = 'none';
        }
    }
}

function debugGameRules() {
    console.log('=== GAME RULES DEBUG ===');
    
    const playerCount = players.length;
    const config = getRoundConfig();
    const stageInfo = getStageInfo();
    const totalRounds = calculateTotalRounds();
    const maxCards = getMaxCardsForPlayerCount(playerCount);
    const currentCardsPerHand = getCardsPerHand();
    
    console.log(`Deck size: ${currentDeckSize} cards`);
    console.log(`Player count: ${playerCount}`);
    console.log(`Total rounds: ${totalRounds}`);
    console.log(`Current round: ${currentGame.currentRound}`);
    console.log(`Current stage: ${stageInfo.stage}`);
    console.log(`Stage round: ${stageInfo.stageRound}/${stageInfo.totalStageRounds}`);
    console.log(`Cards per hand: ${currentCardsPerHand}`);
    console.log(`Max cards for ${playerCount} players: ${maxCards}`);
    
    if (config) {
        console.log('Stage configuration:');
        config.stages.forEach((stage, index) => {
            console.log(`  Stage ${index + 1}: ${stage.rounds} rounds, ${stage.cards} cards`);
        });
    }
    
    // Test scoring rules
    console.log('\n=== SCORING RULES TEST ===');
    const testCases = [
        { bid: 1, tricks: 1, stage: 1, expected: 30 },
        { bid: 1, tricks: 0, stage: 1, expected: -30 },
        { bid: 0, tricks: 0, stage: 1, expected: 15 },
        { bid: 0, tricks: 1, stage: 1, expected: 5 },
        { bid: 1, tricks: 1, stage: 2, expected: 10 },
        { bid: 1, tricks: 0, stage: 2, expected: -10 },
        { bid: 0, tricks: 0, stage: 2, expected: 5 },
        { bid: 0, tricks: 1, stage: 2, expected: 1 }
    ];
    
    testCases.forEach(testCase => {
        // Temporarily set current stage for testing
        const originalStage = getCurrentStage();
        const mockGetCurrentStage = () => testCase.stage;
        
        // Test the scoring
        const result = calculateNormalScore(testCase.bid, testCase.tricks);
        const passed = result === testCase.expected;
        
        console.log(`Bid: ${testCase.bid}, Tricks: ${testCase.tricks}, Stage: ${testCase.stage} → ${result} (expected: ${testCase.expected}) ${passed ? '✅' : '❌'}`);
    });
    
    // Test bidding validation
    console.log('\n=== BIDDING VALIDATION TEST ===');
    const totalBiddingCap = players.length * currentCardsPerHand;
    const individualBidCap = currentCardsPerHand;
    const totalPossibleTricks = currentCardsPerHand;
    
    console.log(`Total bidding cap: ${totalBiddingCap} (${players.length} × ${currentCardsPerHand})`);
    console.log(`Individual bid cap: ${individualBidCap}`);
    console.log(`Total possible tricks: ${totalPossibleTricks}`);
    
    console.log('\n=== GAME RULES DEBUG COMPLETE ===');
}

function validateGameConfiguration() {
    console.log('=== GAME CONFIGURATION VALIDATION ===');
    
    const playerCount = players.length;
    const config = getRoundConfig();
    const stageInfo = getStageInfo();
    const totalRounds = calculateTotalRounds();
    const maxCards = getMaxCardsForPlayerCount(playerCount);
    const currentCardsPerHand = getCardsPerHand();
    
    let isValid = true;
    const errors = [];
    const warnings = [];
    
    // Validate player count
    if (playerCount < 2) {
        errors.push('Player count must be at least 2');
        isValid = false;
    }
    
    if (playerCount > 6) {
        warnings.push('Player count exceeds recommended maximum of 6');
    }
    
    // Validate deck size
    if (currentDeckSize !== 36 && currentDeckSize !== 54) {
        errors.push('Deck size must be 36 or 54 cards');
        isValid = false;
    }
    
    // Validate configuration exists
    if (!config) {
        errors.push(`No configuration found for ${playerCount} players with ${currentDeckSize}-card deck`);
        isValid = false;
    }
    
    // Validate round progression
    if (currentGame.currentRound < 1) {
        errors.push('Current round must be at least 1');
        isValid = false;
    }
    
    if (currentGame.currentRound > totalRounds) {
        errors.push(`Current round (${currentGame.currentRound}) exceeds total rounds (${totalRounds})`);
        isValid = false;
    }
    
    // Validate cards per hand
    if (currentCardsPerHand < 1) {
        errors.push('Cards per hand must be at least 1');
        isValid = false;
    }
    
    if (currentCardsPerHand > maxCards) {
        errors.push(`Cards per hand (${currentCardsPerHand}) exceeds maximum (${maxCards}) for ${playerCount} players`);
        isValid = false;
    }
    
    // Validate stage configuration
    if (config) {
        let totalConfiguredRounds = 0;
        config.stages.forEach((stage, index) => {
            totalConfiguredRounds += stage.rounds;
            if (stage.rounds < 1) {
                errors.push(`Stage ${index + 1} has invalid round count: ${stage.rounds}`);
                isValid = false;
            }
        });
        
        if (totalConfiguredRounds !== totalRounds) {
            errors.push(`Stage configuration round count (${totalConfiguredRounds}) doesn't match total rounds (${totalRounds})`);
            isValid = false;
        }
    }
    
    // Validate bidding rules
    const totalBiddingCap = players.length * currentCardsPerHand;
    const individualBidCap = currentCardsPerHand;
    const totalPossibleTricks = currentCardsPerHand;
    
    if (totalBiddingCap < individualBidCap) {
        errors.push('Total bidding cap cannot be less than individual bid cap');
        isValid = false;
    }
    
    if (totalPossibleTricks !== currentCardsPerHand) {
        errors.push('Total possible tricks should equal cards per hand');
        isValid = false;
    }
    
    // Report results
    console.log(`Configuration valid: ${isValid ? '✅' : '❌'}`);
    
    if (errors.length > 0) {
        console.log('Errors:');
        errors.forEach(error => console.log(`  ❌ ${error}`));
    }
    
    if (warnings.length > 0) {
        console.log('Warnings:');
        warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
    }
    
    if (isValid) {
        console.log('✅ All game rules and configurations are valid');
    }
    
    console.log('\n=== VALIDATION COMPLETE ===');
    
    return isValid;
}

function debugCardCounting() {
    console.log('=== CARD COUNTING DEBUG ===');
    
    const playerCount = players.length;
    const config = getRoundConfig();
    const stageInfo = getStageInfo();
    const calculatedCardsPerHand = getCardsPerHand();
    const storedCardsPerHand = currentGame.cardsPerHand;
    
    console.log(`Current round: ${currentGame.currentRound}`);
    console.log(`Calculated cards per hand: ${calculatedCardsPerHand}`);
    console.log(`Stored cards per hand: ${storedCardsPerHand}`);
    console.log(`Stage: ${stageInfo.stage}, Stage round: ${stageInfo.stageRound}/${stageInfo.totalStageRounds}`);
    
    if (config) {
        console.log('Stage configuration:');
        let roundCount = 0;
        let stageStartRound = 1;
        
        for (let stage = 0; stage < config.stages.length; stage++) {
            const stageConfig = config.stages[stage];
            const stageEndRound = roundCount + stageConfig.rounds;
            
            console.log(`  Stage ${stage + 1}: rounds ${roundCount + 1}-${stageEndRound}, cards: ${stageConfig.cards}`);
            
            if (currentGame.currentRound <= stageEndRound) {
                const stageRound = currentGame.currentRound - stageStartRound + 1;
                console.log(`  → Current stage! Stage round: ${stageRound}`);
                
                if (stageConfig.cards === 'increment') {
                    console.log(`  → Increment calculation: ${stageRound} + 1 = ${stageRound + 1}`);
                } else if (stageConfig.cards === 'decrement') {
                    const maxCards = getMaxCardsForPlayerCount(playerCount);
                    console.log(`  → Decrement calculation: ${maxCards} - ${stageRound} + 1 = ${maxCards - stageRound + 1}`);
                }
            }
            
            roundCount = stageEndRound;
            stageStartRound = roundCount + 1;
        }
    }
    
    console.log('=== CARD COUNTING DEBUG COMPLETE ===');
}

function getCurrentDealer() {
    if (players.length === 0) return null;
    return players[currentGame.currentDealer];
}

function getNextDealer() {
    if (players.length === 0) return 0;
    return (currentGame.currentDealer + 1) % players.length;
}

function rotateDealer() {
    if (players.length === 0) return;
    currentGame.currentDealer = getNextDealer();
}

function getPlayerOrder() {
    if (players.length === 0) return [];
    
    // Return players in order starting from the dealer
    const order = [];
    for (let i = 0; i < players.length; i++) {
        const index = (currentGame.currentDealer + i) % players.length;
        order.push(players[index]);
    }
    return order;
}

function getPlayerPosition(player) {
    const order = getPlayerOrder();
    return order.indexOf(player);
}

function toggleDealerRotation() {
    currentGame.dealerRotation = !currentGame.dealerRotation;
    const status = currentGame.dealerRotation ? 'включена' : 'отключена';
    alert(`Ротация раздающего ${status}!`);
    saveCurrentGame();
    updateRoundInfo();
}

function showDealerInfo() {
    const currentDealer = getCurrentDealer();
    const playerOrder = getPlayerOrder();
    const firstPlayer = playerOrder[1];
    const nextDealer = getNextDealer();
    
    const info = `
🎯 Информация о раздающем:

📋 Текущий раздающий: ${currentDealer}
🎮 Первый игрок: ${firstPlayer}
🔄 Следующий раздающий: ${players[nextDealer]}
📊 Ротация: ${currentGame.dealerRotation ? 'Включена' : 'Отключена'}

📋 Порядок игры:
${playerOrder.map((player, index) => {
    let marker = '';
    if (player === currentDealer) marker = '🎯';
    else if (index === 1) marker = '🎮';
    else marker = `${index + 1}.`;
    return `${marker} ${player}`;
}).join('\n')}

💡 Правила:
• Раздающий раздает карты
• Игрок слева от раздающего ходит первым
• После каждого раунда раздающий меняется (если ротация включена)
• Раздающий выбирает, какую часть колоды перемешать
    `;
    
    alert(info);
}

function testDealerRotation() {
    console.log('=== TESTING DEALER ROTATION ===');
    
    // Test with 4 players
    const testPlayers = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
    const originalPlayers = [...players];
    players = testPlayers;
    
    // Test initial dealer
    currentGame.currentDealer = 0;
    console.log('Initial dealer:', getCurrentDealer());
    console.log('Player order:', getPlayerOrder());
    console.log('First player:', getPlayerOrder()[1]);
    
    // Test dealer rotation
    for (let i = 0; i < 8; i++) {
        const beforeDealer = getCurrentDealer();
        rotateDealer();
        const afterDealer = getCurrentDealer();
        console.log(`Round ${i + 1}: ${beforeDealer} → ${afterDealer}`);
        console.log('Player order:', getPlayerOrder());
        console.log('First player:', getPlayerOrder()[1]);
    }
    
    // Restore original players
    players = originalPlayers;
    
    console.log('=== DEALER ROTATION TEST COMPLETE ===');
}

// Rules toggle function
function toggleRules() {
    const rulesContent = document.getElementById('rulesContent');
    const rulesToggle = document.querySelector('.rules-toggle');
    
    if (rulesContent.style.display === 'none') {
        rulesContent.style.display = 'block';
        rulesContent.classList.add('show');
        rulesToggle.classList.add('active');
    } else {
        rulesContent.style.display = 'none';
        rulesContent.classList.remove('show');
        rulesToggle.classList.remove('active');
    }
}

// Update minimalistic scoreboard
function updateMinimalScoreboard() {
    // This function is now handled by phase-specific functions
    // The phase system will call the appropriate grid update function
    if (currentGame.currentPhase === 'bidding') {
        updateBiddingPlayerGrid();
    } else if (currentGame.currentPhase === 'tricks') {
        updateTricksPlayerGrid();
    }
}

// Change field value by increment/decrement
function changeField(player, field, change) {
    console.log(`changeField called: player=${player}, field=${field}, change=${change}`);
    
    const fieldElement = document.getElementById(`${field}_${player}`);
    if (!fieldElement) return;
    
    const currentValue = parseInt(fieldElement.textContent) || 0;
    const newValue = Math.max(0, Math.min(getCardsPerHand(), currentValue + change));
    
    console.log(`changeField: currentValue=${currentValue}, newValue=${newValue}`);
    
    fieldElement.textContent = newValue;
    setField(player, field, newValue);
    
    // Update next round button state when tricks are changed
    if (field === 'tricks') {
        updateNextRoundButtonState();
    }
    
    // Update bids counter when bids are changed
    if (field === 'bid') {
        updateBidsCounter();
    }
    
    // Update UI to reflect blind bidding state changes
    if (field === 'bid') {
        updateMinimalScoreboard();
    }
}

// Set field value
function setField(player, field, value) {
    const numValue = parseInt(value) || 0;
    
    if (field === 'bid') {
        setPlayerBid(player, numValue);
        
        // If bid is set to 0, disable blind bidding
        if (numValue === 0 && isBlindBidding(player)) {
            toggleBlindBidding(player);
        }
    } else if (field === 'tricks') {
        setPlayerTricks(player, numValue);
    }
    
    // Update button states
    updateFieldButtonStates();
    
    // Update next round button state when tricks are changed
    if (field === 'tricks') {
        updateNextRoundButtonState();
    }
    
    // Auto-save
    saveCurrentGame();
}

// Update field button states (enable/disable based on min/max values)
function updateFieldButtonStates() {
    const maxValue = getCardsPerHand();
    
    players.forEach(player => {
        ['bid', 'tricks'].forEach(field => {
            const fieldElement = document.getElementById(`${field}_${player}`);
            const minusBtn = fieldElement?.previousElementSibling;
            const plusBtn = fieldElement?.nextElementSibling;
            
            if (fieldElement && minusBtn && plusBtn) {
                const currentValue = parseInt(fieldElement.textContent) || 0;
                
                minusBtn.disabled = currentValue <= 0;
                plusBtn.disabled = currentValue >= maxValue;
            }
        });
    });
}

// Get player bid for current round
function getPlayerBid(player) {
    // Check if we have current round data
    if (currentGame.currentRoundData && currentGame.currentRoundData.results) {
        const playerResult = currentGame.currentRoundData.results.find(result => result.player === player);
        if (playerResult) {
            console.log(`getPlayerBid(${player}): ${playerResult.bid}`);
            return playerResult.bid;
        }
    }
    
    // Fallback to round history for completed rounds
    if (!currentGame.roundResults || !Array.isArray(currentGame.roundResults)) {
        console.log(`getPlayerBid(${player}): roundResults not initialized`);
        return 0;
    }
    
    // Look for the current round data in history
    const currentRoundData = currentGame.roundResults.find(round => round.round === currentGame.currentRound);
    if (!currentRoundData || !currentRoundData.results) {
        console.log(`getPlayerBid(${player}): no data for round ${currentGame.currentRound}`);
        return 0;
    }
    
    // Find the player's result in the results array
    const playerResult = currentRoundData.results.find(result => result.player === player);
    const bid = playerResult ? playerResult.bid : 0;
    console.log(`getPlayerBid(${player}): ${bid}`);
    return bid;
}

// Get player tricks for current round
function getPlayerTricks(player) {
    // Check if we have current round data
    if (currentGame.currentRoundData && currentGame.currentRoundData.results) {
        const playerResult = currentGame.currentRoundData.results.find(result => result.player === player);
        if (playerResult) {
            return playerResult.tricks;
        }
    }
    
    // Fallback to round history for completed rounds
    if (!currentGame.roundResults || !Array.isArray(currentGame.roundResults)) {
        return 0;
    }
    
    // Look for the current round data in history
    const currentRoundData = currentGame.roundResults.find(round => round.round === currentGame.currentRound);
    if (!currentRoundData || !currentRoundData.results) {
        return 0;
    }
    
    // Find the player's result in the results array
    const playerResult = currentRoundData.results.find(result => result.player === player);
    return playerResult ? playerResult.tricks : 0;
}

// Set player bid for current round
function setPlayerBid(player, bid) {
    // Ensure roundResults is initialized
    if (!currentGame.roundResults || !Array.isArray(currentGame.roundResults)) {
        currentGame.roundResults = [];
    }
    
    // Store current round data separately (not in round history yet)
    if (!currentGame.currentRoundData) {
        currentGame.currentRoundData = {
            round: currentGame.currentRound,
            cardsPerHand: currentGame.cardsPerHand,
            specialGame: currentGame.isSpecialGame ? currentGame.specialGameType : null,
            results: []
        };
    }
    
    // Find or create player result in current round data
    let playerResult = currentGame.currentRoundData.results.find(result => result.player === player);
    if (!playerResult) {
        playerResult = { player, bid: 0, tricks: 0, points: 0 };
        currentGame.currentRoundData.results.push(playerResult);
    }
    
    playerResult.bid = bid;
}

// Set player tricks for current round
function setPlayerTricks(player, tricks) {
    // Ensure roundResults is initialized
    if (!currentGame.roundResults || !Array.isArray(currentGame.roundResults)) {
        currentGame.roundResults = [];
    }
    
    // Store current round data separately (not in round history yet)
    if (!currentGame.currentRoundData) {
        currentGame.currentRoundData = {
            round: currentGame.currentRound,
            cardsPerHand: currentGame.cardsPerHand,
            specialGame: currentGame.isSpecialGame ? currentGame.specialGameType : null,
            results: []
        };
    }
    
    // Find or create player result in current round data
    let playerResult = currentGame.currentRoundData.results.find(result => result.player === player);
    if (!playerResult) {
        playerResult = { player, bid: 0, tricks: 0, points: 0 };
        currentGame.currentRoundData.results.push(playerResult);
    }
    
    playerResult.tricks = tricks;
}

// Reset minimalistic interface inputs for new round
function resetMinimalisticInputs() {
    // Clear current round data
    currentGame.currentRoundData = null;
    
    // Clear blind bidding for new round
    currentGame.blindBiddingPlayers = [];
    
    // Reset phase to bidding for new round
    currentGame.currentPhase = 'bidding';
    
    players.forEach(player => {
        const bidElement = document.getElementById(`bid_${player}`);
        const tricksElement = document.getElementById(`tricks_${player}`);
        
        if (bidElement) {
            bidElement.textContent = '0';
            setPlayerBid(player, 0);
        }
        
        if (tricksElement) {
            tricksElement.textContent = '0';
            setPlayerTricks(player, 0);
        }
    });
    
    // Update button states after reset
    updateFieldButtonStates();
    
    // Update next round button state after reset
    updateNextRoundButtonState();
    
    // Update the UI for the new phase
    switchToPhase('bidding');
    
    // Reset bids counter
    updateBidsCounter();
}

// Add new function to validate tricks and update next round button
function validateTricks() {
    const totalPossibleTricks = currentGame.cardsPerHand; // Total tricks possible (same as cards per hand)
    let totalTricks = 0;
    
    // Calculate total tricks
    players.forEach(player => {
        const tricks = getPlayerTricks(player) || 0;
        totalTricks += tricks;
    });
    
    // Check if total tricks equals the cards per hand
    const isTricksValid = totalTricks === totalPossibleTricks;
    
    console.log(`Tricks validation: ${totalPossibleTricks} cards per hand, ${totalTricks} total tricks, valid: ${isTricksValid}`);
    
    return isTricksValid;
}

function updateNextRoundButtonState() {
    const nextRoundBtn = document.querySelector('.next-round-btn');
    if (!nextRoundBtn) return;
    
    // Check if tricks are valid (total tricks must equal cards per hand)
    const isTricksValid = validateTricks();
    
    if (isTricksValid) {
        // Enable the button
        nextRoundBtn.disabled = false;
        nextRoundBtn.style.opacity = '1';
        nextRoundBtn.style.cursor = 'pointer';
        nextRoundBtn.style.background = 'linear-gradient(135deg, #ffa502, #ff9500)';
        nextRoundBtn.title = 'Перейти к следующему раунду';
    } else {
        // Disable the button
        nextRoundBtn.disabled = true;
        nextRoundBtn.style.opacity = '0.5';
        nextRoundBtn.style.cursor = 'not-allowed';
        nextRoundBtn.style.background = '#ccc';
        nextRoundBtn.title = `Кнопка заблокирована. Общее количество взяток должно быть равно ${currentGame.cardsPerHand} (количество карт в руке)`;
    }
    
    // Update header to show tricks validation status
    updateTricksValidationDisplay();
    
    // Update bidding status indicator
    updateBiddingStatusIndicator();
}

function updateTricksValidationDisplay() {
    const header = document.querySelector('header p');
    if (!header) return;
    
    // Remove existing tricks status
    const existingTricksStatus = header.querySelector('.tricks-status');
    if (existingTricksStatus) {
        existingTricksStatus.remove();
    }
    
    // Calculate total tricks
    let totalTricks = 0;
    players.forEach(player => {
        const tricks = getPlayerTricks(player) || 0;
        totalTricks += tricks;
    });
    
    const totalPossibleTricks = currentGame.cardsPerHand;
    const isTricksValid = totalTricks === totalPossibleTricks;
    
    if (totalTricks > 0) {
        const statusElement = document.createElement('span');
        statusElement.className = `tricks-status ${isTricksValid ? 'valid' : 'invalid'}`;
        
        statusElement.textContent = ` | Взятки: ${totalTricks}/${totalPossibleTricks}`;
        statusElement.style.color = isTricksValid ? '#51cf66' : '#ff6b6b';
        statusElement.style.fontWeight = 'bold';
        statusElement.style.marginLeft = '10px';
        
        let tooltipText = `Общее количество взяток должно быть равно ${totalPossibleTricks} (количество карт в руке)`;
        if (!isTricksValid) {
            tooltipText += `\n\nТекущие взятки: ${totalTricks}`;
            tooltipText += `\nНеобходимо: ${totalPossibleTricks}`;
            tooltipText += `\nРазница: ${totalPossibleTricks - totalTricks}`;
        }
        statusElement.title = tooltipText;
        
        header.appendChild(statusElement);
    }
}



// Get the player sitting right after the dealer (next to deal)
function getNextDealerPlayer() {
    if (players.length === 0) return null;
    const nextDealerIndex = getNextDealer();
    return players[nextDealerIndex];
}

// Check if a player can bid blind (sitting right after dealer)
function canBidBlind(player) {
    return player === getNextDealerPlayer();
}

// Debounce tracking for blind bidding
let blindBiddingDebounce = {};

// Toggle blind bidding for a player
function toggleBlindBidding(player) {
    console.log('=== BLIND BIDDING DEBUG ===');
    console.log('toggleBlindBidding called for:', player);
    
    // Check for double-tap
    const now = Date.now();
    const lastTap = blindBiddingDebounce[player] || 0;
    const timeSinceLastTap = now - lastTap;
    
    console.log('Time since last tap:', timeSinceLastTap, 'ms');
    
    if (timeSinceLastTap < 500) { // 500ms debounce
        console.log('🚫 BLOCKED: Double-tap detected, ignoring this tap');
        return;
    }
    
    // Record this tap
    blindBiddingDebounce[player] = now;
    
    // Check all conditions
    const canBlind = canBidBlind(player);
    const playerBid = getPlayerBid(player) || 0;
    const canBlindNow = canBlind && playerBid > 0;
    const isBlind = isBlindBidding(player);
    
    console.log('--- CONDITIONS ---');
    console.log('canBlind (eligible position):', canBlind);
    console.log('playerBid:', playerBid);
    console.log('canBlindNow (eligible + bid > 0):', canBlindNow);
    console.log('isBlind (currently blind bidding):', isBlind);
    console.log('currentDealer:', currentGame.currentDealer);
    console.log('players:', players);
    
    // Check if player has bid at least 1
    if (playerBid === 0) {
        console.log('❌ BLOCKED: Blind bidding not available with bid 0! Make a bid of 1 or more to activate blind bidding.');
        return;
    }
    
    if (!canBlind) {
        console.log('❌ BLOCKED: Player not eligible for blind bidding (not right after dealer)');
        return;
    }
    
    console.log('✅ PROCEEDING: All conditions met, toggling blind bidding...');
    
    const index = currentGame.blindBiddingPlayers.indexOf(player);
    console.log('Current blind bidding players:', currentGame.blindBiddingPlayers);
    console.log('Player index in blind bidding:', index);
    
    if (index > -1) {
        // Remove from blind bidding
        currentGame.blindBiddingPlayers.splice(index, 1);
        console.log('➖ Removed from blind bidding');
    } else {
        // Add to blind bidding
        currentGame.blindBiddingPlayers.push(player);
        console.log('➕ Added to blind bidding');
    }
    
    console.log('Updated blind bidding players:', currentGame.blindBiddingPlayers);
    
    // Update UI to reflect changes
    console.log('Updating UI after blind bidding change...');
    updateBiddingPlayerGrid();
    saveCurrentGame();
    console.log('UI update complete');
    console.log('=== END DEBUG ===');
}

// Check if a player is bidding blind
function isBlindBidding(player) {
    return currentGame.blindBiddingPlayers.includes(player);
}

// Show blind bidding help information
function showBlindBiddingHelp() {
    const nextDealerPlayer = getNextDealerPlayer();
    const currentDealer = getCurrentDealer();
    
            const helpMessage = `👁️ Темню (Blind Bidding):

🎯 Кто может ставить слепо:
• Только игрок, сидящий справа от раздающего
• В данный момент: ${nextDealerPlayer || 'не определен'}
• Текущий раздающий: ${currentDealer || 'не определен'}

📋 Правила слепой ставки:
• Игрок делает ставку НЕ глядя на карты
• Минимальная ставка для слепой ставки: 1
• Результат умножается на 2 (x2)
• Если выигрывает: получает в 2 раза больше очков
• Если проигрывает: теряет в 2 раза больше очков

💡 Стратегия:
• Высокий риск, высокое вознаграждение
• Подходит для опытных игроков
• Можно использовать в любом раунде
• Сбрасывается каждый новый раунд

🎮 Как использовать:
• Сделайте ставку 1 или больше
• Поставьте галочку "Темню" у игрока
• Результат автоматически умножится на 2`;
    
    alert(helpMessage);
}

// Phase management functions
function switchToPhase(phase) {
    currentGame.currentPhase = phase;
    
    // Update phase indicators
    const biddingBadge = document.getElementById('biddingPhaseBadge');
    const tricksBadge = document.getElementById('tricksPhaseBadge');
    const biddingPhase = document.getElementById('biddingPhase');
    const tricksPhase = document.getElementById('tricksPhase');
    
    if (phase === 'bidding') {
        biddingBadge.classList.add('active');
        tricksBadge.classList.remove('active');
        biddingPhase.classList.add('active');
        tricksPhase.classList.remove('active');
    } else if (phase === 'tricks') {
        biddingBadge.classList.remove('active');
        tricksBadge.classList.add('active');
        biddingPhase.classList.remove('active');
        tricksPhase.classList.add('active');
    }
    
    // Update player grids for the current phase
    updatePlayerGridsForPhase(phase);
    
    // Save game state
    saveCurrentGame();
}

function updatePlayerGridsForPhase(phase) {
    if (phase === 'bidding') {
        updateBiddingPlayerGrid();
    } else if (phase === 'tricks') {
        updateTricksPlayerGrid();
    }
}

function updateBiddingPlayerGrid() {
    const playerGrid = document.getElementById('biddingPlayerGrid');
    if (!playerGrid) return;
    
    console.log('updateBiddingPlayerGrid called');
    console.log('Current blind bidding players:', currentGame.blindBiddingPlayers);
    
    playerGrid.innerHTML = '';
    
    players.forEach((player, index) => {
        const playerTile = document.createElement('div');
        playerTile.className = 'player-tile';
        
        // Add dealer indicator
        if (index === currentGame.currentDealer) {
            playerTile.classList.add('dealer');
        }
        
        const currentScore = currentGame.scores[player] || 0;
        
        // Check if player can bid blind (sitting right after dealer)
        const canBlind = canBidBlind(player);
        const playerBid = getPlayerBid(player) || 0;
        const canBlindNow = canBlind && playerBid > 0;
        const isBlind = isBlindBidding(player);
        
        console.log(`Player ${player}: canBlind=${canBlind}, bid=${playerBid}, canBlindNow=${canBlindNow}, isBlind=${isBlind}`);
        
        // Debug the checkbox HTML
        const checkboxHtml = `<input type="checkbox" ${isBlind ? 'checked' : ''} ${!canBlindNow ? 'disabled' : ''}>`;
        console.log(`Checkbox HTML for ${player}:`, checkboxHtml);
        
        // Add blind bidding indicator
        if (isBlind) {
            playerTile.classList.add('blind-bidding');
        }
        
        playerTile.innerHTML = `
            <div class="player-header">
                <div class="player-name">${player}</div>
                <div class="player-score">${currentScore}</div>
                <div class="blind-indicator ${canBlind ? 'active' : ''}">👁️</div>
            </div>
            <div class="player-fields">
                <div class="field-group">
                    <div class="field-label">Ставка</div>
                    <div class="field-controls">
                        <button class="field-btn minus" onclick="changeField('${player}', 'bid', -1)">-</button>
                        <div class="field-value" id="bid_${player}">${getPlayerBid(player) || 0}</div>
                        <button class="field-btn plus" onclick="changeField('${player}', 'bid', 1)">+</button>
                    </div>
                </div>
                <div class="blind-bidding-group">
                    <div class="blind-bidding-controls">
                        <label class="blind-checkbox ${isBlind ? 'checked' : ''} ${!canBlindNow ? 'disabled' : ''}" onclick="toggleBlindBidding('${player}')">
                            <input type="checkbox" ${isBlind ? 'checked' : ''} ${!canBlindNow ? 'disabled' : ''}>
                            <span class="checkmark"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        playerGrid.appendChild(playerTile);
    });
    
    // Update bid validation
    updateBidValidation();
}

function updateTricksPlayerGrid() {
    const playerGrid = document.getElementById('tricksPlayerGrid');
    if (!playerGrid) return;
    
    playerGrid.innerHTML = '';
    
    players.forEach((player, index) => {
        const playerTile = document.createElement('div');
        playerTile.className = 'player-tile';
        
        // Add dealer indicator
        if (index === currentGame.currentDealer) {
            playerTile.classList.add('dealer');
        }
        
        const currentScore = currentGame.scores[player] || 0;
        const playerBid = getPlayerBid(player) || 0;
        
        playerTile.innerHTML = `
            <div class="player-header">
                <div class="player-name">${player}</div>
                <div class="player-score">${currentScore}</div>
                <div class="player-bid-info">Ставка: ${playerBid}</div>
            </div>
            <div class="player-fields">
                <div class="field-group">
                    <div class="field-label">Взятки</div>
                    <div class="field-controls">
                        <button class="field-btn minus" onclick="changeField('${player}', 'tricks', -1)">-</button>
                        <div class="field-value" id="tricks_${player}">${getPlayerTricks(player) || 0}</div>
                        <button class="field-btn plus" onclick="changeField('${player}', 'tricks', 1)">+</button>
                    </div>
                </div>
            </div>
        `;
        
        playerGrid.appendChild(playerTile);
    });
    
    // Update tricks validation
    updateTricksValidationDisplay();
}

function completeBiddingPhase() {
    // Validate bids before proceeding to tricks phase
    if (!validateBids()) {
        return; // Stop if bids are invalid
    }
    
    // Switch to tricks phase
    switchToPhase('tricks');
}

function backToBiddingPhase() {
    // Switch back to bidding phase
    switchToPhase('bidding');
}

function showBiddingHelp() {
    // Help functionality can be implemented later with a modal or tooltip
    console.log('Bidding help requested');
}

function showTricksHelp() {
    // Help functionality can be implemented later with a modal or tooltip
    console.log('Tricks help requested');
}

// Update bids counter display
function updateBidsCounter() {
    const counterElement = document.getElementById('bidsCounter');
    const statusElement = document.getElementById('bidsStatus');
    
    if (!counterElement || !statusElement) return;
    
    // Count total bids from all players (sum of all player bids)
    let totalBids = 0;
    
    players.forEach(player => {
        const bid = getPlayerBid(player) || 0;
        totalBids += bid; // Sum all player bids
    });
    
    // Calculate the difference: total bids - possible tricks
    const cardsPerHand = getCardsPerHand();
    const bidDifference = totalBids - cardsPerHand;
    
    // Update counter value (show the difference)
    counterElement.textContent = bidDifference;
    
    // Update status (show total bids / possible tricks)
    statusElement.textContent = `${totalBids}/${cardsPerHand}`;
    
    // Update counter color based on validation
    if (bidDifference === 0) {
        counterElement.style.color = '#ff6b6b'; // Red when bids equal tricks (bad)
    } else {
        counterElement.style.color = '#51cf66'; // Green for any other number (good)
    }
}

function updateDeckPreparationTips() {
    const deckSize = parseInt(document.getElementById('deckSize').value);
    const tipElement = document.getElementById('deckPreparationTip');
    const tipContent = document.getElementById('tipContent');
    
    if (deckSize === 36) {
        tipElement.style.display = 'block';
        tipContent.innerHTML = `
            <div class="tip-section">
                <h3>📋 Подготовка колоды 36 карт:</h3>
                <ul>
                    <li><strong>Удалите:</strong> 2, 3, 4, 5, 6 из всех мастей</li>
                    <li><strong>Оставьте:</strong> 7, 8, 9, 10, В, Д, К, Т из всех мастей</li>
                    <li><strong>Итого:</strong> 8 карт × 4 масти = 32 карты + 4 козыря = 36 карт</li>
                </ul>
            </div>
        `;
    } else if (deckSize === 54) {
        tipElement.style.display = 'block';
        tipContent.innerHTML = `
            <div class="tip-section">
                <h3>📋 Подготовка колоды 54 карт:</h3>
                <ul>
                    <li><strong>Используйте:</strong> Полную колоду 52 карты + 2 джокера</li>
                    <li><strong>Или:</strong> Полную колоду 52 карты + 2 козыря</li>
                    <li><strong>Итого:</strong> 52 карты + 2 дополнительные = 54 карты</li>
                </ul>
            </div>
        `;
    } else {
        tipElement.style.display = 'none';
    }
}

// Calculate rounds for stage type based on player count and deck size
function calculateRoundsForStage(stageType, playerCount, deckSize) {
    const maxCards = getMaxCardsForPlayerCount(playerCount);
    
    switch (stageType) {
        case 'golden':
            // Golden stages: 2-6 rounds based on player count
            return Math.max(2, Math.min(6, playerCount));
            
        case 'rising':
            // Rising stages: increment from 2 to maxCards
            // Number of rounds = maxCards - 1 (since we start from 2)
            return maxCards - 1;
            
        case 'full':
            // Full stages: 2-6 rounds based on player count
            return Math.max(2, Math.min(6, playerCount));
            
        case 'decreasing':
            // Decreasing stages: decrement from maxCards to 2
            // Number of rounds = maxCards - 1 (since we end at 2)
            return maxCards - 1;
            
        case 'blind':
            // Blind stages: 2-6 rounds based on player count
            return Math.max(2, Math.min(6, playerCount));
            
        default:
            return 2; // Default fallback
    }
}

// Get stage description for display
function getStageDescription(stageType, playerCount, deckSize) {
    const rounds = calculateRoundsForStage(stageType, playerCount, deckSize);
    const maxCards = getMaxCardsForPlayerCount(playerCount);
    
    switch (stageType) {
        case 'golden':
            return `${rounds} rounds with 1 card`;
        case 'rising':
            return `${rounds} rounds incrementing 2→${maxCards}`;
        case 'full':
            return `${rounds} rounds with ${maxCards} cards`;
        case 'decreasing':
            return `${rounds} rounds decrementing ${maxCards}→2`;
        case 'blind':
            return `${rounds} rounds with ${maxCards} cards (blind)`;
        default:
            return `${rounds} rounds`;
    }
}

// Stages Edit Functionality
let customStages = [];
let currentPreset = 'default';

function showStagesEdit() {
    showScreen('stagesEditScreen');
    loadCurrentStages();
    updateStagesPreview();
}

function loadCurrentStages() {
    const playerCount = players.length;
    const deckSize = parseInt(document.getElementById('deckSize').value);
    
    // Get current configuration
    const config = getRoundConfig();
    if (config) {
        customStages = config.stages.map(stage => ({
            type: getStageTypeFromConfig(stage),
            rounds: stage.rounds
        }));
    } else {
        // Default configuration
        customStages = [
            { type: 'golden', rounds: calculateRoundsForStage('golden', playerCount, deckSize) },
            { type: 'rising', rounds: calculateRoundsForStage('rising', playerCount, deckSize) },
            { type: 'full', rounds: calculateRoundsForStage('full', playerCount, deckSize) },
            { type: 'decreasing', rounds: calculateRoundsForStage('decreasing', playerCount, deckSize) },
            { type: 'golden', rounds: calculateRoundsForStage('golden', playerCount, deckSize) },
            { type: 'blind', rounds: calculateRoundsForStage('blind', playerCount, deckSize) }
        ];
    }
    
    renderStagesList();
}

function getStageTypeFromConfig(stageConfig) {
    if (stageConfig.cards === 1) return 'golden';
    if (stageConfig.cards === 'increment') return 'rising';
    if (stageConfig.cards === 'decrement') return 'decreasing';
    if (typeof stageConfig.cards === 'number' && stageConfig.cards > 1) {
        // Check if it's the max cards (full stage)
        const playerCount = players.length;
        const deckSize = parseInt(document.getElementById('deckSize').value);
        const maxCards = getMaxCardsForPlayerCount(playerCount);
        if (stageConfig.cards === maxCards) return 'full';
        return 'blind'; // Assume blind if it's max cards but not in the middle
    }
    return 'golden'; // Default fallback
}

function renderStagesList() {
    const stagesList = document.getElementById('stagesList');
    const playerCount = players.length;
    const deckSize = parseInt(document.getElementById('deckSize').value);
    
    stagesList.innerHTML = '';
    
    customStages.forEach((stage, index) => {
        const stageItem = document.createElement('div');
        stageItem.className = 'stage-item';
        
        const calculatedRounds = calculateRoundsForStage(stage.type, playerCount, deckSize);
        const stageDescription = getStageDescription(stage.type, playerCount, deckSize);
        
        stageItem.innerHTML = `
            <div class="stage-drag-handle">⋮⋮</div>
            <div class="stage-number">${index + 1}</div>
            <div class="stage-type">
                <select class="stage-type-select" onchange="updateStageType(${index}, this.value)">
                    <option value="golden" ${stage.type === 'golden' ? 'selected' : ''}>golden</option>
                    <option value="rising" ${stage.type === 'rising' ? 'selected' : ''}>rising</option>
                    <option value="full" ${stage.type === 'full' ? 'selected' : ''}>full</option>
                    <option value="decreasing" ${stage.type === 'decreasing' ? 'selected' : ''}>decreasing</option>
                    <option value="blind" ${stage.type === 'blind' ? 'selected' : ''}>blind</option>
                </select>
            </div>
            <div class="stage-info">
                <div class="stage-description">${stageDescription}</div>
                <div class="stage-rounds-display">${calculatedRounds} rounds</div>
            </div>
            <button class="remove-stage-btn" onclick="removeStage(${index})" 
                    style="background: #dc3545; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ×
            </button>
        `;
        stagesList.appendChild(stageItem);
    });
}

function updateStageType(index, type) {
    const playerCount = players.length;
    const deckSize = parseInt(document.getElementById('deckSize').value);
    
    customStages[index].type = type;
    customStages[index].rounds = calculateRoundsForStage(type, playerCount, deckSize);
    
    renderStagesList();
    updateStagesPreview();
}

function addStage() {
    const playerCount = players.length;
    const deckSize = parseInt(document.getElementById('deckSize').value);
    
    customStages.push({ 
        type: 'golden', 
        rounds: calculateRoundsForStage('golden', playerCount, deckSize) 
    });
    renderStagesList();
    updateStagesPreview();
}

function removeStage(index) {
    if (customStages.length > 1) {
        customStages.splice(index, 1);
        renderStagesList();
        updateStagesPreview();
    }
}

function clearStages() {
    if (confirm('Очистить все этапы?')) {
        customStages = [];
        renderStagesList();
        updateStagesPreview();
    }
}

function updateStagesPreview() {
    const preview = document.getElementById('stagesPreview');
    const playerCount = players.length;
    const deckSize = parseInt(document.getElementById('deckSize').value);
    
    if (customStages.length === 0) {
        preview.textContent = '(нет этапов)';
        return;
    }
    
    const stagesInfo = customStages.map((stage, index) => {
        const rounds = calculateRoundsForStage(stage.type, playerCount, deckSize);
        const description = getStageDescription(stage.type, playerCount, deckSize);
        return `${index + 1}. ${stage.type} (${description})`;
    }).join('\n');
    
    preview.textContent = stagesInfo;
}

function loadPreset(preset) {
    const playerCount = players.length;
    const deckSize = parseInt(document.getElementById('deckSize').value);
    
    currentPreset = preset;
    
    // Update preset button states
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    switch (preset) {
        case 'default':
            loadCurrentStages();
            break;
        case 'golden':
            customStages = [
                { type: 'golden', rounds: calculateRoundsForStage('golden', playerCount, deckSize) },
                { type: 'golden', rounds: calculateRoundsForStage('golden', playerCount, deckSize) },
                { type: 'golden', rounds: calculateRoundsForStage('golden', playerCount, deckSize) },
                { type: 'blind', rounds: calculateRoundsForStage('blind', playerCount, deckSize) }
            ];
            break;
        case 'simple':
            customStages = [
                { type: 'golden', rounds: calculateRoundsForStage('golden', playerCount, deckSize) },
                { type: 'rising', rounds: calculateRoundsForStage('rising', playerCount, deckSize) },
                { type: 'full', rounds: calculateRoundsForStage('full', playerCount, deckSize) },
                { type: 'decreasing', rounds: calculateRoundsForStage('decreasing', playerCount, deckSize) },
                { type: 'golden', rounds: calculateRoundsForStage('golden', playerCount, deckSize) }
            ];
            break;
        case 'custom':
            customStages = [
                { type: 'golden', rounds: calculateRoundsForStage('golden', playerCount, deckSize) },
                { type: 'rising', rounds: calculateRoundsForStage('rising', playerCount, deckSize) },
                { type: 'full', rounds: calculateRoundsForStage('full', playerCount, deckSize) },
                { type: 'decreasing', rounds: calculateRoundsForStage('decreasing', playerCount, deckSize) },
                { type: 'golden', rounds: calculateRoundsForStage('golden', playerCount, deckSize) },
                { type: 'blind', rounds: calculateRoundsForStage('blind', playerCount, deckSize) }
            ];
            break;
    }
    
    renderStagesList();
    updateStagesPreview();
}

function saveStages() {
    if (customStages.length === 0) {
        alert('Добавьте хотя бы один этап!');
        return;
    }
    
    // Save custom stages to localStorage
    localStorage.setItem('customStages', JSON.stringify(customStages));
    localStorage.setItem('currentPreset', currentPreset);
    
    alert('Этапы сохранены! Теперь они будут использоваться в новых играх.');
    showGameSetup();
}

function resetStages() {
    if (confirm('Сбросить этапы к значениям по умолчанию?')) {
        localStorage.removeItem('customStages');
        localStorage.removeItem('currentPreset');
        loadCurrentStages();
        updateStagesPreview();
        
        // Reset preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }
}

// Load custom stages on page load
function loadCustomStages() {
    const savedStages = localStorage.getItem('customStages');
    const savedPreset = localStorage.getItem('currentPreset');
    
    if (savedStages) {
        customStages = JSON.parse(savedStages);
        currentPreset = savedPreset || 'custom';
    }
}

// Override the getRoundConfig function to use custom stages
function getRoundConfig() {
    const playerCount = players.length;
    const deckSize = parseInt(document.getElementById('deckSize').value);
    
    // Check if we have custom stages
    const savedStages = localStorage.getItem('customStages');
    if (savedStages) {
        const customStages = JSON.parse(savedStages);
        const totalRounds = customStages.reduce((sum, stage) => sum + stage.rounds, 0);
        
        return {
            totalRounds: totalRounds,
            stages: customStages.map(stage => {
                const stageConfig = { rounds: stage.rounds };
                
                switch (stage.type) {
                    case 'golden':
                        stageConfig.cards = 1;
                        break;
                    case 'rising':
                        stageConfig.cards = 'increment';
                        break;
                    case 'full':
                        stageConfig.cards = getMaxCardsForPlayerCount(playerCount);
                        break;
                    case 'decreasing':
                        stageConfig.cards = 'decrement';
                        break;
                    case 'blind':
                        stageConfig.cards = getMaxCardsForPlayerCount(playerCount);
                        break;
                    default:
                        stageConfig.cards = 1;
                }
                
                return stageConfig;
            })
        };
    }
    
    // Fall back to default configuration
    return ROUND_CONFIGS[deckSize]?.[playerCount] || ROUND_CONFIGS[36][4];
}

