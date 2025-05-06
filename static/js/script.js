document.addEventListener('DOMContentLoaded', () => {
    // Game variables
    const BOARD_WIDTH = 10;
    const BOARD_HEIGHT = 20;
    const BLOCK_SIZE = 30;
    let gameBoard = [];
    let currentPiece = null;
    let nextPiece = null;
    let score = 0;
    let level = 1;
    let gameInterval = null;
    let gameSpeed = 1000; // milliseconds
    let isGameOver = false;
    let isMultiplayer = false;
    let roomId = null;
    let socket = null;
    
    // DOM elements
    const authContainer = document.getElementById('auth-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginUsername = document.getElementById('login-username');
    const loginPassword = document.getElementById('login-password');
    const registerUsername = document.getElementById('register-username');
    const registerPassword = document.getElementById('register-password');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    
    const menuElement = document.getElementById('menu');
    const tournamentSection = document.getElementById('tournament-section');
    const gameContainerElement = document.getElementById('game-container');
    const gameBoardElement = document.getElementById('game-board');
    const scoreDisplayElement = document.getElementById('score-display');
    const levelDisplayElement = document.getElementById('level-display');
    const nextPieceDisplayElement = document.getElementById('next-piece-display');
    const roomInfoElement = document.getElementById('room-info');
    const gameOverElement = document.getElementById('game-over');
    const finalScoreElement = document.getElementById('final-score');
    const saveScoreBtn = document.getElementById('save-score-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const returnMenuBtn = document.getElementById('return-menu-btn');
    const singleplayerBtn = document.getElementById('singleplayer-btn');
    const createGameBtn = document.getElementById('create-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');
    const roomCodeInput = document.getElementById('room-code');
    const multiplayerViewElement = document.getElementById('multiplayer-view');
    const opponentsContainerElement = document.getElementById('opponents-container');
    const scoresListElement = document.getElementById('scores-list');
    
    const createTournamentBtn = document.getElementById('create-tournament-btn');
    const viewTournamentsBtn = document.getElementById('view-tournaments-btn');
    const tournamentForm = document.getElementById('tournament-form');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const submitTournamentBtn = document.getElementById('submit-tournament');
    const cancelTournamentBtn = document.getElementById('cancel-tournament');
    const activeTournamentsElement = document.getElementById('active-tournaments');
    const tournamentsListElement = document.getElementById('tournaments-list');
    const backToMenuBtn = document.getElementById('back-to-menu');
    
    // Tetris pieces definitions
    const PIECES = [
        // I piece
        {
            shape: [
                [1, 1, 1, 1]
            ],
            color: 'cyan'
        },
        // L piece
        {
            shape: [
                [0, 0, 1],
                [1, 1, 1]
            ],
            color: 'orange'
        },
        // J piece
        {
            shape: [
                [1, 0, 0],
                [1, 1, 1]
            ],
            color: 'blue'
        },
        // O piece
        {
            shape: [
                [1, 1],
                [1, 1]
            ],
            color: 'yellow'
        },
        // S piece
        {
            shape: [
                [0, 1, 1],
                [1, 1, 0]
            ],
            color: 'green'
        },
        // Z piece
        {
            shape: [
                [1, 1, 0],
                [0, 1, 1]
            ],
            color: 'red'
        },
        // T piece
        {
            shape: [
                [0, 1, 0],
                [1, 1, 1]
            ],
            color: 'purple'
        }
    ];
    
    // Auth functions
    function login() {
        const username = loginUsername.value.trim();
        const password = loginPassword.value.trim();
        
        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }
        
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                alert(data.message || 'Login failed');
            }
        })
        .catch(error => {
            console.error('Error logging in:', error);
            alert('An error occurred during login');
        });
    }
    
    function register() {
        const username = registerUsername.value.trim();
        const password = registerPassword.value.trim();
        
        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }
        
        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Registration successful! Please login.');
                registerForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
            } else {
                alert(data.message || 'Registration failed');
            }
        })
        .catch(error => {
            console.error('Error registering:', error);
            alert('An error occurred during registration');
        });
    }
    
    // Initialize the game board
    function initBoard() {
        gameBoard = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
        renderBoard();
    }
    
    // Render the game board
    function renderBoard() {
        gameBoardElement.innerHTML = '';
        gameBoardElement.style.width = `${BOARD_WIDTH * BLOCK_SIZE}px`;
        gameBoardElement.style.height = `${BOARD_HEIGHT * BLOCK_SIZE}px`;
        
        // Render the fixed blocks
        gameBoard.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const block = document.createElement('div');
                    block.classList.add('block');
                    block.style.backgroundColor = value;
                    block.style.top = `${y * BLOCK_SIZE}px`;
                    block.style.left = `${x * BLOCK_SIZE}px`;
                    gameBoardElement.appendChild(block);
                }
            });
        });
        
        // Render the current piece
        if (currentPiece) {
            currentPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        const block = document.createElement('div');
                        block.classList.add('block');
                        block.style.backgroundColor = currentPiece.color;
                        block.style.top = `${(currentPiece.y + y) * BLOCK_SIZE}px`;
                        block.style.left = `${(currentPiece.x + x) * BLOCK_SIZE}px`;
                        gameBoardElement.appendChild(block);
                    }
                });
            });
        }
    }
    
    // Generate a random piece
    function getRandomPiece() {
        const randomPiece = PIECES[Math.floor(Math.random() * PIECES.length)];
        return {
            shape: randomPiece.shape,
            color: randomPiece.color,
            x: Math.floor(BOARD_WIDTH / 2) - Math.floor(randomPiece.shape[0].length / 2),
            y: 0
        };
    }
    
    // Render the next piece preview
    function renderNextPiece() {
        nextPieceDisplayElement.innerHTML = '';
        nextPieceDisplayElement.style.width = `${4 * BLOCK_SIZE}px`;
        nextPieceDisplayElement.style.height = `${4 * BLOCK_SIZE}px`;
        
        if (nextPiece) {
            const offsetX = 2 - Math.floor(nextPiece.shape[0].length / 2);
            const offsetY = 2 - Math.floor(nextPiece.shape.length / 2);
            
            nextPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        const block = document.createElement('div');
                        block.classList.add('block');
                        block.style.backgroundColor = nextPiece.color;
                        block.style.top = `${(offsetY + y) * BLOCK_SIZE}px`;
                        block.style.left = `${(offsetX + x) * BLOCK_SIZE}px`;
                        nextPieceDisplayElement.appendChild(block);
                    }
                });
            });
        }
    }
    
    // Check if the piece can move to the specified position
    function canMove(piece, offsetX, offsetY) {
        return piece.shape.every((row, y) => {
            return row.every((value, x) => {
                const newX = piece.x + x + offsetX;
                const newY = piece.y + y + offsetY;
                
                return (
                    value === 0 ||
                    (newX >= 0 && newX < BOARD_WIDTH && newY < BOARD_HEIGHT && (newY < 0 || gameBoard[newY][newX] === 0))
                );
            });
        });
    }
    
    // Move the current piece
    function movePiece(offsetX, offsetY) {
        if (canMove(currentPiece, offsetX, offsetY)) {
            currentPiece.x += offsetX;
            currentPiece.y += offsetY;
            renderBoard();
            return true;
        }
        return false;
    }
    
    // Rotate the current piece
    function rotatePiece() {
        const rotatedShape = currentPiece.shape[0].map((_, colIndex) => 
            currentPiece.shape.map(row => row[colIndex]).reverse()
        );
        
        const rotatedPiece = {
            ...currentPiece,
            shape: rotatedShape
        };
        
        if (canMove(rotatedPiece, 0, 0)) {
            currentPiece.shape = rotatedShape;
            renderBoard();
            return true;
        }
        return false;
    }
    
    // Fix the current piece to the board
    function fixPiece() {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const boardY = currentPiece.y + y;
                    if (boardY >= 0) {
                        gameBoard[boardY][currentPiece.x + x] = currentPiece.color;
                    }
                }
            });
        });
        
        // Check for completed lines
        let linesCleared = 0;
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (gameBoard[y].every(cell => cell !== 0)) {
                gameBoard.splice(y, 1);
                gameBoard.unshift(Array(BOARD_WIDTH).fill(0));
                linesCleared++;
                y++; // Check the same row again
            }
        }
        
        // Update score
        if (linesCleared > 0) {
            const points = [0, 40, 100, 300, 1200][linesCleared] * level;
            score += points;
            scoreDisplayElement.textContent = `Score: ${score}`;
            
            // Level up every 10 lines
            const newLevel = Math.floor(score / 1000) + 1;
            if (newLevel > level) {
                level = newLevel;
                levelDisplayElement.textContent = `Level: ${level}`;
                gameSpeed = Math.max(100, 1000 - (level - 1) * 100);
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, gameSpeed);
            }
        }
        
        // Get the next piece
        currentPiece = nextPiece;
        nextPiece = getRandomPiece();
        renderNextPiece();
        
        // Check for game over
        if (!canMove(currentPiece, 0, 0)) {
            endGame();
        }
        
        // Send game state in multiplayer mode
        if (isMultiplayer && socket) {
            socket.emit('game_update', {
                room: roomId,
                board: gameBoard,
                score: score,
                level: level
            });
        }
    }
    
    // Game loop
    function gameLoop() {
        if (!movePiece(0, 1)) {
            fixPiece();
        }
    }
    
    // Start the game
    function startGame(multiplayer = false) {
        isMultiplayer = multiplayer;
        isGameOver = false;
        score = 0;
        level = 1;
        gameSpeed = 1000;
        
        menuElement.classList.add('hidden');
        gameContainerElement.classList.remove('hidden');
        gameOverElement.classList.add('hidden');
        
        if (isMultiplayer) {
            multiplayerViewElement.classList.remove('hidden');
            roomInfoElement.classList.remove('hidden');
        } else {
            multiplayerViewElement.classList.add('hidden');
            roomInfoElement.classList.add('hidden');
        }
        
        initBoard();
        currentPiece = getRandomPiece();
        nextPiece = getRandomPiece();
        renderNextPiece();
        
        scoreDisplayElement.textContent = `Score: ${score}`;
        levelDisplayElement.textContent = `Level: ${level}`;
        
        if (gameInterval) {
            clearInterval(gameInterval);
        }
        gameInterval = setInterval(gameLoop, gameSpeed);
    }
    
    // End the game
    function endGame() {
        isGameOver = true;
        clearInterval(gameInterval);
        gameInterval = null;
        
        finalScoreElement.textContent = `Your score: ${score}`;
        gameOverElement.classList.remove('hidden');
    }
    
    // Handle keyboard input
    document.addEventListener('keydown', (event) => {
        if (isGameOver || !currentPiece) return;
        
        switch (event.key) {
            case 'ArrowLeft':
                movePiece(-1, 0);
                break;
            case 'ArrowRight':
                movePiece(1, 0);
                break;
            case 'ArrowDown':
                movePiece(0, 1);
                break;
            case 'ArrowUp':
                rotatePiece();
                break;
            case ' ': // Space bar for hard drop
                while (movePiece(0, 1)) {}
                fixPiece();
                break;
        }
    });
    
    // Load top scores
    function loadTopScores() {
        fetch('/top_scores')
            .then(response => response.json())
            .then(scores => {
                scoresListElement.innerHTML = '';
                scores.forEach(score => {
                    const li = document.createElement('li');
                    const date = new Date(score.time);
                    li.textContent = `${score.username}: ${score.score} (${date.toLocaleDateString()})`;
                    scoresListElement.appendChild(li);
                });
            })
            .catch(error => console.error('Error loading scores:', error));
    }
    
    // Load active tournaments
    function loadActiveTournaments() {
        fetch('/active_tournaments')
            .then(response => response.json())
            .then(tournaments => {
                tournamentsListElement.innerHTML = '';
                if (tournaments.length === 0) {
                    const li = document.createElement('li');
                    li.textContent = 'No active tournaments';
                    tournamentsListElement.appendChild(li);
                } else {
                    tournaments.forEach(tournament => {
                        const li = document.createElement('li');
                        const startDate = new Date(tournament.start_date);
                        const endDate = new Date(tournament.end_date);
                        li.textContent = `Tournament #${tournament.tournament_id}: ${startDate.toLocaleString()} - ${endDate.toLocaleString()}`;
                        tournamentsListElement.appendChild(li);
                    });
                }
            })
            .catch(error => console.error('Error loading tournaments:', error));
    }
    
    // Initialize multiplayer
    function initMultiplayer(room) {
        roomId = room;
        socket = io();
        
        socket.on('connect', () => {
            socket.emit('join', { room: roomId });
        });
        
        socket.on('player_joined', (data) => {
            console.log('Player joined:', data.sid);
            const opponentElement = document.createElement('div');
            opponentElement.id = `opponent-${data.sid}`;
            opponentElement.classList.add('opponent-board');
            opponentElement.innerHTML = `<h4>Player ${data.sid.substring(0, 5)}</h4><div class="mini-board"></div>`;
            opponentsContainerElement.appendChild(opponentElement);
        });
        
        socket.on('player_left', (data) => {
            console.log('Player left:', data.sid);
            const opponentElement = document.getElementById(`opponent-${data.sid}`);
            if (opponentElement) {
                opponentElement.remove();
            }
        });
        
        socket.on('game_state', (data) => {
            const opponentElement = document.getElementById(`opponent-${data.sid}`);
            if (opponentElement) {
                const miniBoard = opponentElement.querySelector('.mini-board');
                // Render opponent's board (simplified version)
                miniBoard.innerHTML = '';
                // Render a simplified version of the opponent's board
            }
        });
    }
    
    // Event listeners for auth
    if (loginBtn) {
        loginBtn.addEventListener('click', login);
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', register);
    }
    
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        });
    }
    
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }
    
    // Event listeners for menu buttons
    if (singleplayerBtn) {
        singleplayerBtn.addEventListener('click', () => {
            startGame(false);
        });
    }
    
    if (createGameBtn) {
        createGameBtn.addEventListener('click', () => {
            fetch('/create_game', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    roomId = data.room_id;
                    const roomCodeDisplay = document.getElementById('room-code-display');
                    if (roomCodeDisplay) {
                        roomCodeDisplay.textContent = roomId;
                    }
                    initMultiplayer(roomId);
                    startGame(true);
                } else {
                    alert(data.message || 'Failed to create game');
                }
            })
            .catch(error => console.error('Error creating game:', error));
        });
    }
    
    if (joinGameBtn) {
        joinGameBtn.addEventListener('click', () => {
            const code = roomCodeInput.value.trim();
            if (code) {
                window.location.href = `/join_game/${code}`;
            }
        });
    }
    
    // Tournament event listeners
    if (createTournamentBtn) {
        createTournamentBtn.addEventListener('click', () => {
            menuElement.classList.add('hidden');
            tournamentForm.classList.remove('hidden');
        });
    }
    
    if (viewTournamentsBtn) {
        viewTournamentsBtn.addEventListener('click', () => {
            menuElement.classList.add('hidden');
            activeTournamentsElement.classList.remove('hidden');
            loadActiveTournaments();
        });
    }
    
    if (submitTournamentBtn) {
        submitTournamentBtn.addEventListener('click', () => {
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;
            
            if (!startDate || !endDate) {
                alert('Please select both start and end dates');
                return;
            }
            
            fetch('/create_tournament', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    start_date: startDate,
                    end_date: endDate
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(`Tournament created with ID: ${data.tournament_id}`);
                    tournamentForm.classList.add('hidden');
                    menuElement.classList.remove('hidden');
                } else {
                    alert(data.message || 'Failed to create tournament');
                }
            })
            .catch(error => {
                console.error('Error creating tournament:', error);
                alert('An error occurred while creating the tournament');
            });
        });
    }
    
    if (cancelTournamentBtn) {
        cancelTournamentBtn.addEventListener('click', () => {
            tournamentForm.classList.add('hidden');
            menuElement.classList.remove('hidden');
        });
    }
    
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', () => {
            activeTournamentsElement.classList.add('hidden');
            menuElement.classList.remove('hidden');
        });
    }
    
    // Check if we're joining a multiplayer game
    const roomCodeDisplay = document.getElementById('room-code-display');
    if (roomCodeDisplay && roomCodeDisplay.textContent) {
        roomId = roomCodeDisplay.textContent;
        initMultiplayer(roomId);
        startGame(true);
    }
    
    // Event listeners for game over buttons
    if (saveScoreBtn) {
        saveScoreBtn.addEventListener('click', () => {
            fetch('/save_score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    score: score
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    saveScoreBtn.disabled = true;
                    saveScoreBtn.textContent = 'Score Saved!';
                    loadTopScores();
                } else {
                    alert(data.message || 'Failed to save score');
                }
            })
            .catch(error => console.error('Error saving score:', error));
        });
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            startGame(isMultiplayer);
        });
    }
    
    if (returnMenuBtn) {
        returnMenuBtn.addEventListener('click', () => {
            gameContainerElement.classList.add('hidden');
            gameOverElement.classList.add('hidden');
            menuElement.classList.remove('hidden');
            
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        });
    }
    
    // Load top scores if we're logged in
    if (menuElement && !menuElement.classList.contains('hidden')) {
        loadTopScores();
    }
});
