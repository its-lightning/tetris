// Constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    '#00FFFF', // Cyan (I)
    '#0000FF', // Blue (J)
    '#FFA500', // Orange (L)
    '#FFFF00', // Yellow (O)
    '#00FF00', // Green (S)
    '#800080', // Purple (T)
    '#FF0000'  // Red (Z)
];
const EMPTY_COLOR = '#000000';
const BORDER_COLOR = '#444444';

// Tetromino shapes defined using the standard Tetris notation
const SHAPES = [
    // I-piece
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    // J-piece
    [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // L-piece
    [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // O-piece
    [
        [1, 1],
        [1, 1]
    ],
    // S-piece
    [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    // T-piece
    [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // Z-piece
    [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
];

// Game variables
let canvas, ctx;
let nextCanvas, nextCtx;
let holdCanvas, holdCtx;
let scoreElement, levelElement, linesElement;
let board;
let currentPiece, nextPiece, holdPiece;
let score, level, lines;
let gameOver;
let dropInterval, dropCounter;
let lastTime;
let animationId;
let isSinglePlayer = true;
let pressedKeys = {};
let canHold = true;
let ghostPieceEnabled = true;

// Auto-repeat timing variables
let autoRepeatDelay = 170; // milliseconds before repeating starts
let autoRepeatRate = 100;  // milliseconds between repeats (higher = slower)
let leftRepeatTimer = 0;
let rightRepeatTimer = 0;
let downRepeatTimer = 0;

// Initialize the game
function initGame(boardId, nextPieceId, scoreId, levelId, linesId, singlePlayer = true) {
    console.log("Initializing game...");
    isSinglePlayer = singlePlayer;
    
    // Set up the main canvas
    canvas = document.getElementById(boardId);
    if (!canvas) {
        console.error("Canvas element not found:", boardId);
        return;
    }
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    // Set up the next piece canvas
    nextCanvas = document.getElementById(nextPieceId);
    if (!nextCanvas) {
        console.error("Next piece canvas not found:", nextPieceId);
        return;
    }
    nextCtx = nextCanvas.getContext('2d');
    nextCtx.imageSmoothingEnabled = false;
    
    // Hold piece canvas is optional
    holdCanvas = document.getElementById('hold-piece'); // Try to get it if it exists
    if (holdCanvas) {
        holdCtx = holdCanvas.getContext('2d');
        holdCtx.imageSmoothingEnabled = false;
    }
    
    // Get DOM elements
    scoreElement = document.getElementById(scoreId);
    levelElement = document.getElementById(levelId);
    linesElement = document.getElementById(linesId);
    
    if (!scoreElement || !levelElement || !linesElement) {
        console.error("Score elements not found");
        return;
    }
    
    // Initialize game state
    resetGame();
    
    // Set up event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Start the game loop
    lastTime = 0;
    gameLoop(0);
}

// Reset the game state
function resetGame() {
    // Cancel any existing animation frame
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Initialize the board with zeros (empty cells)
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    
    // Reset game variables
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    dropInterval = 1000; // milliseconds
    dropCounter = 0;
    pressedKeys = {};
    holdPiece = null;
    canHold = true;
    leftRepeatTimer = 0;
    rightRepeatTimer = 0;
    downRepeatTimer = 0;
    
    // Create the first pieces
    currentPiece = createPiece();
    nextPiece = createPiece();
    
    // Make sure they're not the same piece type
    while (nextPiece.type === currentPiece.type) {
        nextPiece = createPiece();
    }
    
    // Update the UI
    updateScore();
    drawNextPiece();
    if (holdCtx) {
        drawHoldPiece();
    }
    
    // Restart the game loop
    lastTime = 0;
    animationId = requestAnimationFrame(gameLoop);
    
    console.log("Game reset complete. Current piece:", currentPiece, "Next piece:", nextPiece);
}

// Create a new tetromino piece
function createPiece(type = null) {
    if (type === null) {
        type = Math.floor(Math.random() * SHAPES.length);
    }
    
    // Ensure the type is valid
    if (type < 0 || type >= SHAPES.length) {
        console.error("Invalid piece type:", type);
        type = 0; // Default to I piece if invalid
    }
    
    const shape = JSON.parse(JSON.stringify(SHAPES[type])); // Deep clone
    const color = COLORS[type];
    
    // Position the piece at the top center of the board
    const x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
    const y = 0;
    
    return { shape, color, x, y, type };
}

// Draw a single block
function drawBlock(x, y, color, context) {
    if (!context) return; // Safety check
    
    context.fillStyle = color;
    context.fillRect(x, y, 1, 1);
    
    // Add a border
    context.strokeStyle = BORDER_COLOR;
    context.strokeRect(x, y, 1, 1);
}

// Draw the ghost piece (shadow)
function drawGhostPiece() {
    if (!ghostPieceEnabled || !currentPiece) return;
    
    const ghostPiece = {
        shape: JSON.parse(JSON.stringify(currentPiece.shape)),
        color: currentPiece.color,
        x: currentPiece.x,
        y: currentPiece.y,
        type: currentPiece.type
    };
    
    // Drop the ghost piece as far as it can go
    while (isValidMove(ghostPiece, 0, 1)) {
        ghostPiece.y++;
    }
    
    // Draw the ghost piece with transparency
    ghostPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(ghostPiece.x + x, ghostPiece.y + y, 1, 1);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.strokeRect(ghostPiece.x + x, ghostPiece.y + y, 1, 1);
            }
        });
    });
}

// Draw the current piece
function drawPiece(piece, context) {
    if (!piece || !context) {
        console.log("Piece or context not available for drawing");
        return;
    }
    
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(
                    piece.x + x,
                    piece.y + y,
                    piece.color,
                    context
                );
            }
        });
    });
}

// Draw the board
function drawBoard() {
    // Make sure we have a valid board before proceeding
    if (!ctx || !board) {
        console.error("Canvas context or board is not available");
        return;
    }
    
    // Draw background
    ctx.fillStyle = EMPTY_COLOR;
    ctx.fillRect(0, 0, COLS, ROWS);
    
    // Draw border
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 0.05;
    ctx.strokeRect(-0.05, -0.05, COLS + 0.1, ROWS + 0.1);
    
    // Draw filled cells
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x] !== 0) {
                drawBlock(x, y, board[y][x], ctx);
            }
        }
    }
    
    // Draw the ghost piece
    drawGhostPiece();
    
    // Draw the current piece
    if (currentPiece) {
        drawPiece(currentPiece, ctx);
    }
}

// Draw the next piece preview
function drawNextPiece() {
    if (!nextCtx || !nextPiece) {
        console.log("Next piece context or piece not available");
        return;
    }
    
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    // Fill background with black (to match the main board)
    nextCtx.fillStyle = '#000000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    // Calculate block size for next piece canvas
    const blockSize = Math.min(nextCanvas.width / 4, nextCanvas.height / 4);
    
    // Center the piece in the preview
    const offsetX = (4 - nextPiece.shape[0].length) / 2;
    const offsetY = (4 - nextPiece.shape.length) / 2;
    
    // Draw the piece
    nextPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const drawX = (offsetX + x) * blockSize;
                const drawY = (offsetY + y) * blockSize;
                
                nextCtx.fillStyle = nextPiece.color;
                nextCtx.fillRect(drawX, drawY, blockSize, blockSize);
                
                // Add inner shading for 3D effect
                nextCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                nextCtx.fillRect(drawX, drawY, blockSize * 0.1, blockSize);
                nextCtx.fillRect(drawX, drawY, blockSize, blockSize * 0.1);
                
                nextCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                nextCtx.fillRect(drawX + blockSize * 0.9, drawY, blockSize * 0.1, blockSize);
                nextCtx.fillRect(drawX, drawY + blockSize * 0.9, blockSize, blockSize * 0.1);
                
                // Add border
                nextCtx.strokeStyle = BORDER_COLOR;
                nextCtx.strokeRect(drawX, drawY, blockSize, blockSize);
            }
        });
    });
}

// Draw the hold piece
function drawHoldPiece() {
    if (!holdCtx) return; // Skip if no hold canvas
    
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    
    // Calculate block size for hold piece canvas
    const blockSize = Math.min(holdCanvas.width, holdCanvas.height) / 4;
    holdCtx.save();
    holdCtx.scale(blockSize, blockSize);
    
    // Fill background
    holdCtx.fillStyle = EMPTY_COLOR;
    holdCtx.fillRect(0, 0, 4, 4);
    
    if (holdPiece) {
        // Center the piece in the preview
        const offsetX = (4 - holdPiece.shape[0].length) / 2;
        const offsetY = (4 - holdPiece.shape.length) / 2;
        
        // Create a temporary piece for drawing
        const tempPiece = {
            shape: holdPiece.shape,
            color: holdPiece.color,
            x: offsetX,
            y: offsetY,
            type: holdPiece.type
        };
        
        // Draw the piece
        drawPiece(tempPiece, holdCtx);
    }
    
    holdCtx.restore();
}

// Check if the piece can move to the specified position
function isValidMove(piece, offsetX, offsetY) {
    return piece.shape.every((row, y) => {
        return row.every((value, x) => {
            if (!value) return true;
            
            const newX = piece.x + x + offsetX;
            const newY = piece.y + y + offsetY;
            
            return (
                newX >= 0 &&
                newX < COLS &&
                newY < ROWS &&
                (newY < 0 || board[newY][newX] === 0)
            );
        });
    });
}

// Move the piece if the move is valid
function movePiece(offsetX, offsetY) {
    if (isValidMove(currentPiece, offsetX, offsetY)) {
        currentPiece.x += offsetX;
        currentPiece.y += offsetY;
        return true;
    }
    return false;
}

// Rotate the piece
function rotatePiece(clockwise = true) {
    // Save the original shape
    const originalShape = JSON.parse(JSON.stringify(currentPiece.shape));
    
    // Create a new rotated shape
    const numRows = originalShape.length;
    const numCols = originalShape[0].length;
    
    // Create a new shape array of the correct dimensions
    const newShape = Array.from({ length: numCols }, () => Array(numRows).fill(0));
    
    // Fill the new array with rotated values
    if (clockwise) {
        // Clockwise rotation
        for (let y = 0; y < numRows; y++) {
            for (let x = 0; x < numCols; x++) {
                newShape[x][numRows - 1 - y] = originalShape[y][x];
            }
        }
    } else {
        // Counter-clockwise rotation
        for (let y = 0; y < numRows; y++) {
            for (let x = 0; x < numCols; x++) {
                newShape[numCols - 1 - x][y] = originalShape[y][x];
            }
        }
    }
    
    // Save the original position
    const originalX = currentPiece.x;
    const originalY = currentPiece.y;
    
    // Apply the rotation
    currentPiece.shape = newShape;
    
    // Try different offsets for wall kicks (Super Rotation System)
    // Wall kick data for pieces J, L, S, T, Z (standard)
    const kicks = [
        [0, 0],   // No offset
        [-1, 0],  // Left
        [1, 0],   // Right
        [0, -1],  // Up
        [-1, -1], // Up-Left
        [1, -1],  // Up-Right
        [0, -2],  // Up x2
        [-1, -2], // Up x2 + Left
        [1, -2]   // Up x2 + Right
    ];
    
    // Special kicks for I-piece (different rotation behavior)
    const iKicks = [
        [0, 0],   // No offset
        [-2, 0],  // Left x2
        [1, 0],   // Right
        [-2, -1], // Left x2 + Up
        [1, -1],  // Right + Up
        [0, -1]   // Up
    ];
    
    // Choose appropriate kicks based on piece type
    const kicksToUse = currentPiece.type === 0 ? iKicks : kicks;
    
    // Try each offset until one works
    let rotated = false;
    for (const [offsetX, offsetY] of kicksToUse) {
        if (isValidMove(currentPiece, offsetX, offsetY)) {
            currentPiece.x += offsetX;
            currentPiece.y += offsetY;
            rotated = true;
            break;
        }
    }
    
    // If no offset works, revert to the original shape
    if (!rotated) {
        currentPiece.shape = originalShape;
        currentPiece.x = originalX;
        currentPiece.y = originalY;
    }
}

// Drop the piece and lock it in place if it can't move down
function dropPiece() {
    if (!movePiece(0, 1)) {
        lockPiece();
        return false;
    }
    return true;
}

// Hard drop the piece - immediately drop as far as possible
function hardDrop() {
    let dropCount = 0;
    while (movePiece(0, 1)) {
        dropCount++;
    }
    
    // Add points for hard drop - 2 points per cell dropped
    score += dropCount * 2;
    
    // Lock the piece in place
    lockPiece();
    updateScore();
}

// Hold the current piece
function holdCurrentPiece() {
    // Skip if hold feature is disabled (no hold canvas) or already used
    if (!holdCtx || !canHold) return;
    
    if (holdPiece === null) {
        // Store the current piece
        holdPiece = createPiece(currentPiece.type);
        // Get the next piece
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNextPiece();
    } else {
        // Swap current piece with hold piece
        const temp = holdPiece;
        holdPiece = createPiece(currentPiece.type);
        currentPiece = createPiece(temp.type);
        currentPiece.x = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
        currentPiece.y = 0;
    }
    
    canHold = false;
    drawHoldPiece();
}

// Save score to the server
function saveHighscore(score) {
    fetch('/api/save_highscore', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score: score })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.is_new_highscore) {
            // Show new high score message
            alert('New High Score: ' + data.score);
        }
    })
    .catch(error => {
        console.error('Error saving score:', error);
    });
}


// Lock the piece in place and create a new piece
// Lock the piece in place and create a new piece
// Lock the piece in place and create a new piece
function lockPiece() {
    // Add the piece to the board
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const boardY = currentPiece.y + y;
                if (boardY < 0) {
                    // Game over if the piece is locked above the board
                    gameOver = true;
                    return;
                }
                board[boardY][currentPiece.x + x] = currentPiece.color;
            }
        });
    });
    
    if (!gameOver) {
        // Check for completed lines
        const rowsCleared = removeFullRows();
        
        // Reset the hold capability
        canHold = true;
        
        // Create a new piece
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNextPiece();
        
        // Check if the new piece can be placed
        if (!isValidMove(currentPiece, 0, 0)) {
            gameOver = true;
        }
    }
    
    // Handle game over
    if (gameOver) {
        // Cancel the animation frame
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Multiplayer: Notify about game over
        if (!isSinglePlayer && typeof onGameOver === 'function') {
            onGameOver(score);
        }
        
        // Single player: Save high score
        if (isSinglePlayer) {
            // Save score to the server
            fetch('/api/save_highscore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    score: score,
                    tournament_id: document.getElementById('tournament-id')?.value || null
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success && data.is_new_highscore) {
                    // Show new high score message
                    alert('New High Score: ' + data.score);
                }
            })
            .catch(error => {
                console.error('Error saving score:', error);
            });
        }
    }
}


// Remove full rows and update score
function removeFullRows() {
    let fullRows = 0;
    
    // Check each row from bottom to top
    for (let y = ROWS - 1; y >= 0; y--) {
        // Check if the row is full (no empty cells)
        const rowIsFull = board[y].every(cell => cell !== 0);
        
        if (rowIsFull) {
            // If the row is full, remove it and add an empty row at the top
            fullRows++;
            
            // Move all rows above down by one
            for (let yy = y; yy > 0; yy--) {
                for (let x = 0; x < COLS; x++) {
                    board[yy][x] = board[yy-1][x];
                }
            }
            
            // Add an empty row at the top
            for (let x = 0; x < COLS; x++) {
                board[0][x] = 0;
            }
            
            // Check the same row again since we moved everything down
            y++;
        }
    }
    
    // Update score based on the number of full rows removed
    if (fullRows > 0) {
        // Original Nintendo Scoring System
        let rowPoints;
        switch (fullRows) {
            case 1: rowPoints = 40; break;   // Single
            case 2: rowPoints = 100; break;  // Double
            case 3: rowPoints = 300; break;  // Triple
            case 4: rowPoints = 1200; break; // Tetris!
            default: rowPoints = 0;
        }
        
        score += rowPoints * level;
        
        // Update lines cleared count
        lines += fullRows;
        
        // Update level (every 10 lines)
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            // Play level up sound/animation here if desired
        }
        
        // Increase speed based on level (classic NES Tetris formula)
        // frames per gridcell = (48 - level * 5) and 60fps
        const framesPerGridcell = Math.max(1, 48 - (level * 5));
        dropInterval = Math.max(16, framesPerGridcell * 16.67);
        
        // Update the UI
        updateScore();
    }
    
    return fullRows;
}

// Update the score display
function updateScore() {
    if (scoreElement) scoreElement.textContent = score;
    if (levelElement) levelElement.textContent = level;
    if (linesElement) linesElement.textContent = lines;
}

// Handle key down events
function handleKeyDown(event) {
    // Prevent default behavior for game controls immediately
    if ([32, 37, 38, 39, 40, 65, 68, 83, 87, 90, 67, 27].includes(event.keyCode)) {
        event.preventDefault();
    }
    
    if (gameOver) {
        if (event.keyCode === 27) { // ESC key
            resetGame();
        }
        return;
    }
    
    // Prevent key repeat by tracking pressed keys
    if (pressedKeys[event.keyCode]) return;
    pressedKeys[event.keyCode] = true;
    
    switch (event.keyCode) {
        case 37: // Left arrow
        case 65: // A key
            movePiece(-1, 0);
            leftRepeatTimer = 0;
            break;
        case 39: // Right arrow
        case 68: // D key
            movePiece(1, 0);
            rightRepeatTimer = 0;
            break;
        case 40: // Down arrow
        case 83: // S key
            if (dropPiece()) {
                score += 1;
                updateScore();
            }
            downRepeatTimer = 0;
            break;
        case 38: // Up arrow
        case 87: // W key
            rotatePiece(true); // Clockwise
            break;
        case 90: // Z key
            rotatePiece(false); // Counter-clockwise
            break;
        case 32: // Space - Hard drop
            hardDrop();
            break;
        case 67: // C key - Hold piece
            holdCurrentPiece();
            break;
        case 27: // ESC - Reset game
            resetGame();
            break;
    }
    
    // Send game state update for multiplayer
    if (typeof onGameUpdate === 'function' && !isSinglePlayer) {
        onGameUpdate(getGameState());
    }
}

// Handle key up events
function handleKeyUp(event) {
    // Remove key from pressed keys
    delete pressedKeys[event.keyCode];
}

// Automatic repeated movement with timing control
function handleAutoRepeat(deltaTime) {
    // Left movement with delay
    if (pressedKeys[37] || pressedKeys[65]) {
        leftRepeatTimer += deltaTime;
        if (leftRepeatTimer > autoRepeatDelay) {
            movePiece(-1, 0);
            leftRepeatTimer = autoRepeatDelay - autoRepeatRate;
        }
    } else {
        leftRepeatTimer = 0;
    }
    
    // Right movement with delay
    if (pressedKeys[39] || pressedKeys[68]) {
        rightRepeatTimer += deltaTime;
        if (rightRepeatTimer > autoRepeatDelay) {
            movePiece(1, 0);
            rightRepeatTimer = autoRepeatDelay - autoRepeatRate;
        }
    } else {
        rightRepeatTimer = 0;
    }
    
    // Soft drop with delay (faster than horizontal movement)
    if (pressedKeys[40] || pressedKeys[83]) {
        downRepeatTimer += deltaTime;
        if (downRepeatTimer > autoRepeatDelay / 2) {
            if (dropPiece()) {
                score += 1;
                updateScore();
            }
            downRepeatTimer = autoRepeatDelay - autoRepeatRate / 2;
        }
    } else {
        downRepeatTimer = 0;
    }
}

// Get the current game state for multiplayer updates
function getGameState() {
    return {
        board,
        currentPiece,
        nextPiece,
        holdPiece,
        score,
        level,
        lines
    };
}

// Update the game state from an opponent
function updateOpponentBoard(playerId, gameState, container) {
    let opponentBoard = document.getElementById(`opponent-${playerId}`);
    
    // Create a new board if it doesn't exist
    if (!opponentBoard) {
        const opponentContainer = document.createElement('div');
        opponentContainer.className = 'opponent';
        
        const opponentName = document.createElement('div');
        opponentName.className = 'opponent-name';
        opponentName.textContent = `Player ${playerId}`;
        
        const opponentStats = document.createElement('div');
        opponentStats.className = 'opponent-stats';
        opponentStats.innerHTML = `Score: <span id="opponent-${playerId}-score">0</span>`;
        
        opponentBoard = document.createElement('canvas');
        opponentBoard.id = `opponent-${playerId}`;
        opponentBoard.className = 'opponent-board';
        opponentBoard.width = COLS * (BLOCK_SIZE / 2);
        opponentBoard.height = ROWS * (BLOCK_SIZE / 2);
        
        opponentContainer.appendChild(opponentName);
        opponentContainer.appendChild(opponentStats);
        opponentContainer.appendChild(opponentBoard);
        document.getElementById(container).appendChild(opponentContainer);
    }
    
    // Update score
    const scoreElement = document.getElementById(`opponent-${playerId}-score`);
    if (scoreElement) {
        scoreElement.textContent = gameState.score;
    }
    
    // Draw the opponent's board
    const opponentCtx = opponentBoard.getContext('2d');
    opponentCtx.clearRect(0, 0, COLS * (BLOCK_SIZE / 2), ROWS * (BLOCK_SIZE / 2));
    
    // Scale for mini board
    const blockSize = BLOCK_SIZE / 2;
    opponentCtx.save();
    opponentCtx.scale(blockSize, blockSize);
    
    // Draw the background
    opponentCtx.fillStyle = EMPTY_COLOR;
    opponentCtx.fillRect(0, 0, COLS, ROWS);
    
    // Draw the board
    gameState.board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                opponentCtx.fillStyle = value;
                opponentCtx.fillRect(x, y, 1, 1);
                opponentCtx.strokeStyle = BORDER_COLOR;
                opponentCtx.strokeRect(x, y, 1, 1);
            }
        });
    });
    
    // Draw the current piece
    if (gameState.currentPiece) {
        gameState.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    opponentCtx.fillStyle = gameState.currentPiece.color;
                    opponentCtx.fillRect(
                        gameState.currentPiece.x + x,
                        gameState.currentPiece.y + y,
                        1, 1
                    );
                    opponentCtx.strokeStyle = BORDER_COLOR;
                    opponentCtx.strokeRect(
                        gameState.currentPiece.x + x,
                        gameState.currentPiece.y + y,
                        1, 1
                    );
                }
            });
        });
    }
    
    opponentCtx.restore();
}

// Save score to the server
function saveScore(score, tournamentId = null) {
    fetch('/api/save_score', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            score: score,
            tournament_id: tournamentId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.is_new_highscore) {
            // Show new high score message
            alert('New High Score: ' + data.score);
        }
    })
    .catch(error => {
        console.error('Error saving score:', error);
    });
}


// Game loop
function gameLoop(timestamp) {
    // Make sure we have a valid canvas context before proceeding
    if (!ctx) {
        console.error("Canvas context is not available.");
        return;
    }

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    if (!gameOver) {
        // Handle automatic movement with proper timing
        handleAutoRepeat(deltaTime);
        
        // Update drop counter
        dropCounter += deltaTime;
        
        if (dropCounter > dropInterval) {
            dropPiece();
            dropCounter = 0;
            
            // Send game state update
            if (typeof onGameUpdate === 'function' && !isSinglePlayer) {
                onGameUpdate(getGameState());
            }
        }
        
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate block size
        const blockSize = Math.min(canvas.width / COLS, canvas.height / ROWS);
        ctx.save();
        ctx.scale(blockSize, blockSize);
        
        // Draw the game
        drawBoard();
        
        ctx.restore();
        
        // Request the next frame
        animationId = requestAnimationFrame(gameLoop);
    } else {
        // Cancel the animation frame
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Draw "Game Over" text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = '30px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.font = '20px Arial';
        ctx.fillText('Press ESC to restart', canvas.width / 2, canvas.height / 2 + 50);
    }
}

// Export functions for external use
window.initGame = initGame;
window.updateOpponentBoard = updateOpponentBoard;
window.getGameState = getGameState;
