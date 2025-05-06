// Super Rotation System (SRS) implementation
// Based on the Tetris guidelines

// Wall kick data for J, L, S, T, Z pieces
const WALL_KICK_DATA_JLSTZ = [
    [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], // 0->1
    [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],     // 1->2
    [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],    // 2->3
    [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]   // 3->0
];

// Wall kick data for I piece
const WALL_KICK_DATA_I = [
    [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],   // 0->1
    [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],   // 1->2
    [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],   // 2->3
    [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]    // 3->0
];

// Get the wall kick data for a specific piece and rotation
function getWallKickData(pieceType, rotation) {
    if (pieceType === 0) { // I piece
        return WALL_KICK_DATA_I[rotation];
    } else if (pieceType !== 3) { // J, L, S, T, Z pieces (not O)
        return WALL_KICK_DATA_JLSTZ[rotation];
    }
    return [[0, 0]]; // O piece doesn't need wall kicks
}

// Rotate a matrix 90 degrees clockwise
function rotateMatrix(matrix) {
    const N = matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));
    
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            result[j][N - 1 - i] = matrix[i][j];
        }
    }
    
    return result;
}

// Rotate a matrix 90 degrees counterclockwise
function rotateMatrixCCW(matrix) {
    const N = matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));
    
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            result[N - 1 - j][i] = matrix[i][j];
        }
    }
    
    return result;
}
