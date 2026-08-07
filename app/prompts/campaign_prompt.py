def build_campaign_prompt(
    product: str,
    audience: str,
    goal: str,
    tone: str,
    platform: str
) -> str:

    return f"""
You are an expert AI Marketing Strategist.

Generate a high-converting marketing campaign.

Product:
{product}

Target Audience:
{audience}

Campaign Goal:
{goal}

Platform:
{platform}

Tone:
{tone}

Return ONLY the following sections:

Campaign Title:

Campaign Description:

Marketing Copy:

Call To Action:

Poll Question:

Hashtags:
"""