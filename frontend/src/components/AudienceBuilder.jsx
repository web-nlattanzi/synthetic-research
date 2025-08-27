import React from 'react';
import { Users, FileText } from 'lucide-react';

const AudienceBuilder = ({ 
  audMode, 
  setAudMode, 
  audienceDescription, 
  setAudienceDescription,
  age, setAge,
  gender, setGender,
  location, setLocation,
  income, setIncome,
  behavior, setBehavior,
  attitudes, setAttitudes
}) => {
  const applyBuilderToDescription = () => {
    const bullets = [];
    if (age.trim()) bullets.push(`• Age: ${age}`);
    if (gender.trim()) bullets.push(`• Gender: ${gender}`);
    if (location.trim()) bullets.push(`• Location: ${location}`);
    if (income.trim()) bullets.push(`• Income: ${income}`);
    if (behavior.trim()) bullets.push(`• Category behavior: ${behavior}`);
    if (attitudes.trim()) bullets.push(`• Attitudes: ${attitudes}`);
    setAudienceDescription(bullets.join('\n'));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Define Your Target Audience</h3>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setAudMode('freeform')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              audMode === 'freeform'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Freeform
          </button>
          <button
            onClick={() => setAudMode('builder')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              audMode === 'builder'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Audience Builder
          </button>
        </div>
      </div>

      {audMode === 'freeform' ? (
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Audience Description
          </label>
          <textarea
            value={audienceDescription}
            onChange={(e) => setAudienceDescription(e.target.value)}
            placeholder="Describe your target audience in detail. You can use bullet points, paragraphs, or any format that works for you..."
            rows={8}
            className="input-field"
          />
          <p className="text-sm text-gray-500 mt-2">
            Be as specific as possible. Include demographics, behaviors, attitudes, and any other relevant characteristics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h4 className="font-semibold text-gray-900 mb-4">Audience Characteristics</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input
                  type="text"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g., 25-34, 18+, Millennials"
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <input
                  type="text"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  placeholder="e.g., All genders, Female, Male"
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Urban US, London, Global"
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Income Level</label>
                <input
                  type="text"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="e.g., $50k-$100k, Middle class"
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Behavior</label>
                <input
                  type="text"
                  value={behavior}
                  onChange={(e) => setBehavior(e.target.value)}
                  placeholder="e.g., Regular coffee drinkers, Tech early adopters"
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attitudes & Values</label>
                <input
                  type="text"
                  value={attitudes}
                  onChange={(e) => setAttitudes(e.target.value)}
                  placeholder="e.g., Health-conscious, Environmentally aware"
                  className="input-field"
                />
              </div>
              
              <button
                onClick={applyBuilderToDescription}
                className="btn-primary w-full"
              >
                Apply to Description
              </button>
            </div>
          </div>
          
          <div className="card">
            <h4 className="font-semibold text-gray-900 mb-4">Generated Description</h4>
            <textarea
              value={audienceDescription}
              onChange={(e) => setAudienceDescription(e.target.value)}
              placeholder="Your audience description will appear here..."
              rows={12}
              className="input-field"
            />
            <p className="text-sm text-gray-500 mt-2">
              You can edit this description directly or use the builder on the left to generate it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudienceBuilder;