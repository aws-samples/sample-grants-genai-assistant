"""
EU Grants Cache Downloader
Downloads 100MB EU grants file and stores in S3 for fast access
Triggered nightly by EventBridge
"""

import json
import boto3
import requests
from datetime import datetime
import os

# AWS_REGION is automatically set by Lambda runtime (reserved variable)
region = os.environ['AWS_REGION']
s3 = boto3.client('s3', region_name=region)

EU_GRANTS_URL = "https://ec.europa.eu/info/funding-tenders/opportunities/data/referenceData/grantsTenders.json"

def handler(event, context):
    """Download EU grants and cache in S3"""
    
    print("🔄 Starting EU grants cache download...")
    print(f"🌍 Region: {region}")
    
    # Get bucket name from environment (fail fast if not set)
    bucket_name = os.environ['EU_GRANTS_BUCKET']
    print(f"🪣 Target bucket: {bucket_name}")
    
    try:
        # Download from EU API
        print(f"📥 Downloading from {EU_GRANTS_URL}...")
        download_start = datetime.now()
        
        response = requests.get(EU_GRANTS_URL, timeout=120)
        response.raise_for_status()
        
        download_time = (datetime.now() - download_start).total_seconds()
        file_size_mb = len(response.content) / (1024 * 1024)
        
        print(f"✅ Downloaded {file_size_mb:.1f} MB in {download_time:.1f}s")
        
        # Parse to validate
        data = response.json()
        grants = data.get('fundingData', {}).get('GrantTenderObj', [])
        grant_count = len(grants)
        
        print(f"📊 Validated {grant_count:,} grants")
        
        # Upload to S3
        print(f"☁️ Uploading to S3: {bucket_name}/eu_grants_latest.json")
        
        s3.put_object(
            Bucket=bucket_name,
            Key='eu_grants_latest.json',
            Body=response.content,
            ContentType='application/json',
            Metadata={
                'download_time': datetime.now().isoformat(),
                'grant_count': str(grant_count),
                'file_size_mb': f"{file_size_mb:.1f}",
                'download_duration_seconds': f"{download_time:.1f}"
            }
        )
        
        print(f"✅ Cache updated successfully")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'grant_count': grant_count,
                'file_size_mb': round(file_size_mb, 1),
                'download_time_seconds': round(download_time, 1),
                'timestamp': datetime.now().isoformat()
            })
        }
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Download failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Download failed',
                'message': str(e)
            })
        }
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Processing failed',
                'message': str(e)
            })
        }
