from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import UniqueConstraint


class Garden(Base):
    __tablename__ = "gardens"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    zip_code = Column(String(5), nullable=False)
    user_id = Column(String(255), nullable=False, index=True)  # Clerk user ID

    # Canvas view settings
    view_box_x = Column(Float, default=-500.0)
    view_box_y = Column(Float, default=-500.0)
    view_box_width = Column(Float, default=1000.0)
    view_box_height = Column(Float, default=1000.0)
    zoom = Column(Float, default=1.0)
    grid_size = Column(Integer, default=50)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    elements = relationship(
        "GardenElement", back_populates="garden", cascade="all, delete-orphan"
    )
    notes = relationship(
        "GardenNote", back_populates="garden", cascade="all, delete-orphan"
    )


class GardenElement(Base):
    __tablename__ = "garden_elements"

    id = Column(Integer, primary_key=True, index=True)
    element_id = Column(String(255), nullable=False)  # Frontend-generated ID
    garden_id = Column(Integer, ForeignKey("gardens.id"), nullable=False)
    element_type = Column(String(50), nullable=False)  # 'structure', 'plant', 'text'

    # Position
    position_x = Column(Float, nullable=False)
    position_y = Column(Float, nullable=False)

    # Structure-specific fields
    width = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    z_height = Column(Float, nullable=True)
    label = Column(String(255), nullable=True)
    color = Column(String(7), nullable=True)  # Hex color
    shape = Column(String(50), nullable=True)

    # Plant-specific fields
    common_name = Column(String(255), nullable=True)
    botanical_name = Column(String(255), nullable=True)
    plant_type = Column(String(100), nullable=True)
    sunlight_needs = Column(String(255), nullable=True)
    water_needs = Column(String(255), nullable=True)
    mature_size = Column(String(255), nullable=True)
    spacing = Column(Float, nullable=True)
    show_spacing = Column(Boolean, default=False)

    # Text-specific fields
    text_content = Column(Text, nullable=True)
    font_size = Column(Integer, nullable=True)
    text_color = Column(String(7), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    garden = relationship("Garden", back_populates="elements")


class GardenNote(Base):
    __tablename__ = "garden_notes"

    id = Column(Integer, primary_key=True, index=True)
    garden_id = Column(Integer, ForeignKey("gardens.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    garden = relationship("Garden", back_populates="notes")


class GardenRecommendation(Base):
    __tablename__ = "garden_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    garden_id = Column(Integer, ForeignKey("gardens.id"), nullable=False, unique=True)
    # Store the full recommendation payload as JSON/Text
    # Prefer JSONB if on Postgres, otherwise fallback to Text via SQLAlchemy JSON type resolution
    # Use Text for maximum compatibility across SQLite/Postgres
    data = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    garden = relationship("Garden")

    __table_args__ = (
        UniqueConstraint("garden_id", name="uq_garden_recommendations_garden_id"),
    )
