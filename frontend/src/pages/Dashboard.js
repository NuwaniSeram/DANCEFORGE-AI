//Dashboard
import React from 'react';
import { Link } from 'react-router-dom';
import { Video, Sparkles, BarChart3, BookOpen, Users, Shuffle } from 'lucide-react';

function Dashboard() {
  const features = [
    {
      title: 'Digital Archive',
      description: 'Explore our AI-powered video archive. Search by describing what you\'re looking for and discover traditional dance performances with intelligent matching.',
      Icon: Video,
      path: '/archive',
      iconColor: '#ff6b9d'
    },
    {
      title: 'Choreography Studio',
      description: 'Create and visualize dance choreographies with our advanced tools. Design sequences, plan movements, and bring your artistic vision to life.',
      Icon: Sparkles,
      path: '/page1',
      iconColor: '#a8d8ea'
    },
    {
      title: 'Performance Analysis',
      description: 'Analyze dance performances with AI-powered movement tracking. Get detailed insights on technique, timing, and expression.',
      Icon: BarChart3,
      path: '/page2',
      iconColor: '#ffa500'
    },
    {
      title: 'Dance Style Fusion Studio',
      description: 'Transform dance movements across styles using AI-powered motion transfer. Blend cultural dance forms, preserve rhythm and expression, and explore creative choreography variations.',
      Icon: Shuffle,
      path: '/fusionstudio',
      iconColor: '#c44569'
    },
    // {
    //   title: 'Learning Hub',
    //   description: 'Access tutorials, guides, and educational content. Learn traditional dance forms and master new techniques at your own pace.',
    //   Icon: BookOpen,
    //   path: '/page3',
    //   iconColor: '#c44569'
    // },
    {
      title: 'Community Gallery',
      description: 'Share your performances, connect with other dancers, and showcase your work in our vibrant community space.',
      Icon: Users,
      path: '/page4',
      iconColor: '#6b9bd1'
    },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>DanceForge AI</h1>
        <p>Your intelligent platform for traditional dance exploration, creation, and discovery</p>
      </div>
      
      <div className="dashboard-grid">
        {features.map((feature, index) => {
          const IconComponent = feature.Icon;
          return (
            <Link 
              key={index} 
              to={feature.path} 
              className="dashboard-card"
              style={{
                background: `linear-gradient(135deg, rgba(255, 107, 157, 0.1) 0%, rgba(168, 216, 234, 0.1) 100%)`,
              }}
            >
              <div className="dashboard-card-content">
                <div className="dashboard-card-icon" style={{ color: feature.iconColor }}>
                  <IconComponent size={48} strokeWidth={1.5} />
                </div>
                <h2>{feature.title}</h2>
                <p>{feature.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default Dashboard;
