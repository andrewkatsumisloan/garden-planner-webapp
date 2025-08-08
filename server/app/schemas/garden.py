from pydantic import BaseModel
from typing import List, Optional, Union, Dict, Any
from datetime import datetime


# Garden Element Schemas
class GardenElementBase(BaseModel):
    element_id: str
    element_type: str  # 'structure', 'plant', 'text'
    position_x: float
    position_y: float

    # Structure fields
    width: Optional[float] = None
    height: Optional[float] = None
    label: Optional[str] = None
    color: Optional[str] = None
    shape: Optional[str] = None

    # Plant fields
    common_name: Optional[str] = None
    botanical_name: Optional[str] = None
    plant_type: Optional[str] = None
    sunlight_needs: Optional[str] = None
    water_needs: Optional[str] = None
    mature_size: Optional[str] = None
    spacing: Optional[float] = None
    show_spacing: Optional[bool] = False

    # Text fields
    text_content: Optional[str] = None
    font_size: Optional[int] = None
    text_color: Optional[str] = None


class GardenElementCreate(GardenElementBase):
    pass


class GardenElementUpdate(BaseModel):
    element_type: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    label: Optional[str] = None
    color: Optional[str] = None
    shape: Optional[str] = None
    common_name: Optional[str] = None
    botanical_name: Optional[str] = None
    plant_type: Optional[str] = None
    sunlight_needs: Optional[str] = None
    water_needs: Optional[str] = None
    mature_size: Optional[str] = None
    spacing: Optional[float] = None
    show_spacing: Optional[bool] = None
    text_content: Optional[str] = None
    font_size: Optional[int] = None
    text_color: Optional[str] = None


class GardenElement(GardenElementBase):
    id: int
    garden_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Garden Schemas
class GardenBase(BaseModel):
    name: str
    description: Optional[str] = None
    zip_code: str
    view_box_x: float = -500.0
    view_box_y: float = -500.0
    view_box_width: float = 1000.0
    view_box_height: float = 1000.0
    zoom: float = 1.0
    grid_size: int = 50


class GardenCreate(GardenBase):
    pass


class GardenUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    zip_code: Optional[str] = None
    view_box_x: Optional[float] = None
    view_box_y: Optional[float] = None
    view_box_width: Optional[float] = None
    view_box_height: Optional[float] = None
    zoom: Optional[float] = None
    grid_size: Optional[int] = None


class Garden(GardenBase):
    id: int
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    elements: List[GardenElement] = []
    notes: List["GardenNote"] = []

    class Config:
        from_attributes = True


class GardenSummary(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    zip_code: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    element_count: int

    class Config:
        from_attributes = True


# Garden Note Schemas
class GardenNoteBase(BaseModel):
    content: str


class GardenNoteCreate(GardenNoteBase):
    pass


class GardenNote(GardenNoteBase):
    id: int
    garden_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Bulk operations
class GardenElementsBulkUpdate(BaseModel):
    elements: List[Union[GardenElementCreate, GardenElementUpdate]]


class GardenSnapshot(BaseModel):
    garden: GardenUpdate
    elements: List[GardenElementCreate]


# Recommendation Schemas
class GardenRecommendationBase(BaseModel):
    data: Dict[str, Any]


class GardenRecommendation(GardenRecommendationBase):
    id: int
    garden_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
