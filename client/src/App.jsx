import { useState } from 'react';

function App() {
  const [message] = useState('Hello from TeamPulse Client! 🚀');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          TeamPulse
        </h1>
        <p className="text-lg text-gray-600 mb-4">{message}</p>
        <div className="bg-green-100 border-l-4 border-green-500 p-4">
          <p className="text-green-700 font-semibold">
            ✅ Client is running successfully
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
