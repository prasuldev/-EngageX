export function createFollowUpButtons(questions) {

    return `

    <div class="mt-4 flex flex-wrap gap-2">

        ${questions.map(question => `

            <button

                class="follow-up-btn bg-pink-100 px-3 py-2 rounded-full"

                data-question="${question}">

                ${question}

            </button>

        `).join("")}

    </div>

    `;

}