import React from 'react';
import ProfileManager from '../Profile/ProfileManager';

const ProfilesPanel = () => {
  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px', color: '#333' }}>👤 Researcher Profiles</h1>
      <ProfileManager />
    </div>
  );
};

export default ProfilesPanel;