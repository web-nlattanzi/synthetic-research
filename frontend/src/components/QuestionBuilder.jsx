import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const QuestionBuilder = ({ questions, setQuestions }) => {
  const addQuestion = () => {
    const newQuestion = {
      id: uuidv4(),
      q: '',
      type: 'open',
      options: [],
      prompt: ''
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const deleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addOption = (questionId) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, options: [...(q.options || []), ''] }
        : q
    ));
  };

  const updateOption = (questionId, optionIndex, value) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            options: q.options.map((opt, idx) => 
              idx === optionIndex ? value : opt
            )
          }
        : q
    ));
  };

  const removeOption = (questionId, optionIndex) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            options: q.options.filter((_, idx) => idx !== optionIndex)
          }
        : q
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Research Questions</h3>
        <button
          onClick={addQuestion}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {questions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No questions added yet. Click "Add Question" to get started.</p>
        </div>
      )}

      {questions.map((question, index) => (
        <div key={question.id} className="card border-l-4 border-l-primary-500">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-2">
              <GripVertical className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-gray-600">
                  Question {index + 1}
                </span>
                <button
                  onClick={() => deleteQuestion(question.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Text
                </label>
                <input
                  type="text"
                  value={question.q}
                  onChange={(e) => updateQuestion(question.id, 'q', e.target.value)}
                  placeholder="Enter your question..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type
                </label>
                <select
                  value={question.type}
                  onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                  className="input-field"
                >
                  <option value="open">Open-ended</option>
                  <option value="single">Single Choice</option>
                  <option value="multi">Multiple Choice</option>
                </select>
              </div>

              {(question.type === 'single' || question.type === 'multi') && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Answer Options
                    </label>
                    <button
                      onClick={() => addOption(question.id)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      + Add Option
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(question.options || []).map((option, optionIndex) => (
                      <div key={optionIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                          placeholder={`Option ${optionIndex + 1}`}
                          className="input-field flex-1"
                        />
                        <button
                          onClick={() => removeOption(question.id, optionIndex)}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Prompt (Optional)
                </label>
                <textarea
                  value={question.prompt || ''}
                  onChange={(e) => updateQuestion(question.id, 'prompt', e.target.value)}
                  placeholder="Add specific instructions for how this question should be answered..."
                  rows={2}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuestionBuilder;