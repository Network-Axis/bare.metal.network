import React from 'react';

interface ModuleCardProps {
  title: string;
  description: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ title, description }) => {
  return (
    <div className="col col--4 margin-bottom--lg">
      <div className="card shadow--md">
        <div className="card__header">
          <h3>{title}</h3>
        </div>
        <div className="card__body">
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
};

export default ModuleCard;