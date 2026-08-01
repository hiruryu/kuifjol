const BOARD_SIZE = 7;
const WIN_SCORE = 5;

class PhoelWebGame {
    constructor() {
        this.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill('.'));
        this.currentPlayer = 'B'; // B: プレイヤー(黒木), W: CPU(白木)
        this.placedCount = { 'B': 0, 'W': 0 };
        this.currentAction = 'place';
        this.selectedCell = null;
        this.isGameOver = false;
        this.isFreePlace = { 'B': false, 'W': false };

        this.initUI();
        this.render();
    }

    initUI() {
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.isGameOver || this.currentPlayer === 'W') return;
                document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                this.currentAction = target.dataset.action;
                this.selectedCell = null;
                this.log(`モード変更: ${target.textContent.trim()}`);
                this.render();
            });
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetGame();
        });
    }

    resetGame() {
        this.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill('.'));
        this.currentPlayer = 'B';
        this.placedCount = { 'B': 0, 'W': 0 };
        this.currentAction = 'place';
        this.selectedCell = null;
        this.isGameOver = false;
        this.isFreePlace = { 'B': false, 'W': false };
        this.log('対戦を開始しました。あなたの番（黒木）です。');
        this.render();
    }

    log(msg) {
        document.getElementById('message-log').textContent = msg;
    }

    // 外枠マス（最外周）かどうかの判定
    isOuterCell(r, c) {
        return r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1;
    }

    // 隣接（上下左右）に自分のコマがあるか
    hasAdjacentOwnPiece(r, c, player) {
        const messed = player.toLowerCase();
        const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
        return dirs.some(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            return nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE &&
                   (this.board[nr][nc] === player || this.board[nr][nc] === messed);
        });
    }

    // 配置条件チェック
    canPlaceAt(r, c, player) {
        if (this.board[r][c] !== '.') return false;

        // 一番外枠マスの場合の制限
        if (this.isOuterCell(r, c)) {
            // パス後（自由配置）または初手、あるいは隣接する自コマがあれば置ける
            return this.placedCount[player] === 0 || 
                   this.isFreePlace[player] || 
                   this.hasAdjacentOwnPiece(r, c, player);
        }

        // 内側マスならどこでも配置可能
        return true;
    }

    handleCellClick(r, c) {
        if (this.isGameOver || this.currentPlayer === 'W') return;

        const player = 'B';
        const messed = 'b';

        if (this.currentAction === 'place') {
            if (!this.canPlaceAt(r, c, player)) {
                if (this.board[r][c] !== '.') {
                    this.log('❌ そこにはすでにコマがあります。');
                } else if (this.isOuterCell(r, c)) {
                    this.log('❌ 一番外枠のマスは、自分のコマに隣接する場所にしか置けません。');
                }
                return;
            }

            this.board[r][c] = player;
            this.placedCount[player]++;
            this.isFreePlace[player] = false;
            this.applyFlanking(r, c, player);
            this.endTurn();

        } else if (this.currentAction === 'heal') {
            if (this.board[r][c] === messed) {
                this.board[r][c] = player;
                this.log(`✨ (${r},${c}) の毛並みを整えました！`);
                this.endTurn();
            } else {
                this.log('❌ 自分の乱れたコマ(🌀)を選択してください。');
            }

        } else if (this.currentAction === 'move') {
            if (!this.selectedCell) {
                if (this.board[r][c] === player || this.board[r][c] === messed) {
                    this.selectedCell = { r, c };
                    this.log(`(${r},${c}) のコマを選択中。移動先を選んでください。`);
                    this.render();
                } else {
                    this.log('❌ 自分のコマを選択してください。');
                }
            } else {
                const { r: fr, c: fc } = this.selectedCell;
                const dist = Math.abs(fr - r) + Math.abs(fc - c);

                if (dist === 1 && this.board[r][c] === '.') {
                    const piece = this.board[fr][fc];
                    this.board[fr][fc] = '.';
                    this.board[r][c] = piece;
                    this.applyFlanking(r, c, player);
                    this.selectedCell = null;
                    this.endTurn();
                } else {
                    this.selectedCell = null;
                    this.log('❌ 1マス隣の空きマスを選択してください。（選択解除）');
                    this.render();
                }
            }
        }
    }

    // 配置可能マスがどこかにあるかチェック
    canPlayerPlaceAnywhere(player) {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.canPlaceAt(r, c, player)) return true;
            }
        }
        return false;
    }

    applyFlanking(r, c, player) {
        const opponent = player === 'B' ? 'W' : 'B';
        const opponentMessed = opponent.toLowerCase();
        const dirs = [[-1,0], [1,0], [0,-1], [0,1]];

        dirs.forEach(([dr, dc]) => {
            const r1 = r + dr, c1 = c + dc;
            const r2 = r + 2*dr, c2 = c + 2*dc;

            if (r2 >= 0 && r2 < BOARD_SIZE && c2 >= 0 && c2 < BOARD_SIZE) {
                const mid = this.board[r1][c1];
                const end = this.board[r2][c2];
                if ((mid === opponent || mid === opponentMessed) && (end === player || end === player.toLowerCase())) {
                    this.board[r1][c1] = opponentMessed;
                }
            }
        });
    }

    endTurn() {
        const scoreB = this.evaluatePlayer('B');
        const scoreW = this.evaluatePlayer('W');

        if (scoreB.score >= WIN_SCORE || scoreW.score >= WIN_SCORE) {
            this.isGameOver = true;
            this.render();
            const winner = scoreB.score >= WIN_SCORE ? 'あなた (黒木)' : 'CPU (白木)';
            this.log(`🎉 祝！ ${winner} の勝利です！`);
            return;
        }

        this.currentPlayer = this.currentPlayer === 'B' ? 'W' : 'B';
        this.render();

        if (this.currentPlayer === 'W' && !this.isGameOver) {
            this.log('🤖 CPUが考えています...');
            setTimeout(() => this.playCPUTurn(), 800);
        }
    }

    /* ----------------------------------
       CPU (白木) の思考AI
       ---------------------------------- */
    playCPUTurn() {
        const player = 'W';

        if (!this.canPlayerPlaceAnywhere(player)) {
            this.isFreePlace[player] = true;
            this.log('⚠️ CPUは置けるマスがありません！パスします。');
            this.endTurn();
            return;
        }

        let possibleMoves = [];

        // 1. 回復（乱れコマの治療）
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board[r][c] === 'w') {
                    possibleMoves.push({ action: 'heal', r, c, weight: 8 });
                }
            }
        }

        // 2. 配置の手の評価
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.canPlaceAt(r, c, player)) {
                    let weight = 5;

                    // 中央付近優先
                    const centerDist = Math.abs(r - 3) + Math.abs(c - 3);
                    weight += (6 - centerDist);

                    this.board[r][c] = 'W';
                    const testScore = this.evaluatePlayer('W').score;
                    weight += testScore * 12; // 役が完成する手を強く好む
                    this.board[r][c] = '.';

                    possibleMoves.push({ action: 'place', r, c, weight });
                }
            }
        }

        if (possibleMoves.length > 0) {
            possibleMoves.sort((a, b) => b.weight - a.weight);
            const bestMove = possibleMoves[0];

            if (bestMove.action === 'heal') {
                this.board[bestMove.r][bestMove.c] = 'W';
                this.log(`🤖 CPUが (${bestMove.r},${bestMove.c}) の毛並みを整えました。`);
            } else if (bestMove.action === 'place') {
                this.board[bestMove.r][bestMove.c] = 'W';
                this.placedCount[player]++;
                this.isFreePlace[player] = false;
                this.applyFlanking(bestMove.r, bestMove.c, player);
                this.log(`🤖 CPUが (${bestMove.r},${bestMove.c}) にコマを置きました。`);
            }
        }

        this.endTurn();
    }

    evaluatePlayer(player) {
        let score = 0;
        let yaku = [];

        // 1. 大輪 (2x2の正方形) = 1点
        let hasTairin = false;
        for (let r = 0; r < BOARD_SIZE - 1; r++) {
            for (let c = 0; c < BOARD_SIZE - 1; c++) {
                if (this.board[r][c] === player && this.board[r+1][c] === player &&
                    this.board[r][c+1] === player && this.board[r+1][c+1] === player) {
                    hasTairin = true;
                }
            }
        }
        if (hasTairin) { score += 1; yaku.push('大輪(1点)'); }

        // 2. 長尾 (直線で6コマ以上連なる) = 2点 ★修正★
        let hasNagao = false;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]]; // 横, 縦, 斜め下右, 斜め下左

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board[r][c] !== player) continue;

                directions.forEach(([dr, dc]) => {
                    let count = 0;
                    for (let step = 0; step < 6; step++) {
                        const nr = r + dr * step;
                        const nc = c + dc * step;
                        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                            if (this.board[nr][nc] === player) count++;
                            else break;
                        } else break;
                    }
                    if (count >= 6) hasNagao = true;
                });
            }
        }
        if (hasNagao) { score += 2; yaku.push('長尾(2点)'); }

        // 3. 花輪 (3x3の外枠8コマ) = 3点
        let hasHanawa = false;
        for (let r = 0; r < BOARD_SIZE - 2; r++) {
            for (let c = 0; c < BOARD_SIZE - 2; c++) {
                let outerCount = 0;
                for (let dr = 0; dr < 3; dr++) {
                    for (let dc = 0; dc < 3; dc++) {
                        if (dr === 1 && dc === 1) continue;
                        if (this.board[r+dr][c+dc] === player) outerCount++;
                    }
                }
                if (outerCount === 8 && this.board[r+1][c+1] !== player) hasHanawa = true;
            }
        }
        if (hasHanawa) { score += 3; yaku.push('花輪(3点)'); }

        // 4. 王尾 (一筆書きで端から端まで貫通) = 即時勝利
        const components = this.getConnectedComponents(player);
        components.forEach(comp => {
            const rows = new Set(comp.map(([r, c]) => r));
            const cols = new Set(comp.map(([r, c]) => c));
            if (rows.size === BOARD_SIZE || cols.size === BOARD_SIZE) {
                score += 99;
                yaku.push('👑王尾(即時勝利)');
            }
        });

        return { score, yaku };
    }

    getConnectedComponents(player) {
        const visited = new Set();
        const components = [];

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board[r][c] === player && !visited.has(`${r},${c}`)) {
                    const comp = [];
                    const queue = [[r, c]];
                    visited.add(`${r},${c}`);

                    while (queue.length > 0) {
                        const [cr, cc] = queue.shift();
                        comp.push([cr, cc]);

                        [[ -1, 0 ], [ 1, 0 ], [ 0, -1 ], [ 0, 1 ]].forEach(([dr, dc]) => {
                            const nr = cr + dr, nc = cc + dc;
                            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                                if (this.board[nr][nc] === player && !visited.has(`${nr},${nc}`)) {
                                    visited.add(`${nr},${nc}`);
                                    queue.push([nr, nc]);
                                }
                            }
                        });
                    }
                    components.push(comp);
                }
            }
        }
        return components;
    }

    render() {
        const boardEl = document.getElementById('board');
        boardEl.innerHTML = '';

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                if (this.selectedCell && this.selectedCell.r === r && this.selectedCell.c === c) {
                    cell.classList.add('selected');
                }

                const val = this.board[r][c];
                if (val !== '.') {
                    const piece = document.createElement('div');
                    const isBlack = val.toUpperCase() === 'B';
                    const isMessed = val === 'b' || val === 'w';

                    piece.className = `piece ${isBlack ? 'black' : 'white'} ${isMessed ? 'messed' : ''}`;
                    cell.appendChild(piece);
                }

                cell.addEventListener('click', () => this.handleCellClick(r, c));
                boardEl.appendChild(cell);
            }
        }

        const resB = this.evaluatePlayer('B');
        const resW = this.evaluatePlayer('W');

        document.getElementById('score-B').textContent = Math.min(resB.score, WIN_SCORE);
        document.getElementById('score-W').textContent = Math.min(resW.score, WIN_SCORE);
        document.getElementById('yaku-B').textContent = resB.yaku.length > 0 ? resB.yaku.join(', ') : '役なし';
        document.getElementById('yaku-W').textContent = resW.yaku.length > 0 ? resW.yaku.join(', ') : '役なし';

        const turnBadge = document.getElementById('current-turn-display');
        if (this.currentPlayer === 'B') {
            turnBadge.textContent = 'あなた (黒木)';
            turnBadge.className = 'turn-badge b-turn';
        } else {
            turnBadge.textContent = 'CPU思考中...';
            turnBadge.className = 'turn-badge w-turn';
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new PhoelWebGame();
});
