"""Sales-growth intelligence computed from live EngageX commerce data."""

import json
from datetime import datetime, timezone


def _number(value) -> float:
    return float(value or 0)


def _pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None if current == 0 else 100.0
    return round(((current - previous) / previous) * 100, 1)


def _forecast(values: list[float], days: int = 7) -> list[float]:
    if not values:
        return [0.0] * days
    if len(values) == 1:
        return [max(0.0, values[0])] * days

    n = len(values)
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    denominator = sum((index - x_mean) ** 2 for index in range(n))
    slope = sum(
        (index - x_mean) * (value - y_mean)
        for index, value in enumerate(values)
    ) / denominator
    intercept = y_mean - slope * x_mean
    return [max(0.0, intercept + slope * (n + offset)) for offset in range(days)]


async def get_ai_sales_intelligence(db) -> dict:
    daily_rows = await db.fetch(
        """
        WITH days AS (
            SELECT generate_series(
                CURRENT_DATE - INTERVAL '29 days',
                CURRENT_DATE,
                INTERVAL '1 day'
            )::date AS day
        ), sales AS (
            SELECT created_at::date AS day,
                   COUNT(*) AS orders,
                   COALESCE(SUM(total_amount), 0) AS revenue
            FROM orders
            WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
              AND status <> 'Cancelled'
            GROUP BY created_at::date
        )
        SELECT d.day,
               COALESCE(s.orders, 0) AS orders,
               COALESCE(s.revenue, 0) AS revenue
        FROM days d
        LEFT JOIN sales s ON s.day = d.day
        ORDER BY d.day
        """
    )

    product_rows = await db.fetch(
        """
        SELECT p.id, p.name,
               COALESCE(SUM(oi.quantity) FILTER (WHERE o.id IS NOT NULL), 0) AS units,
               COALESCE(SUM(oi.quantity * oi.price) FILTER (WHERE o.id IS NOT NULL), 0) AS revenue,
               COALESCE(SUM(oi.quantity) FILTER (
                   WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
               ), 0) AS recent_units,
               COALESCE(SUM(oi.quantity) FILTER (
                   WHERE o.created_at >= CURRENT_DATE - INTERVAL '60 days'
                     AND o.created_at < CURRENT_DATE - INTERVAL '30 days'
               ), 0) AS previous_units
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id AND o.status <> 'Cancelled'
        GROUP BY p.id, p.name
        ORDER BY recent_units DESC, revenue DESC
        LIMIT 8
        """
    )

    segment_row = await db.fetchrow(
        """
        WITH customer_value AS (
            SELECT u.id,
                   COUNT(o.id) FILTER (WHERE o.status <> 'Cancelled') AS orders,
                   COALESCE(SUM(o.total_amount) FILTER (
                       WHERE o.status <> 'Cancelled'
                   ), 0) AS spend,
                   MAX(o.created_at) FILTER (
                       WHERE o.status <> 'Cancelled'
                   ) AS last_order
            FROM users u
            JOIN roles r ON r.id = u.role_id AND r.name = 'customer'
            LEFT JOIN orders o ON o.user_id = u.id
            GROUP BY u.id
        )
        SELECT COUNT(*) FILTER (WHERE spend >= 5000 OR orders >= 5) AS high_value,
               COUNT(*) FILTER (WHERE orders >= 3) AS frequent_buyers,
               COUNT(*) FILTER (WHERE orders = 0) AS never_purchased,
               COUNT(*) FILTER (
                   WHERE orders > 0 AND last_order < NOW() - INTERVAL '60 days'
               ) AS at_risk,
               COUNT(*) AS total_customers
        FROM customer_value
        """
    )

    campaign_rows = await db.fetch(
        """
        SELECT c.id, c.title, c.campaign_type,
               COUNT(DISTINCT cp.user_id) AS participants,
               GREATEST(
                   COUNT(DISTINCT cr.user_id),
                   (SELECT COUNT(DISTINCT gs.user_id)
                    FROM game_sessions gs
                    WHERE gs.campaign_id = c.id AND gs.completed = true)
               ) AS responses
        FROM campaigns c
        LEFT JOIN campaign_participation cp ON cp.campaign_id = c.id
        LEFT JOIN campaign_responses cr ON cr.campaign_id = c.id
        WHERE c.is_active = true
        GROUP BY c.id, c.title, c.campaign_type
        ORDER BY participants DESC
        """
    )

    beauty_match_row = await db.fetchrow(
        """
        WITH recommendations AS (
            SELECT user_id, product_id, MIN(created_at) AS recommended_at
            FROM user_activity
            WHERE activity_type = 'beauty_match_recommendation'
            GROUP BY user_id, product_id
        ), conversions AS (
            SELECT r.*,
                   EXISTS (
                       SELECT 1 FROM user_activity a
                       WHERE a.user_id = r.user_id
                         AND a.product_id = r.product_id
                         AND a.activity_type = 'product_view'
                         AND a.created_at BETWEEN r.recommended_at
                                              AND r.recommended_at + INTERVAL '30 days'
                   ) AS viewed,
                   EXISTS (
                       SELECT 1 FROM user_activity a
                       WHERE a.user_id = r.user_id
                         AND a.product_id = r.product_id
                         AND a.activity_type = 'cart_add'
                         AND a.created_at BETWEEN r.recommended_at
                                              AND r.recommended_at + INTERVAL '30 days'
                   ) AS added_to_cart,
                   EXISTS (
                       SELECT 1 FROM user_activity a
                       WHERE a.user_id = r.user_id
                         AND a.product_id = r.product_id
                         AND a.activity_type = 'purchase'
                         AND a.created_at BETWEEN r.recommended_at
                                              AND r.recommended_at + INTERVAL '30 days'
                   ) AS purchased,
                   COALESCE((
                       SELECT SUM(oi.quantity * oi.price)
                       FROM orders o
                       JOIN order_items oi ON oi.order_id = o.id
                       WHERE o.user_id = r.user_id
                         AND oi.product_id = r.product_id
                         AND o.status <> 'Cancelled'
                         AND o.created_at BETWEEN r.recommended_at
                                              AND r.recommended_at + INTERVAL '30 days'
                   ), 0) AS attributed_revenue
            FROM recommendations r
        )
        SELECT COUNT(*) AS recommendations,
               COUNT(DISTINCT user_id) AS matched_customers,
               COUNT(*) FILTER (WHERE viewed) AS views,
               COUNT(*) FILTER (WHERE added_to_cart) AS cart_adds,
               COUNT(*) FILTER (WHERE purchased) AS purchases,
               COALESCE(SUM(attributed_revenue), 0) AS attributed_revenue
        FROM conversions
        """
    )

    beauty_game_row = await db.fetchrow(
        """
        SELECT COUNT(gs.id) AS total_plays,
               COUNT(gs.id) FILTER (WHERE gs.completed = true) AS completions,
               COUNT(DISTINCT gs.user_id) AS unique_players,
               COUNT(gs.id) FILTER (WHERE gs.reward_issued_value IS NOT NULL) AS rewards_issued,
               COALESCE(ROUND(AVG(gs.moves_taken) FILTER (WHERE gs.completed = true)), 0) AS avg_moves,
               COALESCE(ROUND(AVG(gs.time_taken_seconds) FILTER (WHERE gs.completed = true)), 0) AS avg_time_seconds
        FROM campaigns c
        JOIN game_sessions gs ON gs.campaign_id = c.id
        WHERE c.campaign_type = 'memory_match'
          AND (LOWER(c.title) LIKE '%beauty%match%' OR LOWER(c.slug) LIKE '%beauty%match%')
        """
    )

    beauty_product_rows = await db.fetch(
        """
        WITH recommendations AS (
            SELECT user_id, product_id, MIN(created_at) AS recommended_at
            FROM user_activity
            WHERE activity_type = 'beauty_match_recommendation'
            GROUP BY user_id, product_id
        )
        SELECT p.id, p.name,
               COUNT(*) AS recommendations,
               COUNT(*) FILTER (WHERE EXISTS (
                   SELECT 1 FROM user_activity a
                   WHERE a.user_id = r.user_id
                     AND a.product_id = r.product_id
                     AND a.activity_type = 'cart_add'
                     AND a.created_at BETWEEN r.recommended_at
                                          AND r.recommended_at + INTERVAL '30 days'
               )) AS cart_adds,
               COUNT(*) FILTER (WHERE EXISTS (
                   SELECT 1 FROM user_activity a
                   WHERE a.user_id = r.user_id
                     AND a.product_id = r.product_id
                     AND a.activity_type = 'purchase'
                     AND a.created_at BETWEEN r.recommended_at
                                          AND r.recommended_at + INTERVAL '30 days'
               )) AS purchases
        FROM recommendations r
        JOIN products p ON p.id = r.product_id
        GROUP BY p.id, p.name
        ORDER BY purchases DESC, cart_adds DESC, recommendations DESC
        LIMIT 5
        """
    )

    affinity_rows = await db.fetch(
        """
        SELECT p1.id AS product_a_id, p1.name AS product_a,
               p2.id AS product_b_id, p2.name AS product_b,
               COUNT(DISTINCT oi1.order_id) AS orders_together,
               COALESCE(SUM(oi1.price * oi1.quantity + oi2.price * oi2.quantity), 0) AS bundle_revenue
        FROM order_items oi1
        JOIN order_items oi2 ON oi2.order_id = oi1.order_id
                            AND oi2.product_id > oi1.product_id
        JOIN orders o ON o.id = oi1.order_id AND o.status <> 'Cancelled'
        JOIN products p1 ON p1.id = oi1.product_id
        JOIN products p2 ON p2.id = oi2.product_id
        GROUP BY p1.id, p1.name, p2.id, p2.name
        ORDER BY orders_together DESC, bundle_revenue DESC
        LIMIT 8
        """
    )

    customer_rows = await db.fetch(
        """
        SELECT u.id, u.full_name, u.email, u.created_at,
               COUNT(o.id) FILTER (WHERE o.status <> 'Cancelled') AS orders,
               COALESCE(SUM(o.total_amount) FILTER (WHERE o.status <> 'Cancelled'), 0) AS spend,
               MAX(o.created_at) FILTER (WHERE o.status <> 'Cancelled') AS last_order,
               COALESCE(
                   CURRENT_DATE - MAX(o.created_at::date) FILTER (WHERE o.status <> 'Cancelled'),
                   CURRENT_DATE - u.created_at::date
               ) AS inactive_days
        FROM users u
        JOIN roles r ON r.id = u.role_id AND r.name = 'customer'
        LEFT JOIN orders o ON o.user_id = u.id
        GROUP BY u.id, u.full_name, u.email, u.created_at
        ORDER BY spend DESC, inactive_days DESC
        LIMIT 50
        """
    )

    journey_summary_row = await db.fetchrow(
        """
        SELECT COUNT(*) FILTER (WHERE activity_type = 'product_view') AS views,
               COUNT(*) FILTER (WHERE activity_type = 'cart_add') AS cart_adds,
               COUNT(*) FILTER (WHERE activity_type = 'wishlist_add') AS wishlists,
               COUNT(*) FILTER (WHERE activity_type = 'purchase') AS purchases,
               COUNT(DISTINCT user_id) AS active_customers
        FROM user_activity
        WHERE activity_type IN ('product_view', 'cart_add', 'wishlist_add', 'purchase')
        """
    )

    journey_rows = await db.fetch(
        """
        SELECT a.id, a.activity_type, a.created_at,
               u.id AS customer_id, u.full_name AS customer_name,
               p.id AS product_id, p.name AS product_name
        FROM user_activity a
        JOIN users u ON u.id = a.user_id
        JOIN products p ON p.id = a.product_id
        WHERE a.activity_type IN ('product_view', 'cart_add', 'wishlist_add', 'purchase')
        ORDER BY a.created_at DESC
        LIMIT 50
        """
    )

    revenues = [_number(row["revenue"]) for row in daily_rows]
    orders = [_number(row["orders"]) for row in daily_rows]
    revenue_forecast = _forecast(revenues)
    order_forecast = _forecast(orders)
    recent_revenue = sum(revenues[-7:])
    previous_revenue = sum(revenues[-14:-7])
    recent_orders = sum(orders[-7:])
    previous_orders = sum(orders[-14:-7])
    revenue_change = _pct_change(recent_revenue, previous_revenue)
    order_change = _pct_change(recent_orders, previous_orders)

    products = []
    for row in product_rows:
        recent_units = int(row["recent_units"] or 0)
        previous_units = int(row["previous_units"] or 0)
        momentum = _pct_change(recent_units, previous_units)
        if recent_units == 0:
            action = "Test a targeted promotion or bundle before reducing visibility."
        elif momentum is not None and momentum >= 20:
            action = "Increase visibility and use as a cross-sell anchor."
        elif momentum is not None and momentum <= -20:
            action = "Review pricing, placement, and campaign audience."
        else:
            action = "Maintain placement and test a complementary-product offer."
        products.append({
            "product_id": row["id"],
            "name": row["name"],
            "units": int(row["units"] or 0),
            "revenue": round(_number(row["revenue"]), 2),
            "momentum_percent": momentum,
            "recent_units": recent_units,
            "previous_units": previous_units,
            "action": action,
        })

    campaigns = []
    for row in campaign_rows:
        participants = int(row["participants"] or 0)
        responses = int(row["responses"] or 0)
        response_rate = min(100, round((responses / participants) * 100, 1)) if participants else 0
        if participants < 10:
            action = "Increase reach before judging performance."
        elif response_rate < 25:
            action = "Simplify the interaction and strengthen the reward or call to action."
        elif response_rate >= 60:
            action = "Scale this format and reuse its audience targeting."
        else:
            action = "A/B test the offer and product selection to improve conversion."
        campaigns.append({
            "campaign_id": row["id"],
            "title": row["title"],
            "campaign_type": row["campaign_type"],
            "participants": participants,
            "responses": responses,
            "response_rate": response_rate,
            "action": action,
            "experiment": {
                "hypothesis": "A clearer value proposition will increase campaign response rate.",
                "variant_a": "Keep the current campaign experience.",
                "variant_b": "Lead with the reward and shorten the call to action.",
                "primary_metric": "Response rate",
                "minimum_sample": max(40, participants * 2),
            },
        })

    bundles = [
        {
            "product_a_id": row["product_a_id"],
            "product_a": row["product_a"],
            "product_b_id": row["product_b_id"],
            "product_b": row["product_b"],
            "orders_together": int(row["orders_together"] or 0),
            "bundle_revenue": round(_number(row["bundle_revenue"]), 2),
            "action": "Test a 5–10% bundle incentive and feature it on both product pages.",
        }
        for row in affinity_rows
    ]

    customer_actions = []
    for row in customer_rows:
        order_count = int(row["orders"] or 0)
        spend = _number(row["spend"])
        inactive_days = int(row["inactive_days"] or 0)
        if order_count == 0:
            segment = "Potential customer"
            action = "Send a first-purchase offer using their recent product interest."
        elif inactive_days >= 60:
            segment = "At risk"
            action = "Run a personalized win-back offer with a short expiry."
        elif order_count >= 5 or spend >= 5000:
            segment = "High value"
            action = "Recommend a premium cross-sell and loyalty reward."
        elif order_count >= 3:
            segment = "Frequent buyer"
            action = "Recommend replenishment and a complementary bundle."
        else:
            segment = "Developing"
            action = "Recommend the next product based on previous purchases."
        churn_score = min(100, round(
            min(inactive_days, 120) / 120 * 65
            + (25 if order_count <= 1 else 10 if order_count == 2 else 0)
            + (10 if spend < 1000 else 0)
        ))
        customer_actions.append({
            "customer_id": row["id"],
            "name": row["full_name"],
            "email": row["email"],
            "segment": segment,
            "orders": order_count,
            "spend": round(spend, 2),
            "inactive_days": inactive_days,
            "churn_risk_score": churn_score,
            "churn_risk": "High" if churn_score >= 70 else "Medium" if churn_score >= 40 else "Low",
            "next_best_action": action,
        })

    anomalies = []
    if revenue_change is not None and abs(revenue_change) >= 25:
        direction = "increased" if revenue_change > 0 else "dropped"
        anomalies.append({
            "severity": "opportunity" if revenue_change > 0 else "warning",
            "metric": "revenue",
            "title": f"Revenue {direction} {abs(revenue_change):.1f}%",
            "detail": "Compared with the previous seven days.",
        })
    if order_change is not None and abs(order_change) >= 25:
        direction = "increased" if order_change > 0 else "dropped"
        anomalies.append({
            "severity": "opportunity" if order_change > 0 else "warning",
            "metric": "orders",
            "title": f"Order volume {direction} {abs(order_change):.1f}%",
            "detail": "Compared with the previous seven days.",
        })
    if not anomalies:
        anomalies.append({
            "severity": "normal",
            "metric": "both",
            "title": "No major sales anomalies detected",
            "detail": "Revenue and order movement stayed within the 25% alert threshold.",
        })

    top_product = products[0] if products else None
    insights = []
    if revenue_change is not None:
        direction = "up" if revenue_change >= 0 else "down"
        insights.append(
            f"Revenue is {direction} {abs(revenue_change):.1f}% versus the previous week."
        )
    if top_product:
        insights.append(
            f"{top_product['name']} is the strongest current product opportunity; {top_product['action']}"
        )
    if segment_row["at_risk"]:
        insights.append(
            f"Re-engage {segment_row['at_risk']} at-risk customers with a time-limited personalized offer."
        )
    if beauty_match_row["purchases"]:
        insights.append(
            f"Beauty Match influenced {beauty_match_row['purchases']} product purchases worth "
            f"₹{_number(beauty_match_row['attributed_revenue']):,.0f}."
        )
    if not insights:
        insights.append("More completed orders are needed before sales-growth patterns can be ranked.")

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "insights": insights,
        "forecast": {
            "next_7_days_revenue": round(sum(revenue_forecast), 2),
            "next_7_days_orders": round(sum(order_forecast)),
            "revenue_change_percent": revenue_change,
            "order_change_percent": order_change,
            "method": "30-day linear trend",
        },
        "sales_history": [
            {
                "date": row["day"].isoformat(),
                "revenue": round(_number(row["revenue"]), 2),
                "orders": int(row["orders"] or 0),
            }
            for row in daily_rows
        ],
        "sales_summary": {
            "today_revenue": round(revenues[-1] if revenues else 0, 2),
            "today_orders": int(orders[-1] if orders else 0),
            "current_7_days_revenue": round(recent_revenue, 2),
            "previous_7_days_revenue": round(previous_revenue, 2),
            "current_7_days_orders": int(recent_orders),
            "previous_7_days_orders": int(previous_orders),
        },
        "product_opportunities": products[:5],
        "bundle_recommendations": bundles,
        "customer_next_best_actions": customer_actions[:20],
        "churn_risk_summary": {
            "high": sum(item["churn_risk"] == "High" for item in customer_actions),
            "medium": sum(item["churn_risk"] == "Medium" for item in customer_actions),
            "low": sum(item["churn_risk"] == "Low" for item in customer_actions),
        },
        "customer_segments": {
            key: int(segment_row[key] or 0)
            for key in (
                "high_value", "frequent_buyers", "never_purchased",
                "at_risk", "total_customers"
            )
        },
        "customer_journey": {
            "period": "all_recorded_activity",
            "summary": {
                "views": int(journey_summary_row["views"] or 0),
                "cart_adds": int(journey_summary_row["cart_adds"] or 0),
                "wishlists": int(journey_summary_row["wishlists"] or 0),
                "purchases": int(journey_summary_row["purchases"] or 0),
                "active_customers": int(journey_summary_row["active_customers"] or 0),
            },
            "recent_activity": [
                {
                    "activity_id": row["id"],
                    "customer_id": row["customer_id"],
                    "customer_name": row["customer_name"],
                    "product_id": row["product_id"],
                    "product_name": row["product_name"],
                    "activity_type": row["activity_type"],
                    "created_at": row["created_at"].isoformat(),
                }
                for row in journey_rows
            ],
        },
        "campaign_actions": campaigns[:5],
        "anomalies": anomalies,
        "beauty_match_conversion": {
            "recommendations": int(beauty_match_row["recommendations"] or 0),
            "matched_customers": int(beauty_match_row["matched_customers"] or 0),
            "views": int(beauty_match_row["views"] or 0),
            "cart_adds": int(beauty_match_row["cart_adds"] or 0),
            "purchases": int(beauty_match_row["purchases"] or 0),
            "attributed_revenue": round(_number(beauty_match_row["attributed_revenue"]), 2),
            "purchase_rate_percent": round(
                (beauty_match_row["purchases"] / beauty_match_row["recommendations"]) * 100, 1
            ) if beauty_match_row["recommendations"] else 0,
            "top_products": [
                {
                    "product_id": row["id"],
                    "name": row["name"],
                    "recommendations": int(row["recommendations"] or 0),
                    "cart_adds": int(row["cart_adds"] or 0),
                    "purchases": int(row["purchases"] or 0),
                }
                for row in beauty_product_rows
            ],
            "attribution_window_days": 30,
            "original_game": {
                "total_plays": int(beauty_game_row["total_plays"] or 0) if beauty_game_row else 0,
                "completions": int(beauty_game_row["completions"] or 0) if beauty_game_row else 0,
                "unique_players": int(beauty_game_row["unique_players"] or 0) if beauty_game_row else 0,
                "rewards_issued": int(beauty_game_row["rewards_issued"] or 0) if beauty_game_row else 0,
                "avg_moves": int(beauty_game_row["avg_moves"] or 0) if beauty_game_row else 0,
                "avg_time_seconds": int(beauty_game_row["avg_time_seconds"] or 0) if beauty_game_row else 0,
            },
        },
    }


def answer_sales_question(question: str, intelligence: dict) -> dict:
    normalized = question.lower().strip()
    forecast = intelligence.get("forecast", {})
    summary = intelligence.get("sales_summary", {})
    products = intelligence.get("product_opportunities", [])
    bundles = intelligence.get("bundle_recommendations", [])
    customers = intelligence.get("customer_next_best_actions", [])
    campaigns = intelligence.get("campaign_actions", [])
    beauty = intelligence.get("beauty_match_conversion", {})
    anomalies = intelligence.get("anomalies", [])

    sales_terms = (
        "sale", "revenue", "order", "forecast", "growth", "product", "promote",
        "bundle", "cross-sell", "customer", "churn", "risk", "campaign", "a/b",
        "experiment", "beauty match", "conversion", "purchase", "anomaly", "profit",
        "income", "earned", "made today", "sold", "selling", "business performance",
        "how are we doing", "went down", "went up", "go down", "go up",
    )
    if not any(term in normalized for term in sales_terms):
        return {
            "answer": "I am the EngageX sales assistant, so I can only answer questions about sales, revenue, orders, products, customers, Beauty Match, and campaigns.",
            "evidence": ["Sales-only assistant policy"],
            "grounded": True,
        }

    if "today" in normalized and any(word in normalized for word in ("sale", "revenue", "order")):
        answer = (
            f"Today's recorded sales are ₹{summary.get('today_revenue', 0):,.0f} from "
            f"{summary.get('today_orders', 0)} orders."
        )
        evidence = ["Orders recorded today", "Cancelled orders excluded"]
    elif any(word in normalized for word in ("why", "change", "increase", "decrease", "drop", "growth", "anomaly")):
        revenue_change = forecast.get("revenue_change_percent")
        order_change = forecast.get("order_change_percent")
        answer = (
            f"This week revenue is {format_change(revenue_change)} and order volume is "
            f"{format_change(order_change)} versus the previous seven days. "
            f"Current revenue is ₹{summary.get('current_7_days_revenue', 0):,.0f}, compared with "
            f"₹{summary.get('previous_7_days_revenue', 0):,.0f} previously."
        )
        evidence = ["Current 7 days", "Previous 7 days"] + [item.get("title", "") for item in anomalies[:2]]
    elif any(word in normalized for word in ("forecast", "future", "next week")):
        answer = (
            f"The 7-day forecast is ₹{forecast.get('next_7_days_revenue', 0):,.0f} from "
            f"about {forecast.get('next_7_days_orders', 0)} orders. "
            f"Revenue is {format_change(forecast.get('revenue_change_percent'))} versus the previous week."
        )
        evidence = ["30-day sales trend", "Last 7 days versus previous 7 days"]
    elif any(word in normalized for word in ("bundle", "together", "cross-sell")) and bundles:
        top = bundles[0]
        answer = f"Test a bundle of {top['product_a']} and {top['product_b']}; they appeared together in {top['orders_together']} orders."
        evidence = [f"₹{top['bundle_revenue']:,.0f} combined historical bundle revenue"]
    elif any(word in normalized for word in ("customer", "churn", "risk", "inactive")):
        high_risk = [item for item in customers if item["churn_risk"] == "High"]
        answer = f"{len(high_risk)} customers are currently high churn risk. Prioritize personalized win-back offers for the longest-inactive customers."
        evidence = ["Purchase recency", "Order frequency", "Customer spend"]
    elif any(word in normalized for word in ("campaign", "experiment", "a/b")) and campaigns:
        top = campaigns[0]
        answer = f"Start with {top['title']}. {top['action']} Test the proposed reward-first variant against the current experience."
        evidence = [f"{top['participants']} participants", f"{top['response_rate']}% response rate"]
    elif "beauty" in normalized or "match" in normalized:
        answer = (
            f"Beauty Match produced {beauty.get('recommendations', 0)} recommendations, "
            f"{beauty.get('cart_adds', 0)} cart additions, and {beauty.get('purchases', 0)} purchases. "
            f"Attributed revenue is ₹{beauty.get('attributed_revenue', 0):,.0f}."
        )
        evidence = [f"{beauty.get('attribution_window_days', 30)}-day attribution window"]
    elif any(word in normalized for word in ("revenue", "sale", "order", "week")):
        answer = (
            f"During the current seven-day period, EngageX recorded ₹{summary.get('current_7_days_revenue', 0):,.0f} "
            f"from {summary.get('current_7_days_orders', 0)} orders. Revenue is "
            f"{format_change(forecast.get('revenue_change_percent'))} versus the previous period."
        )
        evidence = ["Current 7-day completed sales", "Previous 7-day comparison"]
    elif products:
        top = products[0]
        answer = f"Promote {top['name']} first. {top['action']}"
        evidence = [f"{top['units']} units sold", f"₹{top['revenue']:,.0f} revenue"]
    else:
        answer = "There is not enough completed sales activity to answer that question reliably yet."
        evidence = ["Current EngageX dashboard aggregates"]

    return {"answer": answer, "evidence": evidence, "grounded": True}


async def answer_sales_question_flexible(question: str, intelligence: dict) -> dict:
    """Use the LLM for natural sales language, with a grounded rules fallback."""
    fallback = answer_sales_question(question, intelligence)
    if fallback.get("evidence") == ["Sales-only assistant policy"]:
        return fallback

    safe_snapshot = {
        "sales_summary": intelligence.get("sales_summary", {}),
        "forecast": intelligence.get("forecast", {}),
        "sales_history": intelligence.get("sales_history", []),
        "product_opportunities": intelligence.get("product_opportunities", []),
        "bundle_recommendations": intelligence.get("bundle_recommendations", []),
        "customer_segments": intelligence.get("customer_segments", {}),
        "customer_journey_summary": intelligence.get("customer_journey", {}).get("summary", {}),
        "churn_risk_summary": intelligence.get("churn_risk_summary", {}),
        "campaign_actions": intelligence.get("campaign_actions", []),
        "beauty_match_conversion": intelligence.get("beauty_match_conversion", {}),
        "anomalies": intelligence.get("anomalies", []),
    }
    prompt = f"""
You are the EngageX internal sales intelligence assistant.
Answer the manager's sales-related question naturally, even when it is phrased in an unexpected way.
Use only the supplied EngageX data. Never invent a number, customer, product, cause, or event.
If the data cannot answer the question, say exactly what data is missing and suggest the nearest useful sales metric.
Do not answer non-sales topics. Keep the answer concise: maximum 120 words.
Mention the specific evidence used in the answer.

ENGAGEX SALES DATA:
{json.dumps(safe_snapshot, default=str)}

MANAGER QUESTION:
{question}
"""
    try:
        from app.ai.llm_service import LLMService
        response = (await LLMService().generate_reply(prompt)).strip()
        if not response:
            return fallback
        return {
            "answer": response,
            "evidence": ["Live EngageX sales intelligence snapshot"],
            "grounded": True,
            "mode": "generative",
        }
    except Exception:
        return {**fallback, "mode": "rules-fallback"}


def format_change(value) -> str:
    if value is None:
        return "without a prior baseline"
    return f"{'up' if value >= 0 else 'down'} {abs(value):.1f}%"
