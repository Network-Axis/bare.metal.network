import React from 'react';

interface LabChecklistProps {
  title: string;
  items: string[];
}

const LabChecklist: React.FC<LabChecklistProps> = ({ title, items }) => {
  return (
    <div className="admonition admonition-tip">
      <div className="admonition-heading">
        <h5>{title}</h5>
      </div>
      <div className="admonition-content">
        <ul>
          {items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LabChecklist;