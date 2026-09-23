import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [apiStatus, setApiStatus] = useState({
    live: null,
    ready: null,
    error: null
  });

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        // Using the API base URL that we'll set via environment
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081';
        
        console.log('Fetching from:', `${apiBaseUrl}/api/v1/health/live`);
        
        const [liveRes, readyRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/health/live`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${apiBaseUrl}/api/v1/health/ready`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        ]);
        
        console.log('Live response status:', liveRes.status);
        console.log('Ready response status:', readyRes.status);
        
        if (!liveRes.ok) {
          throw new Error(`Live endpoint failed: ${liveRes.status}`);
        }
        
        if (!readyRes.ok) {
          throw new Error(`Ready endpoint failed: ${readyRes.status}`);
        }
        
        const liveData = await liveRes.json();
        const readyData = await readyRes.json();
        
        console.log('Live data:', liveData);
        console.log('Ready data:', readyData);
        
        setApiStatus({
          live: liveData,
          ready: readyData,
          error: null
        });
      } catch (err) {
        console.error('API fetch error:', err);
        setApiStatus({
          live: null,
          ready: null,
          error: err.message || err.toString()
        });
      }
    };

    checkApiStatus();
    
    // Poll every 5 seconds
    const interval = setInterval(checkApiStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Head>
        <title>Spatial Classroom Engine</title>
        <meta name="description" content="Browser-first spatial AI classroom" />
      </Head>

      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-indigo-600 py-6 px-8">
            <h1 className="text-3xl font-bold text-white">Spatial Classroom Engine</h1>
            <p className="text-indigo-200 mt-2">Browser-first spatial AI classroom with 2D fallback</p>
          </div>
          
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Application Status</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Live Endpoint</h3>
                  <div className="mt-4">
                    {apiStatus.live ? (
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          Healthy
                        </span>
                        <span className="ml-3 text-sm text-gray-600">Version: {apiStatus.live.version}</span>
                      </div>
                    ) : apiStatus.error ? (
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          Unreachable
                        </span>
                        <span className="ml-3 text-sm text-gray-600">Error: {apiStatus.error}</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                          Checking...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ready Endpoint</h3>
                  <div className="mt-4">
                    {apiStatus.ready ? (
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          Ready
                        </span>
                        <span className="ml-3 text-sm text-gray-600">Version: {apiStatus.ready.version}</span>
                      </div>
                    ) : apiStatus.error ? (
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          Unreachable
                        </span>
                        <span className="ml-3 text-sm text-gray-600">Error: {apiStatus.error}</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                          Checking...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Getting Started</h2>
              <div className="prose max-w-none">
                <p className="text-gray-600">
                  This is the Spatial Classroom Engine - an open-source, browser-first spatial AI classroom.
                </p>
                <p className="text-gray-600 mt-2">
                  The application is currently in development. The API endpoints below show the current status:
                </p>
                <ul className="list-disc pl-5 mt-2 text-gray-600">
                  <li><code>/api/v1/health/live</code> - Shows if the API is alive</li>
                  <li><code>/api/v1/health/ready</code> - Shows if the API is ready to serve requests</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  The API will be implemented in the <code>services/app-go</code> directory. 
                  The web frontend is in <code>apps/web</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}