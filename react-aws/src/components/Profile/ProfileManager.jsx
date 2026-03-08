import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import outputs from '../../amplify_outputs.json';

// Configure Amplify
Amplify.configure(outputs);
const client = generateClient();

// Field importance for Bayesian matching
const fieldImportance = {
  // Highest impact - 15% boost
  'keywords': { level: 'highest', boost: '15%', color: '#dc3545' },

  // High impact - 8% boost  
  'agencies': { level: 'high', boost: '8%', color: '#fd7e14' },

  // Medium impact - sets base probability
  'researcherType': { level: 'medium', boost: 'base', color: '#ffc107' },
  'expertise_level': { level: 'medium', boost: 'multiplier', color: '#ffc107' },

  // Lower impact - 5-10% boost
  'optimized_keywords': { level: 'lower', boost: '5%', color: '#20c997' },
  'early_investigator': { level: 'lower', boost: '10%', color: '#20c997' },

  // Context only - not directly scored
  'research_areas': { level: 'context', boost: 'context', color: '#6c757d' }
};

const getFieldImportance = (fieldName) => fieldImportance[fieldName];

const CriticalFieldWrapper = ({ children, fieldName, label }) => {
  const importance = getFieldImportance(fieldName);
  if (!importance) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          {label}:
        </label>
        {children}
      </div>
    );
  }

  const labels = {
    'highest': '🔥 HIGHEST IMPACT',
    'high': '⭐ HIGH IMPACT',
    'medium': '📊 MEDIUM IMPACT',
    'lower': '✓ HELPFUL',
    'context': 'ℹ️ CONTEXT'
  };

  return (
    <div style={{
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: importance.level === 'highest' ? '#ffe6e6' :
        importance.level === 'high' ? '#fff3e6' :
          importance.level === 'medium' ? '#fff9e6' :
            importance.level === 'lower' ? '#e6fff2' : '#f8f9fa',
      border: `2px solid ${importance.color}`,
      borderRadius: '8px',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: '-10px',
        left: '10px',
        backgroundColor: importance.color,
        color: 'white',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold'
      }}>
        {labels[importance.level]} ({importance.boost})
      </div>
      <label style={{
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#333',
        marginTop: '5px'
      }}>
        {label}:
        {importance.level !== 'context' && <span style={{ color: '#dc3545', marginLeft: '5px' }}>*</span>}
      </label>
      {children}
    </div>
  );
};

const ProfileManager = () => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Refs to maintain focus
  const keywordsRef = useRef(null);
  const researchAreasRef = useRef(null);
  const optimizedKeywordsRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    department: '',
    position: '',
    researcherType: '',
    expertise_level: '',
    early_investigator: 'False',
    research_areas: [],
    keywords: [],
    optimized_keywords: [],
    agencies: [],
    budget_range: '',
    collaboration_pref: '',
    duration_preference: '',
    geographic_scope: '',
    tech_skills: [],
    methodologies: []
  });

  // Separate state for text inputs (to avoid array conversion on every keystroke)
  const [textInputs, setTextInputs] = useState({
    research_areas_text: '',
    keywords_text: '',
    optimized_keywords_text: ''
  });

  // Load profile on component mount
  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setAuthError(null);

      // Get current authenticated user's Cognito ID
      let userId;
      try {
        const session = await fetchAuthSession();
        userId = session.tokens?.idToken?.payload?.sub;

        if (!userId) {
          throw new Error('No user ID found in session');
        }

        setCurrentUserId(userId);
        console.log('✅ Authenticated user ID:', userId);

      } catch (authErr) {
        console.error('❌ Authentication error:', authErr);
        setAuthError('Not authenticated. Please sign in to manage your profile.');
        setLoading(false);
        return;
      }

      // Try to get profile by ID from GraphQL
      try {
        const { data } = await client.graphql({
          query: `
            query GetUserProfile($id: ID!) {
              getUserProfile(id: $id) {
                id
                userId
                name
                email
                institution
                department
                position
                researcherType
                expertise_level
                early_investigator
                research_areas
                keywords
                optimized_keywords
                agencies
                budget_range
                collaboration_pref
                duration_preference
                geographic_scope
                tech_skills
                methodologies
                isActive
              }
            }
          `,
          variables: { id: userId }
        });

        if (data.getUserProfile) {
          console.log('Loaded profile via GraphQL:', data.getUserProfile);
          const profileData = {
            ...data.getUserProfile,
            research_areas: Array.isArray(data.getUserProfile.research_areas) ? data.getUserProfile.research_areas : [],
            keywords: Array.isArray(data.getUserProfile.keywords) ? data.getUserProfile.keywords : [],
            optimized_keywords: Array.isArray(data.getUserProfile.optimized_keywords) ? data.getUserProfile.optimized_keywords : [],
            agencies: Array.isArray(data.getUserProfile.agencies)
              ? data.getUserProfile.agencies.filter(a => a !== 'European Commission')
              : [],
            tech_skills: Array.isArray(data.getUserProfile.tech_skills) ? data.getUserProfile.tech_skills : [],
            methodologies: Array.isArray(data.getUserProfile.methodologies) ? data.getUserProfile.methodologies : []
          };
          setProfile(profileData);
          setFormData(profileData);
          setTextInputs({
            research_areas_text: profileData.research_areas.join(', '),
            keywords_text: profileData.keywords.join(', '),
            optimized_keywords_text: profileData.optimized_keywords.join(', ')
          });
          return;
        }
      } catch (graphqlError) {
        console.log('GraphQL query failed, trying list approach:', graphqlError);
        console.error('GraphQL Error Details:', {
          errors: graphqlError.errors,
          data: graphqlError.data,
          message: graphqlError.message
        });
      }

      // Fallback: List all profiles and find by userId
      try {
        const { data } = await client.graphql({
          query: `
            query ListUserProfiles {
              listUserProfiles {
                items {
                  id
                  userId
                  name
                  email
                  institution
                  department
                  position
                  researcherType
                  expertise_level
                  early_investigator
                  research_areas
                  keywords
                  optimized_keywords
                  agencies
                  isActive
                }
              }
            }
          `
        });

        const profiles = data.listUserProfiles.items;
        console.log('🔍 All profiles found:', profiles.length);
        console.log('🔍 Looking for userId:', userId);
        console.log('🔍 Profile userIds:', profiles.map(p => ({ id: p.id, userId: p.userId, name: p.name })));

        // FIXED: Only match by userId, not by id (id is DynamoDB UUID, not Cognito ID)
        const userProfile = profiles.find(p => p.userId === userId);

        if (userProfile) {
          console.log('Found profile via list:', userProfile);
          const profileData = {
            ...userProfile,
            research_areas: Array.isArray(userProfile.research_areas) ? userProfile.research_areas : [],
            keywords: Array.isArray(userProfile.keywords) ? userProfile.keywords : [],
            optimized_keywords: Array.isArray(userProfile.optimized_keywords) ? userProfile.optimized_keywords : [],
            agencies: Array.isArray(userProfile.agencies)
              ? userProfile.agencies.filter(a => a !== 'European Commission')
              : [],
            tech_skills: Array.isArray(userProfile.tech_skills) ? userProfile.tech_skills : [],
            methodologies: Array.isArray(userProfile.methodologies) ? userProfile.methodologies : []
          };
          setProfile(profileData);
          setFormData(profileData);
          setTextInputs({
            research_areas_text: profileData.research_areas.join(', '),
            keywords_text: profileData.keywords.join(', '),
            optimized_keywords_text: profileData.optimized_keywords.join(', ')
          });
        } else {
          console.log('No profile found for user:', userId);
          // No profile exists - set to null so UI shows "Create Profile"
          setProfile(null);
          setFormData({
            userId: userId,
            name: '',
            email: '',
            researcherType: '',
            expertise_level: '',
            early_investigator: 'False',
            research_areas: [],
            keywords: [],
            optimized_keywords: [],
            agencies: [],
            isActive: true
          });
          setTextInputs({
            research_areas_text: '',
            keywords_text: '',
            optimized_keywords_text: ''
          });
        }
      } catch (listError) {
        console.error('List profiles failed:', listError);
        console.error('GraphQL Error Details:', {
          errors: listError.errors,
          data: listError.data,
          message: listError.message
        });
        // No profile found - set to null
        console.log('No profile found for user:', userId);
        setProfile(null);
        setFormData({
          userId: userId,
          name: '',
          email: '',
          researcherType: '',
          expertise_level: '',
          early_investigator: 'False',
          research_areas: [],
          keywords: [],
          optimized_keywords: [],
          agencies: [],
          isActive: true
        });
        setTextInputs({
          research_areas_text: '',
          keywords_text: '',
          optimized_keywords_text: ''
        });
      }

    } catch (error) {
      console.error('Error loading profile:', error);
      // No profile - show create profile UI
      setProfile(null);
      setFormData({
        userId: currentUserId,
        name: '',
        email: '',
        researcherType: '',
        expertise_level: '',
        early_investigator: 'False',
        research_areas: [],
        keywords: [],
        optimized_keywords: [],
        agencies: [],
        isActive: true
      });
      setTextInputs({
        research_areas_text: '',
        keywords_text: '',
        optimized_keywords_text: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTextInputChange = useCallback((field, value) => {
    setTextInputs(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const convertTextToArray = (text) => {
    if (!text || text.trim() === '') return [];
    return text.split(',').map(item => item.trim()).filter(item => item.length > 0);
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (!currentUserId) {
        alert('❌ No user ID available. Please refresh and sign in again.');
        return;
      }

      console.log('Saving profile for user:', currentUserId);

      // Prepare data for GraphQL - convert text inputs to arrays
      const profileData = {
        ...formData,
        userId: currentUserId,  // Ensure userId is set
        research_areas: convertTextToArray(textInputs.research_areas_text),
        keywords: convertTextToArray(textInputs.keywords_text),
        optimized_keywords: convertTextToArray(textInputs.optimized_keywords_text),
        last_updated: new Date().toISOString(),
        isActive: true  // Mark as active profile
      };

      console.log('📝 Saving profile to DynamoDB:', profileData);

      let savedProfile;

      if (profile && profile.id) {
        // Update existing profile
        try {
          const { data } = await client.graphql({
            query: `
              mutation UpdateUserProfile($input: UpdateUserProfileInput!) {
                updateUserProfile(input: $input) {
                  id
                  userId
                  name
                  email
                  researcherType
                  expertise_level
                  early_investigator
                  research_areas
                  keywords
                  optimized_keywords
                  agencies
                  isActive
                }
              }
            `,
            variables: {
              input: {
                id: profile.id,
                ...profileData
              }
            }
          });

          savedProfile = data.updateUserProfile;
          console.log('Profile updated via GraphQL:', savedProfile);

        } catch (updateError) {
          console.error('Update failed:', updateError);
          throw updateError;
        }
      } else {
        // Create new profile
        try {
          const { data } = await client.graphql({
            query: `
              mutation CreateUserProfile($input: CreateUserProfileInput!) {
                createUserProfile(input: $input) {
                  id
                  userId
                  name
                  email
                  researcherType
                  expertise_level
                  early_investigator
                  research_areas
                  keywords
                  optimized_keywords
                  agencies
                  isActive
                }
              }
            `,
            variables: {
              input: profileData
            }
          });

          savedProfile = data.createUserProfile;
          console.log('Profile created via GraphQL:', savedProfile);

        } catch (createError) {
          console.error('Create failed:', createError);
          throw createError;
        }
      }

      // Update local state - filter out European Commission
      const cleanedProfile = {
        ...savedProfile,
        agencies: Array.isArray(savedProfile.agencies)
          ? savedProfile.agencies.filter(a => a !== 'European Commission')
          : []
      };
      setProfile(cleanedProfile);
      setFormData(cleanedProfile);
      setTextInputs({
        research_areas_text: Array.isArray(savedProfile.research_areas) ? savedProfile.research_areas.join(', ') : '',
        keywords_text: Array.isArray(savedProfile.keywords) ? savedProfile.keywords.join(', ') : '',
        optimized_keywords_text: Array.isArray(savedProfile.optimized_keywords) ? savedProfile.optimized_keywords.join(', ') : ''
      });
      setIsEditing(false);

      alert('Profile saved successfully!');

    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const researcherTypes = [
    { value: 'biomedical', label: 'Biomedical Research' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'computer_science', label: 'Computer Science' },
    { value: 'basic_science', label: 'Basic Science' },
    { value: 'social_science', label: 'Social Science' }
  ];

  const expertiseLevels = [
    { value: 'expert', label: 'Expert' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'beginner', label: 'Beginner' }
  ];

  const availableAgencies = [
    'NIH', 'NSF', 'DOD', 'DOE', 'NASA', 'EPA', 'USDA', 'DHS', 'HHS-NIH11',
    'Horizon Europe', 'Digital Europe', 'Connecting Europe', 'LIFE', 'EUAF'
  ];

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading profile...</div>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          padding: '20px',
          backgroundColor: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#856404', marginTop: 0 }}>⚠️ Authentication Required</h3>
          <p style={{ color: '#856404' }}>{authError}</p>
        </div>
      </div>
    );
  }

  const isNewProfile = !profile || !profile.id;

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {isNewProfile && (
        <div style={{
          padding: '15px',
          backgroundColor: '#d1ecf1',
          border: '1px solid #bee5eb',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#0c5460'
        }}>
          <strong>👋 Welcome!</strong> No profile found. Click "Create Profile" below to get started with personalized grant matching.
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#1976d2', margin: 0 }}>
          🎯 Researcher Profile
          {currentUserId && (
            <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
              (ID: {currentUserId.substring(0, 8)}...)
            </span>
          )}
        </h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: isNewProfile ? '#4caf50' : '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isNewProfile ? '➕ Create Profile' : '✏️ Edit Profile'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              💾 Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData(profile);
                setTextInputs({
                  research_areas_text: Array.isArray(profile?.research_areas) ? profile.research_areas.join(', ') : '',
                  keywords_text: Array.isArray(profile?.keywords) ? profile.keywords.join(', ') : '',
                  optimized_keywords_text: Array.isArray(profile?.optimized_keywords) ? profile.optimized_keywords.join(', ') : ''
                });
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ❌ Cancel
            </button>
          </div>
        )}
      </div>



      {/* Bayesian Matching Info Banner */}
      <div style={{
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        border: '2px solid #2196f3'
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>🧠 How Intelligent Grant Matching Works</h4>

        <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
          Our Bayesian algorithm analyzes grants and scores them based on your profile. Each field has a different weight:
        </p>

        <div style={{ fontSize: '13px', color: '#555', marginBottom: '15px' }}>
          <div style={{ marginBottom: '8px' }}>
            <strong style={{ color: '#dc3545' }}>🔥 Keywords (15% boost):</strong> Your PRIMARY research terms. Use <strong>broad, common terms</strong> that appear in grant titles/descriptions.
            <div style={{ marginLeft: '20px', fontSize: '12px', color: '#666', marginTop: '4px' }}>
              ✅ Good: "artificial intelligence", "AI", "machine learning", "cybersecurity"<br />
              ❌ Too narrow: "knowledge graphs", "semantic reasoning", "kill chain"<br />
              ⚠️ <strong>Keep to 3 words or less</strong> - longer phrases will be truncated for agent discovery searches
            </div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <strong style={{ color: '#fd7e14' }}>⭐ Preferred Agencies (8% boost):</strong> Funding sources you want to target (e.g., NSF, NIH, DARPA).
          </div>

          <div style={{ marginBottom: '8px' }}>
            <strong style={{ color: '#ffc107' }}>📊 Researcher Type & Expertise:</strong> Sets your base probability (18-20%) and applies multipliers.
          </div>

          <div style={{ marginBottom: '8px' }}>
            <strong style={{ color: '#20c997' }}>✓ Optimized Keywords (5% boost):</strong> SECONDARY terms for fine-tuning. These add a small boost.
            <div style={{ marginLeft: '20px', fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Use for: Related terms, synonyms, or specific techniques
            </div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <strong style={{ color: '#20c997' }}>✓ Early Investigator (10% boost):</strong> Additional boost if you're early career.
          </div>
        </div>

        <div style={{
          padding: '12px',
          backgroundColor: '#fff3cd',
          borderRadius: '6px',
          border: '1px solid #ffc107',
          fontSize: '13px',
          color: '#856404'
        }}>
          <strong>💡 Pro Tip:</strong> Keywords and Optimized Keywords work TOGETHER. The algorithm:
          <ol style={{ margin: '8px 0 0 20px', paddingLeft: '0' }}>
            <li>Extracts grant features (agency, domain, AI mentions, etc.)</li>
            <li>Calculates base score from features</li>
            <li>Applies 8% boost if Keywords present</li>
            <li>Applies 3% boost if Optimized Keywords present</li>
            <li>Applies 4% boost if Preferred Agencies match</li>
          </ol>
          <div style={{ marginTop: '8px' }}>
            <strong>Result:</strong> Grants matching your profile can score 50-70%, well above the 20% threshold!
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>

        {/* Basic Information */}
        <h3 style={{ color: '#495057', marginBottom: '20px' }}>Basic Information</h3>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Name:</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          ) : (
            <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              {profile?.name || 'Not specified'}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email:</label>
          {isEditing ? (
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          ) : (
            <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              {profile?.email || 'Not specified'}
            </div>
          )}
        </div>

        {/* Critical Fields Section */}
        <h3 style={{ color: '#856404', marginBottom: '20px', marginTop: '30px' }}>
          🎯 Critical Matching Fields
        </h3>

        <CriticalFieldWrapper fieldName="researcherType" label="Researcher Type">
          {isEditing ? (
            <select
              value={formData.researcherType || ''}
              onChange={(e) => handleInputChange('researcherType', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #ffc107',
                borderRadius: '4px'
              }}
            >
              <option value="">Select type...</option>
              {researcherTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          ) : (
            <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              {researcherTypes.find(t => t.value === profile?.researcherType)?.label || 'Not specified'}
            </div>
          )}
        </CriticalFieldWrapper>

        <CriticalFieldWrapper fieldName="expertise_level" label="Expertise Level">
          {isEditing ? (
            <select
              value={formData.expertise_level || ''}
              onChange={(e) => handleInputChange('expertise_level', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #ffc107',
                borderRadius: '4px'
              }}
            >
              <option value="">Select level...</option>
              {expertiseLevels.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          ) : (
            <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              {expertiseLevels.find(l => l.value === profile?.expertise_level)?.label || 'Not specified'}
            </div>
          )}
        </CriticalFieldWrapper>

        <CriticalFieldWrapper fieldName="early_investigator" label="Early Career Investigator">
          {isEditing ? (
            <select
              value={formData.early_investigator || 'False'}
              onChange={(e) => handleInputChange('early_investigator', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #ffc107',
                borderRadius: '4px'
              }}
            >
              <option value="False">No</option>
              <option value="True">Yes</option>
            </select>
          ) : (
            <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              {profile?.early_investigator === 'True' ? 'Yes' : 'No'}
            </div>
          )}
        </CriticalFieldWrapper>

        <CriticalFieldWrapper fieldName="research_areas" label="Research Areas">
          {isEditing ? (
            <textarea
              value={textInputs.research_areas_text}
              onChange={(e) => handleTextInputChange('research_areas_text', e.target.value)}
              placeholder="Enter research areas separated by commas (e.g., Artificial Intelligence, Machine Learning)"
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #ffc107',
                borderRadius: '4px',
                minHeight: '60px'
              }}
            />
          ) : (
            <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              {Array.isArray(profile?.research_areas) ? profile.research_areas.join(', ') : 'Not specified'}
            </div>
          )}
        </CriticalFieldWrapper>

        <CriticalFieldWrapper fieldName="keywords" label="Primary Keywords (Search Terms)">
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', lineHeight: '1.5' }}>
            <strong>Use BROAD terms that appear in grant titles.</strong> These drive your searches AND boost matching scores by 8%.
            <br />Examples: "artificial intelligence", "AI", "machine learning", "cybersecurity", "data science"
            <br /><span style={{ color: '#dc3545', fontWeight: 'bold' }}>⚠️ Keep phrases to 3 words or less</span> - longer phrases will be truncated
          </div>
          {isEditing ? (
            <textarea
              value={textInputs.keywords_text}
              onChange={(e) => handleTextInputChange('keywords_text', e.target.value)}
              placeholder="artificial intelligence, AI, machine learning, cybersecurity, data analytics"
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #dc3545',
                borderRadius: '4px',
                minHeight: '80px',
                fontFamily: 'monospace'
              }}
            />
          ) : (
            <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              {Array.isArray(profile?.keywords) ? profile.keywords.join(', ') : 'Not specified'}
            </div>
          )}
        </CriticalFieldWrapper>

        <CriticalFieldWrapper fieldName="optimized_keywords" label="Secondary Keywords (Fine-Tuning)">
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', lineHeight: '1.5' }}>
            <strong>Optional:</strong> Add related terms, synonyms, or specific techniques for fine-tuning. Adds 3% boost.
            <br />Examples: "deep learning", "neural networks", "threat detection", "information security"
            <br /><span style={{ color: '#dc3545', fontWeight: 'bold' }}>⚠️ Keep phrases to 3 words or less</span> - longer phrases will be truncated
          </div>
          {isEditing ? (
            <textarea
              value={textInputs.optimized_keywords_text}
              onChange={(e) => handleTextInputChange('optimized_keywords_text', e.target.value)}
              placeholder="deep learning, neural networks, threat detection, information security"
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #20c997',
                borderRadius: '4px',
                minHeight: '80px',
                fontFamily: 'monospace'
              }}
            />
          ) : (
            <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              {Array.isArray(profile?.optimized_keywords) ? profile.optimized_keywords.join(', ') : 'Not specified'}
            </div>
          )}
        </CriticalFieldWrapper>

        <CriticalFieldWrapper fieldName="agencies" label="Preferred Funding Agencies">
          {isEditing ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px', border: '2px solid #ffc107', borderRadius: '4px', backgroundColor: 'white' }}>
              {availableAgencies.map(agency => (
                <label key={agency} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    checked={formData.agencies?.includes(agency) || false}
                    onChange={(e) => {
                      const agencies = formData.agencies || [];
                      if (e.target.checked) {
                        handleInputChange('agencies', [...agencies, agency]);
                      } else {
                        handleInputChange('agencies', agencies.filter(a => a !== agency));
                      }
                    }}
                  />
                  {agency}
                </label>
              ))}
            </div>
          ) : (
            <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              {Array.isArray(profile?.agencies) ? profile.agencies.join(', ') : 'Not specified'}
            </div>
          )}
        </CriticalFieldWrapper>

        {/* Additional Fields */}
        <h3 style={{ color: '#495057', marginBottom: '20px', marginTop: '30px' }}>Additional Information</h3>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Institution:</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.institution || ''}
              onChange={(e) => handleInputChange('institution', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          ) : (
            <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              {profile?.institution || 'Not specified'}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Department:</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.department || ''}
              onChange={(e) => handleInputChange('department', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          ) : (
            <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              {profile?.department || 'Not specified'}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Position:</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.position || ''}
              onChange={(e) => handleInputChange('position', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          ) : (
            <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              {profile?.position || 'Not specified'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileManager;