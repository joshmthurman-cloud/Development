"""
SOAP service for STEAM API integration
"""
import httpx
import xml.etree.ElementTree as ET
import xml.sax.saxutils as saxutils
import logging
from typing import List, Dict, Optional
from xml.etree.ElementTree import Element
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# SOAP namespaces
SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/"
TEMPURI_NS = "http://tempuri.org/"
XSD_NS = "http://www.w3.org/2001/XMLSchema"
XSI_NS = "http://www.w3.org/2001/XMLSchema-instance"
MSDATA_NS = "urn:schemas-microsoft-com:xml-msdata"
DIFFGR_NS = "urn:schemas-microsoft-com:xml-diffgram-v1"


def create_soap_envelope(body_content: str) -> str:
    """Create a SOAP envelope with the given body content"""
    return f'''<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    {body_content}
  </soap:Body>
</soap:Envelope>'''


def create_get_terminals_request(username: str, password: str, company_id: str) -> str:
    """Create Get_Terminals SOAP request"""
    # Escape XML special characters to prevent XML parsing errors
    username_escaped = saxutils.escape(username)
    password_escaped = saxutils.escape(password)
    company_id_escaped = saxutils.escape(str(company_id))
    
    body = f'''<Get_Terminals xmlns="{TEMPURI_NS}">
      <UserName>{username_escaped}</UserName>
      <Password>{password_escaped}</Password>
      <CompanyId>{company_id_escaped}</CompanyId>
    </Get_Terminals>'''
    return create_soap_envelope(body)


def create_terminal_info_request(username: str, password: str, tpn: str) -> str:
    """Create TerminalInfo SOAP request"""
    # Escape XML special characters to prevent XML parsing errors
    username_escaped = saxutils.escape(username)
    password_escaped = saxutils.escape(password)
    tpn_escaped = saxutils.escape(tpn)
    
    body = f'''<TerminalInfo xmlns="{TEMPURI_NS}">
      <username>{username_escaped}</username>
      <password>{password_escaped}</password>
      <tpn>{tpn_escaped}</tpn>
    </TerminalInfo>'''
    return create_soap_envelope(body)


def parse_get_terminals_response(xml_response: str) -> List[str]:
    """Parse Get_Terminals SOAP response and extract TPN list"""
    try:
        logger.info(f"Parsing SOAP response (length: {len(xml_response)} chars)")
        root = ET.fromstring(xml_response)
        
        # Register namespaces
        namespaces = {
            'soap': SOAP_NS,
            'tempuri': TEMPURI_NS,
            'diffgr': DIFFGR_NS
        }
        
        # Try different XPath patterns to find TPNs
        tpns = []
        
        # Pattern 1: diffgr:Table/tpn (original)
        for tpn_elem in root.findall('.//diffgr:Table/tpn', namespaces):
            if tpn_elem.text:
                tpns.append(tpn_elem.text.strip())
        
        # Pattern 2: Try without namespace prefix
        if not tpns:
            logger.info("Trying alternative XPath patterns...")
            for tpn_elem in root.findall('.//Table/tpn'):
                if tpn_elem.text:
                    tpns.append(tpn_elem.text.strip())
        
        # Pattern 3: Try finding all tpn elements anywhere
        if not tpns:
            logger.info("Trying to find all tpn elements...")
            for tpn_elem in root.findall('.//tpn'):
                if tpn_elem.text:
                    tpns.append(tpn_elem.text.strip())
        
        logger.info(f"Parsed {len(tpns)} TPNs from SOAP response")
        if len(tpns) == 0:
            logger.warning("No TPNs found in response. Full response structure:")
            # Log the structure of the XML
            for elem in root.iter():
                logger.warning(f"Element: {elem.tag}, Text: {elem.text[:50] if elem.text else 'None'}")
        
        return tpns
    except ET.ParseError as e:
        logger.error(f"XML Parse error: {e}")
        logger.error(f"Response XML (first 2000 chars): {xml_response[:2000]}")
        raise
    except Exception as e:
        logger.error(f"Error parsing Get_Terminals response: {e}", exc_info=True)
        logger.error(f"Response XML (first 2000 chars): {xml_response[:2000]}")
        raise


def parse_terminal_info_response(xml_response: str) -> Optional[Dict]:
    """Parse TerminalInfo SOAP response and extract all terminal information"""
    try:
        root = ET.fromstring(xml_response)
        
        # Register namespaces
        namespaces = {
            'soap': SOAP_NS,
            'tempuri': TEMPURI_NS,
            'diffgr': DIFFGR_NS
        }
        
        # Find the Table element
        table_elem = root.find('.//diffgr:Table', namespaces)
        if table_elem is None:
            # Try without namespace
            table_elem = root.find('.//Table')
        
        if table_elem is None:
            logger.warning("No Table element found in TerminalInfo response")
            return None
        
        # Extract all fields
        info = {}
        
        def get_text(elem, tag):
            """Helper to get text from element, trying with and without namespace"""
            child = elem.find(f'diffgr:{tag}', namespaces)
            if child is None:
                child = elem.find(tag)
            if child is not None and child.text:
                return child.text.strip()
            return None
        
        info['ProfileID'] = get_text(table_elem, 'ProfileID')
        if info['ProfileID']:
            try:
                info['ProfileID'] = int(info['ProfileID'])
            except ValueError:
                pass
        
        info['Description'] = get_text(table_elem, 'Description')
        info['HardwareName'] = get_text(table_elem, 'HardwareName')
        info['LastDownload'] = get_text(table_elem, 'LastDownload')
        info['LastSuccessUpdate'] = get_text(table_elem, 'LastSuccessUpdate')
        info['UpdateStatus'] = get_text(table_elem, 'UpdateStatus')
        info['Status'] = get_text(table_elem, 'Status')
        info['TPN'] = get_text(table_elem, 'TPN')
        
        return info if info.get('ProfileID') else None
    except Exception as e:
        logger.error(f"Error parsing TerminalInfo response: {e}", exc_info=True)
        logger.error(f"Response XML (first 2000 chars): {xml_response[:2000]}")
        return None


async def get_terminals_from_steam(
    soap_url: str,
    username: str,
    password: str,
    company_id: str,
    timeout: int = 60
) -> List[str]:
    """
    Get list of TPNs from STEAM via SOAP
    Returns list of TPN strings
    """
    try:
        request_body = create_get_terminals_request(username, password, company_id)
        
        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": f"{TEMPURI_NS}Get_Terminals"
        }
        
        logger.info(f"Calling STEAM SOAP endpoint: {soap_url}")
        logger.info(f"Headers: {headers}")
        logger.info(f"Full SOAP Request Body:\n{request_body}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(soap_url, content=request_body, headers=headers)
            
            logger.info(f"SOAP Response status: {response.status_code}")
            logger.info(f"SOAP Response headers: {dict(response.headers)}")
            logger.info(f"Full SOAP Response Body:\n{response.text}")
            
            if response.status_code == 404:
                error_msg = (
                    f"SOAP endpoint not found (404): {soap_url}\n"
                    f"Please verify the 'soap_url' in config.json is correct.\n"
                    f"Common endpoints might be:\n"
                    f"  - https://dvmms.com/steam/WebService.asmx\n"
                    f"  - https://dvmms.com/steam/Service.asmx\n"
                    f"  - https://dvmms.com/steam/api/webservice.asmx"
                )
                logger.error(error_msg)
                raise HTTPException(status_code=404, detail=error_msg)
            
            response.raise_for_status()
            
            tpns = parse_get_terminals_response(response.text)
            logger.info(f"Parsed {len(tpns)} TPNs from response")
            return tpns
            
    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        error_msg = f"HTTP {e.response.status_code} error getting terminals from STEAM: {e.response.text[:200]}"
        logger.error(error_msg)
        raise HTTPException(status_code=e.response.status_code, detail=error_msg)
    except httpx.HTTPError as e:
        logger.error(f"HTTP error getting terminals from STEAM: {e}")
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
    except Exception as e:
        logger.error(f"Error getting terminals from STEAM: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


async def get_terminal_info(
    soap_url: str,
    username: str,
    password: str,
    tpn: str,
    timeout: int = 30
) -> Optional[Dict]:
    """
    Get full TerminalInfo for a specific TPN from STEAM via SOAP
    Returns dict with ProfileID, Description, HardwareName, LastDownload, LastSuccessUpdate, UpdateStatus
    or None if not found
    """
    try:
        request_body = create_terminal_info_request(username, password, tpn)
        
        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": f"{TEMPURI_NS}TerminalInfo"
        }
        
        logger.info(f"Fetching TerminalInfo for TPN: {tpn}")
        logger.debug(f"SOAP Request: {request_body}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(soap_url, content=request_body, headers=headers)
            response.raise_for_status()
            
            logger.debug(f"SOAP Response status: {response.status_code}")
            logger.debug(f"SOAP Response: {response.text[:1000]}...")
            
            terminal_info = parse_terminal_info_response(response.text)
            return terminal_info
            
    except httpx.HTTPError as e:
        logger.warning(f"HTTP error getting TerminalInfo for TPN {tpn}: {e}")
        return None
    except Exception as e:
        logger.warning(f"Error getting TerminalInfo for TPN {tpn}: {e}", exc_info=True)
        return None
