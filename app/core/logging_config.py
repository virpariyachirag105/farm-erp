import os
import sys
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

# Base logs directory in root project
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE_PATH = LOGS_DIR / "app.log"

LOG_FORMAT = "%(asctime)s [%(levelname)s] [%(name)s:%(lineno)d] - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

def setup_logging():
    """
    Configures logging to output to both console and a rotating file in logs/app.log
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Avoid duplicate handlers if setup is called multiple times
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    formatter = logging.Formatter(fmt=LOG_FORMAT, datefmt=DATE_FORMAT)

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # File Handler (Rotating, max 10MB per file, keeps 5 backup files)
    file_handler = RotatingFileHandler(
        filename=str(LOG_FILE_PATH),
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8"
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

    # Also capture uvicorn / fastapi logs into the same file
    for uvicorn_logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"):
        uvicorn_logger = logging.getLogger(uvicorn_logger_name)
        uvicorn_logger.handlers = [console_handler, file_handler]
        uvicorn_logger.setLevel(logging.INFO)
        uvicorn_logger.propagate = False

    logger = logging.getLogger("farm_erp")
    logger.setLevel(logging.DEBUG)
    logger.info(f"Logging initialized. Log file at: {LOG_FILE_PATH.resolve()}")
    return logger

logger = logging.getLogger("farm_erp")
