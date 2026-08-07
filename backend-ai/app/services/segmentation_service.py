async def get_skin_type_breakdown(db):
    query = """
        SELECT sp.skin_type,
               COUNT(*) AS response_count,
               COUNT(DISTINCT qr.user_id) AS unique_users
        FROM quiz_responses qr
        JOIN skin_profiles sp ON sp.profile_hash = qr.profile_hash
        GROUP BY sp.skin_type
        ORDER BY response_count DESC;
    """
    return await db.fetch(query)


async def get_top_concerns(db, limit: int = 10):
    query = """
        SELECT concern, COUNT(*) AS count
        FROM quiz_responses qr
        JOIN skin_profiles sp ON sp.profile_hash = qr.profile_hash
        CROSS JOIN LATERAL unnest(sp.concerns) AS concern
        GROUP BY concern
        ORDER BY count DESC
        LIMIT $1;
    """
    return await db.fetch(query, limit)


async def get_skin_type_concern_crosstab(db):
    query = """
        SELECT sp.skin_type, concern, COUNT(*) AS count
        FROM quiz_responses qr
        JOIN skin_profiles sp ON sp.profile_hash = qr.profile_hash
        CROSS JOIN LATERAL unnest(sp.concerns) AS concern
        GROUP BY sp.skin_type, concern
        ORDER BY count DESC;
    """
    return await db.fetch(query)


async def get_response_funnel(db):
    query = """
        SELECT COUNT(*) AS total_responses,
               COUNT(DISTINCT profile_hash) AS unique_profiles,
               COUNT(DISTINCT user_id) AS unique_users
        FROM quiz_responses;
    """
    return await db.fetchrow(query)