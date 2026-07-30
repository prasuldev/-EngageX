const beautyMatchRenderer = {
    render(detail, { questionEl, contentEl, onComplete }) {
        questionEl.textContent = detail.title || "Match each product to its benefit!";

        const pairs = detail.card_pairs || [];
        if (pairs.length === 0) {
            contentEl.innerHTML = "<p>No cards available for this game right now.</p>";
            return;
        }

        // Build 16 cards from 8 pairs: one card per side, tagged with pair_id
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
                <button id="start-match-btn">Start Game</button>
            </div>
        </div>
        `;

        document.getElementById("start-match-btn").addEventListener("click", startGame);

        function startGame() {
            contentEl.innerHTML = `
            <div class="match-header">
                <div id="match-timer">⏱ 00:00</div>
                <div id="match-moves">🎯 0 Moves</div>
                <div id="match-score">✅ 0/${pairs.length}</div>
            </div>
            <div class="match-grid" id="match-grid"></div>
            `;

            const grid = document.getElementById("match-grid");

            let flipped = [];
            let matchedPairIds = new Set();
            let moves = 0;
            let locked = false;
            const startTime = Date.now();

            const timer = setInterval(() => {
                const seconds = Math.floor((Date.now() - startTime) / 1000);
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                document.getElementById("match-timer").textContent =
                    `⏱ ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
            }, 1000);

            cards.forEach((card, idx) => {
                const cardEl = document.createElement("div");
                cardEl.className = "match-card";
                cardEl.dataset.idx = idx;

                cardEl.innerHTML = `
                    <div class="match-card-inner">
                        <div class="match-card-front">✨</div>
                        <div class="match-card-back">
                            ${card.type === "image"
                                ? `<img src="${card.label}" alt="" />`
                                : `<span>${card.label}</span>`}
                        </div>
                    </div>
                `;

                cardEl.addEventListener("click", () => {
                    if (locked || cardEl.classList.contains("flipped") || cardEl.classList.contains("matched")) return;

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