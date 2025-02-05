import requests
from pathlib import Path

def test_request_timeout():
    # Mock the API endpoints and keys
    libraries_base_url = "https://libraries.io/api/"
    platform_type = "npm"
    name = "test-package"
    api_key = "test-key"
    
    # Test case 1: Libraries.io API call (Line ~182)
    try:
        url = f"{libraries_base_url}{platform_type}/{name}?api_key={api_key}"
        print(f"Testing request without timeout to: {url}")
        response = requests.get(url)  # No timeout set - vulnerable
        print("Request completed without timeout")
    except Exception as e:
        print(f"Error occurred: {e}")
    
    # Test case 2: GitHub API call (Line ~203)
    try:
        compare_url = "https://api.github.com/repos/owner/repo/compare/"
        vuln_version = "1.0.0"
        fixed_version = "1.0.1"
        headers = {"Accept": "application/vnd.github.diff", "Authorization": "Bearer test-token"}
        print(f"\nTesting request without timeout to GitHub API")
        response = requests.get(compare_url + vuln_version + "..." + fixed_version, headers=headers)  # No timeout set - vulnerable
        print("Request completed without timeout")
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    test_request_timeout()