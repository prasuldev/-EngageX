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

        contentEl.innerHTML = `<div class="match-grid" id="match-grid"></div>`;
        const grid = document.getElementById("match-grid");

        let flipped = [];
        let matchedPairIds = new Set();
        let moves = 0;
        let locked = false;
        const startTime = Date.now();

        cards.forEach((card, idx) => {
            const cardEl = document.createElement("div");
            cardEl.className = "match-card";
            cardEl.dataset.idx = idx;

            cardEl.innerHTML = `
                <div class="match-card-inner">
                    <div class="match-card-front">?</div>
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
                    locked = true;
                    const [first, second] = flipped;

                    if (first.card.pairId === second.card.pairId) {
                        first.el.classList.add("matched");
                        second.el.classList.add("matched");
                        matchedPairIds.add(first.card.pairId);
                        flipped = [];
                        locked = false;

                        if (matchedPairIds.size === pairs.length) {
                            const timeTaken = Math.round((Date.now() - startTime) / 1000);
                            setTimeout(() => onComplete({ moves_taken: moves, time_taken_seconds: timeTaken }), 400);
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