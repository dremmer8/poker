# Расписной Покер (Russian Contract Bridge Score Counter)

A comprehensive poker game score counter for Russian Contract Bridge with advanced stage-based scoring rules and bidding validation.

## Game Rules & Stages

### Stage Progression
The game consists of 6 stages with different scoring rules:

#### Stage 1 (First Stage - 1 card rounds)
- **Bid 1, Tricks 1**: +30 points
- **Bid 1, Tricks 0**: -30 points  
- **Bid 0, Tricks 0**: +15 points
- **Bid 0, Tricks 1**: +5 points

#### Stage 2 (Increment Stage)
- **Bid 1, Tricks 1**: +10 points
- **Bid 1, Tricks 0**: -10 points
- **Bid 0, Tricks 0**: +5 points
- **Bid 0, Tricks 1**: +1 point

#### Stage 3 (Fixed Cards Stage)
- Same scoring as Stage 2

#### Stage 4 (Decrement Stage)
- Same scoring as Stage 2

#### Stage 5 (Second First Stage - 1 card rounds)
- Same scoring as Stage 1

#### Stage 6 (Blind Stage - Max cards)
- Same scoring as Stages 2, 3, 4 (normal scoring rules)

### Bidding Rules
- **Total Bidding Cap**: Players × Cards per hand
- **Individual Bid Cap**: Cards per hand
- **Restriction**: Total bids cannot equal total possible tricks
- **Example**: 4 players with 3 cards = max 12 total bids, max 3 per player

## Recent Fixes

### 1. Scoring Logic Corrections
- **Fixed Stage 1/5/6 scoring**: Bid=0, Tricks=1 now correctly gives +5 points (was +15)
- **Updated scoring rules text**: All stage descriptions now show correct point values
- **Fixed penalty calculations**: Now uses correct stage-based penalty logic

### 2. Bidding Validation Improvements
- **Corrected total bidding cap**: Now properly calculates as players × cards per hand
- **Fixed individual bid cap**: Now correctly limits to cards per hand
- **Enhanced validation feedback**: Real-time visual feedback for bid validation
- **Improved error messages**: More detailed and helpful validation error messages

### 3. Round Progression Fixes
- **Fixed card counting logic**: `getCardsPerHand()` now correctly calculates based on stage
- **Corrected increment logic**: Stage 2 now properly increments from 1 to max cards
- **Fixed decrement logic**: Stage 4 now properly decrements from max cards to 1

### 4. Stage Configuration Validation
- **Added comprehensive validation**: All stage configurations are validated for consistency
- **Fixed stage progression**: Each stage now has correct round counts and card distributions
- **Enhanced debugging**: Added detailed debugging functions for troubleshooting

### 5. Display Consistency Fixes
- **Fixed card counting display**: Both `cardsDisplay` and `cardsDisplay2` now show consistent values
- **Fixed round display**: Both `roundDisplay` and `roundDisplay2` now show consistent values
- **Fixed state restoration**: Cards per hand is properly recalculated when loading saved games
- **Added card counting debug**: Press **C** to debug card counting issues

## Game Configuration

### Supported Configurations
- **Deck Sizes**: 36 cards, 54 cards
- **Player Counts**: 2-6 players
- **Total Rounds**: Varies by configuration (30-56 rounds)

### Stage Configurations by Player Count

#### 36-Card Deck
- **2 Players**: 42 rounds (2-17-2-17-2-2)
- **3 Players**: 32 rounds (3-9-3-9-3-3)
- **4 Players**: 30 rounds (4-7-4-7-4-4)
- **5 Players**: 30 rounds (5-5-5-5-5-5)
- **6 Players**: 32 rounds (6-4-6-4-6-6)

#### 54-Card Deck
- **2 Players**: 56 rounds (2-24-2-24-2-2)
- **3 Players**: 42 rounds (3-15-3-15-3-3)
- **4 Players**: 38 rounds (4-11-4-11-4-4)
- **5 Players**: 36 rounds (5-8-5-8-5-5)
- **6 Players**: 36 rounds (6-6-6-6-6-6)

## Keyboard Shortcuts

- **Space**: Add 10 points to first player
- **Enter**: Add custom score (when custom score input is focused)
- **R**: Next round
- **S**: Toggle special game
- **T**: Test bidding regulations
- **D**: Debug game rules
- **V**: Validate game configuration
- **C**: Debug card counting

## Special Games

The game supports 5 special game types:
1. **Dark**: Blind bidding (same scoring as normal)
2. **Golden**: Every trick worth 10 points
3. **Miser**: Penalty for each trick (-10 per trick)
4. **No Trump**: Normal scoring without trump suits
5. **Frontal**: Cards on forehead (normal scoring)

## Features

### Core Features
- ✅ Multi-stage scoring system
- ✅ Real-time bid validation
- ✅ Auto-save functionality
- ✅ Game history tracking
- ✅ Special game modes
- ✅ Responsive design
- ✅ Comprehensive debugging tools

### Advanced Features
- ✅ Stage-based scoring rules
- ✅ Bidding regulation enforcement
- ✅ Penalty calculation
- ✅ Round progression tracking
- ✅ Configuration validation
- ✅ Keyboard shortcuts
- ✅ Celebration screen

## Usage

1. **Start Game**: Configure players and settings
2. **Enter Bids**: Each player enters their bid (0 to cards per hand)
3. **Enter Tricks**: After playing, enter actual tricks taken
4. **Validate**: System checks bidding rules automatically
5. **Calculate**: Click "Next Round" to calculate scores
6. **Progress**: Game automatically progresses through stages
7. **Complete**: Game ends after all rounds, shows winner

## Technical Details

### File Structure
- `index.html`: Main interface and screens
- `script.js`: Game logic and rules implementation
- `styles.css`: Responsive design and styling

### Key Functions
- `calculateNormalScore()`: Core scoring logic
- `validateBids()`: Bidding validation
- `getCardsPerHand()`: Card calculation per stage
- `getCurrentStage()`: Stage determination
- `debugGameRules()`: Comprehensive debugging
- `validateGameConfiguration()`: Configuration validation

### Data Persistence
- Local storage for game state
- Game history tracking
- Auto-save functionality

## Debugging

Use the debug functions to troubleshoot:
- Press **D** to run `debugGameRules()`
- Press **V** to run `validateGameConfiguration()`
- Press **T** to test bidding regulations

All debug output goes to browser console (F12 → Console).

## Browser Compatibility

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

## License

This project is open source and available under the MIT License. 