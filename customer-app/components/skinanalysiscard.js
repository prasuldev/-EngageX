export function createSkinAnalysisCard(data) {

    return `

    <div class="bg-pink-50 rounded-xl p-5 mt-4 border border-pink-200">

        <h3 class="text-lg font-semibold text-pink-700">

            🌸 Skin Analysis

        </h3>

        <div class="mt-4 space-y-2">

            <p>

                <strong>Skin Type:</strong>

                ${data.skin_type}

            </p>

            <p>

                <strong>Concern:</strong>

                ${data.concern}

            </p>

            <p>

                <strong>Recommendation:</strong>

                ${data.recommendation}

            </p>

        </div>

    </div>

    `;

}