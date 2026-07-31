// How long the player has to finish the board, in seconds.
const MATCH_TIME_LIMIT_SECONDS = 120;

// Each pair gets one color AND one icon (two independent signals, since
// color alone isn't reliable for colorblind users or for players who don't
// already know which product matches which benefit).
const MATCH_PAIR_STYLES = [
    { color: "#EC4899", icon: "★" },
    { color: "#8B5CF6", icon: "●" },
    { color: "#3B82F6", icon: "▲" },
    { color: "#10B981", icon: "♦" },
    { color: "#F59E0B", icon: "■" },
    { color: "#EF4444", icon: "✦" },
    { color: "#06B6D4", icon: "⬟" },
    { color: "#84CC16", icon: "⬢" }
];

const beautyMatchRenderer = {
    render(detail, { questionEl, contentEl, onComplete }) {
        questionEl.textContent = detail.title || "Match each product to its benefit!";

        const pairs = detail.card_pairs || [];
        if (pairs.length === 0) {
            contentEl.innerHTML = "<p>No cards available for this game right now.</p>";
            return;
        }

        // Assign each pair a color + icon up front (by its position in the
        // pairs list), but this is only ever applied to a card once it's
        // flipped/matched -- it's not shown as a pre-game hint.
        const pairStyles = {};
        pairs.forEach((pair, i) => {
            pairStyles[pair.id] = MATCH_PAIR_STYLES[i % MATCH_PAIR_STYLES.length];
        });

        // Build cards from pairs: one card per side, tagged with pair_id
        let cards = [];
        pairs.forEach(pair => {
            cards.push({ pairId: pair.id, side: "a", label: pair.card_a_label, type: pair.card_a_type });
            cards.push({ pairId: pair.id, side: "b", label: pair.card_b_label, type: "text" });
        });
        cards = shuffle(cards);

        contentEl.innerHTML = `
        <div class="match-start">
            <div class="match-start-card">
                <h2>✨ Beauty Match</h2>
                <p>Match every product with its skincare benefit.</p>
                <div class="match-info">
                    <span>🧴 ${pairs.length} Products</span>
                    <span>🏆 Win Rewards</span>
                </div>
                <p class="match-time-note">⏱ You'll have ${Math.floor(MATCH_TIME_LIMIT_SECONDS / 60)} minutes to finish</p>
                <p class="match-hint-note">💡 Flipped pairs share the same color & symbol</p>
                <button id="start-match-btn">Start Game</button>
            </div>
        </div>
        `;

        document.getElementById("start-match-btn").addEventListener("click", startGame);

        function startGame() {
            contentEl.innerHTML = `
            <div class="match-header">
                <div id="match-timer">⏱ ${formatTime(MATCH_TIME_LIMIT_SECONDS)}</div>
                <div id="match-moves">🎯 0 Moves</div>
                <div id="match-score">✅ 0/${pairs.length}</div>
            </div>
            <div class="match-grid" id="match-grid"></div>
            `;

            const grid = document.getElementById("match-grid");
            const timerEl = document.getElementById("match-timer");

            let flipped = [];
            let matchedPairIds = new Set();
            let moves = 0;
            let locked = false;
            let gameOver = false;
            const startTime = Date.now();

            const timer = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const remaining = MATCH_TIME_LIMIT_SECONDS - elapsed;

                if (remaining <= 0) {
                    timerEl.textContent = `⏱ ${formatTime(0)}`;
                    handleTimeUp();
                    return;
                }

                timerEl.textContent = `⏱ ${formatTime(remaining)}`;
                timerEl.classList.toggle("match-timer-warning", remaining <= 10);
            }, 1000);

            function handleTimeUp() {
                if (gameOver) return;
                gameOver = true;
                locked = true;
                clearInterval(timer);
                showTimeUpScreen(matchedPairIds.size, pairs.length, contentEl, () =>
                    beautyMatchRenderer.render(detail, { questionEl, contentEl, onComplete })
                );
            }

            cards.forEach((card, idx) => {
                const cardEl = document.createElement("div");
                cardEl.className = "match-card";
                cardEl.dataset.idx = idx;

                cardEl.innerHTML = `
                    <div class="match-card-inner">
                        <div class="match-card-front">✨</div>
                        <div class="match-card-back">
                            <span class="match-pair-icon"></span>
                            ${card.type === "image"
                                ? `<img src="${card.label}" alt="" />`
                                : `<span class="match-card-label">${card.label}</span>`}
                        </div>
                    </div>
                `;

                cardEl.addEventListener("click", () => {
                    if (gameOver || locked || cardEl.classList.contains("flipped") || cardEl.classList.contains("matched")) return;

                    // Reveal this pair's color + icon only now, on flip.
                    const style = pairStyles[card.pairId];
                    const backEl = cardEl.querySelector(".match-card-back");
                    backEl.style.setProperty("--pair-color", style.color);
                    backEl.querySelector(".match-pair-icon").textContent = style.icon;

                    cardEl.classList.add("flipped");
                    flipped.push({ idx, card, el: cardEl });

                    if (flipped.length === 2) {
                        moves++;
                        document.getElementById("match-moves").textContent = `🎯 ${moves} Moves`;
                        locked = true;
                        const [first, second] = flipped;

                        if (first.card.pairId === second.card.pairId) {
                            first.el.classList.add("matched");
                            second.el.classList.add("matched");
                            matchedPairIds.add(first.card.pairId);
                            document.getElementById("match-score").textContent =
                                `✅ ${matchedPairIds.size}/${pairs.length}`;
                            flipped = [];
                            locked = false;

                            if (matchedPairIds.size === pairs.length) {
                                gameOver = true;
                                clearInterval(timer);
                                locked = true;

                                const timeTaken = Math.round((Date.now() - startTime) / 1000);
                                showFinishScreen(moves, timeTaken, contentEl, onComplete, () =>
                                    beautyMatchRenderer.render(detail, { questionEl, contentEl, onComplete })
                                );
                            }
                        } else {
                            setTimeout(() => {
                                first.el.classList.remove("flipped");
                                second.el.classList.remove("flipped");
                                flipped = [];
                                locked = false;
                            }, 800);
                        }
                    }
                });

                grid.appendChild(cardEl);
            });
        }
    }
};

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

registerRenderer("memory_match", beautyMatchRenderer);

async function showFinishScreen(moves, timeTaken, contentEl, onComplete, onPlayAgain) {
    contentEl.innerHTML = `
        <div class="match-finish">
            <h2>🎉 Great Job!</h2>
            <p>🎯 Moves : ${moves}</p>
            <p>⏱ Time : ${timeTaken}s</p>
            <div id="reward-status">Unlocking reward...</div>
            <button id="play-again-btn">Play Again</button>
        </div>
    `;

    document.getElementById("play-again-btn").addEventListener("click", onPlayAgain);

    await onComplete({
        moves_taken: moves,
        time_taken_seconds: timeTaken
    });
}

function showTimeUpScreen(matchedCount, totalPairs, contentEl, onPlayAgain) {
    // Time ran out before the board was finished -- no submission is made,
    // so no reward is requested for an incomplete game.
    contentEl.innerHTML = `
        <div class="match-finish match-timeout">
            <h2>⏱ Time's Up!</h2>
            <p>You matched ${matchedCount} of ${totalPairs} pairs.</p>
            <p>Give it another shot!</p>
            <button id="play-again-btn">Try Again</button>
        </div>
    `;

    document.getElementById("play-again-btn").addEventListener("click", onPlayAgain);
}