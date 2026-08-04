registerRenderer("mood_ritual", {
    render(campaign, { questionEl, contentEl, onComplete }) {
        const moods = campaign.moods || [];

        if (moods.length < 1) {
            contentEl.innerHTML = "<p>Mood check-in isn't set up yet.</p>";
            return;
        }

        questionEl.textContent = "How's your skin feeling today?";
        contentEl.innerHTML = "";
        contentEl.style.display = "block";

        const wrap = document.createElement("div");
        wrap.className = "campaign-mood-grid";
        contentEl.appendChild(wrap);

        moods.forEach(mood => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "campaign-mood-card";
            card.innerHTML = `
                <span class="campaign-mood-emoji">${mood.emoji || ""}</span>
                <span class="campaign-mood-label">${mood.label}</span>
                <span class="campaign-mood-subtext">${mood.subtext || ""}</span>
            `;
            card.addEventListener("click", () => {
                onComplete({ mood_slug: mood.slug });
            });
            wrap.appendChild(card);
        });
    }
});