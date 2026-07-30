export function createRoutineCard(routine) {

    return `

    <div class="bg-white shadow rounded-xl p-5 mt-4">

        <h3 class="font-semibold text-pink-600">

            ☀ Morning Routine

        </h3>

        <ol class="list-decimal ml-5 mt-3">

            ${routine.morning.map(step => `
                <li>${step}</li>
            `).join("")}

        </ol>

        <h3 class="font-semibold text-pink-600 mt-6">

            🌙 Night Routine

        </h3>

        <ol class="list-decimal ml-5 mt-3">

            ${routine.night.map(step => `
                <li>${step}</li>
            `).join("")}

        </ol>

    </div>

    `;

}