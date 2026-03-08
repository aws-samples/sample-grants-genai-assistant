import React from 'react';

const EvaluationDetailsModal = ({ evaluation, onClose }) => {
    if (!evaluation) return null;

    const scores = evaluation.scores || {};

    // Metric explanations
    const metricExplanations = {
        contentQuality: {
            title: "Content Quality",
            weight: "30%",
            shortDesc: "How well your knowledge base documents matched the grant",
            fullDesc: "This measures how well the vector database found similar content when searching your knowledge base using the grant's description and title. Higher semantic scores mean your documents are highly relevant to what the grant is asking for.",
            howToImprove: [
                "Upload more documents that directly relate to the grant's focus areas",
                "Review the grant description and ensure your knowledge base contains research, publications, or materials that address those topics",
                "Check document quality - well-written, detailed documents with clear technical content score better"
            ]
        },
        guidelineAdherence: {
            title: "Guideline Adherence",
            weight: "40%",
            shortDesc: "How well the proposal follows the grant's requirements",
            fullDesc: "This evaluates whether your proposal addresses all the success criteria, required sections, and specific questions outlined in the grant guidelines. The system uses AI to analyze your proposal against the grant's requirements.",
            howToImprove: [
                "Review grant requirements carefully before generating a proposal",
                "Use custom prompts to emphasize specific requirements the grant asks for",
                "Provide detailed guidelines when uploading grant-specific documents",
                "Regenerate with better instructions if the first attempt misses key requirements"
            ]
        },
        completeness: {
            title: "Completeness",
            weight: "20%",
            shortDesc: "Whether all expected sections are present with adequate detail",
            fullDesc: "This evaluates the structural completeness of your proposal. A complete proposal typically has 5+ major sections (Introduction, Methodology, Impact, Timeline, Budget, etc.) and contains sufficient detail (3,000+ words total).",
            howToImprove: [
                "Ensure all major sections are included in your prompt or grant guidelines",
                "Provide more source material - richer knowledge base content leads to more detailed proposals",
                "Use section-specific prompts to guide the AI on what to include in each part",
                "Review and expand brief sections manually after generation"
            ]
        },
        sourceUtilization: {
            title: "Source Utilization",
            weight: "10%",
            shortDesc: "How effectively your documents were used",
            fullDesc: "This evaluates whether the proposal drew from a good variety of your uploaded documents and whether those documents were high-quality matches. It's not just about having relevant documents (that's Content Quality), but about how well the system utilized them.",
            howToImprove: [
                "Upload multiple documents covering different aspects of your work",
                "Ensure documents are substantial - longer, detailed documents provide more content",
                "Cover various topics related to the grant (methodology, results, impact, etc.)",
                "Include different document types - research papers, project reports, case studies, etc."
            ]
        }
    };

    const getGradeColor = (grade) => {
        if (!grade) return { bg: '#f3f4f6', text: '#6b7280' };
        const firstChar = grade.charAt(0);
        switch (firstChar) {
            case 'A': return { bg: '#d1fae5', text: '#065f46' };
            case 'B': return { bg: '#dbeafe', text: '#1e40af' };
            case 'C': return { bg: '#fef3c7', text: '#92400e' };
            case 'D': return { bg: '#ffe5d0', text: '#d63031' };
            case 'F': return { bg: '#fee2e2', text: '#991b1b' };
            default: return { bg: '#f3f4f6', text: '#6b7280' };
        }
    };

    const getConfidenceColor = (confidence) => {
        switch (confidence) {
            case 'HIGH': return { bg: '#d1fae5', text: '#065f46' };
            case 'MEDIUM': return { bg: '#fef3c7', text: '#92400e' };
            case 'LOW': return { bg: '#fee2e2', text: '#991b1b' };
            default: return { bg: '#f3f4f6', text: '#6b7280' };
        }
    };

    const MetricCard = ({ metricKey, scoreData }) => {
        const explanation = metricExplanations[metricKey];
        const colors = getGradeColor(scoreData?.grade);
        const [expanded, setExpanded] = React.useState(false);

        return (
            <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: 'white'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#111827' }}>
                            {explanation.title}
                            <span style={{
                                marginLeft: '8px',
                                fontSize: '12px',
                                color: '#6b7280',
                                fontWeight: 'normal'
                            }}>
                                ({explanation.weight})
                            </span>
                        </h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                            {explanation.shortDesc}
                        </p>
                    </div>
                    <div style={{
                        padding: '8px 16px',
                        backgroundColor: colors.bg,
                        color: colors.text,
                        borderRadius: '6px',
                        fontSize: '18px',
                        fontWeight: '700',
                        minWidth: '60px',
                        textAlign: 'center'
                    }}>
                        {scoreData?.grade || 'N/A'}
                    </div>
                </div>

                {/* Score Details */}
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '13px',
                    color: '#6b7280',
                    marginBottom: '12px'
                }}>
                    <div>
                        <span style={{ fontWeight: '500' }}>Score:</span> {((scoreData?.score || 0) * 100).toFixed(0)}%
                    </div>
                    <div>
                        <span style={{ fontWeight: '500' }}>Weighted:</span> {((scoreData?.weightedScore || 0) * 100).toFixed(0)}%
                    </div>
                </div>

                {/* Reasoning */}
                {scoreData?.reasoning && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#374151',
                        marginBottom: '12px'
                    }}>
                        {scoreData.reasoning}
                    </div>
                )}

                {/* Expand/Collapse Button */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'transparent',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#3b82f6',
                        fontWeight: '500'
                    }}
                >
                    {expanded ? '▼ Hide Details' : '▶ Show Details & Tips'}
                </button>

                {/* Expanded Content */}
                {expanded && (
                    <div style={{ marginTop: '12px', fontSize: '13px' }}>
                        {/* Full Description */}
                        <div style={{
                            padding: '12px',
                            backgroundColor: '#eff6ff',
                            borderLeft: '3px solid #3b82f6',
                            borderRadius: '4px',
                            marginBottom: '12px'
                        }}>
                            <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '6px' }}>
                                What This Measures:
                            </div>
                            <div style={{ color: '#1e3a8a' }}>
                                {explanation.fullDesc}
                            </div>
                        </div>

                        {/* How to Improve */}
                        <div style={{
                            padding: '12px',
                            backgroundColor: '#f0fdf4',
                            borderLeft: '3px solid #10b981',
                            borderRadius: '4px'
                        }}>
                            <div style={{ fontWeight: '600', color: '#065f46', marginBottom: '8px' }}>
                                How to Improve:
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#064e3b' }}>
                                {explanation.howToImprove.map((tip, idx) => (
                                    <li key={idx} style={{ marginBottom: '4px' }}>{tip}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const overallColors = getGradeColor(evaluation.overallGrade);
    const confidenceColors = getConfidenceColor(evaluation.confidence);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid #e5e7eb',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'white',
                    zIndex: 1
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#111827' }}>
                                📊 Proposal Quality Evaluation
                            </h2>
                            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                                Detailed breakdown of your proposal's quality across four key dimensions
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'transparent',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '20px',
                                color: '#6b7280'
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Overall Score */}
                    <div style={{
                        marginTop: '20px',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            padding: '16px 24px',
                            backgroundColor: overallColors.bg,
                            color: overallColors.text,
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                                Overall Grade
                            </div>
                            <div style={{ fontSize: '36px', fontWeight: '700' }}>
                                {evaluation.overallGrade}
                            </div>
                            <div style={{ fontSize: '14px', opacity: 0.8 }}>
                                {(evaluation.overallScore * 100).toFixed(0)}%
                            </div>
                        </div>

                        <div style={{
                            padding: '12px 20px',
                            backgroundColor: confidenceColors.bg,
                            color: confidenceColors.text,
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                                Confidence
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '700' }}>
                                {evaluation.confidence}
                            </div>
                        </div>

                        {evaluation.redFlags && evaluation.redFlags.length > 0 && (
                            <div style={{
                                padding: '12px 20px',
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                borderRadius: '8px',
                                textAlign: 'center',
                                border: '2px solid #fecaca'
                            }}>
                                <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                                    ⚠️ Red Flags
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: '700' }}>
                                    {evaluation.redFlags.length}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    {/* Metric Cards */}
                    <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                        <MetricCard metricKey="contentQuality" scoreData={scores.contentQuality} />
                        <MetricCard metricKey="guidelineAdherence" scoreData={scores.guidelineAdherence} />
                        <MetricCard metricKey="completeness" scoreData={scores.completeness} />
                        <MetricCard metricKey="sourceUtilization" scoreData={scores.sourceUtilization} />
                    </div>

                    {/* Strengths, Weaknesses, Recommendations */}
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {/* Strengths */}
                        {evaluation.strengths && evaluation.strengths.length > 0 && (
                            <div style={{
                                padding: '16px',
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '8px'
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#065f46' }}>
                                    ✅ Strengths
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '20px', color: '#064e3b' }}>
                                    {evaluation.strengths.map((strength, idx) => (
                                        <li key={idx} style={{ marginBottom: '6px', fontSize: '14px' }}>{strength}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Weaknesses */}
                        {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
                            <div style={{
                                padding: '16px',
                                backgroundColor: '#fef3c7',
                                border: '1px solid #fde68a',
                                borderRadius: '8px'
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#92400e' }}>
                                    ⚠️ Weaknesses
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '20px', color: '#78350f' }}>
                                    {evaluation.weaknesses.map((weakness, idx) => (
                                        <li key={idx} style={{ marginBottom: '6px', fontSize: '14px' }}>{weakness}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recommendations */}
                        {evaluation.recommendations && evaluation.recommendations.length > 0 && (
                            <div style={{
                                padding: '16px',
                                backgroundColor: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '8px'
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1e40af' }}>
                                    💡 Recommendations
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e3a8a' }}>
                                    {evaluation.recommendations.map((rec, idx) => (
                                        <li key={idx} style={{ marginBottom: '6px', fontSize: '14px' }}>{rec}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Red Flags */}
                        {evaluation.redFlags && evaluation.redFlags.length > 0 && (
                            <div style={{
                                padding: '16px',
                                backgroundColor: '#fee2e2',
                                border: '2px solid #fecaca',
                                borderRadius: '8px'
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#991b1b' }}>
                                    🚨 Critical Issues (Red Flags)
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '20px', color: '#7f1d1d' }}>
                                    {evaluation.redFlags.map((flag, idx) => (
                                        <li key={idx} style={{ marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>{flag}</li>
                                    ))}
                                </ul>
                                <div style={{
                                    marginTop: '12px',
                                    padding: '8px 12px',
                                    backgroundColor: '#fef2f2',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    color: '#991b1b',
                                    fontWeight: '500'
                                }}>
                                    ⚠️ Address these issues before submitting your proposal!
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                    textAlign: 'center'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EvaluationDetailsModal;
