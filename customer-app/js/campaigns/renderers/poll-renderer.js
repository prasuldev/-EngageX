registerRenderer("poll", {
    render(campaign, { questionEl, contentEl, onComplete }) {
        const question = campaign.questions[0];
        const options = JSON.parse(question.options);

        questionEl.textContent = question.question_text;

        contentEl.innerHTML = "";
        contentEl.style.display = "flex";
        contentEl.style.flexWrap = "wrap";
        contentEl.style.gap = "10px";

        options.forEach(opt => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "campaign-option-btn";
            btn.textContent = opt;
            btn.addEventListener("click", () => {
                onComplete({
                    answers: [{ question_id: question.id, answer: opt }]
                });
            });
            contentEl.appendChild(btn);
        });
    }
});