"""
Creates the response returned to frontend.
"""


class ResponseBuilder:

    @staticmethod
    def build(
        reply,
        products=None,
        campaign=None,
        follow_up=None
    ):

        return {
            "reply": reply,
            "products": products or [],
            "campaign": campaign,
            "follow_up": follow_up or []
        }