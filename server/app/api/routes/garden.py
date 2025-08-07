from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import logging
from app.services.gemini import gemini_service
from app.core.auth import get_current_user
from app.schemas.user import User
from app.schemas.garden import (
    Garden,
    GardenCreate,
    GardenUpdate,
    GardenSummary,
    GardenElement,
    GardenElementCreate,
    GardenElementUpdate,
    GardenSnapshot,
    GardenNote,
    GardenNoteCreate,
)
from app.models.garden import (
    Garden as GardenModel,
    GardenElement as GardenElementModel,
    GardenNote as GardenNoteModel,
)
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/test")
async def test_garden_endpoint():
    """Test endpoint to verify garden router is working"""
    return {"message": "Garden router is working!", "status": "ok"}

class PlantRecommendationRequest(BaseModel):
    zip_code: str = Field(..., min_length=5, max_length=5, description="5-digit US zip code")

class PlantRecommendationResponse(BaseModel):
    zip_code: str
    recommendations: Dict[str, Any]


class GardenQuestionRequest(BaseModel):
    question: str = Field(..., description="Gardening question to ask the assistant")


class GardenQuestionResponse(BaseModel):
    answer: str

# Plant recommendations endpoint (existing)
@router.post("/plant-recommendations", response_model=PlantRecommendationResponse)
async def get_plant_recommendations(
    request: PlantRecommendationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Get plant recommendations based on zip code using Gemini AI
    """
    try:
        # Validate zip code format (basic validation)
        if not request.zip_code.isdigit():
            raise HTTPException(
                status_code=400, 
                detail="Zip code must contain only digits"
            )
        
        logger.info(f"Getting plant recommendations for zip code: {request.zip_code} (user: {current_user.clerk_user_id})")
        
        # Get recommendations from Gemini
        recommendations = await gemini_service.get_plant_recommendations(request.zip_code)
        
        return PlantRecommendationResponse(
            zip_code=request.zip_code,
            recommendations=recommendations
        )
        
    except ValueError as e:
        logger.error(f"Validation error for zip code {request.zip_code}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error getting plant recommendations: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get plant recommendations. Please try again later."
        )

# General gardening question endpoint
@router.post("/ask", response_model=GardenQuestionResponse)
async def ask_gardening_question(
    request: GardenQuestionRequest,
    current_user: User = Depends(get_current_user),
):
    """Ask a general gardening question using Gemini AI"""
    try:
        answer = await gemini_service.ask_gardening_question(request.question)
        return GardenQuestionResponse(answer=answer)
    except Exception as e:
        logger.error(f"Error getting gardening advice: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to get gardening advice. Please try again later."
        )

# Garden CRUD endpoints
@router.get("/gardens", response_model=List[GardenSummary])
async def list_gardens(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all gardens for the current user
    """
    gardens = db.query(GardenModel).filter(GardenModel.user_id == current_user.clerk_user_id).all()
    
    # Add element count to each garden
    garden_summaries = []
    for garden in gardens:
        element_count = db.query(GardenElementModel).filter(GardenElementModel.garden_id == garden.id).count()
        garden_summaries.append(GardenSummary(
            id=garden.id,
            name=garden.name,
            description=garden.description,
            zip_code=garden.zip_code,
            created_at=garden.created_at,
            updated_at=garden.updated_at,
            element_count=element_count
        ))
    
    return garden_summaries

@router.post("/gardens", response_model=Garden)
async def create_garden(
    garden_data: GardenCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new garden
    """
    garden = GardenModel(
        user_id=current_user.clerk_user_id,
        **garden_data.dict()
    )
    
    db.add(garden)
    db.commit()
    db.refresh(garden)
    
    logger.info(f"Created garden {garden.id} for user {current_user.clerk_user_id}")
    return garden

@router.get("/gardens/{garden_id}", response_model=Garden)
async def get_garden(
    garden_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific garden with all its elements
    """
    garden = db.query(GardenModel).filter(
        GardenModel.id == garden_id,
        GardenModel.user_id == current_user.clerk_user_id
    ).first()
    
    if not garden:
        raise HTTPException(status_code=404, detail="Garden not found")
    
    return garden

@router.put("/gardens/{garden_id}", response_model=Garden)
async def update_garden(
    garden_id: int,
    garden_update: GardenUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update garden metadata and view settings
    """
    garden = db.query(GardenModel).filter(
        GardenModel.id == garden_id,
        GardenModel.user_id == current_user.clerk_user_id
    ).first()
    
    if not garden:
        raise HTTPException(status_code=404, detail="Garden not found")
    
    # Update only provided fields
    update_data = garden_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(garden, field, value)
    
    db.commit()
    db.refresh(garden)
    
    return garden

@router.delete("/gardens/{garden_id}")
async def delete_garden(
    garden_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a garden and all its elements
    """
    garden = db.query(GardenModel).filter(
        GardenModel.id == garden_id,
        GardenModel.user_id == current_user.clerk_user_id
    ).first()
    
    if not garden:
        raise HTTPException(status_code=404, detail="Garden not found")
    
    db.delete(garden)
    db.commit()
    
    logger.info(f"Deleted garden {garden_id} for user {current_user.clerk_user_id}")
    return {"message": "Garden deleted successfully"}

# Garden element endpoints
@router.post("/gardens/{garden_id}/elements", response_model=GardenElement)
async def add_element(
    garden_id: int,
    element_data: GardenElementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add an element to a garden
    """
    # Verify garden ownership
    garden = db.query(GardenModel).filter(
        GardenModel.id == garden_id,
        GardenModel.user_id == current_user.clerk_user_id
    ).first()
    
    if not garden:
        raise HTTPException(status_code=404, detail="Garden not found")
    
    element = GardenElementModel(
        garden_id=garden_id,
        **element_data.dict()
    )
    
    db.add(element)
    db.commit()
    db.refresh(element)
    
    return element

@router.put("/gardens/{garden_id}/elements/{element_id}", response_model=GardenElement)
async def update_element(
    garden_id: int,
    element_id: str,
    element_update: GardenElementUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a garden element
    """
    # Verify garden ownership
    garden = db.query(GardenModel).filter(
        GardenModel.id == garden_id,
        GardenModel.user_id == current_user.clerk_user_id
    ).first()
    
    if not garden:
        raise HTTPException(status_code=404, detail="Garden not found")
    
    element = db.query(GardenElementModel).filter(
        GardenElementModel.garden_id == garden_id,
        GardenElementModel.element_id == element_id
    ).first()
    
    if not element:
        raise HTTPException(status_code=404, detail="Element not found")
    
    # Update only provided fields
    update_data = element_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(element, field, value)
    
    db.commit()
    db.refresh(element)
    
    return element

@router.delete("/gardens/{garden_id}/elements/{element_id}")
async def delete_element(
    garden_id: int,
    element_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a garden element
    """
    # Verify garden ownership
    garden = db.query(GardenModel).filter(
        GardenModel.id == garden_id,
        GardenModel.user_id == current_user.clerk_user_id
    ).first()
    
    if not garden:
        raise HTTPException(status_code=404, detail="Garden not found")
    
    element = db.query(GardenElementModel).filter(
        GardenElementModel.garden_id == garden_id,
        GardenElementModel.element_id == element_id
    ).first()
    
    if not element:
        raise HTTPException(status_code=404, detail="Element not found")
    
    db.delete(element)
    db.commit()
    
    return {"message": "Element deleted successfully"}

@router.post("/gardens/{garden_id}/save-snapshot")
async def save_garden_snapshot(
    garden_id: int,
    snapshot: GardenSnapshot,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save a complete garden snapshot (bulk update)
    """
    # Verify garden ownership
    garden = db.query(GardenModel).filter(
        GardenModel.id == garden_id,
        GardenModel.user_id == current_user.clerk_user_id
    ).first()
    
    if not garden:
        raise HTTPException(status_code=404, detail="Garden not found")
    
    try:
        # Update garden metadata
        if snapshot.garden:
            garden_update_data = snapshot.garden.dict(exclude_unset=True)
            for field, value in garden_update_data.items():
                setattr(garden, field, value)
        
        # Clear existing elements and add new ones
        db.query(GardenElementModel).filter(GardenElementModel.garden_id == garden_id).delete()
        
        # Add new elements
        for element_data in snapshot.elements:
            element = GardenElementModel(
                garden_id=garden_id,
                **element_data.dict()
            )
            db.add(element)
        
        db.commit()
        
        logger.info(f"Saved snapshot for garden {garden_id} with {len(snapshot.elements)} elements")
        return {"message": "Garden snapshot saved successfully"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving garden snapshot: {e}")
        raise HTTPException(status_code=500, detail="Failed to save garden snapshot")


# Garden note endpoints
@router.get("/gardens/{garden_id}/notes", response_model=List[GardenNote])
async def list_notes(
    garden_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all notes for a garden"""
    garden = db.query(GardenModel).filter(
        GardenModel.id == garden_id,
        GardenModel.user_id == current_user.clerk_user_id,
    ).first()

    if not garden:
        raise HTTPException(status_code=404, detail="Garden not found")

    notes = (
        db.query(GardenNoteModel)
        .filter(GardenNoteModel.garden_id == garden_id)
        .order_by(GardenNoteModel.created_at.desc())
        .all()
    )
    return notes


@router.post("/gardens/{garden_id}/notes", response_model=GardenNote)
async def create_note(
    garden_id: int,
    note: GardenNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a note for a garden"""
    garden = db.query(GardenModel).filter(
        GardenModel.id == garden_id,
        GardenModel.user_id == current_user.clerk_user_id,
    ).first()

    if not garden:
        raise HTTPException(status_code=404, detail="Garden not found")

    note_model = GardenNoteModel(garden_id=garden_id, content=note.content)
    db.add(note_model)
    db.commit()
    db.refresh(note_model)
    return note_model
