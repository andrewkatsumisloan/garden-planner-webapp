from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Fullstack Template API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Example model
class Message(BaseModel):
    message: str


@app.get("/")
async def root():
    """Root endpoint returning API info"""
    return {"message": "Welcome to the Fullstack Template API", "docs_url": "/docs"}


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/api/info")
async def get_info():
    """Information about the backend stack"""
    return {
        "name": "Fullstack Template Backend",
        "version": "1.0.0",
        "stack": {
            "framework": "FastAPI",
            "database": "SQLAlchemy",
            "deployment": "Docker",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
