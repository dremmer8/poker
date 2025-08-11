# Player Management System

This document describes the new player management functionality added to the Poker Score Counter application.

## Overview

The player management system allows users to:
- Add new players with profile images
- Store player information in Firebase Firestore
- Upload and store player images in Firebase Storage
- Display player images in the visualizer (only)

## Features

### 1. Player Database
- **Storage**: Player data is stored in Firebase Firestore
- **Structure**: Each player document contains:
  - `name` (string): Player name (used as document ID)
  - `imageUrl` (string): URL to player's profile image
  - `createdAt` (timestamp): When the player was added
  - `lastUpdated` (timestamp): Last modification time

### 2. Image Management
- **Upload**: Images can be uploaded from local files or iOS photo gallery
- **Storage**: Images are stored in Firebase Storage under `players/` folder
- **Validation**: 
  - File type must be an image
  - Maximum file size: 5MB
  - Supported formats: All common image formats

### 3. User Interface
- **Menu Button**: New "Управление игроками" (Player Management) button in main menu
- **Add Player Form**: 
  - Player name input (max 20 characters)
  - Image upload with preview
  - Submit button with loading state
- **Players List**: 
  - Display all stored players
  - Show player avatars
  - Edit and delete options (edit is placeholder for future)

## Technical Implementation

### Firebase Configuration
- **Firestore**: Stores player metadata
- **Storage**: Stores player images
- **Collections**: 
  - `players/` - Player documents
  - `globalSession/` - Game session data (existing)

### JavaScript Functions

#### Player Database (`PlayerDatabase`)
- `savePlayer(playerName, playerData)` - Add/update player
- `getPlayer(playerName)` - Retrieve player by name
- `getAllPlayers()` - Get all players
- `deletePlayer(playerName)` - Remove player and image

#### Image Storage (`ImageStorage`)
- `uploadPlayerImage(playerName, file)` - Upload image to Firebase Storage
- `deletePlayerImage(imageUrl)` - Remove image from storage

#### UI Functions
- `showPlayerManagement()` - Display player management screen
- `loadPlayersList()` - Load and display players
- `addNewPlayer()` - Add new player with validation
- `handleImageSelection()` - Process image file selection
- `removeImagePreview()` - Clear image preview

### Visualizer Integration
- **Image Display**: Player images are shown in the visualizer
- **Caching**: Images are cached to avoid repeated Firebase requests
- **Fallback**: Default avatar shown if no image is available

## Usage

### Adding a Player
1. Click "Управление игроками" in main menu
2. Enter player name (required)
3. Click "Выбрать фото" to select an image
4. Review image preview
5. Click "➕ Добавить игрока" to save

### Managing Players
- **View**: All players are displayed in a list
- **Edit**: Currently shows placeholder message (future feature)
- **Delete**: Click delete button with confirmation dialog

### Image Requirements
- **Format**: Any common image format (JPEG, PNG, GIF, etc.)
- **Size**: Maximum 5MB
- **Quality**: Images are automatically resized and optimized

## Security Considerations

- **Authentication**: Currently no user authentication (all data is public)
- **File Validation**: Client-side validation of file type and size
- **Storage Rules**: Firebase Storage rules should be configured appropriately

## Future Enhancements

1. **Player Editing**: Full player profile editing functionality
2. **Image Cropping**: Built-in image editing tools
3. **Player Statistics**: Track player performance over time
4. **User Authentication**: Secure player management per user
5. **Bulk Operations**: Import/export player lists

## Testing

Use `test-player-management.html` to test:
- Firebase connection
- Player database operations
- Image storage functionality
- Full system integration

## File Structure

```
poker/
├── index.html              # Main counter app with player management
├── script.js               # Player management JavaScript functions
├── styles.css              # Player management CSS styles
├── firebase-config.js      # Firebase config with player database
├── visualizer.html         # Visualizer with player image support
├── visualizer.js           # Visualizer with image loading
├── visualizer.css          # Visualizer image styles
├── test-player-management.html  # Test file for functionality
└── PLAYER_MANAGEMENT_README.md  # This documentation
```

## Troubleshooting

### Common Issues

1. **Firebase not initialized**
   - Check internet connection
   - Verify Firebase configuration
   - Check browser console for errors

2. **Image upload fails**
   - Verify file is an image
   - Check file size (max 5MB)
   - Ensure Firebase Storage is enabled

3. **Player not appearing in list**
   - Check Firebase Firestore rules
   - Verify player was saved successfully
   - Check browser console for errors

### Debug Mode

Enable console logging to see detailed information about:
- Firebase operations
- Image upload progress
- Player data operations
- Error details

## Support

For issues or questions about the player management system:
1. Check browser console for error messages
2. Verify Firebase configuration
3. Test with `test-player-management.html`
4. Check this documentation for common solutions
