#!/usr/bin/env python3
"""
Import production Bedrock prompts from JSON files to target region.

This script imports the 10 production prompts from config/bedrock-prompts/
into the target AWS region's Bedrock Prompt Management.

Used by CodeBuild during deployment to seed prompts automatically.
"""

import boto3
import json
import os
import sys

def import_prompts(target_region):
    """Import all prompts from JSON files to target region"""
    print("=" * 80)
    print("IMPORTING BEDROCK PROMPTS")
    print("=" * 80)
    print(f"\nTarget Region: {target_region}")
    print("")
    
    bedrock = boto3.client('bedrock-agent', region_name=target_region)
    
    # Read manifest
    prompts_dir = 'config/bedrock-prompts'
    manifest_file = f"{prompts_dir}/manifest.json"
    
    if not os.path.exists(manifest_file):
        print(f"❌ Manifest not found: {manifest_file}")
        print("   Run python/export_bedrock_prompts.py first")
        return False
    
    with open(manifest_file, 'r') as f:
        manifest = json.load(f)
    
    print(f"📋 Manifest loaded:")
    print(f"   Exported from: {manifest['source_region']}")
    print(f"   Exported at: {manifest['exported_at']}")
    print(f"   Prompts to import: {len(manifest['prompts'])}")
    print("")
    
    # List existing prompts in target region
    print("🔍 Checking existing prompts in target region...")
    response = bedrock.list_prompts(maxResults=100)
    existing_prompts = {p['name']: p['id'] for p in response.get('promptSummaries', [])}
    print(f"   Found {len(existing_prompts)} existing prompts")
    print("")
    
    imported = []
    updated = []
    failed = []
    
    for prompt_name in manifest['prompts']:
        json_file = f"{prompts_dir}/{prompt_name}.json"
        
        if not os.path.exists(json_file):
            print(f"❌ MISSING FILE: {json_file}")
            failed.append(prompt_name)
            continue
        
        try:
            # Load prompt data
            with open(json_file, 'r') as f:
                prompt_data = json.load(f)
            
            # Check if prompt already exists
            if prompt_name in existing_prompts:
                print(f"🔄 UPDATING: {prompt_name}")
                prompt_id = existing_prompts[prompt_name]
                
                # Update existing prompt
                bedrock.update_prompt(
                    promptIdentifier=prompt_id,
                    name=prompt_data['name'],
                    description=prompt_data.get('description', ''),
                    variants=[{
                        'name': v['name'],
                        'templateType': v['templateType'],
                        'templateConfiguration': {
                            'text': {
                                'text': v['text']
                            }
                        },
                        **(
                            {'inferenceConfiguration': v['inferenceConfiguration']}
                            if 'inferenceConfiguration' in v
                            else {}
                        )
                    } for v in prompt_data['variants']]
                )
                
                print(f"   ✅ Updated: {prompt_id}")
                updated.append(prompt_name)
                
            else:
                print(f"📥 CREATING: {prompt_name}")
                
                # Create new prompt
                response = bedrock.create_prompt(
                    name=prompt_data['name'],
                    description=prompt_data.get('description', ''),
                    variants=[{
                        'name': v['name'],
                        'templateType': v['templateType'],
                        'templateConfiguration': {
                            'text': {
                                'text': v['text']
                            }
                        },
                        **(
                            {'inferenceConfiguration': v['inferenceConfiguration']}
                            if 'inferenceConfiguration' in v
                            else {}
                        )
                    } for v in prompt_data['variants']]
                )
                
                prompt_id = response['id']
                print(f"   ✅ Created: {prompt_id}")
                imported.append(prompt_name)
            
            print("")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            print("")
            failed.append(prompt_name)
    
    # Summary
    print("=" * 80)
    print("IMPORT SUMMARY")
    print("=" * 80)
    
    if imported:
        print(f"\n✅ Created: {len(imported)} prompts")
        for name in imported:
            print(f"   - {name}")
    
    if updated:
        print(f"\n🔄 Updated: {len(updated)} prompts")
        for name in updated:
            print(f"   - {name}")
    
    if failed:
        print(f"\n❌ Failed: {len(failed)} prompts")
        for name in failed:
            print(f"   - {name}")
    
    print("")
    total_success = len(imported) + len(updated)
    print(f"📊 Total: {total_success}/{len(manifest['prompts'])} prompts successfully imported")
    print("")
    
    return len(failed) == 0

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python import_bedrock_prompts.py <target-region>")
        print("Example: python import_bedrock_prompts.py us-east-1")
        sys.exit(1)
    
    target_region = sys.argv[1]
    success = import_prompts(target_region)
    sys.exit(0 if success else 1)
