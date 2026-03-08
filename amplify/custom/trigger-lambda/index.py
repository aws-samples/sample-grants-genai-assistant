import boto3
import json
import time
import os
import urllib3

# cfnresponse helper (inline to avoid import issues during bundling)
SUCCESS = "SUCCESS"
FAILED = "FAILED"

def send(event, context, responseStatus, responseData, physicalResourceId=None, noEcho=False, reason=None):
    responseUrl = event["ResponseURL"]
    responseBody = {
        "Status": responseStatus,
        "Reason": reason or f"See CloudWatch Log Stream: {context.log_stream_name}",
        "PhysicalResourceId": physicalResourceId or context.log_stream_name,
        "StackId": event["StackId"],
        "RequestId": event["RequestId"],
        "LogicalResourceId": event["LogicalResourceId"],
        "NoEcho": noEcho,
        "Data": responseData
    }
    json_responseBody = json.dumps(responseBody)
    headers = {"content-type": "", "content-length": str(len(json_responseBody))}
    http = urllib3.PoolManager()
    try:
        http.request("PUT", responseUrl, headers=headers, body=json_responseBody)
    except Exception as e:
        print(f"send(..) failed executing http.request(..): {e}")

s3 = boto3.client("s3")
codebuild = boto3.client("codebuild")

def upload_directory(local_dir, bucket, s3_prefix):
    """Upload directory to S3, excluding certain files/folders"""
    exclude = ["node_modules", "build", ".git", ".DS_Store"]
    count = 0
    for root, dirs, files in os.walk(local_dir):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if d not in exclude]
        for file in files:
            if file.endswith(".log") or file in exclude:
                continue
            local_path = os.path.join(root, file)
            rel_path = os.path.relpath(local_path, local_dir)
            s3_key = f"{s3_prefix}{rel_path}"
            s3.upload_file(local_path, bucket, s3_key)
            count += 1
            if count <= 5:
                print(f"   Uploaded: {s3_key}")
    return count

def handler(event, context):
    print(f"Event: {json.dumps(event)}")
    try:
        if event["RequestType"] in ["Create", "Update"]:
            project_name = event["ResourceProperties"]["ProjectName"]
            bucket = event["ResourceProperties"]["BucketName"]
            
            print(f"📦 Uploading files to S3 bucket: {bucket}")
            print(f"   Lambda task directory: /var/task/")
            print(f"   Contents:")
            for item in os.listdir("/var/task/"):
                print(f"     - {item}")
            print("")
            
            # Upload react-aws directory
            react_dir = "/var/task/react-aws"
            if os.path.exists(react_dir):
                print(f"✅ Found react-aws directory at {react_dir}")
                # Check for package.json
                package_json = os.path.join(react_dir, "package.json")
                if os.path.exists(package_json):
                    print(f"✅ package.json exists in react-aws")
                else:
                    print(f"❌ WARNING: package.json NOT FOUND in react-aws")
                
                count = upload_directory(react_dir, bucket, "react-aws-source/")
                print(f"✅ Uploaded {count} files from react-aws/ to s3://{bucket}/react-aws-source/")
            else:
                print(f"❌ react-aws not found at {react_dir}")
                raise Exception("react-aws directory not found")
            
            # Check if amplify_outputs.json exists in S3 (uploaded by deployment script)
            # NOTE: The deployment script (deploy-grow2-bootstrap.sh) uploads this AFTER npx ampx sandbox completes
            print(f"🔍 Checking for amplify_outputs.json in S3...")
            try:
                obj = s3.head_object(Bucket=bucket, Key="deployment-artifacts/amplify_outputs.json")
                print(f"✅ Found amplify_outputs.json in S3 (size: {obj['ContentLength']} bytes)")
                print(f"   Uploaded by deployment script after npx ampx sandbox completed")
            except Exception as e:
                print(f"⚠️  amplify_outputs.json NOT found in S3: {e}")
                print(f"   This will cause the React build to fail!")
                print(f"   The deployment script should upload it AFTER npx ampx sandbox completes")
                raise Exception("amplify_outputs.json not found in S3 - deployment script must upload it first")
            
            print("")
            print(f"🚀 Starting CodeBuild project: {project_name}")
            
            # Start CodeBuild
            response = codebuild.start_build(projectName=project_name)
            build_id = response["build"]["id"]
            print(f"✅ CodeBuild started: {build_id}")
            
            # Wait for CodeBuild to complete
            while True:
                build_info = codebuild.batch_get_builds(ids=[build_id])
                status = build_info["builds"][0]["buildStatus"]
                print(f"   Build status: {status}")
                
                if status == "SUCCEEDED":
                    print(f"✅ Build succeeded!")
                    send(event, context, SUCCESS, {"BuildId": build_id})
                    return
                elif status in ["FAILED", "FAULT", "TIMED_OUT", "STOPPED"]:
                    print(f"❌ Build {status}")
                    send(event, context, FAILED, {"Error": f"Build {status}"})
                    return
                
                # nosemgrep: arbitrary-sleep - Intentional: CloudFormation custom resource polling for CodeBuild completion
                time.sleep(10)
        else:
            # Delete event
            send(event, context, SUCCESS, {})
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        send(event, context, FAILED, {"Error": str(e)})
