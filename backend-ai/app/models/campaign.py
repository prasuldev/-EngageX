from sqlalchemy import Column, Integer, String, Text
from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    campaign_type = Column(String(50), nullable=False)
    status = Column(String(20), default="Draft")