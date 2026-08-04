registerRenderer("skin_twin", {
    render(campaign, { questionEl, contentEl, onComplete }) {
        const questions = campaign.questions || [];

        if (questions.length < 2) {
            contentEl.innerHTML = "<p>This quiz isn't fully set up yet.</p>";
            return;
        }

        const skinTypeQuestion = questions[0];
        const concernsQuestion = questions[1];

        // campaign_questions.options is jsonb, but asyncpg/FastAPI return it
        // as a raw JSON string here, not a parsed array -- same reason the
        // older campaign.js system explicitly JSON.parses it too.
        const skinTypeOptions = typeof skinTypeQuestion.options === "string"
            ? JSON.parse(skinTypeQuestion.options)
            : skinTypeQuestion.options;
        const concernsOptions = typeof concernsQuestion.options === "string"
            ? JSON.parse(concernsQuestion.options)
            : concernsQuestion.options;

        const collectedAnswers = [];
        const MAX_CONCERNS = 2;

        function startStep(stepNum, totalSteps, text) {
            questionEl.textContent = text;
            contentEl.innerHTML = "";
            contentEl.style.display = "block";

            const progress = document.createElement("div");
            progress.className = "campaign-poll-progress";
            progress.textContent = `Question ${stepNum} of ${totalSteps}`;
            contentEl.appendChild(progress);

            const wrap = document.createElement("div");
            wrap.className = "campaign-poll-options";
            contentEl.appendChild(wrap);
            return wrap;
        }

        function renderSkinTypeStep() {
            const wrap = startStep(1, 2, skinTypeQuestion.question_text);

            skinTypeOptions.forEach(label => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "campaign-option-btn";
                btn.textContent = label;
                btn.addEventListener("click", () => {
                    collectedAnswers.push({
                        question_id: skinTypeQuestion.id,
                        question_text: skinTypeQuestion.question_text,
                        answer: label
                    });
                    renderConcernsStep();
                });
                wrap.appendChild(btn);
            });
        }

        function renderConcernsStep() {
            const wrap = startStep(2, 2, concernsQuestion.question_text);
            const selected = new Set();

            concernsOptions.forEach(label => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "campaign-option-btn";
                btn.textContent = label;
                btn.addEventListener("click", () => {
                    if (selected.has(label)) {
                        selected.delete(label);
                        btn.classList.remove("selected");
                    } else if (selected.size < MAX_CONCERNS) {
                        selected.add(label);
                        btn.classList.add("selected");
                    }
                });
                wrap.appendChild(btn);
            });

            const submitBtn = document.createElement("button");
            submitBtn.type = "button";
            submitBtn.className = "campaign-option-btn campaign-submit-btn";
            submitBtn.textContent = "See my match";
            submitBtn.addEventListener("click", () => {
                if (selected.size === 0) return;

                collectedAnswers.push({
                    question_id: concernsQuestion.id,
                    question_text: concernsQuestion.question_text,
                    answer: Array.from(selected).join(",")
                });

                onComplete({ answers: collectedAnswers });
            });
            wrap.appendChild(submitBtn);
        }

        renderSkinTypeStep();
    }
});