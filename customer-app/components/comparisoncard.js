export function createComparisonCard(compare) {

    return `

    <div class="bg-white rounded-xl shadow p-4 mt-4">

        <table class="w-full">

            <tr>

                <th>Feature</th>

                <th>${compare.left.name}</th>

                <th>${compare.right.name}</th>

            </tr>

            <tr>

                <td>Price</td>

                <td>₹${compare.left.price}</td>

                <td>₹${compare.right.price}</td>

            </tr>

            <tr>

                <td>Rating</td>

                <td>${compare.left.rating}</td>

                <td>${compare.right.rating}</td>

            </tr>

        </table>

    </div>

    `;

}