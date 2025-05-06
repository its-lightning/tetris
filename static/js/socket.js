// Socket.IO client for multiplayer Tetris
let socket;
let roomCode;
let userId;
let isHost;
let opponentBoardsContainer;

// Initialize the socket connection
function initSocket(room, user, host, opponentContainer) {
    roomCode = room;
    userId = user;
    isHost = host;
    opponentBoardsContainer = opponentContainer;
    
    console.log("Initializing socket connection...");
    console.log("Room code:", roomCode);
    console.log("User ID:", userId);
    console.log("Is host:", isHost);
    
    // Connect to the Socket.IO server with reconnection options
    socket = io({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
    });
    
    // Set up event handlers
    setupSocketEvents();
}

// Set up Socket.IO event handlers
function setupSocketEvents() {
    // Connection events
    socket.on('connect', function() {
        console.log('Connected to server with socket ID:', socket.id);
        
        // Join the game room
        socket.emit('join_room', { room_code: roomCode });
    });
    
    socket.on('connect_error', function(error) {
        console.error('Connection error:', error);
    });
    
    socket.on('reconnect', function(attemptNumber) {
        console.log('Reconnected after', attemptNumber, 'attempts');
        socket.emit('join_room', { room_code: roomCode });
    });
    
    // Game events
    socket.on('player_joined', function(data) {
        console.log('Player joined:', data);
        updatePlayerList(data.players, data.host_id);
    });
    
    socket.on('player_left', function(data) {
        console.log('Player left:', data);
        
        // Remove the player's board if it exists
        const opponentBoard = document.getElementById(`opponent-${data.player_id}`);
        if (opponentBoard) {
            opponentBoard.parentElement.remove();
        }
    });
    
    socket.on('game_started', function() {
        console.log('Game started');
        
        // If we're on the host page, redirect to the play page
        if (window.location.pathname.includes('/host')) {
            window.location.href = '/play/' + roomCode;
        }
    });
    
    socket.on('game_update', function(data) {
        console.log('Game update from player:', data.player_id);
        
        // Update the opponent's board
        if (typeof updateOpponentBoard === 'function') {
            updateOpponentBoard(data.player_id, data.game_state, opponentBoardsContainer);
        } else {
            console.error('updateOpponentBoard function not found');
        }
    });
    
    socket.on('player_game_over', function(data) {
        console.log('Player game over:', data);
        
        // Add "Game Over" overlay to the player's board
        const opponentBoard = document.getElementById(`opponent-${data.player_id}`);
        if (opponentBoard) {
            const ctx = opponentBoard.getContext('2d');
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, opponentBoard.width, opponentBoard.height);
            
            ctx.font = '1px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GAME OVER', COLS / 2, ROWS / 2);
        }
    });
    
    socket.on('room_closed', function(data) {
        alert(data.message);
        window.location.href = '/dashboard';
    });
    
    socket.on('error', function(data) {
        alert(data.message);
    });
}

// Game state update callback
function onGameUpdate(gameState) {
    if (socket && socket.connected) {
        socket.emit('game_update', {
            room_code: roomCode,
            game_state: gameState
        });
    }
}

// Game over callback
function onGameOver(score) {
    if (socket && socket.connected) {
        socket.emit('game_over', {
            room_code: roomCode,
            score: score
        });
    }
}

// Export functions for external use
window.initSocket = initSocket;
window.onGameUpdate = onGameUpdate;
window.onGameOver = onGameOver;
