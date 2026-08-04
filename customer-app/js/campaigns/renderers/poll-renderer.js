registerRenderer("poll", {
    render(campaign, { questionEl, contentEl, onComplete }) {
        const questions = campaign.questions || [];

        if (questions.length < 1) {
            contentEl.innerHTML = "<p>This quiz isn't fully set up yet.</p>";
            return;
        }

        const categoryQuestion = questions[0];
        const collectedAnswers = [];

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

        function addOptionButton(wrap, label, onClick) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "campaign-option-btn";
            btn.textContent = label;
            btn.addEventListener("click", onClick);
            wrap.appendChild(btn);
        }

        async function renderCategoryStep() {
            const wrap = startStep(1, 3, categoryQuestion.question_text);
            wrap.innerHTML = `<div class="campaign-poll-loading">Loading categories...</div>`;

            let categories;
            try {
                const res = await fetch(`${API_BASE}/products/categories`);
                categories = await res.json();
            } catch (error) {
                console.error("Error loading categories:", error);
                wrap.innerHTML = `<p>Couldn't load categories. Please try again.</p>`;
                return;
            }

            wrap.innerHTML = "";
            categories.forEach(name => {
                addOptionButton(wrap, name, () => {
                    collectedAnswers.push({
                        question_id: categoryQuestion.id,
                        question_text: categoryQuestion.question_text,
                        answer: name
                    });
                    loadDynamicQuestions(name);
                });
            });
        }

        async function loadDynamicQuestions(category) {
            questionEl.textContent = "Finding the right questions for you...";
            contentEl.innerHTML = `<div class="campaign-poll-loading">One moment...</div>`;

            let dynamicQuestions;
            try {
                const res = await fetch(
                    `${API_BASE}/campaigns/${campaign.slug}/category-questions?category=${encodeURIComponent(category)}`
                );
                dynamicQuestions = await res.json();
            } catch (error) {
                console.error("Error loading category questions:", error);
                contentEl.innerHTML = `<p>Couldn't load questions. Please try again.</p>`;
                return;
            }

            renderDynamicStep(dynamicQuestions, 0);
        }

        function renderDynamicStep(dynamicQuestions, index) {
            const stepNum = index + 2; // steps 2 and 3
            const totalSteps = dynamicQuestions.length + 1;
            const question = dynamicQuestions[index];
            const wrap = startStep(stepNum, totalSteps, question.question_text);

            question.options.forEach(label => {
                addOptionButton(wrap, label, () => {
                    collectedAnswers.push({
                        question_id: null,
                        question_text: question.question_text,
                        answer: label
                    });

                    if (index < dynamicQuestions.length - 1) {
                        renderDynamicStep(dynamicQuestions, index + 1);
                    } else {
                        onComplete({ answers: collectedAnswers });
                    }
                });
            });
        }

        renderCategoryStep();
    }
});