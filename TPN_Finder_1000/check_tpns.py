"""
Simple TPN Checker - Checks TPNs sequentially and saves all responses
Run from cmd: python check_tpns.py
"""

import requests
import time
import string
from datetime import datetime
import itertools


def generate_sequential_tpns(length, start_tpn=None, count=None):
    """
    Generate TPNs sequentially in alphanumeric order.
    
    Args:
        length: Length of TPN (10-12)
        start_tpn: Starting TPN (optional, defaults to all zeros)
        count: Number of TPNs to generate (optional, can run indefinitely)
    """
    chars = string.ascii_uppercase + string.digits  # A-Z, 0-9
    
    if start_tpn:
        # Start from the given TPN
        current = list(start_tpn.upper())
        # Validate all characters are in our charset
        if not all(c in chars for c in current):
            raise ValueError(f"Start TPN contains invalid characters. Use only A-Z and 0-9")
    else:
        # Start from all zeros
        current = ['0'] * length
    
    generated = 0
    
    while True:
        if count and generated >= count:
            break
        
        yield ''.join(current)
        generated += 1
        
        # Increment to next TPN (like counting: 0000 -> 0001 -> ... -> 0009 -> 000A -> ... -> 000Z -> 0010)
        i = length - 1
        while i >= 0:
            try:
                char_idx = chars.index(current[i])
            except ValueError:
                # Invalid character, reset to '0'
                current[i] = '0'
                char_idx = 0
            
            if char_idx < len(chars) - 1:
                current[i] = chars[char_idx + 1]
                break
            else:
                current[i] = chars[0]
                i -= 1
        else:
            # Reached the end (all Z's)
            break


def check_tpn(tpn):
    """Check a single TPN and return the status."""
    url = f"https://spinpos.net/spin/GetTerminalStatus?tpn={tpn}"
    
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        status = response.text.strip()
        return status
    except Exception as e:
        return f"ERROR: {str(e)}"


def main():
    print("=" * 60)
    print("TPN Status Checker")
    print("=" * 60)
    print()
    
    # Get parameters
    try:
        length = input("TPN length (10-12) [default: 10]: ").strip()
        length = int(length) if length else 10
        if not (10 <= length <= 12):
            print("Invalid length. Using 10.")
            length = 10
    except ValueError:
        length = 10
    
    start_tpn = input(f"Starting TPN (leave empty to start from {'0'*length}): ").strip()
    if start_tpn and len(start_tpn) != length:
        print(f"Invalid length. Starting from {'0'*length}")
        start_tpn = None
    
    try:
        count_input = input("Number of TPNs to check (leave empty for continuous): ").strip()
        count = int(count_input) if count_input else None
    except ValueError:
        count = None
    
    try:
        delay = input("Delay between checks in seconds [default: 0.1]: ").strip()
        delay = float(delay) if delay else 0.1
    except ValueError:
        delay = 0.1
    
    output_file = "tpn_results.txt"
    
    print()
    print(f"Starting check...")
    print(f"Length: {length}")
    print(f"Start TPN: {start_tpn or ('0'*length)}")
    print(f"Count: {count or 'Continuous'}")
    print(f"Delay: {delay}s")
    print(f"Output file: {output_file}")
    print("=" * 60)
    print()
    
    # Initialize output file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"TPN Status Check Results\n")
        f.write(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"TPN Length: {length}\n")
        f.write(f"Start TPN: {start_tpn or ('0'*length)}\n")
        f.write(f"{'='*60}\n\n")
        f.write(f"{'TPN':<15} {'Status':<20}\n")
        f.write(f"{'-'*60}\n")
    
    checked = 0
    online_count = 0
    
    try:
        for tpn in generate_sequential_tpns(length, start_tpn, count):
            status = check_tpn(tpn)
            checked += 1
            
            # Print to console
            status_display = status[:50]  # Truncate long errors
            print(f"[{checked}] {tpn:<15} {status_display}")
            
            # Save to file
            with open(output_file, 'a', encoding='utf-8') as f:
                f.write(f"{tpn:<15} {status}\n")
            
            # Count online
            if status == "Online":
                online_count += 1
                print(f"  *** ONLINE FOUND! Total: {online_count} ***")
                # Also save to separate file
                with open("online_tpns.txt", 'a', encoding='utf-8') as f:
                    f.write(f"{tpn}\n")
            
            if delay > 0:
                time.sleep(delay)
    
    except KeyboardInterrupt:
        print("\n\nStopped by user.")
    
    print()
    print("=" * 60)
    print(f"Check complete!")
    print(f"Total checked: {checked}")
    print(f"Online found: {online_count}")
    print(f"Results saved to: {output_file}")
    if online_count > 0:
        print(f"Online TPNs also saved to: online_tpns.txt")
    print("=" * 60)


if __name__ == "__main__":
    main()
