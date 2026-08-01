const BOARD_SIZE = 7;
const WIN_SCORE = 5;

class PhoelWebGame {
    constructor() {
        this.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill('.'));
        this.currentPlayer = 'B';
        this.placedCount = { 'B': 0, 'W': 0 };
        this.currentAction = 'place';
        this.selectedCell = null;
        this.isGameOver = false;
        this.isFreePlace = { 'B': false, 'W': false }; // パス後の自由配置フラグ

        this.initUI();
        this.render();
    }

    initUI() {
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.isGameOver) return;
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
        this.log('ゲームを開始しました。黒木 (B) の手番です。');
        this.render();
    }

    log(msg) {
        document.getElementById('message-log').textContent = msg;
    }

    handleCellClick(r, c) {
        if (this.isGameOver) return;

        const player = this.currentPlayer;
        const messed = player.toLowerCase();

        if (this.currentAction === 'place') {
            if (this.board[r][c] !== '.') {
                this.log('❌ そこにはすでにコマがあります。');
                return;
            }

            // 初手、またはパス直後(自由配置)、または隣接コマがある場合に配置可能
            const canPlace = this.placedCount[player] === 0 || 
                             this.isFreePlace[player] || 
                             this.hasAdjacentOwnPiece(r, c, player);

            if (!canPlace) {
                this.log('❌ 自分のしっぽ（コマ）に隣接するマスにしか置けません。');
                return;
            }

            this.board[r][c] = player;
            this.placedCount[player]++;
            this.isFreePlace[player] = false; // 自由配置権を消費
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

    hasAdjacentOwnPiece(r, c, player) {
        const messed = player.toLowerCase();
        const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
        return dirs.some(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            return nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE &&
                   (this.board[nr][nc] === player || this.board[nr][nc] === messed);
        });
    }

    // 配置できる場所があるか判定
    canPlayerPlaceAnywhere(player) {
        if (this.placedCount[player] === 0 || this.isFreePlace[player]) return true;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board[r][c] === '.' && this.hasAdjacentOwnPiece(r, c, player)) {
                    return true;
                }
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
                    this.log(`✨ 相手のコマを挟んで毛並みを乱しました！`);
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
            const winner = scoreB.score >= WIN_SCORE ? '黒木 (B)' : '白木 (W)';
            this.log(`🎉 祝！ ${winner} が勝利しました！`);
            return;
        }

        // 次のプレイヤーに手番交代
        const nextPlayer = this.currentPlayer === 'B' ? 'W' : 'B';
        this.currentPlayer = nextPlayer;

        // パス判定（配置・回復・移動の全てが不可能な場合、または置き場所がない場合）
        if (!this.canPlayerPlaceAnywhere(nextPlayer)) {
            this.isFreePlace[nextPlayer] = true; // 次のターンは自由配置を許可
            this.log(`⚠️ ${nextPlayer === 'B' ? '黒木' : '白木'}は置けるマスがありません！パスとなり次の手番は自由に置けます。`);
        }

        this.render();
    }

    evaluatePlayer(player) {
        const components = this.getConnectedComponents(player);
        let score = 0;
        let yaku = [];

        components.forEach(comp => {
            const compSet = new Set(comp.map(([r, c]) => `${r},${c}`));

            // 1. 大輪 (2x2) = 1点
            let hasTairin = false;
            for (let r = 0; r < BOARD_SIZE - 1; r++) {
                for (let c = 0; c < BOARD_SIZE - 1; c++) {
                    if (compSet.has(`${r},${c}`) && compSet.has(`${r+1},${c}`) &&
                        compSet.has(`${r},${c+1}`) && compSet.has(`${r+1},${c+1}`)) {
                        hasTairin = true;
                    }
                }
            }
            if (hasTairin) { score += 1; yaku.push('大輪(1点)'); }

            // 2. 長尾 (6連結以上) = 2点
            if (comp.length >= 6) { score += 2; yaku.push('長尾(2点)'); }

            // 3. 花輪 (3x3の外枠8コマ) = 3点
            let hasHanawa = false;
            for (let r = 0; r < BOARD_SIZE - 2; r++) {
                for (let c = 0; c < BOARD_SIZE - 2; c++) {
                    let outerCount = 0;
                    for (let dr = 0; dr < 3; dr++) {
                        for (let dc = 0; dc < 3; dc++) {
                            if (dr === 1 && dc === 1) continue;
                            if (compSet.has(`${r+dr},${c+dc}`)) outerCount++;
                        }
                    }
                    if (outerCount === 8 && this.board[r+1][c+1] !== player) hasHanawa = true;
                }
            }
            if (hasHanawa) { score += 3; yaku.push('花輪(3点)'); }

            // 4. 王尾 (端から端まで貫通) = 即時勝利
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
            turnBadge.textContent = '黒木 (B)';
            turnBadge.className = 'turn-badge b-turn';
        } else {
            turnBadge.textContent = '白木 (W)';
            turnBadge.className = 'turn-badge w-turn';
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new PhoelWebGame();
});
