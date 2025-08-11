# Poker Game Visualizer

A beautiful, real-time visualizer for the Расписной Покер (Russian Contract Bridge) game that displays current game information in a horizontal full HD layout.

## Features

- **Real-time Updates**: Automatically syncs with the main game via Firebase
- **Beautiful UI**: Modern, dark theme with glassmorphism effects
- **Horizontal Layout**: Optimized for full HD displays and projectors
- **Read-only Display**: Perfect for spectators and game monitoring
- **Responsive Design**: Adapts to different screen sizes

## What It Shows

### Header Section
- Game title and connection status
- Current round number
- Cards per hand
- Current game stage
- Game duration timer

### Main Display
- **Player Cards**: Individual cards showing each player's:
  - Current bid
  - Current tricks taken
  - Total score
  - Dealer indicator (🎯)

- **Game Statistics**:
  - Total bids vs. maximum allowed
  - Total tricks vs. cards in hand
  - Current dealer

### Footer Section
- **Current Scores**: All players ranked by score
- **Round History**: Last 5 completed rounds with detailed results

## How to Use

1. **Open the Visualizer**: Open `visualizer.html` in a web browser
2. **Automatic Connection**: The visualizer will automatically connect to Firebase and sync with the main game
3. **Real-time Updates**: All information updates automatically as the game progresses
4. **Full Screen**: For best experience, use full screen mode (F11)

## Requirements

- Modern web browser with JavaScript enabled
- Internet connection for Firebase sync
- Active game session running on the main counter site

## File Structure

- `visualizer.html` - Main HTML file
- `visualizer.css` - Styling and layout
- `visualizer.js` - Real-time logic and Firebase integration
- `firebase-config.js` - Firebase configuration (shared with main site)

## Technical Details

- **Real-time Sync**: Uses Firebase Firestore for live game updates
- **Responsive Grid**: Automatically adjusts player grid based on screen size
- **Performance**: Optimized for smooth 60fps updates
- **Cross-platform**: Works on Windows, macOS, and Linux

## Use Cases

- **Game Rooms**: Display on large screens for all players to see
- **Tournaments**: Show current standings and game progress
- **Streaming**: Perfect for Twitch/YouTube game streams
- **Spectators**: Allow non-players to follow the game

## Troubleshooting

- **No Connection**: Check if the main game site is running and Firebase is accessible
- **Blank Screen**: Ensure JavaScript is enabled and check browser console for errors
- **Slow Updates**: Check internet connection and Firebase performance

## Customization

The visualizer can be customized by modifying:
- Colors and themes in `visualizer.css`
- Update frequency in `visualizer.js`
- Layout dimensions for different screen sizes
- Language and text labels

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

This visualizer is part of the Расписной Покер game project and follows the same licensing terms.
