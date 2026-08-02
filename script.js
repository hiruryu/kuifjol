const BOARD_SIZE = 8;
const WIN_SCORE = 12;

class PhoelWebGame {
    constructor() {
        this.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill('.'));
        this.currentPlayer = 'B'; // B: プレイヤー(黒木), W: CPU(白木)
        this.placedCount = { 'B': 0, 'W': 0 };
        this.currentAction = 'place';
        this.selectedCell = null;
        this.isGameOver = false;

        this.lastPlacedCell = { 'B': null, 'W': null };

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
        this.lastPlacedCell = { 'B': null, 'W': null };
        this.log('対戦を開始しました。最初は中央4マスのいずれかに置いてください。');
        this.render();
    }

    log(msg) {
        document.getElementById('message-log').textContent = msg;
    }

    // マスが外枠（最外周）かどうか判定
    isOuterCell(r, c) {
        return r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1;
    }

    // マスが「中央4マス」かどうか判定 (8x8の場合 index 3, 4)
    isCenterCell(r, c) {
        return (r === 3 || r === 4) && (c === 3 || c === 4);
    }

    // 盤面上に置かれているコマの総数をカウント
    getTotalPieceCount() {
        let count = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board[r][c] !== '.') count++;
            }
        }
        return count;
    }

    isAdjacent(r1, c1, r2, c2) {
        return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    }

    isBoardFull() {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board[r][c] === '.') return false;
            }
        }
        return true;
    }

    // 配置可能かチェック
    canPlaceAt(r, c, player) {
        if (this.board[r][c] !== '.') return false;

        // ★ルール：盤面のコマが4個未満の時は「中央4マス」にしか置けない
        if (this.getTotalPieceCount() < 4) {
            return this.isCenterCell(r, c);
        }

        // 前回「外枠」に置いた場合、今回はその直前コマの隣にしか置けない
        const lastCell = this.lastPlacedCell[player];
        if (lastCell && this.isOuterCell(lastCell.r, lastCell.c)) {
            return this.isAdjacent(r, c, lastCell.r, lastCell.c);
        }

        return true;
    }

    handleCellClick(r, c) {
        if (this.isGameOver || this.currentPlayer === 'W') return;

        const player = 'B';
        const opponent = 'W';
        const messed = 'b';

        if (this.currentAction === 'place') {
            if (!this.canPlaceAt(r, c, player)) {
                if (this.board[r][c] !== '.') {
                    this.log('❌ そこにはすでにコマがあります。');
                } else if (this.getTotalPieceCount() < 4) {
                    this.log('❌ 序盤（最初の4手まで）は「中央4マス（黄色のマス）」にしか置けません！');
                } else {
                    const last = this.lastPlacedCell[player];
                    this.log(`❌ 前回外枠 (${last.r},${last.c}) に置いたため、その隣にしか置けません！`);
                }
                return;
            }

            this.board[r][c] = player;
            this.placedCount[player]++;
            this.lastPlacedCell[player] = { r, c };

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

        } else if (this.currentAction === 'disrupt') {
            if (this.board[r][c] === opponent) {
                this.board[r][c] = opponent.toLowerCase();
                this.log(`🌀 (${r},${c}) にある相手のコマを乱しました！`);
                this.endTurn();
            } else {
                this.log('❌ 相手の正常なコマを選択してください。');
            }
        }
    }

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

        if (this.isBoardFull()) {
            this.isGameOver = true;
            this.render();
            if (scoreB.score > scoreW.score) {
                this.log(`🏁 盤面が埋まりました！ 判定勝ち: あなた (黒木) [${scoreB.score}点 vs ${scoreW.score}点]`);
            } else if (scoreW.score > scoreB.score) {
                this.log(`🏁 盤面が埋まりました！ 判定勝ち: CPU (白木) [${scoreW.score}点 vs ${scoreB.score}点]`);
            } else {
                this.log(`🏁 盤面が埋まりました！ 同点のため引き分けです！ [${scoreB.score}点]`);
            }
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
        const opponent = 'B';

        let possibleMoves = [];

        // 1. 回復
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board[r][c] === 'w') {
                    possibleMoves.push({ action: 'heal', r, c, weight: 8 });
                }
            }
        }

        // 2. 配置
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.canPlaceAt(r, c, player)) {
                    let weight = 5;
                    const centerDist = Math.abs(r - 3.5) + Math.abs(c - 3.5);
                    weight += (7 - centerDist);

                    this.board[r][c] = 'W';
                    const testScore = this.evaluatePlayer('W').score;
                    weight += testScore * 12;
                    this.board[r][c] = '.';

                    possibleMoves.push({ action: 'place', r, c, weight });
                }
            }
        }

        // 3. 乱す
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board[r][c] === opponent) {
                    let weight = 6;
                    possibleMoves.push({ action: 'disrupt', r, c, weight });
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
                this.lastPlacedCell[player] = { r: bestMove.r, c: bestMove.c };
                this.applyFlanking(bestMove.r, bestMove.c, player);
                this.log(`🤖 CPUが (${bestMove.r},${bestMove.c}) にコマを置きました。`);
            } else if (bestMove.action === 'disrupt') {
                this.board[bestMove.r][bestMove.c] = opponent.toLowerCase();
                this.log(`🤖 CPUが (${bestMove.r},${bestMove.c}) のあなたのコマを乱しました！`);
            }
        } else {
            this.lastPlacedCell[player] = null;
            this.log('⚠️ CPUは行動できる場所がありません。');
        }

        this.endTurn();
    }

    evaluatePlayer(player) {
        let score = 0;
        let yaku = [];

        // 1. 大輪 (2x2)
        let tairinCount = 0;
        for (let r = 0; r < BOARD_SIZE - 1; r++) {
            for (let c = 0; c < BOARD_SIZE - 1; c++) {
                if (this.board[r][c] === player && this.board[r+1][c] === player &&
                    this.board[r][c+1] === player && this.board[r+1][c+1] === player) {
                    tairinCount++;
                }
            }
        }
        if (tairinCount > 0) {
            score += tairinCount * 1;
            yaku.push(`大輪×${tairinCount}(${tairinCount}点)`);
        }

        // 2. 長尾 (直線6連)
        let nagaoCount = 0;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        let foundNagaos = new Set();

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
                    if (count >= 6) {
                        const key = `${r},${c}_${dr},${dc}`;
                        const prevR = r - dr;
                        const prevC = c - dc;
                        const isPrevOwn = (prevR >= 0 && prevR < BOARD_SIZE && prevC >= 0 && prevC < BOARD_SIZE && this.board[prevR][prevC] === player);
                        
                        if (!isPrevOwn && !foundNagaos.has(key)) {
                            foundNagaos.add(key);
                            nagaoCount++;
                        }
                    }
                });
            }
        }
        if (nagaoCount > 0) {
            score += nagaoCount * 2;
            yaku.push(`長尾×${nagaoCount}(${nagaoCount * 2}点)`);
        }

        // 3. 花輪 (3x3外枠)
        let hanawaCount = 0;
        for (let r = 0; r < BOARD_SIZE - 2; r++) {
            for (let c = 0; c < BOARD_SIZE - 2; c++) {
                let outerCount = 0;
                for (let dr = 0; dr < 3; dr++) {
                    for (let dc = 0; dc < 3; dc++) {
                        if (dr === 1 && dc === 1) continue;
                        if (this.board[r+dr][c+dc] === player) outerCount++;
                    }
                }
                if (outerCount === 8 && this.board[r+1][c+1] !== player) {
                    hanawaCount++;
                }
            }
        }
        if (hanawaCount > 0) {
            score += hanawaCount * 3;
            yaku.push(`花輪×${hanawaCount}(${hanawaCount * 3}点)`);
        }

        // 4. 王尾 (貫通)
        const components = this.getConnectedComponents(player);
        let hasOoo = false;
        components.forEach(comp => {
            const rows = new Set(comp.map(([r, c]) => r));
            const cols = new Set(comp.map(([r, c]) => c));
            if (rows.size === BOARD_SIZE || cols.size === BOARD_SIZE) {
                hasOoo = true;
            }
        });
        if (hasOoo) {
            score += 4;
        }

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
        boardEl.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';

                // マスの色分け用クラス付与
                if (this.isCenterCell(r, c)) {
                    cell.classList.add('center-cell');
                } else if (this.isOuterCell(r, c)) {
                    cell.classList.add('outer-cell');
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
            const lastB = this.lastPlacedCell['B'];
            if (this.getTotalPieceCount() < 4) {
                turnBadge.textContent = 'あなた (中央に配置!)';
            } else if (lastB && this.isOuterCell(lastB.r, lastB.c)) {
                turnBadge.textContent = 'あなた (外枠拘束中!)';
            } else {
                turnBadge.textContent = 'あなた (黒木)';
            }
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
