# Game Engine Documentation

## Overview
The `GameEngine` class is the core of the game, responsible for managing the game state, rendering, and handling user input. It initializes various managers and handles the game loop.

## Class: `GameEngine`

### Constructor
```javascript
constructor(canvas)
```
- **Parameters:**
    - `canvas`: The HTML canvas element where the game will be rendered.

### Properties
- `canvas`: The HTML canvas element.
- `ctx`: The 2D rendering context for the canvas.
- `gameState`: The current state of the game (e.g., 'menu', 'playing').
- `validStates`: Array of valid game states.
- `playerPosition`: The player's position on the canvas.
- `mousePos`: The current mouse position.
- `keys`: Object tracking the state of pressed keys.
- `inventory`: Object tracking the player's keys (yellow, blue, red).
- `audio`: Instance of `AudioManager` for handling audio.
- `sprites`: Instance of `SpriteManager` for managing sprites.
- `pixelSprites`: Instance of `PixelSpriteRenderer` for rendering pixel sprites.
- `trackDisplayTimeout`: Timeout for displaying the current track name.
- `trackDisplay`: HTML element for displaying the current track name.
- `isPaused`: Boolean indicating if the game is paused.
- `pauseOverlay`: HTML element for the pause overlay.
- `showFPS`: Boolean indicating if FPS should be displayed.
- `lastFrameTime`: Timestamp of the last frame.
- `frameCount`: Number of frames rendered.
- `currentFPS`: Current frames per second.
- `fpsUpdateInterval`: Interval for updating FPS.
- `lastFPSUpdate`: Timestamp of the last FPS update.
- `shopManager`: Instance of `ShopManager` for handling the shop.
- `isShopOpen`: Boolean indicating if the shop is open.

### Methods

#### `setFullscreen()`
Sets the canvas to fullscreen.

#### `clear()`
Clears the canvas.

#### `drawText(text, x, y, size, color)`
Draws text on the canvas.
- **Parameters:**
    - `text`: The text to draw.
    - `x`: The x-coordinate.
    - `y`: The y-coordinate.
    - `size`: The font size.
    - `color`: The text color.

#### `isMouseOver(x, y, width, height)`
Checks if the mouse is over a specified area.
- **Parameters:**
    - `x`: The x-coordinate of the area.
    - `y`: The y-coordinate of the area.
    - `width`: The width of the area.
    - `height`: The height of the area.

#### `isKeyPressed(key)`
Checks if a key is pressed.
- **Parameters:**
    - `key`: The key to check.

#### `drawRect(x, y, width, height, color)`
Draws a rectangle on the canvas.
- **Parameters:**
    - `x`: The x-coordinate.
    - `y`: The y-coordinate.
    - `width`: The width of the rectangle.
    - `height`: The height of the rectangle.
    - `color`: The color of the rectangle.

#### `setState(newState)`
Sets the game state.
- **Parameters:**
    - `newState`: The new game state.

#### `showCurrentTrack()`
Displays the current track name.

#### `togglePause()`
Toggles the pause state of the game.

#### `resumeGame()`
Resumes the game if it is paused.

#### `drawPlayer()`
Draws the player on the canvas.

#### `toggleFPS()`
Toggles the display of FPS.

#### `updateFPS(timestamp)`
Updates the FPS.
- **Parameters:**
    - `timestamp`: The current timestamp.

#### `drawFPS()`
Draws the FPS on the canvas.

#### `toggleShop()`
Toggles the shop state.

#### `addKey(color)`
Adds a key to the inventory.
- **Parameters:**
    - `color`: The color of the key (yellow, blue, red).

#### `useKey(color)`
Uses a key from the inventory.
- **Parameters:**
    - `color`: The color of the key (yellow, blue, red).

#### `hasKey(color)`
Checks if the player has a key of a specified color.
- **Parameters:**
    - `color`: The color of the key (yellow, blue, red).

#### `gameLoop(timestamp)`
The main game loop.
- **Parameters:**
    - `timestamp`: The current timestamp.

### Event Listeners
- `resize`: Calls `setFullscreen()` on window resize.
- `mousemove`: Updates `mousePos` on mouse move.
- `keydown`: Updates `keys` and handles specific key actions.
- `keyup`: Updates `keys` on key release.
- `click`: Initializes audio and handles shop clicks.

### Initialization
- Loads sprites using `loadSprites()`.
- Starts the game loop using `requestAnimationFrame()`.

### Sprite Loading
```javascript
async loadSprites()
```
Loads sprite files and logs success or failure.

### Fullscreen Setup
```javascript
setFullscreen()
```
Sets the canvas dimensions to match the window size.

### Game Loop
```javascript
gameLoop(timestamp)
```
Handles updating and rendering the game based on the current state.

## Conclusion
The `GameEngine` class is a comprehensive engine for managing game states, rendering, and user input. It integrates various managers and handles the game loop efficiently.
