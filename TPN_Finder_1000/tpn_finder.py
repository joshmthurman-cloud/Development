#!/usr/bin/env python3
"""
TPN Finder - Queries terminal status and records TPNs that return "Online"
"""

import requests
import time
import random
import string
from typing import List, Optional
import argparse
import json
from datetime import datetime


def generate_alphanumeric(length: int) -> str:
    """Generate a random alphanumeric string of given length."""
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for _ in range(length))


def check_tpn_status(tpn: str, timeout: int = 5) -> Optional[str]:
    """
    Check the status of a TPN by querying the API.
    Returns the status string or None if request fails.
    """
    url = f"https://spinpos.net/spin/GetTerminalStatus?tpn={tpn}"
    
    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        status = response.text.strip()
        return status
    except requests.exceptions.RequestException as e:
        print(f"Error checking TPN {tpn}: {e}")
        return None


def check_tpns_from_list(tpn_list: List[str], output_file: str = "online_tpns.txt", delay: float = 0.1):
    """
    Check a list of TPNs and record those that return "Online".
    
    Args:
        tpn_list: List of TPN strings to check
        output_file: File to write online TPNs to
        delay: Delay between requests in seconds
    """
    online_tpns = []
    total = len(tpn_list)
    
    print(f"Checking {total} TPNs...")
    
    for i, tpn in enumerate(tpn_list, 1):
        print(f"[{i}/{total}] Checking TPN: {tpn}", end=" ... ")
        
        status = check_tpn_status(tpn)
        
        if status == "Online":
            online_tpns.append(tpn)
            print(f"✓ ONLINE")
            # Write immediately to file
            with open(output_file, 'a') as f:
                f.write(f"{tpn}\n")
        elif status:
            print(f"Status: {status}")
        else:
            print(f"Failed/No response")
        
        # Small delay to avoid overwhelming the server
        if i < total:
            time.sleep(delay)
    
    print(f"\n✓ Found {len(online_tpns)} online TPNs")
    print(f"✓ Results saved to {output_file}")
    return online_tpns


def generate_and_check_random(length: int, count: int, output_file: str = "online_tpns.txt", delay: float = 0.1):
    """
    Generate random TPNs and check their status.
    
    Args:
        length: Length of TPN (10-12)
        count: Number of random TPNs to generate and check
        output_file: File to write online TPNs to
        delay: Delay between requests in seconds
    """
    if not (10 <= length <= 12):
        raise ValueError("TPN length must be between 10 and 12")
    
    print(f"Generating {count} random {length}-digit alphanumeric TPNs...")
    
    # Use a set to avoid duplicates
    checked_tpns = set()
    tpn_list = []
    
    while len(tpn_list) < count:
        tpn = generate_alphanumeric(length)
        if tpn not in checked_tpns:
            checked_tpns.add(tpn)
            tpn_list.append(tpn)
    
    return check_tpns_from_list(tpn_list, output_file, delay)


def check_tpns_from_file(input_file: str, output_file: str = "online_tpns.txt", delay: float = 0.1):
    """
    Read TPNs from a file (one per line) and check their status.
    
    Args:
        input_file: File containing TPNs (one per line)
        output_file: File to write online TPNs to
        delay: Delay between requests in seconds
    """
    try:
        with open(input_file, 'r') as f:
            tpn_list = [line.strip() for line in f if line.strip()]
        
        if not tpn_list:
            print(f"No TPNs found in {input_file}")
            return []
        
        return check_tpns_from_list(tpn_list, output_file, delay)
    except FileNotFoundError:
        print(f"Error: File {input_file} not found")
        return []


def main():
    parser = argparse.ArgumentParser(
        description="TPN Finder - Find TPNs that return 'Online' status"
    )
    
    parser.add_argument(
        '--input-file',
        type=str,
        help='Input file containing TPNs to check (one per line)'
    )
    
    parser.add_argument(
        '--random',
        type=int,
        metavar='COUNT',
        help='Generate and check N random TPNs'
    )
    
    parser.add_argument(
        '--length',
        type=int,
        default=10,
        choices=[10, 11, 12],
        help='Length of TPN for random generation (default: 10)'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        default='online_tpns.txt',
        help='Output file for online TPNs (default: online_tpns.txt)'
    )
    
    parser.add_argument(
        '--delay',
        type=float,
        default=0.1,
        help='Delay between requests in seconds (default: 0.1)'
    )
    
    parser.add_argument(
        '--tpns',
        nargs='+',
        help='Check specific TPNs provided as arguments'
    )
    
    args = parser.parse_args()
    
    # Clear output file at start
    with open(args.output, 'w') as f:
        f.write(f"# Online TPNs found - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    if args.input_file:
        check_tpns_from_file(args.input_file, args.output, args.delay)
    elif args.random:
        generate_and_check_random(args.length, args.random, args.output, args.delay)
    elif args.tpns:
        check_tpns_from_list(args.tpns, args.output, args.delay)
    else:
        parser.print_help()
        print("\nExample usage:")
        print("  python tpn_finder.py --random 100 --length 10")
        print("  python tpn_finder.py --input-file tpns.txt")
        print("  python tpn_finder.py --tpns ABC1234567 XYZ9876543")


if __name__ == "__main__":
    main()
