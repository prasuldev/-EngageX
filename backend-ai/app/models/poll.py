from sqlalchemy import Column, Integer, String, ForeignKey
from app.database import Base


class Poll(Base):
    __tablename__ = "polls"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    question = Column(String(255), nullable=False)
    option1 = Column(String(100), nullable=False)
    option2 = Column(String(100), nullable=False)
    option3 = Column(String(100), nullable=True)
    option4 = Column(String(100), nullable=True)