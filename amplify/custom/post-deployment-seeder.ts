import { Stack, Duration, CfnOutput, CustomResource, RemovalPolicy, Fn } from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import { Construct } from 'constructs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PostDeploymentSeederProps {
    // DynamoDB Tables
    userPoolId: string;
    userPoolClientId: string;
    userProfileTableName: string;
    agentConfigTableName: string;
    grantRecordTableName: string;
    euGrantRecordTableName: string;
    proposalTableName: string;
    documentMetadataTableName: string;

    // S3 Buckets
    deploymentAssetsBucketName: string; // Renamed from euCacheBucketName - used for both EU cache and react-aws source
    proposalsBucketName: string;
    documentBucketName: string;

    // Lambda Functions
    euCacheDownloaderFunctionName: string;

    // Step Function
    agentDiscoveryStepFunctionArn: string;

    // AppSync
    graphqlApiId: string;

    // Knowledge Base
    knowledgeBaseId: string;

    // Region
    region: string;
}

export class PostDeploymentSeeder extends Construct {
    public readonly buildProject: codebuild.Project;
    public readonly buildRole: iam.Role;
    public readonly amplifyApp: amplify.CfnApp;
    public readonly deploymentAssetsBucket: s3.IBucket;

    constructor(scope: Construct, id: string, props: PostDeploymentSeederProps) {
        super(scope, id);

        // Reference existing deployment assets bucket (created elsewhere, used for EU cache)
        this.deploymentAssetsBucket = s3.Bucket.fromBucketName(
            this,
            'DeploymentAssetsBucket',
            props.deploymentAssetsBucketName
        );

        // Create Amplify Hosting App
        this.amplifyApp = new amplify.CfnApp(this, 'AmplifyApp', {
            name: `${Stack.of(this).stackName}-grow2-app`,
            description: 'Grow2 Grant Platform - React Application',
            platform: 'WEB',
            customRules: [
                {
                    source: '/<*>',
                    target: '/index.html',
                    status: '404-200',
                },
            ],
        });

        // Create IAM role for CodeBuild
        this.buildRole = new iam.Role(this, 'BuildRole', {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
            description: 'Role for post-deployment seeding and Amplify deployment CodeBuild project',
        });

        const region = Stack.of(this).region;
        const account = Stack.of(this).account;

        // SECURITY FIX: Scope all permissions to specific resources (no wildcards)

        // Cognito permissions - scoped to specific user pool
        this.buildRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    'cognito-idp:AdminCreateUser',
                    'cognito-idp:AdminSetUserPassword',
                    'cognito-idp:AdminInitiateAuth',
                    'cognito-idp:AdminGetUser',
                    'cognito-idp:ListUsers',
                ],
                resources: [`arn:aws:cognito-idp:${region}:${account}:userpool/${props.userPoolId}`],
            })
        );

        // DynamoDB permissions - scoped to specific tables
        this.buildRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    'dynamodb:PutItem',
                    'dynamodb:GetItem',
                    'dynamodb:Query',
                    'dynamodb:Scan',
                    'dynamodb:UpdateItem',
                ],
                resources: [
                    `arn:aws:dynamodb:${region}:${account}:table/${props.userProfileTableName}`,
                    `arn:aws:dynamodb:${region}:${account}:table/${props.agentConfigTableName}`,
                    `arn:aws:dynamodb:${region}:${account}:table/${props.grantRecordTableName}`,
                    `arn:aws:dynamodb:${region}:${account}:table/${props.euGrantRecordTableName}`,
                    `arn:aws:dynamodb:${region}:${account}:table/${props.proposalTableName}`,
                    `arn:aws:dynamodb:${region}:${account}:table/${props.documentMetadataTableName}`,
                ],
            })
        );

        // Lambda permissions - scoped to specific function
        this.buildRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    'lambda:InvokeFunction',
                    'lambda:GetFunction',
                ],
                resources: [`arn:aws:lambda:${region}:${account}:function:${props.euCacheDownloaderFunctionName}`],
            })
        );

        // Step Functions permissions - StartExecution scoped to state machine ARN
        this.buildRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ['states:StartExecution'],
                resources: [props.agentDiscoveryStepFunctionArn],
            })
        );

        // DescribeExecution/GetExecutionHistory require execution ARN (different resource type).
        // Execution ARNs are arn:aws:states:<region>:<account>:execution:<name>:<uuid>
        // props.agentDiscoveryStepFunctionArn is a CDK token — cannot use .replace() or template literals on it.
        // Use Fn.join to build the full execution ARN wildcard from parts.
        // State machine ARN format: arn:aws:states:<region>:<account>:stateMachine:<name>
        // Execution ARN format:     arn:aws:states:<region>:<account>:execution:<name>:*
        const smArn = props.agentDiscoveryStepFunctionArn;
        const stateMachineName = Fn.select(6, Fn.split(':', smArn));
        const executionArnWildcard = Fn.join(':', [
            'arn', 'aws', 'states', region, account, 'execution', stateMachineName, '*'
        ]);
        this.buildRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    'states:DescribeExecution',
                    'states:GetExecutionHistory',
                ],
                resources: [executionArnWildcard],
            })
        );

        // S3 permissions - scoped to specific buckets with /* for objects
        this.buildRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ['s3:ListBucket'],
                resources: [
                    `arn:aws:s3:::${props.deploymentAssetsBucketName}`,
                    `arn:aws:s3:::${props.proposalsBucketName}`,
                    `arn:aws:s3:::${props.documentBucketName}`,
                ],
            })
        );

        this.buildRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ['s3:GetObject', 's3:PutObject'],
                resources: [
                    `arn:aws:s3:::${props.deploymentAssetsBucketName}/*`,
                    `arn:aws:s3:::${props.proposalsBucketName}/*`,
                    `arn:aws:s3:::${props.documentBucketName}/*`,
                ],
            })
        );

        // AppSync permissions - scoped to specific API
        this.buildRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    'appsync:GetGraphqlApi',
                    'appsync:ListApiKeys',
                ],
                resources: [`arn:aws:appsync:${region}:${account}:apis/${props.graphqlApiId}`],
            })
        );

        // Bedrock Knowledge Base permissions - scoped to specific KB
        this.buildRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    'bedrock:GetKnowledgeBase',
                    'bedrock:ListKnowledgeBases',
                ],
                resources: [`arn:aws:bedrock:${region}:${account}:knowledge-base/${props.knowledgeBaseId}`],
            })
        );

        // Amplify permissions - scoped to specific app
        this.buildRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    'amplify:ListBranches',
                    'amplify:CreateDeployment',
                    'amplify:StartDeployment',
                    'amplify:GetApp',
                    'amplify:GetBranch',
                    'amplify:CreateBranch',
                    'amplify:UpdateBranch',
                ],
                resources: [
                    `arn:aws:amplify:${region}:${account}:apps/${this.amplifyApp.attrAppId}`,
                    `arn:aws:amplify:${region}:${account}:apps/${this.amplifyApp.attrAppId}/branches/*`,
                ],
            })
        );

        // CloudFormation permissions - scoped to account/region
        this.buildRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    'cloudformation:DescribeStacks',
                    'cloudformation:ListExports',
                ],
                resources: [`arn:aws:cloudformation:${region}:${account}:stack/*`],
            })
        );

        // CloudWatch Logs permissions - scoped to CodeBuild log groups
        this.buildRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                ],
                resources: [
                    `arn:aws:logs:${region}:${account}:log-group:/aws/codebuild/${Stack.of(this).stackName}-PostDeploymentSeeder`,
                    `arn:aws:logs:${region}:${account}:log-group:/aws/codebuild/${Stack.of(this).stackName}-PostDeploymentSeeder:*`,
                ],
            })
        );

        // SECURITY FIX: CB4 - Create KMS key for CodeBuild encryption
        const buildEncryptionKey = new kms.Key(this, 'BuildEncryptionKey', {
            description: 'KMS key for CodeBuild project encryption',
            enableKeyRotation: true,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        // Grant CodeBuild service permission to use the key
        buildEncryptionKey.grantEncryptDecrypt(this.buildRole);

        // Create CodeBuild project
        this.buildProject = new codebuild.Project(this, 'SeedingProject', {
            projectName: `grow2-seeder-${Stack.of(this).account}-${Stack.of(this).region}`,
            description: 'Automated post-deployment data seeding and Amplify Hosting deployment',
            role: this.buildRole,
            encryptionKey: buildEncryptionKey, // SECURITY FIX: CB4 - Use KMS encryption
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                computeType: codebuild.ComputeType.SMALL,
                privileged: false,
                environmentVariables: {
                    // Cognito
                    USER_POOL_ID: { value: props.userPoolId },
                    USER_POOL_CLIENT_ID: { value: props.userPoolClientId },

                    // DynamoDB Tables
                    USER_PROFILE_TABLE: { value: props.userProfileTableName },
                    AGENT_CONFIG_TABLE: { value: props.agentConfigTableName },
                    GRANT_RECORD_TABLE: { value: props.grantRecordTableName },
                    EU_GRANT_RECORD_TABLE: { value: props.euGrantRecordTableName },
                    PROPOSAL_TABLE: { value: props.proposalTableName },
                    DOCUMENT_METADATA_TABLE: { value: props.documentMetadataTableName },

                    // S3 Buckets
                    DEPLOYMENT_ASSETS_BUCKET: { value: props.deploymentAssetsBucketName },
                    EU_CACHE_BUCKET: { value: props.deploymentAssetsBucketName }, // Same bucket, for backward compat
                    PROPOSALS_BUCKET: { value: props.proposalsBucketName },
                    DOCUMENT_BUCKET: { value: props.documentBucketName },

                    // Lambda Functions
                    EU_CACHE_DOWNLOADER_FUNCTION: { value: props.euCacheDownloaderFunctionName },

                    // Step Function
                    AGENT_DISCOVERY_STATE_MACHINE_ARN: { value: props.agentDiscoveryStepFunctionArn },

                    // AppSync
                    GRAPHQL_API_ID: { value: props.graphqlApiId },

                    // Knowledge Base
                    KNOWLEDGE_BASE_ID: { value: props.knowledgeBaseId },

                    // Amplify
                    AMPLIFY_APP_ID: { value: this.amplifyApp.attrAppId },

                    // Region
                    AWS_REGION: { value: props.region },
                    AWS_DEFAULT_REGION: { value: props.region },
                },
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        'runtime-versions': {
                            python: '3.12',
                            nodejs: '20',
                        },
                        commands: [
                            'echo "Installing dependencies..."',
                            'pip install boto3 requests',
                            'npm install -g npm@latest',
                        ],
                    },
                    pre_build: {
                        commands: [
                            'echo "==================================="',
                            'echo "Phase 0: Download Artifacts"',
                            'echo "==================================="',
                            'echo ""',

                            // Wait for S3 cross-region replication (us-east-1 → other regions)
                            'echo "Waiting 10 seconds for S3 cross-region replication..."',
                            'sleep 10',
                            'echo "✅ S3 propagation delay complete"',
                            'echo ""',

                            // Download React source
                            'echo "Downloading react-aws source from S3..."',
                            'mkdir -p /tmp/react-aws',
                            'aws s3 sync s3://$DEPLOYMENT_ASSETS_BUCKET/react-aws-source/ /tmp/react-aws/ --region $AWS_REGION',
                            'echo "✅ React source downloaded"',
                            'echo ""',

                            // Download amplify_outputs.json
                            'echo "Downloading amplify_outputs.json..."',
                            'mkdir -p /tmp/react-aws/src',
                            'aws s3 cp s3://$DEPLOYMENT_ASSETS_BUCKET/codebuild-deploy/amplify_outputs.json /tmp/react-aws/src/amplify_outputs.json --region $AWS_REGION',
                            'echo "✅ amplify_outputs.json downloaded"',
                            'echo ""',

                            // Bedrock prompts are now created by BedrockPromptsStack (CDK)
                            // No longer need to download and import via CodeBuild script
                            'echo "Bedrock prompts created by CDK (BedrockPromptsStack)"',
                            'echo ""',

                            'echo "✅ Phase 0 Complete"',
                            'echo ""',
                        ],
                    },
                    build: {
                        commands: [
                            'echo "==================================="',
                            'echo "Phase 1: Data Seeding"',
                            'echo "==================================="',
                            'echo ""',

                            // Step 1: Create test user
                            'echo "Step 1: Creating test user..."',
                            `cat > /tmp/create_user.py << 'PYEOF'
import boto3
import os
import json
from datetime import datetime

cognito = boto3.client("cognito-idp", region_name=os.environ["AWS_REGION"])
dynamodb = boto3.resource("dynamodb", region_name=os.environ["AWS_REGION"])

USER_POOL_ID = os.environ["USER_POOL_ID"]
EMAIL = "test_user@example.com"
PASSWORD = "Password123!"

try:
    response = cognito.admin_create_user(
        UserPoolId=USER_POOL_ID,
        Username=EMAIL,
        UserAttributes=[{"Name": "email", "Value": EMAIL}, {"Name": "email_verified", "Value": "true"}],
        MessageAction="SUPPRESS"
    )
    user_id = response["User"]["Username"]
    print(f"✅ Created user: {user_id}")
    
    cognito.admin_set_user_password(
        UserPoolId=USER_POOL_ID,
        Username=EMAIL,
        Password=PASSWORD,
        Permanent=True
    )
    print(f"✅ Set password for user")
    
    with open("/tmp/user_id.txt", "w") as f:
        f.write(user_id)
except cognito.exceptions.UsernameExistsException:
    response = cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=EMAIL)
    user_id = response["Username"]
    print(f"⚠️  User already exists: {user_id}")
    with open("/tmp/user_id.txt", "w") as f:
        f.write(user_id)
except Exception as e:
    print(f"❌ Error creating user: {e}")
    exit(1)
PYEOF`,
                            'python3 /tmp/create_user.py',
                            '',
                            'export USER_ID=$(cat /tmp/user_id.txt)',
                            'echo "USER_ID=$USER_ID"',
                            'echo ""',

                            // Step 2: Create user profile
                            'echo "Step 2: Creating user profile..."',
                            `cat > /tmp/create_profile.py << 'PYEOF'
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource("dynamodb", region_name=os.environ["AWS_REGION"])
table = dynamodb.Table(os.environ["USER_PROFILE_TABLE"])

with open("/tmp/user_id.txt", "r") as f:
    user_id = f.read().strip()

# Check if profile already exists
try:
    response = table.get_item(Key={"id": user_id})
    if "Item" in response:
        print(f"⚠️  Profile already exists for user: {user_id}")
    else:
        raise KeyError("Profile not found")
except:
    # Profile does not exist, create it with COMPLETE Bayesian matching fields
    profile = {
        "id": user_id,
        "userId": user_id,
        "email": "test_user@example.com",
        "name": "Test User",
        "institution": "Test University",
        "department": "Computer Science",
        "position": "Associate Professor",
        "country": "USA",
        
        # CRITICAL: Bayesian matching fields
        "researcherType": "computer_science",
        "expertise_level": "expert",
        "early_investigator": "False",
        
        # Primary keywords (15% boost in Bayesian scoring)
        "keywords": [
            "artificial intelligence",
            "AI",
            "machine learning",
            "cybersecurity",
            "data science",
            "computer science",
            "deep learning",
            "neural networks",
            "autonomous systems",
            "robotics"
        ],
        
        # Secondary keywords (8% boost in Bayesian scoring)
        "optimized_keywords": [
            "knowledge graphs",
            "semantic reasoning",
            "reinforcement learning",
            "computer vision",
            "natural language processing",
            "threat detection",
            "data analytics",
            "machine intelligence",
            "cognitive computing",
            "intelligent systems"
        ],
        
        # Research areas
        "research_areas": [
            "Artificial Intelligence",
            "Machine Learning",
            "Cybersecurity",
            "Data Science",
            "Autonomous Systems"
        ],
        
        # Agencies (both US and EU for multi-region discovery)
        "agencies": ["NSF", "DOD", "DARPA", "NIH", "Horizon Europe", "Digital Europe Programme"],
        
        # Technical skills
        "tech_skills": ["Python", "TensorFlow", "PyTorch", "C++", "CUDA"],
        
        # Methodologies
        "methodologies": [
            "Deep learning",
            "Reinforcement learning",
            "Computer vision",
            "Natural language processing"
        ],
        
        # Interdisciplinary
        "interdisciplinary": ["Computer Science", "Electrical Engineering", "Mathematics"],
        
        # Preferences
        "budget_range": "500000-5000000",
        "collaboration_pref": "national",
        "duration_preference": "36-60_months",
        "geographic_scope": "north_america",
        
        # Grants.gov filters
        "grants_api": "grants.gov",
        "keyword_string": "artificial intelligence AI machine learning cybersecurity data science",
        "use_structured_filters": True,
        "grantsgov_filters": {
            "oppStatuses": "posted",
            "agencies": "DOD|NSF|DARPA",
            "eligibilities": "06|20",
            "fundingCategories": "ST",
            "fundingInstruments": "G",
            "keyword": "artificial intelligence OR machine learning OR cybersecurity OR data science"
        },
        
        # Metadata
        "isActive": True,
        "created_date": datetime.utcnow().isoformat() + "Z",
        "last_updated": datetime.utcnow().isoformat() + "Z",
        "orcid_id": "0000-0002-1234-5678",
        "preferred_languages": ["en"],
        "preferred_programs": ["darpa.mil", "sam.gov"],
        "submission_deadline": "180 days"
    }
    table.put_item(Item=profile)
    print(f"✅ Created profile for user: {user_id}")
    print(f"   - Researcher Type: {profile['researcherType']}")
    print(f"   - Primary Keywords: {len(profile['keywords'])} keywords")
    print(f"   - Secondary Keywords: {len(profile['optimized_keywords'])} keywords")
    print(f"   - Agencies: {', '.join(profile['agencies'])}")
PYEOF`,
                            'python3 /tmp/create_profile.py',
                            'echo ""',

                            // Step 3: Create agent config
                            'echo "Step 3: Creating agent config..."',
                            `cat > /tmp/create_config.py << 'PYEOF'
import boto3
import os
import uuid
from datetime import datetime

dynamodb = boto3.resource("dynamodb", region_name=os.environ["AWS_REGION"])
table = dynamodb.Table(os.environ["AGENT_CONFIG_TABLE"])

with open("/tmp/user_id.txt", "r") as f:
    user_id = f.read().strip()

# Check if config already exists for this user
response = table.scan(
    FilterExpression="userId = :uid",
    ExpressionAttributeValues={":uid": user_id}
)

if response["Items"]:
    # Config exists, use existing
    config_id = response["Items"][0]["id"]
    print(f"⚠️  Agent config already exists: {config_id}")
else:
    # Create new config with profileSelected field
    config_id = str(uuid.uuid4())
    config = {
        "id": config_id,
        "userId": user_id,
        "autoOn": True,
        "isActive": True,
        "timeInterval": 24,
        "grantsSurfaced": 2,
        "storageDuration": 3,
        "profileSelected": user_id,
        "created_date": datetime.utcnow().isoformat() + "Z",
        "last_updated": datetime.utcnow().isoformat() + "Z"
    }
    table.put_item(Item=config)
    print(f"✅ Created agent config: {config_id}")
    print(f"   - Profile Selected: {user_id}")
    print(f"   - Search Interval: 24 hours")
    print(f"   - Grants to Surface: 2 per search")

with open("/tmp/config_id.txt", "w") as f:
    f.write(config_id)
PYEOF`,
                            'python3 /tmp/create_config.py',
                            '',
                            'export CONFIG_ID=$(cat /tmp/config_id.txt)',
                            'echo "CONFIG_ID=$CONFIG_ID"',
                            'echo ""',

                            // Step 4: Download EU cache
                            'echo "Step 4: Downloading EU grants cache..."',
                            'aws lambda invoke --function-name $EU_CACHE_DOWNLOADER_FUNCTION --region $AWS_REGION /tmp/eu_cache_response.json',
                            'echo "✅ EU cache download triggered"',
                            'echo ""',

                            // Step 5: Wait for EU cache
                            'echo "Waiting 90 seconds for EU cache download (100MB file)..."',
                            'sleep 90',
                            'echo ""',
                            'echo "Verifying EU cache in S3..."',
                            `if aws s3 ls s3://$EU_CACHE_BUCKET/eu_grants_latest.json --region $AWS_REGION > /dev/null 2>&1; then
    echo "✅ EU cache file found in S3"
else
    echo "⚠️  EU cache file not found yet (may still be uploading)"
fi`,
                            'echo ""',

                            // Step 6: Run agent discovery
                            'echo "Step 5: Running agent discovery..."',
                            `cat > /tmp/run_discovery.py << 'PYEOF'
import boto3
import os
import json
import time

stepfunctions = boto3.client("stepfunctions", region_name=os.environ["AWS_REGION"])

with open("/tmp/user_id.txt", "r") as f:
    user_id = f.read().strip()
with open("/tmp/config_id.txt", "r") as f:
    config_id = f.read().strip()

execution_input = {
    "input": {
        "userId": user_id,
        "configId": config_id,
        "forceRun": True
    }
}

response = stepfunctions.start_execution(
    stateMachineArn=os.environ["AGENT_DISCOVERY_STATE_MACHINE_ARN"],
    input=json.dumps(execution_input)
)

print(f"✅ Started agent discovery: {response['executionArn']}")
execution_arn = response['executionArn']
print("⏳ Polling agent discovery until complete (max 20 min)...")

elapsed = 0
while elapsed < 1200:
    exec_response = stepfunctions.describe_execution(executionArn=execution_arn)
    status = exec_response['status']
    print(f"  [{elapsed}s] Status: {status}")
    if status == 'SUCCEEDED':
        print("✅ Agent discovery completed successfully")
        break
    elif status in ('FAILED', 'TIMED_OUT', 'ABORTED'):
        print(f"❌ Agent discovery {status}")
        break
    time.sleep(30)
    elapsed += 30

if elapsed >= 1200:
    print("⚠️  Timed out waiting for agent discovery (20 min)")
PYEOF`,
                            'python3 /tmp/run_discovery.py',
                            'echo ""',

                            'echo "==================================="',
                            'echo "Phase 1 Complete: Data Seeding Done"',
                            'echo "==================================="',
                            'echo ""',

                            // Phase 2: Build React App
                            'echo "==================================="',
                            'echo "Phase 2: Building React App"',
                            'echo "==================================="',
                            'echo ""',
                            'cd /tmp/react-aws',
                            'echo "Installing npm dependencies..."',
                            'npm install --legacy-peer-deps',
                            'echo "✅ Dependencies installed"',
                            'echo ""',
                            'echo "Building React app..."',
                            'npm run build',
                            'echo "✅ React app built"',
                            'echo ""',

                            // Phase 3: Create zip and deploy to Amplify
                            'echo "==================================="',
                            'echo "Phase 3: Deploy to Amplify Hosting"',
                            'echo "==================================="',
                            'echo ""',
                            'cd /tmp/react-aws/build',
                            'echo "Creating deployment zip..."',
                            'zip -r /tmp/grants-app-build.zip .',
                            'echo "✅ Zip created"',
                            'echo ""',

                            'echo "Uploading zip to S3..."',
                            'aws s3 cp /tmp/grants-app-build.zip s3://$DEPLOYMENT_ASSETS_BUCKET/grants-app-build.zip --region $AWS_REGION',
                            'echo "✅ Zip uploaded to S3"',
                            'echo ""',

                            'echo "Copying zip to repo root for reference..."',
                            'aws s3 cp /tmp/grants-app-build.zip s3://$DEPLOYMENT_ASSETS_BUCKET/grants-app-build-latest.zip --region $AWS_REGION',
                            'echo "✅ Reference copy saved"',
                            'echo ""',

                            'echo "Deploying to Amplify Hosting..."',
                            `cat > /tmp/deploy_amplify.py << 'PYEOF'
import boto3
import os
import time
import zipfile

amplify = boto3.client("amplify", region_name=os.environ["AWS_REGION"])
s3 = boto3.client("s3", region_name=os.environ["AWS_REGION"])

app_id = os.environ["AMPLIFY_APP_ID"]
bucket = os.environ["DEPLOYMENT_ASSETS_BUCKET"]
zip_key = "grants-app-build.zip"

# Check if main branch exists, create if not
try:
    branches = amplify.list_branches(appId=app_id)
    branch_names = [b["branchName"] for b in branches["branches"]]
    
    if "main" not in branch_names:
        print("Creating main branch...")
        amplify.create_branch(
            appId=app_id,
            branchName="main",
            enableAutoBuild=False
        )
        print("✅ Main branch created")
    else:
        print("✅ Main branch exists")
except Exception as e:
    print(f"⚠️  Branch check/creation: {e}")

# Create deployment
try:
    print(f"Creating deployment for app {app_id}...")
    
    # Get presigned URL for zip upload
    deployment = amplify.create_deployment(
        appId=app_id,
        branchName="main"
    )
    
    job_id = deployment["jobId"]
    zip_upload_url = deployment["zipUploadUrl"]
    
    print(f"✅ Deployment created: {job_id}")
    print(f"Uploading zip to Amplify...")
    
    # Upload zip directly to Amplify's presigned URL
    with open("/tmp/grants-app-build.zip", "rb") as f:
        import requests
        response = requests.put(zip_upload_url, data=f)
        response.raise_for_status()
    
    print("✅ Zip uploaded to Amplify")
    
    # Start deployment
    print("Starting deployment...")
    amplify.start_deployment(
        appId=app_id,
        branchName="main",
        jobId=job_id
    )
    
    print(f"✅ Deployment started: {job_id}")
    print(f"Check Amplify console for deployment progress")
    
except Exception as e:
    print(f"❌ Deployment error: {e}")
    import traceback
    traceback.print_exc()
PYEOF`,
                            'python3 /tmp/deploy_amplify.py',
                            'echo ""',

                            'echo "==================================="',
                            'echo "✅ ALL PHASES COMPLETE!"',
                            'echo "==================================="',
                            'echo ""',
                            'echo "Summary:"',
                            'echo "  ✅ Phase 1: Data seeding complete"',
                            'echo "     - User: $USER_ID"',
                            'echo "     - Profile created"',
                            'echo "     - Agent config: $CONFIG_ID"',
                            'echo "     - EU cache downloaded"',
                            'echo "     - Agent discovery completed"',
                            'echo ""',
                            'echo "  ✅ Phase 2: React app built"',
                            'echo ""',
                            'echo "  ✅ Phase 3: Deployed to Amplify Hosting"',
                            'echo "     - App ID: $AMPLIFY_APP_ID"',
                            'echo "     - Zip saved to S3 and repo root"',
                            'echo ""',
                            'echo "Note: Amplify deployment may take 2-3 minutes to complete"',
                            'echo ""',
                        ],
                    },
                },
            }),
        });

        // COMMENTED OUT: Lambda function causing stack deletion hang
        // This Lambda was used by the Custom Resource (which was removed)
        // Keeping it caused 15-minute timeout during stack deletion
        // CodeBuild is now triggered by deploy-grow2-bootstrap.sh script instead

        /*
        const triggerFunction = new lambda.Function(this, 'TriggerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../..'), {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    command: [
                        'bash', '-c', [
                            'mkdir -p /asset-output',
                            'cp -r react-aws /asset-output/',
                            // DO NOT copy amplify_outputs.json here - it will be uploaded by deployment script
                            'cp amplify/custom/trigger-lambda/index.py /asset-output/',
                        ].join('\n'),
                    ],
                },
            }),
            timeout: Duration.minutes(15),
            memorySize: 512,
            environment: {
                DEPLOYMENT_BUCKET: props.deploymentAssetsBucketName,
            },
        });

        // Grant permission to start builds, poll status, and upload to S3
        triggerFunction.addToRolePolicy(
            new iam.PolicyStatement({
                actions: [
                    'codebuild:StartBuild',
                    'codebuild:BatchGetBuilds',
                ],
                resources: [this.buildProject.projectArn],
            })
        );

        triggerFunction.addToRolePolicy(
            new iam.PolicyStatement({
                actions: [
                    's3:PutObject',
                    's3:PutObjectAcl',
                ],
                resources: [`${this.deploymentAssetsBucket.bucketArn}/*`],
            })
        );
        */

        // NOTE: Custom Resource removed - CodeBuild is now triggered by deployment script
        // This ensures amplify_outputs.json is uploaded to S3 BEFORE CodeBuild runs
        // See: docs/deployment/AMPLIFY_AUTH_FIX.md and AMPLIFY_OUTPUTS_TIMING_FIX.md

        // The deployment script (deploy-grow2-bootstrap.sh) will:
        // 1. Wait for npx ampx sandbox to complete
        // 2. Upload fresh amplify_outputs.json to S3
        // 3. Upload react-aws source to S3
        // 4. Trigger CodeBuild manually

        // Outputs
        new CfnOutput(this, 'deploymentAssetsBucketName', {
            value: props.deploymentAssetsBucketName,
            description: 'S3 bucket for deployment artifacts and EU grants cache',
        });

        new CfnOutput(this, 'BuildProjectName', {
            value: this.buildProject.projectName,
            description: 'CodeBuild project name for post-deployment seeding and Amplify deployment',
            exportName: `${Stack.of(this).stackName}-SeederProjectName`,
        });

        new CfnOutput(this, 'AmplifyAppId', {
            value: this.amplifyApp.attrAppId,
            description: 'Amplify App ID for Grow2 platform',
        });

        new CfnOutput(this, 'AmplifyAppUrl', {
            value: `https://main.${this.amplifyApp.attrDefaultDomain}`,
            description: 'Amplify App URL (after deployment completes)',
        });
    }
}