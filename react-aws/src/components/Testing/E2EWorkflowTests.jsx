import React, { useState } from 'react';

const E2EWorkflowTests = () => {
    const [expandedTest, setExpandedTest] = useState(null);
    const [completedSteps, setCompletedSteps] = useState({});

    const tests = [
        {
            id: 'test1',
            title: 'Discovery → Profile Creation → Agent Setup',
            subtitle: 'New User Onboarding',
            duration: '15-20 min',
            difficulty: 'Beginner',
            description: 'Complete workflow for a new user discovering grants, creating a profile, and setting up automated discovery.',
            prerequisites: [
                'Access to US grants search',
                'Knowledge Base access'
            ],
            steps: [
                {
                    title: 'Manual Grant Discovery',
                    description: 'Search for "machine learning" in US grants',
                    actions: [
                        'Navigate to Search page',
                        'Enter "machine learning" in search box',
                        'Review 5-10 grant results',
                        'Note common keywords in titles/descriptions (e.g., "AI", "neural networks", "data science")'
                    ],
                    successCriteria: [
                        'Search returns 10+ results',
                        'Results are relevant to ML/AI',
                        'Can identify 3-5 common keywords'
                    ]
                },
                {
                    title: 'Create User Profile',
                    description: 'Create profile based on discovered keywords',
                    actions: [
                        'Navigate to User Profiles page',
                        'Click "Create New Profile"',
                        'Enter profile name: "ML Researcher Test"',
                        'Add keywords from search: "machine learning", "artificial intelligence", "neural networks"',
                        'Add research areas: "Computer Science", "Data Science"',
                        'Save profile'
                    ],
                    successCriteria: [
                        'Profile created successfully',
                        'Keywords saved correctly',
                        'Profile appears in profiles list'
                    ]
                },
                {
                    title: 'Configure Agent Discovery',
                    description: 'Set up automated grant discovery',
                    actions: [
                        'Navigate to Agent Config page',
                        'Select the ML Researcher profile',
                        'Set search interval to "Daily"',
                        'Enable both US and EU grants',
                        'Save configuration'
                    ],
                    successCriteria: [
                        'Agent config saved successfully',
                        'Profile linked to agent',
                        'Interval set correctly'
                    ]
                },
                {
                    title: 'Verify Agent Discovery',
                    description: 'Check that agent finds relevant grants',
                    actions: [
                        'Navigate to Agent Selected Grants page',
                        'Wait for agent to run (or trigger manually if available)',
                        'Review discovered grants',
                        'Verify grants match profile keywords'
                    ],
                    successCriteria: [
                        'Agent discovers up to 5 grants',
                        'Grants are relevant to ML/AI',
                    ]
                }
            ],
            monitoring: [
                'CloudWatch Logs: /aws/lambda/grants-search-v2',
                'CloudWatch Logs: /aws/lambda/agent-discovery-search',
                'DynamoDB: UserProfiles table',
                'DynamoDB: AgentConfigs table'
            ],
            troubleshooting: [
                'If search returns no results: Check S3 consolidated grants file exists',
                'If profile creation fails: Check DynamoDB permissions',
                'If agent doesn\'t run: Check Step Function execution in AWS Console'
            ]
        },
        {
            id: 'test2',
            title: 'Agent Discovery → Knowledge Base → Proposal Generation',
            subtitle: 'Full Automation Workflow',
            duration: '10-15 min',
            difficulty: 'Intermediate',
            description: 'End-to-end automated workflow from agent discovery to proposal generation.',
            prerequisites: [
                'Existing profile with agent config',
                'Agent has discovered grants',
                'Knowledge Base has 2-4 documents uploaded'
            ],
            steps: [
                {
                    title: 'Review Agent-Discovered Grants',
                    description: 'Check grants found by automated agent',
                    actions: [
                        'Navigate to Agent Selected Grants page',
                        'Review list of discovered grants',
                        'Click to view grant details'
                    ],
                    successCriteria: [
                        'Agent has discovered grants',
                        'Can view grant details',
                        'Grant is relevant to profile'
                    ]
                },
                {
                    title: 'Upload Knowledge Base Documents',
                    description: 'Add research documents for proposal generation',
                    actions: [
                        'Navigate to Knowledge Base page',
                        'Upload 2-4 relevant documents (PDFs or text files)',
                        'Wait for documents to be processed',
                        'Verify documents appear in list with "READY" status'
                    ],
                    successCriteria: [
                        'All documents uploaded successfully',
                        'Documents show READY status',
                        'Can search documents in KB'
                    ]
                },
                {
                    title: 'Generate Proposal',
                    description: 'Create proposal using agent-discovered grant',
                    actions: [
                        'From grant details, click "Generate Proposal"',
                        'Choose "Manual Selection" or "Automated Search" for documents',
                        'When the green "Queued!" button appears, proposal generation has started',
                        'Navigate to the Proposals page to monitor progress'
                    ],
                    successCriteria: [
                        'Proposal generation starts',
                        'Progress updates appear',
                        'Generation completes within 5 minutes'
                    ]
                },
                {
                    title: 'Review Proposal Quality',
                    description: 'Evaluate generated proposal',
                    actions: [
                        'Navigate to Proposals page',
                        'Find the generated proposal',
                        'Review Content Quality badge (should be YELLOW or GREEN)',
                        'Click evaluation button to see detailed scores',
                        'Download HTML and PDF versions'
                    ],
                    successCriteria: [
                        'Proposal appears in list',
                        'Content Quality is YELLOW or GREEN',
                        'Evaluation shows reasonable scores (C+ or better)',
                        'Can download both HTML and PDF'
                    ]
                }
            ],
            monitoring: [
                'CloudWatch Logs: /aws/lambda/agent-discovery-search',
                'CloudWatch Logs: /aws/lambda/kb-document-processor',
                'CloudWatch Logs: /aws/lambda/proposal-generation-agentcore',
                'S3: Check proposal HTML/PDF files',
                'DynamoDB: Proposals table'
            ],
            troubleshooting: [
                'If no grants discovered: Check agent config is enabled',
                'If KB upload fails: Check S3 permissions and file size (<10MB)',
                'If proposal generation fails: Check CloudWatch logs for errors',
                'If Content Quality is RED: Upload more relevant documents'
            ]
        },
        {
            id: 'test3',
            title: 'Manual Search → Direct Proposal',
            subtitle: 'Quick Response Workflow',
            duration: '10-12 min',
            difficulty: 'Beginner',
            description: 'Fast workflow for responding to a specific grant opportunity.',
            prerequisites: [
                'Knowledge Base has existing documents',
                'Access to grant search'
            ],
            steps: [
                {
                    title: 'Search for Specific Grant',
                    description: 'Find a specific grant opportunity',
                    actions: [
                        'Navigate to Search page',
                        'Search for specific topic (e.g., "climate change research")',
                        'Filter by agency if needed',
                        'Select a grant with upcoming deadline'
                    ],
                    successCriteria: [
                        'Find relevant grant',
                        'Grant details load correctly',
                        'Deadline is visible'
                    ]
                },
                {
                    title: 'Quick KB Document Check',
                    description: 'Verify you have relevant documents',
                    actions: [
                        'Navigate to Knowledge Base',
                        'Search for documents related to grant topic',
                        'If needed, upload 1-2 additional documents',
                        'Note which documents are most relevant'
                    ],
                    successCriteria: [
                        'Have 3+ relevant documents',
                        'Documents are in READY status',
                        'Can identify best documents for this grant'
                    ]
                },
                {
                    title: 'Generate Proposal Quickly',
                    description: 'Create proposal with manual document selection',
                    actions: [
                        'From grant details, click "Generate Proposal"',
                        'Manually select 3-5 most relevant documents',
                        'Use default prompt or quick customization',
                        'Generate proposal'
                    ],
                    successCriteria: [
                        'Proposal generates successfully',
                        'Completes within 10 minutes',
                        'Uses selected documents'
                    ]
                },
                {
                    title: 'Quick Quality Check',
                    description: 'Rapid evaluation of proposal',
                    actions: [
                        'Review Content Quality badge',
                        'Click evaluation button',
                        'Check for red flags',
                        'If quality is acceptable, download'
                    ],
                    successCriteria: [
                        'No red flags present',
                        'Content Quality is YELLOW or better',
                        'Completeness score is B or better'
                    ]
                }
            ],
            monitoring: [
                'CloudWatch Logs: /aws/lambda/grants-search-v2',
                'CloudWatch Logs: /aws/lambda/proposal-generation-agentcore',
                'S3: Proposal files'
            ],
            troubleshooting: [
                'If search is slow: Check Lambda cold start times',
                'If document selection fails: Verify KB documents are synced',
                'If quality is poor: Try different document selection'
            ]
        }
    ];

    const toggleTest = (testId) => {
        setExpandedTest(expandedTest === testId ? null : testId);
    };

    const toggleStep = (testId, stepIndex) => {
        const key = `${testId}-${stepIndex}`;
        setCompletedSteps(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Beginner': return '#10b981';
            case 'Intermediate': return '#f59e0b';
            case 'Advanced': return '#ef4444';
            default: return '#6b7280';
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ margin: '0 0 12px 0', fontSize: '32px', color: '#111827' }}>
                    🧪 End-to-End User Workflow Tests
                </h1>
                <p style={{ margin: 0, fontSize: '16px', color: '#6b7280', lineHeight: '1.6' }}>
                    Complete user workflows that test the entire system from discovery to proposal generation.
                    These tests represent real-world usage patterns and validate all major features working together.
                </p>
            </div>

            {/* Test Cards */}
            <div style={{ display: 'grid', gap: '24px' }}>
                {tests.map((test) => {
                    const isExpanded = expandedTest === test.id;
                    const completedCount = test.steps.filter((_, idx) =>
                        completedSteps[`${test.id}-${idx}`]
                    ).length;

                    return (
                        <div
                            key={test.id}
                            style={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                transition: 'box-shadow 0.2s'
                            }}
                        >
                            {/* Test Header */}
                            <div
                                onClick={() => toggleTest(test.id)}
                                style={{
                                    padding: '24px',
                                    cursor: 'pointer',
                                    backgroundColor: isExpanded ? '#f9fafb' : 'white',
                                    borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>
                                                {test.title}
                                            </h2>
                                            <span style={{
                                                padding: '4px 12px',
                                                backgroundColor: getDifficultyColor(test.difficulty),
                                                color: 'white',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '600'
                                            }}>
                                                {test.difficulty}
                                            </span>
                                        </div>
                                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280', fontStyle: 'italic' }}>
                                            {test.subtitle}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                                            {test.description}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginLeft: '24px' }}>
                                        <div style={{
                                            padding: '6px 12px',
                                            backgroundColor: '#eff6ff',
                                            color: '#1e40af',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            ⏱️ {test.duration}
                                        </div>
                                        {isExpanded && (
                                            <div style={{
                                                padding: '6px 12px',
                                                backgroundColor: completedCount === test.steps.length ? '#d1fae5' : '#fef3c7',
                                                color: completedCount === test.steps.length ? '#065f46' : '#92400e',
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                fontWeight: '500'
                                            }}>
                                                {completedCount}/{test.steps.length} steps
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div style={{ padding: '24px' }}>
                                    {/* Prerequisites */}
                                    <div style={{ marginBottom: '32px' }}>
                                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#111827', fontWeight: '600' }}>
                                            📋 Prerequisites
                                        </h3>
                                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151' }}>
                                            {test.prerequisites.map((prereq, idx) => (
                                                <li key={idx} style={{ marginBottom: '6px', fontSize: '14px' }}>{prereq}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Steps */}
                                    <div style={{ marginBottom: '32px' }}>
                                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#111827', fontWeight: '600' }}>
                                            📝 Test Steps
                                        </h3>
                                        <div style={{ display: 'grid', gap: '16px' }}>
                                            {test.steps.map((step, stepIdx) => {
                                                const isCompleted = completedSteps[`${test.id}-${stepIdx}`];
                                                return (
                                                    <div
                                                        key={stepIdx}
                                                        style={{
                                                            padding: '16px',
                                                            backgroundColor: isCompleted ? '#f0fdf4' : '#f9fafb',
                                                            border: `1px solid ${isCompleted ? '#bbf7d0' : '#e5e7eb'}`,
                                                            borderRadius: '8px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isCompleted}
                                                                onChange={() => toggleStep(test.id, stepIdx)}
                                                                style={{
                                                                    marginTop: '4px',
                                                                    width: '18px',
                                                                    height: '18px',
                                                                    cursor: 'pointer'
                                                                }}
                                                            />
                                                            <div style={{ flex: 1 }}>
                                                                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#111827', fontWeight: '600' }}>
                                                                    Step {stepIdx + 1}: {step.title}
                                                                </h4>
                                                                <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#6b7280' }}>
                                                                    {step.description}
                                                                </p>

                                                                {/* Actions */}
                                                                <div style={{ marginBottom: '12px' }}>
                                                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                                                                        Actions:
                                                                    </div>
                                                                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                                                        {step.actions.map((action, idx) => (
                                                                            <li key={idx} style={{ marginBottom: '4px', fontSize: '13px', color: '#4b5563' }}>
                                                                                {action}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>

                                                                {/* Success Criteria */}
                                                                <div>
                                                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#065f46', marginBottom: '6px' }}>
                                                                        ✅ Success Criteria:
                                                                    </div>
                                                                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                                                        {step.successCriteria.map((criteria, idx) => (
                                                                            <li key={idx} style={{ marginBottom: '4px', fontSize: '13px', color: '#064e3b' }}>
                                                                                {criteria}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Monitoring */}
                                    <div style={{ marginBottom: '32px' }}>
                                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#111827', fontWeight: '600' }}>
                                            📊 Monitoring & Logs
                                        </h3>
                                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151' }}>
                                            {test.monitoring.map((item, idx) => (
                                                <li key={idx} style={{ marginBottom: '6px', fontSize: '13px', fontFamily: 'monospace' }}>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Troubleshooting */}
                                    <div>
                                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#111827', fontWeight: '600' }}>
                                            🔧 Troubleshooting
                                        </h3>
                                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151' }}>
                                            {test.troubleshooting.map((item, idx) => (
                                                <li key={idx} style={{ marginBottom: '6px', fontSize: '13px' }}>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer Note */}
            <div style={{
                marginTop: '40px',
                padding: '20px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px'
            }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1e40af' }}>
                    💡 Testing Tips
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e3a8a' }}>
                    <li style={{ marginBottom: '8px' }}>Use existing KB documents and profiles - no need to create new data</li>
                    <li style={{ marginBottom: '8px' }}>Tests can be run in any order, but Test 1 is recommended for new users</li>
                    <li style={{ marginBottom: '8px' }}>Check CloudWatch logs if any step fails - error messages are detailed</li>
                    <li style={{ marginBottom: '8px' }}>Each test validates multiple features working together</li>
                    <li>Mark steps as complete to track your progress through each workflow</li>
                </ul>
            </div>
        </div>
    );
};

export default E2EWorkflowTests;
