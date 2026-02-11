"""
Async checker service for terminal status checks
"""
import asyncio
import httpx
import time
import uuid
import random
import logging
from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from app.models import Terminal, StatusCheck, Status
from app.services.parser import parse_status_response, truncate_response

logger = logging.getLogger(__name__)

# Configuration
BASE_URL = "https://spinpos.net/spin/GetTerminalStatus"
TIMEOUT_SECONDS = 30
MAX_RETRIES = 3
CONCURRENT_REQUESTS = 30  # Safe concurrency level
JITTER_MS = (0, 500)  # Random delay between 0-500ms


async def check_single_terminal(
    client: httpx.AsyncClient,
    tpn: str,
    semaphore: asyncio.Semaphore
) -> Dict:
    """
    Check a single terminal status with retries and exponential backoff.
    Returns dict with status, response, error, http_status, latency_ms
    """
    url = f"{BASE_URL}?tpn={tpn}"
    
    # Add jitter to avoid slamming server
    jitter = random.uniform(*JITTER_MS) / 1000
    await asyncio.sleep(jitter)
    
    async with semaphore:
        start_time = time.time()
        last_error = None
        last_response = None
        last_http_status = None
        
        for attempt in range(MAX_RETRIES):
            try:
                response = await client.get(url, timeout=TIMEOUT_SECONDS)
                elapsed_ms = int((time.time() - start_time) * 1000)
                last_http_status = response.status_code
                
                if response.status_code == 200:
                    response_text = response.text
                    last_response = response_text
                    status = parse_status_response(response_text)
                    
                    return {
                        "status": status,
                        "raw_response": truncate_response(response_text),
                        "error": None,
                        "http_status": response.status_code,
                        "latency_ms": elapsed_ms
                    }
                else:
                    # Non-200 status, treat as error but store response
                    response_text = response.text
                    last_response = response_text
                    status = parse_status_response(response_text)
                    
                    return {
                        "status": status if status != Status.UNKNOWN else Status.ERROR,
                        "raw_response": truncate_response(response_text),
                        "error": f"HTTP {response.status_code}",
                        "http_status": response.status_code,
                        "latency_ms": elapsed_ms
                    }
                    
            except httpx.TimeoutException as e:
                last_error = f"Timeout: {str(e)}"
                if attempt < MAX_RETRIES - 1:
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    await asyncio.sleep(wait_time)
                continue
                
            except httpx.RequestError as e:
                last_error = f"Request error: {str(e)}"
                if attempt < MAX_RETRIES - 1:
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    await asyncio.sleep(wait_time)
                continue
                
            except Exception as e:
                last_error = f"Unexpected error: {str(e)}"
                if attempt < MAX_RETRIES - 1:
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    await asyncio.sleep(wait_time)
                continue
        
        # All retries failed
        elapsed_ms = int((time.time() - start_time) * 1000)
        return {
            "status": Status.ERROR,
            "raw_response": truncate_response(last_response) if last_response else None,
            "error": last_error or "Unknown error",
            "http_status": last_http_status,
            "latency_ms": elapsed_ms
        }


async def run_check_all_terminals(db: Session) -> str:
    """
    Run status check for all terminals in the database.
    Returns run_id (UUID string) for this check run.
    """
    run_id = str(uuid.uuid4())
    logger.info(f"Starting check run {run_id}")
    
    # Get all terminals
    terminals = db.query(Terminal).all()
    if not terminals:
        logger.warning("No terminals found in database")
        return run_id
    
    logger.info(f"Checking {len(terminals)} terminals")
    
    # Create semaphore for concurrency control
    semaphore = asyncio.Semaphore(CONCURRENT_REQUESTS)
    
    # Create HTTP client with timeout
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
        # Create tasks for all terminals
        tasks = [
            check_single_terminal(client, terminal.tpn, semaphore)
            for terminal in terminals
        ]
        
        # Execute all checks concurrently
        results = await asyncio.gather(*tasks)
        
        # Identify terminals that need retry (not ONLINE or OFFLINE)
        retry_terminals = []
        retry_indices = []
        for i, (terminal, result) in enumerate(zip(terminals, results)):
            if result["status"] not in [Status.ONLINE, Status.OFFLINE]:
                retry_terminals.append(terminal)
                retry_indices.append(i)
        
        # Retry non-Online/Offline responses at the end
        if retry_terminals:
            logger.info(f"Retrying {len(retry_terminals)} terminals with non-Online/Offline status")
            await asyncio.sleep(2)  # Small delay before retry
            
            retry_tasks = [
                check_single_terminal(client, terminal.tpn, semaphore)
                for terminal in retry_terminals
            ]
            retry_new_results = await asyncio.gather(*retry_tasks)
            
            # Update results with retry attempts
            for idx, (original_idx, terminal, old_result, new_result) in enumerate(zip(retry_indices, retry_terminals, [results[i] for i in retry_indices], retry_new_results)):
                # Only update if we got a credible response (ONLINE or OFFLINE)
                if new_result["status"] in [Status.ONLINE, Status.OFFLINE]:
                    logger.info(f"Retry successful for {terminal.tpn}: {old_result['status'].value} -> {new_result['status'].value}")
                    results[original_idx] = new_result
                else:
                    logger.info(f"Retry still non-credible for {terminal.tpn}: {new_result['status'].value}, keeping original")
    
    # Store results in database
    checked_at = datetime.utcnow()
    logger.info(f"Storing {len(results)} check results in database...")
    
    try:
        for terminal, result in zip(terminals, results):
            status_check = StatusCheck(
                terminal_id=terminal.id,
                checked_at=checked_at,
                status=result["status"].value,
                raw_response=result["raw_response"],
                error=result["error"],
                http_status=result["http_status"],
                latency_ms=result["latency_ms"],
                run_id=run_id
            )
            db.add(status_check)
        
        db.commit()
        logger.info(f"Successfully committed {len(results)} check results to database for run {run_id}")
        
        # Verify the data was actually saved
        saved_count = db.query(StatusCheck).filter(StatusCheck.run_id == run_id).count()
        if saved_count != len(results):
            logger.warning(f"Data verification failed: Expected {len(results)} checks, but found {saved_count} in database for run {run_id}")
        else:
            logger.info(f"Data verification passed: {saved_count} checks confirmed in database for run {run_id}")
            
    except Exception as e:
        logger.error(f"Error storing check results in database: {e}", exc_info=True)
        db.rollback()
        raise
    
    return run_id
